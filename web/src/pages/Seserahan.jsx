import React, { useEffect, useMemo, useState } from 'react';
import { useW } from '../lib/store.jsx';
import { supabase } from '../lib/supabase.js';
import { Icon, CAT_ICONS, CAT_COLORS, Tabs, Pill, Tile, Seg, Drawer, Modal, Field, Text, Area, Money, NumIn, DateIn, PersonPick, Toggle, Select, confirm, Empty, Bar, Check, Spinner } from '../components/ui.jsx';
import FileField from '../components/FileField.jsx';
import { openFile } from '../lib/files.js';
import { GIFT_LISTS } from '../lib/calc.js';
import { rp, rpShort, num, pct, dShort, parseMoney } from '../lib/format.js';

const STATUS = [{ key: 'belum', label: 'Belum' }, { key: 'dipesan', label: 'Dipesan', cls: 's-wait' }, { key: 'siap', label: 'Siap', cls: 's-ok' }];
/** Ikon & warna awal kategori dari namanya (sama dengan fungsi gift_style di database). */
const STYLE_RULES = [
  [/mahar|akad|cincin|perhiasan/i, 'cincin', 'k1'], [/ibadah|sholat|mukena/i, 'ibadah', 'k2'], [/dalam|tidur|piyama/i, 'bulan', 'k4'],
  [/pakaian|baju|busana/i, 'baju', 'k3'], [/skincare|makeup|kosmetik/i, 'botol', 'k5'], [/body|mandi|perawatan/i, 'tetes', 'k6'],
  [/tas|sepatu|dompet/i, 'tas', 'k7'], [/rumah|dapur/i, 'rumah', 'k8'], [/kue|buah|makan|minum/i, 'kue', 'k9'], [/kotak|hantaran|kemasan/i, 'kado', 'k10'],
  [/aksesori|jam/i, 'jam', 'k5'], [/dokumen/i, 'buku', 'k2'], [/kesehatan|darurat|obat/i, 'hati', 'k8'], [/elektronik|charger/i, 'bintang', 'k6'], [/tamu|vendor|amplop/i, 'uang', 'k3'],
];
export function guessStyle(name, sort = 0) {
  const r = STYLE_RULES.find(([re]) => re.test(name || ''));
  return r ? { icon: r[1], color: r[2] } : { icon: 'kado', color: 'k' + ((Number(sort) || 0) % 10 + 1) };
}
const UNITS = ['pcs', 'set', 'pasang', 'kotak', 'botol', 'lembar', 'map', 'dus', 'pak', 'kg'];

let tplCache = null;
function useTpl() {
  const [t, setT] = useState(tplCache);
  useEffect(() => { if (!tplCache) supabase.from('tpl_gifts').select('*').order('sort').then(({ data }) => { tplCache = data || []; setT(tplCache); }); }, []);
  return t;
}

export default function Seserahan({ q }) {
  const W = useW();
  const { data, canEdit, save } = W;
  const w = data.wedding;
  const [list, setList] = useState(q.list || 'seserahan');
  const cats = data.gift_categories.filter(c => c.list === list).sort((a, b) => a.sort - b.sort);
  const [catId, setCatId] = useState(null);
  const [drawer, setDrawer] = useState(null);
  const [catEdit, setCatEdit] = useState(null);
  const [budgetEdit, setBudgetEdit] = useState(false);

  const cat = cats.find(c => c.id === catId) || cats[0] || null;
  const itemsOf = (cid) => data.gift_items.filter(i => i.category_id === cid).sort((a, b) => a.sort - b.sort || String(a.created_at).localeCompare(String(b.created_at)));
  const all = data.gift_items.filter(i => cats.some(c => c.id === i.category_id));
  const isHariH = list === 'hari_h';
  const planned = all.reduce((s, i) => s + Number(i.planned || 0), 0);
  const bought = all.filter(i => i.status !== 'belum').reduce((s, i) => s + Number(i.actual ?? i.planned ?? 0), 0);
  const ready = all.filter(i => i.status === 'siap').length;
  const ordered = all.filter(i => i.status === 'dipesan').length;
  const budget = list === 'seserahan' ? Number(w.gift_budget || 0) : planned;
  const counts = Object.fromEntries(GIFT_LISTS.map(l => [l.key, data.gift_items.filter(i => (data.gift_categories.find(c => c.id === i.category_id) || {}).list === l.key).length]));

  useEffect(() => { setCatId(null); }, [list]);

  const setStatus = (it, s) => {
    const patch = { status: s };
    if (s !== 'belum' && (it.actual === null || it.actual === undefined) && !isHariH) patch.actual = it.planned;
    save('gift_items', it.id, patch);
  };

  return (
    <>
      <div className="top">
        <div><div className="eyb">Per barang: merek, harga, status beli, link toko</div><h1 className="h1">Seserahan &amp; Barang</h1></div>
        {canEdit && <div className="row"><button type="button" className="btn2" onClick={() => setDrawer({ mode: 'template', cat })}>Pakai daftar contoh</button><button type="button" className="btn" onClick={() => setDrawer({ mode: 'satu', cat })}><Icon name="plus" size={15} />Barang</button></div>}
      </div>
      <Tabs value={list} onChange={setList} items={GIFT_LISTS.map(l => ({ key: l.key, label: l.label + ' · ' + counts[l.key] }))} />

      {isHariH ? (
        <section className="tiles">
          <Tile w="w3" icon="check" k="Sudah disiapkan" v={ready + ' / ' + all.length}><Bar value={pct(ready, all.length)} cls="fs" style={{ marginTop: 6 }} /></Tile>
          <Tile w="w2" icon="clock" k="Belum" v={String(all.length - ready - ordered)} sub="centang saat masuk tas / mobil" />
          <Tile w="w1" icon="calendar" k="Dipakai saat" v="Hari H" sub="buka di HP saat packing" />
        </section>
      ) : (
        <section className="tiles">
          <Tile w="w1" icon="wallet" k={list === 'seserahan' ? 'Budget seserahan & mahar' : 'Rencana hantaran balasan'} v={rpShort(budget)} sub={list === 'seserahan' ? 'Rencana barang ' + rpShort(planned) + (canEdit ? ' · ketuk untuk ubah' : '') : all.length + ' barang'} onClick={list === 'seserahan' && canEdit ? () => setBudgetEdit(true) : undefined} />
          <Tile w="w2" icon="card" k="Realisasi (sudah dibeli)" v={rpShort(bought)} sub="Termasuk barang dipesan" />
          <Tile w="w3" icon="chart" k="Sisa budget" v={<span style={{ color: budget - bought < 0 ? '#8E3A30' : undefined }}>{rpShort(budget - bought)}</span>} sub="Masuk ke Anggaran otomatis" />
          <Tile w="w4" icon="gift" k="Barang siap" v={ready + ' / ' + all.length} sub={ready + ' siap · ' + ordered + ' dipesan · ' + (all.length - ready - ordered) + ' belum'} />
        </section>
      )}

      <section className="g col">
        <div className="between"><div className="h2">{cats.length} kategori</div><span className="xs muted">+ kategori sendiri</span></div>
        <div className="cats3">
          {cats.map(c => {
            const its = itemsOf(c.id);
            const r = its.filter(i => i.status === 'siap').length;
            const tot = its.reduce((s, i) => s + Number((i.status !== 'belum' ? (i.actual ?? i.planned) : i.planned) || 0), 0);
            const on = cat && c.id === cat.id;
            return (
              <button type="button" key={c.id} className={'cc ' + (c.color || 'k1') + (on ? ' on' : '')} onClick={() => setCatId(c.id)} aria-pressed={on}>
                <span className="ci"><Icon name={c.icon || 'kado'} size={20} /></span>
                {its.length > 0 && r === its.length && <span className="done">✓ lengkap</span>}
                <b className="ell">{c.name}</b>
                <span className="sub">{r}/{its.length} siap{!isHariH ? ' · ' + rpShort(tot) : ''}</span>
                <span className="mt"><i style={{ width: pct(r, its.length) + '%' }} /></span>
              </button>
            );
          })}
          {canEdit && <button type="button" className="cc add" onClick={() => setCatEdit({ _new: true, list })}>+ Kategori</button>}
        </div>
      </section>

      {cat ? <CategoryPanel cat={cat} items={itemsOf(cat.id)} isHariH={isHariH} onAdd={(name) => setDrawer({ mode: 'satu', cat, name })} onEdit={(it) => setDrawer({ mode: 'satu', cat, item: it })} onEditCat={() => setCatEdit(cat)} setStatus={setStatus} />
        : <div className="g"><Empty icon="gift" title="Belum ada kategori" text="Buat kategori dulu, misalnya Skincare, Pakaian, atau Kue & buah." action={canEdit && <button type="button" className="btn" onClick={() => setCatEdit({ _new: true, list })}>+ Kategori</button>} /></div>}

      {drawer && <ItemDrawer {...drawer} list={list} cats={cats} onClose={() => setDrawer(null)} onPickCat={setCatId} />}
      {catEdit && <CategoryModal cat={catEdit} onClose={() => setCatEdit(null)} onCreated={setCatId} />}
      {budgetEdit && <BudgetModal onClose={() => setBudgetEdit(false)} planned={planned} />}
    </>
  );
}

function CategoryPanel({ cat, items, isHariH, onAdd, onEdit, onEditCat, setStatus }) {
  const { canEdit } = useW();
  const tpl = useTpl();
  const plan = items.reduce((s, i) => s + Number(i.planned || 0), 0);
  const real = items.filter(i => i.status !== 'belum').reduce((s, i) => s + Number(i.actual ?? i.planned ?? 0), 0);
  const realPlan = items.filter(i => i.status !== 'belum').reduce((s, i) => s + Number(i.planned || 0), 0);
  const names = new Set(items.map(i => i.name.toLowerCase()));
  const sugg = (tpl || []).filter(t => t.list === cat.list && t.category === cat.name && !names.has(t.name.toLowerCase())).slice(0, 8);
  return (
    <section className="g col">
      <div className="between">
        <div style={{ minWidth: 0 }}>
          <div className="row nowrap" style={{ gap: 10 }}><span className={'ico ' + (cat.color || 'k1')} style={{ width: 34, height: 34 }}><Icon name={cat.icon || 'kado'} size={18} /></span><div className="h2">{cat.name}</div>{canEdit && <button type="button" className="ibtn" style={{ width: 28, height: 28 }} onClick={onEditCat} aria-label="Ubah kategori"><Icon name="edit" size={14} /></button>}</div>
          {(cat.pic || cat.note) && <div className="xs muted">{[cat.pic && 'PIC ' + cat.pic, cat.note].filter(Boolean).join(' · ')}</div>}
        </div>
        {!isHariH && <div className="row" style={{ gap: 16 }}><div><div className="k">Budget</div><b>{rpShort(plan)}</b></div><div><div className="k">Realisasi</div><b>{rp(real)}</b></div></div>}
      </div>
      {items.length ? (
        <div className="tw">
          <table className="t stack">
            <thead><tr>{isHariH && <th style={{ width: 32 }} />}<th>Barang</th><th>Merek / varian</th><th className="n">Jml</th>{!isHariH && <><th className="n">Budget</th><th className="n">Realisasi</th></>}{!isHariH && <th>Status</th>}<th /></tr></thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id} className="click" onClick={() => onEdit(it)}>
                  {isHariH && <td><Check on={it.status === 'siap'} disabled={!canEdit} onChange={(v) => setStatus(it, v ? 'siap' : 'belum')} /></td>}
                  <td style={{ minWidth: 150 }}><b className={isHariH && it.status === 'siap' ? 'strike' : ''}>{it.name}</b>{it.notes && <span className="cell-sub ell" style={{ maxWidth: 220 }}>{it.notes}</span>}</td>
                  <td className="mhide">{it.brand || <span className="muted">–</span>}</td>
                  <td className="n mhide">{it.qty} {it.unit !== 'pcs' ? it.unit : ''}</td>
                  {!isHariH && <><td className="n">{num(it.planned)}</td><td className="n mhide">{it.status !== 'belum' && it.actual !== null && it.actual !== undefined ? num(it.actual) : <span className="muted">–</span>}</td></>}
                  {!isHariH && <td onClick={(e) => e.stopPropagation()}><Seg small value={it.status} onChange={(s) => setStatus(it, s)} items={STATUS} disabled={!canEdit} /></td>}
                  <td className="mhide" onClick={(e) => e.stopPropagation()}>{it.shop_url ? <a href={it.shop_url} target="_blank" rel="noreferrer" className="xs" style={{ fontWeight: 700 }}>🔗 toko</a> : it.photo_url ? <button type="button" className="lnk xs" onClick={() => openFile(it.photo_url)}>📷 foto</button> : null}</td>
                </tr>
              ))}
            </tbody>
            {!isHariH && <tfoot><tr><td colSpan={2} className="mhide">Total kategori</td><td className="n show-m">Total</td><td className="n mhide" /><td className="n">{num(plan)}</td><td className="n mhide">{num(real)}</td><td colSpan={2} className="mhide">{realPlan - real > 0 ? <span className="ok">hemat {rp(realPlan - real)}</span> : realPlan - real < 0 ? <span style={{ color: '#8E3A30', fontWeight: 700 }}>lebih {rp(real - realPlan)}</span> : null}</td></tr></tfoot>}
          </table>
        </div>
      ) : <div className="muted" style={{ padding: '10px 4px' }}>Belum ada barang di kategori ini.</div>}
      {canEdit && (
        <div className="row">
          <button type="button" className="btn2" onClick={() => onAdd('')}><Icon name="plus" size={15} />Tambah barang di {cat.name}</button>
          {sugg.length > 0 && <div className="sug"><span className="xs muted" style={{ alignSelf: 'center' }}>Saran:</span>{sugg.map(s => <button type="button" key={s.id} onClick={() => onAdd(s.name)}>+ {s.name}</button>)}</div>}
        </div>
      )}
    </section>
  );
}

function ItemDrawer({ mode: initialMode, cat: initialCat, item, name, list: initialList, cats: _c, onClose, onPickCat }) {
  const { data, add, addMany, save, del, canEdit, people } = useW();
  const tpl = useTpl();
  const isNew = !item;
  const [mode, setMode] = useState(isNew ? initialMode : 'satu');
  const [list, setList] = useState(initialList);
  const cats = data.gift_categories.filter(c => c.list === list).sort((a, b) => a.sort - b.sort);
  const [catId, setCatId] = useState(item ? item.category_id : initialCat && initialCat.list === list ? initialCat.id : (cats[0] && cats[0].id));
  const cat = cats.find(c => c.id === catId) || data.gift_categories.find(c => c.id === catId);
  const isHariH = list === 'hari_h';
  const blank = { name: name || '', brand: '', qty: 1, unit: 'pcs', planned: null, actual: null, status: 'belum', pic: (cat && cat.pic) || '', target_date: '', shop_url: '', photo_url: '', notes: '', count_in_budget: !isHariH };
  const [f, setF] = useState(item ? { ...blank, ...item, target_date: item.target_date || '' } : blank);
  const [bulk, setBulk] = useState('');
  const [pick, setPick] = useState({});
  const [err, setErr] = useState('');
  const [newCat, setNewCat] = useState(null);
  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }));

  useEffect(() => { if (isNew && !cats.some(c => c.id === catId)) setCatId(cats[0] && cats[0].id); }, [list]);

  const catItems = data.gift_items.filter(i => i.category_id === catId);
  const catPlan = catItems.filter(i => !item || i.id !== item.id).reduce((s, i) => s + Number(i.planned || 0), 0) + Number(f.planned || 0);
  const names = new Set(catItems.map(i => i.name.toLowerCase()));
  const sugg = (tpl || []).filter(t => cat && t.list === list && t.category === cat.name && !names.has(t.name.toLowerCase())).slice(0, 8);

  async function ensureCat() {
    if (newCat !== null) {
      if (!newCat.trim()) throw new Error('Isi nama kategori baru.');
      const c = await add('gift_categories', { list, name: newCat.trim(), sort: cats.length + 1, ...guessStyle(newCat.trim(), cats.length + 1) });
      onPickCat && onPickCat(c.id);
      return c.id;
    }
    if (!catId) throw new Error('Pilih kategori dulu.');
    return catId;
  }

  async function saveOne(again) {
    if (!f.name.trim()) { setErr('Nama barang wajib diisi.'); return; }
    let cid;
    try { cid = await ensureCat(); } catch (e) { setErr(e.message); return; }
    const row = { name: f.name.trim(), brand: f.brand, qty: f.qty || 1, unit: f.unit, planned: f.planned || 0, actual: f.actual, status: f.status, pic: f.pic, target_date: f.target_date || null, shop_url: f.shop_url, photo_url: f.photo_url, notes: f.notes, count_in_budget: f.count_in_budget, category_id: cid };
    if (row.shop_url && !/^https?:\/\//i.test(row.shop_url)) row.shop_url = 'https://' + row.shop_url;
    if (row.status !== 'belum' && (row.actual === null || row.actual === undefined) && !isHariH) row.actual = row.planned;
    if (isNew) {
      const p = add('gift_items', { ...row, sort: 999 });
      if (again) { setF({ ...blank, pic: f.pic }); setNewCat(null); setCatId(cid); setErr(''); await p; return; }
      onClose(); await p;
    } else { onClose(); await save('gift_items', item.id, row); }
  }

  async function saveBulk() {
    let cid;
    try { cid = await ensureCat(); } catch (e) { setErr(e.message); return; }
    const rows = bulk.split('\n').map(l => l.trim()).filter(Boolean).map((l, i) => {
      const parts = l.split(/\s*[;|\t]\s*|\s+-\s+/);
      const price = parts.length > 1 ? parseMoney(parts[parts.length - 1]) : null;
      const nm = price !== null ? parts.slice(0, -1).join(' ') : l;
      return { category_id: cid, name: nm.slice(0, 160), planned: price || 0, count_in_budget: !isHariH, sort: 999 + i };
    });
    if (!rows.length) { setErr('Tulis minimal satu barang.'); return; }
    onClose();
    await addMany('gift_items', rows);
  }

  async function saveTpl() {
    const chosen = (tpl || []).filter(t => pick[t.id]);
    if (!chosen.length) { setErr('Centang barang yang mau ditambahkan.'); return; }
    onClose();
    const catByName = Object.fromEntries(data.gift_categories.filter(c => c.list === list).map(c => [c.name, c.id]));
    for (const cname of Array.from(new Set(chosen.map(t => t.category)))) {
      if (!catByName[cname]) { const c = await add('gift_categories', { list, name: cname, sort: 900, ...guessStyle(cname, Object.keys(catByName).length) }); catByName[cname] = c.id; }
    }
    await addMany('gift_items', chosen.map(t => ({ category_id: catByName[t.category], name: t.name, brand: t.brand, qty: t.qty, unit: t.unit, planned: t.planned, count_in_budget: list !== 'hari_h', sort: t.sort })));
  }

  async function remove() {
    if (await confirm({ title: 'Hapus barang?', text: '“' + item.name + '” akan dihapus dari daftar.', ok: 'Hapus', danger: true })) { onClose(); del('gift_items', item.id); }
  }

  const listLabel = (GIFT_LISTS.find(l => l.key === list) || {}).label;
  const existing = new Set(data.gift_items.filter(i => (data.gift_categories.find(c => c.id === i.category_id) || {}).list === list).map(i => i.name.toLowerCase()));
  const tplList = (tpl || []).filter(t => t.list === list && (t.religion === 'semua' || t.religion === data.wedding.religion));

  const footer = !canEdit ? null : mode === 'satu' ? (
    <>{isNew ? null : <button type="button" className="btn2" onClick={remove} style={{ marginRight: 'auto' }}><Icon name="trash" size={15} />Hapus</button>}
      <button type="button" className="btn2" onClick={onClose}>Batal</button>
      {isNew && <button type="button" className="btn2" onClick={() => saveOne(true)}>Simpan &amp; tambah lagi</button>}
      <button type="button" className="btn" onClick={() => saveOne(false)}>Simpan</button></>
  ) : mode === 'banyak' ? (
    <><button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn" onClick={saveBulk}>Tambahkan {bulk.split('\n').filter(l => l.trim()).length || ''} barang</button></>
  ) : (
    <><span className="sm muted" style={{ marginRight: 'auto' }}>{Object.values(pick).filter(Boolean).length} dipilih</span><button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn" onClick={saveTpl}>Tambahkan</button></>
  );

  return (
    <Drawer open onClose={onClose} title={isNew ? 'Tambah barang' : 'Ubah barang'} eyebrow={listLabel + (cat ? ' · ' + cat.name : '')} footer={footer}
      head={isNew && <Seg value={mode} onChange={(m) => { setMode(m); setErr(''); }} items={[{ key: 'satu', label: 'Satu barang' }, { key: 'banyak', label: 'Banyak sekaligus' }, { key: 'template', label: 'Dari template' }]} />}>
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, display: 'contents' }}>
        {isNew && <Field label="Masuk ke daftar"><Seg value={list} onChange={setList} items={GIFT_LISTS.map(l => ({ key: l.key, label: l.key === 'seserahan' ? 'Seserahan & Mahar' : l.key === 'balasan' ? 'Hantaran balasan' : 'Bawaan hari H' }))} /></Field>}

        {mode !== 'template' && (
          <Field label="Kategori" hint={isNew ? 'bisa tambah sendiri' : ''}>
            <div className="catg">
              {cats.map(c => <button type="button" key={c.id} className={newCat === null && c.id === catId ? 'on' : ''} onClick={() => { setCatId(c.id); setNewCat(null); }}>{c.name}</button>)}
              {newCat === null ? <button type="button" className="add" onClick={() => setNewCat('')}>+ Kategori</button>
                : <input className="inp" autoFocus style={{ width: 180, minHeight: 34, padding: '6px 10px' }} placeholder="Nama kategori baru" value={newCat} onChange={(e) => setNewCat(e.target.value)} />}
            </div>
          </Field>
        )}

        {mode === 'satu' && (
          <>
            <div className="g3">
              <Field label="Nama barang" hint="wajib" error={err}><Text value={f.name} onChange={set('name')} placeholder="mis. Serum" onKeyDown={(e) => { if (e.key === 'Enter' && isNew) { e.preventDefault(); saveOne(true); } }} /></Field>
              <Field label="Jumlah">
                <div className="row nowrap" style={{ gap: 6 }}><NumIn value={f.qty} onChange={set('qty')} min={1} style={{ width: 70 }} /><select className="inp" value={f.unit} onChange={(e) => set('unit')(e.target.value)}>{UNITS.map(u => <option key={u}>{u}</option>)}</select></div>
              </Field>
            </div>
            {isNew && sugg.length > 0 && <Field label={'Saran untuk ' + (cat ? cat.name : '')} hint="ketuk untuk isi"><div className="sug">{sugg.map(s => <button type="button" key={s.id} onClick={() => setF(x => ({ ...x, name: s.name, planned: x.planned || s.planned || null, unit: s.unit }))}>+ {s.name}</button>)}</div></Field>}
            <Field label="Merek / varian / warna"><Text value={f.brand} onChange={set('brand')} placeholder="mis. Somethinc Niacinamide 20 ml" /></Field>
            {!isHariH && (
              <>
                <div className="g2">
                  <Field label="Harga rencana"><Money value={f.planned} onChange={set('planned')} /></Field>
                  <Field label="Harga beli" hint="isi setelah beli"><Money value={f.actual} onChange={set('actual')} /></Field>
                </div>
                {cat && <div className="calc"><span>Total rencana {cat.name} jadi <b>{catItems.length + (isNew ? 1 : 0)} barang</b></span><b style={{ color: '#3F7457' }}>{rp(catPlan)}</b></div>}
              </>
            )}
            <div className="g2">
              <Field label="Status"><Seg value={f.status} onChange={set('status')} items={STATUS} /></Field>
              <Field label="PIC beli"><PersonPick value={f.pic} onChange={set('pic')} people={people} /></Field>
            </div>
            <div className="g2">
              <Field label="Target beli"><DateIn value={f.target_date} onChange={set('target_date')} /></Field>
              <Field label="Link toko"><Text value={f.shop_url} onChange={set('shop_url')} placeholder="shopee / tokopedia…" inputMode="url" /></Field>
            </div>
            <Field label="Foto / inspirasi"><FileField value={f.photo_url} onChange={set('photo_url')} folder="seserahan" label="Tambah foto" hint="atau tempel link Pinterest / IG" image /></Field>
            <Field label="Catatan"><Text value={f.notes} onChange={set('notes')} placeholder="mis. beli bundling biar hemat ongkir" /></Field>
            {!isHariH && <div className="row nowrap" style={{ gap: 12 }}><Toggle on={f.count_in_budget} onChange={set('count_in_budget')} /><div className="sm"><b>Hitung ke Anggaran</b><div className="xs muted">Masuk pos “Mahar &amp; seserahan” di menu Anggaran</div></div></div>}
          </>
        )}

        {mode === 'banyak' && (
          <>
            <Field label="Tulis satu barang per baris" hint="harga boleh di belakang" error={err}>
              <Area value={bulk} onChange={setBulk} rows={10} placeholder={'Serum ; 200rb\nLip tint ; 85000\nMasker wajah\nParfum - 350rb'} />
            </Field>
            <div className="note">Pisahkan harga dengan titik koma ( ; ) atau tanda strip ( - ). Bisa juga salin langsung dari catatan HP atau kolom Excel.</div>
          </>
        )}

        {mode === 'template' && (
          !tpl ? <Spinner /> : (
            <>
              {err && <div className="ferr">{err}</div>}
              {Array.from(new Set(tplList.map(t => t.category))).map(cn => (
                <div key={cn}>
                  <div className="between" style={{ marginBottom: 4 }}><span className="lbl">{cn}</span>
                    <button type="button" className="lnk xs" onClick={() => setPick(p => { const n = { ...p }; tplList.filter(t => t.category === cn && !existing.has(t.name.toLowerCase())).forEach(t => { n[t.id] = true; }); return n; })}>Pilih semua</button></div>
                  {tplList.filter(t => t.category === cn).map(t => {
                    const has = existing.has(t.name.toLowerCase());
                    return (
                      <label key={t.id} className="li" style={{ padding: '7px 2px', opacity: has ? .5 : 1, cursor: has ? 'default' : 'pointer' }}>
                        <input type="checkbox" disabled={has} checked={!!pick[t.id]} onChange={(e) => setPick(p => ({ ...p, [t.id]: e.target.checked }))} style={{ width: 18, height: 18, accentColor: '#B0566B' }} />
                        <span className="grow">{t.name}{t.qty > 1 ? ' · ' + t.qty + ' ' + t.unit : ''}</span>
                        <span className="xs muted">{has ? 'sudah ada' : t.planned ? rpShort(t.planned) : ''}</span>
                      </label>
                    );
                  })}
                </div>
              ))}
            </>
          )
        )}
      </fieldset>
    </Drawer>
  );
}

function CategoryModal({ cat, onClose, onCreated }) {
  const { data, add, save, del, people } = useW();
  const isNew = !!cat._new;
  const nextSort = data.gift_categories.filter(c => c.list === cat.list).length + 1;
  const init = isNew ? guessStyle('', nextSort) : { icon: cat.icon || 'kado', color: cat.color || 'k1' };
  const [f, setF] = useState({ name: cat.name || '', pic: cat.pic || '', note: cat.note || '', ...init });
  const [touched, setTouched] = useState(!isNew);
  const [err, setErr] = useState('');
  const n = data.gift_items.filter(i => i.category_id === cat.id).length;
  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }));
  function onName(v) {
    setF(x => ({ ...x, name: v, ...(touched ? {} : guessStyle(v, nextSort)) }));
  }
  const pickStyle = (k, v) => { setTouched(true); setF(x => ({ ...x, [k]: v })); };
  async function submit() {
    if (!f.name.trim()) { setErr('Isi nama kategori.'); return; }
    onClose();
    const row = { name: f.name.trim(), pic: f.pic, note: f.note, icon: f.icon, color: f.color };
    if (isNew) { const c = await add('gift_categories', { list: cat.list, ...row, sort: nextSort }); if (c) onCreated(c.id); }
    else await save('gift_categories', cat.id, row);
  }
  async function remove() {
    if (await confirm({ title: 'Hapus kategori?', text: '“' + cat.name + '” dan ' + n + ' barang di dalamnya akan dihapus.', ok: 'Hapus', danger: true })) { onClose(); del('gift_categories', cat.id, { silent: true }); }
  }
  return (
    <Modal open onClose={onClose} title={isNew ? 'Kategori baru' : 'Ubah kategori'}
      footer={<>{!isNew && <button type="button" className="btn2" style={{ marginRight: 'auto' }} onClick={remove} aria-label="Hapus kategori"><Icon name="trash" size={15} /></button>}<button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn" onClick={submit}>Simpan</button></>}>
      <div className={'cc ' + f.color} style={{ cursor: 'default', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <span className="ci" style={{ width: 46, height: 46 }}><Icon name={f.icon} size={24} /></span>
        <div style={{ minWidth: 0 }}><b className="ell" style={{ display: 'block', fontSize: 15 }}>{f.name || 'Nama kategori'}</b><span className="sub">{isNew ? '0/0 siap · Rp 0' : n + ' barang'}</span></div>
      </div>
      <Field label="Nama kategori" error={err}><Text value={f.name} onChange={onName} placeholder="mis. Skincare & makeup" /></Field>
      <Field label="Ikon" hint="ikon & warna otomatis dari nama, bisa diganti">
        <div className="ipick" role="radiogroup" aria-label="Ikon">
          {CAT_ICONS.map(ic => <button type="button" key={ic} role="radio" aria-checked={f.icon === ic} aria-label={ic} title={ic} className={f.icon === ic ? 'on' : ''} onClick={() => pickStyle('icon', ic)}><Icon name={ic} size={20} /></button>)}
        </div>
      </Field>
      <Field label="Warna kartu">
        <div className="cpick" role="radiogroup" aria-label="Warna">
          {CAT_COLORS.map(k => <button type="button" key={k} role="radio" aria-checked={f.color === k} aria-label={'Warna ' + k.slice(1)} className={k + (f.color === k ? ' on' : '')} onClick={() => pickStyle('color', k)} />)}
        </div>
      </Field>
      <div className="g2">
        <Field label="PIC"><PersonPick value={f.pic} onChange={set('pic')} people={people} /></Field>
        <Field label="Catatan"><Text value={f.note} onChange={set('note')} placeholder="mis. beli bundling" /></Field>
      </div>
    </Modal>
  );
}

function BudgetModal({ onClose, planned }) {
  const { data, save } = useW();
  const [v, setV] = useState(Number(data.wedding.gift_budget || 0));
  return (
    <Modal open onClose={onClose} title="Budget seserahan & mahar"
      footer={<><button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn" onClick={() => { onClose(); save('weddings', data.wedding.id, { gift_budget: v || 0 }); }}>Simpan</button></>}>
      <Field label="Budget"><Money value={v} onChange={setV} /></Field>
      <div className="xs muted">Total rencana barang saat ini {rp(planned)}. <button type="button" className="lnk xs" onClick={() => setV(planned)}>Samakan</button></div>
    </Modal>
  );
}
