const fs = require('fs');
let code = fs.readFileSync('lib/validations.ts', 'utf8');

if (!code.includes('imageUrl: z.string().optional()')) {
  code = code.replace(
    'export const auctionItemUpdateSchema = z.object({',
    'export const auctionItemUpdateSchema = z.object({\n  imageUrl: z.string().optional(),'
  );
  code = code.replace(
    'export const auctionItemSchema = z.object({',
    'export const auctionItemSchema = z.object({\n  imageUrl: z.string().optional(),'
  );
  fs.writeFileSync('lib/validations.ts', code);
  console.log("Patched validations.ts");
}
