// ============================================================
// Discord guild check — is the user in the server AND have the HUH? role?
// Uses a BOT token (not the user's OAuth token) so it can be re-checked at
// any time, not only at login.
//
// Env:
//   DISCORD_BOT_TOKEN      bot token (bot must be in the guild)
//   DISCORD_GUILD_ID       server id
//   DISCORD_HUH_ROLE_ID    id of the "HUH?" role (preferred)
//   DISCORD_HUH_ROLE_NAME  fallback when ROLE_ID is empty (default "HUH?")
//
// If BOT_TOKEN or GUILD_ID is missing the check is DISABLED (everyone passes
// the Discord part) so a missing env var never locks the whole guild out.
// If Discord itself errors, the previous stored state is kept (fail-open).
// ============================================================
import { evaluateMember, type DiscordFields } from "@/lib/access";

const API = "https://discord.com/api/v10";
const WRITE_REFRESH_MS = 30 * 60 * 1000; // re-write an unchanged status at most every 30 min
const BULK_TTL_MS = 60 * 1000;

export function isDiscordCheckEnabled(): boolean {
  return !!(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_GUILD_ID);
}

function headers() {
  return { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` };
}

async function discordFetch(path: string): Promise<Response> {
  let res = await fetch(`${API}${path}`, { headers: headers(), cache: "no-store" });
  if (res.status === 429) {
    const body = await res.json().catch(() => ({}));
    const waitMs = Math.ceil(((body as any).retry_after ?? 1) * 1000);
    if (waitMs <= 3000) {
      await new Promise((r) => setTimeout(r, waitMs));
      res = await fetch(`${API}${path}`, { headers: headers(), cache: "no-store" });
    }
  }
  return res;
}

// ── Role id (by id, or look up by name once and cache) ──────────
let roleCache: { id: string; at: number } | null = null;

export async function resolveRoleIds(): Promise<string[]> {
  const fromEnv = process.env.DISCORD_HUH_ROLE_ID?.trim();
  if (fromEnv) return fromEnv.split(",").map(r => r.trim()).filter(Boolean);

  if (roleCache && Date.now() - roleCache.at < 10 * 60 * 1000) return [roleCache.id];

  const wanted = (process.env.DISCORD_HUH_ROLE_NAME || "HUH?").trim().toLowerCase();
  const res = await discordFetch(`/guilds/${process.env.DISCORD_GUILD_ID}/roles`);
  if (!res.ok) throw new Error(`Discord roles lookup failed (${res.status})`);
  const roles = (await res.json()) as Array<{ id: string; name: string }>;
  const found = roles.find((r) => r.name.trim().toLowerCase() === wanted);
  if (!found) throw new Error(`Discord role "${wanted}" not found in guild`);
  roleCache = { id: found.id, at: Date.now() };
  return [found.id];
}

// ── Single user ─────────────────────────────────────────────────
async function fetchMember(discordId: string): Promise<{ roles?: string[] } | null> {
  const res = await discordFetch(
    `/guilds/${process.env.DISCORD_GUILD_ID}/members/${encodeURIComponent(discordId)}`
  );
  if (res.status === 404) return null; // not in the server
  if (!res.ok) throw new Error(`Discord member lookup failed (${res.status})`);
  return res.json();
}

export async function checkDiscordAccess(discordId: string) {
  const roleIds = await resolveRoleIds();
  const member = await fetchMember(discordId);
  return evaluateMember(member, roleIds);
}

// ── Persist ─────────────────────────────────────────────────────
function shouldWrite(current: DiscordFields, next: DiscordFields, now: number): boolean {
  return (
    current.discordOk !== next.discordOk ||
    (current.discordReason ?? null) !== (next.discordReason ?? null) ||
    !current.discordCheckedAt ||
    now - current.discordCheckedAt > WRITE_REFRESH_MS
  );
}

const lastCheck = new Map<string, number>(); // in-memory throttle per user
const inflight = new Map<string, Promise<DiscordFields>>();

/**
 * Re-check one user against Discord (throttled by `maxAgeMs`) and store the
 * result in Firestore when it changed. Never throws — on any Discord error the
 * previously stored state is returned unchanged.
 */
export function syncUserDiscord(
  discordId: string,
  current: DiscordFields,
  maxAgeMs: number
): Promise<DiscordFields> {
  if (!isDiscordCheckEnabled()) return Promise.resolve(current);

  const now = Date.now();
  const last = lastCheck.get(discordId) ?? 0;
  if (current.discordOk !== undefined && maxAgeMs > 0 && now - last < maxAgeMs) {
    return Promise.resolve(current);
  }

  const pending = inflight.get(discordId);
  if (pending) return pending;

  const job = (async (): Promise<DiscordFields> => {
    try {
      const result = await checkDiscordAccess(discordId);
      lastCheck.set(discordId, Date.now());
      const next: DiscordFields = { ...result, discordCheckedAt: Date.now() };
      if (shouldWrite(current, next, Date.now())) {
        const { getDb, COLL_USER } = await import("@/lib/firebase-admin");
        await getDb().collection(COLL_USER).doc(discordId).set(next, { merge: true });
        return next;
      }
      return { ...next, discordCheckedAt: current.discordCheckedAt };
    } catch (e) {
      console.error("[discord-guild] check failed, keeping previous state:", e);
      return current;
    } finally {
      inflight.delete(discordId);
    }
  })();

  inflight.set(discordId, job);
  return job;
}

// ── Bulk (admin list / cron): 1 request per 1000 members ────────
let bulkCache: { at: number; members: Map<string, string[]> } | null = null;

async function fetchAllMembers(force: boolean): Promise<Map<string, string[]>> {
  if (!force && bulkCache && Date.now() - bulkCache.at < BULK_TTL_MS) return bulkCache.members;

  const members = new Map<string, string[]>();
  let after = "0";
  for (let page = 0; page < 50; page++) {
    const res = await discordFetch(
      `/guilds/${process.env.DISCORD_GUILD_ID}/members?limit=1000&after=${after}`
    );
    // Needs the "Server Members Intent" enabled for the bot in the Developer Portal.
    if (!res.ok) throw new Error(`Discord member list failed (${res.status})`);
    const batch = (await res.json()) as Array<{ user?: { id: string }; roles?: string[] }>;
    for (const m of batch) if (m.user?.id) members.set(m.user.id, m.roles ?? []);
    if (batch.length < 1000) break;
    after = batch[batch.length - 1].user!.id;
  }
  bulkCache = { at: Date.now(), members };
  return members;
}

export async function syncUsersBulk(
  users: Array<{ discordId: string } & DiscordFields>,
  opts: { force?: boolean } = {}
): Promise<Map<string, DiscordFields>> {
  const out = new Map<string, DiscordFields>();
  if (!isDiscordCheckEnabled() || users.length === 0) return out;

  try {
    const roleIds = await resolveRoleIds();
    const members = await fetchAllMembers(!!opts.force);
    const now = Date.now();

    const writes: Array<{ id: string; fields: DiscordFields }> = [];
    for (const u of users) {
      const roles = members.get(u.discordId);
      const res = evaluateMember(roles ? { roles } : null, roleIds);
      const next: DiscordFields = { ...res, discordCheckedAt: now };
      lastCheck.set(u.discordId, now);
      if (shouldWrite(u, next, now)) {
        writes.push({ id: u.discordId, fields: next });
        out.set(u.discordId, next);
      } else {
        out.set(u.discordId, { ...next, discordCheckedAt: u.discordCheckedAt });
      }
    }

    if (writes.length > 0) {
      const { getDb, COLL_USER } = await import("@/lib/firebase-admin");
      const db = getDb();
      for (let i = 0; i < writes.length; i += 400) {
        const batch = db.batch();
        for (const w of writes.slice(i, i + 400)) {
          batch.set(db.collection(COLL_USER).doc(w.id), w.fields, { merge: true });
        }
        await batch.commit();
      }
    }
  } catch (e) {
    console.error("[discord-guild] bulk sync failed, keeping previous state:", e);
    return new Map(); // empty → callers keep what is stored
  }
  return out;
}
