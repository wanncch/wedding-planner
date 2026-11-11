import React, { createContext, useContext, useState } from 'react';
import { useW } from '../lib/store.jsx';
import { epath } from '../lib/nav.js';
import { Icon, Modal, useIsMobile } from './ui.jsx';
import { topEvents, eventDateLabel, eventLongLabel, MENU_DEFS, visibleMenus } from '../lib/events.js';
import { dShort } from '../lib/format.js';

/** Konteks acara yang sedang dibuka: acara, bagian, dan id yang termasuk. */
export const EvCtx = createContext(null);
export const useEv = () => useContext(EvCtx);

export function EvIcon({ ev, size = 30 }) {
  return <span className={'acd ' + (ev.color || 'c0')} style={{ width: size, height: size, borderRadius: size / 3 }}><Icon name={ev.icon || 'hati'} size={Math.round(size * 0.5)} /></span>;
}

/** Judul halaman sub menu + tab bagian acara + pemilih acara (HP). */
export function EventHeader({ title, actions, partSub, eyebrow, noParts }) {
  const E = useEv();
  const { data } = useW();
  const mobile = useIsMobile();
  const { ev, scope } = E;
  const eyb = eyebrow || eventLongLabel(data, ev, scope.part);
  return (
    <>
      {mobile && <MobileEventBar title={title} />}
      <div className="top">
        <div className={mobile ? 'hide-m' : ''}><div className="eyb">{eyb}</div><h1 className="h1">{title}</h1></div>
        {mobile && <div className="eyb" style={{ width: '100%' }}>{eyb}</div>}
        {actions && <div className="row">{actions}</div>}
      </div>
      {!noParts && scope.parts.length > 0 && <PartTabs sub={partSub} />}
    </>
  );
}

export function PartTabs({ sub }) {
  const E = useEv();
  const { data } = useW();
  const { ev, scope, partKey, setPartKey } = E;
  const items = [...scope.parts.map(p => ({ key: p.id, label: p.name, icon: p.kind === 'balasan' ? 'refresh' : ev.icon || 'hati', ids: [p.id], part: p })),
    { key: 'all', label: 'Gabungan', icon: 'list', ids: [ev.id, ...scope.parts.map(p => p.id)], part: null }];
  const cur = scope.all ? 'all' : scope.part ? scope.part.id : 'all';
  return (
    <div className={'bagian ' + (ev.color || 'c0')} role="tablist" aria-label="Bagian acara">
      {items.map(it => (
        <button type="button" key={it.key} role="tab" aria-selected={cur === it.key} className={'bg' + (cur === it.key ? ' on' : '')} onClick={() => setPartKey(it.key)}>
          <span className="dot"><Icon name={it.icon} size={14} /></span>
          <span>{it.label}<small>{sub ? sub(it.ids, it.part) : it.part && it.part.event_date ? dShort(it.part.event_date) : ''}</small></span>
        </button>
      ))}
    </div>
  );
}

function MobileEventBar({ title }) {
  const E = useEv();
  const { data, wid } = useW();
  const [open, setOpen] = useState(false);
  const { ev, menu } = E;
  return (
    <div className="between nowrap evbar">
      <button type="button" className="evpick" onClick={() => setOpen(true)}><span className={'acd ' + ev.color} style={{ width: 26, height: 26, borderRadius: 9 }}><Icon name={ev.icon} size={13} /></span><b className="ell">{ev.name}</b><Icon name="down" size={15} /></button>
      <h1 className="h2" style={{ fontSize: 22 }}>{title}</h1>
      <Modal open={open} onClose={() => setOpen(false)} title="Pilih acara">
        <div className="col" style={{ gap: 6 }}>
          {topEvents(data).map(e => {
            const ms = visibleMenus(e);
            const m = ms.includes(menu) ? menu : ms[0];
            return (
              <a key={e.id} href={epath(wid, e.id, m || 'persiapan')} className={'li click' + (e.id === ev.id ? ' sel' : '')} onClick={() => setOpen(false)} style={{ textDecoration: 'none', color: 'inherit' }}>
                <span className={'acd ' + e.color}><Icon name={e.icon} size={15} /></span>
                <span className="grow"><b>{e.name}</b><span className="xs muted" style={{ display: 'block' }}>{eventDateLabel(data, e)}</span></span>
                {e.id === ev.id && <Icon name="check" size={16} />}
              </a>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}

export function MenuIcon({ k, size = 16 }) { return <Icon name={(MENU_DEFS[k] || {}).icon || 'list'} size={size} />; }
