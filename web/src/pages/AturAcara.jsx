import React, { useState } from 'react';
import { useW, useToast } from '../lib/store.jsx';
import { supabase, friendlyError } from '../lib/supabase.js';
import { epath, wpath } from '../lib/nav.js';
import { Icon, Field, Text, DateIn, TimeIn, Toggle, Modal, confirm, Spinner, Pill } from '../components/ui.jsx';
import { PersonSelect } from '../components/People.jsx';
import { useEv } from '../components/EventKit.jsx';
import { MENU_DEFS, EV_COLORS, eventMenus, partsOf, personByKind, topEvents } from '../lib/events.js';
import { dLong } from '../lib/format.js';

const DATA_TABLES = ['tasks', 'budget_items', 'gift_categories', 'reminders', 'notes', 'rundown_items', 'guest_invites'];

export default function AturAcara() {
  const W = useW();
  const { data, save, add, del, canEdit, wid, reload } = W;
  const toast = useToast();
  const { ev } = useEv();
  const parts0 = partsOf(data, ev.id);
  const [f, setF] = useState({ name: ev.name, event_date: ev.event_date || '', start_time: ev.start_time ? String(ev.start_time).slice(0, 5) : '', location: ev.location || '', color: ev.color || 'c0', payer_id: ev.payer_id || null, detail: ev.detail || '' });
  const [parts, setParts] = useState(parts0.map(p => ({ ...p, event_date: p.event_date || '', start_time: p.start_time ? String(p.start_time).slice(0, 5) : '' })));
  const [menus, setMenus] = useState(eventMenus(ev));
  const [drag, setDrag] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }));
  const setPart = (i, k, v) => setParts(ps => ps.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  const isMain = ev.kind === 'akad';
  const back = () => { location.hash = epath(wid, ev.id, menus.find(m => m.on) ? menus.find(m => m.on).k : 'persiapan'); };
  const countIn = (id) => DATA_TABLES.reduce((s, t) => s + (data[t] || []).filter(r => r.event_id === id).length, 0);

  function addPart() {
    setParts(ps => [...ps, { _new: true, name: ps.length ? 'Bagian ' + (ps.length + 1) : f.name, kind: ps.length ? 'lainnya' : (ev.kind === 'lamaran' ? 'lamaran' : 'lainnya'), event_date: ps.length ? '' : f.event_date, start_time: f.start_time, location: ps.length ? '' : f.location, payer_id: f.payer_id }]);
  }
  async function removePart(i) {
    const p = parts[i];
    if (p._new) { setParts(ps => ps.filter((_, j) => j !== i)); return; }
    const n = countIn(p.id);
    if (!(await confirm({ title: 'Hapus bagian ' + p.name + '?', text: n ? n + ' data di bagian ini (tugas, anggaran, seserahan, rundown, undangan) ikut terhapus saat disimpan.' : 'Bagian ini kosong.', ok: 'Hapus bagian', danger: true }))) return;
    setParts(ps => ps.map((x, j) => (j === i ? { ...x, _del: true } : x)));
  }

  async function submit() {
    if (!f.name.trim()) { toast('Nama acara wajib diisi.', 'error'); return; }
    setBusy(true);
    try {
      await save('events', ev.id, { name: f.name.trim(), event_date: f.event_date || null, start_time: f.start_time || null, location: f.location, color: f.color, payer_id: f.payer_id, menus, detail: f.detail });
      if (isMain && f.event_date && f.event_date !== data.wedding.wedding_date) await save('weddings', data.wedding.id, { wedding_date: f.event_date });
      const live = parts.filter(p => !p._del);
      const firstNew = parts0.length === 0 && live.some(p => p._new);
      let firstId = null;
      for (const [i, p] of parts.entries()) {
        const row = { name: (p.name || '').trim() || 'Bagian ' + (i + 1), event_date: p.event_date || null, start_time: p.start_time || null, location: p.location || '', payer_id: p.payer_id || null, sort: i + 1 };
        if (p._del) await del('events', p.id, { silent: true });
        else if (p._new) { const r = await add('events', { ...row, parent_id: ev.id, kind: p.kind || 'lainnya', color: 'c0', icon: 'hati', menus: [] }); if (!firstId) firstId = r && r.id; }
        else await save('events', p.id, row);
      }
      // Acara yang baru dibagi: data lama pindah ke bagian pertama
      if (firstNew && firstId) {
        for (const t of DATA_TABLES) {
          const r = await supabase.from(t).update({ event_id: firstId }).eq('event_id', ev.id);
          if (r.error) throw r.error;
        }
      }
      if (firstNew || parts.some(p => p._del)) await reload();
      toast('Perubahan acara disimpan.', 'ok');
      back();
    } catch (e) { toast(friendlyError(e), 'error'); } finally { setBusy(false); }
  }

  async function hide() {
    if (!(await confirm({ title: 'Sembunyikan ' + ev.name + '?', text: 'Acara hilang dari sidebar dan Beranda. Datanya tetap aman dan bisa ditampilkan lagi di Pengaturan › Acara.', ok: 'Sembunyikan' }))) return;
    await save('events', ev.id, { hidden: true });
    location.hash = wpath(wid, 'beranda');
  }
  async function remove() {
    const n = [ev.id, ...parts0.map(p => p.id)].reduce((s, id) => s + countIn(id), 0);
    if (!(await confirm({ title: 'Hapus acara ' + ev.name + '?', text: 'Semua data acara ini ikut terhapus permanen: ' + n + ' baris tugas, anggaran, vendor, seserahan, rundown, dan undangan tamu. Buku tamu induk dan kontak vendor tetap ada. Tindakan ini tidak bisa dibatalkan.', ok: 'Hapus permanen', danger: true }))) return;
    await del('events', ev.id, { silent: true });
    await reload();
    location.hash = wpath(wid, 'beranda');
  }

  function onDrop(i) {
    if (drag === null || drag === i) return;
    setMenus(ms => { const a = [...ms]; const [x] = a.splice(drag, 1); a.splice(i, 0, x); return a; });
    setDrag(null);
  }
  const move = (i, d) => setMenus(ms => { const a = [...ms]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });
  const toggle = (k, on) => setMenus(ms => (ms.some(m => m.k === k) ? ms.map(m => (m.k === k ? { ...m, on } : m)) : [...ms, { k, on }]));
  const livePs = parts.filter(p => !p._del);

  if (!canEdit) return <div className="g">Hanya anggota yang bisa edit yang dapat mengatur acara.</div>;
  return (
    <>
      <div className="top">
        <div><div className="eyb">Atur detail, bagian, dan sub menu acara ini</div><h1 className="h1">Atur acara · {ev.name}</h1></div>
        <div className="row"><button type="button" className="btn2" onClick={back}>Batal</button><button type="button" className="btn" disabled={busy} onClick={submit}>{busy ? 'Menyimpan…' : 'Simpan perubahan'}</button></div>
      </div>
      <section className="split">
        <div className="g col" style={{ flex: '1 1 380px', gap: 14 }}>
          <div className="h2">Detail acara</div>
          <Field label="Nama acara"><Text value={f.name} onChange={set('name')} /></Field>
          <div className="g2">
            <Field label="Tanggal" hint={isMain ? 'tanggal pernikahan' : ''}><DateIn value={f.event_date} onChange={set('event_date')} /></Field>
            <Field label="Jam"><TimeIn value={f.start_time} onChange={set('start_time')} /></Field>
          </div>
          <Field label="Lokasi"><Text value={f.location} onChange={set('location')} placeholder="mis. Rumah Bagas, Garut" /></Field>
          {isMain && <Field label="Keterangan jam & tempat" hint="opsional"><Text value={f.detail} onChange={set('detail')} placeholder="mis. Akad 08.00 Masjid · Resepsi 11.00 Gedung" /></Field>}
          <Field div label="Warna acara">
            <div className="swatch" role="radiogroup">{EV_COLORS.map(c => <button type="button" key={c} role="radio" aria-checked={f.color === c} aria-label={'Warna ' + c} className={c + (f.color === c ? ' on' : '')} onClick={() => set('color')(c)}>{f.color === c && <Icon name="check" size={16} stroke={2.6} />}</button>)}</div>
          </Field>
          <Field div label="Penanggung bawaan"><PersonSelect mode="pay" value={f.payer_id} onChange={set('payer_id')} /><span className="xs muted" style={{ marginTop: 6 }}>Terisi otomatis saat menambah item anggaran di acara ini. Tetap bisa diganti per item.</span></Field>
          <Field div label="Bagian acara">
            <div className="col" style={{ gap: 10 }}>
              {!livePs.length && <div className="partbox sm muted" style={{ lineHeight: 1.55 }}>Belum ada bagian. Pakai bagian bila acaranya punya dua sesi, seperti Lamaran dan Balasan lamaran. Setiap sub menu lalu punya tab per bagian.</div>}
              {parts.map((p, i) => p._del ? null : (
                <div key={p.id || 'n' + i} className="partbox">
                  <div className="between nowrap"><Text value={p.name} onChange={(v) => setPart(i, 'name', v)} placeholder="Nama bagian" /><button type="button" className="x" onClick={() => removePart(i)} aria-label={'Hapus bagian ' + p.name}><Icon name="trash" size={15} /></button></div>
                  <div className="g2">
                    <Field label="Tanggal"><DateIn value={p.event_date} onChange={(v) => setPart(i, 'event_date', v || '')} /></Field>
                    <Field label="Jam"><TimeIn value={p.start_time} onChange={(v) => setPart(i, 'start_time', v || '')} /></Field>
                  </div>
                  <Field label="Lokasi"><Text value={p.location} onChange={(v) => setPart(i, 'location', v)} /></Field>
                  <Field div label="Penanggung bawaan bagian ini"><PersonSelect mode="pay" value={p.payer_id} onChange={(v) => setPart(i, 'payer_id', v)} /></Field>
                </div>
              ))}
              <button type="button" className="btn2" style={{ alignSelf: 'flex-start' }} onClick={addPart}>+ Tambah bagian</button>
              {parts0.length === 0 && livePs.some(p => p._new) && <div className="xs muted">Data acara yang sudah ada akan masuk ke bagian pertama.</div>}
            </div>
          </Field>
          <div className="row" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            {!isMain ? <><button type="button" className="btn2" onClick={hide}>Sembunyikan acara</button><button type="button" className="btn danger" onClick={remove}>Hapus acara…</button></>
              : <span className="xs muted">Akad &amp; Resepsi adalah acara utama, jadi tidak bisa disembunyikan atau dihapus.</span>}
          </div>
          {!isMain && <div className="xs muted">Menghapus acara selalu meminta konfirmasi lebih dulu.</div>}
        </div>

        <div className="col" style={{ flex: '2 1 480px', gap: 16 }}>
          <div className="g col" style={{ gap: 4 }}>
            <div className="between" style={{ marginBottom: 6 }}><div className="h2">Sub menu acara ini</div><span className="xs muted">Seret untuk mengubah urutan</span></div>
            {menus.map((m, i) => {
              const d = MENU_DEFS[m.k];
              return (
                <div key={m.k} className={'ed' + (m.on ? '' : ' off') + (drag === i ? ' drag' : '')} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(i)}>
                  <span className="grip" aria-hidden="true"><Icon name="grip2" size={16} /></span>
                  <span className={'kci ' + (m.on ? f.color : 'off')}><Icon name={d.icon} size={16} /></span>
                  <span className="grow" style={{ minWidth: 0 }}><b>{d.label}</b><span className="xs muted" style={{ display: 'block' }}>{m.on ? d.desc : 'Disembunyikan · datanya tetap aman'}</span></span>
                  <span className="row nowrap" style={{ gap: 4 }}>
                    <button type="button" className="ibtn" style={{ width: 28, height: 28 }} onClick={() => move(i, -1)} aria-label={'Naikkan ' + d.label} disabled={i === 0}>↑</button>
                    <button type="button" className="ibtn" style={{ width: 28, height: 28 }} onClick={() => move(i, 1)} aria-label={'Turunkan ' + d.label} disabled={i === menus.length - 1}>↓</button>
                  </span>
                  <span className="xs muted hide-m" style={{ width: 52, textAlign: 'right' }}>{m.on ? 'Tampil' : 'Sembunyi'}</span>
                  <Toggle on={m.on} onChange={(v) => toggle(m.k, v)} />
                </div>
              );
            })}
          </div>
          <div className="g col">
            <div className="between"><div className="h2">Tambah dari katalog sub menu</div><span className="xs muted">Tampilan &amp; fitur sudah jadi</span></div>
            <div className="kat">
              {Object.entries(MENU_DEFS).map(([k, d]) => {
                const m = menus.find(x => x.k === k);
                const on = m && m.on;
                return (
                  <div key={k} className={'kc' + (d.soon ? ' soon' : !on && m ? ' back' : '')}>
                    <div className="between nowrap"><span className="row nowrap" style={{ gap: 10 }}><span className={'kci ' + (d.soon || !on ? 'off' : f.color)}><Icon name={d.icon} size={16} /></span><b>{d.label}</b></span>
                      {d.soon ? <Pill cls="p-no">Segera</Pill> : on ? <Pill cls="p-ok">Sudah ada</Pill> : <button type="button" className="btn2 sm" onClick={() => toggle(k, true)}>{m ? 'Tampilkan lagi' : 'Tambah'}</button>}</div>
                    <span className="xs muted">{d.cat}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

const TEMPLATES = [
  { key: 'pengajian', label: 'Pengajian & siraman', kind: 'lainnya', name: 'Pengajian & siraman', payer: 'fam_bride' },
  { key: 'midodareni', label: 'Midodareni', kind: 'lainnya', name: 'Midodareni', payer: 'fam_bride' },
  { key: 'akad', label: 'Akad terpisah dari resepsi', kind: 'lainnya', name: 'Akad nikah', payer: 'fam_bride' },
  { key: 'lamaran', label: 'Lamaran', kind: 'lamaran', name: 'Lamaran', payer: 'fam_groom', parts: true },
  { key: 'unduh', label: 'Unduh mantu', kind: 'unduh', name: 'Unduh mantu', payer: 'fam_groom' },
  { key: 'lain', label: 'Acara lain…', kind: 'lainnya', name: '', payer: 'fam_bride' },
];

/** + Tambah acara (dari sidebar) */
export function AddEventModal({ onClose }) {
  const { data, wid, rpc, reload } = useW();
  const toast = useToast();
  const has = (k) => topEvents(data, true).some(e => e.kind === k);
  const opts = TEMPLATES.filter(t => !(t.key === 'lamaran' && has('lamaran')) && !(t.key === 'unduh' && has('unduh')));
  const [t, setT] = useState(opts[0]);
  const [f, setF] = useState({ name: opts[0].name, date: '', location: '', payer: (personByKind(data, opts[0].payer) || {}).id || null, seed: true, balasan: true, bdate: '', blocation: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }));
  function pick(x) { setT(x); setF(y => ({ ...y, name: x.name, payer: (personByKind(data, x.payer) || {}).id || y.payer })); }
  async function submit() {
    if (!f.name.trim()) { toast('Isi nama acara.', 'error'); return; }
    setBusy(true);
    try {
      const p = { kind: t.kind, name: f.name.trim(), date: f.date || null, location: f.location, payer: f.payer, seed: f.seed };
      if (t.parts) p.parts = [{ kind: 'lamaran', date: f.date, location: f.location, payer: f.payer }, ...(f.balasan ? [{ kind: 'balasan', date: f.bdate, location: f.blocation, payer: (personByKind(data, 'fam_bride') || {}).id }] : [])];
      const id = await rpc('add_event', { p_wid: wid, p });
      await reload();
      onClose();
      toast(f.name.trim() + ' ditambahkan' + (f.seed ? ' dengan contoh tugas & anggaran.' : '.'), 'ok');
      location.hash = epath(wid, id, 'persiapan');
    } catch (e) { toast(friendlyError(e), 'error'); setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title="Tambah acara"
      footer={<><button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn" disabled={busy} onClick={submit}>{busy ? 'Menyiapkan…' : 'Tambah acara'}</button></>}>
      <div className="catg">{opts.map(x => <button type="button" key={x.key} className={t.key === x.key ? 'on' : ''} onClick={() => pick(x)}>{x.label}</button>)}</div>
      <Field label="Nama acara"><Text value={f.name} onChange={set('name')} placeholder="mis. Pengajian keluarga" /></Field>
      <div className="g2">
        <Field label="Tanggal"><DateIn value={f.date} onChange={set('date')} /></Field>
        <Field label="Lokasi"><Text value={f.location} onChange={set('location')} /></Field>
      </div>
      <Field div label="Penanggung bawaan"><PersonSelect mode="pay" value={f.payer} onChange={set('payer')} /></Field>
      {t.parts && (
        <div className="partbox">
          <label className="row nowrap" style={{ gap: 10 }}><Toggle on={f.balasan} onChange={set('balasan')} /><span className="sm"><b>Ada balasan lamaran</b><span className="xs muted" style={{ display: 'block' }}>Jadi bagian kedua dengan tab sendiri</span></span></label>
          {f.balasan && <div className="g2"><Field label="Tanggal balasan"><DateIn value={f.bdate} onChange={set('bdate')} /></Field><Field label="Lokasi balasan"><Text value={f.blocation} onChange={set('blocation')} /></Field></div>}
        </div>
      )}
      <label className="row nowrap" style={{ gap: 10 }}><Toggle on={f.seed} onChange={set('seed')} /><span className="sm"><b>Isi contoh tugas, anggaran &amp; seserahan</b><span className="xs muted" style={{ display: 'block' }}>Bisa diubah atau dihapus nanti</span></span></label>
      {f.date && <div className="xs muted">{dLong(f.date)}</div>}
    </Modal>
  );
}
