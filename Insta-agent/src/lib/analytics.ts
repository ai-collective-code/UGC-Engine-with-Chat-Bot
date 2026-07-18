import { query, queryOne } from "@/lib/db";

export interface DashboardMetrics {
  totalInteractions: number;
  last24hInteractions: number;
  avgResponseTimeSeconds: number | null;
}

export interface MessageVolumePoint {
  date: string;
  label: string;
  user: number;
  assistant: number;
  total: number;
}

export interface RecentActivityItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  conversationName: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const since24h = new Date(Date.now() - DAY_MS).toISOString();

  const [totalRow, last24hRow, responseTimeRows] = await Promise.all([
    queryOne<{ count: number }>(
      `SELECT count(*)::int AS count FROM instagram_messages WHERE role = 'user'`
    ),
    queryOne<{ count: number }>(
      `SELECT count(*)::int AS count FROM instagram_messages
       WHERE role = 'user' AND created_at >= $1`,
      [since24h]
    ),
    // Sample the most recent messages to estimate response latency; a full
    // table scan isn't worth it for a dashboard metric.
    query<{ conversation_id: string; role: string; created_at: string }>(
      `SELECT conversation_id, role, created_at FROM instagram_messages
       ORDER BY created_at DESC
       LIMIT 300`
    ),
  ]);

  return {
    totalInteractions: totalRow?.count ?? 0,
    last24hInteractions: last24hRow?.count ?? 0,
    avgResponseTimeSeconds: computeAvgResponseTime(responseTimeRows),
  };
}

function computeAvgResponseTime(
  rows: { conversation_id: string; role: string; created_at: string }[]
): number | null {
  const byConversation = new Map<string, { role: string; created_at: string }[]>();
  for (const row of rows) {
    const list = byConversation.get(row.conversation_id) ?? [];
    list.push(row);
    byConversation.set(row.conversation_id, list);
  }

  const diffsMs: number[] = [];
  for (const list of byConversation.values()) {
    list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    let pendingUserAt: number | null = null;
    for (const msg of list) {
      const ts = new Date(msg.created_at).getTime();
      if (msg.role === "user") {
        pendingUserAt = ts;
      } else if (msg.role === "assistant" && pendingUserAt !== null) {
        diffsMs.push(ts - pendingUserAt);
        pendingUserAt = null;
      }
    }
  }

  if (diffsMs.length === 0) return null;
  const avgMs = diffsMs.reduce((sum, d) => sum + d, 0) / diffsMs.length;
  return avgMs / 1000;
}

export async function getMessageVolume(): Promise<MessageVolumePoint[]> {
  const days = 7;
  const since = new Date(Date.now() - (days - 1) * DAY_MS);
  since.setHours(0, 0, 0, 0);

  const data = await query<{ role: string; created_at: string }>(
    `SELECT role, created_at FROM instagram_messages WHERE created_at >= $1`,
    [since.toISOString()]
  );

  const buckets = new Map<string, { user: number; assistant: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * DAY_MS);
    buckets.set(dateKey(d), { user: 0, assistant: 0 });
  }

  for (const row of data ?? []) {
    const key = dateKey(new Date(row.created_at));
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (row.role === "user") bucket.user += 1;
    else if (row.role === "assistant") bucket.assistant += 1;
  }

  return Array.from(buckets.entries()).map(([date, counts]) => ({
    date,
    // Parse as local midnight ("T00:00:00", no zone) — a bare "YYYY-MM-DD"
    // parses as UTC midnight and shifts the weekday label for zones west of UTC.
    label: new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" }),
    user: counts.user,
    assistant: counts.assistant,
    total: counts.user + counts.assistant,
  }));
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export async function getRecentActivity(limit = 10): Promise<RecentActivityItem[]> {
  const rows = await query<{
    id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
    convo_name: string | null;
    convo_username: string | null;
    convo_igsid: string | null;
  }>(
    `SELECT m.id, m.role, m.content, m.created_at,
            c.name AS convo_name, c.username AS convo_username, c.igsid AS convo_igsid
     FROM instagram_messages m
     LEFT JOIN instagram_conversations c ON c.id = m.conversation_id
     ORDER BY m.created_at DESC
     LIMIT $1`,
    [limit]
  );

  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
    conversationName: row.convo_name || row.convo_username || row.convo_igsid || "Unknown",
  }));
}
