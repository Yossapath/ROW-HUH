const fs = require('fs');
let card = fs.readFileSync('components/auction/AuctionItemCard.tsx', 'utf8');

const oldStr = `<h3 className="notranslate font-bold text-slate-800 dark:text-white truncate" translate="no">{formatItemName(auction.itemName, auction.category)}</h3>`;
const newStr = `<div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleFavorite}
                  className="p-1 -ml-1 rounded-md hover:bg-slate-200 dark:hover:bg-[#32394A] transition-colors shrink-0"
                >
                  <Star size={16} className={isFavorite ? "fill-yellow-400 text-yellow-400" : "text-slate-300 dark:text-slate-600"} />
                </button>
                <h3 className="notranslate font-bold text-slate-800 dark:text-white truncate" translate="no">{formatItemName(auction.itemName, auction.category)}</h3>
              </div>`;

card = card.replace(oldStr, newStr);
fs.writeFileSync('components/auction/AuctionItemCard.tsx', card);
