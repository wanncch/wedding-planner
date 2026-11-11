import React, { useEffect, useState } from 'react';
import { supabase, friendlyError } from '../lib/supabase.js';
import { useAuth, useToast } from '../lib/store.jsx';
import { go, signOut } from '../lib/nav.js';
import { dLong, daysBetween, today, dMed } from '../lib/format.js';
import { AccountBanner, AnnouncementBar, PlanBadge } from '../components/Account.jsx';
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
      <div style={{ width: '100%', maxWidth: showForm ? 820 : 640, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
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

        <AnnouncementBar />
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

const EXTRA = ['Pengajian & siraman', 'Midodareni', 'Akad terpisah dari resepsi'];

function CreateWedding({ onCancel }) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [f, setF] = useState({
    my_label: 'bride', bride_name: '', groom_name: '', wedding_date: '', city: '',
    religion: 'islam', scale: 'm', total_budget: null, target_invites: 300, akad_time: '08:00', resepsi_time: '11:00',
  });
  const [ev, setEv] = useState({
    lamaran: { on: true, date: '', location: '', payer: 'fam_groom' },
    balasan: { on: true, date: '', location: '', payer: 'fam_bride' },
    akad: { on: true, location: '', payer: 'fam_bride' },
    unduh: { on: false, date: '', location: '', payer: 'fam_groom' },
    extra: [],
  });
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState({});
  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }));
  const setE = (k, kk) => (v) => setEv(x => ({ ...x, [k]: { ...x[k], [kk]: v } }));
  const B = f.bride_name.trim() || 'pengantin wanita', G = f.groom_name.trim() || 'pengantin pria';
  const payers = [{ value: 'fam_bride', label: 'Keluarga ' + B }, { value: 'fam_groom', label: 'Keluarga ' + G }, { value: 'bride', label: B }, { value: 'groom', label: G }];
  const PaySel = ({ value, onChange }) => <select className="inp" value={value} onChange={(e) => onChange(e.target.value)}>{payers.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;

  function next1() {
    const er = {};
    if (!f.bride_name.trim()) er.bride_name = 'Wajib diisi';
    if (!f.groom_name.trim()) er.groom_name = 'Wajib diisi';
    if (!f.wedding_date) er.wedding_date = 'Wajib diisi';
    setErrs(er);
    if (!Object.keys(er).length) setStep(2);
  }
  function next2() {
    const er = {};
    if (ev.lamaran.on && ev.lamaran.date && f.wedding_date && ev.lamaran.date >= f.wedding_date) er.lamaran = 'Tanggal lamaran harus sebelum akad';
    if (ev.extra.some(x => !x.name.trim())) er.extra = 'Isi nama acara lain';
    setErrs(er);
    if (!Object.keys(er).length) setStep(3);
  }
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const label = { bride: 'Pengantin wanita', groom: 'Pengantin pria', family: 'Keluarga', wo: 'WO' }[f.my_label];
      const events = [];
      if (ev.lamaran.on) events.push({ kind: 'lamaran', parts: [{ kind: 'lamaran', date: ev.lamaran.date, location: ev.lamaran.location, payer: ev.lamaran.payer }, ...(ev.balasan.on ? [{ kind: 'balasan', date: ev.balasan.date, location: ev.balasan.location, payer: ev.balasan.payer }] : [])] });
      ev.extra.filter(x => x.before).forEach(x => events.push({ kind: 'lainnya', name: x.name.trim(), date: x.date, location: x.location, payer: x.payer }));
      events.push({ kind: 'akad', date: f.wedding_date, location: ev.akad.location, payer: ev.akad.payer });
      if (ev.unduh.on) events.push({ kind: 'unduh', date: ev.unduh.date, location: ev.unduh.location, payer: ev.unduh.payer });
      ev.extra.filter(x => !x.before).forEach(x => events.push({ kind: 'lainnya', name: x.name.trim(), date: x.date, location: x.location, payer: x.payer }));
      const payload = { ...f, my_label: label, total_budget: f.total_budget || 0, target_invites: f.target_invites || 0, akad_location: ev.akad.location, events };
      const { data, error } = await supabase.rpc('create_wedding', { p: payload });
      if (error) throw error;
      toast('Pernikahan dibuat. Tugas, anggaran, dan seserahan tiap acara sudah terisi contoh.', 'ok');
      go('w/' + data + '/beranda');
    } catch (e2) {
      toast(friendlyError(e2), 'error');
    } finally { setBusy(false); }
  }
  const addExtra = (name) => setEv(x => ({ ...x, extra: [...x.extra, { name, date: '', location: '', payer: 'fam_bride', before: name !== 'Acara lain' }] }));

  const scaleInfo = { s: 'Acara di rumah / gedung kecil, harga hemat', m: 'Gedung, WO, harga standar', p: 'Ballroom, vendor premium' }[f.scale];
  const Steps = () => <div className="wiz"><span className={step === 1 ? 'on' : 'ok'}>1 · Pasangan{step > 1 ? ' ✓' : ''}</span><span className={step === 2 ? 'on' : step > 2 ? 'ok' : ''}>2 · Acara{step > 2 ? ' ✓' : ''}</span><span className={step === 3 ? 'on' : ''}>3 · Anggaran &amp; tamu</span></div>;
  const EvHead = ({ k, icon, color, title, desc, on, onToggle, req }) => (
    <div className="row nowrap" style={{ gap: 10 }}>
      <button type="button" className={'ck' + (on ? ' on' + color.slice(1) : '')} onClick={onToggle} disabled={req} aria-label={(on ? 'Batal pilih ' : 'Pilih ') + title}>{on && <Icon name="check" size={12} stroke={3} />}</button>
      <span className={'acd ' + color}><Icon name={icon} size={15} /></span>
      <span className="grow"><b>{title}</b><span className="xs muted" style={{ display: 'block' }}>{desc}</span></span>
      {req && <span className="pill p-no">Wajib</span>}
    </div>
  );

  return (
    <form className="g col" onSubmit={submit} noValidate style={{ gap: 16 }}>
      <Steps />
      {step === 1 && (
        <>
          <div><div className="h1" style={{ fontSize: 26 }}>Pernikahan baru</div><div className="muted" style={{ marginTop: 4 }}>Isi seperlunya dulu. Semua bisa diubah nanti di Pengaturan.</div></div>
          <Field label="Aku di pernikahan ini sebagai"><Seg value={f.my_label} onChange={set('my_label')} items={[{ key: 'bride', label: 'Pengantin wanita' }, { key: 'groom', label: 'Pengantin pria' }, { key: 'family', label: 'Keluarga' }, { key: 'wo', label: 'WO' }]} /></Field>
          <div className="g2">
            <Field label="Nama pengantin wanita" error={errs.bride_name}><Text value={f.bride_name} onChange={set('bride_name')} placeholder="mis. Rina" /></Field>
            <Field label="Nama pengantin pria" error={errs.groom_name}><Text value={f.groom_name} onChange={set('groom_name')} placeholder="mis. Bagas" /></Field>
          </div>
          <div className="g2">
            <Field label="Tanggal akad & resepsi" error={errs.wedding_date}><DateIn value={f.wedding_date} onChange={set('wedding_date')} min={new Date().toISOString().slice(0, 10)} /></Field>
            <Field label="Kota"><Text value={f.city} onChange={set('city')} placeholder="mis. Bandung" /></Field>
          </div>
          <Field label="Alur pencatatan nikah"><Seg value={f.religion} onChange={set('religion')} items={[{ key: 'islam', label: 'Islam · KUA' }, { key: 'lainnya', label: 'Agama lain · catatan sipil' }]} /></Field>
          <div className="row" style={{ justifyContent: 'flex-end' }}>{onCancel && <button type="button" className="btn2" onClick={onCancel}>Batal</button>}<button type="button" className="btn" onClick={next1}>Lanjut pilih acara</button></div>
        </>
      )}
      {step === 2 && (
        <>
          <div><div className="h1" style={{ fontSize: 26 }}>Acara apa saja yang akan kalian adakan?</div><div className="muted" style={{ marginTop: 4 }}>Centang acara yang dipakai. Untuk tiap acara, contoh tugas, anggaran, dan seserahan langsung terisi. Semuanya bisa diubah nanti lewat tombol pensil.</div></div>
          <div className={'evbox ' + (ev.lamaran.on ? 't1' : 'off')}>
            <EvHead icon="hati" color="c1" title="Lamaran" desc="Keluarga pria datang melamar ke rumah pengantin wanita" on={ev.lamaran.on} onToggle={() => setE('lamaran', 'on')(!ev.lamaran.on)} />
            {ev.lamaran.on && <>
              <div className="g3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))' }}>
                <Field label="Tanggal" error={errs.lamaran}><DateIn value={ev.lamaran.date} onChange={setE('lamaran', 'date')} /></Field>
                <Field label="Lokasi"><Text value={ev.lamaran.location} onChange={setE('lamaran', 'location')} placeholder={'Rumah ' + B} /></Field>
                <Field label="Penanggung bawaan"><PaySel value={ev.lamaran.payer} onChange={setE('lamaran', 'payer')} /></Field>
              </div>
              <div className="sub-part">
                <EvHead icon="refresh" color="c1" title="Ada balasan lamaran" desc="Jadi bagian kedua di acara Lamaran, dengan tab sendiri di tiap sub menu" on={ev.balasan.on} onToggle={() => setE('balasan', 'on')(!ev.balasan.on)} />
                {ev.balasan.on && <div className="g3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
                  <Field label="Tanggal"><DateIn value={ev.balasan.date} onChange={setE('balasan', 'date')} /></Field>
                  <Field label="Lokasi"><Text value={ev.balasan.location} onChange={setE('balasan', 'location')} placeholder={'Rumah ' + G} /></Field>
                  <Field label="Penanggung bawaan"><PaySel value={ev.balasan.payer} onChange={setE('balasan', 'payer')} /></Field>
                </div>}
              </div>
            </>}
          </div>
          <div className="evbox t2">
            <EvHead icon="rings" color="c2" title="Akad & Resepsi" desc="Biaya akad ikut masuk anggaran acara ini · berisi juga sub menu Dokumen" on req />
            <div className="g3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))' }}>
              <Field label="Tanggal"><DateIn value={f.wedding_date} onChange={set('wedding_date')} /></Field>
              <Field label="Lokasi"><Text value={ev.akad.location} onChange={setE('akad', 'location')} placeholder="mis. Graha Asri" /></Field>
              <Field label="Penanggung bawaan"><PaySel value={ev.akad.payer} onChange={setE('akad', 'payer')} /></Field>
              <Field label="Jam akad"><TimeIn value={f.akad_time} onChange={set('akad_time')} /></Field>
              <Field label="Jam resepsi"><TimeIn value={f.resepsi_time} onChange={set('resepsi_time')} /></Field>
            </div>
          </div>
          <div className={'evbox ' + (ev.unduh.on ? 't3' : 'off')}>
            <EvHead icon="rumah" color="c3" title="Unduh mantu" desc="Acara di keluarga pengantin pria" on={ev.unduh.on} onToggle={() => setE('unduh', 'on')(!ev.unduh.on)} />
            {ev.unduh.on && <div className="g3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))' }}>
              <Field label="Tanggal"><DateIn value={ev.unduh.date} onChange={setE('unduh', 'date')} /></Field>
              <Field label="Lokasi"><Text value={ev.unduh.location} onChange={setE('unduh', 'location')} placeholder={'Rumah ' + G} /></Field>
              <Field label="Penanggung bawaan"><PaySel value={ev.unduh.payer} onChange={setE('unduh', 'payer')} /></Field>
            </div>}
          </div>
          {ev.extra.map((x, i) => (
            <div key={i} className="evbox t4">
              <div className="between nowrap"><Text value={x.name} onChange={(v) => setEv(y => ({ ...y, extra: y.extra.map((z, j) => (j === i ? { ...z, name: v } : z)) }))} placeholder="Nama acara" /><button type="button" className="x" onClick={() => setEv(y => ({ ...y, extra: y.extra.filter((_, j) => j !== i) }))} aria-label="Hapus acara"><Icon name="x" size={15} /></button></div>
              <div className="g3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))' }}>
                <Field label="Tanggal"><DateIn value={x.date} onChange={(v) => setEv(y => ({ ...y, extra: y.extra.map((z, j) => (j === i ? { ...z, date: v } : z)) }))} /></Field>
                <Field label="Lokasi"><Text value={x.location} onChange={(v) => setEv(y => ({ ...y, extra: y.extra.map((z, j) => (j === i ? { ...z, location: v } : z)) }))} /></Field>
                <Field label="Penanggung bawaan"><PaySel value={x.payer} onChange={(v) => setEv(y => ({ ...y, extra: y.extra.map((z, j) => (j === i ? { ...z, payer: v } : z)) }))} /></Field>
              </div>
            </div>
          ))}
          {errs.extra && <div className="ferr">{errs.extra}</div>}
          <div className="evbox" style={{ border: '1.5px dashed rgba(176,86,107,.3)' }}>
            <b className="sm">+ Tambah acara lain</b>
            <div className="sug">{[...EXTRA, 'Acara lain'].map(n => <button type="button" key={n} onClick={() => addExtra(n === 'Acara lain' ? '' : n)}>{n === 'Acara lain' ? 'Acara lain…' : n}</button>)}</div>
          </div>
          <div className="note row" style={{ gap: 8 }}><Icon name="users" size={16} /><span>Nama pihak diambil dari langkah 1: <b>Keluarga {B}</b> (pihak wanita) dan <b>Keluarga {G}</b> (pihak pria). Orang lain bisa ditambah nanti di Pengaturan.</span></div>
          <div className="between"><button type="button" className="btn2" onClick={() => setStep(1)}>Kembali</button><button type="button" className="btn" onClick={next2}>Lanjut ke anggaran &amp; tamu</button></div>
        </>
      )}
      {step === 3 && (
        <>
          <div><div className="h1" style={{ fontSize: 26 }}>Anggaran &amp; tamu</div><div className="muted" style={{ marginTop: 4 }}>Dipakai untuk mengisi contoh anggaran tiap acara. Boleh perkiraan.</div></div>
          <Field label="Skala acara" hint={scaleInfo}><Seg value={f.scale} onChange={set('scale')} items={[{ key: 's', label: 'Sederhana' }, { key: 'm', label: 'Menengah' }, { key: 'p', label: 'Mewah' }]} /></Field>
          <div className="g2">
            <Field label="Total anggaran semua acara" hint="boleh perkiraan"><Money value={f.total_budget} onChange={set('total_budget')} placeholder="Rp 150.000.000" /></Field>
            <Field label="Target undangan resepsi"><NumIn value={f.target_invites} onChange={set('target_invites')} /></Field>
          </div>
          <div className="note">Setelah dibuat, tiap acara langsung terisi contoh tugas per periode, slot vendor dan pos anggaran sesuai skala, daftar seserahan per kategori, dan rundown. Akad &amp; Resepsi juga berisi dokumen nikah.</div>
          <div className="between"><button type="button" className="btn2" onClick={() => setStep(2)}>Kembali</button><button type="submit" className="btn" disabled={busy} style={{ minWidth: 180 }}>{busy ? 'Menyiapkan… (±3 detik)' : 'Buat pernikahan'}</button></div>
        </>
      )}
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
