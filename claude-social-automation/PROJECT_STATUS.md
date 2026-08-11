# Project Status — Social Automation Platform

**Last verified:** 2026-08-06, against the live app at `web/` (not from memory — every
line below was checked against running code, disk state, or a browser test on the
date above).

**Branch:** `feat/ui-shell-and-competitor-research` — 4 commits, nothing pushed
(no remote configured), untracked/modified files not yet committed (the
autonomous-research feature below, plus workflows 2-4.5 added in this pass).

---

## How to read this doc

- ✅ **Done** — built, tested, verified working
- ⚠️ **Done but flawed** — works, but has a known defect
- ❌ **Not built** — doesn't exist yet
- 🔴🟡🟢 — priority on the fix/build list (see Part 3)

---

## Part 1 — What's done

### Application shell
| Item | Status | Evidence |
|---|---|---|
| Dashboard, Calendar, Quality Check, Asset Library, Reports, Research pages | ✅ | All 6 routes return HTTP 200 |
| Dark UI shell, nav, shared components | ✅ | — |
| TypeScript + ESLint clean | ✅ | `npx tsc --noEmit` and `npm run lint` both pass with zero output |
| Production build | ✅ | `npm run build` succeeds |

### Workflow 1 — Competitor Analysis
| Item | Status | Evidence |
|---|---|---|
| Intake form (company + up to 5 competitors, domain optional) | ✅ | `/research` — persists to `data/requests.json` |
| **Runs autonomously from a button — no chat session needed** | ✅ | Clicked "Run research now" in browser; job ran to completion with zero manual intervention |
| Keyless web search (no API key required) | ✅ | `src/lib/websearch.ts` — DuckDuckGo Lite, verified returning real results |
| Page fetching + text extraction | ✅ | Confirmed reading real page content (Paper Boat revenue figures, etc.) |
| Background job + progress polling | ✅ | `src/lib/pipeline/jobs.ts` — disk-backed, UI shows live "Researching… Ns" with status message |
| LLM synthesis (1 model call per run, not per competitor) | ✅ | Deliberate design choice — GLM-5.2 measured 190–341s per call, so per-competitor calls would make a 5-brand run take 25+ min instead of ~5 |
| Grounding fix: model no longer contradicts its own sources | ✅ | Verified with a direct before/after test — see Part 3, problem #1 |
| Report download (Competitor Analysis) | ✅ | `/reports` → real markdown, only offered when data exists |

### Workflow 2 — Trend Analysis
| Item | Status | Evidence |
|---|---|---|
| Reads competitor result, builds queries from its gaps/platforms | ✅ | `src/lib/pipeline/trends.ts` — same `researchQuery`/`bundlesToContext` reuse as workflow 1 |
| Background job + progress polling, chained on the research detail page | ✅ | `src/app/research/[id]/stageActions.ts` + `RunStage.tsx`, verified end-to-end in browser |
| Report download (Trend Analysis) | ✅ | `/reports` → real markdown |
| Inherits workflow 1's DuckDuckGo blocking risk | ⚠️ | Same root cause as Problem #1 below — hit live during verification, recovered after the 10-min cooldown |

### Workflow 3 — Content Strategy
| Item | Status | Evidence |
|---|---|---|
| Pure synthesis (no web search) from competitor + trend results → pillars, buyer journey, platform strategy | ✅ | `src/lib/pipeline/strategy.ts` — verified live, ~3 min for one model call |
| Report download (Content Strategy) | ✅ | `/reports` → real markdown |

### Workflow 4 — Content Bucketing
| Item | Status | Evidence |
|---|---|---|
| Pure synthesis from strategy result → 7-post weekly calendar (day/time/platform/topic) | ✅ | `src/lib/pipeline/bucketing.ts` — verified live, produced 7 distinct grounded topics |
| Report download (Content Bucketing) | ✅ | `/reports` → real markdown |

### Workflow 4.5 — Creative Director
| Item | Status | Evidence |
|---|---|---|
| One model call per bucket post (concept, image prompt, video scenes, copy direction, score) | ✅ | `src/lib/pipeline/creative.ts` — 7 concurrent calls via `Promise.allSettled`, verified live: all 7 succeeded in ~4 min |
| Honest partial-failure handling | ✅ | A failed post lands in `failedPostIds` instead of failing the whole batch — not yet triggered live, but exercised by code review against the same pattern `research.ts` uses |
| Report download (Creative Director Briefs) | ✅ | `/reports` → real markdown |

### Workflow 6 — Content Execution (partial)
| Item | Status | Evidence |
|---|---|---|
| Canva image generation (Stream A) | ✅ | 2 real PNGs generated, exported, on disk in `public/generated/`, rendering on `/assets` |
| Video generation (Stream B) | ❌ | No key set; UI honestly labels it "not wired up" |
| Caption writing (Stream C) | ❌ | Not built |

### Workflow 7 — Quality Check
| Item | Status | Evidence |
|---|---|---|
| Approve / request revision / checklist | ✅ | Persists to `data/qc-decisions.json`, survives refresh |
| Dashboard tracker reflects real QC counts | ✅ | Verified dashboard and QC page agree exactly |
| QC report download | ✅ | Real markdown, only offered once a decision exists |

### Infrastructure
| Item | Status | Evidence |
|---|---|---|
| Provider-agnostic LLM client | ✅ | `src/lib/llm.ts` — OpenAI-compatible, swappable via 3 env vars, no code change needed |
| Currently configured provider | ✅ | GLM-5.2 on NVIDIA NIM, key set and authenticating |
| `.env.example` / `CREDENTIALS.md` | ✅ | Documented per-credential difficulty and what's needed for each remaining workflow |

---

## Part 2 — What's not built

Everything below returns an honest "not available" state in the UI rather than fake
data — this was a deliberate choice throughout, not an oversight.

| Workflow | Status | Depends on |
|---|---|---|
| 6 — Video generation | ❌ | Needs `VIDEO_PROVIDER` + `VIDEO_API_KEY` (fal.ai recommended) |
| 6 — Caption writing | ❌ | Needs workflow 4.5's copy direction |
| 7 — Publishing (all platforms) | ❌ | Needs per-platform app-review credentials — see `CREDENTIALS.md`, this is weeks not hours |
| Universal project model | ⚠️ partial | Workflows 1-4.5 (research through creative briefs) work for any company/category. Dashboard, Calendar, and mock post data are still the one hardcoded skincare example — not yet wired to real bucketing/creative output |
| Calendar populated from real bucketing | ❌ | Calendar currently shows the same hardcoded example; nothing generates real bucketing yet |
| Publishing schedule derived from calendar | ❌ | Depends on the above |

---

## Part 3 — Problems, fix priority order

### 🔴 P0 — Blocks reliable autonomous research right now

**1. Web search gets blocked by DuckDuckGo's bot detection under normal use**

- **What happens:** The research step fires ~15–18 concurrent search requests per
  run. That burst pattern trips DuckDuckGo Lite's anti-bot system, which then
  returns a fake-looking "results" page with zero actual results — silently, no
  error status.
- **Confirmed, not assumed:** Fetched the raw response body directly; it contains
  the string `"anomaly"` and zero result links. Reproduced on demand.
- **Real-world impact seen:** In one research run, 3 of 5 competitors (Pepsi, Red
  Bull, Campa) came back with zero data because of this — not because the model
  failed.
- **Fixed so far:** Requests are now serialized (1.5s + jitter spacing) and a
  circuit breaker stops hammering the endpoint for 10 minutes once a block is
  detected, instead of making it worse. Verified working against the live block.
- **Still open:** Throttling *reduces* risk, it doesn't remove it. Sustained real
  use will likely trip this again.
- **The real fix:** A proper search API (Tavily or Brave Search both have usable
  free tiers) instead of scraping. Costs one more API key — the user's call,
  raised and awaiting a decision.

**2. Model can misidentify a competitor when its name is ambiguous or a typo**

- **What happens:** Given "string" as a competitor name (likely meant "Sting," the
  energy drink), and search results genuinely existing for an unrelated company
  literally named "String Beverages," the model confidently profiled the wrong
  company instead of flagging uncertainty.
- **Contributing cause:** This specific case was made worse by problem #1 — the
  correct query for "Sting" was one of the ones dropped by the block.
- **Fixed so far:** Added an explicit scale-sanity-check instruction — if a match
  is wildly inconsistent with the other named competitors (e.g. tiny unrelated
  business among global brands), the model should say identity is uncertain
  rather than confidently write up the wrong company.
- **Still open:** Not yet re-tested against a real ambiguous case (blocked by
  problem #1 — can't get a clean run to verify against while search is down).

### 🟡 P1 — Real defects, not urgent

**3. GLM-5.2 is slow: 190–341 seconds per call, measured directly**

- **Impact:** Every workflow step this gets built into will take minutes, not
  seconds. A full 7-workflow run would take hours on this model alone.
- **Recommended fix, not yet applied:** Split models — a fast model
  (`meta/llama-3.3-70b-instruct`, same NVIDIA key, no new signup) for mechanical
  steps and iteration; keep GLM-5.2 for the creative steps where its 1M context and
  reasoning quality actually matter. The code already supports this
  (`LLM_MODEL_CREATIVE`) — just needs the env var set and a decision from the user.
- **Status:** Raised twice, no decision yet.

**4. Uncommitted work**

- `src/lib/websearch.ts`, `src/lib/pipeline/*`, the autonomous-research UI, and
  the throttling/grounding fixes above are all on disk and working, but not yet
  committed to git. Same for the workflow 2-4.5 pipeline (`trends.ts`,
  `strategy.ts`, `bucketing.ts`, `creative.ts`, `pipeline-store.ts`,
  `stageActions.ts`, `RunStage.tsx`) added in this pass.

### 🟢 P2 — Known gaps, not yet started

**5. No universal project switching in the UI**

- Research works for any company. The rest of the app (dashboard, calendar, QC
  seed data) is still one hardcoded example project. Needs a real project
  model + a way to switch the active project in the UI.

**6. Workflows 2–5 don't exist yet**

- Trend analysis, content strategy, bucketing, and creative briefs are fully
  specified in the root-level workflow `.md` docs but have no code. Once problem
  #1 is resolved (or accepted as-is), these follow the same pattern as workflow 1.

**7. Video, captions, publishing — no code at all**

- Video and captions need one more credential each (already documented in
  `CREDENTIALS.md`). Publishing needs real platform app-review approval, which is
  a multi-week external process, not an engineering task — flagged in
  `CREDENTIALS.md` with a recommendation to publish manually or via an existing
  scheduler (Buffer/Later/Metricool) rather than build this from scratch first.

---

## Suggested order of work

1. Decide: accept keyless-search fragility, or add a search API key (P0 #1)
2. Decide: split models for faster iteration (P1 #3)
3. Commit the current autonomous-research work, including workflows 2-4.5 (P1 #4)
4. Re-run research once #1 is resolved to confirm the identity-disambiguation fix (P0 #2)
5. ~~Build workflow 2 (Trend Analysis) using the same pattern as workflow 1~~ — done
6. ~~Chain 3, 4, 4.5 the same way~~ — done
7. Wire a real project model so the whole app (Dashboard, Calendar, QC, Assets —
   not just the research/creative-director chain) works for any company
8. Wire Creative Director's image prompts into the existing Canva queue
   (`src/app/assets/actions.ts`) and its copy direction into an autonomous
   caption-writing step — both now have real upstream data to consume
9. Video once a key is added
10. Publishing last — it has the longest external lead time, so starting it late doesn't block anything else
