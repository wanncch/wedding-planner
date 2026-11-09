const { chromium } = require(process.env.PW_PATH || 'playwright');
const fs = require('fs');
const D = __dirname;
const TPL = fs.readFileSync(D + '/tpl.json', 'utf8');
const MOCK = fs.readFileSync(D + '/mock.js', 'utf8');
const BASE = 'http://localhost:4173';
(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}).catch(() => chromium.launch());
    const mode = process.argv[3] || 'desk';
  const ctx = await browser.newContext(mode === 'hp' ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(`window.__MOCK_START__='out';window.__TPL__ = ${TPL};\n${MOCK}`);
  const FD = D + '/node_modules/';
  const css = `@font-face{font-family:Fraunces;font-style:normal;font-weight:100 900;src:url(https://fonts.gstatic.com/fr.woff2) format('woff2')}
@font-face{font-family:Fraunces;font-style:italic;font-weight:100 900;src:url(https://fonts.gstatic.com/fri.woff2) format('woff2')}
` + [400,500,600,700,800].map(w => `@font-face{font-family:'Plus Jakarta Sans';font-weight:${w};src:url(https://fonts.gstatic.com/pj${w}.woff2) format('woff2')}`).join('\n');
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: css }));
  await ctx.route('https://fonts.gstatic.com/**', r => {
    const u = r.request().url();
    let f;
    if (u.endsWith('/fr.woff2')) f = FD + '@fontsource-variable/fraunces/files/fraunces-latin-full-normal.woff2';
    else if (u.endsWith('/fri.woff2')) f = FD + '@fontsource-variable/fraunces/files/fraunces-latin-full-italic.woff2';
    else { const w = u.match(/pj(\d+)/)[1]; f = FD + '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-' + w + '-normal.woff2'; }
    r.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(f) });
  });
  const page = await ctx.newPage();

  const ok = (c, m) => console.log((c ? 'LULUS ' : 'GAGAL ') + m);
  await page.goto(BASE + '/#/undangan/tok123'); await page.waitForTimeout(700);
  ok(await page.locator('text=Masuk atau daftar dulu').count() === 1, 'link undangan minta masuk dulu');
  await page.locator('input[type=email]').fill('rina@example.com');
  await page.locator('input[type=password]').fill('salah123');
  await page.locator('button[type=submit]').click(); await page.waitForTimeout(400);
  ok(await page.locator('text=Email atau kata sandi salah').count() === 1, 'pesan sandi salah');
  await page.screenshot({ path: D + '/out/auth.png' });
  await page.locator('input[type=password]').fill('rahasia123');
  await page.locator('button[type=submit]').click(); await page.waitForTimeout(900);
  ok(await page.locator('text=Terima & buka').count() === 1, 'setelah masuk tampil halaman terima undangan');
  await page.locator('button', { hasText: 'Terima & buka' }).click(); await page.waitForTimeout(900);
  ok(/#\/w\//.test(await page.evaluate(() => location.hash)), 'undangan diterima → masuk pernikahan');
  await browser.close();
})();
