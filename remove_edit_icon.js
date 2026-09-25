const fs = require('fs');
let code = fs.readFileSync('components/auction/AuctionItemCard.tsx', 'utf8');

code = code.replace(
  '<Edit2 size={14} />',
  ''
);

fs.writeFileSync('components/auction/AuctionItemCard.tsx', code);
console.log("Removed Edit2 icon");
