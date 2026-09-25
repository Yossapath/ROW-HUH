const fs = require('fs');
let code = fs.readFileSync('app/dashboard/attendance/page.tsx', 'utf8');

code = code.replace('import { JOB_COLORS } from "@/lib/utils";\n', '');
code = 'import { JOB_COLORS } from "@/lib/utils";\n' + code;

fs.writeFileSync('app/dashboard/attendance/page.tsx', code);
console.log("Moved import");
