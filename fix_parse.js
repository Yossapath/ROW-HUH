const fs = require('fs');
let code = fs.readFileSync('components/auction/AuctionQueuesView.tsx', 'utf8');
code = code.replace(
  'const text = await res.text(); const data = text ? JSON.parse(text) : {};',
  'const text = await res.text();\n        let data = {};\n        try { data = text ? JSON.parse(text) : {}; } catch(e) { throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.substring(0, 100)}`); }'
);
fs.writeFileSync('components/auction/AuctionQueuesView.tsx', code);
