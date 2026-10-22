import React, { useEffect, useState } from 'react';
import { supabase, friendlyError } from '../lib/supabase.js';
import { useAuth, useToast } from '../lib/store.jsx';
import { go, signOut } from '../lib/nav.js';
import { dLong, daysBetween, today, dMed } from '../lib/format.js';
import { AccountBanner, PlanBadge } from '../components/Account.jsx';
import { Icon, Field, Text, DateIn, TimeIn, Money, NumIn, Seg, Spinner, Avatar, Pill } from '../components/ui.jsx';

const ROLE = { owner: 'Pemilik', editor: 'Bisa edit', viewer: 'Lihat saja' };

export default function Workspaces({ create }) {
  const { user, profile, account } = useAuth();
  const locked = account && !account.active && !account.is_admin;
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [showForm, setShowForm] = useState(!!create);

  useEffect(() => {
    let alive = true;
    supabase.from('wedding_members').select('role, wedding:weddings(id,bride_name,groom_name,wedding_date,city)').eq('user_id', user.id)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) { setErr(friendlyError(error)); setList([]); return; }
        const rows = (data || []).filter(r => r.wedding).sort((a, b) => String(a.wedding.wedding_date).localeCompare(String(b.wedding.wedding_date)));
        setList(rows);
        if (!rows.length) setShowForm(true);
      });
    return () => { alive = false; };
  }, [user.id]);

  return (
    <div className="auth" style={{ alignItems: 'start', paddingTop: 40 }}>
      <div style={{ width: '100%', maxWidth: 640, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="between">
          <div className="brand" style={{ padding: 0 }}>
            <span className="logo"><Icon name="rings" size={22} /></span>
            <div><div className="bn">Wedding Planner</div><div className="by">by Wanncch</div></div>
          </div>
          <div className="row">
            <span className="sm muted">Halo, <b>{profile ? profile.display_name : ''}</b></span>
            {account && !account.unknown && (account.is_admin ? <a className="btn2 sm" href="#/admin"><Icon name="shield" size={15} />Pusat Kontrol</a> : <a href="#/upgrade" style={{ textDecoration: 'none' }}><PlanBadge a={account} /></a>)}
            <button type="button" className="btn2 sm" onClick={signOut}><Icon name="logout" size={15} />Keluar</button>
          </div>
        </div>

        <AccountBanner />
        {!showForm && (
          <div className="g col">
            <div className="between"><div className="h2">Pilih pernikahan</div><button type="button" className="btn sm" onClick={() => setShowForm(true)}><Icon name="plus" size={15} />Pernikahan baru</button></div>
            {list === null ? <Spinner /> : list.map(r => {
              const d = daysBetween(today(), r.wedding.wedding_date);
              return (
                <button type="button" key={r.wedding.id} className="wscard" onClick={() => go('w/' + r.wedding.id + '/beranda')}>
                  <span className="avs"><Avatar name={r.wedding.bride_name} size={38} /><Avatar name={r.wedding.groom_name} size={38} /></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontFamily: 'var(--serif)', fontSize: 18 }}>{r.wedding.bride_name} &amp; {r.wedding.groom_name}</b>
                    <span className="xs muted" style={{ display: 'block' }}>{dLong(r.wedding.wedding_date)}{r.wedding.city ? ' · ' + r.wedding.city : ''}</span>
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <Pill cls={r.role === 'owner' ? 'p-rose' : r.role === 'editor' ? 'p-ok' : 'p-no'}>{ROLE[r.role]}</Pill>
                    <span className="xs muted" style={{ display: 'block', marginTop: 4 }}>{d >= 0 ? d + ' hari lagi' : 'Sudah menikah'}</span>
                  </span>
                </button>
              );
            })}
            {err && <div className="note">{err}</div>}
            <div className="xs muted">Diundang pasangan? Buka link undangan yang dikirim lewat WA/email. Pernikahan akan muncul di sini.</div>
          </div>
        )}
        {showForm && (locked ? (
          <div className="g col" style={{ alignItems: 'flex-start' }}>
            <span className="ico"><Icon name="lock" /></span>
            <div className="h2">Upgrade dulu untuk membuat pernikahan baru</div>
            <div className="muted">Masa trial atau langgananmu sudah habis. Pernikahan yang sudah ada tetap bisa dibuka (hanya lihat).</div>
            <div className="row"><a className="btn" href="#/upgrade"><Icon name="crown" size={15} />Lihat paket</a>{list && list.length > 0 && <button type="button" className="btn2" onClick={() => setShowForm(false)}>Kembali</button>}</div>
          </div>
        ) : <CreateWedding onCancel={list && list.length ? () => setShowForm(false) : null} />)}
      </div>
    </div>
  );
}

function CreateWedding({ onCancel }) {
  const toast = useToast();
  const [f, setF] = useState({
    my_label: 'bride', bride_name: '', groom_name: '', wedding_date: '', lamaran_date: '',
    akad_time: '08:00', akad_location: '', resepsi_time: '11:00', resepsi_location: '', city: '',
    religion: 'islam', scale: 'm', total_budget: null, target_invites: 300,
  });
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState({});
  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    const er = {};
    if (!f.bride_name.trim()) er.bride_name = 'Wajib diisi';
    if (!f.groom_name.trim()) er.groom_name = 'Wajib diisi';
    if (!f.wedding_date) er.wedding_date = 'Wajib diisi';
    if (f.lamaran_date && f.wedding_date && f.lamaran_date >= f.wedding_date) er.lamaran_date = 'Harus sebelum tanggal nikah';
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const label = { bride: 'Pengantin wanita', groom: 'Pengantin pria', family: 'Keluarga', wo: 'WO' }[f.my_label];
      const payload = { ...f, my_label: label, total_budget: f.total_budget || 0, target_invites: f.target_invites || 0 };
      const { data, error } = await supabase.rpc('create_wedding', { p: payload });
      if (error) throw error;
      toast('Pernikahan dibuat. Daftar tugas, anggaran, dan seserahan sudah terisi contoh.', 'ok');
      go('w/' + data + '/beranda');
    } catch (e2) {
      toast(friendlyError(e2), 'error');
    } finally { setBusy(false); }
  }

  const scaleInfo = { s: 'Acara di rumah / gedung kecil, harga hemat', m: 'Gedung, WO, harga standar', p: 'Ballroom, vendor premium' }[f.scale];
  return (
    <form className="g col" onSubmit={submit} noValidate style={{ gap: 16 }}>
      <div>
        <div className="h1" style={{ fontSize: 26 }}>Pernikahan baru</div>
        <div className="muted" style={{ marginTop: 4 }}>Isi seperlunya dulu. Semua bisa diubah nanti di Pengaturan.</div>
      </div>
      <Field label="Aku di pernikahan ini sebagai">
        <Seg value={f.my_label} onChange={set('my_label')} items={[{ key: 'bride', label: 'Pengantin wanita' }, { key: 'groom', label: 'Pengantin pria' }, { key: 'family', label: 'Keluarga' }, { key: 'wo', label: 'WO' }]} />
      </Field>
      <div className="g2">
        <Field label="Nama pengantin wanita" error={errs.bride_name}><Text value={f.bride_name} onChange={set('bride_name')} placeholder="mis. Rina" /></Field>
        <Field label="Nama pengantin pria" error={errs.groom_name}><Text value={f.groom_name} onChange={set('groom_name')} placeholder="mis. Bagas" /></Field>
      </div>
      <div className="g2">
        <Field label="Tanggal akad & resepsi" error={errs.wedding_date}><DateIn value={f.wedding_date} onChange={set('wedding_date')} min={new Date().toISOString().slice(0, 10)} /></Field>
        <Field label="Tanggal lamaran" hint="opsional" error={errs.lamaran_date}><DateIn value={f.lamaran_date} onChange={set('lamaran_date')} /></Field>
      </div>
      <div className="g2">
        <Field label="Jam akad"><TimeIn value={f.akad_time} onChange={set('akad_time')} /></Field>
        <Field label="Lokasi akad"><Text value={f.akad_location} onChange={set('akad_location')} placeholder="mis. Masjid Al-Ikhlas" /></Field>
        <Field label="Jam resepsi"><TimeIn value={f.resepsi_time} onChange={set('resepsi_time')} /></Field>
        <Field label="Lokasi resepsi"><Text value={f.resepsi_location} onChange={set('resepsi_location')} placeholder="mis. Gedung Melati" /></Field>
      </div>
      <Field label="Alur pencatatan nikah">
        <Seg value={f.religion} onChange={set('religion')} items={[{ key: 'islam', label: 'Islam · KUA' }, { key: 'lainnya', label: 'Agama lain · catatan sipil' }]} />
      </Field>
      <Field label="Skala acara" hint={scaleInfo}>
        <Seg value={f.scale} onChange={set('scale')} items={[{ key: 's', label: 'Sederhana' }, { key: 'm', label: 'Menengah' }, { key: 'p', label: 'Mewah' }]} />
      </Field>
      <div className="g2">
        <Field label="Total anggaran" hint="boleh perkiraan"><Money value={f.total_budget} onChange={set('total_budget')} placeholder="Rp 150.000.000" /></Field>
        <Field label="Target undangan" hint="jumlah undangan"><NumIn value={f.target_invites} onChange={set('target_invites')} /></Field>
      </div>
      <Field label="Kota"><Text value={f.city} onChange={set('city')} placeholder="mis. Bandung" /></Field>
      <div className="note">Setelah dibuat, aplikasi langsung mengisi contoh daftar tugas per periode, pos anggaran sesuai skala, daftar seserahan per kategori, dokumen nikah, dan rundown hari H. Tinggal kamu sesuaikan.</div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        {onCancel && <button type="button" className="btn2" onClick={onCancel}>Batal</button>}
        <button type="submit" className="btn" disabled={busy} style={{ minWidth: 180 }}>{busy ? 'Menyiapkan… (±3 detik)' : 'Buat pernikahan'}</button>
      </div>
    </form>
  );
}

export function InviteAccept({ token }) {
  const { user } = useAuth();
  const [info, setInfo] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    supabase.rpc('invite_info', { p_token: token }).then(({ data, error }) => {
      if (error) setErr(friendlyError(error));
      setInfo(data || null);
    });
  }, [token]);

  async function accept() {
    setBusy(true); setErr('');
    const { data, error } = await supabase.rpc('accept_invite', { p_token: token });
    setBusy(false);
    if (error) { setErr(friendlyError(error)); return; }
    try { localStorage.removeItem('wp-pending-invite'); } catch (e) { /* abaikan */ }
    go('w/' + data + '/beranda');
  }
  const done = () => { try { localStorage.removeItem('wp-pending-invite'); } catch (e) { /* abaikan */ } go('pilih'); };

  return (
    <div className="auth">
      <div className="g authcard">
        <div className="brand" style={{ padding: 0 }}><span className="logo"><Icon name="rings" size={22} /></span><div><div className="bn">Wedding Planner</div><div className="by">by Wanncch</div></div></div>
        {info === undefined ? <Spinner /> : !info ? (
          <><div className="h2">Undangan tidak ditemukan</div><div className="muted">Link mungkin salah ketik atau sudah dicabut. Minta link baru ke pemilik.</div><button type="button" className="btn2" onClick={done}>Ke halaman utama</button></>
        ) : info.status === 'accepted' ? (
          <><div className="h2">Undangan sudah diterima</div><button type="button" className="btn" onClick={done}>Buka daftar pernikahan</button></>
        ) : (
          <>
            <div className="eyb">{info.invited_by ? info.invited_by + ' mengundangmu ke' : 'Kamu diundang ke'}</div>
            <div className="h1" style={{ fontSize: 28 }}>{info.couple}</div>
            <div className="muted">{dMed(info.wedding_date)} · akses <b>{ROLE[info.role]}</b></div>
            {info.email !== String(user.email).toLowerCase() && (
              <div className="note">Undangan ini untuk <b>{info.email}</b>, sedangkan kamu masuk sebagai <b>{user.email}</b>. Keluar lalu masuk/daftar dengan email undangan.</div>
            )}
            {err && <div className="note" style={{ background: '#F6D9D4', color: '#8E3A30' }}>{err}</div>}
            <div className="row">
              <button type="button" className="btn" onClick={accept} disabled={busy}>{busy ? 'Sebentar…' : 'Terima & buka'}</button>
              {info.email !== String(user.email).toLowerCase() ? <button type="button" className="btn2" onClick={signOut}>Keluar</button> : <button type="button" className="btn2" onClick={done}>Nanti saja</button>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
