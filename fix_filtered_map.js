const fs = require('fs');
let data = fs.readFileSync('components/auction/AuctionQueuesView.tsx', 'utf8');

data = data.replace(/\{filteredAuctions\.map\(/g, '{(filteredAuctions || []).map(');

fs.writeFileSync('components/auction/AuctionQueuesView.tsx', data);
