import { getDb, COLL_USER, rosterRef, teamsRef } from "@/lib/firebase-admin";
import { requireAuth, signToken, authCookie } from "@/lib/auth";
import { ok, err, handleServerError } from "@/lib/server-utils";
import { completeProfileSchema, validateBody } from "@/lib/validations";
import { updateMemberNameInTeamsData } from "@/lib/team-sync";

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if (auth.errorResponse) return auth.errorResponse;
    const user = auth.user;

    const body = await req.json();
    const validation = validateBody(completeProfileSchema, body);
    if (!validation.success) {
      return err(validation.error, 400);
    }

    const { gameUsername, class: userClass, power, gvgField } = validation.data;

    const db = getDb();
    const userRef = db.collection(COLL_USER).doc(user.discordId);
    const rosterDocRef = rosterRef();
    const tRef = teamsRef();

    let actualOldName: string | null = null;
    await db.runTransaction(async (t) => {
      const [userDoc, rosterDoc, tDoc] = await Promise.all([
        t.get(userRef),
        t.get(rosterDocRef),
        t.get(tRef),
      ]);

      let rosterData = rosterDoc.exists ? (rosterDoc.data() || {}) : {};
      if (rosterData.data) rosterData = rosterData.data;
      
      let oldName: string | null = null;
      if (userDoc.exists) {
        oldName = userDoc.data()?.gameUsername;
        actualOldName = oldName;
      }

      let existingMemberData: any = {};
      let existingWarRole = "อิสระ (ให้ระบบจัดให้)";

      // Remove this member from every job bucket first, but extract their existing data
      // so we can preserve stats like weekly, history, previousCp, etc.
      for (const jobKey of Object.keys(rosterData)) {
        if (!Array.isArray(rosterData[jobKey])) continue;
        
        const idx = rosterData[jobKey].findIndex(
          (m: any) => m.discordId === user.discordId || (m.name && m.name.toLowerCase() === gameUsername.toLowerCase())
        );
        
        if (idx !== -1) {
          existingMemberData = { ...rosterData[jobKey][idx] };
          existingWarRole = existingMemberData.role || existingWarRole;
          rosterData[jobKey].splice(idx, 1); // Remove from old job bucket
        }
      }

      if (!rosterData[userClass]) {
        rosterData[userClass] = [];
      }

      const memberObj = {
        ...existingMemberData,
        discordId: user.discordId, 
        discordUsername: user.discordUsername,
        name: gameUsername, 
        power: Number(power),
        role: existingWarRole,
        gvgField
      };

      rosterData[userClass].push(memberObj);

      if (userDoc.exists) {
        t.update(userRef, {
          gameUsername,
          class: userClass,
          power: Number(power),
          gvgField,
        });
      } else {
        t.set(userRef, {
          discordId: user.discordId,
          discordUsername: user.discordUsername,
          gameUsername,
          class: userClass,
          power: Number(power),
          role: user.role || "member",
          gvgField,
        }, { merge: true });
      }

      t.set(rosterDocRef, rosterData);
      
      if (oldName && oldName !== gameUsername) {
        if (tDoc.exists) {
          const tData = tDoc.data();
          const { changed, updatedData } = updateMemberNameInTeamsData(tData, oldName, gameUsername);
          if (changed) {
            const nextVersion = typeof tData?.version === "number" ? tData.version + 1 : 1;
            t.set(tRef, { ...updatedData, version: nextVersion, updatedAt: Date.now() }, { merge: true });
          }
        }
        
        const cRef = db.collection("settings").doc("castleTeams");
        const cDoc = await t.get(cRef);
        if (cDoc.exists) {
          const cData = cDoc.data();
          const { changed, updatedData } = updateMemberNameInTeamsData(cData, oldName, gameUsername);
          if (changed) {
            const nextVersion = typeof cData?.version === "number" ? cData.version + 1 : 1;
            t.set(cRef, { ...updatedData, version: nextVersion, updatedAt: Date.now() }, { merge: true });
          }
        }
      }
    });

    if (actualOldName && actualOldName !== gameUsername) {
      await (async () => {
        try {
          const b = db.batch();
          let count = 0;
          
          const auctionSnaps = await db.collection("auctionReservations").where("characterName", "==", actualOldName).get();
          auctionSnaps.docs.forEach(doc => { b.update(doc.ref, { characterName: gameUsername }); count++; });
          
          const dungeonSnaps = await db.collection("topguild-dun").doc("dungeons").collection("queues").where("name", "==", actualOldName).get();
          dungeonSnaps.docs.forEach(doc => { b.update(doc.ref, { name: gameUsername }); count++; });
          
          const attendanceSnaps = await db.collection("topguild-system").doc("attendance").collection("records").where("name", "==", actualOldName).get();
          attendanceSnaps.docs.forEach(doc => { b.update(doc.ref, { name: gameUsername }); count++; });
          
          if (count > 0) await b.commit();
        } catch (err) {
          console.error("Failed to cascade in complete-profile:", err);
        }
      })();
    }

    const payload = {
      ...user,
      gameUsername,
      class: userClass,
      power: Number(power),
      gvgField,
      isProfileComplete: true,
    };

    const token = await signToken(payload);
    const res = ok({ user: payload, message: "บันทึกข้อมูลสำเร็จ" });
    res.cookies.set(authCookie(token));

    return res;
  } catch (e: unknown) {
    return handleServerError(e, "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
  }
}
