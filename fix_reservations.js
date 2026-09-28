const fs = require('fs');
let code = fs.readFileSync('lib/auction/reservations.ts', 'utf8');

const target = `  return docs.map((r, index) => ({
    ...r,
    queuePosition: index + 1,
    peopleAhead: index,
    queueNumber: index + 1,
  }));
}`;

const replace = `  // Fetch user docs to get discordUsername
  const db = getDb();
  
  // Need to chunk userIds if length > 30 (Firestore IN limit)
  const userMap = new Map();
  const userIds = [...new Set(docs.map(r => r.userId))].filter(Boolean);
  
  for (let i = 0; i < userIds.length; i += 30) {
    const chunk = userIds.slice(i, i + 30);
    if (chunk.length > 0) {
      const usersSnap = await db.collection("topguild-user").where(admin.firestore.FieldPath.documentId(), "in", chunk).get();
      usersSnap.forEach(doc => userMap.set(doc.id, doc.data().discordUsername));
    }
  }

  return docs.map((r, index) => ({
    ...r,
    discordUsername: userMap.get(r.userId) || r.characterName, // fallback to char name if not found
    queuePosition: index + 1,
    peopleAhead: index,
    queueNumber: index + 1,
  }));
}`;

code = code.replace(target, replace);
code = code.replace('import { getDb, auctionsRef, auctionReservationsRef } from "@/lib/firebase-admin";', 'import { getDb, auctionsRef, auctionReservationsRef } from "@/lib/firebase-admin";\nimport * as admin from "firebase-admin";');

fs.writeFileSync('lib/auction/reservations.ts', code);
