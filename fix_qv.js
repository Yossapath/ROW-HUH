const fs = require('fs');
let qv = fs.readFileSync('components/auction/AuctionQueuesView.tsx', 'utf8');

// 1. Props
qv = qv.replace('interface Props {\n  auctions: AuctionItem[];\n}', 'interface Props {\n  auctions: AuctionItem[];\n  favorites?: string[];\n  onToggleFavorite?: (id: string, e: React.MouseEvent) => void;\n}');

// 2. Component signature
qv = qv.replace('export function AuctionQueuesView({ auctions }: Props) {', 'export function AuctionQueuesView({ auctions, favorites = [], onToggleFavorite }: Props) {');

// 3. Remove local state
qv = qv.replace('  const [favorites, setFavorites] = useState<string[]>([]);\n  \n  useEffect(() => { \n    try {\n      const stored = localStorage.getItem("huh_auction_favorites");\n      if (stored) setFavorites(JSON.parse(stored));\n    } catch {}\n    setIsMounted(true); \n  }, []);\n\n  const toggleFavorite = (id: string, e: React.MouseEvent) => {\n    e.stopPropagation();\n    let next;\n    if (favorites.includes(id)) {\n      next = favorites.filter(f => f !== id);\n    } else {\n      next = [...favorites, id];\n    }\n    setFavorites(next);\n    localStorage.setItem("huh_auction_favorites", JSON.stringify(next));\n  };\n', '  useEffect(() => { setIsMounted(true); }, []);\n  const handleToggleFav = (id: string, e: React.MouseEvent) => { if (onToggleFavorite) onToggleFavorite(id, e); };\n');

// 4. Update the onClick
qv = qv.replace(/onClick=\{\(e\) => toggleFavorite\(auction\.id, e\)\}/g, 'onClick={(e) => handleToggleFav(auction.id, e)}');

fs.writeFileSync('components/auction/AuctionQueuesView.tsx', qv);
