import { NextRequest } from "next/server";
import { getSendStatus, MAX_SENDS_PER_HOUR } from "@/lib/rate-limiter";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const status = getSendStatus(id);
  const remainingQuota = Math.max(0, MAX_SENDS_PER_HOUR - status.sendsThisHour);
  // The 20-minute spacing rule can block a send even when hourly quota remains —
  // report whichever restriction bites first so the UI never lies.
  const spacingBlocked = (status.spacingBlockMs ?? 0) > 0;

  let message: string;
  if (status.sendsThisHour === 0) {
    message = "Ready to send";
  } else if (remainingQuota === 0) {
    message = `Quota exhausted. Next send available in ${Math.round((status.nextAvailableIn || 0) / 60000)} minutes.`;
  } else if (spacingBlocked) {
    message = `${remainingQuota} send${remainingQuota === 1 ? "" : "s"} remaining, but 20-minute spacing applies — next send in ${Math.round((status.spacingBlockMs || 0) / 60000)} minutes.`;
  } else {
    message = `${remainingQuota} send${remainingQuota === 1 ? "" : "s"} remaining this hour.`;
  }

  return Response.json({
    conversationId: id,
    sendsThisHour: status.sendsThisHour,
    maxPerHour: MAX_SENDS_PER_HOUR,
    remainingQuota,
    nextResetIn: status.nextAvailableIn
      ? Math.round(status.nextAvailableIn / 1000)
      : null,
    spacingBlockSeconds: spacingBlocked
      ? Math.round((status.spacingBlockMs || 0) / 1000)
      : null,
    message,
  });
}
