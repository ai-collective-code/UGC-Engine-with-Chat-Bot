# -*- coding: utf-8 -*-
"""
Language intelligence for outreach (roadmap points 42-45).

Everything here helps the operator talk to a creator the way the creator
actually talks -- same language, same register, same regional flavour -- without
tripping over cultural landmines. All four features use the same Gemini setup as
the rest of the engine (GEMINI_API_KEY) and follow the house rules established
in message_variations.py and system-prompt work:

  42. detect_style()          -- read a creator's message and report its
                                 language, romanization, register (formal vs.
                                 casual) and regional dialect flavour
  43. (dialect)               -- folded into detect_style(): the same pass that
                                 reads register also names the regional variant,
                                 since you can't separate "how casual" from
                                 "which region" in one short DM
  44. translate()             -- translate any text into a target Indian
                                 language, in ROMANIZED (Latin-script) form by
                                 default, because that's how creators type
  45. check_sensitivity()     -- flag anything culturally/religiously/regionally
                                 inappropriate before a message goes out

Romanization is the load-bearing rule throughout: creators in this dataset type
regional languages in English letters (Hinglish, romanized Bengali, etc.), so
the default output is plain ASCII with no native script and no diacritics --
exactly the constraint the chatbot's system prompt already enforces.
"""
import json

import gemini_helper

_ai_ready = gemini_helper.is_configured()

# The 13 languages the engine actively supports, plus the expansion set from
# point 41. Offered as the translate() target menu and used to steer detection.
SUPPORTED_LANGUAGES = [
    "English", "Hindi", "Bengali", "Telugu", "Marathi", "Tamil", "Gujarati",
    "Kannada", "Malayalam", "Punjabi", "Odia", "Assamese",
    "Konkani", "Manipuri", "Nepali", "Kashmiri", "Dogri", "Maithili",
    "Bhojpuri", "Tulu",
]


def _require_ai():
    if not _ai_ready:
        raise RuntimeError("Gemini API key is not configured. Add GEMINI_API_KEY to .env")


def _gemini_json(system_prompt, user_prompt):
    """Run a Gemini call constrained to JSON output and parse the first complete
    JSON value. Delegates the request (and model-fallback on quota) to
    gemini_helper, which raises a clean RuntimeError if every model is
    exhausted -- the API layer turns that into a 502."""
    reply = gemini_helper.generate_text(system_prompt, user_prompt, json_mode=True)
    start = reply.find("{")
    if start == -1:
        raise RuntimeError(f"No JSON in model response: {reply[:200]}")
    try:
        obj, _ = json.JSONDecoder().raw_decode(reply, start)
    except Exception as e:
        raise RuntimeError(f"Could not parse model response as JSON: {e}")
    return obj


# --- 42 + 43. Style / dialect detection --------------------------------------

def detect_style(text):
    """Read a snippet of a creator's own writing and report how they talk, so
    the operator can mirror it. Returns language, whether it's romanized, the
    register (formal/casual/slangy), regional dialect flavour, and a one-line
    tip on how to reply in the same voice.
    """
    _require_ai()
    text = (text or "").strip()
    if not text:
        raise ValueError("text is empty")

    system_prompt = """
You analyze how an Indian social-media creator writes, so a brand can reply in
the SAME voice. Given a short message, identify:
- language: the primary language (e.g. Hindi, Bengali, Tamil, English). If it's
  mixed, name the dominant one and note the mix.
- romanized: true if a regional language is written in English/Latin letters
  (e.g. "bhai kaisa hai"), false if in native script or plain English.
- register: one of "formal", "neutral", "casual", "slangy".
- dialect: any regional flavour you can detect (e.g. "Mumbai Hinglish",
  "Kolkata Bengali", "Hyderabadi Urdu-Hindi mix"), or "standard" if none stands out.
- mirror_tip: ONE short sentence telling the brand how to match this creator's
  tone when replying (in the same language/register they used).

Return STRICTLY this JSON, no markdown:
{"language": "", "romanized": true, "register": "", "dialect": "", "mirror_tip": ""}
"""
    obj = _gemini_json(system_prompt, f"Creator's message:\n{text}")
    obj.setdefault("language", "Unknown")
    obj.setdefault("romanized", False)
    obj.setdefault("register", "neutral")
    obj.setdefault("dialect", "standard")
    obj.setdefault("mirror_tip", "")
    return obj


# --- 44. Auto-translate (romanized by default) -------------------------------

def translate(text, target_language, romanized=True):
    """Translate `text` into `target_language`. When romanized=True (the
    default) the output is Latin-script transliteration with NO native script
    and NO diacritics -- the way creators actually type -- so the operator can
    paste it straight into a DM. English targets are returned as normal English.
    """
    _require_ai()
    text = (text or "").strip()
    if not text:
        raise ValueError("text is empty")
    target_language = (target_language or "").strip() or "English"

    if target_language.lower() == "english":
        script_rule = "Write natural English."
    elif romanized:
        script_rule = (
            f"Write {target_language} in ROMANIZED form -- Latin/English letters only. "
            "Absolutely NO native script and NO accent marks or diacritics. "
            "Spell words the way a native speaker would casually type them on a phone."
        )
    else:
        script_rule = f"Write {target_language} in its native script."

    system_prompt = f"""
You translate short brand-outreach messages for Indian creators.
Target language: {target_language}.
{script_rule}

Rules:
- Preserve the meaning, tone, and any names/numbers exactly.
- Sound natural and friendly, like a real person -- not a machine translation.
- Do NOT add greetings or content that wasn't in the original.

Return STRICTLY this JSON, no markdown:
{{"translation": "<the translated message on a single line>"}}
"""
    obj = _gemini_json(system_prompt, f"Translate this:\n{text}")
    translation = (obj.get("translation") or "").strip()
    if not translation:
        raise RuntimeError("Model returned no translation")
    return {
        "target_language": target_language,
        "romanized": romanized and target_language.lower() != "english",
        "translation": translation,
    }


# --- 45. Cultural sensitivity filter -----------------------------------------

def check_sensitivity(text, target_language=None, region=None):
    """Scan an outbound message for anything culturally, religiously, or
    regionally inappropriate for the intended audience BEFORE it's sent.
    Returns a verdict plus specific issues and a safer rewrite when needed.
    Fails safe: if the AI call errors, it says so rather than green-lighting.
    """
    _require_ai()
    text = (text or "").strip()
    if not text:
        raise ValueError("text is empty")

    audience = []
    if target_language:
        audience.append(f"language: {target_language}")
    if region:
        audience.append(f"region: {region}")
    audience_str = (", ".join(audience)) or "a general Indian audience"

    system_prompt = f"""
You are a cultural-sensitivity reviewer for brand messages sent to Indian
creators. Audience context: {audience_str}.

Flag content that could offend or misfire for this audience: religious
insensitivity, caste references, regional/linguistic stereotyping, gender
assumptions, festival/food/dietary missteps (e.g. assuming everyone eats meat,
or wrong festival for the region), overly familiar address, or politically
charged wording. Ordinary friendly outreach is fine -- do not invent problems.

Return STRICTLY this JSON, no markdown:
{{
  "verdict": "ok" | "caution" | "revise",
  "issues": [<short strings naming each concern, empty if none>],
  "suggested_rewrite": "<a safer version IF verdict is caution/revise, else empty>"
}}
"""
    obj = _gemini_json(system_prompt, f"Review this outbound message:\n{text}")
    obj.setdefault("verdict", "ok")
    obj.setdefault("issues", [])
    obj.setdefault("suggested_rewrite", "")
    return obj
