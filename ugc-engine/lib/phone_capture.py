# -*- coding: utf-8 -*-
"""
Detect a WhatsApp number a creator types into an Instagram/Messenger chat, so
the outreach engine can auto-route them into the WhatsApp funnel -- the final
contact stage.

Deliberately conservative and India-specific: a valid Indian mobile is 10
digits starting 6-9, optionally prefixed with +91 / 91 / 0 and split by spaces,
dashes, or dots. This rule alone rejects prices, pincodes (6 digits), order ids,
and most stray numbers. Context is added on top by capture_from_history(), which
only looks at CREATOR messages (role == "user") -- the bot's own messages never
count, so a number the bot mentions can't be mistaken for the creator's.
"""
import re

# Grab any phone-looking token (leading +/digit, then 8-15 digit-or-separator
# chars, then a digit). Normalized + validated below -- this just narrows the
# search so we don't run validation over every word.
_PHONE_TOKEN = re.compile(r"(\+?\d[\d\s\-.]{8,15}\d)")


def extract_indian_mobile(text):
    """Return a normalized 10-digit Indian mobile from `text`, or None.

    Strips a +91 / 91 country code or a leading 0 trunk prefix, then requires
    exactly 10 digits with a 6-9 leading digit (the Indian mobile rule)."""
    if not text:
        return None
    for raw in _PHONE_TOKEN.findall(text):
        digits = re.sub(r"\D", "", raw)
        if len(digits) == 12 and digits.startswith("91"):
            digits = digits[2:]
        elif len(digits) == 11 and digits.startswith("0"):
            digits = digits[1:]
        if len(digits) == 10 and digits[0] in "6789":
            return digits
    return None


def capture_from_history(history):
    """Scan a transcript newest-first and return the most recent valid Indian
    mobile a CREATOR shared, or None.

    history: [{"role": "user"|"assistant", "content": str}], any order that
    get_history/get_instagram_history returns (oldest-first) -- we reverse it so
    the latest number the creator sent wins if they corrected a typo.
    """
    for msg in reversed(history or []):
        if msg.get("role") == "user":
            num = extract_indian_mobile(str(msg.get("content") or ""))
            if num:
                return num
    return None
