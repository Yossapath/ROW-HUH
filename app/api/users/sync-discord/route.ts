export const dynamic = "force-dynamic";
import { getDb, COLL_USER } from "@/lib/firebase-admin";
import { requireAdmin, invalidateUserRoleCache } from "@/lib/auth";
import { ok, err, unauthorized, handleServerError } from "@/lib/server-utils";
import { isDiscordCheckEnabled, syncUsersBulk } from "@/lib/discord-guild";
import { computeAccess } from "@/lib/access";

async function runSync() {
  if (!isDiscordCheckEnabled()) {
    return err("ยังไม่ได้ตั้งค่า DISCORD_BOT_TOKEN / DISCORD_GUILD_ID", 400);
  }
  const snap = await getDb().collection(COLL_USER).get();
  const users = snap.docs.map((d) => ({ discordId: d.id, ...(d.data() as any) }));
  const synced = await syncUsersBulk(users, { force: true });
  if (synced.size === 0 && users.length > 0) {
    return err("ซิงค์กับ Discord ไม่สำเร็จ (ตรวจสอบ Bot token / Server Members Intent)", 502);
  }
  invalidateUserRoleCache();

  let inactiveCount = 0;
  for (const u of users) {
    const f = synced.get(u.discordId);
    const { active } = computeAccess({
      manualActive: u.manualActive,
      discordOk: f ? f.discordOk : u.discordOk,
      discordReason: f ? f.discordReason : u.discordReason,
    });
    if (!active) inactiveCount++;
  }
  return ok({ checked: users.length, inactive: inactiveCount });
}

// GET — scheduled job (e.g. Vercel Cron). Requires `Authorization: Bearer <CRON_SECRET>`.
export async function GET(req: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
      return unauthorized();
    }
    return await runSync();
  } catch (e: unknown) {
    return handleServerError(e, "Failed to sync Discord status");
  }
}

// POST — admin presses "ซิงค์ Discord" on the user management page.
export async function POST() {
  try {
    const auth = await requireAdmin();
    if (auth.errorResponse) return auth.errorResponse;
    return await runSync();
  } catch (e: unknown) {
    return handleServerError(e, "Failed to sync Discord status");
  }
}
