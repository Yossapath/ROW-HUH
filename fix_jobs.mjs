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
    return match || job.trim();
}

async function main() {
  const rosterRef = db.collection("topguild-system").doc("roster");
  const rosterDoc = await rosterRef.get();
  if (!rosterDoc.exists) return;
  
  let raw = rosterDoc.data();
  let rosterData = raw?.data ? raw.data : raw;
  
  const updatedRoster = {};
  let changed = false;
  
  for (const [job, members] of Object.entries(rosterData)) {
      const correctJob = normalizeJob(job);
      if (job !== correctJob) changed = true;
      
      if (!updatedRoster[correctJob]) updatedRoster[correctJob] = [];
      
      if (Array.isArray(members)) {
          for (const m of members) {
              updatedRoster[correctJob].push(m);
          }
      }
  }
  
  console.log("Keys before:", Object.keys(rosterData));
  console.log("Keys after:", Object.keys(updatedRoster));
  
  if (changed) {
      await rosterRef.set(updatedRoster);
      console.log("Database updated with normalized jobs!");
  } else {
      console.log("No job normalization needed.");
  }
}

main().catch(console.error);
