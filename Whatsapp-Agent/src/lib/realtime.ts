import Ably from "ably";

// Single shared channel for all dashboard updates. Events published here are
// mirrored to the browser by the Ably subscription in the dashboard.
export const REALTIME_CHANNEL = "whatsapp-dashboard";

export type RealtimeEvent = "message:new" | "conversation:changed";

let _rest: Ably.Rest | null = null;

export function ablyEnabled(): boolean {
  return Boolean(process.env.ABLY_API_KEY);
}

function getRest(): Ably.Rest | null {
  if (!ablyEnabled()) return null;
  if (!_rest) {
    _rest = new Ably.Rest({ key: process.env.ABLY_API_KEY! });
  }
  return _rest;
}

// Fire-and-forget publish. No-ops (and never throws) when ABLY_API_KEY is
// unset or Ably is unreachable, so the core WhatsApp flow is never blocked.
export async function publish(event: RealtimeEvent, data: unknown): Promise<void> {
  const rest = getRest();
  if (!rest) return;
  try {
    await rest.channels.get(REALTIME_CHANNEL).publish(event, data);
  } catch (err) {
    console.error("Ably publish failed:", err);
  }
}
