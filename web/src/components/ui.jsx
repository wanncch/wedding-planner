import React, { useEffect, useRef, useState } from 'react';
import { initials, parseMoney, num } from '../lib/format.js';

const P = {
  home: <path d="M4 11l8-7 8 7v9H4z" />,
  list: <path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />,
  wallet: <><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M3 10h18" /></>,
  store: <path d="M4 9l1.5-5h13L20 9M4 9h16v11H4z" />,
  gift: <><rect x="3" y="8" width="18" height="5" rx="1" /><path d="M5 13v8h14v-8M12 8v13M12 8c-2-4-6-4-6-1s4 1 6 1c2 0 6 2 6-1s-4-3-6 1" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5M16 5a3 3 0 0 1 0 6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>,
  note: <><path d="M5 4h14v12l-4 4H5z" /><path d="M15 20v-4h4M8 9h8M8 13h5" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></>,
  more: <><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  check: <path d="M5 12l5 5 9-10" />,
  right: <path d="M9 6l6 6-6 6" />,
  left: <path d="M15 6l-6 6 6 6" />,
  down: <path d="M6 9l6 6 6-6" />,
  link: <path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1" />,
  upload: <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />,
  download: <path d="M12 4v12M7 11l5 5 5-5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />,
  share: <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6" /></>,
  refresh: <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />,
  logout: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
  star: <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" />,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  wa: <><path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z" /><path d="M9 9.5c.3 2 2.5 4.2 4.5 4.5l1-1.2 1.8.8-.3 1.4c-3 .6-7.5-3.9-6.9-6.9l1.4-.3.8 1.8z" /></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeoff: <path d="M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.2 3.8M6.6 6.6C3.8 8.3 2 12 2 12s4 6 10 6a9.6 9.6 0 0 0 4.4-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2" />,
  camera: <><rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="9" cy="11" r="2" /><path d="M21 16l-5-5-8 8" /></>,
  live: <><circle cx="12" cy="12" r="3" /><path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4" /></>,
  rings: <><circle cx="9" cy="13" r="5.5" /><circle cx="15" cy="13" r="5.5" /></>,
  grip: <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" />,
  sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />,
};

export function Icon({ name, size = 18, stroke = 1.8, className, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>{P[name] || null}</svg>
  );
}

const AV_COLORS = ['ar', 'ab', 'ai', 'aw', 'am'];
export function Avatar({ name, size }) {
  const n = String(name || '?');
  let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const cls = 'av ' + AV_COLORS[h % AV_COLORS.length];
  return <span className={cls} title={n} style={size ? { width: size, height: size, fontSize: size * 0.38 } : null}>{initials(n)}</span>;
}
export function Avatars({ names }) {
  const list = String(names || '').split(/[,&/]+| dan /).map(s => s.trim()).filter(Boolean);
  if (!list.length) return <span className="muted">–</span>;
  return <span className="avs">{list.slice(0, 3).map((n, i) => <Avatar key={i} name={n} />)}</span>;
}

export const Pill = ({ cls = 'p-no', children, title }) => <span className={'pill ' + cls} title={title}>{children}</span>;

export function Tabs({ value, onChange, items, className }) {
  return (
    <div className={'tabs ' + (className || '')} role="tablist">
      {items.map(it => (
        <button type="button" role="tab" aria-selected={value === it.key} key={it.key}
          className={'tab' + (value === it.key ? ' on' : '')} onClick={() => onChange(it.key)}>{it.label}</button>
      ))}
    </div>
  );
}

export function Chips({ value, onChange, items }) {
  return (
    <div className="row chips">
      {items.map(it => (
        <button type="button" key={it.key} className={'chip' + (value === it.key ? ' on' : '')} onClick={() => onChange(it.key)}>{it.label}</button>
      ))}
    </div>
  );
}

export function Seg({ value, onChange, items, disabled, small }) {
  return (
    <div className={'seg' + (small ? ' sm' : '')} role="radiogroup">
      {items.map(it => (
        <button type="button" role="radio" aria-checked={value === it.key} key={it.key} disabled={disabled}
          className={value === it.key ? 'on ' + (it.cls || '') : ''} onClick={() => onChange(it.key)}>{it.label}</button>
      ))}
    </div>
  );
}

export const Bar = ({ value, cls = 'fr', style }) => (
  <div className="bar" style={style}><i className={cls} style={{ width: Math.max(0, Math.min(100, value || 0)) + '%' }} /></div>
);

export function Tile({ k, v, sub, w = 'w1', subStyle, children, onClick }) {
  return (
    <div className={'tile ' + w + (onClick ? ' click' : '')} onClick={onClick}>
      <div className="k">{k}</div>
      <div className="v">{v}</div>
      {sub && <div className="xs muted" style={subStyle}>{sub}</div>}
      {children}
    </div>
  );
}

export function Check({ on, onChange, disabled, label }) {
  return (
    <button type="button" className={'ck' + (on ? ' on' : '')} aria-pressed={!!on} aria-label={label || 'Tandai selesai'}
      disabled={disabled} onClick={(e) => { e.stopPropagation(); onChange && onChange(!on); }}>
      {on && <Icon name="check" size={12} stroke={3} />}
    </button>
  );
}

export function Toggle({ on, onChange, disabled }) {
  return <button type="button" className={'tog' + (on ? ' on' : '')} aria-pressed={!!on} disabled={disabled} onClick={() => onChange(!on)} />;
}

export function Empty({ icon = 'sparkle', title, text, action }) {
  return (
    <div className="empty">
      <span className="ico"><Icon name={icon} size={20} /></span>
      <b>{title}</b>
      {text && <div className="xs muted">{text}</div>}
      {action}
    </div>
  );
}

/* ---------------- Drawer & modal ---------------- */
export function Drawer({ open, onClose, title, eyebrow, children, footer, head, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('noscroll');
    setTimeout(() => { const f = ref.current && ref.current.querySelector('input,textarea,select'); if (f && window.innerWidth > 700) f.focus(); }, 60);
    return () => { document.removeEventListener('keydown', onKey); document.body.classList.remove('noscroll'); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className={'dr' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="drh">
          <div className="between nowrap">
            <div style={{ minWidth: 0 }}>{eyebrow && <div className="eyb">{eyebrow}</div>}<div className="h2 dtitle">{title}</div></div>
            <button type="button" className="x" onClick={onClose} aria-label="Tutup"><Icon name="x" /></button>
          </div>
          {head}
        </div>
        <div className="drb">{children}</div>
        {footer && <div className="drf">{footer}</div>}
      </section>
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="ovl center" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="between nowrap"><div className="h2">{title}</div><button type="button" className="x" onClick={onClose} aria-label="Tutup"><Icon name="x" /></button></div>
        <div className="mbody">{children}</div>
        {footer && <div className="row" style={{ justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  );
}

let confirmFn = null;
export function ConfirmHost() {
  const [st, setSt] = useState(null);
  useEffect(() => { confirmFn = (opts) => new Promise(res => setSt({ ...opts, res })); return () => { confirmFn = null; }; }, []);
  if (!st) return null;
  const close = (v) => { st.res(v); setSt(null); };
  return (
    <Modal open title={st.title || 'Yakin?'} onClose={() => close(false)}
      footer={<><button type="button" className="btn2" onClick={() => close(false)}>Batal</button>
        <button type="button" className={st.danger ? 'btn danger' : 'btn'} onClick={() => close(true)}>{st.ok || 'Ya, lanjut'}</button></>}>
      <p style={{ margin: 0, lineHeight: 1.55 }}>{st.text}</p>
    </Modal>
  );
}
export const confirm = (opts) => (confirmFn ? confirmFn(opts) : Promise.resolve(window.confirm(opts.text)));

/* ---------------- Form fields ---------------- */
export function Field({ label, hint, error, children, className }) {
  return (
    <label className={'fld ' + (className || '')}>
      {label && <span className="dlbl">{label}{hint && <em>{hint}</em>}</span>}
      {children}
      {error && <span className="ferr">{error}</span>}
    </label>
  );
}

export function Text({ value, onChange, ...rest }) {
  return <input className="inp" value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />;
}
export function Area({ value, onChange, rows = 3, ...rest }) {
  return <textarea className="inp" rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />;
}
export function DateIn({ value, onChange, ...rest }) {
  return <input type="date" className="inp" value={value || ''} onChange={(e) => onChange(e.target.value || null)} {...rest} />;
}
export function TimeIn({ value, onChange, ...rest }) {
  return <input type="time" className="inp" value={value ? String(value).slice(0, 5) : ''} onChange={(e) => onChange(e.target.value || null)} {...rest} />;
}
export function NumIn({ value, onChange, min = 0, ...rest }) {
  return <input type="number" inputMode="numeric" className="inp" min={min} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} {...rest} />;
}
export function Select({ value, onChange, options, placeholder, ...rest }) {
  return (
    <select className="inp" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map(o => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
  );
}

/** Input rupiah: ketik 1500000 / 1,5jt / 1.500.000 */
export function Money({ value, onChange, placeholder = 'Rp 0', ...rest }) {
  const [txt, setTxt] = useState(value === null || value === undefined ? '' : num(value));
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) { setTxt(value === null || value === undefined ? '' : num(value)); last.current = value; }
  }, [value]);
  return (
    <div className="inp money">
      <span className="muted">Rp</span>
      <input inputMode="numeric" placeholder={placeholder.replace('Rp ', '')} value={txt} {...rest}
        onChange={(e) => { setTxt(e.target.value); const v = parseMoney(e.target.value); last.current = v; onChange(v); }}
        onBlur={() => setTxt(last.current === null || last.current === undefined ? '' : num(last.current))} />
    </div>
  );
}

export function PersonPick({ value, onChange, people, extra = ['Berdua', 'Keluarga', 'WO'] }) {
  const names = Array.from(new Set([...people.map(p => p.name.split(' ')[0]), ...extra]));
  const listId = 'pp-' + Math.random().toString(36).slice(2, 7);
  return (
    <>
      <input className="inp" list={listId} value={value ?? ''} placeholder="Nama PIC" onChange={(e) => onChange(e.target.value)} />
      <datalist id={listId}>{names.map(n => <option key={n} value={n} />)}</datalist>
    </>
  );
}

export function Spinner({ label }) {
  return <div className="spin-wrap"><span className="spin" />{label && <span className="muted">{label}</span>}</div>;
}

export function useIsMobile() {
  const q = '(max-width: 960px)';
  const [m, setM] = useState(() => window.matchMedia && window.matchMedia(q).matches);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => { mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on); };
  }, []);
  return m;
}
