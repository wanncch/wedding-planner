import React from 'react';
import { useW } from '../lib/store.jsx';

export default function SaveBadge() {
  const w = useW();
  if (!w || !w.data) return null;
  const busy = w.pending > 0;
  return (
    <span className={'savebadge' + (busy ? ' busy' : '')} title="Status penyimpanan">
      <i />{busy ? 'Menyimpan…' : 'Tersimpan'}
    </span>
  );
}
