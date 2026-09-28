const fs = require('fs');
let code = fs.readFileSync('app/dashboard/auction/page.tsx', 'utf8');
code = code.replace(
  'const isLoading = loadingAuctions || (activeTab === "my" && loadingMy);',
  'displayedAuctions.sort((a, b) => { const aFav = favorites.includes(a.id) ? 1 : 0; const bFav = favorites.includes(b.id) ? 1 : 0; if (aFav !== bFav) return bFav - aFav; return 0; });\n\n  const isLoading = loadingAuctions || (activeTab === "my" && loadingMy);'
);
fs.writeFileSync('app/dashboard/auction/page.tsx', code);
