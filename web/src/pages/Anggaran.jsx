import React, { useEffect, useMemo, useState } from 'react';
import { useW } from '../lib/store.jsx';
import { supabase } from '../lib/supabase.js';
import { epath } from '../lib/nav.js';
import { Icon, Chips, Pill, Tile, Bar, Drawer, Field, Text, Area, Money, Seg, Toggle, NumIn, confirm, Spinner, useIsMobile, Empty } from '../components/ui.jsx';
import FileField from '../components/FileField.jsx';
import { PersonSelect, PersonChip, SharesTag, PayerField, payerError, payerRow } from '../components/People.jsx';
import { ItemDetail } from '../components/Money.jsx';
import { useEv, EventHeader } from '../components/EventKit.jsx';
import Rincian from '../components/Rincian.jsx';
import { costLines, summarize, upcomingBills } from '../lib/calc.js';
import { personById, defaultPayer, sideLabel, baseDate } from '../lib/events.js';
import { rp, rpShort, num, dShort, pct } from '../lib/format.js';

const UNIT_LABEL = { paket: 'paket', porsi: 'porsi', undangan: 'undangan', persen: '%' };

export default function Anggaran({ q }) {
  const W = useW();
  const { data, canEdit, wid } = W;
  const E = useEv();
  const { ev, scope } = E;
  const mobile = useIsMobile();
  const [side, setSide] = useState('all');
  const [st, setSt] = useState('all');
  const [detail, setDetail] = useState(q.i || null);
  const [edit, setEdit] = useState(null);
  const [catalog, setCatalog] = useState(false);
  const [sim, setSim] = useState(false);
  const [rinci, setRinci] = useState(null);
  useEffect(() => { if (q.i) setDetail(q.i); }, [q.i]);

  const lines = useMemo(() => costLines(data, scope.ids), [data, scope.ids.join()]);
  const S = summarize(lines, data);
  const bills = upcomingBills(data, scope.ids, 120);
  const what = scope.part ? scope.part.name.toLowerCase() : ev.name.toLowerCase();

  const sideOf = (l) => { const ss = new Set(l.shares.map(s => (personById(data, s.p) || {}).side)); return ss; };
  const passSide = (l) => side === 'all' || sideOf(l).has(side);
  const passSt = (l) => {
    if (st === 'all') return true;
    if (st === 'pilih') return l.status.key === 'belum_dipilih';
    if (st === 'belum') return l.kind !== 'seserahan' && l.paid === 0 && l.status.key !== 'belum_dipilih';
    if (st === 'dp') return l.paid > 0 && l.status.key !== 'lunas';
    if (st === 'lunas') return l.status.key === 'lunas';
    return true;
  };
  const vis = lines.filter(l => passSide(l) && passSt(l));
  const groups = [];
  vis.forEach(l => { let g = groups.find(x => x.key === l.group); if (!g) { g = { key: l.group, name: l.groupName, sort: l.groupSort, kind: l.kind, rows: [] }; groups.push(g); } g.rows.push(l); });
  groups.sort((a, b) => a.sort - b.sort);
  const sum = (rows, k) => rows.reduce((s, r) => s + (r[k] || 0), 0);
  const nGroups = new Set(lines.map(l => l.group)).size;
  const people = (sd) => Object.entries(S.person).filter(([id]) => (personById(data, id) || {}).side === sd).map(([id, v]) => ({ p: personById(data, id), ...v })).sort((a, b) => b.planned - a.planned);
  const topNames = (sd) => people(sd).slice(0, 2).map(x => x.p.name).join(', ');

  function open(l) {
    if (l.kind === 'vendor') { location.hash = epath(wid, ev.id, 'vendor', { v: l.item.id }); return; }
    if (l.kind === 'seserahan') { location.hash = epath(wid, ev.id, 'seserahan', { c: l.cat.id }); return; }
    setDetail(l.item.id);
  }
  const newItem = () => setEdit({ _new: true, event_id: scope.target });

  return (
    <>
      <EventHeader title="Anggaran"
        actions={<>{canEdit && !mobile && <button type="button" className="btn2" onClick={() => setSim(true)}>Simulasi</button>}{canEdit && <button type="button" className="btn2" onClick={() => setCatalog(true)}>Tambah dari katalog</button>}{canEdit && !mobile && <button type="button" className="btn" onClick={newItem}><Icon name="plus" size={15} />Item</button>}</>}
        partSub={(xs, p) => (p && p.event_date ? dShort(p.event_date) + ' · ' : '') + rpShort(summarize(costLines(data, xs), data).planned)} />

      <section className="tiles ev-tiles">
        <Tile w="w4" icon="wallet" k={'Rencana ' + what} v={rpShort(S.planned)} sub={S.n + ' item · ' + nGroups + ' kelompok'} />
        <Tile w="w5" icon="users" k="Pihak pria" v={rpShort(S.side.pria.planned)} sub={(topNames('pria') || '–') + ' · ' + pct(S.side.pria.planned, S.planned) + '%'} onClick={() => setRinci({ side: 'pria' })} />
        <Tile w="w1" icon="users" k="Pihak wanita" v={rpShort(S.side.wanita.planned)} sub={(topNames('wanita') || '–') + ' · ' + pct(S.side.wanita.planned, S.planned) + '%'} onClick={() => setRinci({ side: 'wanita' })} />
        <Tile w="w3" icon="check" k="Sudah dibayar" v={rpShort(S.paid)} sub={'dari deal ' + rpShort(S.deal)} />
        <Tile w="w2 hide-m" icon="clock" k="Sisa tagihan" v={rpShort(S.remain)} sub={bills[0] ? 'berikutnya ' + dShort(bills[0].due) : 'belum ada jadwal'} />
      </section>

      <div className="between">
        <div className="row" style={{ gap: 8 }}><span className="lbl hide-m">Ditanggung</span><Chips value={side} onChange={setSide} items={[{ key: 'all', label: 'Semua' }, { key: 'pria', label: 'Pihak pria' }, { key: 'wanita', label: 'Pihak wanita' }]} /></div>
        <Chips value={st} onChange={(v) => setSt(x => (x === v ? 'all' : v))} items={[{ key: 'pilih', label: 'Belum dipilih' }, { key: 'belum', label: 'Belum bayar' }, { key: 'dp', label: 'DP' }, { key: 'lunas', label: 'Lunas' }]} />
      </div>

      <section className="split">
        <div className="g wide" style={{ padding: mobile ? '6px 14px 10px' : '14px 12px 8px' }}>
          {!lines.length ? <Empty icon="wallet" title="Belum ada biaya" text={'Tambah item atau vendor untuk ' + ev.name + '.'} action={canEdit && <button type="button" className="btn" onClick={newItem}>+ Item</button>} />
            : mobile ? (
              <div className="mlist">
                {groups.map(g => (
                  <React.Fragment key={g.key}>
                    <div className="mgrp"><span className="row nowrap" style={{ gap: 8 }}>{g.name}{g.kind !== 'manual' && <span className="auto">otomatis</span>}</span><span>{rpShort(sum(g.rows, 'planned'))}</span></div>
                    {g.rows.map(l => (
                      <button type="button" key={l.key} className="mrow" onClick={() => open(l)}>
                        <span style={{ minWidth: 0 }}><b className="ell" style={{ display: 'block' }}>{l.name}</b><span className="xs muted">{l.kind === 'vendor' ? (l.vendor ? l.vendor.name : 'Belum dipilih') : l.kind === 'seserahan' ? l.ready + '/' + l.n + ' siap' : <PersonChip id={l.pic_id} text={l.pic_text} dim />} · <SideName shares={l.shares} /></span></span>
                        <span className="r"><b>{rpShort(l.planned)}</b><Pill cls={l.status.cls}>{l.status.label}</Pill></span>
                      </button>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <div className="tw">
                <table className="t cmp">
                  <colgroup><col style={{ width: '21%' }} /><col style={{ width: '12%' }} /><col style={{ width: '14%' }} /><col style={{ width: '10%' }} /><col style={{ width: '10%' }} /><col style={{ width: '10%' }} /><col style={{ width: '10%' }} /><col style={{ width: '13%' }} /></colgroup>
                  <thead><tr><th>Item</th><th>PIC</th><th>Ditanggung</th><th className="n">Rencana</th><th className="n">Deal</th><th className="n">Dibayar</th><th className="n">Sisa</th><th>Status</th></tr></thead>
                  <tbody>
                    {groups.map(g => (
                      <React.Fragment key={g.key}>
                        <tr className="cat"><td colSpan={3}><span className="row nowrap" style={{ gap: 10 }}>{g.name}{g.kind === 'vendor' && <span className="auto"><Icon name="lock" size={11} />otomatis dari menu Vendor</span>}{g.kind === 'seserahan' && <span className="auto"><Icon name="lock" size={11} />otomatis dari menu Seserahan</span>}</span></td>
                          <td className="n">{num(sum(g.rows, 'planned'))}</td><td className="n">{num(sum(g.rows, 'deal'))}</td><td className="n">{num(sum(g.rows, 'paid'))}</td><td className="n">{g.kind === 'seserahan' ? '–' : num(sum(g.rows, 'remain'))}</td><td /></tr>
                        {g.rows.map(l => (
                          <tr key={l.key} className={'click' + (detail && l.item && detail === l.item.id ? ' sel' : '')} onClick={() => open(l)}>
                            <td><b>{l.name}</b><span className="cell-sub">{l.kind === 'vendor' ? (l.vendor ? l.vendor.name : 'Vendor belum dipilih') : l.kind === 'seserahan' ? l.n + ' barang · ' + l.ready + ' sudah siap' : l.item.detail}{scope.all && l.event_id !== ev.id ? ' · ' + ((data.events.find(e => e.id === l.event_id) || {}).name || '') : ''}</span></td>
                            <td><PersonChip id={l.pic_id} text={l.pic_text} /></td>
                            <td><SharesTag shares={l.shares} /></td>
                            <td className="n">{num(l.planned)}</td>
                            <td className="n">{l.deal === null ? '–' : num(l.deal)}</td>
                            <td className="n">{l.paid ? num(l.paid) : '–'}</td>
                            <td className="n">{l.remain === null ? '–' : num(l.remain)}</td>
                            <td><Pill cls={l.status.cls}>{l.status.label}</Pill></td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                  <tfoot><tr><td colSpan={3}>Total {what}</td><td className="n">{num(sum(vis, 'planned'))}</td><td className="n">{num(sum(vis, 'deal'))}</td><td className="n">{num(sum(vis, 'paid'))}</td><td className="n">{num(sum(vis, 'remain'))}</td><td /></tr></tfoot>
                </table>
              </div>
            )}
          {vis.length === 0 && lines.length > 0 && <div className="muted" style={{ padding: 16 }}>Tidak ada item untuk filter ini.</div>}
          {data.budget_items.some(i => scope.ids.includes(i.event_id) && i.is_wishlist) && <div className="xs muted" style={{ padding: '8px 6px' }}>Wishlist tidak ikut dijumlah.</div>}
        </div>
        {!mobile && (
          <aside className="narrow thin">
            <PayerPanel S={S} onPick={setRinci} />
            <PurposePanel S={S} />
            <div className="note vio row" style={{ gap: 8 }}><Icon name="lock" size={16} /><span>Biaya vendor dan seserahan diisi di menunya masing-masing, lalu muncul di sini otomatis. Barisnya terkunci supaya tidak tercatat dua kali.</span></div>
          </aside>
        )}
      </section>

      {mobile && canEdit && <button type="button" className="fab" onClick={newItem} aria-label="Tambah item"><Icon name="plus" size={24} /></button>}
      {detail && (() => {
        const it = data.budget_items.find(i => i.id === detail);
        if (!it) return null;
        return (
          <Drawer open onClose={() => setDetail(null)} title={it.name} eyebrow={'Anggaran · ' + ev.name}>
            <ItemDetail itemId={detail} onEdit={() => (it.source === 'vendor' ? (location.hash = epath(wid, ev.id, 'vendor', { v: it.id })) : setEdit(it))} />
          </Drawer>
        );
      })()}
      {edit && <ItemDrawer item={edit} onClose={() => setEdit(null)} onCreated={(id) => setDetail(id)} />}
      {catalog && <CatalogDrawer onClose={() => setCatalog(false)} />}
      {sim && <SimDrawer onClose={() => setSim(false)} lines={lines} />}
      {rinci && <Rincian initEv={ev.id} initSide={rinci.side} initPerson={rinci.person} onClose={() => setRinci(null)} />}
    </>
  );
}

function SideName({ shares }) {
  const { data } = useW();
  if (shares.length > 1) return <b style={{ color: '#4A3275' }}>Patungan</b>;
  const p = personById(data, shares[0] && shares[0].p);
  if (!p) return null;
  return <b style={{ color: p.side === 'pria' ? '#24476B' : p.side === 'wanita' ? '#7A2E44' : '#5E4A55' }}>{p.name.replace(/^Keluarga /, 'Kel. ')}</b>;
}

export function PayerPanel({ S, onPick }) {
  const { data } = useW();
  return (
    <div className="g col" style={{ gap: 10 }}>
      <div className="h2">Ditanggung oleh</div>
      {['pria', 'wanita', 'lainnya'].map(sd => {
        const ps = Object.entries(S.person).filter(([id]) => (personById(data, id) || {}).side === sd).sort((a, b) => b[1].planned - a[1].planned);
        if (!ps.length) return null;
        return (
          <button type="button" key={sd} className="prow" onClick={() => onPick({ side: sd })}>
            <span className="pr"><span className={'pill ' + (sd === 'pria' ? 'pp' : sd === 'wanita' ? 'pw' : 'po')}>{sideLabel(sd)}</span><span className="amt">{rpShort(S.side[sd].planned)}</span><Icon name="right" size={14} /></span>
            {ps.map(([id, v]) => <span key={id} className="pss"><span>{(personById(data, id) || {}).name}</span><span>{rpShort(v.planned)}</span></span>)}
          </button>
        );
      })}
      {S.planned > 0 && <div className="bar l"><i className="f-p" style={{ width: pct(S.side.pria.planned, S.planned) + '%' }} /><i className="f-w" style={{ width: pct(S.side.wanita.planned, S.planned) + '%' }} /><i className="f-o" style={{ width: pct(S.side.lainnya.planned, S.planned) + '%' }} /></div>}
    </div>
  );
}

export function PurposePanel({ S }) {
  const P = S.purpose;
  const rows = [['vendor', 'Vendor', 'f-v'], ['seserahan', 'Seserahan', 'f-s'], ['lainnya', 'Lainnya', 'f-l']].filter(r => P[r[0]] > 0);
  return (
    <div className="g col" style={{ gap: 10 }}>
      <div className="h2">Untuk apa</div>
      <div className="bar l">{rows.map(r => <i key={r[0]} className={r[2]} style={{ width: pct(P[r[0]], S.planned) + '%' }} />)}</div>
      <div className="mini">{rows.map(r => <React.Fragment key={r[0]}><span className="key"><i className={r[2]} />{r[1]}</span><b>{rpShort(P[r[0]])} · {pct(P[r[0]], S.planned)}%</b></React.Fragment>)}</div>
      {!rows.length && <div className="xs muted">Belum ada biaya.</div>}
    </div>
  );
}

/* ---------------- Item anggaran (bukan vendor / seserahan) ---------------- */
function ItemDrawer({ item, onClose, onCreated }) {
  const { data, add, save, del, canEdit } = useW();
  const E = useEv();
  const isNew = !!item._new;
  const cats = data.budget_categories.filter(c => c.kind !== 'seserahan').sort((a, b) => a.sort - b.sort);
  const evId = item.event_id || E.scope.target;
  const used = new Set(data.budget_items.filter(i => E.family.includes(i.event_id) && i.source !== 'vendor').map(i => i.category_id));
  const shownCats = cats.filter(c => used.has(c.id) || c.id === item.category_id);
  const blank = { name: '', detail: '', category_id: (shownCats[0] || cats[0] || {}).id, event_id: evId, pic_id: null, planned: null, deal: null, is_wishlist: false, inspo_url: '', contract_url: '', notes: '' };
  const [f, setF] = useState(isNew ? blank : { ...blank, ...item, detail: item.detail || '', notes: item.notes || '' });
  const [pay, setPay] = useState(isNew ? { payer_id: defaultPayer(data, evId), shares: [] } : { payer_id: item.payer_id || defaultPayer(data, item.event_id), shares: item.shares || [] });
  const [err, setErr] = useState({});
  const [newCat, setNewCat] = useState(null);
  const [allCats, setAllCats] = useState(false);
  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }));
  const evName = (id) => { const e = data.events.find(x => x.id === id); return e ? e.name : ''; };
  const payerDef = personById(data, defaultPayer(data, f.event_id));

  async function submit(again) {
    const er = {};
    if (!f.name.trim()) er.name = 'Nama item wajib diisi.';
    if (!f.pic_id) er.pic = 'Pilih PIC item ini.';
    const pe = payerError(pay); if (pe) er.pay = pe;
    if (newCat !== null && !newCat.trim()) er.cat = 'Isi nama kelompok baru.';
    setErr(er);
    if (Object.keys(er).length) return;
    let category_id = f.category_id;
    if (newCat !== null) { const c = await add('budget_categories', { name: newCat.trim(), kind: 'biasa', sort: data.budget_categories.length + 1 }); category_id = c.id; }
    const row = { name: f.name.trim(), detail: f.detail, category_id, event_id: f.event_id, pic_id: f.pic_id, planned: f.planned || 0, deal: f.deal, is_wishlist: f.is_wishlist, inspo_url: f.inspo_url, contract_url: f.contract_url, notes: f.notes, source: 'manual', ...payerRow(pay) };
    if (isNew) {
      const p = add('budget_items', { ...row, sort: 999 });
      if (again) { setF({ ...blank, category_id, pic_id: f.pic_id, event_id: f.event_id }); setNewCat(null); await p; return; }
      onClose(); const r = await p; if (r && onCreated) onCreated(r.id);
    } else { onClose(); await save('budget_items', item.id, row); }
  }
  async function remove() {
    if (await confirm({ title: 'Hapus item?', text: '“' + item.name + '” beserta catatan pembayarannya akan dihapus.', ok: 'Hapus', danger: true })) { onClose(); del('budget_items', item.id); }
  }
  const list = allCats ? cats : shownCats;
  return (
    <Drawer open onClose={onClose} title={isNew ? 'Item anggaran baru' : 'Ubah item'} eyebrow={E.ev.name + (E.scope.parts.length ? ' › ' + evName(f.event_id) : '')}
      footer={canEdit ? <>{!isNew && <button type="button" className="btn2" onClick={remove} style={{ marginRight: 'auto' }}><Icon name="trash" size={15} />Hapus</button>}<button type="button" className="btn2" onClick={onClose}>Batal</button>{isNew && <button type="button" className="btn2" onClick={() => submit(true)}>Simpan &amp; tambah lagi</button>}<button type="button" className="btn" onClick={() => submit(false)}>Simpan</button></> : null}>
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, display: 'contents' }}>
        <Field label="Nama item" hint="Wajib" error={err.name}><Text value={f.name} onChange={set('name')} placeholder="mis. Sewa mobil rombongan" /></Field>
        <Field div label="Kelompok" error={err.cat}>
          <div className="catg">
            {list.map(c => <button type="button" key={c.id} className={newCat === null && c.id === f.category_id ? 'on' : ''} onClick={() => { set('category_id')(c.id); setNewCat(null); }}>{c.name}</button>)}
            {!allCats && cats.length > list.length && <button type="button" className="add" onClick={() => setAllCats(true)}>Kelompok lain…</button>}
            {newCat === null ? <button type="button" className="add" onClick={() => setNewCat('')}>+ Kelompok baru</button>
              : <input className="inp" autoFocus style={{ width: 200, minHeight: 34, padding: '6px 10px' }} placeholder="Nama kelompok" value={newCat} onChange={(e) => setNewCat(e.target.value)} />}
          </div>
          <span className="xs muted" style={{ marginTop: 6 }}>Kelompok Vendor dan Seserahan terisi otomatis dari menunya.</span>
        </Field>
        {E.scope.parts.length > 0 && <Field label="Bagian acara"><Seg small value={f.event_id} onChange={set('event_id')} items={E.scope.parts.map(p => ({ key: p.id, label: p.name }))} /></Field>}
        <div className="g2">
          <Field label="Rencana biaya"><Money value={f.planned} onChange={set('planned')} /></Field>
          <Field div label="PIC" hint="Wajib" error={err.pic}><PersonSelect value={f.pic_id} onChange={set('pic_id')} invalid={!!err.pic} /></Field>
        </div>
        {!f.pic_id && item.pic && <div className="xs muted">PIC sebelumnya tertulis “{item.pic}”. Pilih ulang dari daftar.</div>}
        <Field div label="Ditanggung oleh · yang membayar" hint="Wajib" error={err.pay}>
          <PayerField value={pay} onChange={setPay} amount={f.deal ?? f.planned} invalid={!!err.pay}
            hint={payerDef ? 'Penanggung bawaan ' + evName(f.event_id) + ': ' + payerDef.name + '. Bisa diganti per item.' : ''} />
        </Field>
        <Field label="Harga deal" hint="isi setelah sepakat"><Money value={f.deal} onChange={set('deal')} placeholder="Rp –" /></Field>
        <Field label="Keterangan"><Text value={f.detail} onChange={set('detail')} placeholder="mis. 2 mobil · 25 orang" /></Field>
        <div className="row nowrap" style={{ gap: 12 }}><Toggle on={f.is_wishlist} onChange={set('is_wishlist')} /><div className="sm"><b>Wishlist</b><div className="xs muted">Kalau ada sisa budget. Tidak ikut dijumlah.</div></div></div>
        <Field label="Inspirasi"><FileField value={f.inspo_url} onChange={set('inspo_url')} folder="inspirasi" label="Foto inspirasi" hint="atau tempel link Pinterest / IG" image /></Field>
        <Field label="Kontrak / invoice"><FileField value={f.contract_url} onChange={set('contract_url')} folder="kontrak" label="Unggah kontrak (PDF/foto)" hint="atau link Drive" /></Field>
        <Field label="Catatan"><Area value={f.notes} onChange={set('notes')} rows={3} /></Field>
        {!isNew && <div className="xs muted">Pembayaran (DP, termin, pelunasan) dicatat di detail item.</div>}
      </fieldset>
    </Drawer>
  );
}

/* ---------------- Katalog harga ---------------- */
let catCache = null;
export function useCatalog() {
  const [cat, setCat] = useState(catCache);
  useEffect(() => { if (!catCache) supabase.from('tpl_catalog').select('*').order('sort').then(({ data }) => { catCache = data || []; setCat(catCache); }); }, []);
  return cat;
}
function unitQty(unit, w) {
  if (unit === 'porsi') return Math.round(w.target_invites * Number(w.portions_per_invite || 1.5));
  if (unit === 'undangan') return w.target_invites;
  return 1;
}
const tierPrice = (c, tier) => Number(tier === 'min' ? c.price_min : tier === 'prem' ? c.price_prem : c.price_std);
const kindOfCat = (c) => (!c.event_kind || c.event_kind === 'resepsi' ? 'akad' : c.event_kind);

function CatalogDrawer({ onClose }) {
  const { data, addMany, mine } = useW();
  const E = useEv();
  const w = data.wedding;
  const cat = useCatalog();
  const [tier, setTier] = useState(w.price_tier || 'std');
  const [pick, setPick] = useState({});
  const [onlyMine, setOnlyMine] = useState(true);
  const target = data.events.find(e => e.id === E.scope.target);
  const tk = target ? target.kind : 'akad';
  const have = new Set(data.budget_items.filter(i => E.family.includes(i.event_id)).map(i => i.catalog_code).filter(Boolean));
  const subtotal = costLines(data, E.family).reduce((s, l) => s + l.planned, 0);
  const est = (c) => c.unit === 'persen' ? Math.round(subtotal * tierPrice(c, tier) / 100) : tierPrice(c, tier) * unitQty(c.unit, w);
  const rows = (cat || []).filter(c => (c.religion === 'semua' || c.religion === w.religion) && (!onlyMine || kindOfCat(c) === tk || tk === 'lainnya'));
  const chosen = rows.filter(c => pick[c.code]);
  async function submit() {
    const payer = defaultPayer(data, E.scope.target);
    const pic = mine[0] || (data.people.find(p => p.kind === 'bride') || {}).id;
    const out = chosen.map(c => {
      const bc = data.budget_categories.find(x => x.name === c.category) || data.budget_categories[0];
      return { category_id: bc ? bc.id : null, event_id: E.scope.target, name: c.name, detail: c.detail, planned: est(c), catalog_code: c.code, sort: c.sort, source: c.is_vendor ? 'vendor' : 'manual', payer_id: payer, pic_id: pic, shares: [] };
    });
    onClose();
    await addMany('budget_items', out);
  }
  const groups = Array.from(new Set(rows.map(c => c.category)));
  return (
    <Drawer open onClose={onClose} title="Tambah dari katalog" eyebrow={E.ev.name + ' · harga perkiraan · ' + w.target_invites + ' undangan'} wide
      head={<div className="row"><Seg value={tier} onChange={setTier} items={[{ key: 'min', label: 'Hemat' }, { key: 'std', label: 'Standar' }, { key: 'prem', label: 'Premium' }]} /><label className="row nowrap sm" style={{ gap: 8 }}><input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} style={{ accentColor: '#B0566B' }} />Hanya yang cocok untuk {target ? target.name : 'acara ini'}</label></div>}
      footer={<><span className="sm muted" style={{ marginRight: 'auto' }}>{chosen.length} dipilih · {rp(chosen.reduce((s, c) => s + est(c), 0))}</span><button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn" disabled={!chosen.length} onClick={submit}>Tambahkan</button></>}>
      {!cat ? <Spinner /> : groups.map(g => (
        <div key={g}>
          <div className="lbl" style={{ marginBottom: 6 }}>{g}</div>
          {rows.filter(c => c.category === g).map(c => {
            const exists = have.has(c.code);
            return (
              <label key={c.code} className="li" style={{ cursor: exists ? 'default' : 'pointer', opacity: exists ? .55 : 1 }}>
                <input type="checkbox" disabled={exists} checked={!!pick[c.code]} onChange={(e) => setPick(p => ({ ...p, [c.code]: e.target.checked }))} style={{ width: 18, height: 18, accentColor: '#B0566B' }} />
                <span className="grow"><b>{c.name}</b>{c.is_vendor && <span className="pill p-sel" style={{ marginLeft: 6 }}>slot vendor</span>}<span className="cell-sub">{c.detail}</span></span>
                <span style={{ textAlign: 'right' }}><b>{rpShort(est(c))}</b><span className="xs muted" style={{ display: 'block' }}>{exists ? 'sudah ada' : c.unit === 'persen' ? tierPrice(c, tier) + '% subtotal' : rpShort(tierPrice(c, tier)) + ' / ' + UNIT_LABEL[c.unit]}</span></span>
              </label>
            );
          })}
        </div>
      ))}
      {cat && !rows.length && <div className="muted">Belum ada item katalog untuk acara ini. Hilangkan centang di atas untuk melihat semua.</div>}
    </Drawer>
  );
}

/* ---------------- Simulasi ---------------- */
function SimDrawer({ onClose, lines }) {
  const { data, save, canEdit } = useW();
  const E = useEv();
  const w = data.wedding;
  const cat = useCatalog();
  const [inv, setInv] = useState(w.target_invites);
  const [por, setPor] = useState(Number(w.portions_per_invite));
  const [tier, setTier] = useState(w.price_tier);
  if (!cat) return <Drawer open onClose={onClose} title="Simulasi"><Spinner /></Drawer>;
  const byCode = Object.fromEntries(cat.map(c => [c.code, c]));
  const ww = { ...w, target_invites: inv || 0, portions_per_invite: por || 1 };
  const items = lines.filter(l => l.item);
  const simOf = (it) => { const c = byCode[it.catalog_code]; return c && c.unit !== 'persen' ? tierPrice(c, tier) * unitQty(c.unit, ww) : Number(it.planned || 0); };
  const subtotal = items.filter(l => !(byCode[l.item.catalog_code] && byCode[l.item.catalog_code].unit === 'persen')).reduce((s, l) => s + simOf(l.item), 0);
  const sim = (it) => { const c = byCode[it.catalog_code]; return c && c.unit === 'persen' ? Math.round(subtotal * tierPrice(c, tier) / 100) : simOf(it); };
  const per = {};
  lines.forEach(l => { const g = per[l.groupName] || (per[l.groupName] = { now: 0, sim: 0 }); g.now += l.planned; g.sim += l.item ? sim(l.item) : l.planned; });
  const rows = Object.entries(per);
  const totNow = rows.reduce((s, [, x]) => s + x.now, 0);
  const totSim = rows.reduce((s, [, x]) => s + x.sim, 0);
  async function apply() {
    if (!(await confirm({ title: 'Terapkan simulasi?', text: 'Rencana item dari katalog di ' + E.ev.name + ' diganti angka simulasi, dan jumlah undangan jadi ' + inv + '. Item buatan sendiri tidak berubah.', ok: 'Terapkan' }))) return;
    onClose();
    await save('weddings', w.id, { target_invites: inv, portions_per_invite: por, price_tier: tier });
    for (const l of items) { const v = sim(l.item); if (l.item.catalog_code && v !== Number(l.item.planned)) await save('budget_items', l.item.id, { planned: v }); }
  }
  return (
    <Drawer open onClose={onClose} title="Bagaimana kalau…" eyebrow={'Simulasi · ' + E.ev.name} wide
      footer={<><span className="sm" style={{ marginRight: 'auto' }}>Total {rpShort(totNow)} → <b>{rpShort(totSim)}</b></span><button type="button" className="btn2" onClick={onClose}>Tutup</button>{canEdit && <button type="button" className="btn" onClick={apply}>Terapkan ke rencana</button>}</>}>
      <div className="g3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
        <Field label="Jumlah undangan"><NumIn value={inv} onChange={setInv} /></Field>
        <Field label="Porsi per undangan"><NumIn value={por} onChange={setPor} step="0.1" min={1} /></Field>
        <Field label="Level harga"><Seg small value={tier} onChange={setTier} items={[{ key: 'min', label: 'Hemat' }, { key: 'std', label: 'Standar' }, { key: 'prem', label: 'Premium' }]} /></Field>
      </div>
      <table className="t">
        <thead><tr><th>Kelompok</th><th className="n">Sekarang</th><th className="n">Simulasi</th><th className="n">Selisih</th></tr></thead>
        <tbody>{rows.map(([k, x]) => <tr key={k}><td>{k}</td><td className="n">{rpShort(x.now)}</td><td className="n"><b>{rpShort(x.sim)}</b></td><td className="n" style={{ color: x.sim > x.now ? '#8E3A30' : x.sim < x.now ? '#3F7457' : undefined }}>{x.sim === x.now ? '–' : (x.sim > x.now ? '+' : '') + rpShort(x.sim - x.now)}</td></tr>)}</tbody>
      </table>
      <Bar value={pct(totSim, w.total_budget)} cls={totSim > w.total_budget ? 'fr' : 'fs'} />
      <div className="xs muted">Porsi catering = undangan × porsi. Item buatan sendiri memakai angka rencananya.</div>
    </Drawer>
  );
}
