import React, { useEffect, useMemo, useState } from 'react';
import { useW } from '../lib/store.jsx';
import { supabase } from '../lib/supabase.js';
import { wpath } from '../lib/nav.js';
import { Icon, Tabs, Chips, Pill, Avatars, Tile, Bar, Drawer, Modal, Field, Text, Area, Money, Select, Seg, Toggle, DateIn, PersonPick, NumIn, confirm, Spinner, useIsMobile } from '../components/ui.jsx';
import FileField from '../components/FileField.jsx';
import { openFile, fileName } from '../lib/files.js';
import { itemMoney, itemStatus, budgetSummary } from '../lib/calc.js';
import { rp, rpShort, num, dMed, dShort, iso, today, pct } from '../lib/format.js';

const UNIT_LABEL = { paket: 'paket', porsi: 'porsi', undangan: 'undangan', persen: '%' };

export default function Anggaran({ q }) {
  const W = useW();
  const { data, canEdit, wid } = W;
  const w = data.wedding;
  const mobile = useIsMobile();
  const [tab, setTab] = useState('rincian');
  const [ev, setEv] = useState('all');
  const [st, setSt] = useState('all');
  const [selId, setSelId] = useState(q.i || null);
  const [edit, setEdit] = useState(null);
  const [catalog, setCatalog] = useState(false);
  const b = budgetSummary(data);

  useEffect(() => { if (q.i) setSelId(q.i); }, [q.i]);

  const rows = useMemo(() => data.budget_items.map(it => {
    const m = itemMoney(it, data.payments);
    return { ...it, _m: m, _s: itemStatus(it, m) };
  }), [data.budget_items, data.payments]);

  const passEv = (it) => ev === 'all' || (data.events.find(e => e.id === it.event_id) || {}).kind === ev;
  const passSt = (it) => {
    if (st === 'all') return true;
    if (st === 'belum') return !it.is_wishlist && it._m.paid === 0;
    if (st === 'dp') return it._m.paid > 0 && it._s.key !== 'lunas';
    if (st === 'lunas') return it._s.key === 'lunas';
    if (st === 'wish') return it.is_wishlist;
    return true;
  };
  const visible = rows.filter(it => passEv(it) && passSt(it));
  const sel = rows.find(r => r.id === selId) || null;
  const evChips = [{ key: 'all', label: 'Semua acara' }, ...data.events.map(e => ({ key: e.kind, label: e.kind === 'akad' ? (w.religion === 'islam' ? 'Akad' : 'Pemberkatan') : e.name }))]
    .filter((x, i, a) => a.findIndex(y => y.key === x.key) === i);

  return (
    <>
      <div className="top">
        <div><div className="eyb">Satu baris = rencana, harga deal, pembayaran, dan sisa</div><h1 className="h1">Anggaran</h1></div>
        <div className="row">
          <Tabs value={tab} onChange={setTab} items={[{ key: 'rincian', label: 'Rincian' }, { key: 'simulasi', label: 'Simulasi' }]} />
          {canEdit && <button type="button" className="btn2" onClick={() => setCatalog(true)}>Tambah dari katalog</button>}
          {canEdit && <button type="button" className="btn" onClick={() => setEdit({ _new: true })}><Icon name="plus" size={15} />Item</button>}
        </div>
      </div>

      <section className="tiles">
        <Tile w="w1" icon="wallet" k="Anggaran" v={rpShort(b.budget)} />
        <Tile w="w2" icon="list" k="Rencana" v={rpShort(b.planned)} sub={b.planned > b.budget ? 'Lebih ' + rpShort(b.planned - b.budget) : 'Sisa ' + rpShort(b.budget - b.planned)} subStyle={b.planned > b.budget ? { color: '#8E3A30', fontWeight: 700 } : null} />
        <Tile w="w3" icon="check" k="Aktual (deal)" v={rpShort(b.deal)} />
        <Tile w="w4" icon="card" k="Sudah dibayar" v={rpShort(b.paid)} sub={pct(b.paid, b.deal) + '% dari deal'} />
        <Tile w="w1" icon="clock" k="Sisa tagihan" v={<span style={{ color: '#8A5414' }}>{rpShort(b.owed)}</span>} />
        <Tile w="w2" icon="chart" k="Sisa anggaran" v={<span style={{ color: b.left < 0 ? '#8E3A30' : '#3F7457' }}>{rpShort(b.left)}</span>} sub="anggaran − deal" />
      </section>

      {tab === 'simulasi' ? <Simulasi rows={rows} /> : (
        <>
          <div className="between">
            <Chips value={ev} onChange={setEv} items={evChips} />
            <Chips value={st} onChange={setSt} items={[{ key: 'all', label: 'Semua' }, { key: 'belum', label: 'Belum bayar' }, { key: 'dp', label: 'DP' }, { key: 'lunas', label: 'Lunas' }, { key: 'wish', label: 'Wishlist' }]} />
          </div>
          <section className="split">
            <div className="g wide" style={{ padding: '14px 12px 8px' }}>
              <div className="tw">
                <table className="t stack">
                  <thead><tr><th>Item</th><th>PIC</th><th className="n">Rencana</th><th className="n">Deal</th><th className="n">Dibayar</th><th className="n">Sisa</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.budget_categories.map(c => {
                      if (c.kind === 'seserahan') {
                        if (ev !== 'all' || !['all', 'dp'].includes(st)) return null;
                        return (
                          <tr key={c.id} className="cat click" onClick={() => { location.hash = wpath(wid, 'seserahan'); }}>
                            <td colSpan={2}>{c.name} <span className="xs muted" style={{ fontWeight: 600 }}>› dari menu Seserahan</span></td>
                            <td className="n">{rpShort(b.gift.plan)}</td><td className="n">{rpShort(b.gift.bought)}</td><td className="n">{rpShort(b.gift.bought)}</td><td className="n">–</td>
                            <td><Pill cls="p-rose">{b.gift.ready}/{b.gift.total} siap</Pill></td>
                          </tr>
                        );
                      }
                      const its = visible.filter(it => it.category_id === c.id);
                      if (!its.length) return null;
                      const sum = (f) => its.filter(i => !i.is_wishlist).reduce((s, i) => s + f(i), 0);
                      return (
                        <React.Fragment key={c.id}>
                          <tr className="cat"><td colSpan={2}>{c.name}</td><td className="n">{rpShort(sum(i => Number(i.planned)))}</td><td className="n mhide">{rpShort(sum(i => i._m.deal || 0))}</td><td className="n mhide">{rpShort(sum(i => i._m.paid))}</td><td className="n mhide">{rpShort(sum(i => i._m.remain || 0))}</td><td className="mhide" /></tr>
                          {its.map(it => (
                            <tr key={it.id} className={'click' + (it.is_wishlist ? ' wish' : '') + (selId === it.id ? ' sel' : '')} onClick={() => setSelId(it.id)}>
                              <td style={{ minWidth: 190 }}><b>{it.name}</b><span className="cell-sub">{Array.from(new Set([vendorName(data, it), it.detail].filter(Boolean))).join(' · ')}{it.inspo_url ? ' · 🔗 inspirasi' : ''}</span></td>
                              <td className="mhide"><Avatars names={it.pic} /></td>
                              <td className="n">{num(it.planned)}</td>
                              <td className="n mhide">{it._m.deal === null ? '–' : num(it._m.deal)}</td>
                              <td className="n mhide">{it._m.paid ? num(it._m.paid) : '–'}</td>
                              <td className="n mhide">{it._m.remain === null ? '–' : num(it._m.remain)}</td>
                              <td><Pill cls={it._s.cls}>{it._s.label}</Pill></td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {visible.length === 0 && <div className="muted" style={{ padding: 16 }}>Tidak ada item untuk filter ini.</div>}
              <div className="xs muted" style={{ padding: '8px 6px' }}>Mahar &amp; seserahan dihitung otomatis dari menu Seserahan. Wishlist tidak ikut dijumlah.</div>
            </div>
            {!mobile && (
              <aside className="narrow">
                {sel ? <ItemDetail item={sel} onEdit={() => setEdit(sel)} /> : (
                  <div className="g col" style={{ alignItems: 'center', textAlign: 'center', padding: 28 }}>
                    <span className="ico"><Icon name="wallet" /></span>
                    <b>Pilih item</b><div className="xs muted">Detail pembayaran, termin, kontrak, dan catatan muncul di sini.</div>
                  </div>
                )}
              </aside>
            )}
          </section>
        </>
      )}

      {mobile && sel && (
        <Drawer open onClose={() => setSelId(null)} title={sel.name} eyebrow="Detail item">
          <ItemDetail item={sel} onEdit={() => setEdit(sel)} bare />
        </Drawer>
      )}
      {edit && <ItemDrawer item={edit} onClose={() => setEdit(null)} onCreated={(id) => setSelId(id)} />}
      {catalog && <CatalogDrawer onClose={() => setCatalog(false)} />}
    </>
  );
}

function vendorName(data, it) { const v = data.vendors.find(x => x.id === it.vendor_id); return v ? v.name : ''; }

function ItemDetail({ item, onEdit, bare }) {
  const { data, canEdit, save, del } = useW();
  const [pay, setPay] = useState(null);
  const m = item._m;
  const cat = data.budget_categories.find(c => c.id === item.category_id);
  const evt = data.events.find(e => e.id === item.event_id);
  const vendor = data.vendors.find(v => v.id === item.vendor_id);
  const pays = [...m.payments].sort((a, b) => String(a.paid_on || a.due_date || '9').localeCompare(String(b.paid_on || b.due_date || '9')));
  const body = (
    <>
      <div className="between"><Pill cls={item._s.cls}>{item._s.label}</Pill><span className="xs muted">{cat ? cat.name : ''}{evt ? ' · ' + evt.name : ''}</span></div>
      {!bare && <div><div className="h2">{item.name}</div>{(vendor || item.detail) && <div className="xs muted">{[vendor && vendor.name, vendor && vendor.phone, item.detail].filter(Boolean).join(' · ')}</div>}</div>}
      {bare && (vendor || item.detail) && <div className="xs muted">{[vendor && vendor.name, vendor && vendor.phone, item.detail].filter(Boolean).join(' · ')}</div>}
      <div className="g2" style={{ gap: 8 }}>
        <div><div className="k">Rencana</div><b>{rp(item.planned)}</b></div>
        <div><div className="k">Harga deal</div><b>{m.deal === null ? '–' : rp(m.deal)}</b></div>
      </div>
      {m.deal !== null && (
        <>
          <div className="between"><span className="k">Dibayar {rpShort(m.paid)} dari {rpShort(m.deal)}</span><b>{pct(m.paid, m.deal)}%</b></div>
          <Bar value={pct(m.paid, m.deal)} cls="fd" />
        </>
      )}
      <div>
        {pays.map(p => (
          <button type="button" key={p.id} className="pay" style={{ width: '100%', background: 'none', border: 0, textAlign: 'left', borderBottom: '1px dashed rgba(176,86,107,.15)' }} onClick={() => canEdit && setPay(p)}>
            <span className={'dotc' + (p.paid_on ? ' on' : '')} />
            <span style={{ flex: 1 }}><b>{p.label}</b><span className="xs muted" style={{ display: 'block' }}>{p.paid_on ? 'Dibayar ' + dShort(p.paid_on) + (p.method ? ' · ' + p.method.toLowerCase() : '') + (p.proof_url ? ' · bukti ✓' : '') : p.due_date ? 'Jatuh tempo ' + dMed(p.due_date) : 'Belum dijadwalkan'}</span></span>
            <b>{rpShort(p.amount)}</b>
          </button>
        ))}
        {!pays.length && <div className="xs muted">Belum ada pembayaran atau jadwal termin.</div>}
      </div>
      {canEdit && <div className="row"><button type="button" className="btn" onClick={() => setPay({ _new: true })} style={{ flex: 1 }}>Catat pembayaran</button><button type="button" className="btn2" onClick={onEdit}><Icon name="edit" size={15} />Ubah</button></div>}
      {item.notes && <div className="sm" style={{ lineHeight: 1.55 }}><b>Catatan</b><br />{item.notes}</div>}
      <div className="row xs" style={{ gap: 6 }}>
        {item.inspo_url && <button type="button" className="pill p-rose" style={{ border: 0 }} onClick={() => openFile(item.inspo_url)}>🔗 Inspirasi</button>}
        {item.contract_url && <button type="button" className="pill p-no" style={{ border: 0 }} onClick={() => openFile(item.contract_url)}>📎 {fileName(item.contract_url) || 'Kontrak'}</button>}
      </div>
      {pay && <PaymentModal item={item} pay={pay} onClose={() => setPay(null)} />}
    </>
  );
  if (bare) return <div className="col">{body}</div>;
  return <div className="g col" style={{ position: 'sticky', top: 16 }}>{body}</div>;
}

function PaymentModal({ item, pay, onClose }) {
  const { add, save, del } = useW();
  const isNew = !!pay._new;
  const m = item._m;
  const [f, setF] = useState({
    label: pay.label || (m.paid === 0 && !m.payments.length ? 'DP' : m.remain && m.payments.filter(p => !p.paid_on).length === 0 ? 'Pelunasan' : 'Termin'),
    amount: pay.amount ?? (m.remain || null), done: isNew ? true : !!pay.paid_on,
    paid_on: pay.paid_on || iso(today()), due_date: pay.due_date || '', method: pay.method || 'Transfer', proof_url: pay.proof_url || '', note: pay.note || '',
  });
  const [err, setErr] = useState('');
  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }));
  async function submit() {
    if (!f.amount || f.amount <= 0) { setErr('Isi nominal pembayaran.'); return; }
    if (!f.done && !f.due_date) { setErr('Isi tanggal jatuh tempo.'); return; }
    const row = { label: f.label || 'Pembayaran', amount: f.amount, paid_on: f.done ? f.paid_on : null, due_date: f.due_date || null, method: f.done ? f.method : '', proof_url: f.proof_url, note: f.note };
    onClose();
    if (isNew) await add('payments', { ...row, item_id: item.id, sort: m.payments.length + 1 });
    else await save('payments', pay.id, row);
  }
  async function remove() {
    if (await confirm({ title: 'Hapus pembayaran?', text: f.label + ' ' + rp(f.amount) + ' akan dihapus.', ok: 'Hapus', danger: true })) { onClose(); del('payments', pay.id); }
  }
  return (
    <Modal open onClose={onClose} title={isNew ? 'Catat pembayaran' : 'Ubah pembayaran'}
      footer={<>{!isNew && <button type="button" className="btn2" onClick={remove} style={{ marginRight: 'auto' }}><Icon name="trash" size={15} /></button>}<button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn" onClick={submit}>Simpan</button></>}>
      <div className="xs muted">{item.name}{m.deal !== null ? ' · sisa ' + rp(m.remain) : ''}</div>
      <Field label="Jenis"><Seg small value={f.label} onChange={set('label')} items={['DP', 'Termin', 'Pelunasan', 'Lainnya'].map(x => ({ key: x, label: x }))} /></Field>
      <Field label="Nominal" error={err}><Money value={f.amount} onChange={set('amount')} /></Field>
      <Field label="Status"><Seg value={f.done ? 'y' : 'n'} onChange={(v) => set('done')(v === 'y')} items={[{ key: 'y', label: 'Sudah dibayar', cls: 's-ok' }, { key: 'n', label: 'Jadwalkan', cls: 's-wait' }]} /></Field>
      {f.done ? (
        <div className="g2">
          <Field label="Tanggal bayar"><DateIn value={f.paid_on} onChange={set('paid_on')} /></Field>
          <Field label="Metode"><Select value={f.method} onChange={set('method')} options={['Transfer', 'Tunai', 'QRIS', 'Kartu', 'Lainnya']} /></Field>
        </div>
      ) : <Field label="Jatuh tempo"><DateIn value={f.due_date} onChange={set('due_date')} /></Field>}
      {f.done && <Field label="Bukti bayar"><FileField value={f.proof_url} onChange={set('proof_url')} folder="bukti" label="Unggah bukti transfer" image /></Field>}
      <Field label="Catatan"><Text value={f.note} onChange={set('note')} /></Field>
    </Modal>
  );
}

function ItemDrawer({ item, onClose, onCreated }) {
  const { data, add, save, del, canEdit, people } = useW();
  const isNew = !!item._new;
  const cats = data.budget_categories.filter(c => c.kind !== 'seserahan');
  const [f, setF] = useState({
    name: item.name || '', detail: item.detail || '', category_id: item.category_id || (cats[0] && cats[0].id), event_id: item.event_id || '',
    vendor_id: item.vendor_id || '', pic: item.pic || '', planned: item.planned ?? null, deal: item.deal ?? null,
    is_wishlist: !!item.is_wishlist, inspo_url: item.inspo_url || '', contract_url: item.contract_url || '', notes: item.notes || '',
  });
  const [err, setErr] = useState('');
  const [newCat, setNewCat] = useState('');
  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }));
  async function submit() {
    if (!f.name.trim()) { setErr('Nama item wajib diisi.'); return; }
    let category_id = f.category_id;
    if (category_id === '__new') {
      if (!newCat.trim()) { setErr('Isi nama kategori baru.'); return; }
      const c = await add('budget_categories', { name: newCat.trim(), kind: 'biasa', sort: data.budget_categories.length + 1 });
      category_id = c.id;
    }
    const row = { ...f, category_id, name: f.name.trim(), planned: f.planned || 0, deal: f.deal, event_id: f.event_id || null, vendor_id: f.vendor_id || null };
    onClose();
    if (isNew) { const r = await add('budget_items', { ...row, sort: 999 }); if (r && onCreated) onCreated(r.id); }
    else await save('budget_items', item.id, row);
  }
  async function remove() {
    if (await confirm({ title: 'Hapus item?', text: '“' + item.name + '” beserta catatan pembayarannya akan dihapus.', ok: 'Hapus', danger: true })) { onClose(); del('budget_items', item.id); }
  }
  return (
    <Drawer open onClose={onClose} title={isNew ? 'Item anggaran baru' : 'Ubah item'} eyebrow="Anggaran"
      footer={<>{!isNew && <button type="button" className="btn2" onClick={remove} style={{ marginRight: 'auto' }}><Icon name="trash" size={15} />Hapus</button>}<button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn" onClick={submit}>Simpan</button></>}>
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, display: 'contents' }}>
        <Field label="Nama item" error={err}><Text value={f.name} onChange={set('name')} placeholder="mis. Catering 600 porsi" /></Field>
        <Field label="Keterangan"><Text value={f.detail} onChange={set('detail')} placeholder="mis. tema rustic garden · 300 pcs" /></Field>
        <div className="g2">
          <Field label="Kategori"><Select value={f.category_id} onChange={set('category_id')} options={[...cats.map(c => ({ value: c.id, label: c.name })), { value: '__new', label: '+ Kategori baru…' }]} /></Field>
          <Field label="Acara"><Select value={f.event_id} onChange={set('event_id')} placeholder="Semua / umum" options={data.events.map(e => ({ value: e.id, label: e.name }))} /></Field>
        </div>
        {f.category_id === '__new' && <Field label="Nama kategori baru"><Text value={newCat} onChange={setNewCat} /></Field>}
        <div className="g2">
          <Field label="Rencana"><Money value={f.planned} onChange={set('planned')} /></Field>
          <Field label="Harga deal" hint="isi setelah sepakat"><Money value={f.deal} onChange={set('deal')} placeholder="Rp –" /></Field>
        </div>
        <div className="g2">
          <Field label="Vendor"><Select value={f.vendor_id} onChange={set('vendor_id')} placeholder="Belum ada" options={data.vendors.map(v => ({ value: v.id, label: v.name }))} /></Field>
          <Field label="PIC"><PersonPick value={f.pic} onChange={set('pic')} people={people} /></Field>
        </div>
        <div className="row nowrap" style={{ gap: 12 }}><Toggle on={f.is_wishlist} onChange={set('is_wishlist')} /><div className="sm"><b>Wishlist</b><div className="xs muted">Kalau ada sisa budget. Tidak ikut dijumlah.</div></div></div>
        <Field label="Inspirasi"><FileField value={f.inspo_url} onChange={set('inspo_url')} folder="inspirasi" label="Foto inspirasi" hint="atau tempel link Pinterest / IG" image /></Field>
        <Field label="Kontrak / invoice"><FileField value={f.contract_url} onChange={set('contract_url')} folder="kontrak" label="Unggah kontrak (PDF/foto)" hint="atau link Drive" /></Field>
        <Field label="Catatan"><Area value={f.notes} onChange={set('notes')} rows={3} /></Field>
      </fieldset>
    </Drawer>
  );
}

function useCatalog() {
  const [cat, setCat] = useState(null);
  useEffect(() => { supabase.from('tpl_catalog').select('*').order('sort').then(({ data }) => setCat(data || [])); }, []);
  return cat;
}
function unitQty(unit, w) {
  if (unit === 'porsi') return Math.round(w.target_invites * Number(w.portions_per_invite || 1.5));
  if (unit === 'undangan') return w.target_invites;
  return 1;
}
const tierPrice = (c, tier) => Number(tier === 'min' ? c.price_min : tier === 'prem' ? c.price_prem : c.price_std);

function CatalogDrawer({ onClose }) {
  const { data, addMany } = useW();
  const w = data.wedding;
  const cat = useCatalog();
  const [tier, setTier] = useState(w.price_tier || 'std');
  const [pick, setPick] = useState({});
  const have = new Set(data.budget_items.map(i => i.catalog_code).filter(Boolean));
  const subtotal = data.budget_items.filter(i => !i.is_wishlist).reduce((s, i) => s + Number(i.planned || 0), 0);
  const est = (c) => c.unit === 'persen' ? Math.round(subtotal * tierPrice(c, tier) / 100) : tierPrice(c, tier) * unitQty(c.unit, w);
  const chosen = (cat || []).filter(c => pick[c.code]);
  async function submit() {
    const rows = chosen.map(c => {
      const bc = data.budget_categories.find(x => x.name === c.category) || data.budget_categories[0];
      const evt = c.event_kind ? data.events.find(e => e.kind === c.event_kind) : null;
      return { category_id: bc.id, event_id: evt ? evt.id : null, name: c.name, detail: c.detail, planned: est(c), catalog_code: c.code, sort: c.sort };
    });
    onClose();
    await addMany('budget_items', rows);
  }
  const groups = cat ? Array.from(new Set(cat.map(c => c.category))) : [];
  return (
    <Drawer open onClose={onClose} title="Tambah dari katalog" eyebrow={'Harga perkiraan · ' + w.target_invites + ' undangan'} wide
      head={<Seg value={tier} onChange={setTier} items={[{ key: 'min', label: 'Hemat' }, { key: 'std', label: 'Standar' }, { key: 'prem', label: 'Premium' }]} />}
      footer={<><span className="sm muted" style={{ marginRight: 'auto' }}>{chosen.length} dipilih · {rp(chosen.reduce((s, c) => s + est(c), 0))}</span><button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn" disabled={!chosen.length} onClick={submit}>Tambahkan</button></>}>
      {!cat ? <Spinner /> : groups.map(g => (
        <div key={g}>
          <div className="lbl" style={{ marginBottom: 6 }}>{g}</div>
          {cat.filter(c => c.category === g).filter(c => c.religion === 'semua' || c.religion === w.religion).map(c => {
            const exists = have.has(c.code);
            return (
              <label key={c.code} className="li" style={{ cursor: exists ? 'default' : 'pointer', opacity: exists ? .55 : 1 }}>
                <input type="checkbox" disabled={exists} checked={!!pick[c.code]} onChange={(e) => setPick(p => ({ ...p, [c.code]: e.target.checked }))} style={{ width: 18, height: 18, accentColor: '#B0566B' }} />
                <span className="grow"><b>{c.name}</b><span className="cell-sub">{c.detail}</span></span>
                <span style={{ textAlign: 'right' }}><b>{rpShort(est(c))}</b><span className="xs muted" style={{ display: 'block' }}>{exists ? 'sudah ada' : c.unit === 'persen' ? tierPrice(c, tier) + '% subtotal' : rpShort(tierPrice(c, tier)) + ' / ' + UNIT_LABEL[c.unit]}</span></span>
              </label>
            );
          })}
        </div>
      ))}
    </Drawer>
  );
}

function Simulasi({ rows }) {
  const { data, save, canEdit } = useW();
  const w = data.wedding;
  const cat = useCatalog();
  const [inv, setInv] = useState(w.target_invites);
  const [por, setPor] = useState(Number(w.portions_per_invite));
  const [tier, setTier] = useState(w.price_tier);
  if (!cat) return <Spinner />;
  const byCode = Object.fromEntries(cat.map(c => [c.code, c]));
  const ww = { ...w, target_invites: inv || 0, portions_per_invite: por || 1 };
  const base = rows.filter(r => !r.is_wishlist);
  const nonPct = base.filter(r => !(byCode[r.catalog_code] && byCode[r.catalog_code].unit === 'persen'));
  const simOf = (r) => { const c = byCode[r.catalog_code]; return c && c.unit !== 'persen' ? tierPrice(c, tier) * unitQty(c.unit, ww) : Number(r.planned || 0); };
  const subtotal = nonPct.reduce((s, r) => s + simOf(r), 0);
  const sim = (r) => { const c = byCode[r.catalog_code]; return c && c.unit === 'persen' ? Math.round(subtotal * tierPrice(c, tier) / 100) : simOf(r); };
  const g = budgetSummary(data).gift.plan;
  const perCat = data.budget_categories.map(c => {
    if (c.kind === 'seserahan') return { c, now: g, sim: g };
    const its = base.filter(r => r.category_id === c.id);
    return { c, now: its.reduce((s, r) => s + Number(r.planned || 0), 0), sim: its.reduce((s, r) => s + sim(r), 0) };
  }).filter(x => x.now || x.sim);
  const totNow = perCat.reduce((s, x) => s + x.now, 0);
  const totSim = perCat.reduce((s, x) => s + x.sim, 0);
  const max = Math.max(...perCat.map(x => Math.max(x.now, x.sim)), 1);

  async function apply() {
    if (!(await confirm({ title: 'Terapkan simulasi?', text: 'Rencana item dari katalog akan diganti dengan angka simulasi, dan jumlah undangan jadi ' + inv + '. Item buatan sendiri tidak berubah.', ok: 'Terapkan' }))) return;
    await save('weddings', w.id, { target_invites: inv, portions_per_invite: por, price_tier: tier });
    for (const r of base) { const v = sim(r); if (r.catalog_code && v !== Number(r.planned)) await save('budget_items', r.id, { planned: v }); }
  }

  return (
    <section className="split">
      <div className="g wide col">
        <div className="h2">Bagaimana kalau…</div>
        <div className="g3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))' }}>
          <Field label="Jumlah undangan"><NumIn value={inv} onChange={setInv} /></Field>
          <Field label="Porsi per undangan"><NumIn value={por} onChange={setPor} step="0.1" min={1} /></Field>
          <Field label="Level harga"><Seg small value={tier} onChange={setTier} items={[{ key: 'min', label: 'Hemat' }, { key: 'std', label: 'Standar' }, { key: 'prem', label: 'Premium' }]} /></Field>
        </div>
        <div className="tw">
          <table className="t">
            <thead><tr><th>Kategori</th><th className="n">Sekarang</th><th className="n">Simulasi</th><th className="n">Selisih</th><th style={{ width: '30%' }} className="hide-m" /></tr></thead>
            <tbody>
              {perCat.map(x => (
                <tr key={x.c.id}>
                  <td>{x.c.name}</td><td className="n">{rpShort(x.now)}</td><td className="n"><b>{rpShort(x.sim)}</b></td>
                  <td className="n" style={{ color: x.sim > x.now ? '#8E3A30' : x.sim < x.now ? '#3F7457' : undefined }}>{x.sim === x.now ? '–' : (x.sim > x.now ? '+' : '') + rpShort(x.sim - x.now)}</td>
                  <td className="hide-m"><div className="bar" style={{ position: 'relative' }}><i className="fr" style={{ width: (x.sim / max) * 100 + '%' }} /></div></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td>Total</td><td className="n">{rpShort(totNow)}</td><td className="n">{rpShort(totSim)}</td><td className="n">{(totSim >= totNow ? '+' : '') + rpShort(totSim - totNow)}</td><td className="hide-m" /></tr></tfoot>
          </table>
        </div>
      </div>
      <aside className="narrow">
        <div className="g col">
          <div className="k">Total simulasi vs anggaran</div>
          <div className="v">{rpShort(totSim)}</div>
          <Bar value={pct(totSim, w.total_budget)} cls={totSim > w.total_budget ? 'fr' : 'fs'} />
          <div className="sm" style={{ color: totSim > w.total_budget ? '#8E3A30' : '#3F7457', fontWeight: 700 }}>
            {totSim > w.total_budget ? 'Lebih ' + rp(totSim - w.total_budget) + ' dari anggaran' : 'Masih sisa ' + rp(w.total_budget - totSim)}
          </div>
          <div className="xs muted">Porsi catering = undangan × porsi. Item yang kamu buat sendiri memakai angka rencananya.</div>
          {canEdit && <button type="button" className="btn" onClick={apply}>Terapkan ke rencana</button>}
        </div>
      </aside>
    </section>
  );
}
