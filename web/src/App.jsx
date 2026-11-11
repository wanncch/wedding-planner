import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useAuth, WeddingProvider, useW } from './lib/store.jsx';
import { Icon, Spinner, Avatar, Modal } from './components/ui.jsx';
import SaveBadge from './components/SaveBadge.jsx';
import { taskState } from './lib/calc.js';
import { epath, wpath } from './lib/nav.js';
import AuthPage, { ResetPassword } from './pages/Auth.jsx';
import Workspaces, { InviteAccept } from './pages/Workspaces.jsx';
import { AccountBanner, AnnouncementBar } from './components/Account.jsx';
import { EvCtx } from './components/EventKit.jsx';
import { MENU_DEFS, topEvents, eventDateLabel, visibleMenus, rememberedPart, rememberPart, scopeOf, mainEvent, familyIds, eventById } from './lib/events.js';

const Beranda = lazy(() => import('./pages/Beranda.jsx'));
const Persiapan = lazy(() => import('./pages/Persiapan.jsx'));
const Anggaran = lazy(() => import('./pages/Anggaran.jsx'));
const Vendor = lazy(() => import('./pages/Vendor.jsx'));
const Seserahan = lazy(() => import('./pages/Seserahan.jsx'));
const Tamu = lazy(() => import('./pages/Tamu.jsx'));
const Rundown = lazy(() => import('./pages/Rundown.jsx'));
const RundownLive = lazy(() => import('./pages/RundownLive.jsx'));
const Checkin = lazy(() => import('./pages/Checkin.jsx'));
const Dokumen = lazy(() => import('./pages/Dokumen.jsx'));
const Catatan = lazy(() => import('./pages/Catatan.jsx'));
const Pengaturan = lazy(() => import('./pages/Pengaturan.jsx'));
const AturAcara = lazy(() => import('./pages/AturAcara.jsx'));
const AddEventModal = lazy(() => import('./pages/AturAcara.jsx').then(m => ({ default: m.AddEventModal })));
const Admin = lazy(() => import('./pages/Admin.jsx'));
const Upgrade = lazy(() => import('./pages/Upgrade.jsx'));

const PAGES = { persiapan: Persiapan, anggaran: Anggaran, vendor: Vendor, seserahan: Seserahan, tamu: Tamu, rundown: Rundown, dokumen: Dokumen, catatan: Catatan, atur: AturAcara };
const FULLSCREEN = { live: RundownLive, checkin: Checkin };
const MOBILE = ['persiapan', 'anggaran', 'vendor'];

function parseHash() {
  const h = (window.location.hash || '').replace(/^#\/?/, '');
  const [path, query] = h.split('?');
  const parts = path.split('/').filter(Boolean);
  const q = Object.fromEntries(new URLSearchParams(query || ''));
  return { parts, q };
}

export function useRoute() {
  const [r, setR] = useState(parseHash);
  useEffect(() => {
    const on = () => { setR(parseHash()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}

export default function App() {
  const { session, recovery } = useAuth();
  const { parts, q } = useRoute();

  if (recovery) return <Bg><ResetPassword /></Bg>;
  if (session === undefined) return <Bg><Spinner label="Memuat…" /></Bg>;

  if (parts[0] === 'undangan' && parts[1]) {
    if (!session) {
      try { localStorage.setItem('wp-pending-invite', parts[1]); } catch (e) { /* abaikan */ }
      return <Bg><AuthPage mode="masuk" note="Masuk atau daftar dulu untuk menerima undangan bergabung." /></Bg>;
    }
    return <Bg><InviteAccept token={parts[1]} /></Bg>;
  }
  if (!session) return <Bg><AuthPage mode={['daftar', 'lupa'].includes(parts[0]) ? parts[0] : 'masuk'} /></Bg>;

  if (parts[0] === 'admin') return <Bg><Suspense fallback={<Spinner label="Memuat…" />}><Admin tab={parts[1]} /></Suspense></Bg>;
  if (parts[0] === 'upgrade') return <Bg><Suspense fallback={<Spinner label="Memuat…" />}><Upgrade /></Suspense></Bg>;

  if (parts[0] === 'w' && parts[1]) {
    try { localStorage.setItem('wp-current', parts[1]); } catch (e) { /* abaikan */ }
    const route = parts[2] === 'e' ? { menu: parts[4] || '', evId: parts[3] } : { menu: parts[2] || 'beranda', evId: null };
    return (
      <WeddingProvider wid={parts[1]} key={parts[1]}>
        <Shell route={route} q={q} />
      </WeddingProvider>
    );
  }
  return <Bg><Workspaces create={parts[0] === 'baru'} /></Bg>;
}

export function Bg({ children }) {
  return (
    <>
      <div className="bgfx" aria-hidden="true"><div className="orb o1" /><div className="orb o2" /><div className="orb o3" /><div className="orb o4" /></div>
      {children}
    </>
  );
}

const LAST = (wid) => 'wp-last-ev-' + wid;

function Shell({ route, q }) {
  const w = useW();
  const [more, setMore] = useState(false);
  const [addEv, setAddEv] = useState(false);
  const [partKeys, setPartKeys] = useState({});
  const { profile, account } = useAuth();

  useEffect(() => { setMore(false); }, [route.menu, route.evId]);

  const data = w && w.data;
  const wid = w && w.wid;
  // Menu lama (#/w/<id>/persiapan) → acara utama
  const legacy = data && !route.evId && (MENU_DEFS[route.menu] || route.menu === 'atur');
  const main = data ? mainEvent(data) : null;
  useEffect(() => {
    if (legacy && main) window.location.replace(epath(wid, main.id, route.menu, q));
  }, [legacy, main && main.id]);

  const ev = data && route.evId ? eventById(data, route.evId) : null;
  const evRoot = ev && ev.parent_id ? eventById(data, ev.parent_id) : ev;
  useEffect(() => { if (evRoot) { try { localStorage.setItem(LAST(wid), evRoot.id); } catch (e) { /* abaikan */ } } }, [evRoot && evRoot.id]);

  const evCtx = useMemo(() => {
    if (!evRoot) return null;
    const pk = partKeys[evRoot.id] !== undefined ? partKeys[evRoot.id] : (ev !== evRoot ? ev.id : q.b || rememberedPart(data, evRoot));
    const scope = scopeOf(data, evRoot, pk);
    return {
      ev: evRoot, scope, partKey: pk, menu: route.menu,
      setPartKey: (k) => { rememberPart(evRoot.id, k); setPartKeys(x => ({ ...x, [evRoot.id]: k })); },
      family: familyIds(data, evRoot.id),
    };
  }, [data, evRoot, ev, partKeys, route.menu, q.b]);

  if (!w || !w.data) {
    return (
      <Bg>
        <div className="auth">
          {w && w.error ? (
            <div className="g authcard">
              <div className="h2">Belum bisa memuat data</div>
              <div className="muted">{w.error}</div>
              <div className="row"><button type="button" className="btn" onClick={w.reload}>Coba lagi</button><a className="btn2" href="#/pilih">Pilih pernikahan lain</a></div>
            </div>
          ) : <Spinner label="Memuat data pernikahan…" />}
        </div>
      </Bg>
    );
  }
  if (legacy) return <Bg><Spinner /></Bg>;

  const wed = data.wedding;
  const tops = topEvents(data);

  if (FULLSCREEN[route.menu]) {
    const C = FULLSCREEN[route.menu];
    return <Bg><Suspense fallback={<Spinner />}><C q={q} /></Suspense></Bg>;
  }

  let Page; let pageKey = route.menu;
  if (evRoot) {
    const ms = visibleMenus(evRoot);
    if (!pageKey || (!PAGES[pageKey])) pageKey = ms[0] || 'atur';
    Page = PAGES[pageKey];
  } else if (route.evId) {
    Page = () => <div className="g"><div className="h2">Acara tidak ditemukan</div><div className="muted">Acara ini mungkin sudah dihapus.</div><a className="btn2" href={wpath(wid, 'beranda')} style={{ alignSelf: 'flex-start', marginTop: 10 }}>Ke Beranda</a></div>;
  } else Page = route.menu === 'pengaturan' ? Pengaturan : Beranda;

  let lastEv = null;
  try { lastEv = eventById(data, localStorage.getItem(LAST(wid))); } catch (e) { /* abaikan */ }
  const curEv = evRoot || (lastEv && !lastEv.parent_id && !lastEv.hidden ? lastEv : main);
  const lateOf = (e) => data.tasks.filter(t => familyIds(data, e.id).includes(t.event_id) && taskState(t, data).key === 'telat').length;
  const mHref = (k) => {
    if (k === 'beranda') return wpath(wid, 'beranda');
    const e = curEv;
    return e ? epath(wid, e.id, k) : wpath(wid, 'beranda');
  };
  const mOn = (k) => (k === 'beranda' ? !evRoot && route.menu !== 'pengaturan' : evRoot && pageKey === k);

  return (
    <Bg>
      <div className="app">
        <aside className="side">
          <div className="brand"><span className="logo"><Icon name="rings" size={22} /></span><div><div className="bn">Wedding Planner</div><div className="by">by Wanncch</div></div></div>
          <nav className="nav" aria-label="Utama">
            <a href={wpath(wid, 'beranda')} className={!evRoot && route.menu !== 'pengaturan' ? 'on' : ''}><Icon name="home" />Beranda</a>
          </nav>
          <div className="lbl" style={{ padding: '6px 10px 0' }}>Acara</div>
          <div className="col" style={{ gap: 4 }}>
            {tops.map(e => {
              const open = evRoot && evRoot.id === e.id;
              const ms = visibleMenus(e);
              const late = lateOf(e);
              return (
                <div key={e.id} className={'acg ' + (e.color || 'c0') + (open ? ' open' : '')}>
                  <div className="ach">
                    <a className="acb" href={epath(wid, e.id, open ? pageKey : (ms.includes(route.menu) ? route.menu : ms[0] || 'atur'))}>
                      <span className={'acd ' + (e.color || 'c0')}><Icon name={e.icon || 'hati'} size={15} /></span>
                      <span className="acn"><b className="ell">{e.name}</b><span className="ell">{eventDateLabel(data, e)}</span></span>
                      <Icon name={open ? 'down' : 'right'} size={15} className="chev" />
                    </a>
                    {w.canEdit && <a className={'pen' + (open && pageKey === 'atur' ? ' sel' : '')} href={epath(wid, e.id, 'atur')} aria-label={'Atur acara ' + e.name}><Icon name="edit" size={15} /></a>}
                  </div>
                  {open && (
                    <nav className="nav" aria-label={'Menu ' + e.name}>
                      {ms.map(k => (
                        <a key={k} href={epath(wid, e.id, k)} className={k === pageKey ? 'on' : ''} aria-current={k === pageKey ? 'page' : undefined}>
                          <Icon name={MENU_DEFS[k].icon} size={16} />{MENU_DEFS[k].label}{k === 'persiapan' && late > 0 && <span className="nb">{late}</span>}
                        </a>
                      ))}
                    </nav>
                  )}
                </div>
              );
            })}
          </div>
          {w.canEdit && <button type="button" className="addac" onClick={() => setAddEv(true)}><Icon name="plus" size={15} />Tambah acara</button>}
          <div className="sfoot">
            <nav className="nav"><a href={wpath(wid, 'pengaturan')} className={route.menu === 'pengaturan' && !evRoot ? 'on' : ''}><Icon name="gear" />Pengaturan</a></nav>
            {account && account.is_admin && <a className="btn2 sm" href="#/admin"><Icon name="shield" size={15} />Pusat Kontrol</a>}
            <a className="couple" href="#/pilih" style={{ textDecoration: 'none', color: 'inherit' }}>
              <span className="avs"><Avatar name={wed.bride_name} side="wanita" /><Avatar name={wed.groom_name} side="pria" /></span>
              <span style={{ minWidth: 0 }}><b className="ell" style={{ display: 'block' }}>{wed.bride_name} &amp; {wed.groom_name}</b><span className="muted">Ganti pernikahan</span></span>
            </a>
          </div>
        </aside>

        <main className="main">
          {!evRoot && (
            <div className="mtop">
              <a href={wpath(wid, 'beranda')} className="row nowrap" style={{ textDecoration: 'none', color: 'inherit', gap: 8 }}>
                <span className="logo" style={{ width: 34, height: 34, borderRadius: 12 }}><Icon name="rings" size={18} /></span>
                <b style={{ fontFamily: 'var(--serif)', fontSize: 17 }}>{wed.bride_name} &amp; {wed.groom_name}</b>
              </a>
              <SaveBadge />
            </div>
          )}
          <AnnouncementBar />
          <AccountBanner weddingActive={w.active} isOwner={w.isOwner} />
          <EvCtx.Provider value={evCtx}>
            <Suspense fallback={<div className="skel" style={{ height: 400 }} />}>
              <Page q={q} key={evRoot ? evRoot.id + pageKey : route.menu} />
            </Suspense>
          </EvCtx.Provider>
        </main>

        <nav className="bnav" aria-label="Menu HP">
          {['beranda', ...MOBILE].map(k => (
            <a key={k} href={mHref(k)} className={'bi' + (mOn(k) ? ' on' : '')}>
              <Icon name={k === 'beranda' ? 'home' : MENU_DEFS[k].icon} size={20} />{k === 'beranda' ? 'Beranda' : MENU_DEFS[k].label}
            </a>
          ))}
          <button type="button" className={'bi' + (!mOn('beranda') && !MOBILE.some(mOn) ? ' on' : '')} onClick={() => setMore(true)}><Icon name="more" size={20} />Lainnya</button>
        </nav>

        <Modal open={more} onClose={() => setMore(false)} title={curEv ? 'Menu ' + curEv.name : 'Menu lainnya'}>
          <nav className="nav sheet">
            {curEv && visibleMenus(curEv).filter(k => !MOBILE.includes(k)).map(k => (
              <a key={k} href={epath(wid, curEv.id, k)} className={evRoot && pageKey === k ? 'on' : ''}><Icon name={MENU_DEFS[k].icon} />{MENU_DEFS[k].label}</a>
            ))}
            {curEv && w.canEdit && <a href={epath(wid, curEv.id, 'atur')}><Icon name="edit" />Atur acara {curEv.name}</a>}
            {curEv && <a href={wpath(wid, 'live', { e: curEv.id })}><Icon name="live" />Mode hari H · {curEv.name}</a>}
            {curEv && <a href={wpath(wid, 'checkin', { e: curEv.id })}><Icon name="check" />Check-in tamu · {curEv.name}</a>}
            {w.canEdit && <button type="button" className="navbtn" onClick={() => { setMore(false); setAddEv(true); }}><Icon name="plus" />Tambah acara</button>}
            <a href={wpath(wid, 'pengaturan')}><Icon name="gear" />Pengaturan</a>
            <a href="#/pilih"><Icon name="users" />Ganti pernikahan</a>
            {account && account.is_admin ? <a href="#/admin"><Icon name="shield" />Pusat Kontrol</a> : <a href="#/upgrade"><Icon name="crown" />Paket & upgrade</a>}
          </nav>
          <div className="xs muted">Masuk sebagai {profile ? profile.display_name : ''}</div>
        </Modal>
        {addEv && <Suspense fallback={null}><AddEventModal onClose={() => setAddEv(false)} /></Suspense>}
      </div>
    </Bg>
  );
}
