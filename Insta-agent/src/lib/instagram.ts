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

export async function sendInstagramMessage(recipientIgsid: string, text: string) {
  const url = new URL("https://graph.instagram.com/v24.0/me/messages");
  url.searchParams.set("access_token", requireEnv("INSTAGRAM_ACCESS_TOKEN"));

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientIgsid },
      message: { text },
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
