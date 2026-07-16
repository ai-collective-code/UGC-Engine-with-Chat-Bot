# -*- coding: utf-8 -*-
"""
Creator verification & fraud scoring (roadmap points 46-50).

Given the raw Apify Instagram profile data (the same object profile_analyzer.py
already consumes), produce a trust report so the operator doesn't waste a manual
first DM -- or a voucher -- on a bought-follower account, an engagement pod, or a
brand-unsafe creator.

Five checks, four of them computed from public metrics (cheap, deterministic,
no API cost) and one AI pass:

  46. Fake account detection      -- follower/following ratio, post count, bio
  47. Audience authenticity score -- engagement rate vs. the expected band for
                                      the creator's follower tier
  49. Engagement authenticity     -- comment-to-like ratio (bought likes have
                                      almost no comments; pods have too many)
  48. Brand safety check          -- Gemini scans bio + captions for content a
                                      brand wouldn't want to be associated with
  50. Creator history             -- reputation lookup, handled at the DB/app
                                      layer (see local_db.creator_reputation);
                                      merge_reputation() folds it into the report

The follower-tier engagement bands below are industry rules of thumb (Later /
HypeAuditor / Influencer Marketing Hub publish similar numbers); they're not
exact science, so the report always exposes the raw numbers alongside the
verdict for a human to sanity-check.
"""
import json

import gemini_helper

_ai_ready = gemini_helper.is_configured()


# Follower tiers and the healthy engagement-rate band (%) for each. Smaller
# accounts genuinely engage harder; a 5% ER is great for a micro-influencer but
# implausible for a 2M-follower mega account (would suggest bought engagement).
# (low, high) are the *plausible* bounds -- below low hints at bought/dead
# followers, above high hints at pods/bought engagement.
TIERS = [
    # name,        min_followers, er_low, er_high
    ("nano",        0,      1.0, 12.0),
    ("micro",       10_000, 0.8,  8.0),
    ("mid",        100_000, 0.6,  5.0),
    ("macro",      500_000, 0.4,  3.5),
    ("mega",     1_000_000, 0.2,  2.5),
]


def _num(v, default=0):
    """Coerce Apify's occasionally-stringy counts to a number."""
    try:
        if v is None:
            return default
        return float(v)
    except (TypeError, ValueError):
        return default


def _tier(followers):
    name, lo, hi = TIERS[0][0], TIERS[0][2], TIERS[0][3]
    for t_name, t_min, t_lo, t_hi in TIERS:
        if followers >= t_min:
            name, lo, hi = t_name, t_lo, t_hi
    return name, lo, hi


def _extract_posts(profile_data):
    """Return a list of {likes, comments} for whatever posts the scrape carried.
    Handles both the profile-with-latestPosts shape and a bare post item."""
    posts = []
    latest = profile_data.get("latestPosts") or []
    if latest:
        for p in latest:
            posts.append({
                "likes": _num(p.get("likesCount")),
                "comments": _num(p.get("commentsCount")),
            })
    elif "likesCount" in profile_data or "commentsCount" in profile_data:
        posts.append({
            "likes": _num(profile_data.get("likesCount")),
            "comments": _num(profile_data.get("commentsCount")),
        })
    return posts


# --- 46. Fake / low-quality account detection --------------------------------

def _fake_account_signals(followers, following, posts_count, bio):
    """Heuristic red flags that an account is a bot, a bought-follower shell, or
    a mass-follow spam account. Returns (flags, risk_points 0-100)."""
    flags = []
    risk = 0

    # Mass-follow spam pattern: follows far more than follow it back.
    if following > 0 and followers > 0:
        ratio = following / max(followers, 1)
        if following >= 1000 and ratio >= 2.0:
            flags.append(f"Follows {int(following):,} but only {int(followers):,} follow back (mass-follow pattern)")
            risk += 30
        elif ratio >= 5.0:
            flags.append("Follows many more accounts than follow back")
            risk += 15

    # High follower count but almost no content -> classic bought-follower shell.
    if followers >= 5000 and posts_count <= 3:
        flags.append(f"{int(followers):,} followers but only {int(posts_count)} posts (inflated / dormant)")
        risk += 25

    # Ghost account: no posts at all.
    if posts_count == 0:
        flags.append("No posts scraped -- inactive or private")
        risk += 10

    # Empty bio on a sizeable account is a weak signal, not damning.
    if followers >= 10_000 and not (bio or "").strip():
        flags.append("Empty bio on a large account")
        risk += 5

    return flags, min(risk, 100)


# --- 47 + 49. Engagement analysis --------------------------------------------

def _engagement_analysis(followers, posts):
    """Compute engagement rate + comment/like ratio and judge them against the
    creator's follower tier. Returns a dict with the raw numbers and per-check
    verdicts for audience authenticity (47) and engagement authenticity (49)."""
    tier_name, er_lo, er_hi = _tier(followers)

    if not posts or followers <= 0:
        return {
            "tier": tier_name, "engagement_rate": None,
            "avg_likes": None, "avg_comments": None, "comment_like_ratio": None,
            "expected_band": [er_lo, er_hi],
            "audience_authenticity": "unknown",
            "engagement_authenticity": "unknown",
            "notes": ["Not enough post data to compute engagement"],
        }

    avg_likes = sum(p["likes"] for p in posts) / len(posts)
    avg_comments = sum(p["comments"] for p in posts) / len(posts)
    er = (avg_likes + avg_comments) / followers * 100
    cl_ratio = (avg_comments / avg_likes) if avg_likes > 0 else None

    notes = []

    # 47. Audience authenticity: is the engagement rate plausible for the tier?
    if er < er_lo:
        audience = "suspicious"
        notes.append(f"Engagement rate {er:.2f}% is below the {er_lo}-{er_hi}% "
                     f"expected for a {tier_name} account -- possible bought/dead followers")
    elif er > er_hi:
        audience = "suspicious"
        notes.append(f"Engagement rate {er:.2f}% is above the {er_lo}-{er_hi}% "
                     f"expected for a {tier_name} account -- possible engagement pod/bought likes")
    else:
        audience = "healthy"
        notes.append(f"Engagement rate {er:.2f}% is within the healthy {er_lo}-{er_hi}% band")

    # 49. Engagement authenticity: comment-to-like ratio. Real audiences leave
    # roughly 0.5-4% as many comments as likes. Near-zero comments with lots of
    # likes = bought likes; a very high ratio = comment pod / giveaway spam.
    if cl_ratio is None:
        engagement = "unknown"
        notes.append("No likes recorded -- can't judge comment/like ratio")
    elif cl_ratio < 0.003:
        engagement = "suspicious"
        notes.append(f"Only {cl_ratio*100:.2f} comments per 100 likes -- likes may be bought")
    elif cl_ratio > 0.20:
        engagement = "suspicious"
        notes.append(f"{cl_ratio*100:.0f} comments per 100 likes is unusually high -- possible comment pod/giveaway")
    else:
        engagement = "healthy"

    return {
        "tier": tier_name,
        "engagement_rate": round(er, 2),
        "avg_likes": round(avg_likes),
        "avg_comments": round(avg_comments),
        "comment_like_ratio": round(cl_ratio, 4) if cl_ratio is not None else None,
        "expected_band": [er_lo, er_hi],
        "audience_authenticity": audience,
        "engagement_authenticity": engagement,
        "notes": notes,
    }


# --- 48. Brand safety (AI) ---------------------------------------------------

def _brand_safety(username, bio, captions, brand):
    """Gemini scans bio + recent captions for content a brand wouldn't want to
    be associated with. Returns a dict, or a graceful 'unknown' if AI is off or
    the call fails -- verification must still work without an API key."""
    if not _ai_ready:
        return {"verdict": "unknown", "risk": "unknown", "flags": [],
                "note": "Brand-safety AI check skipped (GEMINI_API_KEY not set)"}

    joined = "\n".join(f"- {c[:280]}" for c in captions[:6] if c)
    system_prompt = f"""
You are a brand-safety reviewer for '{brand}'. Decide whether a creator's public
content is safe for a mainstream brand to associate with.

Flag ONLY genuinely risky content: hate speech, explicit sexual content,
graphic violence, illegal drugs/weapons sales, scams/get-rich-quick schemes,
gambling promotion, or heavy political/religious controversy. Everyday opinions,
mild profanity, or ordinary lifestyle content are NOT risks.

Return STRICTLY this JSON (no markdown):
{{
  "verdict": "safe" | "review" | "unsafe",
  "risk": "low" | "medium" | "high",
  "flags": [<short strings naming any concern, empty if none>],
  "note": <one short sentence>
}}
"""
    user_prompt = f"Creator: @{username}\nBio: {bio or '(none)'}\nRecent captions:\n{joined or '(none)'}"
    try:
        reply = gemini_helper.generate_text(system_prompt, user_prompt, json_mode=True)
        start = reply.find("{")
        if start == -1:
            raise ValueError("no JSON in response")
        obj, _ = json.JSONDecoder().raw_decode(reply, start)
        obj.setdefault("verdict", "review")
        obj.setdefault("risk", "medium")
        obj.setdefault("flags", [])
        return obj
    except Exception as e:
        return {"verdict": "unknown", "risk": "unknown", "flags": [],
                "note": f"Brand-safety check failed: {e}"}


# --- Orchestration -----------------------------------------------------------

def verify_creator(profile_data, config=None):
    """Run all computed checks (+ the AI brand-safety pass) over one Apify
    profile object and return a single trust report. Deterministic parts work
    with no API key; only brand safety needs Gemini.

    The overall verdict is intentionally conservative: any single 'suspicious'
    or 'unsafe' signal downgrades a creator to 'review' or 'avoid', because the
    cost of vetting one more account is far lower than burning outreach volume
    (and Meta trust) on a fake or unsafe one.
    """
    config = config or {}
    brand = config.get("brand_display_name", "the brand")

    username = profile_data.get("username") or profile_data.get("ownerUsername") or "unknown"
    followers = _num(profile_data.get("followersCount") or profile_data.get("ownerFollowersCount"))
    following = _num(profile_data.get("followsCount"))
    bio = profile_data.get("biography") or ""

    posts = _extract_posts(profile_data)
    posts_count = _num(profile_data.get("postsCount")) or len(posts)

    captions = []
    for p in (profile_data.get("latestPosts") or []):
        cap = p.get("caption")
        if cap:
            captions.append(str(cap))
    if not captions and profile_data.get("caption"):
        captions.append(str(profile_data.get("caption")))

    fake_flags, fake_risk = _fake_account_signals(followers, following, posts_count, bio)
    engagement = _engagement_analysis(followers, posts)
    safety = _brand_safety(username, bio, captions, brand)

    # --- Roll everything into one 0-100 trust score + verdict ---
    trust = 100
    trust -= fake_risk
    if engagement["audience_authenticity"] == "suspicious":
        trust -= 25
    if engagement["engagement_authenticity"] == "suspicious":
        trust -= 20
    if safety.get("verdict") == "unsafe":
        trust -= 40
    elif safety.get("verdict") == "review":
        trust -= 15
    trust = max(0, min(100, trust))

    fake_verdict = "suspicious" if fake_risk >= 30 else ("watch" if fake_risk >= 10 else "clean")
    # Any hard red flag caps the verdict below "trusted" no matter the score, so
    # a single strong signal (mass-follow spam, unsafe content, dead engagement)
    # can't be diluted into a pass by the rest of the profile looking fine.
    hard_flag = (
        fake_verdict == "suspicious"
        or safety.get("verdict") == "unsafe"
        or engagement["audience_authenticity"] == "suspicious"
        or engagement["engagement_authenticity"] == "suspicious"
    )

    if safety.get("verdict") == "unsafe" or trust < 45:
        verdict = "avoid"
    elif hard_flag or trust < 70:
        verdict = "review"
    else:
        verdict = "trusted"

    return {
        "username": username,
        "trust_score": trust,
        "verdict": verdict,  # trusted | review | avoid
        "followers": int(followers),
        "following": int(following),
        "posts_count": int(posts_count),
        "fake_account": {
            "risk_points": fake_risk,
            "flags": fake_flags,
            "verdict": fake_verdict,
        },
        "engagement": engagement,       # points 47 + 49
        "brand_safety": safety,         # point 48
        "reputation": None,             # point 50 -- filled by merge_reputation()
    }


def merge_reputation(report, reputation_rows):
    """Fold a creator's stored reputation history (point 50) into a verification
    report and let a bad track record override an otherwise-clean score.

    reputation_rows: list of dicts from local_db.list_reputation(username), each
    like {"event": "scam"|"ghosted"|"late"|"good"|"note", "detail", "created_at"}.
    """
    if not reputation_rows:
        report["reputation"] = {"records": [], "verdict": "no_history"}
        return report

    negative = sum(1 for r in reputation_rows if r.get("event") in ("scam", "ghosted", "late", "fake_content"))
    positive = sum(1 for r in reputation_rows if r.get("event") == "good")
    has_scam = any(r.get("event") == "scam" for r in reputation_rows)

    if has_scam:
        rep_verdict = "blacklisted"
        report["verdict"] = "avoid"
        report["trust_score"] = min(report["trust_score"], 10)
    elif negative > positive:
        rep_verdict = "poor"
        report["trust_score"] = max(0, report["trust_score"] - 20)
        if report["verdict"] == "trusted":
            report["verdict"] = "review"
    elif positive > 0:
        rep_verdict = "good"
    else:
        rep_verdict = "neutral"

    report["reputation"] = {
        "records": reputation_rows,
        "verdict": rep_verdict,
        "negative": negative,
        "positive": positive,
    }
    return report
