import React, { useEffect, useState } from 'react';
import { useW } from '../lib/store.jsx';
import { wpath } from '../lib/nav.js';
import { Icon, Pill, Empty } from '../components/ui.jsx';
import { hm, timeToMin, iso, today, dLong } from '../lib/format.js';

export default function RundownLive({ q }) {
  const { data, wid, save, canEdit } = useW();
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 20000); return () => clearInterval(t); }, []);

  const evs = data.events;
  const ev = evs.find(e => e.id === q.e) || evs.find(e => e.kind === 'akad') || evs[0];
  const group = ev ? evs.filter(e => e.event_date === ev.event_date && (e.id === ev.id || ((ev.kind === 'akad' || ev.kind === 'resepsi') && (e.kind === 'akad' || e.kind === 'resepsi')))) : [];
  const ids = new Set(group.map(e => e.id));
  const items = data.rundown_items.filter(r => ids.has(r.event_id)).sort((a, b) => timeToMin(a.start_time) - timeToMin(b.start_time) || a.sort - b.sort);
  const isToday = ev && ev.event_date === iso(today());
  const nowMin = now.getHours() * 60 + now.getMinutes();

  let idx = items.findIndex(r => r.state === 'live');
  if (idx < 0 && isToday) idx = items.findIndex(r => r.state !== 'done' && nowMin < timeToMin(r.start_time) + Number(r.duration_min));
  if (idx < 0) idx = items.findIndex(r => r.state !== 'done');
  const cur = idx >= 0 ? items[idx] : null;
  const next = idx >= 0 ? items.slice(idx + 1, idx + 4) : [];
  const started = cur && isToday ? Math.max(0, nowMin - timeToMin(cur.start_time)) : 0;
  const prog = cur && isToday ? Math.min(100, (started / Math.max(1, cur.duration_min)) * 100) : 0;
  const wo = data.vendors.find(v => /wo|wedding organizer/i.test(v.category + ' ' + v.name) && v.phone);

  async function advance() {
    if (!cur) return;
    await save('rundown_items', cur.id, { state: 'done' });
    const nx = items[idx + 1];
    if (nx) await save('rundown_items', nx.id, { state: 'live' });
  }
  async function reset() {
    for (const r of items) if (r.state !== 'todo') await save('rundown_items', r.id, { state: 'todo' });
  }

  return (
    <div className="full">
      <div className="between"><a className="btn2 sm" href={wpath(wid, 'rundown')}><Icon name="left" size={15} />Keluar</a><Pill cls="p-rose">● LIVE · Hari H</Pill></div>
      {!ev || !items.length ? <div className="g"><Empty icon="clock" title="Rundown belum ada" text="Isi rundown dulu di menu Rundown." /></div> : (
        <>
          <div className="xs muted" style={{ textAlign: 'center' }}>{dLong(ev.event_date)}{!isToday ? ' · pratinjau (bukan hari ini)' : ''}</div>
          {cur ? (
            <div className="livecard">
              <div style={{ fontSize: 12, fontWeight: 700, opacity: .85, letterSpacing: '.08em', textTransform: 'uppercase' }}>Sekarang · {hm(cur.start_time)}–{hm(minTo(timeToMin(cur.start_time) + Number(cur.duration_min)))}</div>
              <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 28, marginTop: 4 }}>{cur.title}</div>
              <div style={{ fontSize: 13, opacity: .92, marginTop: 4 }}>{[cur.pic, cur.location].filter(Boolean).join(' · ')}</div>
              {isToday && <>
                <div className="wbar" style={{ marginTop: 14 }}><i style={{ width: prog + '%' }} /></div>
                <div className="between" style={{ fontSize: 12, marginTop: 6, opacity: .9 }}><span>{started} menit berjalan</span><span>sisa {Math.max(0, cur.duration_min - started)} menit</span></div>
              </>}
              {cur.notes && <div style={{ fontSize: 12.5, marginTop: 10, background: 'rgba(255,255,255,.18)', borderRadius: 12, padding: '8px 10px' }}>{cur.notes}</div>}
            </div>
          ) : <div className="livecard sage"><div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 26 }}>Semua sesi selesai 🎉</div><div style={{ fontSize: 13, marginTop: 6 }}>Selamat menempuh hidup baru!</div></div>}
          {cur && cur.needs && (
            <div className="g col" style={{ padding: '12px 14px', gap: 6 }}>
              <div className="lbl">Perlu siap</div>
              <div className="row" style={{ gap: 6 }}>{cur.needs.split(/[,;]/).map(s => s.trim()).filter(Boolean).map(n => <span key={n} className="chip">{n}</span>)}</div>
            </div>
          )}
          {next.length > 0 && <div className="lbl" style={{ marginTop: 2 }}>Berikutnya</div>}
          {next.map((r, i) => (
            <div key={r.id} className="g" style={{ padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'center', opacity: 1 - i * 0.15 }}>
              <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 18, width: 56 }}>{hm(r.start_time)}</div>
              <div style={{ flex: 1, minWidth: 0 }}><b className="ell" style={{ display: 'block', fontSize: 13.5 }}>{r.title}</b><div className="xs muted">{[r.pic, r.duration_min + ' mnt'].filter(Boolean).join(' · ')}</div></div>
            </div>
          ))}
          <div className="g2" style={{ marginTop: 4 }}>
            {wo ? <a className="btn2" href={'tel:' + wo.phone}><Icon name="phone" size={15} />Telepon WO</a> : <a className="btn2" href={wpath(wid, 'rundown')}>Lihat semua</a>}
            {canEdit && cur && <button type="button" className="btn3" onClick={advance}>Selesai, lanjut ›</button>}
          </div>
          {canEdit && items.some(r => r.state !== 'todo') && <button type="button" className="lnk" style={{ alignSelf: 'center' }} onClick={reset}>Ulang dari awal</button>}
          <div className="xs muted" style={{ textAlign: 'center' }}>Tersambung langsung: HP lain yang membuka mode ini ikut berpindah.</div>
        </>
      )}
    </div>
  );
}
function minTo(m) { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
