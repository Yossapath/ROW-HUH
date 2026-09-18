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

async function main() {
  const rosterRef = db.collection("topguild-system").doc("roster");
  const rosterDoc = await rosterRef.get();
  const rosterData = rosterDoc.exists ? (rosterDoc.data().data || rosterDoc.data()) : {};

  let count = 0;
  for (const members of Object.values(rosterData)) {
      if (Array.isArray(members)) {
          count += members.length;
      }
  }

  console.log(`Current roster count: ${count}`);
  process.exit(0);
}

main().catch(console.error);
