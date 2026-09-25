const fs = require('fs');
let code = fs.readFileSync('components/auction/AuctionItemCard.tsx', 'utf8');

// Add import for EditAuctionModal and Edit2 icon
if (!code.includes('EditAuctionModal')) {
  code = code.replace(
    'import { AuctionItem, AuctionReservation } from "@/types";',
    'import { AuctionItem, AuctionReservation } from "@/types";\nimport { EditAuctionModal } from "./EditAuctionModal";\nimport { Edit2 } from "lucide-react";'
  );
  code = code.replace(
    'import { Edit2 } from "lucide-react";\nimport { Edit2 } from "lucide-react";',
    'import { Edit2 } from "lucide-react";'
  );
}

// Add state for EditModal
if (!code.includes('isEditModalOpen')) {
  code = code.replace(
    'const queryClient = useQueryClient();',
    'const queryClient = useQueryClient();\n  const [isEditModalOpen, setIsEditModalOpen] = useState(false);'
  );
  // Ensure useState is imported
  if (!code.includes('import { useState }')) {
    code = code.replace(
      'import { useMutation',
      'import { useState } from "react";\nimport { useMutation'
    );
  }
}

// Replace buttons with Edit button
code = code.replace(
  /<div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-200 dark:border-slate-700">[\s\S]*?<\/div>/m,
  `<div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-[#2D3342] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#3B4358] transition-colors"
              >
                <Edit2 size={14} />
                แก้ไข
              </button>
            </div>`
);

// Inject modal at the end before closing div
code = code.replace(
  '      </div>\n  );\n}',
  '      </div>\n      {isEditModalOpen && <EditAuctionModal auction={auction} onClose={() => setIsEditModalOpen(false)} />}\n    </div>\n  );\n}'
);

fs.writeFileSync('components/auction/AuctionItemCard.tsx', code);
