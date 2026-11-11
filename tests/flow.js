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

  const goE = async (ev, m) => { await page.evaluate(([ev, m]) => { const name = { lam: 'Lamaran', akad: 'Akad & Resepsi', unduh: 'Unduh mantu' }[ev]; const e = __DB__.events.find(x => x.wedding_id === 'w-demo' && !x.parent_id && x.name === name); location.hash = '#/w/w-demo/e/' + e.id + '/' + m; }, [ev, m]); await page.waitForTimeout(500); };
  const pickPerson = async (scope, name) => { await scope.locator('.psb').first().click(); await page.locator('.psp .pso', { hasText: name }).first().click(); };

  // 1 Seserahan per acara: tambah barang satu + lagi + banyak
  await goE('akad', 'seserahan');
  await page.getByRole('button', { name: /Skincare & makeup/ }).first().click();
  await page.locator('.top .btn', { hasText: 'Barang' }).click();
  await page.waitForTimeout(300);
  await page.locator('.dr .catg button', { hasText: 'Skincare & makeup' }).click();
  await page.locator('.dr .sug button', { hasText: 'Serum' }).click();
  await page.locator('.dr input[placeholder*="Somethinc"]').fill('Somethinc Niacinamide 20 ml');
  await page.locator('.dr .money input').first().fill('200000');
  await page.locator('.drf button', { hasText: 'Simpan & tambah lagi' }).click();
  await page.waitForTimeout(400);
  await page.locator('.dr input[placeholder="mis. Serum"]').fill('Lip tint');
  await page.locator('.drf button', { hasText: /^Simpan$/ }).click();
  await page.waitForTimeout(500);
  const serum = await db(() => __DB__.gift_items.find(i => i.name === 'Serum'));
  ok(serum && serum.planned === 200000 && serum.brand.startsWith('Somethinc') && await db(() => !!__DB__.gift_items.find(i => i.name === 'Lip tint')), 'tambah 2 barang seserahan + harga & merek');
  await page.locator('.top .btn', { hasText: 'Barang' }).click();
  await page.locator('.dr .seg button', { hasText: 'Banyak sekaligus' }).click();
  await page.locator('.dr textarea').fill('Masker wajah ; 150rb\nCushion - 1,2jt\nMicellar water');
  await page.locator('.drf .btn', { hasText: 'Tambahkan' }).click();
  await page.waitForTimeout(500);
  const bulk = await db(() => __DB__.gift_items.filter(i => ['Masker wajah', 'Cushion', 'Micellar water'].includes(i.name)).map(i => i.planned));
  ok(bulk.length === 3 && bulk.includes(150000) && bulk.includes(1200000), 'tambah banyak + baca harga ' + JSON.stringify(bulk));
  await page.locator('tr', { hasText: 'Toner' }).locator('.seg button', { hasText: 'Siap' }).click();
  await page.waitForTimeout(300);
  ok(await db(() => __DB__.gift_items.find(i => i.name === 'Toner').status === 'siap'), 'status Siap via tombol');

  // 2 Persiapan: centang, ubah, tugas baru wajib PIC
  await goE('akad', 'persiapan');
  await page.locator('tr', { hasText: 'Booking wedding organizer' }).locator('.ck').click();
  await page.waitForTimeout(300);
  ok(await db(() => __DB__.tasks.find(t => t.title === 'Booking wedding organizer').status === 'selesai'), 'centang tugas selesai');
  await page.locator('tr', { hasText: 'Buat daftar tamu awal' }).click();
  await page.locator('.dr textarea').nth(1).fill('150 undangan final');
  await page.locator('.drf .btn', { hasText: 'Simpan' }).click();
  await page.waitForTimeout(300);
  ok(await db(() => __DB__.tasks.find(t => t.title === 'Buat daftar tamu awal').result === '150 undangan final'), 'ubah hasil tugas');
  await page.locator('.top .btn', { hasText: 'Tugas' }).click();
  await page.locator('.dr input').first().fill('Beli kado untuk orang tua');
  await page.locator('.drf .btn', { hasText: 'Simpan' }).click();
  await page.waitForTimeout(200);
  ok(await page.locator('.dr .ferr', { hasText: 'PIC' }).count() === 1, 'tugas tanpa PIC ditolak');
  await pickPerson(page.locator('.dr'), 'Ibu Rina');
  await shot('tugas-pic');
  await page.locator('.drf .btn', { hasText: 'Simpan' }).click();
  await page.waitForTimeout(300);
  ok(await db(() => { const t = __DB__.tasks.find(t => t.title === 'Beli kado untuk orang tua'); const p = __DB__.people.find(p => p.id === t.pic_id); return p && p.name === 'Ibu Rina'; }), 'tugas baru dengan PIC dari daftar');

  // 3 Bagian acara Lamaran: tab diingat saat pindah sub menu
  await goE('lam', 'persiapan');
  await page.locator('.bagian .bg', { hasText: 'Balasan lamaran' }).click();
  await page.waitForTimeout(300);
  ok(await page.locator('tr', { hasText: 'Siapkan hantaran balasan' }).count() === 1 && await page.locator('tr', { hasText: 'Pesan konsumsi lamaran' }).count() === 0, 'tab Balasan menampilkan tugas balasan saja');
  if (mode === 'hp') await page.locator('.bnav a', { hasText: 'Anggaran' }).click(); else await page.locator('.acg.open .nav a', { hasText: 'Anggaran' }).click();
  await page.waitForTimeout(500);
  ok(/Balasan/.test(await page.locator('.bagian .bg.on').innerText()), 'pilihan tab bagian diingat di Anggaran');
  await page.locator('.bagian .bg', { hasText: 'Gabungan' }).click();
  await page.waitForTimeout(300);
  ok(await page.locator('tr, .mrow', { hasText: 'Cincin lamaran' }).count() === 1 && await page.locator('tr, .mrow', { hasText: 'Konsumsi balasan' }).count() === 1, 'tab Gabungan berisi semua bagian');
  await page.locator('.bagian .bg', { hasText: /^Lamaran/ }).click();

  // 4 Anggaran: pembayaran, item patungan, katalog
  await goE('akad', 'anggaran');
  await page.locator('tr, .mrow', { hasText: 'Biaya nikah di luar KUA' }).click();
  await page.waitForTimeout(300);
  await shot('anggaran-detail');
  await page.locator('.dr .btn', { hasText: 'Catat pembayaran' }).click();
  await page.locator('.modal .seg button', { hasText: 'Termin' }).click();
  await page.locator('.modal .money input').fill('1.000.000');
  await page.locator('.modal .btn', { hasText: 'Simpan' }).click();
  await page.waitForTimeout(400);
  const paid = await db(() => { const it = __DB__.budget_items.find(i => i.catalog_code === 'ADM-02'); return __DB__.payments.filter(p => p.item_id === it.id && p.paid_on).reduce((s, p) => s + p.amount, 0); });
  ok(paid === 1000000, 'pembayaran tercatat, total dibayar ' + paid);
  await page.locator('.dr .x').first().click();
  await page.locator('tr, .mrow', { hasText: 'Catering 600 porsi' }).click();
  await page.waitForTimeout(400);
  ok(/vendor/.test(await page.evaluate(() => location.hash)), 'baris vendor terkunci → membuka menu Vendor');
  await goE('akad', 'anggaran');
  if (mode === 'hp') await page.locator('.fab').click(); else await page.locator('.top .btn', { hasText: 'Item' }).click();
  await page.locator('.dr input[placeholder*="Sewa mobil"]').fill('Sewa mobil pengantin');
  await page.locator('.dr .money input').first().fill('3000000');
  await pickPerson(page.locator('.dr .fld', { hasText: 'PIC' }).first(), 'WO Kirana');
  await page.locator('.dr .fld', { hasText: 'Ditanggung oleh' }).locator('.psb').first().click();
  await page.locator('.psp .pso', { hasText: 'Patungan' }).click();
  await page.waitForTimeout(200);
  await shot('anggaran-patungan');
  await page.locator('.drf .btn', { hasText: /^Simpan$/ }).click();
  await page.waitForTimeout(400);
  const sh = await db(() => (__DB__.budget_items.find(i => i.name === 'Sewa mobil pengantin') || {}).shares);
  ok(sh && sh.length === 2 && sh[0].pct + sh[1].pct === 100, 'item patungan tersimpan ' + JSON.stringify(sh));
  if (await page.locator('.dr .x').count()) await page.locator('.dr .x').first().click();
  await page.locator('.top .btn2', { hasText: 'Tambah dari katalog' }).click();
  await page.waitForTimeout(300);
  await page.locator('.dr label', { hasText: 'Photobooth' }).locator('input').check();
  await page.locator('.drf .btn', { hasText: 'Tambahkan' }).click();
  await page.waitForTimeout(400);
  ok(await db(() => __DB__.budget_items.some(i => i.catalog_code === 'DEC-05' && i.source === 'vendor')), 'katalog vendor jadi slot vendor');

  // 5 Vendor: pilih vendor di slot lalu deal
  await goE('akad', 'vendor');
  await page.locator('.kcard', { hasText: 'Wedding organizer' }).first().click();
  await page.waitForTimeout(300);
  const opt = (await page.locator('.dr select').first().locator('option').allTextContents()).find(x => /Elegance WO/.test(x));
  await page.locator('.dr select').first().selectOption({ label: opt });
  await page.locator('.dr .fld', { hasText: 'Harga deal' }).locator('input').fill('14000000');
  await page.locator('.drf .btn', { hasText: 'Simpan' }).click();
  await page.waitForTimeout(500);
  const wo = await db(() => { const v = __DB__.vendors.find(x => x.name === 'Elegance WO'); return __DB__.budget_items.filter(i => i.vendor_id === v.id).map(i => i.deal); });
  ok(wo.length === 1 && wo[0] === 14000000, 'slot vendor terisi & deal ' + JSON.stringify(wo));
  ok(await page.locator('.kcol', { hasText: 'Deal' }).locator('.kcard', { hasText: 'Elegance WO' }).count() === 1, 'kartu pindah ke kolom Deal');

  // 6 Tamu: buku induk centang acara, tamu baru masuk acara ini
  await goE('akad', 'tamu');
  await page.locator('.bagian .bg', { hasText: 'Buku tamu induk' }).click();
  await page.waitForTimeout(300);
  await page.locator('tr', { hasText: 'Karang Taruna RW 03' }).getByRole('button', { name: /Undang Karang Taruna RW 03 ke Akad/ }).click();
  await page.waitForTimeout(300);
  ok(await db(() => { const g = __DB__.guests.find(x => x.name === 'Karang Taruna RW 03'); const e = __DB__.events.find(x => x.name === 'Akad & Resepsi'); return __DB__.guest_invites.some(i => i.guest_id === g.id && i.event_id === e.id); }), 'centang tamu induk ke Akad & Resepsi');
  await shot('tamu-induk');
  await page.locator('.top .btn', { hasText: 'Tamu' }).click();
  await page.locator('.dr input').first().fill('Keluarga Pak Hadi');
  await page.locator('.drf .btn', { hasText: /^Simpan$/ }).click();
  await page.waitForTimeout(400);
  ok(await db(() => { const g = __DB__.guests.find(x => x.name === 'Keluarga Pak Hadi'); return g && __DB__.guest_invites.some(i => i.guest_id === g.id); }), 'tamu baru masuk buku induk + acara ini');

  // 7 Check-in per acara
  await page.locator('a.btn3', { hasText: 'Mode check-in' }).click();
  await page.waitForTimeout(500);
  await page.locator('.search input').fill('siti');
  await page.locator('.li', { hasText: 'Ibu Siti Rahma' }).locator('button', { hasText: 'Hadir' }).click();
  await page.waitForTimeout(400);
  ok(await db(() => { const g = __DB__.guests.find(x => x.name === 'Ibu Siti Rahma'); const e = __DB__.events.find(x => x.name === 'Akad & Resepsi'); return !!__DB__.guest_invites.find(i => i.guest_id === g.id && i.event_id === e.id).checked_in_at; }), 'check-in tamu per acara');

  // 8 Rundown live per acara
  await goE('akad', 'rundown');
  await page.locator('a.btn3', { hasText: 'Mode hari H' }).click();
  await page.waitForTimeout(500);
  await page.locator('.btn3', { hasText: 'Selesai, lanjut' }).click();
  await page.waitForTimeout(400);
  const st = await db(() => __DB__.rundown_items.filter(r => r.state !== 'todo').map(r => r.title + ':' + r.state));
  ok(st.length === 2, 'mode live lanjut sesi ' + JSON.stringify(st));

  // 9 Koneksi putus sesaat + hapus/urungkan
  await goE('akad', 'catatan');
  await page.evaluate(() => { window.__FAIL_NEXT__ = true; });
  await page.locator('.top .btn', { hasText: 'Reminder' }).click();
  await page.locator('.dr input').first().fill('Uji koneksi');
  await page.locator('.drf .btn', { hasText: 'Simpan' }).click();
  await page.waitForTimeout(1500);
  ok(await db(() => __DB__.reminders.some(r => r.title === 'Uji koneksi' && r.event_id)), 'tersimpan walau koneksi sempat gagal (retry)');
  await page.locator('.li', { hasText: 'Uji koneksi' }).click();
  await page.locator('.drf button', { hasText: 'Hapus' }).click();
  await page.locator('.modal .btn', { hasText: 'Hapus' }).click();
  await page.waitForTimeout(400);
  ok(await db(() => !__DB__.reminders.some(r => r.title === 'Uji koneksi')), 'hapus reminder');
  await page.locator('.toast button', { hasText: 'Urungkan' }).click();
  await page.waitForTimeout(400);
  ok(await db(() => __DB__.reminders.some(r => r.title === 'Uji koneksi')), 'urungkan hapus');

  // 10 Atur acara: sembunyikan sub menu & tambah bagian
  await goE('unduh', 'atur');
  await page.locator('.ed', { hasText: 'Catatan' }).locator('.tog').click();
  await page.locator('.top .btn', { hasText: 'Simpan perubahan' }).click();
  await page.waitForTimeout(500);
  ok(await db(() => { const e = __DB__.events.find(x => x.name === 'Unduh mantu' && !x.parent_id); return e.menus.some(m => m.k === 'catatan' && !m.on); }) && (mode === 'hp' || await page.locator('.acg.open .nav a', { hasText: 'Catatan' }).count() === 0), 'sub menu disembunyikan dari sidebar');
  await goE('unduh', 'atur');
  await page.locator('button', { hasText: 'Tampilkan lagi' }).click();
  await page.locator('button', { hasText: '+ Tambah bagian' }).click();
  await page.locator('button', { hasText: '+ Tambah bagian' }).click();
  await page.locator('.top .btn', { hasText: 'Simpan perubahan' }).click();
  await page.waitForTimeout(800);
  const parts = await db(() => { const e = __DB__.events.find(x => x.name === 'Unduh mantu' && !x.parent_id); const ps = __DB__.events.filter(x => x.parent_id === e.id); return { ps: ps.length, moved: __DB__.tasks.filter(t => t.event_id === e.id).length, inPart: __DB__.tasks.filter(t => ps[0] && t.event_id === ps[0].id).length }; });
  ok(parts.ps === 2 && parts.moved === 0 && parts.inPart > 0, 'tambah bagian, data lama pindah ke bagian pertama ' + JSON.stringify(parts));
  ok(await page.locator('.bagian .bg', { hasText: 'Gabungan' }).count() === 1, 'acara berbagian punya tab Gabungan');

  // 11 Tambah acara + orang
  if (mode === 'hp') { await page.locator('.bnav button', { hasText: 'Lainnya' }).click(); await page.locator('.modal .navbtn', { hasText: 'Tambah acara' }).click(); } else await page.locator('.addac').click();
  await page.waitForTimeout(300);
  await page.locator('.modal .catg button', { hasText: 'Midodareni' }).click();
  await page.locator('.modal .btn', { hasText: 'Tambah acara' }).click();
  await page.waitForTimeout(900);
  ok(await db(() => { const e = __DB__.events.find(x => x.name === 'Midodareni'); return e && __DB__.tasks.some(t => t.event_id === e.id); }) && (mode === 'hp' || await page.locator('.acg', { hasText: 'Midodareni' }).count() === 1), 'tambah acara Midodareni + contoh tugas');
  await go('pengaturan?tab=orang');
  await page.locator('.btn2', { hasText: 'Tambah orang' }).click();
  await page.locator('.modal input').first().fill('Tante Mira');
  await page.locator('.modal .seg button', { hasText: 'Wanita' }).click();
  await page.locator('.modal .btn', { hasText: 'Simpan' }).click();
  await page.waitForTimeout(300);
  ok(await db(() => __DB__.people.some(p => p.name === 'Tante Mira' && p.side === 'wanita')), 'tambah orang pihak wanita');

  // 12 Beranda: rincian & punyaku
  await go('beranda');
  if (mode === 'hp') await page.locator('.pill.pp', { hasText: 'Pria' }).first().click(); else await page.locator('.acard').first().locator('.prow').first().click();
  await page.waitForTimeout(300);
  ok(/Ditanggung pihak pria/.test(await page.locator('.dr .dtitle').innerText()), 'panel rincian dari angka penanggung');
  await shot('rincian');
  await page.locator('.dr .x').click();
  await page.locator('.seg button', { hasText: 'Punyaku' }).click();
  await page.waitForTimeout(300);
  ok(await page.locator('.li', { hasText: 'PIC Bagas' }).count() === 0, 'Punyaku menyaring tugas orang lain');

  // 13 Pernikahan baru dengan langkah Acara
  await page.evaluate(() => { location.hash = '#/baru'; }); await page.waitForTimeout(500);
  await page.locator('input[placeholder="mis. Rina"]').fill('Sari');
  await page.locator('input[placeholder="mis. Bagas"]').fill('Andi');
  await page.locator('input[type=date]').first().fill('2027-09-12');
  await page.locator('.seg button', { hasText: 'Agama lain' }).click();
  await page.locator('button', { hasText: 'Lanjut pilih acara' }).click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'Pilih Unduh mantu' }).click();
  await page.locator('.sug button', { hasText: 'Pengajian & siraman' }).click();
  await shot('baru-acara');
  await page.locator('button', { hasText: 'Lanjut ke anggaran' }).click();
  await page.locator('.money input').fill('90jt');
  await page.locator('button', { hasText: 'Buat pernikahan' }).click();
  await page.waitForTimeout(1200);
  const nw = await db(() => { const w = __DB__.weddings.find(x => x.bride_name === 'Sari'); return w && { budget: w.total_budget, rel: w.religion, events: __DB__.events.filter(e => e.wedding_id === w.id).map(e => e.name), people: __DB__.people.filter(p => p.wedding_id === w.id).length }; });
  ok(nw && nw.budget === 90000000 && nw.rel === 'lainnya' && nw.events.length === 6 && nw.people === 4, 'pernikahan baru dengan acara terpilih ' + JSON.stringify(nw));
  await page.waitForTimeout(400);
  await shot('baru-beranda');

  console.log('ERRORS:', JSON.stringify(errs));
  await browser.close();
})();
