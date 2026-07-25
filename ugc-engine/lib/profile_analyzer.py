import json
from datetime import datetime, timezone

import gemini_helper

# All Gemini calls now go through gemini_helper, which fans out across a chain of
# models so one model's exhausted daily free-tier bucket doesn't take the whole
# analyzer down (see gemini_helper.py).
client_configured = gemini_helper.is_configured()


class ProfileDataError(Exception):
    """The scrape returned no usable profile (private, deleted, wrong handle, or
    an Apify error object). Raised instead of analyzing, because feeding an empty
    payload to the model produces a confident-looking score invented from
    nothing -- the worst possible output for a tool people act on."""


def _num(value):
    """Coerce an Apify count to an int, or None when the figure isn't available.

    Two distinctions matter here. Apify omits a field it couldn't read rather
    than sending 0, and 0 is a real value (a post with no comments), so absent
    and zero must stay separate. Separately, Instagram reports -1 for a post
    whose like count the creator has HIDDEN -- treating that as a real count
    drags averages negative and produces a negative engagement rate, so it maps
    to None ("unknown") too.
    """
    if value is None or value == "":
        return None
    try:
        n = int(value)
    except (TypeError, ValueError):
        return None
    return None if n < 0 else n


def _avg(values):
    vals = [v for v in values if v is not None]
    return round(sum(vals) / len(vals), 1) if vals else None


def _engagement_band(rate):
    """Label an engagement rate against common Instagram benchmarks. Bands are
    generous at the low end because nano/micro creators in a niche trade
    (masons, tilers) routinely out-engage general-interest accounts."""
    if rate is None:
        return "unknown"
    if rate >= 6:
        return "excellent"
    if rate >= 3:
        return "strong"
    if rate >= 1:
        return "average"
    return "weak"


def _posting_cadence(posts):
    """Median days between consecutive posts, as an activity signal. A creator
    who last posted eight months ago is a different proposition from one
    posting weekly, and the follower count alone never shows that."""
    stamps = []
    for p in posts:
        ts = p.get("timestamp") or p.get("takenAtTimestamp")
        if not ts:
            continue
        try:
            if isinstance(ts, (int, float)):
                stamps.append(datetime.fromtimestamp(ts, tz=timezone.utc))
            else:
                stamps.append(datetime.fromisoformat(str(ts).replace("Z", "+00:00")))
        except (ValueError, OSError, OverflowError):
            continue
    if len(stamps) < 2:
        return None, None
    stamps.sort(reverse=True)
    gaps = [(stamps[i] - stamps[i + 1]).days for i in range(len(stamps) - 1)]
    gaps = [g for g in gaps if g >= 0]
    if not gaps:
        return None, None
    gaps.sort()
    median = gaps[len(gaps) // 2]
    days_since_last = (datetime.now(timezone.utc) - stamps[0]).days
    return median, days_since_last


def compute_metrics(profile_data):
    """Derive the factual half of the report from the scrape, in code.

    Everything here is arithmetic on scraped numbers, deliberately NOT asked of
    the model: an LLM eyeballing "is 3.2% good?" invents inconsistent answers,
    while the same formula is reproducible and auditable. The model receives
    these figures as input and is left to do the judgement work only.
    """
    posts = profile_data.get("latestPosts") or []
    followers = _num(profile_data.get("followersCount") or profile_data.get("ownerFollowersCount"))
    following = _num(profile_data.get("followsCount"))

    likes = [_num(p.get("likesCount")) for p in posts]
    comments = [_num(p.get("commentsCount")) for p in posts]
    views = [
        _num(p.get("videoPlayCount") or p.get("videoViewCount"))
        for p in posts
    ]

    avg_likes = _avg(likes)
    avg_comments = _avg(comments)
    avg_views = _avg(views)

    # Creators can hide like counts per post; _num maps those to None. Count them
    # so the report can say "likes hidden on 7 of 12 posts" instead of leaving an
    # unexplained blank that reads like a scrape failure.
    likes_hidden_on = sum(1 for p in posts if _num(p.get("likesCount")) is None)

    # Engagement rate on the reach we can actually see. Views are the honest
    # denominator for reels, but followers is the industry-comparable one, so
    # report against followers and surface views separately. When likes are
    # hidden we still rate on comments, but label the basis so a low number
    # isn't mistaken for poor performance.
    engagement_rate = None
    engagement_basis = "unavailable"
    if followers and followers > 0:
        if avg_likes is not None:
            engagement_rate = round(((avg_likes or 0) + (avg_comments or 0)) / followers * 100, 2)
            engagement_basis = "likes + comments"
        elif avg_comments is not None:
            engagement_rate = round(avg_comments / followers * 100, 2)
            engagement_basis = "comments only (likes hidden)"

    # A very low comment:like ratio is a classic bought-engagement signal --
    # purchased likes are cheap, purchased comments are not.
    comment_ratio = None
    if avg_likes and avg_likes > 0 and avg_comments is not None:
        comment_ratio = round(avg_comments / avg_likes * 100, 2)

    # Reach beyond the follower base: >100% means the algorithm is pushing
    # their reels to non-followers, which is what a brand is really buying.
    view_reach = None
    if followers and followers > 0 and avg_views:
        view_reach = round(avg_views / followers * 100, 1)

    follow_ratio = None
    if following and following > 0 and followers is not None:
        follow_ratio = round(followers / following, 2)

    cadence_days, days_since_last = _posting_cadence(posts)

    hashtags = []
    for p in posts:
        for tag in (p.get("hashtags") or []):
            tag = str(tag).lstrip("#").lower()
            if tag and tag not in hashtags:
                hashtags.append(tag)

    locations = []
    for p in posts:
        loc = p.get("locationName")
        if loc and loc not in locations:
            locations.append(loc)

    top_post = None
    scored = [
        (( _num(p.get("likesCount")) or 0) + (_num(p.get("commentsCount")) or 0), p)
        for p in posts
    ]
    if scored:
        scored.sort(key=lambda t: t[0], reverse=True)
        best = scored[0][1]
        top_post = {
            "url": best.get("url"),
            "likes": _num(best.get("likesCount")),
            "comments": _num(best.get("commentsCount")),
            "views": _num(best.get("videoPlayCount") or best.get("videoViewCount")),
            "caption": str(best.get("caption") or "")[:200],
        }

    return {
        "username": profile_data.get("username") or profile_data.get("ownerUsername"),
        "full_name": profile_data.get("fullName") or profile_data.get("ownerFullName"),
        "biography": profile_data.get("biography"),
        "external_url": profile_data.get("externalUrl"),
        "followers": followers,
        "following": following,
        "posts_count": _num(profile_data.get("postsCount")),
        "follower_following_ratio": follow_ratio,
        "verified": bool(profile_data.get("verified")),
        "is_private": bool(profile_data.get("private")),
        "is_business": bool(profile_data.get("isBusinessAccount")),
        "business_category": profile_data.get("businessCategoryName"),
        "posts_sampled": len(posts),
        "likes_hidden_on": likes_hidden_on,
        "avg_likes": avg_likes,
        "avg_comments": avg_comments,
        "avg_views": avg_views,
        "engagement_rate": engagement_rate,
        "engagement_basis": engagement_basis,
        "engagement_band": _engagement_band(engagement_rate),
        "comment_to_like_ratio": comment_ratio,
        "view_reach_pct": view_reach,
        "median_days_between_posts": cadence_days,
        "days_since_last_post": days_since_last,
        "content_hashtags": hashtags[:25],
        "post_locations": locations[:10],
        "top_post": top_post,
    }


def _fmt(value, suffix=""):
    return "unknown" if value is None else f"{value}{suffix}"


def _campaign_brief(config):
    """Pull the campaign context out of a client config.

    Reads the shape the configs on disk actually use (brand_display_name,
    campaign_name, negotiation.deliverables/reimbursement, offer_line as either
    a string or a {"value": ...} dict), and optionally the richer
    product_description/target_audience keys if a config supplies them. Without
    this mapping the prompt fell back to "not specified" for product and
    audience, and the model had to guess what the brand even sells.
    """
    neg = config.get("negotiation") or {}

    offer = config.get("offer_line")
    if isinstance(offer, dict):
        offer = offer.get("value")

    # Deliverables is the single most useful line for judging fit -- it says what
    # the creator would actually have to make. Fall back through the config's
    # other descriptions rather than to a bare "UGC content".
    deliverables = (
        neg.get("deliverables")
        or config.get("deliverables")
        or config.get("campaign_name")
        or "UGC content"
    )

    product_bits = [
        config.get("product_description"),
        config.get("product"),
        neg.get("reimbursement"),
    ]
    product = " ".join(b.strip() for b in product_bits if b and b.strip())

    return {
        "brand": (config.get("brand_display_name") or config.get("client_name") or "the brand").strip(),
        "campaign": (config.get("campaign_name") or "").strip(),
        "deliverables": str(deliverables).strip(),
        "product": product,
        "audience": (config.get("target_audience") or "").strip(),
        "offer": (str(offer).strip() if offer else ""),
    }


def analyze_profile_data(profile_data, config):
    """Evaluate a scraped Instagram creator against a client's campaign.

    Returns the computed metrics plus the model's judgement. Raises
    ProfileDataError when the scrape produced nothing usable, so the caller can
    say "private or not found" rather than passing an empty profile to the model.
    """
    if not client_configured:
        raise RuntimeError("Gemini API key is not configured. Please add GEMINI_API_KEY to .env")

    # Apify signals a failed target with an error object in the dataset rather
    # than an empty dataset, so an unguarded items[0] looks like a real profile.
    if profile_data.get("error"):
        raise ProfileDataError(
            profile_data.get("errorDescription")
            or "Instagram returned no data for this handle (private, deleted, or misspelled)."
        )

    metrics = compute_metrics(profile_data)

    if metrics["is_private"]:
        raise ProfileDataError("This account is private — its posts and engagement can't be assessed.")
    if metrics["followers"] is None and metrics["posts_sampled"] == 0:
        raise ProfileDataError(
            "The scrape returned no follower data and no posts. Check the handle spelling, "
            "or the account may be private, empty, or newly created."
        )

    campaign = _campaign_brief(config)
    brand = campaign["brand"]
    deliverables = campaign["deliverables"]
    product = campaign["product"]
    audience = campaign["audience"]

    posts = profile_data.get("latestPosts") or []
    posts_context = ""
    for i, post in enumerate(posts[:6], start=1):
        cap = str(post.get("caption", ""))[:220].replace("\n", " ")
        posts_context += (
            f"- Post {i}: {_fmt(_num(post.get('likesCount')))} likes, "
            f"{_fmt(_num(post.get('commentsCount')))} comments, "
            f"{_fmt(_num(post.get('videoPlayCount') or post.get('videoViewCount')))} views. "
            f"Caption: {cap}\n"
        )

    system_prompt = f"""
You are a senior influencer-marketing strategist evaluating whether an Instagram
creator fits a UGC campaign for '{brand}'.

Campaign: {campaign['campaign'] or 'not specified'}
What the creator would have to produce: {deliverables}
Product / offer context: {product or 'not specified'}
Compensation on the table: {campaign['offer'] or 'not specified'}
Target audience: {audience or 'not specified'}

The engagement figures given to you are already computed and correct — reason
FROM them, do not recompute or contradict them. Judge fit on: audience overlap
with the product, content-craft quality, engagement authenticity, posting
consistency, and whether their existing content shows the product's use case.

Be decisive and specific. Cite the actual numbers in your reasoning. A small
account with strong niche engagement can beat a large generic one — say so when
that is the case. Never pad the pros list to look balanced; if there is genuinely
nothing in favour, return an empty pros array.

Return STRICTLY one raw JSON object, no markdown fence, with this schema:
{{
  "score": <integer 1-10, campaign fit>,
  "verdict": <"Recommended" | "Worth a test" | "Not Recommended">,
  "confidence": <"high" | "medium" | "low", based on how much data you had>,
  "summary": <2-3 sentence verdict citing specific numbers>,
  "pros": [<0-4 short specific strings>],
  "cons": [<0-4 short specific strings>],
  "audience_read": <1-2 sentences on who realistically follows this account>,
  "content_themes": [<2-5 short strings describing what they actually post>],
  "engagement_quality": <1-2 sentences: is the engagement authentic, and how do you read the comment-to-like ratio>,
  "brand_fit_notes": <1-2 sentences tying their content to this specific product>,
  "recommended_offer": <a concrete suggestion, e.g. "Rs 1500-2000 voucher for 1 reel" — scale it to their reach and engagement>,
  "outreach_angle": <one sentence a human could actually open a DM with, referencing something real from their content>,
  "risk_flags": [<0-3 short strings for anything concerning; empty array if none>]
}}
"""

    m = metrics
    user_prompt = f"""
Evaluate this creator.

IDENTITY
Username: @{_fmt(m['username'])}
Name: {_fmt(m['full_name'])}
Bio: {m['biography'] or 'empty'}
Link in bio: {_fmt(m['external_url'])}
Verified: {m['verified']} | Business account: {m['is_business']} | Category: {_fmt(m['business_category'])}

AUDIENCE
Followers: {_fmt(m['followers'])}
Following: {_fmt(m['following'])}
Follower/following ratio: {_fmt(m['follower_following_ratio'])}
Total posts on account: {_fmt(m['posts_count'])}

ENGAGEMENT (computed over {m['posts_sampled']} recent posts)
Avg likes: {_fmt(m['avg_likes'])}{f" (like counts HIDDEN on {m['likes_hidden_on']} of {m['posts_sampled']} posts — absence of likes data is NOT low engagement)" if m['likes_hidden_on'] else ""}
Avg comments: {_fmt(m['avg_comments'])}
Avg views: {_fmt(m['avg_views'])}
Engagement rate vs followers: {_fmt(m['engagement_rate'], '%')} ({m['engagement_band']}, basis: {m['engagement_basis']})
Comment-to-like ratio: {_fmt(m['comment_to_like_ratio'], '%')}
Views as % of followers: {_fmt(m['view_reach_pct'], '%')}

ACTIVITY
Median days between posts: {_fmt(m['median_days_between_posts'])}
Days since last post: {_fmt(m['days_since_last_post'])}

CONTENT SIGNALS
Hashtags used: {', '.join(m['content_hashtags']) or 'none'}
Locations tagged: {', '.join(m['post_locations']) or 'none'}

RECENT POSTS
{posts_context or 'No post data available.'}
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
    except Exception as e:
        raise RuntimeError(f"Failed to parse LLM response as JSON: {e}\nResponse: {reply}")

    # Metrics are attached after the model's answer so its output can never
    # overwrite a measured figure with a hallucinated one.
    obj["metrics"] = metrics
    return obj


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
