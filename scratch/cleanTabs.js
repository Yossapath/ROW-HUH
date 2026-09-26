const fs = require('fs');
let code = fs.readFileSync('app/dashboard/castle/page.tsx', 'utf8');

const tabsRegex = /<div className="flex gap-2 mb-4 bg-white dark:bg-\[#232733\] p-1\.5 rounded-xl border border-slate-200 dark:border-\[#2D3342\] shadow-sm self-start overflow-x-auto max-w-full">[\s\S]*?<\/div>\s*<div className="flex-1">/m;
code = code.replace(tabsRegex, '<div className="flex-1">');

code = code.replace(/\{activeTab === "main" && \(\s*(<div className="space-y-10 pb-12 bg-\[#f0f6fc\] dark:bg-\[#1C1F27\] print-export-padding">)/m, '');

const subRegex = /\{activeTab === "sub" && \([\s\S]*?\}\s*\)\}/;
code = code.replace(subRegex, '');

const leaveRegex = /\{activeTab === "leave" && \([\s\S]*?\}\s*\)\}/;
code = code.replace(leaveRegex, '');

code = code.replace(/<\/div>\s*\)\}\s*<\/div>\s*<\/DragDropContext>/, '</div></div></DragDropContext>');

code = code.replace(/สร้างโซนใหม่ \(ชิงปราสาท\)/g, 'สร้างโซนใหม่');
code = code.replace(/สร้างโซนใหม่ \(\)/g, 'สร้างโซนใหม่');

fs.writeFileSync('app/dashboard/castle/page.tsx', code, 'utf8');
console.log('Cleaned up Tabs and Sub/Leave fields.');
