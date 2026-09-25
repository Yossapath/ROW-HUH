const fs = require('fs');
let code = fs.readFileSync('app/dashboard/auction/page.tsx', 'utf8');

code = code.replace(
  '{ id: "my", label: "รายการจอง", icon: Gavel }',
  '{ id: "my", label: "รายการจองของฉัน", icon: Gavel }'
);

fs.writeFileSync('app/dashboard/auction/page.tsx', code);
console.log("Patched tab name");
