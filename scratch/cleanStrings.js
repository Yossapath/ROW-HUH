const fs = require('fs');
let code = fs.readFileSync('app/dashboard/castle/page.tsx', 'utf8');

code = code.replace(/สร้างโซนใหม่ \(สนามหลัก\)/g, 'สร้างโซนใหม่');
code = code.replace(/\(z\.type === "main" \? "สนามหลัก" : "สนามรอง"\)/g, '');
// Let's replace the whole option string in the select
code = code.replace(/<option key={z\.id} value={z\.id}>{z\.name} \(\{z\.type === "main" \? "สนามหลัก" : "สนามรอง"\}\)<\/option>/g, '<option key={z.id} value={z.id}>{z.name}</option>');

fs.writeFileSync('app/dashboard/castle/page.tsx', code, 'utf8');
