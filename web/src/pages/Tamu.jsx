import React, { useMemo, useState } from 'react';
import { useW } from '../lib/store.jsx';
import { wpath } from '../lib/nav.js';
import { Icon, Chips, Pill, Tile, Bar, Drawer, Modal, Field, Text, Area, NumIn, Seg, Toggle, confirm, Empty, useIsMobile } from '../components/ui.jsx';
import { guestSummary } from '../lib/calc.js';
import { pct, waLink, dLong, hm } from '../lib/format.js';

const RSVP = { belum: ['Belum jawab', 'p-wait'], hadir: ['Hadir', 'p-ok'], tidak: ['Tidak hadir', 'p-bad'], ragu: ['Ragu-ragu', 'p-wait'] };
const SIDE = { pria: 'Pria', wanita: 'Wanita', bersama: 'Bersama' };

export default function Tamu() {
  const { data, canEdit, wid, save } = useW();
  const w = data.wedding;
  const s = guestSummary(data.guests, w);
  const [qs, setQs] = useState('');
  const [flt, setFlt] = useState('all');
  const [edit, setEdit] = useState(null);
  const [imp, setImp] = useState(false);
  const [wa, setWa] = useState(false);
  const [limit, setLimit] = useState(100);

  const t = qs.trim().toLowerCase();
  const vis = useMemo(() => data.guests.filter(g => {
    if (flt === 'pria' && g.side !== 'pria') return false;
    if (flt === 'wanita' && g.side !== 'wanita') return false;
    if (flt === 'belum' && g.rsvp !== 'belum') return false;
    if (flt === 'unsent' && g.sent) return false;
    if (flt === 'vip' && !g.is_vip) return false;
    return !t || [g.name, g.relation, g.source, g.phone, g.address, g.table_no].join(' ').toLowerCase().includes(t);
  }).sort((a, b) => a.name.localeCompare(b.name, 'id')), [data.guests, flt, t]);

  const sources = {};
  data.guests.forEach(g => { const k = g.source || 'Lainnya'; sources[k] = (sources[k] || 0) + Number(g.pax || 0); });
  const srcList = Object.entries(sources).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const srcMax = srcList[0] ? srcList[0][1] : 1;
  const resepsi = data.events.find(e => e.kind === 'resepsi');

  return (
    <>
      <div className="top">
        <div><div className="eyb">Target {w.target_invites} undangan · porsi catering ikut jumlah konfirmasi</div><h1 className="h1">Tamu</h1></div>
        <div className="row">
          {canEdit && <button type="button" className="btn2" onClick={() => setImp(true)}><Icon name="upload" size={15} />Impor Excel</button>}
          {canEdit && <button type="button" className="btn2" onClick={() => setWa(true)}><Icon name="wa" size={15} />Kirim undangan WA</button>}
          <a className="btn3" href={wpath(wid, 'checkin')}><Icon name="check" size={15} />Mode check-in hari H</a>
          {canEdit && <button type="button" className="btn" onClick={() => setEdit({ _new: true })}><Icon name="plus" size={15} />Tamu</button>}
        </div>
      </div>

      <section className="tiles">
        <Tile w="w1" k="Undangan" v={s.invites} sub={s.cetak + ' cetak · ' + s.digital + ' digital'} />
        <Tile w="w2" k="Orang diundang" v={s.people} sub={'≈ ' + Math.round(s.people * 1.5) + ' porsi (×1,5)'} />
        <Tile w="w3" k="Konfirmasi hadir" v={s.hadirPax} sub={s.hadir + ' undangan'} subStyle={{ fontWeight: 700, color: '#3F7457' }} />
        <Tile w="w4" k="Belum jawab" v={s.belum} sub="undangan · ingatkan via WA" subStyle={{ fontWeight: 700, color: '#6B4560' }} />
        <Tile w="w1" k="Sudah dikirim" v={s.sent + ' / ' + s.invites}><Bar value={pct(s.sent, s.invites)} style={{ marginTop: 6 }} /></Tile>
      </section>

      <section className="split">
        <div className="g wide col" style={{ padding: '16px 12px 8px', gap: 10 }}>
          <div className="row" style={{ padding: '0 6px' }}>
            <label className="search"><Icon name="search" size={16} /><input value={qs} onChange={(e) => setQs(e.target.value)} placeholder="Cari nama, nomor, alamat, meja…" /></label>
            <Chips value={flt} onChange={setFlt} items={[{ key: 'all', label: 'Semua' }, { key: 'pria', label: 'Pria' }, { key: 'wanita', label: 'Wanita' }, { key: 'belum', label: 'Belum jawab' }, { key: 'unsent', label: 'Belum dikirim' }, { key: 'vip', label: 'VIP' }]} />
          </div>
          {!data.guests.length ? (
            <Empty icon="users" title="Belum ada tamu" text="Tambah satu per satu, atau impor dari Excel / Google Sheets yang sudah kamu punya." action={canEdit && <div className="row"><button type="button" className="btn" onClick={() => setEdit({ _new: true })}>+ Tamu</button><button type="button" className="btn2" onClick={() => setImp(true)}>Impor Excel</button></div>} />
          ) : (
            <div className="tw">
              <table className="t stack">
                <thead><tr><th>Nama</th><th>Hubungan</th><th>Sumber</th><th>Undangan</th><th>Dikirim</th><th>RSVP</th><th className="n">Pax</th><th>Meja</th></tr></thead>
                <tbody>
                  {vis.slice(0, limit).map(g => (
                    <tr key={g.id} className="click" onClick={() => setEdit(g)}>
                      <td style={{ minWidth: 170 }}><b>{g.name}</b>{g.is_vip && <span className="pill p-rose" style={{ marginLeft: 6 }}>VIP</span>}<span className="cell-sub show-m">{[g.relation, g.source, g.pax + ' org'].filter(Boolean).join(' · ')}</span></td>
                      <td className="mhide sm" style={{ maxWidth: 120 }}>{g.relation}</td>
                       <td className="mhide" title={SIDE[g.side]}>{g.source && <span className={'pill ' + (g.side === 'pria' ? 'p-mauve' : g.side === 'wanita' ? 'p-rose' : 'p-no')}>{g.source}</span>}</td>
                      <td className="mhide">{g.invite_type === 'cetak' ? 'Cetak' : 'Digital'}</td>
                      <td className="mhide" onClick={(e) => e.stopPropagation()}>{canEdit ? <button type="button" className="lnk" onClick={() => save('guests', g.id, { sent: !g.sent })} aria-label="Tandai terkirim">{g.sent ? <span className="ok">✓</span> : <span className="muted">–</span>}</button> : g.sent ? <span className="ok">✓</span> : '–'}</td>
                      <td><Pill cls={RSVP[g.rsvp][1]}>{RSVP[g.rsvp][0]}</Pill></td>
                      <td className="n mhide">{g.pax}</td>
                      <td className="mhide">{g.table_no || '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {vis.length > limit && <div style={{ textAlign: 'center', padding: 10 }}><button type="button" className="btn2" onClick={() => setLimit(l => l + 200)}>Tampilkan lagi ({vis.length - limit})</button></div>}
              {!vis.length && <div className="muted" style={{ padding: 14 }}>Tidak ada tamu yang cocok.</div>}
            </div>
          )}
        </div>
        <aside className="narrow">
          <div className="g col" style={{ gap: 10 }}>
            <div className="h2">Sumber tamu</div>
            {srcList.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(90px,130px) 1fr 38px', gap: '8px 10px', alignItems: 'center', fontSize: 13 }}>
                {srcList.map(([k, v], i) => (
                  <React.Fragment key={k}><span className="ell">{k}</span><Bar value={(v / srcMax) * 100} cls={['fr', 'fr', 'fp', 'fs', 'fs', 'fd', 'fd'][i]} /><b style={{ textAlign: 'right' }}>{v}</b></React.Fragment>
                ))}
              </div>
            ) : <div className="xs muted">Isi kolom “Sumber” (mis. Keluarga Rina, Teman kantor) untuk melihat pembagiannya.</div>}
            <div className="xs muted">Satuan: orang.</div>
          </div>
          <div className="g col" style={{ background: 'linear-gradient(150deg, rgba(255,255,255,.8), rgba(210,232,218,.6))', gap: 8 }}>
            <div className="h2">Hari H</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.55 }}>Penerima tamu buka <b>Mode check-in</b> di HP, cari nama, ketuk <b>Hadir</b>. Jumlah yang datang terlihat langsung di semua HP.</div>
            {s.arrived > 0 && <div className="sm"><b>{s.arrivedPax}</b> orang sudah datang ({s.arrived} undangan)</div>}
          </div>
        </aside>
      </section>
      {edit && <GuestDrawer g={edit} onClose={() => setEdit(null)} />}
      {imp && <ImportModal onClose={() => setImp(false)} />}
      {wa && <WaModal onClose={() => setWa(false)} resepsi={resepsi} />}
    </>
  );
}

function GuestDrawer({ g, onClose }) {
  const { data, add, save, del, canEdit } = useW();
  const isNew = !!g._new;
  const [f, setF] = useState({ name: g.name || '', relation: g.relation || '', side: g.side || 'bersama', source: g.source || '', invite_type: g.invite_type || 'digital', phone: g.phone || '', address: g.address || '', pax: g.pax ?? 2, sent: !!g.sent, rsvp: g.rsvp || 'belum', table_no: g.table_no || '', is_vip: !!g.is_vip, notes: g.notes || '' });
  const [err, setErr] = useState('');
  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }));
  const sources = Array.from(new Set(data.guests.map(x => x.source).filter(Boolean)));
  async function submit(again) {
    if (!f.name.trim()) { setErr('Nama wajib diisi.'); return; }
    const row = { ...f, name: f.name.trim(), pax: f.pax || 0 };
    if (isNew) {
      const p = add('guests', row);
      if (again) { setF(x => ({ ...x, name: '', phone: '', address: '', relation: '', notes: '', table_no: '' })); setErr(''); await p; return; }
      onClose(); await p;
    } else { onClose(); await save('guests', g.id, row); }
  }
  async function remove() {
    if (await confirm({ title: 'Hapus tamu?', text: '“' + g.name + '” akan dihapus.', ok: 'Hapus', danger: true })) { onClose(); del('guests', g.id); }
  }
  return (
    <Drawer open onClose={onClose} title={isNew ? 'Tamu baru' : g.name} eyebrow="Tamu"
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
        <Field label="RSVP"><Seg value={f.rsvp} onChange={set('rsvp')} items={[{ key: 'belum', label: 'Belum' }, { key: 'hadir', label: 'Hadir', cls: 's-ok' }, { key: 'ragu', label: 'Ragu' }, { key: 'tidak', label: 'Tidak' }]} /></Field>
        <div className="g2">
          <Field label="No. WhatsApp"><Text value={f.phone} onChange={set('phone')} inputMode="tel" placeholder="08…" /></Field>
          <Field label="Meja / area"><Text value={f.table_no} onChange={set('table_no')} placeholder="VIP 1" /></Field>
        </div>
        <Field label="Alamat"><Text value={f.address} onChange={set('address')} /></Field>
        <div className="row" style={{ gap: 20 }}>
          <label className="row nowrap" style={{ gap: 10 }}><Toggle on={f.sent} onChange={set('sent')} /><span className="sm"><b>Sudah dikirim</b></span></label>
          <label className="row nowrap" style={{ gap: 10 }}><Toggle on={f.is_vip} onChange={set('is_vip')} /><span className="sm"><b>VIP</b></span></label>
        </div>
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
    pax: Math.max(0, parseInt(out.pax, 10) || 2), table_no: String(out.table_no || '').trim(), notes: String(out.notes || '').trim(),
  };
}

function ImportModal({ onClose }) {
  const { addMany } = useW();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
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
  async function submit() { onClose(); await addMany('guests', rows); }
  return (
    <Modal open onClose={onClose} title="Impor daftar tamu"
      footer={<><button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn" disabled={!rows || !rows.length} onClick={submit}>Impor {rows ? rows.length : ''} tamu</button></>}>
      <div className="sm" style={{ lineHeight: 1.55 }}>Pilih file Excel (.xlsx) atau CSV. Baris pertama berisi judul kolom: <b>Nama</b> (wajib), Hubungan, Pihak, Sumber, Undangan, HP, Alamat, Jumlah, Meja, Catatan.</div>
      <button type="button" className="lnk" style={{ alignSelf: 'flex-start' }} onClick={template}>Unduh contoh template</button>
      <label className="up"><span className="thumb"><Icon name="upload" size={20} /></span><span className="sm"><b>{busy ? 'Membaca…' : 'Pilih file'}</b><span className="xs muted" style={{ display: 'block' }}>Dari Google Sheets: File › Download › Excel</span></span><input type="file" hidden accept=".xlsx,.xls,.csv" onChange={readFile} /></label>
      {err && <div className="ferr">{err}</div>}
      {rows && rows.length > 0 && (
        <div className="note" style={{ background: '#D7EADF', color: '#2F5A43' }}>{rows.length} tamu siap diimpor · {rows.reduce((s, r) => s + r.pax, 0)} orang. Contoh: {rows.slice(0, 3).map(r => r.name).join(', ')}{rows.length > 3 ? '…' : ''}</div>
      )}
    </Modal>
  );
}

function WaModal({ onClose, resepsi }) {
  const { data, save } = useW();
  const w = data.wedding;
  const def = (w.religion === 'islam' ? 'Assalamualaikum' : 'Salam sejahtera') + ' {nama},\n\nDengan penuh syukur, kami mengundang Bapak/Ibu/Saudara/i ke pernikahan kami:\n\n' + w.bride_name + ' & ' + w.groom_name + '\n' + dLong(w.wedding_date) + (resepsi ? '\n' + hm(resepsi.start_time) + ' · ' + (resepsi.location || '') : '') + '\n\nMerupakan kehormatan bagi kami bila berkenan hadir. Mohon konfirmasi kehadiran dengan membalas pesan ini.\n\nTerima kasih 🙏';
  const [msg, setMsg] = useState(() => { try { return localStorage.getItem('wp-wa-' + w.id) || def; } catch (e) { return def; } });
  const [only, setOnly] = useState(true);
  const list = data.guests.filter(g => g.phone && (!only || !g.sent)).sort((a, b) => a.name.localeCompare(b.name, 'id'));
  const send = (g) => {
    try { localStorage.setItem('wp-wa-' + w.id, msg); } catch (e) { /* abaikan */ }
    window.open(waLink(g.phone, msg.replace(/\{nama\}/g, g.name)), '_blank');
    if (!g.sent) save('guests', g.id, { sent: true });
  };
  return (
    <Modal open onClose={onClose} title="Kirim undangan lewat WhatsApp" footer={<button type="button" className="btn2" onClick={onClose}>Selesai</button>}>
      <Field label="Pesan" hint="{nama} diganti otomatis"><Area value={msg} onChange={setMsg} rows={7} /></Field>
      <label className="row nowrap sm" style={{ gap: 8 }}><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} style={{ accentColor: '#B0566B' }} />Hanya yang belum dikirim</label>
      <div style={{ maxHeight: 260, overflowY: 'auto' }}>
        {list.map(g => (
          <div key={g.id} className="li"><span className="grow"><b className="ell" style={{ display: 'block' }}>{g.name}</b><span className="xs muted">{g.phone}{g.sent ? ' · terkirim' : ''}</span></span><button type="button" className="btn3 sm" onClick={() => send(g)}><Icon name="wa" size={14} />Kirim</button></div>
        ))}
        {!list.length && <div className="xs muted">Tidak ada tamu dengan nomor HP{only ? ' yang belum dikirimi' : ''}.</div>}
      </div>
      <div className="xs muted">Setiap tombol membuka WhatsApp dengan pesan siap kirim, lalu tamu ditandai “sudah dikirim”.</div>
    </Modal>
  );
}
