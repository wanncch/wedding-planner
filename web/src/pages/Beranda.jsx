import React, { useMemo } from 'react';
import { useW } from '../lib/store.jsx';
import { useAuth } from '../lib/store.jsx';
import { wpath } from '../lib/nav.js';
import { Icon, Tile, Bar, Avatars, Pill } from '../components/ui.jsx';
import SaveBadge from '../components/SaveBadge.jsx';
import { rpShort, rp, dLong, dShort, dDay, hm, daysBetween, today, greeting, pct, addDays } from '../lib/format.js';
import { readiness, budgetSummary, guestSummary, taskState, taskDue, PERIODS, periodOfTask, currentPeriod, vendorInfo, itemMoney } from '../lib/calc.js';

function Ring({ value }) {
  const r = 50, c = 2 * Math.PI * r;
  return (
    <svg className="ring" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform="rotate(-90 60 60)" />
      <text x="60" y="66" textAnchor="middle" fontFamily="Fraunces, serif" fontWeight="700" fontSize="30" fill="#fff">{value}</text>
    </svg>
  );
}

export default function Beranda() {
  const { data, wid, reload, people } = useW();
  const { profile } = useAuth();
  const w = data.wedding;
  const t0 = today();
  const left = daysBetween(t0, w.wedding_date);
  const ready = readiness(data);
  const b = budgetSummary(data);
  const gs = guestSummary(data.guests, w);
  const L = (menu, q) => wpath(wid, menu, q);

  const week = useMemo(() => {
    const out = [];
    const in7 = addDays(t0, 7), in14 = addDays(t0, 14);
    data.tasks.forEach(t => {
      const st = taskState(t, w);
      if (st.key === 'selesai' || st.key === 'batal') return;
      const due = taskDue(t, w);
      if (st.key === 'telat' || due <= in7) out.push({ k: 't' + t.id, sort: due, tag: st.key === 'telat' ? <Pill cls="p-bad">{st.label}</Pill> : <Pill cls="p-rose">Persiapan</Pill>, title: t.title, sub: dDay(due) + (t.pic ? ' · PIC ' + t.pic : ''), pic: t.pic, href: L('persiapan', { t: t.id }) });
    });
    data.payments.filter(p => !p.paid_on && p.due_date && new Date(p.due_date) <= in14).forEach(p => {
      const it = data.budget_items.find(i => i.id === p.item_id);
      out.push({ k: 'p' + p.id, sort: new Date(p.due_date), tag: <Pill cls="p-wait">Bayar</Pill>, title: (p.label || 'Pembayaran') + ' · ' + (it ? it.name : ''), sub: rp(p.amount) + ' · jatuh tempo ' + dDay(p.due_date), right: rpShort(p.amount), href: L('anggaran', { i: p.item_id }) });
    });
    data.reminders.filter(r => !r.done && r.due_date && new Date(r.due_date) <= in7).forEach(r => {
      out.push({ k: 'r' + r.id, sort: new Date(r.due_date), tag: <Pill cls="p-mauve">Reminder</Pill>, title: r.title, sub: dDay(r.due_date) + (r.detail ? ' · ' + r.detail : ''), pic: r.pic, href: L('catatan') });
    });
    const ordered = data.gift_items.filter(i => i.status === 'dipesan').length;
    if (ordered) out.push({ k: 'g', sort: addDays(t0, 30), tag: <Pill cls="p-ok">Seserahan</Pill>, title: ordered + ' barang masih dipesan', sub: 'Cek resi & tandai siap saat sampai', href: L('seserahan') });
    return out.sort((a, b2) => a.sort - b2.sort).slice(0, 8);
  }, [data, w]);

  const per = PERIODS.map(p => {
    const ts = data.tasks.filter(t => t.status !== 'batal' && periodOfTask(t, w).key === p.key);
    return { ...p, total: ts.length, done: ts.filter(t => t.status === 'selesai').length };
  }).filter(p => p.total);
  const cur = currentPeriod(w);

  const vstat = { belum: 0, nego: 0, deal: 0, lunas: 0 };
  data.vendors.forEach(v => { vstat[vendorInfo(v, data).stage]++; });

  const byCat = {};
  data.budget_items.forEach(it => { const m = itemMoney(it, data.payments); if (m.deal) { byCat[it.category_id] = (byCat[it.category_id] || 0) + m.deal; } });
  const top = Object.entries(byCat).map(([id, v]) => ({ name: (data.budget_categories.find(c => c.id === id) || {}).name, v })).sort((a, c) => c.v - a.v).slice(0, 4);
  const topMax = top[0] ? top[0].v : 1;

  const ev = data.events;
  const lam = ev.find(e => e.kind === 'lamaran');
  const akad = ev.find(e => e.kind === 'akad');
  const res = ev.find(e => e.kind === 'resepsi');
  const sp = data.selfprep;
  const spQ = sp.find(s => s.total > 0);

  return (
    <>
      <div className="top">
        <div><div className="eyb">{dLong(t0)} · {greeting()}, {profile ? profile.display_name : ''}</div><h1 className="h1">Beranda</h1></div>
        <div className="row hide-m"><SaveBadge /><button type="button" className="btn2" onClick={reload}><Icon name="refresh" size={15} />Muat ulang</button></div>
      </div>

      <section className="hero">
        <div className="between" style={{ alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
          <div className="col" style={{ gap: 10, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, opacity: .9 }}>{dLong(w.wedding_date)}</div>
            <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 30, lineHeight: 1.1 }}>{w.bride_name} &amp; {w.groom_name}</div>
            <div className="row" style={{ gap: 6 }}>
              {lam && <span className="chipw">Lamaran · {dShort(lam.event_date)}{daysBetween(t0, lam.event_date) >= 0 ? ' · ' + daysBetween(t0, lam.event_date) + ' hari' : ' · selesai'}</span>}
              {akad && <span className="chipw">{akad.name} {hm(akad.start_time)}{akad.location ? ' · ' + akad.location : ''}</span>}
              {res && <span className="chipw">Resepsi {hm(res.start_time)}{res.location ? ' · ' + res.location : ''}</span>}
            </div>
            <div className="row" style={{ alignItems: 'flex-end', gap: 8, marginTop: 6 }}>
              <span className="big">{Math.abs(left)}</span><span style={{ fontSize: 15, fontWeight: 600, paddingBottom: 6 }}>{left > 0 ? 'hari lagi' : left === 0 ? 'hari ini!' : 'hari sejak menikah'}</span>
            </div>
          </div>
          <div className="row nowrap" style={{ gap: 12 }}>
            <Ring value={ready.score} />
            <div style={{ fontSize: 12.5, lineHeight: 1.7 }}><b style={{ fontSize: 13 }}>Skor kesiapan</b><br />Persiapan {ready.persiapan}%<br />Dokumen {ready.dokumen}%<br />Seserahan {ready.seserahan}%</div>
          </div>
        </div>
      </section>

      <section className="tiles">
        <Tile w="w1" icon="wallet" k="Anggaran" v={rpShort(b.budget)} sub={'Rencana ' + rpShort(b.planned) + (b.planned > b.budget ? ' · lebih ' + rpShort(b.planned - b.budget) : ' · aman')} subStyle={b.planned > b.budget ? { color: '#8E3A30', fontWeight: 700 } : null} onClick={() => { location.hash = L('anggaran'); }} />
        <Tile w="w2" icon="card" k="Sudah dibayar" v={rpShort(b.paid)} sub={'dari kontrak ' + rpShort(b.deal)} onClick={() => { location.hash = L('anggaran'); }} />
        <Tile w="w3" icon="gift" k="Seserahan siap" v={b.gift.ready + ' / ' + b.gift.total} sub={rpShort(b.gift.bought) + ' dari ' + rpShort(b.gift.plan)} onClick={() => { location.hash = L('seserahan'); }} />
        <Tile w="w4" icon="users" k="Tamu konfirmasi hadir" v={gs.hadirPax + ' orang'} sub={'dari ' + gs.people + ' · ' + gs.belum + ' belum jawab'} onClick={() => { location.hash = L('tamu'); }} />
      </section>

      <section className="split">
        <div className="g wide">
          <div className="between"><div className="h2">Minggu ini</div><span className="xs muted">{dShort(t0)} – {dShort(addDays(t0, 6))}</span></div>
          {week.length ? week.map(x => (
            <a key={x.k} href={x.href} className="li click" style={{ textDecoration: 'none', color: 'inherit' }}>
              <span style={{ width: 92, flex: 'none' }}>{x.tag}</span>
              <span className="grow"><b className="ell" style={{ display: 'block' }}>{x.title}</b><span className="xs muted">{x.sub}</span></span>
              {x.right ? <b>{x.right}</b> : x.pic ? <Avatars names={x.pic} /> : null}
            </a>
          )) : <div className="muted" style={{ padding: '16px 4px' }}>Tidak ada tugas mendesak minggu ini. Santai sejenak ✦</div>}
          <div className="xs muted" style={{ marginTop: 8 }}>Tugas yang telat dari periode sebelumnya ikut muncul di sini.</div>
        </div>
        <div className="narrow">
          <div className="g col" style={{ gap: 8 }}>
            <div className="between"><div className="h2">Progres per periode</div><span className="xs muted">{ready.tDone} / {ready.tTotal} · {pct(ready.tDone, ready.tTotal)}%</span></div>
            {per.map(p => (
              <a key={p.key} href={L('persiapan', { p: p.key })} style={{ display: 'grid', gridTemplateColumns: '108px 1fr 44px', gap: 10, alignItems: 'center', fontSize: 12.5, textDecoration: 'none', color: 'inherit', fontWeight: p.key === cur.key ? 800 : 500 }}>
                <span>{p.label}</span><Bar value={pct(p.done, p.total)} cls={p.done === p.total ? 'fs' : 'fr'} /><span style={{ textAlign: 'right' }}>{p.done}/{p.total}</span>
              </a>
            ))}
          </div>
          <a className="g col" href={L('vendor')} style={{ gap: 8, textDecoration: 'none', color: 'inherit' }}>
            <div className="h2">Vendor</div>
            <div className="row" style={{ gap: 6 }}>
              <Pill cls="p-ok">{vstat.lunas} lunas</Pill><Pill cls="p-rose">{vstat.deal} deal</Pill><Pill cls="p-wait">{vstat.nego} negosiasi</Pill><Pill cls="p-no">{vstat.belum} belum order</Pill>
            </div>
          </a>
          {top.length > 0 && (
            <div className="g col" style={{ gap: 8 }}>
              <div className="h2">Pengeluaran terbesar</div>
              {top.map(t => (
                <div key={t.name} style={{ display: 'grid', gridTemplateColumns: '1fr 70px', gap: 4, fontSize: 12.5 }}>
                  <span className="ell">{t.name}</span><b style={{ textAlign: 'right' }}>{rpShort(t.v)}</b>
                  <Bar value={(t.v / topMax) * 100} cls="fp" style={{ gridColumn: '1 / -1' }} />
                </div>
              ))}
            </div>
          )}
          {sp.length > 0 && (
            <a className="g col" href={L('catatan', { tab: 'diri' })} style={{ gap: 6, textDecoration: 'none', color: 'inherit', background: 'linear-gradient(150deg, rgba(255,255,255,.82), rgba(233,214,229,.66))' }}>
              <div className="h2">Persiapan diri</div>
              <div style={{ fontSize: 13, lineHeight: 1.75 }}>
                {sp.slice(0, 3).map(s => <div key={s.id}>{s.done ? '✓' : '○'} {s.title}</div>)}
              </div>
              {spQ && <div className="xs muted">{spQ.progress} dari {spQ.total} {spQ.title.toLowerCase()} sudah dibahas</div>}
            </a>
          )}
        </div>
      </section>
    </>
  );
}
