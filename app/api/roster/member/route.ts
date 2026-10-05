export const dynamic = "force-dynamic";
import { getDb, COLL_USER, rosterRef, teamsRef } from "@/lib/firebase-admin";
import { requireAuth, requireAdmin, signToken, authCookie } from "@/lib/auth";
import { ok, err, forbidden, handleServerError, logAction } from "@/lib/server-utils";
import { rosterMemberUpdateSchema, rosterMemberAddSchema, validateBody } from "@/lib/validations";
import { updateMemberNameInTeamsData } from "@/lib/team-sync";

// Admin only: Add single member atomically to roster
export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const validation = validateBody(rosterMemberAddSchema, body);
    if (!validation.success) {
      return err(validation.error, 400);
    }

    const { name, job, power, warRole, discordId, gvgField } = validation.data;
    const finalDiscordId = discordId || `manual_${Date.now()}`;

    const db = getDb();
    const rRef = rosterRef();

    await db.runTransaction(async (t) => {
      const rDoc = await t.get(rRef);
      let rosterData = rDoc.exists ? (rDoc.data() as any) : {};
      if (rosterData.data) rosterData = rosterData.data;

      // Check if member already exists in any job
      for (const j of Object.keys(rosterData)) {
        if (Array.isArray(rosterData[j])) {
          const exists = rosterData[j].some((m: any) => m.name?.toLowerCase() === name.toLowerCase());
          if (exists) {
            throw new Error(`มีสมาชิกชื่อ "${name}" อยู่ใน Roster แล้ว`);
          }
        }
      }

      const newMember = {
        name,
        power: Number(power),
        role: warRole || "อิสระ (ให้ระบบจัดให้)",
        discordId: finalDiscordId,
        gvgField,
      };

      if (!rosterData[job]) rosterData[job] = [];
      rosterData[job].push(newMember);

      // Targeted write: Only write the modified job array instead of the entire document
      if (rDoc.exists && rDoc.data()?.data) {
        t.set(rRef, { data: rosterData }, { merge: true });
      } else {
        t.set(rRef, { [job]: rosterData[job] }, { merge: true });
      }
    });

    logAction({
      module: "ROSTER",
      action: "ADD_MEMBER",
      actor: auth.user.gameUsername || auth.user.discordUsername || "Admin",
      target: name,
      detail: `เพิ่มสมาชิกใหม่ชื่อ ${name} (อาชีพ: ${job})`,
    });

    return ok({ success: true, member: { name, job, power, warRole, discordId: finalDiscordId } });
  } catch (err: unknown) {
    return handleServerError(err, "Failed to add member to roster");
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireAuth();
    if (auth.errorResponse) return auth.errorResponse;
    const user = auth.user;

    const body = await req.json();
    const validation = validateBody(rosterMemberUpdateSchema, body);
    if (!validation.success) {
      return err(validation.error, 400);
    }

    const { targetDiscordId, originalName, originalJob, name, job, power, warRole, title, activity, gvgField } = validation.data;

    // Check permission: Admin, Owner, Dev, or Self
    if (user.role !== "admin" && user.role !== "owner" && user.role !== "dev" && user.discordId !== targetDiscordId) {
      return forbidden();
    }

    const db = getDb();
    const userDocRef = targetDiscordId ? db.collection(COLL_USER).doc(targetDiscordId) : null;
    const rRef = rosterRef();
    const tRef = teamsRef();
    const cRef = db.collection("settings").doc("castleTeams");
    let oldNameForLog = originalName;
    let finalDiscordId = targetDiscordId || null;

    // Update user document and roster in a single atomic transaction
    await db.runTransaction(async (t) => {
      const [userDoc, rDoc, tDoc, cDoc] = await Promise.all([
        userDocRef ? t.get(userDocRef) : Promise.resolve(null),
        t.get(rRef),
        t.get(tRef),
        t.get(cRef),
      ]);

      let rosterData = rDoc.exists ? rDoc.data() as any : {};
      if (rosterData.data) rosterData = rosterData.data; // Handle legacy wrapper

      let existingMemberData: any = {};
      let existingWarRole = "อิสระ (ให้ระบบจัดให้)";
      let previousJob: string | null = null;
      let actualOriginalName: string | null = null;

      for (const j of Object.keys(rosterData)) {
        if (Array.isArray(rosterData[j])) {
          const idx = rosterData[j].findIndex((m: any) => (targetDiscordId && m.discordId === targetDiscordId) || (originalName && m.name === originalName));
          if (idx !== -1) {
            existingMemberData = { ...rosterData[j][idx] }; // Preserve existing stats (weekly, history, previousCp, etc)
            existingWarRole = existingMemberData.role || existingWarRole;
            previousJob = j;
            actualOriginalName = existingMemberData.name;
            oldNameForLog = actualOriginalName || originalName;
            rosterData[j].splice(idx, 1);
            break;
          }
        }
      }

      let memberObj: any = { 
        ...existingMemberData,
        discordId: targetDiscordId || existingMemberData.discordId || null, 
        name, 
        power: Number(power), 
        gvgField 
      };
      
      if (title !== undefined) memberObj.title = title;
      if (activity !== undefined) memberObj.activity = activity;

      memberObj.role = (user.role === "admin" || user.role === "owner" || user.role === "dev") && warRole ? warRole : existingWarRole;

      if (!rosterData[job]) rosterData[job] = [];
      rosterData[job].push(memberObj);

      if (userDoc && userDoc.exists && userDocRef) {
        const updateData: any = { gameUsername: name, class: job, power: Number(power) };
        if (gvgField !== undefined) updateData.gvgField = gvgField;
        if ((user.role === "admin" || user.role === "owner" || user.role === "dev") && warRole) {
          updateData.warRole = warRole;
        }
        t.update(userDocRef, updateData);
      }

      // Targeted write: Only write affected job fields instead of serializing the full roster
      if (rDoc.exists && rDoc.data()?.data) {
        t.set(rRef, { data: rosterData }, { merge: true });
      } else {
        const patch: Record<string, any> = {
          [job]: rosterData[job],
        };
        if (previousJob && previousJob !== job) {
          patch[previousJob] = rosterData[previousJob];
        }
        t.set(rRef, patch, { merge: true });
      }

      // Cascade name change to teams if name changed
      const oldName = actualOriginalName || originalName;
      if (oldName && oldName !== name) {
        if (tDoc.exists) {
          const tData = tDoc.data();
          const { changed, updatedData } = updateMemberNameInTeamsData(tData, oldName, name);
          if (changed) {
            const nextVersion = typeof tData?.version === "number" ? tData.version + 1 : 1;
            t.set(tRef, { ...updatedData, version: nextVersion, updatedAt: Date.now() }, { merge: true });
          }
        }
        if (cDoc && cDoc.exists) {
          const cData = cDoc.data();
          const { changed, updatedData } = updateMemberNameInTeamsData(cData, oldName, name);
          if (changed) {
            const nextVersion = typeof cData?.version === "number" ? cData.version + 1 : 1;
            t.set(cRef, { ...updatedData, version: nextVersion, updatedAt: Date.now() }, { merge: true });
          }
        }
      }
    });

    const finalOldName = oldNameForLog || originalName;
    if (finalOldName && finalOldName !== name) {
      // Await cascades for Auxiliary Data (Auction, Dungeon, Attendance) so Serverless doesn't kill it early
      await (async () => {
        try {
          const b = db.batch();
          let count = 0;
          const did = finalDiscordId;
          
          // 1. Auction Reservations (By Discord ID + Old Name)
          const auctionDocs = new Map();
          if (did) {
            const byId = await db.collection("auctionReservations").where("userId", "==", did).get();
            byId.docs.forEach(d => auctionDocs.set(d.id, d));
          }
          const byName = await db.collection("auctionReservations").where("characterName", "==", finalOldName).get();
          byName.docs.forEach(d => auctionDocs.set(d.id, d));
          auctionDocs.forEach(doc => { b.update(doc.ref, { characterName: name }); count++; });
          
          // 2. Dungeon Queues (By Discord ID + Old Name)
          const dungeonDocs = new Map();
          if (did) {
            const dById = await db.collection("topguild-dun").doc("dungeons").collection("queues").where("userId", "==", did).get();
            dById.docs.forEach(d => dungeonDocs.set(d.id, d));
          }
          const dByName = await db.collection("topguild-dun").doc("dungeons").collection("queues").where("name", "==", finalOldName).get();
          dByName.docs.forEach(d => dungeonDocs.set(d.id, d));
          dungeonDocs.forEach(doc => { b.update(doc.ref, { name: name }); count++; });
          
          // 3. Attendance Records (Only uses name)
          const attendanceSnaps = await db.collection("topguild-system").doc("attendance").collection("records").where("name", "==", finalOldName).get();
          attendanceSnaps.docs.forEach(doc => { b.update(doc.ref, { name: name }); count++; });
          
          if (count > 0) {
            await b.commit();
            console.log(`Cascaded name change from ${finalOldName} to ${name} across ${count} auxiliary docs using Discord ID ${did}`);
          }
        } catch (err) {
          console.error("Failed to cascade name change to auxiliary docs:", err);
        }
      })();
    }

    logAction({
      module: "ROSTER",
      action: "UPDATE_MEMBER",
      actor: user.gameUsername || user.discordUsername || "Admin",
      target: name,
      detail: `อัปเดตข้อมูลของ ${name}${oldNameForLog && oldNameForLog !== name ? ` (เปลี่ยนชื่อจาก ${oldNameForLog})` : ''}`,
    });

    
    let response = ok({ success: true });
    // If the user updated their own profile, issue a new JWT token to reflect changes immediately
    if (user.discordId === targetDiscordId) {
      const newToken = await signToken({
        ...user,
        gameUsername: name,
        class: job,
        power: Number(power),
        gvgField: gvgField || user.gvgField
      });
      response.cookies.set(authCookie(newToken));
    }
    return response;

  } catch (err: unknown) {
    return handleServerError(err, "Failed to update member");
  }
}
