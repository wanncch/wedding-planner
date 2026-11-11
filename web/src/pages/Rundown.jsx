import React, { useState } from 'react';
import { useW, useToast } from '../lib/store.jsx';
import { wpath, epath } from '../lib/nav.js';
import { useEv, EventHeader } from '../components/EventKit.jsx';
import { baseDate } from '../lib/events.js';
import { Icon, Tabs, Tile, Drawer, Field, Text, Area, TimeIn, NumIn, Select, PersonPick, confirm, Empty, Avatar, Pill } from '../components/ui.jsx';
import { rundownFor } from '../lib/calc.js';
import { dLong, hm, timeToMin, minToTime, durLabel, waLink, iso, today } from '../lib/format.js';

export function rundownText(w, ev, items) {
  return [w.bride_name + ' & ' + w.groom_name + ' · ' + ev.name, dLong(ev.event_date) + (ev.location ? ' · ' + ev.location : ''), '',
    ...items.map(r => hm(r.start_time) + ' (' + r.duration_min + "') " + r.title + (r.pic ? ' — PIC ' + r.pic : '') + (r.location ? ' @ ' + r.location : '') + (r.needs ? '\n      Perlu: ' + r.needs : ''))].join('\n');
}

export default function Rundown() {
  const { data, canEdit, wid } = useW();
  const E = useEv();
  const toast = useToast();
  const w = data.wedding;
  const [edit, setEdit] = useState(null);
  const { ev, scope } = E;
  const evs = scope.parts.length ? (scope.part ? [scope.part] : scope.parts) : [ev];
  const items = data.rundown_items.filter(r => evs.some(e => e.id === r.event_id)).sort((a, b) => String(baseDate(data, a.event_id)).localeCompare(String(baseDate(data, b.event_id))) || timeToMin(a.start_time) - timeToMin(b.start_time) || a.sort - b.sort);
  const one = evs[0];
  const first = items[0];
  const last = items[items.length - 1];
  const span = first ? timeToMin(last.start_time) + Number(last.duration_min) - timeToMin(first.start_time) : 0;
  const pics = Array.from(new Set(items.flatMap(r => r.pic.split(/,/).map(x => x.trim())).filter(Boolean)));
  const needs = Array.from(new Set(items.flatMap(r => r.needs.split(/[,;]/).map(x => x.trim())).filter(Boolean)));
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const stateOf = (r) => {
    if (r.state === 'done') return 'done';
    if (r.state === 'live') return 'now';
    if (baseDate(data, r.event_id) === iso(today())) { const st = timeToMin(r.start_time); if (nowMin >= st + Number(r.duration_min)) return 'done'; if (nowMin >= st) return 'now'; }
    return '';
  };
  const contacts = pics.map(p => {
    const v = data.vendors.find(x => (x.contact_name && p.toLowerCase().includes(x.contact_name.toLowerCase())) || p.toLowerCase().includes(x.name.toLowerCase()) || (x.category && p.toLowerCase() === x.category.toLowerCase()));
    return { p, phone: v ? v.phone : '', sub: v ? v.name : '' };
  });
  const liveTarget = scope.part ? scope.part.id : ev.id;

  async function share() {
    const text = evs.map(e => rundownText(w, { ...e, name: e.id === ev.id ? ev.name : ev.name + ' · ' + e.name, event_date: baseDate(data, e.id) }, items.filter(r => r.event_id === e.id))).join('\n\n');
    if (navigator.share) { try { await navigator.share({ title: 'Rundown ' + ev.name, text }); return; } catch (e) { /* dibatalkan */ } }
    try { await navigator.clipboard.writeText(text); toast('Rundown disalin. Tempel di grup WA keluarga / WO.', 'ok'); }
    catch (e) { window.open(waLink('', text), '_blank'); }
  }
  const newSession = (eid) => setEdit({ _new: true, event_id: eid || one.id, start_time: last ? minToTime(timeToMin(last.start_time) + Number(last.duration_min)) : (one.start_time ? String(one.start_time).slice(0, 5) : '08:00'), duration_min: 30 });

  return (
    <>
      <EventHeader title="Rundown"
        actions={<div className="row noprint">
          <button type="button" className="btn2" onClick={() => window.print()}><Icon name="download" size={15} />Unduh PDF</button>
          <button type="button" className="btn2" onClick={share}><Icon name="share" size={15} />Bagikan</button>
          <a className="btn3" href={wpath(wid, 'live', { e: liveTarget })}><Icon name="live" size={15} />Mode hari H</a>
          {canEdit && <button type="button" className="btn" onClick={() => newSession()}><Icon name="plus" size={15} />Sesi</button>}
        </div>}
        partSub={(xs) => data.rundown_items.filter(r => xs.includes(r.event_id)).length + ' sesi'} />

      <section className="tiles">
        <Tile w="w1" icon="clock" k="Mulai" v={first ? hm(first.start_time) : '–'} sub={first ? first.title : 'Belum ada sesi'} />
        <Tile w="w2" icon={ev.icon || 'rings'} k={evs.length > 1 ? evs.length + ' bagian' : one.name} v={hm(one.start_time) || '–'} sub={ev.detail || one.location || ev.location || '–'} />
        <Tile w="w3" icon="pin" k="Lokasi" v={<span style={{ fontSize: 18 }}>{(one.location || ev.location || '–')}</span>} sub={dLong(baseDate(data, one.id))} />
        <Tile w="w4" icon="list" k="Total sesi" v={items.length} sub={durLabel(span) + ' · ' + pics.length + ' PIC'} />
      </section>

      <section className="split">
        <div className="g wide col">
          {evs.map(e => {
            const its = items.filter(r => r.event_id === e.id);
            return (
              <div key={e.id}>
                {evs.length > 1 && <div className="between" style={{ marginBottom: 6 }}><div className="h2">{e.name}</div><span className="xs muted">{dLong(baseDate(data, e.id))}{e.location ? ' · ' + e.location : ''}</span></div>}
                {its.length ? (
                  <div className="tl">
                    {its.map(r => {
                      const st = stateOf(r);
                      return (
                        <div className="ti" key={r.id}>
                          <div><div className="tt">{hm(r.start_time)}</div><div className="td">{r.duration_min} mnt</div></div>
                          <div className="rail"><span className={'dot' + (st ? ' ' + st : '')} /></div>
                          <button type="button" className={'ev' + (st === 'now' ? ' cur' : '')} onClick={() => setEdit(r)}>
                            <div className="between"><b style={{ fontSize: st === 'now' ? 15 : 14 }}>{r.title}</b>{st === 'now' && <Pill cls="p-rose">● Sedang berlangsung</Pill>}</div>
                            <div className="meta">{r.pic && <span>PIC <b>{r.pic}</b></span>}{r.location && <span>Lokasi <b>{r.location}</b></span>}{r.needs && <span>Perlu <b>{r.needs}</b></span>}</div>
                            {r.notes && <div className="xs" style={{ marginTop: 6, color: '#8E3B50', fontWeight: 600 }}>Catatan: {r.notes}</div>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : <Empty icon="clock" title="Rundown masih kosong" text="Tambah sesi pertama, misalnya kedatangan rombongan jam 10.00." action={canEdit && <button type="button" className="btn" onClick={() => newSession(e.id)}>+ Sesi</button>} />}
              </div>
            );
          })}
        </div>
        <aside className="narrow">
          <div className="g col" style={{ gap: 4 }}>
            <div className="h2">PIC &amp; kontak</div>
            {contacts.length ? contacts.map(c => (
              <div className="li" key={c.p}><Avatar name={c.p} /><div className="grow"><b>{c.p}</b>{c.sub && <div className="xs muted">{c.sub}</div>}</div>{c.phone && <a href={waLink(c.phone)} target="_blank" rel="noreferrer" className="pill p-ok" style={{ textDecoration: 'none' }}>WA</a>}</div>
            )) : <div className="xs muted">Isi PIC di setiap sesi.</div>}
            <div className="xs muted" style={{ marginTop: 6 }}>Nomor WA diambil dari buku kontak vendor bila nama kontaknya cocok.</div>
          </div>
          <div className="g col" style={{ background: 'linear-gradient(150deg, rgba(255,255,255,.8), rgba(252,224,203,.6))', gap: 8 }}>
            <div className="h2">Perlengkapan dibawa</div>
            <div className="xs muted">Ditarik dari kolom “Perlu” setiap sesi</div>
            <div className="row" style={{ gap: 6 }}>{needs.length ? needs.map(n => <span key={n} className="chip">{n}</span>) : <span className="xs muted">–</span>}</div>
            <a className="xs" href={epath(wid, ev.id, 'seserahan', { list: 'hari_h' })} style={{ fontWeight: 700, color: '#6B430F' }}>Daftar lengkap ada di Seserahan › Bawaan hari H</a>
          </div>
        </aside>
      </section>
      {edit && <SessionDrawer r={edit} events={evs} onClose={() => setEdit(null)} />}
    </>
  );
}

function SessionDrawer({ r, events, onClose }) {
  const { add, save, del, canEdit, people } = useW();
  const isNew = !!r._new;
  const [f, setF] = useState({ event_id: r.event_id, start_time: r.start_time ? String(r.start_time).slice(0, 5) : '08:00', duration_min: r.duration_min ?? 30, title: r.title || '', pic: r.pic || '', location: r.location || '', needs: r.needs || '', notes: r.notes || '' });
  const [err, setErr] = useState('');
  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }));
  async function submit() {
    if (!f.title.trim()) { setErr('Nama kegiatan wajib diisi.'); return; }
    if (!f.start_time) { setErr('Isi jam mulai.'); return; }
    const row = { ...f, title: f.title.trim(), duration_min: f.duration_min || 0 };
    onClose();
    if (isNew) await add('rundown_items', { ...row, sort: 999 }); else await save('rundown_items', r.id, row);
  }
  async function remove() {
    if (await confirm({ title: 'Hapus sesi?', text: '“' + r.title + '” akan dihapus dari rundown.', ok: 'Hapus', danger: true })) { onClose(); del('rundown_items', r.id); }
  }
  const end = minToTime(timeToMin(f.start_time) + Number(f.duration_min || 0));
  return (
    <Drawer open onClose={onClose} title={isNew ? 'Sesi baru' : 'Ubah sesi'} eyebrow="Rundown"
      footer={canEdit ? <>{!isNew && <button type="button" className="btn2" onClick={remove} style={{ marginRight: 'auto' }}><Icon name="trash" size={15} />Hapus</button>}<button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn" onClick={submit}>Simpan</button></> : null}>
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, display: 'contents' }}>
        <Field label="Kegiatan" error={err}><Text value={f.title} onChange={set('title')} placeholder="mis. Ijab kabul" /></Field>
        <div className="g2">
          <Field label="Jam mulai"><TimeIn value={f.start_time} onChange={set('start_time')} /></Field>
          <Field label="Durasi (menit)" hint={'selesai ' + hm(end)}><NumIn value={f.duration_min} onChange={set('duration_min')} step="5" /></Field>
        </div>
        {events.length > 1 && <Field label="Bagian dari"><Select value={f.event_id} onChange={set('event_id')} options={events.map(e => ({ value: e.id, label: e.name }))} /></Field>}
        <div className="g2">
          <Field label="PIC"><PersonPick value={f.pic} onChange={set('pic')} people={people} extra={['MC', 'MUA', 'WO', 'Keluarga', 'Penghulu & wali']} /></Field>
          <Field label="Lokasi"><Text value={f.location} onChange={set('location')} placeholder="Ruang rias, pelaminan…" /></Field>
        </div>
        <Field label="Perlu disiapkan" hint="pisahkan dengan koma"><Text value={f.needs} onChange={set('needs')} placeholder="Mahar, cincin, buku nikah" /></Field>
        <Field label="Catatan"><Area value={f.notes} onChange={set('notes')} rows={2} /></Field>
      </fieldset>
    </Drawer>
  );
}
