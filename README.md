# Wedding Planner by Wanncch — v2

Web app perencanaan pernikahan untuk banyak pasangan. Satu akun bisa punya beberapa pernikahan,
dan setiap pernikahan bisa dibagikan ke pasangan, keluarga, atau WO.

- **Tampilan**: React + Vite, di-hosting di **Cloudflare Pages** (statis, gratis, cepat).
- **Database & login**: **Supabase** (Postgres + Auth + Storage). Project: `wedding-planner` (Singapura).
- Semua input lewat web. Tidak ada lagi Google Sheets / Apps Script.

## Menu
Beranda · Persiapan · Anggaran · Vendor · Seserahan (Seserahan & Mahar, Hantaran Balasan, Bawaan Hari H) ·
Tamu · Rundown · Dokumen · Catatan · Pengaturan, plus layar HP **Mode hari H** (rundown live) dan **Mode check-in tamu**.

## Struktur
```
supabase/migrations/   SQL skema, keamanan (RLS), template, fungsi
supabase/seed_data.py  sumber data template (tugas, katalog harga, seserahan, dokumen)
web/                   aplikasi web (Vite + React)
```

## Keamanan data
- Row Level Security di semua tabel: orang hanya bisa membaca pernikahan tempat ia menjadi anggota.
- Peran: **Pemilik** (semua + undang anggota), **Bisa edit**, **Lihat saja** (tetap bisa check-in tamu di hari H).
- File (foto seserahan, scan dokumen, bukti transfer) di bucket privat `wedding-files`, dibuka dengan link sementara.
- Kunci `sb_publishable_…` di `web/src/lib/supabase.js` memang publik; jangan pernah memasukkan `service_role` ke kode web.

## Jalankan lokal
```bash
cd web
npm install
npm run dev
```

## Deploy ke Cloudflare Pages (lewat GitHub)
1. Push repo ini ke GitHub.
2. Cloudflare Dashboard › Workers & Pages › Create › Pages › Connect to Git › pilih repo.
3. Build settings:
   - Framework preset: **Vite** (atau None)
   - Root directory: `web`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION` = `20`
4. Save and Deploy. Setiap push ke `main` otomatis deploy ulang.

## Setelan Supabase (sekali saja)
Authentication › URL Configuration:
- **Site URL**: alamat Cloudflare Pages, mis. `https://wedding-planner.pages.dev`
- **Redirect URLs**: tambahkan `https://wedding-planner.pages.dev/**` (dan domain sendiri bila ada)

Authentication › Providers › Email:
- Email bawaan Supabase hanya bisa mengirim ke anggota tim project. Untuk layanan publik pilih salah satu:
  - matikan **Confirm email** (pengguna langsung bisa masuk setelah daftar), atau
  - pasang **Custom SMTP** (mis. Resend / Brevo / Gmail app password) di Authentication › Emails › SMTP Settings.
- Fitur **lupa kata sandi** butuh email, jadi Custom SMTP disarankan sebelum dibagikan luas.

## Batas paket gratis (perkiraan)
Supabase Free: database 500 MB, storage 1 GB, project berhenti sementara bila 7 hari tanpa aktivitas.
Cloudflare Pages Free: 500 build/bulan, bandwidth tanpa batas.
