const fs = require('fs');
let code = fs.readFileSync('components/auction/AuctionItemCard.tsx', 'utf8');

code = code.replace(
  '<h3 className="font-bold text-slate-800 dark:text-white truncate">{auction.itemName}</h3>',
  '<h3 className="notranslate font-bold text-slate-800 dark:text-white truncate" translate="no">{auction.itemName}</h3>'
);

fs.writeFileSync('components/auction/AuctionItemCard.tsx', code);
console.log("Patched AuctionItemCard");
