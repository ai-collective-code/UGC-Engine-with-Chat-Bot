import Ably from "ably";
import { ablyEnabled } from "@/lib/realtime";

// Mints a short-lived Ably token for the browser so the secret API key never
// ships to the client. Returns 503 when realtime is not configured; the
// dashboard treats that as "realtime disabled" and works without live updates.
export async function GET() {
  if (!ablyEnabled()) {
    return Response.json({ error: "realtime_disabled" }, { status: 503 });
  }

  const rest = new Ably.Rest({ key: process.env.ABLY_API_KEY! });
  const tokenRequest = await rest.auth.createTokenRequest({
    clientId: "dashboard",
  });

  return Response.json(tokenRequest);
}
