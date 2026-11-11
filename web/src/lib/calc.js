// Perhitungan turunan. Semua angka dihitung dari data mentah, tidak disimpan ganda.
import { toDate, addDays, today, daysBetween, iso, timeToMin } from './format.js';
import { baseDate, eventById, rootOf, defaultPayer, personById } from './events.js';

/* =================================================================== */
/* Tugas & periode                                                      */
/* =================================================================== */
export const PERIODS_LONG = [
  { key: 'p1', label: '> 12 bulan', long: 'Lebih dari 12 bulan', from: 366, to: 9999 },
  { key: 'p2', label: '12–9 bulan', long: '12–9 bulan', from: 271, to: 365 },
  { key: 'p3', label: '9–6 bulan', long: '9–6 bulan', from: 181, to: 270 },
  { key: 'p4', label: '6–4 bulan', long: '6–4 bulan', from: 120, to: 180 },
  { key: 'p5', label: '4–2 bulan', long: '4–2 bulan', from: 61, to: 119 },
  { key: 'p6', label: '2 bulan – H-8', long: '2 bulan – H-8', from: 8, to: 60 },
  { key: 'p7', label: 'H-7 s.d. hari H', long: 'H-7 s.d. hari H', from: 0, to: 7 },
  { key: 'p8', label: 'Setelah acara', long: 'Setelah acara', from: -9999, to: -1 },
];
export const PERIODS_SHORT = [
  { key: 's1', label: '> 2 bulan', long: 'Lebih dari 2 bulan', from: 61, to: 9999 },
  { key: 's2', label: '2 – 1 bulan', long: '2 – 1 bulan', from: 31, to: 60 },
  { key: 's3', label: '1 bulan – H-8', long: '1 bulan – H-8', from: 8, to: 30 },
  { key: 's4', label: 'H-7 s.d. hari H', long: 'H-7 s.d. hari H', from: 0, to: 7 },
  { key: 's5', label: 'Setelah acara', long: 'Setelah acara', from: -9999, to: -1 },
];
export const PERIODS = PERIODS_LONG;
export function periodsFor(data, ev) {
  return ev && ev.kind === 'akad' ? PERIODS_LONG : PERIODS_SHORT;
}

export const STAGES = ['Perencanaan awal', 'Booking vendor', 'Busana & rias', 'Administrasi & dokumen', 'Undangan & tamu',
  'Seserahan & lamaran', 'Keluarga & acara', 'Persiapan akhir', 'H-7 s.d. hari H', 'Setelah menikah', 'Lainnya'];

/** Tanggal acuan tugas: tanggal acara/bagiannya. */
export function taskBase(t, data) { return baseDate(data, t.event_id); }
export function taskDue(t, data) {
  if (t.due_date) return toDate(t.due_date);
  return addDays(taskBase(t, data), -(t.offset_days || 0));
}
export function periodOfTask(t, data, periods) {
  const d = daysBetween(taskDue(t, data), taskBase(t, data));
  return periods.find(p => d >= p.from && d <= p.to) || periods[0];
}
export function periodRange(p, base) {
  if (p.to < 0) return [addDays(base, 1), null];
  return [p.to >= 9999 ? null : addDays(base, -p.to), addDays(base, -p.from)];
}
export function currentPeriod(base, periods) {
  const d = daysBetween(today(), base);
  return periods.find(p => d >= p.from && d <= p.to) || periods[0];
}

export function taskState(t, data) {
  if (t.status === 'selesai') return { key: 'selesai', label: 'Selesai', cls: 'p-ok' };
  if (t.status === 'batal') return { key: 'batal', label: 'Batal', cls: 'p-no' };
  const late = daysBetween(taskDue(t, data), today());
  if (late > 0) return { key: 'telat', label: 'Telat ' + late + ' hari', cls: 'p-bad', late };
  if (t.status === 'proses') return { key: 'proses', label: 'Proses', cls: 'p-wait' };
  return { key: 'belum', label: 'Belum', cls: 'p-no' };
}

/* =================================================================== */
/* Uang                                                                 */
/* =================================================================== */
export function itemMoney(item, payments) {
  const ps = payments.filter(p => p.item_id === item.id);
  const paid = ps.filter(p => p.paid_on).reduce((s, p) => s + Number(p.amount), 0);
  const scheduled = ps.filter(p => !p.paid_on).sort((a, b) => String(a.due_date || '9').localeCompare(String(b.due_date || '9')));
  const deal = item.deal === null || item.deal === undefined ? null : Number(item.deal);
  const remain = deal === null ? null : Math.max(deal - paid, 0);
  return { paid, deal, remain, scheduled, payments: ps, next: scheduled[0] || null };
}

const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
function shortDate(s) { const d = toDate(s); return d.getDate() + ' ' + BLN[d.getMonth()]; }

export function itemStatus(item, m) {
  if (item.is_wishlist) return { key: 'wishlist', label: '☆ Wishlist', cls: 'p-wish' };
  if (item.source === 'vendor' && !item.vendor_id) return { key: 'belum_dipilih', label: 'Belum dipilih', cls: 'p-sel' };
  if (m.deal === null) return item.source === 'vendor' ? { key: 'nego', label: 'Negosiasi', cls: 'p-wait' } : { key: 'belum_deal', label: 'Belum deal', cls: 'p-no' };
  if (m.deal > 0 && m.paid >= m.deal) return { key: 'lunas', label: 'Lunas', cls: 'p-ok' };
  if (m.next && m.next.due_date) {
    const d = daysBetween(today(), m.next.due_date);
    if (d <= 7) return { key: 'jatuh_tempo', label: (m.next.label || 'Bayar') + ' ' + shortDate(m.next.due_date), cls: 'p-bad' };
  }
  if (m.paid > 0) return { key: 'dp', label: 'DP', cls: 'p-wait' };
  return { key: 'belum_bayar', label: 'Belum bayar', cls: 'p-no' };
}

/** Tahap vendor di papan: belum (dipilih) / nego / deal / lunas */
export function vendorStage(item, m) {
  if (!item.vendor_id) return 'belum';
  if (m.deal === null) return 'nego';
  if (m.deal > 0 && m.paid >= m.deal) return 'lunas';
  return 'deal';
}

/** Pembagian penanggung [{p, pct}] */
export function itemShares(data, it) {
  const sh = Array.isArray(it.shares) ? it.shares.filter(s => s && s.p && Number(s.pct) > 0) : [];
  if (sh.length) return sh.map(s => ({ p: s.p, pct: Number(s.pct) }));
  const p = it.payer_id || defaultPayer(data, it.event_id);
  return p ? [{ p, pct: 100 }] : [];
}

/** Semua baris biaya untuk sekumpulan acara/bagian (vendor, seserahan, dan item lain). */
export function costLines(data, ids) {
  const set = new Set(ids);
  const out = [];
  data.budget_items.filter(i => set.has(i.event_id) && !i.is_wishlist).forEach(it => {
    const m = itemMoney(it, data.payments);
    const isV = it.source === 'vendor';
    const cat = data.budget_categories.find(c => c.id === it.category_id);
    out.push({
      key: 'b' + it.id, kind: isV ? 'vendor' : 'manual', group: isV ? 'vendor' : (it.category_id || 'lain'),
      groupName: isV ? 'Vendor' : cat ? cat.name : 'Lainnya', groupSort: isV ? -2 : cat ? cat.sort : 999,
      name: it.name, vendor: it.vendor_id ? data.vendors.find(v => v.id === it.vendor_id) : null, item: it, event_id: it.event_id,
      planned: Number(it.planned || 0), deal: m.deal, paid: m.paid, remain: m.remain, m, status: itemStatus(it, m),
      pic_id: it.pic_id, pic_text: it.pic, shares: itemShares(data, it),
    });
  });
  data.gift_categories.filter(c => set.has(c.event_id) && c.list !== 'hari_h').forEach(c => {
    const its = data.gift_items.filter(i => i.category_id === c.id && i.count_in_budget);
    if (!its.length) return;
    const planned = its.reduce((s, i) => s + Number(i.planned || 0), 0);
    const bought = its.filter(i => i.status !== 'belum').reduce((s, i) => s + Number(i.actual ?? i.planned ?? 0), 0);
    const ready = its.filter(i => i.status === 'siap').length;
    const p = c.payer_id || defaultPayer(data, c.event_id);
    out.push({
      key: 'g' + c.id, kind: 'seserahan', group: 'seserahan', groupName: 'Seserahan', groupSort: -1,
      name: c.name, cat: c, event_id: c.event_id, planned, deal: bought || null, paid: bought, remain: null,
      status: { key: ready === its.length ? 'lunas' : bought ? 'dp' : 'belum_bayar', label: ready + '/' + its.length + ' siap', cls: ready === its.length ? 'p-ok' : 'p-wait' },
      pic_id: c.pic_id, pic_text: c.pic, shares: p ? [{ p, pct: 100 }] : [], n: its.length, ready,
    });
  });
  return out;
}

export const purposeOf = (l) => (l.kind === 'vendor' ? 'vendor' : l.kind === 'seserahan' ? 'seserahan' : 'lainnya');

/** Ringkasan: total, per pihak, per orang, per kelompok */
export function summarize(lines, data) {
  const blank = () => ({ planned: 0, paid: 0, remain: 0 });
  const S = { planned: 0, deal: 0, paid: 0, remain: 0, n: lines.length, side: { pria: blank(), wanita: blank(), lainnya: blank() }, person: {}, purpose: { vendor: 0, seserahan: 0, lainnya: 0 } };
  for (const l of lines) {
    S.planned += l.planned; S.deal += l.deal || 0; S.paid += l.paid; S.remain += l.remain || 0;
    S.purpose[purposeOf(l)] += l.planned;
    for (const s of l.shares) {
      const p = personById(data, s.p);
      const side = p ? p.side : 'lainnya';
      const f = s.pct / 100;
      S.side[side].planned += l.planned * f; S.side[side].paid += l.paid * f; S.side[side].remain += (l.remain || 0) * f;
      const P = S.person[s.p] || (S.person[s.p] = blank());
      P.planned += l.planned * f; P.paid += l.paid * f; P.remain += (l.remain || 0) * f;
    }
  }
  return S;
}

/** Tagihan terjadwal (belum dibayar) dalam n hari, dibagi per penanggung */
export function upcomingBills(data, ids, days, onlyPeople) {
  const set = ids ? new Set(ids) : null;
  const lim = addDays(today(), days);
  const out = [];
  data.payments.filter(p => !p.paid_on && p.due_date && toDate(p.due_date) <= lim).forEach(p => {
    const it = data.budget_items.find(i => i.id === p.item_id);
    if (!it || (set && !set.has(it.event_id))) return;
    const shares = itemShares(data, it);
    if (onlyPeople && !shares.some(s => onlyPeople.includes(s.p))) return;
    out.push({ pay: p, item: it, shares, due: toDate(p.due_date), amount: Number(p.amount) });
  });
  return out.sort((a, b) => a.due - b.due);
}

/* =================================================================== */
/* Seserahan, tamu, kesiapan                                            */
/* =================================================================== */
export const GIFT_LISTS = [
  { key: 'seserahan', label: 'Seserahan & Mahar', short: 'Seserahan' },
  { key: 'balasan', label: 'Hantaran Balasan', short: 'Hantaran balasan' },
  { key: 'hari_h', label: 'Bawaan Hari H', short: 'Bawaan hari H' },
];

export function giftStats(data, ids) {
  const set = new Set(ids);
  const cats = new Set(data.gift_categories.filter(c => set.has(c.event_id) && c.list !== 'hari_h').map(c => c.id));
  const items = data.gift_items.filter(i => cats.has(i.category_id));
  return { total: items.length, ready: items.filter(i => i.status === 'siap').length };
}

/** Undangan per acara: gabungan buku induk + data acara */
export function invitesFor(data, ids) {
  const set = new Set(ids);
  const byId = Object.fromEntries(data.guests.map(g => [g.id, g]));
  return (data.guest_invites || []).filter(i => set.has(i.event_id) && byId[i.guest_id]).map(i => ({ ...i, g: byId[i.guest_id], _pax: i.pax ?? byId[i.guest_id].pax ?? 0 }));
}
export function inviteSummary(list) {
  const guests = new Set(list.map(i => i.guest_id));
  const people = list.reduce((s, i) => s + Number(i._pax || 0), 0);
  const hadir = list.filter(i => i.rsvp === 'hadir');
  const arrived = list.filter(i => i.checked_in_at);
  return {
    invites: guests.size, people, hadir: hadir.length, hadirPax: hadir.reduce((s, i) => s + Number(i._pax || 0), 0),
    belum: list.filter(i => i.rsvp === 'belum').length, sent: list.filter(i => i.sent).length,
    arrived: arrived.length, arrivedPax: arrived.reduce((s, i) => s + Number(i.arrived_pax ?? i._pax ?? 0), 0),
  };
}

export function rundownFor(data, eventId) {
  return data.rundown_items.filter(r => r.event_id === eventId)
    .sort((a, b) => timeToMin(a.start_time) - timeToMin(b.start_time) || a.sort - b.sort);
}

/** Skor kesiapan untuk sekumpulan acara (null = semua) */
export function readiness(data, ids) {
  const set = ids ? new Set(ids) : null;
  const tasks = data.tasks.filter(t => t.status !== 'batal' && (!set || set.has(t.event_id)));
  const tDone = tasks.filter(t => t.status === 'selesai').length;
  const g = giftStats(data, ids || data.events.map(e => e.id));
  const parts = [];
  if (tasks.length) parts.push(tDone / tasks.length);
  if (g.total) parts.push(g.ready / g.total);
  const withDocs = !set || [...set].some(id => { const r = rootOf(data, id); return r && r.kind === 'akad'; });
  const docs = data.documents.filter(d => d.status !== 'tidak_perlu');
  if (withDocs && docs.length) parts.push(docs.filter(d => d.status === 'lengkap').length / docs.length);
  const score = parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100) : 0;
  return { score, tDone, tTotal: tasks.length, gReady: g.ready, gTotal: g.total };
}

export const KUA_STEPS = {
  islam: ['Surat pengantar RT/RW', 'N1–N4 kelurahan', 'Daftar SIMKAH', 'Bimwin catin', "Pemeriksaan & rafa'", 'Bayar PNBP', 'Akad nikah'],
  lainnya: ['Kursus pranikah', 'Jadwal pemberkatan', 'Siapkan berkas', 'Daftar Disdukcapil', 'Pemberkatan', 'Pencatatan sipil', 'Akta & KK baru'],
};

export { iso, eventById };
