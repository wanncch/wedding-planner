import React, { useState } from 'react';
import { useW, useToast } from '../lib/store.jsx';
import { friendlyError } from '../lib/supabase.js';
import { wpath } from '../lib/nav.js';
import { Icon, Pill, Chips, Modal, Field, Text, NumIn } from '../components/ui.jsx';
import { guestSummary } from '../lib/calc.js';
import { pct } from '../lib/format.js';

export default function Checkin() {
  const { data, wid, rpc, commit, canEdit, add } = useW();
  const toast = useToast();
  const s = guestSummary(data.guests, data.wedding);
  const [qs, setQs] = useState('');
  const [flt, setFlt] = useState('belum');
  const [walkin, setWalkin] = useState(false);
  const [adj, setAdj] = useState(null);
  const t = qs.trim().toLowerCase();
  const list = data.guests.filter(g => {
    if (flt === 'belum' && g.checked_in_at) return false;
    if (flt === 'sudah' && !g.checked_in_at) return false;
    if (flt === 'vip' && !g.is_vip) return false;
    return !t || [g.name, g.source, g.relation, g.table_no].join(' ').toLowerCase().includes(t);
  }).sort((a, b) => (flt === 'sudah' ? String(b.checked_in_at).localeCompare(String(a.checked_in_at)) : a.name.localeCompare(b.name, 'id'))).slice(0, 60);

  async function checkin(g, pax, undo) {
    const before = g;
    commit(prev => ({ ...prev, guests: prev.guests.map(x => x.id === g.id ? { ...x, checked_in_at: undo ? null : new Date().toISOString(), arrived_pax: undo ? null : pax, rsvp: undo ? x.rsvp : 'hadir' } : x) }));
    try {
      const row = await rpc('check_in_guest', { p_guest: g.id, p_pax: pax, p_undo: !!undo });
      if (row) commit(prev => ({ ...prev, guests: prev.guests.map(x => x.id === g.id ? row : x) }));
      if (!undo) toast(g.name + ' hadir · ' + pax + ' orang', 'ok');
    } catch (e) {
      commit(prev => ({ ...prev, guests: prev.guests.map(x => x.id === g.id ? before : x) }));
      toast(friendlyError(e), 'error');
    }
  }
  const time = (iso) => new Date(iso).toTimeString().slice(0, 5).replace(':', '.');

  return (
    <div className="full">
      <div className="between"><a className="btn2 sm" href={wpath(wid, 'tamu')}><Icon name="left" size={15} />Keluar</a><Pill cls="p-ok">Mode check-in</Pill></div>
      <div className="livecard sage">
        <div style={{ fontSize: 12, fontWeight: 700, opacity: .9 }}>Sudah datang</div>
        <div className="row nowrap" style={{ alignItems: 'baseline', gap: 8 }}><span style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 42, lineHeight: 1.05 }}>{s.arrivedPax}</span><span style={{ fontSize: 14, opacity: .9 }}>dari {s.people} orang</span></div>
        <div className="wbar" style={{ marginTop: 10 }}><i style={{ width: pct(s.arrivedPax, s.people) + '%' }} /></div>
        <div style={{ fontSize: 12, opacity: .9, marginTop: 6 }}>{s.arrived} undangan · ter-update langsung di semua HP</div>
      </div>
      <label className="search" style={{ flex: 'none', padding: '2px 14px' }}><Icon name="search" size={18} /><input value={qs} onChange={(e) => setQs(e.target.value)} placeholder="Cari nama tamu…" style={{ fontSize: 15 }} autoComplete="off" /></label>
      <Chips value={flt} onChange={setFlt} items={[{ key: 'belum', label: 'Belum datang' }, { key: 'sudah', label: 'Sudah' }, { key: 'vip', label: 'VIP' }, { key: 'all', label: 'Semua' }]} />
      <div className="g" style={{ padding: '6px 14px' }}>
        {list.map(g => (
          <div className="li" key={g.id}>
            <div className="grow"><b style={{ fontSize: 13.5 }} className="ell">{g.name}</b><div className="xs muted ell">{[g.source, g.pax + ' org', g.table_no && 'Meja ' + g.table_no].filter(Boolean).join(' · ')}</div></div>
            {g.checked_in_at
              ? <button type="button" className="pill p-ok" style={{ border: 0 }} onClick={() => setAdj(g)}>✓ {time(g.checked_in_at)} · {g.arrived_pax ?? g.pax}</button>
              : <button type="button" className="btn3 sm" style={{ minWidth: 72 }} onClick={() => checkin(g, g.pax)}>Hadir</button>}
          </div>
        ))}
        {!list.length && <div className="muted" style={{ padding: 14 }}>{t ? 'Nama tidak ditemukan. Tambahkan sebagai tamu tidak terdaftar.' : 'Tidak ada tamu di daftar ini.'}</div>}
      </div>
      {canEdit && <button type="button" className="btn2" onClick={() => setWalkin(true)}>+ Tamu tidak terdaftar</button>}
      {adj && <AdjustModal g={adj} onClose={() => setAdj(null)} onSave={(pax) => checkin(adj, pax)} onUndo={() => checkin(adj, 0, true)} />}
      {walkin && <WalkinModal initial={qs} onClose={() => setWalkin(false)} onSave={(name, pax) => add('guests', { name, pax, rsvp: 'hadir', checked_in_at: new Date().toISOString(), arrived_pax: pax, source: 'Tidak terdaftar', sent: false })} />}
    </div>
  );
}

function AdjustModal({ g, onClose, onSave, onUndo }) {
  const [pax, setPax] = useState(g.arrived_pax ?? g.pax);
  return (
    <Modal open onClose={onClose} title={g.name}
      footer={<><button type="button" className="btn2" style={{ marginRight: 'auto' }} onClick={() => { onClose(); onUndo(); }}>Batalkan check-in</button><button type="button" className="btn" onClick={() => { onClose(); onSave(pax || 0); }}>Simpan</button></>}>
      <Field label="Jumlah yang datang"><NumIn value={pax} onChange={setPax} /></Field>
    </Modal>
  );
}
function WalkinModal({ initial, onClose, onSave }) {
  const [name, setName] = useState(initial || '');
  const [pax, setPax] = useState(1);
  return (
    <Modal open onClose={onClose} title="Tamu tidak terdaftar"
      footer={<><button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn3" disabled={!name.trim()} onClick={() => { onClose(); onSave(name.trim(), pax || 1); }}>Catat hadir</button></>}>
      <Field label="Nama"><Text value={name} onChange={setName} autoFocus /></Field>
      <Field label="Jumlah orang"><NumIn value={pax} onChange={setPax} min={1} /></Field>
    </Modal>
  );
}
