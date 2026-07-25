# -*- coding: utf-8 -*-
"""
One shared Gemini entry point for the whole engine, with automatic model
fallback.

Why this exists: Google's free tier meters requests PER MODEL PER DAY
("GenerateRequestsPerDayPerProjectPerModel-FreeTier"). The default
gemini-flash-latest currently resolves to gemini-3.5-flash, whose free bucket is
only ~20 requests/day -- so the analyzer, verifier, translator and variation
tools would all die together the moment that one bucket empties.

Because each model has its OWN daily bucket, cycling through several models
multiplies the effective free budget and keeps the tools working when any one
model is exhausted. This module tries a primary model, and on a quota (429) /
transient error rolls to the next model in the chain, raising a clean,
human-readable RuntimeError only if EVERY model is exhausted.

Model order favours the *-lite models first: they're more than capable of the
JSON-extraction and short-rewrite tasks the engine does, and they carry much
larger free-tier limits than the full flash models. Override the whole chain
with the GEMINI_MODELS env var (comma-separated) or just the primary with
GEMINI_MODEL.
"""
import os

try:
    import google.generativeai as genai
except ImportError:
    genai = None

# Default fallback chain. Lite models first (highest free limits + plenty good
# for this workload), then the heavier flash models as backups. Probed against
# a real key: gemini-flash-lite-latest had budget when gemini-3.5-flash (a.k.a.
# gemini-flash-latest) was already exhausted.
_DEFAULT_CHAIN = [
    "gemini-flash-lite-latest",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-flash-latest",
]


def _build_chain():
    """Resolve the model chain from env, falling back to the default. GEMINI_MODEL
    (single primary) is honoured for backward compatibility and, if set, is tried
    first; GEMINI_MODELS (comma-separated) replaces the whole chain."""
    env_chain = os.environ.get("GEMINI_MODELS", "").strip()
    if env_chain:
        chain = [m.strip() for m in env_chain.split(",") if m.strip()]
    else:
        chain = list(_DEFAULT_CHAIN)
    primary = os.environ.get("GEMINI_MODEL", "").strip()
    if primary and primary in chain:
        chain.remove(primary)
    if primary:
        chain.insert(0, primary)
    # De-dupe while preserving order.
    seen, out = set(), []
    for m in chain:
        if m not in seen:
            seen.add(m)
            out.append(m)
    return out


MODEL_CHAIN = _build_chain()

# Per-request ceiling for a single model attempt. Without one, the SDK waits far
# longer than any UI can tolerate: a model returning 504 Deadline Exceeded blocks
# for minutes, and because the chain then tries the remaining models in sequence,
# one sick model turned a 2-second analysis into a 2-minute one. Bounding each
# attempt means a hung model costs this many seconds, not the whole request.
TIMEOUT_SECONDS = int(os.environ.get("GEMINI_TIMEOUT_SECONDS", "20"))

# Exposed so callers can show "which model answered" for debugging.
last_model_used = None

# The chain is ordered by expected free-tier headroom, but which models actually
# have budget changes through the day -- and the healthy one can easily be last,
# behind several exhausted or timing-out models. Remembering the model that last
# answered and trying it first makes every call after the first one fast, instead
# of re-walking the same dead models on every single request.
_preferred_model = None


def _ordered_chain():
    """MODEL_CHAIN with the last known-good model moved to the front."""
    if not _preferred_model or _preferred_model not in MODEL_CHAIN:
        return MODEL_CHAIN
    return [_preferred_model] + [m for m in MODEL_CHAIN if m != _preferred_model]


def is_configured():
    return bool(genai and os.environ.get("GEMINI_API_KEY"))


if is_configured():
    genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))


def _is_quota_error(msg):
    m = msg.lower()
    return "429" in m or "quota" in m or "exhausted" in m or "resourceexhausted" in m


def generate_text(system_prompt, user_prompt, json_mode=False, max_output_tokens=None):
    """Run a Gemini completion, trying each model in the chain until one answers.

    json_mode=True sets response_mime_type=application/json (Gemini's native JSON
    constraint). Returns the raw text of the first model that responds. Raises
    RuntimeError only if every model errors -- with a quota-specific message when
    that's the cause, so the API layer can surface a clean 502.
    """
    global last_model_used, _preferred_model
    if not is_configured():
        raise RuntimeError("Gemini API key is not configured. Add GEMINI_API_KEY to .env")

    gen_config = {}
    if json_mode:
        gen_config["response_mime_type"] = "application/json"
    if max_output_tokens:
        gen_config["max_output_tokens"] = max_output_tokens

    errors = []
    quota_hit = False
    for model_name in _ordered_chain():
        try:
            model = genai.GenerativeModel(
                model_name=model_name,
                system_instruction=system_prompt,
                generation_config=gen_config or None,
            )
            resp = model.generate_content(
                user_prompt, request_options={"timeout": TIMEOUT_SECONDS}
            )
            text = (resp.text or "").strip()
            if not text:
                # Empty completion (e.g. a reasoning model that burned its budget
                # on thinking) -- treat as a soft failure and try the next model.
                errors.append(f"{model_name}: empty response")
                continue
            last_model_used = model_name
            _preferred_model = model_name  # try this one first next time
            return text
        except Exception as e:
            msg = str(e)
            # A model that just failed must not stay at the front of the queue, or
            # every later call pays its timeout again before reaching a live one.
            if _preferred_model == model_name:
                _preferred_model = None
            if _is_quota_error(msg):
                quota_hit = True
                errors.append(f"{model_name}: quota exhausted")
                continue  # roll to the next model's separate daily bucket
            # Timeout (504/deadline), 404 (model not enabled for this key), or any
            # other transient error -- skip to the next model rather than failing
            # the whole request.
            errors.append(f"{model_name}: {msg[:80]}")
            continue

    # Every model failed.
    if quota_hit:
        raise RuntimeError(
            "All Gemini models are quota-exhausted for today (free tier is per-model "
            "per-day). Wait for the quota to reset (midnight Pacific) or enable billing "
            "on the Google AI project. Tried: " + ", ".join(MODEL_CHAIN)
        )
    raise RuntimeError("Gemini request failed on every model. Details: " + " | ".join(errors))
