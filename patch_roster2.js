const fs = require('fs');

let code = fs.readFileSync('app/dashboard/roster/page.tsx', 'utf8');

// Fix the job badge span - it didn't get patched by the script (whitespace mismatch)
// Let's do a more targeted replacement
code = code.replace(
  `                        <span \n                          className="px-2 py-1 rounded-md text-xs font-bold text-white shadow-sm"\n>                         style={{ backgroundColor: jobColor }}\n                        >\n                          {mapClassName(member.job)}\n                        </span>`,
  `                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold text-white shadow-sm" style={{ backgroundColor: jobColor }}>
                          {JOB_ICONS[member.job] && <img src={JOB_ICONS[member.job]} alt={member.job} className="w-4 h-4 object-contain" />}
                          {mapClassName(member.job)}
                        </span>`
);

fs.writeFileSync('app/dashboard/roster/page.tsx', code);
console.log("Patched");
