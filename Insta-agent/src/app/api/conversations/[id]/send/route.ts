import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendInstagramMessage } from "@/lib/instagram";
import { checkSendRate, recordSend } from "@/lib/rate-limiter";

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
  const { data: conversation, error: convoError } = await supabase
    .from("instagram_conversations")
    .select("igsid")
    .eq("id", id)
    .single();

  if (convoError || !conversation) {
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

  // Store in DB
  const { data: msg, error: msgError } = await supabase
    .from("instagram_messages")
    .insert({
      conversation_id: id,
      role: "assistant",
      content: message,
    })
    .select()
    .single();

  if (msgError) {
    return Response.json({ error: msgError.message }, { status: 500 });
  }

  // Update conversation timestamp
  await supabase
    .from("instagram_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  return Response.json(msg);
}
