import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { AuthPayload, UserRole } from "@/types";
import { unauthorized, forbidden, inactive } from "@/lib/server-utils";
import { computeAccess, type InactiveReason } from "@/lib/access";
import { isDiscordCheckEnabled, syncUserDiscord } from "@/lib/discord-guild";

export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  const isInsecure =
    !secret ||
    secret.trim() === "" ||
    secret === "topguild-secret-change-in-production" ||
    secret === "topguild-secure-fallback-jwt-secret-key-32-chars-2026";

  if (isInsecure) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "FATAL: Insecure or missing JWT_SECRET in production environment! Please configure a secure JWT_SECRET in environment variables."
      );
    }
    console.warn("WARNING: JWT_SECRET is not configured or is using an insecure default. Using development fallback secret.");
    return new TextEncoder().encode("topguild-secure-fallback-jwt-secret-key-32-chars-2026");
  }

  return new TextEncoder().encode(secret);
}

const COOKIE_NAME = "tg_token";
const EXPIRES_IN  = "7d";

// ── Sign JWT ─────────────────────────────────────────────────
export async function signToken(payload: AuthPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(getJwtSecret());
}

// ── Verify JWT ───────────────────────────────────────────────
export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as AuthPayload;
  } catch {
    return null;
  }
}

// ── Get current user from cookie (Server Component / API Route) ──
export async function getCurrentUser(): Promise<AuthPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ── Guard helpers for API routes ─────────────────────────────
export async function requireAuth(): Promise<
  { user: AuthPayload; errorResponse: null } | { user: null; errorResponse: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, errorResponse: unauthorized() };
  }
  // Inactive (switched off by admin, or not in Discord server / missing HUH? role)
  // → blocked on every API that uses requireAuth.
  const access = await getLiveAccess(user.discordId, user.role);
  if (access && !access.active) {
    return { user: null, errorResponse: inactive(access.reason) };
  }
  return { user, errorResponse: null };
}

// ── Live access (role + Active/Inactive) with short cache ──────
export interface LiveAccess {
  role: UserRole;
  active: boolean;
  reason: InactiveReason | null;
}

interface CachedAccess extends LiveAccess {
  expiresAt: number;
}

const ACCESS_CACHE_MS = 30_000;
// How often a user's Discord server/role status is re-checked while they use the site.
const DISCORD_RECHECK_MS = 60_000;

const userRoleCache = new Map<string, CachedAccess>();

export function invalidateUserRoleCache(discordId?: string) {
  if (discordId) {
    userRoleCache.delete(discordId);
  } else {
    userRoleCache.clear();
  }
}

export function setUserRoleForTesting(discordId: string, role: UserRole | null) {
  if (role === null) {
    userRoleCache.delete(discordId);
  } else {
    userRoleCache.set(discordId, { role, active: true, reason: null, expiresAt: Date.now() + 60000 });
  }
}

export async function getLiveAccess(discordId: string, fallbackRole: UserRole): Promise<LiveAccess | null> {
  const now = Date.now();
  const cached = userRoleCache.get(discordId);
  if (cached && cached.expiresAt > now) {
    return { role: cached.role, active: cached.active, reason: cached.reason };
  }

  try {
    const { getDb, COLL_USER } = await import("@/lib/firebase-admin");
    const userDoc = await getDb().collection(COLL_USER).doc(discordId).get();
    if (!userDoc.exists) {
      return null;
    }
    const data = userDoc.data() || {};
    const role = (data.role as UserRole) || "member";

    let fields = {
      manualActive: data.manualActive as boolean | undefined,
      discordOk: data.discordOk as boolean | undefined,
      discordReason: (data.discordReason ?? null) as "not_in_guild" | "missing_role" | null,
    };

    // Re-check Discord (in server + has HUH? role). Never throws; on Discord errors
    // the previously stored result is kept.
    if (isDiscordCheckEnabled()) {
      const synced = await syncUserDiscord(
        discordId,
        { ...fields, discordCheckedAt: data.discordCheckedAt as number | undefined },
        DISCORD_RECHECK_MS
      );
      fields = { ...fields, discordOk: synced.discordOk, discordReason: synced.discordReason ?? null };
    }

    const { active, reason } = computeAccess(fields);
    userRoleCache.set(discordId, { role, active, reason, expiresAt: now + ACCESS_CACHE_MS });
    return { role, active, reason };
  } catch {
    // Graceful fallback to avoid dropping valid sessions on transient DB errors
    return { role: fallbackRole, active: true, reason: null };
  }
}

export async function getLiveUserRole(discordId: string, fallbackRole: UserRole): Promise<UserRole | null> {
  const access = await getLiveAccess(discordId, fallbackRole);
  return access ? access.role : null;
}

export async function requireAdmin(): Promise<
  { user: AuthPayload; errorResponse: null } | { user: null; errorResponse: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, errorResponse: unauthorized() };
  }

  // Verify live role against database/cache to immediately revoke demoted/deleted admin sessions
  const access = await getLiveAccess(user.discordId, user.role);
  if (!access) {
    return { user: null, errorResponse: unauthorized() };
  }
  if (!access.active) {
    return { user: null, errorResponse: inactive(access.reason) };
  }
  const liveRole = access.role;
  if (liveRole !== "admin" && liveRole !== "owner" && liveRole !== "dev") {
    return { user: null, errorResponse: forbidden() };
  }

  return { user: { ...user, role: liveRole }, errorResponse: null };
}

export async function requireOwner(): Promise<
  { user: AuthPayload; errorResponse: null } | { user: null; errorResponse: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, errorResponse: unauthorized() };
  }

  const access = await getLiveAccess(user.discordId, user.role);
  if (!access) {
    return { user: null, errorResponse: unauthorized() };
  }
  if (!access.active) {
    return { user: null, errorResponse: inactive(access.reason) };
  }
  if (access.role !== "owner") {
    return { user: null, errorResponse: forbidden() };
  }

  return { user: { ...user, role: access.role }, errorResponse: null };
}

// ── Set auth cookie ──────────────────────────────────────────
export function authCookie(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}

// ── Clear auth cookie ─────────────────────────────────────────
export function clearAuthCookie() {
  return {
    name: COOKIE_NAME,
    value: "",
    maxAge: 0,
    path: "/",
  };
}


