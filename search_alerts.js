const fs = require('fs');
const glob = require('glob');

// Since glob might not be installed, we'll write a simple recursive file reader
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

walkDir('.', function(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('confirm(') || content.includes('window.confirm(') || content.includes('alert(')) {
    console.log(`\n--- ${filePath} ---`);
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('confirm(') || line.includes('window.confirm(') || line.includes('alert(')) {
        console.log(`${index + 1}: ${line.trim()}`);
      }
    });
  }
});
