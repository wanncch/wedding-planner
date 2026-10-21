import React, { useEffect, useRef, useState } from 'react';
import { useW, useToast } from '../lib/store.jsx';
import { uploadFile, fileUrl, openFile, fileName } from '../lib/files.js';
import { Icon } from './ui.jsx';

/** Isian file: unggah foto/PDF ke penyimpanan, atau tempel link (Drive, Pinterest, IG, toko). */
export default function FileField({ value, onChange, folder = 'umum', label = 'Tambah foto / file', hint = 'atau tempel link', accept = 'image/*,application/pdf', image }) {
  const { wid, canEdit } = useW();
  const toast = useToast();
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [thumb, setThumb] = useState('');
  const [link, setLink] = useState(false);
  const [txt, setTxt] = useState('');

  useEffect(() => {
    let alive = true;
    if (value && value.startsWith('sb:') && /\.(jpe?g|png|webp|heic)$/i.test(value)) {
      fileUrl(value).then(u => { if (alive) setThumb(u); }).catch(() => {});
    } else setThumb('');
    return () => { alive = false; };
  }, [value]);

  async function pick(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true);
    try { onChange(await uploadFile(wid, folder, f)); toast('File terunggah.', 'ok'); }
    catch (er) { toast(er.message, 'error'); }
    finally { setBusy(false); }
  }

  if (value) {
    return (
      <div className="up" style={{ cursor: 'default' }}>
        <span className="thumb">{thumb ? <img src={thumb} alt="" /> : <Icon name={value.startsWith('sb:') ? 'file' : 'link'} size={20} />}</span>
        <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
          <button type="button" className="lnk ell" style={{ display: 'block', maxWidth: '100%', textAlign: 'left' }} onClick={() => openFile(value)}>{fileName(value)}</button>
          <div className="xs muted">{value.startsWith('sb:') ? 'Tersimpan di aplikasi' : 'Link'}</div>
        </div>
        {canEdit && <button type="button" className="ibtn" onClick={() => onChange('')} aria-label="Hapus file"><Icon name="x" size={16} /></button>}
      </div>
    );
  }
  if (!canEdit) return <div className="xs muted">Belum ada file.</div>;
  if (link) {
    return (
      <div className="row nowrap">
        <input className="inp" autoFocus placeholder="https://…" value={txt} onChange={(e) => setTxt(e.target.value)} inputMode="url" />
        <button type="button" className="btn2" onClick={() => { if (/^https?:\/\//i.test(txt.trim())) { onChange(txt.trim()); setLink(false); setTxt(''); } else toast('Link harus diawali http:// atau https://', 'error'); }}>Pakai</button>
        <button type="button" className="ibtn" onClick={() => setLink(false)} aria-label="Batal"><Icon name="x" size={16} /></button>
      </div>
    );
  }
  return (
    <div className="up" onClick={() => !busy && ref.current.click()} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') ref.current.click(); }}>
      <span className="thumb"><Icon name={image ? 'camera' : 'upload'} size={20} /></span>
      <div style={{ flex: 1, fontSize: 13 }}>
        <b>{busy ? 'Mengunggah…' : label}</b>
        <div className="xs muted">maks. 10 MB · <button type="button" className="lnk xs" onClick={(e) => { e.stopPropagation(); setLink(true); }}>{hint}</button></div>
      </div>
      <input ref={ref} type="file" accept={accept} hidden onChange={pick} />
    </div>
  );
}
