const fs = require('fs');

// Fix QueueBoard.tsx - inline onClick with await
let code = fs.readFileSync('components/dungeon/QueueBoard.tsx', 'utf8');
code = code.replace(
  /onClick=\{.*?=>\s*\{\s*if\s*\(!await/gs,
  (match) => match.replace('() => {', 'async () => {').replace('(e) => {', 'async (e) => {')
);
// More targeted fix:
code = code.replace('onClick={() => { if (!await useModalStore', 'onClick={async () => { if (!await useModalStore');
code = code.replace('onClick={() =>{ if (!await useModalStore', 'onClick={async () =>{ if (!await useModalStore');
fs.writeFileSync('components/dungeon/QueueBoard.tsx', code);
console.log('Patched QueueBoard');

// Fix all remaining inline JSX onClick/onChange without async that have await
const filesToCheck = [
  'app/dashboard/teams/page.tsx',
  'app/dashboard/attendance/page.tsx',
  'app/dashboard/dungeon/page.tsx',
  'app/dashboard/log/page.tsx',
  'app/dashboard/roster/page.tsx',
  'components/auction/AuctionItemCard.tsx',
  'components/auction/AuctionQueuesView.tsx',
];
filesToCheck.forEach(f => {
  if (!fs.existsSync(f)) return;
  let c = fs.readFileSync(f, 'utf8');
  const changed = c
    .replace(/onClick=\{(\s*)\(\)\s*=>\s*\{([^}]*?)if\s*\(!await/g, 'onClick={$1async () => {$2if (!await')
    .replace(/onClick=\{(\s*)\(\)\s*=>\s*\{([^}]*?)if\s*\(await/g, 'onClick={$1async () => {$2if (await')
    .replace(/onChange=\{(\s*)\(e\)\s*=>\s*\{([^}]*?)if\s*\(!await/g, 'onChange={$1async (e) => {$2if (!await')
    .replace(/onChange=\{(\s*)\(e\)\s*=>\s*\{([^}]*?)if\s*\(await/g, 'onChange={$1async (e) => {$2if (await');
  if (changed !== c) {
    fs.writeFileSync(f, changed);
    console.log('Patched ' + f);
  }
});
