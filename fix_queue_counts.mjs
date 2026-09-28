import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

async function fix() {
  const auctionsSnap = await db.collection('topguild-auction').get();
  let count = 0;
  for (const doc of auctionsSnap.docs) {
    const resSnap = await db.collection('topguild-auction-reservations')
      .where('auctionId', '==', doc.id)
      .where('status', '==', 'waiting')
      .get();
      
    const actualCount = resSnap.size;
    const currentCount = doc.data().queueCount || 0;
    
    if (actualCount !== currentCount) {
      console.log('Fixing auction ' + doc.id + ' (' + doc.data().itemName + '): ' + currentCount + ' -> ' + actualCount);
      await doc.ref.update({ queueCount: actualCount });
      count++;
    }
  }
  console.log('Fixed ' + count + ' auctions.');
}

fix().catch(console.error);
