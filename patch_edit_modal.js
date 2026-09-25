const fs = require('fs');
let code = fs.readFileSync('components/auction/EditAuctionModal.tsx', 'utf8');

code = code.replace(
  '<h2 className="text-lg font-bold text-slate-800 dark:text-white truncate pr-4">แก้ไข: {auction.itemName}</h2>',
  '<h2 className="text-lg font-bold text-slate-800 dark:text-white truncate pr-4">แก้ไข: <span translate="no" className="notranslate">{auction.itemName}</span></h2>'
);

fs.writeFileSync('components/auction/EditAuctionModal.tsx', code);
console.log("Patched EditAuctionModal");
