# -*- coding: utf-8 -*-
"""
Reusable India location -> regional language resolver.
This module is NOT client-specific -- it's geography, so it carries over
to every future UGC project regardless of vertical.

Resolution order:
  1. Direct state name match in the raw location string
  2. Known city/town -> state lookup
  3. Script detection (if the location text itself is written in a regional
     script, that's a strong signal on its own -- e.g. Bengali unicode range)
  4. Unresolved -> caller applies the client's default language
"""
import re
import unicodedata

STATE_LANGUAGE = {
    # --- Hindi belt ---
    "uttar pradesh": "Hindi", "uttarakhand": "Hindi", "bihar": "Hindi",
    "jharkhand": "Hindi", "madhya pradesh": "Hindi", "chhattisgarh": "Hindi",
    "rajasthan": "Hindi", "haryana": "Hindi", "delhi": "Hindi",
    "himachal pradesh": "Hindi",
    # --- Original 13 ---
    "gujarat": "Gujarati",
    "maharashtra": "Marathi",
    "west bengal": "Bengali",
    "odisha": "Odia", "orissa": "Odia",
    "andhra pradesh": "Telugu", "telangana": "Telugu",
    "tamil nadu": "Tamil",
    "karnataka": "Kannada",
    "kerala": "Malayalam",
    "punjab": "Punjabi",
    "assam": "Assamese",
    # --- Expansion: 10+ more languages (point 41) ---
    # Jammu & Kashmir split by region; the union territory covers both Dogri
    # (Jammu) and Kashmiri (valley). Bare "jammu"/"kashmir" resolve by city
    # below; the UT string falls back to Hindi/Urdu-adjacent Dogri as default.
    "jammu and kashmir": "Dogri", "jammu & kashmir": "Dogri",
    "ladakh": "Hindi",  # Ladakhi/Bhoti templates not maintained -- see README
    "goa": "Konkani",
    "manipur": "Manipuri", "meghalaya": "Hindi", "mizoram": "Hindi",
    "nagaland": "Hindi", "tripura": "Bengali", "arunachal pradesh": "Hindi",
    "sikkim": "Nepali",
    "dadra and nagar haveli": "Gujarati", "daman and diu": "Gujarati",
    "puducherry": "Tamil", "pondicherry": "Tamil",
    "andaman and nicobar": "Hindi",
    "chandigarh": "Punjabi",
}

# Sub-regions inside a state that speak a different language than the state
# default. Checked before the state match so e.g. a Darjeeling (West Bengal)
# creator gets Nepali, not Bengali. Keyed by distinctive place/region names.
SUBREGION_LANGUAGE = {
    "darjeeling": "Nepali", "kalimpong": "Nepali",  # WB hills -> Nepali
    "srinagar": "Kashmiri", "anantnag": "Kashmiri", "baramulla": "Kashmiri",
    "pulwama": "Kashmiri", "kupwara": "Kashmiri",   # Kashmir valley -> Kashmiri
    "mangalore": "Tulu", "mangaluru": "Tulu", "udupi": "Tulu",  # coastal Karnataka -> Tulu
    "mithila": "Maithili", "darbhanga": "Maithili", "madhubani": "Maithili",  # N Bihar -> Maithili
    "bhojpur": "Bhojpuri", "chhapra": "Bhojpuri", "ballia": "Bhojpuri",       # Bhojpuri belt
    "kutch": "Kutchi", "bhuj": "Kutchi",  # Kutch region -> Kutchi (Sindhi-adjacent)
}

# City/town -> state. Seed set covers this dataset + common metros;
# extend this file per-project as new cities show up in real data.
CITY_STATE = {
    "surendranagar": "gujarat", "kondh": "gujarat", "himmatnagar": "gujarat",
    "surat": "gujarat", "ahmedabad": "gujarat", "vadodara": "gujarat",
    "bramhapuri": "maharashtra", "aurangabad": "maharashtra", "mumbai": "maharashtra",
    "pune": "maharashtra", "nagpur": "maharashtra", "nashik": "maharashtra",
    "lucknow": "uttar pradesh", "noida": "uttar pradesh", "kanpur": "uttar pradesh",
    "varanasi": "uttar pradesh", "agra": "uttar pradesh",
    "dehradun": "uttarakhand",
    "kakinada": "andhra pradesh", "palvancha": "telangana", "vijayawada": "andhra pradesh",
    "hyderabad": "telangana", "warangal": "telangana",
    "bhubaneswar": "odisha", "cuttack": "odisha",
    "bokaro": "jharkhand", "medininagar": "jharkhand", "daltonganj": "jharkhand",
    "ranchi": "jharkhand", "jamshedpur": "jharkhand",
    "chattargarh": "rajasthan", "dechu": "rajasthan", "jodhpur": "rajasthan",
    "jaipur": "rajasthan", "jind": "haryana", "gurugram": "haryana", "gurgaon": "haryana",
    "duliajan": "assam", "guwahati": "assam",
    "saharsa": "bihar", "patna": "bihar",
    "kolkata": "west bengal", "salkumarhat": "west bengal", "cooch behar": "west bengal",
    "chennai": "tamil nadu", "coimbatore": "tamil nadu",
    "bangalore": "karnataka", "bengaluru": "karnataka",
    "kochi": "kerala", "thiruvananthapuram": "kerala",
    "chandigarh": "punjab", "amritsar": "punjab", "ludhiana": "punjab",
    "bhopal": "madhya pradesh", "indore": "madhya pradesh",
    "raipur": "chhattisgarh",
    # --- Expansion cities (point 41) ---
    "panaji": "goa", "panjim": "goa", "margao": "goa", "vasco": "goa",
    "imphal": "manipur", "thoubal": "manipur",
    "gangtok": "sikkim",
    "shillong": "meghalaya", "aizawl": "mizoram", "kohima": "nagaland",
    "dimapur": "nagaland", "agartala": "tripura", "itanagar": "arunachal pradesh",
    "leh": "ladakh", "kargil": "ladakh",
    "shimla": "himachal pradesh", "manali": "himachal pradesh",
}

# Unicode script ranges -> language, used as a fallback signal when the
# location text itself is written in a regional script (bio/geo-tag in
# the creator's own language rather than English transliteration).
SCRIPT_LANGUAGE = [
    (0x0980, 0x09FF, "Bengali"),
    (0x0B00, 0x0B7F, "Odia"),
    (0x0B80, 0x0BFF, "Tamil"),
    (0x0C00, 0x0C7F, "Telugu"),
    (0x0C80, 0x0CFF, "Kannada"),
    (0x0D00, 0x0D7F, "Malayalam"),
    (0x0A80, 0x0AFF, "Gujarati"),
    (0x0A00, 0x0A7F, "Punjabi"),  # Gurmukhi
    (0xABC0, 0xABFF, "Manipuri"),  # Meitei Mayek
    (0x1C50, 0x1C7F, "Santali"),   # Ol Chiki
    (0x0900, 0x097F, "Hindi"),  # Devanagari -- shared by Hindi/Marathi/Konkani/
                                # Nepali/Maithili/Bhojpuri/Dogri; keep LAST so a
                                # more specific script wins first. Devanagari
                                # alone can't disambiguate these; caller uses
                                # location/state signal when the script is shared.
]

JUNK_LOCATIONS = {"india", "all india", "—", "-", ""}


def _script_hint(text):
    for ch in text:
        cp = ord(ch)
        for lo, hi, lang in SCRIPT_LANGUAGE:
            if lo <= cp <= hi:
                return lang
    return None


def resolve(raw_location):
    """
    Returns (language, matched_state_or_None, confidence)
    confidence in {"high", "low", "none"}
    """
    if not raw_location or not isinstance(raw_location, str):
        return None, None, "none"

    text = raw_location.strip()
    low = text.lower()

    if low in JUNK_LOCATIONS:
        return None, None, "none"

    # 1. Sub-region override (a pocket that speaks a different language than its
    #    state default -- e.g. Darjeeling in West Bengal speaks Nepali). Checked
    #    first so the finer-grained signal wins over the broad state match.
    for region, lang in SUBREGION_LANGUAGE.items():
        if region in low:
            return lang, region.title(), "high"

    # 2. Direct state match
    for state, lang in STATE_LANGUAGE.items():
        if state in low:
            return lang, state.title(), "high"

    # 3. City match
    for city, state in CITY_STATE.items():
        if city in low:
            return STATE_LANGUAGE.get(state, "Hindi"), state.title(), "high"

    # 4. Script detection on the raw text (catches non-transliterated tags)
    script_lang = _script_hint(text)
    if script_lang:
        return script_lang, None, "low"

    return None, None, "none"
