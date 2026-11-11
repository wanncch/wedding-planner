// Acara, bagian acara, sub menu per acara, dan orang/pihak.
import { toDate, dShort, dMed, dLong } from './format.js';

export const MENU_DEFS = {
  persiapan: { label: 'Persiapan', icon: 'list', desc: 'Tugas per periode atau per tahap, dengan PIC', cat: 'Daftar tugas menuju hari acara.' },
  anggaran: { label: 'Anggaran', icon: 'wallet', desc: 'Rekap semua biaya acara, siapa yang menanggung', cat: 'Rekap biaya dan penanggungnya.' },
  vendor: { label: 'Vendor', icon: 'store', desc: 'Papan vendor, biayanya masuk ke Anggaran', cat: 'Papan vendor dari belum dipilih sampai lunas.' },
  seserahan: { label: 'Seserahan', icon: 'gift', desc: 'Barang bawaan per kategori, masuk ke Anggaran', cat: 'Barang bawaan per kategori berikon.' },
  tamu: { label: 'Tamu', icon: 'users', desc: 'Diambil dari buku tamu induk, RSVP & check-in sendiri', cat: 'Undangan, RSVP, check-in hari H.' },
  rundown: { label: 'Rundown', icon: 'clock', desc: 'Susunan acara dan mode hari H di HP', cat: 'Susunan acara per sesi.' },
  dokumen: { label: 'Dokumen', icon: 'file', desc: 'Berkas KUA atau catatan sipil', cat: 'Berkas KUA atau catatan sipil.' },
  catatan: { label: 'Catatan', icon: 'note', desc: 'Reminder, catatan penting, persiapan diri', cat: 'Reminder, catatan penting, persiapan diri.' },
  undangan: { label: 'Undangan web', icon: 'mail', desc: 'Halaman undangan pribadi per tamu', cat: 'Halaman undangan pribadi per tamu.', soon: true },
};
const BASE_MENUS = ['persiapan', 'anggaran', 'vendor', 'seserahan', 'tamu', 'rundown', 'catatan'];

export const EV_COLORS = ['c1', 'c2', 'c3', 'c0', 'c4', 'c5', 'c6'];
export const EV_ICONS = { lamaran: 'hati', akad: 'rings', unduh: 'rumah', lainnya: 'bunga' };
export const KIND_LABEL = { lamaran: 'Lamaran', balasan: 'Balasan lamaran', akad: 'Akad & Resepsi', resepsi: 'Resepsi', unduh: 'Unduh mantu', lainnya: 'Acara lain' };

/** Daftar sub menu acara ini [{k, on}] sesuai urutan, termasuk bawaan yang belum tersimpan. */
export function eventMenus(ev) {
  const saved = Array.isArray(ev.menus) ? ev.menus.filter(m => m && MENU_DEFS[m.k] && !MENU_DEFS[m.k].soon) : [];
  if (saved.length) return saved;
  const keys = [...BASE_MENUS];
  if (ev.kind === 'akad') keys.splice(6, 0, 'dokumen');
  return keys.map(k => ({ k, on: true }));
}
export const visibleMenus = (ev) => eventMenus(ev).filter(m => m.on).map(m => m.k);

export function topEvents(data, withHidden) {
  return data.events.filter(e => !e.parent_id && (withHidden || !e.hidden)).sort((a, b) => a.sort - b.sort || String(a.event_date).localeCompare(String(b.event_date)));
}
export function partsOf(data, evId) {
  return data.events.filter(e => e.parent_id === evId).sort((a, b) => a.sort - b.sort);
}
export function eventById(data, id) { return data.events.find(e => e.id === id) || null; }
/** Acara induk dari sebuah acara/bagian. */
export function rootOf(data, id) {
  const e = eventById(data, id);
  if (!e) return null;
  return e.parent_id ? eventById(data, e.parent_id) : e;
}
/** Semua id acara + bagiannya. */
export function familyIds(data, evId) { return [evId, ...partsOf(data, evId).map(p => p.id)]; }

/** Tanggal acuan sebuah acara/bagian (bagian tanpa tanggal ikut induknya, lalu tanggal nikah). */
export function baseDate(data, id) {
  const e = eventById(data, id);
  if (e && e.event_date) return e.event_date;
  if (e && e.parent_id) { const p = eventById(data, e.parent_id); if (p && p.event_date) return p.event_date; }
  if (e && !e.parent_id) { const ps = partsOf(data, e.id).find(p => p.event_date); if (ps) return ps.event_date; }
  return data.wedding.wedding_date;
}

/** "16 & 30 Jan 2027" atau "19 Jun 2027" */
export function eventDateLabel(data, ev) {
  const ps = partsOf(data, ev.id).filter(p => p.event_date);
  if (ps.length > 1) {
    const ds = ps.map(p => toDate(p.event_date));
    const sameMonth = ds.every(d => d.getMonth() === ds[0].getMonth() && d.getFullYear() === ds[0].getFullYear());
    if (sameMonth) return ds.map(d => d.getDate()).join(' & ') + ' ' + dMed(ds[0]).split(' ').slice(1).join(' ');
    return ps.map(p => dShort(p.event_date)).join(' & ') + ' ' + toDate(ps[ps.length - 1].event_date).getFullYear();
  }
  const d = ev.event_date || (ps[0] && ps[0].event_date);
  return d ? dMed(d) : 'Tanggal belum diisi';
}
export function eventLongLabel(data, ev, part) {
  const e = part || ev;
  const d = part ? baseDate(data, part.id) : null;
  if (part) return [ev.name, d ? dLong(d) : null, e.location].filter(Boolean).join(' · ');
  const ps = partsOf(data, ev.id);
  if (ps.length) return [ev.name, eventDateLabel(data, ev), ev.location || ps[0].location].filter(Boolean).join(' · ');
  return [ev.name, ev.event_date ? dLong(ev.event_date) : null, ev.location].filter(Boolean).join(' · ');
}

/** Bagian yang dipilih, diingat per acara. key = id bagian | 'all' */
const PK = (id) => 'wp-part-' + id;
export function rememberedPart(data, ev) {
  const ps = partsOf(data, ev.id);
  if (!ps.length) return null;
  let k = null;
  try { k = localStorage.getItem(PK(ev.id)); } catch (e) { /* abaikan */ }
  if (k === 'all' || ps.some(p => p.id === k)) return k;
  return ps[0].id;
}
export function rememberPart(evId, key) { try { localStorage.setItem(PK(evId), key); } catch (e) { /* abaikan */ } }

/** id yang termasuk tampilan sekarang */
export function scopeOf(data, ev, partKey) {
  const ps = partsOf(data, ev.id);
  if (!ps.length) return { ids: [ev.id], target: ev.id, part: null, parts: ps, all: false };
  if (!partKey || partKey === 'all') return { ids: [ev.id, ...ps.map(p => p.id)], target: ps[0].id, part: null, parts: ps, all: true };
  const part = ps.find(p => p.id === partKey) || ps[0];
  return { ids: [part.id], target: part.id, part, parts: ps, all: false };
}

/** Acara bawaan untuk menu lama / HP */
export function mainEvent(data) {
  const tops = topEvents(data);
  return tops.find(e => e.kind === 'akad') || tops[0] || null;
}

/* ---------------- orang & pihak ---------------- */
export const SIDES = [{ key: 'wanita', label: 'Pihak wanita', cls: 'pw' }, { key: 'pria', label: 'Pihak pria', cls: 'pp' }, { key: 'lainnya', label: 'Lainnya', cls: 'po' }];
export const sideLabel = (s) => (SIDES.find(x => x.key === s) || SIDES[2]).label;
export const sideCls = (s) => (SIDES.find(x => x.key === s) || SIDES[2]).cls;
export function personById(data, id) { return (data.people || []).find(p => p.id === id) || null; }
export function personName(data, id) { const p = personById(data, id); return p ? p.name : ''; }
export function peopleSorted(data) {
  return [...(data.people || [])].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
}
/** orang yang terhubung ke akun yang sedang masuk */
export function myPeople(data, userId) { return (data.people || []).filter(p => (p.user_ids || []).includes(userId)).map(p => p.id); }
export function personByKind(data, kind) { return (data.people || []).find(p => p.kind === kind) || null; }

/** Penanggung bawaan sebuah acara/bagian */
export function defaultPayer(data, eventId) {
  const e = eventById(data, eventId);
  if (e && e.payer_id) return e.payer_id;
  const r = rootOf(data, eventId);
  if (r && r.payer_id) return r.payer_id;
  const fb = personByKind(data, 'fam_bride');
  return fb ? fb.id : null;
}
