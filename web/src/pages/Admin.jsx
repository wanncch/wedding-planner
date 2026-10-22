import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, friendlyError } from '../lib/supabase.js';
import { useAuth, useToast } from '../lib/store.jsx';
import { uploadPath, openFile } from '../lib/files.js';
import { signOut } from '../lib/nav.js';
import { rp, rpShort, num, dMed, pct } from '../lib/format.js';
import { Icon, Avatar, Tile, Chips, Seg, Drawer, Modal, Field, Text, Area, Money, NumIn, DateIn, Select, Toggle, Spinner, Empty, Pill, confirm } from '../components/ui.jsx';
import { PlanBadge, StoredImg } from '../components/Account.jsx';

const TABS = [
  { key: 'ringkasan', label: 'Ringkasan', icon: 'chart' },
  { key: 'akun', label: 'Akun pelanggan', icon: 'users' },
  { key: 'pembayaran', label: 'Pembayaran', icon: 'card' },
  { key: 'paket', label: 'Paket & harga', icon: 'crown' },
  { key: 'pengaturan', label: 'Pengaturan bayar', icon: 'gear' },
];
const BULAN3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function ago(ts) {
  if (!ts) return '–';
  const m = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 2) return 'baru saja';
  if (m < 60) return m + ' menit lalu';
  const h = Math.round(m / 60);
  if (h < 24) return h + ' jam lalu';
  const d = Math.round(h / 24);
  if (d === 1) return 'kemarin';
  if (d < 14) return d + ' hari lalu';
  if (d < 60) return Math.round(d / 7) + ' minggu lalu';
  return dMed(ts);
}
const isoDay = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
function addMonths(base, n) {
  const d = base && new Date(base) > new Date() ? new Date(base) : new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}
const untilTs = (day) => (day ? new Date(day + 'T23:59:59+07:00').toISOString() : null);

async function call(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data;
}

export default function Admin({ tab: tabParam }) {
  const { account, profile, user } = useAuth();
  const toast = useToast();
  const tab = TABS.some(t => t.key === tabParam) ? tabParam : 'ringkasan';
  const [ov, setOv] = useState(null);
  const [users, setUsers] = useState(null);
  const [plans, setPlans] = useState([]);
  const [manage, setManage] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try {
      const [o, u, p] = await Promise.all([call('admin_overview'), call('admin_list_users'), supabase.from('plans').select('*').order('sort')]);
      setOv(o); setUsers(u || []); setPlans(p.data || []);
    } catch (e) { setErr(friendlyError(e)); }
  }, []);
  useEffect(() => { if (account && account.is_admin) load(); }, [account && account.is_admin, load]);

  if (!account) return <div className="auth"><Spinner label="Memuat…" /></div>;
  if (!account.is_admin) {
    return (
      <div className="auth"><div className="g authcard">
        <span className="ico"><Icon name="shield" /></span>
        <div className="h2">Khusus admin</div>
        <div className="muted">Halaman Pusat Kontrol hanya bisa dibuka akun admin.</div>
        <a className="btn" href="#/pilih">Kembali</a>
      </div></div>
    );
  }

  const pendingN = ov ? ov.pending.length : 0;
  const ctx = { ov, users, plans, reload: load, toast, setManage, me: user };

  return (
    <div className="app">
      <aside className="side dark">
        <div className="brand"><span className="logo"><Icon name="shield" size={22} /></span><div><div className="bn">Pusat Kontrol</div><div className="by">Wedding Planner</div></div></div>
        <nav className="nav" aria-label="Menu admin">
          {TABS.map(t => (
            <a key={t.key} href={'#/admin/' + t.key} className={t.key === tab ? 'on' : ''} aria-current={t.key === tab ? 'page' : undefined}>
              <Icon name={t.icon} />{t.label}{t.key === 'pembayaran' && pendingN > 0 && <span className="nb">{pendingN}</span>}
            </a>
          ))}
          <a href="#/pilih" style={{ marginTop: 10 }}><Icon name="rings" />Ke aplikasi</a>
        </nav>
        <div className="couple">
          <Avatar name={profile ? profile.display_name : 'Admin'} />
          <span style={{ minWidth: 0 }}><b className="ell" style={{ display: 'block' }}>{profile ? profile.display_name : ''}</b><button type="button" className="lnk xs" style={{ color: '#F3B3C0' }} onClick={signOut}>Admin · keluar</button></span>
        </div>
      </aside>

      <main className="main">
        <div className="mtop">
          <b style={{ fontFamily: 'var(--serif)', fontSize: 18 }}>Pusat Kontrol</b>
          <a className="btn2 sm" href="#/pilih">Ke aplikasi</a>
        </div>
        <div className="tabs show-m" style={{ alignSelf: 'flex-start' }}>
          {TABS.map(t => <a key={t.key} className={'tab' + (t.key === tab ? ' on' : '')} href={'#/admin/' + t.key} style={{ textDecoration: 'none' }}>{t.label}{t.key === 'pembayaran' && pendingN ? ' · ' + pendingN : ''}</a>)}
        </div>
        {err && <div className="note">{err} <button type="button" className="lnk" onClick={load}>Coba lagi</button></div>}
        {!ov || !users ? (err ? null : <Spinner label="Memuat data akun…" />) : (
          <>
            {tab === 'ringkasan' && <Ringkasan {...ctx} />}
            {tab === 'akun' && <Akun {...ctx} />}
            {tab === 'pembayaran' && <Pembayaran {...ctx} />}
            {tab === 'paket' && <Paket {...ctx} />}
            {tab === 'pengaturan' && <Pengaturan {...ctx} />}
          </>
        )}
      </main>

      <nav className="bnav" aria-label="Menu admin HP">
        {TABS.slice(0, 4).map(t => <a key={t.key} href={'#/admin/' + t.key} className={'bi' + (t.key === tab ? ' on' : '')}><Icon name={t.icon} size={20} />{t.label.split(' ')[0]}</a>)}
        <a href="#/admin/pengaturan" className={'bi' + (tab === 'pengaturan' ? ' on' : '')}><Icon name="gear" size={20} />Atur</a>
      </nav>

      {manage && <AccountDrawer u={manage} plans={plans} onClose={() => setManage(null)} reload={load} toast={toast} me={user} />}
    </div>
  );
}

function Head({ eyebrow, title, children }) {
  return <div className="top"><div><div className="eyb">{eyebrow}</div><h1 className="h1">{title}</h1></div>{children && <div className="row">{children}</div>}</div>;
}

function Stats({ ov }) {
  const conv = ov.premium + ov.trial + ov.expired > 0 ? pct(ov.premium, ov.premium + ov.trial + ov.expired) : 0;
  return (
    <section className="tiles">
      <Tile w="w1" icon="users" k="Total akun" v={num(ov.total)} sub={'+' + ov.new_week + ' minggu ini'} />
      <Tile w="w3" icon="crown" k="Berbayar aktif" v={num(ov.premium)} sub={conv + '% dari semua akun'} />
      <Tile w="w4" icon="clock" k="Trial berjalan" v={num(ov.trial)} sub={ov.trial_ending + ' berakhir minggu ini'} />
      <Tile w="w2" icon="wallet" k="Pendapatan bulan ini" v={rpShort(ov.revenue_month)} sub={'total ' + rpShort(ov.revenue_total)} />
    </section>
  );
}

/* ------------------------------ Ringkasan ------------------------------ */
function Ringkasan({ ov, plans, users, reload, toast, setManage }) {
  const max = Math.max(1, ...ov.monthly.map(m => m.n));
  return (
    <>
      <Head eyebrow={dMed(new Date()) + ' · semua aksi admin tercatat'} title="Ringkasan" />
      <Stats ov={ov} />
      <div className="split">
        <section className="g col wide">
          <div className="between"><div className="h2">Akun berbayar baru per bulan</div><span className="xs muted">12 bulan</span></div>
          <div className="bars" role="img" aria-label="Grafik jumlah pembayaran disetujui per bulan">
            {ov.monthly.map(m => (
              <div key={m.m} title={m.n + ' akun · ' + rp(m.rev)}>
                <span style={{ fontWeight: 700, color: 'var(--ink2)' }}>{m.n || ''}</span>
                <i style={{ height: Math.max(3, (m.n / max) * 90) + '%' }} />
                <span>{BULAN3[Number(m.m.slice(5)) - 1]}</span>
              </div>
            ))}
          </div>
          <div className="row xs muted" style={{ gap: 16 }}><span>Kedaluwarsa: <b>{ov.expired}</b></span><span>Diblokir: <b>{ov.blocked}</b></span><span>Pernikahan dibuat: <b>{ov.weddings}</b></span></div>
        </section>
        <div className="narrow">
          <PendingList ov={ov} reload={reload} toast={toast} users={users} setManage={setManage} />
          <section className="g col">
            <div className="between"><div className="h2">Paket &amp; harga</div><a className="lnk" href="#/admin/paket">Ubah</a></div>
            {plans.map(p => (
              <div key={p.id} className="li"><span className="grow"><b>{p.name}</b><span className="xs muted" style={{ display: 'block' }}>{p.description}</span></span><b>{p.price ? rp(p.price) : 'Gratis'}</b></div>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}

function PendingList({ ov, reload, toast, users, setManage, full }) {
  const [busy, setBusy] = useState(null);
  async function decide(p, ok) {
    let note = '';
    if (!ok) {
      note = window.prompt('Alasan menolak (dikirim ke pelanggan di halaman upgrade):', 'Nominal / bukti belum sesuai') ;
      if (note === null) return;
    } else if (!(await confirm({ title: 'Setujui pembayaran?', text: (p.name || p.email) + ' · ' + rp(p.amount) + '. Paket ' + p.plan_id + ' langsung aktif.', ok: 'Setujui' }))) return;
    setBusy(p.id);
    try { await call('admin_decide_payment', { p_id: p.id, p_approve: ok, p_note: note }); toast(ok ? 'Disetujui. Akun sudah aktif.' : 'Pembayaran ditolak.', 'ok'); await reload(); }
    catch (e) { toast(friendlyError(e), 'error'); } finally { setBusy(null); }
  }
  return (
    <section className="g col">
      <div className="between"><div className="h2">Menunggu konfirmasi</div><Pill cls={ov.pending.length ? 'p-wait' : 'p-ok'}>{ov.pending.length}</Pill></div>
      {!ov.pending.length ? <div className="xs muted">Tidak ada pembayaran yang menunggu.</div> : ov.pending.map(p => {
        const u = users.find(x => x.id === p.user_id);
        return (
          <div key={p.id} className="li" style={{ alignItems: 'flex-start' }}>
            <Avatar name={p.name || p.email} size={32} />
            <div className="grow">
              <button type="button" className="lnk" style={{ color: 'var(--ink)', fontSize: 13.5 }} onClick={() => u && setManage(u)}>{p.name || p.email}</button>
              <div className="xs muted">{rp(p.amount)} · {p.method || '–'} · {ago(p.created_at)}{full ? ' · ' + p.email : ''}</div>
              {p.note && <div className="xs" style={{ marginTop: 2 }}>“{p.note}”</div>}
              <div className="row" style={{ gap: 6, marginTop: 6 }}>
                {p.proof_url && <button type="button" className="btn2 sm" onClick={() => openFile(p.proof_url)}><Icon name="eye" size={14} />Lihat bukti</button>}
                <button type="button" className="btn3 sm" disabled={busy === p.id} onClick={() => decide(p, true)}><Icon name="check" size={14} />Setujui</button>
                <button type="button" className="btn2 sm" disabled={busy === p.id} onClick={() => decide(p, false)}>Tolak</button>
              </div>
            </div>
          </div>
        );
      })}
      <div className="xs muted">Pelanggan upload bukti dari aplikasi → kamu setujui → paket aktif otomatis.</div>
    </section>
  );
}

/* ------------------------------ Akun ------------------------------ */
function stateOf(u) {
  if (u.status === 'blocked') return 'blocked';
  if (!u.active) return 'expired';
  return u.status === 'trial' ? 'trial' : 'premium';
}
function untilLabel(u) {
  if (u.status === 'blocked') return '–';
  if (!u.valid_until) return u.status === 'active' ? 'tanpa batas' : '–';
  const d = Math.ceil((new Date(u.valid_until) - Date.now()) / 86400000);
  if (d < 0) return 'habis ' + dMed(u.valid_until);
  if (u.status === 'trial') return 'sisa ' + d + ' hari';
  return dMed(u.valid_until);
}

function Akun({ ov, users, plans, setManage, reload, toast }) {
  const [qs, setQs] = useState('');
  const [f, setF] = useState('all');
  const [give, setGive] = useState(false);
  const counts = useMemo(() => {
    const c = { all: users.length, premium: 0, trial: 0, expired: 0, blocked: 0 };
    users.forEach(u => { c[stateOf(u)] += 1; });
    return c;
  }, [users]);
  const rows = users.filter(u => (f === 'all' || stateOf(u) === f) && (!qs || (u.name + ' ' + u.email).toLowerCase().includes(qs.toLowerCase())));

  async function exportXlsx() {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(users.map(u => ({
      Nama: u.name, Email: u.email, Paket: u.plan_id, Status: u.status, Aktif: u.active ? 'ya' : 'tidak',
      'Berlaku sampai': u.valid_until ? isoDay(u.valid_until) : '', Pernikahan: u.weddings, Daftar: isoDay(u.created_at),
      'Terakhir masuk': u.last_sign_in_at ? isoDay(u.last_sign_in_at) : '', Catatan: u.note || '',
    }))), 'Akun');
    XLSX.writeFile(wb, 'akun-wedding-planner-' + isoDay(new Date()) + '.xlsx');
  }

  return (
    <>
      <Head eyebrow="Hanya bisa dibuka akun admin · semua aksi tercatat" title="Akun pelanggan">
        <button type="button" className="btn2" onClick={exportXlsx}><Icon name="download" size={15} />Ekspor Excel</button>
        <button type="button" className="btn" onClick={() => setGive(true)}><Icon name="plus" size={15} />Beri akses manual</button>
      </Head>
      <Stats ov={ov} />
      <section className="g col">
        <div className="row">
          <label className="search"><Icon name="search" size={16} /><input value={qs} onChange={(e) => setQs(e.target.value)} placeholder="Cari nama, email…" aria-label="Cari akun" /></label>
          <Chips value={f} onChange={setF} items={[
            { key: 'all', label: 'Semua · ' + counts.all }, { key: 'premium', label: 'Berbayar · ' + counts.premium }, { key: 'trial', label: 'Trial · ' + counts.trial },
            { key: 'expired', label: 'Kedaluwarsa · ' + counts.expired }, { key: 'blocked', label: 'Diblokir · ' + counts.blocked }]} />
        </div>
        {!rows.length ? <Empty icon="users" title="Tidak ada akun" text="Coba kata kunci atau filter lain." /> : (
          <div className="tw">
            <table className="t stack">
              <thead><tr><th className="mhide" /><th>Akun</th><th>Paket</th><th>Berlaku</th><th className="n">Pernikahan</th><th>Terakhir aktif</th><th /></tr></thead>
              <tbody>
                {rows.map(u => (
                  <tr key={u.id} className="click" onClick={() => setManage(u)}>
                    <td className="mhide" style={{ width: 34 }}><Avatar name={u.name || u.email} size={30} /></td>
                    <td style={{ minWidth: 180 }}><b>{u.name || u.email.split('@')[0]}{u.is_admin ? ' · admin' : ''}</b><span className="cell-sub ell">{u.email}</span></td>
                    <td><PlanBadge a={{ ...u, plan_id: u.plan_id }} /></td>
                    <td className="nw mhide">{untilLabel(u)}</td>
                    <td className="n mhide">{u.weddings}{u.joined ? <span className="xs muted"> +{u.joined}</span> : ''}</td>
                    <td className="nw mhide xs muted">{ago(u.last_sign_in_at)}</td>
                    <td className="n"><button type="button" className="btn2 sm" onClick={(e) => { e.stopPropagation(); setManage(u); }}>Kelola</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {give && <GiveAccess users={users} plans={plans} onClose={() => setGive(false)} reload={reload} toast={toast} onPick={(u) => { setGive(false); setManage(u); }} />}
    </>
  );
}

function GiveAccess({ users, onClose, onPick }) {
  const [q, setQ] = useState('');
  const hits = q.length < 2 ? [] : users.filter(u => (u.name + ' ' + u.email).toLowerCase().includes(q.toLowerCase())).slice(0, 6);
  return (
    <Modal open onClose={onClose} title="Beri akses manual">
      <div className="xs muted">Pelanggan perlu daftar dulu di aplikasi. Cari emailnya, lalu atur paket &amp; masa berlaku.</div>
      <Field label="Email atau nama"><Text value={q} onChange={setQ} placeholder="mis. mega@gmail.com" autoFocus /></Field>
      {hits.map(u => (
        <button type="button" key={u.id} className="wscard" onClick={() => onPick(u)}>
          <Avatar name={u.name || u.email} size={32} /><span style={{ flex: 1, minWidth: 0 }}><b>{u.name || u.email}</b><span className="xs muted" style={{ display: 'block' }}>{u.email}</span></span><PlanBadge a={u} />
        </button>
      ))}
      {q.length >= 2 && !hits.length && <div className="note">Belum ada akun dengan email itu. Minta pelanggan daftar dulu di halaman utama aplikasi.</div>}
    </Modal>
  );
}

function AccountDrawer({ u, plans, onClose, reload, toast, me }) {
  const [det, setDet] = useState(null);
  const [f, setF] = useState({ plan_id: u.plan_id || 'trial', status: u.status || 'trial', until: isoDay(u.valid_until), note: u.note || '' });
  const [pay, setPay] = useState(null);
  const [busy, setBusy] = useState(false);
  const isSelf = me && me.id === u.id;
  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }));

  useEffect(() => { call('admin_user_detail', { p_user: u.id }).then(setDet).catch(e => toast(friendlyError(e), 'error')); }, [u.id]);

  const access = f.status === 'blocked' ? 'blocked' : f.status === 'expired' ? 'off' : f.status === 'trial' ? 'trial' : 'paid';
  function setAccess(k) {
    if (k === 'trial') setF(x => ({ ...x, status: 'trial', plan_id: 'trial', until: x.until || isoDay(new Date(Date.now() + 14 * 86400000)) }));
    else if (k === 'paid') setF(x => ({ ...x, status: 'active', plan_id: x.plan_id === 'trial' ? 'premium' : x.plan_id }));
    else if (k === 'off') setF(x => ({ ...x, status: 'expired' }));
  }

  async function saveSub(extra = {}) {
    const v = { ...f, ...extra };
    setBusy(true);
    try {
      await call('admin_set_subscription', { p_user: u.id, p_plan: v.plan_id, p_status: v.status, p_until: untilTs(v.until), p_note: v.note });
      toast('Akses akun disimpan.', 'ok'); await reload(); onClose();
    } catch (e) { toast(friendlyError(e), 'error'); } finally { setBusy(false); }
  }
  async function block() {
    const on = f.status !== 'blocked';
    if (!(await confirm({ title: on ? 'Blokir akun?' : 'Buka blokir?', text: on ? u.email + ' tidak bisa masuk lagi sampai blokir dibuka. Data tetap tersimpan.' : u.email + ' bisa masuk lagi. Akses diatur ke Kedaluwarsa, ubah paketnya bila perlu.', ok: on ? 'Blokir' : 'Buka blokir', danger: on }))) return;
    await saveSub({ status: on ? 'blocked' : 'expired' });
  }
  async function remove() {
    const own = det ? det.weddings.filter(w => w.role === 'owner').length : u.weddings;
    if (!(await confirm({ title: 'Hapus akun & data?', text: u.email + ' akan dihapus permanen, termasuk ' + own + ' pernikahan miliknya beserta semua isinya. Tidak bisa dibatalkan.', ok: 'Hapus permanen', danger: true }))) return;
    setBusy(true);
    try { await call('admin_delete_user', { p_user: u.id }); toast('Akun dihapus.', 'ok'); await reload(); onClose(); }
    catch (e) { toast(friendlyError(e), 'error'); } finally { setBusy(false); }
  }
  async function reset() {
    const { error } = await supabase.auth.resetPasswordForEmail(u.email, { redirectTo: window.location.origin + '/' });
    toast(error ? friendlyError(error) : 'Link reset sandi dikirim ke ' + u.email, error ? 'error' : 'ok');
  }
  async function savePay() {
    if (!pay.amount) { toast('Isi nominal.', 'error'); return; }
    setBusy(true);
    try {
      await call('admin_record_payment', { p_user: u.id, p_plan: pay.plan_id, p_amount: pay.amount, p_method: pay.method, p_note: pay.note, p_until: untilTs(pay.until) });
      toast('Pembayaran dicatat & akses aktif.', 'ok'); await reload(); onClose();
    } catch (e) { toast(friendlyError(e), 'error'); } finally { setBusy(false); }
  }
  function startPay() {
    const p = plans.find(x => x.id === (f.plan_id === 'trial' ? 'premium' : f.plan_id)) || plans.find(x => x.price > 0) || {};
    const wd = det && det.weddings.length ? det.weddings.map(w => w.date).sort().pop() : null;
    const until = p.duration_days ? addMonths(null, Math.round(p.duration_days / 30)) : wd ? isoDay(new Date(new Date(wd).getTime() + 30 * 86400000)) : '';
    setPay({ plan_id: p.id, amount: p.price || 0, method: 'Transfer', note: '', until });
  }

  return (
    <Drawer open onClose={onClose} eyebrow={u.email + ' · daftar ' + dMed(u.created_at)} title={u.name || u.email.split('@')[0]}
      footer={<><button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn" disabled={busy} onClick={() => saveSub()}>Simpan perubahan</button></>}>
      <div className="g col" style={{ padding: 14, background: 'rgba(255,255,255,.7)' }}>
        <div className="between"><span className="lbl">Paket</span><PlanBadge a={u} /></div>
        <Field label="Ubah akses">
          <Seg value={access} onChange={setAccess} items={[{ key: 'trial', label: 'Trial' }, { key: 'paid', label: 'Berbayar', cls: 's-ok' }, { key: 'off', label: 'Nonaktif', cls: 's-wait' }]} disabled={f.status === 'blocked'} />
        </Field>
        {access === 'paid' && <Field label="Paket"><Select value={f.plan_id} onChange={set('plan_id')} options={plans.filter(p => p.id !== 'trial').map(p => ({ value: p.id, label: p.name + ' · max ' + p.max_weddings + ' pernikahan' }))} /></Field>}
        <Field label="Berlaku sampai" hint="kosong = tanpa batas"><DateIn value={f.until} onChange={set('until')} /></Field>
        <div className="row" style={{ gap: 6 }}><span className="xs muted">Perpanjang cepat</span>
          {[[1, '+1 bln'], [6, '+6 bln'], [12, '+1 thn']].map(([n, l]) => <button type="button" key={n} className="chip" onClick={() => setF(x => ({ ...x, until: addMonths(x.until, n), status: x.status === 'expired' ? (x.plan_id === 'trial' ? 'trial' : 'active') : x.status }))}>{l}</button>)}
        </div>
      </div>

      <div className="col" style={{ gap: 6 }}>
        <div className="between"><span className="lbl">Riwayat pembayaran</span>{!pay && <button type="button" className="lnk" onClick={startPay}>+ Catat pembayaran</button>}</div>
        {pay && (
          <div className="g col" style={{ padding: 14 }}>
            <div className="g2">
              <Field label="Paket"><Select value={pay.plan_id} onChange={(v) => { const p = plans.find(x => x.id === v); setPay(x => ({ ...x, plan_id: v, amount: p ? p.price : x.amount })); }} options={plans.filter(p => p.id !== 'trial').map(p => ({ value: p.id, label: p.name }))} /></Field>
              <Field label="Nominal"><Money value={pay.amount} onChange={(v) => setPay(x => ({ ...x, amount: v }))} /></Field>
            </div>
            <div className="g2">
              <Field label="Metode"><Select value={pay.method} onChange={(v) => setPay(x => ({ ...x, method: v }))} options={['Transfer', 'QRIS', 'Tunai', 'E-wallet']} /></Field>
              <Field label="Aktif sampai"><DateIn value={pay.until} onChange={(v) => setPay(x => ({ ...x, until: v }))} /></Field>
            </div>
            <Field label="Catatan"><Text value={pay.note} onChange={(v) => setPay(x => ({ ...x, note: v }))} placeholder="mis. transfer BCA a.n. …" /></Field>
            <div className="row" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn2 sm" onClick={() => setPay(null)}>Batal</button><button type="button" className="btn3 sm" disabled={busy} onClick={savePay}>Simpan &amp; aktifkan</button></div>
          </div>
        )}
        {!det ? <Spinner /> : !det.payments.length ? <div className="xs muted">Belum ada pembayaran.</div> : det.payments.map(p => (
          <div key={p.id} className="pay">
            <span className={'dotc' + (p.status === 'approved' ? ' on' : '')} />
            <div style={{ flex: 1, minWidth: 0 }}><b>{rp(p.amount)} · {(plans.find(x => x.id === p.plan_id) || {}).name || p.plan_id}</b>
              <div className="xs muted">{dMed(p.created_at)} · {p.method || 'manual'}{p.proof_url ? ' · ' : ''}{p.proof_url && <button type="button" className="lnk xs" onClick={() => openFile(p.proof_url)}>bukti</button>}{p.admin_note ? ' · ' + p.admin_note : ''}</div></div>
            <Pill cls={p.status === 'approved' ? 'p-ok' : p.status === 'rejected' ? 'p-bad' : 'p-wait'}>{p.status === 'approved' ? 'Lunas' : p.status === 'rejected' ? 'Ditolak' : 'Dicek'}</Pill>
          </div>
        ))}
      </div>

      <div className="col" style={{ gap: 6 }}>
        <span className="lbl">Pernikahan milik akun ini</span>
        {!det ? null : !det.weddings.length ? <div className="xs muted">Belum membuat pernikahan.</div> : det.weddings.map(w => (
          <div key={w.id} className="li"><span className="ico"><Icon name="rings" size={18} /></span>
            <span className="grow"><b>{w.couple}</b><span className="xs muted" style={{ display: 'block' }}>{dMed(w.date)} · {w.role === 'owner' ? 'pemilik' : w.role} · {w.members} anggota · {w.tasks} tugas · {w.gifts} seserahan · {w.guests} tamu</span></span></div>
        ))}
        <div className="xs muted">Isi detail pernikahan pelanggan tidak ditampilkan di sini (privasi).</div>
      </div>

      <Field label="Catatan admin"><Area value={f.note} onChange={set('note')} rows={2} placeholder="mis. bayar via QRIS, minta invoice" /></Field>

      {det && det.log.length > 0 && (
        <div className="col" style={{ gap: 4 }}>
          <span className="lbl">Log admin</span>
          {det.log.slice(0, 6).map((l, i) => <div key={i} className="xs muted">{dMed(l.at)} · {l.action}</div>)}
        </div>
      )}

      <div className="col" style={{ gap: 8 }}>
        <span className="lbl">Tindakan akun</span>
        <div className="row">
          <button type="button" className="btn2 sm" onClick={reset}><Icon name="mail" size={14} />Kirim link reset sandi</button>
          {!isSelf && <button type="button" className="btn2 sm" onClick={block}><Icon name="ban" size={14} />{f.status === 'blocked' ? 'Buka blokir' : 'Blokir login'}</button>}
          {!isSelf && <button type="button" className="btn danger sm" onClick={remove}><Icon name="trash" size={14} />Hapus akun &amp; data</button>}
        </div>
      </div>
    </Drawer>
  );
}

/* ------------------------------ Pembayaran ------------------------------ */
function Pembayaran({ ov, users, plans, reload, toast, setManage }) {
  const [all, setAll] = useState(null);
  const [f, setF] = useState('pending');
  useEffect(() => { supabase.from('payment_requests').select('*').order('created_at', { ascending: false }).limit(500).then(({ data }) => setAll(data || [])); }, [ov]);
  const byId = Object.fromEntries(users.map(u => [u.id, u]));
  const rows = (all || []).filter(p => f === 'all' || p.status === f);
  return (
    <>
      <Head eyebrow="Bukti transfer & QRIS dari pelanggan" title="Pembayaran" />
      {f === 'pending' && <PendingList ov={ov} reload={reload} toast={toast} users={users} setManage={setManage} full />}
      <section className="g col">
        <Chips value={f} onChange={setF} items={[{ key: 'pending', label: 'Menunggu' }, { key: 'approved', label: 'Disetujui' }, { key: 'rejected', label: 'Ditolak' }, { key: 'all', label: 'Semua' }]} />
        {!all ? <Spinner /> : !rows.length ? <Empty icon="card" title="Belum ada data" /> : (
          <div className="tw">
            <table className="t stack">
              <thead><tr><th>Tanggal</th><th>Akun</th><th>Paket</th><th className="n">Nominal</th><th>Metode</th><th>Status</th><th /></tr></thead>
              <tbody>
                {rows.map(p => {
                  const u = byId[p.user_id] || {};
                  return (
                    <tr key={p.id} className="click" onClick={() => byId[p.user_id] && setManage(byId[p.user_id])}>
                      <td className="nw mhide">{dMed(p.created_at)}</td>
                      <td style={{ minWidth: 160 }}><b>{u.name || u.email || '(akun dihapus)'}</b><span className="cell-sub ell">{u.email}{p.note ? ' · ' + p.note : ''}</span></td>
                      <td className="mhide">{(plans.find(x => x.id === p.plan_id) || {}).name || p.plan_id}</td>
                      <td className="n">{num(p.amount)}</td>
                      <td className="mhide">{p.method || 'manual'}</td>
                      <td><Pill cls={p.status === 'approved' ? 'p-ok' : p.status === 'rejected' ? 'p-bad' : 'p-wait'}>{p.status === 'approved' ? 'Disetujui' : p.status === 'rejected' ? 'Ditolak' : 'Menunggu'}</Pill></td>
                      <td className="mhide" onClick={(e) => e.stopPropagation()}>{p.proof_url && <button type="button" className="lnk xs" onClick={() => openFile(p.proof_url)}>bukti</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr><td className="mhide" /><td>Total disetujui</td><td className="mhide" /><td className="n">{num(rows.filter(p => p.status === 'approved').reduce((s, p) => s + Number(p.amount), 0))}</td><td colSpan={3} className="mhide" /></tr></tfoot>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

/* ------------------------------ Paket ------------------------------ */
function Paket({ plans, reload, toast }) {
  const [edit, setEdit] = useState(null);
  return (
    <>
      <Head eyebrow="Harga yang tampil di halaman upgrade pelanggan" title="Paket & harga">
        <button type="button" className="btn" onClick={() => setEdit({ _new: true, id: '', name: '', price: 0, duration_days: null, max_weddings: 1, description: '', is_active: true, sort: plans.length + 1 })}><Icon name="plus" size={15} />Paket</button>
      </Head>
      <div className="grid3">
        {plans.map((p, i) => (
          <section key={p.id} className={'tile ' + ['w4', 'w1', 'w3', 'w2'][i % 4]} style={{ opacity: p.is_active ? 1 : .6 }}>
            <span className="bdg"><Icon name={p.id === 'trial' ? 'clock' : 'crown'} size={20} /></span>
            <div className="tb">
              <div className="k">{p.name}{!p.is_active ? ' · nonaktif' : ''}</div>
              <div className="v">{p.price ? rp(p.price) : 'Gratis'}</div>
              <div className="xs ts">{p.description}</div>
              <div className="xs ts">{p.duration_days ? p.duration_days + ' hari' : p.id === 'premium' ? 'sampai hari H + 30 hari' : 'tanpa batas'} · max {p.max_weddings} pernikahan</div>
              <button type="button" className="btn2 sm" style={{ alignSelf: 'flex-start', marginTop: 8 }} onClick={() => setEdit(p)}><Icon name="edit" size={14} />Ubah</button>
            </div>
          </section>
        ))}
      </div>
      <div className="note">Paket <b>Premium</b> tanpa durasi otomatis berlaku sampai hari H + 30 hari setelah pembayaran disetujui. Paket <b>Trial</b> berlaku untuk akun baru.</div>
      {edit && <PlanModal p={edit} onClose={() => setEdit(null)} reload={reload} toast={toast} />}
    </>
  );
}

function PlanModal({ p, onClose, reload, toast }) {
  const [f, setF] = useState(p);
  const [err, setErr] = useState('');
  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }));
  async function submit() {
    if (!f.name.trim()) { setErr('Isi nama paket.'); return; }
    const row = { name: f.name.trim(), price: f.price || 0, duration_days: f.duration_days || null, max_weddings: f.max_weddings || 1, description: f.description, is_active: f.is_active, sort: f.sort };
    let res;
    if (p._new) {
      const id = (f.id || f.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
      if (!id) { setErr('Isi kode paket.'); return; }
      res = await supabase.from('plans').insert({ id, ...row });
    } else res = await supabase.from('plans').update(row).eq('id', p.id);
    if (res.error) { setErr(friendlyError(res.error)); return; }
    toast('Paket disimpan.', 'ok'); onClose(); reload();
  }
  return (
    <Modal open onClose={onClose} title={p._new ? 'Paket baru' : 'Ubah paket ' + p.name}
      footer={<><button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn" onClick={submit}>Simpan</button></>}>
      <Field label="Nama paket" error={err}><Text value={f.name} onChange={set('name')} placeholder="mis. Premium" /></Field>
      <div className="g2">
        <Field label="Harga"><Money value={f.price} onChange={set('price')} /></Field>
        <Field label="Durasi" hint="hari, kosong = sampai hari H"><NumIn value={f.duration_days} onChange={set('duration_days')} min={1} placeholder="mis. 365" /></Field>
      </div>
      <Field label="Maks. pernikahan"><NumIn value={f.max_weddings} onChange={set('max_weddings')} min={1} /></Field>
      <Field label="Keterangan"><Text value={f.description} onChange={set('description')} placeholder="mis. 1 pernikahan · sampai hari H + 30 hari" /></Field>
      <div className="row nowrap" style={{ gap: 12 }}><Toggle on={f.is_active} onChange={set('is_active')} /><span className="sm"><b>Tampil di halaman upgrade</b></span></div>
    </Modal>
  );
}

/* ------------------------------ Pengaturan ------------------------------ */
function Pengaturan({ toast }) {
  const [st, setSt] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { supabase.from('app_settings').select('*').then(({ data }) => setSt(Object.fromEntries((data || []).map(r => [r.key, r.value])))); }, []);
  const set = (k) => (v) => setSt(x => ({ ...x, [k]: v }));
  async function upQris(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setBusy(true);
    try { const ref = await uploadPath('public', file); setSt(x => ({ ...x, qris_url: ref })); toast('Gambar QRIS diunggah. Jangan lupa Simpan.', 'ok'); }
    catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  }
  async function save() {
    setBusy(true);
    const rows = ['pay_instructions', 'bank_accounts', 'qris_url', 'contact_wa'].map(key => ({ key, value: st[key] || '' }));
    const { error } = await supabase.from('app_settings').upsert(rows);
    setBusy(false);
    toast(error ? friendlyError(error) : 'Pengaturan pembayaran disimpan.', error ? 'error' : 'ok');
  }
  if (!st) return <Spinner />;
  return (
    <>
      <Head eyebrow="Tampil di halaman upgrade pelanggan" title="Pengaturan bayar">
        <button type="button" className="btn" disabled={busy} onClick={save}>Simpan</button>
      </Head>
      <div className="grid2">
        <section className="g col">
          <div className="h2">QRIS</div>
          {st.qris_url ? <StoredImg src={st.qris_url} alt="QRIS" className="qr" /> : <div className="xs muted">Belum ada gambar QRIS.</div>}
          <div className="row">
            <label className="btn2 sm" style={{ cursor: 'pointer' }}><Icon name="upload" size={14} />{st.qris_url ? 'Ganti gambar' : 'Upload gambar QRIS'}<input type="file" accept="image/*" onChange={upQris} style={{ display: 'none' }} /></label>
            {st.qris_url && <button type="button" className="lnk" onClick={() => set('qris_url')('')}>Hapus</button>}
          </div>
        </section>
        <section className="g col">
          <Field label="Rekening transfer" hint="satu per baris"><Area value={st.bank_accounts} onChange={set('bank_accounts')} rows={4} placeholder={'BCA 1234567890 a.n. Wanncch\nBRI 0987654321 a.n. Wanncch'} /></Field>
          <Field label="Petunjuk bayar"><Area value={st.pay_instructions} onChange={set('pay_instructions')} rows={3} /></Field>
          <Field label="Nomor WA admin" hint="untuk tombol tanya admin"><Text value={st.contact_wa} onChange={set('contact_wa')} placeholder="08…" inputMode="tel" /></Field>
        </section>
      </div>
    </>
  );
}
