const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (!dirPath.includes('node_modules') && !dirPath.includes('.next') && !dirPath.includes('.git')) {
        walkDir(dirPath, callback);
      }
    } else {
      if (dirPath.endsWith('.ts') || dirPath.endsWith('.tsx')) {
        callback(dirPath);
      }
    }
  });
}

const storeImport = 'import { useModalStore } from "@/stores/useModalStore";\n';

walkDir('.', function(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  if (filePath.includes('GlobalModal.tsx') || filePath.includes('useModalStore.ts')) return;

  if (content.includes('alert(') || content.includes('confirm(') || content.includes('window.confirm(') || content.includes('window.alert(')) {
    // 1. Ensure import
    if (!content.includes('useModalStore')) {
      if (content.includes('"use client";')) {
        content = content.replace('"use client";\n', '"use client";\n' + storeImport);
      } else {
        content = storeImport + content;
      }
    }

    // Replace alert(...) with useModalStore.getState().alert(...)
    // Note: alert doesn't need to be awaited in most cases unless we care about blocking
    content = content.replace(/\balert\((.*?)\)/g, 'useModalStore.getState().alert($1)');
    content = content.replace(/window\.alert\((.*?)\)/g, 'useModalStore.getState().alert($1)');
    
    // For confirm, we need await, and the function needs to be async. 
    // This regex is risky, let's just do await useModalStore.getState().confirm(...) 
    // and hope the wrapping function is async. If not, it will cause a syntax error that we can fix.
    content = content.replace(/(!?)confirm\((.*?)\)/g, '$1await useModalStore.getState().confirm($2)');
    content = content.replace(/(!?)window\.confirm\((.*?)\)/g, '$1await useModalStore.getState().confirm($2)');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log(`Refactored ${filePath}`);
    }
  }
});
