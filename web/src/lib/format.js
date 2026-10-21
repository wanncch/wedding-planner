// Format angka & tanggal gaya Indonesia
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const HARI_PENDEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const num = (n) => (Number(n) || 0).toLocaleString('id-ID');
export const rp = (n) => 'Rp' + num(Math.round(Number(n) || 0));

/** Rp175 jt, Rp1,5 jt, Rp950 rb */
export function rpShort(n) {
  n = Math.round(Number(n) || 0);
  const a = Math.abs(n), s = n < 0 ? '-' : '';
  if (a >= 1e9) return s + 'Rp' + trim(a / 1e9) + ' M';
  if (a >= 1e6) return s + 'Rp' + trim(a / 1e6) + ' jt';
  if (a >= 1e3) return s + 'Rp' + trim(a / 1e3) + ' rb';
  return s + 'Rp' + a;
}
function trim(x) {
  const v = Math.round(x * 10) / 10;
  return String(v).replace('.', ',');
}

/** "175.000.000" / "175jt" / "1,5 jt" → 175000000 */
export function parseMoney(s) {
  if (s === null || s === undefined) return null;
  let t = String(s).trim().toLowerCase();
  if (!t) return null;
  let mult = 1;
  if (/(jt|juta)$/.test(t)) { mult = 1e6; t = t.replace(/(jt|juta)$/, ''); }
  else if (/(rb|ribu|k)$/.test(t)) { mult = 1e3; t = t.replace(/(rb|ribu|k)$/, ''); }
  t = t.replace(/rp/g, '').trim();
  if (mult > 1) t = t.replace(/\./g, '').replace(',', '.');
  else t = t.replace(/[.\s]/g, '').replace(',', '.');
  const v = Number(t);
  return isNaN(v) ? null : Math.round(v * mult);
}

export function toDate(s) {
  if (!s) return null;
  if (s instanceof Date) return new Date(s.getFullYear(), s.getMonth(), s.getDate());
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function iso(d) {
  const x = d instanceof Date ? d : toDate(d);
  if (!x) return '';
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
}
export function today() { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }
export function addDays(d, n) { const x = toDate(d); x.setDate(x.getDate() + n); return x; }
export function daysBetween(a, b) { return Math.round((toDate(b) - toDate(a)) / 86400000); }

export const dShort = (s) => { const d = toDate(s); return d ? d.getDate() + ' ' + BULAN[d.getMonth()] : '–'; };
export const dMed = (s) => { const d = toDate(s); return d ? d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear() : '–'; };
export const dLong = (s) => { const d = toDate(s); return d ? HARI[d.getDay()] + ', ' + d.getDate() + ' ' + BULAN_PANJANG[d.getMonth()] + ' ' + d.getFullYear() : '–'; };
export const dDay = (s) => { const d = toDate(s); return d ? HARI_PENDEK[d.getDay()] + ', ' + d.getDate() + ' ' + BULAN[d.getMonth()] : '–'; };
export const hm = (t) => (t ? String(t).slice(0, 5).replace(':', '.') : '');

export function timeToMin(t) { if (!t) return 0; const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); }
export function minToTime(m) { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
export function durLabel(min) { const h = Math.floor(min / 60), m = min % 60; return (h ? h + ' jam ' : '') + (m || !h ? m + ' menit' : '').trim(); }

export function greeting() {
  const h = new Date().getHours();
  return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
}

export function initials(name) {
  const p = String(name || '?').replace(/[^A-Za-zÀ-ÿ ]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '?';
  return (p[0][0] + (p[1] ? p[1][0] : (p[0][1] || ''))).toUpperCase();
}

export function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }

export function waLink(phone, text) {
  let p = String(phone || '').replace(/[^\d+]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('0')) p = '62' + p.slice(1);
  return 'https://wa.me/' + p + (text ? '?text=' + encodeURIComponent(text) : '');
}

export function uid() { return (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); })); }
