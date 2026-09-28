const fs = require('fs');
let code = fs.readFileSync('components/auction/AuctionQueuesView.tsx', 'utf8');

// Import Send
code = code.replace('Copy, X', 'Copy, X, Send');

// State for Announce
const stateTarget = '  const [isCopying, setIsCopying] = useState(false);';
const stateReplace = stateTarget + '\n  const [isAnnouncing, setIsAnnouncing] = useState(false);';
code = code.replace(stateTarget, stateReplace);

// Function for Announce
const fnTarget = '  const handleCopyTags = async () => {';
const fnReplace = `  const handleAnnounce = async () => {
    if (selectedItems.length === 0) return;
    if (!await useModalStore.getState().confirm("ต้องการประกาศไอเทมที่เลือกเข้า Discord ใช่หรือไม่?")) return;
    setIsAnnouncing(true);
    try {
      const res = await fetch("/api/auctions/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auctionIds: selectedItems })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      useModalStore.getState().alert(\`ประกาศเข้า Discord สำเร็จ \${data.count} รายการ!\`);
      setSelectedItems([]);
    } catch (err: any) {
      useModalStore.getState().alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setIsAnnouncing(false);
    }
  };

  const handleCopyTags = async () => {`;
code = code.replace(fnTarget, fnReplace);

// Add Button to FAB
const buttonTarget = '              <button \n                onClick={handleCopyTags}';
const buttonReplace = `              <div className="flex items-center gap-2">
              <button 
                onClick={handleAnnounce} 
                disabled={isAnnouncing || isCopying}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {isAnnouncing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                แจ้งลงดิสคอร์ด
              </button>
              <button 
                onClick={handleCopyTags}`;
code = code.replace(buttonTarget, buttonReplace);

const buttonCloseTarget = `                คัดลอกแจ้งเตือน
              </button>
            </div>`;
const buttonCloseReplace = `                คัดลอกแจ้งเตือน
              </button>
              </div>
            </div>`;
code = code.replace(buttonCloseTarget, buttonCloseReplace);

fs.writeFileSync('components/auction/AuctionQueuesView.tsx', code);
