const fs = require('fs');

// Patch attendance page
let code = fs.readFileSync('app/dashboard/attendance/page.tsx', 'utf8');
code = code.replace(
  'import { JOB_COLORS, JOB_LIST } from "@/lib/utils";',
  'import { JOB_COLORS, JOB_LIST, JOB_ICONS } from "@/lib/utils";'
);
// Find job badge in attendance - likely has style={{color/background: JOB_COLORS[r.job]}}
code = code.replace(
  /style=\{\{ (background|backgroundColor|color): JOB_COLORS\[r\.job\][^}]*\}\}/g,
  (match) => match
);
// Add icon to job badge where it renders the job name in table
code = code.replace(
  /(<span[^>]*style=\{\{ backgroundColor: JOB_COLORS\[r\.job\][^}]*\}\}[^>]*>)\s*\{r\.job\}/g,
  '$1{JOB_ICONS[r.job] && <img src={JOB_ICONS[r.job]} alt={r.job} className="w-3.5 h-3.5 object-contain inline-block mr-1" />}{r.job}'
);
fs.writeFileSync('app/dashboard/attendance/page.tsx', code);

// Patch leave page
code = fs.readFileSync('app/dashboard/leave/page.tsx', 'utf8');
code = code.replace(
  'import { JOB_COLORS, JOB_LIST } from "@/lib/utils";',
  'import { JOB_COLORS, JOB_LIST, JOB_ICONS } from "@/lib/utils";'
);
fs.writeFileSync('app/dashboard/leave/page.tsx', code);

console.log('Patched attendance and leave pages');
