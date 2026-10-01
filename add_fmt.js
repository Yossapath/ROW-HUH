const fs = require('fs');
let c = fs.readFileSync('lib/utils.ts', 'utf8');

// Add the formatCategoryLabel function near the end
c += `\n\nexport function formatCategoryLabel(category: string): string {
  if (category === 'gear80') return 'Gear Lv.80';
  if (category === 'gear90') return 'Gear Lv.90';
  if (category === 'card') return 'Card';
  if (category === 'relic') return 'Relic';
  if (category === 'pet') return 'Pet';
  return category;
}\n`
fs.writeFileSync('lib/utils.ts', c);
