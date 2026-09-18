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

  let changed = false;
  
  for (const [job, members] of Object.entries(rosterData)) {
      if (Array.isArray(members)) {
          for (const m of members) {
              if (m.name === "`ปีกัสโซ่" || m.name === "ปีกัสโซ่" || m.name === "`ปิกัสโซ่") {
                  console.log(`Found ${m.name}, changing to \`ปิกัสโซ่`);
                  m.name = "`ปิกัสโซ่";
                  changed = true;
              }
              if (m.name === "โต้กลม" || m.name === "โต๊กลม") {
                  console.log(`Found ${m.name}, changing to โต๊กลม`);
                  m.name = "โต๊กลม";
                  changed = true;
              }
          }
      }
  }

  if (changed) {
      await rosterRef.set(rosterData);
      console.log("Roster names fixed!");
  } else {
      console.log("No names needed fixing in roster.");
  }
  
  // Also check topguild-user
  const usersRef = db.collection("topguild-user");
  const usersSnap = await usersRef.get();
  
  for (const doc of usersSnap.docs) {
      const d = doc.data();
      let updateNeeded = false;
      let newD = {};
      
      if (d.gameUsername === "`ปีกัสโซ่" || d.gameUsername === "ปีกัสโซ่") {
          newD.gameUsername = "`ปิกัสโซ่";
          updateNeeded = true;
      }
      if (d.discordUsername === "`ปีกัสโซ่" || d.discordUsername === "ปีกัสโซ่") {
          newD.discordUsername = "`ปิกัสโซ่";
          updateNeeded = true;
      }
      
      if (d.gameUsername === "โต้กลม") {
          newD.gameUsername = "โต๊กลม";
          updateNeeded = true;
      }
      if (d.discordUsername === "โต้กลม") {
          newD.discordUsername = "โต๊กลม";
          updateNeeded = true;
      }
      
      if (updateNeeded) {
          console.log(`Fixing user doc ${doc.id} names...`);
          await usersRef.doc(doc.id).update(newD);
      }
  }

  process.exit(0);
}

main().catch(console.error);
