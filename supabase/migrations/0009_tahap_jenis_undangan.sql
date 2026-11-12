-- v4.1: tahap persiapan bisa diatur per acara, jenis undangan tamu bertambah

-- Daftar tahap per acara (kosong = daftar bawaan sesuai jenis acara)
alter table public.events add column if not exists stages jsonb not null default '[]';

-- Jenis undangan: digital, cetak, tanpa undangan, tonjokan
alter table public.guests drop constraint if exists guests_invite_type_check;
alter table public.guests add constraint guests_invite_type_check
  check (invite_type in ('cetak','digital','tanpa','tonjokan'));

-- Tahap contoh untuk tugas lamaran, balasan, unduh mantu, dan acara lain
update public.tpl_tasks set stage = case title
    when 'Sepakati tanggal & konsep lamaran' then 'Persiapan keluarga'
    when 'Tentukan juru bicara keluarga' then 'Persiapan keluarga'
    when 'Siapkan cincin tunangan' then 'Hantaran & cincin'
    when 'Siapkan hantaran lamaran' then 'Hantaran & cincin'
    when 'Pesan konsumsi lamaran' then 'Konsumsi & dekorasi'
    when 'Konfirmasi kehadiran keluarga' then 'Undangan keluarga'
    else stage end
 where event_kind = 'lamaran';
update public.tpl_tasks set stage = case title
    when 'Siapkan hantaran balasan' then 'Hantaran & cincin'
    when 'Pesan konsumsi balasan' then 'Konsumsi & dekorasi'
    when 'Konfirmasi rombongan keluarga wanita' then 'Undangan keluarga'
    else 'Persiapan keluarga' end
 where event_kind = 'balasan';
update public.tpl_tasks set stage = case stage
    when 'Booking vendor' then 'Vendor & konsumsi'
    when 'Undangan & tamu' then 'Undangan & tamu'
    when 'Persiapan akhir' then 'Hari H'
    else case when title ilike '%konsumsi%' then 'Vendor & konsumsi' else 'Persiapan keluarga' end end
 where event_kind in ('unduh', 'lainnya');
