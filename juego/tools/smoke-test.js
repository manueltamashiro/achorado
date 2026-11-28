// Smoke test: serves juego/dist/ and loads every page in headless Chromium,
// failing on any uncaught JavaScript error.
// Usage (after building dist/):  node juego/tools/smoke-test.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..', 'dist');
const pages = ['index.html', 'miraflores.html', 'costaverde.html', 'barranco.html', 'cima.html'];

const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0].split('#')[0]));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  fs.createReadStream(f).pipe(res);
});

server.listen(0, async () => {
  const port = server.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`${page.url()}: ${e.message}`));
  for (const p of pages) {
    await page.goto(`http://localhost:${port}/${p}`);
    await page.waitForTimeout(1500);
    console.log(`ok  ${p}  (${await page.title()})`);
  }
  await browser.close();
  server.close();
  if (errors.length) { console.error('JS errors:\n' + errors.join('\n')); process.exit(1); }
  console.log('No JS errors.');
});
