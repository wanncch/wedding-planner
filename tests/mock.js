// Tiruan Supabase di browser untuk uji UI (tanpa jaringan). Disuntik sebelum app dimuat.
(function () {
  const TPL = window.__TPL__;
  const uid = () => crypto.randomUUID();
  const now = () => new Date().toISOString();
  const DB = {
    profiles: [], weddings: [], wedding_members: [], wedding_invites: [], events: [], tasks: [], vendors: [], budget_categories: [],
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

  function createWedding(p) {
    const wid = p.__id || uid(); const rel = p.religion || 'islam'; const scale = p.scale || 'm';
    const tier = scale === 's' ? 'min' : scale === 'p' ? 'prem' : 'std';
    const inv = Number(p.target_invites || 300); const por = 1.5;
    const base = { wedding_id: wid, created_at: now(), updated_at: now() };
    DB.weddings.push({ id: wid, bride_name: p.bride_name, groom_name: p.groom_name, wedding_date: p.wedding_date, city: p.city || '', concept: '', religion: rel, scale, price_tier: tier, total_budget: Number(p.total_budget || 0), gift_budget: 0, target_invites: inv, portions_per_invite: por, kua_step: 1, created_at: now() });
    DB.wedding_members.push({ wedding_id: wid, user_id: USER.id, role: 'owner', label: p.my_label || '' });
    const ev = {};
    if (p.lamaran_date) { ev.lamaran = uid(); DB.events.push({ ...base, id: ev.lamaran, kind: 'lamaran', name: 'Lamaran', event_date: p.lamaran_date, start_time: '10:00:00', end_time: null, location: p.lamaran_location || '', is_main: false, sort: 1 }); }
    const akT = (p.akad_time || '08:00').slice(0, 5), reT = (p.resepsi_time || '11:00').slice(0, 5);
    ev.akad = uid(); DB.events.push({ ...base, id: ev.akad, kind: 'akad', name: rel === 'islam' ? 'Akad nikah' : 'Pemberkatan', event_date: p.wedding_date, start_time: akT + ':00', end_time: null, location: p.akad_location || '', is_main: true, sort: 2 });
    ev.resepsi = uid(); DB.events.push({ ...base, id: ev.resepsi, kind: 'resepsi', name: 'Resepsi', event_date: p.wedding_date, start_time: reT + ':00', end_time: tm(reT, 180), location: p.resepsi_location || '', is_main: true, sort: 3 });
    const cats = {};
    TPL.cats.forEach(c => { const id = uid(); cats[c.name] = id; DB.budget_categories.push({ ...base, id, name: c.name, kind: c.kind, sort: c.sort }); });
    const price = (c) => (tier === 'min' ? c.price_min : tier === 'prem' ? c.price_prem : c.price_std);
    let sub = 0;
    TPL.catalog.filter(c => c.unit !== 'persen' && c.scales.includes(scale) && ['semua', rel].includes(c.religion) && (c.event_kind !== 'lamaran' || ev.lamaran)).forEach(c => {
      const q = c.unit === 'porsi' ? Math.round(inv * por) : c.unit === 'undangan' ? inv : 1;
      sub += price(c) * q;
      DB.budget_items.push({ ...base, id: uid(), category_id: cats[c.category], event_id: c.event_kind ? ev[c.event_kind] || null : null, vendor_id: null, name: c.name, detail: c.detail, pic: '', planned: price(c) * q, deal: null, is_wishlist: false, inspo_url: '', contract_url: '', notes: '', catalog_code: c.code, sort: c.sort });
    });
    TPL.catalog.filter(c => c.unit === 'persen' && c.scales.includes(scale)).forEach(c => DB.budget_items.push({ ...base, id: uid(), category_id: cats[c.category], event_id: null, vendor_id: null, name: c.name, detail: c.detail, pic: '', planned: Math.round(sub * price(c) / 100), deal: null, is_wishlist: false, inspo_url: '', contract_url: '', notes: '', catalog_code: c.code, sort: c.sort }));
    const gc = {};
    TPL.gifts.filter(g => ['semua', rel].includes(g.religion)).forEach(g => {
      const k = g.list + '|' + g.category;
      if (!gc[k]) { gc[k] = uid(); DB.gift_categories.push({ ...base, id: gc[k], list: g.list, name: g.category, pic: '', note: '', sort: g.sort, ...gstyle(g.category, g.sort) }); }
      if (g.is_default) DB.gift_items.push({ ...base, id: uid(), category_id: gc[k], name: g.name, brand: g.brand, qty: g.qty, unit: g.unit, planned: g.planned, actual: null, status: 'belum', pic: '', target_date: null, shop_url: '', photo_url: '', notes: '', count_in_budget: g.list !== 'hari_h', sort: g.sort });
    });
    const w = DB.weddings.find(x => x.id === wid);
    w.gift_budget = DB.gift_items.filter(i => DB.gift_categories.find(c => c.id === i.category_id && c.list === 'seserahan' && c.wedding_id === wid)).reduce((s, i) => s + i.planned, 0);
    { const its = DB.budget_items.filter(x => x.wedding_id === wid); const sumI = its.reduce((a, b) => a + b.planned, 0);
      const f = (w.total_budget * 0.96 - w.gift_budget) / sumI;
      if (w.total_budget > 0 && f > 0.2) its.forEach(x => { x.planned = Math.max(Math.round(x.planned * f / 50000) * 50000, x.planned > 0 ? 50000 : 0); }); }
    TPL.tasks.filter(t => ['semua', rel].includes(t.religion) && (t.event_kind !== 'lamaran' || ev.lamaran)).forEach(t => {
      let off = t.offset_days;
      if (t.event_kind === 'lamaran') off = Math.round((new Date(p.wedding_date) - new Date(addDays(p.lamaran_date, -t.offset_days))) / 864e5);
      DB.tasks.push({ ...base, id: uid(), title: t.title, detail: t.detail, stage: t.stage, event_kind: t.event_kind, offset_days: off, due_date: null, pic: t.pic, priority: t.priority, status: 'belum', result: '', link_url: '', done_at: null, sort: t.sort });
    });
    TPL.docs.filter(d => ['semua', rel].includes(d.religion)).forEach(d => DB.documents.push({ ...base, id: uid(), party: d.party, name: d.name, detail: d.detail, status: 'belum', file_url: '', expires_on: null, sort: d.sort }));
    TPL.selfprep.filter(s => ['semua', rel].includes(s.religion)).forEach(s => DB.selfprep.push({ ...base, id: uid(), title: s.title, who: s.who, freq: s.freq, done: false, progress: 0, total: s.total, sort: s.sort }));
    [['Kontak darurat WO', false], ['Dress code', false], ['Hashtag', false], ['Parkir tamu', false], ['Rekening untuk amplop digital', true]].forEach(([l, s], i) => DB.notes.push({ ...base, id: uid(), label: l, value: '', secret: s, sort: i + 1 }));
    [[ev.akad, -180, 120, 'Rias & busana pengantin', 'MUA', 'Ruang rias', ''], [ev.akad, -45, 30, 'Kedatangan keluarga pria & penyerahan seserahan', 'Juru bicara keluarga', '', 'Seserahan'], [ev.akad, -15, 15, 'Pembukaan & tilawah', 'MC', '', 'Mic'], [ev.akad, 0, 30, rel === 'islam' ? 'Ijab kabul' : 'Pemberkatan', 'Penghulu & wali', '', 'Mahar, cincin, dokumen asli'], [ev.akad, 30, 30, 'Sungkeman & foto keluarga inti', 'WO', '', 'Daftar urutan foto']].forEach((r, i) => DB.rundown_items.push({ ...base, id: uid(), event_id: r[0], start_time: tm(akT, r[1]), duration_min: r[2], title: r[3], pic: r[4], location: r[5], needs: r[6], notes: '', state: 'todo', sort: i + 1 }));
    [[-60, 60, 'Ganti busana resepsi', 'MUA', 'Ruang rias', ''], [0, 180, 'Resepsi: kirab, salam tamu, hiburan', 'WO', '', 'Buku tamu'], [180, 30, 'Penutupan & foto bersama panitia', 'MC', '', '']].forEach((r, i) => DB.rundown_items.push({ ...base, id: uid(), event_id: ev.resepsi, start_time: tm(reT, r[0]), duration_min: r[1], title: r[2], pic: r[3], location: r[4], needs: r[5], notes: '', state: 'todo', sort: i + 1 }));
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

  // ---------- Data demo Rina & Bagas ----------
  if (window.__MOCK_DEMO__ !== false) {
    const wid = createWedding({ __id: 'w-demo', bride_name: 'Rina', groom_name: 'Bagas', wedding_date: '2027-06-19', lamaran_date: '2027-01-16', religion: 'islam', scale: 'm', total_budget: 175000000, target_invites: 300, akad_location: 'Masjid Al-Ikhlas', resepsi_location: 'Gedung Melati', my_label: 'Pengantin wanita' });
    window.__WID__ = wid;
    DB.wedding_members.push({ wedding_id: wid, user_id: 'u-bagas', role: 'editor', label: '' });
    const W = DB.weddings[0]; Object.assign(W, { kua_step: 3, city: 'Bandung', concept: 'Sunda modern', gift_budget: 25000000 });
    const T = (t) => DB.tasks.find(x => x.title === t);
    DB.tasks.filter(t => t.offset_days >= 290).forEach(t => { t.status = 'selesai'; });
    Object.assign(T('Booking venue'), { result: 'Gedung Serbaguna Melati' });
    Object.assign(T('Booking MUA & trial makeup'), { status: 'selesai', result: 'Sanggar Rias Ayu', pic: 'Rina' });
    Object.assign(T('Booking fotografer & videografer'), { status: 'selesai', result: 'Lens & Bloom · paket Silver', pic: 'Rina' });
    Object.assign(T('Susun list seserahan'), { status: 'selesai', result: '34 barang · lihat Seserahan', pic: 'Bagas' });
    Object.assign(T('Booking catering & food testing'), { status: 'proses', result: 'Shortlist: Dapur Ibu Ratna', pic: 'Rina, Ibu' });
    Object.assign(T('Buat daftar tamu awal'), { status: 'proses', result: '148 undangan · lihat Tamu', pic: 'Rina, Bagas' });
    Object.assign(T('Booking wedding organizer'), { pic: 'Bagas' });
    Object.assign(T('Booking dekorasi'), { status: 'selesai', pic: 'Bagas' });
    const base = { wedding_id: wid, created_at: now() };
    const V = (o) => { const v = { ...base, id: uid(), contact_name: '', phone: '', instagram: '', estimate: null, stage: 'belum', notes: '', sort: DB.vendors.length + 1, ...o }; DB.vendors.push(v); return v.id; };
    const vVen = V({ category: 'Venue', name: 'Gedung Serbaguna Melati', contact_name: 'Pak Harun', phone: '081234560011' });
    const vCat = V({ category: 'Catering', name: 'Dapur Ibu Ratna', contact_name: 'Bu Ratna', phone: '081234500222' });
    const vMua = V({ category: 'MUA', name: 'Sanggar Rias Ayu', contact_name: 'Mbak Ayu', phone: '081234500333' });
    const vDek = V({ category: 'Dekorasi', name: 'Dekor Anggun', contact_name: 'Mas Rio', phone: '081234500444' });
    const vDoc = V({ category: 'Dokumentasi', name: 'Lens & Bloom Studio', contact_name: 'Kak Dinda', phone: '081234500555' });
    const vSou = V({ category: 'Souvenir', name: 'Souvenir Hijau', contact_name: 'Bu Ani', phone: '081234500666' });
    V({ category: 'Wedding organizer', name: 'Elegance WO', contact_name: 'Kirana', phone: '081234502210', stage: 'nego', estimate: 15000000, notes: 'Minta paket tanpa catering' });
    V({ category: 'Konsumsi', name: 'Snack Bingkisan Mbak Tia', contact_name: 'Mbak Tia', phone: '081234500777', stage: 'nego', estimate: 3600000, notes: '300 pcs · minta sample' });
    V({ category: 'Kue', name: 'Sweet Love Cakes', contact_name: 'Nadia', phone: '081234500888', estimate: 2000000 });
    V({ category: 'Hiburan', name: 'Melodi Akustik', contact_name: 'Dimas', phone: '081234500999', estimate: 3500000 });
    V({ category: 'Seragam', name: 'Batik Bu Wati', contact_name: 'Bu Wati', estimate: 6450000, notes: 'Keluarga kedua pihak · 24 orang' });
    const B = (code, o) => { const it = DB.budget_items.find(x => x.catalog_code === code); Object.assign(it, o); return it.id; };
    const P = (item, label, amount, paid, due) => DB.payments.push({ ...base, id: uid(), item_id: item, label, amount, paid_on: paid || null, due_date: due || null, method: paid ? 'Transfer' : '', proof_url: '', note: '', sort: DB.payments.length });
    let i = B('VEN-01', { vendor_id: vVen, deal: 14500000, detail: 'Gedung Serbaguna Melati', pic: 'Bagas', name: 'Sewa gedung' }); P(i, 'DP', 5000000, '2026-09-20'); P(i, 'Pelunasan', 9500000, null, '2027-05-19');
    i = B('CAT-01', { vendor_id: vCat, deal: 30000000, planned: 32000000, name: 'Catering 600 porsi', detail: 'Dapur Ibu Ratna', pic: 'Rina, Ibu', inspo_url: 'https://pinterest.com/', notes: 'Jumlah porsi ikut daftar tamu. Food tasting kedua Sabtu 24 Okt.' });
    P(i, 'DP', 7500000, '2026-10-08'); P(i, 'Termin', 10000000, null, '2027-01-15'); P(i, 'Pelunasan', 12500000, null, '2027-06-05');
    i = B('BG-03', { vendor_id: vMua, deal: 5000000, detail: 'termasuk hijab do', pic: 'Rina' }); P(i, 'DP', 1500000, null, '2026-10-28');
    B('DEC-01', { vendor_id: vDek, deal: 11000000, detail: 'tema rustic garden', pic: 'Rina' });
    i = B('DOC-01', { vendor_id: vDoc, deal: 12000000, planned: 13000000, detail: 'paket Silver', pic: 'Rina' }); P(i, 'Pelunasan', 12000000, '2026-10-02');
    i = B('SOU-01', { vendor_id: vSou, deal: 2500000 }); P(i, 'DP', 1100000, '2026-10-10');
    B('DOC-03', { deal: 1500000, pic: 'Bagas' });
    DB.budget_items.push({ ...base, id: uid(), category_id: DB.budget_categories.find(c => c.name === 'Tempat & dekorasi').id, event_id: null, vendor_id: null, name: 'Photobooth', detail: 'kalau ada sisa budget', pic: '', planned: 2500000, deal: null, is_wishlist: true, inspo_url: '', contract_url: '', notes: '', catalog_code: null, sort: 99 });
    const gcat = (n) => DB.gift_categories.find(c => c.name === n && c.list === 'seserahan').id;
    DB.gift_items.forEach(g => {
      if ([gcat('Perlengkapan ibadah'), gcat('Pakaian dalam & tidur'), gcat('Kotak hantaran')].includes(g.category_id)) Object.assign(g, { status: 'siap', actual: g.planned });
      if (['Seperangkat alat sholat', "Al-Qur'an & tafsir", 'Mahar (uang / logam mulia)', 'Kebaya / dress', 'Kain batik', 'Tas'].includes(g.name)) Object.assign(g, { status: 'siap', actual: g.planned });
      if (['Blouse', 'Gamis / outer', 'Sepatu / sandal', 'Body wash', 'Body lotion'].includes(g.name)) Object.assign(g, { status: 'dipesan', actual: g.planned - 50000 });
    });
    const G = (n, o) => Object.assign(DB.gift_items.find(x => x.name === n), o);
    G('Facial wash', { brand: 'Skintific · 5X Ceramide', actual: 145000, status: 'dipesan', shop_url: 'https://shopee.co.id' });
    G('Toner', { brand: 'Skintific', actual: 150000, status: 'dipesan' });
    G('Moisturizer', { brand: 'The Originote', actual: 95000, status: 'dipesan' });
    G('Sunscreen', { brand: 'Azarine · SPF 45', qty: 2, actual: 65000, status: 'siap' });
    G('Make up set', { brand: 'Make Over', actual: 850000, notes: 'cushion, lip, blush' });
    Object.assign(DB.gift_categories.find(c => c.name === 'Skincare & makeup'), { pic: 'Bagas', note: 'beli bundling biar hemat ongkir' });
    [['H. Ahmad Fauzi & Keluarga', 'Paman', 'pria', 'Keluarga Bagas', 'cetak', '081311110001', 4, true, 'hadir', 'VIP 1', true],
      ['Ibu Siti Rahma', 'Bude', 'wanita', 'Keluarga Rina', 'cetak', '081311110002', 2, true, 'hadir', 'VIP 2', true],
      ['Rombongan Alumni Unpad 2018', 'Teman kuliah', 'wanita', 'Teman Rina', 'digital', '081311110003', 12, true, 'belum', '', false],
      ['Tim Marketing PT Sinar', 'Rekan kerja', 'wanita', 'Kantor Rina', 'digital', '081311110004', 5, true, 'hadir', '12', false],
      ['Pak RT 05 & Ibu', 'Tetangga', 'pria', 'Lingkungan', 'cetak', '', 2, false, 'belum', '', false],
      ['Om Yusuf Sekeluarga', 'Om', 'pria', 'Keluarga Bagas', 'cetak', '081311110006', 4, true, 'tidak', '', false],
      ['Komunitas Pengajian Ibu', 'Komunitas', 'wanita', 'Ibu Rina', 'digital', '081311110007', 15, true, 'ragu', '', false],
      ['Dimas & Nadia', 'Sahabat', 'bersama', 'Teman berdua', 'digital', '081311110008', 2, true, 'hadir', '7', false],
      ['Keluarga Besar Pak Darmawan', 'Kakek', 'wanita', 'Keluarga Rina', 'cetak', '', 8, true, 'hadir', 'VIP 1', true],
      ['Tim IT PT Nusantara', 'Rekan kerja', 'pria', 'Kantor Bagas', 'digital', '081311110010', 6, false, 'belum', '', false],
      ['Bu Lurah & Suami', 'Tokoh masyarakat', 'wanita', 'Lingkungan', 'cetak', '', 2, true, 'hadir', 'VIP 3', true],
      ['Geng SMA 3', 'Teman sekolah', 'pria', 'Teman Bagas', 'digital', '081311110012', 10, true, 'belum', '', false]]
      .forEach(g => DB.guests.push({ ...base, id: uid(), name: g[0], relation: g[1], side: g[2], source: g[3], invite_type: g[4], phone: g[5], address: '', pax: g[6], sent: g[7], rsvp: g[8], table_no: g[9], is_vip: g[10], checked_in_at: null, arrived_pax: null, notes: '' }));
    [['Transfer DP rias', 'Rp1.500.000 · Sanggar Rias Ayu', '2026-10-28', 'Rina', 'tinggi'], ['Food tasting kedua', 'Catering Ibu Ratna · ajak Ibu', '2026-10-24', 'Rina', 'sedang'], ['Fitting kebaya akad ke-2', 'Butik Laras · bawa sepatu', '2027-01-22', 'Rina', 'sedang'], ['Daftar SIMKAH online', 'Siapkan scan N1–N4', '2027-02-01', 'Bagas', 'tinggi'], ['Final meeting dengan WO', 'Bawa rundown & daftar PIC', '2027-06-14', 'Bagas', 'sedang']]
      .forEach(r => DB.reminders.push({ ...base, id: uid(), title: r[0], detail: r[1], due_date: r[2], pic: r[3], priority: r[4], done: false, done_at: null }));
    const N = (l, v) => { DB.notes.find(n => n.label === l).value = v; };
    N('Kontak darurat WO', 'Kirana · 0812-3450-2210'); N('Dress code', 'Sage & dusty pink'); N('Hashtag', '#RinaBagasBersama'); N('Parkir tamu', 'Basement B1 · 120 mobil'); N('Rekening untuk amplop digital', 'BCA 1234564471 a.n. Rina Lestari');
    DB.selfprep.forEach(s => { if (['Belajar fiqh nikah', 'Sholat hajat & dzikir rutin'].includes(s.title)) s.done = true; if (s.title === 'Pertanyaan pranikah') s.progress = 12; });
    DB.documents.forEach(d => { if (['Fotokopi KTP', 'Kartu keluarga', 'Akta kelahiran'].includes(d.name)) d.status = 'lengkap'; if (d.name === 'Formulir N1–N4' && d.party === 'wanita') Object.assign(d, { status: 'lengkap', expires_on: '2027-05-02' }); if (/^Pas foto/.test(d.name)) d.status = 'proses'; });
    DB.payment_requests.push({ id: uid(), user_id: 'u-dewi', plan_id: 'premium', amount: 149000, method: 'Transfer bank', proof_url: '', note: 'dari BRI a.n. Dewi', status: 'pending', admin_note: '', created_at: new Date(Date.now() - 5400e3).toISOString() });
    DB.wedding_invites.push({ id: uid(), wedding_id: wid, email: 'ibu.rina@example.com', role: 'viewer', label: 'Ibu Sri', token: 'tok123', status: 'pending', created_at: now() });
  }
})();
