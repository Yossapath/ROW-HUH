const fs = require('fs');
let code = fs.readFileSync('app/dashboard/teams/page.tsx', 'utf8');
code = code.replace('const autoRunTeamNumbers = () => {', 'const autoRunTeamNumbers = async () => {');
fs.writeFileSync('app/dashboard/teams/page.tsx', code);
console.log('Patched autoRunTeamNumbers');
