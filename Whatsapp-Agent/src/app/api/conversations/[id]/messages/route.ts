import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import type { Message } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const messages = await query<Message>(
      `SELECT * FROM messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC`,
      [id]
    );
    return Response.json(messages);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    return Response.json({ error: message }, { status: 500 });
  }
}
