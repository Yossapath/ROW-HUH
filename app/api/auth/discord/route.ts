export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "Discord Client ID or Redirect URI is missing." }, { status: 500 });
  }

  // Generate cryptographically secure random state for CSRF protection
  const state = crypto.randomUUID();
  const scope = "identify";
  const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${encodeURIComponent(state)}`;

  // Use an intermediate HTML page instead of a bare 302 redirect.
  // Some CDN/edge layers (including Vercel) can strip Set-Cookie headers on
  // 302 responses before the browser sees them, causing the oauth_state cookie
  // to be missing on the callback → InvalidState error.
  // Returning a 200 HTML page guarantees the browser commits the cookie first,
  // then the JS/meta-refresh navigates the user to Discord.
  const isProd = process.env.NODE_ENV === "production";
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${authUrl}">
  <title>กำลังเชื่อมต่อ Discord...</title>
</head>
<body>
  <p>กำลังเชื่อมต่อ Discord...</p>
  <script>window.location.replace(${JSON.stringify(authUrl)});</script>
</body>
</html>`;

  const res = new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
  res.cookies.set({
    name: "oauth_state",
    value: state,
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  return res;
}
