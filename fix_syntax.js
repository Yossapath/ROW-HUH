const fs = require('fs');
let code = fs.readFileSync('components/auction/AuctionItemCard.tsx', 'utf8');

code = code.replace(
  /      <\/div>\n\n      <\/div>\n      \{isEditModalOpen && <EditAuctionModal auction=\{auction\} onClose=\{\(\) => setIsEditModalOpen\(false\)\} \/>\}\n    <\/div>\n  \);\n\}/,
  '      </div>\n      {isEditModalOpen && <EditAuctionModal auction={auction} onClose={() => setIsEditModalOpen(false)} />}\n    </div>\n  );\n}'
);

fs.writeFileSync('components/auction/AuctionItemCard.tsx', code);
console.log("Fixed syntax");
