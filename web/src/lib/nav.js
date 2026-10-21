export function go(path) { window.location.hash = '#/' + String(path).replace(/^\/+/, ''); }
export const wpath = (wid, menu, q) => '#/w/' + wid + '/' + menu + (q ? '?' + new URLSearchParams(q).toString() : '');
import { supabase } from './supabase.js';
export async function signOut() {
  try { Object.keys(localStorage).filter(k => k.startsWith('wp-')).forEach(k => localStorage.removeItem(k)); } catch (e) { /* abaikan */ }
  await supabase.auth.signOut();
  go('masuk');
}
