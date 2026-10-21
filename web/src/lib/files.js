import { supabase, BUCKET, friendlyError } from './supabase.js';

const MAX = 10 * 1024 * 1024;

/** Kecilkan foto besar sebelum diunggah supaya hemat kuota & cepat. */
async function shrink(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 600 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  } catch (e) { return file; }
}

export async function uploadFile(wid, folder, file) {
  if (!file) return null;
  if (file.size > MAX) throw new Error('Ukuran file maksimal 10 MB.');
  const f = await shrink(file);
  const safe = f.name.toLowerCase().replace(/[^a-z0-9.\-_]+/g, '-').slice(-60);
  const path = wid + '/' + folder + '/' + Date.now() + '-' + safe;
  const { error } = await supabase.storage.from(BUCKET).upload(path, f, { upsert: false, contentType: f.type });
  if (error) throw new Error(friendlyError(error));
  return 'sb:' + path;
}

const urlCache = {};
export async function fileUrl(ref) {
  if (!ref) return '';
  if (!ref.startsWith('sb:')) return ref;
  const path = ref.slice(3);
  const c = urlCache[path];
  if (c && c.exp > Date.now()) return c.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) throw new Error(friendlyError(error));
  urlCache[path] = { url: data.signedUrl, exp: Date.now() + 3500 * 1000 };
  return data.signedUrl;
}

export async function openFile(ref) {
  const win = window.open('', '_blank');
  try {
    const u = await fileUrl(ref);
    if (win) win.location.href = u; else window.location.href = u;
  } catch (e) {
    if (win) win.close();
    alert(e.message);
  }
}

export const fileName = (ref) => (ref ? (ref.startsWith('sb:') ? ref.split('/').pop().replace(/^\d+-/, '') : ref.replace(/^https?:\/\/(www\.)?/, '').slice(0, 32)) : '');
