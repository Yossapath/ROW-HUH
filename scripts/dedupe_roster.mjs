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
const normalize = (s) => s ? s.replace(/[^a-zA-Z0-9เ-๙]/g, "").toLowerCase() : "";

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
    
    // Find exact match case-insensitively
    const match = JOB_LIST.find(j => j.toLowerCase() === lower);
    return match || job; // Return original if no match, or might want to fallback to Unknown
}

async function main() {
  console.log("📡 Fetching roster...");
  const rosterRef = db.collection("topguild-system").doc("roster");
  const rosterDoc = await rosterRef.get();
  let rosterData = {};
  if (rosterDoc.exists) {
    const raw = rosterDoc.data();
    rosterData = raw?.data ? raw.data : raw;
  }

  const allMembers = [];
  
  for (const [job, members] of Object.entries(rosterData)) {
    if (Array.isArray(members)) {
      for (const m of members) {
          allMembers.push({ ...m, job });
      }
    }
  }
  
  const mergedMembers = new Map();
  let duplicatesRemoved = 0;
  
  for (const m of allMembers) {
      if (!m.name) continue;
      
      const nName = normalize(m.name);
      m.job = normalizeJob(m.job);
      
      if (mergedMembers.has(nName)) {
          const existing = mergedMembers.get(nName);
          console.log(`⚠️ Merging duplicate: ${m.name} (${existing.job} -> ${m.job})`);
          existing.power = Math.max(Number(existing.power) || 0, Number(m.power) || 0);
          if (m.activity !== undefined) {
             existing.activity = Math.max(Number(existing.activity) || 0, Number(m.activity) || 0);
          }
          if (!existing.title && m.title) existing.title = m.title;
          
          if (m.job && m.job !== "Unknown" && (existing.job === "Unknown" || existing.job === "Merchant")) {
             existing.job = m.job;
          }
          duplicatesRemoved++;
      } else {
          mergedMembers.set(nName, { ...m });
      }
  }
  
  const updatedRoster = {};
  
  for (const m of mergedMembers.values()) {
      const finalJob = m.job;
      
      if (!updatedRoster[finalJob]) updatedRoster[finalJob] = [];
      
      const { job, ...memberData } = m;
      updatedRoster[finalJob].push(memberData);
  }
  
  let total = 0;
  Object.keys(updatedRoster).forEach(j => total += updatedRoster[j].length);
  console.log(`\n✅ Final roster count: ${total} members. Removed ${duplicatesRemoved} duplicates.`);

  // Apply changes
  await rosterRef.set(updatedRoster);
  console.log("✅ Database updated successfully.");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
