export interface InstagramProfile {
  name: string | null;
  username: string | null;
  profile_pic: string | null;
  follower_count: number | null;
  is_user_follow_business: boolean | null;
  is_business_follow_user: boolean | null;
}

// Fail fast with a clear message instead of sending access_token=undefined to
// the Graph API and getting back a cryptic OAuth error.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set — add it to .env`);
  return value;
}

// Returns null on any Graph failure (blocked account, expired token, HTML error
// page) so callers can skip the profile update instead of overwriting stored
// fields with nulls — a transient API error must never wipe real data.
export async function fetchInstagramProfile(igsid: string): Promise<InstagramProfile | null> {
  try {
    const url = new URL(`https://graph.instagram.com/v24.0/${igsid}`);
    url.searchParams.set("fields", "name,username,profile_pic,follower_count,is_user_follow_business,is_business_follow_user");
    url.searchParams.set("access_token", requireEnv("INSTAGRAM_ACCESS_TOKEN"));

    const res = await fetch(url.toString());
    const data = await res.json();

    if (!res.ok || data.error) {
      console.warn(`[instagram] Profile fetch failed for ${igsid}: ${data.error?.message || res.status}`);
      return null;
    }

    return {
      name: data.name ?? null,
      username: data.username ?? null,
      profile_pic: data.profile_pic ?? null,
      follower_count: data.follower_count ?? null,
      is_user_follow_business: data.is_user_follow_business ?? null,
      is_business_follow_user: data.is_business_follow_user ?? null,
    };
  } catch (err) {
    console.warn(`[instagram] Profile fetch threw for ${igsid}:`, err);
    return null;
  }
}

// Fetch the opener of a creator's thread straight from the Graph API. In an
// outreach conversation the OLDEST message is always the manually-sent opener,
// written in the creator's language. We use it to detect the conversation's
// language even when that opener's webhook echo was never stored (e.g. it was
// sent before the webhook was live). Returns null on any failure so the caller
// falls back to detecting from the creator's own words.
export async function fetchThreadOpener(igsid: string): Promise<string | null> {
  try {
    const token = requireEnv("INSTAGRAM_ACCESS_TOKEN");

    const convUrl = new URL("https://graph.instagram.com/v24.0/me/conversations");
    convUrl.searchParams.set("platform", "instagram");
    convUrl.searchParams.set("user_id", igsid);
    convUrl.searchParams.set("access_token", token);
    const convRes = await fetch(convUrl.toString());
    const convData = await convRes.json();
    const convId: string | undefined = convData?.data?.[0]?.id;
    if (!convRes.ok || convData.error || !convId) return null;

    const msgUrl = new URL(`https://graph.instagram.com/v24.0/${convId}/messages`);
    msgUrl.searchParams.set("fields", "message,from");
    msgUrl.searchParams.set("limit", "30");
    msgUrl.searchParams.set("access_token", token);
    const msgRes = await fetch(msgUrl.toString());
    const msgData = await msgRes.json();
    if (!msgRes.ok || msgData.error) return null;

    // The Graph API returns messages newest-first, so the last element is the
    // oldest — the opener.
    const msgs: { message?: string }[] = msgData.data || [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i]?.message) return msgs[i].message as string;
    }
    return null;
  } catch (err) {
    console.warn(`[instagram] thread opener fetch failed for ${igsid}:`, err);
    return null;
  }
}

// Optional tappable buttons shown above the composer. On Instagram, tapping one
// sends its title as a normal text message and echoes its payload back in the
// webhook (message.quick_reply.payload). Meta caps: <=13 buttons, title <=20 chars.
export interface QuickReplyButton {
  title: string;
  payload: string;
}

export async function sendInstagramMessage(
  recipientIgsid: string,
  text: string,
  quickReplies?: QuickReplyButton[]
) {
  const url = new URL("https://graph.instagram.com/v24.0/me/messages");
  url.searchParams.set("access_token", requireEnv("INSTAGRAM_ACCESS_TOKEN"));

  const message: {
    text: string;
    quick_replies?: { content_type: "text"; title: string; payload: string }[];
  } = { text };
  if (quickReplies?.length) {
    message.quick_replies = quickReplies.map((q) => ({
      content_type: "text",
      title: q.title.slice(0, 20),
      payload: q.payload,
    }));
  }

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientIgsid },
      message,
    }),
  });
  const data = await res.json();
  // The Graph API can return 200 with an `error` object in the body, and
  // non-2xx on outright rejection -- check both, otherwise a failed send
  // (expired token, outside the 24h window, etc.) looks identical to a
  // successful one and the reply silently never reaches the creator.
  if (!res.ok || data.error) {
    throw new Error(
      `Instagram send failed (${res.status}): ${data.error?.message || JSON.stringify(data)}`
    );
  }
  return data;
}

export async function sendFacebookMessage(recipientId: string, text: string) {
  const url = new URL("https://graph.facebook.com/v20.0/me/messages");
  url.searchParams.set("access_token", requireEnv("FACEBOOK_ACCESS_TOKEN"));

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      messaging_type: "RESPONSE",
      message: { text },
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(
      `Facebook send failed (${res.status}): ${data.error?.message || JSON.stringify(data)}`
    );
  }
  return data;
}
