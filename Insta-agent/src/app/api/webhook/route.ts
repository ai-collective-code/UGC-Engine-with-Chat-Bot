import { NextRequest } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/supabase";
import { sendInstagramMessage, fetchInstagramProfile } from "@/lib/instagram";
import { getAIResponse } from "@/lib/ai";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Accept both Instagram and Facebook verify tokens (both use the same token)
  const validToken = process.env.INSTAGRAM_VERIFY_TOKEN || process.env.FACEBOOK_VERIFY_TOKEN;
  if (mode === "subscribe" && token === validToken) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// Verify Meta's X-Hub-Signature-256 header against the raw body. Without this,
// anyone who learns the webhook URL can forge payloads and make the bot DM
// arbitrary accounts. Enforced when INSTAGRAM_APP_SECRET is set; if it isn't,
// we log a warning and accept (local dev), so set it in production.
function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.INSTAGRAM_APP_SECRET || process.env.FACEBOOK_APP_SECRET;
  if (!appSecret) {
    console.warn("[webhook] INSTAGRAM_APP_SECRET not set — skipping signature verification (unsafe in production)");
    return true;
  }
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const received = signatureHeader.slice("sha256=".length);
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!verifySignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only process instagram events for now
  // TODO: Add facebook_conversations table and facebook-specific handler
  if (body.object !== "instagram") {
    return Response.json({ status: "ignored" });
  }

  // Meta batches multiple entries and multiple messaging events per delivery —
  // process every one, not just the first, or rapid-fire messages get dropped.
  const events: { sender: { id: string }; message?: { text?: string; mid?: string; is_echo?: boolean } }[] = [];
  for (const entry of body.entry || []) {
    for (const messaging of entry.messaging || []) {
      events.push(messaging);
    }
  }

  if (events.length === 0) {
    return Response.json({ status: "no_messaging" });
  }

  const results: string[] = [];
  for (const messaging of events) {
    // Skip echo messages (sent by our own page) and non-text events
    if (messaging.message?.is_echo) {
      results.push("echo_ignored");
      continue;
    }
    if (!messaging.message?.text) {
      results.push("non_text");
      continue;
    }
    results.push(await handleTextMessage(messaging.sender.id, messaging.message.text, messaging.message.mid));
  }

  // Always 200 once events are processed — a 500 here makes Meta redeliver the
  // whole batch, and the duplicate-mid guard would swallow the retry anyway.
  return Response.json({ status: results });
}

async function handleTextMessage(igsid: string, text: string, instagramMsgId?: string): Promise<string> {
  try {
    // Find or create conversation
    let { data: conversation } = await supabase
      .from("instagram_conversations")
      .select("*")
      .eq("igsid", igsid)
      .single();

    if (!conversation) {
      // Fetch profile info on first message (null on Graph failure — a profile
      // fetch error must never block storing/answering the message itself)
      const profile = await fetchInstagramProfile(igsid);
      const { data: newConvo, error: convoInsertError } = await supabase
        .from("instagram_conversations")
        .insert({ igsid, ...(profile || {}) })
        .select()
        .single();
      if (convoInsertError) {
        // Two concurrent first-messages can race the insert — re-select instead
        // of failing so the loser of the race still finds the winner's row.
        const { data: existing } = await supabase
          .from("instagram_conversations")
          .select("*")
          .eq("igsid", igsid)
          .single();
        conversation = existing;
      } else {
        conversation = newConvo;
      }
    } else {
      // Refresh profile on every message to keep data up to date; skip the
      // update entirely when the Graph call fails so a transient API error
      // can't wipe stored profile fields to null.
      const profile = await fetchInstagramProfile(igsid);
      if (profile) {
        await supabase
          .from("instagram_conversations")
          .update(profile)
          .eq("id", conversation.id);
        conversation = { ...conversation, ...profile };
      }
    }

    if (!conversation) {
      console.error("[webhook] Failed to find or create conversation for", igsid);
      return "conversation_failed";
    }

    // Store user message (ignore duplicates via instagram_msg_id unique index)
    const { error: insertError } = await supabase.from("instagram_messages").insert({
      conversation_id: conversation.id,
      role: "user",
      content: text,
      instagram_msg_id: instagramMsgId,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        // Duplicate message (Meta redelivery), ignore
        return "duplicate";
      }
      // Any other insert failure: do NOT reply to a message we failed to store —
      // the AI would lose it from context and the transcript would lie.
      console.error("[webhook] Failed to store message:", insertError);
      return "store_failed";
    }

    // Update conversation timestamp
    await supabase
      .from("instagram_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation.id);

    // If mode is 'human', don't auto-reply
    if (conversation.mode === "human") {
      return "stored_for_human";
    }

    // Fetch conversation history — the NEWEST 20 messages (fetch descending,
    // then reverse into chronological order). Ascending+limit would freeze the
    // AI's context at the first 20 messages of a long negotiation.
    const { data: history } = await supabase
      .from("instagram_messages")
      .select("role, content")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Get AI response — null means every model failed; stay silent and leave
    // the thread for a human rather than DM an error string to the creator.
    const aiResponse = await getAIResponse(
      (history || [])
        .reverse()
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
    );

    if (!aiResponse) {
      console.error("[webhook] All AI models failed — message stored, no reply sent:", igsid);
      return "ai_unavailable";
    }

    // Send response via Instagram
    await sendInstagramMessage(igsid, aiResponse);

    // Store AI response
    await supabase.from("instagram_messages").insert({
      conversation_id: conversation.id,
      role: "assistant",
      content: aiResponse,
    });

    // Update conversation timestamp again
    await supabase
      .from("instagram_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation.id);

    return "replied";
  } catch (error) {
    console.error("[webhook] Error handling message from", igsid, error);
    return "error";
  }
}
