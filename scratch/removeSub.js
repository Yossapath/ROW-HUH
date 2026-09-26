const fs = require('fs');
let lines = fs.readFileSync('app/dashboard/castle/page.tsx', 'utf8').split('\n');
// We need to remove from line 1286 to line 1397. 
// JavaScript array is 0-indexed, so line 1286 is index 1285.
// We want to delete (1397 - 1286 + 1) = 112 lines.
// Let's first search for the exact lines to be safe.

const startIdx = lines.findIndex((l, i) => i > 1250 && l.trim() === ')}' && lines[i+2] && lines[i+2].trim() === '{activeTab === "sub" && (');
if (startIdx !== -1) {
    const endIdx = lines.findIndex((l, i) => i > startIdx + 100 && l.trim() === ')}' && lines[i+1] && lines[i+1].includes('</div>'));
    if (endIdx !== -1) {
        lines.splice(startIdx, endIdx - startIdx + 1);
        fs.writeFileSync('app/dashboard/castle/page.tsx', lines.join('\n'), 'utf8');
        console.log('Successfully removed lines from', startIdx + 1, 'to', endIdx + 1);
    } else {
        console.log('Could not find end index');
    }
} else {
    console.log('Could not find start index');
}
