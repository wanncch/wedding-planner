const { chromium } = require(process.env.PW_PATH || 'playwright');
const fs = require('fs');
const D = __dirname;
const TPL = fs.readFileSync(D + '/tpl.json', 'utf8');
const MOCK = fs.readFileSync(D + '/mock.js', 'utf8');
const BASE = 'http://localhost:4173';
async function mk(browser, mode, pre) {
  const ctx = await browser.newContext(mode === 'hp' ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(`${pre || ''};window.__TPL__ = ${TPL};\n${MOCK}`);
  const page = await ctx.newPage();
  page.errs = [];
  page.on('console', m => { if (m.type() === 'error') page.errs.push(m.text()); });
  page.on('pageerror', e => page.errs.push('PAGEERROR ' + e.message));
  page.on('dialog', d => d.accept('Nominal belum sesuai'));
  return page;
}
const ok = (c, msg) => console.log((c ? 'LULUS ' : 'GAGAL ') + msg);
(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  // admin
  let p = await mk(browser, 'desk');
  const shot = (pg, n, full) => pg.screenshot({ path: D + '/out/v3-' + n + '.png', fullPage: !!full });
  await p.goto(BASE + '/#/admin'); await p.waitForTimeout(900);
  await shot(p, 'admin-ringkasan', true);
  ok(await p.getByText('Menunggu konfirmasi').count() > 0, 'ringkasan admin tampil');
  await p.evaluate(() => { location.hash = '#/admin/akun'; }); await p.waitForTimeout(500);
  await shot(p, 'admin-akun', true);
  await p.getByRole('row', { name: /Mega Sanja/ }).click(); await p.waitForTimeout(500);
  await shot(p, 'admin-drawer');
  await p.getByRole('button', { name: '+1 thn' }).click();
  await p.getByRole('button', { name: 'Simpan perubahan' }).click(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => window.__CALLS__.some(c => c[1] === 'admin_set_subscription' && /2028/.test(c[2]))), 'perpanjang +1 thn tersimpan');
  await p.getByRole('row', { name: /Dewi/ }).click(); await p.waitForTimeout(400);
  await p.getByRole('button', { name: '+ Catat pembayaran' }).click(); await p.waitForTimeout(200);
  await p.getByRole('button', { name: 'Simpan & aktifkan' }).click(); await p.waitForTimeout(400);
  ok(await p.evaluate(() => window.__USERS__.find(u => u.id === 'u-dewi').status === 'active'), 'catat pembayaran mengaktifkan akun');
  await p.evaluate(() => { location.hash = '#/admin/pembayaran'; }); await p.waitForTimeout(500);
  await shot(p, 'admin-bayar', true);
  await p.evaluate(() => { location.hash = '#/admin/paket'; }); await p.waitForTimeout(400);
  await shot(p, 'admin-paket');
  await p.evaluate(() => { location.hash = '#/admin/pengaturan'; }); await p.waitForTimeout(400);
  await p.getByRole('button', { name: 'Simpan' }).click(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => window.__CALLS__.some(c => c[0] === 'upsert' && c[1] === 'app_settings')), 'pengaturan bayar tersimpan');
  await shot(p, 'admin-atur');
  // kategori baru
  await p.goto(BASE + '/#/w/w-demo/seserahan'); await p.waitForTimeout(800);
  await p.locator('.cc.add').click(); await p.waitForTimeout(200);
  await p.getByPlaceholder('mis. Skincare & makeup').fill('Parfum & aksesori');
  await p.waitForTimeout(150);
  await shot(p, 'kategori-baru');
  await p.getByRole('radio', { name: 'musik' }).click();
  await p.getByRole('radio', { name: 'Warna 9' }).click();
  await p.getByRole('button', { name: 'Simpan' }).click(); await p.waitForTimeout(400);
  ok(await p.evaluate(() => { const c = window.__DB__.gift_categories.find(x => x.name === 'Parfum & aksesori'); return c && c.icon === 'musik' && c.color === 'k9'; }), 'kategori baru simpan ikon & warna');
  console.log('ERR admin', JSON.stringify(p.errs));
  // trial habis (HP)
  p = await mk(browser, 'hp', "window.__ACCOUNT__={is_admin:false,active:false,plan_id:'trial',status:'trial',valid_until:'2026-10-01',days_left:0,pending:0};window.__WED_ACTIVE__=false");
  await p.goto(BASE + '/#/w/w-demo/seserahan'); await p.waitForTimeout(900);
  await shot(p, 'hp-habis');
  ok(await p.locator('.top .btn', { hasText: 'Barang' }).count() === 0, 'trial habis = hanya lihat');
  await p.goto(BASE + '/#/upgrade'); await p.waitForTimeout(800);
  await p.locator('input[type=file]').setInputFiles({ name: 'bukti.png', mimeType: 'image/png', buffer: fs.readFileSync(D + '/out/v3-admin-paket.png') });
  await p.waitForTimeout(200);
  await shot(p, 'hp-upgrade', true);
  await p.getByRole('button', { name: 'Kirim konfirmasi' }).click(); await p.waitForTimeout(600);
  ok(await p.evaluate(() => window.__DB__.payment_requests.some(r => r.user_id === 'u-rina' && r.status === 'pending' && r.proof_url.startsWith('sb:payments/u-rina/'))), 'bukti bayar terkirim');
  await shot(p, 'hp-upgrade-terkirim');
  await p.goto(BASE + '/#/pilih'); await p.waitForTimeout(700);
  await shot(p, 'hp-pilih');
  console.log('ERR hp', JSON.stringify(p.errs));
  // trial berjalan desktop beranda
  p = await mk(browser, 'desk', "window.__ACCOUNT__={is_admin:false,active:true,plan_id:'trial',status:'trial',days_left:9,pending:0}");
  await p.goto(BASE + '/#/w/w-demo/beranda'); await p.waitForTimeout(900);
  await shot(p, 'beranda-trial');
  await p.goto(BASE + '/#/admin'); await p.waitForTimeout(500);
  ok(await p.getByText('Khusus admin').count() > 0, 'non-admin ditolak di Pusat Kontrol');
  console.log('ERR trial', JSON.stringify(p.errs));
  await browser.close();
})();
