const { chromium } = require(process.env.PW_PATH || 'playwright');
const fs = require('fs');
const D = __dirname;
const TPL = fs.readFileSync(D + '/tpl.json', 'utf8');
const MOCK = fs.readFileSync(D + '/mock.js', 'utf8');
const BASE = 'http://localhost:4173';
(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}).catch(() => chromium.launch());
  const menus = (process.argv[2] || 'beranda,lam/persiapan,lam/anggaran,akad/vendor,akad/tamu,akad/seserahan,akad/rundown,akad/dokumen,akad/catatan,unduh/atur,pengaturan').split(',');
  const mode = process.argv[3] || 'desk';
  const ctx = await browser.newContext(mode === 'hp' ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(`window.__TPL__ = ${TPL};\n${MOCK}`);
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
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await page.goto(BASE + '/#/w/w-demo/beranda');
  await page.waitForTimeout(800);
  for (const m of menus) {
    await page.evaluate((m) => {
      const [ev, menu] = m.split('/');
      if (!menu) { location.hash = '#/w/w-demo/' + m; return; }
      const name = { lam: 'Lamaran', akad: 'Akad & Resepsi', unduh: 'Unduh mantu' }[ev];
      const e = window.__DB__.events.find(x => x.wedding_id === 'w-demo' && !x.parent_id && x.name === name);
      location.hash = '#/w/w-demo/e/' + e.id + '/' + menu;
    }, m);
    await page.waitForTimeout(700);
    await page.screenshot({ path: D + '/out/' + mode + '-' + m.replace(/[^a-z]/g, '') + '.png', fullPage: mode !== 'hp' });
  }
  console.log('ERRORS:', JSON.stringify(errs, null, 1));
  await browser.close();
})();
