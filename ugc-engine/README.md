# UGC Creator Outreach Engine

Reusable pipeline: creator export (Apify Instagram/FB scrape) in → personalized,
language-matched outreach queue out. Built for Myk Laticrete's mistri/mason
campaign; designed so the next client is a config swap, not a rebuild.

## Run it

```bash
python scripts/build_outreach_queue.py <input.xlsx> <config.json> <output.xlsx>
```

## Monitoring dashboard

A local web dashboard sits over everything else in this repo — every client,
the outreach queue, live negotiation conversations, and anything waiting on
a human. It's read/monitor plus light control (status updates, pause/resume,
adding a client); it doesn't run the negotiator itself.

```bash
pip install -r requirements.txt
python backend/app.py
```

Open **http://localhost:8000**. It reads/writes `data/ugc_engine.db` (created
automatically) — the same database `build_outreach_queue.py` and the two
negotiator webhooks (`whatsapp_ai_agent.py`, `instagram_webhook.py`) write to
as they run, so the dashboard reflects them live (10s auto-refresh):

- **Overview** — stat tiles (creators, WhatsApp-ready, active conversations,
  deals agreed, pending review) + a language breakdown chart.
- **Creators** — the outreach queue, filterable by status/channel, with an
  inline status dropdown (writes straight back to the DB).
- **Conversations** — every negotiation thread, any channel, any client;
  click one to read the full transcript.
- **Needs Action** — `DEAL_AGREED` and `CEILING_BLOCKED` events from
  `lib/human_handoff.py`, with a "mark resolved" button once a human has
  acted on it.
- **Clients** — every client's deal terms at a glance, plus a form to add a
  new client without hand-editing JSON (it still writes `config/<key>.json`,
  so the CLI scripts work exactly as before).
- **Negotiator pause/resume** (top right) — the same kill switch described
  below, but flippable from the browser with no restart.

## Onboarding a new client (this is the whole point of "reusable")

1. Copy `config/myk_laticrete.json` → `config/<new_client>.json`
2. Edit: `client_name`, `brand_display_name`, `offer_line.value` (the actual
   compensation — never ships with a placeholder)
3. If the creator niche isn't construction, edit `NICHE_PHRASE` in
   `lib/message_templates.py` to match the new vertical's hashtags
4. Run the script against their creator export

`lib/location_language.py` (India geography → language) does **not** need to
change per client — that's the reusable core asset. Extend `CITY_STATE` over
time as new cities show up in real data; it only grows.

## What this run found in the Myk Laticrete data (80 creators)

- **68 Hindi, 3 Gujarati, 3 Marathi, 2 Telugu, 2 Bengali, 1 Odia, 1 Assamese**
  — only 30/80 profiles had usable location text, the rest defaulted to
  Hindi (the safe default for this audience — confirmed by the raw captions,
  which are overwhelmingly Hindi/Hinglish already)
- **11 of 80** had a phone number recoverable from their own post captions
  (people advertising their own services) → routed to `WhatsApp_Ready` with
  a pre-filled `wa.me` link
- **2 phone numbers appear on two different accounts** (`official_anadilsaifi_23`
  and `saifi_dream_homes` both show `9568890271`) — same underlying contact,
  don't message both or it reads as spammy/careless

## Known limitations — read before sending anything

- **Some "creators" are clearly businesses, not individuals** (e.g. "RJ Tiles
  Work", "Manoj Power Tools", "Civil Tech Equipments"). The template's
  first-name + "ji" greeting looks odd on a shop account ("Hi RJ ji!"). Worth
  a manual pass to split individual mistris from business/shop accounts and
  use a different opening line for the latter.
- **Regional templates (Odia, Assamese, Bengali, Telugu) are AI-drafted, not
  native-reviewed.** Fine for a first batch of a few dozen; get a native
  speaker to skim before scaling to hundreds in a language you can't
  personally proofread — a tone-deaf message at 500 sends is a bigger
  problem than at 5.
- **Location data was only ~37% populated.** If future scrapes can pull
  bio/location more reliably, language-matching accuracy goes up
  proportionally. Worth raising with whoever configures the Apify scraper.
- **`offer_line` ships as a placeholder on purpose** — I don't know your
  actual compensation terms, and I'm not going to guess and put invented
  numbers in front of real people. Fill it in before any real send.

## Two ways to run this

**Option A — no setup, right here in Claude.ai**
Upload a new creator export in a chat with Claude, say which client/config
to use (or describe the offer/niche fresh), and ask Claude to run the
engine. Nothing to install. This is the easiest path if nobody on the team
is running Python day-to-day.

**Option B — Claude Code (for a technical teammate, or once volume is high)**
```bash
pip install pandas openpyxl
python scripts/build_outreach_queue.py <creator_export.xlsx> config/<client>.json <output.xlsx>
```
Inside Claude Code you don't need to remember the exact command either —
just say "run the outreach engine on this new creator file for Client X"
and it executes the same script.

## Day-to-day: working the output spreadsheet

**IG_FB_DM_Queue tab** (manual send required — see README top for why):
1. Open a row, copy the `Personalized Message` cell
2. Click `Profile Link` to open their Instagram/Facebook
3. Paste and send the DM
4. Set `Status` to `Sent`
5. When they reply → `Replied`. When they agree to make content → `Converted`

**WhatsApp_Ready tab** (fully automatable send once WhatsApp Business API
template is approved; manual-but-fast in the meantime):
1. Click the `WhatsApp Link` cell — opens WhatsApp with the message already
   typed into the chat
2. Hit send
3. Update `Status` the same way as above

**Onboarding client #2, #3, etc.:** duplicate the config JSON, fill in their
brand/offer/niche map, run against their creator export. Nothing else
changes.


India's ASCI influencer guidelines expect paid/product-for-content
collaborations to be disclosed (#ad, #collab) once content goes live. Worth
one line about this in the follow-up message once a creator agrees, not in
the cold-open itself.

## Once a creator replies: the AI negotiator (WhatsApp + Instagram)

`scripts/whatsapp_ai_agent.py` and `scripts/instagram_webhook.py` both run
the same Claude-powered negotiator (`lib/llm_negotiator.py`) once a creator
replies to your manual first DM. It negotiates like a human talent manager
— opens low, concedes in small steps if pushed, never crosses the client
config's `max_voucher_inr` — and never sends money itself.

**Check the "Needs Action" tab in the dashboard** (or `needs_human_action.csv`
in the repo root if the dashboard isn't running). Every time a deal is
agreed, or a creator pushes past the budget ceiling, a row gets logged:
timestamp, channel, contact, event (`DEAL_AGREED` / `CEILING_BLOCKED`), and
the message that triggered it. This is your actual to-do list — a human
must release the voucher for `DEAL_AGREED` rows, and decide on
`CEILING_BLOCKED` rows (hold the line, or approve an exception). Mark each
one resolved from the dashboard once handled.

**Emergency stop:** click Pause in the dashboard (top right — takes effect
on the very next message, no restart needed), or set
`NEGOTIATOR_PAUSED=true` in `.env` and restart the webhook(s) if the
dashboard isn't running. Every reply on every channel instantly falls back
to a fixed "our team will follow up" message — no code changes, no
credentials touched. Use this if the bot misbehaves, gets talked
off-script, or Anthropic has an outage.

Conversation history, every client's config, the outreach queue, and the
Needs Action log all live in one place: `data/ugc_engine.db`
(`lib/local_db.py`) — a restart mid-negotiation doesn't wipe anything, and
it's what the dashboard reads. That file (and `needs_human_action.csv`)
contains real people's data — keep both out of version control and back
them up the same way you'd handle any customer data.
