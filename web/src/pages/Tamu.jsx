import React, { useMemo, useState } from 'react';
import { useW } from '../lib/store.jsx';
import { wpath } from '../lib/nav.js';
import { Icon, Chips, Pill, Tile, Bar, Drawer, Modal, Field, Text, Area, NumIn, Seg, Toggle, confirm, Empty, useIsMobile } from '../components/ui.jsx';
import { useEv, EventHeader } from '../components/EventKit.jsx';
import { invitesFor, inviteSummary } from '../lib/calc.js';
import { topEvents, partsOf, rootOf } from '../lib/events.js';
import { pct, waLink, dLong, hm } from '../lib/format.js';

const RSVP = { belum: ['Belum jawab', 'p-wait'], hadir: ['Hadir', 'p-ok'], tidak: ['Tidak hadir', 'p-bad'], ragu: ['Ragu', 'p-wait'] };
const SIDE = { pria: ['Pria', 'pp'], wanita: ['Wanita', 'pw'], bersama: ['Bersama', 'po'] };
const TONE = { c0: 'w1', c1: 'w4', c2: 'w2', c3: 'w3', c4: 'w5', c5: 'w3', c6: 'w4' };
const CK = { c0: 'on', c1: 'on1', c2: 'on2', c3: 'on3', c4: 'on1', c5: 'on3', c6: 'on1' };

/** Semua tempat tamu bisa diundang: bagian acara, atau acaranya sendiri bila tanpa bagian */
export function inviteTargets(data) {
  const out = [];
  topEvents(data).forEach(e => {
    const ps = partsOf(data, e.id);
    if (ps.length) ps.forEach(p => out.push({ id: p.id, name: p.name, short: p.kind === 'balasan' ? 'Balasan' : p.name, root: e }));
    else out.push({ id: e.id, name: e.name, short: e.name, root: e });
  });
  return out;
}

export default function Tamu() {
  const { data, canEdit, wid, save, add, del, addMany } = useW();
  const E = useEv();
  const { ev, scope } = E;
  const w = data.wedding;
  const mobile = useIsMobile();
  const [view, setView] = useState('acara');
  const [qs, setQs] = useState('');
  const [side, setSide] = useState('all');
  const [flt, setFlt] = useState('all');
  const [sel, setSel] = useState({});
  const [edit, setEdit] = useState(null);
  const [imp, setImp] = useState(false);
  const [wa, setWa] = useState(false);
  const [limit, setLimit] = useState(150);
  const targets = inviteTargets(data);
  const inv = useMemo(() => invitesFor(data, scope.ids), [data, scope.ids.join()]);
  const S = inviteSummary(inv);
  const allPeople = data.guests.reduce((s, g) => s + Number(g.pax || 0), 0);
  const cur = scope.target;
  const t = qs.trim().toLowerCase();
  const match = (g) => (side === 'all' || g.side === side) && (!t || [g.name, g.relation, g.source, g.phone, g.address].join(' ').toLowerCase().includes(t));
  const invOf = (gid, eid) => (data.guest_invites || []).find(i => i.guest_id === gid && i.event_id === eid);

  async function toggleInvite(g, eid, on) {
    const x = invOf(g.id, eid);
    if (on && !x) await add('guest_invites', { guest_id: g.id, event_id: eid, pax: null, rsvp: 'belum', sent: false, table_no: '' });
    if (!on && x) await del('guest_invites', x.id, { silent: true });
  }
  const chosen = data.guests.filter(g => sel[g.id]);
  async function bulkInvite(eid) {
    const rows = chosen.filter(g => !invOf(g.id, eid)).map(g => ({ guest_id: g.id, event_id: eid, pax: null, rsvp: 'belum', sent: false, table_no: '' }));
    await addMany('guest_invites', rows);
  }
  async function bulkRemove() {
    const xs = chosen.map(g => invOf(g.id, cur)).filter(Boolean);
    const nm = (targets.find(x => x.id === cur) || {}).name;
    if (!xs.length || !(await confirm({ title: 'Hapus dari ' + nm + '?', text: xs.length + ' tamu tidak lagi diundang ke ' + nm + '. Mereka tetap ada di buku tamu induk.', ok: 'Hapus dari acara', danger: true }))) return;
    for (const x of xs) await del('guest_invites', x.id, { silent: true });
  }

  const listAcara = inv.filter(i => match(i.g) && (flt === 'all' || (flt === 'belum' && i.rsvp === 'belum') || (flt === 'unsent' && !i.sent) || (flt === 'vip' && i.g.is_vip))).sort((a, b) => a.g.name.localeCompare(b.g.name, 'id'));
  const listInduk = data.guests.filter(match).sort((a, b) => a.name.localeCompare(b.name, 'id'));
  const curName = (targets.find(x => x.id === cur) || {}).short || ev.name;

  return (
    <>
      <EventHeader title="Tamu" eyebrow={ev.name + ' · target ' + w.target_invites + ' undangan · porsi catering ikut jumlah konfirmasi'}
        actions={<>
          {canEdit && <button type="button" className="btn2" onClick={() => setImp(true)}><Icon name="upload" size={15} />Impor Excel</button>}
          {canEdit && <button type="button" className="btn2" onClick={() => setWa(true)}><Icon name="wa" size={15} />Kirim undangan WA</button>}
          <a className="btn3" href={wpath(wid, 'checkin', { e: scope.all ? ev.id : cur })}><Icon name="check" size={15} />Mode check-in</a>
          {canEdit && <button type="button" className="btn" onClick={() => setEdit({ _new: true })}><Icon name="plus" size={15} />Tamu</button>}
        </>}
        partSub={(xs) => { const s2 = inviteSummary(invitesFor(data, xs)); return s2.invites + ' undangan · ' + s2.people + ' orang'; }} />

      <div className={'bagian ' + ev.color}>
        <button type="button" className={'bg' + (view === 'acara' ? ' on' : '')} onClick={() => setView('acara')}><span className="dot"><Icon name={ev.icon} size={14} /></span><span>Tamu acara ini<small>{S.invites} undangan · {S.people} orang</small></span></button>
        <button type="button" className={'bg' + (view === 'induk' ? ' on' : '')} onClick={() => setView('induk')}><span className="dot"><Icon name="note" size={14} /></span><span>Buku tamu induk<small>{data.guests.length} undangan · {allPeople} orang · semua acara</small></span></button>
      </div>
      <div className="note vio row" style={{ gap: 8 }}><Icon name="note" size={16} /><span>Tamu cukup diisi sekali di buku induk, lalu dicentang ke acara yang mereka hadiri. RSVP, kirim WA, dan check-in tetap dicatat per acara.</span></div>

      <section className="tiles">
        {targets.map(x => {
          const s2 = inviteSummary(invitesFor(data, [x.id]));
          return <Tile key={x.id} w={TONE[x.root.color] || 'w1'} icon={x.root.icon} k={x.name} v={s2.invites + ' undangan'} sub={s2.people + ' orang' + (s2.hadirPax ? ' · ' + s2.hadirPax + ' konfirmasi hadir' : '')} />;
        })}
      </section>

      {view === 'induk' ? (
        <section className="g col" style={{ padding: '14px 12px 8px', gap: 10 }}>
          <div className="row" style={{ padding: '0 6px' }}>
            <label className="search"><Icon name="search" size={16} /><input value={qs} onChange={(e) => setQs(e.target.value)} placeholder="Cari nama, nomor, hubungan…" /></label>
            <Chips value={side} onChange={setSide} items={[{ key: 'all', label: 'Semua pihak' }, { key: 'pria', label: 'Pria' }, { key: 'wanita', label: 'Wanita' }, { key: 'bersama', label: 'Bersama' }]} />
          </div>
          {chosen.length > 0 && canEdit && (
            <div className="between" style={{ background: 'rgba(255,255,255,.7)', borderRadius: 14, padding: '8px 12px' }}>
              <div className="row" style={{ gap: 8 }}><b>{chosen.length} dipilih</b><span className="xs muted">Undang juga ke:</span>
                {targets.map(x => <button type="button" key={x.id} className={'pill ta' + (x.root.color || 'c0').slice(1)} style={{ border: 0 }} onClick={() => bulkInvite(x.id)}>+ {x.short}</button>)}</div>
              <div className="row"><button type="button" className="btn2 sm" onClick={bulkRemove}>Hapus dari {curName}…</button><button type="button" className="lnk" onClick={() => setSel({})}>Batal pilih</button></div>
            </div>
          )}
          {!data.guests.length ? <Empty icon="users" title="Buku tamu masih kosong" text="Tambah satu per satu, atau impor dari Excel / Google Sheets." action={canEdit && <button type="button" className="btn2" onClick={() => setImp(true)}>Impor Excel</button>} /> : (
            <div className="tw">
              <table className="t">
                <thead><tr><th style={{ width: 32 }} /><th>Nama di undangan</th><th>Pihak</th><th className="hide-m">Hubungan</th><th className="n">Orang</th>{targets.map(x => <th key={x.id} style={{ textAlign: 'center' }}>{x.short}</th>)}<th>RSVP {curName}</th></tr></thead>
                <tbody>
                  {listInduk.slice(0, limit).map(g => {
                    const ci = invOf(g.id, cur);
                    return (
                      <tr key={g.id} className={'click' + (sel[g.id] ? ' sel' : '')} onClick={() => setEdit(g)}>
                        <td onClick={(e) => e.stopPropagation()}><button type="button" className={'ck' + (sel[g.id] ? ' on' : '')} aria-label={'Pilih ' + g.name} onClick={() => setSel(s => ({ ...s, [g.id]: !s[g.id] }))}>{sel[g.id] && <Icon name="check" size={12} stroke={3} />}</button></td>
                        <td style={{ minWidth: 180 }}><b>{g.name}</b></td>
                        <td><span className={'pill ' + SIDE[g.side][1]}>{SIDE[g.side][0]}</span></td>
                        <td className="hide-m">{g.relation}</td>
                        <td className="n">{g.pax}</td>
                        {targets.map(x => {
                          const on = !!invOf(g.id, x.id);
                          return <td key={x.id} style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}><button type="button" className={'ck' + (on ? ' ' + (CK[x.root.color] || 'on') : '')} disabled={!canEdit} aria-label={(on ? 'Batal undang ' : 'Undang ') + g.name + ' ke ' + x.name} onClick={() => toggleInvite(g, x.id, !on)}>{on && <Icon name="check" size={12} stroke={3} />}</button></td>;
                        })}
                        <td>{ci ? <Pill cls={RSVP[ci.rsvp][1]}>{RSVP[ci.rsvp][0]}</Pill> : <span className="xs muted">Tidak diundang</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {listInduk.length > limit && <div style={{ textAlign: 'center', padding: 10 }}><button type="button" className="btn2" onClick={() => setLimit(l => l + 300)}>Tampilkan lagi ({listInduk.length - limit})</button></div>}
            </div>
          )}
        </section>
      ) : (
        <section className="split">
          <div className="g wide col" style={{ padding: '16px 12px 8px', gap: 10 }}>
            <div className="row" style={{ padding: '0 6px' }}>
              <label className="search"><Icon name="search" size={16} /><input value={qs} onChange={(e) => setQs(e.target.value)} placeholder="Cari nama, nomor, alamat…" /></label>
              <Chips value={flt} onChange={setFlt} items={[{ key: 'all', label: 'Semua' }, { key: 'belum', label: 'Belum jawab' }, { key: 'unsent', label: 'Belum dikirim' }, { key: 'vip', label: 'VIP' }]} />
            </div>
            {!inv.length ? (
              <Empty icon="users" title={'Belum ada tamu di ' + ev.name} text="Centang tamu dari buku tamu induk, atau tambah tamu baru." action={<button type="button" className="btn2" onClick={() => setView('induk')}>Buka buku tamu induk</button>} />
            ) : (
              <div className="tw">
                <table className="t stack">
                  <thead><tr><th>Nama</th><th>Hubungan</th><th>Sumber</th><th>Dikirim</th><th>RSVP</th><th className="n">Pax</th><th>Meja</th></tr></thead>
                  <tbody>
                    {listAcara.slice(0, limit).map(i => {
                      const part = scope.all ? data.events.find(e => e.id === i.event_id && e.parent_id) : null;
                      return (
                        <tr key={i.id} className="click" onClick={() => setEdit(i.g)}>
                          <td style={{ minWidth: 170 }}><b>{i.g.name}</b>{i.g.is_vip && <span className="pill p-rose" style={{ marginLeft: 6 }}>VIP</span>}<span className="cell-sub">{[part && part.name, mobile && i.g.relation, mobile && i._pax + ' org'].filter(Boolean).join(' · ')}</span></td>
                          <td className="mhide sm" style={{ maxWidth: 140 }}>{i.g.relation}</td>
                          <td className="mhide">{i.g.source && <span className={'pill ' + SIDE[i.g.side][1]}>{i.g.source}</span>}</td>
                          <td className="mhide" onClick={(e) => e.stopPropagation()}>{canEdit ? <button type="button" className="lnk" onClick={() => save('guest_invites', i.id, { sent: !i.sent })} aria-label="Tandai terkirim">{i.sent ? <span className="ok">✓</span> : <span className="muted">–</span>}</button> : i.sent ? <span className="ok">✓</span> : '–'}</td>
                          <td><Pill cls={RSVP[i.rsvp][1]}>{RSVP[i.rsvp][0]}</Pill></td>
                          <td className="n mhide">{i._pax}</td>
                          <td className="mhide">{i.table_no || '–'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {listAcara.length > limit && <div style={{ textAlign: 'center', padding: 10 }}><button type="button" className="btn2" onClick={() => setLimit(l => l + 300)}>Tampilkan lagi ({listAcara.length - limit})</button></div>}
                {!listAcara.length && <div className="muted" style={{ padding: 14 }}>Tidak ada tamu yang cocok.</div>}
              </div>
            )}
          </div>
          <aside className="narrow">
            <div className="g col" style={{ gap: 8 }}>
              <div className="h2">{ev.name}</div>
              <div className="mini">
                <span>Undangan</span><b>{S.invites}</b>
                <span>Orang diundang</span><b>{S.people}</b>
                <span>Konfirmasi hadir</span><b style={{ color: '#3F7457' }}>{S.hadirPax} orang</b>
                <span>Belum jawab</span><b>{S.belum}</b>
                <span>Sudah dikirim</span><b>{S.sent} / {inv.length}</b>
              </div>
              <Bar value={pct(S.sent, inv.length)} />
            </div>
            <div className="g col" style={{ background: 'linear-gradient(150deg, rgba(255,255,255,.8), rgba(210,232,218,.6))', gap: 8 }}>
              <div className="h2">Hari H</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.55 }}>Penerima tamu buka <b>Mode check-in</b> di HP, cari nama, ketuk <b>Hadir</b>. Jumlah yang datang terlihat langsung di semua HP.</div>
              {S.arrived > 0 && <div className="sm"><b>{S.arrivedPax}</b> orang sudah datang ({S.arrived} undangan)</div>}
            </div>
          </aside>
        </section>
      )}
      {edit && <GuestDrawer g={edit} targets={targets} cur={cur} onClose={() => setEdit(null)} />}
      {imp && <ImportModal targets={targets} cur={cur} onClose={() => setImp(false)} />}
      {wa && <WaModal list={inv} onClose={() => setWa(false)} />}
    </>
  );
}

function GuestDrawer({ g, targets, cur, onClose }) {
  const { data, add, addMany, save, del, canEdit } = useW();
  const isNew = !!g._new;
  const invs = (data.guest_invites || []).filter(i => i.guest_id === g.id);
  const [f, setF] = useState({ name: g.name || '', relation: g.relation || '', side: g.side || 'bersama', source: g.source || '', invite_type: g.invite_type || 'digital', phone: g.phone || '', address: g.address || '', pax: g.pax ?? 2, is_vip: !!g.is_vip, notes: g.notes || '' });
  const [to, setTo] = useState(() => (isNew ? { [cur]: true } : Object.fromEntries(invs.map(i => [i.event_id, true]))));
  const ci = invs.find(i => i.event_id === cur);
  const [iv, setIv] = useState({ rsvp: ci ? ci.rsvp : 'belum', sent: ci ? ci.sent : false, table_no: ci ? ci.table_no : '', pax: ci ? ci.pax : null });
  const [err, setErr] = useState('');
  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }));
  const sources = Array.from(new Set(data.guests.map(x => x.source).filter(Boolean)));
  const curName = (targets.find(x => x.id === cur) || {}).name;
  async function submit(again) {
    if (!f.name.trim()) { setErr('Nama wajib diisi.'); return; }
    const row = { ...f, name: f.name.trim(), pax: f.pax || 0 };
    if (!again) onClose();
    let gid = g.id;
    if (isNew) { const r = await add('guests', row); gid = r && r.id; } else await save('guests', g.id, row);
    if (!gid) return;
    const have = (data.guest_invites || []).filter(i => i.guest_id === gid);
    const adds = targets.filter(x => to[x.id] && !have.some(i => i.event_id === x.id)).map(x => ({ guest_id: gid, event_id: x.id, pax: x.id === cur ? iv.pax : null, rsvp: x.id === cur ? iv.rsvp : 'belum', sent: x.id === cur ? iv.sent : false, table_no: x.id === cur ? iv.table_no : '' }));
    if (adds.length) await addMany('guest_invites', adds);
    for (const i of have) {
      if (!to[i.event_id]) await del('guest_invites', i.id, { silent: true });
      else if (i.event_id === cur) await save('guest_invites', i.id, { rsvp: iv.rsvp, sent: iv.sent, table_no: iv.table_no, pax: iv.pax });
    }
    if (again) { setF(x => ({ ...x, name: '', phone: '', address: '', relation: '', notes: '' })); setErr(''); }
  }
  async function remove() {
    if (await confirm({ title: 'Hapus dari buku tamu?', text: '“' + g.name + '” dihapus dari buku tamu induk dan semua acara.', ok: 'Hapus', danger: true })) { onClose(); del('guests', g.id); }
  }
  return (
    <Drawer open onClose={onClose} title={isNew ? 'Tamu baru' : g.name} eyebrow="Buku tamu induk"
      footer={canEdit ? <>{!isNew && <button type="button" className="btn2" onClick={remove} style={{ marginRight: 'auto' }}><Icon name="trash" size={15} />Hapus</button>}<button type="button" className="btn2" onClick={onClose}>Batal</button>{isNew && <button type="button" className="btn2" onClick={() => submit(true)}>Simpan &amp; tambah lagi</button>}<button type="button" className="btn" onClick={() => submit(false)}>Simpan</button></> : null}>
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, display: 'contents' }}>
        <Field label="Nama di undangan" error={err}><Text value={f.name} onChange={set('name')} placeholder="mis. Bpk. Ahmad & Keluarga" /></Field>
        <div className="g2">
          <Field label="Hubungan"><Text value={f.relation} onChange={set('relation')} placeholder="Paman, teman kuliah…" /></Field>
          <Field label="Sumber"><input className="inp" list="gsrc" value={f.source} onChange={(e) => set('source')(e.target.value)} placeholder="mis. Keluarga Rina" /><datalist id="gsrc">{sources.map(x => <option key={x} value={x} />)}</datalist></Field>
        </div>
        <Field label="Tamu pihak"><Seg value={f.side} onChange={set('side')} items={[{ key: 'wanita', label: 'Wanita' }, { key: 'pria', label: 'Pria' }, { key: 'bersama', label: 'Bersama' }]} /></Field>
        <div className="g2">
          <Field label="Jenis undangan"><Seg small value={f.invite_type} onChange={set('invite_type')} items={[{ key: 'digital', label: 'Digital' }, { key: 'cetak', label: 'Cetak' }]} /></Field>
          <Field label="Jumlah orang (pax)"><NumIn value={f.pax} onChange={set('pax')} /></Field>
        </div>
        <Field div label="Diundang ke">
          <div className="catg">{targets.map(x => <button type="button" key={x.id} className={to[x.id] ? 'on' : ''} onClick={() => setTo(t => ({ ...t, [x.id]: !t[x.id] }))}>{to[x.id] ? '✓ ' : '+ '}{x.name}</button>)}</div>
        </Field>
        {to[cur] && (
          <div className="partbox">
            <b className="sm">Di {curName}</b>
            <Field label="RSVP"><Seg value={iv.rsvp} onChange={(v) => setIv(x => ({ ...x, rsvp: v }))} items={[{ key: 'belum', label: 'Belum' }, { key: 'hadir', label: 'Hadir', cls: 's-ok' }, { key: 'ragu', label: 'Ragu' }, { key: 'tidak', label: 'Tidak' }]} /></Field>
            <div className="g2">
              <Field label="Jumlah orang di acara ini" hint="kosong = ikut buku induk"><NumIn value={iv.pax} onChange={(v) => setIv(x => ({ ...x, pax: v }))} /></Field>
              <Field label="Meja / area"><Text value={iv.table_no} onChange={(v) => setIv(x => ({ ...x, table_no: v }))} placeholder="VIP 1" /></Field>
            </div>
            <label className="row nowrap" style={{ gap: 10 }}><Toggle on={iv.sent} onChange={(v) => setIv(x => ({ ...x, sent: v }))} /><span className="sm"><b>Undangan sudah dikirim</b></span></label>
          </div>
        )}
        <div className="g2">
          <Field label="No. WhatsApp"><Text value={f.phone} onChange={set('phone')} inputMode="tel" placeholder="08…" /></Field>
          <Field label="Alamat"><Text value={f.address} onChange={set('address')} /></Field>
        </div>
        <label className="row nowrap" style={{ gap: 10 }}><Toggle on={f.is_vip} onChange={set('is_vip')} /><span className="sm"><b>VIP</b></span></label>
        <Field label="Catatan"><Text value={f.notes} onChange={set('notes')} /></Field>
        {!isNew && f.phone && <a className="btn3" href={waLink(f.phone)} target="_blank" rel="noreferrer"><Icon name="wa" size={16} />Chat WhatsApp</a>}
      </fieldset>
    </Drawer>
  );
}

const HEAD = {
  name: ['nama', 'name', 'nama tamu', 'nama di undangan'], relation: ['hubungan', 'relasi', 'relation'], side: ['pihak', 'side'],
  source: ['sumber', 'kelompok', 'grup', 'group'], invite_type: ['undangan', 'jenis undangan', 'jenis'], phone: ['hp', 'no hp', 'nomor', 'whatsapp', 'wa', 'telepon', 'phone', 'no. hp'],
  address: ['alamat', 'address'], pax: ['pax', 'jumlah', 'jumlah orang', 'orang'], table_no: ['meja', 'table'], notes: ['catatan', 'keterangan', 'notes'],
};
function mapRow(obj) {
  const out = {};
  const keys = Object.keys(obj);
  for (const [f, alias] of Object.entries(HEAD)) {
    const k = keys.find(x => alias.includes(String(x).trim().toLowerCase()));
    if (k !== undefined) out[f] = obj[k];
  }
  if (!out.name || !String(out.name).trim()) return null;
  const side = String(out.side || '').toLowerCase();
  const inv = String(out.invite_type || '').toLowerCase();
  return {
    name: String(out.name).trim().slice(0, 160), relation: String(out.relation || '').trim(), source: String(out.source || '').trim(),
    side: (side.startsWith('p') && !side.startsWith('per')) || side.startsWith('l') || side.startsWith('cpp') ? 'pria' : side.startsWith('w') || side.startsWith('per') ? 'wanita' : 'bersama',
    invite_type: inv.startsWith('c') ? 'cetak' : 'digital', phone: String(out.phone || '').trim(), address: String(out.address || '').trim(),
    pax: Math.max(0, parseInt(out.pax, 10) || 2), notes: String(out.notes || '').trim(), _table: String(out.table_no || '').trim(),
  };
}

function ImportModal({ targets, cur, onClose }) {
  const { addMany } = useW();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [to, setTo] = useState({ [cur]: true });
  async function readFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setErr(''); setBusy(true);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const mapped = json.map(mapRow).filter(Boolean);
      if (!mapped.length) setErr('Tidak ada baris dengan kolom "Nama". Pastikan baris pertama berisi judul kolom.');
      setRows(mapped);
    } catch (e2) { setErr('File tidak bisa dibaca. Gunakan .xlsx atau .csv.'); }
    finally { setBusy(false); }
  }
  async function template() {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([['Nama', 'Hubungan', 'Pihak', 'Sumber', 'Undangan', 'HP', 'Alamat', 'Jumlah', 'Meja', 'Catatan'],
      ['Bpk. Ahmad & Keluarga', 'Paman', 'Pria', 'Keluarga Bagas', 'Cetak', '081234567890', 'Jl. Melati 5', 4, 'VIP 1', ''],
      ['Dimas & Nadia', 'Sahabat', 'Bersama', 'Teman kuliah', 'Digital', '', '', 2, '', '']]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Tamu');
    XLSX.writeFile(wb, 'template-daftar-tamu.xlsx');
  }
  async function submit() {
    onClose();
    const gs = await addMany('guests', rows.map(({ _table, ...r }) => r));
    const inv = [];
    gs.forEach((g, i) => targets.filter(x => to[x.id]).forEach(x => inv.push({ guest_id: g.id, event_id: x.id, pax: null, rsvp: 'belum', sent: false, table_no: x.id === cur ? rows[i]._table || '' : '' })));
    if (inv.length) await addMany('guest_invites', inv);
  }
  return (
    <Modal open onClose={onClose} title="Impor ke buku tamu induk"
      footer={<><button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn" disabled={!rows || !rows.length} onClick={submit}>Impor {rows ? rows.length : ''} tamu</button></>}>
      <div className="sm" style={{ lineHeight: 1.55 }}>Pilih file Excel (.xlsx) atau CSV. Baris pertama berisi judul kolom: <b>Nama</b> (wajib), Hubungan, Pihak, Sumber, Undangan, HP, Alamat, Jumlah, Meja, Catatan.</div>
      <button type="button" className="lnk" style={{ alignSelf: 'flex-start' }} onClick={template}>Unduh contoh template</button>
      <label className="up"><span className="thumb"><Icon name="upload" size={20} /></span><span className="sm"><b>{busy ? 'Membaca…' : 'Pilih file'}</b><span className="xs muted" style={{ display: 'block' }}>Dari Google Sheets: File › Download › Excel</span></span><input type="file" hidden accept=".xlsx,.xls,.csv" onChange={readFile} /></label>
      <Field div label="Langsung undang ke"><div className="catg">{targets.map(x => <button type="button" key={x.id} className={to[x.id] ? 'on' : ''} onClick={() => setTo(t => ({ ...t, [x.id]: !t[x.id] }))}>{to[x.id] ? '✓ ' : '+ '}{x.name}</button>)}</div></Field>
      {err && <div className="ferr">{err}</div>}
      {rows && rows.length > 0 && <div className="note" style={{ background: '#D7EADF', color: '#2F5A43' }}>{rows.length} tamu siap diimpor · {rows.reduce((s, r) => s + r.pax, 0)} orang. Contoh: {rows.slice(0, 3).map(r => r.name).join(', ')}{rows.length > 3 ? '…' : ''}</div>}
    </Modal>
  );
}

function WaModal({ list, onClose }) {
  const { data, save } = useW();
  const E = useEv();
  const w = data.wedding;
  const ev = E.scope.part || E.ev;
  const date = ev.event_date || E.ev.event_date || w.wedding_date;
  const def = (w.religion === 'islam' ? 'Assalamualaikum' : 'Salam sejahtera') + ' {nama},\n\nDengan penuh syukur, kami mengundang Bapak/Ibu/Saudara/i ke ' + E.ev.name.toLowerCase().replace('akad & resepsi', 'pernikahan') + ' kami:\n\n' + w.bride_name + ' & ' + w.groom_name + '\n' + dLong(date) + (ev.start_time ? '\n' + hm(ev.start_time) : '') + (ev.location ? ' · ' + ev.location : '') + '\n\nMerupakan kehormatan bagi kami bila berkenan hadir. Mohon konfirmasi kehadiran dengan membalas pesan ini.\n\nTerima kasih 🙏';
  const key = 'wp-wa-' + w.id + '-' + E.ev.id;
  const [msg, setMsg] = useState(() => { try { return localStorage.getItem(key) || def; } catch (e) { return def; } });
  const [only, setOnly] = useState(true);
  const rows = list.filter(i => i.g.phone && (!only || !i.sent)).sort((a, b) => a.g.name.localeCompare(b.g.name, 'id'));
  const send = (i) => {
    try { localStorage.setItem(key, msg); } catch (e) { /* abaikan */ }
    window.open(waLink(i.g.phone, msg.replace(/\{nama\}/g, i.g.name)), '_blank');
    if (!i.sent) save('guest_invites', i.id, { sent: true });
  };
  return (
    <Modal open onClose={onClose} title={'Kirim undangan ' + E.ev.name} footer={<button type="button" className="btn2" onClick={onClose}>Selesai</button>}>
      <Field label="Pesan" hint="{nama} diganti otomatis"><Area value={msg} onChange={setMsg} rows={7} /></Field>
      <label className="row nowrap sm" style={{ gap: 8 }}><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} style={{ accentColor: '#B0566B' }} />Hanya yang belum dikirim</label>
      <div style={{ maxHeight: 260, overflowY: 'auto' }}>
        {rows.map(i => (
          <div key={i.id} className="li"><span className="grow"><b className="ell" style={{ display: 'block' }}>{i.g.name}</b><span className="xs muted">{i.g.phone}{i.sent ? ' · terkirim' : ''}</span></span><button type="button" className="btn3 sm" onClick={() => send(i)}><Icon name="wa" size={14} />Kirim</button></div>
        ))}
        {!rows.length && <div className="xs muted">Tidak ada tamu dengan nomor HP{only ? ' yang belum dikirimi' : ''}.</div>}
      </div>
      <div className="xs muted">Setiap tombol membuka WhatsApp dengan pesan siap kirim, lalu tamu ditandai “sudah dikirim” untuk acara ini.</div>
    </Modal>
  );
}
