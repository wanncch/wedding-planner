import React, { useEffect, useMemo, useState } from 'react';
import { useW, useAuth } from '../lib/store.jsx';
import { Icon, Tabs, Chips, Pill, Check, Avatars, Drawer, Field, Text, Area, DateIn, Seg, Select, PersonPick, confirm, Empty, Bar } from '../components/ui.jsx';
import { PERIODS, STAGES, taskDue, taskState, periodOfTask, periodRange, currentPeriod } from '../lib/calc.js';
import { dShort, dMed, iso, today, addDays, daysBetween, pct } from '../lib/format.js';

export default function Persiapan({ q }) {
  const { data, canEdit, save, people } = useW();
  const { profile } = useAuth();
  const w = data.wedding;
  const hasLamaran = data.events.some(e => e.kind === 'lamaran');
  const [view, setView] = useState('periode');
  const [filter, setFilter] = useState('semua');
  const [sel, setSel] = useState(q.p || currentPeriod(w).key);
  const [edit, setEdit] = useState(null);

  useEffect(() => {
    if (q.t) { const t = data.tasks.find(x => x.id === q.t); if (t) { setEdit(t); setSel(periodOfTask(t, w).key); } }
    if (q.p) setSel(q.p);
  }, [q.t, q.p]);

  const myName = (profile && profile.display_name ? profile.display_name.split(' ')[0] : '').toLowerCase();
  const enriched = useMemo(() => data.tasks.map(t => ({ ...t, _due: taskDue(t, w), _st: taskState(t, w), _per: periodOfTask(t, w).key })), [data.tasks, w]);
  const in7 = addDays(today(), 7);
  const counts = {
    telat: enriched.filter(t => t._st.key === 'telat').length,
    minggu: enriched.filter(t => !['selesai', 'batal'].includes(t._st.key) && t._due <= in7).length,
    proses: enriched.filter(t => t.status === 'proses').length,
  };
  const pass = (t) => {
    if (filter === 'telat') return t._st.key === 'telat';
    if (filter === 'minggu') return !['selesai', 'batal'].includes(t._st.key) && t._due <= in7;
    if (filter === 'saya') return myName && t.pic.toLowerCase().includes(myName);
    if (filter === 'proses') return t.status === 'proses';
    if (filter === 'selesai') return t.status === 'selesai';
    return true;
  };
  const list = enriched.filter(pass);
  const done = data.tasks.filter(t => t.status === 'selesai').length;

  const toggle = (t, on) => save('tasks', t.id, { status: on ? 'selesai' : 'belum' });
  const cur = currentPeriod(w);

  const tabs = [{ key: 'periode', label: 'Per periode' }, { key: 'tahap', label: 'Per tahap' }];
  if (hasLamaran) tabs.push({ key: 'lamaran', label: 'Lamaran' });

  return (
    <>
      <div className="top">
        <div><div className="eyb">{done} dari {data.tasks.length} tugas selesai{counts.telat ? ' · ' + counts.telat + ' terlambat' : ''}</div><h1 className="h1">Persiapan</h1></div>
        <div className="row"><Tabs value={view} onChange={setView} items={tabs} />{canEdit && <button type="button" className="btn" onClick={() => setEdit({ _new: true, stage: 'Lainnya', status: 'belum', priority: 'sedang', pic: '', offset_days: Math.max(daysBetween(today(), w.wedding_date) - 14, 0) })}><Icon name="plus" size={15} />Tugas</button>}</div>
      </div>
      <Chips value={filter} onChange={setFilter} items={[
        { key: 'semua', label: 'Semua' }, { key: 'telat', label: 'Telat · ' + counts.telat }, { key: 'minggu', label: 'Minggu ini · ' + counts.minggu },
        { key: 'saya', label: 'Tugas saya' }, { key: 'proses', label: 'Proses · ' + counts.proses }, { key: 'selesai', label: 'Selesai' }]} />

      {view === 'periode' && (
        <>
          <section className="pers">
            {PERIODS.map(p => {
              const ts = enriched.filter(t => t._per === p.key && t.status !== 'batal');
              if (!ts.length) return null;
              const d = ts.filter(t => t.status === 'selesai').length;
              const [start] = periodRange(p, w);
              const isNow = p.key === cur.key;
              const isDone = d === ts.length;
              const past = PERIODS.indexOf(p) < PERIODS.indexOf(cur);
              return (
                <button type="button" key={p.key} className={'per' + (sel === p.key ? ' on' : '') + (isNow ? ' now' : '') + (isDone ? ' done' : '')} onClick={() => setSel(p.key)}>
                  <span className="xs tag muted">{isDone ? '✓ Selesai' : isNow ? 'SEKARANG' : past ? pct(d, ts.length) + '%' : start ? 'Mulai ' + dShort(start) : ''}</span>
                  <b>{p.label}</b>
                  <Bar value={pct(d, ts.length)} cls={isDone ? 'fs' : 'fr'} />
                  <span className="xs muted">{d} / {ts.length}</span>
                </button>
              );
            })}
          </section>
          {(() => {
            const p = PERIODS.find(x => x.key === sel) || cur;
            const rows = list.filter(t => t._per === p.key).sort((a, b) => a._due - b._due || a.sort - b.sort);
            const all = enriched.filter(t => t._per === p.key && t.status !== 'batal');
            const [s, e] = periodRange(p, w);
            return (
              <section className="g">
                <div className="between" style={{ marginBottom: 6 }}>
                  <div><div className="h2">{p.label}{p.key !== 'p8' ? ' sebelum' : ''}</div><div className="xs muted">{s ? dMed(s) : 'Sejak awal'} – {e ? dMed(e) : 'seterusnya'} · deadline dihitung otomatis dari tanggal nikah</div></div>
                  <Pill cls="p-rose">{all.filter(t => t.status === 'selesai').length} dari {all.length} selesai</Pill>
                </div>
                <TaskTable rows={rows} onOpen={setEdit} onToggle={toggle} canEdit={canEdit} />
              </section>
            );
          })()}
        </>
      )}

      {view === 'tahap' && STAGES.map(st => {
        const rows = list.filter(t => (t.stage || 'Lainnya') === st).sort((a, b) => a._due - b._due);
        if (!rows.length) return null;
        const all = enriched.filter(t => (t.stage || 'Lainnya') === st);
        return (
          <section className="g" key={st}>
            <div className="between" style={{ marginBottom: 6 }}><div className="h2">{st}</div><Pill cls="p-rose">{all.filter(t => t.status === 'selesai').length} / {all.length}</Pill></div>
            <TaskTable rows={rows} onOpen={setEdit} onToggle={toggle} canEdit={canEdit} />
          </section>
        );
      })}

      {view === 'lamaran' && (() => {
        const lam = data.events.find(e => e.kind === 'lamaran');
        const rows = list.filter(t => t.event_kind === 'lamaran').sort((a, b) => a._due - b._due);
        return (
          <section className="g">
            <div className="between" style={{ marginBottom: 6 }}><div><div className="h2">Persiapan lamaran</div><div className="xs muted">{lam ? dMed(lam.event_date) + (lam.location ? ' · ' + lam.location : '') : ''}</div></div></div>
            {rows.length ? <TaskTable rows={rows} onOpen={setEdit} onToggle={toggle} canEdit={canEdit} /> : <Empty title="Belum ada tugas lamaran" text="Tambah tugas lalu pilih acara Lamaran." />}
          </section>
        );
      })()}

      {list.length === 0 && view !== 'lamaran' && <Empty title="Tidak ada tugas untuk filter ini" />}

      {edit && <TaskDrawer task={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function TaskTable({ rows, onOpen, onToggle, canEdit }) {
  if (!rows.length) return <div className="muted" style={{ padding: '14px 4px' }}>Tidak ada tugas di sini untuk filter ini.</div>;
  return (
    <div className="tw">
      <table className="t stack">
        <thead><tr><th style={{ width: 32 }} /><th>Kegiatan</th><th>PIC</th><th>Deadline</th><th>Status</th><th>Hasil / keterangan</th></tr></thead>
        <tbody>
          {rows.map(t => (
            <tr key={t.id} className="click" onClick={() => onOpen(t)}>
              <td><Check on={t.status === 'selesai'} disabled={!canEdit} onChange={(v) => onToggle(t, v)} label={'Tandai ' + t.title} /></td>
              <td style={{ minWidth: 200 }}><b className={t.status === 'selesai' ? 'strike' : ''}>{t.title}</b>{t.detail && t.status !== 'selesai' && <span className="cell-sub">{t.detail}</span>}</td>
              <td className="mhide"><Avatars names={t.pic} /></td>
              <td className={'nw' + (t.status === 'selesai' ? ' muted' : '')}>{dShort(t._due)}</td>
              <td><Pill cls={t._st.cls}>{t._st.label}</Pill></td>
              <td className="mhide" style={{ maxWidth: 260 }}><span className={t.result ? '' : 'muted'}>{t.result || '–'}</span>{t.link_url && <a href={t.link_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ marginLeft: 6 }}><Icon name="link" size={14} /></a>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TaskDrawer({ task, onClose }) {
  const { data, add, save, del, canEdit, people } = useW();
  const w = data.wedding;
  const isNew = !!task._new;
  const auto = iso(addDays(w.wedding_date, -(task.offset_days || 0)));
  const [f, setF] = useState({
    title: task.title || '', detail: task.detail || '', stage: task.stage || 'Lainnya', pic: task.pic || '',
    status: task.status || 'belum', priority: task.priority || 'sedang', result: task.result || '', link_url: task.link_url || '',
    due_date: task.due_date || (isNew ? '' : null), event_kind: task.event_kind || null,
  });
  const [err, setErr] = useState('');
  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }));
  const hasLamaran = data.events.some(e => e.kind === 'lamaran');

  async function submit() {
    if (!f.title.trim()) { setErr('Nama kegiatan wajib diisi.'); return; }
    if (f.link_url && !/^https?:\/\//i.test(f.link_url)) { setErr('Link harus diawali http:// atau https://'); return; }
    const row = { ...f, title: f.title.trim(), due_date: f.due_date || null };
    if (row.due_date) row.offset_days = daysBetween(row.due_date, w.wedding_date);
    onClose();
    if (isNew) await add('tasks', { ...row, offset_days: row.offset_days ?? task.offset_days, sort: 999 });
    else await save('tasks', task.id, row);
  }
  async function remove() {
    if (await confirm({ title: 'Hapus tugas?', text: '“' + task.title + '” akan dihapus.', ok: 'Hapus', danger: true })) { onClose(); del('tasks', task.id); }
  }

  return (
    <Drawer open onClose={onClose} title={isNew ? 'Tugas baru' : 'Detail tugas'} eyebrow={isNew ? 'Persiapan' : f.stage}
      footer={canEdit ? <>{!isNew && <button type="button" className="btn2" onClick={remove} style={{ marginRight: 'auto' }}><Icon name="trash" size={15} />Hapus</button>}<button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn" onClick={submit}>Simpan</button></> : <button type="button" className="btn2" onClick={onClose}>Tutup</button>}>
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, display: 'contents' }}>
        <Field label="Kegiatan" error={err}><Text value={f.title} onChange={set('title')} placeholder="mis. Booking catering" /></Field>
        <Field label="Detail"><Area value={f.detail} onChange={set('detail')} rows={2} placeholder="Langkah, catatan singkat" /></Field>
        <Field label="Status"><Seg value={f.status} onChange={set('status')} items={[{ key: 'belum', label: 'Belum' }, { key: 'proses', label: 'Proses', cls: 's-wait' }, { key: 'selesai', label: 'Selesai', cls: 's-ok' }, { key: 'batal', label: 'Batal' }]} /></Field>
        <div className="g2">
          <Field label="PIC"><PersonPick value={f.pic} onChange={set('pic')} people={people} /></Field>
          <Field label="Deadline" hint={f.due_date ? 'manual' : 'otomatis ' + dShort(auto)}><DateIn value={f.due_date || ''} onChange={set('due_date')} /></Field>
        </div>
        <div className="g2">
          <Field label="Tahap"><Select value={f.stage} onChange={(v) => set('stage')(v || 'Lainnya')} options={STAGES} /></Field>
          <Field label="Prioritas"><Seg small value={f.priority} onChange={set('priority')} items={[{ key: 'tinggi', label: 'Tinggi' }, { key: 'sedang', label: 'Sedang' }, { key: 'biasa', label: 'Biasa' }]} /></Field>
        </div>
        {hasLamaran && <Field label="Bagian dari acara"><Seg small value={f.event_kind || ''} onChange={(v) => set('event_kind')(v || null)} items={[{ key: '', label: 'Umum' }, { key: 'lamaran', label: 'Lamaran' }]} /></Field>}
        <Field label="Hasil / keterangan"><Area value={f.result} onChange={set('result')} rows={2} placeholder="mis. Shortlist: Dapur Ibu Ratna" /></Field>
        <Field label="Link lampiran" hint="Drive, IG, kontrak…"><Text value={f.link_url} onChange={set('link_url')} placeholder="https://" inputMode="url" /></Field>
        {f.due_date && <button type="button" className="lnk" style={{ alignSelf: 'flex-start' }} onClick={() => set('due_date')(null)}>Kembalikan deadline otomatis ({dShort(auto)})</button>}
      </fieldset>
    </Drawer>
  );
}
