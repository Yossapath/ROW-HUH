const fs = require('fs');
let code = fs.readFileSync('app/dashboard/teams/page.tsx', 'utf8');

// Replace the sort function for unassignedList
code = code.replace(
  /\}\)\.sort\(\(a, b\) => \(data\.members\[b\]\?\.power \|\| 0\) - \(data\.members\[a\]\?\.power \|\| 0\)\);/g,
  `}).sort((a, b) => {
      const jobA = data.members[a]?.job || "";
      const jobB = data.members[b]?.job || "";
      if (jobA !== jobB) return jobA.localeCompare(jobB);
      return (data.members[b]?.power || 0) - (data.members[a]?.power || 0);
    });`
);

fs.writeFileSync('app/dashboard/teams/page.tsx', code);
console.log("Patched teams page");
