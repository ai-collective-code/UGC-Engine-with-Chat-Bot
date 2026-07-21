import { query } from "@/lib/db";
import type { ConversationWithLastMessage } from "@/lib/types";

export async function GET() {
  try {
    // Each conversation with its most recent message in a single round-trip.
    const rows = await query<ConversationWithLastMessage>(
      `SELECT c.*,
              (SELECT m.content
                 FROM messages m
                WHERE m.conversation_id = c.id
                ORDER BY m.created_at DESC
                LIMIT 1) AS last_message
         FROM conversations c
        ORDER BY c.updated_at DESC`
    );
    return Response.json(rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    return Response.json({ error: message }, { status: 500 });
  }
}
