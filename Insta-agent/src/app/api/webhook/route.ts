import { NextRequest } from "next/server";
import crypto from "crypto";
import { query, queryOne, UNIQUE_VIOLATION } from "@/lib/db";
import { sendInstagramMessage, fetchInstagramProfile } from "@/lib/instagram";
import { decide } from "@/lib/flow";
import { publishUpdate } from "@/lib/realtime";
import type { Conversation } from "@/lib/types";

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

interface MessagingEvent {
  sender: { id: string };
  recipient?: { id: string };
  message?: { text?: string; mid?: string; is_echo?: boolean };
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
  const events: MessagingEvent[] = [];
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
    if (!messaging.message?.text) {
      results.push("non_text");
      continue;
    }
    const isEcho = !!messaging.message.is_echo;
    // For an echo (a message WE/the human sent), the creator is the recipient.
    // Storing echoes captures the manually-sent opener so the flow engine can
    // detect its language; the bot's own sends are deduped by message id below.
    const igsid = isEcho ? messaging.recipient?.id : messaging.sender.id;
    if (!igsid) {
      results.push("no_igsid");
      continue;
    }
    results.push(
      await handleMessage(igsid, messaging.message.text, messaging.message.mid, isEcho ? "assistant" : "user")
    );
  }

  // Always 200 once events are processed — a 500 here makes Meta redeliver the
  // whole batch, and the duplicate-mid guard would swallow the retry anyway.
  return Response.json({ status: results });
}

// Find the conversation for this creator, creating it (with profile) on first
// contact. Returns null only if the row genuinely can't be found or created.
async function findOrCreateConversation(igsid: string): Promise<Conversation | null> {
  const existing = await queryOne<Conversation>(
    `SELECT * FROM instagram_conversations WHERE igsid = $1`,
    [igsid]
  );

  if (existing) {
    // Refresh profile; skip the update on Graph failure so a transient error
    // can't wipe stored fields to null.
    const profile = await fetchInstagramProfile(igsid);
    if (profile) {
      const updated = await queryOne<Conversation>(
        `UPDATE instagram_conversations
         SET name = $1, username = $2, profile_pic = $3, follower_count = $4,
             is_user_follow_business = $5, is_business_follow_user = $6
         WHERE id = $7
         RETURNING *`,
        [
          profile.name,
          profile.username,
          profile.profile_pic,
          profile.follower_count,
          profile.is_user_follow_business,
          profile.is_business_follow_user,
          existing.id,
        ]
      );
      return updated ?? existing;
    }
    return existing;
  }

  const profile = await fetchInstagramProfile(igsid);
  // ON CONFLICT DO NOTHING handles two concurrent first-messages racing the
  // insert: the loser gets no RETURNING row, and the follow-up SELECT finds the
  // winner's row.
  const created = await queryOne<Conversation>(
    `INSERT INTO instagram_conversations
       (igsid, name, username, profile_pic, follower_count,
        is_user_follow_business, is_business_follow_user)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (igsid) DO NOTHING
     RETURNING *`,
    [
      igsid,
      profile?.name ?? null,
      profile?.username ?? null,
      profile?.profile_pic ?? null,
      profile?.follower_count ?? null,
      profile?.is_user_follow_business ?? null,
      profile?.is_business_follow_user ?? null,
    ]
  );
  if (created) return created;

  return queryOne<Conversation>(
    `SELECT * FROM instagram_conversations WHERE igsid = $1`,
    [igsid]
  );
}

// Store one message; returns "ok", "duplicate" (Meta redelivery / echo of our
// own send), or "store_failed".
async function storeMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  instagramMsgId?: string
): Promise<"ok" | "duplicate" | "store_failed"> {
  try {
    await queryOne(
      `INSERT INTO instagram_messages (conversation_id, role, content, instagram_msg_id)
       VALUES ($1, $2, $3, $4)`,
      [conversationId, role, content, instagramMsgId ?? null]
    );
    return "ok";
  } catch (error) {
    if ((error as { code?: string }).code === UNIQUE_VIOLATION) return "duplicate";
    console.error("[webhook] Failed to store message:", error);
    return "store_failed";
  }
}

async function handleMessage(
  igsid: string,
  text: string,
  instagramMsgId: string | undefined,
  role: "user" | "assistant"
): Promise<string> {
  try {
    const conversation = await findOrCreateConversation(igsid);
    if (!conversation) {
      console.error("[webhook] Failed to find or create conversation for", igsid);
      return "conversation_failed";
    }

    const stored = await storeMessage(conversation.id, role, text, instagramMsgId);
    if (stored === "duplicate") return "duplicate";
    if (stored === "store_failed") return "store_failed";

    await queryOne(
      `UPDATE instagram_conversations SET updated_at = now() WHERE id = $1`,
      [conversation.id]
    );
    // Push the stored inbound/echo message to any open dashboard immediately.
    await publishUpdate(conversation.id);

    // Echoes (opener / human-sent messages) are stored for context only — the
    // bot never responds to its own or a human's outbound message.
    if (role === "assistant") return "stored_echo";

    // Locked to a human (declined, completed, or manual takeover): store, no reply.
    if (conversation.mode === "human") return "stored_for_human";

    // Newest 20 messages in chronological order — the just-stored creator
    // message is last, which is what the flow engine expects.
    const history = await query<{ role: "user" | "assistant"; content: string }>(
      `SELECT role, content FROM instagram_messages
       WHERE conversation_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [conversation.id]
    );

    const chronological = history
      .reverse()
      .map((m) => ({ role: m.role, content: m.content }));

    const decision = decide(chronological);

    if (decision.capturedPhone) {
      // The number is also the creator's last message in the transcript; log it
      // so it's easy to find, and the lock below surfaces the thread for a human.
      console.log(
        `[flow] WhatsApp number captured for @${conversation.username ?? igsid}: ${decision.capturedPhone}`
      );
    }

    if (decision.send) {
      const result = await sendInstagramMessage(igsid, decision.send, decision.quickReplies);
      // Store our send WITH the returned message id so the echo of it is deduped.
      const sentMid = (result as { message_id?: string })?.message_id;
      await storeMessage(conversation.id, "assistant", decision.send, sentMid);
      await queryOne(
        `UPDATE instagram_conversations SET updated_at = now() WHERE id = $1`,
        [conversation.id]
      );
      // Push the bot's reply so it appears in the dashboard without a poll wait.
      await publishUpdate(conversation.id);
    }

    if (decision.lock) {
      await queryOne(
        `UPDATE instagram_conversations SET mode = 'human' WHERE id = $1`,
        [conversation.id]
      );
    }

    return decision.send ? `replied:${decision.reason}` : `silent:${decision.reason}`;
  } catch (error) {
    console.error("[webhook] Error handling message from", igsid, error);
    return "error";
  }
}
