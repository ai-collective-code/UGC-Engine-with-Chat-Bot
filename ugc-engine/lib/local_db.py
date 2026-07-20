# -*- coding: utf-8 -*-
"""
Central database for the whole engine. Every client's config, outreach queue,
negotiation conversation, and human-action event lives here -- it's what
backend/app.py (the monitoring dashboard) reads from, and what the CLI scripts
and negotiator webhooks write to as they run.

Backed by PostgreSQL (psycopg2). All tables live in a dedicated `ugc` schema so
they stay isolated from anything else sharing the same database (e.g. the
Instagram chatbot's tables, or an unrelated app's) -- no name collisions.

Config:
  DATABASE_URL -- PostgreSQL connection string (required). On Render, use the
                  INTERNAL URL when this service runs on Render (same region as
                  the DB); use the EXTERNAL URL for local development.
  PGSSLMODE    -- libpq sslmode, default "require" (Render encrypts both its
                  internal and external endpoints). Set to "disable" only if
                  connecting to a local Postgres without SSL.

Implementation note: get_conn() returns a thin wrapper that mimics the small
slice of the sqlite3.Connection API this module used (.execute/.executemany/
.executescript, context-manager commit) and rewrites `?` placeholders to `%s`,
so the query bodies below read the same as they did under SQLite.
"""
import json
import os
import urllib.parse

import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.environ.get("DATABASE_URL")
SCHEMA_NAME = "ugc"
_SSLMODE = os.environ.get("PGSSLMODE", "require")

SCHEMA = f"""
CREATE SCHEMA IF NOT EXISTS {SCHEMA_NAME};

CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    client_key TEXT UNIQUE NOT NULL,
    client_name TEXT NOT NULL,
    campaign_name TEXT,
    brand_display_name TEXT,
    offer_line TEXT,
    default_language TEXT,
    max_voucher_inr INTEGER,
    opening_voucher_inr INTEGER,
    voucher_type TEXT,
    reimbursement TEXT,
    deliverables TEXT,
    whatsapp_enabled INTEGER DEFAULT 0,
    instagram_enabled INTEGER DEFAULT 0,
    facebook_enabled INTEGER DEFAULT 0,
    compliance_note TEXT,
    created_at TEXT DEFAULT to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS creators (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    full_name TEXT,
    username TEXT,
    profile_link TEXT,
    location_raw TEXT,
    matched_state TEXT,
    language TEXT,
    language_confidence TEXT,
    niche TEXT,
    phone TEXT,
    caption_sample TEXT,
    personalized_message TEXT,
    channel TEXT,
    source_platform TEXT,
    profile_type TEXT DEFAULT 'individual',
    whatsapp_link TEXT,
    status TEXT DEFAULT 'Not Sent',
    ops_stage TEXT DEFAULT '',
    content_url TEXT,
    qc_score INTEGER,
    qc_verdict TEXT,
    qc_data TEXT,
    notes TEXT,
    created_at TEXT DEFAULT to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD HH24:MI:SS'),
    UNIQUE(client_id, username, channel)
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    channel TEXT NOT NULL,
    contact_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS human_actions (
    id SERIAL PRIMARY KEY,
    client_id INTEGER,
    channel TEXT,
    contact_id TEXT,
    event TEXT NOT NULL,
    detail TEXT,
    resolved INTEGER DEFAULT 0,
    created_at TEXT DEFAULT to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS dealers (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    dealer_name TEXT,
    pincode TEXT,
    city TEXT,
    state TEXT,
    phone TEXT,
    address TEXT,
    created_at TEXT DEFAULT to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD HH24:MI:SS'),
    UNIQUE(client_id, dealer_name, pincode)
);

CREATE TABLE IF NOT EXISTS profile_analyses (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    username TEXT NOT NULL,
    profile_data TEXT,
    analysis_data TEXT,
    created_at TEXT DEFAULT to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD HH24:MI:SS')
);

-- Creator reputation history (roadmap point 50). One row per recorded event.
-- Keyed by username (not creator id) so a creator's track record follows them
-- across clients/campaigns -- a scammer flagged on one brand is flagged on all.
-- event: 'good' | 'late' | 'ghosted' | 'fake_content' | 'scam' | 'note'
CREATE TABLE IF NOT EXISTS creator_reputation (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    client_id INTEGER REFERENCES clients(id),
    event TEXT NOT NULL,
    detail TEXT,
    created_at TEXT DEFAULT to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD HH24:MI:SS')
);
CREATE INDEX IF NOT EXISTS idx_reputation_username ON creator_reputation(username);

-- Shop verification queue: local tile/hardware shops a human agent calls to
-- confirm they stock the client's product, so a creator can be routed to a
-- shop that actually has it. status: pending -> has_product | no_product |
-- no_answer | callback -> sent (once the shop is forwarded to the creator).
CREATE TABLE IF NOT EXISTS shop_verifications (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    creator_contact TEXT,
    area TEXT,
    shop_name TEXT,
    phone TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TEXT DEFAULT to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD HH24:MI:SS'),
    updated_at TEXT DEFAULT to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD HH24:MI:SS')
);
CREATE INDEX IF NOT EXISTS idx_shops_client ON shop_verifications(client_id);
"""


def _translate(sql):
    """Rewrite sqlite3-style `?` placeholders to psycopg2's `%s`. None of this
    module's queries contain a literal `%` or `?`, so a plain replace is safe."""
    return sql.replace("?", "%s")


class _PgConn:
    """Minimal sqlite3.Connection look-alike over a pooled psycopg2 connection.

    Supports the exact surface this module uses: .execute()/.executemany()
    returning a cursor, .executescript(), .commit(), .scalar(), and use as a
    context manager (commit on clean exit, rollback on error), releasing the
    underlying connection back to the pool afterwards.
    """

    def __init__(self, raw):
        self._raw = raw

    def execute(self, sql, params=None):
        cur = self._raw.cursor(cursor_factory=RealDictCursor)
        cur.execute(_translate(sql), params if params else None)
        return cur

    def executemany(self, sql, seq_of_params):
        cur = self._raw.cursor()
        cur.executemany(_translate(sql), list(seq_of_params))
        return cur

    def executescript(self, sql):
        # Multi-statement DDL, no parameters -- sent verbatim (no placeholder
        # translation; the schema contains none).
        cur = self._raw.cursor()
        cur.execute(sql)
        return cur

    def scalar(self, sql, params=None):
        """First column of the first row (for COUNT(*)-style queries)."""
        row = self.execute(sql, params).fetchone()
        if row is None:
            return None
        return next(iter(row.values()))

    def commit(self):
        self._raw.commit()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        try:
            if exc_type is None:
                self._raw.commit()
            else:
                self._raw.rollback()
        finally:
            _put_conn(self._raw)
        return False


_pool = None


def _get_pool():
    global _pool
    if _pool is None:
        if not DATABASE_URL:
            raise RuntimeError(
                "DATABASE_URL is not set -- add your PostgreSQL connection string to .env"
            )
        # search_path pins every unqualified table name to the `ugc` schema
        # (with public as a fallback for built-ins), so this engine's tables
        # never collide with anything else in a shared database.
        _pool = ThreadedConnectionPool(
            1,
            10,
            dsn=DATABASE_URL,
            sslmode=_SSLMODE,
            options=f"-c search_path={SCHEMA_NAME},public",
        )
    return _pool


def _put_conn(raw):
    if _pool is not None:
        _pool.putconn(raw)


def get_conn():
    return _PgConn(_get_pool().getconn())


# The platforms a creator can be sourced from. WhatsApp is NOT a source --
# it's the final contact channel, derived from any creator that has a phone.
SOURCE_PLATFORMS = ("instagram", "facebook", "youtube", "linkedin")

# Post-deal fulfillment pipeline, separate from the negotiation `status`.
# Only meaningful once a creator's status is "Converted"; '' means fulfillment
# hasn't started yet.
OPS_STAGES = ("Product Purchased", "Content Posted", "Content Verified", "Payout Sent")


def init_db():
    with get_conn() as conn:
        conn.executescript(SCHEMA)
        _migrate(conn)


def _migrate(conn):
    """Idempotent data-normalization, safe to run on every startup. On a fresh
    database these are all no-ops; they only do work if legacy rows are present
    (e.g. data imported from the old SQLite engine)."""
    # Legacy channel 'instagram_fb' becomes the 'instagram' source so re-uploads
    # update the same row instead of creating a duplicate under a new channel name.
    conn.execute("UPDATE creators SET channel='instagram' WHERE channel='instagram_fb'")

    # Legacy 'whatsapp' rows were derived duplicates of a source row (one per
    # creator that had a phone). WhatsApp-ready is now derived from phone != '',
    # so these engine-generated copies are removed to stop double-counting.
    removed = conn.execute("DELETE FROM creators WHERE channel='whatsapp'").rowcount
    if removed:
        print(f"[local_db] migration: removed {removed} legacy derived whatsapp rows")

    # Backfill source_platform from channel wherever it's still blank.
    conn.execute(
        "UPDATE creators SET source_platform = channel "
        "WHERE source_platform IS NULL OR source_platform = ''"
    )

    # Backfill whatsapp_link for rows that have a phone but no link. The link =
    # wa.me/<91-phone>?text=<message>.
    to_link = conn.execute(
        "SELECT id, phone, personalized_message FROM creators "
        "WHERE phone IS NOT NULL AND phone != '' "
        "AND (whatsapp_link IS NULL OR whatsapp_link = '')"
    ).fetchall()
    for r in to_link:
        phone = r["phone"]
        num = phone if (len(phone) == 12 and phone.startswith("91")) else f"91{phone}"
        link = f"https://wa.me/{num}?text=" + urllib.parse.quote(r["personalized_message"] or "")
        conn.execute("UPDATE creators SET whatsapp_link = ? WHERE id = ?", (link, r["id"]))


# --- clients -----------------------------------------------------------

def upsert_client_from_config(config, client_key):
    neg = config.get("negotiation", {})
    channels = config.get("channels", {})
    fields = {
        "client_name": config.get("client_name", client_key),
        "campaign_name": config.get("campaign_name", ""),
        "brand_display_name": config.get("brand_display_name", ""),
        "offer_line": (config.get("offer_line") or {}).get("value", ""),
        "default_language": config.get("default_language", "Hindi"),
        "max_voucher_inr": neg.get("max_voucher_inr"),
        "opening_voucher_inr": neg.get("opening_voucher_inr"),
        "voucher_type": neg.get("voucher_type", ""),
        "reimbursement": neg.get("reimbursement", ""),
        "deliverables": neg.get("deliverables", ""),
        "whatsapp_enabled": int(bool(channels.get("whatsapp"))),
        "instagram_enabled": int(bool(channels.get("instagram_dm"))),
        "facebook_enabled": int(bool(channels.get("facebook_dm"))),
        "compliance_note": config.get("compliance_note", ""),
    }
    with get_conn() as conn:
        existing = conn.execute(
            "SELECT id FROM clients WHERE client_key = ?", (client_key,)
        ).fetchone()
        if existing:
            set_clause = ", ".join(f"{k} = ?" for k in fields)
            conn.execute(
                f"UPDATE clients SET {set_clause} WHERE client_key = ?",
                list(fields.values()) + [client_key],
            )
            return existing["id"]
        cols = ["client_key"] + list(fields.keys())
        placeholders = ", ".join(["?"] * len(cols))
        cur = conn.execute(
            f"INSERT INTO clients ({', '.join(cols)}) VALUES ({placeholders}) RETURNING id",
            [client_key] + list(fields.values()),
        )
        return cur.fetchone()["id"]


def get_client_id_by_key(client_key):
    with get_conn() as conn:
        row = conn.execute("SELECT id FROM clients WHERE client_key = ?", (client_key,)).fetchone()
    return row["id"] if row else None


def list_clients():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM clients ORDER BY id").fetchall()
    return [dict(r) for r in rows]


def get_client(client_id):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM clients WHERE id = ?", (client_id,)).fetchone()
    return dict(row) if row else None


# --- creators ------------------------------------------------------------

def insert_creators(client_id, records):
    """records: list of dicts matching the creators columns (minus id/client_id).
    Upserts on (client_id, username, channel) so re-running the queue builder
    on the same export doesn't create duplicate rows; status/notes are left
    alone on conflict so a manual status update isn't clobbered by a re-run."""
    if not records:
        return
    cols = list(records[0].keys())
    update_cols = [c for c in cols if c not in ("status", "notes")]
    placeholders = ", ".join(["?"] * len(cols))
    update_clause = ", ".join(f"{c}=excluded.{c}" for c in update_cols)
    with get_conn() as conn:
        for r in records:
            conn.execute(
                f"INSERT INTO creators (client_id, {', '.join(cols)}) VALUES (?, {placeholders}) "
                f"ON CONFLICT(client_id, username, channel) DO UPDATE SET {update_clause}",
                [client_id] + [r[c] for c in cols],
            )


def upsert_whatsapp_contact(client_id, username, full_name, phone, whatsapp_link,
                            profile_link="", channel="instagram", source_platform="instagram"):
    """Targeted upsert for a phone number captured from a DM thread. INSERTs a
    minimal row if the creator isn't in the DB yet; on conflict it only updates
    phone/whatsapp_link (and full_name when it's still blank), so an enriched
    row from a real import isn't wiped just by viewing the conversation."""
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO creators (client_id, username, full_name, phone, whatsapp_link, "
            "profile_link, channel, source_platform) VALUES (?, ?, ?, ?, ?, ?, ?, ?) "
            "ON CONFLICT(client_id, username, channel) DO UPDATE SET "
            "phone=excluded.phone, whatsapp_link=excluded.whatsapp_link, "
            "full_name=CASE WHEN creators.full_name IS NULL OR creators.full_name='' "
            "THEN excluded.full_name ELSE creators.full_name END",
            (client_id, username, full_name, phone, whatsapp_link,
             profile_link, channel, source_platform),
        )


def list_creators(client_id=None, status=None, channel=None,
                  source_platform=None, whatsapp_ready=None):
    q = "SELECT * FROM creators WHERE 1=1"
    params = []
    if client_id:
        q += " AND client_id = ?"
        params.append(client_id)
    if status:
        q += " AND status = ?"
        params.append(status)
    if channel:
        q += " AND channel = ?"
        params.append(channel)
    if source_platform:
        q += " AND source_platform = ?"
        params.append(source_platform)
    if whatsapp_ready:
        q += " AND phone IS NOT NULL AND phone != ''"
    q += " ORDER BY id DESC"
    with get_conn() as conn:
        rows = conn.execute(q, params).fetchall()
    return [dict(r) for r in rows]


def list_whatsapp_ready(client_id=None, source_platform=None, status=None):
    """The WhatsApp funnel: every creator that has a phone number, regardless
    of which platform they were sourced from. This is the derived dashboard --
    no rows are duplicated; a contact appears here the moment a phone is found."""
    return list_creators(
        client_id=client_id, source_platform=source_platform,
        status=status, whatsapp_ready=True,
    )


def platform_breakdown(client_id=None):
    """Per-source-platform counts (total + how many have a WhatsApp number),
    for the upload cards."""
    q = ("SELECT source_platform, COUNT(*) as total, "
         "SUM(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 ELSE 0 END) as whatsapp_ready "
         "FROM creators WHERE 1=1")
    params = []
    if client_id:
        q += " AND client_id = ?"
        params.append(client_id)
    q += " GROUP BY source_platform"
    with get_conn() as conn:
        rows = conn.execute(q, params).fetchall()
    return {(r["source_platform"] or "unknown"): {"total": r["total"], "whatsapp_ready": r["whatsapp_ready"]}
            for r in rows}


def update_creator_status(creator_id, status, notes=None):
    """Returns the number of rows updated (0 = no such creator)."""
    with get_conn() as conn:
        if notes is not None:
            cur = conn.execute("UPDATE creators SET status=?, notes=? WHERE id=?", (status, notes, creator_id))
        else:
            cur = conn.execute("UPDATE creators SET status=? WHERE id=?", (status, creator_id))
        return cur.rowcount


def update_creator_ops_stage(creator_id, ops_stage):
    """Advance a converted creator through the post-deal fulfillment pipeline
    (product purchased -> content posted -> verified -> paid out).
    Returns the number of rows updated (0 = no such creator)."""
    with get_conn() as conn:
        cur = conn.execute("UPDATE creators SET ops_stage=? WHERE id=?", (ops_stage, creator_id))
        return cur.rowcount


def save_content_qc(creator_id, content_url, qc_result):
    """Store an AI QC pass against a creator's submitted content. qc_result is
    the dict from lib/content_qc.analyze_content (score/verdict/pros/cons/etc).
    Returns the number of rows updated (0 = no such creator)."""
    with get_conn() as conn:
        cur = conn.execute(
            "UPDATE creators SET content_url=?, qc_score=?, qc_verdict=?, qc_data=? WHERE id=?",
            (content_url, qc_result.get("score"), qc_result.get("verdict"), json.dumps(qc_result), creator_id),
        )
        return cur.rowcount


def list_ops_pipeline(client_id=None):
    """Every converted creator, for the Ops Pipeline board -- fulfillment
    happens after the deal is agreed, so this only ever shows Converted rows."""
    return list_creators(client_id=client_id, status="Converted")


def payout_ready_export(client_id=None):
    """Creators whose content has been verified (ready for finance to action
    payout) -- one row per creator, with the last DEAL_AGREED note (whatever
    amount/terms the negotiator or human recorded) attached as context, since
    there's no separate structured deal-amount field yet."""
    rows = list_creators(client_id=client_id, status="Converted")
    ready = [r for r in rows if r.get("ops_stage") in ("Content Verified", "Payout Sent")]
    with get_conn() as conn:
        for r in ready:
            action = conn.execute(
                "SELECT detail, created_at FROM human_actions "
                "WHERE event='DEAL_AGREED' AND client_id=? AND "
                "(contact_id=? OR contact_id=?) ORDER BY id DESC LIMIT 1",
                (r["client_id"], r.get("phone") or "", r.get("username") or ""),
            ).fetchone()
            r["deal_note"] = action["detail"] if action else ""
    return ready


def language_breakdown(client_id=None):
    q = "SELECT language, COUNT(*) as count FROM creators WHERE 1=1"
    params = []
    if client_id:
        q += " AND client_id = ?"
        params.append(client_id)
    q += " GROUP BY language ORDER BY count DESC"
    with get_conn() as conn:
        rows = conn.execute(q, params).fetchall()
    return [dict(r) for r in rows]


# --- messages --------------------------------------------------------------

def get_history(client_id, channel, contact_id):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT role, content FROM messages WHERE client_id=? AND channel=? AND contact_id=? ORDER BY id",
            (client_id, channel, contact_id),
        ).fetchall()
    return [{"role": r["role"], "content": r["content"]} for r in rows]


def replace_history(client_id, channel, contact_id, history):
    """Full-history overwrite -- matches the webhook call pattern of
    load -> append -> generate -> append -> save(full list)."""
    with get_conn() as conn:
        conn.execute(
            "DELETE FROM messages WHERE client_id=? AND channel=? AND contact_id=?",
            (client_id, channel, contact_id),
        )
        conn.executemany(
            "INSERT INTO messages (client_id, channel, contact_id, role, content) VALUES (?, ?, ?, ?, ?)",
            [(client_id, channel, contact_id, m["role"], m["content"]) for m in history],
        )


def list_conversations(client_id=None, channel=None):
    """One row per (client, channel, contact) with a last-message preview."""
    q = """
        SELECT client_id, channel, contact_id, COUNT(*) as message_count,
               MAX(created_at) as last_message_at,
               (SELECT content FROM messages m2
                WHERE m2.client_id = m.client_id AND m2.channel = m.channel AND m2.contact_id = m.contact_id
                ORDER BY m2.id DESC LIMIT 1) as last_message
        FROM messages m
        WHERE 1=1
    """
    params = []
    if client_id:
        q += " AND client_id = ?"
        params.append(client_id)
    if channel:
        q += " AND channel = ?"
        params.append(channel)
    q += " GROUP BY client_id, channel, contact_id ORDER BY last_message_at DESC"
    with get_conn() as conn:
        rows = conn.execute(q, params).fetchall()
    return [dict(r) for r in rows]


# --- human actions -----------------------------------------------------

def log_human_action(client_id, channel, contact_id, event, detail):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO human_actions (client_id, channel, contact_id, event, detail) VALUES (?, ?, ?, ?, ?)",
            (client_id, channel, contact_id, event, detail),
        )


def list_human_actions(resolved=None):
    q = "SELECT * FROM human_actions WHERE 1=1"
    params = []
    if resolved is not None:
        q += " AND resolved = ?"
        params.append(int(resolved))
    q += " ORDER BY id DESC"
    with get_conn() as conn:
        rows = conn.execute(q, params).fetchall()
    return [dict(r) for r in rows]


def resolve_human_action(action_id):
    with get_conn() as conn:
        conn.execute("UPDATE human_actions SET resolved=1 WHERE id=?", (action_id,))


# --- settings (negotiator kill switch, etc.) --------------------------

def get_setting(key, default=None):
    with get_conn() as conn:
        row = conn.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    return row["value"] if row else default


def set_setting(key, value):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, value),
        )


# --- stats ---------------------------------------------------------------

def get_stats(client_id=None):
    with get_conn() as conn:
        client_clause = " WHERE client_id=?" if client_id else ""
        params = (client_id,) if client_id else ()

        total_clients = conn.scalar("SELECT COUNT(*) FROM clients")
        total_creators = conn.scalar(f"SELECT COUNT(*) FROM creators{client_clause}", params)
        whatsapp_clause = client_clause + (" AND" if client_clause else " WHERE") + " phone IS NOT NULL AND phone != ''"
        whatsapp_ready = conn.scalar(f"SELECT COUNT(*) FROM creators{whatsapp_clause}", params)
        active_conversations = conn.scalar(
            f"SELECT COUNT(DISTINCT channel || ':' || contact_id) FROM messages{client_clause}", params
        )
        agreed_clause = client_clause + (" AND" if client_clause else " WHERE") + " event='DEAL_AGREED'"
        deals_agreed = conn.scalar(f"SELECT COUNT(*) FROM human_actions{agreed_clause}", params)
        blocked_clause = client_clause + (" AND" if client_clause else " WHERE") + " event='CEILING_BLOCKED'"
        ceiling_blocked = conn.scalar(f"SELECT COUNT(*) FROM human_actions{blocked_clause}", params)
        pending_clause = client_clause + (" AND" if client_clause else " WHERE") + " resolved=0"
        pending_human_actions = conn.scalar(f"SELECT COUNT(*) FROM human_actions{pending_clause}", params)
        # Pipeline funnel: "sent" = any status past the starting point;
        # "replied" = the creator actually responded, whatever happened after.
        sent_clause = client_clause + (" AND" if client_clause else " WHERE") + " status != 'Not Sent'"
        sent_count = conn.scalar(f"SELECT COUNT(*) FROM creators{sent_clause}", params)
        replied_clause = client_clause + (" AND" if client_clause else " WHERE") + " status IN ('Replied', 'Converted')"
        replied_count = conn.scalar(f"SELECT COUNT(*) FROM creators{replied_clause}", params)

    return {
        "total_clients": total_clients,
        "total_creators": total_creators,
        "whatsapp_ready": whatsapp_ready,
        "active_conversations": active_conversations,
        "deals_agreed": deals_agreed,
        "ceiling_blocked": ceiling_blocked,
        "pending_human_actions": pending_human_actions,
        "sent_count": sent_count,
        "replied_count": replied_count,
    }


# --- activity feed --------------------------------------------------------

def activity_feed(client_id=None, limit=30):
    """Unified feed of recent events for the live ticker: human actions,
    latest messages, and status changes. Returns a list of dicts sorted
    newest-first."""
    events = []
    with get_conn() as conn:
        # Human actions (deals agreed, ceiling blocked)
        q = "SELECT * FROM human_actions WHERE 1=1"
        params = []
        if client_id:
            q += " AND client_id = ?"
            params.append(client_id)
        q += " ORDER BY id DESC LIMIT ?"
        params.append(limit)
        for r in conn.execute(q, params).fetchall():
            events.append({
                "type": "action",
                "event": r["event"],
                "contact_id": r["contact_id"] or "",
                "channel": r["channel"] or "",
                "detail": r["detail"] or "",
                "resolved": bool(r["resolved"]),
                "created_at": r["created_at"] or "",
            })

        # Latest messages (last N distinct conversations' most recent msg)
        mq = """
            SELECT m.client_id, m.channel, m.contact_id, m.role, m.content, m.created_at
            FROM messages m
            INNER JOIN (
                SELECT client_id, channel, contact_id, MAX(id) as max_id
                FROM messages
                WHERE 1=1
        """
        mp = []
        if client_id:
            mq += " AND client_id = ?"
            mp.append(client_id)
        mq += " GROUP BY client_id, channel, contact_id ORDER BY max_id DESC LIMIT ?"
        mp.append(limit)
        mq += ") latest ON m.id = latest.max_id ORDER BY m.id DESC"
        for r in conn.execute(mq, mp).fetchall():
            events.append({
                "type": "message",
                "event": f"{'Creator' if r['role'] == 'user' else 'AI'} message",
                "contact_id": r["contact_id"] or "",
                "channel": r["channel"] or "",
                "detail": (r["content"] or "")[:100],
                "resolved": False,
                "created_at": r["created_at"] or "",
            })

    # Sort by created_at descending
    events.sort(key=lambda e: e.get("created_at", ""), reverse=True)
    return events[:limit]


def pipeline_stages(client_id=None):
    """Count creators at each status stage, for the Kanban pipeline view."""
    q = "SELECT status, COUNT(*) as count FROM creators WHERE 1=1"
    params = []
    if client_id:
        q += " AND client_id = ?"
        params.append(client_id)
    q += " GROUP BY status ORDER BY count DESC"
    with get_conn() as conn:
        rows = conn.execute(q, params).fetchall()
    return [dict(r) for r in rows]

# --- dealers (V2 PIN-code lookup) -----------------------------------------
#
# Scaffold for routing a converted creator to their nearest dealer/stockist
# for product pickup or verification. Awaiting the client's real dealer list;
# once uploaded via /api/dealers/upload, lookups work immediately -- no code
# change needed. Matching is by exact pincode first, falling back to state,
# since we don't have a geocoding API for real distance lookups.

def insert_dealers(client_id, records):
    """records: list of dicts with dealer_name/pincode/city/state/phone/address.
    Upserts on (client_id, dealer_name, pincode) so re-uploading an updated
    dealer list doesn't create duplicates."""
    if not records:
        return
    cols = list(records[0].keys())
    placeholders = ", ".join(["?"] * len(cols))
    update_clause = ", ".join(f"{c}=excluded.{c}" for c in cols if c not in ("dealer_name", "pincode"))
    with get_conn() as conn:
        for r in records:
            conn.execute(
                f"INSERT INTO dealers (client_id, {', '.join(cols)}) VALUES (?, {placeholders}) "
                f"ON CONFLICT(client_id, dealer_name, pincode) DO UPDATE SET {update_clause}",
                [client_id] + [r[c] for c in cols],
            )


def list_dealers(client_id=None):
    q = "SELECT * FROM dealers WHERE 1=1"
    params = []
    if client_id:
        q += " AND client_id = ?"
        params.append(client_id)
    q += " ORDER BY id"
    with get_conn() as conn:
        rows = conn.execute(q, params).fetchall()
    return [dict(r) for r in rows]


def find_nearest_dealer(client_id, pincode=None, state=None):
    """Exact pincode match first, falling back to same-state. Returns None if
    no dealer list has been uploaded for this client yet, or nothing matches."""
    with get_conn() as conn:
        if pincode:
            row = conn.execute(
                "SELECT * FROM dealers WHERE client_id = ? AND pincode = ? LIMIT 1",
                (client_id, pincode),
            ).fetchone()
            if row:
                return dict(row)
        if state:
            row = conn.execute(
                "SELECT * FROM dealers WHERE client_id = ? AND state = ? LIMIT 1",
                (client_id, state),
            ).fetchone()
            if row:
                return dict(row)
    return None


# --- profile analyzer -----------------------------------------------------

def get_profile_analysis(username, client_id=None):
    """Retrieve a cached profile analysis."""
    q = "SELECT * FROM profile_analyses WHERE username = ?"
    params = [username]
    if client_id:
        q += " AND client_id = ?"
        params.append(client_id)
    q += " ORDER BY id DESC LIMIT 1"
    with get_conn() as conn:
        row = conn.execute(q, params).fetchone()
        return dict(row) if row else None

def save_profile_analysis(username, profile_data, analysis_data, client_id=None):
    """Save a profile analysis report."""
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO profile_analyses (client_id, username, profile_data, analysis_data)
            VALUES (?, ?, ?, ?)
            """,
            (client_id, username, profile_data, analysis_data)
        )
        conn.commit()


# --- creator reputation (roadmap point 50) --------------------------------
#
# A running track record per creator (username), independent of client, so a
# creator who scammed one brand or ghosted after taking product is flagged for
# everyone. creator_verification.merge_reputation() reads list_reputation() and
# lets a bad history override an otherwise-clean fraud score.

REPUTATION_EVENTS = ("good", "late", "ghosted", "fake_content", "scam", "note")


def add_reputation(username, event, detail="", client_id=None):
    """Record one reputation event for a creator. `event` must be one of
    REPUTATION_EVENTS; anything else is stored as a plain 'note' so a typo can't
    silently drop the record."""
    username = (username or "").strip().lstrip("@").lower()
    if not username:
        raise ValueError("username is required")
    if event not in REPUTATION_EVENTS:
        detail = f"[{event}] {detail}".strip()
        event = "note"
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO creator_reputation (username, client_id, event, detail) VALUES (?, ?, ?, ?)",
            (username, client_id, event, detail),
        )


def list_reputation(username):
    """Every recorded reputation event for a creator, newest first."""
    username = (username or "").strip().lstrip("@").lower()
    if not username:
        return []
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT event, detail, client_id, created_at FROM creator_reputation "
            "WHERE username = ? ORDER BY id DESC",
            (username,),
        ).fetchall()
    return [dict(r) for r in rows]


# --- shop verification (human-assisted dialer) ----------------------------

SHOP_STATUSES = ("pending", "has_product", "no_product", "no_answer", "callback", "sent")


def insert_shops(client_id, creator_contact, area, records):
    """records: list of {shop_name, phone}. Skips rows with no phone. Returns
    the number of rows inserted."""
    inserted = 0
    with get_conn() as conn:
        for r in records:
            phone = (r.get("phone") or "").strip()
            if not phone:
                continue
            conn.execute(
                "INSERT INTO shop_verifications (client_id, creator_contact, area, shop_name, phone) "
                "VALUES (?, ?, ?, ?, ?)",
                (client_id, creator_contact, area, (r.get("shop_name") or "").strip() or None, phone),
            )
            inserted += 1
    return inserted


def list_shops(client_id=None, status=None):
    q = "SELECT * FROM shop_verifications WHERE 1=1"
    params = []
    if client_id:
        q += " AND client_id = ?"
        params.append(client_id)
    if status:
        q += " AND status = ?"
        params.append(status)
    # Pending first (work queue), then most recently touched.
    q += " ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, updated_at DESC, id DESC"
    with get_conn() as conn:
        rows = conn.execute(q, params).fetchall()
    return [dict(r) for r in rows]


def get_shop(shop_id):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM shop_verifications WHERE id = ?", (shop_id,)).fetchone()
    return dict(row) if row else None


def update_shop(shop_id, status=None, notes=None):
    """Update a shop's status and/or notes. Returns rows updated (0 = no such row)."""
    sets, params = [], []
    if status is not None:
        sets.append("status = ?")
        params.append(status)
    if notes is not None:
        sets.append("notes = ?")
        params.append(notes)
    if not sets:
        return 0
    sets.append("updated_at = to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD HH24:MI:SS')")
    params.append(shop_id)
    with get_conn() as conn:
        cur = conn.execute(
            f"UPDATE shop_verifications SET {', '.join(sets)} WHERE id = ?", params
        )
        return cur.rowcount
