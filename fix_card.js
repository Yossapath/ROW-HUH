const fs = require('fs');
let card = fs.readFileSync('components/auction/AuctionItemCard.tsx', 'utf8');
card = card.replace('export function AuctionItemCard({ auction, isAdmin, myReservations, isFavorite, onToggleFavorite }: Props) {\n  import { Star } from "lucide-react";', 'export function AuctionItemCard({ auction, isAdmin, myReservations, isFavorite, onToggleFavorite }: Props) {');
card = card.replace('import { Edit2 } from "lucide-react";', 'import { Edit2, Star } from "lucide-react";');
fs.writeFileSync('components/auction/AuctionItemCard.tsx', card);
