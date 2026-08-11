# TREND ANALYSIS WORKFLOW
## Smart Version: Reads Competitor Analysis → Finds Related Trends
## Tool: claude-in-chrome (native browser for trend research)

---

# OVERVIEW

**This workflow:**
1. **Receives**: Output from Competitor Analysis workflow
2. **Reads**: What competitors are doing (their platforms, content, strategies)
3. **Researches**: What trends exist around those competitor activities
4. **Identifies**: Trends competitors are MISSING
5. **Outputs**: Actionable trend recommendations for content

**Key Principle:** Don't analyze random trends. Analyze trends RELATED to what your competitors are doing.

---

# PREREQUISITES

✅ You have completed: **Competitor Analysis Workflow**
✅ You have: `competitor_analysis.json` (competitor data from previous step)

---

# STEP 1: READ COMPETITOR DATA

**Input:** competitor_analysis.json

**Extract:**
```
FOR EACH competitor analyzed:

THEIR ACTIVE PLATFORMS:
├─ Which platforms are they on? (Instagram, TikTok, LinkedIn, etc.)
└─ Only research trends for these platforms

WHAT THEY'RE DOING:
├─ Content themes (educational, before/after, BTS, etc.)
├─ Posting frequency
├─ Best posting times
├─ Top performing content types
├─ Engagement rates
└─ Audience sentiment

WHAT THEY'RE NOT DOING:
├─ Missing content types
├─ Underused platforms
├─ Neglected audience segments
└─ Content gaps competitors have
```

**Example:**
```json
{
  "competitor": "Competitor A",
  "platforms": ["Instagram", "TikTok", "LinkedIn", "YouTube"],
  "content_focus": {
    "educational": 45,
    "before_after": 30,
    "behind_scenes": 20,
    "other": 5
  },
  "best_times": ["Monday 9AM", "Friday 6PM"],
  "engagement_rate": 4.2,
  "audience_sentiment": "positive 78%",
  "gaps": [
    "No content for busy professionals",
    "Low LinkedIn engagement",
    "No micro-influencer collaborations"
  ]
}
```

---

# STEP 2: RESEARCH TRENDS (ONLY for platforms competitor uses)

**Tool:** claude-in-chrome
**Time:** 2-3 hours per competitor

**For EACH competitor activity, research related trends:**

### Research Method 1: Google Search via claude-in-chrome

```
FOR EACH content theme competitor uses:

Step 1: Navigate to Google
├─ claude-in-chrome:navigate("https://google.com")
├─ Search: "[industry] [content_type] trends 2025"
│  Example: "skincare educational content trends 2025"
└─ Document results

Step 2: Check Google Trends
├─ Navigate: https://trends.google.com
├─ Search: Industry keywords + trending terms
└─ Document growth trends
```

### Research Method 2: Platform-Specific Trend Research via claude-in-chrome

```
FOR EACH platform competitor uses:

TikTok Trends:
├─ Navigate: https://tiktok.com/discover
├─ Search for keywords related to competitor's content
├─ Document: Trending sounds, hashtags, content formats
└─ Screenshot evidence

Instagram Trends:
├─ Navigate: https://instagram.com/explore
├─ Search for industry + trending terms
├─ Document: Trending content, hashtags, formats
└─ Screenshot evidence

LinkedIn Trends:
├─ Navigate: https://linkedin.com/feed/
├─ Search for industry thought leadership topics
├─ Document: Trending articles, engagement patterns
└─ Screenshot evidence

YouTube Trends:
├─ Navigate: https://youtube.com/feed/trending
├─ Search for industry content
├─ Document: Trending videos, formats, topics
└─ Screenshot evidence
```

### Research Method 3: Industry Search via claude-in-chrome

```
FOR EACH content gap competitor has:

Search: "[industry] [gap topic] trending"
Example: "skincare cruelty-free trending"

Document:
├─ Search volume growth
├─ Related searches
├─ Hashtag trends (#CleanBeauty, #CrueltyFree, etc.)
└─ Emerging keywords
```

---

# STEP 3: ANALYZE TREND PATTERNS

**For each trend found, analyze:**

```json
{
  "trend_name": "Educational Content Dominance",
  "source": "Google Trends, TikTok, Instagram",
  "related_to_competitor": "Competitor A does 45% educational",
  "trend_metrics": {
    "growth_rate": "↑ 3.2x engagement vs average",
    "maturity_stage": "Mainstream + growing",
    "affected_audience": "18-35 year olds",
    "platform_relevance": ["TikTok", "Instagram", "YouTube"]
  },
  "competitor_opportunity": {
    "current_position": "45% educational (good)",
    "recommendation": "Increase to 60% (beat competitors)",
    "emerging_angle": "For busy professionals (not covered by competitors)"
  },
  "actionable_insight": "Educational content with busy professional angle = win"
}
```

---

# STEP 4: IDENTIFY COMPETITOR GAPS & TRENDS

**Cross-reference:**
- What competitors are doing
- What trends show is growing
- What competitors are NOT doing

**Output:**

```
TREND 1: Educational Content with Niche Angle
├─ Competitors doing: 45% educational (good)
├─ Trend shows: 3.2x engagement (confirmed good)
├─ Gap: No "busy professional" angle
├─ Opportunity: Combine educational + busy professional
└─ Action: Create "5-minute skincare routine" series

TREND 2: Cruelty-Free / Clean Beauty Movement
├─ Competitors doing: Mentioned in 25% of posts
├─ Trend shows: #CrueltyFree ↑250%, #CleanBeauty ↑350%
├─ Gap: Competitors not emphasizing enough
├─ Opportunity: 70% of content with cruelty-free angle
└─ Action: Emphasize in ALL content + dedicated series

TREND 3: Behind-the-Scenes Transparency
├─ Competitors doing: Only 20-30% BTS content
├─ Trend shows: BTS trending ↑35% engagement premium
├─ Gap: Massive gap (20% vs 35% trend opportunity)
├─ Opportunity: 40-50% BTS content (double competitors)
└─ Action: Film manufacturing, sourcing, team content

TREND 4: Micro-Influencer Collaborations
├─ Competitors doing: Mostly macro-influencers (500K+)
├─ Trend shows: Micro-influencers 2.1x better engagement
├─ Gap: Not using micro-influencers
├─ Opportunity: Partner with 5-10 micro-influencers
└─ Action: Launch micro-influencer program this month
```

---

# STEP 5: CREATE WEEKLY CONTENT CALENDAR

**Based on identified trends + competitor analysis:**

```
MONDAY 9:00 AM - Instagram Reel
├─ Trend: Educational + Busy Professional
├─ Topic: "5-Minute Skincare Routine"
├─ Why: Competitor educational (45%) + emerging busy prof trend (↑180%)
├─ Format: 45-sec vertical Reel
├─ Engagement prediction: 4.5%+ (vs competitor 4.2%)
└─ Design brief: 5 steps, quick transitions, professional

TUESDAY 10:00 AM - Instagram Carousel
├─ Trend: BTS Transparency (trending ↑35%)
├─ Topic: "How We Source Ingredients"
├─ Why: Competitor gap (20%) vs trend opportunity (35%)
├─ Format: 9-slide carousel
├─ Engagement prediction: 2.1x higher than standard
└─ Design brief: Manufacturing, sourcing, sustainability

WEDNESDAY 6:00 PM - Instagram Reel
├─ Trend: Before/After + Cruelty-Free
├─ Topic: "30-Day Skincare Transformation"
├─ Why: Proven format (6.8%) + missing cruelty-free angle (↑250%)
├─ Format: 45-sec before/after Reel
├─ Engagement prediction: 5.5%+ (enhanced format)
└─ Audio: Trending sound + cruelty-free testimonial

THURSDAY 10:00 AM - LinkedIn Post
├─ Trend: LinkedIn Thought Leadership (competitor weak)
├─ Topic: "Why Clean Beauty is the Future"
├─ Why: #CleanBeauty trending on LinkedIn + competitor 2.1% engagement
├─ Format: Article + post
├─ Engagement prediction: High authority positioning
└─ Content: Thought leadership about clean beauty

FRIDAY 7:00 PM - Instagram Reel
├─ Trend: Emerging posting time (Friday 7PM ↑45%)
├─ Topic: "Weekend Skincare Reset"
├─ Why: Competitor posts Monday 9AM (old peak), Friday 7PM rising
├─ Format: Before/after Reel
├─ Timing insight: New peak time, less competition
└─ Hashtags: #FridayReset #Skincare #WeekendSelfCare

SATURDAY 9:00 AM - Instagram Reel
├─ Trend: Micro-Influencer Collaborations (↑45%)
├─ Topic: "Customer Testimonial with Micro-Influencer"
├─ Why: Trending 2.1x better engagement, competitor not doing
├─ Format: Authentic testimonial Reel
├─ Influencer: @micro_influencer_name (50K-100K followers)
└─ Hashtags: #CommunityLove #RealResults #Authentic

SUNDAY 7:00 PM - Instagram Post
├─ Trend: Transparency + Brand Building
├─ Topic: "Team Photo + Cruelty-Free Commitment"
├─ Why: Transparency builds trust + cruelty-free audience demand
├─ Format: High-quality brand post
└─ Content: Team photo + cruelty-free values message
```

---

# STEP 6: OUTPUT

**Create: `trends_analysis.md`**

```markdown
# Trend Analysis Report
## Based on Competitor Analysis Output

### Executive Summary
Competitor analysis identified 4 active platforms with specific strategies.
Trend research reveals opportunity areas:

1. **Educational + Niche Angle** - Competitor 45% edu, trends show ↑3.2x
2. **Cruelty-Free Emphasis** - Competitor 25%, trends show ↑250% interest
3. **Behind-The-Scenes** - Competitor 20%, trends show ↑35% engagement
4. **Micro-Influencer Model** - Competitor not using, trends show ↑2.1x engagement
5. **LinkedIn Opportunity** - Competitor weak, #CleanBeauty trending there
6. **Busy Professional Niche** - Competitor zero content, trend ↑180% searches

### Key Trends Identified
1. Educational Content with Emerging Niches
2. Cruelty-Free / Clean Beauty Movement
3. Behind-The-Scenes Transparency Premium
4. Micro-Influencer Creator Economy
5. LinkedIn Thought Leadership Gap
6. Emerging Posting Times (Friday-Sunday evening)

### Competitive Advantage
By acting on these trends BEFORE competitors:
- Match their education (45%) + beat them (60%)
- Capture emerging niche (busy professionals) 3 months early
- Dominate LinkedIn while they're weak
- Implement micro-influencer strategy first
- Fill BTS content gap with trending format

### Recommended Actions (This Week)
1. Create "5-minute skincare routine" Reel series
2. Film behind-the-scenes content
3. Create before/after with cruelty-free testimonial
4. Write LinkedIn thought leadership article
5. Identify 5-10 micro-influencers for partnership
6. Emphasize cruelty-free in all content

### Expected Results
- 15-25% higher engagement within 1-2 months
- First-mover advantage on emerging niches
- Authority positioning on LinkedIn
- 2.1x better engagement via micro-influencers
```

---

# TIME ESTIMATE

```
Step 1: Read competitor data: 15-30 min
Step 2: Research trends (2-3 hours per competitor):
├─ Google/Google Trends research: 45 min
├─ TikTok/Instagram trend research: 45 min
└─ Platform-specific research: 30 min

Step 3: Analyze patterns: 30 min
Step 4: Identify gaps: 30 min
Step 5: Create content calendar: 1 hour
Step 6: Write report: 30-45 min

TOTAL PER COMPETITOR: 2.5-3.5 hours

For 3 competitors: 7.5-10.5 hours
```

---

# KEY PRINCIPLE

**This workflow is CONNECTED to Competitor Analysis.**

- ✅ Takes competitor data as INPUT
- ✅ Researches trends RELATED to what they're doing
- ✅ Finds gaps they're missing
- ✅ Outputs actionable, specific trends (not generic)
- ✅ Provides weekly content calendar ready to execute

---

**Document Version:** 2.0 (Updated smart version - claude-in-chrome only)
**Workflow Type:** Trend Analysis (Dependent on Competitor Analysis)
**Tool:** claude-in-chrome (browser automation for trend research)
**Input:** competitor_analysis.json
**Output:** trends_analysis.md + weekly_content_calendar.json
**Time:** 2.5-3.5 hours per competitor
