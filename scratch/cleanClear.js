const fs = require('fs');
let code = fs.readFileSync('app/dashboard/castle/page.tsx', 'utf8');

const modalRegex = /<div className="flex flex-col gap-2 w-full">[\s\S]*?<\/div>/;
const newButtons = `              <div className="flex flex-col gap-2 w-full">
                <button type="button" disabled={isClearing} onClick={() => handleConfirmClearAll("all")} className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2 mt-2">
                  {isClearing ? <Loader2 size={16} className="animate-spin" /> : null}
                  ยืนยันล้างทีมทั้งหมด
                </button>
              </div>`;

code = code.replace(modalRegex, newButtons);
fs.writeFileSync('app/dashboard/castle/page.tsx', code, 'utf8');
