import React, { useEffect, useMemo, useState } from 'react';
import { useW } from '../lib/store.jsx';
import { Icon, Tabs, Chips, Pill, Check, Tile, Drawer, Field, Text, Area, DateIn, Seg, Select, confirm, Empty, Bar } from '../components/ui.jsx';
import { PersonSelect, PersonChip } from '../components/People.jsx';
import { useEv, EventHeader } from '../components/EventKit.jsx';
import { STAGES, taskDue, taskState, periodOfTask, periodRange, currentPeriod, periodsFor, taskBase } from '../lib/calc.js';
import { baseDate, personById } from '../lib/events.js';
import { dShort, dMed, iso, today, addDays, daysBetween, pct } from '../lib/format.js';

export default function Persiapan({ q }) {
  const { data, canEdit, save, mine } = useW();
  const E = useEv();
  const { ev, scope } = E;
  const periods = periodsFor(data, ev);
  const [view, setView] = useState('periode');
  const [filter, setFilter] = useState('semua');
  const [sel, setSel] = useState(null);
  const [edit, setEdit] = useState(null);
  const ids = scope.ids;

  useEffect(() => { if (q.t) { const t = data.tasks.find(x => x.id === q.t); if (t) setEdit(t); } }, [q.t]);

  const all = useMemo(() => data.tasks.filter(t => ids.includes(t.event_id)).map(t => ({ ...t, _due: taskDue(t, data), _st: taskState(t, data), _per: periodOfTask(t, data, periods).key })), [data, ids.join(), periods]);
  const active = all.filter(t => t.status !== 'batal');
  const counts = {
    telat: all.filter(t => t._st.key === 'telat').length,
    proses: all.filter(t => t._st.key === 'proses' || t._st.key === 'belum').length,
    selesai: all.filter(t => t.status === 'selesai').length,
    saya: all.filter(t => mine.includes(t.pic_id) && t.status !== 'selesai').length,
    ulang: all.filter(t => !t.pic_id).length,
  };
  const pass = (t) => {
    if (filter === 'telat') return t._st.key === 'telat';
    if (filter === 'saya') return mine.includes(t.pic_id);
    if (filter === 'proses') return ['proses', 'belum'].includes(t._st.key);
    if (filter === 'ulang') return !t.pic_id;
    return true;
  };
  const list = all.filter(pass);
  const pics = new Set(active.map(t => t.pic_id).filter(Boolean));
  const notStarted = all.filter(t => t.status === 'belum' && t._st.key !== 'telat').length;
  const firstLate = all.find(t => t._st.key === 'telat');
  const base = baseDate(data, scope.target);
  const cur = currentPeriod(scope.all ? base : base, periods);
  const toggle = (t, on) => save('tasks', t.id, { status: on ? 'selesai' : 'belum' });
  const what = scope.part ? scope.part.name.toLowerCase() : ev.name.toLowerCase();
  const evLabel = scope.part ? scope.part.name.toLowerCase() : ev.kind === 'akad' ? 'hari H' : ev.name.toLowerCase();
  const newTask = () => setEdit({ _new: true, event_id: scope.target, stage: 'Lainnya', status: 'belum', priority: 'sedang', offset_days: Math.max(daysBetween(today(), baseDate(data, scope.target)) - 14, 0) });

  return (
    <>
      <EventHeader title="Persiapan"
        actions={<><Tabs value={view} onChange={setView} items={[{ key: 'periode', label: 'Per periode' }, { key: 'tahap', label: 'Per tahap' }]} />{canEdit && <button type="button" className="btn" onClick={newTask}><Icon name="plus" size={15} />Tugas</button>}</>}
        partSub={(xs, p) => (p && p.event_date ? dShort(p.event_date) + ' · ' : '') + data.tasks.filter(t => xs.includes(t.event_id)).length + ' tugas'} />
      <div className="between">
        <span />
        <Chips value={filter} onChange={setFilter} items={[
          { key: 'semua', label: 'Semua' }, { key: 'saya', label: 'Tugas saya' + (counts.saya ? ' · ' + counts.saya : '') }, { key: 'telat', label: 'Telat · ' + counts.telat },
          { key: 'proses', label: 'Proses · ' + counts.proses }, ...(counts.ulang ? [{ key: 'ulang', label: 'PIC pilih ulang · ' + counts.ulang }] : [])]} />
      </div>

      <section className="tiles ev-tiles">
        <Tile w="w4" icon="list" k={'Tugas ' + what} v={active.length} sub={'PIC: ' + pics.size + ' orang'} />
        <Tile w="w3" icon="check" k="Selesai" v={counts.selesai} sub={pct(counts.selesai, active.length) + '% dari tugas'} />
        <Tile w="w2" icon="clock" k="Proses" v={counts.proses} sub={notStarted + ' belum dimulai'} />
        <Tile w="w1" icon="star" k="Telat" v={counts.telat} sub={firstLate ? firstLate.title : 'aman'} />
      </section>

      {!all.length ? (
        <div className="g"><Empty icon="list" title="Belum ada tugas" text={'Tambah tugas untuk ' + ev.name + '.'} action={canEdit && <button type="button" className="btn" onClick={newTask}>+ Tugas</button>} /></div>
      ) : view === 'periode' ? (
        <section className="g col" style={{ gap: 12 }}>
          <div className="pers">
            {periods.map(p => {
              const ts = active.filter(t => t._per === p.key);
              if (!ts.length) return null;
              const d = ts.filter(t => t.status === 'selesai').length;
              const [s, e] = periodRange(p, base);
              const isNow = !scope.all && p.key === cur.key;
              return (
                <button type="button" key={p.key} className={'per' + (sel === p.key ? ' on' : '') + (isNow ? ' now' : '') + (d === ts.length ? ' done' : '')} onClick={() => setSel(x => (x === p.key ? null : p.key))}>
                  <span className="between nowrap"><b>{p.label}</b>{isNow && <span className="pill ta1">sekarang</span>}</span>
                  <Bar value={pct(d, ts.length)} cls={d === ts.length ? 'fs' : 'fs'} />
                  <span className="xs muted">{scope.all ? '' : (s ? dShort(s) : 's.d.') + (e ? (s ? ' – ' : ' ') + dShort(e) : '') + ' · '}{d} dari {ts.length}</span>
                </button>
              );
            })}
          </div>
          <TaskTable groups={periods.filter(p => !sel || p.key === sel).map(p => {
            const rows = list.filter(t => t._per === p.key).sort((a, b) => a._due - b._due || a.sort - b.sort);
            const ts = active.filter(t => t._per === p.key);
            const [s, e] = periodRange(p, base);
            const range = scope.all ? '' : ' · ' + (s ? dShort(s) + ' – ' : 's.d. ') + (e ? dShort(e) : 'seterusnya');
            return { key: p.key, title: p.long + (p.to >= 0 ? ' sebelum ' + evLabel : '') + range + ' · ' + ts.filter(t => t.status === 'selesai').length + ' dari ' + ts.length + ' selesai', rows };
          })} onOpen={setEdit} onToggle={toggle} canEdit={canEdit} showPart={scope.all} />
        </section>
      ) : (
        <section className="g">
          <TaskTable groups={STAGES.map(st => {
            const rows = list.filter(t => (t.stage || 'Lainnya') === st).sort((a, b) => a._due - b._due);
            const ts = active.filter(t => (t.stage || 'Lainnya') === st);
            return { key: st, title: st + ' · ' + ts.filter(t => t.status === 'selesai').length + ' dari ' + ts.length + ' selesai', rows };
          })} onOpen={setEdit} onToggle={toggle} canEdit={canEdit} showPart={scope.all} />
        </section>
      )}
      {all.length > 0 && !list.length && <Empty title="Tidak ada tugas untuk filter ini" />}
      {edit && <TaskDrawer task={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function TaskTable({ groups, onOpen, onToggle, canEdit, showPart }) {
  const { data } = useW();
  const vis = groups.filter(g => g.rows.length);
  if (!vis.length) return null;
  return (
    <div className="tw">
      <table className="t stack">
        <thead><tr><th style={{ width: 32 }} /><th>Tugas</th><th>PIC</th><th>Deadline</th><th>Status</th><th>Terkait</th></tr></thead>
        <tbody>
          {vis.map(g => (
            <React.Fragment key={g.key}>
              <tr className="cat"><td colSpan={6}>{g.title}</td></tr>
              {g.rows.map(t => {
                const part = showPart ? data.events.find(e => e.id === t.event_id && e.parent_id) : null;
                return (
                  <tr key={t.id} className="click" onClick={() => onOpen(t)}>
                    <td><Check on={t.status === 'selesai'} disabled={!canEdit} onChange={(v) => onToggle(t, v)} label={'Tandai ' + t.title} /></td>
                    <td style={{ minWidth: 220 }}><b className={t.status === 'selesai' ? 'strike' : ''}>{t.title}</b>{(t.detail || part) && <span className="cell-sub">{[part && part.name, t.status !== 'selesai' && t.detail].filter(Boolean).join(' · ')}</span>}</td>
                    <td className="mhide"><PersonChip id={t.pic_id} text={t.pic} /></td>
                    <td className={'nw' + (t._st.key === 'telat' ? '' : ' muted')} style={t._st.key === 'telat' ? { color: '#8E3A30', fontWeight: 800 } : null}>{dShort(t._due)}</td>
                    <td><Pill cls={t._st.cls}>{t._st.label}</Pill></td>
                    <td className="mhide" style={{ maxWidth: 240 }}>{t.result ? <span className="lnk" style={{ fontSize: 12.5 }}>{t.result}</span> : <span className="muted">–</span>}{t.link_url && <a href={t.link_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ marginLeft: 6 }}><Icon name="link" size={14} /></a>}</td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TaskDrawer({ task, onClose }) {
  const { data, add, save, del, canEdit } = useW();
  const E = useEv();
  const isNew = !!task._new;
  const [f, setF] = useState({
    title: task.title || '', detail: task.detail || '', stage: task.stage || 'Lainnya', pic_id: task.pic_id || null,
    status: task.status || 'belum', priority: task.priority || 'sedang', result: task.result || '', link_url: task.link_url || '',
    due_date: task.due_date || '', event_id: task.event_id || E.scope.target,
  });
  const [err, setErr] = useState({});
  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }));
  const base = baseDate(data, f.event_id);
  const auto = iso(addDays(base, -(task.offset_days || 0)));

  async function submit() {
    const er = {};
    if (!f.title.trim()) er.title = 'Nama tugas wajib diisi.';
    if (!f.pic_id) er.pic = 'Pilih PIC tugas ini.';
    if (f.link_url && !/^https?:\/\//i.test(f.link_url)) er.link = 'Link harus diawali http:// atau https://';
    setErr(er);
    if (Object.keys(er).length) return;
    const row = { ...f, title: f.title.trim(), due_date: f.due_date || null };
    row.offset_days = row.due_date ? daysBetween(row.due_date, base) : (task.offset_days ?? 14);
    onClose();
    if (isNew) await add('tasks', { ...row, sort: 999 });
    else await save('tasks', task.id, row);
  }
  async function remove() {
    if (await confirm({ title: 'Hapus tugas?', text: '“' + task.title + '” akan dihapus.', ok: 'Hapus', danger: true })) { onClose(); del('tasks', task.id); }
  }
  const parts = E.scope.parts;
  return (
    <Drawer open onClose={onClose} title={isNew ? 'Tugas baru' : 'Detail tugas'} eyebrow={E.ev.name + (parts.length ? ' › ' + ((parts.find(p => p.id === f.event_id) || {}).name || '') : '')}
      footer={canEdit ? <>{!isNew && <button type="button" className="btn2" onClick={remove} style={{ marginRight: 'auto' }}><Icon name="trash" size={15} />Hapus</button>}<button type="button" className="btn2" onClick={onClose}>Batal</button><button type="button" className="btn" onClick={submit}>Simpan</button></> : <button type="button" className="btn2" onClick={onClose}>Tutup</button>}>
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, display: 'contents' }}>
        <Field label="Tugas" error={err.title}><Text value={f.title} onChange={set('title')} placeholder="mis. Booking catering" /></Field>
        <Field label="Detail"><Area value={f.detail} onChange={set('detail')} rows={2} placeholder="Langkah, catatan singkat" /></Field>
        {parts.length > 0 && <Field label="Bagian acara"><Seg small value={f.event_id} onChange={set('event_id')} items={parts.map(p => ({ key: p.id, label: p.name }))} /></Field>}
        <Field div label="PIC · yang mengurus" hint="Wajib" error={err.pic}>
          <PersonSelect value={f.pic_id} onChange={set('pic_id')} invalid={!!err.pic} />
          {!f.pic_id && task.pic && <span className="xs muted" style={{ marginTop: 4 }}>Sebelumnya tertulis “{task.pic}”. Pilih ulang dari daftar.</span>}
        </Field>
        <Field label="Status"><Seg value={f.status} onChange={set('status')} items={[{ key: 'belum', label: 'Belum' }, { key: 'proses', label: 'Proses', cls: 's-wait' }, { key: 'selesai', label: 'Selesai', cls: 's-ok' }, { key: 'batal', label: 'Batal' }]} /></Field>
        <div className="g2">
          <Field label="Deadline" hint={f.due_date ? 'manual' : 'otomatis ' + dShort(auto)}><DateIn value={f.due_date || ''} onChange={set('due_date')} /></Field>
          <Field label="Prioritas"><Seg small value={f.priority} onChange={set('priority')} items={[{ key: 'tinggi', label: 'Tinggi' }, { key: 'sedang', label: 'Sedang' }, { key: 'biasa', label: 'Biasa' }]} /></Field>
        </div>
        <Field label="Tahap"><Select value={f.stage} onChange={(v) => set('stage')(v || 'Lainnya')} options={STAGES} /></Field>
        <Field label="Hasil / keterangan"><Area value={f.result} onChange={set('result')} rows={2} placeholder="mis. Shortlist: Dapur Ibu Ratna" /></Field>
        <Field label="Link lampiran" hint="Drive, IG, kontrak…" error={err.link}><Text value={f.link_url} onChange={set('link_url')} placeholder="https://" inputMode="url" /></Field>
        {f.due_date && <button type="button" className="lnk" style={{ alignSelf: 'flex-start' }} onClick={() => set('due_date')('')}>Kembalikan deadline otomatis ({dShort(auto)})</button>}
      </fieldset>
    </Drawer>
  );
}
