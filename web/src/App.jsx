import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useAuth, WeddingProvider, useW } from './lib/store.jsx';
import { supabase } from './lib/supabase.js';
import { Icon, Spinner, Avatar, Modal } from './components/ui.jsx';
import SaveBadge from './components/SaveBadge.jsx';
import { taskState } from './lib/calc.js';
import { go } from './lib/nav.js';
import AuthPage, { ResetPassword } from './pages/Auth.jsx';
import Workspaces, { InviteAccept } from './pages/Workspaces.jsx';
import { AccountBanner } from './components/Account.jsx';

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
const Admin = lazy(() => import('./pages/Admin.jsx'));
const Upgrade = lazy(() => import('./pages/Upgrade.jsx'));

export const MENUS = [
  { key: 'beranda', label: 'Beranda', icon: 'home', comp: Beranda },
  { key: 'persiapan', label: 'Persiapan', icon: 'list', comp: Persiapan },
  { key: 'anggaran', label: 'Anggaran', icon: 'wallet', comp: Anggaran },
  { key: 'vendor', label: 'Vendor', icon: 'store', comp: Vendor },
  { key: 'seserahan', label: 'Seserahan', icon: 'gift', comp: Seserahan },
  { key: 'tamu', label: 'Tamu', icon: 'users', comp: Tamu },
  { key: 'rundown', label: 'Rundown', icon: 'clock', comp: Rundown },
  { key: 'dokumen', label: 'Dokumen', icon: 'file', comp: Dokumen },
  { key: 'catatan', label: 'Catatan', icon: 'note', comp: Catatan },
  { key: 'pengaturan', label: 'Pengaturan', icon: 'gear', comp: Pengaturan },
];
const MOBILE = ['beranda', 'persiapan', 'anggaran', 'seserahan'];
const FULLSCREEN = { live: RundownLive, checkin: Checkin };

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
    const menu = parts[2] || 'beranda';
    try { localStorage.setItem('wp-current', parts[1]); } catch (e) { /* abaikan */ }
    return (
      <WeddingProvider wid={parts[1]} key={parts[1]}>
        <Shell menu={menu} q={q} />
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

function Shell({ menu, q }) {
  const w = useW();
  const [more, setMore] = useState(false);
  const { profile, account } = useAuth();

  useEffect(() => { setMore(false); }, [menu]);

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

  const { data, wid } = w;
  const wed = data.wedding;
  const base = '#/w/' + wid + '/';
  const late = data.tasks.filter(t => taskState(t, wed).key === 'telat').length;

  if (FULLSCREEN[menu]) {
    const C = FULLSCREEN[menu];
    return <Bg><Suspense fallback={<Spinner />}><C q={q} /></Suspense></Bg>;
  }
  const M = MENUS.find(m => m.key === menu) || MENUS[0];
  const Page = M.comp;

  return (
    <Bg>
      <div className="app">
        <aside className="side">
          <div className="brand"><span className="logo"><Icon name="rings" size={22} /></span><div><div className="bn">Wedding Planner</div><div className="by">by Wanncch</div></div></div>
          <nav className="nav" aria-label="Menu utama">
            {MENUS.map(m => (
              <a key={m.key} href={base + m.key} className={m.key === M.key ? 'on' : ''} aria-current={m.key === M.key ? 'page' : undefined}>
                <Icon name={m.icon} />{m.label}{m.key === 'persiapan' && late > 0 && <span className="nb">{late}</span>}
              </a>
            ))}
          </nav>
          {account && account.is_admin && <a className="btn2 sm" href="#/admin" style={{ margin: '0 8px' }}><Icon name="shield" size={15} />Pusat Kontrol</a>}
          <a className="couple" href="#/pilih" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className="avs"><Avatar name={wed.bride_name} /><Avatar name={wed.groom_name} /></span>
            <span style={{ minWidth: 0 }}><b className="ell" style={{ display: 'block' }}>{wed.bride_name} &amp; {wed.groom_name}</b><span className="muted">Ganti pernikahan</span></span>
          </a>
        </aside>

        <main className="main">
          <div className="mtop">
            <a href={base + 'beranda'} className="row nowrap" style={{ textDecoration: 'none', color: 'inherit', gap: 8 }}>
              <span className="logo" style={{ width: 34, height: 34, borderRadius: 12 }}><Icon name="rings" size={18} /></span>
              <b style={{ fontFamily: 'var(--serif)', fontSize: 17 }}>{wed.bride_name} &amp; {wed.groom_name}</b>
            </a>
            <SaveBadge />
          </div>
          <AccountBanner weddingActive={w.active} isOwner={w.isOwner} />
          <Suspense fallback={<div className="skel" style={{ height: 400 }} />}>
            <Page q={q} />
          </Suspense>
        </main>

        <nav className="bnav" aria-label="Menu HP">
          {MOBILE.map(k => {
            const m = MENUS.find(x => x.key === k);
            return (
              <a key={k} href={base + k} className={'bi' + (M.key === k ? ' on' : '')}>
                <Icon name={m.icon} size={20} />{m.label}{k === 'persiapan' && late > 0 && <span className="nb">{late}</span>}
              </a>
            );
          })}
          <button type="button" className={'bi' + (!MOBILE.includes(M.key) ? ' on' : '')} onClick={() => setMore(true)}><Icon name="more" size={20} />Lainnya</button>
        </nav>

        <Modal open={more} onClose={() => setMore(false)} title="Menu lainnya">
          <nav className="nav sheet">
            {MENUS.filter(m => !MOBILE.includes(m.key)).map(m => (
              <a key={m.key} href={base + m.key} className={m.key === M.key ? 'on' : ''}><Icon name={m.icon} />{m.label}</a>
            ))}
            <a href={base + 'live'}><Icon name="live" />Mode hari H · rundown</a>
            <a href={base + 'checkin'}><Icon name="check" />Mode check-in tamu</a>
            <a href="#/pilih"><Icon name="users" />Ganti pernikahan</a>
            {account && account.is_admin ? <a href="#/admin"><Icon name="shield" />Pusat Kontrol</a> : <a href="#/upgrade"><Icon name="crown" />Paket & upgrade</a>}
          </nav>
          <div className="xs muted">Masuk sebagai {profile ? profile.display_name : ''}</div>
        </Modal>
      </div>
    </Bg>
  );
}
