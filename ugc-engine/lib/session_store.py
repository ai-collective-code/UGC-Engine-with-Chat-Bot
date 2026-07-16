# -*- coding: utf-8 -*-
"""
Per-contact conversation persistence, backed by the shared local database
(lib/local_db.py) instead of a private SQLite file per channel. This is
what lets the dashboard show every conversation, across every channel and
client, in one place.
"""
import local_db


class SessionStore:
    def __init__(self, client_id, channel):
        self.client_id = client_id
        self.channel = channel

    def load(self, contact_id):
        return local_db.get_history(self.client_id, self.channel, contact_id)

    def save(self, contact_id, history):
        local_db.replace_history(self.client_id, self.channel, contact_id, history)
