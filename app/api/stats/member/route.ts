import { attendanceRef, dungeonsRef } from "@/lib/firebase-admin";
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

    // 1. Fetch Attendance History
    const attendanceSnap = await trackFirestoreRead(
      "GET /api/stats/member",
      `attendance member ${name}`,
      () => attendanceRef().collection("records").where("name", "==", name).get()
    );

    let present = 0;
    let absent = 0;
    let leave = 0;
    const warHistory: { date: string; status: string; note: string }[] = [];

    attendanceSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.status === "มา") present++;
      if (data.status === "ขาด") absent++;
      if (data.status === "ลา") leave++;
      
      warHistory.push({
        date: data.date,
        status: data.status,
        note: data.note || "",
      });
    });

    // Sort by date desc in memory to avoid requiring a composite index in Firestore
    warHistory.sort((a, b) => b.date.localeCompare(a.date));

    const totalWars = present + absent + leave;
    const presentPercent = totalWars > 0 ? Math.round((present / totalWars) * 100) : 0;
    const absentPercent = totalWars > 0 ? Math.round((absent / totalWars) * 100) : 0;
    const leavePercent = totalWars > 0 ? Math.round((leave / totalWars) * 100) : 0;

    // 2. Fetch Dungeon History
    const dungeonSnap = await trackFirestoreRead(
      "GET /api/stats/member",
      `dungeon queues member ${name}`,
      () => dungeonsRef().collection("queues")
              .where("name", "==", name)
              .get()
    );
    
    // Some dungeons are recorded per round. 
    // We sum up the rounds if rounds exist, otherwise default to 1 per completed doc.
    let totalDungeons = 0;
    dungeonSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.status === "completed") {
        totalDungeons += (data.rounds || 1);
      }
    });

    return ok({
      name,
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
      dungeon: {
        totalRuns: totalDungeons,
      }
    });

  } catch (e: unknown) {
    return handleServerError(e, "Failed to load member stats");
  }
}
