const fs = require('fs');
const path = require('path');

function replaceColors(content) {
  let newContent = content
    .replace(/bg-slate-950/g, 'bg-gray-50')
    .replace(/bg-slate-900\/50/g, 'bg-white/50')
    .replace(/bg-slate-900/g, 'bg-white')
    .replace(/bg-slate-800/g, 'bg-blue-50')
    .replace(/bg-slate-700/g, 'bg-blue-100')
    .replace(/bg-slate-600/g, 'bg-blue-200')
    
    .replace(/bg-gray-900/g, 'bg-blue-50')
    .replace(/bg-gray-950/g, 'bg-white')

    .replace(/border-slate-800/g, 'border-blue-100')
    .replace(/border-slate-700/g, 'border-blue-100')
    .replace(/border-slate-600/g, 'border-blue-200')
    
    .replace(/text-slate-500/g, 'text-blue-500')
    .replace(/text-slate-400/g, 'text-blue-600')
    .replace(/text-slate-300/g, 'text-blue-700')
    .replace(/text-slate-200/g, 'text-blue-800')
    .replace(/text-gray-100/g, 'text-blue-900')
    .replace(/text-gray-200/g, 'text-blue-800')
    .replace(/text-gray-300/g, 'text-blue-700')
    .replace(/text-gray-400/g, 'text-blue-500')
    .replace(/text-gray-500/g, 'text-blue-400')
    .replace(/text-gray-900/g, 'text-blue-950')
    .replace(/shadow-blue-900\/20/g, 'shadow-blue-500\/10');

  return newContent;
}

const walkDir = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const newContent = replaceColors(content);
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log('Updated', fullPath);
      }
    }
  }
}

walkDir('./src');
