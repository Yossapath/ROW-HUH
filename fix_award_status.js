const fs = require('fs');
let code = fs.readFileSync('lib/auction/reservations.ts', 'utf8');
code = code.replace('status: "awarded",', '');
fs.writeFileSync('lib/auction/reservations.ts', code);
