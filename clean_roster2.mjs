import admin from "firebase-admin";
import fs from "fs";

// Read from .env.local
const envFile = fs.readFileSync(".env.local", "utf8");
const envVars = {};
envFile.split("\n").forEach(line => {
    const [key, ...val] = line.split("=");
    if (key && val) {
        let value = val.join("=").trim();
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
        }
        envVars[key.trim()] = value.replace(/\\n/g, "\n");
    }
});

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: envVars["FIREBASE_PROJECT_ID"],
    clientEmail: envVars["FIREBASE_CLIENT_EMAIL"],
    privateKey: envVars["FIREBASE_PRIVATE_KEY"],
  }),
});

const db = admin.firestore();

// normalize: lowercase + strip zero-width chars + trim
const normalize = (s) => s ? s.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "").replace(/\u200B/g, "").trim().toLowerCase() : "";

async function main() {
  console.log("📡 Fetching users...");
  const usersSnap = await db.collection("topguild-user").get();
  
  // Valid users set (normalized names)
  const validNames = new Set();
  const validUserMap = new Map();
  
  usersSnap.forEach(doc => {
    const d = doc.data();
    // Must have both discordId and gameUsername (or discordUsername)
    if (d.discordId && (d.gameUsername || d.discordUsername)) {
        const dName = normalize(d.discordUsername);
        const gName = normalize(d.gameUsername);
        if (dName) {
            validNames.add(dName);
            validUserMap.set(dName, d);
        }
        if (gName) {
            validNames.add(gName);
            validUserMap.set(gName, d);
        }
    }
  });

  console.log(`✅ Found ${validNames.size} valid names from discord logins.`);

  console.log("📡 Fetching roster...");
  const rosterRef = db.collection("topguild-system").doc("roster");
  const rosterDoc = await rosterRef.get();
  let rosterData = {};
  if (rosterDoc.exists) {
    const raw = rosterDoc.data();
    rosterData = raw?.data ? raw.data : raw;
  }

  // Deduplicate and filter
  const allMembers = [];
  
  for (const [job, members] of Object.entries(rosterData)) {
    if (Array.isArray(members)) {
      for (const m of members) {
          allMembers.push({ ...m, job });
      }
    }
  }
  
  const mergedMembers = new Map();
  
  for (const m of allMembers) {
      if (!m.name) continue;
      
      const nName = normalize(m.name);
      
      // If the user's name is not in the valid topguild-user list, SKIP them.
      if (!validNames.has(nName)) {
          console.log(`❌ Removing non-discord user: ${m.name}`);
          continue;
      }
      
      // If we already have this member, merge them (take highest power/activity, prefer non-null titles)
      if (mergedMembers.has(nName)) {
          const existing = mergedMembers.get(nName);
          console.log(`⚠️ Merging duplicate: ${m.name}`);
          existing.power = Math.max(Number(existing.power) || 0, Number(m.power) || 0);
          existing.activity = Math.max(Number(existing.activity) || 0, Number(m.activity) || 0);
          if (!existing.title && m.title) existing.title = m.title;
          
          // Job logic: If one has "Merchant" and we want "Whitesmith", we can enforce that later
          if (m.job && m.job !== "Unknown" && existing.job === "Unknown") {
              existing.job = m.job;
          }
      } else {
          mergedMembers.set(nName, { ...m });
      }
  }
  
  // Rebuild updatedRoster
  const updatedRoster = {};
  
  for (const m of mergedMembers.values()) {
      let finalJob = m.job;
      // Also apply the Merchant fix globally just in case
      if (finalJob === "Whitesmith") finalJob = "Merchant";
      
      if (!updatedRoster[finalJob]) updatedRoster[finalJob] = [];
      
      // Delete the temporary job property before saving
      const { job, ...memberData } = m;
      updatedRoster[finalJob].push(memberData);
  }
  
  // Verify total
  let total = 0;
  Object.keys(updatedRoster).forEach(j => total += updatedRoster[j].length);
  console.log(`\n✅ Final roster count: ${total} members`);

  // Apply changes
  await rosterRef.set(updatedRoster);
  console.log("✅ Database updated successfully.");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
