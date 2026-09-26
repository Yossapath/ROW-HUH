const fs = require('fs');
let code = fs.readFileSync('app/dashboard/castle/page.tsx', 'utf8');

code = code.replace(/const \[activeTab, setActiveTab\] = useState<"main" \| "sub" \| "leave">.+/g, '');
code = code.replace(/data\.zones\.filter\(\(z\) => z\.type === \(activeTab === "sub" \? "sub" : "main"\)\)/g, 'data.zones');
code = code.replace(/\$\{activeTab === 'main' \? 'สนามหลัก' : 'สนามรอง'\}/g, 'ชิงปราสาท');
code = code.replace(/setActiveTab\("leave"\);/g, '');
code = code.replace(/if \(activeTab === "main" && m\.gvgField === "sub"\) return false;/g, '');
code = code.replace(/if \(activeTab === "sub" && m\.gvgField !== "sub"\) return false;/g, '');
code = code.replace(/title=\{activeTab === "sub" \? "CASTLE SIEGE SETUP \(สนามรอง\)" : "CASTLE SIEGE SETUP"\}/g, 'title="CASTLE SIEGE SETUP"');

fs.writeFileSync('app/dashboard/castle/page.tsx', code, 'utf8');
