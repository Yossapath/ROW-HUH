export const dynamic = "force-dynamic";
import { verifyKey } from "discord-interactions";
import { getDb, COLL_USER, leaveRef, rosterRef, teamsRef } from "@/lib/firebase-admin";
import { updateMemberNameInTeamsData } from "@/lib/team-sync";
import { logAction } from "@/lib/server-utils";

function parseDateInput(input: string): string {
  if (!input) return "";
  const parts = input.split(/[\/\-]/);
  
  // Format DD/MM -> YYYY-MM-DD
  if (parts.length === 2) {
    const day = parts[0].padStart(2, "0");
    const month = parts[1].padStart(2, "0");
    const year = new Date(Date.now() + 7 * 3600 * 1000).getFullYear();
    return `${year}-${month}-${day}`;
  }
  
  // Format DD/MM/YYYY or YYYY-MM-DD
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    } else {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      let year = parts[2];
      if (year.length === 2) year = `20${year}`;
      if (Number(year) > 2500) year = (Number(year) - 543).toString(); // Convert Thai year
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
            data: { content: "❌ กรุณาระบุข้อมูลให้ครบถ้วนครับ" }
          }), { headers: { "Content-Type": "application/json" } });
        }

        const formattedDate = parseDateInput(dateInput);

        const db = getDb();
        const userDoc = await db.collection(COLL_USER).doc(targetUserId).get();
        if (!userDoc.exists || !userDoc.data()?.gameUsername) {
          return new Response(JSON.stringify({
            type: 4,
            data: { content: "❌ ไม่พบตัวละครที่ผูกกับ Discord นี้ในระบบเว็บครับ" }
          }), { headers: { "Content-Type": "application/json" } });
        }

        const gameUsername = userDoc.data()?.gameUsername;
        const job = userDoc.data()?.class || "";
        
        const DAY_LABEL = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
        const d = new Date(formattedDate + "T00:00:00");
        const leaveDay = DAY_LABEL[d.getDay()] || "";

        await leaveRef().collection("records").add({
          name: gameUsername,
          job,
          date: formattedDate,
          day: leaveDay, 
          reason,
          submittedBy: "Discord Bot",
          timestamp: Date.now(),
        });

        // Add to System Log
        logAction({
          module: "LEAVE",
          action: "SUBMIT_LEAVE",
          actor: "Discord Bot",
          target: gameUsername,
          detail: `แจ้งลาวอ วันที่ ${formattedDate} (เหตุผล: ${reason})`,
          extra: { name: gameUsername, job, date: formattedDate, reason, submittedBy: "Discord Bot" }
        });

        return new Response(JSON.stringify({
          type: 4,
          data: { content: `✅ บันทึกการลาให้ **${gameUsername}** เรียบร้อยแล้ว!\n📅 วันที่: ${formattedDate}\n📝 เหตุผล: ${reason}` }
        }), { headers: { "Content-Type": "application/json" } });
      }

            // ---- Command: /เปลี่ยนชื่อ or /changename ----
      if (name === "เปลี่ยนชื่อ" || name === "changename") {
        const targetUserId = options?.find((o: any) => o.name === "user")?.value;
        let newName = options?.find((o: any) => o.name === "ชื่อใหม่" || o.name === "newname")?.value;
        
        if (!targetUserId || !newName) {
          return new Response(JSON.stringify({
            type: 4,
            data: { content: "❌ ข้อมูลไม่ครบถ้วน กรุณาระบุ user และ ชื่อใหม่" }
          }), { headers: { "Content-Type": "application/json" } });
        }

        newName = newName.trim();
        const db = getDb();
        
        try {
          let oldName = "";
          let userClass = "";
          
          // 1. ค้นหาผู้เล่นจาก User Collection ก่อน
          const userQuery = await db.collection(COLL_USER).where("discordId", "==", targetUserId).limit(1).get();
          let userDocRef = null;
          if (!userQuery.empty) {
             const ud = userQuery.docs[0];
             oldName = ud.data().gameUsername;
             userClass = ud.data().class;
             userDocRef = ud.ref;
          }
          
          // 2. ไปหาใน Roster (เผื่อกรณี manual_ user)
          const rDoc = await rosterRef().get();
          let rosterData = rDoc.exists ? rDoc.data() : null;
          let foundInRoster = false;
          
          if (rosterData) {
            for (const job of Object.keys(rosterData)) {
              if (Array.isArray(rosterData[job])) {
                const idx = rosterData[job].findIndex((m: any) => m.discordId === targetUserId);
                if (idx !== -1) {
                   oldName = rosterData[job][idx].name;
                   userClass = job;
                   rosterData[job][idx].name = newName;
                   foundInRoster = true;
                   break;
                }
              }
            }
          }

          if (!oldName) {
            return new Response(JSON.stringify({
              type: 4,
              data: { content: `❌ ไม่พบข้อมูลของผู้เล่น <@${targetUserId}> ในระบบ (ยังไม่เคยเชื่อมต่อดิสคอร์ดหรือไม่มีในรายชื่อ)` }
            }), { headers: { "Content-Type": "application/json" } });
          }

          // 3. เริ่มอัปเดตข้อมูลแบบ Batch / Transaction
          await db.runTransaction(async (t: any) => {
             // 3.1 Roster
             if (foundInRoster) {
                t.set(rosterRef(), rosterData);
             }
             
             // 3.2 User Collection
             if (userDocRef) {
                t.update(userDocRef, { gameUsername: newName });
             }
             
             // 3.3 Teams / Castle Data
             const tDoc = await t.get(teamsRef());
             if (tDoc.exists) {
               const { changed, updatedData } = updateMemberNameInTeamsData(tDoc.data(), oldName, newName);
               if (changed) {
                 const nextVersion = typeof tDoc.data()?.version === "number" ? tDoc.data().version + 1 : 1;
                 t.set(teamsRef(), { ...updatedData, version: nextVersion, updatedAt: Date.now() }, { merge: true });
               }
             }
             const cRef = db.collection("settings").doc("castleTeams");
             const cDoc = await t.get(cRef);
             if (cDoc.exists) {
               const { changed, updatedData } = updateMemberNameInTeamsData(cDoc.data(), oldName, newName);
               if (changed) {
                 const nextVersion = typeof cDoc.data()?.version === "number" ? cDoc.data().version + 1 : 1;
                 t.set(cRef, { ...updatedData, version: nextVersion, updatedAt: Date.now() }, { merge: true });
               }
             }
          });

          // 3.4 อัปเดตตารางอื่นๆ แบบ Batch ธรรมดา
          const b = db.batch();
          let count = 0;
          
          const auctionDocs = new Map();
          const byId = await db.collection("auctionReservations").where("userId", "==", targetUserId).get();
          byId.docs.forEach((d: any) => auctionDocs.set(d.id, d));
          const byName = await db.collection("auctionReservations").where("characterName", "==", oldName).get();
          byName.docs.forEach((d: any) => auctionDocs.set(d.id, d));
          auctionDocs.forEach((doc: any) => { b.update(doc.ref, { characterName: newName }); count++; });
          
          const dungeonDocs = new Map();
          const dById = await db.collection("topguild-dun").doc("dungeons").collection("queues").where("userId", "==", targetUserId).get();
          dById.docs.forEach((d: any) => dungeonDocs.set(d.id, d));
          const dByName = await db.collection("topguild-dun").doc("dungeons").collection("queues").where("name", "==", oldName).get();
          dByName.docs.forEach((d: any) => dungeonDocs.set(d.id, d));
          dungeonDocs.forEach((doc: any) => { b.update(doc.ref, { name: newName }); count++; });
          
          const attendanceSnaps = await db.collection("topguild-system").doc("attendance").collection("records").where("name", "==", oldName).get();
          attendanceSnaps.docs.forEach((doc: any) => { b.update(doc.ref, { name: newName }); count++; });
          
          if (count > 0) await b.commit();

          // 4. Log การทำงาน
          logAction({
            module: "MEMBER",
            action: "EDIT_MEMBER",
            actor: "Discord Bot",
            target: newName,
            detail: `เปลี่ยนชื่อจาก ${oldName} -> ${newName}`,
            extra: { oldName, newName, discordId: targetUserId, source: "discord_changename" }
          });

          return new Response(JSON.stringify({
            type: 4,
            data: { content: `✅ เปลี่ยนชื่อจาก **${oldName}** เป็น **${newName}** ในระบบเรียบร้อยแล้วครับ!` }
          }), { headers: { "Content-Type": "application/json" } });

        } catch (dbErr: any) {
          console.error("Change Name DB Error:", dbErr);
          return new Response(JSON.stringify({
            type: 4,
            data: { content: `❌ เกิดข้อผิดพลาดในการเปลี่ยนชื่อ: ${dbErr.message}` }
          }), { headers: { "Content-Type": "application/json" } });
        }
      }
    }

    return new Response("Unknown command", { status: 400 });
  } catch (error) {
    console.error("Discord Interaction Error:", error);
    return new Response("Internal error", { status: 500 });
  }
}
