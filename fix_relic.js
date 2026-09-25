const fs = require('fs');
let code = fs.readFileSync('lib/utils.ts', 'utf8');

const newFunc = `export function formatItemName(name: string, category?: string): string {
  if (category?.toLowerCase() === "relic") {
    const n = name.toLowerCase();
    
    if (n.includes("blade of destruction") || n.includes("ล้างผลาญ") || n.includes("radiant holy shield") || n.includes("พิทักษ์")) {
      let extra = name
        .replace(/blade of destruction/ig, "")
        .replace(/ล้างผลาญ/g, "")
        .replace(/radiant holy shield/ig, "")
        .replace(/พิทักษ์/g, "")
        .replace(/\\(\\s*\\)/g, "")
        .trim();
      
      if (extra.startsWith("-")) extra = extra.substring(1).trim();

      if (n.includes("blade of destruction") || n.includes("ล้างผลาญ")) {
        return "ล้างผลาญ (Blade of Destruction)" + (extra ? " " + extra : "");
      }
      if (n.includes("radiant holy shield") || n.includes("พิทักษ์")) {
        return "พิทักษ์ (Radiant Holy Shield)" + (extra ? " " + extra : "");
      }
    }
  }
  return name;
}`;

// Replace the old function
code = code.replace(/export function formatItemName[\s\S]*?return name;\n\}/m, newFunc);

fs.writeFileSync('lib/utils.ts', code);
console.log("Updated formatItemName");
