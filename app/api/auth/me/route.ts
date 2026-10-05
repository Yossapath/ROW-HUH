export const dynamic = "force-dynamic";
import { getCurrentUser, getLiveAccess, signToken, authCookie, clearAuthCookie } from "@/lib/auth";
import { ok, unauthorized, inactive, handleServerError } from "@/lib/server-utils";
import { getDb, COLL_USER } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const access = await getLiveAccess(user.discordId, user.role);
    const liveRole = access?.role;
    if (!access || !liveRole) {
      // User has been deleted from system -> invalidate session cookie
      const res = unauthorized();
      res.cookies.set(clearAuthCookie());
      return res;
    }

    // Inactive → 403 { code: "INACTIVE" }. The cookie is kept so the UI can show the
    // notice and the user is let back in automatically once they become Active again.
    if (!access.active) {
      return inactive(access.reason);
    }

    // Fetch live profile data from Firestore to catch admin-edited fields (power, class, gameUsername, gvgField)
    let liveUser = { ...user, role: liveRole };
    try {
      const db = getDb();
      const userDoc = await db.collection(COLL_USER).doc(user.discordId).get();
      if (userDoc.exists) {
        const data = userDoc.data() as any;
        liveUser = {
          ...liveUser,
          gameUsername: data.gameUsername ?? liveUser.gameUsername,
          class: data.class ?? liveUser.class,
          power: data.power ?? liveUser.power,
          gvgField: data.gvgField ?? liveUser.gvgField,
        };
      }
    } catch {
      // Graceful fallback — use token data if DB is unavailable
    }

    // Check if anything changed that needs a new token
    const needsNewToken =
      liveUser.role !== user.role ||
      liveUser.gameUsername !== user.gameUsername ||
      liveUser.class !== user.class ||
      liveUser.power !== user.power ||
      liveUser.gvgField !== user.gvgField;

    if (needsNewToken) {
      const newToken = await signToken(liveUser);
      const res = ok(liveUser);
      res.cookies.set(authCookie(newToken));
      return res;
    }

    return ok(liveUser);
  } catch (err: unknown) {
    return handleServerError(err, "Failed to get current user");
  }
}

