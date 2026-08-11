# CONTENT EXECUTION WORKFLOW
## Universal, Tool-Agnostic, Multi-Stream Execution

---

# OVERVIEW

**This is a CONNECTED WORKFLOW.**

```
Step 4.5: Creative Director
        ↓
        Output: creative_briefs.json (7 posts with all prompts)
        ↓
Step 5: CONTENT EXECUTION (THIS WORKFLOW)
        ├─ 3 parallel streams
        ├─ Universal video tool (admin-configured connector)
        └─ All assets ready for Quality Check
        ↓
Step 6: Quality Check (Manual human review)
```

---

# INPUT

**File:** `creative_briefs.json` (from Creative Director Step 4.5)

Contains: 7 complete creative briefs with:
- Image prompts (detailed)
- Video prompts (scene-by-scene)
- Copy direction (hooks, tone, hashtags, CTAs)
- Scoring (9+ calibration)

---

# PROCESS

## PHASE 1: INTAKE & VALIDATION

```
Input received: creative_briefs.json

Validation checks:
├─ ✓ All 7 posts have image prompts?
├─ ✓ All 7 posts have video prompts?
├─ ✓ All 7 posts have copy direction?
├─ ✓ All scoring >= 8.8?
└─ ✓ All connectors ready?
   ├─ Canva connected?
   ├─ Video-generation-connector connected?
   └─ Claude ready?

Status: READY FOR EXECUTION
```

---

## PHASE 2: THREE PARALLEL EXECUTION STREAMS

**All 3 streams run SIMULTANEOUSLY (not sequential)**

---

### STREAM A: STATIC IMAGES (Canva)

#### For posts: Monday, Tuesday (carousel), Wednesday, Thursday, Saturday (carousel), Sunday
#### Total: 6 static design assets

```
For EACH static post:

Step 1: Extract Image Prompt
├─ Read creative_brief[post].image_prompt
├─ Get detailed_prompt (full description)
├─ Get style_reference
├─ Get color_hex_codes
└─ Get mood_keywords

Step 2: Send to Canva Connector
├─ Tool: Canva MCP Connector
├─ Input: Image prompt (JSON)
│  {
│    "prompt": "[Full detailed prompt]",
│    "style": "[Style reference]",
│    "colors": ["#2E8B57", "#FFFFFF"],
│    "mood": "[Energetic, confident, etc]",
│    "format": "[Instagram 1080x1080 or carousel]"
│  }
└─ API: Send via Canva connector

Step 3: Canva Generates
├─ Creates design based on prompt
├─ Returns: PNG/JPG image file
└─ File name: [MON_static.png, TUE_carousel.png, etc]

Step 4: Store Output
├─ Location: /outputs/week_1_content/images/
├─ File: [POST]_[TYPE].png
└─ Format: PNG/JPG, ready for Instagram

Example outputs:
├─ MON_static.png (1080x1080)
├─ TUE_carousel.png (or carousel_slide_1.png, _2.png, etc)
├─ WED_static.png (1080x1080)
├─ THU_static.png (1080x1080)
├─ SAT_carousel.png
└─ SUN_static.png (1080x1080)

Total: 6 images
Time: ~1-1.5 hours (parallel Canva processing)
```

---

### STREAM B: VIDEOS (Universal Video-Generation Connector)

#### For posts: Monday, Wednesday, Thursday, Friday, Saturday
#### Total: 5 video assets

```
For EACH video post:

Step 1: Extract Video Prompt
├─ Read creative_brief[post].video_prompt
├─ Get total_duration
├─ Get format (1080x1920)
├─ Get scene_breakdown (7 detailed scenes)
├─ Get overall_creative_direction
└─ Get technical_direction

Step 2: Send to Video-Generation Connector
├─ Tool: video-generation-connector
│         (Could be Higgsfield, Runway, Kling, or other)
│         (Whatever admin configured + connected)
├─ Input: Video prompt (JSON)
│  {
│    "scenes": [
│      {
│        "scene": 1,
│        "timing": "0-3 seconds",
│        "visual": "[description]",
│        "audio": "[direction]",
│        "mood": "[emotion]"
│      },
│      ... (7 scenes)
│    ],
│    "total_duration": "45 seconds",
│    "format": "1080x1920",
│    "overall_direction": "[full brief]",
│    "technical_specs": "[quality, grading, etc]"
│  }
└─ API: Send via video-generation-connector

Step 3: Video Tool Generates
├─ Connector receives prompt
├─ Routes to configured backend (Higgsfield/Runway/Kling/etc)
├─ Tool generates MP4 video
└─ Returns: MP4 file (45 seconds, 1080x1920)

Step 4: Store Output
├─ Location: /outputs/week_1_content/videos/
├─ File: [POST]_video.mp4
└─ Format: MP4, 1080x1920, 30-45 seconds

Example outputs:
├─ MON_video.mp4
├─ WED_video.mp4
├─ THU_video.mp4
├─ FRI_video.mp4
└─ SAT_video.mp4

Total: 5 videos
Time: ~1-1.5 hours (parallel video processing)
Note: Actual time depends on which video tool is connected
      (Higgsfield: 30-60 min, Runway: 45-90 min, etc)
```

---

### STREAM C: COPY & CAPTIONS (Claude)

#### For posts: All 7 posts
#### Total: 7 captions with full copy

```
For EACH post:

Step 1: Extract Copy Direction
├─ Read creative_brief[post].copy_direction
├─ Get hook_style + hook_examples
├─ Get main_tone + tone_keywords
├─ Get emotional_trigger_strategy
├─ Get hashtag_strategy (tiers 1-4)
├─ Get emoji_strategy
├─ Get call_to_action_strategy
├─ Get caption_structure
└─ Get what_to_avoid

Step 2: Claude Writes Full Caption
├─ Tool: Claude API
├─ Input: Copy direction JSON
├─ Process: Claude writes caption following:
│  ├─ Hook: 2-3 lines (from examples, matching style)
│  ├─ Why matters: 3-4 lines (tension/problem)
│  ├─ Solution: 4-5 lines (breakdown of post)
│  ├─ Insight: 2-3 lines (why it works)
│  └─ CTA: 1-2 lines (specific action)
│
├─ Add: Hashtags (25-30, from all 4 tiers)
├─ Add: Emojis (6-8, from emoji strategy)
└─ Add: Spacing & formatting (Instagram-optimized)

Example output for Monday:
```
Save this for your busy morning! ⏰

We get it — you're busy. Work, life, Netflix... 
where's skincare supposed to fit?

Here's a 5-minute routine that actually WORKS:

💧 Step 1: Gentle Cleanser (1 min)
🧴 Step 2: Hydrating Toner (1 min)
✨ Step 3: Serum (1 min)
💜 Step 4: Moisturizer (1 min)
☀️ Step 5: SPF (1 min)

All our products are cruelty-free ✓ because we 
believe skincare for busy professionals shouldn't 
require guilt.

Try this for 30 days. Your skin will thank you. 
(And so will your schedule.)

Save this & tag someone who needs it 👇

#BusyProfessional #SkincareTips #5MinRoutine 
#QuickSkincare #MorningRoutine #CleanBeauty 
#CrueltyFree #RealResults #SkincareForBusyPeople 
#EfficientBeauty #RealWorldSkincare #BusyMom 
#TimeEfficient #BusyLife #SkincareHacks
[... + 15 more hashtags ...]
```

Step 3: Store Output
├─ Location: /outputs/week_1_content/captions/
├─ File: copy_and_captions.xlsx
└─ Format: Excel spreadsheet (1 row per post)

Spreadsheet columns:
├─ Post ID (MON_001, TUE_001, etc)
├─ Day (Monday, Tuesday, etc)
├─ Platform (Instagram Reel, etc)
├─ Hook (first line)
├─ Main Caption (full body text)
├─ Hashtags (all 25-30)
├─ Emojis (list)
├─ CTA (call-to-action)
└─ Copy Character Count (verify ~150-200 words)

Total: 7 captions in 1 Excel file
Time: ~45-60 minutes (parallel Claude processing)
```

---

## PHASE 3: QUALITY ASSURANCE CHECKS (Automated)

```
After all 3 streams complete:

File Validation:
├─ ✓ All 6 images created? (Check /images/ folder)
├─ ✓ All 5 videos created? (Check /videos/ folder)
├─ ✓ All 7 captions created? (Check captions Excel)
├─ ✓ File sizes reasonable?
│  ├─ Images: 500KB-3MB each
│  ├─ Videos: 50-200MB each
│  └─ Captions: Data in Excel
├─ ✓ Video duration correct? (45 seconds expected)
├─ ✓ Video format correct? (1080x1920, MP4)
└─ ✓ Caption word counts ~150-200 words?

All validations pass? → Ready for Quality Check
Any issues? → Flag for manual review
```

---

## PHASE 4: PREPARE FOR QUALITY CHECK

```
Generate Summary Dashboard:

File: /outputs/week_1_content/EXECUTION_SUMMARY.md

Content:
├─ EXECUTION COMPLETE ✅
├─ Execution Date: [Date]
├─ Execution Time: [Duration]
│
├─ ASSETS CREATED:
│  ├─ Static Images: 6 ✓
│  ├─ Videos: 5 ✓
│  ├─ Captions: 7 ✓
│  └─ Total Assets: 18 ✓
│
├─ FOLDER STRUCTURE:
│  ├─ /images/ (6 files)
│  ├─ /videos/ (5 files)
│  ├─ /captions/ (1 Excel file)
│  └─ /summary/ (this file)
│
├─ FILE INVENTORY:
│  ├─ Monday: static image + caption ✓
│  ├─ Tuesday: carousel + caption ✓
│  ├─ Wednesday: video + caption ✓
│  ├─ Thursday: video + caption ✓
│  ├─ Friday: video + caption ✓
│  ├─ Saturday: video + caption ✓
│  └─ Sunday: static image + caption ✓
│
├─ QUALITY CHECKS:
│  ├─ Image sizes OK? ✓
│  ├─ Video durations OK? ✓
│  ├─ Caption word counts OK? ✓
│  └─ All files present? ✓
│
├─ READY FOR QUALITY CHECK? YES ✅
│
└─ NEXT STEP: Human reviews all assets

Click to open folders:
├─ [View Images] → /images/
├─ [View Videos] → /videos/
├─ [View Captions] → captions Excel
└─ [Start Quality Check] → Quality Check Workflow
```

---

# OUTPUT

### File 1: Static Images Directory
```
/outputs/week_1_content/images/

├─ MON_static.png (1080x1080, ~1.5MB)
├─ TUE_carousel.png or carousel/
│  ├─ TUE_carousel_slide_1.png
│  ├─ TUE_carousel_slide_2.png
│  └─ ... (5-9 slides)
├─ WED_static.png (1080x1080)
├─ THU_static.png (1080x1080)
├─ SAT_carousel.png or carousel/
│  ├─ SAT_carousel_slide_1.png
│  └─ ... (slide N)
└─ SUN_static.png (1080x1080)

Format: PNG/JPG
Status: Ready to post directly to Instagram
```

### File 2: Videos Directory
```
/outputs/week_1_content/videos/

├─ MON_video.mp4 (1080x1920, 45 sec, ~80MB)
├─ WED_video.mp4 (1080x1920, 45 sec, ~80MB)
├─ THU_video.mp4 (1080x1920, 45 sec, ~80MB)
├─ FRI_video.mp4 (1080x1920, 30-45 sec, ~60MB)
└─ SAT_video.mp4 (1080x1920, 45 sec, ~80MB)

Format: MP4
Resolution: 1080x1920 (vertical)
Codec: H.264 (Instagram compatible)
Status: Ready to post directly to Instagram/TikTok
```

### File 3: Captions Spreadsheet
```
/outputs/week_1_content/captions/copy_and_captions.xlsx

Columns:
├─ Post_ID (MON_001, TUE_001, etc)
├─ Day (Monday, Tuesday, etc)
├─ Platform (Instagram Reel, etc)
├─ Hook (first 1-2 lines)
├─ Caption (full body, ~150-200 words)
├─ Hashtags (all 25-30, space-separated)
├─ Emojis (list of emojis used)
├─ CTA (call-to-action text)
├─ Word_Count (verify ~150-200)
└─ Character_Count (total with spaces)

Format: Excel (.xlsx) or CSV
Usage: Copy-paste each row's caption into Instagram
Status: Ready to use
```

### File 4: Summary Dashboard
```
/outputs/week_1_content/EXECUTION_SUMMARY.md

Contains:
├─ Execution status (✅ COMPLETE)
├─ Date & time
├─ Assets count (6 + 5 + 7 = 18)
├─ Folder structure
├─ File inventory checklist
├─ Quality validations
└─ Next step (Quality Check)

Usage: Quick overview before QC, links to view assets
```

---

# TIME ESTIMATE

```
STREAM A: Static Images (Canva)
├─ Extract prompts: 5 minutes
├─ Send to Canva: 5 minutes
├─ Canva processing: 30-60 minutes
├─ Collect outputs: 5 minutes
└─ Total: 45-75 minutes

STREAM B: Videos (Universal Connector)
├─ Extract prompts: 5 minutes
├─ Send to connector: 5 minutes
├─ Tool processing: 60-120 minutes (depends on tool)
│  ├─ Higgsfield: 30-60 min
│  ├─ Runway: 60-90 min
│  └─ Kling: 30-60 min
├─ Collect outputs: 5 minutes
└─ Total: 75-135 minutes

STREAM C: Copy & Captions (Claude)
├─ Extract directions: 5 minutes
├─ Claude processes: 20-30 minutes (7 captions × 3-4 min each)
├─ Format & compile: 10 minutes
└─ Total: 35-45 minutes

═══════════════════════════════════════════════════════
BECAUSE ALL 3 STREAMS RUN IN PARALLEL:

Total Time = Longest Stream = 75-135 minutes
           ≈ 1.5-2.5 hours (NOT sequential)

If sequential: 45-75 + 75-135 + 35-45 = 155-255 minutes
If parallel:   Max(45-75, 75-135, 35-45) = 75-135 minutes

SAVINGS: 1-2 hours by parallelizing!
```

---

# HOW IT FEEDS INTO QUALITY CHECK (Step 6)

```
Content Execution outputs:
├─ 6 static images
├─ 5 videos
├─ 7 captions
└─ 1 summary dashboard

    ↓ (All files ready)

Quality Check reads:
├─ Opens /images/ folder
├─ Opens /videos/ folder
├─ Opens captions Excel
└─ Reviews each asset

For EACH of 7 posts:
├─ Human reviews image/video/caption
├─ Decision: APPROVE ✓ or REQUEST REVISION ⚠️
├─ If revision: Feedback sent back
└─ If approved: Asset moves to Publish

Output: QA report + status dashboard
```

---

# KEY FEATURES

✅ **Three Parallel Streams**
- All run simultaneously
- Saves 1-2 hours vs sequential

✅ **Universal Video Tool**
- Works with Higgsfield OR Runway OR Kling OR any other
- Doesn't care which tool is connected
- Admin configures once, workflow stays same

✅ **Organized Outputs**
- Clean folder structure
- Easy for human to review
- Ready to download/use

✅ **Quality Validations**
- Automated checks for file sizes, durations, formats
- Flags issues before QC
- Ensures consistency

✅ **Clear Summary**
- Dashboard shows what was created
- Links to all outputs
- Ready for Quality Check

---

# WORKFLOW DIAGRAM

```
Creative Director (Step 4.5)
        ↓
        creative_briefs.json
        ↓
Content Execution (Step 5) ← THIS WORKFLOW
        ↓
        PHASE 1: Intake & Validate
        ├─ Check creative_briefs.json
        └─ Check all connectors ready
        ↓
        PHASE 2: Three Parallel Streams
        ├─ STREAM A: Canva (images) ——┐
        ├─ STREAM B: Video-connector  |—— All run simultaneously
        └─ STREAM C: Claude (copy) ——┘
        ↓
        PHASE 3: Quality Assurance (automated)
        ├─ File validations
        ├─ Size checks
        └─ Duration checks
        ↓
        PHASE 4: Prepare for QC
        ├─ Generate summary
        ├─ Organize folders
        └─ Create dashboard
        ↓
        Outputs: 18 files ready
        ├─ 6 images
        ├─ 5 videos
        └─ 7 captions
        ↓
Quality Check (Step 6) ← Next workflow
        ├─ Human reviews all 18 assets
        ├─ APPROVE or REQUEST REVISION
        └─ Output: QA report
```

---

# WORKFLOW INPUTS & OUTPUTS

```
INPUT:
├─ creative_briefs.json (from Step 4.5)
├─ Canva connector (configured & ready)
├─ Video-generation-connector (configured & ready)
└─ Claude ready (built-in)

PROCESS:
├─ 3 parallel streams
├─ Automated execution
├─ Universal video tool support
└─ Quality checks built-in

OUTPUT:
├─ /images/ (6 PNG/JPG files)
├─ /videos/ (5 MP4 files)
├─ /captions/ (1 Excel with 7 captions)
├─ /summary/ (dashboard)
└─ EXECUTION_SUMMARY.md (status report)

STORAGE:
└─ /outputs/week_1_content/
   ├─ images/
   ├─ videos/
   ├─ captions/
   ├─ summary/
   └─ EXECUTION_SUMMARY.md

READY FOR:
└─ Step 6: Quality Check (manual human review)
```

---

**Document Version:** 1.0 (Universal Video Tool Support)
**Workflow Type:** Content Execution (3-stream parallel)
**Tool:** Claude API + Canva + Video-Generation-Connector
**Input:** creative_briefs.json (from Step 4.5)
**Output:** 18 assets (6 images + 5 videos + 7 captions)
**Time:** 1.5-2.5 hours (parallel execution)
**Status:** Ready to implement in Cowork
**Feeds Into:** Quality Check (Step 6) with manual human review
