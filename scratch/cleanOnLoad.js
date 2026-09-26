const fs = require('fs');
let code = fs.readFileSync('app/dashboard/castle/page.tsx', 'utf8');

const targetStr =       if (!cols["unassigned"]) cols["unassigned"] = { id: "unassigned", title: "ยังไม่ได้จัดทีม", memberIds: [], type: "unassigned", locked: false };;

const replacement =       // Remove legacy sub zones from the system completely
      zones = zones.filter(z => z.type !== "sub");

      if (!cols["unassigned"]) cols["unassigned"] = { id: "unassigned", title: "ยังไม่ได้จัดทีม", memberIds: [], type: "unassigned", locked: false };;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('app/dashboard/castle/page.tsx', code, 'utf8');
  console.log("Injected sub zone filter on load.");
} else {
  console.log("Could not find target string.");
}
