// Tiruan Supabase di browser untuk uji UI (tanpa jaringan). Disuntik sebelum app dimuat.
(function () {
  const TPL = window.__TPL__;
  const uid = () => crypto.randomUUID();
  const now = () => new Date().toISOString();
  const DB = {
    profiles: [], weddings: [], wedding_members: [], wedding_invites: [], events: [], people: [], guest_invites: [], tasks: [], vendors: [], budget_categories: [],
    budget_items: [], payments: [], gift_categories: [], gift_items: [], guests: [], rundown_items: [], documents: [],
    reminders: [], notes: [], selfprep: [], activity_log: [],
    tpl_catalog: TPL.catalog, tpl_gifts: TPL.gifts,
    plans: [
      { id: 'trial', name: 'Trial', price: 0, duration_days: 14, max_weddings: 1, description: '14 hari · 1 pernikahan · semua fitur', is_active: true, sort: 1 },
      { id: 'premium', name: 'Premium', price: 149000, duration_days: null, max_weddings: 1, description: '1 pernikahan · sampai hari H + 30 hari', is_active: true, sort: 2 },
      { id: 'wo', name: 'Vendor / WO', price: 499000, duration_days: 365, max_weddings: 10, description: 'sampai 10 pernikahan klien · 1 tahun', is_active: true, sort: 3 }],
    app_settings: [{ key: 'pay_instructions', value: 'Transfer ke rekening di bawah, lalu upload bukti bayar.' }, { key: 'bank_accounts', value: 'BCA 1234567890 a.n. Wanncch' }, { key: 'qris_url', value: '' }, { key: 'contact_wa', value: '081234567890' }],
    payment_requests: [],
    announcements: [{ id: 'ann-1', title: 'Promo akhir tahun: Premium Rp99.000', body: 'Berlaku sampai 31 Desember 2026.', level: 'promo', audience: 'all', link_label: 'Upgrade', link_url: '#/upgrade', is_active: true, starts_at: '2026-10-01T00:00:00Z', ends_at: null, created_at: '2026-10-01T00:00:00Z' }],
  };
  const STY = [[/mahar|akad|cincin|perhiasan/i, 'cincin', 'k1'], [/ibadah|sholat|mukena/i, 'ibadah', 'k2'], [/dalam|tidur|piyama/i, 'bulan', 'k4'], [/pakaian|baju|busana/i, 'baju', 'k3'], [/skincare|makeup|kosmetik/i, 'botol', 'k5'], [/body|mandi|perawatan/i, 'tetes', 'k6'], [/tas|sepatu|dompet/i, 'tas', 'k7'], [/rumah|dapur/i, 'rumah', 'k8'], [/kue|buah|makan|minum/i, 'kue', 'k9'], [/kotak|hantaran|kemasan/i, 'kado', 'k10'], [/aksesori|jam/i, 'jam', 'k5'], [/dokumen/i, 'buku', 'k2'], [/kesehatan|darurat|obat/i, 'hati', 'k8'], [/elektronik|charger/i, 'bintang', 'k6'], [/tamu|vendor|amplop/i, 'uang', 'k3']];
  const gstyle = (n, so) => { const r = STY.find(([re]) => re.test(n)); return r ? { icon: r[1], color: r[2] } : { icon: 'kado', color: 'k' + ((so || 0) % 10 + 1) }; };
  const ACC = window.__ACCOUNT__ || { is_admin: true, active: true, plan_id: 'wo', plan_name: 'Vendor / WO', status: 'active', valid_until: null, days_left: null, pending: 0, max_weddings: 10 };
  const USERS = [
    { id: 'u-rina', email: 'rina@example.com', name: 'Rina', created_at: '2026-10-01T03:00:00Z', last_sign_in_at: new Date().toISOString(), plan_id: 'wo', status: 'active', valid_until: null, note: '', active: true, is_admin: true, weddings: 1, joined: 0 },
    { id: 'u-mega', email: 'mega.si@gmail.com', name: 'Mega Sanja Imelda', created_at: '2026-10-22T01:34:00Z', last_sign_in_at: new Date(Date.now() - 7200e3).toISOString(), plan_id: 'premium', status: 'active', valid_until: '2027-07-19T16:59:59Z', note: '', active: true, is_admin: false, weddings: 1, joined: 0 },
    { id: 'u-dewi', email: 'dewi.ang@yahoo.com', name: 'Dewi Anggraini', created_at: '2026-10-15T01:34:00Z', last_sign_in_at: new Date(Date.now() - 3600e3).toISOString(), plan_id: 'trial', status: 'trial', valid_until: new Date(Date.now() + 9 * 864e5).toISOString(), note: '', active: true, is_admin: false, weddings: 1, joined: 0 },
    { id: 'u-budi', email: 'budi.s@gmail.com', name: 'Budi Santoso', created_at: '2026-09-01T01:34:00Z', last_sign_in_at: '2026-10-01T01:00:00Z', plan_id: 'trial', status: 'trial', valid_until: '2026-10-02T01:00:00Z', note: '', active: false, is_admin: false, weddings: 1, joined: 0 },
    { id: 'u-spam', email: 'xx@temp.mail', name: '', created_at: '2026-10-11T01:34:00Z', last_sign_in_at: null, plan_id: 'trial', status: 'blocked', valid_until: null, note: 'spam', active: false, is_admin: false, weddings: 0, joined: 0 }];
  window.__USERS__ = USERS;
  window.__DB__ = DB;
  const USER = { id: 'u-rina', email: 'rina@example.com' };
  DB.profiles.push({ id: USER.id, display_name: 'Rina', email: USER.email }, { id: 'u-bagas', display_name: 'Bagas', email: 'bagas@example.com' });
  let session = window.__MOCK_START__ === 'out' ? null : { user: USER, access_token: 'x' };
  const listeners = [];
  const calls = (window.__CALLS__ = []);

  function addDays(d, n) { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); }
  function tm(t, add) { const [h, m] = t.split(':').map(Number); let v = h * 60 + m + add; v = ((v % 1440) + 1440) % 1440; return String(Math.floor(v / 60)).padStart(2, '0') + ':' + String(v % 60).padStart(2, '0') + ':00'; }

  // ---- v4: acara, bagian, orang & pihak (cermin dari create_wedding_core / v4_add_event / v4_seed_target) ----
  function seedTarget(wid, evId, kind, me) {
    const w = DB.weddings.find(x => x.id === wid); const ev = DB.events.find(e => e.id === evId);
    const base = { wedding_id: wid, created_at: now(), updated_at: now() };
    const P = (k) => (DB.people.find(p => p.wedding_id === wid && p.kind === k) || {}).id;
    const b = P('bride'), g = P('groom'), fb = P('fam_bride'), fg = P('fam_groom'); const meP = me || b;
    const payer = ev.payer_id; const kpic = payer === fg ? g : b;
    const tier = w.price_tier, rel = w.religion;
    TPL.tasks.filter(t => ['semua', rel].includes(t.religion) && (t.event_kind || 'akad') === kind).forEach(t => DB.tasks.push({ ...base, id: uid(), event_id: evId, title: t.title, detail: t.detail, stage: t.stage, event_kind: null, offset_days: t.offset_days, due_date: null, pic: '',
      pic_id: { 'Pengantin wanita': b, 'Pengantin pria': g, 'Keluarga pria': g, 'Keluarga wanita': b, Keluarga: kpic }[t.pic] || meP, priority: t.priority, status: 'belum', result: '', link_url: '', done_at: null, sort: t.sort }));
    const price = (c) => (tier === 'min' ? c.price_min : tier === 'prem' ? c.price_prem : c.price_std);
    const kk = (c) => (!c.event_kind || c.event_kind === 'akad' || c.event_kind === 'resepsi' ? 'akad' : c.event_kind);
    TPL.catalog.filter(c => c.unit !== 'persen' && c.scales.includes(w.scale) && ['semua', rel].includes(c.religion) && kk(c) === kind).forEach(c => {
      const q = c.unit === 'porsi' ? Math.round(w.target_invites * w.portions_per_invite) : c.unit === 'undangan' ? w.target_invites : 1;
      const cat = DB.budget_categories.find(x => x.wedding_id === wid && x.name === c.category);
      DB.budget_items.push({ ...base, id: uid(), category_id: cat ? cat.id : null, event_id: evId, vendor_id: null, name: c.name, detail: c.detail, pic: '', pic_id: meP, payer_id: payer, shares: [], source: c.is_vendor ? 'vendor' : 'manual', offer: null, planned: price(c) * q, deal: null, is_wishlist: false, inspo_url: '', contract_url: '', notes: '', catalog_code: c.code, sort: c.sort });
    });
    const gc = {};
    TPL.gifts.filter(x => ['semua', rel].includes(x.religion) && (x.event_kind || 'akad') === kind).forEach(x => {
      const k = x.list + '|' + x.category;
      if (!gc[k]) { gc[k] = uid(); DB.gift_categories.push({ ...base, id: gc[k], event_id: evId, list: x.list, name: x.category, pic: '', pic_id: meP, payer_id: x.list === 'seserahan' ? fg : x.list === 'balasan' ? fb : payer, note: '', sort: x.sort, ...gstyle(x.category, x.sort) }); }
      if (x.is_default) DB.gift_items.push({ ...base, id: uid(), category_id: gc[k], name: x.name, brand: x.brand, qty: x.qty, unit: x.unit, planned: x.planned, actual: null, status: 'belum', pic: '', pic_id: null, target_date: null, shop_url: '', photo_url: '', notes: '', count_in_budget: x.list !== 'hari_h', sort: x.sort });
    });
    const t = (ev.start_time || '10:00:00').slice(0, 5);
    const R = (rows) => rows.forEach((r, i) => DB.rundown_items.push({ ...base, id: uid(), event_id: evId, start_time: tm(t, r[0]), duration_min: r[1], title: r[2], pic: r[3], location: '', needs: r[4] || '', notes: '', state: 'todo', sort: i + 1 }));
    if (kind === 'lamaran' || kind === 'balasan') R([[0, 15, 'Kedatangan rombongan keluarga', 'Juru bicara keluarga'], [15, 15, 'Pembukaan & perkenalan keluarga', 'MC'], [30, 30, kind === 'lamaran' ? 'Penyampaian maksud & jawaban lamaran' : 'Sambutan keluarga & ramah tamah', 'Juru bicara keluarga'], [60, 20, 'Penyerahan hantaran' + (kind === 'lamaran' ? ' & cincin' : ''), 'Keluarga', 'Hantaran'], [80, 40, 'Makan bersama & foto keluarga', 'Keluarga']]);
    if (kind === 'unduh') R([[-120, 90, 'Rias & busana pengantin', 'MUA'], [0, 30, 'Kedatangan pengantin & keluarga wanita', 'Keluarga', 'Kue hantaran'], [30, 150, 'Ramah tamah & salam tamu', 'MC', 'Buku tamu'], [180, 30, 'Penutupan & foto bersama', 'MC']]);
  }
  function addEvent(wid, e, sort, me, seed) {
    const w = DB.weddings.find(x => x.id === wid);
    const base = { wedding_id: wid, created_at: now(), updated_at: now() };
    const P = (k) => (DB.people.find(p => p.wedding_id === wid && p.kind === k) || {}).id;
    const pay = (code, def) => { const c = code || def; return { fam_groom: P('fam_groom'), fam_bride: P('fam_bride'), groom: P('groom'), bride: P('bride') }[c] || (DB.people.find(p => p.id === c) || {}).id || null; };
    const kind = e.kind || 'lainnya';
    const parts = Array.isArray(e.parts) ? e.parts : [];
    const id = uid();
    DB.events.push({ ...base, id, parent_id: null, kind, name: (e.name || '').trim() || { lamaran: 'Lamaran', akad: 'Akad & Resepsi', unduh: 'Unduh mantu' }[kind] || 'Acara keluarga',
      event_date: e.date || (kind === 'akad' ? w.wedding_date : null) || (parts[0] && parts[0].date) || null, start_time: (e.time || (kind === 'akad' ? '08:00' : kind === 'lainnya' ? '' : '10:00')).slice(0, 5) ? (e.time || (kind === 'akad' ? '08:00' : '10:00')).slice(0, 5) + ':00' : null,
      end_time: kind === 'akad' ? '14:00:00' : null, location: e.location || '', is_main: kind === 'akad', sort, color: e.color || { lamaran: 'c1', akad: 'c2', unduh: 'c3' }[kind] || 'c' + (4 + sort % 3), icon: { lamaran: 'hati', akad: 'rings', unduh: 'rumah' }[kind] || 'bunga',
      payer_id: pay(e.payer, kind === 'lamaran' || kind === 'unduh' ? 'fam_groom' : 'fam_bride'), hidden: false, menus: [], detail: '' });
    parts.forEach((pt, j) => {
      const pid = uid(); const pk = pt.kind || 'lainnya';
      DB.events.push({ ...base, id: pid, parent_id: id, kind: pk, name: pt.name || { lamaran: 'Lamaran', balasan: 'Balasan lamaran' }[pk] || 'Bagian ' + (j + 1), event_date: pt.date || null, start_time: '10:00:00', end_time: null, location: pt.location || '', is_main: false, sort: j + 1, color: 'c0', icon: 'hati', payer_id: pay(pt.payer, pk === 'lamaran' ? 'fam_groom' : 'fam_bride'), hidden: false, menus: [], detail: '' });
      if (seed) seedTarget(wid, pid, pk, me);
    });
    if (!parts.length && seed) seedTarget(wid, id, kind, me);
    return id;
  }
  function createWedding(p) {
    const wid = p.__id || uid(); const rel = p.religion || 'islam'; const scale = p.scale || 'm';
    const tier = scale === 's' ? 'min' : scale === 'p' ? 'prem' : 'std';
    const inv = Number(p.target_invites || 300);
    const base = { wedding_id: wid, created_at: now(), updated_at: now() };
    DB.weddings.push({ id: wid, bride_name: p.bride_name, groom_name: p.groom_name, wedding_date: p.wedding_date, city: p.city || '', concept: '', religion: rel, scale, price_tier: tier, total_budget: Number(p.total_budget || 0), gift_budget: 0, target_invites: inv, portions_per_invite: 1.5, kua_step: 1, created_at: now() });
    DB.wedding_members.push({ wedding_id: wid, user_id: USER.id, role: 'owner', label: p.my_label || '' });
    const PP = (o) => { const r = { ...base, id: uid(), role_label: '', side: 'lainnya', can_pic: true, can_pay: false, kind: null, user_ids: [], sort: DB.people.length + 1, ...o }; DB.people.push(r); return r.id; };
    const b = PP({ name: p.bride_name, role_label: 'Pengantin wanita', side: 'wanita', can_pay: true, kind: 'bride', user_ids: p.my_label === 'Pengantin wanita' ? [USER.id] : [], sort: 1 });
    const g = PP({ name: p.groom_name, role_label: 'Pengantin pria', side: 'pria', can_pay: true, kind: 'groom', user_ids: p.my_label === 'Pengantin pria' ? [USER.id] : [], sort: 2 });
    PP({ name: 'Keluarga ' + p.bride_name, role_label: 'Keluarga pengantin wanita', side: 'wanita', can_pic: false, can_pay: true, kind: 'fam_bride', sort: 3 });
    PP({ name: 'Keluarga ' + p.groom_name, role_label: 'Keluarga pengantin pria', side: 'pria', can_pic: false, can_pay: true, kind: 'fam_groom', sort: 4 });
    let me = p.my_label === 'Pengantin wanita' ? b : p.my_label === 'Pengantin pria' ? g : null;
    if (!me && p.my_label) me = PP({ name: 'Rina', role_label: p.my_label, user_ids: [USER.id], sort: 5 });
    TPL.cats.forEach(c => DB.budget_categories.push({ ...base, id: uid(), name: c.name, kind: c.kind, sort: c.sort }));
    let evs = Array.isArray(p.events) && p.events.length ? p.events : [...(p.lamaran_date ? [{ kind: 'lamaran', parts: [{ kind: 'lamaran', date: p.lamaran_date, location: p.lamaran_location || '' }, { kind: 'balasan' }] }] : []), { kind: 'akad', date: p.wedding_date, location: p.resepsi_location || p.akad_location || '' }];
    if (!evs.some(e => e.kind === 'akad')) evs = [{ kind: 'akad', date: p.wedding_date }, ...evs];
    const akT = (p.akad_time || '08:00').slice(0, 5), reT = (p.resepsi_time || '11:00').slice(0, 5);
    let akad = null;
    evs.forEach((e, i) => { const id = addEvent(wid, e.kind === 'akad' ? { ...e, date: e.date || p.wedding_date, time: akT } : e, i + 1, me, true); if (e.kind === 'akad' && !akad) akad = id; });
    const A = DB.events.find(e => e.id === akad); A.end_time = tm(reT, 180); A.detail = 'Akad ' + akT.replace(':', '.') + (p.akad_location ? ' ' + p.akad_location : '') + ' · Resepsi ' + reT.replace(':', '.') + (p.resepsi_location ? ' ' + p.resepsi_location : '');
    const w = DB.weddings.find(x => x.id === wid);
    const sub = DB.budget_items.filter(x => x.wedding_id === wid).reduce((s, i) => s + i.planned, 0);
    TPL.catalog.filter(c => c.unit === 'persen' && c.scales.includes(scale)).forEach(c => DB.budget_items.push({ ...base, id: uid(), category_id: DB.budget_categories.find(x => x.wedding_id === wid && x.name === c.category).id, event_id: akad, vendor_id: null, name: c.name, detail: c.detail, pic: '', pic_id: me || b, payer_id: A.payer_id, shares: [], source: 'manual', offer: null, planned: Math.round(sub * (tier === 'min' ? c.price_min : tier === 'prem' ? c.price_prem : c.price_std) / 100), deal: null, is_wishlist: false, inspo_url: '', contract_url: '', notes: '', catalog_code: c.code, sort: c.sort }));
    w.gift_budget = DB.gift_items.filter(i => DB.gift_categories.find(c => c.id === i.category_id && c.list === 'seserahan' && c.event_id === akad)).reduce((s, i) => s + i.planned, 0);
    { const its = DB.budget_items.filter(x => x.wedding_id === wid); const sumI = its.reduce((a, x) => a + x.planned, 0);
      const f = (w.total_budget * 0.96 - w.gift_budget) / sumI;
      if (w.total_budget > 0 && f > 0.2) its.forEach(x => { x.planned = Math.max(Math.round(x.planned * f / 50000) * 50000, x.planned > 0 ? 50000 : 0); }); }
    TPL.docs.filter(d => ['semua', rel].includes(d.religion)).forEach(d => DB.documents.push({ ...base, id: uid(), party: d.party, name: d.name, detail: d.detail, status: 'belum', file_url: '', expires_on: null, sort: d.sort }));
    TPL.selfprep.filter(s => ['semua', rel].includes(s.religion)).forEach(s => DB.selfprep.push({ ...base, id: uid(), title: s.title, who: s.who, freq: s.freq, done: false, progress: 0, total: s.total, sort: s.sort }));
    [['Kontak darurat WO', false], ['Dress code', false], ['Hashtag', false], ['Parkir tamu', false], ['Rekening untuk amplop digital', true]].forEach(([l, s], i) => DB.notes.push({ ...base, id: uid(), event_id: akad, label: l, value: '', secret: s, sort: i + 1 }));
    [[akT, -180, 120, 'Rias & busana pengantin', 'MUA', 'Ruang rias', ''], [akT, -45, 30, 'Kedatangan keluarga pria & penyerahan seserahan', 'Juru bicara keluarga', '', 'Seserahan'], [akT, -15, 15, 'Pembukaan & tilawah', 'MC', '', 'Mic'], [akT, 0, 30, rel === 'islam' ? 'Ijab kabul' : 'Pemberkatan', 'Penghulu & wali', '', 'Mahar, cincin, dokumen asli'], [akT, 30, 30, 'Sungkeman & foto keluarga inti', 'WO', '', 'Daftar urutan foto'],
      [reT, -60, 60, 'Ganti busana resepsi', 'MUA', 'Ruang rias', ''], [reT, 0, 180, 'Resepsi: kirab, salam tamu, hiburan', 'WO', '', 'Buku tamu'], [reT, 180, 30, 'Penutupan & foto bersama panitia', 'MC', '', '']]
      .forEach((r, i) => DB.rundown_items.push({ ...base, id: uid(), event_id: akad, start_time: tm(r[0], r[1]), duration_min: r[2], title: r[3], pic: r[4], location: r[5], needs: r[6], notes: '', state: 'todo', sort: i + 1 }));
    return wid;
  }
  window.__createWedding__ = createWedding;

  function matches(row, filters) { return filters.every(([op, c, v]) => (op === 'eq' ? String(row[c]) === String(v) : op === 'gt' ? Number(row[c]) > Number(v) : true)); }

  class Q {
    constructor(t) { this.t = t; this.f = []; this.op = 'select'; this.ord = null; this.sel = '*'; this.one = false; this.maybe = false; this.lim = null; this.retSel = false; }
    select(cols) { if (this.op === 'select') this.sel = cols || '*'; else this.retSel = true; return this; }
    eq(c, v) { this.f.push(['eq', c, v]); return this; }
    gt(c, v) { this.f.push(['gt', c, v]); return this; }
    upsert(r) { this.op = 'upsert'; this.rows = Array.isArray(r) ? r : [r]; return this; }
    order(c, o) { this.ord = [c, !o || o.ascending !== false]; return this; }
    limit(n) { this.lim = n; return this; }
    single() { this.one = true; return this; }
    maybeSingle() { this.one = true; this.maybe = true; return this; }
    insert(r) { this.op = 'insert'; this.rows = Array.isArray(r) ? r : [r]; return this; }
    update(p) { this.op = 'update'; this.patch = p; return this; }
    delete() { this.op = 'delete'; return this; }
    then(res, rej) { return new Promise(r => setTimeout(r, window.__LATENCY__ || 5)).then(() => this.run()).then(res, rej); }
    run() {
      calls.push([this.op, this.t, JSON.stringify(this.f), this.patch ? JSON.stringify(this.patch) : '']);
      if (window.__FAIL_NEXT__) { window.__FAIL_NEXT__ = false; return { data: null, error: { message: 'Failed to fetch' } }; }
      const T = DB[this.t] || (DB[this.t] = []);
      if (this.op === 'upsert') { this.rows.forEach(r => { const k = r.key !== undefined ? 'key' : 'id'; const i = T.findIndex(x => x[k] === r[k]); if (i >= 0) T[i] = { ...T[i], ...r }; else T.push(r); }); return { data: this.rows, error: null }; }
      if (this.op === 'insert' && this.t === 'gift_categories') this.rows = this.rows.map(r => (r.icon ? r : { ...r, ...gstyle(r.name, r.sort) }));
      if (this.op === 'insert' && this.t === 'payment_requests') this.rows = this.rows.map(r => ({ user_id: USER.id, status: 'pending', admin_note: '', ...r }));
      if (this.op === 'insert') {
        const out = this.rows.map(r => {
          const row = { id: r.id || uid(), created_at: now(), updated_at: now(), ...r };
          if (this.t === 'wedding_invites') { row.token = row.token || Math.random().toString(16).slice(2); row.status = 'pending'; }
          if (this.t === 'tasks' && row.status === 'selesai') row.done_at = now();
          T.push(row); return { ...row };
        });
        return { data: this.one ? out[0] : out, error: null };
      }
      if (this.op === 'update') {
        const out = [];
        T.forEach((r, i) => { if (matches(r, this.f)) { T[i] = { ...r, ...this.patch, updated_at: now() }; out.push(T[i]); } });
        return { data: out, error: null };
      }
      if (this.op === 'delete') {
        const ids = T.filter(r => matches(r, this.f)).map(r => r.id);
        DB[this.t] = T.filter(r => !matches(r, this.f));
        if (this.t === 'gift_categories') DB.gift_items = DB.gift_items.filter(i => !ids.includes(i.category_id));
        if (this.t === 'budget_items') DB.payments = DB.payments.filter(p => !ids.includes(p.item_id));
        if (this.t === 'guests') DB.guest_invites = DB.guest_invites.filter(p => !ids.includes(p.guest_id));
        if (this.t === 'vendors') DB.budget_items.forEach(b => { if (ids.includes(b.vendor_id)) b.vendor_id = null; });
        if (this.t === 'events') { const all = new Set(ids); DB.events.filter(e => all.has(e.parent_id)).forEach(e => all.add(e.id)); DB.events = DB.events.filter(e => !all.has(e.id)); ['tasks', 'budget_items', 'gift_categories', 'reminders', 'notes', 'rundown_items', 'guest_invites'].forEach(t => { DB[t] = DB[t].filter(r => !all.has(r.event_id)); }); }
        if (this.t === 'weddings') Object.keys(DB).forEach(k => { if (Array.isArray(DB[k]) && k !== 'weddings') DB[k] = DB[k].filter(r => !ids.includes(r.wedding_id)); });
        return { data: null, error: null };
      }
      let rows = T.filter(r => matches(r, this.f)).map(r => ({ ...r }));
      if (this.t === 'wedding_members' && /wedding:weddings/.test(this.sel)) rows = rows.map(r => ({ role: r.role, wedding: DB.weddings.find(w => w.id === r.wedding_id) }));
      if (this.ord) { const [c, asc] = this.ord; rows.sort((a, b) => { const x = a[c], y = b[c]; if (x === y) return 0; if (x === null || x === undefined) return 1; if (y === null || y === undefined) return -1; return (x > y ? 1 : -1) * (asc ? 1 : -1); }); }
      if (this.lim) rows = rows.slice(0, this.lim);
      if (this.one) { if (!rows.length && !this.maybe) return { data: null, error: { message: 'not found' } }; return { data: rows[0] || null, error: null }; }
      return { data: rows, error: null };
    }
  }

  const files = {};
  window.__MOCK_SUPABASE__ = {
    from: (t) => new Q(t),
    rpc: async (fn, a) => {
      calls.push(['rpc', fn, JSON.stringify(a)]);
      await new Promise(r => setTimeout(r, 10));
      if (fn === 'create_wedding') return { data: createWedding(a.p), error: null };
      if (fn === 'check_in_invite') { const g = DB.guest_invites.find(x => x.id === a.p_invite); Object.assign(g, a.p_undo ? { checked_in_at: null, arrived_pax: null } : { checked_in_at: now(), arrived_pax: a.p_pax, rsvp: 'hadir' }); return { data: { ...g }, error: null }; }
      if (fn === 'add_event') { const me = (DB.people.find(p => p.wedding_id === a.p_wid && p.user_ids.includes(USER.id)) || {}).id; const sort = DB.events.filter(e => e.wedding_id === a.p_wid && !e.parent_id).reduce((m, e) => Math.max(m, e.sort), 0) + 1; return { data: addEvent(a.p_wid, a.p, sort, me, a.p.seed !== false), error: null }; }
      if (fn === 'check_in_guest') { const g = DB.guests.find(x => x.id === a.p_guest); Object.assign(g, a.p_undo ? { checked_in_at: null, arrived_pax: null } : { checked_in_at: now(), arrived_pax: a.p_pax, rsvp: 'hadir' }); return { data: { ...g }, error: null }; }
      if (fn === 'invite_info') { const i = DB.wedding_invites.find(x => x.token === a.p_token); if (!i) return { data: null, error: null }; const w = DB.weddings.find(x => x.id === i.wedding_id); return { data: { couple: w.bride_name + ' & ' + w.groom_name, wedding_date: w.wedding_date, email: i.email, role: i.role, status: i.status, invited_by: 'Rina' }, error: null }; }
      if (fn === 'accept_invite') { const i = DB.wedding_invites.find(x => x.token === a.p_token); i.status = 'accepted'; DB.wedding_members.push({ wedding_id: i.wedding_id, user_id: USER.id, role: i.role, label: '' }); return { data: i.wedding_id, error: null }; }
      if (fn === 'my_account') return { data: { ...ACC, pending: DB.payment_requests.filter(p => p.user_id === USER.id && p.status === 'pending').length }, error: null };
      if (fn === 'wedding_active') return { data: window.__WED_ACTIVE__ !== false, error: null };
      if (fn === 'admin_overview') return { data: { total: USERS.length, new_week: 2, premium: 2, trial: 1, trial_ending: 0, expired: 1, blocked: 1, weddings: 4, revenue_month: 298000, revenue_total: 947000,
        monthly: Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - 11 + i); return { m: d.toISOString().slice(0, 7), n: [0, 0, 0, 1, 0, 2, 1, 3, 2, 4, 5, 2][i], rev: 149000 * [0, 0, 0, 1, 0, 2, 1, 3, 2, 4, 5, 2][i] }; }),
        pending: DB.payment_requests.filter(p => p.status === 'pending').map(p => { const u = USERS.find(x => x.id === p.user_id) || {}; return { ...p, email: u.email, name: u.name }; }) }, error: null };
      if (fn === 'admin_list_users') return { data: USERS.map(u => ({ ...u })), error: null };
      if (fn === 'admin_user_detail') return { data: { payments: DB.payment_requests.filter(p => p.user_id === a.p_user), weddings: a.p_user === 'u-mega' ? [{ id: 'x', couple: 'Mega & Fajar', date: '2027-06-19', role: 'owner', members: 3, tasks: 81, gifts: 34, guests: 120 }] : [], log: [] }, error: null };
      if (fn === 'admin_set_subscription') { const u = USERS.find(x => x.id === a.p_user); Object.assign(u, { plan_id: a.p_plan, status: a.p_status, valid_until: a.p_until, active: ['trial', 'active'].includes(a.p_status) && (!a.p_until || new Date(a.p_until) > new Date()) }); return { data: null, error: null }; }
      if (fn === 'admin_record_payment') { DB.payment_requests.push({ id: uid(), user_id: a.p_user, plan_id: a.p_plan, amount: a.p_amount, method: a.p_method, note: a.p_note, status: 'approved', admin_note: '', proof_url: '', created_at: now() }); const u = USERS.find(x => x.id === a.p_user); Object.assign(u, { plan_id: a.p_plan, status: 'active', valid_until: a.p_until, active: true }); return { data: null, error: null }; }
      if (fn === 'admin_decide_payment') { const p = DB.payment_requests.find(x => x.id === a.p_id); p.status = a.p_approve ? 'approved' : 'rejected'; p.admin_note = a.p_note; return { data: null, error: null }; }
      if (fn === 'admin_delete_user') { const i = USERS.findIndex(x => x.id === a.p_user); USERS.splice(i, 1); return { data: null, error: null }; }
      return { data: null, error: { message: 'unknown rpc' } };
    },
    auth: {
      getSession: async () => ({ data: { session } }),
      onAuthStateChange: (cb) => { listeners.push(cb); return { data: { subscription: { unsubscribe() {} } } }; },
      signInWithPassword: async ({ email, password }) => { if (password !== 'rahasia123') return { error: { message: 'Invalid login credentials' } }; session = { user: { ...USER, email }, access_token: 'x' }; listeners.forEach(l => l('SIGNED_IN', session)); return { data: { session }, error: null }; },
      signUp: async ({ email, options }) => { session = { user: { ...USER, email }, access_token: 'x' }; listeners.forEach(l => l('SIGNED_IN', session)); return { data: { session }, error: null }; },
      signOut: async () => { session = null; listeners.forEach(l => l('SIGNED_OUT', null)); return { error: null }; },
      resetPasswordForEmail: async () => ({ error: null }),
      updateUser: async () => ({ error: null }),
    },
    storage: {
      from: () => ({
        upload: async (path, f) => { files[path] = URL.createObjectURL(f); return { data: { path }, error: null }; },
        createSignedUrl: async (path) => ({ data: { signedUrl: files[path] || 'about:blank' }, error: null }),
        list: async () => ({ data: [], error: null }),
        remove: async () => ({ data: [], error: null }),
      }),
    },
    channel: () => { const c = { on: () => c, subscribe: () => c }; return c; },
    removeChannel: () => {},
  };

  // ---------- Data demo Rina & Bagas (v4 · per acara) ----------
  if (window.__MOCK_DEMO__ !== false) {
    const wid = createWedding({ __id: 'w-demo', bride_name: 'Rina', groom_name: 'Bagas', wedding_date: '2027-06-19', religion: 'islam', scale: 'm', total_budget: 230000000, target_invites: 300, akad_location: 'Masjid Al-Ikhlas', resepsi_location: 'Graha Asri', my_label: 'Pengantin wanita',
      events: [{ kind: 'lamaran', parts: [{ kind: 'lamaran', date: '2027-01-16', location: 'Rumah Rina, Bandung' }, { kind: 'balasan', date: '2027-01-30', location: 'Rumah Bagas, Garut' }] },
        { kind: 'akad', date: '2027-06-19', location: 'Graha Asri, Bandung' }, { kind: 'unduh', date: '2027-06-26', location: 'Rumah Bagas, Garut' }] });
    window.__WID__ = wid;
    DB.wedding_members.push({ wedding_id: wid, user_id: 'u-bagas', role: 'editor', label: 'Bagas' });
    const W = DB.weddings[0]; Object.assign(W, { kua_step: 3, city: 'Bandung', concept: 'Sunda modern' });
    const base = { wedding_id: wid, created_at: now(), updated_at: now() };
    const Pk = (k) => DB.people.find(p => p.wedding_id === wid && p.kind === k).id;
    const rina = Pk('bride'), bagas = Pk('groom'), kr = Pk('fam_bride'), kb = Pk('fam_groom');
    DB.people.find(p => p.id === bagas).user_ids = ['u-bagas'];
    const PP = (o) => { const r = { ...base, id: uid(), role_label: '', side: 'lainnya', can_pic: true, can_pay: false, kind: null, user_ids: [], sort: DB.people.length + 1, ...o }; DB.people.push(r); return r.id; };
    const ibuRina = PP({ name: 'Ibu Rina', role_label: 'Ibu pengantin wanita', side: 'wanita' });
    const ibuSri = PP({ name: 'Ibu Sri', role_label: 'Ibu pengantin pria', side: 'pria' });
    const omYusuf = PP({ name: 'Om Yusuf', role_label: 'Paman pengantin pria', side: 'pria' });
    const wo = PP({ name: 'WO Kirana', role_label: 'Wedding organizer', side: 'lainnya' });
    const EV = (n) => DB.events.find(e => e.wedding_id === wid && e.name === n);
    const lam = EV('Lamaran'), akad = EV('Akad & Resepsi'), unduh = EV('Unduh mantu');
    const pLam = DB.events.find(e => e.parent_id === lam.id && e.kind === 'lamaran'), pBal = DB.events.find(e => e.parent_id === lam.id && e.kind === 'balasan');
    // tugas
    const T = (t) => DB.tasks.find(x => x.title === t);
    DB.tasks.filter(t => t.event_id === akad.id && t.offset_days >= 290).forEach(t => { t.status = 'selesai'; });
    Object.assign(T('Booking venue'), { result: 'Graha Asri', pic_id: bagas });
    Object.assign(T('Booking MUA & trial makeup'), { status: 'proses', result: 'Sanggar Rias Ayu · trial 12 Des', pic_id: rina });
    Object.assign(T('Booking fotografer & videografer'), { status: 'proses', result: '3 kandidat', pic_id: rina });
    Object.assign(T('Booking catering & food testing'), { status: 'selesai', result: 'Dapur Ibu Ratna', pic_id: ibuRina });
    Object.assign(T('Buat daftar tamu awal'), { status: 'proses', result: '148 undangan · lihat Tamu', pic_id: rina });
    Object.assign(T('Booking wedding organizer'), { pic_id: bagas });
    Object.assign(T('Booking dekorasi'), { status: 'selesai', pic_id: rina });
    Object.assign(T('Pesan seragam keluarga'), { pic_id: ibuRina, status: 'proses' });
    T('Sepakati tanggal & konsep lamaran').status = 'selesai';
    Object.assign(T('Tentukan juru bicara keluarga'), { pic_id: omYusuf, status: 'selesai' });
    Object.assign(T('Siapkan hantaran lamaran'), { pic_id: ibuSri, status: 'proses', result: 'Seserahan › 4/9 siap' });
    Object.assign(T('Pesan konsumsi lamaran'), { pic_id: ibuRina, due_date: '2026-11-08', detail: '60 pax · masih membandingkan 2 katering' });
    Object.assign(T('Siapkan cincin tunangan'), { pic_id: bagas, status: 'proses' });
    const NT = (o) => DB.tasks.push({ ...base, id: uid(), detail: '', stage: 'Seserahan & lamaran', event_kind: null, due_date: null, pic: '', priority: 'sedang', status: 'belum', result: '', link_url: '', done_at: null, sort: 50, ...o });
    NT({ event_id: pLam.id, title: 'Tentukan tanggal & jumlah rombongan', offset_days: 88, pic_id: bagas, status: 'selesai', detail: 'Disepakati dua keluarga · 25 orang' });
    NT({ event_id: pLam.id, title: 'Sewa mobil rombongan', offset_days: 46, pic_id: omYusuf, status: 'selesai', detail: '2 mobil · 25 orang' });
    NT({ event_id: akad.id, title: 'Survei 3 kandidat dokumentasi', offset_days: 217, due_date: '2026-11-14', pic_id: rina });
    NT({ event_id: unduh.id, title: 'Izin acara ke RT setempat', offset_days: 30, due_date: '2026-11-17', pic_id: omYusuf });
    DB.tasks.filter(t => t.event_id === unduh.id && t.title === 'Izin acara ke RT setempat' && !t.due_date).forEach(t => { DB.tasks.splice(DB.tasks.indexOf(t), 1); });
    // kontak vendor & slot per acara
    const V = (o) => { const v = { ...base, id: uid(), contact_name: '', phone: '', instagram: '', estimate: null, stage: 'belum', notes: '', sort: DB.vendors.length + 1, ...o }; DB.vendors.push(v); return v.id; };
    const vGed = V({ category: 'Venue', name: 'Graha Asri', contact_name: 'Pak Harun', phone: '081234560011' });
    const vCat = V({ category: 'Catering', name: 'Dapur Ibu Ratna', contact_name: 'Bu Ratna', phone: '081234500222' });
    const vMua = V({ category: 'MUA', name: 'Sanggar Rias Ayu', contact_name: 'Mbak Ayu', phone: '081234500333' });
    const vDek = V({ category: 'Dekorasi', name: 'Dekor Anggun', contact_name: 'Mas Rio', phone: '081234500444' });
    const vAud = V({ category: 'Sound system', name: 'Sinar Audio', contact_name: 'Dimas', phone: '081234500555' });
    const vInv = V({ category: 'Undangan', name: 'Percetakan Kartika', contact_name: 'Bu Kartika', phone: '081234500666' });
    const vEmas = V({ category: 'Perhiasan', name: 'Toko Emas Sinar', contact_name: 'Koh Ali', phone: '081234500777' });
    const vMawar = V({ category: 'Dekorasi', name: 'Dekor Mawar', contact_name: 'Teh Mawar', phone: '081234500888' });
    const vBatik = V({ category: 'Seragam', name: 'Batik Bu Wati', contact_name: 'Bu Wati', phone: '081234500999' });
    V({ category: 'Wedding organizer', name: 'Elegance WO', contact_name: 'Kirana', phone: '081234502210', notes: 'Minta paket tanpa catering' });
    const B = (ev, code, o) => { const it = DB.budget_items.find(x => x.event_id === ev && x.catalog_code === code); Object.assign(it, o); return it.id; };
    const P = (item, label, amount, paid, due) => DB.payments.push({ ...base, id: uid(), item_id: item, label, amount, paid_on: paid || null, due_date: due || null, method: paid ? 'Transfer' : '', proof_url: '', note: '', sort: DB.payments.length });
    const pl = pLam.id;
    let i = B(pl, 'LAM-03', { name: 'Cincin lamaran', vendor_id: vEmas, planned: 4000000, deal: 4000000, pic_id: bagas, payer_id: kb }); P(i, 'DP', 2000000, '2026-10-20'); P(i, 'Pelunasan', 2000000, null, '2026-12-20');
    B(pl, 'LAM-01', { name: 'Konsumsi 60 pax', planned: 3000000, pic_id: ibuRina, payer_id: kr, notes: '2 kandidat' });
    i = B(pl, 'LAM-02', { name: 'Dekor sederhana', vendor_id: vMawar, planned: 1500000, deal: 1500000, pic_id: rina, payer_id: kr, detail: 'ruang tamu Rina' }); P(i, 'DP', 500000, null, '2026-11-20');
    const cTr = DB.budget_categories.find(c => c.wedding_id === wid && c.name === 'Keluarga & transportasi').id;
    i = uid(); DB.budget_items.push({ ...base, id: i, category_id: cTr, event_id: pl, vendor_id: null, name: 'Sewa 2 mobil rombongan', detail: 'DP Rp500.000 · 28 Nov', pic: '', pic_id: omYusuf, payer_id: kb, shares: [], source: 'manual', offer: null, planned: 1000000, deal: 1000000, is_wishlist: false, inspo_url: '', contract_url: '', notes: '', catalog_code: null, sort: 90 }); P(i, 'DP', 500000, null, '2026-11-28');
    const ak = akad.id;
    i = B(ak, 'VEN-01', { name: 'Gedung', detail: 'akad & resepsi', vendor_id: vGed, planned: 25000000, deal: 25000000, pic_id: rina }); P(i, 'DP', 10000000, '2026-09-20'); P(i, 'Pelunasan', 15000000, null, '2027-05-19');
    i = B(ak, 'CAT-01', { name: 'Catering 600 porsi', vendor_id: vCat, planned: 48000000, deal: 48000000, pic_id: ibuRina, inspo_url: 'https://pinterest.com/', notes: 'Food tasting kedua Sabtu 24 Okt.' }); P(i, 'DP', 15000000, '2026-10-08'); P(i, 'DP catering ke-2', 10000000, null, '2026-11-25'); P(i, 'Pelunasan', 23000000, null, '2027-06-05');
    i = B(ak, 'DEC-01', { name: 'Dekorasi pelaminan', detail: 'rustic garden', vendor_id: vDek, planned: 18000000, deal: 18000000, pic_id: rina }); P(i, 'DP', 5000000, '2026-10-12');
    B(ak, 'BG-03', { name: 'MUA & busana pengantin', vendor_id: vMua, planned: 9500000, offer: 9500000, pic_id: rina, payer_id: rina, notes: 'Trial makeup 12 Des' });
    B(ak, 'ENT-03', { vendor_id: vAud, planned: 4000000, offer: 4000000, pic_id: wo, notes: 'Tunggu daftar alat', detail: 'Sound system & mikrofon', name: 'Sound system' });
    i = B(ak, 'INV-02', { name: 'Undangan cetak 300 lembar', vendor_id: vInv, planned: 4000000, deal: 4000000, pic_id: bagas, payer_id: kb }); P(i, 'Lunas', 4000000, '2026-10-01');
    i = B(ak, 'BG-05', { name: 'Cincin nikah sepasang', vendor_id: vEmas, planned: 5500000, deal: 5500000, pic_id: bagas, payer_id: bagas }); P(i, 'Lunas', 5500000, '2026-10-15');
    B(ak, 'DOC-01', { name: 'Dokumentasi', detail: 'Foto & video akad, resepsi', planned: 12000000, pic_id: rina, shares: [{ p: rina, pct: 50 }, { p: bagas, pct: 50 }], notes: '3 kandidat dibandingkan' });
    B(ak, 'ENT-04', { name: 'Hiburan · organ tunggal', planned: 6000000, pic_id: ibuRina });
    i = B(ak, 'FAM-01', { name: 'Seragam keluarga 20 pcs', vendor_id: vBatik, pic_id: ibuRina, deal: 6000000, planned: 6000000 }); P(i, 'DP', 1500000, '2026-10-30'); P(i, 'Termin 1', 3000000, null, '2026-12-05');
    i = B(ak, 'ENT-01', { name: 'Wedding organizer', vendor_id: null, pic_id: bagas, planned: 12000000 });
    DB.budget_items.push({ ...base, id: uid(), category_id: DB.budget_categories.find(c => c.wedding_id === wid && c.name === 'Tempat & dekorasi').id, event_id: ak, vendor_id: null, name: 'Photobooth', detail: 'kalau ada sisa budget', pic: '', pic_id: rina, payer_id: kr, shares: [], source: 'manual', offer: null, planned: 2500000, deal: null, is_wishlist: true, inspo_url: '', contract_url: '', notes: '', catalog_code: null, sort: 99 });
    i = DB.budget_items.find(x => x.event_id === ak && x.catalog_code === 'ADM-02'); if (i) { i.deal = 600000; P(i.id, 'Bayar PNBP', 600000, null, '2026-12-01'); }
    // seserahan
    const gcat = (n, ev) => DB.gift_categories.find(c => c.name === n && c.event_id === (ev || ak)).id;
    DB.gift_items.forEach(g => {
      if ([gcat('Perlengkapan ibadah'), gcat('Pakaian dalam & tidur'), gcat('Kotak hantaran')].includes(g.category_id)) Object.assign(g, { status: 'siap', actual: g.planned });
      if (['Seperangkat alat sholat', "Al-Qur'an & tafsir", 'Mahar (uang / logam mulia)', 'Kebaya / dress', 'Kain batik', 'Tas'].includes(g.name)) Object.assign(g, { status: 'siap', actual: g.planned });
      if (['Blouse', 'Gamis / outer', 'Sepatu / sandal', 'Body wash', 'Body lotion'].includes(g.name)) Object.assign(g, { status: 'dipesan', actual: g.planned - 50000 });
    });
    DB.gift_items.filter(g => [gcat('Kue & buah lamaran', pl), gcat('Bingkisan lamaran', pl)].includes(g.category_id)).slice(0, 4).forEach(g => Object.assign(g, { status: 'siap', actual: g.planned }));
    const G = (n, o) => Object.assign(DB.gift_items.find(x => x.name === n), o);
    G('Facial wash', { brand: 'Skintific · 5X Ceramide', actual: 145000, status: 'dipesan', shop_url: 'https://shopee.co.id' });
    G('Toner', { brand: 'Skintific', actual: 150000, status: 'dipesan' });
    G('Sunscreen', { brand: 'Azarine · SPF 45', qty: 2, actual: 65000, status: 'siap' });
    Object.assign(DB.gift_categories.find(c => c.name === 'Skincare & makeup'), { pic_id: bagas, note: 'beli bundling biar hemat ongkir' });
    DB.gift_categories.filter(c => c.event_id === pl).forEach(c => { c.pic_id = ibuSri; });
    // buku tamu induk + undangan per acara
    const targets = { L: pl, B: pBal.id, A: ak, U: unduh.id };
    [['H. Ahmad Fauzi & Keluarga', 'Paman Bagas', 'pria', 'Keluarga Bagas', 'cetak', '081311110001', 4, 'LAU', 'hadir', 'VIP 1', true],
      ['Ibu Siti Rahma', 'Bude Rina', 'wanita', 'Keluarga Rina', 'cetak', '081311110002', 2, 'LBA', 'hadir', 'VIP 2', true],
      ['Keluarga Besar Pak Darmo', 'Kakek Bagas', 'pria', 'Keluarga Bagas', 'cetak', '', 8, 'LAU', 'ragu', '', false],
      ['Om Yusuf Sekeluarga', 'Paman Bagas', 'pria', 'Keluarga Bagas', 'cetak', '081311110006', 3, 'LBAU', 'hadir', '', false],
      ['Rombongan Alumni Unpad 2018', 'Teman kuliah Rina', 'wanita', 'Teman Rina', 'digital', '081311110003', 12, 'A', 'belum', '', false],
      ['Tim Marketing PT Sinar', 'Rekan kerja Rina', 'wanita', 'Kantor Rina', 'digital', '081311110004', 5, 'A', 'hadir', '12', false],
      ['Pak RT 05 & Ibu', 'Tetangga Rina', 'wanita', 'Lingkungan', 'cetak', '', 2, 'A', 'belum', '', false],
      ['Dimas & Nadia', 'Sahabat', 'bersama', 'Teman berdua', 'digital', '081311110008', 2, 'AU', 'hadir', '7', false],
      ['Karang Taruna RW 03', 'Tetangga Bagas', 'pria', 'Lingkungan', 'digital', '081311110012', 15, 'U', 'belum', '', false],
      ['Komunitas Pengajian Ibu', 'Komunitas', 'wanita', 'Ibu Rina', 'digital', '081311110007', 15, 'A', 'ragu', '', false],
      ['Tim IT PT Nusantara', 'Rekan kerja Bagas', 'pria', 'Kantor Bagas', 'digital', '081311110010', 6, 'AU', 'belum', '', false],
      ['Bu Lurah & Suami', 'Tokoh masyarakat', 'wanita', 'Lingkungan', 'cetak', '', 2, 'A', 'hadir', 'VIP 3', true]]
      .forEach(g => {
        const id = uid();
        DB.guests.push({ ...base, id, name: g[0], relation: g[1], side: g[2], source: g[3], invite_type: g[4], phone: g[5], address: '', pax: g[6], sent: false, rsvp: 'belum', table_no: '', is_vip: g[10], checked_in_at: null, arrived_pax: null, notes: '' });
        g[7].split('').forEach(k => DB.guest_invites.push({ ...base, id: uid(), guest_id: id, event_id: targets[k], pax: null, rsvp: k === 'A' ? g[8] : 'belum', sent: k === 'A' && !!g[5], table_no: k === 'A' ? g[9] : '', checked_in_at: null, arrived_pax: null }));
      });
    [['Kumpulkan ukuran cincin', 'Untuk cincin nikah', '2026-11-13', bagas, 'tinggi', pl], ['Food tasting kedua', 'Dapur Ibu Ratna · ajak Ibu', '2026-11-24', ibuRina, 'sedang', ak], ['Fitting kebaya akad ke-2', 'Butik Laras · bawa sepatu', '2027-01-22', rina, 'sedang', ak], ['Daftar SIMKAH online', 'Siapkan scan N1–N4', '2027-02-01', bagas, 'tinggi', ak], ['Final meeting dengan WO', 'Bawa rundown & daftar PIC', '2027-06-14', bagas, 'sedang', ak]]
      .forEach(r => DB.reminders.push({ ...base, id: uid(), title: r[0], detail: r[1], due_date: r[2], pic: '', pic_id: r[3], priority: r[4], done: false, done_at: null, event_id: r[5] }));
    const N = (l, v) => { DB.notes.find(n => n.label === l).value = v; };
    N('Kontak darurat WO', 'Kirana · 0812-3450-2210'); N('Dress code', 'Sage & dusty pink'); N('Hashtag', '#RinaBagasBersama'); N('Parkir tamu', 'Basement B1 · 120 mobil'); N('Rekening untuk amplop digital', 'BCA 1234564471 a.n. Rina Lestari');
    DB.selfprep.forEach(x => { if (['Belajar fiqh nikah', 'Sholat hajat & dzikir rutin'].includes(x.title)) x.done = true; if (x.title === 'Pertanyaan pranikah') x.progress = 12; });
    DB.documents.forEach(d => { if (['Fotokopi KTP', 'Kartu keluarga', 'Akta kelahiran'].includes(d.name)) d.status = 'lengkap'; if (d.name === 'Formulir N1–N4' && d.party === 'wanita') Object.assign(d, { status: 'lengkap', expires_on: '2027-05-02' }); if (/^Pas foto/.test(d.name)) d.status = 'proses'; });
    DB.payment_requests.push({ id: uid(), user_id: 'u-dewi', plan_id: 'premium', amount: 149000, method: 'Transfer bank', proof_url: '', note: 'dari BRI a.n. Dewi', status: 'pending', admin_note: '', created_at: new Date(Date.now() - 5400e3).toISOString() });
    DB.wedding_invites.push({ id: uid(), wedding_id: wid, email: 'ibu.rina@example.com', role: 'viewer', label: 'Ibu Sri', token: 'tok123', status: 'pending', created_at: now() });
  }
})();
