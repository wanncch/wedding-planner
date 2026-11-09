# Wedding Planner by Wanncch — panduan untuk Claude

File ini dibaca otomatis oleh Claude saat membuka repo ini. Isinya: apa proyek ini, cara kerja yang sudah disepakati dengan pemilik, arsitektur, cara uji, cara deploy, dan pekerjaan berikutnya.

## Aturan kerja dengan pemilik (WAJIB)
- Selalu pakai **Bahasa Indonesia**, santai tapi jelas. Pemilik bukan programmer: jelaskan hasil, bukan detail kode.
- **Mockup dulu, baru kode.** Setiap fitur/tampilan baru: buat mockup (HTML statis yang bisa dilihat) → pemilik review & setuju → baru dibangun. Jangan langsung menulis kode untuk perubahan tampilan tanpa persetujuan. Contoh mockup lama ada di `design-mockup/`.
- Gaya visual yang disukai: **glass (kaca buram) yang hidup dan berwarna lembut** — orb warna di latar, kartu transparan dengan blur, kartu ringkasan berwarna dengan ikon. Jangan jadi flat/pucat.
- Semua input lewat halaman web. **Tidak ada** edit lewat spreadsheet, tidak pakai Apps Script (dulu terlalu lambat).
- Kalau pemilik bilang "lanjutkan, aku tinggal", kerjakan sampai selesai, uji, deploy, lalu laporkan singkat.
- Jangan pernah mengetik kata sandi / API key / SMTP key ke form. Minta pemilik yang mengisi.

## Ringkasan produk
Web app perencanaan pernikahan untuk banyak pasangan (dijual komersial). Satu akun bisa punya beberapa pernikahan; tiap pernikahan bisa dibagikan ke pasangan, keluarga, atau WO dengan peran Pemilik / Bisa edit / Lihat saja.

Menu: Beranda · Persiapan (tugas per periode) · Anggaran (+ simulasi, katalog harga, pembayaran) · Vendor (kanban) · Seserahan (Seserahan & Mahar, Hantaran Balasan, Bawaan Hari H; kartu kategori berikon & berwarna) · Tamu (import Excel, kirim WA) · Rundown · Dokumen (KUA dll) · Catatan · Pengaturan. Layar HP penuh: **Mode hari H** (`live`) dan **Check-in tamu** (`checkin`).

Komersial (v3):
- Akun baru otomatis **trial 14 hari**; habis → data hanya bisa dilihat (`can_edit` cek `wedding_active`).
- Paket di tabel `plans`: `trial`, `premium` (149rb, berlaku s/d hari H+30), `wo` (499rb, 365 hari, 10 pernikahan). Harga bisa diubah admin.
- Pelanggan upgrade di `#/upgrade`: QRIS / transfer + upload bukti → `payment_requests` (pending).
- **Pusat Kontrol** `#/admin` (khusus `platform_admins`): Ringkasan & pendapatan, Akun pelanggan (paket, masa berlaku, perpanjang, catat bayar, reset sandi, blokir, hapus), Pembayaran (setujui/tolak), Paket & harga, Pengumuman (pita di aplikasi pelanggan, per sasaran), Pengaturan bayar (QRIS, rekening, WA admin).

## Arsitektur
- **Frontend**: React 18 + Vite 5, SPA dengan hash router (`#/w/<id>/<menu>`, `#/pilih`, `#/baru`, `#/undangan/<token>`, `#/masuk`, `#/daftar`, `#/lupa`, `#/admin/<tab>`, `#/upgrade`). Folder `web/`.
- **Backend**: Supabase (Postgres + Auth + Storage + Realtime). Project ref `whpkypbmzkvzgnygpvpg` (Singapura). URL & publishable key ada di `web/src/lib/supabase.js` (aman untuk publik; jangan pernah taruh `service_role` di kode).
- **Hosting**: Cloudflare Pages project `wedding-planner-wanncch` → https://wedding-planner-wanncch.pages.dev. Auto-deploy setiap push ke `main` (root `web`, build `npm run build`, output `dist`, `NODE_VERSION=20`).
- **Email**: Custom SMTP Brevo (smtp-relay.brevo.com:587) diatur di Supabase › Auth › SMTP. Template email berbahasa Indonesia. Kunci SMTP hanya disimpan di Supabase, bukan di repo.

### File penting
- `web/src/lib/store.jsx` — AuthProvider (session, profile, `account` dari RPC `my_account`), WeddingProvider (`fetchAll`, optimistic `add/save/del` + undo, realtime, `canEdit`).
- `web/src/lib/calc.js` — rumus (budgetSummary, readiness, taskDue, dll). `format.js` — format Rupiah/tanggal. `files.js` — upload ke bucket `wedding-files` (referensi `sb:<path>`).
- `web/src/components/ui.jsx` — semua komponen UI + kamus ikon `P` (termasuk 24 ikon kategori `CAT_ICONS`, warna `CAT_COLORS` k1–k10).
- `web/src/components/Account.jsx` — PlanBadge, AccountBanner (trial/habis), AnnouncementBar, StoredImg.
- `web/src/pages/*` — satu file per menu; `Admin.jsx` Pusat Kontrol; `Upgrade.jsx`.
- `web/src/styles.css` — design system (token warna, `.g` glass, `.tile w1–w4`, `.cc k1–k10`, dll).

### Database (`supabase/migrations/`, urut)
`0001_schema` tabel · `0002_security` RLS & helper (`is_member`, `can_edit`, `is_owner`, storage policy per wedding) · `0003_templates` data template (dibuat `seed_data.py`) · `0004` cabut akses anon · `0005_fit_budget` `create_wedding` menyesuaikan anggaran · `0006_v3_commercial` ikon/warna kategori, plans, subscriptions, payment_requests, app_settings, admin_log, RPC admin · `0007_announcements`.
`supabase/setup-database.sql` = gabungan semua (untuk project baru). **Semua migrasi 0001–0007 sudah terpasang di project live.**
Migrasi baru: buat file `0008_…sql`, jalankan di Supabase (SQL Editor / MCP Supabase / Management API), lalu tambahkan juga ke `setup-database.sql`.

Menambah admin:
```sql
insert into public.platform_admins (user_id) select id from auth.users where email = '<email>';
update public.subscriptions set plan_id='wo', status='active', valid_until=null where user_id = (select id from auth.users where email = '<email>');
```

## Uji
Folder `tests/` memakai Supabase tiruan (`mock.js`, data demo pernikahan `w-demo`) + Playwright.
```bash
cd web && npm install && npm run build && npx vite preview --port 4173 &
cd ../tests && npm install && npx playwright install chromium
node flow.js x desk   # 18 alur utama
node v3.js            # admin, upgrade, kategori, trial habis
node ann.js           # pengumuman
node shots.js beranda,anggaran desk   # screenshot ke tests/out/
```
Kalau menambah tabel/RPC baru, tambahkan juga tiruannya di `tests/mock.js`. Selalu cek screenshot desktop (1440) dan HP (390).

## Deploy
`git push origin main` → Cloudflare Pages build otomatis (±1–2 menit). Cek hasil di https://wedding-planner-wanncch.pages.dev.

## Ide / pekerjaan berikutnya
- Domain sendiri (lebih profesional & email tidak masuk spam), lalu ganti pengirim email Brevo ke domain itu.
- Pembayaran otomatis (Midtrans/Xendit) menggantikan konfirmasi manual.
- Notifikasi email ke admin saat ada bukti bayar baru.
- Aktifkan "leaked password protection" bila Supabase naik ke paket berbayar.
