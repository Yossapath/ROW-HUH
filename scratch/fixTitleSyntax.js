const fs = require('fs');
let code = fs.readFileSync('components/TopHeader.tsx', 'utf8');

code = code.replace(/""\/dashboard\/teams"/g, '"/dashboard/teams"');

fs.writeFileSync('components/TopHeader.tsx', code, 'utf8');
