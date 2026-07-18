import Ably from "ably";

// Server-side Ably publisher. Realtime is OPTIONAL — if ABLY_API_KEY is unset,
// every publish is a no-op and the dashboard falls back to its safety-net poll,
// so the app still works without it (e.g. local dev).
let _rest: Ably.Rest | null = null;

function getAblyRest(): Ably.Rest | null {
  const key = process.env.ABLY_API_KEY;
  if (!key) return null;
  if (!_rest) _rest = new Ably.Rest(key);
  return _rest;
}

// Single channel for all DM activity. The client subscribes to "update" events
// and re-fetches on each one, so the payload only needs to say which
// conversation changed — the DB stays the single source of truth.
export const DM_CHANNEL = "instagram-dm";

export async function publishUpdate(conversationId: string): Promise<void> {
  const rest = getAblyRest();
  if (!rest) return;
  try {
    await rest.channels.get(DM_CHANNEL).publish("update", { conversationId });
  } catch (err) {
    // A realtime hiccup must never break a webhook or a send — the safety-net
    // poll will still surface the change within ~15s.
    console.warn("[realtime] publish failed:", err);
  }
}
