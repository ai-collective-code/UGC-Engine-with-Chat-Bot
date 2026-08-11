# CREATIVE DIRECTOR WORKFLOW
## Connected to Content Bucketing → Feeds into Content Execution

---

# OVERVIEW

**This is a CONNECTED WORKFLOW.**

```
Step 4: Content Bucketing
        ↓
        Output: content_buckets.json (7 posts assigned)
        ↓
Step 4.5: CREATIVE DIRECTOR (THIS WORKFLOW) 🎨
        ├─ Input: content_buckets.json
        ├─ Process: 5-phase creative direction for each post
        └─ Output: creative_briefs.json (with prompts + scoring)
        ↓
Step 5: Content Execution
        ├─ Design Briefs: Uses image prompts
        ├─ Video Scripts: Uses video prompts
        └─ Copy & Captions: Uses copy direction
```

---

# INPUT

**File:** `content_buckets.json` (from Content Bucketing)

Contains: 7 detailed posts assigned to days with topics, platforms, pillars, buyer stages

```json
Example input:
{
  "posts": [
    {
      "day": "Monday",
      "platform": "Instagram Reel",
      "pillar": "Education",
      "topic": "5-minute skincare routine for busy professionals"
    },
    {
      "day": "Tuesday",
      "platform": "Instagram Carousel",
      "pillar": "Transformation",
      "topic": "Before/after customer results"
    }
    // ... 5 more posts
  ]
}
```

---

# PROCESS

## For EACH of the 7 posts, execute the Creative Director 5-Phase System:

---

### PHASE 1: INTAKE

**For each post topic, extract and clarify:**

```
Input: Monday post details
├─ Topic: "5-minute skincare routine for busy professionals"
├─ Platform: Instagram Reel
├─ Pillar: Education (45% of content)
├─ Buyer stage: Awareness
└─ Target audience: Busy professionals, Gen Z, time-poor

Questions to confirm:
├─ Objective: What action do we want? (Save post, tag friend, try product)
├─ Constraints: Duration (45s), format (vertical 1080x1920)
├─ Tone: (confident, no-nonsense, relatable)
└─ Brand values: (cruelty-free, sustainability, real results)

Output: Clear brief for Phase 2
```

---

### PHASE 2: INSIGHT (Creative Insight Discovery)

**Using Mark Pollard Four Points + Tension Spotting:**

```
Step 1: PROBLEM (What's the customer pain point?)
└─ Busy professionals don't have time for skincare routines

Step 2: INSIGHT (Why is this true? What's the deeper truth?)
└─ They want glowing skin but feel guilty skipping routines
   because modern life moves too fast

Step 3: ADVANTAGE (How does our brand solve this?)
└─ We offer skincare that fits their real life (5 minutes)

Step 4: STRATEGY (What's the communication strategy?)
└─ Position skincare as empowering, not time-consuming
   (defiance: busy person WINNING)

TENSION SPOTTED:
├─ Cultural: "Self-care is a luxury" vs "I'm too busy"
├─ Category: "Skincare is complicated" vs "I want it fast"
└─ Human: "I want great skin" vs "I don't have time"

INSIGHT STATEMENT (One sentence):
"Busy professionals want glowing skin, but don't have time for 
complicated routines, because modern life is hectic—so we show 
them skincare that FITS their world, making them feel empowered, 
not guilty."

OUTPUT: One-sentence insight ready for ideation
```

---

### PHASE 3: IDEATION (3 Creative Concepts using 3 Different Methods)

**Generate 8-12 ideas using 3 methods from different categories:**

```
METHOD 1: STRUCTURAL (SCAMPER)
├─ Substitute: Show routine COMPRESSED (5 minutes)
├─ Combine: Combine skincare + confidence building
├─ Adapt: Adapt morning-routine content from other brands
├─ Modify: Make skincare steps VISIBLE (show speed/efficiency)
├─ Put to another use: Use skincare as time-management proof
├─ Eliminate: Remove steps (5 steps only, not 10)
└─ Reverse: "Skincare for no time" instead of "skincare for everyone"

OUTPUT: 4 ideas from SCAMPER method

METHOD 2: ASSOCIATION/COLLISION (Bisociation)
├─ Combine: "Skincare + Professional confidence" = Power routine
├─ Combine: "Morning ritual + Busy person" = Efficiency flex
├─ Combine: "Self-care + Defiance" = Unapologetic me-time
└─ Combine: "5 minutes + Results" = Time-leveraged results

OUTPUT: 4 ideas from Bisociation

METHOD 3: INVERSION/PERTURBATION (Reverse Brainstorm)
├─ Worst idea: "Make skincare MORE complicated for busy people"
│  ├─ Invert: Make it LESS complicated ✓
│  └─ Idea: 5-step routine beats 10-step routine
│
├─ Worst idea: "Show busy people MORE things to do"
│  ├─ Invert: Show them LESS to do, FASTER ✓
│  └─ Idea: Time-saving ritual
│
└─ Worst idea: "Make skincare about perfection"
   ├─ Invert: Make it about REAL RESULTS ✓
   └─ Idea: "Good enough is winning"

OUTPUT: 4 ideas from Reverse Brainstorm
```

**Total: 12 ideas generated**

**Now select TOP 3 for Phase 4:**

```
CONCEPT 1: "Morning Ritual Hacks"
├─ One-sentence idea: "Show busy professionals quick skincare 
   that fits their lifestyle, not against it"
├─ Visualization: Fast-paced, energetic, green + white, 45-second
├─ Emotional hook: Defiant confidence
└─ Why selected: Directly addresses tension, breaks category norm

CONCEPT 2: "5-Minute Win"
├─ One-sentence idea: "Position 5-minute routine as a daily WIN 
   against time poverty"
├─ Visualization: Upbeat, victory moment, time-lapse style
├─ Emotional hook: Empowerment + pride
└─ Why selected: Time-management angle resonates with TA

CONCEPT 3: "Skincare for Real Life"
├─ One-sentence idea: "Real people, real routine, real results—
   no Instagram fantasy"
├─ Visualization: Authentic, relatable, minimal styling
├─ Emotional hook: Belonging (we get you)
└─ Why selected: Anti-cliché, values-aligned authenticity
```

---

### PHASE 4: EVALUATE + REFINE (Recursive Scoring to 9+)

**Three-Axis Evaluation:**

#### PASS 1: Brief Compliance (Yes/No Check)
```
For CONCEPT 1 ("Morning Ritual Hacks"):

1. Is there an idea? YES ✓
   "Show busy pros quick skincare that fits their lifestyle"

2. Does it convey the intended message? YES ✓
   Message: "Skincare that works for YOU" comes through

3. Does it respond to the insight? YES ✓
   Insight was defiance + empowerment, concept delivers both

4. Does it suit the target audience? YES ✓
   Busy professionals recognize themselves in speed + efficiency

5. Are mandatory elements included? YES ✓
   Education pillar ✓, Awareness stage ✓, Instagram Reel ✓

6. Does it comply with ethics? YES ✓
   Honest, no false promises, cruelty-free message clear

7. Is brand voice preserved? YES ✓
   Confident, direct, supportive tone matches brand

8. Is it supported by product attributes? YES ✓
   5-minute routine actually works with product line

ALL PASS → Move to scoring
```

#### PASS 1: Weighted Scoring (6 Criteria)

```
CONCEPT 1: "Morning Ritual Hacks"

Criterion 1: ORIGINALITY (Weight: 25%)
├─ Score: 8.5/10
├─ Why: "Busy professional" angle fills competitor gap (proven gap from Step 1)
├─ Anti-cliché test: Replace brand with competitor—doesn't work
│  (competitors don't focus on "busy professionals")
├─ Pattern check: vs 569 legendary campaigns
│  ├─ Checked against P07 (reposition category) + P11 (time/efficiency)
│  └─ 12 cases of time-focused routines exist, but none for busy skincare
├─ Saturation: Not saturated, originality stands
└─ Score: 8.5 (strong, not extreme)

Criterion 2: STRATEGIC FIT (Weight: 20%)
├─ Score: 9.0/10
├─ Why: Directly solves brief objective (educate on routine)
│      Hits target audience (busy professionals)
│      Addresses insight (defiance)
│      Solves competitor gap (no busy angle)
└─ Score: 9.0 (perfect alignment)

Criterion 3: EMOTIONAL RESPONSE (Weight: 20%)
├─ Emotion identified: DEFIANCE + EMPOWERMENT (Tier 3 complex emotion)
├─ Tier test: 
│  ├─ Tier 1 (generic): Happy, sad, angry — NO
│  ├─ Tier 2 (specific): Proud, nostalgic, defiant — PARTIAL
│  └─ Tier 3 (complex): Bittersweet pride, vulnerable defiance — YES ✓
│      "Busy person who refuses to feel guilty about shortcuts"
├─ Score: 9.5/10 (Tier 3 emotion, specific and complex)
└─ Why: Defiance is rare in beauty category, creates hook

Criterion 4: FEASIBILITY (Weight: 15%)
├─ Budget: Medium (Instagram Reel = standard budget)
├─ Timeline: 45-second reel, achievable in 3-4 hours
├─ Resources: Canva + Higgsfield can execute
├─ Constraints: None blocking
└─ Score: 9.0/10 (fully feasible)

Criterion 5: SCALABILITY (Weight: 10%)
├─ Can it become a series? YES
│  ├─ Week 1: Cleanse routine
│  ├─ Week 2: Toner routine
│  ├─ Week 3: Serums for busy people
│  └─ Week 4: SPF for busy people
├─ Can it extend to other media? YES
│  ├─ Blog post: "The Science of 5-Minute Skincare"
│  ├─ Email series: "Busy Professional's Skincare Guide"
│  └─ TikTok playlist: "Quick-Fix Beauty"
└─ Score: 8.0/10 (strong series potential)

Criterion 6: SIMPLICITY (Weight: 10%)
├─ One-sentence test: "Show busy professionals skincare that fits 
   their lifestyle, not against it" — YES ✓
├─ 10-second explanation: "5-minute routine for busy people who 
   want glowing skin without guilt" — YES ✓
├─ Memorability: High (specific + emotional)
└─ Score: 10.0/10 (crystal clear)

WEIGHTED TOTAL SCORE:
= (8.5 × 0.25) + (9.0 × 0.20) + (9.5 × 0.20) + (9.0 × 0.15) 
  + (8.0 × 0.10) + (10.0 × 0.10)
= 2.13 + 1.80 + 1.90 + 1.35 + 0.80 + 1.00
= 9.0/10 ✓ PASS
```

#### PASS 1: HumanKind Score (Is this an "act, not an ad"?)

```
HumanKind Scale (Leo Burnett):
├─ 1-2: Destructive/toxic
├─ 3-4: Invisible (generic)
├─ 5: Brand purpose
├─ 6: Intelligent idea
├─ 7: HumanKind Act (changes thoughts/feelings/actions)
├─ 8: Changes thinking
├─ 9: Changes living
└─ 10: Changes the world

CONCEPT 1 HumanKind Assessment:
├─ Does it change thoughts? YES
│  ├─ Before: "Skincare requires time I don't have"
│  └─ After: "I can have glowing skin in 5 minutes"
│
├─ Does it change feelings? YES
│  ├─ Before: Guilt about skipping routines
│  └─ After: Empowerment (I can win)
│
├─ Does it change behavior? YES
│  ├─ Before: Skip skincare due to time
│  └─ After: Do the routine (it's fast!)

HumanKind Score: 8.0/10
├─ Changes thoughts ✓
├─ Changes feelings ✓
├─ Changes behavior ✓
└─ Does NOT change living (not life-altering)

VERDICT: 8.0 is strong. No gap (9.0 score + 8.0 HK = aligned)
```

#### PASS 1: Gap Analysis

```
Score: 9.0/10
HumanKind: 8.0/10

Gap: 1.0 point (acceptable)

Diagnosis: Clever AND meaningful
├─ Not "clever but doesn't matter"
├─ Not "matters but boring"
└─ Status: READY for next phase

Action: Check scalability + refine for execution
```

---

#### PASS 2: Pattern Calibration (vs 569 Legendary Campaigns)

```
Closest pattern match: P07 (Reposition Category)
├─ P07 definition: Change what the category means
├─ Our idea: "Skincare isn't complicated—it's efficient"
└─ Pattern fit: STRONG

Canonical cases reviewed:
1. "Liquid Courage" (cleaning product, efficiency angle)
2. "Just Add Water" (cooking, simplification)
3. "Busy Mom Solutions" (various categories)

How our idea differs:
├─ Adds EMOTIONAL element (defiance, not just efficiency)
├─ Targets specific TA (busy professionals, not generic)
├─ Uses time as empowerment (win) not apology (shortcut)
└─ Proprietary insight: Defiance is rare in beauty

Saturation check: P07 has 18 cases. Our angle (defiance + busy + skincare) 
is NOT duplicated. Originality CONFIRMED at 8.5.

PASS ✓
```

---

#### EVALUATION SUMMARY (PASS 1)

```
CONCEPT 1: "Morning Ritual Hacks"

Score: 9.0/10 ✅ PASS
├─ Originality: 8.5 (fills competitor gap)
├─ Strategic: 9.0 (perfect brief fit)
├─ Emotion: 9.5 (Tier 3 defiance)
├─ Feasibility: 9.0 (achievable)
├─ Scalability: 8.0 (series + extensions)
└─ Simplicity: 10.0 (crystal clear)

HumanKind: 8.0/10 ✅ PASS
├─ Changes thinking ✓
├─ Changes feeling ✓
├─ Changes behavior ✓
└─ Not gap (aligned with score)

Pattern: P07 (Reposition Category)
├─ Not saturated ✓
├─ Differs from canon ✓
└─ Originality confirmed ✓

READY FOR PHASE 5 (Articulation)
```

*(Repeat PASS 1-2 for CONCEPT 2 and 3, but abbreviated here)*

---

### PHASE 5: ARTICULATE (Generate Creative Briefs + Prompts)

**For CONCEPT 1, output complete creative brief with all 4 deliverables:**

```json
{
  "post_id": "MON_001",
  "day": "Monday",
  "date": "2025-01-27",
  "time": "09:00 AM",
  
  "content_bucketing_source": {
    "topic": "5-minute skincare routine for busy professionals",
    "platform": "Instagram Reel",
    "pillar": "Education",
    "buyer_stage": "Awareness"
  },
  
  "creative_brief": {
    "concept_name": "Morning Ritual Hacks",
    "concept_one_sentence": "Show busy professionals that skincare fits THEIR lifestyle, not against it",
    
    "creative_insight": "Busy professionals want glowing skin but feel guilty skipping routines because modern life moves too fast—we empower them by showing skincare that fits their world",
    
    "target_tension_addressed": "Cultural (self-care guilt) + Category (complicated routines) + Human (wanting results without time)",
    
    "emotional_tone": "Defiant confidence (Tier 3: complex emotion of 'busy person winning')",
    
    "key_emotion": "Defiance + Empowerment",
    
    "visual_direction": {
      "color_palette": ["#2E8B57 (Emerald Green)", "#FFFFFF (Bright White)", "#F0F0F0 (Soft Gray)"],
      "aesthetic": "Modern, minimalist, professional yet relatable, high-energy",
      "vibe": "Professional clean, not spa-luxury, not DIY-casual",
      "style_reference": "Glossier meets Banana Republic—modern professional meets beauty",
      "energy_level": "High, fast-paced, dynamic",
      "visual_metaphor": "Efficiency as elegance"
    },
    
    "art_direction": {
      "camera_movement": "Quick, dynamic angles, no slow pans",
      "transitions": "Fast cuts (3-5 seconds per scene)",
      "pacing": "Fast-paced, energetic, sense of movement",
      "lighting": "Natural morning light, crisp and clean",
      "effects": "Minimal, let the product shine",
      "production_style": "Polished but not over-produced"
    },
    
    "format_specs": {
      "platform": "Instagram Reel",
      "duration": "45 seconds",
      "aspect_ratio": "Vertical (1080x1920)",
      "frame_rate": "24-30fps"
    }
  },
  
  "image_prompt": {
    "type": "PRIMARY_IMAGE_PROMPT",
    "for_tool": "Canva",
    "purpose": "Key frame/visual reference for video generation",
    
    "detailed_prompt": "A busy professional in morning light (golden hour, 6-7 AM), 
                      wearing crisp modern professional clothing (blazer or silk shirt, 
                      not pajamas), energetic body language showing confidence and 
                      empowerment, not rushed or stressed. Holding or displaying a 
                      green-tinted skincare product prominently. Green botanical 
                      elements (eucalyptus leaves, moss, ferns) softly blurred in 
                      background creating depth. Neon-green accents highlighting the 
                      product. Minimalist aesthetic with clean lines, no clutter. 
                      Professional photography style, high-energy composition with 
                      dynamic angles. Color palette: emerald green (#2E8B57) and 
                      bright white (#FFFFFF) with soft grays. Modern luxury skincare 
                      brand aesthetic. Vertical reel composition (1080x1920px). 
                      Morning bathroom or bedroom setting, bright and airy. Show 
                      product as hero. Confident facial expression. This is about 
                      EFFICIENCY as elegance.",
    
    "style_reference": "Modern beauty brand aesthetic (Glossier, Drunk Elephant) 
                       meets professional minimalism (Banana Republic, Everlane)",
    
    "avoid": "Spa imagery, overly filtered, Instagram-cliché beauty poses, 
             generic bathroom settings, staged luxury (candles, rose petals), 
             gender-specific beauty stereotypes, aging/youth messaging, 
             slow/relaxed energy",
    
    "color_hex_codes": {
      "primary": "#2E8B57",
      "secondary": "#FFFFFF",
      "accent": "#00FF41"
    },
    
    "mood_keywords": ["Energetic", "Confident", "Efficient", "Modern", 
                     "Professional", "Empowering", "Defiant", "Real"]
  },
  
  "video_prompt": {
    "type": "DETAILED_VIDEO_PROMPT_IMAGE_TO_VIDEO",
    "for_tool": "Higgsfield (image-to-video conversion)",
    "purpose": "Animate the key image into a dynamic 45-second reel",
    
    "total_duration": "45 seconds",
    "format": "Vertical reel (1080x1920)",
    "aspect_ratio": "9:16",
    
    "scene_breakdown": [
      {
        "scene_number": 1,
        "timing": "0-3 seconds",
        "duration": "3 seconds",
        "scene_name": "Hook - Defiant Opening",
        "visual_description": "Hook text 'Save this for your busy morning! ⏰' appears 
                             with dynamic animation, vibrant emerald green and white 
                             color transitions",
        "background": "Neon-green dynamic gradient or subtle bokeh effect, energetic",
        "animation": "Text slides or pops in with confidence, not subtle",
        "audio_direction": "Trending audio 'Here We Go Again' remix fades in at 
                          peak energy, uplifting",
        "mood": "Energetic, attention-grabbing, defiant confidence",
        "pacing": "Quick, dynamic, immediate engagement",
        "text_elements": "⏰ emoji, 'Save this' prominent"
      },
      {
        "scene_number": 2,
        "timing": "3-8 seconds",
        "duration": "5 seconds",
        "scene_name": "Step 1 - Cleanse",
        "visual_description": "Person's hands cleansing face with gentle cleanser, 
                             close-up of hands and face, product visible, water 
                             splash elements (optional), skin appearing fresh",
        "text_overlay": "Step 1: Cleanse (1 min)",
        "background": "Soft morning lighting with green-tinted accents, clean white 
                      background or bokeh",
        "animation": "Smooth movement from key image, hands show controlled, 
                    confident motion",
        "mood": "Confident, controlled, professional",
        "pacing": "Smooth but energetic, not slow"
      },
      {
        "scene_number": 3,
        "timing": "8-13 seconds",
        "duration": "5 seconds",
        "scene_name": "Step 2 - Toner",
        "visual_description": "Toner liquid being applied to face, liquid reflection 
                             catching light, skin glow beginning to show, product 
                             bottle visible",
        "text_overlay": "Step 2: Toner (1 min)",
        "background": "Clean white or subtle green-tinted, product-focused",
        "animation": "Quick liquid motion, glow effect on skin starting",
        "mood": "Fresh, professional, effective",
        "pacing": "Quick cuts between application moments"
      },
      {
        "scene_number": 4,
        "timing": "13-18 seconds",
        "duration": "5 seconds",
        "scene_name": "Step 3 - Serum",
        "visual_description": "Serum drops dispensing, applying to cheeks and 
                             forehead, hands showing smooth application, skin radiance 
                             increasing",
        "text_overlay": "Step 3: Serum (1 min)",
        "effect": "Light glow effect on skin growing, luxury feel",
        "animation": "Drop animation smooth, hand motions gentle but confident",
        "mood": "Luxurious yet practical, not indulgent",
        "pacing": "Smooth transitions between product application"
      },
      {
        "scene_number": 5,
        "timing": "18-23 seconds",
        "duration": "5 seconds",
        "scene_name": "Step 4 - Moisturizer",
        "visual_description": "Moisturizer being smoothed onto face, upward strokes, 
                             skin appearing hydrated and glowing",
        "text_overlay": "Step 4: Moisturizer (1 min)",
        "background": "Soft diffused light, clean and simple",
        "animation": "Smooth upward strokes, moisturizer shine visible",
        "mood": "Nourishing, confident, complete",
        "pacing": "Smooth, controlled movements"
      },
      {
        "scene_number": 6,
        "timing": "23-28 seconds",
        "duration": "5 seconds",
        "scene_name": "Step 5 - SPF",
        "visual_description": "SPF application to face, full coverage demonstrated, 
                             skin appearing protected and radiant",
        "text_overlay": "Step 5: SPF (1 min)",
        "effect": "Skin appears protected, luminous, barrier-strong",
        "animation": "Professional, thorough coverage shown",
        "mood": "Complete, protective, final touch",
        "pacing": "Professional, deliberate movements"
      },
      {
        "scene_number": 7,
        "timing": "28-45 seconds",
        "duration": "17 seconds",
        "scene_name": "Reveal - Victory Moment",
        "visual_description": "Before/after split screen reveal showing transformation, 
                             glowing radiant skin revealed, green-tinted gradient 
                             background building to crescendo",
        "text_overlay": "'All cruelty-free ✓' check mark appears triumphantly, 
                       'Try this for 30 days' call-to-action",
        "call_to_action": "'Save this' or 'Try this for 30 days' or 'Tag someone 
                         who needs this'",
        "animation": "Split screen transitions smoothly, before/after contrast clear, 
                    check mark appears with confidence, music peaks",
        "background": "Green gradient fade, energy building",
        "audio_direction": "Music peaks to climactic conclusion, triumphant",
        "mood": "Triumphant, empowering, victorious",
        "pacing": "Climactic finish, satisfying reveal"
      }
    ],
    
    "overall_creative_direction": "Fast-paced, energetic, modern, professional 
                                 aesthetic. Tone: defiant confidence. Color scheme: 
                                 emerald green and white. Trending audio throughout. 
                                 Quick cuts between steps. Smooth product shots. 
                                 Emphasize efficiency as elegance. Build energy to 
                                 climactic before/after reveal. This is about a busy 
                                 PERSON WINNING, not just skincare.",
    
    "technical_direction": "Maintain 45-second duration. Vertical format. 
                          High-energy pacing throughout. Green/white color grading. 
                          Professional production quality. No artificial or overly 
                          edited look.",
    
    "what_to_avoid": "Overly filtered aesthetic, artificial effects, slow pacing, 
                    generic beauty content, spa vibes, gender-stereotyped imagery, 
                    anxiety/stress energy, apologetic tone"
  },
  
  "copy_direction": {
    "type": "COPY_AND_CAPTION_DIRECTION",
    "for_team": "Copywriter/Caption Creator",
    
    "strategic_angle": "Skincare that fits YOUR busy life, not the other way around",
    
    "hook_style": "Direct, defiant, relatable, immediately resonant",
    "hook_examples": [
      "'Save this for your busy morning! ⏰'",
      "'5 minutes. That's all we ask.'",
      "'Skincare for people with actual lives.'",
      "'Busy professionals: this one's for you.'"
    ],
    "hook_emotion": "Recognition (they see themselves) + Empowerment (you can do this)",
    
    "main_tone": "Confident, no-nonsense, supportive, unapologetic",
    "tone_keywords": ["Direct", "Real", "Efficient", "Encouraging", "Modern", 
                     "Professional", "Honest", "No BS"],
    
    "voice_signature_phrases": [
      "'We get you'",
      "'Real world skincare'",
      "'Actually works'",
      "'No guilt'",
      "'Quick. Effective.'",
      "'Skincare that fits YOUR schedule'"
    ],
    
    "main_message_angles": [
      "Busy professionals don't have time for complicated 10-step routines",
      "This routine is FAST but EFFECTIVE (5 minutes, real results)",
      "You can have glowing skin AND a busy life (not either/or)",
      "All products cruelty-free (values alignment, no guilt)",
      "Real results from real people (no Instagram fantasy promises)",
      "Win against time poverty (efficiency as victory)"
    ],
    
    "emotional_trigger_strategy": "DEFIANCE + EMPOWERMENT (Tier 3 emotion)",
    "emotional_words": [
      "Win", "Confident", "Effortless", "Real", "Unapologetic", 
      "Proud", "Strong", "Capable", "In control", "Unstoppable"
    ],
    "what_NOT_to_trigger": [
      "Guilt (no 'you should prioritize self-care')",
      "Inadequacy (no 'your routine isn't good enough')",
      "Luxury fantasy (no 'treat yourself like royalty')",
      "Generic positivity (no 'you deserve this')"
    ],
    
    "hashtag_strategy": {
      "tier_1_primary": [
        "#BusyProfessional", 
        "#SkincareTips", 
        "#5MinRoutine",
        "#QuickSkincare",
        "#MorningRoutine"
      ],
      "tier_2_secondary": [
        "#CleanBeauty", 
        "#CrueltyFree", 
        "#RealResults",
        "#SkincareForBusyPeople",
        "#EfficientBeauty"
      ],
      "tier_3_trending": [
        "#RealWorldSkincare", 
        "#BusyMom", 
        "#TimeEfficient",
        "#BusyLife",
        "#SkincareHacks"
      ],
      "tier_4_topical": [
        "[Check trending daily]",
        "[Monitor TA hashtags]",
        "[Platform-specific trends]"
      ],
      "total_count": "25-30 hashtags across all tiers"
    },
    
    "emoji_strategy": {
      "primary_emojis": ["⏰", "✨", "🧴", "☀️", "💚", "✓"],
      "optional_emojis": ["💪", "🎯", "⚡", "💫", "🌿"],
      "avoid": ["💅", "👑", "🧖", "💆", "🛁"]
    },
    
    "call_to_action_strategy": "Action-oriented, not salesy, not pushy",
    "cta_examples": [
      "'Save this post & tag someone who needs this'",
      "'Try it for 30 days—let us know how it goes'",
      "'Drop a 💚 if 5 minutes is more your speed'",
      "'Save this for your next busy morning'",
      "'Tag someone who needs this reminder'"
    ],
    "cta_emotion": "Confident request (not desperate ask), creates community",
    
    "caption_structure": {
      "section_1": "Hook (2-3 lines) — grab attention, make them see themselves",
      "section_2": "Why this matters (3-4 lines) — explain the tension/problem",
      "section_3": "The solution (4-5 lines) — break down the steps",
      "section_4": "The insight (2-3 lines) — why this works",
      "section_5": "Call-to-action (1-2 lines) — specific action",
      "total_length": "150-200 words"
    },
    
    "caption_example": "Save this for your busy morning! ⏰

We get it — you're busy. Work, life, Netflix... where's skincare supposed to fit?

Here's a 5-minute routine that actually WORKS:

💧 Step 1: Gentle Cleanser (1 min)
🧴 Step 2: Hydrating Toner (1 min)
✨ Step 3: Serum (1 min)
💜 Step 4: Moisturizer (1 min)
☀️ Step 5: SPF (1 min)

All our products are cruelty-free ✓ because we believe skincare for busy 
professionals shouldn't require guilt.

Try this for 30 days. Your skin will thank you. (And so will your schedule.)

Save this & tag someone who needs it 👇",
    
    "what_to_avoid": [
      "Generic beauty language ('glow,' 'radiance,' 'goddess')",
      "Overpromising results ('transform your skin in 5 days')",
      "Guilt-tripping ('you deserve self-care')",
      "Corporate tone ('our commitment to you')",
      "Product-heavy focus ('7 ingredients from Switzerland')",
      "Aspirational luxury ('treat yourself like royalty')",
      "Assuming leisure time ('self-care is a priority')"
    ]
  },
  
  "scoring": {
    "originality": {
      "score": 8.5,
      "rationale": "Busy professional angle fills competitor gap. Not saturated in beauty category. Differs from canon (P07 cases) through emotional specificity (defiance, not just efficiency)."
    },
    "strategic_fit": {
      "score": 9.0,
      "rationale": "Perfect alignment with brief objective (educate on routine), target audience (busy professionals), insight (defiance), and competitor gap."
    },
    "emotional_response": {
      "score": 9.5,
      "rationale": "Tier 3 emotion (defiance + empowerment = complex, specific). Score capped at 9.5 because pure Tier 3 reaches 10 only at extraordinary execution."
    },
    "feasibility": {
      "score": 9.0,
      "rationale": "Fully achievable within budget (Instagram Reel = standard), timeline (45s reel = 3-4 hours execution), and resources (Canva + Higgsfield)."
    },
    "scalability": {
      "score": 8.0,
      "rationale": "Strong series potential (one routine per week for 4 weeks). Extensions to blog, email, TikTok playlists. Not perfect because core concept is specific to routine-building."
    },
    "simplicity": {
      "score": 10.0,
      "rationale": "One-sentence idea: 'Show busy professionals skincare that fits their lifestyle, not against it.' Crystal clear. Memorable. No explanation needed."
    },
    "overall_weighted_score": {
      "score": 9.2,
      "formula": "(8.5 × 0.25) + (9.0 × 0.20) + (9.5 × 0.20) + (9.0 × 0.15) + (8.0 × 0.10) + (10.0 × 0.10)",
      "calculation": "2.125 + 1.80 + 1.90 + 1.35 + 0.80 + 1.00 = 9.175 ≈ 9.2"
    },
    "humankind_score": {
      "score": 8.5,
      "assessment": {
        "changes_thinking": true,
        "changes_feeling": true,
        "changes_behavior": true,
        "changes_living": false
      },
      "rationale": "Shifts perspective (busy ≠ guilty), improves feelings (empowerment), drives action (do the routine). Does not fundamentally change lifestyle, so not 9.0."
    },
    "overall_quality_assessment": "STRONG CANDIDATE",
    "ready_for_execution": true,
    "recommended_action": "Proceed to Content Execution with confidence"
  }
}
```

---

## OUTPUT

### File 1: `creative_briefs.json`

Complete JSON containing 7 posts with all 4 deliverables for each:
- Creative brief (concept + visual direction)
- Image prompt (for Canva)
- Video prompt (for Higgsfield)
- Copy direction (for captions)
- Scoring breakdown
- Rationale

---

### File 2: `creative_briefs_summary.md`

Quick reference of all 7 concepts:
```
Monday: "Morning Ritual Hacks" (9.2/10)
Tuesday: "30-Day Glow Journey" (9.1/10)
Wednesday: "Behind-the-Scenes Trust" (8.9/10)
Thursday: "Skincare 101 Fundamentals" (8.8/10)
Friday: "Myths We Debunked" (9.0/10)
Saturday: "Real Person, Real Results" (9.3/10)
Sunday: "Values First, Results Second" (9.1/10)
```

---

# TIME ESTIMATE

```
Per post (complete creative direction):
├─ Phase 1: INTAKE — 5 minutes
├─ Phase 2: INSIGHT — 10 minutes
├─ Phase 3: IDEATION — 15 minutes (3 methods, 12 ideas)
├─ Phase 4: EVALUATE — 15 minutes (scoring, refinement)
└─ Phase 5: ARTICULATE — 10 minutes (briefs + prompts)

Total per post: ~55 minutes

For 7 posts: ~3.5-4 hours

Step 4.5 Total Time: 3.5-4 hours
```

---

# HOW IT FEEDS INTO STEP 5

```
creative_briefs.json contains:
├─ IMAGE PROMPTS (7 detailed)
│  └─ Used by Design Briefs (Step 5a)
│  └─ Sent to Canva connector
│  └─ Output: 6 static images
│
├─ VIDEO PROMPTS (7 detailed, scene-by-scene)
│  └─ Used by Video Scripts (Step 5b)
│  └─ Sent to Higgsfield connector
│  └─ Output: 5 videos
│
└─ COPY DIRECTION (7 detailed)
   └─ Used by Copy & Captions (Step 5c)
   └─ Claude writes full captions
   └─ Output: copy_and_captions.xlsx

Content Execution now has ZERO GUESSWORK
All guidance is precise, detailed, scored to 9+
```

---

# COMPLETE WORKFLOW PICTURE NOW

```
Step 1: Competitor Analysis ✅
Step 2: Trend Analysis ✅
Step 3: Content Strategy ✅
Step 4: Content Bucketing ✅
├─ Output: 7 topics assigned

Step 4.5: CREATIVE DIRECTOR 🎨 (THIS WORKFLOW)
├─ For each post: INTAKE → INSIGHT → IDEATION → EVALUATE → ARTICULATE
├─ Output: 7 complete briefs with:
│  ├─ Creative concept (scored 8.8-9.3)
│  ├─ Image prompts
│  ├─ Video prompts (scene-by-scene)
│  └─ Copy direction
├─ Time: 3.5-4 hours
└─ Status: Ready for execution

Step 5: Content Execution (with FULL CLARITY!)
├─ Design Briefs: "Use this image prompt"
├─ Video Scripts: "Use this video prompt"
└─ Copy & Captions: "Follow this copy direction"

Step 6: Quality Check
Step 7: Publish
```

---

# KEY OUTPUTS SUMMARY

**Per week (7 posts):**
```
✅ 7 Creative concepts (9+ scoring)
✅ 7 Image prompts (detailed, ready for Canva)
✅ 7 Video prompts (scene-by-scene, ready for Higgsfield)
✅ 7 Copy directions (tone, angle, hashtags, CTA)
✅ 7 Scoring rationales (why each scores 8.8-9.3)
✅ Zero guesswork in execution
```

---

**Document Version:** 1.0 (Serge Shima Creative Director Skill Integrated)
**Workflow Type:** Creative Direction (5-phase system)
**Tool:** Claude API + Creative Director Skill
**Input:** content_buckets.json (from Step 4)
**Output:** creative_briefs.json + prompts (to Step 5)
**Time:** 3.5-4 hours per week (all 7 posts)
**Status:** Ready to implement in Cowork
**Feeds Into:** Content Execution (Step 5) with full precision
