"""
Instagram Messaging webhook. Handles ONLY inbound messages from creators
who already replied to your manual first DM -- never initiates contact.

Runs the same Claude-powered negotiator used by the WhatsApp bot
(lib/llm_negotiator.py): per-creator conversation history persisted to the
shared local database (lib/local_db.py, via lib/session_store.py),
brand/deal terms from the client config JSON, and a code-enforced
compensation ceiling (see enforce_ceiling in the negotiator) that blocks
any reply offering more than the client's configured max, regardless of
what the model is talked into.

Anything needing a human (a deal agreed, or a creator pushed past budget)
is logged to the local DB + needs_human_action.csv by lib/human_handoff.py
-- visible live in the dashboard (backend/app.py).

Everything this webhook writes shows up in the monitoring dashboard --
run `python backend/app.py` separately and open http://localhost:8000.

Emergency stop: pause from the dashboard, or set NEGOTIATOR_PAUSED=true
(see lib/llm_negotiator.py) to take the AI out of every channel
immediately without touching credentials.

Requires env vars:
  IG_ACCESS_TOKEN     (page access token with instagram_manage_messages)
  IG_VERIFY_TOKEN     (any string you choose, used in Meta webhook setup)
  IG_APP_SECRET       (Meta App > Settings > Basic > App Secret; used to
                       verify inbound webhook signatures. Optional for local
                       testing, strongly recommended in production.)
  ANTHROPIC_API_KEY   (for the negotiator)
  CLIENT_CONFIG       (optional; path to the client config JSON, default
                       config/myk_laticrete.json)

Run:
  pip install -r requirements.txt
  python instagram_webhook.py
Then expose it publicly (ngrok for testing, real hosting for production)
and register that public URL + IG_VERIFY_TOKEN in Meta's App Dashboard
under Webhooks > Instagram.
"""
import os
import sys
import hmac
import hashlib
import requests
from flask import Flask, request, jsonify

from dotenv import load_dotenv
load_dotenv()

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from llm_negotiator import generate_reply, load_config, resolve_config_path, client_key_from_path
from session_store import SessionStore
import local_db

app = Flask(__name__)

ACCESS_TOKEN = os.environ["IG_ACCESS_TOKEN"]
VERIFY_TOKEN = os.environ["IG_VERIFY_TOKEN"]
APP_SECRET = os.environ.get("IG_APP_SECRET", "")
SEND_URL = "https://graph.facebook.com/v20.0/me/messages"

CONFIG_PATH = resolve_config_path()
CONFIG = load_config(CONFIG_PATH)
CLIENT_ID = local_db.upsert_client_from_config(CONFIG, client_key_from_path(CONFIG_PATH))

sessions = SessionStore(CLIENT_ID, "instagram")


# --- Security ------------------------------------------------------------

def verify_signature(raw_body):
    """Validate Meta's X-Hub-Signature-256 against the app secret. If no
    secret is configured, allow (local testing); if set, enforce."""
    if not APP_SECRET:
        return True
    header = request.headers.get("X-Hub-Signature-256", "")
    if not header.startswith("sha256="):
        return False
    expected = "sha256=" + hmac.new(
        APP_SECRET.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, header)


# --- Instagram send --------------------------------------------------------

def send_reply(recipient_id, text):
    payload = {"recipient": {"id": recipient_id}, "message": {"text": text}}
    headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}
    try:
        resp = requests.post(SEND_URL, json=payload, headers=headers, timeout=10)
        if resp.status_code != 200:
            print(f"IG send failed ({resp.status_code}): {resp.text[:200]}")
    except Exception as e:
        print(f"Failed to send Instagram message: {e}")


# --- Webhook ---------------------------------------------------------------

@app.route("/webhook", methods=["GET"])
def verify():
    if request.args.get("hub.verify_token") == VERIFY_TOKEN:
        return request.args.get("hub.challenge"), 200
    return "Verification failed", 403


@app.route("/webhook", methods=["POST"])
def receive():
    if not verify_signature(request.get_data()):
        print("Rejected webhook POST: bad or missing X-Hub-Signature-256")
        return "Invalid signature", 403

    data = request.get_json(silent=True) or {}
    for entry in data.get("entry", []):
        for messaging_event in entry.get("messaging", []):
            sender_id = messaging_event.get("sender", {}).get("id")
            message = messaging_event.get("message", {})
            text = message.get("text")
            if not sender_id or not text or message.get("is_echo"):
                continue

            print(f"Received from {sender_id}: {text}")

            history = sessions.load(sender_id)
            history.append({"role": "user", "content": text})

            reply = generate_reply(
                history, config=CONFIG, config_path=CONFIG_PATH,
                contact_id=sender_id, channel="instagram",
            )

            history.append({"role": "assistant", "content": reply})
            sessions.save(sender_id, history)

            send_reply(sender_id, reply)
            print(f"Replied to {sender_id}: {reply}")

    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    print("Starting Instagram negotiator webhook...")
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("WARNING: ANTHROPIC_API_KEY is not set. The LLM will not be able to generate replies.")
    if not APP_SECRET:
        print("WARNING: IG_APP_SECRET is not set. Inbound webhook signatures will NOT be verified.")
    if os.environ.get("NEGOTIATOR_PAUSED", "").strip().lower() in ("1", "true", "yes"):
        print("NEGOTIATOR_PAUSED is set -- the AI is disabled, all replies use the fixed fallback message.")
    print(f"Client config: {CONFIG_PATH} (client_id={CLIENT_ID})")

    app.run(port=5000)
