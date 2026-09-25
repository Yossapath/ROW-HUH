const fs = require('fs');
let code = fs.readFileSync('app/dashboard/auction/page.tsx', 'utf8');
code = code.replace('import { formatItemName } from "@/lib/utils";\n"use client";', '"use client";\nimport { formatItemName } from "@/lib/utils";');
fs.writeFileSync('app/dashboard/auction/page.tsx', code);

code = fs.readFileSync('components/auction/AuctionItemCard.tsx', 'utf8');
code = code.replace('import { formatItemName } from "@/lib/utils";\n"use client";', '"use client";\nimport { formatItemName } from "@/lib/utils";');
fs.writeFileSync('components/auction/AuctionItemCard.tsx', code);

code = fs.readFileSync('components/auction/AuctionQueuesView.tsx', 'utf8');
code = code.replace('import { formatItemName } from "@/lib/utils";\n"use client";', '"use client";\nimport { formatItemName } from "@/lib/utils";');
fs.writeFileSync('components/auction/AuctionQueuesView.tsx', code);

code = fs.readFileSync('components/auction/EditAuctionModal.tsx', 'utf8');
code = code.replace('import { formatItemName } from "@/lib/utils";\n"use client";', '"use client";\nimport { formatItemName } from "@/lib/utils";');
fs.writeFileSync('components/auction/EditAuctionModal.tsx', code);
console.log("Fixed use client");
