"""AI quality-control scoring for submitted UGC content (V2).

Once a creator's fulfillment reaches "Content Posted" in the Ops Pipeline,
this scores the actual reel against the campaign's deliverables + a
config-driven QC rubric -- so a human doesn't have to manually re-read every
brief before approving payout. Reuses the same Apify Instagram actor as the
scraper/analyzer (a reel URL is a valid `username` target for that actor) and
the same Gemini client already configured for profile_analyzer.py.
"""
import json

import gemini_helper

client_configured = gemini_helper.is_configured()

# Sensible default so QC works out of the box before a client hands over a
# rubric of their own. Override per-client via config["qc_rubric"] (list of
# short criteria strings) -- no code change needed.
DEFAULT_QC_RUBRIC = [
    "The brand/product is clearly visible or mentioned in the content",
    "The content matches the agreed deliverable (format, subject, action shown)",
    "The creator discloses the paid/gifted collaboration (#ad, #collab, or similar), per ASCI guidelines",
    "Reasonable production quality -- visible, in focus, audible if it has narration",
    "Tone is authentic and positive toward the product",
]


def analyze_content(reel_data, config):
    """reel_data: the Apify Instagram Scraper item for one reel/post.
    config: the campaign/client configuration.
    Returns {score, verdict, disclosure_present, pros, cons, summary}."""
    if not client_configured:
        raise RuntimeError("Gemini API key is not configured. Please add GEMINI_API_KEY to .env")

    brand = config.get("brand_display_name", "the brand")
    neg = config.get("negotiation", {})
    deliverables = neg.get("deliverables", "UGC content")
    rubric = config.get("qc_rubric") or DEFAULT_QC_RUBRIC

    caption = str(reel_data.get("caption", ""))[:600].replace("\n", " ")
    hashtags = reel_data.get("hashtags") or []
    likes = reel_data.get("likesCount", 0)
    comments = reel_data.get("commentsCount", 0)
    owner = reel_data.get("ownerUsername") or reel_data.get("ownerFullName") or "Unknown"

    rubric_text = "\n".join(f"- {c}" for c in rubric)

    system_prompt = f"""
You are a Quality Control reviewer for '{brand}''s UGC creator campaign.
Your job is to check ONE submitted piece of content against the campaign's
deliverable brief and QC checklist, so the team can approve payout with
confidence instead of re-reading every brief by hand.

Campaign deliverable brief: {deliverables}

QC checklist:
{rubric_text}

Return your evaluation STRICTLY as a JSON object with this schema:
{{
    "score": <integer 1-10, overall QC quality>,
    "verdict": <"Approve" or "Needs Review">,
    "disclosure_present": <true or false>,
    "pros": [<2-3 short strings, what the content did well>],
    "cons": [<1-3 short strings, what's missing or weak -- empty list if none>],
    "summary": <short 2-sentence summary a human approver can skim>
}}
Do NOT output any markdown blocks (like ```json), just the raw JSON object.
Score below 6 or any missing checklist item should push toward "Needs Review", not "Approve".
"""

    user_prompt = f"""
Creator: @{owner}
Caption: {caption}
Hashtags: {', '.join(hashtags) if hashtags else 'none'}
Likes: {likes} · Comments: {comments}
"""

    reply = gemini_helper.generate_text(system_prompt, user_prompt, json_mode=True)
    return _parse_json_object(reply)


def _parse_json_object(reply):
    """Gemini sometimes appends stray trailing characters (an extra '}',
    trailing whitespace/newlines) after a perfectly valid JSON object, which
    breaks a naive json.loads on the whole greedy-matched string. Parse just
    the first complete JSON value starting at the first '{' and ignore
    anything after it."""
    start = reply.find("{")
    if start == -1:
        raise RuntimeError(f"No JSON object found in LLM response: {reply}")
    try:
        obj, _end = json.JSONDecoder().raw_decode(reply, start)
        return obj
    except Exception as e:
        raise RuntimeError(f"Failed to parse LLM response as JSON: {e}\nResponse: {reply}")
