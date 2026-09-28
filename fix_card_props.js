const fs = require('fs');
let card = fs.readFileSync('components/auction/AuctionItemCard.tsx', 'utf8');

// Props
card = card.replace('interface Props {\n  auction: AuctionItem;\n  isAdmin: boolean;\n  myReservations: any[];\n}', 'interface Props {\n  auction: AuctionItem;\n  isAdmin: boolean;\n  myReservations: any[];\n  isFavorite?: boolean;\n  onToggleFavorite?: (e: React.MouseEvent) => void;\n}');

// Signature
card = card.replace('export function AuctionItemCard({ auction, isAdmin, myReservations }: Props) {', 'export function AuctionItemCard({ auction, isAdmin, myReservations, isFavorite, onToggleFavorite }: Props) {');

fs.writeFileSync('components/auction/AuctionItemCard.tsx', card);
