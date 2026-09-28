require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

function formatKey(key) {
  if (!key) return '';
  let cleaned = key.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n').replace(/\r/g, '');
  if (!cleaned.includes('\n')) {
    const b = '-----BEGIN PRIVATE KEY-----';
    const e = '-----END PRIVATE KEY-----';
    if (cleaned.startsWith(b) && cleaned.includes(e)) {
      const b64 = cleaned.substring(b.length, cleaned.indexOf(e)).replace(/\s+/g, '');
      const formatted = b64.match(/.{1,64}/g)?.join('\n') || b64;
      cleaned = `${b}\n${formatted}\n${e}\n`;
    }
  }
  return cleaned.trim();
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: formatKey(process.env.FIREBASE_PRIVATE_KEY),
  }),
});

const db = admin.firestore();
db.collection('auctionReservations').get().then(snap => {
  console.log('Total reservations:', snap.docs.length);
  const data = snap.docs.map(d => ({id: d.id, ...d.data()}));
  console.log(data);
});
