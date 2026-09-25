const fs = require('fs');
let code = fs.readFileSync('app/dashboard/auction/page.tsx', 'utf8');
code = code.replace('import { formatItemName } from "@/lib/utils";\n', '');
fs.writeFileSync('app/dashboard/auction/page.tsx', code);
