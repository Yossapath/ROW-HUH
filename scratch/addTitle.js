const fs = require('fs');
let code = fs.readFileSync('components/TopHeader.tsx', 'utf8');

code = code.replace(
  /\/dashboard\/teams": "จัดทีม GVG",/g,
  '"/dashboard/teams": "จัดทีม GVG",\n  "/dashboard/castle": "จัดทีม ชิงปราสาท",'
);

fs.writeFileSync('components/TopHeader.tsx', code, 'utf8');
