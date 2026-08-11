# AUTOMATED COMPETITOR ANALYSIS WORKFLOW
## Smart Approach: Discover Platforms First, Then Analyze

---

# STEP 1: INPUT - SPECIFY YOUR ANALYSIS PARAMETERS

## Your Company (Company to Compare Against)
```
Company Name: [YOUR COMPANY NAME]
Domain: [your-company.com]
Industry: [Industry]
```

## Competitors to Analyze
```
Competitor 1: [Name]
Competitor 2: [Name]
Competitor 3: [Name] (optional)
Competitor 4: [Name] (optional)
Competitor 5: [Name] (optional)

Total Competitors: [1-5]
```

---

# STEP 2: DISCOVER - WHICH PLATFORMS ARE COMPETITORS USING?

**Goal:** Find out what social media platforms each competitor is active on
**Tool:** claude-in-chrome (navigate to competitor website + check for social links)
**Time:** 15-30 minutes per competitor

## How to Discover:

### Method 1: Check Competitor Website
```
FOR EACH competitor:
├─ Navigate to competitor's website homepage
├─ Look for social media links/icons (usually footer or header)
├─ Document each platform they link to:
│  ├─ Instagram? (Yes/No) → If YES, get @handle
│  ├─ TikTok? (Yes/No) → If YES, get @handle
│  ├─ LinkedIn? (Yes/No) → If YES, get company page URL
│  ├─ Twitter/X? (Yes/No) → If YES, get @handle
│  ├─ Facebook? (Yes/No) → If YES, get page name
│  ├─ YouTube? (Yes/No) → If YES, get channel name
│  ├─ Snapchat? (Yes/No) → If YES, get username
│  ├─ Pinterest? (Yes/No) → If YES, get profile name
│  └─ Discord? (Yes/No) → If YES, get server link
└─ Screenshot footer/header with social links as evidence
```

### Method 2: Search for Competitor Handle
```
FOR EACH competitor:
├─ Use Google to search: "[Competitor Name] Instagram" 
├─ Use Google to search: "[Competitor Name] TikTok"
├─ Use Google to search: "[Competitor Name] LinkedIn"
├─ Note: Which results show verified/official accounts
└─ Document: Found or Not Found for each platform
```

### Method 3: Check About/Contact Pages
```
FOR EACH competitor:
├─ Navigate to About page
├─ Navigate to Contact page
├─ Check if social links mentioned
├─ Look for "Follow us on:" sections
└─ Document all platforms listed
```

## Output: Competitor Platform List

```json
{
  "competitor_name": "Competitor A",
  "platforms_active": [
    {
      "platform": "Instagram",
      "active": true,
      "handle": "@competitor_a",
      "url": "https://instagram.com/competitor_a",
      "verified": true
    },
    {
      "platform": "TikTok",
      "active": true,
      "handle": "@competitora",
      "url": "https://tiktok.com/@competitora",
      "verified": false
    },
    {
      "platform": "LinkedIn",
      "active": true,
      "handle": "competitor-a",
      "url": "https://linkedin.com/company/competitor-a",
      "verified": true
    },
    {
      "platform": "YouTube",
      "active": true,
      "handle": "CompetitorA",
      "url": "https://youtube.com/@CompetitorA",
      "verified": true
    },
    {
      "platform": "Twitter/X",
      "active": false,
      "handle": null,
      "url": null,
      "verified": false
    },
    {
      "platform": "Facebook",
      "active": false,
      "handle": null,
      "url": null,
      "verified": false
    },
    {
      "platform": "Snapchat",
      "active": false,
      "handle": null,
      "url": null,
      "verified": false
    },
    {
      "platform": "Pinterest",
      "active": false,
      "handle": null,
      "url": null,
      "verified": false
    },
    {
      "platform": "Discord",
      "active": false,
      "handle": null,
      "url": null,
      "verified": false
    }
  ],
  "total_platforms": 4,
  "platforms_to_analyze": ["Instagram", "TikTok", "LinkedIn", "YouTube"]
}
```

---

# STEP 3: ANALYZE - ONLY THE PLATFORMS THEY USE

**Goal:** Deep analysis of ONLY the platforms competitor is active on
**Tool:** claude-in-chrome
**Time:** 5-8 hours per competitor (varies by platform count)

## A. Your Company's Active Platforms

### Phase 1: Discover Your Platforms

```
Same as Competitor Discovery (STEP 2)
├─ Navigate to your website
├─ Find which platforms you're on
└─ Document: platforms_to_analyze for your company
```

### Phase 2: Analyze Your Platforms

```
FOR EACH platform your company is on:

STEP 1: Navigate to Your Company Profile
├─ claude-in-chrome:navigate([PLATFORM_URL]/[YOUR_HANDLE])
├─ claude-in-chrome:computer(action: screenshot, save_to_disk: true)
└─ claude-in-chrome:read_page(filter: "all")

STEP 2: Extract Profile Information
├─ Followers: [Number]
├─ Following: [Number]
├─ Total Posts: [Count]
├─ Verified: [Yes/No]
├─ Bio: [Exact text]
├─ Profile URL: [Link]
└─ Profile picture: [Screenshot]

STEP 3: Collect Posts/Content (Last 30 days)
├─ claude-in-chrome:computer(action: scroll, scroll_direction: down, repeat: 15-20)
├─ For EACH post:
│  ├─ Caption text
│  ├─ Likes count
│  ├─ Comments count
│  ├─ Shares count (if visible)
│  ├─ Post date/time
│  ├─ Post type (image/video/carousel/reel)
│  ├─ Hashtags
│  ├─ @mentions
│  └─ Screenshot
└─ Create JSON entry

STEP 4: Top Posts Comment Analysis
├─ Find top 5-10 posts (highest engagement)
├─ For EACH:
│  ├─ Click to open full view
│  ├─ Scroll through comments
│  ├─ Extract: Comment text, sentiment, commenter, replies
│  └─ Screenshot
└─ Compile sentiment summary
```

---

## B. Competitor Social Media Analysis (ONLY Active Platforms)

```
FOR EACH COMPETITOR:
  FOR EACH platform they are ACTUALLY using:

STEP 1: Navigate to Competitor Profile
├─ claude-in-chrome:navigate([PLATFORM_URL]/[COMPETITOR_HANDLE])
├─ claude-in-chrome:computer(action: screenshot, save_to_disk: true)
└─ claude-in-chrome:read_page(filter: "all")

STEP 2: Extract Profile Information
├─ Followers: [Number]
├─ Following: [Number]
├─ Total Posts: [Count]
├─ Verified: [Yes/No]
├─ Bio: [Exact text]
└─ Profile URL: [Link]

STEP 3: Collect Posts/Content (Last 30 days)
├─ claude-in-chrome:computer(action: scroll, scroll_direction: down, repeat: 20-30)
├─ Extract ALL metadata for each post
└─ Create JSON file

STEP 4: Top Posts Comment Analysis
├─ Top 10 highest engagement posts
├─ Extract ALL comments with sentiment
├─ Analyze complaint/praise themes
└─ Screenshot evidence
```

---

# STEP 4: EXTRACT DATA STRUCTURE

## Platform Analysis Data (Per Platform, Per Competitor)

```json
{
  "company": "Competitor A",
  "platform": "Instagram",
  "analysis_date": "2025-01-20",
  
  "profile_metrics": {
    "followers": 245000,
    "following": 1200,
    "total_posts": 2350,
    "verified": true,
    "bio": "[Exact bio text]",
    "profile_url": "https://instagram.com/competitor_a"
  },
  
  "content_metrics_30d": {
    "total_posts": 25,
    "avg_likes_per_post": 5240,
    "avg_comments_per_post": 145,
    "avg_engagement_rate": 4.2,
    "posting_frequency": "3-4 posts per week",
    "best_posting_time": "Tuesday 9AM, Friday 6PM",
    "top_post": {
      "caption": "[Text]",
      "likes": 15000,
      "engagement_rate": 6.8
    },
    "engagement_trend": "↑ Up"
  },
  
  "content_themes": {
    "educational": 45,
    "behind_the_scenes": 30,
    "product_showcase": 25
  },
  
  "audience_sentiment": {
    "positive_comments": 78,
    "negative_comments": 12,
    "neutral_comments": 10,
    "top_complaints": ["Price too high", "Shipping slow"],
    "top_praise": ["Great quality", "Fast delivery"]
  },
  
  "posts": [
    {
      "date": "2025-01-15",
      "caption": "[Exact text]",
      "likes": 5200,
      "comments": 145,
      "type": "carousel",
      "hashtags": ["#tag1", "#tag2"],
      "sentiment": "positive",
      "engagement_rate": 4.2
    }
  ]
}
```

---

# STEP 5: COMPARISON ANALYSIS

## Create Comparison Matrix (Only Shared Platforms)

```
Example: If Competitor A uses: Instagram, TikTok, LinkedIn, YouTube
         And You use: Instagram, TikTok, LinkedIn

Analyze ONLY these 3 platforms (not YouTube, not others)

| Metric | Your Company | Competitor A | Competitor B |
|--------|--------------|--------------|--------------|
| Instagram |
| ├─ Followers | 85K | 245K | 120K |
| ├─ Avg Engagement | 3.5% | 4.2% | 3.8% |
| ├─ Posts/Week | 3 | 3-4 | 2 |
| └─ Top Content | Educational | Before/After | Lifestyle |
| TikTok |
| ├─ Followers | 150K | 520K | 280K |
| ├─ Avg Views | 85K | 245K | 120K |
| ├─ Posts/Week | 5 | 7 | 4 |
| └─ Top Content | Trends | Educational | Entertainment |
| LinkedIn |
| ├─ Followers | 12K | 25K | 18K |
| ├─ Avg Engagement | 2.1% | 3.2% | 2.8% |
| ├─ Posts/Week | 2 | 3 | 1-2 |
| └─ Top Content | Company News | Thought Leadership | Job Posts |
```

---

# STEP 6: GAP ANALYSIS

## What Each Competitor is Winning On

```
FOR EACH platform they use:

Competitor A - Instagram:
├─ Winning on: Before/after transformation content (6.8% engagement)
├─ Audience wants: Cruelty-free products (250% increase in comments)
├─ Posting time: Best results Tuesday 9AM, Friday 6PM
├─ Content gap: Low behind-the-scenes content (only 30%)
└─ Opportunity: More BTS content could improve engagement

Competitor A - TikTok:
├─ Winning on: Educational content (45% of posts)
├─ Trending sounds: "Here we go again" remix (890K uses)
├─ Audience demographics: 18-35 year old, female-skewed
├─ Posting frequency: 7 posts/week (more than you)
└─ Opportunity: Educational angle working well

NOT ANALYZING (They don't use):
├─ YouTube - Not active
├─ Twitter/X - Not active
└─ Facebook - Not active
```

---

# STEP 7: STRATEGIC RECOMMENDATIONS

## Based on Platforms They Use

```
ONLY for platforms where competitor is active:

Instagram:
├─ Content: Increase before/after transformations (proven 6.8%)
├─ Messaging: Emphasize cruelty-free angle (audience demand)
├─ Timing: Post Tuesday 9AM & Friday 6PM
├─ Gap: Add more behind-the-scenes content
└─ Recommendation: Match their strength + fill their gap

TikTok:
├─ Content: 60% educational (they do 45%, opportunity to lead)
├─ Audio: Use same trending sounds they use
├─ Frequency: Match their 7 posts/week
├─ Audience: Target 18-35 female demographic
└─ Recommendation: Be MORE educational than competitor

LinkedIn (if competitor active):
├─ Content: Focus on thought leadership
├─ Frequency: 2-3 posts/week
└─ Recommendation: Build authority positioning

YouTube (if competitor NOT active):
└─ Opportunity: Underexplored channel in your industry
```

---

# STEP 8: FINAL REPORT

## Report Structure (Smart Approach)

```
EXECUTIVE SUMMARY (1-2 pages)
├─ Competitor platform presence overview
├─ Which platforms they're winning on
├─ Your opportunity areas
└─ Key recommendations

PLATFORM-BY-PLATFORM ANALYSIS (As needed)
├─ Instagram Analysis
│  ├─ Their performance
│  ├─ Your performance
│  ├─ Gap analysis
│  └─ Recommendations
├─ TikTok Analysis
│  └─ [Same structure]
├─ LinkedIn Analysis (if relevant)
│  └─ [Same structure]
└─ Note: Only include platforms where competitor is active

COMPETITIVE SCORECARD (Only shared platforms)
├─ Side-by-side metrics
├─ Performance ranking
└─ Opportunity summary

STRATEGIC ROADMAP
├─ Platform priorities
├─ Content strategy per platform
├─ Timing & frequency
└─ 90-day action plan
```

---

# STEP 9: EXECUTION CHECKLIST

## Phase 1: Discovery (30-45 min per competitor)
- [ ] Navigate to competitor website
- [ ] Find all social media links
- [ ] Document active platforms for Competitor 1
- [ ] Document active platforms for Competitor 2
- [ ] Document active platforms for Competitor 3
- [ ] Create: platform_discovery.json

## Phase 2: Your Company (30-45 min)
- [ ] Document which platforms you're active on
- [ ] Create: your_platforms.json
- [ ] Identify shared platforms (analysis focus)

## Phase 3: Analysis (5-8 hours per competitor)
- [ ] Analyze ONLY platforms they use
- [ ] Don't analyze unused platforms
- [ ] Extract: Profile metrics, content metrics, sentiment
- [ ] Create: platform_analysis.json per competitor

## Phase 4: Comparison (2-3 hours)
- [ ] Create comparison matrix (only shared platforms)
- [ ] Gap analysis
- [ ] Strategic recommendations

## Phase 5: Report (2-3 hours)
- [ ] Executive summary
- [ ] Platform-by-platform analysis
- [ ] Scorecard
- [ ] Action roadmap

---

# STEP 10: TIME ESTIMATE (Smart Approach)

```
DISCOVERY PHASE:
├─ Per competitor: 30-45 minutes
├─ 3 competitors: 1.5-2.25 hours
└─ Your company: 30 minutes

ANALYSIS PHASE (Varies by platform count):
├─ If competitor on 3 platforms: 5-8 hours
├─ If competitor on 4-5 platforms: 6-10 hours
├─ If competitor on 1-2 platforms: 2-3 hours
└─ Per competitor: 2-10 hours (varies)

COMPARISON & RECOMMENDATIONS:
├─ Gap analysis: 1-2 hours
├─ Recommendations: 1-2 hours
└─ Report writing: 2-3 hours

TOTAL TIME (3 competitors, avg 3 platforms each):
├─ Discovery: 2 hours
├─ Analysis: 15-24 hours
├─ Comparison & Report: 4-7 hours
└─ **TOTAL: 21-33 hours** (not 25-50 hours)

EFFICIENCY GAIN: Focus ONLY on active platforms = Save 20-40% time
```

---

# KEY ADVANTAGES OF THIS APPROACH

✅ **Don't waste time** on platforms competitors don't use
✅ **Focus on what matters** - shared platforms where you compete
✅ **Faster analysis** - fewer platforms to analyze per competitor
✅ **Better insights** - deeper analysis of platforms that matter
✅ **Actionable** - recommendations only for platforms in use
✅ **Smart resource allocation** - time spent where it counts

---

**Document Version:** 4.0 (Smart Discovery-First Approach)
**Workflow Type:** Automated Competitor Analysis - Discover Then Analyze
**Tool:** claude-in-chrome (native Claude browser)
**Key Innovation:** Discover active platforms FIRST, analyze ONLY those
**Time Savings:** 20-40% faster by eliminating unused platforms
