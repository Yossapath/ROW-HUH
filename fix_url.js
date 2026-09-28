const fs = require('fs');
let code = fs.readFileSync('components/auction/AuctionQueuesView.tsx', 'utf8');
code = code.replace(
  'fetch("/api/auctions/announce", {',
  'fetch("/api/announce-auctions", {'
);
fs.writeFileSync('components/auction/AuctionQueuesView.tsx', code);
