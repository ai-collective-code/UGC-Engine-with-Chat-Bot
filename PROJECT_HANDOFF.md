# Project handoff — UGC Creator Outreach System

You are helping build and operate a multi-platform UGC (user-generated content)
creator-outreach system for brand marketing campaigns. Read this whole document
first — it is the source of truth for how the project fits together. Never
commit secrets; all real credentials live in local `.env` files that are
git-ignored.

---

## 1. What the product does (business flow)

A brand (first client: **MYK Laticrete**, tile-adhesive / construction
materials) wants local content creators to post marketing reels. End-to-end:

1. **Source creators** — find creators (Instagram scraping via Apify) and DM them.
2. **Negotiate (automated)** — an AI/deterministic chatbot DMs the creator in
   their own language, offers a voucher (e.g. ₹2000) to make one reel, asks
   Yes/No, and on Yes collects the creator's **WhatsApp number**.
3. **Hand off to humans** — once the number is captured the bot locks the
   conversation to a human ("mode = human").
4. **Find local shops** — using the creator's location, the dashboard pulls
   nearby **tile + hardware shops** (name + phone) from Google Maps.
5. **Verify shops (human-assisted dialer)** — an agent calls each shop to
   confirm it stocks the product, marks it confirmed.
6. **Send confirmed shops to the creator**, who buys the product and posts the
   reel; then payment/voucher is released.

The system covers steps 1–5 today. Steps beyond "confirmed shop sent to creator"
(bought → posted → paid tracking, funnel dashboard) are future work.

---

## 2. Architecture (one git repo, two apps, one shared DB)

Git root: `Chatbot/` (GitHub: `ai-collective-code/UGC-Engine-with-Chat-Bot`, branch `main`).

### App A — `Insta-agent/` (Next.js, TypeScript) — the messaging bot
- Deployed on **Vercel** → `https://insta-agent-fawn.vercel.app`
- One webhook `src/app/api/webhook/route.ts` serves **both Instagram and
  Facebook Messenger** (Meta sends `object: "instagram"` or `object: "page"`).
- `src/lib/flow.ts` — deterministic negotiation state machine + multi-language
  templates (hardcoded `en/hi/bn/mr`; other languages AI-translated).
- `src/lib/ai.ts` — Gemini helpers: language detection + template translation.
- `src/lib/instagram.ts` — Graph API send/profile for both IG and FB
  (`sendInstagramMessage`, `sendFacebookMessage`, `fetchInstagramProfile`,
  `fetchFacebookProfile`, `fetchThreadOpener`). Quick-reply Yes/No supported on
  both platforms; classification is payload-driven so it works in any language.
- `src/lib/db.ts` — pg pool to Render PostgreSQL (**public schema**).
- `src/lib/realtime.ts` — Ably push updates to the dashboard.
- `src/app/privacy/page.tsx` — public privacy policy at `/privacy` (for Meta App Review).
- Data: tables `instagram_conversations`, `instagram_messages` in the **public**
  schema. Conversations carry a `platform` column (`instagram` | `facebook`);
  uniqueness is `(platform, igsid)` so IG IGSIDs and Messenger PSIDs never collide.
- ⚠️ `Insta-agent/AGENTS.md` warns: "This is NOT the Next.js you know" — read
  `node_modules/next/dist/docs/` before writing Next-specific code.

### App B — `ugc-engine/` (Flask, Python) — the ops dashboard
- Deployed on **Render** (gunicorn). Serves `frontend/` (vanilla HTML/JS).
- `backend/app.py` — all API endpoints (clients, creators, WhatsApp-ready queue,
  ops pipeline, analytics, activity feed, Shop Verify).
- `lib/local_db.py` — psycopg2, all data in a dedicated **`ugc` schema** (so it
  can share the same database with the chatbot without collisions).
- `lib/apify_client.py` — generic Apify REST client (Instagram scraping to find creators).
- **Instagram/Messenger bridge**: the dashboard's Conversations tab reads DMs
  from, and sends replies through, the chatbot's HTTP API
  (`INSTAGRAM_CHATBOT_URL`) — it does not talk to Meta directly.
- **Shop Verify**: `_google_places_nearby()` uses Google Places API (New) Text
  Search to source tile/hardware shops by location. Two entry points — per-creator
  "Find shops" (uses the creator's stored location) and a standalone "search by
  city". Human-assisted dialer: `tel:` link by default, optional Exotel bridge.

### Shared infrastructure
- **Render PostgreSQL** — one database, two schemas: `public` (chatbot) + `ugc` (engine).
- **Meta app**: `chatBot_UGC` (App ID `1715302606375333`).
- **Facebook Page**: `AIC Creator's Hub` (Page ID `1179535958581352`).
- **Instagram**: a professional IG account linked to the same Meta app.

---

## 3. Environment variables (names only — real values in local `.env`, never commit)

**Insta-agent (Vercel + local `.env`):**
`DATABASE_URL`, `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_VERIFY_TOKEN`,
`INSTAGRAM_APP_SECRET`, `FACEBOOK_ACCESS_TOKEN` (Page token, has
`pages_messaging`, never expires), `FACEBOOK_VERIFY_TOKEN` (optional — falls back
to the Instagram one), `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `ABLY_API_KEY`.

**ugc-engine (Render + local `.env`):**
`DATABASE_URL` (use Render INTERNAL url on Render, EXTERNAL locally),
`GOOGLE_MAPS_API_KEY` (Places API New, restricted key), `APIFY_TOKEN`,
`INSTAGRAM_CHATBOT_URL` (= the Vercel app URL), optional Exotel vars
(`EXOTEL_SID/TOKEN/CALLER_ID`, `AGENT_PHONE`), `NEGOTIATOR_PAUSED` (emergency stop).

The webhook GET verify token accepts `INSTAGRAM_VERIFY_TOKEN || FACEBOOK_VERIFY_TOKEN`;
signature check accepts `INSTAGRAM_APP_SECRET || FACEBOOK_APP_SECRET` (one Meta app = one secret).

---

## 4. Current state

**Live / working**
- Instagram bot: live (multi-language negotiation, Yes/No buttons, WhatsApp capture).
- Facebook Messenger bot: integrated and tested end-to-end on the same webhook/
  flow/dashboard. Works for people with a role on the Meta app.
- Shop Verify with Google Maps: working (39+ real shops pulled in tests).
- Privacy policy page deployed at `/privacy`.
- Realtime dashboard via Ably.
- AI Profile Analyzer + Creator Verification: working, and fixed 2026-07-25 —
  they had been scoring every creator from a failed scrape (see gotchas below).

**Pending**
- **Meta App Review for `pages_messaging` — SUBMITTED (2026-07-23), status "Review
  in progress," typically decided within ~20 days.** Once approved (Advanced
  Access), any creator can message the Page and get bot replies, not just app
  testers. Until then, add real test accounts via App Roles → Roles → Tester.
- Confirm `GOOGLE_MAPS_API_KEY` is set on the Render deployment (Shop Verify on live site).
- Future: bought→posted→paid tracking, funnel dashboard, payment automation.

---

## 5. Platform rules & gotchas (important)

- **Messenger works only for Facebook *Page* messages**, never end-to-end
  encrypted personal chats (URLs with `/e2ee/`). A Page also cannot *initiate* a
  chat — the user must message the Page first.
- On Instagram the opener DM can be sent manually first (business-initiated); the
  bot detects the opener's language and continues in it.
- **WhatsApp Business messaging is a separate track** (separate payment/DLT
  concerns) and is not required for the Messenger/Instagram bots. Meta only
  accepts Visa/Mastercard for messaging payments (not RuPay).
- WhatsApp/Messenger pricing: replying within a user-initiated 24h window is
  free; only business-initiated template messages cost money.
- Never commit `.env`. When staging, verify no `.env` is tracked. Local dev
  servers should be launched via the repo-root `.claude/launch.json`
  ("Flask UGC Outreach Engine", "Insta-agent Next.js").
- **Apify signals a bad target with an error object INSIDE the dataset**
  (`{"error": "no_items"}`), not an empty dataset — so an unguarded `items[0]`
  looks like a valid-but-blank profile. Feeding that to the model produced
  confident invented verdicts ("1/10, profile is empty") for real creators.
  Always extract via `_profile_from_items()` in `backend/app.py`, which raises
  `ProfileDataError` instead. Related: profile analysis and creator
  verification need `apify/instagram-profile-scraper` (followers/bio), NOT the
  `instagram-reel-scraper` used for bulk reel imports — reels carry no follower
  count. And Instagram returns `-1` for a post whose likes are hidden; that is
  "unknown", not zero (it dragged engagement rates negative).
- **Client config: `config/<client_key>.json` on disk WINS over the DB row.**
  `config/` is gitignored (live campaign data), so the file and the DB can drift
  silently. Client 2 was keyed `xyz_tiles` and loading stale placeholder values
  ("XYZ Tiles", empty deliverables) while the DB said MYK LATICRETE; repointed
  to `myk_laticrete` on 2026-07-25. `offer_line.value` is injected verbatim into
  creator-facing outreach messages — never leave a placeholder there.
- **Gemini free tier is metered per model per day.** `lib/gemini_helper.py`
  walks a model chain and now bounds each attempt with `GEMINI_TIMEOUT_SECONDS`
  (default 20) and remembers the last model that answered — without the timeout
  a single 504-ing model made every call take minutes. Any endpoint that runs an
  AI call inside a status poll must not be polled on a fixed interval; chain the
  next poll after the previous one settles, or overlapping requests each burn a
  full AI call (one analysis once cost 21).

---

## 6. How to work in this repo

- Two dev servers: Flask engine on `:8000`, Next.js chatbot on `:3000`.
- Typecheck the chatbot with `npx tsc --noEmit` before pushing.
- DB migrations are applied directly against the Render Postgres (no migration
  framework); do them in a transaction and reflect any schema change in code
  (e.g. `ON CONFLICT` targets must match the actual unique constraint).
- Commit style: prefix with `Chatbot:` or `UGC:`; end messages with the
  Co-Authored-By trailer. Push to `main`; Vercel auto-deploys the chatbot,
  Render auto-deploys the engine.
