// ============================================================
// Access rules — Active / Inactive
// ------------------------------------------------------------
// A user may use the website only when BOTH are true:
//   1. manualActive !== false   (admin has not switched them off)
//   2. discordOk    !== false   (in the Discord server AND has the HUH? role)
//
// This file is pure (no Firebase / Next imports) so it can be unit-tested.
// ============================================================

export type DiscordReason = "not_in_guild" | "missing_role";
export type InactiveReason = "manual" | DiscordReason;

export interface DiscordFields {
  discordOk?: boolean;
  discordReason?: DiscordReason | null;
  discordCheckedAt?: number;
}

export interface AccessFields {
  manualActive?: boolean;
  discordOk?: boolean;
  discordReason?: DiscordReason | null;
}

export interface AccessResult {
  active: boolean;
  reason: InactiveReason | null;
}

export const INACTIVE_MESSAGES: Record<InactiveReason, string> = {
  manual: "บัญชีของคุณถูกปิดการใช้งานโดยผู้ดูแล (Inactive)",
  not_in_guild: "คุณไม่ได้อยู่ในเซิร์ฟเวอร์ Discord ของกิลด์ จึงไม่สามารถใช้งานเว็บได้",
  missing_role: "คุณไม่มียศ HUH? ใน Discord จึงไม่สามารถใช้งานเว็บได้",
};

export function inactiveMessage(reason: InactiveReason | null | undefined): string {
  return INACTIVE_MESSAGES[reason ?? "manual"];
}

/**
 * Legacy users (no fields stored yet) are treated as active until the first
 * Discord check runs, so rolling this feature out never locks anyone out.
 */
export function computeAccess(f: AccessFields): AccessResult {
  if (f.manualActive === false) return { active: false, reason: "manual" };
  if (f.discordOk === false) {
    return { active: false, reason: f.discordReason ?? "not_in_guild" };
  }
  return { active: true, reason: null };
}

/** `member` is the Discord guild-member object, or null when 404 (not in server). */
export function evaluateMember(
  member: { roles?: string[] } | null,
  roleId: string
): { discordOk: boolean; discordReason: DiscordReason | null } {
  if (!member) return { discordOk: false, discordReason: "not_in_guild" };
  if (!Array.isArray(member.roles) || !member.roles.includes(roleId)) {
    return { discordOk: false, discordReason: "missing_role" };
  }
  return { discordOk: true, discordReason: null };
}
