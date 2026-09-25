const fs = require('fs');
let code = fs.readFileSync('lib/validations.ts', 'utf8');

if (!code.includes('imageUrl: z.string().optional()', code.indexOf('auctionItemCreateSchema'))) {
  code = code.replace(
    'export const auctionItemCreateSchema = z.object({',
    'export const auctionItemCreateSchema = z.object({\n  imageUrl: z.string().optional(),'
  );
  fs.writeFileSync('lib/validations.ts', code);
  console.log("Patched validations.ts");
}
