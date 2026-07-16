# -*- coding: utf-8 -*-
"""
Thin wrapper over the Apify REST API so the dashboard can trigger scrapes
itself instead of the manual run-on-apify.com -> download -> upload loop.

Auth: reads APIFY_TOKEN from the environment (put it in .env, never commit).
Nothing here is Instagram-specific -- the actor id and input are passed in,
so the same client works for any Apify actor.

Docs: https://docs.apify.com/api/v2
"""
import os

import requests

APIFY_BASE = "https://api.apify.com/v2"
# Terminal statuses an actor run can end in. TIMING-OUT is transitional
# (the run finishes as TIMED-OUT), so it's not listed here.
TERMINAL_OK = {"SUCCEEDED"}
TERMINAL_BAD = {"FAILED", "ABORTED", "TIMED-OUT"}


def token():
    return os.environ.get("APIFY_TOKEN", "").strip()


def is_configured():
    return bool(token())


def _request(method, url, timeout, **kwargs):
    """All Apify HTTP goes through here. Auth is sent as a Bearer header (never
    a URL param, so the token can't leak into exception messages/logs), and
    network-level failures re-raise without the URL for the same reason."""
    try:
        return requests.request(
            method, url,
            headers={"Authorization": f"Bearer {token()}"},
            timeout=timeout,
            **kwargs,
        )
    except requests.RequestException:
        raise RuntimeError("Apify API unreachable — check network/APIFY_TOKEN")


def start_run(actor_id, run_input, timeout=30):
    """Kick off an actor run (async). Returns {run_id, dataset_id, status}.
    The run keeps going on Apify's side; poll get_run() for completion."""
    if not token():
        raise RuntimeError("APIFY_TOKEN is not set (add it to .env)")
    resp = _request("post", f"{APIFY_BASE}/acts/{actor_id}/runs", timeout, json=run_input)
    if resp.status_code >= 400:
        raise RuntimeError(f"Apify start failed ({resp.status_code}): {resp.text[:300]}")
    data = resp.json()["data"]
    return {
        "run_id": data["id"],
        "dataset_id": data.get("defaultDatasetId"),
        "status": data["status"],
    }


def get_run(run_id, timeout=30):
    """Poll a run's status. Returns {status, dataset_id}."""
    if not token():
        raise RuntimeError("APIFY_TOKEN is not set (add it to .env)")
    resp = _request("get", f"{APIFY_BASE}/actor-runs/{run_id}", timeout)
    if resp.status_code >= 400:
        raise RuntimeError(f"Apify status failed ({resp.status_code}): {resp.text[:300]}")
    d = resp.json()["data"]
    return {"status": d["status"], "dataset_id": d.get("defaultDatasetId")}


def fetch_items(dataset_id, limit=10000, timeout=120):
    """Fetch the run's dataset items as a list of dicts (cleaned)."""
    if not token():
        raise RuntimeError("APIFY_TOKEN is not set (add it to .env)")
    resp = _request(
        "get", f"{APIFY_BASE}/datasets/{dataset_id}/items", timeout,
        params={"clean": "true", "limit": limit},
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"Apify dataset fetch failed ({resp.status_code}): {resp.text[:300]}")
    return resp.json()
