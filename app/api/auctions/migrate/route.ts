import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase-admin';

export async function GET() {
  const db = getDb();
  const snapshot = await db.collection('topguild-auctions').where('category', '==', 'gear').get();
  
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { category: 'gear80' });
  });

  const gear90Snapshot = await db.collection('topguild-auctions').where('category', '==', 'gear90').get();
  let createdCount = 0;
  
  if (gear90Snapshot.empty) {
    // Create 14 Gear Lv.90 items
    for (let i = 1; i <= 14; i++) {
      const docRef = db.collection('topguild-auctions').doc();
      batch.set(docRef, {
        itemName: "Gear Lv.90 (" + i + ")",
        category: 'gear90',
        price: 6000,
        status: 'closed',
        queueCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      createdCount++;
    }
  }

  await batch.commit();

  return NextResponse.json({ success: true, updated: snapshot.docs.length, created: createdCount });
}
