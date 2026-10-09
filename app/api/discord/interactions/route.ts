export const dynamic = "force-dynamic";
import { verifyKey } from "discord-interactions";
import { getDb, COLL_USER, leaveRef } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("X-Signature-Ed25519");
    const timestamp = req.headers.get("X-Signature-Timestamp");
    const rawBody = await req.text();

    if (!signature || !timestamp || !process.env.DISCORD_PUBLIC_KEY) {
      return new Response("Missing signature or public key", { status: 401 });
    }

    const isValidRequest = verifyKey(
      rawBody,
      signature,
      timestamp,
      process.env.DISCORD_PUBLIC_KEY
    );

    if (!isValidRequest) {
      return new Response("Bad request signature", { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // 1. Handle PING from Discord
    if (body.type === 1) {
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Handle Application Commands
    if (body.type === 2) {
      const { name, options } = body.data;

      // ---- Command: /ลา ----
      if (name === "ลา") {
        const targetUserId = options?.find((o: any) => o.name === "user")?.value;
        const reason = options?.find((o: any) => o.name === "reason")?.value;

        if (!targetUserId || !reason) {
          return new Response(JSON.stringify({
            type: 4,
            data: { content: "❌ กรุณาระบุ user และเหตุผลให้ครบถ้วนครับ" }
          }), { headers: { "Content-Type": "application/json" } });
        }

        const db = getDb();
        // Find character name by Discord ID
        const userDoc = await db.collection(COLL_USER).doc(targetUserId).get();
        if (!userDoc.exists || !userDoc.data()?.gameUsername) {
          return new Response(JSON.stringify({
            type: 4,
            data: { content: "❌ ไม่พบตัวละครที่ผูกกับ Discord นี้ในระบบเว็บครับ" }
          }), { headers: { "Content-Type": "application/json" } });
        }

        const gameUsername = userDoc.data()?.gameUsername;
        const job = userDoc.data()?.class || "";
        
        // Save to Leave collection
        const todayStr = new Date(Date.now() + 7 * 3600 * 1000).toISOString().split('T')[0];
        await leaveRef().collection("records").add({
          name: gameUsername,
          job,
          date: todayStr,
          day: "วันนี้",
          reason,
          submittedBy: "Discord Bot",
          timestamp: Date.now(),
        });

        return new Response(JSON.stringify({
          type: 4,
          data: { content: `✅ บันทึกการลาให้ **${gameUsername}** เรียบร้อยแล้ว!\nเหตุผล: ${reason}` }
        }), { headers: { "Content-Type": "application/json" } });
      }

      // ---- Command: /เปลี่ยนชื่อ ----
      if (name === "เปลี่ยนชื่อ") {
        return new Response(JSON.stringify({
          type: 4,
          data: { content: "🚧 ระบบเปลี่ยนชื่อผ่านบอทยังอยู่ระหว่างพัฒนาครับ (เตรียมใช้งานเร็วๆ นี้)" }
        }), { headers: { "Content-Type": "application/json" } });
      }
    }

    return new Response("Unknown command", { status: 400 });
  } catch (error) {
    console.error("Discord Interaction Error:", error);
    return new Response("Internal error", { status: 500 });
  }
}
