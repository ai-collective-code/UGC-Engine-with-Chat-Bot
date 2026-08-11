# CONTENT BUCKETING WORKFLOW
## Connected to Content Strategy → Feeds into Design/Video/Copy

---

# OVERVIEW

**This is a CONNECTED workflow.**

```
Step 3: Content Strategy
        ↓
        Output: content_strategy.md + initial content_buckets.json
        ↓
Step 4: CONTENT BUCKETING (READS Content Strategy output)
        ├─ Input: content_strategy.md
        ├─ Input: initial content_buckets.json
        ├─ Refines: Adds specific topics, times, platforms
        └─ Output: FINAL content_buckets.json (detailed)
        ↓
Step 5a, 5b, 5c: EXECUTION (ALL read content_buckets.json)
        ├─ Design Briefs (5a)
        ├─ Video Scripts (5b)
        └─ Copy & Captions (5c)
```

---

# STEP 3 OUTPUTS (Inputs for This Workflow)

## From Content Strategy:

### File 1: content_strategy.md
```
Contains:
├─ 5 Content Pillars with percentages
│  ├─ Pillar 1: Education (45%)
│  ├─ Pillar 2: Transformation (25%)
│  ├─ Pillar 3: Transparency (20%)
│  └─ Pillar 4: Cruelty-Free (10%)
│
├─ Buyer Journey Mapping
│  ├─ Awareness → Education pillar
│  ├─ Consideration → Transformation pillar
│  └─ Decision → Transparency + Cruelty-Free
│
├─ Platform Strategy
│  ├─ Instagram: All pillars
│  ├─ TikTok: Education + Transformation
│  └─ LinkedIn: Thought leadership
│
└─ Weekly Content Mix Guidelines
```

### File 2: initial content_buckets.json
```json
{
  "week": "Week 1",
  "pillars": {
    "education": {"percentage": 45, "count": 3},
    "transformation": {"percentage": 25, "count": 2},
    "transparency": {"percentage": 20, "count": 1},
    "cruelty_free": {"percentage": 10, "count": 1}
  },
  "total_posts": 7,
  "notes": "Distribution plan based on strategy"
}
```

---

# STEP 4: CONTENT BUCKETING WORKFLOW

## INPUT

**File 1:** `content_strategy.md` (from Content Strategy)
**File 2:** `initial content_buckets.json` (from Content Strategy)

---

## PROCESS

### Phase 1: Distribute Posts to Days/Platforms

**Starting point from strategy:**
```
Total posts: 7 (Mon-Sun)
Education: 3 posts (45%)
Transformation: 2 posts (25%)
Transparency: 1 post (20%)
Cruelty-Free: 1 post (10%)
```

**Assign to days:**
```
EDUCATION (3 posts):
├─ Monday 09:00 AM (peak time)
├─ Friday 07:00 PM (emerging time)
└─ Thursday 02:00 PM (secondary)

TRANSFORMATION (2 posts):
├─ Tuesday 10:00 AM (visual content peak)
└─ Saturday 09:00 AM (weekend self-care)

TRANSPARENCY (1 post):
└─ Wednesday 06:00 PM (authentic timing)

CRUELTY-FREE (1 post):
└─ Sunday 07:00 PM (values reinforcement)
```

### Phase 2: Assign Platforms

**Using platform strategy from Content Strategy:**
```
EDUCATION posts:
├─ Monday: Instagram Reel (broad reach)
├─ Friday: TikTok/Instagram Reel (emerging platform)
└─ Thursday: Instagram Reel (main platform)

TRANSFORMATION posts:
├─ Tuesday: Instagram Carousel (before/after visual)
└─ Saturday: Instagram Reel (customer story)

TRANSPARENCY post:
└─ Wednesday: Instagram Reel + Stories (authentic)

CRUELTY-FREE post:
└─ Sunday: LinkedIn Article (thought leadership)
```

### Phase 3: Assign Buyer Stages

**Using buyer journey from Content Strategy:**
```
AWARENESS stage (Education pillar):
├─ Monday: "5-minute skincare for busy professionals"
├─ Friday: "Top 5 skincare myths debunked"
└─ Thursday: "Skincare 101: Basics everyone needs"

CONSIDERATION stage (Transformation pillar):
├─ Tuesday: "30-day customer before/after results"
└─ Saturday: "Customer testimonial: How we changed her routine"

DECISION stage (Transparency + Cruelty-Free):
├─ Wednesday: "How we source ingredients sustainably"
└─ Sunday: "Why we're committed to cruelty-free beauty"
```

### Phase 4: Create Specific Topics

**Based on competitor gaps + trends identified in earlier steps:**

```
MONDAY (Education, Instagram Reel, Awareness)
Topic: "5-minute skincare routine for busy professionals"
Why: 
├─ Competitor Analysis said: "Gap = no busy professional angle"
├─ Trend Analysis said: "#BusyProfessional ↑45%, search ↑180%"
└─ Strategy said: "Add specific angle competitors miss"

TUESDAY (Transformation, Instagram Carousel, Consideration)
Topic: "30-day customer transformation results"
Why:
├─ Competitor Analysis said: "Competitor A does before/after well (30%)"
├─ Trend Analysis said: "Before/after is proven format"
└─ Strategy said: "Match what works, add authenticity"

WEDNESDAY (Transparency, Instagram Reel, Decision)
Topic: "Behind-the-scenes: How we source ingredients"
Why:
├─ Competitor Analysis said: "Gap = low behind-scenes content (20%)"
├─ Trend Analysis said: "BTS content 35% engagement premium"
└─ Strategy said: "Increase from 20% to 40%"

THURSDAY (Education, Instagram Reel, Awareness)
Topic: "Skincare 101: The basics everyone needs"
Why:
├─ Educational pillar needs 3 posts (45%)
├─ Different angle from Monday (more foundational)
└─ Support awareness stage

FRIDAY (Education, TikTok Reel, Awareness)
Topic: "Top 5 skincare myths debunked"
Why:
├─ Educational content trending 3.2x engagement
├─ Emerging platform (TikTok) with younger audience
└─ Myth-busting is shareable format

SATURDAY (Transformation, Instagram Reel, Consideration)
Topic: "Customer spotlight: Real results from a real person"
Why:
├─ Social proof builds consideration
├─ User-generated authenticity
└─ Weekend self-care timing

SUNDAY (Cruelty-Free, LinkedIn Article, Decision)
Topic: "Why clean beauty is the future (thought leadership)"
Why:
├─ #CrueltyFree trending ↑250%
├─ LinkedIn weak for competitors
└─ Authority positioning for decision stage
```

### Phase 5: Add Content Details

**For each post, add metadata:**

```
Each post includes:
├─ Day
├─ Time
├─ Platform
├─ Pillar
├─ Buyer Stage
├─ Topic
├─ Content Type (Reel, Carousel, Article, Stories)
├─ Expected Format (video, image, text)
├─ Hashtag themes
├─ Content focus areas
└─ Competitive positioning
```

---

## OUTPUT

### File: `content_buckets.json` (FINAL, DETAILED)

```json
{
  "week": "Week 1",
  "strategy_source": "content_strategy.md",
  "total_posts": 7,
  "pillars": {
    "education": {"count": 3, "percentage": 43},
    "transformation": {"count": 2, "percentage": 29},
    "transparency": {"count": 1, "percentage": 14},
    "cruelty_free": {"count": 1, "percentage": 14}
  },
  "posts": [
    {
      "id": "MON_001",
      "day": "Monday",
      "date": "2025-01-27",
      "time": "09:00 AM",
      "platform": "Instagram Reel",
      "pillar": "Education",
      "buyer_stage": "Awareness",
      "topic": "5-minute skincare routine for busy professionals",
      "content_type": "Educational Reel",
      "format": "Vertical video (1080x1920)",
      "duration": "45 seconds",
      "why_this_post": {
        "competitor_insight": "Competitor A gap: no busy professional angle",
        "trend_insight": "#BusyProfessional trending ↑45%, searches ↑180%",
        "strategy_alignment": "Fill competitor gap + capture trend"
      },
      "expected_engagement": "4.5%+ (vs competitor 4.2%)",
      "hashtag_themes": ["#BusyProfessional", "#SkincareTips", "#QuickRoutine"],
      "target_audience": "Professionals, Gen Z, time-poor",
      "design_focus": "Fast-paced, professional aesthetic",
      "script_focus": "Quick steps, trending audio",
      "copy_focus": "Hook: Save for busy mornings"
    },
    {
      "id": "TUE_001",
      "day": "Tuesday",
      "date": "2025-01-28",
      "time": "10:00 AM",
      "platform": "Instagram Carousel",
      "pillar": "Transformation",
      "buyer_stage": "Consideration",
      "topic": "30-day customer transformation results (before/after)",
      "content_type": "Before/After Carousel",
      "format": "9-slide carousel (1080x1350 each)",
      "why_this_post": {
        "competitor_insight": "Competitor A succeeds with this (30%)",
        "trend_insight": "Before/after is proven, high-engagement format",
        "strategy_alignment": "Match winning format, add authenticity"
      },
      "expected_engagement": "3.5%+ (proven format)",
      "hashtag_themes": ["#RealResults", "#Transformation", "#BeforeAfter"],
      "target_audience": "Prospective customers, consideration stage",
      "design_focus": "Clear before/after layout, 9 slides telling story",
      "copy_focus": "Customer story, results narrative, CTA"
    },
    {
      "id": "WED_001",
      "day": "Wednesday",
      "date": "2025-01-29",
      "time": "06:00 PM",
      "platform": "Instagram Reel + Stories",
      "pillar": "Transparency",
      "buyer_stage": "Decision",
      "topic": "Behind-the-scenes: How we source ingredients",
      "content_type": "Transparency/BTS Reel",
      "format": "Vertical video (1080x1920) + 3-5 stories",
      "why_this_post": {
        "competitor_insight": "Competitor A gap: only 20% BTS content",
        "trend_insight": "BTS content 35% engagement premium",
        "strategy_alignment": "Fill major gap, capture trend opportunity"
      },
      "expected_engagement": "2.1x higher than standard",
      "hashtag_themes": ["#BehindTheScenes", "#Sustainable", "#Transparency"],
      "target_audience": "Conscious consumers, decision makers",
      "design_focus": "Authentic, behind-scenes footage",
      "script_focus": "Journey from farm to bottle, sustainability",
      "copy_focus": "Ethical sourcing, sustainability values"
    },
    {
      "id": "THU_001",
      "day": "Thursday",
      "date": "2025-01-30",
      "time": "02:00 PM",
      "platform": "Instagram Reel",
      "pillar": "Education",
      "buyer_stage": "Awareness",
      "topic": "Skincare 101: The basics everyone needs to know",
      "content_type": "Educational Reel",
      "format": "Vertical video (1080x1920)",
      "duration": "45 seconds",
      "why_this_post": {
        "competitor_insight": "Educational content is pillar (45%)",
        "trend_insight": "Educational content trending 3.2x",
        "strategy_alignment": "Support awareness stage, different angle from Monday"
      },
      "expected_engagement": "4.2%+",
      "hashtag_themes": ["#SkincareTips", "#Skincare101", "#BeautyBasics"],
      "target_audience": "Beginners, awareness stage",
      "design_focus": "Clear educational breakdown",
      "script_focus": "Foundational skincare steps"
    },
    {
      "id": "FRI_001",
      "day": "Friday",
      "date": "2025-01-31",
      "time": "07:00 PM",
      "platform": "TikTok Reel",
      "pillar": "Education",
      "buyer_stage": "Awareness",
      "topic": "Top 5 skincare myths debunked (with proof)",
      "content_type": "Educational Myth-Busting",
      "format": "Vertical video (1080x1920)",
      "duration": "30-45 seconds",
      "why_this_post": {
        "competitor_insight": "Educational content proven (45%)",
        "trend_insight": "Myth-busting highly shareable, emerging posting time",
        "strategy_alignment": "Leverage emerging platform + time advantage"
      },
      "expected_engagement": "4.2%+ with time advantage",
      "hashtag_themes": ["#SkincareMythBusting", "#CleanBeauty", "#Skincare"],
      "target_audience": "Gen Z, TikTok audience",
      "design_focus": "Fast-paced, on-brand graphics",
      "script_focus": "Myth vs reality, quick delivery, trending audio"
    },
    {
      "id": "SAT_001",
      "day": "Saturday",
      "date": "2025-02-01",
      "time": "09:00 AM",
      "platform": "Instagram Reel",
      "pillar": "Community",
      "buyer_stage": "Implementation",
      "topic": "Customer spotlight: Meet Sarah (transformation story)",
      "content_type": "User-Generated Content/Testimonial",
      "format": "Vertical video (1080x1920)",
      "duration": "45 seconds",
      "why_this_post": {
        "competitor_insight": "Competitor A underutilizes community content",
        "trend_insight": "Authenticity builds loyalty",
        "strategy_alignment": "Build community, implementation support"
      },
      "expected_engagement": "Higher authenticity = higher engagement",
      "hashtag_themes": ["#CommunityLove", "#CustomerStories", "#RealPeople"],
      "target_audience": "Existing customers, community builders",
      "design_focus": "Authentic, genuine customer footage",
      "script_focus": "Customer's story, journey, results"
    },
    {
      "id": "SUN_001",
      "day": "Sunday",
      "date": "2025-02-02",
      "time": "07:00 PM",
      "platform": "LinkedIn Article",
      "pillar": "Cruelty-Free Values",
      "buyer_stage": "Decision",
      "topic": "Why clean beauty is the future of the industry",
      "content_type": "Thought Leadership Article",
      "format": "LinkedIn article (1000-1500 words)",
      "why_this_post": {
        "competitor_insight": "#CrueltyFree trending ↑250%, LinkedIn weak for competitors",
        "trend_insight": "Clean beauty movement accelerating",
        "strategy_alignment": "Authority positioning on LinkedIn, fill competitor gap"
      },
      "expected_engagement": "High authority positioning",
      "hashtag_themes": ["#CleanBeauty", "#Sustainability", "#BeautyIndustry"],
      "target_audience": "B2B, industry leaders, conscious consumers",
      "copy_focus": "Industry insights, data, thought leadership"
    }
  ],
  "distribution_summary": {
    "by_pillar": {
      "education": 3,
      "transformation": 2,
      "transparency": 1,
      "cruelty_free": 1
    },
    "by_platform": {
      "instagram_reel": 4,
      "instagram_carousel": 1,
      "tiktok": 1,
      "linkedin": 1
    },
    "by_buyer_stage": {
      "awareness": 3,
      "consideration": 2,
      "decision": 2
    }
  },
  "ready_for_execution": true,
  "feeds_into": [
    "Design_Briefs_Workflow (5a)",
    "Video_Scripts_Workflow (5b)",
    "Copy_Captions_Workflow (5c)"
  ]
}
```

---

# TIME ESTIMATE

```
Phase 1: Distribute to days/platforms: 20 min
Phase 2: Assign platforms: 15 min
Phase 3: Assign buyer stages: 15 min
Phase 4: Create specific topics: 30 min
Phase 5: Add detailed content specs: 20 min

TOTAL: 1.5-2 hours
```

---

# HOW IT FEEDS INTO NEXT STEPS

```
content_buckets.json (from this workflow)
    ↓
    ├─→ Design Briefs Workflow (5a)
    │   "For Monday's Instagram Reel (education pillar),
    │    here's the design spec..."
    │   ├─ Format: 1080x1920
    │   ├─ Duration: 45 sec
    │   ├─ Topic: 5-minute skincare for busy professionals
    │   └─ Canva creates graphic
    │
    ├─→ Video Scripts Workflow (5b)
    │   "For Wednesday's behind-the-scenes reel,
    │    here's the scene breakdown..."
    │   ├─ Scene 1: Hook + music
    │   ├─ Scene 2-6: Sourcing journey
    │   ├─ Scene 7: Final product
    │   └─ Higgsfield generates video
    │
    └─→ Copy & Captions Workflow (5c)
        "For all 7 posts, here's what to write..."
        ├─ Monday: Hook + caption + hashtags
        ├─ Tuesday: Customer story + CTA
        └─ ... (all 7 posts)
```

---

# KEY PRINCIPLE: CONNECTED WORKFLOW

This workflow is **NOT standalone**.

```
Content Strategy (Step 3):
    ↓ "Here's 5 pillars: 45% education, 25% transformation..."
    
Content Bucketing (Step 4) - THIS WORKFLOW:
    ↓ "Okay, so that's 3 education posts, 2 transformation posts..."
    ↓ "Monday is education, Tuesday is transformation..."
    ↓ "Monday at 9AM on Instagram Reel about 'busy professionals'..."
    
Design/Video/Copy (Step 5):
    ↓ "Perfect! Here's exactly what to create for each day"
```

---

**Document Version:** 1.0 (Connected to Content Strategy)
**Workflow Type:** Content Calendar Bucketing (Detailed planning)
**Tool:** Claude API (organization, distribution, assignment)
**Input:** content_strategy.md + initial content_buckets.json
**Output:** FINAL content_buckets.json (detailed, ready for execution)
**Time:** 1.5-2 hours
**Status:** Ready to implement in Cowork
**Feeds Into:** Design Briefs (5a), Video Scripts (5b), Copy & Captions (5c)
