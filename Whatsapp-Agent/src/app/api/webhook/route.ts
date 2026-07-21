import { NextRequest } from "next/server";
import { query, queryOne } from "@/lib/db";
import { publish } from "@/lib/realtime";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { getAIResponse } from "@/lib/ai";
import type { Conversation, Message } from "@/lib/types";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Only process whatsapp_business_account events
  if (body.object !== "whatsapp_business_account") {
    return Response.json({ status: "ignored" });
  }

  const entry = body.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;

  // Only process actual messages (not status updates)
  if (!value?.messages?.[0]) {
    return Response.json({ status: "no_message" });
  }

  const message = value.messages[0];
  const contact = value.contacts?.[0];

  // Only handle text messages
  if (message.type !== "text") {
    return Response.json({ status: "non_text" });
  }

  const phone = message.from;
  const text = message.text.body;
  const name = contact?.profile?.name || null;
  const whatsappMsgId = message.id;

  try {
    // Find or create conversation
    let conversation = await queryOne<Conversation>(
      `SELECT * FROM conversations WHERE phone = $1`,
      [phone]
    );

    if (!conversation) {
      conversation = await queryOne<Conversation>(
        `INSERT INTO conversations (phone, name) VALUES ($1, $2) RETURNING *`,
        [phone, name]
      );
    } else if (name && name !== conversation.name) {
      await queryOne(
        `UPDATE conversations SET name = $1 WHERE id = $2 RETURNING id`,
        [name, conversation.id]
      );
      conversation.name = name;
    }

    if (!conversation) {
      return Response.json({ error: "Failed to create conversation" }, { status: 500 });
    }

    // Store user message (ignore duplicates via the unique whatsapp_msg_id)
    let userMsg: Message | null;
    try {
      userMsg = await queryOne<Message>(
        `INSERT INTO messages (conversation_id, role, content, whatsapp_msg_id)
         VALUES ($1, 'user', $2, $3)
         RETURNING *`,
        [conversation.id, text, whatsappMsgId]
      );
    } catch (err) {
      // 23505 = unique_violation -> duplicate delivery, safely ignore.
      if (err && typeof err === "object" && "code" in err && err.code === "23505") {
        return Response.json({ status: "duplicate" });
      }
      throw err;
    }

    // Update conversation timestamp
    await queryOne(
      `UPDATE conversations SET updated_at = now() WHERE id = $1 RETURNING id`,
      [conversation.id]
    );

    await publish("message:new", userMsg);
    await publish("conversation:changed", { id: conversation.id });

    // If mode is 'human', don't auto-reply
    if (conversation.mode === "human") {
      return Response.json({ status: "stored_for_human" });
    }

    // Fetch conversation history (last 20 messages for context)
    const history = await query<Pick<Message, "role" | "content">>(
      `SELECT role, content FROM messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC
        LIMIT 20`,
      [conversation.id]
    );

    // Get AI response
    const aiResponse = await getAIResponse(
      history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }))
    );

    // Send response via WhatsApp
    await sendWhatsAppMessage(phone, aiResponse);

    // Store AI response
    const assistantMsg = await queryOne<Message>(
      `INSERT INTO messages (conversation_id, role, content)
       VALUES ($1, 'assistant', $2)
       RETURNING *`,
      [conversation.id, aiResponse]
    );

    // Update conversation timestamp again
    await queryOne(
      `UPDATE conversations SET updated_at = now() WHERE id = $1 RETURNING id`,
      [conversation.id]
    );

    await publish("message:new", assistantMsg);
    await publish("conversation:changed", { id: conversation.id });

    return Response.json({ status: "replied" });
  } catch (error) {
    console.error("Webhook error:", error);
    return Response.json({ status: "error" }, { status: 500 });
  }
}
