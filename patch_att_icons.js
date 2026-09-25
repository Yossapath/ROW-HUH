const fs = require('fs');

// Add class icon next to job name in attendance - it shows `r.job` as colored text
let code = fs.readFileSync('app/dashboard/attendance/page.tsx', 'utf8');

// Add icon in the inline colored job text
code = code.replace(
  /(<p className="text-\[10px\] font-semibold truncate" style=\{\{ color: JOB_COLORS\[r\.job\] \?\? "#64748b" \}\}>)\{r\.job\}/g,
  '$1{JOB_ICONS[r.job] && <img src={JOB_ICONS[r.job]} alt={r.job} className="w-3 h-3 object-contain inline-block mr-0.5" />}{r.job}'
);

fs.writeFileSync('app/dashboard/attendance/page.tsx', code);
console.log('Patched attendance icons');
