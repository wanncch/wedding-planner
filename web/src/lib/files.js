import { supabase, BUCKET, friendlyError } from './supabase.js';

const MAX = 10 * 1024 * 1024;          // batas file non-foto (PDF, dll.)
const MAX_RAW_PHOTO = 40 * 1024 * 1024; // foto mentah dari HP boleh besar karena akan dikompres
export const PHOTO_LIMIT = 700 * 1024;  // hasil foto maksimal 700 KB

const isPhoto = (f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(f.name || '');

/** Buka foto jadi gambar yang bisa digambar ke kanvas (ikut arah foto dari kamera). */
async function decode(file) {
  try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { /* coba cara lain */ }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

function encode(src, w, h, q) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);   // latar putih untuk PNG transparan
  g.drawImage(src, 0, 0, w, h);
  return new Promise(r => c.toBlob(r, 'image/jpeg', q));
}

/**
 * Kompres foto sampai maksimal 700 KB. Foto yang sudah kecil (dan bukan HEIC) tidak diubah.
 * Turunkan kualitas dulu, lalu ukuran, sampai muat. File selain foto dikembalikan apa adanya.
 */
export async function compressPhoto(file, limit = PHOTO_LIMIT) {
  if (!file || !isPhoto(file)) return file;
  // foto kecil berformat umum dibiarkan; HEIC/GIF/BMP selalu diubah ke JPG supaya bisa dibuka semua HP
  if (file.size <= limit && /^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  let src;
  try { src = await decode(file); } catch (e) {
    throw new Error('Foto ini tidak bisa dibuka untuk dikompres. Coba simpan ulang sebagai JPG atau PNG, lalu unggah lagi.');
  }
  const W = src.width || src.naturalWidth, H = src.height || src.naturalHeight;
  let dim = Math.min(2048, Math.max(W, H));
  let best = null;
  while (dim >= 320) {
    const s = dim / Math.max(W, H);
    const w = Math.max(1, Math.round(W * s)), h = Math.max(1, Math.round(H * s));
    for (const q of [0.86, 0.78, 0.7, 0.62, 0.54]) {
      const blob = await encode(src, w, h, q);
      if (!blob) continue;
      best = blob;
      if (blob.size <= limit) {
        return new File([blob], (file.name || 'foto').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
      }
    }
    dim = Math.round(dim * 0.78);
  }
  if (best && best.size <= limit) return new File([best], 'foto.jpg', { type: 'image/jpeg' });
  throw new Error('Foto terlalu besar untuk dikompres sampai 700 KB. Coba potong atau perkecil fotonya dulu.');
}

export function uploadFile(wid, folder, file, onInfo) {
  return uploadPath(wid + '/' + folder, file, onInfo);
}

/** Unggah ke folder bebas di bucket, mis. payments/<uid> atau public. */
export async function uploadPath(dir, file, onInfo) {
  if (!file) return null;
  const photo = isPhoto(file);
  if (file.size > (photo ? MAX_RAW_PHOTO : MAX)) throw new Error(photo ? 'Foto terlalu besar (maksimal 40 MB sebelum dikompres).' : 'Ukuran file maksimal 10 MB.');
  const f = await compressPhoto(file);
  if (onInfo && f !== file) onInfo({ before: file.size, after: f.size });
  const safe = f.name.toLowerCase().replace(/[^a-z0-9.\-_]+/g, '-').slice(-60);
  const path = dir + '/' + Date.now() + '-' + safe;
  const { error } = await supabase.storage.from(BUCKET).upload(path, f, { upsert: false, contentType: f.type || 'application/octet-stream' });
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
