export const dynamic = "force-dynamic";
import { getDb, COLL_USER, rosterRef } from "@/lib/firebase-admin";
import { requireAdmin, invalidateUserRoleCache } from "@/lib/auth";
import { ok, err, handleServerError, logAction } from "@/lib/server-utils";
import { userRoleUpdateSchema, userDeleteSchema, userStatusUpdateSchema, validateBody } from "@/lib/validations";
import { computeAccess } from "@/lib/access";
import { syncUsersBulk } from "@/lib/discord-guild";

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const limitParam = Math.min(Math.max(Number(searchParams.get("limit")) || 150, 1), 300);

    const db = getDb();
    const snapshot = await db.collection(COLL_USER).limit(limitParam).get();
    const users: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      users.push({ discordId: doc.id, ...data });
    });

    // Refresh Discord status (in server + HUH? role) for the list in one bulk request,
    // so members who were demoted / kicked show up as Inactive automatically.
    const synced = await syncUsersBulk(users);
    for (const u of users) {
      const fresh = synced.get(u.discordId);
      if (fresh) {
        u.discordOk = fresh.discordOk;
        u.discordReason = fresh.discordReason ?? null;
        if (fresh.discordCheckedAt) u.discordCheckedAt = fresh.discordCheckedAt;
      }
      const { active, reason } = computeAccess(u);
      u.isActive = active;
      u.inactiveReason = reason;
    }
    if (synced.size > 0) invalidateUserRoleCache();

    return ok(users);
  } catch (err: unknown) {
    return handleServerError(err, "Failed to load users");
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const validation = validateBody(userRoleUpdateSchema, body);
    if (!validation.success) {
      return err(validation.error, 400);
    }

    const { discordId, role } = validation.data;

    // 1. Prevent self-role mutation (prevents accidental self-lockout and self-privilege escalation)
    if (auth.user.discordId === discordId) {
      return err("ไม่สามารถเปลี่ยนบทบาทของตนเองได้", 400);
    }

    const db = getDb();
    const userRef = db.collection(COLL_USER).doc(discordId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return err("ไม่พบผู้ใช้งานนี้ในระบบ", 404);
    }

    const targetUser = userDoc.data() || {};
    const currentTargetRole = targetUser.role || "member";
    const isCallerOwner = auth.user.role === "owner";
    const isCallerDev = auth.user.role === "dev";

    // 2. Role management permissions
    if (!isCallerOwner) {
      if (role === "owner") {
        return err("ไม่สามารถแต่งตั้งบทบาท Owner ได้ (เฉพาะ Owner เท่านั้น)", 403);
      }
      if (currentTargetRole === "owner") {
        return err("ไม่สามารถแก้ไขบทบาทของผู้ใช้งานระดับ Owner ได้", 403);
      }
      if (isCallerDev) {
        if (currentTargetRole === "dev") {
          return err("Dev ไม่สามารถแก้ไขบทบาทของ Dev คนอื่นได้", 403);
        }
      } else {
        if (currentTargetRole === "admin" || currentTargetRole === "dev") {
          return err("แอดมินไม่สามารถแก้ไขบทบาทของ Admin/Dev คนอื่นได้", 403);
        }
      }
    }

    // 3. If caller is Owner and is demoting an Owner, ensure guild has at least 1 remaining Owner
    if (isCallerOwner && currentTargetRole === "owner" && role !== "owner") {
      const ownersSnap = await db.collection(COLL_USER).where("role", "==", "owner").get();
      if (ownersSnap.size <= 1) {
        return err("ไม่สามารถลดบทบาท Owner คนสุดท้ายของระบบได้", 400);
      }
    }

    await userRef.update({ role });
    invalidateUserRoleCache(discordId);

    logAction({
      module: "AUTH",
      action: "UPDATE_ROLE",
      actor: auth.user.gameUsername || auth.user.discordUsername || "Admin",
      target: discordId,
      detail: `เปลี่ยนบทบาทของ ${targetUser.gameUsername || targetUser.discordUsername || discordId} (${discordId}) จาก ${currentTargetRole} เป็น ${role}`,
    });

    return ok({ success: true });
  } catch (err: unknown) {
    return handleServerError(err, "Failed to update user role");
  }
}

// PATCH — admin switches a user Active / Inactive (manual switch).
// The user is only really "Active" when this switch is on AND they pass the Discord check.
export async function PATCH(req: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const validation = validateBody(userStatusUpdateSchema, body);
    if (!validation.success) {
      return err(validation.error, 400);
    }
    const { discordId, active } = validation.data;

    if (auth.user.discordId === discordId) {
      return err("ไม่สามารถเปลี่ยนสถานะของตนเองได้", 400);
    }

    const db = getDb();
    const userRef = db.collection(COLL_USER).doc(discordId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return err("ไม่พบผู้ใช้งานนี้ในระบบ", 404);
    }

    const targetUser = userDoc.data() || {};
    const targetRole = targetUser.role || "member";
    const isCallerOwner = auth.user.role === "owner";
    const isCallerDev = auth.user.role === "dev";

    if (!isCallerOwner) {
      if (targetRole === "owner") {
        return err("ไม่สามารถเปลี่ยนสถานะของผู้ใช้งานระดับ Owner ได้", 403);
      }
      if (isCallerDev) {
        if (targetRole === "dev") {
          return err("Dev ไม่สามารถเปลี่ยนสถานะของ Dev คนอื่นได้", 403);
        }
      } else if (targetRole === "admin" || targetRole === "dev") {
        return err("แอดมินไม่สามารถเปลี่ยนสถานะของ Admin/Dev ได้", 403);
      }
    }

    await userRef.update({ manualActive: active });
    invalidateUserRoleCache(discordId);

    logAction({
      module: "AUTH",
      action: active ? "SET_ACTIVE" : "SET_INACTIVE",
      actor: auth.user.gameUsername || auth.user.discordUsername || "Admin",
      target: discordId,
      detail: `ตั้งสถานะ ${targetUser.gameUsername || targetUser.discordUsername || discordId} (${discordId}) เป็น ${active ? "Active" : "Inactive"}`,
    });

    return ok({ success: true, manualActive: active });
  } catch (err: unknown) {
    return handleServerError(err, "Failed to update user status");
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const validation = validateBody(userDeleteSchema, body);
    if (!validation.success) {
      return err(validation.error, 400);
    }

    const { discordId } = validation.data;

    // 1. Prevent deleting self (prevents locking own account)
    if (auth.user.discordId === discordId) {
      return err("ไม่สามารถลบบัญชีของตนเองได้", 400);
    }

    const db = getDb();
    const userRef = db.collection(COLL_USER).doc(discordId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return err("ไม่พบผู้ใช้งานนี้ในระบบ", 404);
    }

    const targetUser = userDoc.data() || {};
    const targetRole = targetUser.role || "member";
    const isCallerOwner = auth.user.role === "owner";
    const isCallerDev = auth.user.role === "dev";

    // 2. Role management permissions
    if (!isCallerOwner) {
      if (targetRole === "owner") {
        return err("ไม่สามารถลบผู้ใช้งานระดับ Owner ได้", 403);
      }
      if (isCallerDev) {
        if (targetRole === "dev") {
          return err("Dev ไม่สามารถลบผู้ใช้งานระดับ Dev คนอื่นได้", 403);
        }
      } else {
        if (targetRole === "admin" || targetRole === "dev") {
          return err("แอดมินไม่สามารถลบผู้ใช้งานระดับ Admin/Dev ได้", 403);
        }
      }
    }

    // 3. If target is an Owner, ensure not the last Owner
    if (targetRole === "owner") {
      const ownersSnap = await db.collection(COLL_USER).where("role", "==", "owner").get();
      if (ownersSnap.size <= 1) {
        return err("ไม่สามารถลบ Owner คนสุดท้ายของระบบได้", 400);
      }
    }

    // 4. Delete user and remove from roster atomically
    const rRef = rosterRef();
    await db.runTransaction(async (t) => {
      // Get roster data
      const rDoc = await t.get(rRef);
      if (rDoc.exists) {
        const docData = rDoc.data() as any;
        const rosterData = docData.data ? docData.data : docData;
        const isLegacyWrapper = !!docData.data;
        const modifiedJobs: string[] = [];

        for (const j of Object.keys(rosterData)) {
          if (Array.isArray(rosterData[j])) {
            const originalLen = rosterData[j].length;
            rosterData[j] = rosterData[j].filter((m: any) => m.discordId !== discordId);
            if (rosterData[j].length !== originalLen) {
              modifiedJobs.push(j);
            }
          }
        }

        if (modifiedJobs.length > 0) {
          if (isLegacyWrapper) {
            t.set(rRef, { data: rosterData }, { merge: true });
          } else {
            const patch: Record<string, any> = {};
            for (const j of modifiedJobs) {
              patch[j] = rosterData[j];
            }
            t.set(rRef, patch, { merge: true });
          }
        }
      }

      // Delete user
      t.delete(userRef);
    });

    invalidateUserRoleCache(discordId);

    logAction({
      module: "AUTH",
      action: "DELETE_USER",
      actor: auth.user.gameUsername || auth.user.discordUsername || "Admin",
      target: discordId,
      detail: `ลบผู้ใช้ ${targetUser?.gameUsername || targetUser?.discordUsername || discordId} (${discordId})`,
    });

    return ok({ success: true });
  } catch (err: unknown) {
    return handleServerError(err, "Failed to delete user");
  }
}
