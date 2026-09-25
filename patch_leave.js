const fs = require('fs');
let code = fs.readFileSync('app/dashboard/leave/page.tsx', 'utf8');

// Replace JOB_LIST array with import from utils
code = code.replace(
  /const JOB_LIST = \[\s*.*\s*.*\s*\];/,
  ''
);
// Make sure we import JOB_LIST
code = code.replace(
  'import { JOB_COLORS } from "@/lib/utils";',
  'import { JOB_COLORS, JOB_LIST } from "@/lib/utils";'
);

fs.writeFileSync('app/dashboard/leave/page.tsx', code);
console.log("Patched leave page");
