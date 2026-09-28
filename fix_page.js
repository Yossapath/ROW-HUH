const fs = require('fs');
let code = fs.readFileSync('app/dashboard/auction/page.tsx', 'utf8');

// 1. Add Star import
if (!code.includes('import { Star } from "lucide-react"')) {
  code = code.replace(
    'import { Gavel, RefreshCw, PackageOpen, LayoutGrid, Sword, Layers, Plus, Search } from "lucide-react";',
    'import { Gavel, RefreshCw, PackageOpen, LayoutGrid, Sword, Layers, Plus, Search, Star } from "lucide-react";'
  );
}

// 2. Add 'favorites' category
code = code.replace(
  'const CATEGORIES: { id: AuctionCategory | "all" | "my"; label: string; icon: any }[] = [',
  'const CATEGORIES: { id: AuctionCategory | "all" | "my" | "favorites"; label: string; icon: any }[] = ['
);
code = code.replace(
  '{ id: "all", label: "ทั้งหมด", icon: LayoutGrid },',
  '{ id: "all", label: "ทั้งหมด", icon: LayoutGrid },\n  { id: "favorites", label: "รายการโปรด", icon: Star },'
);

// 3. Persist state + fix filtering
code = code.replace(
  'const [activeTab, setActiveTab] = useState<AuctionCategory | "all" | "my">("all");',
  'const [activeTab, setActiveTab] = useState<AuctionCategory | "all" | "my" | "favorites">("all");'
);
code = code.replace(
  'const [viewMode, setViewMode] = useState<"reserve" | "queues">("reserve");',
  'const [viewMode, setViewMode] = useState<"reserve" | "queues">("reserve");'
);

// We need to inject useEffect to load and save states.
const useEffectReplacement = `
  useEffect(() => {
    try {
      const storedFav = localStorage.getItem("huh_auction_favorites");
      if (storedFav) setFavorites(JSON.parse(storedFav));
      
      const storedTab = localStorage.getItem("huh_auction_activeTab");
      if (storedTab) setActiveTab(storedTab as any);
      
      const storedView = localStorage.getItem("huh_auction_viewMode");
      if (storedView) setViewMode(storedView as any);
    } catch {}
  }, []);

  const handleTabChange = (tab: any) => {
    setActiveTab(tab);
    localStorage.setItem("huh_auction_activeTab", tab);
  };

  const handleViewModeChange = (mode: any) => {
    setViewMode(mode);
    localStorage.setItem("huh_auction_viewMode", mode);
  };
`;
code = code.replace(
  'useEffect(() => { try { const stored = localStorage.getItem("huh_auction_favorites"); if (stored) setFavorites(JSON.parse(stored)); } catch {} }, []);',
  useEffectReplacement
);

// Replace onClick setViewMode and setActiveTab
code = code.replaceAll('setViewMode("reserve")', 'handleViewModeChange("reserve")');
code = code.replaceAll('setViewMode("queues")', 'handleViewModeChange("queues")');
code = code.replaceAll('setActiveTab(cat.id)', 'handleTabChange(cat.id)');


// 4. Update filtering logic for 'favorites'
code = code.replace(
  '} else if (activeTab !== "all") {',
  '} else if (activeTab === "favorites") {\n      displayedAuctions = auctions.filter(a => favorites.includes(a.id) && a.itemName.toLowerCase().includes(searchQuery.toLowerCase()));\n    } else if (activeTab !== "all") {'
);

fs.writeFileSync('app/dashboard/auction/page.tsx', code);
