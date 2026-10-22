import React, { useEffect, useState } from 'react';
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
