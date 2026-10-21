import { createClient } from '@supabase/supabase-js';

// Kunci publishable memang boleh ada di browser: semua data dilindungi Row Level Security.
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://yzpdswuoskecnedanzam.supabase.co';
const KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_FujLHngzQ5VHozSOv1ia2Q_U50bvJlW';

export const supabase = window.__MOCK_SUPABASE__ || createClient(URL, KEY, {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

export const BUCKET = 'wedding-files';

/** Ubah pesan error Supabase/Postgres jadi kalimat yang dimengerti pengguna. */
export function friendlyError(err) {
  const m = String((err && (err.message || err.error_description)) || err || '');
  if (/Invalid login credentials/i.test(m)) return 'Email atau kata sandi salah.';
  if (/Email not confirmed/i.test(m)) return 'Email belum dikonfirmasi. Cek kotak masuk (atau folder spam) lalu klik link konfirmasi.';
  if (/User already registered/i.test(m)) return 'Email ini sudah terdaftar. Silakan masuk.';
  if (/Password should be at least/i.test(m)) return 'Kata sandi minimal 8 karakter.';
  if (/rate limit|too many/i.test(m)) return 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.';
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Koneksi internet terputus. Perubahan belum tersimpan, coba lagi.';
  if (/row-level security|permission denied/i.test(m)) return 'Kamu hanya punya akses lihat di pernikahan ini.';
  if (/JWT expired|session/i.test(m)) return 'Sesi berakhir. Silakan masuk lagi.';
  if (/violates check constraint/i.test(m)) return 'Ada isian yang tidak valid. Periksa angka dan pilihan.';
  if (/violates foreign key/i.test(m)) return 'Data masih dipakai di tempat lain, jadi belum bisa dihapus.';
  return m.replace(/^.*?ERROR:\s*/, '') || 'Terjadi kesalahan. Coba lagi.';
}

/** Coba ulang otomatis untuk gangguan jaringan sesaat. */
export async function withRetry(fn, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fn();
      if (res && res.error) {
        const msg = String(res.error.message || '');
        if (/Failed to fetch|NetworkError|timeout|502|503|504/i.test(msg) && i < tries - 1) {
          last = res.error; await new Promise(r => setTimeout(r, 600 * (i + 1))); continue;
        }
        throw res.error;
      }
      return res;
    } catch (e) {
      last = e;
      if (!/Failed to fetch|NetworkError|timeout/i.test(String(e && e.message)) || i === tries - 1) throw e;
      await new Promise(r => setTimeout(r, 600 * (i + 1)));
    }
  }
  throw last;
}
