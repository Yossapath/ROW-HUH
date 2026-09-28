const fs = require('fs');
let code = fs.readFileSync('lib/auction/reservations.ts', 'utf8');

const awardStr = 'export async function awardAuction';
const skipCode = 
export async function skipReservation(
  reservationId: string,
  adminId: string,
  adminName: string
): Promise<{ success: boolean; error?: string; itemName?: string; characterName?: string }> {
  const db = getDb();
  
  return await db.runTransaction(async (t) => {
    const resDoc = await t.get(auctionReservationsRef().doc(reservationId));
    if (!resDoc.exists) return { success: false, error: 'Reservation not found' };
    
    const reservation = resDoc.data();
    if (reservation.status !== 'waiting') {
      return { success: false, error: 'Only waiting reservations can be skipped' };
    }

    const auctionDoc = await t.get(auctionsRef().doc(reservation.auctionId));
    let itemName = reservation.auctionId;
    if (auctionDoc.exists) {
      itemName = auctionDoc.data()?.itemName || itemName;
    }

    // Set queuedAt to current time so they go to the back of the line
    t.update(resDoc.ref, { 
      queuedAt: Date.now(),
      updatedAt: Date.now() 
    });

    return { success: true, itemName, characterName: reservation.characterName };
  });
}
;

code = code.replace(awardStr, skipCode + '\n' + awardStr);

code = code.replace(
  'return { success: true };\r\n  });\r\n}\r\n\r\nexport async function awardAuction',
  'return { success: true, itemName: (await t.get(auctionsRef().doc(auctionId))).data()?.itemName, characterName: reservation.characterName };\r\n  });\r\n}\r\n\r\nexport async function awardAuction'
);

code = code.replace(
  'return { success: true };\n  });\n}\n\nexport async function awardAuction',
  'return { success: true, itemName: (await t.get(auctionsRef().doc(auctionId))).data()?.itemName, characterName: reservation.characterName };\n  });\n}\n\nexport async function awardAuction'
);

fs.writeFileSync('lib/auction/reservations.ts', code);
console.log('Done');
