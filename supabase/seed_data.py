"""Membuat supabase/migrations/0003_templates.sql dari data template di bawah.
Biaya = estimasi indikatif (Rupiah) per satuan; pengguna menyesuaikan dengan harga setempat.
Jalankan: python3 supabase/seed_data.py
"""
import os

CATS = [
    ('Tempat & dekorasi', 'biasa'), ('Konsumsi', 'biasa'), ('MUA & busana', 'biasa'),
    ('Dokumentasi', 'biasa'), ('WO & acara', 'biasa'), ('Undangan & souvenir', 'biasa'),
    ('Administrasi', 'biasa'), ('Keluarga & transportasi', 'biasa'), ('Lamaran', 'biasa'),
    ('Mahar & seserahan', 'seserahan'), ('Bulan madu & lain-lain', 'biasa'),
]

# kode, kategori, nama, detail, satuan, min, std, prem, skala default, agama, acara
CATALOG = [
    ('ADM-01', 'Administrasi', 'Formulir N1–N4 dari kelurahan', 'Pengantar RT/RW lalu formulir nikah di kelurahan/desa domisili.', 'paket', 0, 50000, 100000, 'smp', 'islam', None),
    ('ADM-02', 'Administrasi', 'Biaya nikah di luar KUA (PNBP)', 'Rp600.000 bila akad di luar kantor KUA atau di luar jam kerja. Gratis di kantor KUA pada jam kerja.', 'paket', 0, 600000, 600000, 'mp', 'islam', 'akad'),
    ('ADM-03', 'Administrasi', 'Pemeriksaan kesehatan pranikah', 'Surat keterangan sehat / imunisasi TT dari puskesmas bila diminta daerah.', 'paket', 0, 150000, 1500000, 'smp', 'semua', None),
    ('ADM-04', 'Administrasi', 'Dokumen identitas, pas foto & fotokopi', 'KTP, KK, akta kelahiran, pas foto latar biru, legalisir.', 'paket', 50000, 100000, 200000, 'smp', 'semua', None),
    ('ADM-05', 'Administrasi', 'Surat keterangan pemuka agama & kursus pranikah', 'Dari rumah ibadah tempat pemberkatan.', 'paket', 0, 500000, 2500000, 'smp', 'lainnya', 'akad'),
    ('ADM-06', 'Administrasi', 'Pencatatan perkawinan Disdukcapil', 'Akta perkawinan & KK baru.', 'paket', 0, 0, 300000, 'smp', 'lainnya', None),
    ('VEN-01', 'Tempat & dekorasi', 'Sewa gedung / venue resepsi', 'Cek kapasitas, jam pakai, dan vendor rekanan wajib.', 'paket', 3000000, 15000000, 60000000, 'mp', 'semua', 'resepsi'),
    ('VEN-02', 'Tempat & dekorasi', 'Tenda, kursi & perlengkapan (acara di rumah)', 'Tenda, kursi, meja, alat makan.', 'paket', 3000000, 8000000, 20000000, 's', 'semua', 'resepsi'),
    ('VEN-03', 'Tempat & dekorasi', 'Lokasi akad / pemberkatan', 'Masjid, KUA, gereja, rumah, atau venue yang sama.', 'paket', 0, 1000000, 5000000, 'smp', 'semua', 'akad'),
    ('DEC-01', 'Tempat & dekorasi', 'Dekorasi pelaminan', 'Pelaminan, backdrop, karpet, gate masuk sesuai tema.', 'paket', 3000000, 12000000, 50000000, 'smp', 'semua', 'resepsi'),
    ('DEC-02', 'Tempat & dekorasi', 'Dekorasi akad / pemberkatan', 'Meja akad, bunga, backdrop kecil.', 'paket', 1000000, 4000000, 15000000, 'mp', 'semua', 'akad'),
    ('DEC-03', 'Tempat & dekorasi', 'Bunga & meja penerima tamu', 'Rangkaian bunga, meja tamu, papan nama.', 'paket', 500000, 3000000, 12000000, 'mp', 'semua', 'resepsi'),
    ('DEC-04', 'Tempat & dekorasi', 'Lighting acara', 'Lampu dekor dan panggung.', 'paket', 0, 3000000, 15000000, 'p', 'semua', 'resepsi'),
    ('DEC-05', 'Tempat & dekorasi', 'Photobooth', 'Area foto + cetak instan.', 'paket', 1000000, 2500000, 6000000, 'p', 'semua', 'resepsi'),
    ('CAT-01', 'Konsumsi', 'Catering prasmanan', 'Porsi = undangan × porsi per undangan.', 'porsi', 25000, 50000, 110000, 'smp', 'semua', 'resepsi'),
    ('CAT-02', 'Konsumsi', 'Gubukan / food stall', 'Sate, bakso, dimsum, kambing guling, dan lain-lain.', 'paket', 2000000, 6000000, 20000000, 'mp', 'semua', 'resepsi'),
    ('CAT-03', 'Konsumsi', 'Konsumsi akad, keluarga & panitia', 'Snack dan makan untuk keluarga inti, panitia, vendor.', 'paket', 1000000, 3000000, 8000000, 'smp', 'semua', 'akad'),
    ('CAT-04', 'Konsumsi', 'Kue pernikahan', 'Wedding cake atau kue simbolis.', 'paket', 500000, 2000000, 8000000, 'p', 'semua', 'resepsi'),
    ('CAT-05', 'Konsumsi', 'Snack bingkisan & air mineral', 'Untuk tamu yang pulang / tamu akad.', 'undangan', 8000, 12000, 20000, 'mp', 'semua', 'resepsi'),
    ('BG-01', 'MUA & busana', 'Busana akad / pemberkatan', 'Kedua mempelai, sewa atau jahit.', 'paket', 1500000, 5000000, 25000000, 'smp', 'semua', 'akad'),
    ('BG-02', 'MUA & busana', 'Busana resepsi', 'Kedua mempelai, bisa lebih dari satu sesi.', 'paket', 1500000, 6000000, 30000000, 'smp', 'semua', 'resepsi'),
    ('BG-03', 'MUA & busana', 'Rias akad & resepsi', 'Termasuk hijab do atau paes adat.', 'paket', 1500000, 5000000, 20000000, 'smp', 'semua', None),
    ('BG-04', 'MUA & busana', 'Rias keluarga inti', 'Ibu, saudara, dan pendamping.', 'paket', 500000, 2000000, 6000000, 'mp', 'semua', None),
    ('BG-05', 'MUA & busana', 'Cincin nikah', 'Sepasang cincin, cek ukuran dan bahan.', 'paket', 2000000, 5000000, 20000000, 'smp', 'semua', 'akad'),
    ('BG-06', 'MUA & busana', 'Sepatu & aksesori pengantin', 'Sepatu, perhiasan pendukung, kain/selop adat.', 'paket', 300000, 1500000, 6000000, 'smp', 'semua', None),
    ('BG-07', 'MUA & busana', 'Perawatan pranikah', 'Perawatan kulit, rambut, kebugaran.', 'paket', 300000, 2000000, 8000000, 'mp', 'semua', None),
    ('BG-08', 'MUA & busana', 'Nail art & hena', 'Hena tangan/kaki dan kuku.', 'paket', 150000, 450000, 1500000, 'mp', 'semua', None),
    ('BG-09', 'MUA & busana', 'Busana bridesmaid & pendamping', 'Seragam sahabat / pagar ayu.', 'paket', 0, 1500000, 5000000, 'p', 'semua', 'resepsi'),
    ('DOC-01', 'Dokumentasi', 'Foto + video acara', 'Akad & resepsi, album dan file digital.', 'paket', 2000000, 10000000, 35000000, 'smp', 'semua', None),
    ('DOC-02', 'Dokumentasi', 'Foto prewedding', 'Untuk undangan / galeri.', 'paket', 0, 3000000, 15000000, 'mp', 'semua', None),
    ('DOC-03', 'Dokumentasi', 'WCC (wedding content creator)', 'Video pendek & story di hari H.', 'paket', 750000, 1500000, 3500000, 'mp', 'semua', None),
    ('DOC-04', 'Dokumentasi', 'Live streaming', 'Untuk keluarga yang tidak hadir.', 'paket', 0, 1500000, 5000000, 'p', 'semua', 'akad'),
    ('ENT-01', 'WO & acara', 'Wedding organizer / koordinator hari H', 'Full planning atau koordinator hari H.', 'paket', 3000000, 12000000, 40000000, 'mp', 'semua', None),
    ('ENT-02', 'WO & acara', 'MC', 'Akad dan/atau resepsi.', 'paket', 500000, 2000000, 8000000, 'smp', 'semua', None),
    ('ENT-03', 'WO & acara', 'Sound system', 'Kadang termasuk paket venue atau hiburan.', 'paket', 1000000, 3000000, 10000000, 'smp', 'semua', 'resepsi'),
    ('ENT-04', 'WO & acara', 'Hiburan musik', 'Organ tunggal, akustik, atau band.', 'paket', 1000000, 4000000, 25000000, 'mp', 'semua', 'resepsi'),
    ('ENT-05', 'WO & acara', 'Prosesi / hiburan adat', 'Tari, upacara adat, atau pengisi prosesi.', 'paket', 1000000, 4000000, 15000000, 'p', 'semua', 'resepsi'),
    ('ENT-06', 'WO & acara', 'Qori / tilawah & doa', 'Pembaca Al-Qur\'an dan doa saat akad.', 'paket', 300000, 750000, 1500000, 'smp', 'islam', 'akad'),
    ('INV-01', 'Undangan & souvenir', 'Undangan digital', 'Website undangan dengan RSVP, peta, galeri.', 'paket', 0, 150000, 1000000, 'smp', 'semua', None),
    ('INV-02', 'Undangan & souvenir', 'Undangan cetak', 'Untuk keluarga dan tamu yang perlu diantar langsung.', 'undangan', 2500, 7000, 25000, 'smp', 'semua', None),
    ('INV-03', 'Undangan & souvenir', 'Buku tamu & kotak angpao', 'Manual atau digital.', 'paket', 200000, 500000, 2000000, 'mp', 'semua', 'resepsi'),
    ('SOU-01', 'Undangan & souvenir', 'Souvenir tamu', 'Cinderamata per undangan.', 'undangan', 3000, 10000, 35000, 'mp', 'semua', 'resepsi'),
    ('FAM-01', 'Keluarga & transportasi', 'Seragam keluarga kedua pihak', 'Kain/batik keluarga inti & panitia, bros orang tua.', 'paket', 1000000, 4000000, 15000000, 'mp', 'semua', None),
    ('FAM-02', 'Keluarga & transportasi', 'Panitia, keamanan, parkir & kebersihan', 'Uang lelah, konsumsi, petugas parkir.', 'paket', 500000, 2000000, 6000000, 'smp', 'semua', None),
    ('FAM-03', 'Keluarga & transportasi', 'Pengajian & prosesi adat keluarga', 'Siraman, pengajian, midodareni sesuai adat.', 'paket', 1000000, 5000000, 20000000, 'mp', 'semua', None),
    ('FAM-04', 'Keluarga & transportasi', 'Mobil pengantin', 'Sewa + hias mobil.', 'paket', 0, 1500000, 5000000, 'mp', 'semua', None),
    ('FAM-05', 'Keluarga & transportasi', 'Transportasi rombongan keluarga', 'Bus/minibus dari luar kota.', 'paket', 500000, 3000000, 10000000, '', 'semua', None),
    ('FAM-06', 'Keluarga & transportasi', 'Penginapan keluarga', 'Untuk keluarga dari luar kota.', 'paket', 0, 2000000, 10000000, '', 'semua', None),
    ('LAM-01', 'Lamaran', 'Konsumsi acara lamaran', 'Hidangan keluarga kedua pihak.', 'paket', 1000000, 3000000, 8000000, 'smp', 'semua', 'lamaran'),
    ('LAM-02', 'Lamaran', 'Dekorasi & dokumentasi lamaran', 'Backdrop sederhana + foto.', 'paket', 0, 1500000, 5000000, 'mp', 'semua', 'lamaran'),
    ('LAM-03', 'Lamaran', 'Cincin tunangan', 'Opsional sesuai kesepakatan.', 'paket', 1000000, 3000000, 10000000, 'mp', 'semua', 'lamaran'),
    ('LAM-04', 'Lamaran', 'Hantaran lamaran', 'Kue, buah, dan bingkisan saat lamaran.', 'paket', 500000, 1500000, 5000000, 'smp', 'semua', 'lamaran'),
    ('OTH-01', 'Bulan madu & lain-lain', 'Emergency kit hari H', 'Peniti, obat, jarum benang, tisu, charger, payung.', 'paket', 100000, 300000, 600000, 'smp', 'semua', None),
    ('OTH-02', 'Bulan madu & lain-lain', 'Bulan madu', 'Transportasi dan akomodasi.', 'paket', 0, 5000000, 30000000, 'p', 'semua', None),
    ('OTH-03', 'Bulan madu & lain-lain', 'Dana cadangan', 'Persen dari total item lain, untuk biaya tak terduga.', 'persen', 5, 7, 10, 'smp', 'semua', None),
]

# tahap, judul, detail, hari sebelum H, PIC, prioritas, agama, acara
T = []
def st(stage, rows):
    for r in rows:
        r = list(r) + [None] * (7 - len(r))
        title, detail, off, pic, pr, rel, ev = r
        T.append((stage, title, detail or '', off, pic or '', pr or 'sedang', rel or 'semua', ev))

st('Perencanaan awal', [
    ('Tentukan tanggal pernikahan', 'Cek kalender keluarga & ketersediaan venue', 365, 'Berdua', 'tinggi'),
    ('Diskusi konsep bersama pasangan', '', 360, 'Berdua', 'tinggi'),
    ('Diskusi dengan kedua keluarga', 'Adat, jumlah tamu, pembagian biaya', 350, 'Keluarga', 'tinggi'),
    ('Tentukan konsep & tema', 'Kumpulkan inspirasi di Pinterest/IG', 340, 'Berdua'),
    ('Tentukan total anggaran', 'Isi di Pengaturan, cek simulasi di Anggaran', 330, 'Berdua', 'tinggi'),
    ('Estimasi jumlah tamu', 'Dari kedua keluarga + teman', 320, 'Keluarga', 'tinggi'),
    ('Survey & tentukan lokasi acara', 'Bandingkan minimal 3 tempat', 300, 'Berdua', 'tinggi'),
])
st('Booking vendor', [
    ('Booking venue', 'DP & kontrak tertulis', 290, 'Berdua', 'tinggi'),
    ('Booking wedding organizer', 'Minta portofolio & referensi 3 WO', 270, 'Berdua'),
    ('Booking catering & food testing', 'Bandingkan harga per pax & menu', 240, 'Berdua', 'tinggi'),
    ('Booking dekorasi', 'Kirim moodboard', 240, 'Berdua', 'tinggi'),
    ('Booking MUA & trial makeup', '', 240, 'Pengantin wanita', 'tinggi'),
    ('Booking fotografer & videografer', 'Cek gaya foto & isi paket', 220, 'Berdua', 'tinggi'),
    ('Booking WCC', 'Wedding content creator', 180, 'Berdua', 'biasa'),
    ('Booking MC', '', 180, 'Berdua'),
    ('Booking sound system & hiburan', '', 170, 'Berdua'),
    ('Pilih qori / pembaca doa', '', 60, 'Keluarga', 'biasa', 'islam'),
])
st('Busana & rias', [
    ('Pilih busana akad / pemberkatan', '', 180, 'Berdua', 'tinggi'),
    ('Pilih busana resepsi', '', 180, 'Berdua', 'tinggi'),
    ('Pesan seragam keluarga', 'Ukur & bagikan kain', 120, 'Keluarga'),
    ('Pesan cincin nikah', 'Ukur jari & ukir nama', 100, 'Berdua', 'tinggi'),
    ('Mulai perawatan pranikah', '', 90, 'Berdua', 'biasa'),
    ('Booking nail art & hena', '', 60, 'Pengantin wanita', 'biasa'),
    ('Fitting akhir busana', 'Bawa sepatu & aksesori', 21, 'Berdua', 'tinggi'),
])
st('Administrasi & dokumen', [
    ('Cek KTP, KK, akta kelahiran', 'Pastikan data sama di semua dokumen', 150, 'Berdua', 'tinggi'),
    ('Konsultasi syarat ke KUA', 'Tanya jadwal Bimwin & berkas', 130, 'Pengantin pria', 'tinggi', 'islam'),
    ('Foto 2×3 & 4×6 latar biru', '', 120, 'Berdua'),
    ('Pengantar RT/RW & formulir N1–N4', 'Di kelurahan domisili masing-masing', 100, 'Pengantin pria', 'tinggi', 'islam'),
    ('Surat rekomendasi nikah (bila beda kecamatan)', '', 90, 'Pengantin pria', 'sedang', 'islam'),
    ('Daftar nikah di SIMKAH / KUA', 'Paling lambat 10 hari kerja sebelum akad', 75, 'Pengantin pria', 'tinggi', 'islam'),
    ('Tentukan wali nikah & dua saksi', '', 70, 'Keluarga', 'tinggi', 'islam'),
    ('Bayar PNBP bila nikah di luar KUA', 'Rp600.000 lewat bank persepsi', 60, 'Pengantin pria', 'tinggi', 'islam'),
    ('Ikut Bimbingan Perkawinan (Bimwin)', '', 45, 'Berdua', 'tinggi', 'islam'),
    ('Pemeriksaan data di KUA bersama wali', '', 14, 'Berdua', 'tinggi', 'islam'),
    ('Kursus / konseling pranikah', '', 90, 'Berdua', 'tinggi', 'lainnya'),
    ('Jadwalkan pemberkatan', '', 90, 'Berdua', 'tinggi', 'lainnya'),
    ('Cek syarat pencatatan di Disdukcapil', '', 60, 'Berdua', 'tinggi', 'lainnya'),
    ('Siapkan saksi & formulir Disdukcapil', '', 30, 'Berdua', 'tinggi', 'lainnya'),
])
st('Undangan & tamu', [
    ('Buat daftar tamu awal', 'Kumpulkan dari kedua keluarga', 210, 'Berdua', 'tinggi'),
    ('Daftar tamu keluarga pria', '', 140, 'Keluarga pria'),
    ('Daftar tamu keluarga wanita', '', 140, 'Keluarga wanita'),
    ('Daftar tamu teman & kantor', '', 130, 'Berdua'),
    ('Siapkan undangan digital', '', 75, 'Berdua'),
    ('Kirim desain undangan ke percetakan', '', 80, 'Berdua'),
    ('Distribusi undangan', 'Cetak diantar, digital via WA', 45, 'Keluarga', 'tinggi'),
    ('Pantau & ingatkan RSVP', '', 21, 'Berdua'),
    ('Atur meja / area VIP', '', 14, 'Berdua', 'biasa'),
    ('Rekap jumlah tamu untuk catering', '', 10, 'Berdua', 'tinggi'),
])
st('Seserahan & lamaran', [
    ('Susun list seserahan', 'Isi di menu Seserahan', 210, 'Pengantin pria'),
    ('Belanja seserahan', '', 100, 'Berdua'),
    ('Siapkan hantaran balasan', '', 14, 'Keluarga wanita'),
    ('Packing seserahan bersama keluarga', 'Cek jumlah kotak', 7, 'Keluarga'),
    ('Sepakati tanggal & konsep lamaran', '', 45, 'Keluarga', 'tinggi', 'semua', 'lamaran'),
    ('Siapkan cincin tunangan', '', 21, 'Pengantin pria', 'sedang', 'semua', 'lamaran'),
    ('Tentukan juru bicara keluarga', '', 14, 'Keluarga', 'sedang', 'semua', 'lamaran'),
    ('Siapkan hantaran lamaran', 'Kue, buah, bingkisan', 14, 'Keluarga pria', 'sedang', 'semua', 'lamaran'),
    ('Pesan konsumsi lamaran', '', 10, 'Keluarga wanita', 'sedang', 'semua', 'lamaran'),
    ('Konfirmasi kehadiran keluarga', '', 3, 'Keluarga', 'sedang', 'semua', 'lamaran'),
])
st('Keluarga & acara', [
    ('Koordinasi keluarga besar', '', 150, 'Keluarga', 'tinggi'),
    ('Bentuk panitia & bagi tugas', '', 90, 'Keluarga', 'tinggi'),
    ('Tentukan penerima tamu', 'Undang sebagai anggota "lihat saja" untuk check-in', 60, 'Keluarga'),
    ('Susun rundown akad & resepsi', 'Isi di menu Rundown', 45, 'Berdua', 'tinggi'),
    ('Pesan souvenir', '', 90, 'Berdua', 'biasa'),
    ('Atur transportasi & penginapan keluarga', '', 60, 'Keluarga', 'biasa'),
])
st('Persiapan akhir', [
    ('Finalisasi dekorasi', '', 30, 'Berdua', 'tinggi'),
    ('Finalisasi catering & jumlah porsi', '', 21, 'Berdua', 'tinggi'),
    ('Technical meeting vendor', '', 14, 'WO', 'tinggi'),
    ('Konfirmasi seluruh vendor', '', 10, 'WO', 'tinggi'),
    ('Cek venue', '', 10, 'Panitia'),
    ('Siapkan emergency kit', '', 7, 'Panitia'),
])
st('H-7 s.d. hari H', [
    ('Pelunasan pembayaran sesuai kesepakatan', 'Cek menu Anggaran', 7, 'Berdua', 'tinggi'),
    ('Briefing keluarga & panitia', 'Bagikan rundown & daftar PIC', 7, 'Keluarga', 'tinggi'),
    ('Final meeting dengan WO', 'Bawa rundown & daftar PIC', 5, 'Berdua', 'tinggi'),
    ('Cek busana & aksesori', '', 5, 'Berdua', 'tinggi'),
    ('Cek cincin, mahar & seserahan', '', 3, 'Berdua', 'tinggi'),
    ('Cek dokumen asli', '', 3, 'Berdua', 'tinggi'),
    ('Siapkan barang bawaan hari H', 'Lihat Seserahan › Bawaan hari H', 2, 'Berdua'),
    ('Gladi resik', '', 1, 'Semua', 'biasa'),
    ('Pelaksanaan akad & resepsi', 'Pakai Mode hari H di Rundown', 0, 'Semua', 'tinggi'),
])
st('Setelah menikah', [
    ('Lunasi vendor yang tersisa', '', -3, 'Berdua', 'tinggi'),
    ('Kembalikan barang sewaan', '', -3, 'Panitia', 'tinggi'),
    ('Rekap hadiah & amplop', '', -3, 'Berdua'),
    ('Ucapan terima kasih ke tamu', '', -7, 'Berdua', 'biasa'),
    ('Ambil buku nikah / akta perkawinan', '', -14, 'Berdua', 'tinggi'),
    ('Kumpulkan file dokumentasi', '', -30, 'Berdua', 'biasa'),
    ('Urus KK & KTP baru', '', -30, 'Berdua', 'tinggi'),
    ('Rencana keuangan setelah menikah', '', -30, 'Berdua'),
])

# list, kategori, barang, merek, jml, satuan, rencana, default?, agama
G = []
def gf(lst, cat, rows, rel='semua'):
    for r in rows:
        r = list(r)
        name, planned = r[0], r[1]
        brand = r[2] if len(r) > 2 else ''
        qty = r[3] if len(r) > 3 else 1
        unit = r[4] if len(r) > 4 else 'pcs'
        G.append((lst, cat, name, brand, qty, unit, planned, True, rel))
def sug(lst, cat, names, rel='semua'):
    for n in names:
        G.append((lst, cat, n, '', 1, 'pcs', 0, False, rel))

gf('seserahan', 'Mahar & akad', [('Seperangkat alat sholat', 500000), ('Al-Qur\'an & tafsir', 300000)], 'islam')
gf('seserahan', 'Mahar & akad', [('Mahar (uang / logam mulia)', 5000000), ('Kotak / bingkai mahar', 250000)])
sug('seserahan', 'Mahar & akad', ['Perhiasan emas', 'Logam mulia', 'Uang tunai dibingkai'])
gf('seserahan', 'Perlengkapan ibadah', [('Mukena', 400000), ('Sajadah', 200000), ('Tasbih', 50000), ('Hijab / kerudung', 150000, '', 2)], 'islam')
gf('seserahan', 'Perlengkapan ibadah', [('Kitab suci & buku renungan', 300000)], 'lainnya')
gf('seserahan', 'Pakaian', [('Kebaya / dress', 750000), ('Kain batik', 300000), ('Blouse', 250000), ('Gamis / outer', 400000)])
sug('seserahan', 'Pakaian', ['Rok', 'Celana kulot', 'Cardigan'])
gf('seserahan', 'Pakaian dalam & tidur', [('Set pakaian dalam', 300000, '', 3, 'set'), ('Piyama / baju tidur', 250000, '', 2), ('Kaus kaki', 50000, '', 3, 'pasang'), ('Daster / homewear', 150000)])
gf('seserahan', 'Skincare & makeup', [('Facial wash', 200000), ('Toner', 250000), ('Moisturizer', 150000), ('Sunscreen', 100000), ('Make up set', 900000)])
sug('seserahan', 'Skincare & makeup', ['Serum', 'Essence', 'Lip tint', 'Cushion', 'Masker wajah', 'Micellar water', 'Lip balm'])
gf('seserahan', 'Bodycare', [('Body wash', 80000), ('Body lotion', 100000), ('Shampoo & conditioner', 150000), ('Parfum', 400000), ('Deodoran', 50000)])
sug('seserahan', 'Bodycare', ['Body scrub', 'Hand cream', 'Hair mist', 'Hair dryer'])
gf('seserahan', 'Tas & sepatu', [('Tas', 600000), ('Sepatu / sandal', 400000, '', 1, 'pasang')])
sug('seserahan', 'Tas & sepatu', ['Dompet', 'Jam tangan'])
gf('seserahan', 'Rumah tangga', [('Handuk set', 200000, '', 1, 'set'), ('Sprei & bed cover', 350000, '', 1, 'set')])
sug('seserahan', 'Rumah tangga', ['Peralatan makan', 'Peralatan masak', 'Cermin'])
gf('seserahan', 'Kue & buah', [('Parcel buah', 350000), ('Kue tradisional', 300000), ('Roti / bolu', 250000)])
sug('seserahan', 'Kue & buah', ['Cokelat', 'Kue kering'])
gf('seserahan', 'Kotak hantaran', [('Sewa kotak hantaran', 500000, '', 10, 'kotak')])

gf('balasan', 'Pakaian pria', [('Kemeja batik', 350000), ('Kemeja / kaos', 250000, '', 2)])
gf('balasan', 'Pakaian pria', [('Sarung & peci', 250000)], 'islam')
gf('balasan', 'Perawatan pria', [('Parfum pria', 350000), ('Skincare pria set', 300000, '', 1, 'set')])
gf('balasan', 'Aksesori', [('Jam tangan', 500000), ('Dompet pria', 250000), ('Ikat pinggang', 200000)])
gf('balasan', 'Makanan', [('Kue basah / tradisional', 300000), ('Buah', 250000), ('Makanan khas daerah', 300000)])
gf('balasan', 'Kotak balasan', [('Kotak hantaran balasan', 250000, '', 5, 'kotak')])
sug('balasan', 'Aksesori', ['Sepatu pria', 'Tas kerja'])

gf('hari_h', 'Dokumen & akad', [('Dokumen asli (KTP, KK, akta)', 0, '', 1, 'map'), ('Mahar & cincin nikah', 0, '', 1, 'set'), ('Seserahan (cek jumlah kotak)', 0, '', 1, 'set'), ('Berkas KUA / pemberkatan', 0, '', 1, 'map')])
gf('hari_h', 'Busana & rias', [('Busana akad', 0, '', 1, 'set'), ('Busana resepsi', 0, '', 1, 'set'), ('Sepatu ganti / sandal', 0, '', 1, 'pasang'), ('Hijab & aksesori rambut', 0), ('Peniti & jarum pentul', 0, '', 1, 'kotak')])
gf('hari_h', 'Kesehatan & darurat', [('Obat pribadi', 0), ('Minyak kayu putih', 0), ('Plester & kapas', 0), ('Tisu basah & kering', 0), ('Payung', 0)])
gf('hari_h', 'Elektronik', [('Charger & powerbank', 0), ('HP cadangan', 0)])
gf('hari_h', 'Untuk tamu & vendor', [('Amplop uang lelah', 0, '', 10), ('Buku tamu & pulpen', 0), ('Kotak angpao', 0), ('Daftar kontak vendor', 0), ('Rundown cetak', 0, '', 5, 'lembar')])
gf('hari_h', 'Makan & minum', [('Air mineral pengantin', 0, '', 1, 'dus'), ('Camilan', 0), ('Sedotan', 0, '', 1, 'pak')])

# agama, pihak, nama, keterangan
D = [
    ('semua', 'wanita', 'Fotokopi KTP', '3 lembar'), ('semua', 'wanita', 'Kartu keluarga', ''), ('semua', 'wanita', 'Akta kelahiran', ''),
    ('islam', 'wanita', 'Formulir N1–N4', 'Dari kelurahan · berlaku 6 bulan'),
    ('semua', 'wanita', 'Pas foto 2×3 & 4×6 latar biru', '4 lembar masing-masing'),
    ('semua', 'wanita', 'Surat izin orang tua (N5)', 'Bila usia di bawah 21 tahun'),
    ('islam', 'wanita', 'Sertifikat Bimwin', ''),
    ('semua', 'wanita', 'Surat keterangan sehat / imunisasi TT', 'Bila diminta daerah'),
    ('semua', 'pria', 'Fotokopi KTP', '3 lembar'), ('semua', 'pria', 'Kartu keluarga', ''), ('semua', 'pria', 'Akta kelahiran', ''),
    ('islam', 'pria', 'Formulir N1–N4', 'Dari kelurahan · berlaku 6 bulan'),
    ('islam', 'pria', 'Surat rekomendasi nikah', 'Bila domisili beda kecamatan · dari KUA asal'),
    ('semua', 'pria', 'Pas foto 2×3 & 4×6 latar biru', '4 lembar masing-masing'),
    ('islam', 'pria', 'Sertifikat Bimwin', ''),
    ('semua', 'pria', 'Surat keterangan sehat', 'Bila diminta daerah'),
    ('islam', 'lainnya', 'KTP wali nikah', ''),
    ('semua', 'lainnya', 'KTP 2 saksi', ''),
    ('islam', 'lainnya', 'Bukti bayar PNBP', 'Bila akad di luar KUA / luar jam kerja'),
    ('semua', 'lainnya', 'Akta cerai / akta kematian', 'Bila pernah menikah'),
    ('semua', 'lainnya', 'Izin komandan (TNI/Polri)', 'Bila salah satu anggota TNI/Polri'),
    ('lainnya', 'lainnya', 'Surat keterangan pemuka agama', 'Setelah pemberkatan'),
    ('lainnya', 'lainnya', 'Formulir pencatatan Disdukcapil', ''),
    ('islam', 'lainnya', 'Buku nikah', 'Diterima setelah akad'),
    ('lainnya', 'lainnya', 'Akta perkawinan', ''),
    ('semua', 'lainnya', 'Kartu keluarga baru', 'Setelah menikah'),
]

S = [
    ('islam', 'Belajar fiqh nikah', 'Berdua', '', 0),
    ('islam', 'Sholat hajat & dzikir rutin', 'Berdua', 'Harian', 0),
    ('lainnya', 'Konseling pranikah', 'Berdua', '', 0),
    ('lainnya', 'Doa bersama pasangan', 'Berdua', 'Mingguan', 0),
    ('semua', 'Pertanyaan pranikah', 'Berdua', '', 40),
    ('semua', 'Sepakati keuangan rumah tangga', 'Berdua', '', 0),
    ('semua', 'Saling kenal keluarga besar', 'Berdua', '', 0),
    ('semua', 'Cek kesehatan pranikah', 'Berdua', '', 0),
    ('semua', 'Rencana tempat tinggal', 'Berdua', '', 0),
    ('islam', 'Sedekah sebelum akad', 'Berdua', '', 0),
]


def q(v):
    if v is None:
        return 'null'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def ins(table, cols, rows):
    out = [f'insert into public.{table} ({", ".join(cols)}) values']
    out.append(',\n'.join('  (' + ', '.join(q(v) for v in r) + ')' for r in rows) + ';')
    return '\n'.join(out)


sql = ['-- Template katalog, tugas, seserahan, dokumen (dibuat oleh seed_data.py)']
sql.append(ins('tpl_budget_categories', ['name', 'kind', 'sort'], [(n, k, i + 1) for i, (n, k) in enumerate(CATS)]))
sql.append(ins('tpl_catalog', ['code', 'category', 'name', 'detail', 'unit', 'price_min', 'price_std', 'price_prem', 'scales', 'religion', 'event_kind', 'sort'],
               [r + (i + 1,) for i, r in enumerate(CATALOG)]))
sql.append(ins('tpl_tasks', ['stage', 'title', 'detail', 'offset_days', 'pic', 'priority', 'religion', 'event_kind', 'sort'],
               [r + (i + 1,) for i, r in enumerate(T)]))
sql.append(ins('tpl_gifts', ['list', 'category', 'name', 'brand', 'qty', 'unit', 'planned', 'is_default', 'religion', 'sort'],
               [r + (i + 1,) for i, r in enumerate(G)]))
sql.append(ins('tpl_documents', ['religion', 'party', 'name', 'detail', 'sort'], [r + (i + 1,) for i, r in enumerate(D)]))
sql.append(ins('tpl_selfprep', ['religion', 'title', 'who', 'freq', 'total', 'sort'], [r + (i + 1,) for i, r in enumerate(S)]))

here = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(here, 'migrations', '0003_templates.sql'), 'w') as f:
    f.write('\n\n'.join(sql) + '\n')
print('tugas', len(T), 'katalog', len(CATALOG), 'barang', len(G), 'dokumen', len(D))
