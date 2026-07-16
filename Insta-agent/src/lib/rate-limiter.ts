/**
 * Rate limiter for Instagram sends: max 3 messages per hour per conversation,
 * with minimum 20 minutes spacing to avoid triggering Meta's abuse detection.
 *
 * checkSendRate() only CHECKS; callers must call recordSend() after the
 * Instagram API call actually succeeds — otherwise a failed send (expired
 * token, outside the 24h window) would burn one of the 3 hourly slots with
 * zero messages delivered.
 *
 * Session-scoped (in-memory, resets on server restart). On a multi-instance /
 * serverless deploy each instance has its own map — persist to the DB (count
 * assistant rows in the last hour) before deploying that way.
 */

interface SendRecord {
  timestamp: number;
}

const sendHistory: Map<string, SendRecord[]> = new Map();
const ONE_HOUR = 60 * 60 * 1000;
const MIN_SPACING_MS = 20 * 60 * 1000; // 20 minutes
export const MAX_SENDS_PER_HOUR = 3;

// Drop records outside the 1-hour window and write the pruned list back so
// the map doesn't grow stale entries forever.
function recentSends(conversationId: string, now: number): SendRecord[] {
  const records = (sendHistory.get(conversationId) || []).filter(
    (r) => now - r.timestamp < ONE_HOUR
  );
  if (records.length === 0) {
    sendHistory.delete(conversationId);
  } else {
    sendHistory.set(conversationId, records);
  }
  return records;
}

export function checkSendRate(conversationId: string): {
  allowed: boolean;
  reason?: string;
  nextAvailableIn?: number; // milliseconds
} {
  const now = Date.now();
  const records = recentSends(conversationId, now);

  if (records.length >= MAX_SENDS_PER_HOUR) {
    const oldestSend = Math.min(...records.map((r) => r.timestamp));
    const nextAvailable = oldestSend + ONE_HOUR;
    return {
      allowed: false,
      reason: `Rate limit: max ${MAX_SENDS_PER_HOUR} sends per hour. Try again in ${Math.round((nextAvailable - now) / 60000)} minutes.`,
      nextAvailableIn: Math.max(0, nextAvailable - now),
    };
  }

  if (records.length > 0) {
    const lastSend = records[records.length - 1].timestamp;
    const timeSinceLastSend = now - lastSend;

    if (timeSinceLastSend < MIN_SPACING_MS) {
      const nextAvailable = lastSend + MIN_SPACING_MS;
      return {
        allowed: false,
        reason: `Minimum ${Math.round(MIN_SPACING_MS / 60000)}-minute spacing required. Try again in ${Math.round((nextAvailable - now) / 1000)} seconds.`,
        nextAvailableIn: Math.max(0, nextAvailable - now),
      };
    }
  }

  return { allowed: true };
}

// Call ONLY after the Instagram send succeeded.
export function recordSend(conversationId: string): void {
  const now = Date.now();
  const records = recentSends(conversationId, now);
  records.push({ timestamp: now });
  sendHistory.set(conversationId, records);
}

export function resetSendRate(conversationId: string): void {
  sendHistory.delete(conversationId);
}

export function getSendStatus(conversationId: string): {
  sendsThisHour: number;
  nextAvailableIn?: number; // ms until the hourly window frees a slot
  spacingBlockMs?: number; // ms until the 20-min spacing rule allows a send
} {
  const now = Date.now();
  const records = recentSends(conversationId, now);

  if (records.length === 0) {
    return { sendsThisHour: 0 };
  }

  const oldestSend = Math.min(...records.map((r) => r.timestamp));
  const lastSend = records[records.length - 1].timestamp;
  const spacingRemaining = lastSend + MIN_SPACING_MS - now;

  return {
    sendsThisHour: records.length,
    nextAvailableIn: Math.max(0, oldestSend + ONE_HOUR - now),
    spacingBlockMs: Math.max(0, spacingRemaining),
  };
}
