const fs = require('fs');

let file = 'components/auction/AuctionQueuesView.tsx';
let data = fs.readFileSync(file, 'utf8');

// Ensure rosterData is an object
data = data.replace(
  'const rosterData = rosterRes?.data?.data || rosterRes?.data || {};',
  'const rosterData = (typeof rosterRes?.data?.data === "object" ? rosterRes?.data?.data : (typeof rosterRes?.data === "object" ? rosterRes?.data : {})) || {};'
);
data = data.replace(
  'const roster = Object.entries(rosterData).flatMap(([job, members]) => Array.isArray(members) ? members.map((m: any) => ({ ...m, job })) : []);',
  'const roster = Object.entries(rosterData || {}).flatMap(([job, members]) => Array.isArray(members) ? members.map((m: any) => ({ ...m, job })) : []);'
);
// Ensure items map is safe
data = data.replace('reorderMutation.mutate(items.map(item => item.id));', 'reorderMutation.mutate((items || []).map(item => item.id));');

fs.writeFileSync(file, data);

let file2 = 'app/dashboard/auction/page.tsx';
let data2 = fs.readFileSync(file2, 'utf8');

data2 = data2.replace(
  'const myAuctionIds = myReservations.map(r => r.auctionId);',
  'const myAuctionIds = (Array.isArray(myReservations) ? myReservations : []).map(r => r.auctionId);'
);
data2 = data2.replace(
  'const auctions = auctionsRes?.data || [];',
  'const auctions = Array.isArray(auctionsRes?.data) ? auctionsRes.data : [];'
);
data2 = data2.replace(
  'const myReservations = myRes?.data || [];',
  'const myReservations = Array.isArray(myRes?.data) ? myRes.data : [];'
);

fs.writeFileSync(file2, data2);
console.log('Fixed more iterables');
