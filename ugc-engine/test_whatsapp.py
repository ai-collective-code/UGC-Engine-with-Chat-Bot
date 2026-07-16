import os
import requests
from dotenv import load_dotenv

# Load variables from .env
load_dotenv()

access_token = os.environ.get("WHATSAPP_ACCESS_TOKEN")
phone_number_id = os.environ.get("WHATSAPP_PHONE_NUMBER_ID")
template_name = os.environ.get("WHATSAPP_TEMPLATE_NAME", "hello_world")
template_lang = os.environ.get("WHATSAPP_TEMPLATE_LANG", "en_US")

print("--- WhatsApp Cloud API Test ---")
print(f"Loaded Phone Number ID: {phone_number_id}")
print(f"Loaded Template Name: {template_name}")
print(f"Loaded Template Lang: {template_lang}")
print("---------------------------------")

if not access_token or not phone_number_id:
    print("ERROR: WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is missing from your .env file.")
    exit(1)

# Ask for the verified recipient number
recipient = input("Enter your verified test phone number (with country code, e.g., 919876543210): ").strip()

if not recipient:
    print("ERROR: Phone number cannot be empty.")
    exit(1)

url = f"https://graph.facebook.com/v20.0/{phone_number_id}/messages"
headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

payload = {
    "messaging_product": "whatsapp",
    "to": recipient,
    "type": "template",
    "template": {
        "name": template_name,
        "language": {
            "code": template_lang
        }
    }
}

print(f"\nSending '{template_name}' template message to {recipient}...")
try:
    response = requests.post(url, json=payload, headers=headers)
    print("\n--- API Response ---")
    print("Status Code:", response.status_code)
    if response.status_code == 200:
        print("Success! Check your WhatsApp.")
    else:
        print("Failed to send message.")
        print("Error Details:", response.text)
        print("\nNote: Make sure this recipient phone number has been verified/whitelisted in your Meta Developer portal!")
except Exception as e:
    print("An error occurred while making the request:", e)
