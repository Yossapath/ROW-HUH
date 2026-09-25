const fs = require('fs');
let code = fs.readFileSync('lib/validations.ts', 'utf8');

code = code.replace(
  'export const auctionItemCreateSchema = z.object({\n  itemName:',
  'export const auctionItemCreateSchema = z.object({\n  imageUrl: z.string().optional(),\n  itemName:'
);

fs.writeFileSync('lib/validations.ts', code);
console.log("Patched validations.ts");
