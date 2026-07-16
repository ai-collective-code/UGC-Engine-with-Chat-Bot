import { supabase } from "@/lib/supabase";

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

  const [totalRes, last24hRes, responseTimeRes] = await Promise.all([
    supabase
      .from("instagram_messages")
      .select("id", { count: "exact", head: true })
      .eq("role", "user"),
    supabase
      .from("instagram_messages")
      .select("id", { count: "exact", head: true })
      .eq("role", "user")
      .gte("created_at", since24h),
    // Sample the most recent messages to estimate response latency; a full
    // table scan isn't worth it for a dashboard metric.
    supabase
      .from("instagram_messages")
      .select("conversation_id, role, created_at")
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  if (totalRes.error) throw new Error(totalRes.error.message);
  if (last24hRes.error) throw new Error(last24hRes.error.message);
  if (responseTimeRes.error) throw new Error(responseTimeRes.error.message);

  return {
    totalInteractions: totalRes.count ?? 0,
    last24hInteractions: last24hRes.count ?? 0,
    avgResponseTimeSeconds: computeAvgResponseTime(responseTimeRes.data ?? []),
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

  const { data, error } = await supabase
    .from("instagram_messages")
    .select("role, created_at")
    .gte("created_at", since.toISOString());

  if (error) throw new Error(error.message);

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
  const { data, error } = await supabase
    .from("instagram_messages")
    .select(
      "id, role, content, created_at, conversation:instagram_conversations(name, username, igsid)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const convo = Array.isArray(row.conversation) ? row.conversation[0] : row.conversation;
    return {
      id: row.id,
      role: row.role,
      content: row.content,
      createdAt: row.created_at,
      conversationName: convo?.name || convo?.username || convo?.igsid || "Unknown",
    };
  });
}
