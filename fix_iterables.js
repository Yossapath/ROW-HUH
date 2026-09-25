const fs = require('fs');

let file = 'components/auction/AuctionQueuesView.tsx';
let data = fs.readFileSync(file, 'utf8');

// Fix queue.map -> (queue || []).map
data = data.replace(/\{queue\.map\(/g, '{(queue || []).map(');

// Fix roster.map -> (roster || []).map
data = data.replace(/\{roster\.map\(/g, '{(roster || []).map(');

// Fix Array.from(queue) -> Array.from(queue || [])
data = data.replace(/Array\.from\(queue\)/g, 'Array.from(queue || [])');

// Fix Array.isArray(members) ? members.map -> Array.isArray(members) ? members.map
// Already safe, but just in case
data = data.replace(/rosterData \= rosterRes\?\.data \|\| \{\};/g, 'rosterData = rosterRes?.data?.data || rosterRes?.data || {};');

fs.writeFileSync(file, data);

let file2 = 'app/dashboard/auction/page.tsx';
let data2 = fs.readFileSync(file2, 'utf8');

// Fix displayedAuctions.map -> (displayedAuctions || []).map
data2 = data2.replace(/displayedAuctions\.map\(/g, '(displayedAuctions || []).map(');

fs.writeFileSync(file2, data2);

console.log('Fixed iterables');
