import { NextRequest } from "next/server";
import { queryOne } from "@/lib/db";
import { sendInstagramMessage } from "@/lib/instagram";
import { checkSendRate, recordSend } from "@/lib/rate-limiter";
import { publishUpdate } from "@/lib/realtime";
import type { Conversation, Message } from "@/lib/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { message } = body;

  if (!message?.trim()) {
    return Response.json({ error: "Message is required" }, { status: 400 });
  }

  // Check send rate limit
  const rateCheck = checkSendRate(id);
  if (!rateCheck.allowed) {
    return Response.json(
      {
        error: rateCheck.reason,
        nextAvailableIn: rateCheck.nextAvailableIn,
      },
      { status: 429 }
    );
  }

  // Get conversation to find igsid
  let conversation: Pick<Conversation, "igsid"> | null;
  try {
    conversation = await queryOne<Pick<Conversation, "igsid">>(
      `SELECT igsid FROM instagram_conversations WHERE id = $1`,
      [id]
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Database error";
    return Response.json({ error: detail }, { status: 500 });
  }

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Send via Instagram. Only count the send against the hourly quota once it
  // actually succeeded — a failed send (expired token, outside the 24h reply
  // window) must not burn one of the 3 slots.
  try {
    await sendInstagramMessage(conversation.igsid, message);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Instagram send failed";
    return Response.json({ error: detail }, { status: 502 });
  }
  recordSend(id);

  // Store in DB and bump the conversation timestamp.
  try {
    const msg = await queryOne<Message>(
      `INSERT INTO instagram_messages (conversation_id, role, content)
       VALUES ($1, 'assistant', $2)
       RETURNING *`,
      [id, message]
    );
    await queryOne(
      `UPDATE instagram_conversations SET updated_at = now() WHERE id = $1`,
      [id]
    );
    // Push so other open dashboards see the operator's message instantly.
    await publishUpdate(id);
    return Response.json(msg);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Failed to store message";
    return Response.json({ error: detail }, { status: 500 });
  }
}
