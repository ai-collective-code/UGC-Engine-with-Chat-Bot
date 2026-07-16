# UGC Engine with Chat Bot

A complete multi-platform UGC creator outreach system with AI negotiation, real-time chat, and automated creator verification.

## Projects

### 1. **UGC Outreach Engine** (`ugc-engine/`)
Flask backend + vanilla JS dashboard for managing creator campaigns across multiple platforms.

**Features:**
- Multi-platform creator outreach (Instagram, WhatsApp, Facebook)
- AI-powered profile analysis & creator verification (trust scoring, fake account detection, brand safety)
- Language intelligence: 20+ Indian languages (romanized), style detection, cultural sensitivity
- Message variation generation to bypass spam filters
- Content QC automation with rubric-driven scoring
- Real-time conversation monitoring & ops pipeline tracking
- Excel/CSV import/export with formula injection protection

**Tech:** Flask, SQLite, Supabase, Gemini AI, Apify scraping, vanilla JS

**Run:**
```bash
cd ugc-engine
pip install -r requirements.txt
python backend/app.py
# Opens http://localhost:8000
```

---

### 2. **Instagram AI Agent** (`insta-agent/`)
Next.js chatbot for real-time Instagram DM conversations with AI negotiation and human-agent toggle.

**Features:**
- Webhook-driven incoming message handling (X-Hub-Signature-256 verification)
- AI response generation with model fallback chain (Gemini → OpenRouter)
- Rate limiting: 3 DMs/hour per conversation + 20-minute spacing
- Human/AI mode toggle for manual takeover
- Real-time message sync via Supabase PostgreSQL
- Analytics dashboard (conversation volume, engagement trends)
- Markdown stripping & corrupted text rejection for clean creator DMs
- IME-safe input for Indic language creators

**Tech:** Next.js 16 (App Router), TypeScript, Supabase, Gemini, OpenRouter, Tailwind

**Run:**
```bash
cd insta-agent
npm install
npm run dev
# Opens http://localhost:3000
```

---

## Setup

### 1. Clone & install
```bash
git clone https://github.com/ai-collective-code/UGC-Engine-with-Chat-Bot.git
cd UGC-Engine-with-Chat-Bot
```

### 2. Environment

Copy `.env.example` in each project directory to `.env` and fill in:

**Insta-agent (.env):**
```
INSTAGRAM_ACCESS_TOKEN=...
INSTAGRAM_VERIFY_TOKEN=...
INSTAGRAM_APP_SECRET=...
GEMINI_API_KEY=...
OPENROUTER_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**UGC Engine (.env):**
```
APIFY_TOKEN=...
GEMINI_API_KEY=...
IG_ACCESS_TOKEN=...
IG_APP_SECRET=...
SUPABASE_URL=...
```

### 3. Run both
```bash
# Terminal 1: UGC Engine
cd ugc-engine && python backend/app.py

# Terminal 2: Insta-agent
cd insta-agent && npm run dev
```

Dashboard: http://localhost:8000  
Chatbot: http://localhost:3000

---

## Recent Fixes (2026-07-16)

**Security:**
- ✅ XSS vulnerabilities (inline onclick, javascript: URLs) closed
- ✅ Apify API token no longer leaks in error responses
- ✅ Webhook signature verification (X-Hub-Signature-256)
- ✅ Excel formula injection blocked
- ✅ Rate limiter now enforces 3 DMs/hour + 20-min spacing

**Critical Bugs:**
- ✅ AI was reading oldest 20 messages (should be newest)
- ✅ Error messages sent to creators instead of staying silent
- ✅ Markdown/corrupted text reaching DMs
- ✅ Opening Conversations tab wiped creator enrichment data
- ✅ KPI counters stuck at 0 in background tabs
- ✅ Scrape buttons permanently disabled after failures
- ✅ Orphaned polling intervals hammering servers
- ✅ Stale fetches overwriting correct conversation threads

**Standardization:**
- ✅ Consistent error response format (400/404/429/502)
- ✅ Clear input validation, no silent 500s
- ✅ Fast-fail on missing env vars
- ✅ Screen reader labels (a11y)
- ✅ IME-safe input for Indic typing
- ✅ `.env.example` documentation

---

## API Endpoints

### UGC Engine (Flask, port 8000)

```
GET  /api/clients                          # List all clients
POST /api/clients                          # Create client
GET  /api/creators                         # List creators
POST /api/scrape                           # Start Instagram scrape
GET  /api/scrape/status                    # Poll scrape progress
POST /api/analyze-profile                  # AI profile analysis
POST /api/verify-creator                   # Fraud scoring + brand safety
GET  /api/reputation                       # Creator reputation history
POST /api/reputation                       # Log reputation event
POST /api/message-variations               # Generate message rewrites (15 variants)
POST /api/language/translate               # Translate to Indian language
GET  /api/language/detect-style            # Detect creator's language/register
POST /api/language/check-sensitivity       # Cultural sensitivity check
```

### Insta-agent (Next.js, port 3000)

```
POST /api/webhook                          # Instagram/Facebook webhook (set in Meta app)
GET  /api/instagram/health                 # Check Instagram API access status
GET  /api/conversations                    # List all DM threads
GET  /api/conversations/[id]/messages      # Fetch thread messages
POST /api/conversations/[id]/send          # Send DM (rate-limited)
GET  /api/conversations/[id]/send-status   # Check hourly quota
PATCH /api/conversations/[id]              # Toggle human/AI mode
```

---

## Database Schema

**Supabase tables:**
- `instagram_conversations` — creator DM threads (profile, mode: agent|human)
- `instagram_messages` — conversation history (role, content, timestamps)
- `creator_reputation` — scam/ghosted/good records (per username, cross-client)

**UGC Engine (local SQLite + Supabase bridge):**
- `settings` — config, run state
- `creators` — scraped/uploaded (username, language, niche, enrichment)
- `conversations` — WhatsApp routing, ops pipeline state
- `activity_log` — audit trail

---

## Deployment Notes

- **Not production-ready** without auth (both apps bind to localhost)
- **Rate limiter is in-memory** — will reset on server restart; on multi-instance deploy, persist to DB (count `assistant` rows in last hour)
- **Instagram block expected 2026-07-17** after rapid testing on 2026-07-15; once cleared, send-rate guard prevents re-triggering
- **WhatsApp integration** ready but not yet wired into dashboard (webhook + quality rating monitoring)

---

## Contributing

All code follows:
- No trailing comments (only non-obvious WHY)
- Explicit error handling at system boundaries (user input, API calls)
- Security-first: validate at entry, sanitize on output
- Test manually in browser before shipping UI changes

---

## License

Proprietary — AI Collective

---

**Last updated:** 2026-07-16 (40+ bugs fixed, security hardening, international standards)
