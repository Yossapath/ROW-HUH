const fs = require('fs');

// Fix 1: AuctionItemCard - replace browser confirm with custom modal-style inline confirm
let card = fs.readFileSync('components/auction/AuctionItemCard.tsx', 'utf8');

// Replace the close/open button confirm
card = card.replace(
  `onClick={async () => {
                    const newStatus = auction.status === "open" ? "closed" : "open";
                    if (!confirm(\`เปลี่ยนสถานะเป็น \${newStatus}?\`)) return;`,
  `onClick={async () => {
                    const newStatus = auction.status === "open" ? "closed" : "open";
                    const label = newStatus === "closed" ? "ปิดรับการจอง" : "เปิดรับการจองอีกครั้ง";
                    if (!window.confirm(\`⚠️ ยืนยัน: \${label} "\\n\\n\${auction.itemName}"\\n\\nกดตกลงเพื่อยืนยัน\`)) return;`
);

// Replace delete button confirm
card = card.replace(
  `if (!confirm("ยืนยันการลบไอเทมนี้ทิ้ง? การกระทำนี้ไม่สามารถย้อนกลับได้")) return;`,
  `if (!window.confirm(\`🗑️ ยืนยันการลบ "\\n\\n\${auction.itemName}"\\n\\n⚠️ การกระทำนี้ไม่สามารถย้อนกลับได้! คิวทั้งหมดจะหายไปด้วย\`)) return;`
);

fs.writeFileSync('components/auction/AuctionItemCard.tsx', card);
console.log('AuctionItemCard patched');

// Fix 2: Sidebar - remove flex-shrink-0 so it doesn't block expansion
let sidebar = fs.readFileSync('components/Sidebar.tsx', 'utf8');
sidebar = sidebar.replace(
  'className={`flex-shrink-0 bg-[#0b3d63] dark:bg-[#171D27] h-screen flex flex-col transition-all duration-300 shadow-xl border-r border-[#082e4b] dark:border-[#1F2430] z-30 ${',
  'className={`bg-[#0b3d63] dark:bg-[#171D27] h-screen flex flex-col transition-all duration-300 shadow-xl border-r border-[#082e4b] dark:border-[#1F2430] z-30 ${'
);
fs.writeFileSync('components/Sidebar.tsx', sidebar);
console.log('Sidebar patched');
