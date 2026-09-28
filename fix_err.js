const fs = require('fs');
let code = fs.readFileSync('components/auction/AuctionQueuesView.tsx', 'utf8');
code = code.replace(
  'if (!res.ok) throw new Error(data.error || "Failed");',
  'if (!res.ok) throw new Error(data.error || `HTTP ${res.status} ${res.statusText}: ${text ? text.substring(0, 100) : "Empty response"}`);'
);
fs.writeFileSync('components/auction/AuctionQueuesView.tsx', code);
