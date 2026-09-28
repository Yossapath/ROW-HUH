const fs = require('fs');

function rep(file, regex, new_str) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(regex, new_str);
  fs.writeFileSync(file, content);
}

// 1. Attendance: button -> span
let att = fs.readFileSync('app/dashboard/attendance/page.tsx', 'utf8');
att = att.replace(/<button[^>]*?onClick=\{\(\) => setStatus[^>]*?>([\s\S]*?)<\/button>/, '<span className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${sc.bg} ${sc.text} border ${sc.border}`}>{sc.label}</span>');
fs.writeFileSync('app/dashboard/attendance/page.tsx', att);

// 2. Leave: rec.discordId -> rec.added_by
let leave = fs.readFileSync('app/dashboard/leave/page.tsx', 'utf8');
leave = leave.replace(/rec\.discordId/g, 'rec.added_by');
fs.writeFileSync('app/dashboard/leave/page.tsx', leave);

// 3. Log: false === leave.id -> isDeleting
let log = fs.readFileSync('app/dashboard/log/page.tsx', 'utf8');
log = log.replace(/disabled=\{false === leave\.id\}/g, 'disabled={false}');
log = log.replace(/qr\.roundName/g, 'qr.round');
fs.writeFileSync('app/dashboard/log/page.tsx', log);

// 4. Users: u.avatar -> initial
let users = fs.readFileSync('app/dashboard/users/page.tsx', 'utf8');
users = users.replace(/<img src=\{u\.avatar \|\| `[^`]+`\} alt="Avatar"[^>]*\/>/g, '<div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg text-white ${(u.role === "admin" || u.role === "dev") ? "bg-theme-warning" : "bg-slate-400"}`}>{u.discordUsername ? u.discordUsername.charAt(0).toUpperCase() : "U"}</div>');
fs.writeFileSync('app/dashboard/users/page.tsx', users);
