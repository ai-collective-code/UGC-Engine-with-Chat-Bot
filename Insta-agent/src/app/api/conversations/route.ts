import { query } from "@/lib/db";
import type { ConversationWithLastMessage } from "@/lib/types";

export async function GET() {
  try {
    // One query instead of N+1: a LATERAL subquery grabs each conversation's
    // most-recent message content inline, ordered newest-conversation-first.
    const rows = await query<ConversationWithLastMessage>(
      `SELECT c.*, lm.content AS last_message
       FROM instagram_conversations c
       LEFT JOIN LATERAL (
         SELECT content
         FROM instagram_messages m
         WHERE m.conversation_id = c.id
         ORDER BY m.created_at DESC
         LIMIT 1
       ) lm ON true
       ORDER BY c.updated_at DESC`
    );
    return Response.json(rows);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Failed to load conversations";
    return Response.json({ error: detail }, { status: 500 });
  }
}
