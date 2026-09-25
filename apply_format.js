const fs = require('fs');

function applyFormatter(file) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Make sure to import formatItemName
  if (!code.includes("formatItemName")) {
    if (code.includes('import { formatTimestamp, formatDateOnly, formatTimeOnly } from "@/lib/utils";')) {
      code = code.replace('import { formatTimestamp, formatDateOnly, formatTimeOnly } from "@/lib/utils";', 'import { formatTimestamp, formatDateOnly, formatTimeOnly, formatItemName } from "@/lib/utils";');
    } else if (code.includes('import { formatTimestamp, formatTimeOnly } from "@/lib/utils";')) {
      code = code.replace('import { formatTimestamp, formatTimeOnly } from "@/lib/utils";', 'import { formatTimestamp, formatTimeOnly, formatItemName } from "@/lib/utils";');
    } else {
      code = 'import { formatItemName } from "@/lib/utils";\n' + code;
    }
  }

  code = code.replace(/\{auction\.itemName\}/g, '{formatItemName(auction.itemName, auction.category)}');
  code = code.replace(/\{selectedAuction\.itemName\}/g, '{formatItemName(selectedAuction.itemName, selectedAuction.category)}');
  
  fs.writeFileSync(file, code);
  console.log("Patched " + file);
}

applyFormatter('components/auction/AuctionItemCard.tsx');
applyFormatter('components/auction/AuctionQueuesView.tsx');
applyFormatter('components/auction/EditAuctionModal.tsx');
applyFormatter('app/dashboard/auction/page.tsx');
