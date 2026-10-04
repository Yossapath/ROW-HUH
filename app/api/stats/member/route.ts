import { attendanceRef, dungeonsRef, rosterRef } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/auth";
import { ok, err, handleServerError } from "@/lib/server-utils";
import { trackFirestoreRead } from "@/lib/firestore-logger";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth();
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name");
    if (!name) {
      return err("Missing name parameter", 400);
    }

    // --- Run all fetches in parallel for speed ---
    const [attendanceSnap, dungeonSnap, rosterDoc] = await Promise.all([
      // 1. Attendance records
      trackFirestoreRead(
        "GET /api/stats/member",
        `attendance member ${name}`,
        () => attendanceRef().collection("records").where("name", "==", name).get()
      ),
      // 2. Dungeon queues
      trackFirestoreRead(
        "GET /api/stats/member",
        `dungeon queues member ${name}`,
        () => dungeonsRef().collection("queues").where("name", "==", name).get()
      ),
      // 3. Roster doc (for CP, weekly, activity, previousCp)
      trackFirestoreRead(
        "GET /api/stats/member",
        `roster doc`,
        () => rosterRef().get()
      ),
    ]);

    // --- 1. Process Attendance ---
    let present = 0;
    let absent = 0;
    let leave = 0;
    const warHistory: { date: string; status: string; note: string }[] = [];

    attendanceSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.status === "มา") present++;
      if (data.status === "ขาด") absent++;
      if (data.status === "ลา") leave++;
      warHistory.push({ date: data.date, status: data.status, note: data.note || "" });
    });

    // Sort by date desc in memory to avoid requiring a composite index in Firestore
    warHistory.sort((a, b) => b.date.localeCompare(a.date));

    const totalWars = present + absent + leave;
    const presentPercent = totalWars > 0 ? Math.round((present / totalWars) * 100) : 0;
    const absentPercent  = totalWars > 0 ? Math.round((absent  / totalWars) * 100) : 0;
    const leavePercent   = totalWars > 0 ? Math.round((leave   / totalWars) * 100) : 0;

    // --- 2. Process Dungeon ---
    // Some dungeons are recorded per round.
    // We sum up the rounds if rounds exist, otherwise default to 1 per completed doc.
    let totalDungeons = 0;
    dungeonSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.status === "completed") {
        totalDungeons += (data.rounds || 1);
      }
    });

    // --- 3. Extract CP + Weekly stats from roster ---
    // Roster is stored as { jobName: MemberArray[] } or { data: { jobName: MemberArray[] } }
    let cp: number | null = null;
    let previousCp: number | null = null;
    let weekly: number | null = null;
    let activity: number | null = null;
    let historyPts: number | null = null;

    if (rosterDoc.exists) {
      const rosterRaw = rosterDoc.data() as Record<string, any>;
      const actualData: Record<string, any[]> = rosterRaw.data ?? rosterRaw;
      const nameLower = name.trim().toLowerCase();

      for (const job of Object.keys(actualData)) {
        const members: any[] = actualData[job];
        if (!Array.isArray(members)) continue;
        const found = members.find(
          (m: any) => typeof m.name === "string" && m.name.trim().toLowerCase() === nameLower
        );
        if (found) {
          // Support both "power" (used in ROW-HUH roster) and "cp" (legacy field name)
          cp         = typeof found.power === "number" ? found.power : (found.cp ?? null);
          previousCp = found.previousCp ?? null;
          weekly     = found.weekly     ?? null;
          activity   = found.activity   ?? null;
          historyPts = found.history    ?? null;
          break;
        }
      }
    }

    // --- 4. Compute CP growth (current vs previous snapshot) ---
    let cpDelta: number | null = null;
    let cpPct: number | null = null;
    if (cp !== null && previousCp !== null && previousCp > 0) {
      cpDelta = cp - previousCp;
      cpPct   = parseFloat(((cpDelta / previousCp) * 100).toFixed(1));
    }

    return ok({
      name,
      // CP & weekly performance
      cp,
      previousCp,
      cpDelta,
      cpPct,
      weekly,
      activity,
      historyPts,
      // War attendance
      attendance: {
        total: totalWars,
        present,
        absent,
        leave,
        presentPercent,
        absentPercent,
        leavePercent,
        history: warHistory,
      },
      // Dungeon
      dungeon: {
        totalRuns: totalDungeons,
      },
    });

  } catch (e: unknown) {
    return handleServerError(e, "Failed to load member stats");
  }
}
