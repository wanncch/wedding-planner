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
  page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL/.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  const ok = (c, msg) => console.log((c ? 'LULUS ' : 'GAGAL ') + msg);
  const db = (expr) => page.evaluate(expr);
  const go = async (m) => { await page.evaluate((m) => { location.hash = '#/w/w-demo/' + m; }, m); await page.waitForTimeout(500); };
  const shot = (n) => page.screenshot({ path: D + '/out/' + mode + '-flow-' + n + '.png' });
  await page.goto(BASE + '/#/w/w-demo/beranda'); await page.waitForTimeout(800);

  // 1 Seserahan: tambah barang satu + lagi + banyak
  await go('seserahan');
  await page.getByRole('button', { name: /Skincare & makeup/ }).first().click();
  await page.locator('.top .btn', { hasText: 'Barang' }).click();
  await page.waitForTimeout(300);
  await page.locator('.dr .catg button', { hasText: 'Skincare & makeup' }).click();
  await page.locator('.dr .sug button', { hasText: 'Serum' }).click();
  await page.locator('.dr input[placeholder*="Somethinc"]').fill('Somethinc Niacinamide 20 ml');
  await page.locator('.dr .money input').first().fill('200000');
  await page.waitForTimeout(200);
  await shot('seserahan-tambah');
  await page.locator('.drf button', { hasText: 'Simpan & tambah lagi' }).click();
  await page.waitForTimeout(400);
  await page.locator('.dr input[placeholder="mis. Serum"]').fill('Lip tint');
  await page.locator('.drf button', { hasText: /^Simpan$/ }).click();
  await page.waitForTimeout(500);
  let n = await db(() => __DB__.gift_items.filter(i => ['Serum', 'Lip tint'].includes(i.name)).length);
  ok(n === 2, 'tambah 2 barang seserahan (' + n + ') ' + JSON.stringify(await db(() => __DB__.gift_items.slice(-3).map(i => i.name + ':' + i.planned))));
  const serum = await db(() => __DB__.gift_items.find(i => i.name === 'Serum'));
  ok(serum && serum.planned === 200000 && serum.brand.startsWith('Somethinc'), 'harga & merek tersimpan');
  await page.locator('.top .btn', { hasText: 'Barang' }).click();
  await page.locator('.dr .seg button', { hasText: 'Banyak sekaligus' }).click();
  await page.locator('.dr textarea').fill('Masker wajah ; 150rb\nCushion - 1,2jt\nMicellar water');
  await page.locator('.drf .btn', { hasText: 'Tambahkan' }).click();
  await page.waitForTimeout(500);
  const bulk = await db(() => __DB__.gift_items.filter(i => ['Masker wajah', 'Cushion', 'Micellar water'].includes(i.name)).map(i => i.planned));
  ok(bulk.length === 3 && bulk.includes(150000) && bulk.includes(1200000), 'tambah banyak + baca harga ' + JSON.stringify(bulk));
  // ubah status inline
  await page.locator('tr', { hasText: 'Toner' }).locator('.seg button', { hasText: 'Siap' }).click();
  await page.waitForTimeout(300);
  ok(await db(() => __DB__.gift_items.find(i => i.name === 'Toner').status === 'siap'), 'status Siap via tombol');

  // 2 Persiapan: centang tugas & ubah lewat drawer
  await go('persiapan');
  await page.locator('tr', { hasText: 'Booking wedding organizer' }).locator('.ck').click();
  await page.waitForTimeout(300);
  ok(await db(() => __DB__.tasks.find(t => t.title === 'Booking wedding organizer').status === 'selesai'), 'centang tugas selesai');
  await page.locator('tr', { hasText: 'Buat daftar tamu awal' }).click();
  await page.locator('.dr textarea').last().fill('150 undangan final');
  await page.locator('.drf .btn', { hasText: 'Simpan' }).click();
  await page.waitForTimeout(300);
  ok(await db(() => __DB__.tasks.find(t => t.title === 'Buat daftar tamu awal').result === '150 undangan final'), 'ubah hasil tugas');
  await page.locator('.top .btn', { hasText: 'Tugas' }).click();
  await page.locator('.dr input').first().fill('Beli kado untuk orang tua');
  await page.locator('.drf .btn', { hasText: 'Simpan' }).click();
  await page.waitForTimeout(300);
  ok(await db(() => !!__DB__.tasks.find(t => t.title === 'Beli kado untuk orang tua')), 'tambah tugas baru');

  // 3 Anggaran: catat pembayaran
  await go('anggaran');
  await page.locator('tr', { hasText: 'Catering 600 porsi' }).click();
  await page.waitForTimeout(300);
  await shot('anggaran-detail');
  await page.locator('aside .btn', { hasText: 'Catat pembayaran' }).click();
  await page.locator('.modal .seg button', { hasText: 'Termin' }).click();
  await page.locator('.modal .money input').fill('10.000.000');
  await page.locator('.modal .btn', { hasText: 'Simpan' }).click();
  await page.waitForTimeout(400);
  const paid = await db(() => { const it = __DB__.budget_items.find(i => i.name === 'Catering 600 porsi'); return __DB__.payments.filter(p => p.item_id === it.id && p.paid_on).reduce((s, p) => s + p.amount, 0); });
  ok(paid === 17500000, 'pembayaran tercatat, total dibayar ' + paid);
  // katalog
  await page.locator('.top .btn2', { hasText: 'Tambah dari katalog' }).click();
  await page.waitForTimeout(300);
  await page.locator('.dr label', { hasText: 'Photobooth' }).locator('input').check();
  await page.locator('.drf .btn', { hasText: 'Tambahkan' }).click();
  await page.waitForTimeout(400);
  ok(await db(() => __DB__.budget_items.some(i => i.catalog_code === 'DEC-05')), 'tambah item dari katalog');
  await page.locator('.top .tab', { hasText: 'Simulasi' }).click();
  await page.waitForTimeout(300);
  await shot('anggaran-simulasi');

  // 4 Vendor: deal → masuk Anggaran
  await go('vendor');
  await page.locator('.kcard', { hasText: 'Elegance WO' }).click();
  await page.locator('.dr label', { hasText: 'Sudah deal' }).locator('input').check();
  await page.locator('.dr .money input').nth(1).fill('14000000');
  await page.locator('.dr select').first().selectOption({ label: /Wedding organizer/ }).catch(async () => {
    const opts = await page.locator('.dr select').first().locator('option').allTextContents();
    const o = opts.find(x => /Wedding organizer/.test(x)); await page.locator('.dr select').first().selectOption({ label: o });
  });
  await page.locator('.drf .btn', { hasText: 'Simpan' }).click();
  await page.waitForTimeout(500);
  const wo = await db(() => { const v = __DB__.vendors.find(x => x.name === 'Elegance WO'); return __DB__.budget_items.filter(i => i.vendor_id === v.id).map(i => i.deal); });
  ok(wo.length === 1 && wo[0] === 14000000, 'vendor deal terhubung ke item anggaran ' + JSON.stringify(wo));
  ok(await page.locator('.kcol', { hasText: 'Deal' }).locator('.kcard', { hasText: 'Elegance WO' }).count() === 1, 'kartu pindah ke kolom Deal');

  // 5 Tamu & check-in
  await go('tamu');
  await page.locator('.top .btn', { hasText: 'Tamu' }).click();
  await page.locator('.dr input').first().fill('Keluarga Pak Hadi');
  await page.locator('.drf .btn', { hasText: /^Simpan$/ }).click();
  await page.waitForTimeout(300);
  ok(await db(() => __DB__.guests.some(g => g.name === 'Keluarga Pak Hadi')), 'tambah tamu');
  await go('checkin');
  await page.locator('.search input').fill('siti');
  await page.locator('.li', { hasText: 'Ibu Siti Rahma' }).locator('button', { hasText: 'Hadir' }).click();
  await page.waitForTimeout(400);
  ok(await db(() => !!__DB__.guests.find(g => g.name === 'Ibu Siti Rahma').checked_in_at), 'check-in tamu');

  // 6 Rundown live
  await go('live');
  await page.locator('.btn3', { hasText: 'Selesai, lanjut' }).click();
  await page.waitForTimeout(400);
  const st = await db(() => __DB__.rundown_items.filter(r => r.state !== 'todo').map(r => r.title + ':' + r.state));
  ok(st.length === 2, 'mode live lanjut sesi ' + JSON.stringify(st));

  // 7 Koneksi putus sesaat: tetap tersimpan (coba ulang otomatis)
  await go('catatan');
  await page.evaluate(() => { window.__FAIL_NEXT__ = true; });
  await page.locator('.top .btn', { hasText: 'Reminder' }).click();
  await page.locator('.dr input').first().fill('Uji koneksi');
  await page.locator('.drf .btn', { hasText: 'Simpan' }).click();
  await page.waitForTimeout(1500);
  ok(await db(() => __DB__.reminders.some(r => r.title === 'Uji koneksi')), 'tersimpan walau koneksi sempat gagal (retry)');

  // 8 Hapus + urungkan
  await page.locator('.li', { hasText: 'Uji koneksi' }).click();
  await page.locator('.drf button', { hasText: 'Hapus' }).click();
  await page.locator('.modal .btn', { hasText: 'Hapus' }).click();
  await page.waitForTimeout(400);
  ok(await db(() => !__DB__.reminders.some(r => r.title === 'Uji koneksi')), 'hapus reminder');
  await page.locator('.toast button', { hasText: 'Urungkan' }).click();
  await page.waitForTimeout(400);
  ok(await db(() => __DB__.reminders.some(r => r.title === 'Uji koneksi')), 'urungkan hapus');

  // 9 Pernikahan baru
  await page.evaluate(() => { location.hash = '#/baru'; }); await page.waitForTimeout(500);
  await page.locator('input[placeholder="mis. Rina"]').fill('Sari');
  await page.locator('input[placeholder="mis. Bagas"]').fill('Andi');
  await page.locator('input[type=date]').first().fill('2027-09-12');
  await page.locator('.seg button', { hasText: 'Agama lain' }).click();
  await page.locator('.money input').fill('90jt');
  await shot('baru');
  await page.locator('button', { hasText: 'Buat pernikahan' }).click();
  await page.waitForTimeout(1200);
  const nw = await db(() => { const w = __DB__.weddings.find(x => x.bride_name === 'Sari'); return w && { budget: w.total_budget, rel: w.religion, items: __DB__.budget_items.filter(i => i.wedding_id === w.id).reduce((s, i) => s + i.planned, 0) + w.gift_budget, hash: location.hash }; });
  ok(nw && nw.budget === 90000000 && nw.rel === 'lainnya', 'pernikahan baru dibuat ' + JSON.stringify(nw));
  await page.waitForTimeout(400);
  await shot('baru-beranda');

  console.log('ERRORS:', JSON.stringify(errs));
  await browser.close();
})();
