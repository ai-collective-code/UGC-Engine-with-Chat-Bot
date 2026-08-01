# -*- coding: utf-8 -*-
"""
YouTube Data API v3 client — channel lookup and discovery.

Why the official API rather than a scraper: it's free (10,000 quota units/day),
it doesn't break when YouTube changes its markup, and it carries no
terms-of-service risk. It also needs no new credential — it runs on the same
Google Cloud project as GOOGLE_MAPS_API_KEY, so enabling "YouTube Data API v3"
on that project is the only setup step.

Quota is the thing to design around, because the two calls differ by 100x:

    channels.list   1 unit   and takes up to 50 channel IDs per call
    search.list   100 units  per call, regardless of results

So looking up channels you already know is effectively free (10,000 lookups a
day), while discovery is capped at ~100 searches a day. fetch_channels batches
IDs 50 at a time for that reason, and search_channels reports what it spent so
the caller can surface it.

Set YOUTUBE_API_KEY to use a separate key; otherwise GOOGLE_MAPS_API_KEY is
reused (same project, same billing, one less secret to manage).
"""
import os
import re

import requests

API_BASE = "https://www.googleapis.com/youtube/v3"

# Quota cost per call, from Google's published table. Kept here so callers can
# report spend without hardcoding the numbers at every call site.
COST_CHANNELS_LIST = 1
COST_SEARCH_LIST = 100

CHANNELS_BATCH = 50  # channels.list accepts up to 50 ids in one request

_EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")


def api_key():
    return (
        os.environ.get("YOUTUBE_API_KEY")
        or os.environ.get("GOOGLE_MAPS_API_KEY")
        or ""
    ).strip()


def is_configured():
    return bool(api_key())


class YouTubeError(RuntimeError):
    """API rejected the request. Message is already human-readable."""


def _get(path, params, timeout=30):
    key = api_key()
    if not key:
        raise YouTubeError(
            "No API key. Set YOUTUBE_API_KEY (or GOOGLE_MAPS_API_KEY) in .env."
        )
    try:
        resp = requests.get(f"{API_BASE}/{path}", params={**params, "key": key}, timeout=timeout)
    except requests.RequestException:
        raise YouTubeError("YouTube API unreachable — check the network.")

    data = resp.json() if resp.content else {}
    if resp.status_code >= 400:
        err = (data.get("error") or {})
        reason = ""
        for detail in err.get("errors") or []:
            reason = detail.get("reason") or ""
            break
        message = err.get("message") or f"HTTP {resp.status_code}"
        # Translate the two failures people actually hit into an instruction.
        if reason == "accessNotConfigured":
            raise YouTubeError(
                "YouTube Data API v3 is not enabled on this Google Cloud project. "
                "Enable it in the Google Cloud console (APIs & Services → Library → "
                "YouTube Data API v3 → Enable), wait a minute, then retry."
            )
        if reason in ("quotaExceeded", "dailyLimitExceeded"):
            raise YouTubeError(
                "YouTube API daily quota is used up (10,000 units/day). It resets at "
                "midnight US Pacific. Channel lookups cost 1 unit; keyword search costs 100."
            )
        # Distinct from accessNotConfigured: the API is enabled on the project, but
        # this KEY is restricted to a different set of APIs (ours is scoped to Maps).
        # Google words it as "blocked", which gives no hint what to change.
        if "blocked" in message.lower() or reason in ("forbidden", "accessDenied"):
            raise YouTubeError(
                "This API key is restricted and does not allow YouTube Data API v3. "
                "In Google Cloud console → APIs & Services → Credentials, open the key "
                "and either add 'YouTube Data API v3' under API restrictions, or create a "
                "separate unrestricted key and set it as YOUTUBE_API_KEY in .env."
            )
        raise YouTubeError(f"YouTube API error: {message[:300]}")
    return data


# ── Reference parsing ───────────────────────────────────────────────────────
# Users paste whatever they have: a full URL, an @handle, a bare channel ID, or
# a legacy /c/ or /user/ path. Each maps to a different channels.list parameter.

_CHANNEL_ID_RE = re.compile(r"^UC[\w-]{22}$")


def parse_reference(raw):
    """Classify one user-supplied channel reference.

    Returns (kind, value) where kind is "id", "handle" or "username".
    """
    ref = (raw or "").strip()
    if not ref:
        return None, None

    # Strip a URL down to its meaningful path segment.
    if "youtube.com" in ref or "youtu.be" in ref:
        path = re.sub(r"^https?://", "", ref)
        path = path.split("?")[0].split("#")[0]
        parts = [p for p in path.split("/")[1:] if p]
        if not parts:
            return None, None
        first = parts[0]
        if first == "channel" and len(parts) > 1:
            return "id", parts[1]
        if first == "user" and len(parts) > 1:
            return "username", parts[1]
        if first == "c" and len(parts) > 1:
            return "handle", parts[1].lstrip("@")
        if first.startswith("@"):
            return "handle", first.lstrip("@")
        return "handle", first

    if ref.startswith("@"):
        return "handle", ref.lstrip("@")
    if _CHANNEL_ID_RE.match(ref):
        return "id", ref
    return "handle", ref


# ── Shaping ─────────────────────────────────────────────────────────────────

def _to_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def shape_channel(item):
    """Flatten one channels.list item into the fields the pipeline uses.

    `description` is the payload that matters for outreach: creators routinely
    put a business email or phone in it, which is exactly the contact detail the
    WhatsApp queue needs. `emails` is pulled out here; the phone is left to the
    caller so it uses the client's own phone_regex.
    """
    snippet = item.get("snippet") or {}
    stats = item.get("statistics") or {}
    branding = (item.get("brandingSettings") or {}).get("channel") or {}
    description = snippet.get("description") or ""

    keywords = branding.get("keywords") or ""
    # Google returns keywords as a single space-separated string, quoting any
    # multi-word phrase.
    keyword_list = [k.strip('"') for k in re.findall(r'"[^"]+"|\S+', keywords)]

    handle = (snippet.get("customUrl") or "").lstrip("@")
    return {
        "channel_id": item.get("id") or "",
        "title": snippet.get("title") or "",
        "handle": handle,
        "description": description,
        "emails": _EMAIL_RE.findall(description),
        "country": snippet.get("country") or "",
        "published_at": snippet.get("publishedAt") or "",
        "thumbnail": ((snippet.get("thumbnails") or {}).get("high") or {}).get("url", ""),
        "keywords": keyword_list,
        "subscriber_count": _to_int(stats.get("subscriberCount")),
        "video_count": _to_int(stats.get("videoCount")),
        "view_count": _to_int(stats.get("viewCount")),
        "hidden_subscriber_count": bool(stats.get("hiddenSubscriberCount")),
        "url": f"https://www.youtube.com/{'@' + handle if handle else 'channel/' + (item.get('id') or '')}",
    }


PARTS = "snippet,statistics,brandingSettings"


# ── Public calls ────────────────────────────────────────────────────────────

def fetch_channels(references):
    """Look up channels by URL / @handle / channel ID / legacy username.

    Returns (channels, report). `report` carries quota_units spent and the
    references that resolved to nothing, so the caller can tell the user which
    handles were wrong instead of silently returning fewer rows.
    """
    ids, handles, usernames, unparsed = [], [], [], []
    for raw in references:
        kind, value = parse_reference(raw)
        if kind == "id":
            ids.append(value)
        elif kind == "handle":
            handles.append((raw, value))
        elif kind == "username":
            usernames.append((raw, value))
        else:
            unparsed.append(raw)

    channels, missing, units = [], list(unparsed), 0

    # IDs are the cheap path: 50 per call, 1 unit per call.
    for start in range(0, len(ids), CHANNELS_BATCH):
        batch = ids[start : start + CHANNELS_BATCH]
        data = _get("channels", {"part": PARTS, "id": ",".join(batch), "maxResults": CHANNELS_BATCH})
        units += COST_CHANNELS_LIST
        found = {it.get("id") for it in data.get("items") or []}
        channels.extend(shape_channel(it) for it in data.get("items") or [])
        missing.extend(i for i in batch if i not in found)

    # Handles and legacy usernames must be resolved one at a time (still 1 unit).
    for raw, value in handles:
        data = _get("channels", {"part": PARTS, "forHandle": value})
        units += COST_CHANNELS_LIST
        items = data.get("items") or []
        if items:
            channels.extend(shape_channel(it) for it in items)
        else:
            missing.append(raw)

    for raw, value in usernames:
        data = _get("channels", {"part": PARTS, "forUsername": value})
        units += COST_CHANNELS_LIST
        items = data.get("items") or []
        if items:
            channels.extend(shape_channel(it) for it in items)
        else:
            missing.append(raw)

    return channels, {"quota_units": units, "not_found": missing}


def search_channels(query, limit=10, region_code=None, relevance_language=None):
    """Discover channels by keyword.

    Costs 100 units per call — roughly 100 searches a day on the free quota —
    so this is for finding creators you don't know yet, not for bulk work. The
    search result itself carries no statistics, so the ids are re-fetched
    through channels.list (1 more unit) to get subscribers and description.
    """
    limit = max(1, min(int(limit or 10), 50))
    params = {
        "part": "snippet",
        "type": "channel",
        "q": query,
        "maxResults": limit,
    }
    if region_code:
        params["regionCode"] = region_code
    if relevance_language:
        params["relevanceLanguage"] = relevance_language

    data = _get("search", params)
    units = COST_SEARCH_LIST

    ids = []
    for item in data.get("items") or []:
        cid = ((item.get("id") or {}).get("channelId")) or ""
        if cid:
            ids.append(cid)
    if not ids:
        return [], {"quota_units": units, "not_found": []}

    # search.list returns no statistics/description worth having — hydrate.
    channels, report = fetch_channels(ids)
    return channels, {
        "quota_units": units + report["quota_units"],
        "not_found": report["not_found"],
    }
