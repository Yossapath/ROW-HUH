const fs = require('fs');
let code = fs.readFileSync('app/dashboard/users/page.tsx', 'utf8');
code = code.replace('onChange={(e) => {\n                                 if (await \nuseModalStore', 'onChange={async (e) => {\n                                 if (await \nuseModalStore');
// Also a general regex just in case
code = code.replace(/onChange=\{\(e\) => \{\s*if \(await /g, 'onChange={async (e) => { if (await ');
code = code.replace(/onClick=\{\(\) => \{\s*if \(await /g, 'onClick={async () => { if (await ');
fs.writeFileSync('app/dashboard/users/page.tsx', code);
console.log("Patched users");
