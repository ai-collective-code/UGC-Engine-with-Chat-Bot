# -*- coding: utf-8 -*-
"""
Bridge to the Instagram AI Agent (Next.js chatbot) over its HTTP API.

The chatbot (separate app, deployed on Vercel) owns the Instagram DM data in its
own Render PostgreSQL database and exposes it via REST endpoints. This module
lets the UGC dashboard's Conversations tab surface those DMs alongside its own
WhatsApp / local conversations -- a unified inbox -- by calling the chatbot's
API. The UGC engine holds NO database credentials for the chatbot; it only
talks HTTP.

(Historical note: this used to read the chatbot's Supabase project directly with
the anon key. After the chatbot migrated to Render PostgreSQL, both reads and
sends go through the chatbot's own API, keyed off INSTAGRAM_CHATBOT_URL. The
module name is kept for import compatibility.)

Config:
  INSTAGRAM_CHATBOT_URL -- base URL of the live chatbot, e.g.
                           https://insta-agent-fawn.vercel.app
                           Defaults to http://localhost:3000 for local dev.

Safety / degradation:
  If the chatbot is unreachable or errors, reads degrade to an empty result and
  sends return (False, error), each logging a warning. The UGC dashboard keeps
  working with just its local data.

Shape contract (matches lib/local_db.py so the frontend needs no changes):
  list_instagram_conversations() -> [{client_id, channel, contact_id,
                                       last_message, last_message_at,
                                       detected_whatsapp}]
  get_instagram_history(contact_id) -> [{role, content}]
  send_instagram_reply(contact_id, message) -> (ok: bool, error: str | None)

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

_TIMEOUT = 10  # seconds; the chatbot is remote (Vercel), keep some headroom


def _base():
    return os.environ.get("INSTAGRAM_CHATBOT_URL", "http://localhost:3000").rstrip("/")


def _warn(msg):
    print(f"[instagram_bridge] {msg}", file=sys.stderr)


def is_configured():
    # There is always a target (localhost default), so the bridge is always
    # "configured"; per-call error handling degrades gracefully if it's down.
    return True


def _fetch_conversations():
    """Raw list of the chatbot's conversation rows, or [] on any failure.

    The chatbot's GET /api/conversations already folds each thread's latest
    message into `last_message`, so listing is a single HTTP call (no N+1).
    """
    try:
        resp = requests.get(f"{_base()}/api/conversations", timeout=_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
    except (requests.RequestException, ValueError) as e:
        _warn(f"list conversations failed: {e}")
        return []
    return data if isinstance(data, list) else []


def list_instagram_conversations():
    """One row per Instagram conversation, newest activity first."""
    out = []
    for c in _fetch_conversations():
        contact_id = c.get("username") or c.get("igsid")
        if not contact_id:
            continue
        last_message = c.get("last_message")
        # Best-effort number detection from the latest message so a creator who
        # just dropped a WhatsApp number gets auto-routed into the WhatsApp
        # funnel. The authoritative capture is the full-history scan run when a
        # human opens the thread (see get_instagram_history's caller).
        num = extract_indian_mobile(str(last_message or ""))
        out.append({
            "client_id": INSTAGRAM_CLIENT_ID,
            "channel": CHANNEL,
            "contact_id": contact_id,
            "last_message": last_message,
            "last_message_at": c.get("updated_at"),
            "detected_whatsapp": num,
        })
    return out


def _resolve_conversation_id(contact_id):
    """Map a username/igsid to the chatbot's conversation id, or None."""
    for c in _fetch_conversations():
        if c.get("username") == contact_id or c.get("igsid") == contact_id:
            return c.get("id")
    return None


def get_instagram_history(contact_id):
    """Full transcript for one Instagram conversation, oldest first.

    `contact_id` is a username (preferred) or igsid; we resolve it to the
    conversation id, then pull its messages from the chatbot.
    """
    conversation_id = _resolve_conversation_id(contact_id)
    if not conversation_id:
        return []

    try:
        r = requests.get(
            f"{_base()}/api/conversations/{conversation_id}/messages",
            timeout=_TIMEOUT,
        )
        r.raise_for_status()
        rows = r.json()
    except (requests.RequestException, ValueError) as e:
        _warn(f"history fetch failed for {contact_id}: {e}")
        return []
    if not isinstance(rows, list):
        return []

    # UGC frontend renders role=="user" as "Creator" and everything else as
    # "AI Agent" -- the chatbot uses the same user/assistant convention.
    return [{"role": row.get("role"), "content": row.get("content")} for row in rows]


def send_instagram_reply(contact_id, message):
    """Send a human reply to an Instagram thread from the UGC dashboard.

    Resolves the conversation, then proxies to the chatbot's send endpoint
    (POST /api/conversations/<id>/send) -- it talks to the Instagram Graph API
    and writes the message to its own database with the right server-side
    credentials, so no send/write logic is duplicated here.

    Returns (ok: bool, error: str | None).
    """
    conversation_id = _resolve_conversation_id(contact_id)
    if not conversation_id:
        return False, f"No Instagram conversation found for '{contact_id}'."

    base = _base()
    try:
        r = requests.post(
            f"{base}/api/conversations/{conversation_id}/send",
            json={"message": message},
            timeout=_TIMEOUT,
        )
    except requests.RequestException as e:
        return False, (
            f"Couldn't reach the chatbot at {base} (is it running?). {e}"
        )

    if r.status_code >= 400:
        try:
            detail = r.json().get("error")
        except ValueError:
            detail = None
        return False, detail or f"Send failed (HTTP {r.status_code})."
    return True, None
