const fs = require('fs');

let leave = fs.readFileSync('app/dashboard/leave/page.tsx', 'utf8');
leave = leave.replace(/\(isAdmin \|\| rec\.added_by === user\?\.gameUsername \|\| rec\.added_by === user\?\.discordId\)/g, 'isAdmin');
fs.writeFileSync('app/dashboard/leave/page.tsx', leave);

let log = fs.readFileSync('app/dashboard/log/page.tsx', 'utf8');
log = log.replace(/qr\.round/g, 'qr.rounds');
fs.writeFileSync('app/dashboard/log/page.tsx', log);
