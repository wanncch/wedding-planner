// Uji kompresi foto: hasil unggahan foto maksimal 700 KB, foto kecil & PDF tidak diubah.
const { chromium } = require(process.env.PW_PATH || 'playwright');
const fs = require('fs'); const D = __dirname;
const TPL = fs.readFileSync(D + '/tpl.json', 'utf8'); const MOCK = fs.readFileSync(D + '/mock.js', 'utf8');
const ok = (c, m) => console.log((c ? 'LULUS ' : 'GAGAL ') + m);
const kb = (n) => Math.round(n / 1024) + ' KB';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(`window.__TPL__ = ${TPL};\n${MOCK}`);
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:4173/#/w/w-demo/seserahan'); await p.waitForTimeout(1200);
  // buat file uji di browser
  const make = (kind) => p.evaluate(async (kind) => {
    const c = document.createElement('canvas');
    const [w, h] = kind === 'jpg12mp' ? [4032, 3024] : kind === 'png' ? [3000, 3000] : [800, 600];
    c.width = w; c.height = h; const g = c.getContext('2d');
    const im = g.createImageData(w, h);
    for (let i = 0; i < im.data.length; i += 4) { const n = (Math.random() * 255) | 0; im.data[i] = n; im.data[i + 1] = (n * 7 + i) & 255; im.data[i + 2] = 255 - n; im.data[i + 3] = kind === 'png' ? (i % 7 ? 255 : 120) : 255; }
    g.putImageData(im, 0, 0);
    if (kind === 'small') { g.fillStyle = '#c66'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '80px sans-serif'; g.fillText('kecil', 200, 300); }
    const type = kind === 'png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise(r => c.toBlob(r, type, kind === 'small' ? 0.8 : 0.95));
    const buf = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode.apply(null, buf.subarray(i, i + 32768));
    return { b64: btoa(s), size: blob.size, type };
  }, kind);
  const cases = [
    ['Foto HP 12 MP (detail penuh)', 'jpg12mp', 'foto-hp.jpg'],
    ['PNG transparan 3000×3000', 'png', 'gambar.png'],
    ['Foto kecil', 'small', 'kecil.jpg'],
  ];
  for (const [label, kind, name] of cases) {
    const f = await make(kind);
    await p.locator('.top .btn', { hasText: 'Barang' }).click(); await p.waitForTimeout(300);
    const before = await p.evaluate(() => (window.__UPLOADS__ || []).length);
    await p.locator('.dr input[type=file]').setInputFiles({ name, mimeType: f.type, buffer: Buffer.from(f.b64, 'base64') });
    await p.waitForFunction((n) => (window.__UPLOADS__ || []).length > n, before, { timeout: 60000 });
    const up = await p.evaluate(() => window.__UPLOADS__[window.__UPLOADS__.length - 1]);
    const toast = await p.locator('.toast').last().innerText().catch(() => '');
    if (kind === 'small') ok(up.size === f.size, label + ': tidak diubah (' + kb(f.size) + ' → ' + kb(up.size) + ')');
    else ok(up.size <= 700 * 1024 && up.type === 'image/jpeg' && /dikompres/.test(toast), label + ': ' + kb(f.size) + ' → ' + kb(up.size) + ' (' + up.type + ') · "' + toast + '"');
    await p.locator('.drf .btn2', { hasText: 'Batal' }).click(); await p.waitForTimeout(300);
  }
  // PDF tidak diubah
  const pdf = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(900 * 1024, 65), Buffer.from('\n%%EOF')]);
  await p.goto('http://localhost:4173/#/w/w-demo/dokumen'); await p.waitForTimeout(900);
  await p.locator('.top .btn', { hasText: 'Dokumen' }).click(); await p.waitForTimeout(300);
  const n0 = await p.evaluate(() => (window.__UPLOADS__ || []).length);
  await p.locator('.dr input[type=file]').setInputFiles({ name: 'akta.pdf', mimeType: 'application/pdf', buffer: pdf });
  await p.waitForFunction((n) => (window.__UPLOADS__ || []).length > n, n0);
  const up = await p.evaluate(() => window.__UPLOADS__[window.__UPLOADS__.length - 1]);
  ok(up.size === pdf.length && up.type === 'application/pdf', 'PDF tidak dikompres (' + kb(up.size) + ')');
  console.log('ERR', JSON.stringify(errs));
  await b.close();
})();
