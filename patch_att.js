const fs = require('fs');
let code = fs.readFileSync('app/dashboard/attendance/page.tsx', 'utf8');

// Replace JOB_COLORS declaration
code = code.replace(
  /const JOB_COLORS: Record<string, string> = \{\s*.*\s*.*\s*.*\s*.*\s*\};\s*/,
  'import { JOB_COLORS } from "@/lib/utils";\n'
);

fs.writeFileSync('app/dashboard/attendance/page.tsx', code);
console.log("Patched attendance page");
