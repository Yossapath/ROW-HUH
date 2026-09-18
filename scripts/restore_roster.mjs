import admin from "firebase-admin";
import fs from "fs";

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

// Need normalize job function
const JOB_LIST = [
  "Lord Knight", "Paladin", "High Wizard", "Sniper", "Priest", 
  "Champion", "Assassin Cross", "Merchant", "Gunslinger", "Druid",
  "Biosmith", "Bard", "Dancer"
];

function normalizeJob(job) {
    if (!job) return "Unknown";
    const lower = job.toLowerCase().trim();
    if (lower === "whitesmith") return "Merchant";
    if (lower === "อาลิเทีย") return "Druid";
    if (lower === "high priest") return "Priest";
    if (lower === "night walker") return "Gunslinger";
    if (lower === "danc" || lower === "dancer" || lower === "ยิปซี") return "Dancer";
    if (lower === "bard" || lower === "clown" || lower === "คราว") return "Bard";
    if (lower === "biosmith" || lower === "biochemist" || lower === "creator") return "Biosmith";
    const match = JOB_LIST.find(j => j.toLowerCase() === lower);
    return match || job;
}

async function main() {
  const usersSnap = await db.collection("topguild-user").get();
  const allUsers = [];
  usersSnap.forEach(doc => {
      const d = doc.data();
      if (d.discordUsername || d.gameUsername) {
          allUsers.push(d);
      }
  });

  const rosterRef = db.collection("topguild-system").doc("roster");
  const rosterDoc = await rosterRef.get();
  const rosterData = rosterDoc.exists ? (rosterDoc.data().data || rosterDoc.data()) : {};

  const currentRosterNames = new Set();
  for (const members of Object.values(rosterData)) {
      if (Array.isArray(members)) {
          for (const m of members) {
              currentRosterNames.add(m.name.toLowerCase().trim());
          }
      }
  }

  const missingUsers = [];
  for (const u of allUsers) {
      const gName = u.gameUsername ? u.gameUsername.toLowerCase().trim() : "";
      const dName = u.discordUsername ? u.discordUsername.toLowerCase().trim() : "";
      
      let found = false;
      if (gName && currentRosterNames.has(gName)) found = true;
      if (dName && currentRosterNames.has(dName)) found = true;
      
      if (!found && u.class) {
          missingUsers.push(u);
      }
  }

  console.log(`Found ${missingUsers.length} missing users with class in topguild-user.`);
  
  // Also we lost some people from the dedupe output:
  // ⚠️ Merging duplicate: อามะ ภันเต (Druid -> Priest)
  // ⚠️ Merging duplicate: คุคุคุ (Druid -> Priest)
  // ⚠️ Merging duplicate: สีกาแพรววา (Druid -> High Wizard)
  // ⚠️ Merging duplicate: ขุนทวนสวนทวาร (Druid -> Sniper)
  // ⚠️ Merging duplicate: กระดานชนวน (Druid -> Sniper)
  // ⚠️ Merging duplicate: อุยุอายะ (Druid -> Sniper)
  // ⚠️ Merging duplicate: บีบังกวย (Druid -> Sniper)
  // ⚠️ Merging duplicate: ร้องขอชีวิต (Priest -> Gunslinger)
  // ⚠️ Merging duplicate: ฟหกด (Druid -> Gunslinger)
  // ⚠️ Merging duplicate: ยาซป (Druid -> Gunslinger)
  // ⚠️ Merging duplicate: บุญช่วย (Lord Knight -> Assassin Cross)
  
  // We can manually push them if they are not in the topguild-user
  const lostPeople = [
     { name: "อามะ ภันเต", job: "Druid", power: 0 },
     { name: "คุคุคุ", job: "Druid", power: 0 },
     { name: "สีกาแพรววา", job: "Druid", power: 0 },
     { name: "ขุนทวนสวนทวาร", job: "Druid", power: 0 },
     { name: "กระดานชนวน", job: "Druid", power: 0 },
     { name: "อุยุอายะ", job: "Druid", power: 0 },
     { name: "บีบังกวย", job: "Druid", power: 0 },
     { name: "ร้องขอชีวิต", job: "Priest", power: 0 },
     { name: "ฟหกด", job: "Druid", power: 0 },
     { name: "ยาซป", job: "Druid", power: 0 },
     { name: "บุญช่วย", job: "Lord Knight", power: 0 }
  ];

  for (const u of missingUsers) {
      let job = normalizeJob(u.class);
      const name = u.gameUsername || u.discordUsername;
      const power = u.power || 0;
      
      console.log(`Restoring from DB: ${name} (${job})`);
      if (!rosterData[job]) rosterData[job] = [];
      rosterData[job].push({ name, power, job });
      currentRosterNames.add(name.toLowerCase().trim());
  }

  for (const p of lostPeople) {
     if (!currentRosterNames.has(p.name.toLowerCase().trim())) {
         console.log(`Restoring manual: ${p.name} (${p.job})`);
         if (!rosterData[p.job]) rosterData[p.job] = [];
         rosterData[p.job].push(p);
     }
  }

  await rosterRef.set(rosterData);
  console.log("Roster restored!");
  process.exit(0);
}

main().catch(console.error);
