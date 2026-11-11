import React, { useMemo, useState } from 'react';
import { useW } from '../lib/store.jsx';
import { epath } from '../lib/nav.js';
import { Drawer, Pill, Icon } from './ui.jsx';
import { costLines, summarize, purposeOf } from '../lib/calc.js';
import { topEvents, familyIds, personById, sideLabel, eventById } from '../lib/events.js';
import { rpShort, rp, pct, num } from '../lib/format.js';

/** Panel rincian pengeluaran: filter acara & penanggung. */
export default function Rincian({ initEv = 'all', initSide, initPerson, onClose }) {
  const { data, wid } = useW();
  const tops = topEvents(data);
  const [ev, setEv] = useState(initEv);
  const [who, setWho] = useState(initPerson ? 'p:' + initPerson : initSide ? 's:' + initSide : 'all');
  const ids = ev === 'all' ? tops.flatMap(e => familyIds(data, e.id)) : familyIds(data, ev);
  const lines = useMemo(() => costLines(data, ids), [data, ids.join()]);
  const S = summarize(lines, data);
  const match = (s) => {
    if (who === 'all') return true;
    if (who.startsWith('p:')) return s.p === who.slice(2);
    return (personById(data, s.p) || {}).side === who.slice(2);
  };
  const rows = lines.map(l => {
    const f = l.shares.filter(match).reduce((a, s) => a + s.pct, 0) / 100;
    return f > 0 ? { ...l, f, amt: l.planned * f, paidF: l.paid * f } : null;
  }).filter(Boolean);
  const tot = rows.reduce((s, r) => s + r.amt, 0);
  const paid = rows.reduce((s, r) => s + r.paidF, 0);
  const purpose = { vendor: 0, seserahan: 0, lainnya: 0 };
  rows.forEach(r => { purpose[purposeOf(r)] += r.amt; });
  const groups = [];
  rows.forEach(r => { let g = groups.find(x => x.key === r.group); if (!g) { g = { key: r.group, name: r.groupName, kind: r.kind, sort: r.groupSort, rows: [] }; groups.push(g); } g.rows.push(r); });
  groups.sort((a, b) => a.sort - b.sort);
  const evName = ev === 'all' ? 'Semua acara' : (eventById(data, ev) || {}).name;
  const whoName = who === 'all' ? 'Semua penanggung' : who.startsWith('p:') ? 'Ditanggung ' + ((personById(data, who.slice(2)) || {}).name || '') : 'Ditanggung ' + sideLabel(who.slice(2)).toLowerCase();
  const persons = Object.entries(S.person).map(([id, v]) => ({ id, p: personById(data, id), v })).filter(x => x.p && x.v.planned > 0).sort((a, b) => (a.p.side === b.p.side ? b.v.planned - a.v.planned : a.p.side === 'wanita' ? -1 : 1));
  const chips = [{ k: 'all', l: 'Semua · ' + rpShort(S.planned).replace('Rp', '') },
    ...['wanita', 'pria'].filter(sd => S.side[sd].planned > 0).map(sd => ({ k: 's:' + sd, l: sideLabel(sd) + ' · ' + rpShort(S.side[sd].planned).replace('Rp', '') })),
    ...persons.map(x => ({ k: 'p:' + x.id, l: x.p.name + ' · ' + rpShort(x.v.planned).replace('Rp', '') }))];
  const P = [['vendor', 'Vendor', 'f-v'], ['seserahan', 'Seserahan', 'f-s'], ['lainnya', 'Lainnya', 'f-l']].filter(x => purpose[x[0]] > 0);
  return (
    <Drawer open onClose={onClose} title={whoName} eyebrow={'Rincian pengeluaran · ' + evName}
      head={
        <>
          <div className="row" style={{ alignItems: 'baseline', gap: 10 }}><span className="bigm">{rpShort(tot)}</span>{who !== 'all' && <span className="sm muted">{pct(tot, S.planned)}% dari total {ev === 'all' ? 'semua acara' : 'acara'} {rpShort(S.planned)}</span>}</div>
          <div className="tabs" role="tablist">
            {[...tops.map(e => ({ k: e.id, l: e.name })), { k: 'all', l: 'Semua acara' }].map(t => <button type="button" key={t.k} className={'tab' + (ev === t.k ? ' on' : '')} onClick={() => setEv(t.k)}>{t.l}</button>)}
          </div>
          <div className="row chips">{chips.map(c => <button type="button" key={c.k} className={'chip' + (who === c.k ? ' on' : '')} onClick={() => setWho(c.k)}>{c.l}</button>)}</div>
        </>
      }
      footer={<><span className="xs muted" style={{ marginRight: 'auto' }}>{rows.length} item · dari Anggaran, Vendor &amp; Seserahan</span><button type="button" className="btn2" onClick={onClose}>Tutup</button>{ev !== 'all' && <a className="btn" href={epath(wid, ev, 'anggaran')} onClick={onClose}>Buka Anggaran acara</a>}</>}>
      <div className="tiles" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
        <div className="tile w1" style={{ padding: 12 }}><div className="tb"><div className="k">Rencana</div><div className="v" style={{ fontSize: 20 }}>{rpShort(tot)}</div></div></div>
        <div className="tile w3" style={{ padding: 12 }}><div className="tb"><div className="k">Sudah dibayar</div><div className="v" style={{ fontSize: 20 }}>{rpShort(paid)}</div></div></div>
        <div className="tile w2" style={{ padding: 12 }}><div className="tb"><div className="k">Belum dibayar</div><div className="v" style={{ fontSize: 20 }}>{rpShort(Math.max(0, tot - paid))}</div></div></div>
      </div>
      {tot > 0 && (
        <div className="col" style={{ gap: 6 }}>
          <div className="lbl">Untuk apa saja</div>
          <div className="bar l">{P.map(x => <i key={x[0]} className={x[2]} style={{ width: pct(purpose[x[0]], tot) + '%' }} />)}</div>
          <div className="row" style={{ gap: 14 }}>{P.map(x => <span key={x[0]} className="key"><i className={x[2]} />{x[1]} {rpShort(purpose[x[0]])} · {pct(purpose[x[0]], tot)}%</span>)}</div>
        </div>
      )}
      {groups.map(g => (
        <div key={g.key} className="col" style={{ gap: 0 }}>
          <div className="between" style={{ background: 'rgba(176,86,107,.06)', borderRadius: 12, padding: '8px 10px' }}>
            <b className="sm row nowrap" style={{ gap: 8 }}>{g.name}{g.kind === 'vendor' && <span className="auto"><Icon name="link" size={11} />dari menu Vendor</span>}{g.kind === 'seserahan' && <span className="auto"><Icon name="link" size={11} />dari menu Seserahan</span>}</b>
            <b className="sm">{rpShort(g.rows.reduce((s, r) => s + r.amt, 0))}</b>
          </div>
          {g.rows.map(r => {
            const pic = personById(data, r.pic_id);
            const sub = [pic ? 'PIC ' + pic.name : null,
              r.kind === 'vendor' ? (!r.vendor ? 'vendor belum dipilih' : r.deal !== null ? 'deal ' + rp(r.deal) : r.item.offer ? 'penawaran ' + rp(r.item.offer) : 'negosiasi') : r.kind === 'seserahan' ? r.n + ' barang' : null,
              r.f < 1 ? 'bagian ' + Math.round(r.f * 100) + '%' : null, ev === 'all' ? (eventById(data, r.event_id) || {}).name : null].filter(Boolean).join(' · ');
            return (
              <div key={r.key} className="li" style={{ padding: '10px 6px' }}>
                <div className="grow"><b className="ell" style={{ display: 'block' }}>{r.name}{r.vendor ? ' · ' + r.vendor.name : ''}</b><span className="xs muted">{sub}</span></div>
                <div style={{ textAlign: 'right' }}><b>{rpShort(r.amt)}</b><div className="xs muted">{r.paidF ? 'dibayar ' + rpShort(r.paidF) : r.status.key === 'belum_dipilih' ? 'rencana' : 'belum dibayar'}</div></div>
                <span style={{ width: 100, textAlign: 'right' }}><Pill cls={r.status.cls}>{r.status.label}</Pill></span>
              </div>
            );
          })}
        </div>
      ))}
      {!rows.length && <div className="muted">Tidak ada pengeluaran untuk pilihan ini.</div>}
    </Drawer>
  );
}
