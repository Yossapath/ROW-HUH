const fs = require('fs');

// Patch roster/page.tsx to add JOB_ICONS import and class icon in the job badge
let code = fs.readFileSync('app/dashboard/roster/page.tsx', 'utf8');

// Add JOB_ICONS to import
code = code.replace(
  'import { JOB_LIST, JOB_COLORS } from "@/lib/utils";',
  'import { JOB_LIST, JOB_COLORS, JOB_ICONS } from "@/lib/utils";'
);

// Replace job badge to include icon image
code = code.replace(
  `        <span \n          className="px-2 py-1 rounded-md text-xs font-bold text-white shadow-sm"\n>         style={{ backgroundColor: jobColor }}\n        >\n          {mapClassName(member.job)}\n        </span>`,
  `        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold text-white shadow-sm" style={{ backgroundColor: jobColor }}>\n          {JOB_ICONS[member.job] && <img src={JOB_ICONS[member.job]} alt={member.job} className="w-4 h-4 object-contain" />}\n          {mapClassName(member.job)}\n        </span>`
);

fs.writeFileSync('app/dashboard/roster/page.tsx', code);
console.log('Patched roster page');
