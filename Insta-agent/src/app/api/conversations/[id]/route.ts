import { NextRequest } from "next/server";
import { queryOne } from "@/lib/db";
import { publishUpdate } from "@/lib/realtime";
import type { Conversation } from "@/lib/types";

export async function PATCH(
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

  // Require a valid mode outright so a bad value can't reach the UPDATE.
  if (!["agent", "human"].includes(body.mode)) {
    return Response.json({ error: "mode must be 'agent' or 'human'" }, { status: 400 });
  }

  try {
    const updated = await queryOne<Conversation>(
      `UPDATE instagram_conversations
       SET mode = $1, updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [body.mode, id]
    );
    if (!updated) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }
    // Push so the AI/Human badge flips on every open dashboard immediately.
    await publishUpdate(id);
    return Response.json(updated);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Failed to update conversation";
    return Response.json({ error: detail }, { status: 500 });
  }
}
