import { NextRequest } from "next/server";
import { queryOne } from "@/lib/db";
import { publish } from "@/lib/realtime";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import type { Message } from "@/lib/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { message } = body;

  if (!message?.trim()) {
    return Response.json({ error: "Message is required" }, { status: 400 });
  }

  try {
    // Get conversation to find phone number
    const conversation = await queryOne<{ phone: string }>(
      `SELECT phone FROM conversations WHERE id = $1`,
      [id]
    );

    if (!conversation) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Send via WhatsApp
    await sendWhatsAppMessage(conversation.phone, message);

    // Store in DB
    const msg = await queryOne<Message>(
      `INSERT INTO messages (conversation_id, role, content)
       VALUES ($1, 'assistant', $2)
       RETURNING *`,
      [id, message]
    );

    // Update conversation timestamp
    await queryOne(
      `UPDATE conversations SET updated_at = now() WHERE id = $1 RETURNING id`,
      [id]
    );

    await publish("message:new", msg);
    await publish("conversation:changed", { id });

    return Response.json(msg);
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : "Database error";
    return Response.json({ error: errMessage }, { status: 500 });
  }
}
