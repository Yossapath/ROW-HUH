export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/firebase-admin';
import { ok, err } from '@/lib/server-utils';

// Restores queue reservations from old auction to new auction based on system logs
export async function GET(req: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const oldId = searchParams.get('oldId') || 'dV9yX5mx8FytztXyUzOG';
    const newId = searchParams.get('newId') || 'RU2PZr4bpB723SM66bY3';

    // 1. Find all JOIN_AUCTION_QUEUE logs for the old auction
    const logsSnap = await db.collection('logs')
      .where('action', '==', 'JOIN_AUCTION_QUEUE')
      .get();

    const oldQueueMembers: { characterName: string; userId: string; note: string }[] = [];

    logsSnap.forEach(doc => {
      const d = doc.data();
      // Match against old auction ID in target or detail fields
      const detail = d.detail || '';
      const target = d.target || '';
      if (target === oldId || detail.includes(oldId)) {
        oldQueueMembers.push({
          characterName: d.actor || 'Unknown',
          userId: d.actorId || '',
          note: `Restored from deleted auction ${oldId}`,
        });
      }
    });

    if (oldQueueMembers.length === 0) {
      return ok({
        message: 'ไม่พบประวัติการจองในไอเทมเก่า (log อาจไม่มีข้อมูลเพียงพอ)',
        oldId,
        newId,
        restored: 0,
      });
    }

    // 2. Get existing reservations in new auction to avoid duplicates
    const existingSnap = await db
      .collection('auctions')
      .doc(newId)
      .collection('reservations')
      .get();
    const existingNames = new Set<string>();
    existingSnap.forEach(doc => {
      existingNames.add(doc.data().characterName);
    });

    // 3. Re-add missing members into new auction
    let restored = 0;
    const batch = db.batch();
    for (const member of oldQueueMembers) {
      if (existingNames.has(member.characterName)) continue;
      const ref = db.collection('auctions').doc(newId).collection('reservations').doc();
      batch.set(ref, {
        ...member,
        status: 'waiting',
        createdAt: Date.now(),
        order: existingSnap.size + restored,
      });
      restored++;
    }
    if (restored > 0) await batch.commit();

    return ok({
      message: `กู้คืนสำเร็จ! เพิ่มคิวกลับมา ${restored} คน`,
      oldId,
      newId,
      found: oldQueueMembers,
      restored,
    });
  } catch (error: any) {
    return err(error.message, 500);
  }
}
