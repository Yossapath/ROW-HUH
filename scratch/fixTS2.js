const fs = require('fs');
let lines = fs.readFileSync('app/dashboard/castle/page.tsx', 'utf8').split('\n');
lines.splice(1288, 2); // Remove lines 1289 and 1290 (index 1288 and 1289)
fs.writeFileSync('app/dashboard/castle/page.tsx', lines.join('\n'), 'utf8');
