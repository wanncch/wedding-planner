import React, { useEffect, useRef, useState } from 'react';
import { useW } from '../lib/store.jsx';
import { Icon, Avatar, Field, Text, Seg, Modal, Toggle, NumIn, confirm } from './ui.jsx';
import { SIDES, personById, peopleSorted, sideCls, sideLabel } from '../lib/events.js';
import { rp } from '../lib/format.js';

/** Nama orang dengan avatar kecil. */
export function PersonChip({ id, text, dim }) {
  const { data } = useW();
  const p = personById(data, id);
  if (!p) {
    if (text) return <span className="pill p-sel" title={'Tertulis: ' + text}>Pilih ulang · {text}</span>;
    return <span className="muted">–</span>;
  }
  return <span className="pc"><Avatar name={p.name} side={p.side} /><span className={'ell' + (dim ? ' muted' : '')}>{p.name}</span></span>;
}

/** Label pihak berwarna, mis. "Keluarga Bagas" biru */
export function PayerTag({ id }) {
  const { data } = useW();
  const p = personById(data, id);
  if (!p) return <span className="muted">–</span>;
  return <span className={'pill ' + sideCls(p.side)}>{p.name}</span>;
}
export function SharesTag({ shares }) {
  const { data } = useW();
  if (!shares || !shares.length) return <span className="muted">–</span>;
  if (shares.length === 1) return <PayerTag id={shares[0].p} />;
  return <span className="pill p-mauve" title={shares.map(s => personById(data, s.p)?.name + ' ' + s.pct + '%').join(' · ')}>Patungan · {shares.map(s => (personById(data, s.p)?.name || '?').split(' ').slice(-1)[0] + ' ' + s.pct + '%').join(' · ')}</span>;
}

/**
 * Pilihan orang dari daftar Orang & pihak, dikelompokkan per pihak.
 * mode: 'pic' (yang bisa jadi PIC) | 'pay' (yang bisa jadi penanggung)
 */
export function PersonSelect({ value, onChange, mode = 'pic', placeholder = 'Pilih orang', extra, disabled, invalid }) {
  const { data, canEdit } = useW();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const all = peopleSorted(data).filter(p => (mode === 'pay' ? p.can_pay : p.can_pic) || p.id === value);
  const t = q.trim().toLowerCase();
  const list = all.filter(p => !t || (p.name + ' ' + p.role_label).toLowerCase().includes(t));
  const cur = personById(data, value);
  const pick = (id) => { onChange(id); setOpen(false); setQ(''); };
  return (
    <div className={'ps' + (open ? ' open' : '')} ref={ref}>
      <button type="button" className={'inp psb' + (invalid ? ' bad' : '')} disabled={disabled} onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open}>
        {extra && value === extra.key ? <span className="row nowrap" style={{ gap: 8 }}><b>{extra.label}</b>{extra.sub && <span className="xs muted">{extra.sub}</span>}</span>
          : cur ? <span className="row nowrap" style={{ gap: 8, minWidth: 0 }}><Avatar name={cur.name} side={cur.side} /><b className="ell">{cur.name}</b><span className="xs muted ell">{sideLabel(cur.side).toLowerCase()}</span></span>
            : <span className="muted" style={{ fontWeight: 500 }}>{placeholder}</span>}
        <Icon name="down" size={16} style={{ marginLeft: 'auto', color: 'var(--mut)' }} />
      </button>
      {open && (
        <div className="psp" role="listbox">
          <label className="search" style={{ flex: 'none' }}><Icon name="search" size={15} /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama…" /></label>
          <div className="psl">
            {extra && <button type="button" className={'pso' + (value === extra.key ? ' on' : '')} onClick={() => pick(extra.key)}><span className="ico" style={{ width: 28, height: 28 }}><Icon name="users" size={14} /></span><span className="grow"><b>{extra.label}</b><span className="xs muted" style={{ display: 'block' }}>{extra.desc}</span></span></button>}
            {SIDES.map(s => {
              const ps = list.filter(p => p.side === s.key);
              if (!ps.length) return null;
              return (
                <React.Fragment key={s.key}>
                  <div className={'lbl psg ' + s.key}>{s.label}</div>
                  {ps.map(p => (
                    <button type="button" key={p.id} role="option" aria-selected={p.id === value} className={'pso' + (p.id === value ? ' on' : '')} onClick={() => pick(p.id)}>
                      <Avatar name={p.name} side={p.side} /><span className="grow"><b>{p.name}</b>{p.role_label && <span className="xs muted" style={{ display: 'block' }}>{p.role_label}</span>}</span>
                      {p.id === value && <Icon name="check" size={15} />}
                    </button>
                  ))}
                </React.Fragment>
              );
            })}
            {!list.length && <div className="xs muted" style={{ padding: 10 }}>Tidak ada nama yang cocok.</div>}
          </div>
          {canEdit && <button type="button" className="lnk" style={{ padding: '8px 10px', textAlign: 'left' }} onClick={() => setAdding(true)}>+ Tambah orang</button>}
        </div>
      )}
      {adding && <PersonModal person={{ _new: true, name: q, can_pic: mode !== 'pay', can_pay: mode === 'pay' }} onClose={() => setAdding(false)} onSaved={(p) => pick(p.id)} />}
    </div>
  );
}

/** Tambah / ubah orang */
export function PersonModal({ person, onClose, onSaved }) {
  const { data, add, save, del, people: members } = useW();
  const isNew = !!person._new;
  const [f, setF] = useState({ name: person.name || '', role_label: person.role_label || '', side: person.side || 'lainnya', can_pic: person.can_pic ?? true, can_pay: !!person.can_pay, user_ids: person.user_ids || [] });
  const [err, setErr] = useState('');
  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }));
  async function submit() {
    if (!f.name.trim()) { setErr('Isi nama.'); return; }
    const row = { ...f, name: f.name.trim(), role_label: f.role_label.trim() };
    onClose();
    if (isNew) { const r = await add('people', { ...row, sort: (data.people || []).length + 10 }); if (r && onSaved) onSaved(r); }
    else { await save('people', person.id, row); if (onSaved) onSaved({ ...person, ...row }); }
  }
  async function remove() {
    const n = data.tasks.filter(t => t.pic_id === person.id).length + data.budget_items.filter(i => i.pic_id === person.id || i.payer_id === person.id).length;
    if (await confirm({ title: 'Hapus ' + person.name + '?', text: n ? n + ' tugas / item yang memakai nama ini akan ditandai "pilih ulang".' : 'Nama ini dihapus dari daftar.', ok: 'Hapus', danger: true })) { onClose(); del('people', person.id, { silent: true }); }
  }
  const linked = members.find(m => f.user_ids.includes(m.user_id));
  return (
    <Modal open onClose={onClose} title={isNew ? 'Tambah orang' : 'Ubah ' + person.name}
      footer={<>{!isNew && !person.kind && <button type="button" className="btn2" style={{ marginRight: 'auto' }} onClick={remove} aria-label="Hapus orang"><Icon name="trash" size={15} /></button>}<button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn" onClick={submit}>Simpan</button></>}>
      <Field label="Nama" error={err}><Text value={f.name} onChange={set('name')} placeholder="mis. Ibu Rina, Om Yusuf, WO Kirana" autoFocus /></Field>
      <Field label="Keterangan" hint="opsional"><Text value={f.role_label} onChange={set('role_label')} placeholder="mis. Ibu pengantin wanita" /></Field>
      <Field label="Pihak" hint="menentukan hitungan pria / wanita"><Seg value={f.side} onChange={set('side')} items={[{ key: 'wanita', label: 'Wanita' }, { key: 'pria', label: 'Pria' }, { key: 'lainnya', label: 'Lainnya' }]} /></Field>
      <div className="row" style={{ gap: 20 }}>
        <label className="row nowrap" style={{ gap: 10 }}><Toggle on={f.can_pic} onChange={set('can_pic')} /><span className="sm"><b>Bisa jadi PIC</b></span></label>
        <label className="row nowrap" style={{ gap: 10 }}><Toggle on={f.can_pay} onChange={set('can_pay')} /><span className="sm"><b>Bisa jadi penanggung</b></span></label>
      </div>
      {members.length > 0 && (
        <Field label="Akun aplikasi" hint="untuk tampilan Punyaku">
          <select className="inp" value={linked ? linked.user_id : ''} onChange={(e) => set('user_ids')(e.target.value ? [e.target.value] : [])}>
            <option value="">Tidak terhubung</option>
            {members.map(m => <option key={m.user_id} value={m.user_id}>{m.name}{m.email ? ' · ' + m.email : ''}</option>)}
          </select>
        </Field>
      )}
    </Modal>
  );
}

/**
 * "Ditanggung oleh": satu penanggung atau patungan dengan persen.
 * value: { payer_id, shares: [{p, pct}] }
 */
export function PayerField({ value, onChange, amount, hint, invalid }) {
  const { data } = useW();
  const shares = value.shares || [];
  const isSplit = shares.length > 1;
  const total = shares.reduce((s, x) => s + Number(x.pct || 0), 0);
  const setShares = (sh) => onChange({ payer_id: sh[0] ? sh[0].p : value.payer_id, shares: sh });
  function pick(v) {
    if (v === '__split') {
      const first = value.payer_id || (shares[0] && shares[0].p);
      const other = peopleSorted(data).find(p => p.can_pay && p.id !== first);
      setShares([{ p: first, pct: 50 }, { p: other ? other.id : null, pct: 50 }]);
    } else onChange({ payer_id: v, shares: [] });
  }
  return (
    <div className="col" style={{ gap: 8 }}>
      <PersonSelect mode="pay" value={isSplit ? '__split' : value.payer_id} onChange={pick} invalid={invalid}
        extra={{ key: '__split', label: 'Patungan', sub: isSplit ? shares.length + ' pihak' : '', desc: 'Dibagi beberapa penanggung dengan persen' }} placeholder="Pilih penanggung" />
      {hint && <div className="xs muted">{hint}</div>}
      {isSplit && (
        <div className="split-box">
          <div className="between"><b className="sm">Pembagian biaya</b><span className={'pill ' + (total === 100 ? 'p-ok' : 'p-bad')}>Total {total}%</span></div>
          <div className="sb-grid xs muted"><span>Penanggung</span><span>Persen</span><span style={{ textAlign: 'right' }}>Bagian</span></div>
          {shares.map((s, i) => (
            <div className="sb-grid" key={i}>
              <PersonSelect mode="pay" value={s.p} onChange={(p) => setShares(shares.map((x, j) => (j === i ? { ...x, p } : x)))} />
              <div className="row nowrap" style={{ gap: 4 }}><NumIn value={s.pct} onChange={(v) => setShares(shares.map((x, j) => (j === i ? { ...x, pct: v || 0 } : x)))} min={0} max={100} /><span className="muted">%</span></div>
              <span className="row nowrap" style={{ justifyContent: 'flex-end', gap: 4 }}><b className="sm">{rp(Math.round((amount || 0) * (s.pct || 0) / 100))}</b>{shares.length > 2 && <button type="button" className="x" style={{ width: 26, height: 26 }} onClick={() => setShares(shares.filter((_, j) => j !== i))} aria-label="Hapus penanggung"><Icon name="x" size={13} /></button>}</span>
            </div>
          ))}
          <div className="row"><button type="button" className="lnk" onClick={() => setShares([...shares, { p: null, pct: Math.max(0, 100 - total) }])}>+ Tambah penanggung</button>
            <button type="button" className="lnk" style={{ marginLeft: 'auto' }} onClick={() => onChange({ payer_id: shares[0] && shares[0].p, shares: [] })}>Batalkan patungan</button></div>
        </div>
      )}
    </div>
  );
}

/** Validasi penanggung: kembalikan pesan error atau '' */
export function payerError(v) {
  const sh = v.shares || [];
  if (sh.length > 1) {
    if (sh.some(s => !s.p)) return 'Pilih semua penanggung patungan.';
    if (sh.reduce((s, x) => s + Number(x.pct || 0), 0) !== 100) return 'Total persen patungan harus 100%.';
    return '';
  }
  return v.payer_id ? '' : 'Pilih siapa yang menanggung biaya ini.';
}
export const payerRow = (v) => ((v.shares || []).length > 1 ? { payer_id: v.shares[0].p, shares: v.shares.map(s => ({ p: s.p, pct: Number(s.pct) })) } : { payer_id: v.payer_id, shares: [] });
