# -*- coding: utf-8 -*-
"""
Generate many same-meaning rewrites of one outreach message.

Meta's spam systems flag accounts that send the identical text to many people.
This lets the operator write one message, get N reworded versions that all mean
the same thing, and paste a different one into each creator's DM -- keeping the
first (manual) outreach compliant. Uses the same Gemini setup as the profile
analyzer (GEMINI_API_KEY).
"""
import re

import gemini_helper

client_configured = gemini_helper.is_configured()


def generate_variations(sentence, count=15):
    """Return `count` reworded versions of `sentence`, same meaning each.

    Raises RuntimeError if Gemini isn't configured (so the API can surface a
    clear message instead of silently returning nothing). Preserves the input
    language -- including romanized regional languages -- because the operator
    messages creators in whatever language they wrote the original in.
    """
    if not client_configured:
        raise RuntimeError("Gemini API key is not configured. Add GEMINI_API_KEY to .env")

    sentence = (sentence or "").strip()
    if not sentence:
        raise ValueError("sentence is empty")

    try:
        count = int(count or 15)
    except (TypeError, ValueError):
        count = 15
    count = max(1, min(count, 30))  # keep the batch bounded

    # Line-based output, NOT JSON: the variations are free text full of commas,
    # quotes and apostrophes, which routinely break model-produced JSON. One
    # variation per line (numbered) is far more robust to parse.
    system_prompt = f"""
You rewrite a single outreach message into {count} DIFFERENT versions that all
carry the EXACT SAME meaning and intent. These are used to message many people
without sending identical text (which gets flagged as spam).

Rules:
- Keep the meaning, offer, and any facts/numbers identical in every version.
- Vary the wording, sentence structure, and phrasing naturally -- each should
  read like a real person wrote it fresh, not a template with words swapped.
- WRITE IN THE SAME LANGUAGE as the input. If the input is a romanized regional
  language (e.g. Hindi/Bengali/Tamil typed in English letters), keep every
  version in that same romanized form -- plain ASCII, no native script, no
  accent marks.
- Keep roughly the same length and tone as the original.
- Do NOT add greetings, names, or placeholders that weren't in the original.

Output format: exactly {count} lines. Each line is one variation prefixed with
its number and a dot, like:
1. <first variation>
2. <second variation>
Each variation must be on a SINGLE line (no line breaks inside a variation).
No blank lines, no headers, no commentary, no markdown -- just the numbered list.
"""

    try:
        reply = gemini_helper.generate_text(
            system_prompt, f"Original message:\n{sentence}", max_output_tokens=4096,
        )
    except Exception as e:
        raise RuntimeError(f"Failed to generate variations: {e}")

    # Parse: strip a leading "N." / "N)" / "-" / "*" bullet from each non-empty
    # line. Dedupe (case-insensitive), drop empties and any echo of the original.
    seen = {sentence.lower()}
    cleaned = []
    for line in reply.splitlines():
        line = line.strip()
        if not line:
            continue
        line = re.sub(r"^\s*(?:\d+[.)]|[-*•])\s*", "", line).strip()
        if line and line.lower() not in seen:
            seen.add(line.lower())
            cleaned.append(line)
    if not cleaned:
        raise RuntimeError(f"Model returned no usable variations: {reply[:200]}")
    return cleaned
