const fs = require('fs');
let code = fs.readFileSync('lib/utils.ts', 'utf8');

code += `\n
export function formatItemName(name: string, category?: string): string {
  if (category?.toLowerCase() === "relic") {
    const n = name.toLowerCase();
    if (n.includes("blade of destruction") || n.includes("ล้างผลาญ")) {
      return "ล้างผลาญ (Blade of Destruction)";
    }
    if (n.includes("radiant holy shield") || n.includes("พิทักษ์")) {
      return "พิทักษ์ (Radiant Holy Shield)";
    }
  }
  return name;
}
`;

fs.writeFileSync('lib/utils.ts', code);
console.log("Added formatItemName to utils.ts");
