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

**v4 · Per acara** (mockup `design-mockup/v4/`): sidebar disusun per ACARA, bukan per fitur.
- Atas: **Beranda** (dashboard gabungan semua acara: resume anggaran pria/wanita, per acara, minggu ini, beban kerja, tagihan 30 hari; saklar Semua/Punyaku; panel *Rincian pengeluaran*).
- Grup acara (accordion): **Lamaran** (bagian: Lamaran + Balasan lamaran) · **Akad & Resepsi** (acara utama, wajib, berisi Dokumen) · **Unduh mantu** · acara lain (Pengajian, Midodareni, …) lewat **+ Tambah acara**.
- Sub menu tiap acara (bisa disembunyikan/diurutkan/ditambah dari katalog lewat tombol pensil = **Atur acara**): Persiapan · Anggaran · Vendor · Seserahan · Tamu · Rundown · (Dokumen) · Catatan. "Undangan web" = *Segera*.
- Acara berbagian punya tab **[bagian] · [bagian] · Gabungan** di semua sub menu; pilihan tab diingat per acara (localStorage `wp-part-<id>`).
- Bawah: Pengaturan (Pernikahan · Acara · **Orang & pihak** · Anggota · Data & akun), kartu pasangan, Pusat Kontrol (admin).
- **Orang & pihak**: daftar orang (pihak pria/wanita/lainnya, bisa PIC, bisa penanggung, terhubung ke akun untuk Punyaku). Tugas & item anggaran **wajib PIC**; item anggaran **wajib Ditanggung oleh** (bisa **Patungan** dengan persen). Penanggung bawaan per acara/bagian.
- **Anggaran** = rekap acara: kelompok **Vendor** (otomatis dari menu Vendor) dan **Seserahan** (otomatis dari menu Seserahan) terkunci; kelompok lain diisi langsung.
- **Vendor**: papan Belum dipilih (slot) · Negosiasi · Deal · Lunas. Slot = `budget_items.source='vendor'`; kontak vendor (`vendors`) = buku kontak bersama semua acara.
- **Tamu**: buku tamu induk (`guests`, jenis undangan: Digital · Cetak · Tonjokan · Tanpa undangan) + undangan per acara (`guest_invites`: RSVP, pax, kirim WA, meja, check-in per acara).
- **Tahap persiapan** per acara bisa ditambah, diganti nama, dihapus (tugas dipindah), diurutkan lewat tombol **Atur tahap** di Persiapan › Per tahap, atau dibuat langsung dari form tugas. Disimpan di `events.stages` (kosong = bawaan per jenis acara, lihat `STAGE_DEFAULTS` di `events.js`).
- HP: menu bawah Beranda · Persiapan · Anggaran · Vendor · Lainnya; pemilih acara di atas halaman sub menu.
- Layar HP penuh per acara: **Mode hari H** `#/w/<id>/live?e=<acara|bagian>` dan **Check-in** `#/w/<id>/checkin?e=…`.

Komersial (v3):
- Akun baru otomatis **trial 14 hari**; habis → data hanya bisa dilihat (`can_edit` cek `wedding_active`).
- Paket di tabel `plans`: `trial`, `premium` (149rb, berlaku s/d hari H+30), `wo` (499rb, 365 hari, 10 pernikahan). Harga bisa diubah admin.
- Pelanggan upgrade di `#/upgrade`: QRIS / transfer + upload bukti → `payment_requests` (pending).
- **Pusat Kontrol** `#/admin` (khusus `platform_admins`): Ringkasan & pendapatan, Akun pelanggan (paket, masa berlaku, perpanjang, catat bayar, reset sandi, blokir, hapus), Pembayaran (setujui/tolak), Paket & harga, Pengumuman (pita di aplikasi pelanggan, per sasaran), Pengaturan bayar (QRIS, rekening, WA admin).

## Arsitektur
- **Frontend**: React 18 + Vite 5, SPA dengan hash router (`#/w/<id>/beranda`, `#/w/<id>/pengaturan`, `#/w/<id>/e/<acara>/<menu>` termasuk `atur`; menu lama `#/w/<id>/<menu>` diarahkan ke Akad & Resepsi; `#/pilih`, `#/baru`, `#/undangan/<token>`, `#/masuk`, `#/daftar`, `#/lupa`, `#/admin/<tab>`, `#/upgrade`). Folder `web/`.
- **Backend**: Supabase (Postgres + Auth + Storage + Realtime). Project ref `whpkypbmzkvzgnygpvpg` (Singapura). URL & publishable key ada di `web/src/lib/supabase.js` (aman untuk publik; jangan pernah taruh `service_role` di kode).
- **Hosting**: Cloudflare Pages project `wedding-planner-wanncch` → https://wedding-planner-wanncch.pages.dev. Auto-deploy setiap push ke `main` (root `web`, build `npm run build`, output `dist`, `NODE_VERSION=20`).
- **Email**: Custom SMTP Brevo (smtp-relay.brevo.com:587) diatur di Supabase › Auth › SMTP. Template email berbahasa Indonesia. Kunci SMTP hanya disimpan di Supabase, bukan di repo.

### File penting
- `web/src/lib/events.js` — acara/bagian (`topEvents`, `partsOf`, `scopeOf`, `familyIds`, `baseDate`), daftar sub menu (`MENU_DEFS`, `eventMenus`), orang & pihak, penanggung bawaan.
- `web/src/components/EventKit.jsx` — konteks acara (`useEv`: ev, scope.ids/target/part), `EventHeader` (judul + tab bagian + pemilih acara HP).
- `web/src/components/People.jsx` — `PersonSelect` (PIC/penanggung per pihak + tambah orang), `PayerField` (patungan), `PersonModal`.
- `web/src/components/Money.jsx` — detail item & pembayaran; `Rincian.jsx` — panel rincian pengeluaran.
- `web/src/pages/AturAcara.jsx` — Atur acara (detail, bagian, sub menu, katalog) + `AddEventModal`.
- `web/src/lib/store.jsx` — AuthProvider (session, profile, `account` dari RPC `my_account`), WeddingProvider (`fetchAll`, optimistic `add/save/del` + undo, realtime, `canEdit`).
- `web/src/lib/calc.js` — rumus: `costLines` (semua baris biaya acara: vendor, seserahan, item), `summarize` (per pihak/orang/untuk apa), `upcomingBills`, `taskDue/taskState` (dari tanggal acara/bagian), `periodsFor`, `invitesFor`, `readiness`. `format.js` — format Rupiah/tanggal. `files.js` — upload ke bucket `wedding-files` (referensi `sb:<path>`).
- `web/src/components/ui.jsx` — semua komponen UI + kamus ikon `P` (termasuk 24 ikon kategori `CAT_ICONS`, warna `CAT_COLORS` k1–k10).
- `web/src/components/Account.jsx` — PlanBadge, AccountBanner (trial/habis), AnnouncementBar, StoredImg.
- `web/src/pages/*` — satu file per menu; `Admin.jsx` Pusat Kontrol; `Upgrade.jsx`.
- `web/src/styles.css` — design system (token warna, `.g` glass, `.tile w1–w4`, `.cc k1–k10`, dll).

### Database (`supabase/migrations/`, urut)
`0001_schema` tabel · `0002_security` RLS & helper (`is_member`, `can_edit`, `is_owner`, storage policy per wedding) · `0003_templates` data template (dibuat `seed_data.py`) · `0004` cabut akses anon · `0005_fit_budget` `create_wedding` menyesuaikan anggaran · `0006_v3_commercial` ikon/warna kategori, plans, subscriptions, payment_requests, app_settings, admin_log, RPC admin · `0007_announcements` · `0008_v4_per_acara` (lihat di bawah) · `0009_tahap_jenis_undangan` (`events.stages`, jenis undangan tonjokan/tanpa, tahap template per acara).
`supabase/setup-database.sql` = gabungan semua (untuk project baru). **Semua migrasi 0001–0009 sudah terpasang di project live.**

**Model data v4 (0008):** `events` = acara (`parent_id` null) & bagian (`parent_id` = acara), kolom `color`, `icon`, `hidden`, `menus` (jsonb [{k,on}], kosong = bawaan), `payer_id`, `detail`; kind: lamaran/balasan/akad/unduh/lainnya. `people` (orang & pihak, `kind` bride/groom/fam_bride/fam_groom, `user_ids`). `tasks.event_id/pic_id` (deadline = tanggal acara/bagian − `offset_days`). `budget_items.pic_id/payer_id/shares/source/offer` (`source='vendor'` = slot vendor; `shares` = patungan). `gift_categories.event_id/pic_id/payer_id`. `reminders.event_id/pic_id`, `notes.event_id`. `guest_invites` (undangan per acara). RPC: `add_event`, `check_in_invite`; template per acara di `tpl_*.event_kind` (+ `tpl_catalog.is_vendor`). `create_wedding` menerima `p.events` = [{kind, date, location, payer, parts:[…]}].
Pemindahan data lama (sekali jalan di 0008): tugas lamaran → Lamaran, lainnya → Akad & Resepsi; anggaran ikut acaranya (tanpa acara → Akad & Resepsi); vendor & seserahan → Akad & Resepsi; tamu → buku induk + diundang ke Akad & Resepsi; PIC teks dicocokkan ke orang (tidak cocok → tampil "Pilih ulang").

Migrasi baru: buat file `0010_…sql`, jalankan di Supabase (SQL Editor / MCP Supabase / Management API), lalu tambahkan juga ke `setup-database.sql`.

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
node flow.js x desk   # 34 pemeriksaan alur v4 (juga: node flow.js x hp)
node v3.js            # admin, upgrade, kategori, trial habis
node ann.js           # pengumuman
node shots.js "beranda,lam/persiapan,akad/vendor,unduh/atur,pengaturan?tab=orang" desk   # screenshot ke tests/out/ (lam/akad/unduh = acara)
```
Kalau menambah tabel/RPC baru, tambahkan juga tiruannya di `tests/mock.js` (`createWedding`/`addEvent`/`seedTarget` meniru fungsi SQL; template di `tests/tpl.json`). Di mesin cloud: Playwright sudah terpasang global, jalankan dengan `PW_PATH=$(npm root -g)/playwright`. Selalu cek screenshot desktop (1440) dan HP (390).

## Deploy
`git push origin main` → Cloudflare Pages build otomatis (±1–2 menit). Cek hasil di https://wedding-planner-wanncch.pages.dev.

## Ide / pekerjaan berikutnya
- Domain sendiri (lebih profesional & email tidak masuk spam), lalu ganti pengirim email Brevo ke domain itu.
- Pembayaran otomatis (Midtrans/Xendit) menggantikan konfirmasi manual.
- Notifikasi email ke admin saat ada bukti bayar baru.
- Aktifkan "leaked password protection" bila Supabase naik ke paket berbayar.
