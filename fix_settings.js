const fs = require('fs');

let code = fs.readFileSync('./src/components/AdminPanel.tsx', 'utf8');

const extractTab = (name) => {
   const match = code.split(`{activeTab === '${name}' && (`)[1];
   if (!match) return '';
   const content = match.split('</section>')[0];
   code = code.replace(`{activeTab === '${name}' && (` + content + `</section>\n      )}`, ''); // removes it
   let cleanContent = content.replace(/^[\s\S]*?<section[^>]*>/, '').trim(); 
   return cleanContent;
}

const telegramHtml = extractTab('telegram');
const newsHtml = extractTab('news');
const partnersHtml = extractTab('partners');
const branchesHtml = extractTab('branches');

const detailsTemplate = (title, content) => `
<details className="group pb-4 border-b border-gray-100 bg-white rounded-2xl shadow-sm mb-4">
  <summary className="flex items-center justify-between cursor-pointer list-none font-black text-blue-950 uppercase select-none outline-none p-6">
    <span>${title}</span>
    <span className="transition duration-300 group-open:rotate-180 bg-gray-50 w-8 h-8 flex items-center justify-center rounded-full text-blue-500">
       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </span>
  </summary>
  <div className="px-6 pb-6 mt-2">
    ${content}
  </div>
</details>
`;

// Extract sections
const sectionRegex = /<section className="bg-gray-50\/50 p-6 rounded-3xl border border-gray-100">([\s\S]*?)<\/section>/g;
code = code.replace(sectionRegex, (match, content) => {
   let title = "Настройки";
   const titleMatch = content.match(/<h3[^>]*>(.*?)<\/h3>/);
   if (titleMatch) title = titleMatch[1];
   return detailsTemplate(title, content);
});

// Also replace the first part
const mainBlockRegex = /<div className="border-b border-gray-100 pb-4">([\s\S]*?)<details/m;
const mainMatch = code.match(mainBlockRegex);
if (mainMatch) {
    code = code.replace(mainMatch[1], detailsTemplate('Основные настройки сайта', mainMatch[1]));
}

const additionalSettings = `
   ${detailsTemplate('Telegram-бот', telegramHtml)}
   ${detailsTemplate('Новости', newsHtml)}
   ${detailsTemplate('Партнеры', partnersHtml)}
   ${detailsTemplate('Филиалы', branchesHtml)}
`;

code = code.replace(/\{\/\* Sticky Save Button Container \*\/\}/, additionalSettings + '\n              {/* Sticky Save Button Container */}');

// Let's remove the wrapper div space-y-12
code = code.replace('<div className="p-8 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-12">', '<div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm space-y-4">');

fs.writeFileSync('./src/components/AdminPanel.tsx', code, 'utf8');
console.log('Done.');
