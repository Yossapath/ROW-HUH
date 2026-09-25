const fs = require('fs');
let code = fs.readFileSync('app/dashboard/teams/page.tsx', 'utf8');

// Make all functions that have "await useModalStore" async
code = code.replace(/const deleteZone = \(zoneId: string\) => \{/, 'const deleteZone = async (zoneId: string) => {');
code = code.replace(/const handleClearZone = \(zoneId: string\) => \{/, 'const handleClearZone = async (zoneId: string) => {');
code = code.replace(/const handleSortZones = \(\) => \{/, 'const handleSortZones = async () => {');
code = code.replace(/const clearLeaveFromTeams = \(\) => \{/, 'const clearLeaveFromTeams = async () => {');

// Also fix inline arrow functions in JSX: onClick={() => { if (!await 
code = code.replace(/onClick=\{\(\) => \{(?!\s*if \(!await)([^}]*?)\n?\s*if \(!await /gm, 'onClick={async () => {$1\n if (!await ');
code = code.replace(/onClick=\{\(\) => \{([^}]*?)if \(!await /gm, 'onClick={async () => {$1if (!await ');
code = code.replace(/onClick=\{\(\) => \{([^}]*?)if \(await /gm, 'onClick={async () => {$1if (await ');

fs.writeFileSync('app/dashboard/teams/page.tsx', code);
console.log('Patched teams');
