const fs = require('fs');
let code = fs.readFileSync('app/dashboard/castle/page.tsx', 'utf8');

if (code.includes('dark:bg-[#272C38]/150')) {
  code = code.replace(/dark:bg-\[#272C38\]\/150/g, 'dark:bg-[#272C38]/60');
  fs.writeFileSync('app/dashboard/castle/page.tsx', code, 'utf8');
  console.log("Replaced 150 with 60 in page.tsx");
} else {
  console.log("Could not find the class.");
}
