const fs = require('fs');

// Fix window.await
const files = [
  'components/auction/EditAuctionModal.tsx',
  'app/dashboard/log/page.tsx',
  'app/dashboard/users/page.tsx'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let code = fs.readFileSync(f, 'utf8');
    code = code.replace(/window\.await /g, 'await ');
    fs.writeFileSync(f, code);
    console.log(`Fixed window.await in ${f}`);
  }
});

// Fix teams/page.tsx async
let teamsCode = fs.readFileSync('app/dashboard/teams/page.tsx', 'utf8');
teamsCode = teamsCode.replace('const handleSortZones = () => {', 'const handleSortZones = async () => {');
teamsCode = teamsCode.replace('const handleClearZone = (zoneId: string) => {', 'const handleClearZone = async (zoneId: string) => {');
fs.writeFileSync('app/dashboard/teams/page.tsx', teamsCode);
console.log('Fixed teams async');

// Let's check users/page.tsx div error
