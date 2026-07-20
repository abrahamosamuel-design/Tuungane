const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src/routes').filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // 1. Remove Layout import
  content = content.replace(/import\s+{\s*Layout\s*}\s+from\s+["']@\/components\/Layout["'];?\n?/g, '');
  content = content.replace(/import\s+{\s*Layout\s*}\s+from\s+["']\.\.\/components\/Layout["'];?\n?/g, '');

  // 2. Find Layout props
  let hasProps = false;
  let propsMatch = content.match(/<Layout\s+([^>]+)>/);
  let staticData = {};
  if (propsMatch) {
    const propsStr = propsMatch[1];
    if (propsStr.includes('hideFooter')) staticData.hideFooter = true;
    if (propsStr.includes('hideBottomNavOnMobileUnauth')) staticData.hideBottomNavOnMobileUnauth = true;
    if (propsStr.includes('hideHeaderOnMobile')) staticData.hideHeaderOnMobile = true;
    hasProps = true;
  }

  // 3. Replace <Layout> and <Layout ...> with <>
  content = content.replace(/<Layout[^>]*>/g, '<>');
  // Replace </Layout> with </>
  content = content.replace(/<\/Layout>/g, '</>');

  // 4. Inject staticData if needed
  if (hasProps && Object.keys(staticData).length > 0) {
    // Find the export const Route = ...
    const routeRegex = /(export\s+const\s+Route\s*=\s*(?:createFileRoute|createRoute)\([^)]+\)\(\{)([\s\S]*?)(\}\);?)/;
    if (routeRegex.test(content)) {
      content = content.replace(routeRegex, (match, p1, p2, p3) => {
        // if it already has staticData, don't break it
        if (p2.includes('staticData:')) return match; 
        
        let propsStr = Object.keys(staticData).map(k => `      ${k}: true`).join(',\n');
        let newStaticData = `\n    staticData: {\n${propsStr}\n    },`;
        return `${p1}${newStaticData}${p2}${p3}`;
      });
    } else {
      console.log(`Could not find Route definition in ${file} to inject staticData:`, staticData);
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
