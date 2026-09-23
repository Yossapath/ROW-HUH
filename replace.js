const fs = require('fs');
const path = require('path');

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      walk(p);
    } else if (p.endsWith('.ts') || p.endsWith('.tsx')) {
      let c = fs.readFileSync(p, 'utf8');
      
      // auth.user.role === "admin" || auth.user.role === "owner"
      c = c.replace(/auth\.user\.role === ["']admin["'] \|\| auth\.user\.role === ["']owner["']/g, 'auth.user.role === "admin" || auth.user.role === "owner" || auth.user.role === "dev"');
      
      // user.role === "admin" || user.role === "owner"
      c = c.replace(/user\.role === ["']admin["'] \|\| user\.role === ["']owner["']/g, 'user.role === "admin" || user.role === "owner" || user.role === "dev"');
      
      // user?.role === "admin" || user?.role === "owner"
      c = c.replace(/user\?\.role === ["']admin["'] \|\| user\?\.role === ["']owner["']/g, 'user?.role === "admin" || user?.role === "owner" || user?.role === "dev"');
      
      // u.role === 'admin'
      // Only do this specifically for app/dashboard/users/page.tsx for rendering
      
      fs.writeFileSync(p, c, 'utf8');
    }
  });
}
walk('app'); walk('components'); walk('lib');
