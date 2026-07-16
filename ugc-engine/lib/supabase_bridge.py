# -*- coding: utf-8 -*-
"""
Read-only bridge to the Instagram AI Agent's Supabase project.

The Next.js chatbot (separate app) stores Instagram DMs in Supabase tables
`instagram_conversations` and `instagram_messages`. This module lets the UGC
dashboard's Conversations tab surface those DMs alongside its own WhatsApp /
local conversations -- a unified inbox -- WITHOUT sharing a database or writing
anything back.

Safety:
  * Uses the Supabase ANON key (never the service-role key). The tables' RLS
    grants only SELECT to anon, so this bridge is structurally read-only.
  * If SUPABASE_URL / SUPABASE_ANON_KEY are unset, or Supabase is unreachable,
    every function degrades to an empty result and logs a warning. The UGC
    dashboard keeps working with just its local data.

Shape contract (matches lib/local_db.py so the frontend needs no changes):
  list_instagram_conversations() -> [{client_id, channel, contact_id,
                                       last_message, message_count,
                                       last_message_at}]
  get_instagram_history(contact_id) -> [{role, content}]

`contact_id` is the Instagram username (unique, human-readable). It falls back
to the numeric igsid only when a username is missing.
"""
import os
import sys

import requests

from phone_capture import extract_indian_mobile

CHANNEL = "instagram"
# Sentinel client_id for Instagram DMs, which don't belong to a UGC client.
# The frontend passes this back verbatim when opening a thread; the messages
# endpoint branches on channel == "instagram" before using client_id, so the
# value only needs to round-trip, not resolve to a real client.
INSTAGRAM_CLIENT_ID = 0

_TIMEOUT = 8  # seconds; keep the dashboard snappy even if Supabase is slow


def _config():
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_ANON_KEY", "")
    if not url or not key:
        return None
    return url, key


def _headers(key):
    return {"apikey": key, "Authorization": f"Bearer {key}"}


def _warn(msg):
    print(f"[supabase_bridge] {msg}", file=sys.stderr)


def is_configured():
    return _config() is not None


# How many recent messages to pull in the single preview query. Comfortably
# covers the last message of every active conversation without an N+1 fan-out.
_PREVIEW_MESSAGE_SCAN = 500


def list_instagram_conversations():
    """One row per Instagram conversation, newest activity first.

    Two HTTP calls total regardless of conversation count: one for the
    conversation rows, one for a batch of recent messages we fold into
    per-conversation previews. (No N+1 fan-out.) The frontend displays only
    the preview text and sorts by last_message_at, so an exact per-thread
    message count isn't needed here.
    """
    cfg = _config()
    if not cfg:
        return []
    url, key = cfg

    try:
        resp = requests.get(
            f"{url}/rest/v1/instagram_conversations",
            headers=_headers(key),
            params={
                "select": "id,igsid,name,username,updated_at",
                "order": "updated_at.desc",
            },
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        convos = resp.json()
    except (requests.RequestException, ValueError) as e:
        _warn(f"list conversations failed: {e}")
        return []

    previews, numbers = _recent_previews(url, key)

    out = []
    for c in convos:
        contact_id = c.get("username") or c.get("igsid")
        if not contact_id:
            continue
        out.append({
            "client_id": INSTAGRAM_CLIENT_ID,
            "channel": CHANNEL,
            "contact_id": contact_id,
            "last_message": previews.get(c["id"]),
            "last_message_at": c.get("updated_at"),
            # WhatsApp number the creator shared in this thread, if any (from
            # the same batch scan below -- no extra query). The dashboard uses
            # it to auto-route the creator into the WhatsApp funnel.
            "detected_whatsapp": numbers.get(c["id"]),
        })
    return out


def _recent_previews(url, key):
    """From one batched query, return (previews, numbers):
      previews: {conversation_id: latest_message_text}
      numbers:  {conversation_id: latest WhatsApp number a CREATOR shared}

    Best-effort: any conversation not represented in the recent-message scan
    simply gets no preview (shown as "No messages yet") and no detected number;
    it still lists and opens normally. `role` is selected so a number the bot
    mentioned (role != "user") is never mistaken for the creator's own.
    """
    try:
        r = requests.get(
            f"{url}/rest/v1/instagram_messages",
            headers=_headers(key),
            params={
                "select": "conversation_id,role,content,created_at",
                "order": "created_at.desc",
                "limit": str(_PREVIEW_MESSAGE_SCAN),
            },
            timeout=_TIMEOUT,
        )
        r.raise_for_status()
        rows = r.json()
    except (requests.RequestException, ValueError) as e:
        _warn(f"preview scan failed: {e}")
        return {}, {}

    previews = {}
    numbers = {}
    # Rows are newest-first, so the first one seen per conversation is latest.
    for row in rows:
        cid = row.get("conversation_id")
        if not cid:
            continue
        if cid not in previews:
            previews[cid] = row.get("content")
        if cid not in numbers and row.get("role") == "user":
            num = extract_indian_mobile(str(row.get("content") or ""))
            if num:
                numbers[cid] = num
    return previews, numbers


def get_instagram_history(contact_id):
    """Full transcript for one Instagram conversation, oldest first.

    `contact_id` is a username (preferred) or igsid; we resolve it to the
    conversation row, then pull its messages.
    """
    cfg = _config()
    if not cfg:
        return []
    url, key = cfg

    # Resolve contact_id -> conversation id. Try username first, then igsid.
    conversation_id = _resolve_conversation_id(url, key, contact_id)
    if not conversation_id:
        return []

    try:
        r = requests.get(
            f"{url}/rest/v1/instagram_messages",
            headers=_headers(key),
            params={
                "select": "role,content,created_at",
                "conversation_id": f"eq.{conversation_id}",
                "order": "created_at.asc",
            },
            timeout=_TIMEOUT,
        )
        r.raise_for_status()
        rows = r.json()
    except (requests.RequestException, ValueError) as e:
        _warn(f"history fetch failed for {contact_id}: {e}")
        return []

    # UGC frontend renders role=="user" as "Creator" and everything else as
    # "AI Agent" -- the chatbot uses the same user/assistant convention.
    return [{"role": row.get("role"), "content": row.get("content")} for row in rows]


def _resolve_conversation_id(url, key, contact_id):
    for column in ("username", "igsid"):
        try:
            r = requests.get(
                f"{url}/rest/v1/instagram_conversations",
                headers=_headers(key),
                params={"select": "id", column: f"eq.{contact_id}", "limit": "1"},
                timeout=_TIMEOUT,
            )
            r.raise_for_status()
            rows = r.json()
            if rows:
                return rows[0]["id"]
        except (requests.RequestException, ValueError, KeyError) as e:
            _warn(f"resolve by {column} failed for {contact_id}: {e}")
    return None


def send_instagram_reply(contact_id, message):
    """Send a human reply to an Instagram thread from the UGC dashboard.

    We don't re-implement Instagram sending or Supabase writes here. Instead we
    resolve the conversation, then proxy to the chatbot's existing, proven send
    endpoint (POST /api/conversations/<id>/send) -- it already talks to the
    Instagram Graph API and writes the message back to Supabase with the right
    server-side credentials. This keeps the bridge read-only toward Supabase and
    avoids duplicating the send/write logic.

    Requires the Next.js chatbot to be running (it's the webhook worker anyway).
    Returns (ok: bool, error: str | None).
    """
    cfg = _config()
    if not cfg:
        return False, "Supabase is not configured for the bridge."
    url, key = cfg

    conversation_id = _resolve_conversation_id(url, key, contact_id)
    if not conversation_id:
        return False, f"No Instagram conversation found for '{contact_id}'."

    chatbot = os.environ.get("INSTAGRAM_CHATBOT_URL", "http://localhost:3000").rstrip("/")
    try:
        r = requests.post(
            f"{chatbot}/api/conversations/{conversation_id}/send",
            json={"message": message},
            timeout=_TIMEOUT,
        )
    except requests.RequestException as e:
        return False, (
            f"Couldn't reach the chatbot at {chatbot} (is it running?). {e}"
        )

    if r.status_code >= 400:
        try:
            detail = r.json().get("error")
        except ValueError:
            detail = None
        return False, detail or f"Send failed (HTTP {r.status_code})."
    return True, None
