const fs = require('fs');
let code = fs.readFileSync('components/auction/AuctionQueuesView.tsx', 'utf8');

// Remove the old toggle button completely
code = code.replace(
  /<div className="mb-4 flex items-center justify-between">[\s\S]*?<\/button>\s*<\/div>/,
  ''
);

// Add toggle button to Main Content header (when item selected)
code = code.replace(
  '<div className="flex items-center gap-4">',
  '<div className="flex items-center gap-4">\n                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-[#232733] dark:hover:bg-[#2A2F3E] rounded-lg transition-colors">\n                      <Menu size={20} />\n                    </button>'
);

// Add toggle button to empty state
code = code.replace(
  /<div className="flex-1 flex items-center justify-center text-slate-400 p-8">\s*<p>กรุณาเลือกไอเทมจากเมนูด้านซ้าย<\/p>\s*<\/div>/,
  `<div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 gap-4">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-[#232733] dark:hover:bg-[#2A2F3E] rounded-xl transition-colors shadow-sm">
                <Menu size={24} />
              </button>
              <p>กรุณาเลือกไอเทมจากเมนู</p>
            </div>`
);

fs.writeFileSync('components/auction/AuctionQueuesView.tsx', code);
console.log("Patched!");
