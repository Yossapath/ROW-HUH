const fs = require('fs');
let code = fs.readFileSync('app/dashboard/attendance/page.tsx', 'utf8');

code = code.replace('import { JOB_COLORS } from "@/lib/utils";\n"use client";\n', '"use client";\nimport { JOB_COLORS } from "@/lib/utils";\n');

fs.writeFileSync('app/dashboard/attendance/page.tsx', code);
console.log("Fixed import order");
