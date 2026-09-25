const fs = require('fs');
let data = fs.readFileSync('components/auction/AuctionQueuesView.tsx', 'utf8');

// Change default state of isSidebarOpen to true
data = data.replace('const [isSidebarOpen, setIsSidebarOpen] = useState(false);', 'const [isSidebarOpen, setIsSidebarOpen] = useState(true);');

// Change the toggle button to show on desktop as well
data = data.replace('<div className="lg:hidden mb-4">', '<div className="mb-4 flex items-center justify-between">');
// Note: We want to keep the toggle button, but maybe we can make it look nicer.
// Let's replace the whole toggle button block
data = data.replace(
  '<div className="mb-4 flex items-center justify-between">\n          <button \n            onClick={() => setIsSidebarOpen(!isSidebarOpen)}\n            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1A1D27] border border-slate-200 dark:border-[#2D3342] rounded-xl font-bold text-sm shadow-sm"\n          >\n            <Menu size={16} />\n            {isSidebarOpen ? "ซ่อนเมนูเลือกไอเทม" : "เปิดเมนูเลือกไอเทม"}\n          </button>\n        </div>',
  '<div className="mb-4 flex items-center justify-between">\n          <button \n            onClick={() => setIsSidebarOpen(!isSidebarOpen)}\n            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1A1D27] border border-slate-200 dark:border-[#2D3342] rounded-xl font-bold text-sm shadow-sm hover:bg-slate-50 transition-colors"\n          >\n            <Menu size={16} />\n            {isSidebarOpen ? "ซ่อนเมนูเลือกไอเทม" : "เปิดเมนูเลือกไอเทม"}\n          </button>\n        </div>'
);

// If the previous replace failed because I used the wrong exact string (it was lg:hidden before), let's do regex
data = data.replace(/<div className="lg:hidden mb-4">[\s\S]*?<\/button>\s*<\/div>/, `<div className="mb-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1A1D27] hover:bg-slate-50 dark:hover:bg-[#232733] border border-slate-200 dark:border-[#2D3342] rounded-xl font-bold text-sm shadow-sm transition-colors"
          >
            <Menu size={16} />
            {isSidebarOpen ? "ซ่อนเมนูเลือกไอเทม" : "เปิดเมนูเลือกไอเทม"}
          </button>
        </div>`);

// Change the sidebar width class to be truly hidden when !isSidebarOpen
// It used to be `${isSidebarOpen ? "flex" : "hidden lg:flex"}`
data = data.replace(
  'className={`w-full lg:w-1/3 flex-col gap-4 ${isSidebarOpen ? "flex" : "hidden lg:flex"}`}',
  'className={`w-full lg:w-1/3 flex-col gap-4 ${isSidebarOpen ? "flex" : "hidden"}`}'
);

// Main content width - it should expand to full width if sidebar is hidden
data = data.replace(
  '<div className="w-full lg:w-2/3">',
  '<div className={`w-full ${isSidebarOpen ? "lg:w-2/3" : "lg:w-full"}`}>'
);

fs.writeFileSync('components/auction/AuctionQueuesView.tsx', data);
console.log('Fixed Sidebar visibility');
