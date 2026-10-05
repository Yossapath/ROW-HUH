export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// Temporary diagnostic endpoint — remove after debugging
export async function GET() {
  const user = await getCurrentUser();

  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId  = process.env.DISCORD_GUILD_ID;
  const roleId   = process.env.DISCORD_HUH_ROLE_ID;
  const API = "https://discord.com/api/v10";
  const h = { Authorization: `Bot ${botToken}` };

  const result: Record<string, unknown> = {
    env: {
      hasBotToken:  !!botToken,
      guildId,
      roleId,
    },
    user: user ? { discordId: user.discordId, discordUsername: user.discordUsername } : null,
  };

  if (!botToken || !guildId) {
    return NextResponse.json({ ...result, error: "Missing env vars" }, { status: 200 });
  }

  // 1. Check the guild itself (bot must be a member)
  try {
    const guildRes = await fetch(`${API}/guilds/${guildId}`, { headers: h, cache: "no-store" });
    result.guildCheck = { status: guildRes.status, ok: guildRes.ok };
    if (guildRes.ok) {
      const g = await guildRes.json() as { name?: string; id?: string };
      result.guildName = g.name;
    } else {
      result.guildError = await guildRes.text();
    }
  } catch (e: any) {
    result.guildException = e?.message;
  }

  // 2. Check the current user as a member
  if (user?.discordId) {
    try {
      const memberRes = await fetch(`${API}/guilds/${guildId}/members/${user.discordId}`, { headers: h, cache: "no-store" });
      result.memberCheck = { status: memberRes.status, ok: memberRes.ok };
      if (memberRes.ok) {
        const m = await memberRes.json() as { roles?: string[]; user?: { username?: string } };
        result.memberRoles = m.roles;
        result.memberUsername = m.user?.username;
        result.hasHuhRole = roleId ? m.roles?.includes(roleId) : "roleId not set";
      } else {
        result.memberError = await memberRes.text();
      }
    } catch (e: any) {
      result.memberException = e?.message;
    }
  }

  // 3. Check bot info
  try {
    const botRes = await fetch(`${API}/users/@me`, { headers: h, cache: "no-store" });
    if (botRes.ok) {
      const b = await botRes.json() as { username?: string; id?: string };
      result.botInfo = { username: b.username, id: b.id };
    } else {
      result.botError = await botRes.text();
    }
  } catch (e: any) {
    result.botException = e?.message;
  }

  return NextResponse.json(result, { status: 200 });
}
