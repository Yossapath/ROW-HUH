const fs = require('fs');
let lines = fs.readFileSync('app/dashboard/castle/page.tsx', 'utf8').split('\n');
lines.splice(1287, 1); // Delete line 1288
fs.writeFileSync('app/dashboard/castle/page.tsx', lines.join('\n'), 'utf8');
