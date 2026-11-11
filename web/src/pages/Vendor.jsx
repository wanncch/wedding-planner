import React, { useEffect, useMemo, useState } from 'react';
import { useW } from '../lib/store.jsx';
import { epath } from '../lib/nav.js';
import { Icon, Pill, Tile, Bar, Seg, Drawer, Modal, Field, Text, Area, Money, confirm, Empty, Chips } from '../components/ui.jsx';
import { PersonSelect, PersonChip, SharesTag, PayerField, payerError, payerRow } from '../components/People.jsx';
import { ItemDetail } from '../components/Money.jsx';
import { useEv, EventHeader } from '../components/EventKit.jsx';
import { itemMoney, itemShares, vendorStage } from '../lib/calc.js';
import { personById, defaultPayer, topEvents, rootOf } from '../lib/events.js';
import { rp, rpShort, pct, waLink, dShort } from '../lib/format.js';

const COLS = [
  { key: 'belum', label: 'Belum dipilih', dot: '#D49A4E' },
  { key: 'nego', label: 'Negosiasi', dot: '#9A8790' },
  { key: 'deal', label: 'Deal', dot: '#D49A4E' },
  { key: 'lunas', label: 'Lunas', dot: '#4E7A62' },
];
const CAT_SUGGEST = ['Venue', 'Catering', 'Dekorasi', 'MUA', 'Busana', 'Dokumentasi', 'Wedding organizer', 'MC', 'Hiburan', 'Sound system', 'Undangan', 'Souvenir', 'Seragam', 'Kue', 'Perhiasan', 'Transportasi', 'Lainnya'];

export default function Vendor({ q }) {
  const { data, canEdit, wid } = useW();
  const E = useEv();
  const { ev, scope } = E;
  const [view, setView] = useState('papan');
  const [qs, setQs] = useState('');
  const [flt, setFlt] = useState('all');
  const [edit, setEdit] = useState(null);
  const [book, setBook] = useState(false);
  useEffect(() => { if (q.v) { const it = data.budget_items.find(i => i.id === q.v); if (it) setEdit(it); } }, [q.v]);

  const list = useMemo(() => data.budget_items.filter(i => i.source === 'vendor' && scope.ids.includes(i.event_id)).map(it => {
    const m = itemMoney(it, data.payments);
    return { ...it, _m: m, _st: vendorStage(it, m), _v: data.vendors.find(v => v.id === it.vendor_id) || null, _sh: itemShares(data, it) };
  }), [data, scope.ids.join()]);
  const s = qs.trim().toLowerCase();
  const pass = (it) => {
    if (flt === 'patungan' && it._sh.length < 2) return false;
    if ((flt === 'pria' || flt === 'wanita') && !it._sh.some(x => (personById(data, x.p) || {}).side === flt)) return false;
    return !s || [it.name, it.detail, it._v && it._v.name, it._v && it._v.contact_name, it._v && it._v.category].join(' ').toLowerCase().includes(s);
  };
  const vis = list.filter(pass);
  const total = list.reduce((a, it) => a + (it._m.deal ?? Number(it.planned || 0)), 0);
  const dealt = list.filter(it => it._st === 'deal' || it._st === 'lunas');
  const paid = list.reduce((a, it) => a + it._m.paid, 0);
  const slots = list.filter(it => it._st === 'belum');
  const newSlot = () => setEdit({ _new: true, event_id: scope.target });

  return (
    <>
      <EventHeader title="Vendor"
        actions={<>{canEdit && <button type="button" className="btn2" onClick={() => setBook(true)}><Icon name="note" size={15} />Buku kontak vendor</button>}{canEdit && <button type="button" className="btn" onClick={newSlot}><Icon name="plus" size={15} />Vendor</button>}</>}
        partSub={(xs, p) => (p && p.event_date ? dShort(p.event_date) + ' · ' : '') + data.budget_items.filter(i => i.source === 'vendor' && xs.includes(i.event_id)).length + ' vendor'} />
      <div className="note vio row" style={{ gap: 8, alignItems: 'center' }}><Icon name="link" size={16} /><span style={{ flex: 1 }}>Semua vendor di sini otomatis masuk ke Anggaran {ev.name}, di kelompok <b>Vendor</b>. Harga, penanggung, dan pembayaran cukup diisi di kartu vendor.</span><a className="lnk" href={epath(wid, ev.id, 'anggaran')}>Lihat di Anggaran ›</a></div>

      <section className="tiles ev-tiles">
        <Tile w="w2" icon="wallet" k="Total biaya vendor" v={rpShort(total)} sub={'rencana + deal · ' + list.length + ' vendor'} />
        <Tile w="w3" icon="check" k="Sudah deal" v={dealt.length + ' dari ' + list.length} sub={list.filter(i => i._st === 'lunas').length + ' di antaranya lunas'} />
        <Tile w="w4" icon="card" k="Sudah dibayar" v={rpShort(paid)} sub={pct(paid, total) + '% dari total vendor'} />
        <Tile w="w1" icon="search" k="Belum dipilih" v={slots.length + ' slot'} sub={'rencana ' + rpShort(slots.reduce((a, i) => a + Number(i.planned || 0), 0))} />
      </section>

      <div className="row">
        <Seg value={view} onChange={setView} items={[{ key: 'papan', label: 'Papan' }, { key: 'daftar', label: 'Daftar' }]} />
        <label className="search"><Icon name="search" size={16} /><input value={qs} onChange={(e) => setQs(e.target.value)} placeholder="Cari vendor, kontak, layanan…" /></label>
        <Chips value={flt} onChange={setFlt} items={[{ key: 'all', label: 'Semua' }, { key: 'pria', label: 'Pihak pria' }, { key: 'wanita', label: 'Pihak wanita' }, { key: 'patungan', label: 'Patungan' }]} />
      </div>

      {!list.length ? (
        <div className="g"><Empty icon="store" title="Belum ada vendor" text="Buat slot vendor dulu (mis. Dokumentasi, rencana Rp12 jt). Isi nama vendor saat sudah ada kandidat, lalu harga deal dan pembayarannya." action={canEdit && <button type="button" className="btn" onClick={newSlot}>+ Vendor</button>} /></div>
      ) : view === 'papan' ? (
        <section className="kan">
          {COLS.map(c => {
            const vs = vis.filter(v => v._st === c.key);
            return (
              <div key={c.key} className="kcol">
                <div className="kh">{c.key === 'belum' ? <Icon name="refresh" size={13} style={{ color: c.dot }} /> : <span className="kd" style={{ background: c.dot }} />}<span>{c.label}</span><span className="cnt">{vs.length}</span></div>
                {vs.map(v => <VCard key={v.id} v={v} onOpen={() => setEdit(v)} />)}
                {c.key === 'belum' && canEdit && <button type="button" className="kcard" style={{ alignItems: 'center', color: 'var(--rose3)', fontWeight: 700, background: 'rgba(255,255,255,.4)' }} onClick={newSlot}>+ Slot vendor</button>}
                {c.key === 'lunas' && !vs.length && <div className="xs muted" style={{ textAlign: 'center', padding: 8 }}>Pindah ke sini otomatis saat sisa tagihan Rp0</div>}
              </div>
            );
          })}
        </section>
      ) : (
        <section className="g" style={{ padding: '14px 12px 8px' }}>
          <div className="tw">
            <table className="t stack">
              <thead><tr><th>Layanan</th><th>Vendor</th><th>PIC</th><th>Ditanggung</th><th className="n">Harga</th><th className="n">Dibayar</th><th>Status</th></tr></thead>
              <tbody>
                {vis.map(v => (
                  <tr key={v.id} className="click" onClick={() => setEdit(v)}>
                    <td><b>{v.name}</b>{v.detail && <span className="cell-sub">{v.detail}</span>}</td>
                    <td className="mhide">{v._v ? v._v.name : <span className="muted">Belum dipilih</span>}</td>
                    <td className="mhide"><PersonChip id={v.pic_id} text={v.pic} /></td>
                    <td className="mhide"><SharesTag shares={v._sh} /></td>
                    <td className="n">{rp(v._m.deal ?? v.offer ?? v.planned)}</td>
                    <td className="n mhide">{v._m.paid ? rp(v._m.paid) : '–'}</td>
                    <td><Pill cls={{ lunas: 'p-ok', deal: 'p-rose', nego: 'p-wait', belum: 'p-sel' }[v._st]}>{COLS.find(c => c.key === v._st).label}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {edit && <SlotDrawer slot={edit} onClose={() => setEdit(null)} />}
      {book && <BookDrawer onClose={() => setBook(false)} />}
    </>
  );
}

function VCard({ v, onOpen }) {
  const { data } = useW();
  const E = useEv();
  const m = v._m;
  const st = v._st;
  const others = v._v ? data.budget_items.filter(i => i.vendor_id === v._v.id && rootOf(data, i.event_id) && rootOf(data, i.event_id).id !== E.ev.id).map(i => rootOf(data, i.event_id).name) : [];
  return (
    <button type="button" className={'kcard' + (st === 'belum' ? ' slot' : '')} onClick={onOpen}>
      <span className="nm">{st === 'belum' || !v._v ? v.name : v._v.name}</span>
      <span className="xs muted">{st === 'belum' ? v.detail || 'Vendor belum dipilih' : [v.name, v.detail].filter(Boolean).join(' · ')}</span>
      <span className="between sm"><span className="muted">{st === 'belum' ? 'Rencana' : st === 'nego' ? 'Penawaran' : st === 'lunas' ? 'Lunas' : 'Deal'}</span><b>{rp(st === 'belum' ? v.planned : st === 'nego' ? (v.offer ?? v.planned) : m.deal)}</b></span>
      {st === 'deal' && <Bar value={pct(m.paid, m.deal)} cls="fs" />}
      <span className="between nowrap" style={{ gap: 6 }}><SharesTag shares={v._sh} />{st === 'deal' ? <span className="xs muted">dibayar {rpShort(m.paid)}</span> : st === 'lunas' ? <Pill cls="p-ok">Lunas</Pill> : null}</span>
      {(st === 'belum' || st === 'nego') && <span className="between nowrap xs" style={{ gap: 6 }}><span className="muted ell">{v.notes || (st === 'belum' ? 'Belum ada kandidat' : '')}</span><PersonChip id={v.pic_id} text={v.pic} /></span>}
      {others.length > 0 && <span className="auto"><Icon name="link" size={11} />Kontak sama dengan vendor di {Array.from(new Set(others)).join(', ')}</span>}
    </button>
  );
}

/* ---------------- Slot vendor (per acara) ---------------- */
function SlotDrawer({ slot, onClose }) {
  const { data, add, save, del, canEdit } = useW();
  const E = useEv();
  const isNew = !!slot._new;
  const [f, setF] = useState({
    name: slot.name || '', detail: slot.detail || '', event_id: slot.event_id || E.scope.target, vendor_id: slot.vendor_id || '',
    planned: slot.planned ?? null, offer: slot.offer ?? null, deal: slot.deal ?? null, pic_id: slot.pic_id || null, notes: slot.notes || '',
  });
  const [pay, setPay] = useState({ payer_id: slot.payer_id || defaultPayer(data, slot.event_id || E.scope.target), shares: slot.shares || [] });
  const [nv, setNv] = useState(null);   // kontak vendor baru
  const [err, setErr] = useState({});
  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }));
  const vendor = data.vendors.find(v => v.id === f.vendor_id);
  const payerDef = personById(data, defaultPayer(data, f.event_id));

  async function submit() {
    const er = {};
    if (!f.name.trim()) er.name = 'Isi layanan, mis. Dokumentasi.';
    if (!f.pic_id) er.pic = 'Pilih PIC.';
    const pe = payerError(pay); if (pe) er.pay = pe;
    if (nv && !nv.name.trim()) er.vendor = 'Isi nama vendor baru.';
    setErr(er);
    if (Object.keys(er).length) return;
    let vendor_id = f.vendor_id || null;
    onClose();
    if (nv) { const r = await add('vendors', { name: nv.name.trim(), category: nv.category, contact_name: nv.contact_name, phone: nv.phone, instagram: '', notes: '', stage: 'belum', sort: data.vendors.length + 1 }); vendor_id = r && r.id; }
    const row = { name: f.name.trim(), detail: f.detail, event_id: f.event_id, vendor_id, planned: f.planned || 0, offer: vendor_id ? f.offer : null, deal: vendor_id ? f.deal : null, pic_id: f.pic_id, notes: f.notes, source: 'vendor', ...payerRow(pay) };
    if (isNew) await add('budget_items', { ...row, category_id: null, sort: 999 });
    else await save('budget_items', slot.id, row);
  }
  async function remove() {
    if (await confirm({ title: 'Hapus vendor dari acara ini?', text: '“' + slot.name + '” dan catatan pembayarannya dihapus dari ' + E.ev.name + '. Kontak vendor tetap ada di buku kontak.', ok: 'Hapus', danger: true })) { onClose(); del('budget_items', slot.id); }
  }
  return (
    <Drawer open onClose={onClose} title={isNew ? 'Vendor baru' : (vendor ? vendor.name : slot.name)} eyebrow={E.ev.name + ' · Vendor'} wide
      footer={canEdit ? <>{!isNew && <button type="button" className="btn2" onClick={remove} style={{ marginRight: 'auto' }}><Icon name="trash" size={15} />Hapus</button>}<button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn" onClick={submit}>Simpan</button></> : null}>
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, display: 'contents' }}>
        <div className="g2">
          <Field label="Layanan" hint="Wajib" error={err.name}><Text value={f.name} onChange={set('name')} placeholder="mis. Dokumentasi" /></Field>
          <Field label="Keterangan"><Text value={f.detail} onChange={set('detail')} placeholder="mis. Foto & video akad, resepsi" /></Field>
        </div>
        {E.scope.parts.length > 0 && <Field label="Bagian acara"><Seg small value={f.event_id} onChange={set('event_id')} items={E.scope.parts.map(p => ({ key: p.id, label: p.name }))} /></Field>}
        <Field div label="Vendor" hint="dari buku kontak" error={err.vendor}>
          {nv ? (
            <div className="partbox">
              <div className="g2">
                <Field label="Nama vendor"><Text value={nv.name} onChange={(v) => setNv(x => ({ ...x, name: v }))} placeholder="mis. Dapur Ibu Ratna" /></Field>
                <Field label="Kategori"><input className="inp" list="vcat" value={nv.category} onChange={(e) => setNv(x => ({ ...x, category: e.target.value }))} placeholder="Catering" /><datalist id="vcat">{CAT_SUGGEST.map(c => <option key={c} value={c} />)}</datalist></Field>
                <Field label="Nama kontak"><Text value={nv.contact_name} onChange={(v) => setNv(x => ({ ...x, contact_name: v }))} /></Field>
                <Field label="No. WhatsApp"><Text value={nv.phone} onChange={(v) => setNv(x => ({ ...x, phone: v }))} inputMode="tel" placeholder="08…" /></Field>
              </div>
              <button type="button" className="lnk" style={{ alignSelf: 'flex-start' }} onClick={() => setNv(null)}>Pilih dari buku kontak saja</button>
            </div>
          ) : (
            <div className="row nowrap">
              <select className="inp" value={f.vendor_id} onChange={(e) => set('vendor_id')(e.target.value)}>
                <option value="">Belum dipilih</option>
                {[...data.vendors].sort((a, b) => a.name.localeCompare(b.name)).map(v => <option key={v.id} value={v.id}>{v.name}{v.category ? ' · ' + v.category : ''}</option>)}
              </select>
              <button type="button" className="btn2" onClick={() => setNv({ name: '', category: f.name, contact_name: '', phone: '' })}>+ Kontak baru</button>
            </div>
          )}
        </Field>
        <div className="g3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
          <Field label="Rencana biaya"><Money value={f.planned} onChange={set('planned')} /></Field>
          {(f.vendor_id || nv) && <Field label="Harga penawaran"><Money value={f.offer} onChange={set('offer')} placeholder="Rp –" /></Field>}
          {(f.vendor_id || nv) && <Field label="Harga deal" hint="isi saat sepakat"><Money value={f.deal} onChange={set('deal')} placeholder="Rp –" /></Field>}
        </div>
        <div className="g2">
          <Field div label="PIC · yang mengurus" hint="Wajib" error={err.pic}><PersonSelect value={f.pic_id} onChange={set('pic_id')} invalid={!!err.pic} /></Field>
          <Field div label="Ditanggung oleh" hint="Wajib" error={err.pay}><PayerField value={pay} onChange={setPay} amount={f.deal ?? f.offer ?? f.planned} invalid={!!err.pay} hint={payerDef ? 'Bawaan: ' + payerDef.name : ''} /></Field>
        </div>
        <Field label="Catatan"><Area value={f.notes} onChange={set('notes')} rows={2} placeholder="mis. 3 kandidat dibandingkan · trial makeup 12 Des" /></Field>
        {vendor && vendor.phone && <a className="btn3" href={waLink(vendor.phone)} target="_blank" rel="noreferrer" style={{ alignSelf: 'flex-start' }}><Icon name="wa" size={16} />Chat WhatsApp {vendor.contact_name || ''}</a>}
      </fieldset>
      {!isNew && slot.vendor_id && slot.deal !== null && slot.deal !== undefined && (
        <div className="g col" style={{ padding: 14 }}>
          <div className="h2" style={{ fontSize: 16 }}>Pembayaran</div>
          <ItemDetail itemId={slot.id} />
        </div>
      )}
      {!isNew && (!slot.vendor_id || slot.deal === null || slot.deal === undefined) && <div className="xs muted">Pembayaran bisa dicatat setelah harga deal disimpan.</div>}
    </Drawer>
  );
}

/* ---------------- Buku kontak vendor (dipakai semua acara) ---------------- */
function BookDrawer({ onClose }) {
  const { data, canEdit } = useW();
  const [edit, setEdit] = useState(null);
  const [qs, setQs] = useState('');
  const t = qs.trim().toLowerCase();
  const list = [...data.vendors].filter(v => !t || [v.name, v.category, v.contact_name, v.phone].join(' ').toLowerCase().includes(t)).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Drawer open onClose={onClose} title="Buku kontak vendor" eyebrow="Dipakai di semua acara · harga diisi per acara"
      head={<label className="search" style={{ flex: 'none' }}><Icon name="search" size={16} /><input value={qs} onChange={(e) => setQs(e.target.value)} placeholder="Cari nama, kategori, nomor…" /></label>}
      footer={canEdit ? <button type="button" className="btn" onClick={() => setEdit({ _new: true })}><Icon name="plus" size={15} />Kontak</button> : null}>
      {list.map(v => {
        const used = Array.from(new Set(data.budget_items.filter(i => i.vendor_id === v.id).map(i => (rootOf(data, i.event_id) || {}).name).filter(Boolean)));
        return (
          <div key={v.id} className="li click" onClick={() => setEdit(v)}>
            <span className="ico"><Icon name="store" /></span>
            <div className="grow"><b>{v.name}</b><div className="xs muted ell">{[v.category, v.contact_name, v.phone].filter(Boolean).join(' · ')}</div></div>
            <span className="xs muted" style={{ textAlign: 'right' }}>{used.length ? used.join(', ') : 'belum dipakai'}</span>
          </div>
        );
      })}
      {!list.length && <div className="muted">Belum ada kontak vendor.</div>}
      {edit && <ContactModal v={edit} onClose={() => setEdit(null)} />}
    </Drawer>
  );
}

function ContactModal({ v, onClose }) {
  const { data, add, save, del, canEdit } = useW();
  const isNew = !!v._new;
  const [f, setF] = useState({ name: v.name || '', category: v.category || '', contact_name: v.contact_name || '', phone: v.phone || '', instagram: v.instagram || '', notes: v.notes || '' });
  const set = (k) => (x) => setF(y => ({ ...y, [k]: x }));
  async function submit() {
    if (!f.name.trim()) return;
    onClose();
    if (isNew) await add('vendors', { ...f, name: f.name.trim(), stage: 'belum', sort: data.vendors.length + 1 });
    else await save('vendors', v.id, { ...f, name: f.name.trim() });
  }
  async function remove() {
    const n = data.budget_items.filter(i => i.vendor_id === v.id).length;
    if (await confirm({ title: 'Hapus kontak?', text: '“' + v.name + '” dihapus dari buku kontak.' + (n ? ' ' + n + ' slot vendor yang memakainya kembali ke Belum dipilih.' : ''), ok: 'Hapus', danger: true })) { onClose(); del('vendors', v.id, { silent: true }); }
  }
  return (
    <Modal open onClose={onClose} title={isNew ? 'Kontak vendor baru' : v.name}
      footer={canEdit ? <>{!isNew && <button type="button" className="btn2" style={{ marginRight: 'auto' }} onClick={remove} aria-label="Hapus kontak"><Icon name="trash" size={15} /></button>}<button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn" disabled={!f.name.trim()} onClick={submit}>Simpan</button></> : null}>
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="g2">
          <Field label="Nama vendor"><Text value={f.name} onChange={set('name')} /></Field>
          <Field label="Kategori"><input className="inp" list="vcat2" value={f.category} onChange={(e) => set('category')(e.target.value)} /><datalist id="vcat2">{CAT_SUGGEST.map(c => <option key={c} value={c} />)}</datalist></Field>
          <Field label="Nama kontak"><Text value={f.contact_name} onChange={set('contact_name')} /></Field>
          <Field label="No. WhatsApp"><Text value={f.phone} onChange={set('phone')} inputMode="tel" /></Field>
        </div>
        <Field label="Instagram / website"><Text value={f.instagram} onChange={set('instagram')} placeholder="@vendor" /></Field>
        <Field label="Catatan"><Area value={f.notes} onChange={set('notes')} rows={2} /></Field>
      </fieldset>
    </Modal>
  );
}
