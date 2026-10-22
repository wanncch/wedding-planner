import React, { useState } from 'react';
import { useW } from '../lib/store.jsx';
import { wpath } from '../lib/nav.js';
import { Icon, Pill, Tile, Bar, Check, Drawer, Field, Text, Seg, DateIn, confirm } from '../components/ui.jsx';
import FileField from '../components/FileField.jsx';
import { openFile } from '../lib/files.js';
import { KUA_STEPS } from '../lib/calc.js';
import { dMed, daysBetween, today, pct } from '../lib/format.js';

const PARTY = [{ key: 'wanita', label: 'Calon pengantin wanita', cls: 'fr' }, { key: 'pria', label: 'Calon pengantin pria', cls: 'fs' }, { key: 'lainnya', label: 'Wali, saksi & lainnya', cls: 'fp' }];
const ST = { belum: ['Belum', 'p-no'], proses: ['Diurus', 'p-wait'], lengkap: ['Lengkap', 'p-ok'], tidak_perlu: ['Tidak perlu', 'p-no'] };

export default function Dokumen() {
  const { data, canEdit, save, wid } = useW();
  const w = data.wedding;
  const [edit, setEdit] = useState(null);
  const steps = KUA_STEPS[w.religion] || KUA_STEPS.islam;
  const docs = data.documents.filter(d => d.status !== 'tidak_perlu');
  const done = docs.filter(d => d.status === 'lengkap').length;
  const proses = docs.filter(d => d.status === 'proses').length;
  const soon = data.documents.filter(d => d.expires_on && daysBetween(today(), d.expires_on) <= 60);
  const files = data.documents.filter(d => d.file_url).length;
  const contracts = data.budget_items.filter(i => i.contract_url);
  const expLabel = (d) => { const x = daysBetween(today(), d.expires_on); return x < 0 ? 'Kedaluwarsa ' + dMed(d.expires_on) : 'Habis ' + dMed(d.expires_on); };

  return (
    <>
      <div className="top">
        <div><div className="eyb">{w.religion === 'islam' ? 'Pendaftaran nikah paling lambat 10 hari kerja sebelum akad' : 'Cek syarat pencatatan di Disdukcapil setempat'}</div><h1 className="h1">Dokumen &amp; {w.religion === 'islam' ? 'KUA' : 'Pencatatan'}</h1></div>
        {canEdit && <button type="button" className="btn" onClick={() => setEdit({ _new: true, party: 'lainnya', status: 'belum' })}><Icon name="plus" size={15} />Dokumen</button>}
      </div>

      <div className="g">
        <div className="between" style={{ marginBottom: 14 }}><div className="h2">{w.religion === 'islam' ? 'Alur nikah di KUA' : 'Alur pemberkatan & catatan sipil'}</div><Pill cls="p-wait">Langkah {w.kua_step} dari {steps.length}</Pill></div>
        <div className="steps">
          {steps.map((s, i) => {
            const n = i + 1; const isDone = n < w.kua_step; const now = n === w.kua_step;
            return (
              <button type="button" key={s} className={'step' + (isDone ? ' d' : '')} disabled={!canEdit} onClick={() => save('weddings', w.id, { kua_step: n })} title={canEdit ? 'Tandai sedang di langkah ini' : ''}>
                <span className={'sc' + (isDone ? ' done' : now ? ' now' : '')}>{isDone ? '✓' : n}</span>{s}
              </button>
            );
          })}
        </div>
        <div className="xs muted" style={{ marginTop: 12 }}>
          {w.religion === 'islam' ? 'Nikah di luar KUA / hari libur: PNBP Rp600.000 lewat bank persepsi. Di kantor KUA pada jam kerja: gratis. ' : ''}Ketuk langkah untuk menandai posisi sekarang.
        </div>
      </div>

      <section className="tiles">
        <Tile w="w3" icon="check" k="Lengkap" v={done + ' / ' + docs.length}><Bar value={pct(done, docs.length)} cls="fs" style={{ marginTop: 6 }} /></Tile>
        <Tile w="w2" icon="clock" k="Sedang diurus" v={proses} sub="tandai Lengkap saat sudah di tangan" />
        <Tile w="w4" icon="calendar" k="Segera habis masa berlaku" v={soon.length} sub={soon[0] ? soon[0].name + ' · ' + expLabel(soon[0]) : 'Isi tanggal berlaku bila ada'} subStyle={soon.length ? { fontWeight: 700, color: '#6B4560' } : null} />
        <Tile w="w1" icon="file" k="Tersimpan" v={files + ' file'} sub="scan & foto dokumen" />
      </section>

      <section className="grid2">
        {PARTY.map(p => {
          const list = data.documents.filter(d => d.party === p.key).sort((a, b) => a.sort - b.sort);
          const act = list.filter(d => d.status !== 'tidak_perlu');
          const ok = act.filter(d => d.status === 'lengkap').length;
          return (
            <div className="g" key={p.key}>
              <div className="between"><div className="h2">{p.label}</div><span className="xs muted">{ok} / {act.length}</span></div>
              <Bar value={pct(ok, act.length)} cls={p.cls} style={{ margin: '8px 0 6px' }} />
              {list.map(d => {
                const exp = d.expires_on && daysBetween(today(), d.expires_on) <= 60;
                return (
                  <div key={d.id} className="li click" onClick={() => setEdit(d)} style={{ opacity: d.status === 'tidak_perlu' ? .5 : 1 }}>
                    <Check on={d.status === 'lengkap'} disabled={!canEdit} onChange={(v) => save('documents', d.id, { status: v ? 'lengkap' : 'belum' })} />
                    <div className="grow"><b className={d.status === 'tidak_perlu' ? 'strike' : ''}>{d.name}</b>
                      {(d.detail || d.expires_on) && <div className="xs" style={exp ? { color: '#8E3A30', fontWeight: 700 } : { color: 'var(--mut)' }}>{d.expires_on ? expLabel(d) : d.detail}</div>}</div>
                    {d.file_url ? <button type="button" className="pill p-ok" style={{ border: 0 }} onClick={(e) => { e.stopPropagation(); openFile(d.file_url); }}>File</button>
                      : exp ? <Pill cls="p-bad">Masa berlaku</Pill> : <Pill cls={ST[d.status][1]}>{ST[d.status][0]}</Pill>}
                  </div>
                );
              })}
              {p.key === 'lainnya' && contracts.length > 0 && (
                <a className="li click" href={wpath(wid, 'anggaran')} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <span className="ck on"><Icon name="check" size={12} stroke={3} /></span>
                  <div className="grow"><b>Kontrak vendor ({contracts.length})</b><div className="xs muted">Tertaut dari menu Anggaran</div></div>
                  <Pill cls="p-rose">Lihat</Pill>
                </a>
              )}
            </div>
          );
        })}
      </section>
      {edit && <DocDrawer d={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function DocDrawer({ d, onClose }) {
  const { add, save, del, canEdit } = useW();
  const isNew = !!d._new;
  const [f, setF] = useState({ name: d.name || '', party: d.party || 'lainnya', detail: d.detail || '', status: d.status || 'belum', expires_on: d.expires_on || '', file_url: d.file_url || '' });
  const [err, setErr] = useState('');
  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }));
  async function submit() {
    if (!f.name.trim()) { setErr('Nama dokumen wajib diisi.'); return; }
    const row = { ...f, name: f.name.trim(), expires_on: f.expires_on || null };
    if (row.file_url && row.status === 'belum') row.status = 'lengkap';
    onClose();
    if (isNew) await add('documents', { ...row, sort: 999 }); else await save('documents', d.id, row);
  }
  async function remove() { if (await confirm({ title: 'Hapus dokumen?', text: '“' + d.name + '” akan dihapus dari daftar.', ok: 'Hapus', danger: true })) { onClose(); del('documents', d.id); } }
  return (
    <Drawer open onClose={onClose} title={isNew ? 'Dokumen baru' : d.name} eyebrow="Dokumen"
      footer={canEdit ? <>{!isNew && <button type="button" className="btn2" onClick={remove} style={{ marginRight: 'auto' }}><Icon name="trash" size={15} />Hapus</button>}<button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn" onClick={submit}>Simpan</button></> : null}>
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, display: 'contents' }}>
        <Field label="Nama dokumen" error={err}><Text value={f.name} onChange={set('name')} /></Field>
        <Field label="Milik"><Seg value={f.party} onChange={set('party')} items={[{ key: 'wanita', label: 'Wanita' }, { key: 'pria', label: 'Pria' }, { key: 'lainnya', label: 'Wali / lainnya' }]} /></Field>
        <Field label="Keterangan"><Text value={f.detail} onChange={set('detail')} placeholder="mis. 3 lembar, legalisir" /></Field>
        <Field label="Status"><Seg value={f.status} onChange={set('status')} items={[{ key: 'belum', label: 'Belum' }, { key: 'proses', label: 'Diurus', cls: 's-wait' }, { key: 'lengkap', label: 'Lengkap', cls: 's-ok' }, { key: 'tidak_perlu', label: 'Tidak perlu' }]} /></Field>
        <Field label="Berlaku sampai" hint="opsional, mis. N1–N4 6 bulan"><DateIn value={f.expires_on} onChange={set('expires_on')} /></Field>
        <Field label="Scan / foto"><FileField value={f.file_url} onChange={set('file_url')} folder="dokumen" label="Unggah scan / foto" hint="atau link Google Drive" /></Field>
        <div className="xs muted">File hanya bisa dibuka anggota pernikahan ini.</div>
      </fieldset>
    </Drawer>
  );
}
