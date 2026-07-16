import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  if (!process.env.INSTAGRAM_ACCESS_TOKEN) {
    return Response.json(
      { error: "INSTAGRAM_ACCESS_TOKEN not configured" },
      { status: 500 }
    );
  }

  try {
    // Test the Instagram Graph API with a simple /me call to verify the access token
    const url = new URL("https://graph.instagram.com/v24.0/me");
    url.searchParams.set("fields", "id,username");
    url.searchParams.set("access_token", process.env.INSTAGRAM_ACCESS_TOKEN);

    const res = await fetch(url.toString());
    const data = await res.json();

    if (!res.ok) {
      return Response.json(
        {
          status: "blocked",
          statusCode: res.status,
          error: data.error?.message || JSON.stringify(data),
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    if (data.error) {
      return Response.json(
        {
          status: "error",
          error: data.error.message,
          type: data.error.type,
          code: data.error.code,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    return Response.json({
      status: "healthy",
      account: {
        id: data.id,
        username: data.username,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json(
      {
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
