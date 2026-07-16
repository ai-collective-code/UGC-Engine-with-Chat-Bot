# -*- coding: utf-8 -*-
"""
Core Apify export -> personalized creator queue logic. Shared by the CLI
(scripts/build_outreach_queue.py, which also writes the Excel workbook) and
the dashboard's upload endpoint (backend/app.py, which writes straight to
the local DB). Keeping this in one place means both paths resolve
language/niche/phone the same way -- no drift between "run the script" and
"upload through the browser".
"""
import re
import urllib.parse

import pandas as pd

from location_language import resolve as resolve_language
from message_templates import render_message
from profile_analyzer import classify_profiles_ai
import local_db


# --- Profile type: individual mistri vs. business/shop account -------------
# Primary classifier is AI (classify_profiles_ai, batched -- one Gemini call
# per upload/scrape, not per creator). This keyword list is the fallback for
# rows the AI call didn't cover (Gemini not configured, call failed, or a
# batch chunk errored) -- same deterministic, free, instant heuristic as
# location_language.py's geo resolver.
# Seeded from real business-account names seen in this project's own data
# (e.g. "Manoj Power Tools", "RJ Tiles Work", "Civil Tech Equipments").
BUSINESS_KEYWORDS = [
    "tools", "hardware", "enterprises", "enterprise", "traders", "trading",
    "constructions", "pvt", "ltd", "llp", "company", "stores", "store",
    "shop", "solutions", "services", "equipments", "equipment", "engineering",
    "engg", "industries", "industry", "corporation", "corp", "associates",
    "agencies", "agency", "suppliers", "supply", "builders", "contractors",
    "dealers", "dealer", "distributors", "& sons", "and sons", "brothers",
    "works", "tiles work", "civil work", "site work",
]


def classify_profile_type(full_name, username, caption=""):
    """Returns 'business' if the name/username/caption carries a shop or
    company signal, else 'individual'. Used to warn a human sender that the
    template's "Hi {name} ji!" opening will read oddly on a business account
    (see README known limitations) -- surfaced as a dashboard badge, not
    auto-applied to the message template."""
    text = f"{full_name or ''} {(username or '').replace('_', ' ')} {caption or ''}".lower()
    for kw in BUSINESS_KEYWORDS:
        if kw in text:
            return "business"
    return "individual"


def _n(v):
    """Coerce a possibly-missing numeric cell to a number: None/NaN -> 0.
    (v != v is the NaN check -- NaN is the only value not equal to itself,
    and NaN is truthy, so `v or 0` doesn't catch it.)"""
    if v is None or v != v:
        return 0
    return v


def _detect_header_row(input_path, sheet_name, expected_col, max_scan=5):
    """Scan the first few rows for the one that actually looks like a header
    (contains expected_col). Apify exports often have 1-2 title rows above
    the real header, and the count isn't always consistent between sheets
    in the same workbook -- don't trust a hardcoded offset."""
    raw = pd.read_excel(input_path, sheet_name=sheet_name, header=None, nrows=max_scan)
    for i in range(len(raw)):
        row_values = [str(v) for v in raw.iloc[i].tolist()]
        if expected_col in row_values:
            return i
    raise ValueError(f"Could not find header row with column '{expected_col}' in sheet '{sheet_name}'")


def load_and_merge(input_path, cfg):
    sheets = cfg["input_sheet"]
    profiles_header = sheets.get("profiles_header_row_index")
    if profiles_header is None:
        profiles_header = _detect_header_row(input_path, sheets["profiles_sheet"], "Username")
    posts_header = sheets.get("posts_header_row_index")
    if posts_header is None:
        posts_header = _detect_header_row(input_path, sheets["posts_sheet"], "Caption")

    profiles = pd.read_excel(input_path, sheet_name=sheets["profiles_sheet"], header=profiles_header)
    posts = pd.read_excel(input_path, sheet_name=sheets["posts_sheet"], header=posts_header)

    phone_re = re.compile(cfg["phone_regex"])

    posts_by_user = {}
    for _, row in posts.iterrows():
        uname = row.get("Username")
        if pd.isna(uname):
            continue
        posts_by_user.setdefault(uname, []).append(row)

    enriched = []
    for _, row in profiles.iterrows():
        uname = row.get("Username")
        user_posts = posts_by_user.get(uname, [])

        phones = []
        niches = set()
        best_caption = ""
        max_engagement = -1
        for p in user_posts:
            cap = str(p.get("Caption", "") or "")
            found = phone_re.findall(cap)
            for ph in found:
                clean = re.sub(r"[^\d]", "", ph)[-10:]
                if clean and clean not in phones:
                    phones.append(clean)
            hashtag = p.get("Source Hashtag")
            if pd.notna(hashtag):
                niches.add(hashtag)
            engagement = _n(p.get("Likes")) + _n(p.get("Comments"))
            if engagement >= max_engagement:
                max_engagement = engagement
                best_caption = cap

        primary_niche = row.get("Source Hashtag") if pd.notna(row.get("Source Hashtag")) else (
            next(iter(niches), None)
        )

        loc_raw = row.get("Location")
        loc_raw = None if (pd.isna(loc_raw) or str(loc_raw).strip() in ("—", "-")) else str(loc_raw).strip()
        language, matched_state, confidence = resolve_language(loc_raw) if loc_raw else (None, None, "none")
        if not language:
            language = cfg["default_language"]

        enriched.append({
            "Full Name": row.get("Full Name"),
            "Username": uname,
            "Profile Link": row.get("Profile Link"),
            "Location (raw)": loc_raw or "",
            "Matched State": matched_state or "",
            "Language": language,
            "Language Confidence": confidence,
            "Niche": primary_niche or "",
            "Phone": phones[0] if phones else "",
            "Caption Sample": best_caption[:120],
        })

    return pd.DataFrame(enriched)


# Flexible column-name mapping for a flat single-sheet export from ANY
# platform (YouTube/LinkedIn/Facebook exports, or a simple contact list).
# First matching column wins; matching is case-insensitive.
_FLAT_COLUMNS = {
    "Full Name":     ["full name", "name", "creator", "creator name", "channel name", "display name", "profile name"],
    "Username":      ["username", "handle", "user name", "channel", "profile", "account", "@"],
    "Profile Link":  ["profile link", "profile url", "url", "link", "channel url", "profile", "account url"],
    "Location":      ["location", "city", "region", "country", "based in"],
    "Phone":         ["phone", "whatsapp", "whatsapp number", "whatsapp no", "contact", "contact number", "mobile", "phone number"],
    "Niche":         ["niche", "category", "source hashtag", "topic", "industry", "vertical"],
    "Bio":           ["bio", "caption", "description", "about", "caption sample", "headline", "summary"],
}


def _detect_flat_header(input_path, sheet, max_scan=6):
    """Find the header row of a flat sheet -- some exports have title rows above
    the real header. Returns the 0-based index whose cells best match our known
    column names; falls back to row 0."""
    raw = pd.read_excel(input_path, sheet_name=sheet, header=None, nrows=max_scan)
    wanted = {alias for aliases in _FLAT_COLUMNS.values() for alias in aliases}
    best_i, best_hits = 0, 0
    for i in range(len(raw)):
        cells = [str(v).strip().lower() for v in raw.iloc[i].tolist() if pd.notna(v)]
        hits = sum(1 for c in cells if c in wanted)
        if hits > best_hits:
            best_i, best_hits = i, hits
    return best_i


def _pick(row_lower, aliases):
    """row_lower: dict of {lowercased column name: value}. Return first non-empty
    value whose column name matches one of the aliases."""
    for a in aliases:
        for col, val in row_lower.items():
            if col == a and pd.notna(val) and str(val).strip():
                return str(val).strip()
    return ""


def load_flat(input_path, cfg):
    """Read a single-sheet, flat creator list from any platform. Maps loosely
    named columns onto our canonical schema and extracts a phone number either
    from an explicit phone/WhatsApp column or from bio/caption text."""
    sheet = 0  # first sheet
    header_row = _detect_flat_header(input_path, sheet)
    df_raw = pd.read_excel(input_path, sheet_name=sheet, header=header_row)

    phone_re = re.compile(cfg["phone_regex"])
    default_lang = cfg.get("default_language", "Hindi")

    enriched = []
    for _, row in df_raw.iterrows():
        row_lower = {str(k).strip().lower(): v for k, v in row.items()}

        phone = ""
        phone_raw = _pick(row_lower, _FLAT_COLUMNS["Phone"])
        bio = _pick(row_lower, _FLAT_COLUMNS["Bio"])
        for candidate in (phone_raw, bio):
            found = phone_re.findall(candidate)
            if found:
                phone = re.sub(r"[^\d]", "", found[0])[-10:]
                break

        loc_raw = _pick(row_lower, _FLAT_COLUMNS["Location"])
        language, matched_state, confidence = (
            resolve_language(loc_raw) if loc_raw else (None, None, "none")
        )
        if not language:
            language = default_lang

        name = _pick(row_lower, _FLAT_COLUMNS["Full Name"])
        username = _pick(row_lower, _FLAT_COLUMNS["Username"]) or name
        if not name and not username:
            continue  # blank row

        enriched.append({
            "Full Name": name,
            "Username": username,
            "Profile Link": _pick(row_lower, _FLAT_COLUMNS["Profile Link"]),
            "Location (raw)": loc_raw,
            "Matched State": matched_state or "",
            "Language": language,
            "Language Confidence": confidence,
            "Niche": _pick(row_lower, _FLAT_COLUMNS["Niche"]),
            "Phone": phone,
            "Caption Sample": bio[:120],
        })

    return pd.DataFrame(enriched)


def build_messages(df, cfg):
    brand = cfg["brand_display_name"]
    offer = cfg["offer_line"]["value"]
    if df.empty:
        df["Personalized Message"] = []
        return df
    df["Personalized Message"] = df.apply(
        lambda r: render_message(r["Language"], r["Full Name"], r["Niche"], brand, offer),
        axis=1,
    )
    return df


def wa_link(phone, message):
    if not phone:
        return ""
    num = phone if (len(phone) == 12 and phone.startswith("91")) else f"91{phone}"
    return f"https://wa.me/{num}?text={urllib.parse.quote(message)}"


def _has_apify_sheets(input_path, cfg):
    """True when the workbook carries the two-sheet Apify shape this engine was
    built for (Unique Profiles + All Posts) -- those get the richer merge that
    pulls phones out of post captions. Anything else reads as a flat list."""
    sheets = cfg.get("input_sheet", {})
    profiles, posts = sheets.get("profiles_sheet"), sheets.get("posts_sheet")
    if not (profiles and posts):
        return False
    try:
        names = pd.ExcelFile(input_path).sheet_names
    except Exception:
        return False
    return profiles in names and posts in names


def process_export(input_path, cfg):
    """Full Apify pipeline: input xlsx + client config -> (ig_df, wa_df), each
    with a rendered Personalized Message; wa_df additionally has a WhatsApp Link
    and is restricted to profiles where a phone number was found. Used by the
    CLI (build_outreach_queue.py) which still writes the Excel workbook."""
    df = load_and_merge(input_path, cfg)
    df = build_messages(df, cfg)

    ig_df = df.copy()
    wa_df = df[df["Phone"] != ""].copy()
    wa_df["WhatsApp Link"] = wa_df.apply(lambda r: wa_link(r["Phone"], r["Personalized Message"]), axis=1)
    return ig_df, wa_df


def process_upload(input_path, cfg, platform):
    """Read one platform's export (Apify two-sheet OR a flat single sheet),
    resolve language, render the message, and compute a WhatsApp link for every
    row that has a phone. Returns a single DataFrame -- one row per creator."""
    if platform == "instagram" and _has_apify_sheets(input_path, cfg):
        df = load_and_merge(input_path, cfg)
    else:
        df = load_flat(input_path, cfg)
    df = build_messages(df, cfg)
    if df.empty:
        return df
    df["Phone"] = df["Phone"].fillna("").astype(str)
    df["WhatsApp Link"] = df.apply(
        lambda r: wa_link(r["Phone"], r["Personalized Message"]), axis=1
    )
    return df


def detect_flat_mapping(input_path, sheet=0):
    """Which actual spreadsheet column matched each canonical field, for a flat
    single-sheet export. Used by the upload preview so an odd export format is
    easy to sanity-check before anything is committed to the database."""
    header_row = _detect_flat_header(input_path, sheet)
    df_raw = pd.read_excel(input_path, sheet_name=sheet, header=header_row, nrows=0)
    actual_cols = [str(c) for c in df_raw.columns]
    actual_lower = {c.strip().lower(): c for c in actual_cols}

    field_mapping = {}
    for canonical, aliases in _FLAT_COLUMNS.items():
        matched_col = None
        for a in aliases:
            if a in actual_lower:
                matched_col = actual_lower[a]
                break
        field_mapping[canonical] = matched_col

    return {"header_row": header_row, "detected_columns": actual_cols, "field_mapping": field_mapping}


def preview_upload(input_path, cfg, platform, sample_size=5):
    """Dry-run of process_upload: parses the file and reports the column
    mapping + a data sample, but writes nothing to the database. Skips message
    rendering (not needed to sanity-check the import) so it stays fast."""
    if platform == "instagram" and _has_apify_sheets(input_path, cfg):
        df = load_and_merge(input_path, cfg)
        result = {"mode": "apify_two_sheet", "detected_columns": None, "field_mapping": None}
    else:
        result = detect_flat_mapping(input_path)
        result["mode"] = "flat"
        df = load_flat(input_path, cfg)

    sample_cols = ["Full Name", "Username", "Phone", "Niche", "Location (raw)", "Language"]
    if df.empty:
        result.update({"total_rows": 0, "phones_found": 0, "sample": []})
        return result

    for col in sample_cols:
        if col not in df.columns:
            df[col] = ""
    result.update({
        "total_rows": len(df),
        "phones_found": int((df["Phone"].fillna("") != "").sum()),
        "sample": df[sample_cols].fillna("").head(sample_size).to_dict(orient="records"),
    })
    return result


# Batch size for classify_profiles_ai calls -- keeps each prompt small and
# bounded regardless of upload size, without one call per creator.
_AI_CLASSIFY_CHUNK = 40


def _ai_profile_types(df):
    """Batch-classify every row in df via Gemini (profile_analyzer.classify_
    profiles_ai), chunked to _AI_CLASSIFY_CHUNK. Returns {username: type};
    missing usernames (Gemini not configured, or a chunk errored) fall back
    to the keyword heuristic in the caller."""
    profiles = [
        {
            "username": str(r.get("Username") or ""),
            "full_name": str(r.get("Full Name") or ""),
            "caption": str(r.get("Caption Sample") or "")[:200],
        }
        for _, r in df.iterrows() if str(r.get("Username") or "")
    ]
    results = {}
    for i in range(0, len(profiles), _AI_CLASSIFY_CHUNK):
        chunk = profiles[i:i + _AI_CLASSIFY_CHUNK]
        try:
            results.update(classify_profiles_ai(chunk))
        except Exception:
            pass  # missing usernames fall back to the keyword heuristic below
    return results


def rows_for_db(df, platform):
    """Map a processed DataFrame onto the creators table, tagged with the
    source platform. WhatsApp-ready is implicit: any row with a phone carries a
    wa.me link and shows up in the WhatsApp dashboard automatically."""
    ai_types = _ai_profile_types(df)
    rows = []
    for _, r in df.iterrows():
        phone = str(r.get("Phone") or "")
        full_name = str(r.get("Full Name") or "")
        username = str(r.get("Username") or "")
        caption = str(r.get("Caption Sample") or "")
        rows.append({
            "full_name": full_name,
            "username": username,
            "profile_link": str(r.get("Profile Link") or ""),
            "location_raw": str(r.get("Location (raw)") or ""),
            "matched_state": str(r.get("Matched State") or ""),
            "language": str(r.get("Language") or ""),
            "language_confidence": str(r.get("Language Confidence") or ""),
            "niche": str(r.get("Niche") or ""),
            "phone": phone,
            "caption_sample": caption,
            "personalized_message": str(r.get("Personalized Message") or ""),
            "channel": platform,
            "source_platform": platform,
            "profile_type": ai_types.get(username) or classify_profile_type(full_name, username, caption),
            "whatsapp_link": str(r.get("WhatsApp Link") or "") if phone else "",
            "status": "Not Sent",
        })
    return rows


def store_upload(cfg, client_id, input_path, platform):
    """End-to-end for the dashboard upload endpoint: read + map + insert.
    Returns {total, whatsapp_ready}."""
    df = process_upload(input_path, cfg, platform)
    rows = rows_for_db(df, platform)
    local_db.insert_creators(client_id, rows)
    return {"total": len(rows), "whatsapp_ready": sum(1 for r in rows if r["phone"])}


# --- Dealer list upload (V2 PIN-code lookup scaffold) -----------------------

_DEALER_COLUMNS = {
    "dealer_name": ["dealer name", "dealer", "stockist", "stockist name", "name", "shop name"],
    "pincode":     ["pincode", "pin code", "pin", "zip", "zip code", "postal code"],
    "city":        ["city", "town"],
    "state":       ["state", "region"],
    "phone":       ["phone", "contact", "contact number", "mobile", "phone number"],
    "address":     ["address", "full address", "location"],
}


def load_dealers(input_path, sheet=0):
    """Flat dealer-list export -> list of dealer dicts, matched by the same
    alias-based header detection the creator upload path uses."""
    header_row = _detect_flat_header_generic(input_path, sheet, _DEALER_COLUMNS)
    df_raw = pd.read_excel(input_path, sheet_name=sheet, header=header_row)
    df_raw.columns = [str(c).strip().lower() for c in df_raw.columns]

    dealers = []
    for _, row in df_raw.iterrows():
        row_lower = {k: v for k, v in row.items()}
        dealer = {}
        for canonical, aliases in _DEALER_COLUMNS.items():
            val = ""
            for a in aliases:
                if a in row_lower and pd.notna(row_lower[a]) and str(row_lower[a]).strip():
                    val = str(row_lower[a]).strip()
                    break
            dealer[canonical] = val
        if dealer["dealer_name"]:
            dealers.append(dealer)
    return dealers


def _detect_flat_header_generic(input_path, sheet, columns_map, max_scan=6):
    """Same header auto-detection as _detect_flat_header, generalized to any
    canonical-column-to-aliases map (used for dealer lists, not just creators)."""
    raw = pd.read_excel(input_path, sheet_name=sheet, header=None, nrows=max_scan)
    wanted = {alias for aliases in columns_map.values() for alias in aliases}
    best_i, best_hits = 0, 0
    for i in range(len(raw)):
        cells = [str(v).strip().lower() for v in raw.iloc[i].tolist() if pd.notna(v)]
        hits = sum(1 for c in cells if c in wanted)
        if hits > best_hits:
            best_i, best_hits = i, hits
    return best_i


def store_dealer_upload(client_id, input_path):
    """End-to-end for the dealer-list upload endpoint. Returns {total}."""
    dealers = load_dealers(input_path)
    local_db.insert_dealers(client_id, dealers)
    return {"total": len(dealers)}


# --- Apify live-scrape path (Instagram Reel Scraper) -----------------------

def _phone_from(text, phone_re):
    for m in phone_re.findall(text or ""):
        clean = re.sub(r"[^\d]", "", m)[-10:]
        if clean:
            return clean
    return ""


def apify_reels_to_df(items, cfg):
    """Turn a flat list of Apify reel items into one row per creator. Reels are
    grouped by owner; the phone comes from any caption, the niche from the first
    hashtag, the location from the first tagged location, and the sample caption
    from the most-engaged reel -- the same enrichment the Excel path does."""
    phone_re = re.compile(cfg["phone_regex"])
    default_lang = cfg.get("default_language", "Hindi")

    by_owner = {}
    for it in items:
        owner = str(it.get("ownerUsername") or "").strip()
        if owner:
            by_owner.setdefault(owner, []).append(it)

    enriched = []
    for owner, reels in by_owner.items():
        phone = ""
        best_caption = ""
        max_eng = -1
        location = ""
        niche = ""
        full_name = ""
        for r in reels:
            cap = str(r.get("caption") or "")
            if not phone:
                phone = _phone_from(cap, phone_re)
            eng = (r.get("likesCount") or 0) + (r.get("commentsCount") or 0)
            if eng >= max_eng:
                max_eng = eng
                best_caption = cap
            if not location and r.get("locationName"):
                location = str(r["locationName"]).strip()
            if not niche and r.get("hashtags"):
                niche = str(r["hashtags"][0]).lstrip("#")
            if not full_name and r.get("ownerFullName"):
                full_name = str(r["ownerFullName"]).strip()

        language, matched_state, confidence = (
            resolve_language(location) if location else (None, None, "none")
        )
        if not language:
            language = default_lang

        enriched.append({
            "Full Name": full_name or owner,
            "Username": owner,
            "Profile Link": f"https://instagram.com/{owner}",
            "Location (raw)": location,
            "Matched State": matched_state or "",
            "Language": language,
            "Language Confidence": confidence,
            "Niche": niche,
            "Phone": phone,
            "Caption Sample": best_caption[:120],
        })

    return pd.DataFrame(enriched)


def store_apify_items(cfg, client_id, items, platform="instagram"):
    """Map Apify reel items -> creators and insert them. Returns
    {total, whatsapp_ready}. Any creator with a phone auto-routes to WhatsApp."""
    df = apify_reels_to_df(items, cfg)
    df = build_messages(df, cfg)
    if not df.empty:
        df["Phone"] = df["Phone"].fillna("").astype(str)
        df["WhatsApp Link"] = df.apply(
            lambda r: wa_link(r["Phone"], r["Personalized Message"]), axis=1
        )
    rows = rows_for_db(df, platform)
    local_db.insert_creators(client_id, rows)
    return {"total": len(rows), "whatsapp_ready": sum(1 for r in rows if r["phone"])}


def sync_to_dashboard_db(cfg, client_key, ig_df, wa_df):
    """Mirror a CLI run into the local dashboard DB. The Apify run is always an
    Instagram source; WhatsApp-ready is derived from phone, so wa_df is only
    used by the caller for the Excel workbook -- not stored as separate rows."""
    client_id = local_db.upsert_client_from_config(cfg, client_key)
    local_db.insert_creators(client_id, rows_for_db(ig_df, "instagram"))
    return client_id
