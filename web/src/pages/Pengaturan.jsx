import React, { useEffect, useState } from 'react';
import { useW, useAuth, useToast, TABLES } from '../lib/store.jsx';
import { supabase, friendlyError } from '../lib/supabase.js';
import { go, signOut, epath } from '../lib/nav.js';
import { PersonSelect, PersonModal } from '../components/People.jsx';
import { topEvents, partsOf, eventDateLabel, peopleSorted } from '../lib/events.js';
import { Icon, Tabs, Pill, Avatar, Field, Text, DateIn, TimeIn, Money, NumIn, Seg, Select, Modal, Toggle, confirm, Spinner } from '../components/ui.jsx';
import { dLong, dMed, hm, waLink, daysBetween } from '../lib/format.js';

const ROLE = { owner: ['Pemilik', 'p-rose'], editor: ['Bisa edit', 'p-ok'], viewer: ['Lihat saja', 'p-no'] };
const KIND = { lamaran: 'L', akad: 'A', resepsi: 'R', lainnya: '•' };

export default function Pengaturan({ q }) {
  const [tab, setTab] = useState((q && q.tab) || 'pernikahan');
  return (
    <>
      <div className="top"><div><div className="eyb">Berlaku untuk semua acara</div><h1 className="h1">Pengaturan</h1></div></div>
      <Tabs value={tab} onChange={setTab} items={[{ key: 'pernikahan', label: 'Pernikahan' }, { key: 'acara', label: 'Acara' }, { key: 'orang', label: 'Orang & pihak' }, { key: 'anggota', label: 'Anggota' }, { key: 'data', label: 'Data & akun' }]} />
      {tab === 'pernikahan' && <Profil />}
      {tab === 'acara' && <Acara />}
      {tab === 'orang' && <Orang />}
      {tab === 'anggota' && <Anggota />}
      {tab === 'data' && <DataTab />}
    </>
  );
}

function Profil() {
  const { data, save, canEdit } = useW();
  const toast = useToast();
  const w = data.wedding;
  const [f, setF] = useState({ bride_name: w.bride_name, groom_name: w.groom_name, wedding_date: w.wedding_date, city: w.city, concept: w.concept, total_budget: Number(w.total_budget), target_invites: w.target_invites, portions_per_invite: Number(w.portions_per_invite), religion: w.religion, scale: w.scale, price_tier: w.price_tier });
  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }));
  const dirty = Object.keys(f).some(k => String(f[k]) !== String(w[k] ?? ''));
  async function submit() {
    if (!f.bride_name.trim() || !f.groom_name.trim() || !f.wedding_date) { toast('Nama dan tanggal wajib diisi.', 'error'); return; }
    const old = w.wedding_date;
    await save('weddings', w.id, { ...f, bride_name: f.bride_name.trim(), groom_name: f.groom_name.trim(), total_budget: f.total_budget || 0, target_invites: f.target_invites || 0, portions_per_invite: f.portions_per_invite || 1 });
    if (f.wedding_date !== old) {
      const same = data.events.filter(e => !e.parent_id && e.kind === 'akad');
      for (const e of same) await save('events', e.id, { event_date: f.wedding_date });
      toast('Tanggal diubah. Deadline otomatis di Persiapan ikut bergeser.', 'ok');
    } else toast('Tersimpan.', 'ok');
  }
  return (
    <section className="grid2">
      <div className="g col" style={{ gap: 12 }}>
        <div className="h2">Profil pernikahan</div>
        <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="g2">
            <Field label="Pengantin wanita"><Text value={f.bride_name} onChange={set('bride_name')} /></Field>
            <Field label="Pengantin pria"><Text value={f.groom_name} onChange={set('groom_name')} /></Field>
            <Field label="Tanggal akad & resepsi"><DateIn value={f.wedding_date} onChange={set('wedding_date')} /></Field>
            <Field label="Kota"><Text value={f.city} onChange={set('city')} /></Field>
            <Field label="Total anggaran"><Money value={f.total_budget} onChange={set('total_budget')} /></Field>
            <Field label="Target undangan"><NumIn value={f.target_invites} onChange={set('target_invites')} /></Field>
            <Field label="Porsi per undangan" hint="untuk hitung catering"><NumIn value={f.portions_per_invite} onChange={set('portions_per_invite')} step="0.1" min={1} /></Field>
            <Field label="Adat / konsep"><Text value={f.concept} onChange={set('concept')} placeholder="mis. Sunda modern" /></Field>
          </div>
          <Field label="Agama (menentukan alur dokumen & persiapan diri)"><Seg value={f.religion} onChange={set('religion')} items={[{ key: 'islam', label: 'Islam · KUA' }, { key: 'lainnya', label: 'Catatan sipil' }]} /></Field>
          <div className="g2">
            <Field label="Skala"><Seg small value={f.scale} onChange={set('scale')} items={[{ key: 's', label: 'Sederhana' }, { key: 'm', label: 'Menengah' }, { key: 'p', label: 'Mewah' }]} /></Field>
            <Field label="Level harga katalog"><Seg small value={f.price_tier} onChange={set('price_tier')} items={[{ key: 'min', label: 'Hemat' }, { key: 'std', label: 'Standar' }, { key: 'prem', label: 'Premium' }]} /></Field>
          </div>
        </fieldset>
        {canEdit && <div className="row" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn" disabled={!dirty} onClick={submit}>Simpan perubahan</button></div>}
      </div>
      <div className="g col" style={{ gap: 10, alignSelf: 'start' }}>
        <div className="h2">Ringkasan</div>
        <div className="li"><span className="ico"><Icon name="rings" /></span><div className="grow"><b>{w.bride_name} &amp; {w.groom_name}</b><div className="xs muted">{dLong(w.wedding_date)} · {daysBetween(new Date(), w.wedding_date)} hari lagi</div></div></div>
        <div className="xs muted" style={{ lineHeight: 1.6 }}>Mengubah tanggal nikah ikut mengubah tanggal acara Akad & Resepsi dan menggeser deadline tugasnya. Tanggal acara lain diatur lewat tombol pensil di sidebar.</div>
      </div>
    </section>
  );
}

function Acara() {
  const { data, canEdit, save, wid } = useW();
  const evs = topEvents(data, true);
  const [drag, setDrag] = useState(null);
  async function reorder(from, to) {
    if (from === null || from === to) return;
    const a = [...evs]; const [x] = a.splice(from, 1); a.splice(to, 0, x);
    for (const [i, e] of a.entries()) if (e.sort !== i + 1) await save('events', e.id, { sort: i + 1 });
  }
  return (
    <section className="grid2">
      <div className="g col" style={{ gap: 4 }}>
        <div className="between"><div className="h2">Urutan acara</div><span className="xs muted">Seret untuk mengubah urutan</span></div>
        {evs.map((e, i) => {
          const ps = partsOf(data, e.id);
          return (
            <div key={e.id} className={'ed' + (e.hidden ? ' off' : '') + (drag === i ? ' drag' : '')} draggable={canEdit} onDragStart={() => setDrag(i)} onDragOver={(x) => x.preventDefault()} onDrop={() => { reorder(drag, i); setDrag(null); }}>
              <span className="grip" aria-hidden="true"><Icon name="grip2" size={16} /></span>
              <span className={'acd ' + e.color}><Icon name={e.icon} size={15} /></span>
              <span className="grow"><b>{e.name}</b><span className="xs muted" style={{ display: 'block' }}>{(ps.length ? ps.length + ' bagian · ' : '') + eventDateLabel(data, e) + (e.location ? ' · ' + e.location : '') + (e.hidden ? ' · disembunyikan' : '')}</span></span>
              {canEdit && i > 0 && <button type="button" className="ibtn" style={{ width: 28, height: 28 }} onClick={() => reorder(i, i - 1)} aria-label={'Naikkan ' + e.name}>↑</button>}
              {canEdit && e.hidden && <button type="button" className="btn2 sm" onClick={() => save('events', e.id, { hidden: false })}>Tampilkan</button>}
              {canEdit && <a className="pen" href={epath(wid, e.id, 'atur')} aria-label={'Atur ' + e.name}><Icon name="edit" size={15} /></a>}
            </div>
          );
        })}
        <div className="xs muted" style={{ marginTop: 6 }}>Urutan ini dipakai di sidebar dan Beranda. Tambah acara lewat tombol “+ Tambah acara” di sidebar.</div>
      </div>
      <PayerDefaults />
    </section>
  );
}

function PayerDefaults() {
  const { data, canEdit, save } = useW();
  const rows = [];
  topEvents(data).forEach(e => {
    const ps = partsOf(data, e.id);
    if (ps.length) ps.forEach(p => rows.push({ e: p, label: e.name + ' › ' + p.name, color: e.color }));
    else rows.push({ e, label: e.name, color: e.color });
  });
  return (
    <div className="g col" style={{ gap: 8, alignSelf: 'start' }}>
      <div className="h2">Penanggung bawaan per acara</div>
      {rows.map(r => (
        <div key={r.e.id} className="between pdrow">
          <span className={'pill ta' + (r.color || 'c0').slice(1)} style={{ maxWidth: '48%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</span>
          <div style={{ flex: '1 1 150px', maxWidth: 230, minWidth: 0 }}><PersonSelect mode="pay" value={r.e.payer_id} disabled={!canEdit} onChange={(v) => save('events', r.e.id, { payer_id: v })} /></div>
        </div>
      ))}
      <div className="xs muted">Terisi otomatis saat menambah item anggaran. Tetap bisa diganti per item, termasuk dibagi patungan.</div>
    </div>
  );
}

function Orang() {
  const { data, canEdit, save } = useW();
  const [edit, setEdit] = useState(null);
  const ppl = peopleSorted(data);
  const card = (sd, title, cls) => {
    const list = ppl.filter(p => p.side === sd);
    return (
      <div className="g col" style={{ gap: 4, background: sd === 'pria' ? 'linear-gradient(150deg,rgba(236,243,251,.9),rgba(214,228,243,.7))' : sd === 'wanita' ? 'linear-gradient(150deg,rgba(255,240,243,.9),rgba(248,221,227,.7))' : undefined }}>
        <div className="between"><span className={'pill ' + cls}>{title}</span><span className="xs muted">{list.length} orang</span></div>
        {list.map(p => (
          <div key={p.id} className="li">
            <Avatar name={p.name} side={p.side} />
            <button type="button" className="grow" style={{ textAlign: 'left', background: 'none', border: 0, padding: 0 }} onClick={() => canEdit && setEdit(p)}><b>{p.name}</b><span className="xs muted" style={{ display: 'block' }}>{[p.role_label, p.user_ids && p.user_ids.length ? 'terhubung ke akun' : null].filter(Boolean).join(' · ')}</span></button>
            <button type="button" className={'pill ' + (p.can_pic ? 'p-ok' : 'p-no')} style={{ border: 0 }} disabled={!canEdit} onClick={() => save('people', p.id, { can_pic: !p.can_pic })} aria-pressed={p.can_pic}>PIC {p.can_pic ? '✓' : ''}</button>
            <button type="button" className={'pill ' + (p.can_pay ? 'p-ok' : 'p-no')} style={{ border: 0 }} disabled={!canEdit} onClick={() => save('people', p.id, { can_pay: !p.can_pay })} aria-pressed={p.can_pay}>Penanggung {p.can_pay ? '✓' : ''}</button>
          </div>
        ))}
        {!list.length && <div className="xs muted">Belum ada.</div>}
      </div>
    );
  };
  return (
    <section className="split">
      <div className="g wide col" style={{ gap: 12 }}>
        <div className="between"><div className="h2">Orang &amp; pihak</div>{canEdit && <button type="button" className="btn2" onClick={() => setEdit({ _new: true })}><Icon name="plus" size={15} />Tambah orang</button>}</div>
        <div className="sm muted">Daftar ini muncul sebagai pilihan <b>PIC</b> dan <b>Ditanggung oleh</b> di semua acara. Pihak menentukan hitungannya masuk ke pria atau wanita di Beranda.</div>
        <div className="grid2">{card('wanita', 'Pihak wanita', 'pw')}{card('pria', 'Pihak pria', 'pp')}</div>
        {card('lainnya', 'Lainnya · tidak masuk hitungan pria atau wanita', 'po')}
      </div>
      <aside className="narrow"><PayerDefaults /></aside>
      {edit && <PersonModal person={edit} onClose={() => setEdit(null)} />}
    </section>
  );
}

function Anggota() {
  const { data, isOwner, people, save, del, commit, wid } = useW();
  const { user } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ email: '', role: 'editor', label: '' });
  const [busy, setBusy] = useState(false);
  const link = (t) => window.location.origin + '/#/undangan/' + t;
  const pending = data.invites.filter(i => i.status === 'pending');

  async function invite() {
    const email = f.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { toast('Format email belum benar.', 'error'); return; }
    if (people.some(p => (p.email || '').toLowerCase() === email)) { toast('Email ini sudah jadi anggota.', 'error'); return; }
    setBusy(true);
    const { data: row, error } = await supabase.from('wedding_invites').insert({ wedding_id: wid, email, role: f.role, label: f.label.trim() }).select().single();
    setBusy(false);
    if (error) { toast(friendlyError(error), 'error'); return; }
    commit(prev => ({ ...prev, invites: [...prev.invites, row] }));
    setF({ email: '', role: 'editor', label: '' });
    share(row);
  }
  async function share(inv) {
    const text = 'Halo! Aku mengundangmu ikut mengatur pernikahan ' + data.wedding.bride_name + ' & ' + data.wedding.groom_name + ' di Wedding Planner. Buka link ini, lalu daftar/masuk dengan email ' + inv.email + ':\n' + link(inv.token);
    try { await navigator.clipboard.writeText(text); toast('Link undangan disalin. Kirim lewat WA atau email.', 'ok'); }
    catch (e) { window.prompt('Salin link undangan:', link(inv.token)); }
  }
  async function revoke(inv) {
    const { error } = await supabase.from('wedding_invites').update({ status: 'revoked' }).eq('id', inv.id);
    if (error) { toast(friendlyError(error), 'error'); return; }
    commit(prev => ({ ...prev, invites: prev.invites.map(i => i.id === inv.id ? { ...i, status: 'revoked' } : i) }));
  }
  async function setRole(m, role) {
    const { error } = await supabase.from('wedding_members').update({ role }).eq('wedding_id', wid).eq('user_id', m.user_id);
    if (error) { toast(friendlyError(error), 'error'); return; }
    commit(prev => ({ ...prev, members: prev.members.map(x => x.user_id === m.user_id ? { ...x, role } : x) }));
  }
  async function remove(m) {
    if (!(await confirm({ title: 'Keluarkan anggota?', text: m.name + ' tidak bisa membuka pernikahan ini lagi.', ok: 'Keluarkan', danger: true }))) return;
    const { error } = await supabase.from('wedding_members').delete().eq('wedding_id', wid).eq('user_id', m.user_id);
    if (error) { toast(friendlyError(error), 'error'); return; }
    commit(prev => ({ ...prev, members: prev.members.filter(x => x.user_id !== m.user_id) }));
  }

  return (
    <section className="grid2">
      <div className="g col" style={{ gap: 6 }}>
        <div className="h2">Anggota</div>
        {people.map(m => (
          <div className="li" key={m.user_id}>
            <Avatar name={m.name} />
            <div className="grow"><b>{m.name}{m.user_id === user.id ? ' (kamu)' : ''}</b><div className="xs muted ell">{m.email}</div></div>
            {isOwner && m.role !== 'owner' ? (
              <span className="row nowrap" style={{ gap: 6 }}>
                <select className="inp" style={{ width: 'auto', minHeight: 32, padding: '4px 28px 4px 10px', fontSize: 12 }} value={m.role} onChange={(e) => setRole(m, e.target.value)}><option value="editor">Bisa edit</option><option value="viewer">Lihat saja</option></select>
                <button type="button" className="ibtn" onClick={() => remove(m)} aria-label="Keluarkan"><Icon name="x" size={15} /></button>
              </span>
            ) : <Pill cls={ROLE[m.role][1]}>{ROLE[m.role][0]}</Pill>}
          </div>
        ))}
        {pending.map(i => (
          <div className="li" key={i.id}>
            <Avatar name={i.label || i.email} />
            <div className="grow"><b>{i.label || i.email}</b><div className="xs muted ell">{i.email} · {ROLE[i.role][0]}</div></div>
            <Pill cls="p-wait">Undangan terkirim</Pill>
            {isOwner && <><button type="button" className="ibtn" onClick={() => share(i)} aria-label="Salin link"><Icon name="link" size={15} /></button><button type="button" className="ibtn" onClick={() => revoke(i)} aria-label="Batalkan undangan"><Icon name="x" size={15} /></button></>}
          </div>
        ))}
        <div className="xs muted" style={{ marginTop: 8, lineHeight: 1.6 }}><b>Bisa edit</b>: pasangan, orang tua yang ikut mengatur. <b>Lihat saja</b>: keluarga, penerima tamu (tetap bisa check-in tamu di hari H), WO.</div>
      </div>
      {isOwner ? (
        <div className="g col" style={{ gap: 12, alignSelf: 'start' }}>
          <div className="h2">Undang anggota</div>
          <Field label="Email"><Text value={f.email} onChange={(v) => setF(x => ({ ...x, email: v }))} type="email" placeholder="email pasangan / keluarga" /></Field>
          <Field label="Sebutan" hint="opsional"><Text value={f.label} onChange={(v) => setF(x => ({ ...x, label: v }))} placeholder="mis. Ibu Rina, WO Kirana" /></Field>
          <Field label="Akses"><Seg value={f.role} onChange={(v) => setF(x => ({ ...x, role: v }))} items={[{ key: 'editor', label: 'Bisa edit' }, { key: 'viewer', label: 'Lihat saja' }]} /></Field>
          <button type="button" className="btn" disabled={busy} onClick={invite}>{busy ? 'Membuat…' : 'Buat link undangan'}</button>
          <div className="xs muted">Link langsung disalin. Kirim lewat WhatsApp/email. Yang diundang daftar/masuk dengan email tersebut, lalu otomatis bergabung.</div>
        </div>
      ) : <div className="g xs muted" style={{ alignSelf: 'start' }}>Hanya pemilik yang bisa mengundang anggota baru.</div>}
    </section>
  );
}

function DataTab() {
  const W = useW();
  const { data, isOwner, reload, wid, me } = W;
  const { profile, setProfile, user } = useAuth();
  const toast = useToast();
  const [log, setLog] = useState(null);
  const [name, setName] = useState(profile ? profile.display_name : '');
  const [pw, setPw] = useState(false);
  const [del, setDel] = useState(false);

  useEffect(() => {
    supabase.from('activity_log').select('*').eq('wedding_id', wid).order('created_at', { ascending: false }).limit(25).then(({ data: d }) => setLog(d || []));
  }, [wid]);

  async function exportXlsx() {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const add = (name, rows) => { if (rows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.map(({ wedding_id, ...r }) => r)), name.slice(0, 31)); };
    add('Pernikahan', [data.wedding]);
    const label = { events: 'Acara', people: 'Orang & pihak', guest_invites: 'Undangan per acara', tasks: 'Persiapan', vendors: 'Vendor', budget_categories: 'Kategori anggaran', budget_items: 'Anggaran', payments: 'Pembayaran', gift_categories: 'Kategori seserahan', gift_items: 'Seserahan', guests: 'Tamu', rundown_items: 'Rundown', documents: 'Dokumen', reminders: 'Reminder', notes: 'Catatan', selfprep: 'Persiapan diri' };
    TABLES.forEach(t => add(label[t] || t, data[t]));
    XLSX.writeFile(wb, 'wedding-' + data.wedding.bride_name + '-' + data.wedding.groom_name + '.xlsx');
  }
  function backup() {
    const blob = new Blob([JSON.stringify({ version: 2, exported_at: new Date().toISOString(), ...data }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'cadangan-wedding-' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
  }
  async function saveName() {
    const { error } = await supabase.from('profiles').update({ display_name: name.trim() }).eq('id', user.id);
    if (error) toast(friendlyError(error), 'error'); else { setProfile({ ...profile, display_name: name.trim() }); toast('Nama disimpan.', 'ok'); }
  }
  async function leave() {
    if (!(await confirm({ title: 'Keluar dari pernikahan ini?', text: 'Kamu tidak bisa membukanya lagi kecuali diundang ulang.', ok: 'Keluar', danger: true }))) return;
    const { error } = await supabase.from('wedding_members').delete().eq('wedding_id', wid).eq('user_id', user.id);
    if (error) toast(friendlyError(error), 'error'); else go('pilih');
  }
  const ENT = { people: 'orang', guest_invites: 'undangan', tasks: 'tugas', vendors: 'vendor', budget_items: 'anggaran', payments: 'pembayaran', gift_items: 'seserahan', guests: 'tamu', rundown_items: 'rundown', documents: 'dokumen', reminders: 'reminder', notes: 'catatan', selfprep: 'persiapan diri', events: 'acara', weddings: 'profil' };
  const ago = (t) => { const m = Math.round((Date.now() - new Date(t)) / 60000); return m < 1 ? 'baru saja' : m < 60 ? m + ' mnt lalu' : m < 1440 ? Math.round(m / 60) + ' jam lalu' : dMed(t); };

  return (
    <section className="grid2">
      <div className="g col" style={{ gap: 10 }}>
        <div className="h2">Data</div>
        <div className="li"><span className="ico" style={{ background: 'linear-gradient(135deg,#D7EADF,#C2DDCB)', color: '#2F5A43' }}><Icon name="refresh" /></span><div className="grow"><b>Tersimpan di server</b><div className="xs muted">Setiap perubahan langsung tersimpan · {W.syncedAt ? 'diperbarui ' + ago(W.syncedAt) : ''}</div></div><button type="button" className="btn2 sm" onClick={reload}>Muat ulang</button></div>
        <div className="row"><button type="button" className="btn2" onClick={exportXlsx}><Icon name="download" size={15} />Ekspor Excel</button><button type="button" className="btn2" onClick={backup}><Icon name="download" size={15} />Cadangan (.json)</button></div>
        <div className="lbl" style={{ marginTop: 6 }}>Aktivitas terbaru</div>
        {log === null ? <Spinner /> : log.length ? (
          <div className="xs" style={{ lineHeight: 1.9 }}>
            {log.map(l => <div key={l.id}><b>{l.user_name}</b> {l.action} {ENT[l.entity] || l.entity} {l.summary && '“' + l.summary + '”'} · <span className="muted">{ago(l.created_at)}</span></div>)}
          </div>
        ) : <div className="xs muted">Belum ada aktivitas.</div>}
      </div>
      <div className="col" style={{ gap: 14 }}>
        <div className="g col" style={{ gap: 10 }}>
          <div className="h2">Akun</div>
          <div className="xs muted">{user.email}</div>
          <Field label="Nama panggilan"><div className="row nowrap"><Text value={name} onChange={setName} /><button type="button" className="btn2" onClick={saveName} disabled={!name.trim() || name === (profile && profile.display_name)}>Simpan</button></div></Field>
          <div className="row"><button type="button" className="btn2" onClick={() => setPw(true)}>Ganti kata sandi</button><button type="button" className="btn2" onClick={() => go('pilih')}>Ganti pernikahan</button><button type="button" className="btn2" onClick={signOut}><Icon name="logout" size={15} />Keluar</button></div>
        </div>
        <div className="g col" style={{ gap: 10, border: '1px solid rgba(168,70,58,.25)' }}>
          <div className="h2" style={{ color: '#8E3A30' }}>Zona hati-hati</div>
          {isOwner ? <><div className="xs muted">Menghapus pernikahan menghapus semua data, file, dan akses anggota. Tidak bisa dibatalkan. Ekspor Excel dulu bila perlu.</div><button type="button" className="btn danger" style={{ alignSelf: 'flex-start' }} onClick={() => setDel(true)}>Hapus pernikahan</button></>
            : <><div className="xs muted">Kamu anggota ({ROLE[me ? me.role : 'viewer'][0]}).</div><button type="button" className="btn2" style={{ alignSelf: 'flex-start' }} onClick={leave}>Keluar dari pernikahan ini</button></>}
        </div>
      </div>
      {pw && <PasswordModal onClose={() => setPw(false)} />}
      {del && <DeleteModal onClose={() => setDel(false)} />}
    </section>
  );
}

function PasswordModal({ onClose }) {
  const toast = useToast();
  const [p, setP] = useState('');
  async function submit() {
    if (p.length < 8) { toast('Minimal 8 karakter.', 'error'); return; }
    const { error } = await supabase.auth.updateUser({ password: p });
    if (error) toast(friendlyError(error), 'error'); else { toast('Kata sandi diganti.', 'ok'); onClose(); }
  }
  return (
    <Modal open onClose={onClose} title="Ganti kata sandi" footer={<><button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn" onClick={submit}>Simpan</button></>}>
      <Field label="Kata sandi baru" hint="minimal 8 karakter"><Text type="password" value={p} onChange={setP} autoComplete="new-password" /></Field>
    </Modal>
  );
}

function DeleteModal({ onClose }) {
  const { data, wid } = useW();
  const toast = useToast();
  const target = data.wedding.bride_name + ' & ' + data.wedding.groom_name;
  const [t, setT] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      const { data: files } = await supabase.storage.from('wedding-files').list(wid, { limit: 1000 });
      // hapus file per folder
      for (const folder of (files || [])) {
        const { data: inner } = await supabase.storage.from('wedding-files').list(wid + '/' + folder.name, { limit: 1000 });
        const paths = (inner || []).map(x => wid + '/' + folder.name + '/' + x.name);
        if (paths.length) await supabase.storage.from('wedding-files').remove(paths);
      }
      const { error } = await supabase.from('weddings').delete().eq('id', wid);
      if (error) throw error;
      try { localStorage.removeItem('wp-cache-v2-' + wid); localStorage.removeItem('wp-current'); } catch (e) { /* abaikan */ }
      toast('Pernikahan dihapus.', 'ok');
      go('pilih');
    } catch (e) { toast(friendlyError(e), 'error'); setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title="Hapus pernikahan?"
      footer={<><button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn danger" disabled={t.trim() !== target || busy} onClick={submit}>{busy ? 'Menghapus…' : 'Hapus permanen'}</button></>}>
      <div className="sm">Ketik <b>{target}</b> untuk konfirmasi.</div>
      <Text value={t} onChange={setT} />
    </Modal>
  );
}
