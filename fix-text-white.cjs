const fs = require('fs');
const path = require('path');

function fixTextWhite(content) {
  // Find all className="something" or className={`something`}
  let newContent = content.replace(/className=(["`])(.*?)\1/g, (match, quote, classStr) => {
    // if it contains text-white
    if (classStr.includes('text-white')) {
      // Check if it has a solid dark background class
      const hasDarkBg = /(bg-primary|bg-blue-500|bg-blue-600|bg-blue-700|bg-green-500|bg-green-600|bg-red-500|bg-red-600|bg-indigo-600|bg-purple-600|bg-black)\b/.test(classStr);
      
      if (!hasDarkBg) {
        // Replace text-white with text-blue-900
        const newClassStr = classStr.replace(/\btext-white\b/g, 'text-blue-900');
        return `className=${quote}${newClassStr}${quote}`;
      }
    }
    return match;
  });

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
      const newContent = fixTextWhite(content);
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log('Fixed text-white in', fullPath);
      }
    }
  }
}

walkDir('./src');
