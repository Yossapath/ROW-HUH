export const dynamic = "force-dynamic";
import { verifyKey } from "discord-interactions";
import { getDb, COLL_USER, leaveRef } from "@/lib/firebase-admin";

function parseDateInput(input: string): string {
  if (!input) return "";
  const parts = input.split(/[\/\-]/);
  if (parts.length === 2) {
    const day = parts[0].padStart(2, "0");
    const month = parts[1].padStart(2, "0");
    const year = new Date().getFullYear();
    return `${year}-${month}-${day}`;
  }
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD or YYYY/MM/DD
      return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    } else {
      // DD/MM/YYYY or DD/MM/YY
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      let year = parts[2];
      if (year.length === 2) year = `20${year}`;
      // Convert Thai year to AD if someone typed 2569
      if (Number(year) > 2500) year = (Number(year) - 543).toString();
      return `${year}-${month}-${day}`;
    }
  }
  return input;
}

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("X-Signature-Ed25519");
    const timestamp = req.headers.get("X-Signature-Timestamp");
    const rawBody = await req.text();

    if (!signature || !timestamp || !process.env.DISCORD_PUBLIC_KEY) {
      return new Response("Missing signature or public key", { status: 401 });
    }

    const isValidRequest = await verifyKey(
      rawBody,
      signature,
      timestamp,
      process.env.DISCORD_PUBLIC_KEY
    );

    if (!isValidRequest) {
      return new Response("Bad request signature", { status: 401 });
    }

    const body = JSON.parse(rawBody);

    if (body.type === 1) {
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (body.type === 2) {
      const { name, options } = body.data;

      // ---- Command: /ลา or /leave ----
      if (name === "ลา" || name === "leave") {
        const targetUserId = options?.find((o: any) => o.name === "user")?.value;
        const reason = options?.find((o: any) => o.name === "reason")?.value;
        const dateInput = options?.find((o: any) => o.name === "วันลา" || o.name === "date")?.value;

        if (!targetUserId || !reason || !dateInput) {
          return new Response(JSON.stringify({
            type: 4,
            data: { content: "❌ กรุณาระบุข้อมูลให้ครบถ้วนครับ (Missing arguments)" }
          }), { headers: { "Content-Type": "application/json" } });
        }

        const formattedDate = parseDateInput(dateInput);

        const db = getDb();
        const userDoc = await db.collection(COLL_USER).doc(targetUserId).get();
        if (!userDoc.exists || !userDoc.data()?.gameUsername) {
          return new Response(JSON.stringify({
            type: 4,
            data: { content: "❌ ไม่พบตัวละครที่ผูกกับ Discord นี้ในระบบเว็บครับ (User not found in web)" }
          }), { headers: { "Content-Type": "application/json" } });
        }

        const gameUsername = userDoc.data()?.gameUsername;
        const job = userDoc.data()?.class || "";
        
        await leaveRef().collection("records").add({
          name: gameUsername,
          job,
          date: formattedDate,
          day: "-", // Can be left as dash, web doesn't strictly need it if date is correct
          reason,
          submittedBy: "Discord Bot",
          timestamp: Date.now(),
        });

        return new Response(JSON.stringify({
          type: 4,
          data: { content: `✅ บันทึกการลาให้ **${gameUsername}** เรียบร้อยแล้ว!\nวันที่: ${formattedDate}\nเหตุผล: ${reason}` }
        }), { headers: { "Content-Type": "application/json" } });
      }

      // ---- Command: /เปลี่ยนชื่อ or /changename ----
      if (name === "เปลี่ยนชื่อ" || name === "changename") {
        const targetUserId = options?.find((o: any) => o.name === "user")?.value;
        const oldName = options?.find((o: any) => o.name === "ชื่อเก่า" || o.name === "oldname")?.value;
        const newName = options?.find((o: any) => o.name === "ชื่อใหม่" || o.name === "newname")?.value;
        
        return new Response(JSON.stringify({
          type: 4,
          data: { content: `🚧 ระบบเปลี่ยนชื่อผ่านบอทยังอยู่ระหว่างพัฒนาครับ\n(รับค่า: ${oldName} -> ${newName} เรียบร้อยแล้ว รออัปเดตโค้ดจัดการ Database)` }
        }), { headers: { "Content-Type": "application/json" } });
      }
    }

    return new Response("Unknown command", { status: 400 });
  } catch (error) {
    console.error("Discord Interaction Error:", error);
    return new Response("Internal error", { status: 500 });
  }
}
