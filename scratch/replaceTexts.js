const fs = require('fs');
let code = fs.readFileSync('app/dashboard/castle/page.tsx', 'utf8');

code = code.replace(/จัดทีม GVG/g, 'จัดทีม ชิงปราสาท');
code = code.replace(/GVG TEAM SETUP/g, 'CASTLE SIEGE SETUP');
code = code.replace(/กำลังสร้างภาพสรุป GVG/g, 'กำลังสร้างภาพสรุป ชิงปราสาท');

fs.writeFileSync('app/dashboard/castle/page.tsx', code, 'utf8');
console.log('Replaced texts');
