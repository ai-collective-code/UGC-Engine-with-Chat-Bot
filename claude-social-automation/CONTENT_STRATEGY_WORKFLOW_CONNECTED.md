# CONTENT STRATEGY WORKFLOW
## Connected Pipeline: Reads Competitor + Trend Analysis Data

---

# OVERVIEW

**This is a CONNECTED workflow.**

```
Step 1: Competitor Analysis
        ↓
        Output: competitor_analysis.json
        ↓
Step 2: Trend Analysis (READS competitor data)
        ↓
        Output: trends_analysis.json
        ↓
Step 3: CONTENT STRATEGY (READS BOTH)
        ├─ Input: competitor_analysis.json
        ├─ Input: trends_analysis.json
        └─ Creates: Strategy + Content Buckets
```

---

# STEP 1 & 2 (Inputs for This Workflow)

## From Competitor Analysis:
```json
{
  "competitor": "Competitor A",
  "platforms": ["Instagram", "TikTok", "LinkedIn"],
  "content_focus": {
    "educational": 45,
    "before_after": 30,
    "behind_scenes": 20
  },
  "audience_sentiment": "positive 78%",
  "gaps": ["No busy professional content", "Low LinkedIn engagement"]
}
```

## From Trend Analysis:
```json
{
  "trends": [
    {
      "trend": "Educational content",
      "growth": "3.2x engagement",
      "competitor_opportunity": "They do 45%, you can do 60%"
    },
    {
      "trend": "Behind-the-scenes",
      "growth": "35% engagement premium",
      "competitor_gap": "They only 20%, trend shows opportunity"
    },
    {
      "trend": "Cruelty-free movement",
      "growth": "250% hashtag increase",
      "competitor_doing": "25% of posts",
      "recommendation": "70% of your content"
    }
  ]
}
```

---

# STEP 3: CONTENT STRATEGY WORKFLOW

## INPUT

**File 1:** `competitor_analysis.json`
- What competitors do
- What they're winning on
- What gaps they have

**File 2:** `trends_analysis.json`
- What trends are growing
- Which gaps are opportunities
- Emerging audience demands

---

## PROCESS

### Phase 1: Identify Content Pillars (3-5)

**Using competitor + trend data:**

```
COMPETITOR DATA says:
- "Competitor A does 45% educational"
- "Competitor A has low behind-scenes"
- "Audience sentiment loves transparency"

TREND DATA says:
- "Educational trending 3.2x"
- "Behind-scenes trending 35% premium"
- "Transparency is rising trend"

YOUR STRATEGY:
Pillar 1: EDUCATION (Match + beat competitor)
├─ Their content: "What is clean beauty," "5-minute routines"
├─ Trend shows: 3.2x engagement opportunity
└─ Your angle: "For busy professionals" (gap they don't fill)

Pillar 2: TRANSFORMATION (Competitor strength)
├─ Their content: "Before/after stories," "Customer results"
├─ Engagement: High (30% of their posts)
└─ Your angle: "Real results, real people" (authenticity angle)

Pillar 3: TRANSPARENCY (Trend rising)
├─ Competitor doing: 20% behind-scenes
├─ Trend shows: 35% engagement premium
└─ Your opportunity: 40-50% BTS content (beat them)

Pillar 4: CRUELTY-FREE VALUES (Audience demand)
├─ Competitor mention: 25% of posts
├─ Trend shows: #CrueltyFree ↑250%
└─ Your positioning: Core brand value (emphasize in ALL content)

Pillar 5: COMMUNITY (Underused by competitor)
├─ Competitor: Minimal UGC or community posts
├─ Audience wants: Belonging, community feeling
└─ Your angle: Build community around brand
```

### Phase 2: Map Buyer Journey

**Assign content to each stage:**

```
AWARENESS STAGE (Education Pillar)
├─ Post: "What is clean beauty?"
├─ Why: Competitor does this well (45%), trend confirms (3.2x)
├─ But: Add "for busy professionals" angle
├─ Platform: TikTok, Instagram (reach)
└─ Frequency: 2 posts/week

CONSIDERATION STAGE (Transformation Pillar)
├─ Post: "30-day before/after results"
├─ Why: Competitor does this (30%), audience loves results
├─ Angle: Real customers, real stories
├─ Platform: Instagram Reels, TikTok
└─ Frequency: 2 posts/week

DECISION STAGE (Transparency Pillar)
├─ Post: "Behind-the-scenes sourcing"
├─ Why: Trend trending (35% premium), competitor gap (20%)
├─ Your opportunity: 40% of content
├─ Platform: Instagram Stories, LinkedIn
└─ Frequency: 2 posts/week

IMPLEMENTATION STAGE (Community Pillar)
├─ Post: "How to use this product," "FAQ answered"
├─ Why: Help customers succeed, build loyalty
├─ Angle: Community expert, not just brand
├─ Platform: Instagram, TikTok
└─ Frequency: 1 post/week
```

### Phase 3: Create Weekly Content Mix

**Balanced rotation through pillars + buyer stages:**

```
MONDAY 9:00 AM
├─ Pillar: Education
├─ Stage: Awareness
├─ Type: "5-minute skincare for busy professionals"
├─ Format: Instagram Reel
├─ Why: Competitor does educational (good), trend confirms (3.2x), but missing busy prof angle
└─ Engagement prediction: 4.5%+ (vs competitor 4.2%)

TUESDAY 10:00 AM
├─ Pillar: Transformation
├─ Stage: Consideration
├─ Type: "30-day customer results"
├─ Format: Instagram Carousel
├─ Why: Competitor winning format (30%), audience loves transformation
└─ Engagement prediction: 3.5%+ (proven format)

WEDNESDAY 6:00 PM
├─ Pillar: Transparency
├─ Stage: Decision
├─ Type: "How we source ingredients"
├─ Format: Instagram Reel + Stories
├─ Why: Trend showing 35% engagement premium, competitor gap (only 20%)
└─ Engagement prediction: 2.1x higher than standard post

THURSDAY 10:00 AM
├─ Pillar: Cruelty-Free Values
├─ Stage: Decision
├─ Type: "Our cruelty-free commitment"
├─ Format: LinkedIn Article
├─ Why: #CrueltyFree trending ↑250%, audience demand high
└─ Engagement prediction: High authority positioning

FRIDAY 7:00 PM
├─ Pillar: Education
├─ Stage: Awareness
├─ Type: "Skincare myths debunked"
├─ Format: TikTok/Instagram Reel
├─ Why: Educational trending, new posting time (Friday evening rising)
└─ Engagement prediction: 4.2%+ with emerging time advantage

SATURDAY 9:00 AM
├─ Pillar: Community
├─ Stage: Implementation
├─ Type: "Customer spotlight"
├─ Format: Instagram Reel (User-generated content)
├─ Why: Competitor gap, audience wants community
└─ Engagement prediction: Higher authenticity = higher engagement

SUNDAY 7:00 PM
├─ Pillar: Transparency
├─ Stage: Decision
├─ Type: "Meet the team"
├─ Format: Instagram Post + Stories
├─ Why: Trend showing transparency value, build trust
└─ Engagement prediction: Relationship building = loyalty
```

---

## OUTPUT

### File 1: `content_strategy.md`

```markdown
# Content Strategy
## Based on Competitor Analysis + Trend Research

### Executive Summary
After analyzing 3 competitors across 4 platforms and researching 12 emerging trends, 
we identified strategic opportunities to differentiate and outperform.

### Content Pillars (5 Core Themes)
1. **Education** - How-to, guides, myth-busting (45% of content)
   - Insight from competitor analysis: Competitor A succeeds with this
   - Insight from trend analysis: Educational trending 3.2x engagement
   - Our angle: "For busy professionals" (gap they don't fill)

2. **Transformation** - Before/after, customer results (25% of content)
   - Insight: Competitor A doing well (30%)
   - Our angle: Authenticity and real stories

3. **Transparency** - Behind-scenes, sourcing, process (20% of content)
   - Insight: Competitor A gap (only 20%)
   - Trend: BTS content 35% engagement premium
   - Opportunity: Increase to 40% to capture trend

4. **Cruelty-Free Values** - Core messaging (across all) (10% dedicated)
   - Insight: Competitor A mentions 25%
   - Trend: #CrueltyFree ↑250% searches
   - Recommendation: Emphasize in ALL content

5. **Community** - User-generated, testimonials, FAQ (varies)
   - Insight: Competitor A underutilizes this
   - Opportunity: Build loyalty through community

### Buyer Stage Mapping
- **Awareness**: Education pillar (2 posts/week)
- **Consideration**: Transformation pillar (2 posts/week)
- **Decision**: Transparency + Cruelty-Free pillars (2 posts/week)
- **Implementation**: Community pillar (1 post/week)

### Weekly Content Mix
[Monday-Sunday breakdown from above]

### Content Type Guidelines
- **Educational**: 45% of posts (reel, carousel, article)
- **Transformation**: 25% (before/after reels, carousels)
- **Transparency**: 20% (BTS reels, stories, long-form)
- **Community**: 10% (UGC, testimonials, FAQ)

### Platform Strategy
- **Instagram**: All pillars (primary platform)
- **TikTok**: Education + Transformation focus
- **LinkedIn**: Thought leadership + Cruelty-free positioning
- **Facebook**: Community + testimonials

### Success Metrics
- Educational content: Target 4.5%+ engagement (vs competitor 4.2%)
- Transformation content: Target 3.5%+ engagement
- Transparency content: Target 2.1x higher engagement
- Overall: Target 15-25% higher engagement vs competitors within 60 days
```

### File 2: `content_buckets.json`

```json
{
  "week": "Week 1",
  "strategy": "Build authority through education + transparency",
  "posts": [
    {
      "day": "Monday",
      "time": "09:00 AM",
      "platform": "Instagram Reel",
      "pillar": "Education",
      "buyer_stage": "Awareness",
      "topic": "5-minute skincare routine for busy professionals",
      "content_type": "Educational",
      "shareability": "Searchable (answers: how to skincare when busy)",
      "why_this": "Competitor does educational (45%), trend shows 3.2x engagement, gap is busy professional angle",
      "engagement_prediction": "4.5%+",
      "design_brief_focus": "Quick steps, professional aesthetic",
      "video_script_focus": "Fast-paced, 45 seconds, trending audio",
      "copy_focus": "Hook: 'Save this for your busy morning'",
      "hashtags": ["#BusyProfessional", "#SkincareTips", "#5MinRoutine"]
    },
    {
      "day": "Tuesday",
      "time": "10:00 AM",
      "platform": "Instagram Carousel",
      "pillar": "Transformation",
      "buyer_stage": "Consideration",
      "topic": "30-day customer transformation results",
      "content_type": "Before/After",
      "shareability": "Shareable (inspiration + social proof)",
      "why_this": "Competitor winning format (30%), audience loves transformation stories",
      "engagement_prediction": "3.5%+",
      "design_brief_focus": "Before/after layout, 9-slide carousel",
      "copy_focus": "Customer story, results, CTA for product",
      "hashtags": ["#RealResults", "#TransformationStory", "#BeforeAfter"]
    },
    {
      "day": "Wednesday",
      "time": "06:00 PM",
      "platform": "Instagram Reel + Stories",
      "pillar": "Transparency",
      "buyer_stage": "Decision",
      "topic": "Behind-the-scenes: How we source ingredients",
      "content_type": "Transparency/BTS",
      "shareability": "Shareable (builds trust, sustainability angle)",
      "why_this": "Competitor gap (only 20%), trend shows 35% engagement premium for BTS",
      "engagement_prediction": "2.1x higher",
      "design_brief_focus": "Authentic, behind-scenes footage",
      "video_script_focus": "Journey of ingredient, farm to bottle, 45 seconds",
      "copy_focus": "Sustainable sourcing, ethical practices",
      "hashtags": ["#Sustainable", "#BehindTheScenes", "#Transparency"]
    },
    {
      "day": "Thursday",
      "time": "10:00 AM",
      "platform": "LinkedIn Article",
      "pillar": "Cruelty-Free Values",
      "buyer_stage": "Decision",
      "topic": "Why clean beauty is the future (thought leadership)",
      "content_type": "Thought Leadership",
      "shareability": "Shareable (authority positioning)",
      "why_this": "#CrueltyFree trending ↑250%, LinkedIn weak for competitors",
      "engagement_prediction": "High authority positioning",
      "copy_focus": "Industry insights, data on clean beauty growth",
      "hashtags": ["#CleanBeauty", "#Sustainability", "#BeautyIndustry"]
    },
    {
      "day": "Friday",
      "time": "07:00 PM",
      "platform": "TikTok/Instagram Reel",
      "pillar": "Education",
      "buyer_stage": "Awareness",
      "topic": "Top 5 skincare myths debunked",
      "content_type": "Educational",
      "shareability": "Searchable (answers common questions)",
      "why_this": "Educational trending, new posting time advantage (Friday evening rising)",
      "engagement_prediction": "4.2%+ with time advantage",
      "video_script_focus": "Myth vs reality, quick facts, trending audio",
      "copy_focus": "Hook: 'Stop doing these 5 things'",
      "hashtags": ["#SkincareMythBusting", "#CleanBeauty", "#Skincare101"]
    },
    {
      "day": "Saturday",
      "time": "09:00 AM",
      "platform": "Instagram Reel",
      "pillar": "Community",
      "buyer_stage": "Implementation",
      "topic": "Customer spotlight: Real results from real people",
      "content_type": "User-Generated Content",
      "shareability": "Shareable (authenticity + community)",
      "why_this": "Competitor gap, builds community loyalty",
      "engagement_prediction": "Higher authenticity",
      "video_script_focus": "Customer testimonial, 30-45 seconds",
      "copy_focus": "Celebrate customer, invite community participation",
      "hashtags": ["#CommunityLove", "#RealResults", "#CustomerStories"]
    },
    {
      "day": "Sunday",
      "time": "07:00 PM",
      "platform": "Instagram Post + Stories",
      "pillar": "Transparency",
      "buyer_stage": "Decision",
      "topic": "Meet the team: Meet the founders",
      "content_type": "Relationship Building",
      "shareability": "Shareable (personal connection)",
      "why_this": "Transparency trend, build personal trust",
      "engagement_prediction": "Relationship building = loyalty",
      "design_brief_focus": "Team photo, professional yet approachable",
      "copy_focus": "Team story, mission, why we care",
      "hashtags": ["#MeetTheTeam", "#Founders", "#BeautyFamily"]
    }
  ]
}
```

---

# TIME ESTIMATE

```
Input reading: 30 minutes
Pillar identification: 30 minutes
Buyer stage mapping: 30 minutes
Weekly mix creation: 30 minutes
Document writing: 30 minutes
Review & refinement: 15 minutes

TOTAL: 2.5-3 hours
```

---

# KEY PRINCIPLE: CONNECTED WORKFLOW

This workflow is **NOT standalone**.

```
Competitor Analysis (done)
    ↓ outputs: competitor_analysis.json
    
Trend Analysis (done)
    ↓ reads competitor data + outputs: trends_analysis.json
    
CONTENT STRATEGY (this workflow)
    ↓ reads BOTH outputs
    ├─ Uses competitor insights (what's working, what's gaps)
    ├─ Uses trend insights (what's growing, what's opportunity)
    └─ Creates: Strategy document + content buckets
    
Result: Strategic, data-driven content plan
NOT: Random daily posts
```

---

**Document Version:** 1.0 (Connected to Competitor + Trend Analysis)
**Workflow Type:** Content Strategy Planning (3-5 pillar identification + buyer journey mapping + weekly mix)
**Tool:** Claude API (text analysis, strategy formulation)
**Input:** competitor_analysis.json + trends_analysis.json
**Output:** content_strategy.md + content_buckets.json
**Time:** 2.5-3 hours
**Status:** Ready to implement in Cowork
