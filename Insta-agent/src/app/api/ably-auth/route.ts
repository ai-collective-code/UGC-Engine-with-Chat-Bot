import Ably from "ably";

// Token-auth endpoint for the browser Ably client. The server signs a short-
// lived token request with the secret ABLY_API_KEY and hands only that to the
// browser — the API key itself is never exposed client-side.
export async function GET() {
  const key = process.env.ABLY_API_KEY;
  if (!key) {
    return Response.json({ error: "Realtime not configured" }, { status: 501 });
  }
  try {
    const client = new Ably.Rest(key);
    const tokenRequest = await client.auth.createTokenRequest({ clientId: "dashboard" });
    return Response.json(tokenRequest);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Failed to create token";
    return Response.json({ error: detail }, { status: 500 });
  }
}
