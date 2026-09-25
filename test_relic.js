function formatItemName(name, category) {
  if (category?.toLowerCase() === "relic") {
    const n = name.toLowerCase();
    
    if (n.includes("blade of destruction") || n.includes("ล้างผลาญ") || n.includes("radiant holy shield") || n.includes("พิทักษ์")) {
      let extra = name
        .replace(/blade of destruction/ig, "")
        .replace(/ล้างผลาญ/g, "")
        .replace(/radiant holy shield/ig, "")
        .replace(/พิทักษ์/g, "")
        .replace(/\(\s*\)/g, "")
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
}

console.log(formatItemName("พิทักษ์ (AGI+10)", "relic"));
console.log(formatItemName("Blade of Destruction INT+5", "relic"));
console.log(formatItemName("ล้างผลาญ", "relic"));
console.log(formatItemName("radiant holy shield (VIT+20)", "Relic"));
