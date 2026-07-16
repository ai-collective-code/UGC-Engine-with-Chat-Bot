"""
WhatsApp AI negotiator webhook.

Receives inbound WhatsApp messages, keeps per-creator conversation history,
and replies using the Claude-powered negotiator in lib/llm_negotiator.py.

Three things this version does that a toy demo shouldn't skip:
  1. Conversation state is persisted to the shared local database
     (lib/local_db.py, via lib/session_store.py), so a restart
     mid-negotiation doesn't wipe the deal. In-memory dicts lose everything.
  2. Inbound POSTs are verified against Meta's X-Hub-Signature-256 header
     using your app secret, so a random caller who finds the public URL
     can't inject fake "creator" messages into a live negotiation.
  3. Anything needing a human (a deal agreed, or a creator pushed past
     budget) is logged to the local DB + needs_human_action.csv by
     lib/human_handoff.py -- visible live in the dashboard (backend/app.py).

Everything this webhook writes shows up in the monitoring dashboard --
run `python backend/app.py` separately and open http://localhost:8000.

Emergency stop: pause from the dashboard, or set NEGOTIATOR_PAUSED=true
(see lib/llm_negotiator.py) to take the AI out of every channel
immediately without touching credentials.

Requires env vars (put in .env, never commit):
  ANTHROPIC_API_KEY
  WHATSAPP_ACCESS_TOKEN
  WHATSAPP_PHONE_NUMBER_ID
  WHATSAPP_VERIFY_TOKEN        (any string you choose; used in Meta setup)
  WHATSAPP_APP_SECRET          (Meta App > Settings > Basic > App Secret)
  CLIENT_CONFIG                (optional; path to the client config JSON)

Run:
  pip install -r requirements.txt
  python whatsapp_ai_agent.py
"""
import os
import sys
import hmac
import hashlib

from dotenv import load_dotenv
load_dotenv()

import requests
from flask import Flask, request, jsonify

# Add lib to path so we can import the negotiator + shared session store
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from llm_negotiator import generate_reply, load_config, resolve_config_path, client_key_from_path
from session_store import SessionStore
import local_db

app = Flask(__name__)

ACCESS_TOKEN = os.environ.get("WHATSAPP_ACCESS_TOKEN", "")
VERIFY_TOKEN = os.environ.get("WHATSAPP_VERIFY_TOKEN", "")
APP_SECRET = os.environ.get("WHATSAPP_APP_SECRET", "")
PHONE_NUMBER_ID = os.environ.get("WHATSAPP_PHONE_NUMBER_ID", "")
SEND_URL = f"https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages" if PHONE_NUMBER_ID else ""

CONFIG_PATH = resolve_config_path()
CONFIG = load_config(CONFIG_PATH)
CLIENT_ID = local_db.upsert_client_from_config(CONFIG, client_key_from_path(CONFIG_PATH))

sessions = SessionStore(CLIENT_ID, "whatsapp")


# --- Security ------------------------------------------------------------

def verify_signature(raw_body):
    """Validate Meta's X-Hub-Signature-256 against the app secret.
    If no app secret is configured we allow the request but warn -- so local
    testing still works, while production (secret set) is protected."""
    if not APP_SECRET:
        return True
    header = request.headers.get("X-Hub-Signature-256", "")
    if not header.startswith("sha256="):
        return False
    expected = "sha256=" + hmac.new(
        APP_SECRET.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, header)


# --- WhatsApp send -------------------------------------------------------

def send_whatsapp_message(to_phone, text):
    if not ACCESS_TOKEN or not SEND_URL:
        print("Missing WhatsApp credentials. Cannot send message.")
        return
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "text",
        "text": {"body": text},
    }
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    try:
        requests.post(SEND_URL, json=payload, headers=headers, timeout=10)
    except Exception as e:
        print(f"Failed to send WhatsApp message: {e}")


# --- Webhook -------------------------------------------------------------

@app.route("/webhook", methods=["GET"])
def verify():
    """Webhook verification for Meta App Dashboard"""
    if request.args.get("hub.verify_token") == VERIFY_TOKEN:
        return request.args.get("hub.challenge"), 200
    return "Verification failed", 403


@app.route("/webhook", methods=["POST"])
def receive():
    """Receive incoming WhatsApp messages"""
    if not verify_signature(request.get_data()):
        print("Rejected webhook POST: bad or missing X-Hub-Signature-256")
        return "Invalid signature", 403

    data = request.get_json(silent=True) or {}

    # Meta's webhook payload is deeply nested
    for entry in data.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            for message in value.get("messages", []):
                sender = message.get("from")
                text = message.get("text", {}).get("body")
                if not sender or not text:
                    continue

                print(f"Received from {sender}: {text}")

                history = sessions.load(sender)
                history.append({"role": "user", "content": text})

                reply = generate_reply(
                    history, config=CONFIG, config_path=CONFIG_PATH,
                    contact_id=sender, channel="whatsapp",
                )

                history.append({"role": "assistant", "content": reply})
                sessions.save(sender, history)

                send_whatsapp_message(sender, reply)
                print(f"Sent to {sender}: {reply}")

    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    print("Starting WhatsApp AI Agent...")
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("WARNING: ANTHROPIC_API_KEY is not set. The LLM will not be able to generate replies.")
    if not VERIFY_TOKEN:
        print("WARNING: WHATSAPP_VERIFY_TOKEN is not set. You won't be able to register the webhook with Meta.")
    if not APP_SECRET:
        print("WARNING: WHATSAPP_APP_SECRET is not set. Inbound webhook signatures will NOT be verified.")
    if os.environ.get("NEGOTIATOR_PAUSED", "").strip().lower() in ("1", "true", "yes"):
        print("NEGOTIATOR_PAUSED is set -- the AI is disabled, all replies use the fixed fallback message.")
    print(f"Client config: {CONFIG_PATH} (client_id={CLIENT_ID})")

    app.run(port=5000)
