import React, { useEffect, useState } from 'react';
import { useW } from '../lib/store.jsx';
import { epath } from '../lib/nav.js';
import { Icon } from './ui.jsx';
import { readiness } from '../lib/calc.js';
import { topEvents, familyIds, eventDateLabel, mainWhen, hMinus, hLabel, visibleMenus } from '../lib/events.js';
import { dDay, dMed } from '../lib/format.js';

const INK = { c0: '#7A2E44', c1: '#4A3275', c2: '#6B3A12', c3: '#2F5A43', c4: '#24476B', c5: '#215B50', c6: '#6A2D5B' };
const pad = (n) => String(n).padStart(2, '0');

/** Kartu hitung mundur "papan flip": acara utama terdekat + 3 acara utama. */
export default function Countdown() {
  const { data, wid } = useW();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const w = data.wedding;
  const evs = topEvents(data).map(e => ({ e, when: mainWhen(data, e) }))
    .sort((a, b) => (a.when ? a.when.at : Infinity) - (b.when ? b.when.at : Infinity) || a.e.sort - b.e.sort);
  const dated = evs.filter(x => x.when);
  const nextIdx = dated.findIndex(x => hMinus(now, x.when.date) >= 0);
  const next = nextIdx >= 0 ? dated[nextIdx] : null;
  const total = readiness(data, topEvents(data).flatMap(e => familyIds(data, e.id))).score;

  // tiga acara utama di sekitar acara terdekat
  const ni = next ? evs.indexOf(next) : evs.length;
  const start = Math.max(0, Math.min(ni, evs.length - 3));
  const three = evs.slice(start, start + 3);

  let days = 0, hh = 0, mm = 0, ss = 0, isH = false;
  if (next) {
    const hm = hMinus(now, next.when.date);
    isH = hm === 0;
    if (!isH) {
      const diff = Math.max(0, next.when.at - now);
      days = Math.floor(diff / 86400000); hh = Math.floor(diff / 3600000) % 24; mm = Math.floor(diff / 60000) % 60; ss = Math.floor(diff / 1000) % 60;
    }
  }
  const dd = pad(days).split('');
  const hs = pad(hh), ms = pad(mm), sx = pad(ss);
  const link = (e) => epath(wid, e.id, visibleMenus(e)[0] || 'persiapan');
  const ev = next && next.e;

  return (
    <section className="hb2" aria-label="Hitung mundur acara">
      <div className={'hb2in' + (dd.length > 2 ? ' d3' : '') + (next ? '' : ' done')}>
        <div className="hb-info">
          <div className="hb-top">
            {ev ? <span className="nx2"><span className={'acd ' + (ev.color || 'c0')}><Icon name={ev.icon || 'hati'} size={11} /></span>TERDEKAT · {ev.name.toUpperCase()}</span>
              : <span className="nx2" style={{ paddingLeft: 10 }}>SEMUA ACARA</span>}
            <span className="rdy"><span className="rs">Siap</span><span className="rl">Kesiapan</span> {total}%</span>
          </div>
          <div className="cpl2">{w.bride_name} &amp; {w.groom_name}</div>
          <div className="dt2">{next ? dDay(next.when.date) + ' ' + next.when.date.slice(0, 4) + ' · ' + next.when.time.replace(':', '.') + ' WIB · ' + hLabel(hMinus(now, next.when.date)) : 'Semua acara sudah terlaksana'}</div>
        </div>
        {next ? (
          <div className="hb-flip" role="timer" aria-label={isH ? 'Hari H ' + ev.name : 'Waktu menuju ' + ev.name}>
            <div className="fg"><div className="hb-fr">{dd.map((c, i) => <span key={i} className="fl2">{c}</span>)}</div><span className="fl-l">HARI</span></div>
            <div className="fg"><div className="hb-fr"><span className="fl2 s">{hs[0]}</span><span className="fl2 s">{hs[1]}</span></div><span className="fl-l">JAM</span></div>
            <div className="fg"><div className="hb-fr"><span className="fl2 s">{ms[0]}</span><span className="fl2 s">{ms[1]}</span></div><span className="fl-l">MENIT</span></div>
            <div className="fg"><div className="hb-fr"><span className="fl2 s">{sx[0]}</span><span className="fl2 s">{sx[1]}</span></div><span className="fl-l">DETIK</span></div>
          </div>
        ) : (
          <div className="hb-flip hb-done"><span>Semua acara sudah terlaksana 🎉</span></div>
        )}
        <div className="hb-ev">
          {three.map(({ e, when }) => {
            const on = next && e.id === next.e.id;
            const h = when ? hLabel(hMinus(now, when.date)) : '–';
            const siap = readiness(data, familyIds(data, e.id)).score;
            return (
              <a key={e.id} className={'ev2' + (on ? ' on' : '')} href={link(e)}>
                <span className={'acd ic ' + (e.color || 'c0')}><Icon name={e.icon || 'hati'} size={13} /></span>
                <span className="t"><b style={on ? { color: INK[e.color] || INK.c0 } : null}>{e.name}</b>
                  <span className="dl">{eventDateLabel(data, e)} · siap {siap}%</span>
                  <span className="ds">{when ? dMed(when.date) : 'Belum ada tanggal'}</span></span>
                <span className="h" style={on ? { color: INK[e.color] || INK.c0 } : null}>{h}</span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
