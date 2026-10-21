// Perhitungan turunan. Semua angka dihitung dari data mentah, tidak disimpan ganda.
import { toDate, addDays, today, daysBetween, iso, timeToMin } from './format.js';

export const PERIODS = [
  { key: 'p1', label: '> 12 bulan', from: 366, to: 9999 },
  { key: 'p2', label: '12–9 bulan', from: 271, to: 365 },
  { key: 'p3', label: '9–6 bulan', from: 181, to: 270 },
  { key: 'p4', label: '6–4 bulan', from: 120, to: 180 },
  { key: 'p5', label: '4–2 bulan', from: 61, to: 119 },
  { key: 'p6', label: '2 bulan – H-8', from: 8, to: 60 },
  { key: 'p7', label: 'H-7 s.d. hari H', from: 0, to: 7 },
  { key: 'p8', label: 'Setelah menikah', from: -9999, to: -1 },
];

export const STAGES = ['Perencanaan awal', 'Booking vendor', 'Busana & rias', 'Administrasi & dokumen', 'Undangan & tamu',
  'Seserahan & lamaran', 'Keluarga & acara', 'Persiapan akhir', 'H-7 s.d. hari H', 'Setelah menikah', 'Lainnya'];

export function taskDue(t, w) {
  if (t.due_date) return toDate(t.due_date);
  return addDays(w.wedding_date, -(t.offset_days || 0));
}
export function daysBefore(date, w) { return daysBetween(date, w.wedding_date); }
export function periodOfTask(t, w) {
  const d = daysBefore(taskDue(t, w), w);
  return PERIODS.find(p => d >= p.from && d <= p.to) || PERIODS[0];
}
export function periodRange(p, w) {
  if (p.key === 'p8') return [addDays(w.wedding_date, 1), null];
  return [p.to >= 9999 ? null : addDays(w.wedding_date, -p.to), addDays(w.wedding_date, -p.from)];
}
export function currentPeriod(w) {
  const d = daysBetween(today(), w.wedding_date);
  return PERIODS.find(p => d >= p.from && d <= p.to) || PERIODS[0];
}

export function taskState(t, w) {
  if (t.status === 'selesai') return { key: 'selesai', label: 'Selesai', cls: 'p-ok' };
  if (t.status === 'batal') return { key: 'batal', label: 'Batal', cls: 'p-no' };
  const late = daysBetween(taskDue(t, w), today());
  if (late > 0) return { key: 'telat', label: 'Telat ' + late + ' hari', cls: 'p-bad', late };
  if (t.status === 'proses') return { key: 'proses', label: 'Proses', cls: 'p-wait' };
  return { key: 'belum', label: 'Belum', cls: 'p-no' };
}

// ---------- Anggaran ----------
export function itemMoney(item, payments) {
  const ps = payments.filter(p => p.item_id === item.id);
  const paid = ps.filter(p => p.paid_on).reduce((s, p) => s + Number(p.amount), 0);
  const scheduled = ps.filter(p => !p.paid_on).sort((a, b) => String(a.due_date || '9').localeCompare(String(b.due_date || '9')));
  const deal = item.deal === null || item.deal === undefined ? null : Number(item.deal);
  const remain = deal === null ? null : Math.max(deal - paid, 0);
  return { paid, deal, remain, scheduled, payments: ps, next: scheduled[0] || null };
}

export function itemStatus(item, m) {
  if (item.is_wishlist) return { key: 'wishlist', label: '☆ Wishlist', cls: 'p-wish' };
  if (m.deal === null) return { key: 'belum_deal', label: 'Belum deal', cls: 'p-no' };
  if (m.deal > 0 && m.paid >= m.deal) return { key: 'lunas', label: 'Lunas', cls: 'p-ok' };
  if (m.next && m.next.due_date) {
    const d = daysBetween(today(), m.next.due_date);
    if (d <= 7) return { key: 'jatuh_tempo', label: (m.next.label || 'Bayar') + ' ' + shortDate(m.next.due_date), cls: 'p-bad' };
  }
  if (m.paid > 0) return { key: 'dp', label: 'DP', cls: 'p-wait' };
  return { key: 'belum_bayar', label: 'Belum bayar', cls: 'p-no' };
}
function shortDate(s) { const d = toDate(s); return d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][d.getMonth()]; }

/** Ringkasan item seserahan yang dihitung ke Anggaran */
export function giftSummary(data, list) {
  const cats = data.gift_categories.filter(c => !list || c.list === list);
  const ids = new Set(cats.map(c => c.id));
  const items = data.gift_items.filter(i => ids.has(i.category_id));
  const planned = items.reduce((s, i) => s + Number(i.planned || 0), 0);
  const bought = items.filter(i => i.status !== 'belum').reduce((s, i) => s + Number(i.actual ?? i.planned ?? 0), 0);
  const ready = items.filter(i => i.status === 'siap').length;
  const ordered = items.filter(i => i.status === 'dipesan').length;
  return { cats, items, planned, bought, ready, ordered, total: items.length };
}

export function budgetSummary(data) {
  const w = data.wedding;
  const items = data.budget_items.filter(i => !i.is_wishlist);
  let planned = 0, deal = 0, paid = 0;
  for (const it of items) {
    const m = itemMoney(it, data.payments);
    planned += Number(it.planned || 0);
    deal += m.deal || 0;
    paid += m.paid;
  }
  // Mahar & seserahan dari menu Seserahan
  const g = giftCounted(data);
  const giftPlan = Number(w.gift_budget || 0) || g.planned;
  planned += giftPlan; deal += g.bought; paid += g.bought;
  return { budget: Number(w.total_budget || 0), planned, deal, paid, owed: deal - paid, left: Number(w.total_budget || 0) - deal, gift: { ...g, plan: giftPlan } };
}

export function giftCounted(data) {
  const catList = Object.fromEntries(data.gift_categories.map(c => [c.id, c.list]));
  const items = data.gift_items.filter(i => i.count_in_budget && catList[i.category_id] !== 'hari_h');
  const planned = items.reduce((s, i) => s + Number(i.planned || 0), 0);
  const bought = items.filter(i => i.status !== 'belum').reduce((s, i) => s + Number(i.actual ?? i.planned ?? 0), 0);
  const ready = data.gift_items.filter(i => catList[i.category_id] === 'seserahan' && i.status === 'siap').length;
  const total = data.gift_items.filter(i => catList[i.category_id] === 'seserahan').length;
  return { planned, bought, ready, total };
}

// ---------- Vendor ----------
export function vendorInfo(v, data) {
  const items = data.budget_items.filter(i => i.vendor_id === v.id);
  let deal = 0, paid = 0, hasDeal = false; let next = null;
  for (const it of items) {
    const m = itemMoney(it, data.payments);
    if (m.deal !== null) { hasDeal = true; deal += m.deal; }
    paid += m.paid;
    if (m.next && (!next || String(m.next.due_date || '9') < String(next.due_date || '9'))) next = m.next;
  }
  const lastPaid = data.payments.filter(p => items.some(i => i.id === p.item_id) && p.paid_on).map(p => p.paid_on).sort().pop();
  const stage = hasDeal ? (deal > 0 && paid >= deal ? 'lunas' : 'deal') : v.stage;
  return { items, deal, paid, hasDeal, stage, next, lastPaid };
}

// ---------- Tamu ----------
export function guestSummary(guests, w) {
  const invites = guests.length;
  const people = guests.reduce((s, g) => s + Number(g.pax || 0), 0);
  const hadir = guests.filter(g => g.rsvp === 'hadir');
  const hadirPax = hadir.reduce((s, g) => s + Number(g.pax || 0), 0);
  const belum = guests.filter(g => g.rsvp === 'belum').length;
  const sent = guests.filter(g => g.sent).length;
  const cetak = guests.filter(g => g.invite_type === 'cetak').length;
  const arrived = guests.filter(g => g.checked_in_at);
  const arrivedPax = arrived.reduce((s, g) => s + Number(g.arrived_pax ?? g.pax ?? 0), 0);
  const portions = Math.round(invites * Number(w.portions_per_invite || 1.5));
  return { invites, people, hadir: hadir.length, hadirPax, belum, sent, cetak, digital: invites - cetak, arrived: arrived.length, arrivedPax, portions };
}

// ---------- Rundown ----------
export function rundownFor(data, eventId) {
  return data.rundown_items.filter(r => r.event_id === eventId)
    .sort((a, b) => timeToMin(a.start_time) - timeToMin(b.start_time) || a.sort - b.sort);
}

// ---------- Skor kesiapan ----------
export function readiness(data) {
  const w = data.wedding;
  const tasks = data.tasks.filter(t => t.status !== 'batal');
  const tDone = tasks.filter(t => t.status === 'selesai').length;
  // Persiapan dihitung terhadap tugas yang deadline-nya sudah lewat atau dalam 30 hari ke depan + yang sudah selesai
  const docs = data.documents.filter(d => d.status !== 'tidak_perlu');
  const dDone = docs.filter(d => d.status === 'lengkap').length;
  const g = giftCounted(data);
  const p1 = tasks.length ? tDone / tasks.length : 0;
  const p2 = docs.length ? dDone / docs.length : 0;
  const p3 = g.total ? g.ready / g.total : 0;
  return { score: Math.round(((p1 + p2 + p3) / 3) * 100), persiapan: Math.round(p1 * 100), dokumen: Math.round(p2 * 100), seserahan: Math.round(p3 * 100), tDone, tTotal: tasks.length };
}

export const KUA_STEPS = {
  islam: ['Surat pengantar RT/RW', 'N1–N4 kelurahan', 'Daftar SIMKAH', 'Bimwin catin', "Pemeriksaan & rafa'", 'Bayar PNBP', 'Akad nikah'],
  lainnya: ['Kursus pranikah', 'Jadwal pemberkatan', 'Siapkan berkas', 'Daftar Disdukcapil', 'Pemberkatan', 'Pencatatan sipil', 'Akta & KK baru'],
};

export const GIFT_LISTS = [
  { key: 'seserahan', label: 'Seserahan & Mahar' },
  { key: 'balasan', label: 'Hantaran Balasan' },
  { key: 'hari_h', label: 'Bawaan Hari H' },
];

export { iso };
