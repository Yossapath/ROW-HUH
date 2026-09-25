export const dynamic = 'force-dynamic';
import { getDb, rosterRef, COLL_USER } from '@/lib/firebase-admin';
import { ok, err } from '@/lib/server-utils';

export async function GET(req: Request) {
  try {
    const db = getDb();
    const usersSnap = await db.collection(COLL_USER).get();
    
    const users: any[] = [];
    usersSnap.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() });
    });

    const snap = await rosterRef().get();
    const data = snap.data();
    let rosterData = data?.data || data;

    const rosterMembers: any[] = [];
    for (const job of Object.keys(rosterData)) {
      if (Array.isArray(rosterData[job])) {
        for (const m of rosterData[job]) {
          rosterMembers.push(m);
        }
      }
    }

    // 1. In Users but not in Roster
    const inUsersNotInRoster = users.filter(u => !rosterMembers.find(r => r.discordId === u.id));
    
    // 2. In Roster but not in Users
    const inRosterNotInUsers = rosterMembers.filter(r => !users.find(u => u.id === r.discordId));

    // 3. In Users but profile incomplete (no gameUsername or class)
    const incompleteUsers = users.filter(u => !u.gameUsername || !u.class);

    return ok({ 
        counts: { users: users.length, roster: rosterMembers.length },
        inUsersNotInRoster: inUsersNotInRoster.map(u => ({ id: u.id, name: u.gameUsername, discord: u.discordUsername })),
        inRosterNotInUsers: inRosterNotInUsers.map(r => ({ id: r.discordId, name: r.name })),
        incompleteUsers: incompleteUsers.map(u => ({ id: u.id, discord: u.discordUsername }))
    });
  } catch (error: any) {
    return err(error.message, 500);
  }
}