// Post-build: add .js extension to relative ESM imports
const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Replace relative imports without .js extension
  content = content.replace(
    /from\s+(['"])(\.\.[^'"]*|\.[^'"]*)(['"])/g,
    (match, quote, importPath, endQuote) => {
      // Skip if already has a file extension (.js, .ts, .json, etc.)
      if (/\.[a-zA-Z0-9]+$/.test(importPath) || importPath.startsWith('@/')) return match;
      // Skip node built-ins and package names
      if (!importPath.startsWith('.')) return match;
      return `from ${quote}${importPath}.js${endQuote}`;
    }
  );
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed:', filePath);
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      walkDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      processFile(fullPath);
    }
  }
}

walkDir(path.join(__dirname, 'dist'));
console.log('Done fixing ESM imports');
