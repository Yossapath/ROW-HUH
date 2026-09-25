const fs = require('fs');
let code = fs.readFileSync('components/auction/AuctionQueuesView.tsx', 'utf8');

code = code.replace(
  '<span className={`text-sm truncate font-bold ${selectedAuctionId === auction.id ? "text-[#0b3d63] dark:text-[#5B86F1]" : "text-slate-700 dark:text-slate-300"}`}>\n                    {auction.itemName}\n                  </span>',
  '<span translate="no" className={`notranslate text-sm truncate font-bold ${selectedAuctionId === auction.id ? "text-[#0b3d63] dark:text-[#5B86F1]" : "text-slate-700 dark:text-slate-300"}`}>\n                    {auction.itemName}\n                  </span>'
);

code = code.replace(
  '<h2 className="text-xl font-bold text-slate-800 dark:text-white">{selectedAuction.itemName}</h2>',
  '<h2 translate="no" className="notranslate text-xl font-bold text-slate-800 dark:text-white">{selectedAuction.itemName}</h2>'
);

fs.writeFileSync('components/auction/AuctionQueuesView.tsx', code);
console.log("Patched AuctionQueuesView");
