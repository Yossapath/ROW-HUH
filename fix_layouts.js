const fs = require('fs');
const glob = require('glob');

const files = [
  'app/dashboard/attendance/page.tsx',
  'app/dashboard/dungeon/page.tsx',
  'app/dashboard/leave/page.tsx',
  'app/dashboard/log/page.tsx',
  'app/dashboard/users/page.tsx'
];

files.forEach(file => {
  if(fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/p-4 lg:py-8 lg:px-12 xl:px-24 2xl:px-32/g, 'p-4 lg:py-6 lg:px-6 2xl:px-8');
    fs.writeFileSync(file, content);
    console.log('Patched', file);
  }
});

const auctionFile = 'app/dashboard/auction/page.tsx';
if(fs.existsSync(auctionFile)) {
  let content = fs.readFileSync(auctionFile, 'utf8');
  content = content.replace(/w-full max-w-\[1400px\] mx-auto pb-20 p-4 sm:p-6 lg:p-8/g, 'space-y-6 bg-[#f0f6fc] dark:bg-[#1C1F27] min-h-screen p-4 lg:py-6 lg:px-6 2xl:px-8 relative');
  fs.writeFileSync(auctionFile, content);
  console.log('Patched', auctionFile);
}
