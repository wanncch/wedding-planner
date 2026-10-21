import React, { useMemo, useState } from 'react';
import { useW } from '../lib/store.jsx';
import { wpath } from '../lib/nav.js';
import { Icon, Tabs, Pill, Bar, Drawer, Field, Text, Area, Money, Select, Seg, confirm, Empty } from '../components/ui.jsx';
import { vendorInfo, itemMoney } from '../lib/calc.js';
import { rp, rpShort, dShort, dMed, waLink, pct, daysBetween, today } from '../lib/format.js';

const COLS = [
  { key: 'belum', label: 'Belum order' },
  { key: 'nego', label: 'Negosiasi' },
  { key: 'deal', label: 'Deal' },
  { key: 'lunas', label: 'Lunas' },
];
const CAT_SUGGEST = ['Venue', 'Catering', 'Dekorasi', 'MUA', 'Busana', 'Dokumentasi', 'Wedding organizer', 'MC', 'Hiburan', 'Sound system', 'Undangan', 'Souvenir', 'Seragam', 'Kue', 'Transportasi', 'Lainnya'];

export default function Vendor() {
  const { data, canEdit, save } = useW();
  const [view, setView] = useState('papan');
  const [qs, setQs] = useState('');
  const [cat, setCat] = useState('');
  const [edit, setEdit] = useState(null);
  const [over, setOver] = useState(null);

  const list = useMemo(() => data.vendors.map(v => ({ ...v, _i: vendorInfo(v, data) })), [data]);
  const cats = Array.from(new Set(data.vendors.map(v => v.category).filter(Boolean))).sort();
  const s = qs.trim().toLowerCase();
  const vis = list.filter(v => (!cat || v.category === cat) && (!s || [v.name, v.contact_name, v.phone, v.category].join(' ').toLowerCase().includes(s)));

  function drop(col, id) {
    setOver(null);
    const v = list.find(x => x.id === id);
    if (!v || !canEdit) return;
    if (col === 'belum' || col === 'nego') {
      if (v._i.hasDeal) { setEdit(v); return; }
      if (v.stage !== col) save('vendors', v.id, { stage: col });
    } else setEdit({ ...v, _askDeal: true });
  }

  return (
    <>
      <div className="top">
        <div><div className="eyb">{data.vendors.length} vendor · status pindah otomatis saat pembayaran dicatat</div><h1 className="h1">Vendor</h1></div>
        <div className="row"><Tabs value={view} onChange={setView} items={[{ key: 'papan', label: 'Papan' }, { key: 'daftar', label: 'Daftar' }]} />{canEdit && <button type="button" className="btn" onClick={() => setEdit({ _new: true })}><Icon name="plus" size={15} />Vendor</button>}</div>
      </div>
      <div className="row">
        <label className="search"><Icon name="search" size={16} /><input value={qs} onChange={(e) => setQs(e.target.value)} placeholder="Cari nama vendor, kontak, nomor…" /></label>
        <select className="inp" style={{ width: 'auto', minWidth: 180 }} value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Semua kategori</option>{cats.map(c => <option key={c}>{c}</option>)}</select>
      </div>

      {!data.vendors.length ? (
        <div className="g"><Empty icon="store" title="Belum ada vendor" text="Catat vendor yang sedang kamu survey. Saat harga deal diisi, vendor otomatis masuk kolom Deal, dan pindah ke Lunas setelah pembayaran lunas." action={canEdit && <button type="button" className="btn" onClick={() => setEdit({ _new: true })}>Tambah vendor pertama</button>} /></div>
      ) : view === 'papan' ? (
        <section className="kan">
          {COLS.map(c => {
            const vs = vis.filter(v => v._i.stage === c.key);
            return (
              <div key={c.key} className={'kcol' + (over === c.key ? ' drop' : '')}
                onDragOver={(e) => { e.preventDefault(); setOver(c.key); }} onDragLeave={() => setOver(null)}
                onDrop={(e) => drop(c.key, e.dataTransfer.getData('text/plain'))}>
                <div className="khead"><span>{c.label}</span><Pill cls={c.key === 'lunas' ? 'p-ok' : c.key === 'deal' ? 'p-rose' : c.key === 'nego' ? 'p-wait' : 'p-no'}>{vs.length}</Pill></div>
                {vs.map(v => <VCard key={v.id} v={v} onOpen={() => setEdit(v)} />)}
                {c.key === 'lunas' && <div className="xs muted" style={{ textAlign: 'center', padding: 8 }}>Vendor pindah ke sini otomatis saat sisa tagihan Rp0</div>}
                {c.key === 'belum' && canEdit && <button type="button" className="kcard" style={{ alignItems: 'center', color: 'var(--rose3)', fontWeight: 700, borderStyle: 'dashed' }} onClick={() => setEdit({ _new: true })}>+ Vendor</button>}
              </div>
            );
          })}
        </section>
      ) : (
        <section className="g" style={{ padding: '14px 12px 8px' }}>
          <div className="tw">
            <table className="t stack">
              <thead><tr><th>Vendor</th><th>Kategori</th><th>Kontak</th><th className="n">Harga</th><th className="n">Dibayar</th><th>Status</th></tr></thead>
              <tbody>
                {vis.map(v => (
                  <tr key={v.id} className="click" onClick={() => setEdit(v)}>
                    <td><b>{v.name}</b>{v.notes && <span className="cell-sub ell" style={{ maxWidth: 260 }}>{v.notes}</span>}</td>
                    <td className="mhide">{v.category}</td>
                    <td className="mhide">{v.contact_name}{v.phone && <span className="cell-sub">{v.phone}</span>}</td>
                    <td className="n">{v._i.hasDeal ? rp(v._i.deal) : v.estimate ? '± ' + rp(v.estimate) : '–'}</td>
                    <td className="n mhide">{v._i.paid ? rp(v._i.paid) : '–'}</td>
                    <td><Pill cls={{ lunas: 'p-ok', deal: 'p-rose', nego: 'p-wait', belum: 'p-no' }[v._i.stage]}>{COLS.find(c => c.key === v._i.stage).label}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {edit && <VendorDrawer v={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function VCard({ v, onOpen }) {
  const { canEdit } = useW();
  const i = v._i;
  const next = i.next;
  const late = next && next.due_date ? daysBetween(today(), next.due_date) : null;
  return (
    <button type="button" className="kcard" draggable={canEdit && !i.hasDeal} onDragStart={(e) => e.dataTransfer.setData('text/plain', v.id)} onClick={onOpen}>
      <span className="lbl">{v.category || 'Vendor'}</span>
      <b style={{ fontSize: 14.5 }}>{v.name}</b>
      {i.stage === 'lunas' ? (
        <div className="between xs"><span className="muted">{rpShort(i.deal)}</span><span className="ok">✓ Lunas{i.lastPaid ? ' ' + dShort(i.lastPaid) : ''}</span></div>
      ) : i.hasDeal ? (
        <>
          <div className="between xs"><span className="muted">Dibayar {rpShort(i.paid)}</span><b>{rpShort(i.deal)}</b></div>
          <Bar value={pct(i.paid, i.deal)} cls="fd" />
          {next && next.due_date && <span><Pill cls={late <= 7 ? 'p-bad' : 'p-no'}>{next.label} {rpShort(next.amount)} · {dShort(next.due_date)}</Pill></span>}
        </>
      ) : (
        <div className="xs muted">{v.stage === 'nego' ? 'Penawaran' : 'Perkiraan'} {v.estimate ? rp(v.estimate) : '–'}</div>
      )}
      {v.phone && i.stage !== 'lunas' && <a className="xs" href={waLink(v.phone)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontWeight: 700, color: '#3F7457', textDecoration: 'none' }}>◉ WhatsApp {v.contact_name || ''}</a>}
      {v.notes && !v.phone && <div className="xs muted ell">{v.notes}</div>}
    </button>
  );
}

function VendorDrawer({ v, onClose }) {
  const { data, add, save, del, canEdit, wid } = useW();
  const isNew = !!v._new;
  const info = isNew ? null : vendorInfo(v, data);
  const [f, setF] = useState({ name: v.name || '', category: v.category || '', contact_name: v.contact_name || '', phone: v.phone || '', instagram: v.instagram || '', estimate: v.estimate ?? null, stage: v.stage || 'belum', notes: v.notes || '' });
  const bcats = data.budget_categories.filter(c => c.kind !== 'seserahan');
  const [deal, setDeal] = useState({ on: !!v._askDeal, amount: v.estimate ?? null, item: '', cat: bcats[0] && bcats[0].id });
  const [err, setErr] = useState('');
  const set = (k) => (val) => setF(x => ({ ...x, [k]: val }));
  const freeItems = data.budget_items.filter(i => !i.vendor_id && !i.is_wishlist);

  async function submit() {
    if (!f.name.trim()) { setErr('Nama vendor wajib diisi.'); return; }
    if (deal.on && !deal.amount) { setErr('Isi harga deal.'); return; }
    const row = { ...f, name: f.name.trim(), estimate: f.estimate || null };
    onClose();
    let id = v.id;
    if (isNew) { const r = await add('vendors', { ...row, sort: 999 }); id = r && r.id; }
    else await save('vendors', v.id, row);
    if (deal.on && id) {
      if (deal.item) await save('budget_items', deal.item, { vendor_id: id, deal: deal.amount });
      else await add('budget_items', { category_id: deal.cat, vendor_id: id, name: (f.category ? f.category + ' · ' : '') + f.name.trim(), planned: f.estimate || deal.amount, deal: deal.amount, sort: 999 });
    }
  }
  async function remove() {
    if (await confirm({ title: 'Hapus vendor?', text: '“' + v.name + '” dihapus. Item anggaran yang terhubung tetap ada.', ok: 'Hapus', danger: true })) { onClose(); del('vendors', v.id); }
  }

  return (
    <Drawer open onClose={onClose} title={isNew ? 'Vendor baru' : v.name} eyebrow={isNew ? 'Vendor' : (v.category || 'Vendor')}
      footer={canEdit ? <>{!isNew && <button type="button" className="btn2" onClick={remove} style={{ marginRight: 'auto' }}><Icon name="trash" size={15} />Hapus</button>}<button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn" onClick={submit}>Simpan</button></> : null}>
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, display: 'contents' }}>
        <div className="g3">
          <Field label="Nama vendor" error={err}><Text value={f.name} onChange={set('name')} placeholder="mis. Dapur Ibu Ratna" /></Field>
          <Field label="Kategori"><input className="inp" list="vcat" value={f.category} onChange={(e) => set('category')(e.target.value)} placeholder="Catering" /><datalist id="vcat">{CAT_SUGGEST.map(c => <option key={c} value={c} />)}</datalist></Field>
        </div>
        <div className="g2">
          <Field label="Nama kontak"><Text value={f.contact_name} onChange={set('contact_name')} /></Field>
          <Field label="No. WhatsApp"><Text value={f.phone} onChange={set('phone')} inputMode="tel" placeholder="08…" /></Field>
        </div>
        <Field label="Instagram / website"><Text value={f.instagram} onChange={set('instagram')} placeholder="@vendor atau https://" /></Field>
        {(!info || !info.hasDeal) && (
          <>
            <div className="g2">
              <Field label="Tahap"><Seg small value={f.stage} onChange={set('stage')} items={[{ key: 'belum', label: 'Belum order' }, { key: 'nego', label: 'Negosiasi' }]} /></Field>
              <Field label={f.stage === 'nego' ? 'Harga penawaran' : 'Perkiraan harga'}><Money value={f.estimate} onChange={set('estimate')} /></Field>
            </div>
            <div className="g col" style={{ padding: 14, gap: 10 }}>
              <label className="row nowrap" style={{ cursor: 'pointer' }}><input type="checkbox" checked={deal.on} onChange={(e) => setDeal(d => ({ ...d, on: e.target.checked }))} style={{ width: 18, height: 18, accentColor: '#B0566B' }} /><b>Sudah deal dengan vendor ini</b></label>
              {deal.on && (
                <>
                  <Field label="Harga deal"><Money value={deal.amount} onChange={(x) => setDeal(d => ({ ...d, amount: x }))} /></Field>
                  <Field label="Masuk ke item anggaran">
                    <Select value={deal.item} onChange={(x) => setDeal(d => ({ ...d, item: x || '' }))} placeholder="+ Buat item baru" options={freeItems.map(i => ({ value: i.id, label: i.name + ' (rencana ' + rpShort(i.planned) + ')' }))} />
                  </Field>
                  {!deal.item && <Field label="Kategori anggaran"><Select value={deal.cat} onChange={(x) => setDeal(d => ({ ...d, cat: x }))} options={bcats.map(c => ({ value: c.id, label: c.name }))} /></Field>}
                  <div className="xs muted">Pembayaran (DP, termin, pelunasan) dicatat di menu Anggaran.</div>
                </>
              )}
            </div>
          </>
        )}
        {info && info.hasDeal && (
          <div className="g col" style={{ padding: 14, gap: 8 }}>
            <div className="between"><b>Pembayaran</b><Pill cls={info.stage === 'lunas' ? 'p-ok' : 'p-rose'}>{info.stage === 'lunas' ? 'Lunas' : 'Deal'}</Pill></div>
            <div className="between sm"><span className="muted">Dibayar {rp(info.paid)} dari {rp(info.deal)}</span><b>{pct(info.paid, info.deal)}%</b></div>
            <Bar value={pct(info.paid, info.deal)} cls="fd" />
            {info.items.map(it => {
              const m = itemMoney(it, data.payments);
              return <a key={it.id} className="li click" href={wpath(wid, 'anggaran', { i: it.id })} style={{ textDecoration: 'none', color: 'inherit' }}><span className="grow"><b>{it.name}</b><span className="cell-sub">Sisa {rp(m.remain || 0)}{m.next && m.next.due_date ? ' · ' + m.next.label + ' ' + dMed(m.next.due_date) : ''}</span></span><Icon name="right" size={16} /></a>;
            })}
          </div>
        )}
        <Field label="Catatan"><Area value={f.notes} onChange={set('notes')} rows={3} placeholder="Isi paket, syarat, hasil survey…" /></Field>
        {!isNew && f.phone && <a className="btn3" href={waLink(f.phone)} target="_blank" rel="noreferrer"><Icon name="wa" size={16} />Chat WhatsApp</a>}
      </fieldset>
    </Drawer>
  );
}
