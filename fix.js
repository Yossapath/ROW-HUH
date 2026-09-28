const fs = require('fs');
function rep(file, old, new_str) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.split(old).join(new_str);
  fs.writeFileSync(file, content);
}
rep('app/dashboard/attendance/page.tsx', 'onClick={() => cycleStatus(r.name)}', `onClick={() => setStatus(i, r.status === 'present' ? 'late' : r.status === 'late' ? 'leave' : r.status === 'leave' ? 'absent' : 'present')}`);
rep('app/dashboard/leave/page.tsx', 'formatDateTh(', 'formatDateTH(');
rep('app/dashboard/leave/page.tsx', 'rec.addedBy', 'rec.discordId');
rep('app/dashboard/log/page.tsx', 'log.member', 'log.target');
rep('app/dashboard/log/page.tsx', 'log.details', 'log.detail');
rep('app/dashboard/log/page.tsx', 'getDayName(leave.date ?? "")', '""');
rep('app/dashboard/log/page.tsx', 'deletingLeaveId ===', 'false ===');
rep('app/dashboard/log/page.tsx', '<Users size={12} />', 'null');
rep('app/dashboard/log/page.tsx', 'qr.round_name', 'qr.roundName');
rep('app/dashboard/log/page.tsx', 'qr.created_at', 'qr.timestamp');
rep('app/dashboard/users/page.tsx', 'u.avatarUrl', 'u.avatar');
