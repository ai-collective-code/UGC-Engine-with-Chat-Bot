import json

import gemini_helper

# All Gemini calls now go through gemini_helper, which fans out across a chain of
# models so one model's exhausted daily free-tier bucket doesn't take the whole
# analyzer down (see gemini_helper.py).
client_configured = gemini_helper.is_configured()

def analyze_profile_data(profile_data, config):
    """
    Analyzes the raw Apify profile data and returns a structured evaluation.
    profile_data is expected to be the JSON object from the Apify Instagram Scraper.
    config is the campaign/client configuration.
    """
    if not client_configured:
        raise RuntimeError("Gemini API key is not configured. Please add GEMINI_API_KEY to .env")

    brand = config.get("brand_display_name", "the brand")
    neg = config.get("negotiation", {})
    deliverables = neg.get("deliverables", "UGC content")
    
    # Extract relevant fields from the Apify profile data
    username = profile_data.get("username") or profile_data.get("ownerUsername") or "Unknown"
    full_name = profile_data.get("fullName") or profile_data.get("ownerFullName") or "Unknown"
    followers = profile_data.get("followersCount") or profile_data.get("ownerFollowersCount") or "Unknown"
    following = profile_data.get("followsCount") or "Unknown"
    bio = profile_data.get("biography") or "None"
    
    latest_posts = profile_data.get("latestPosts", [])
    posts_context = ""
    if latest_posts:
        posts_context = "\nRecent Posts:\n"
        for i, post in enumerate(latest_posts[:5]):
            cap = str(post.get("caption", ""))[:200].replace("\n", " ")
            likes = post.get("likesCount", 0)
            comments = post.get("commentsCount", 0)
            posts_context += f"- Post {i+1}: {likes} likes, {comments} comments. Caption: {cap}\n"
    elif "caption" in profile_data:
        cap = str(profile_data.get("caption", ""))[:200].replace("\n", " ")
        likes = profile_data.get("likesCount", 0)
        comments = profile_data.get("commentsCount", 0)
        posts_context = f"\nSample Post: {likes} likes, {comments} comments. Caption: {cap}\n"

    system_prompt = f"""
You are an expert Talent Manager and Influencer Marketing Strategist for '{brand}'.
Your job is to evaluate if an Instagram creator is a good fit for our UGC campaign.

Campaign Deliverables: {deliverables}

You must return your evaluation STRICTLY as a JSON object with the following schema:
{{
    "score": <integer from 1 to 10>,
    "verdict": <"Recommended" or "Not Recommended">,
    "pros": [<list of 2-3 short strings>],
    "cons": [<list of 1-3 short strings>],
    "summary": <short 2 sentence summary>
}}
Do NOT output any markdown blocks (like ```json), just the raw JSON object.
"""

    user_prompt = f"""
Please analyze this creator:
Username: {username}
Name: {full_name}
Followers: {followers}
Following: {following}
Bio: {bio}
{posts_context}
"""
    
    reply = gemini_helper.generate_text(system_prompt, user_prompt, json_mode=True)

    # Gemini sometimes appends stray trailing characters (an extra '}', etc.)
    # after a valid JSON object -- parse just the first complete JSON value
    # starting at the first '{' instead of a naive greedy-regex + json.loads.
    start = reply.find("{")
    if start == -1:
        raise RuntimeError(f"No JSON object found in LLM response: {reply}")
    try:
        obj, _end = json.JSONDecoder().raw_decode(reply, start)
        return obj
    except Exception as e:
        raise RuntimeError(f"Failed to parse LLM response as JSON: {e}\nResponse: {reply}")


def classify_profiles_ai(profiles):
    """Batch-classify creators as 'individual' or 'business' using Gemini,
    catching accounts the keyword heuristic in outreach_pipeline.py misses
    (no English shop-word signal -- a regional-language business name, or a
    shop that just doesn't happen to use one of the seeded keywords).

    profiles: list of {"username", "full_name", "caption"} dicts.
    Returns {username: "individual"|"business"} for every profile the model
    classified. Returns {} if Gemini isn't configured or the call fails --
    callers should fall back to the keyword heuristic for anything missing.
    One call covers the whole batch (not one call per creator), so this stays
    cheap even for a few dozen rows at once; callers chunk larger batches.
    """
    if not client_configured or not profiles:
        return {}

    system_prompt = """
You are classifying Instagram creator accounts as either an INDIVIDUAL person
(a mason, homeowner, hobbyist, influencer posting as themselves) or a
BUSINESS account (a company, store, dealer, contractor firm, or brand posting
as an organization -- even a one-person shop still counts as business).
Judge by tone and content together (name, username, caption), not just
keyword matching -- a business can have a personal-sounding name and vice
versa, and business signals can appear in any language.

Return STRICTLY a JSON object mapping each given username to either
"individual" or "business". No markdown, no extra text, no explanations.
"""
    user_prompt = "Classify these creators:\n" + json.dumps(profiles, ensure_ascii=False)

    try:
        reply = gemini_helper.generate_text(system_prompt, user_prompt, json_mode=True)
        start = reply.find("{")
        if start == -1:
            return {}
        obj, _end = json.JSONDecoder().raw_decode(reply, start)
        return {
            str(k): ("business" if str(v).lower().startswith("b") else "individual")
            for k, v in obj.items()
        }
    except Exception:
        return {}
