// Uji kartu hitung mundur (papan flip) dengan jam tiruan, di 5 ukuran layar.
const { chromium } = require(process.env.PW_PATH || 'playwright');
const fs = require('fs'); const D = __dirname;
const TPL = fs.readFileSync(D + '/tpl.json', 'utf8'); const MOCK = fs.readFileSync(D + '/mock.js', 'utf8');
const ok = (c, m) => console.log((c ? 'LULUS ' : 'GAGAL ') + m);
const SIZES = [['hp360', 360, 740, true], ['hp390', 390, 844, true], ['hp430', 430, 932, true], ['tablet', 1210, 760, false], ['desk', 1440, 1000, false]];
const CASES = [
  ['sebelum', '2026-11-15T13:20:05+07:00', { ev: 'LAMARAN', h: 'H-62', days: '61' }],
  ['harih', '2027-01-16T08:00:00+07:00', { ev: 'LAMARAN', h: 'Hari H', days: '00' }],
  ['setelah', '2027-01-20T10:00:00+07:00', { ev: 'AKAD & RESEPSI', h: 'H-150', days: '149' }],
  ['lewat', '2027-07-01T09:00:00+07:00', { done: true }],
];
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const errs = [];
  for (const [cn, at, exp] of CASES) {
    for (const [sn, w, h, mob] of SIZES) {
      if (cn !== 'sebelum' && !['hp360', 'desk'].includes(sn)) continue;
      const ctx = await b.newContext(mob ? { viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: w, height: h } });
      await ctx.addInitScript(`window.__TPL__ = ${TPL};\n${MOCK}`);
      const p = await ctx.newPage();
      p.on('pageerror', e => errs.push(cn + '/' + sn + ' ' + e.message));
      await p.clock.install({ time: new Date(at) });
      await p.goto('http://localhost:4173/#/w/w-demo/beranda');
      await p.clock.runFor(1500);
      await p.waitForSelector('.hb2in');
      const r = await p.evaluate(() => {
        const box = document.querySelector('.hb2in').getBoundingClientRect();
        const tot = document.querySelector('.resume, .g.col');
        return {
          hH: Math.round(box.height), top: Math.round(box.top), nx: document.querySelector('.nx2').innerText, dt: document.querySelector('.dt2').innerText,
          days: Array.from(document.querySelectorAll('.hb-flip .fg:first-child .fl2')).map(x => x.innerText).join(''),
          secs: Array.from(document.querySelectorAll('.hb-flip .fg:last-child .fl2')).map(x => x.innerText).join(''),
          done: !!document.querySelector('.hb-done'), on: (document.querySelector('.ev2.on b') || {}).innerText || '', cards: document.querySelectorAll('.ev2').length,
          over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          resumeBottom: Math.round(((document.querySelector('.resume') || {}).parentElement || document.querySelector('.hb2 ~ section')).getBoundingClientRect().bottom),
        };
      });
      const tag = cn + ' · ' + sn + ' (tinggi kartu ' + r.hH + 'px)';
      if (exp.done) ok(r.done && /terlaksana/.test(r.dt) && !r.on, tag + ' semua acara sudah terlaksana');
      else {
        ok(r.nx.includes(exp.ev) && r.dt.includes(exp.h) && r.days === exp.days, tag + ' → ' + r.nx + ' · ' + r.dt + ' · hari ' + r.days);
        ok(r.cards === 3 && r.on.toUpperCase() === exp.ev, tag + ' 3 kartu acara, terdekat disorot (' + r.on + ')');
      }
      ok(r.over <= 0, tag + ' tanpa geser ke samping');
      if (cn === 'sebelum') {
        const lim = { hp360: 300, hp390: 300, hp430: 300, tablet: 250, desk: 220 }[sn];
        ok(r.hH <= lim, tag + ' tinggi ≤ ' + lim + 'px');
        if (sn === 'tablet') ok(r.resumeBottom <= h, 'tablet 1210×760: kartu total resume anggaran terlihat tanpa scroll (bawah ' + r.resumeBottom + 'px)');
        const s1 = r.secs; await p.clock.runFor(2000); const s2 = await p.evaluate(() => Array.from(document.querySelectorAll('.hb-flip .fg:last-child .fl2')).map(x => x.innerText).join(''));
        ok(s1 !== s2, tag + ' detik berdetak (' + s1 + ' → ' + s2 + ')');
      }
      if (cn === 'harih' && !exp.done) ok(r.secs === '00', tag + ' papan berhenti di 00');
      await p.screenshot({ path: D + '/out/cd-' + cn + '-' + sn + '.png' });
      await ctx.close();
    }
  }
  // Bagian utama di Atur acara mengubah tanggal hitung mundur
  {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    await ctx.addInitScript(`window.__TPL__ = ${TPL};\n${MOCK}`);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push('utama ' + e.message));
    await p.clock.install({ time: new Date('2026-11-15T13:20:05+07:00') });
    await p.goto('http://localhost:4173/#/w/w-demo/beranda'); await p.clock.runFor(1000);
    await p.evaluate(() => { const e = __DB__.events.find(x => x.name === 'Lamaran' && !x.parent_id); location.hash = '#/w/w-demo/e/' + e.id + '/atur'; });
    await p.clock.runFor(800);
    await p.locator('.fld', { hasText: 'Bagian utama' }).locator('select').waitFor();
    const opts = await p.locator('.fld', { hasText: 'Bagian utama' }).locator('select option').allTextContents();
    await p.locator('.fld', { hasText: 'Bagian utama' }).locator('select').selectOption({ label: opts.find(o => /Balasan/.test(o)) });
    await p.screenshot({ path: D + '/out/cd-bagian-utama.png' });
    await p.locator('.top .btn', { hasText: 'Simpan perubahan' }).click(); await p.clock.runFor(800);
    await p.evaluate(() => { location.hash = '#/w/w-demo/beranda'; }); await p.clock.runFor(1200);
    const dt = await p.locator('.dt2').innerText();
    ok(opts[0].includes('Otomatis · Lamaran') && /30 Jan 2027/.test(dt) && /H-76/.test(dt), 'pilih Bagian utama = Balasan → hitung mundur ke 30 Jan (' + dt + ')');
    await ctx.close();
  }
  console.log('ERR', JSON.stringify(errs));
  await b.close();
})();
