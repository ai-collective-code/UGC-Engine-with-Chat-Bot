import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

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

  // Require a valid mode outright — `update({ mode: undefined })` would reach
  // PostgREST as an empty update and surface as a confusing 500.
  if (!["agent", "human"].includes(body.mode)) {
    return Response.json({ error: "mode must be 'agent' or 'human'" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("instagram_conversations")
    .update({ mode: body.mode })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}
