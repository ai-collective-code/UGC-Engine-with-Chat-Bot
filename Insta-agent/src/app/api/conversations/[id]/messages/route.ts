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
      `SELECT * FROM instagram_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [id]
    );
    return Response.json(messages);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Failed to load messages";
    return Response.json({ error: detail }, { status: 500 });
  }
}
