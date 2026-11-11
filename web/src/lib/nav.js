export function go(path) { window.location.hash = '#/' + String(path).replace(/^\/+/, ''); }
const qs = (q) => (q && Object.keys(q).length ? '?' + new URLSearchParams(q).toString() : '');
export const wpath = (wid, menu, q) => '#/w/' + wid + '/' + menu + qs(q);
/** Halaman sub menu sebuah acara: #/w/<wid>/e/<acara>/<menu> */
export const epath = (wid, evId, menu, q) => '#/w/' + wid + '/e/' + evId + '/' + menu + qs(q);
import { supabase } from './supabase.js';
export async function signOut() {
  try { Object.keys(localStorage).filter(k => k.startsWith('wp-')).forEach(k => localStorage.removeItem(k)); } catch (e) { /* abaikan */ }
  await supabase.auth.signOut();
  go('masuk');
}
