import React, { useState } from 'react';
import { useW } from '../lib/store.jsx';
import { Icon, Tabs, Chips, Pill, Check, Avatar, Drawer, Modal, Field, Text, Area, DateIn, Seg, Toggle, NumIn, PersonPick, confirm, Empty, Bar } from '../components/ui.jsx';
import { dShort, daysBetween, today, pct } from '../lib/format.js';

const PRIO = { tinggi: ['Tinggi', 'p-bad'], sedang: ['Sedang', 'p-rose'], biasa: ['Biasa', 'p-no'] };
const TONES = ['w1', 'w2', 'w3', 'w4'];

export default function Catatan({ q }) {
  const { data, canEdit } = useW();
  const [tab, setTab] = useState(q.tab || 'reminder');
  const [rem, setRem] = useState(null);
  const [note, setNote] = useState(null);
  const [sp, setSp] = useState(null);
  const active = data.reminders.filter(r => !r.done).length;
  const spDone = selfPct(data.selfprep);

  return (
    <>
      <div className="top">
        <div><div className="eyb">Pengingat, info penting, dan persiapan berdua</div><h1 className="h1">Catatan</h1></div>
        {canEdit && <div className="row"><button type="button" className="btn2" onClick={() => setNote({ _new: true })}>+ Catatan</button><button type="button" className="btn" onClick={() => setRem({ _new: true })}><Icon name="plus" size={15} />Reminder</button></div>}
      </div>
      <Tabs value={tab} onChange={setTab} items={[{ key: 'reminder', label: 'Reminder · ' + active }, { key: 'penting', label: 'Catatan penting · ' + data.notes.length }, { key: 'diri', label: 'Persiapan diri · ' + spDone + '%' }]} />

      {tab === 'reminder' && (
        <section className="split">
          <div className="wide"><ReminderList onOpen={setRem} /></div>
          <aside className="narrow"><NotesCard onOpen={setNote} compact onAll={() => setTab('penting')} /><SelfCard onOpen={setSp} compact /></aside>
        </section>
      )}
      {tab === 'penting' && <NotesCard onOpen={setNote} />}
      {tab === 'diri' && <SelfCard onOpen={setSp} />}

      {rem && <ReminderDrawer r={rem} onClose={() => setRem(null)} />}
      {note && <NoteModal n={note} onClose={() => setNote(null)} />}
      {sp && <SelfModal s={sp} onClose={() => setSp(null)} />}
    </>
  );
}

function selfPct(list) {
  if (!list.length) return 0;
  const v = list.reduce((s, x) => s + (x.done ? 1 : x.total ? Math.min(1, x.progress / x.total) : 0), 0);
  return Math.round((v / list.length) * 100);
}

function ReminderList({ onOpen }) {
  const { data, canEdit, save, people } = useW();
  const [flt, setFlt] = useState('aktif');
  const [pic, setPic] = useState('');
  const list = data.reminders.filter(r => (flt === 'aktif' ? !r.done : flt === 'selesai' ? r.done : true) && (!pic || r.pic === pic))
    .sort((a, b) => String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')));
  const pics = Array.from(new Set(data.reminders.map(r => r.pic).filter(Boolean)));
  return (
    <div className="g">
      <div className="between" style={{ marginBottom: 6 }}>
        <div className="h2">Reminder</div>
        <div className="row"><Chips value={flt} onChange={setFlt} items={[{ key: 'aktif', label: 'Aktif' }, { key: 'selesai', label: 'Selesai' }]} />
          {pics.length > 0 && <select className="inp" style={{ width: 'auto', minHeight: 36, padding: '6px 30px 6px 12px' }} value={pic} onChange={(e) => setPic(e.target.value)}><option value="">Semua PIC</option>{pics.map(p => <option key={p}>{p}</option>)}</select>}</div>
      </div>
      {list.map(r => {
        const late = r.due_date && !r.done ? daysBetween(r.due_date, today()) : -1;
        return (
          <div className="li click" key={r.id} onClick={() => onOpen(r)}>
            <Check on={r.done} disabled={!canEdit} onChange={(v) => save('reminders', r.id, { done: v })} />
            <div className="grow"><b className={r.done ? 'strike' : ''}>{r.title}</b>{r.detail && <div className="xs muted ell">{r.detail}</div>}</div>
            {r.pic && <Avatar name={r.pic} />}
            <span className="hide-m"><Pill cls={PRIO[r.priority][1]}>{PRIO[r.priority][0]}</Pill></span>
            <Pill cls={late > 0 ? 'p-bad' : late >= -3 && r.due_date ? 'p-wait' : 'p-no'}>{r.due_date ? dShort(r.due_date) : 'Tanpa tanggal'}</Pill>
          </div>
        );
      })}
      {!list.length && <Empty icon="note" title={flt === 'selesai' ? 'Belum ada yang selesai' : 'Tidak ada reminder aktif'} text="Contoh: transfer termin catering, fitting kebaya, kirim desain undangan." action={canEdit && flt !== 'selesai' && <button type="button" className="btn" onClick={() => onOpen({ _new: true })}>+ Reminder</button>} />}
      <div className="xs muted" style={{ marginTop: 10 }}>Reminder yang jatuh tempo minggu ini juga muncul di Beranda.</div>
    </div>
  );
}

function NotesCard({ onOpen, compact, onAll }) {
  const { data, canEdit } = useW();
  const [show, setShow] = useState({});
  const notes = [...data.notes].sort((a, b) => a.sort - b.sort);
  const plain = notes.filter(n => !n.secret);
  const secret = notes.filter(n => n.secret);
  const shown = compact ? plain.slice(0, 4) : plain;
  return (
    <div className="g col" style={{ gap: 10 }}>
      <div className="between"><div className="h2">Catatan penting</div>{compact ? <button type="button" className="lnk xs" onClick={onAll}>Lihat semua</button> : canEdit && <button type="button" className="btn2 sm" onClick={() => onOpen({ _new: true })}>+ Catatan</button>}</div>
      <div className={compact ? 'g2' : 'grid3'} style={compact ? { gridTemplateColumns: '1fr 1fr', gap: 10 } : null}>
        {shown.map((n, i) => (
          <button type="button" key={n.id} className={'tile ' + TONES[i % 4]} style={{ padding: 12, textAlign: 'left', cursor: 'pointer' }} onClick={() => onOpen(n)}>
            <span className="lbl">{n.label}</span><b style={{ fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{n.value || <span className="muted" style={{ fontWeight: 500 }}>– ketuk untuk isi</span>}</b>
          </button>
        ))}
      </div>
      {secret.map(n => (
        <div key={n.id} className="li click" style={{ padding: '8px 2px' }} onClick={() => onOpen(n)}>
          <span className="ico"><Icon name="wallet" /></span>
          <div className="grow"><b>{n.label}</b><div className="xs muted ell">{show[n.id] ? (n.value || '–') : (n.value ? (/\d{5,}/.test(n.value) ? n.value.replace(/\d(?=\d{4})/g, '•') : '••••••••') : '–')}</div></div>
          {n.value && <button type="button" className="pill p-no" style={{ border: 0 }} onClick={(e) => { e.stopPropagation(); setShow(s => ({ ...s, [n.id]: !s[n.id] })); }}>{show[n.id] ? 'Sembunyikan' : 'Tampilkan'}</button>}
        </div>
      ))}
      {!notes.length && <div className="xs muted">Simpan info yang sering ditanya: kontak darurat, dress code, hashtag, parkir, rekening.</div>}
    </div>
  );
}

function SelfCard({ onOpen, compact }) {
  const { data, canEdit, save } = useW();
  const list = [...data.selfprep].sort((a, b) => a.sort - b.sort);
  const p = selfPct(list);
  return (
    <div className="g col" style={{ gap: 8, background: 'linear-gradient(150deg, rgba(255,255,255,.82), rgba(233,214,229,.66))' }}>
      <div className="between"><div className="h2">Persiapan diri</div><b style={{ fontFamily: 'var(--serif)', fontSize: 22 }}>{p}%</b></div>
      <Bar value={p} />
      {(compact ? list.slice(0, 6) : list).map(s => (
        <div className="li click" key={s.id} style={{ padding: '7px 2px' }} onClick={() => onOpen(s)}>
          <Check on={s.done} disabled={!canEdit} onChange={(v) => save('selfprep', s.id, { done: v, progress: v && s.total ? s.total : s.progress })} />
          <span className={'grow' + (s.done ? ' strike' : '')}>{s.title}</span>
          {s.total > 0 ? (
            <span className="row nowrap" style={{ gap: 4 }} onClick={(e) => e.stopPropagation()}>
              {!compact && canEdit && <button type="button" className="ibtn" style={{ width: 26, height: 26 }} onClick={() => save('selfprep', s.id, { progress: Math.max(0, s.progress - 1), done: false })} aria-label="Kurangi">−</button>}
              <Pill cls={s.progress >= s.total ? 'p-ok' : 'p-wait'}>{s.progress} / {s.total}</Pill>
              {!compact && canEdit && <button type="button" className="ibtn" style={{ width: 26, height: 26 }} onClick={() => save('selfprep', s.id, { progress: Math.min(s.total, s.progress + 1), done: s.progress + 1 >= s.total })} aria-label="Tambah">+</button>}
            </span>
          ) : <span className="xs muted">{s.freq || s.who}</span>}
        </div>
      ))}
      {!compact && canEdit && <button type="button" className="btn2" style={{ alignSelf: 'flex-start' }} onClick={() => onOpen({ _new: true })}>+ Tambah</button>}
      <div className="xs muted">Daftar bisa diganti sesuai keyakinan dan kebutuhan kalian berdua.</div>
    </div>
  );
}

function ReminderDrawer({ r, onClose }) {
  const { add, save, del, canEdit, people } = useW();
  const isNew = !!r._new;
  const [f, setF] = useState({ title: r.title || '', detail: r.detail || '', due_date: r.due_date || '', pic: r.pic || '', priority: r.priority || 'sedang', done: !!r.done });
  const [err, setErr] = useState('');
  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }));
  async function submit() {
    if (!f.title.trim()) { setErr('Isi judul reminder.'); return; }
    const row = { ...f, title: f.title.trim(), due_date: f.due_date || null };
    onClose();
    if (isNew) await add('reminders', row); else await save('reminders', r.id, row);
  }
  async function remove() { if (await confirm({ title: 'Hapus reminder?', text: '“' + r.title + '” akan dihapus.', ok: 'Hapus', danger: true })) { onClose(); del('reminders', r.id); } }
  return (
    <Drawer open onClose={onClose} title={isNew ? 'Reminder baru' : 'Ubah reminder'} eyebrow="Catatan"
      footer={canEdit ? <>{!isNew && <button type="button" className="btn2" onClick={remove} style={{ marginRight: 'auto' }}><Icon name="trash" size={15} />Hapus</button>}<button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn" onClick={submit}>Simpan</button></> : null}>
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, display: 'contents' }}>
        <Field label="Judul" error={err}><Text value={f.title} onChange={set('title')} placeholder="mis. Transfer termin 2 catering" /></Field>
        <Field label="Detail"><Area value={f.detail} onChange={set('detail')} rows={2} placeholder="mis. Rp10.000.000 · Catering Sari Rasa" /></Field>
        <div className="g2"><Field label="Tanggal"><DateIn value={f.due_date} onChange={set('due_date')} /></Field><Field label="PIC"><PersonPick value={f.pic} onChange={set('pic')} people={people} /></Field></div>
        <Field label="Prioritas"><Seg value={f.priority} onChange={set('priority')} items={[{ key: 'tinggi', label: 'Tinggi' }, { key: 'sedang', label: 'Sedang' }, { key: 'biasa', label: 'Biasa' }]} /></Field>
        <label className="row nowrap" style={{ gap: 10 }}><Toggle on={f.done} onChange={set('done')} /><b className="sm">Sudah selesai</b></label>
      </fieldset>
    </Drawer>
  );
}

function NoteModal({ n, onClose }) {
  const { data, add, save, del, canEdit } = useW();
  const isNew = !!n._new;
  const [f, setF] = useState({ label: n.label || '', value: n.value || '', secret: !!n.secret });
  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }));
  async function submit() {
    if (!f.label.trim()) return;
    onClose();
    if (isNew) await add('notes', { ...f, label: f.label.trim(), sort: data.notes.length + 1 }); else await save('notes', n.id, { ...f, label: f.label.trim() });
  }
  async function remove() { if (await confirm({ title: 'Hapus catatan?', text: '“' + n.label + '” akan dihapus.', ok: 'Hapus', danger: true })) { onClose(); del('notes', n.id); } }
  return (
    <Modal open onClose={onClose} title={isNew ? 'Catatan penting' : n.label}
      footer={canEdit ? <>{!isNew && <button type="button" className="btn2" style={{ marginRight: 'auto' }} onClick={remove}><Icon name="trash" size={15} /></button>}<button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn" onClick={submit} disabled={!f.label.trim()}>Simpan</button></> : <button type="button" className="btn2" onClick={onClose}>Tutup</button>}>
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Judul"><Text value={f.label} onChange={set('label')} placeholder="mis. Dress code" /></Field>
        <Field label="Isi"><Area value={f.value} onChange={set('value')} rows={4} placeholder="mis. Sage & dusty pink" /></Field>
        <label className="row nowrap" style={{ gap: 10 }}><Toggle on={f.secret} onChange={set('secret')} /><span className="sm"><b>Rahasia</b><span className="xs muted" style={{ display: 'block' }}>Disamarkan (mis. nomor rekening)</span></span></label>
      </fieldset>
    </Modal>
  );
}

function SelfModal({ s, onClose }) {
  const { data, add, save, del, canEdit } = useW();
  const isNew = !!s._new;
  const [f, setF] = useState({ title: s.title || '', who: s.who || 'Berdua', freq: s.freq || '', total: s.total || 0, progress: s.progress || 0, done: !!s.done });
  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }));
  async function submit() {
    if (!f.title.trim()) return;
    const row = { ...f, title: f.title.trim(), total: f.total || 0, progress: Math.min(f.progress || 0, f.total || 999) };
    onClose();
    if (isNew) await add('selfprep', { ...row, sort: data.selfprep.length + 1 }); else await save('selfprep', s.id, row);
  }
  async function remove() { if (await confirm({ title: 'Hapus?', text: '“' + s.title + '” akan dihapus.', ok: 'Hapus', danger: true })) { onClose(); del('selfprep', s.id); } }
  return (
    <Modal open onClose={onClose} title={isNew ? 'Persiapan diri' : s.title}
      footer={canEdit ? <>{!isNew && <button type="button" className="btn2" style={{ marginRight: 'auto' }} onClick={remove}><Icon name="trash" size={15} /></button>}<button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn" onClick={submit} disabled={!f.title.trim()}>Simpan</button></> : null}>
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Kegiatan"><Text value={f.title} onChange={set('title')} placeholder="mis. Kelas pranikah" /></Field>
        <div className="g2"><Field label="Siapa"><Seg small value={f.who} onChange={set('who')} items={['Berdua', 'Pria', 'Wanita'].map(x => ({ key: x, label: x }))} /></Field><Field label="Frekuensi"><Text value={f.freq} onChange={set('freq')} placeholder="Harian / Mingguan" /></Field></div>
        <div className="g2"><Field label="Target jumlah" hint="opsional"><NumIn value={f.total} onChange={set('total')} /></Field>{f.total > 0 && <Field label="Sudah"><NumIn value={f.progress} onChange={set('progress')} /></Field>}</div>
        <label className="row nowrap" style={{ gap: 10 }}><Toggle on={f.done} onChange={set('done')} /><b className="sm">Selesai</b></label>
      </fieldset>
    </Modal>
  );
}
