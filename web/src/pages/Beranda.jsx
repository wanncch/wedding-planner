import React, { useMemo, useState } from 'react';
import { useW, useAuth } from '../lib/store.jsx';
import { wpath, epath } from '../lib/nav.js';
import { Icon, Pill, Seg, Avatar, useIsMobile } from '../components/ui.jsx';
import SaveBadge from '../components/SaveBadge.jsx';
import Rincian from '../components/Rincian.jsx';
import { PersonChip } from '../components/People.jsx';
import { rpShort, dLong, dShort, dDay, daysBetween, today, greeting, pct, addDays, toDate } from '../lib/format.js';
import { readiness, costLines, summarize, taskState, taskDue, upcomingBills, giftStats, invitesFor, inviteSummary } from '../lib/calc.js';
import { topEvents, partsOf, familyIds, eventDateLabel, personById, rootOf, sideLabel, baseDate, peopleSorted } from '../lib/events.js';

const TONE = { c0: 't0', c1: 't1', c2: 't2', c3: 't3', c4: 't4', c5: 't5', c6: 't6' };
const TA = (c) => 'ta' + String(c || 'c0').slice(1);

function Ring({ value, size = 118 }) {
  const r = 50, c = 2 * Math.PI * r;
  return (
    <svg className="ring" viewBox="0 0 120 120" aria-hidden="true" style={{ width: size, height: size }}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform="rotate(-90 60 60)" />
      <text x="60" y="70" textAnchor="middle" fontFamily="Fraunces, serif" fontWeight="700" fontSize="32" fill="#fff">{value}</text>
    </svg>
  );
}

export default function Beranda() {
  const { data, wid, reload, mine } = useW();
  const { profile } = useAuth();
  const mobile = useIsMobile();
  const [mode, setMode] = useState('semua');
  const [rinci, setRinci] = useState(null);
  const w = data.wedding;
  const t0 = today();
  const tops = topEvents(data);
  const L = (e, m, q) => epath(wid, e.id, m, q);
  const onlyMe = mode === 'punyaku';

  // tanggal tiap acara / bagian
  const stops = [];
  tops.forEach(e => { const ps = partsOf(data, e.id); (ps.length ? ps : [e]).forEach(p => stops.push({ e, p, date: baseDate(data, p.id), label: ps.length ? p.name : e.name })); });
  const upcoming = stops.filter(s => s.date && daysBetween(t0, s.date) >= 0).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const next = upcoming[0] || stops[stops.length - 1];
  const left = next ? daysBetween(t0, next.date) : 0;

  const allIds = tops.flatMap(e => familyIds(data, e.id));
  const lines = useMemo(() => costLines(data, allIds), [data]);
  const S = summarize(lines, data);
  const ready = readiness(data, allIds);
  const perEv = tops.map(e => { const ids = familyIds(data, e.id); const ls = lines.filter(l => ids.includes(l.event_id)); return { e, ids, ls, S: summarize(ls, data), r: readiness(data, ids), parts: partsOf(data, e.id) }; });
  const nParts = perEv.reduce((s, x) => s + x.parts.length, 0);

  const week = useMemo(() => {
    const out = [];
    const in7 = addDays(t0, 7), in14 = addDays(t0, 14);
    data.tasks.forEach(t => {
      const r = rootOf(data, t.event_id); if (!r || r.hidden) return;
      const st = taskState(t, data);
      if (st.key === 'selesai' || st.key === 'batal') return;
      if (onlyMe && !mine.includes(t.pic_id)) return;
      const due = taskDue(t, data);
      if (st.key === 'telat' || due <= in7) {
        const pic = personById(data, t.pic_id);
        out.push({ k: 't' + t.id, sort: due, ev: r, title: t.title, sub: 'Tugas · ' + (st.key === 'telat' ? 'lewat ' + st.late + ' hari (' + dShort(due) + ')' : dDay(due)) + (pic ? ' · PIC ' + pic.name : ''), right: st.key === 'telat' ? <Pill cls="p-bad">Telat</Pill> : pic ? <Avatar name={pic.name} side={pic.side} /> : null, href: L(r, 'persiapan', { t: t.id }) });
      }
    });
    data.reminders.forEach(x => {
      const r = rootOf(data, x.event_id); if (!r || r.hidden || x.done || !x.due_date || toDate(x.due_date) > in7) return;
      if (onlyMe && !mine.includes(x.pic_id)) return;
      const pic = personById(data, x.pic_id);
      out.push({ k: 'r' + x.id, sort: toDate(x.due_date), ev: r, title: x.title, sub: 'Reminder · ' + dDay(x.due_date) + (pic ? ' · PIC ' + pic.name : ''), right: pic ? <Avatar name={pic.name} side={pic.side} /> : null, href: L(r, 'catatan') });
    });
    upcomingBills(data, allIds, 14, onlyMe ? mine : null).forEach(b => {
      const r = rootOf(data, b.item.event_id);
      const payer = b.shares.length > 1 ? 'patungan' : (personById(data, b.shares[0] && b.shares[0].p) || {}).name;
      out.push({ k: 'p' + b.pay.id, sort: b.due, ev: r, title: (b.pay.label || 'Bayar') + ' ' + b.item.name.toLowerCase(), sub: 'Bayar · ' + dDay(b.due) + (payer ? ' · ditanggung ' + payer : ''), right: <b>{rpShort(b.amount)}</b>, href: b.item.source === 'vendor' ? L(r, 'vendor', { v: b.item.id }) : L(r, 'anggaran', { i: b.item.id }) });
    });
    return out.sort((a, b) => a.sort - b.sort).slice(0, 8);
  }, [data, mode]);

  const work = peopleSorted(data).filter(p => (p.can_pic || data.tasks.some(t => t.pic_id === p.id)) && (!onlyMe || mine.includes(p.id))).map(p => {
    const ts = data.tasks.filter(t => t.pic_id === p.id && t.status !== 'batal' && allIds.includes(t.event_id));
    const sts = ts.map(t => taskState(t, data).key);
    return { p, done: sts.filter(x => x === 'selesai').length, late: sts.filter(x => x === 'telat').length, open: sts.filter(x => x === 'belum' || x === 'proses').length, n: ts.length };
  }).filter(x => x.n).sort((a, b) => b.n - a.n).slice(0, 8);
  const wMax = Math.max(1, ...work.map(x => x.n));

  const bills = upcomingBills(data, allIds, 30, onlyMe ? mine : null);
  const billSides = ['wanita', 'pria', 'lainnya'].map(sd => {
    const rows = [];
    bills.forEach(b => b.shares.forEach(s => { const p = personById(data, s.p); if ((p ? p.side : 'lainnya') === sd && (!onlyMe || mine.includes(s.p))) rows.push({ b, amt: b.amount * s.pct / 100 }); }));
    return { sd, rows, tot: rows.reduce((a, r) => a + r.amt, 0) };
  }).filter(x => x.rows.length);

  const docs = data.documents.filter(d => d.status !== 'tidak_perlu');
  const docsOk = docs.filter(d => d.status === 'lengkap').length;
  const docsSoon = data.documents.filter(d => d.expires_on && daysBetween(t0, d.expires_on) <= 60).length;
  const main = tops.find(e => e.kind === 'akad') || tops[0];
  const allPax = data.guests.reduce((s, g) => s + Number(g.pax || 0), 0);
  const gAll = giftStats(data, allIds);
  const short = (n) => n.replace('Akad & Resepsi', 'Resepsi').replace('Balasan lamaran', 'Balasan');

  const sideBar = (SS, h = 'bar') => SS.planned > 0 ? <div className={h}><i className="f-p" style={{ width: pct(SS.side.pria.planned, SS.planned) + '%' }} /><i className="f-w" style={{ width: pct(SS.side.wanita.planned, SS.planned) + '%' }} /><i className="f-o" style={{ width: pct(SS.side.lainnya.planned, SS.planned) + '%' }} /></div> : <div className={h} />;
  const persons = (SS, sd) => Object.entries(SS.person).filter(([id]) => (personById(data, id) || {}).side === sd).sort((a, b) => b[1].planned - a[1].planned);

  return (
    <>
      <div className="top">
        <div className="hide-m"><div className="eyb">{dLong(t0)} · {greeting()}, {profile ? profile.display_name : ''}</div><h1 className="h1">Beranda</h1></div>
        <div className="row"><Seg value={mode} onChange={setMode} items={[{ key: 'semua', label: 'Semua' }, { key: 'punyaku', label: 'Punyaku' }]} /><span className="hide-m"><SaveBadge /></span><button type="button" className="btn2 hide-m" onClick={reload}><Icon name="refresh" size={15} />Muat ulang</button></div>
      </div>
      {onlyMe && !mine.length && <div className="note">Akunmu belum terhubung ke nama di daftar orang. Hubungkan di <a href={wpath(wid, 'pengaturan', { tab: 'orang' })}>Pengaturan › Orang &amp; pihak</a> supaya Punyaku bisa menyaring tugas dan tagihanmu.</div>}

      {mobile ? (
        <section className="hero v4" style={{ padding: 18 }}>
          <div className="between nowrap" style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, opacity: .92 }}>Acara terdekat · {next ? next.label : '–'}</div>
              <div className="row nowrap" style={{ alignItems: 'flex-end', gap: 8 }}><span className="big" style={{ fontSize: 44 }}>{Math.abs(left)}</span><span style={{ fontWeight: 600, paddingBottom: 6 }}>{left > 0 ? 'hari lagi' : left === 0 ? 'hari ini!' : 'hari lalu'}</span></div>
              <div className="xs" style={{ opacity: .9 }}>{next ? dDay(next.date) + ' ' + new Date(next.date).getFullYear() + (next.p.location ? ' · ' + next.p.location : '') : ''}</div>
            </div>
            <Ring value={ready.score} size={70} />
          </div>
        </section>
      ) : (<section className="hero v4">
        <div className="between" style={{ alignItems: 'flex-start', position: 'relative', zIndex: 1, gap: 16, flexWrap: mobile ? 'wrap' : 'nowrap' }}>
          <div className="col" style={{ gap: 8, minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, opacity: .92 }}>Acara terdekat · {next ? next.label + ', ' + dLong(next.date) : '–'}</div>
            <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: mobile ? 24 : 32, lineHeight: 1.1 }}>{w.bride_name} &amp; {w.groom_name}</div>
            <div className="row" style={{ alignItems: 'flex-end', gap: 10 }}><span className="big">{Math.abs(left)}</span><span style={{ fontSize: 15, fontWeight: 600, paddingBottom: 8 }}>{left > 0 ? 'hari lagi menuju ' + (next ? next.label.toLowerCase() : '') : left === 0 ? 'hari ini!' : 'hari sejak acara'}</span></div>
            {!mobile && <div className="row" style={{ gap: 8 }}>{stops.map(s => <a key={s.p.id} className="chipw" href={L(s.e, 'persiapan')}><span className={'dt ' + s.e.color} />{s.label} · {s.date ? dShort(s.date) : '–'}{s.date ? ' · ' + (daysBetween(t0, s.date) >= 0 ? daysBetween(t0, s.date) + ' hari' : 'selesai') : ''}</a>)}</div>}
          </div>
          <div className="row nowrap" style={{ gap: 14 }}>
            <Ring value={ready.score} size={mobile ? 72 : 118} />
            {!mobile && <div style={{ fontSize: 12.5, lineHeight: 1.75 }}><b style={{ fontSize: 13 }}>Skor kesiapan</b><br />{perEv.map(x => <span key={x.e.id}>{x.e.name} {x.r.score}%<br /></span>)}</div>}
          </div>
        </div>
      </section>)}

      {mobile ? (
        <section className="g col" style={{ gap: 8 }}>
          <div className="between"><span className="lbl">Resume anggaran</span><span className="xs muted">{tops.length} acara</span></div>
          <button type="button" className="bigm" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', color: 'inherit' }} onClick={() => setRinci({ ev: 'all' })}>{rpShort(S.planned)}</button>
          {sideBar(S, 'bar l')}
          <div className="between"><button type="button" className="pill pp" style={{ border: 0 }} onClick={() => setRinci({ ev: 'all', side: 'pria' })}>Pria {rpShort(S.side.pria.planned)}</button><button type="button" className="pill pw" style={{ border: 0 }} onClick={() => setRinci({ ev: 'all', side: 'wanita' })}>Wanita {rpShort(S.side.wanita.planned)}</button></div>
          <div className="xs muted">Dibayar {rpShort(S.paid)} ({pct(S.paid, S.planned)}%) · sisa {rpShort(S.planned - S.paid)}</div>
        </section>
      ) : <>
      <div className="between">
        <div><div className="h2" style={{ fontSize: 22 }}>Resume anggaran</div><div className="xs muted">Rencana biaya semua acara, siapa yang menanggung, dan untuk apa saja. Klik angka penanggung untuk melihat rinciannya.</div></div>
        <button type="button" className="btn2" onClick={() => setRinci({ ev: 'all' })}>Lihat semua rincian</button>
      </div>

      <section className="g col" style={{ gap: 14, background: 'linear-gradient(150deg,rgba(255,255,255,.75),rgba(252,236,226,.6))' }}>
        <div className="resume">
          <div><div className="lbl">Total semua acara</div><div className="bigm" style={{ fontSize: 34 }}>{rpShort(S.planned)}</div><div className="xs muted">{tops.length} acara · {nParts} bagian acara</div></div>
          {['pria', 'wanita'].map(sd => (
            <button type="button" key={sd} className="sidebox" style={{ border: 0, textAlign: 'left', cursor: 'pointer' }} onClick={() => setRinci({ ev: 'all', side: sd })}>
              <div className="between"><span className={'pill ' + (sd === 'pria' ? 'pp' : 'pw')}>{sideLabel(sd)}</span><b className="h3" style={{ fontFamily: 'var(--serif)', fontSize: 18 }}>{rpShort(S.side[sd].planned)}</b></div>
              {persons(S, sd).slice(0, 3).map(([id, v]) => <div key={id} className="between xs muted"><span>{(personById(data, id) || {}).name}</span><span>{rpShort(v.planned)}</span></div>)}
            </button>
          ))}
          <div><div className="lbl">Sudah dibayar</div><div className="bigm" style={{ fontSize: 26 }}>{rpShort(S.paid)}</div><div className="bar" style={{ margin: '6px 0' }}><i className="f-ok" style={{ width: pct(S.paid, S.planned) + '%' }} /></div><div className="xs muted">{pct(S.paid, S.planned)}% dari rencana · sisa {rpShort(S.planned - S.paid)}</div></div>
        </div>
        {sideBar(S, 'bar l')}
        <div className="row" style={{ gap: 16 }}><span className="key"><i className="f-p" />Pihak pria {pct(S.side.pria.planned, S.planned)}%</span><span className="key"><i className="f-w" />Pihak wanita {pct(S.side.wanita.planned, S.planned)}%</span>{S.side.lainnya.planned > 0 && <span className="key"><i className="f-o" />Lainnya {pct(S.side.lainnya.planned, S.planned)}%</span>}</div>
      </section>

      </>}
      <section className="acards">
        {perEv.map(({ e, ids, ls, S: ES, parts }) => {
          const d = baseDate(data, e.id);
          const dl = d ? daysBetween(t0, d) : null;
          const P = ES.purpose;
          return (
            <div key={e.id} className="g acard">
              <div className={'ah ' + (TONE[e.color] || 't0')}>
                <div className="between nowrap"><span className="row nowrap" style={{ gap: 10, minWidth: 0 }}><span className={'acd ' + e.color}><Icon name={e.icon} size={15} /></span><span style={{ minWidth: 0 }}><b className="lbl" style={{ color: 'inherit', display: 'block' }}>{e.name}</b><span className="xs" style={{ fontWeight: 700 }}>{eventDateLabel(data, e)}{e.location ? ' · ' + e.location : ''}</span></span></span>{dl !== null && <span className="pill" style={{ background: 'rgba(255,255,255,.75)' }}>{dl >= 0 ? dl + ' hari' : 'selesai'}</span>}</div>
                {mobile ? <a className="bigm" href={L(e, 'anggaran')} style={{ color: 'inherit', textDecoration: 'none', fontSize: 24, textAlign: 'right' }}>{rpShort(ES.planned)}</a> : <>
                <div className="xs muted" style={{ marginTop: 4 }}>Total rencana</div>
                <a className="bigm" href={L(e, 'anggaran')} style={{ color: 'inherit', textDecoration: 'none' }}>{rpShort(ES.planned)}</a>
                <div className="bar" style={{ background: 'rgba(255,255,255,.6)' }}><i className="f-ok" style={{ width: pct(ES.paid, ES.planned) + '%' }} /></div>
                <div className="xs" style={{ fontWeight: 600 }}>Dibayar {rpShort(ES.paid)} ({pct(ES.paid, ES.planned)}%) · sisa {rpShort(ES.planned - ES.paid)}</div></>}
              </div>
              <div className="abody">
                {parts.length > 0 && !mobile && <><div className="lbl">Per bagian acara</div>
                  {parts.map(p => { const PS = summarize(ls.filter(l => l.event_id === p.id), data); return (
                    <div key={p.id} className="col" style={{ gap: 4 }}>
                      <div className="between sm"><span><b>{p.name}</b>{p.event_date ? ' · ' + dShort(p.event_date) : ''}</span><b>{rpShort(PS.planned)}</b></div>
                      {sideBar(PS)}
                      <div className="xs muted">Pria {rpShort(PS.side.pria.planned)} · Wanita {rpShort(PS.side.wanita.planned)}</div>
                    </div>); })}</>}
                {parts.length > 0 && mobile && <div className="between sm">{parts.map(p => <span key={p.id}>{short(p.name)} <b>{rpShort(summarize(ls.filter(l => l.event_id === p.id), data).planned)}</b></span>)}</div>}
                {!mobile && <><div className="lbl">Ditanggung oleh</div>
                  {['pria', 'wanita', 'lainnya'].map(sd => { const ps = persons(ES, sd); if (!ps.length) return null; return (
                    <button type="button" key={sd} className="prow" onClick={() => setRinci({ ev: e.id, side: sd })}>
                      <span className="pr"><span className={'pill ' + (sd === 'pria' ? 'pp' : sd === 'wanita' ? 'pw' : 'po')}>{sideLabel(sd)}</span><span className="amt">{rpShort(ES.side[sd].planned)}</span><Icon name="right" size={14} /></span>
                      {ps.map(([id, v]) => <span key={id} className="pss"><span>{(personById(data, id) || {}).name}</span><span>{rpShort(v.planned)}</span></span>)}
                    </button>); })}</>}
                {sideBar(ES)}
                <div className="between xs" style={{ fontWeight: 700 }}><span style={{ color: '#24476B' }}>Pria {mobile ? rpShort(ES.side.pria.planned) : pct(ES.side.pria.planned, ES.planned) + '%'}</span><span style={{ color: '#7A2E44' }}>Wanita {mobile ? rpShort(ES.side.wanita.planned) : pct(ES.side.wanita.planned, ES.planned) + '%'}</span>{mobile && <button type="button" className="lnk" onClick={() => setRinci({ ev: e.id })}>Rincian ›</button>}</div>
                {!mobile && ES.planned > 0 && <><div className="lbl">Untuk apa</div>
                  <div className="bar l"><i className="f-v" style={{ width: pct(P.vendor, ES.planned) + '%' }} /><i className="f-s" style={{ width: pct(P.seserahan, ES.planned) + '%' }} /><i className="f-l" style={{ width: pct(P.lainnya, ES.planned) + '%' }} /></div>
                  <div className="row" style={{ gap: 12 }}>{P.vendor > 0 && <span className="key"><i className="f-v" />Vendor {rpShort(P.vendor)}</span>}{P.seserahan > 0 && <span className="key"><i className="f-s" />Seserahan {rpShort(P.seserahan)}</span>}{P.lainnya > 0 && <span className="key"><i className="f-l" />Lainnya {rpShort(P.lainnya)}</span>}</div></>}
              </div>
            </div>
          );
        })}
      </section>

      <section className="bero">
        <div className="g">
          <div className="between"><div className="h2">Minggu ini</div><span className="xs muted">{dShort(t0)} – {dShort(addDays(t0, 6))} · tagihan s.d. {dShort(addDays(t0, 14))} · {onlyMe ? 'punyaku' : 'semua acara'}</span></div>
          {week.length ? week.map(x => (
            <a key={x.k} href={x.href} className="li click" style={{ textDecoration: 'none', color: 'inherit' }}>
              <span style={{ width: 120, flex: 'none' }}><span className={'pill ' + TA(x.ev && x.ev.color)}>{x.ev ? short(x.ev.name) : ''}</span></span>
              <span className="grow"><b className="ell" style={{ display: 'block' }}>{x.title}</b><span className="xs muted">{x.sub}</span></span>
              {x.right}
            </a>
          )) : <div className="muted" style={{ padding: '16px 4px' }}>Tidak ada tugas, reminder, atau tagihan mendesak minggu ini.</div>}
        </div>
        <div className="col" style={{ gap: 16 }}>
          <div className="g col" style={{ gap: 10 }}>
            <div className="between"><div className="h2">Beban kerja per orang</div><span className="xs muted">semua acara</span></div>
            <div className="wl">
              {work.map(x => (
                <React.Fragment key={x.p.id}>
                  <span className="row nowrap" style={{ gap: 8, minWidth: 0 }}><Avatar name={x.p.name} side={x.p.side} /><span className="ell">{x.p.name}</span></span>
                  <div className="bar" style={{ width: (x.n / wMax) * 100 + '%' }}><i className="f-ok" style={{ width: pct(x.done, x.n) + '%' }} /><i className="f-wait" style={{ width: pct(x.open, x.n) + '%' }} /><i className="f-bad" style={{ width: pct(x.late, x.n) + '%' }} /></div>
                  <b className="xs" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{x.done} · {x.open}{x.late ? ' · ' + x.late + ' telat' : ''}</b>
                </React.Fragment>
              ))}
            </div>
            {!work.length && <div className="xs muted">Belum ada tugas dengan PIC.</div>}
            <div className="row" style={{ gap: 12 }}><span className="key"><i className="f-ok" />Selesai</span><span className="key"><i className="f-wait" />Proses</span><span className="key"><i className="f-bad" />Telat</span></div>
          </div>
          <div className="g col" style={{ gap: 8 }}>
            <div className="between"><div className="h2">Tagihan 30 hari ke depan</div><span className="xs muted">per penanggung</span></div>
            {billSides.map(x => (
              <div key={x.sd} className="col" style={{ gap: 3 }}>
                <div className="between"><span className={'pill ' + (x.sd === 'pria' ? 'pp' : x.sd === 'wanita' ? 'pw' : 'po')}>{sideLabel(x.sd)}</span><b>{rpShort(x.tot)}</b></div>
                {x.rows.map((r, i) => <div key={i} className="between xs"><span className="muted ell" style={{ maxWidth: '75%' }}>{(r.b.pay.label || 'Bayar') + ' ' + r.b.item.name.toLowerCase()} · {(rootOf(data, r.b.item.event_id) || {}).name} · {dShort(r.b.due)}</span><b>{rpShort(r.amt)}</b></div>)}
              </div>
            ))}
            {!billSides.length && <div className="xs muted">Tidak ada tagihan terjadwal 30 hari ke depan. Jadwalkan termin di detail item anggaran atau vendor.</div>}
          </div>
        </div>
      </section>

      <section className="kmini">
        {main && <a className="tile w4" href={L(main, 'dokumen')}><span className="bdg"><Icon name="file" size={20} stroke={2} /></span><div className="tb"><div className="k">Dokumen {w.religion === 'islam' ? 'KUA' : 'nikah'} lengkap</div><div className="v">{docsOk} / {docs.length}</div><div className="xs ts">{main.name}{docsSoon ? ' · ' + docsSoon + ' segera habis masa berlaku' : ''}</div></div></a>}
        <a className="tile w3" href={main ? L(main, 'tamu') : '#'}><span className="bdg"><Icon name="users" size={20} stroke={2} /></span><div className="tb"><div className="k">Buku tamu induk</div><div className="v">{allPax} orang</div><div className="xs ts">{tops.map(e => short(e.name) + ' ' + inviteSummary(invitesFor(data, familyIds(data, e.id))).people).join(' · ')}</div></div></a>
        <a className="tile w2" href={main ? L(main, 'seserahan') : '#'}><span className="bdg"><Icon name="gift" size={20} stroke={2} /></span><div className="tb"><div className="k">Seserahan siap</div><div className="v">{gAll.ready} / {gAll.total}</div><div className="xs ts">{tops.map(e => { const g = giftStats(data, familyIds(data, e.id)); return g.total ? short(e.name) + ' ' + g.ready + '/' + g.total : null; }).filter(Boolean).join(' · ')}</div></div></a>
      </section>
      {rinci && <Rincian initEv={rinci.ev} initSide={rinci.side} onClose={() => setRinci(null)} />}
    </>
  );
}
