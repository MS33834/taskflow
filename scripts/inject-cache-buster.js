const fs = require('fs');
const path = process.argv[2] || 'dist/index.html';
if (!fs.existsSync(path)) {
  console.error(`File not found: ${path}`);
  process.exit(1);
}

const ts = String(Date.now());
let html = fs.readFileSync(path, 'utf8');

const metaTags = [
  '<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">',
  '<meta http-equiv="Pragma" content="no-cache">',
  '<meta http-equiv="Expires" content="0">',
  `<meta name="build-timestamp" content="${ts}">`,
].join('\n  ');

html = html.replace(/<head>/i, '<head>\n  ' + metaTags);
html = html.replace(/(src|href)="(\/taskflow\/(?:_expo|assets)\/[^"]+)"/g, (m, attr, url) => {
  if (url.includes('?v=')) return m;
  const sep = url.includes('?') ? '&' : '?';
  return `${attr}="${url}${sep}v=${ts}"`;
});

fs.writeFileSync(path, html);
console.log('OK, ts=' + ts);
