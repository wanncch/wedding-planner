// Uji jendela kecil (konfirmasi hapus, dll.) muat di layar HP 320–430 px.
const { chromium } = require(process.env.PW_PATH || 'playwright');
const fs = require('fs'); const D = __dirname;
const TPL = fs.readFileSync(D + '/tpl.json', 'utf8'); const MOCK = fs.readFileSync(D + '/mock.js', 'utf8');
const ok = (c, m) => console.log((c ? 'LULUS ' : 'GAGAL ') + m);
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const errs = [];
  for (const w of [320, 360, 390, 430]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 760 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await ctx.addInitScript(`window.__TPL__ = ${TPL};\n${MOCK}`);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    const fits = async (label) => {
      await p.waitForSelector('.modal'); await p.waitForTimeout(250);
      const r = await p.evaluate(() => { const m = document.querySelector('.modal').getBoundingClientRect(); const btns = Array.from(document.querySelectorAll('.modal button')).map(x => x.getBoundingClientRect()); return { l: m.left, r: m.right, W: innerWidth, btnOut: btns.filter(x => x.right > innerWidth + 0.5 || x.left < -0.5).length }; });
      ok(r.l >= 0 && r.r <= r.W && r.btnOut === 0, w + 'px · ' + label + ' muat (kiri ' + Math.round(r.l) + ', kanan ' + Math.round(r.r) + ' dari ' + r.W + ')');
      if (w === 360) await p.screenshot({ path: D + '/out/modal-' + w + '-' + label.replace(/\W+/g, '-') + '.png' });
    };
    // konfirmasi hapus dokumen (kasus dari pemilik)
    await p.goto('http://localhost:4173/#/w/w-demo/dokumen'); await p.waitForTimeout(1200);
    await p.locator('.li', { hasText: 'Izin komandan' }).first().click().catch(async () => { await p.locator('.li.click').first().click(); });
    await p.locator('.drf button', { hasText: 'Hapus' }).click();
    await fits('konfirmasi hapus dokumen');
    await p.locator('.modal .btn2', { hasText: 'Batal' }).click();
    await p.locator('.dr .x').click();
    // tambah orang
    await p.evaluate(() => { location.hash = '#/w/w-demo/pengaturan?tab=orang'; }); await p.waitForTimeout(800);
    await p.locator('.btn2', { hasText: 'Tambah orang' }).click();
    await fits('tambah orang');
    await ctx.close();
  }
  console.log('ERR', JSON.stringify(errs)); await b.close();
})();
