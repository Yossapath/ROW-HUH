const fs = require('fs');
const p = 'app/dashboard/users/page.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /if \(a\.role === "admin" && b\.role !== "admin"\) return -1;\n\s+if \(a\.role !== "admin" && b\.role === "admin"\) return 1;/,
  `if ((a.role === "admin" || a.role === "dev") && (b.role !== "admin" && b.role !== "dev")) return -1;
      if ((a.role !== "admin" && a.role !== "dev") && (b.role === "admin" || b.role === "dev")) return 1;`
);

c = c.replace(
  /u\.role === 'admin'\s+\?\s+'bg-blue-50\/50 dark:bg-\[\#3B66D1\]\/20'\s+:\s+''/g,
  `(u.role === 'admin' || u.role === 'dev') ? 'bg-blue-50/50 dark:bg-[#3B66D1]/20' : ''`
);

c = c.replace(
  /u\.role === 'admin'\s+\?\s+'bg-theme-warning'\s+:\s+'bg-slate-400'/g,
  `(u.role === 'admin' || u.role === 'dev') ? 'bg-theme-warning' : 'bg-slate-400'`
);

c = c.replace(
  /u\.role === 'admin'\s*\n\s*\?\s*'bg-theme-warning\/10 text-theme-warning border-theme-warning\/30'/g,
  `(u.role === 'admin' || u.role === 'dev')
                                  ? 'bg-theme-warning/10 text-theme-warning border-theme-warning/30'`
);

c = c.replace(
  /u\.role === 'admin' \? 'Admin' : 'Member'/g,
  `(u.role === 'admin' || u.role === 'dev') ? (u.role === 'dev' ? 'Dev' : 'Admin') : 'Member'`
);

c = c.replace(
  /u\.role === 'owner' \? 'Owner' : 'Admin'/g,
  `u.role === 'owner' ? 'Owner' : (u.role === 'dev' ? 'Dev' : 'Admin')`
);

c = c.replace(
  /u\.role === 'admin'\s*\n\s*\?\s*'bg-theme-warning\/10 text-theme-warning border-theme-warning\/30 hover:border-theme-warning'/g,
  `(u.role === 'admin' || u.role === 'dev') 
                                    ? 'bg-theme-warning/10 text-theme-warning border-theme-warning/30 hover:border-theme-warning'`
);

c = c.replace(
  /<option value="admin">Admin<\/option>\n\s*<option value="member">Member<\/option>/g,
  `<option value="admin">Admin</option>
                              <option value="dev">Dev</option>
                              <option value="member">Member</option>`
);

c = c.replace(
  /!\isOwner && \(u\.role === 'owner' \|\| u\.role === 'admin'\)/g,
  `!isOwner && (u.role === 'owner' || u.role === 'admin' || u.role === 'dev')`
);

fs.writeFileSync(p, c, 'utf8');
