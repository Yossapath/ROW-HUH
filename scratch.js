const fs = require('fs');
const path = require('path');
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      walk(p);
    } else if (p.endsWith('.ts') || p.endsWith('.tsx')) {
      const c = fs.readFileSync(p, 'utf8');
      const lines = c.split('\n');
      lines.forEach((l, i) => {
        if (l.includes('role === "admin"') || l.includes("role === 'admin'") || l.includes('role === "owner"') || l.includes("role === 'owner'") || l.includes('role == "admin"')) {
          console.log(`${p}:${i+1}: ${l.trim()}`);
        }
      });
    }
  });
}
walk('app'); walk('components'); walk('lib');
