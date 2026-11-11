import React, { useState } from 'react';
import { useW } from '../lib/store.jsx';
import { Icon, Pill, Bar, Modal, Field, Text, Money, Select, Seg, DateIn, confirm } from './ui.jsx';
import FileField from './FileField.jsx';
import { PersonChip, SharesTag } from './People.jsx';
import { openFile, fileName } from '../lib/files.js';
import { itemMoney, itemStatus, itemShares } from '../lib/calc.js';
import { personById, eventById } from '../lib/events.js';
import { rp, rpShort, dMed, dShort, iso, today, pct } from '../lib/format.js';

/** Detail item anggaran / slot vendor: penanggung, pembayaran, kontrak. */
export function ItemDetail({ itemId, onEdit }) {
  const { data, canEdit } = useW();
  const [pay, setPay] = useState(null);
  const item = data.budget_items.find(i => i.id === itemId);
  if (!item) return <div className="muted">Item sudah dihapus.</div>;
  const m = itemMoney(item, data.payments);
  const st = itemStatus(item, m);
  const shares = itemShares(data, item);
  const cat = data.budget_categories.find(c => c.id === item.category_id);
  const evt = eventById(data, item.event_id);
  const vendor = data.vendors.find(v => v.id === item.vendor_id);
  const pays = [...m.payments].sort((a, b) => String(a.paid_on || a.due_date || '9').localeCompare(String(b.paid_on || b.due_date || '9')));
  const base = m.deal ?? Number(item.planned || 0);
  return (
    <div className="col">
      <div className="between"><Pill cls={st.cls}>{st.label}</Pill><span className="xs muted">{item.source === 'vendor' ? 'Vendor' : cat ? cat.name : ''}{evt ? ' · ' + evt.name : ''}</span></div>
      {(vendor || item.detail) && <div className="xs muted">{[vendor && vendor.name, vendor && vendor.phone, item.detail].filter(Boolean).join(' · ')}</div>}
      <div className="g2" style={{ gap: 8 }}>
        <div><div className="k">Rencana</div><b>{rp(item.planned)}</b></div>
        <div><div className="k">{item.offer && m.deal === null ? 'Penawaran' : 'Harga deal'}</div><b>{m.deal !== null ? rp(m.deal) : item.offer ? rp(item.offer) : '–'}</b></div>
        <div><div className="k">PIC</div><PersonChip id={item.pic_id} text={item.pic} /></div>
        <div><div className="k">Ditanggung oleh</div><SharesTag shares={shares} /></div>
      </div>
      {shares.length > 1 && (
        <div className="split-box" style={{ gap: 4 }}>
          {shares.map(s => <div key={s.p} className="between sm"><span>{(personById(data, s.p) || {}).name} · {s.pct}%</span><b>{rp(base * s.pct / 100)}</b><span className="xs muted">dibayar {rpShort(m.paid * s.pct / 100)}</span></div>)}
        </div>
      )}
      {m.deal !== null && (
        <>
          <div className="between"><span className="k">Dibayar {rpShort(m.paid)} dari {rpShort(m.deal)}</span><b>{pct(m.paid, m.deal)}%</b></div>
          <Bar value={pct(m.paid, m.deal)} cls="fd" />
        </>
      )}
      <div>
        <div className="lbl" style={{ marginBottom: 4 }}>Jadwal pembayaran</div>
        {pays.map(p => (
          <button type="button" key={p.id} className="pay" style={{ width: '100%', background: 'none', border: 0, textAlign: 'left', borderBottom: '1px dashed rgba(176,86,107,.15)' }} onClick={() => canEdit && setPay(p)}>
            <span className={'dotc' + (p.paid_on ? ' on' : '')} />
            <span style={{ flex: 1 }}><b>{p.label}</b><span className="xs muted" style={{ display: 'block' }}>{p.paid_on ? 'Dibayar ' + dShort(p.paid_on) + (p.method ? ' · ' + p.method.toLowerCase() : '') + (p.proof_url ? ' · bukti ✓' : '') : p.due_date ? 'Jatuh tempo ' + dMed(p.due_date) + ' · belum dibayar' : 'Belum dijadwalkan'}</span></span>
            <b>{rpShort(p.amount)}</b>
          </button>
        ))}
        {!pays.length && <div className="xs muted">Belum ada pembayaran atau jadwal termin.</div>}
        {shares.length > 1 && pays.length > 0 && <div className="xs muted" style={{ marginTop: 4 }}>Setiap pembayaran dibagi {shares.map(s => s.pct).join(' : ')}.</div>}
      </div>
      {canEdit && <div className="row"><button type="button" className="btn" onClick={() => setPay({ _new: true })} style={{ flex: 1 }}>Catat pembayaran</button>{onEdit && <button type="button" className="btn2" onClick={onEdit}><Icon name="edit" size={15} />Ubah</button>}</div>}
      {item.notes && <div className="sm" style={{ lineHeight: 1.55 }}><b>Catatan</b><br />{item.notes}</div>}
      <div className="row xs" style={{ gap: 6 }}>
        {item.inspo_url && <button type="button" className="pill p-rose" style={{ border: 0 }} onClick={() => openFile(item.inspo_url)}>🔗 Inspirasi</button>}
        {item.contract_url && <button type="button" className="pill p-no" style={{ border: 0 }} onClick={() => openFile(item.contract_url)}>📎 {fileName(item.contract_url) || 'Kontrak'}</button>}
      </div>
      {pay && <PaymentModal item={item} m={m} pay={pay} onClose={() => setPay(null)} />}
    </div>
  );
}

export function PaymentModal({ item, m, pay, onClose }) {
  const { add, save, del } = useW();
  const isNew = !!pay._new;
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
