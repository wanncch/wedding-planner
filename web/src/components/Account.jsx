import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/store.jsx';
import { fileUrl } from '../lib/files.js';
import { Icon } from './ui.jsx';

/** Label paket & status langganan. */
export function planInfo(a) {
  if (!a) return { cls: 'pl-trial', label: '–' };
  if (a.status === 'blocked') return { cls: 'pl-ban', label: 'Diblokir' };
  if (a.active === false) return { cls: 'pl-exp', label: a.status === 'trial' ? 'Trial habis' : 'Kedaluwarsa' };
  if (a.status === 'trial' || a.plan_id === 'trial') return { cls: 'pl-trial', label: 'Trial' };
  if (a.plan_id === 'wo') return { cls: 'pl-wo', label: '★ Vendor / WO' };
  return { cls: 'pl-pro', label: '★ Premium' };
}

export function PlanBadge({ a }) {
  const p = planInfo(a);
  return <span className={'plan ' + p.cls}>{p.label}</span>;
}

/** Pita info di atas halaman: sisa trial, masa habis, atau menunggu konfirmasi. */
export function AccountBanner({ weddingActive = true, isOwner = true }) {
  const { account } = useAuth();
  if (!account || account.unknown || account.is_admin) {
    if (!weddingActive && !isOwner) return <ReadOnlyOwner />;
    return null;
  }
  if (!account.active) {
    return (
      <div className="banner exp" role="status">
        <Icon name="lock" size={20} />
        <span className="grow">{account.status === 'blocked' ? 'Akun ini diblokir. Hubungi admin.' : <><b>Masa {account.status === 'trial' ? 'trial' : 'langganan'} sudah habis.</b> Data tetap aman, tapi sekarang hanya bisa dilihat.</>}
          {account.pending > 0 && ' Pembayaranmu sedang dicek admin.'}</span>
        {account.status !== 'blocked' && <a className="btn sm" href="#/upgrade"><Icon name="crown" size={15} />Upgrade</a>}
      </div>
    );
  }
  if (!weddingActive && !isOwner) return <ReadOnlyOwner />;
  if (account.status === 'trial' && account.days_left !== null && account.days_left !== undefined) {
    return (
      <div className="banner trial" role="status">
        <Icon name="sparkle" size={20} />
        <span className="grow"><b>Trial · sisa {account.days_left} hari.</b> {account.pending > 0 ? 'Pembayaranmu sedang dicek admin.' : 'Upgrade ke Premium supaya tetap bisa mengubah data setelah trial.'}</span>
        {!account.pending && <a className="btn sm" href="#/upgrade"><Icon name="crown" size={15} />Upgrade</a>}
      </div>
    );
  }
  return null;
}

function ReadOnlyOwner() {
  return (
    <div className="banner exp" role="status">
      <Icon name="lock" size={20} />
      <span className="grow"><b>Hanya bisa dilihat.</b> Langganan pemilik pernikahan ini sudah habis. Minta pemilik memperpanjang supaya bisa mengubah data lagi.</span>
    </div>
  );
}

/** Gambar dari storage (sb:…) atau link biasa. */
export function StoredImg({ src, alt, className, style }) {
  const [u, setU] = useState('');
  useEffect(() => {
    let alive = true;
    setU('');
    if (src) fileUrl(src).then(x => { if (alive) setU(x); }).catch(() => {});
    return () => { alive = false; };
  }, [src]);
  if (!u) return null;
  return <img src={u} alt={alt || ''} className={className} style={style} />;
}

/* ---------------- Pengumuman dari admin ---------------- */
let annCache = null;
const DKEY = 'wp-ann-tutup';
function readDismissed() { try { return JSON.parse(localStorage.getItem(DKEY) || '[]'); } catch (e) { return []; } }

function audienceOk(a, acc) {
  if (a.audience === 'all') return true;
  if (!acc || acc.unknown) return false;
  if (acc.is_admin) return true;
  if (a.audience === 'expired') return !acc.active;
  if (a.audience === 'trial') return acc.active && acc.status === 'trial';
  if (a.audience === 'paid') return acc.active && acc.status === 'active';
  return false;
}

export function AnnouncementBar() {
  const { account, session } = useAuth();
  const [list, setList] = useState(annCache);
  const [hidden, setHidden] = useState(readDismissed);
  useEffect(() => {
    if (!session) return;
    if (annCache && annCache.uid === session.user.id && Date.now() - annCache.at < 300000) { setList(annCache); return; }
    supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(10).then(({ data }) => {
      annCache = { uid: session.user.id, at: Date.now(), rows: data || [] };
      setList(annCache);
    });
  }, [session && session.user.id]);
  if (!list) return null;
  const now = Date.now();
  const rows = list.rows.filter(a => !hidden.includes(a.id) && new Date(a.starts_at).getTime() <= now && (!a.ends_at || new Date(a.ends_at).getTime() > now) && audienceOk(a, account)).slice(0, 2);
  if (!rows.length) return null;
  const close = (id) => { const n = [...hidden, id].slice(-50); setHidden(n); try { localStorage.setItem(DKEY, JSON.stringify(n)); } catch (e) { /* abaikan */ } };
  return rows.map(a => (
    <div key={a.id} className={'banner ann ann-' + a.level} role="status">
      <Icon name="megaphone" size={20} />
      <span className="grow"><b>{a.title}</b>{a.body ? <span style={{ display: 'block', fontWeight: 500, whiteSpace: 'pre-line' }}>{a.body}</span> : null}</span>
      {a.link_url && <a className="btn2 sm" href={a.link_url} target={a.link_url.startsWith('#') ? undefined : '_blank'} rel="noreferrer">{a.link_label || 'Buka'}</a>}
      <button type="button" className="x" style={{ width: 30, height: 30, background: 'rgba(255,255,255,.5)' }} onClick={() => close(a.id)} aria-label="Tutup pengumuman"><Icon name="x" size={15} /></button>
    </div>
  ));
}
