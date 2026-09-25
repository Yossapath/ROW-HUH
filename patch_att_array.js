const fs = require('fs');
let code = fs.readFileSync('app/dashboard/attendance/page.tsx', 'utf8');

code = code.replace(
  /for \(const \[job, members\] of Object\.entries\(roster\)\) \{\s*for \(const m of members\) \{/g,
  `for (const [job, members] of Object.entries(roster)) {
    if (Array.isArray(members)) {
      for (const m of members) {`
);

code = code.replace(
  /for \(const m of members\) \{\s*rows\.push\(\{ name: m\.name, job, power: m\.power \?\? 0, status: "รอเช็ค" \}\);\s*\}/g,
  `for (const m of members) {
        rows.push({ name: m.name, job, power: m.power ?? 0, status: "รอเช็ค" });
      }
    }`
);

code = code.replace(
  /for \(const \[job, arr\] of Object\.entries\(rosterData as Record<string, \{ name: string; id\?: string \}\[\]>\)\) \{\s*for \(const m of arr\) \{/g,
  `for (const [job, arr] of Object.entries(rosterData as Record<string, { name: string; id?: string }[]>)) {
            if (Array.isArray(arr)) {
              for (const m of arr) {`
);

// We need to add the closing brace for the second replacement
code = code.replace(
  /if \(offlineIds\.includes\(memberId\)\) \{\s*members\.push\(\{ name: m\.name, job \}\);\s*\}\s*\}\s*\}/g,
  `if (offlineIds.includes(memberId)) {
                  members.push({ name: m.name, job });
                }
              }
            }
          }`
);

fs.writeFileSync('app/dashboard/attendance/page.tsx', code);
console.log("Patched attendance arrays");
