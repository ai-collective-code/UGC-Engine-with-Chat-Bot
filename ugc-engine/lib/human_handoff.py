# -*- coding: utf-8 -*-
"""
Log of negotiation events that need a human to act on. Written to both:
  - the local database (lib/local_db.py) -- what the monitoring dashboard
    reads, with a resolve/dismiss workflow.
  - a plain CSV (needs_human_action.csv, repo root) -- so the team can
    still open it directly in Excel/Sheets without the dashboard running.

Two events get logged:
  DEAL_AGREED     -- creator accepted terms; a human must actually release
                     the voucher/compensation (the AI never sends money).
  CEILING_BLOCKED -- creator pushed for more than the client's configured
                     max_voucher_inr; the AI held the line and deferred,
                     but a human should decide whether to approve an
                     exception or let it stand.
"""
import os
import csv
from datetime import datetime, timezone

import local_db

_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG_PATH = os.path.join(_REPO_ROOT, "needs_human_action.csv")

FIELDNAMES = ["timestamp_utc", "channel", "contact_id", "event", "detail"]


def log_event(channel, contact_id, event, detail, client_id=None):
    clean_detail = (detail or "").replace("\n", " ").strip()[:500]

    is_new = not os.path.exists(LOG_PATH)
    with open(LOG_PATH, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        if is_new:
            writer.writeheader()
        writer.writerow({
            "timestamp_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "channel": channel or "unknown",
            "contact_id": contact_id or "unknown",
            "event": event,
            "detail": clean_detail,
        })

    try:
        local_db.log_human_action(client_id, channel, contact_id, event, clean_detail)
    except Exception as e:
        print(f"[human_handoff] warning: could not write to local DB: {e}")
