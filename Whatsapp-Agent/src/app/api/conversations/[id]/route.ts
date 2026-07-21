import { NextRequest } from "next/server";
import { queryOne } from "@/lib/db";
import { publish } from "@/lib/realtime";
import type { Conversation } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (body.mode && !["agent", "human"].includes(body.mode)) {
    return Response.json({ error: "Invalid mode" }, { status: 400 });
  }

  try {
    const conversation = await queryOne<Conversation>(
      `UPDATE conversations
          SET mode = $1
        WHERE id = $2
        RETURNING *`,
      [body.mode, id]
    );

    if (!conversation) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }

    await publish("conversation:changed", conversation);
    return Response.json(conversation);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    return Response.json({ error: message }, { status: 500 });
  }
}
