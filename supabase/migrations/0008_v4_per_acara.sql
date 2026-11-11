-- v4 · Per acara
-- Sidebar per acara (Lamaran, Akad & Resepsi, Unduh mantu, acara lain), bagian acara,
-- orang & pihak (PIC & penanggung), patungan, vendor/seserahan terhubung ke anggaran,
-- buku tamu induk + undangan per acara. Data lama dipindahkan otomatis di bagian akhir.

-- =====================================================================
-- 1. Acara & bagian
-- =====================================================================
alter table public.events drop constraint if exists events_kind_check;
alter table public.events add constraint events_kind_check
  check (kind in ('lamaran','balasan','akad','resepsi','unduh','lainnya'));
alter table public.events add column if not exists parent_id uuid references public.events on delete cascade;
alter table public.events add column if not exists color text not null default 'c0';
alter table public.events add column if not exists icon text not null default 'hati';
alter table public.events add column if not exists hidden boolean not null default false;
alter table public.events add column if not exists menus jsonb not null default '[]';   -- [{"k":"persiapan","on":true}, …]
alter table public.events add column if not exists detail text not null default '';
create index if not exists events_parent_idx on public.events (parent_id);

-- =====================================================================
-- 2. Orang & pihak (PIC dan penanggung biaya)
-- =====================================================================
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings on delete cascade,
  name text not null check (length(name) between 1 and 80),
  role_label text not null default '',
  side text not null default 'lainnya' check (side in ('pria','wanita','lainnya')),
  can_pic boolean not null default true,
  can_pay boolean not null default false,
  kind text check (kind in ('bride','groom','fam_bride','fam_groom')),
  user_ids uuid[] not null default '{}',        -- akun yang "adalah" orang ini (untuk tampilan Punyaku)
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists people_wedding_idx on public.people (wedding_id);

alter table public.events add column if not exists payer_id uuid references public.people on delete set null;

-- Tugas
alter table public.tasks drop constraint if exists tasks_event_kind_check;
alter table public.tasks add column if not exists event_id uuid references public.events on delete cascade;
alter table public.tasks add column if not exists pic_id uuid references public.people on delete set null;
create index if not exists tasks_event_idx on public.tasks (event_id);

-- Anggaran: PIC, penanggung, patungan, sumber (manual / vendor)
alter table public.budget_items add column if not exists pic_id uuid references public.people on delete set null;
alter table public.budget_items add column if not exists payer_id uuid references public.people on delete set null;
alter table public.budget_items add column if not exists shares jsonb not null default '[]';   -- [{"p":"<people.id>","pct":70}, …]
alter table public.budget_items add column if not exists source text not null default 'manual';
alter table public.budget_items drop constraint if exists budget_items_source_check;
alter table public.budget_items add constraint budget_items_source_check check (source in ('manual','vendor'));
alter table public.budget_items add column if not exists offer bigint check (offer >= 0);   -- harga penawaran saat negosiasi
alter table public.budget_items alter column category_id drop not null;
alter table public.budget_items drop constraint if exists budget_items_event_id_fkey;
alter table public.budget_items add constraint budget_items_event_id_fkey foreign key (event_id) references public.events on delete cascade;

-- Seserahan per acara
alter table public.gift_categories add column if not exists event_id uuid references public.events on delete cascade;
alter table public.gift_categories add column if not exists pic_id uuid references public.people on delete set null;
alter table public.gift_categories add column if not exists payer_id uuid references public.people on delete set null;
create index if not exists gift_categories_event_idx on public.gift_categories (event_id);
alter table public.gift_items add column if not exists pic_id uuid references public.people on delete set null;

-- Catatan per acara
alter table public.reminders add column if not exists event_id uuid references public.events on delete cascade;
alter table public.reminders add column if not exists pic_id uuid references public.people on delete set null;
alter table public.notes add column if not exists event_id uuid references public.events on delete cascade;

-- =====================================================================
-- 3. Buku tamu induk + undangan per acara
-- =====================================================================
create table if not exists public.guest_invites (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings on delete cascade,
  guest_id uuid not null references public.guests on delete cascade,
  event_id uuid not null references public.events on delete cascade,
  pax int check (pax >= 0),                           -- kosong = ikut jumlah di buku induk
  rsvp text not null default 'belum' check (rsvp in ('belum','hadir','tidak','ragu')),
  sent boolean not null default false,
  table_no text not null default '',
  checked_in_at timestamptz,
  arrived_pax int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guest_id, event_id)
);
create index if not exists guest_invites_wedding_idx on public.guest_invites (wedding_id);
create index if not exists guest_invites_event_idx on public.guest_invites (event_id);

-- RLS, log, updated_at untuk tabel baru
do $$
declare t text;
begin
  foreach t in array array['people','guest_invites']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_member(wedding_id))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.can_edit(wedding_id))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.can_edit(wedding_id)) with check (public.can_edit(wedding_id))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.can_edit(wedding_id))', t || '_delete', t);
    execute format('drop trigger if exists %I on public.%I', t || '_touch', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', t || '_touch', t);
    execute format('drop trigger if exists %I on public.%I', t || '_log', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.log_change()', t || '_log', t);
  end loop;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.guest_invites;
exception when others then null;
end $$;

-- Check-in per acara: boleh untuk semua anggota (termasuk "lihat saja" yang jadi penerima tamu)
create or replace function public.check_in_invite(p_invite uuid, p_pax int, p_undo boolean default false)
returns public.guest_invites language plpgsql security definer set search_path = '' as $$
declare gi public.guest_invites;
begin
  select * into gi from public.guest_invites where id = p_invite;
  if gi.id is null or not public.is_member(gi.wedding_id) then
    raise exception 'Tamu tidak ditemukan' using errcode = 'P0002';
  end if;
  update public.guest_invites
     set checked_in_at = case when p_undo then null else now() end,
         arrived_pax = case when p_undo then null else greatest(coalesce(p_pax, gi.pax, 0), 0) end,
         rsvp = case when p_undo then rsvp else 'hadir' end
   where id = p_invite
   returning * into gi;
  return gi;
end $$;

-- =====================================================================
-- 4. Template per acara
-- =====================================================================
alter table public.tpl_catalog add column if not exists is_vendor boolean not null default false;
alter table public.tpl_gifts add column if not exists event_kind text;

update public.tpl_catalog set is_vendor = true where code in (
  'VEN-01','VEN-02','DEC-01','DEC-02','DEC-03','DEC-04','DEC-05','CAT-01','CAT-02','CAT-04','CAT-05',
  'BG-01','BG-02','BG-03','BG-04','BG-05','BG-08','BG-09','DOC-01','DOC-02','DOC-03','DOC-04',
  'ENT-01','ENT-02','ENT-03','ENT-04','ENT-05','INV-02','SOU-01','FAM-01','FAM-04','LAM-01','LAM-02','LAM-03');
-- Hantaran lamaran sekarang dicatat di Seserahan acara Lamaran (supaya tidak dobel)
update public.tpl_catalog set scales = '' where code = 'LAM-04';

insert into public.tpl_catalog (code, category, name, detail, unit, price_min, price_std, price_prem, scales, religion, event_kind, sort, is_vendor) values
  ('BAL-01', 'Lamaran', 'Konsumsi balasan lamaran', 'Hidangan saat keluarga wanita berkunjung balik.', 'paket', 1000000, 2500000, 6000000, 'smp', 'semua', 'balasan', 60, true),
  ('BAL-02', 'Keluarga & transportasi', 'Transport rombongan balasan', 'Sewa mobil untuk keluarga wanita.', 'paket', 300000, 1000000, 3000000, 'mp', 'semua', 'balasan', 61, false),
  ('UND-01', 'Konsumsi', 'Catering unduh mantu', 'Hidangan tamu di keluarga pengantin pria.', 'paket', 5000000, 15000000, 40000000, 'smp', 'semua', 'unduh', 62, true),
  ('UND-02', 'Tempat & dekorasi', 'Tenda & dekorasi unduh mantu', 'Tenda, kursi, pelaminan sederhana di rumah.', 'paket', 2000000, 6000000, 20000000, 'smp', 'semua', 'unduh', 63, true),
  ('UND-03', 'Dokumentasi', 'Dokumentasi unduh mantu', 'Foto & video acara.', 'paket', 1000000, 3000000, 8000000, 'mp', 'semua', 'unduh', 64, true),
  ('UND-04', 'MUA & busana', 'Rias & busana unduh mantu', 'Rias pengantin & sewa busana.', 'paket', 1000000, 2500000, 8000000, 'mp', 'semua', 'unduh', 65, true),
  ('UND-05', 'WO & acara', 'Sound system & hiburan unduh mantu', 'Organ tunggal / akustik.', 'paket', 500000, 2000000, 6000000, 'mp', 'semua', 'unduh', 66, true),
  ('OTH-04', 'Keluarga & transportasi', 'Konsumsi & perlengkapan acara', 'Untuk acara keluarga seperti pengajian atau siraman.', 'paket', 500000, 2000000, 6000000, 'smp', 'semua', 'lainnya', 67, false)
on conflict (code) do nothing;

insert into public.tpl_tasks (stage, title, detail, offset_days, pic, priority, religion, event_kind, sort)
select * from (values
  ('Seserahan & lamaran', 'Sepakati tanggal balasan lamaran', '', 30, 'Keluarga', 'tinggi', 'semua', 'balasan', 60),
  ('Seserahan & lamaran', 'Siapkan hantaran balasan', 'Kue, buah, bingkisan untuk keluarga pria', 14, 'Keluarga wanita', 'sedang', 'semua', 'balasan', 61),
  ('Seserahan & lamaran', 'Pesan konsumsi balasan', '', 14, 'Keluarga pria', 'sedang', 'semua', 'balasan', 62),
  ('Seserahan & lamaran', 'Sewa kendaraan rombongan', '', 10, 'Keluarga wanita', 'sedang', 'semua', 'balasan', 63),
  ('Seserahan & lamaran', 'Konfirmasi rombongan keluarga wanita', '', 5, 'Keluarga', 'sedang', 'semua', 'balasan', 64),
  ('Keluarga & acara', 'Tentukan tanggal & lokasi unduh mantu', '', 120, 'Keluarga pria', 'tinggi', 'semua', 'unduh', 70),
  ('Booking vendor', 'Booking catering unduh mantu', '', 60, 'Keluarga pria', 'tinggi', 'semua', 'unduh', 71),
  ('Booking vendor', 'Sewa tenda & dekorasi rumah', '', 45, 'Keluarga pria', 'sedang', 'semua', 'unduh', 72),
  ('Undangan & tamu', 'Susun daftar tamu unduh mantu', '', 45, 'Pengantin pria', 'sedang', 'semua', 'unduh', 73),
  ('Undangan & tamu', 'Kirim undangan unduh mantu', '', 21, 'Pengantin pria', 'sedang', 'semua', 'unduh', 74),
  ('Keluarga & acara', 'Izin acara ke RT setempat', '', 14, 'Keluarga pria', 'sedang', 'semua', 'unduh', 75),
  ('Seserahan & lamaran', 'Siapkan kue hantaran', 'Dibawa keluarga wanita', 7, 'Keluarga wanita', 'sedang', 'semua', 'unduh', 76),
  ('Persiapan akhir', 'Susun urutan acara unduh mantu', '', 7, 'Pengantin pria', 'sedang', 'semua', 'unduh', 77),
  ('Keluarga & acara', 'Tentukan tanggal & lokasi', '', 60, 'Keluarga', 'tinggi', 'semua', 'lainnya', 80),
  ('Undangan & tamu', 'Undang keluarga & tamu', '', 21, 'Berdua', 'sedang', 'semua', 'lainnya', 81),
  ('Keluarga & acara', 'Siapkan konsumsi', '', 14, 'Keluarga', 'sedang', 'semua', 'lainnya', 82),
  ('Persiapan akhir', 'Susun urutan acara', '', 7, 'Berdua', 'sedang', 'semua', 'lainnya', 83)
) v(stage, title, detail, offset_days, pic, priority, religion, event_kind, sort)
where not exists (select 1 from public.tpl_tasks t where t.event_kind in ('balasan','unduh','lainnya'));

insert into public.tpl_gifts (list, category, name, brand, qty, unit, planned, is_default, religion, sort, event_kind)
select * from (values
  ('seserahan', 'Kue & buah lamaran', 'Kue / roti', '', 2, 'kotak', 300000::bigint, true, 'semua', 200, 'lamaran'),
  ('seserahan', 'Kue & buah lamaran', 'Buah-buahan', '', 1, 'pak', 300000::bigint, true, 'semua', 201, 'lamaran'),
  ('seserahan', 'Bingkisan lamaran', 'Kain / bahan kebaya', '', 1, 'pcs', 500000::bigint, true, 'semua', 202, 'lamaran'),
  ('seserahan', 'Bingkisan lamaran', 'Parsel makanan', '', 1, 'pcs', 400000::bigint, true, 'semua', 203, 'lamaran'),
  ('seserahan', 'Bingkisan lamaran', 'Perlengkapan ibadah', '', 1, 'set', 400000::bigint, true, 'semua', 204, 'lamaran'),
  ('balasan', 'Hantaran balasan', 'Kue tradisional', '', 2, 'kotak', 400000::bigint, true, 'semua', 210, 'balasan'),
  ('balasan', 'Hantaran balasan', 'Buah-buahan', '', 1, 'pak', 250000::bigint, true, 'semua', 211, 'balasan'),
  ('balasan', 'Hantaran balasan', 'Kain sarung / batik', '', 1, 'pcs', 400000::bigint, true, 'semua', 212, 'balasan'),
  ('balasan', 'Kue hantaran', 'Kue basah', '', 3, 'kotak', 600000::bigint, true, 'semua', 220, 'unduh'),
  ('balasan', 'Kue hantaran', 'Kue kering', '', 4, 'toples', 400000::bigint, true, 'semua', 221, 'unduh'),
  ('balasan', 'Kue hantaran', 'Buah-buahan', '', 1, 'pak', 300000::bigint, true, 'semua', 222, 'unduh')
) v(list, category, name, brand, qty, unit, planned, is_default, religion, sort, event_kind)
where not exists (select 1 from public.tpl_gifts g where g.event_kind is not null);

-- =====================================================================
-- 5. Fungsi bantu
-- =====================================================================
-- Cocokkan PIC teks lama ke daftar orang
create or replace function public.match_person(w uuid, t text)
returns uuid language sql stable set search_path = '' as $$
  with x as (select lower(trim(split_part(coalesce(t, ''), ',', 1))) as s)
  select p.id from public.people p, x
  where p.wedding_id = w and x.s <> '' and (
       lower(p.name) = x.s or (p.role_label <> '' and lower(p.role_label) = x.s)
    or (p.kind = 'bride' and x.s in ('pengantin wanita', 'cpw', 'wanita'))
    or (p.kind = 'groom' and x.s in ('pengantin pria', 'cpp', 'pria'))
    or (p.kind = 'fam_bride' and x.s in ('keluarga wanita', 'keluarga pengantin wanita'))
    or (p.kind = 'fam_groom' and x.s in ('keluarga pria', 'keluarga pengantin pria'))
    or (length(x.s) >= 3 and p.kind in ('bride', 'groom') and lower(p.name) like x.s || '%'))
  order by case when lower(p.name) = x.s then 0 else 1 end, p.sort
  limit 1
$$;

-- Isi contoh tugas, anggaran, seserahan untuk satu acara / bagian
create or replace function public.v4_seed_target(p_wid uuid, p_target uuid, p_kind text, p_me uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  w public.weddings;
  v_payer uuid; v_b uuid; v_g uuid; v_fb uuid; v_fg uuid; v_kpic uuid; v_me uuid;
  v_t time;
begin
  select * into w from public.weddings where id = p_wid;
  select payer_id, coalesce(start_time, '10:00') into v_payer, v_t from public.events where id = p_target;
  select id into v_b from public.people where wedding_id = p_wid and kind = 'bride';
  select id into v_g from public.people where wedding_id = p_wid and kind = 'groom';
  select id into v_fb from public.people where wedding_id = p_wid and kind = 'fam_bride';
  select id into v_fg from public.people where wedding_id = p_wid and kind = 'fam_groom';
  v_me := coalesce(p_me, v_b);
  v_kpic := case when v_payer = v_fg then v_g else v_b end;   -- tugas "Keluarga" → pengantin dari pihak penanggung

  insert into public.tasks (wedding_id, event_id, title, detail, stage, offset_days, pic, pic_id, priority, sort)
  select p_wid, p_target, t.title, t.detail, t.stage, t.offset_days, '',
         case t.pic when 'Pengantin wanita' then v_b when 'Pengantin pria' then v_g
                    when 'Keluarga pria' then v_g when 'Keluarga wanita' then v_b
                    when 'Keluarga' then v_kpic else v_me end,
         t.priority, t.sort
  from public.tpl_tasks t
  where t.religion in ('semua', w.religion) and coalesce(t.event_kind, 'akad') = p_kind;

  insert into public.budget_items (wedding_id, category_id, event_id, name, detail, planned, catalog_code, sort, source, pic_id, payer_id)
  select p_wid, bc.id, p_target, t.name, t.detail,
         (case w.price_tier when 'min' then t.price_min when 'prem' then t.price_prem else t.price_std end)
           * case t.unit when 'porsi' then round(w.target_invites * w.portions_per_invite) when 'undangan' then w.target_invites else 1 end,
         t.code, t.sort, case when t.is_vendor then 'vendor' else 'manual' end, v_me, v_payer
  from public.tpl_catalog t
  join public.budget_categories bc on bc.wedding_id = p_wid and bc.name = t.category
  where t.unit <> 'persen' and position(w.scale in t.scales) > 0 and t.religion in ('semua', w.religion)
    and (case when t.event_kind is null or t.event_kind in ('akad', 'resepsi') then 'akad' else t.event_kind end) = p_kind;

  insert into public.gift_categories (wedding_id, event_id, list, name, sort, pic_id, payer_id)
  select p_wid, p_target, g.list, g.category, min(g.sort), v_me,
         case g.list when 'seserahan' then v_fg when 'balasan' then v_fb else v_payer end
  from public.tpl_gifts g
  where g.religion in ('semua', w.religion) and coalesce(g.event_kind, 'akad') = p_kind
  group by g.list, g.category;

  insert into public.gift_items (wedding_id, category_id, name, brand, qty, unit, planned, count_in_budget, sort)
  select p_wid, gc.id, g.name, g.brand, g.qty, g.unit, g.planned, g.list <> 'hari_h', g.sort
  from public.tpl_gifts g
  join public.gift_categories gc on gc.wedding_id = p_wid and gc.event_id = p_target and gc.list = g.list and gc.name = g.category
  where g.is_default and g.religion in ('semua', w.religion) and coalesce(g.event_kind, 'akad') = p_kind;

  if p_kind in ('lamaran', 'balasan') then
    insert into public.rundown_items (wedding_id, event_id, start_time, duration_min, title, pic, needs, sort) values
      (p_wid, p_target, v_t, 15, 'Kedatangan rombongan keluarga', 'Juru bicara keluarga', '', 1),
      (p_wid, p_target, v_t + interval '15 minutes', 15, 'Pembukaan & perkenalan keluarga', 'MC', '', 2),
      (p_wid, p_target, v_t + interval '30 minutes', 30, case when p_kind = 'lamaran' then 'Penyampaian maksud & jawaban lamaran' else 'Sambutan keluarga & ramah tamah' end, 'Juru bicara keluarga', '', 3),
      (p_wid, p_target, v_t + interval '60 minutes', 20, 'Penyerahan hantaran' || case when p_kind = 'lamaran' then ' & cincin' else '' end, 'Keluarga', 'Hantaran', 4),
      (p_wid, p_target, v_t + interval '80 minutes', 40, 'Makan bersama & foto keluarga', 'Keluarga', '', 5);
  elsif p_kind = 'unduh' then
    insert into public.rundown_items (wedding_id, event_id, start_time, duration_min, title, pic, needs, sort) values
      (p_wid, p_target, v_t - interval '120 minutes', 90, 'Rias & busana pengantin', 'MUA', '', 1),
      (p_wid, p_target, v_t, 30, 'Kedatangan pengantin & keluarga wanita', 'Keluarga', 'Kue hantaran', 2),
      (p_wid, p_target, v_t + interval '30 minutes', 150, 'Ramah tamah & salam tamu', 'MC', 'Buku tamu', 3),
      (p_wid, p_target, v_t + interval '180 minutes', 30, 'Penutupan & foto bersama', 'MC', '', 4);
  end if;
end $$;

-- Tambah satu acara (+ bagian) dan isi contohnya
create or replace function public.v4_add_event(p_wid uuid, e jsonb, p_sort int, p_me uuid, p_seed boolean default true)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  w public.weddings;
  v_kind text := coalesce(nullif(e->>'kind', ''), 'lainnya');
  v_ev uuid; v_pt uuid; pt jsonb; j int := 0; v_pk text;
  v_b uuid; v_g uuid; v_fb uuid; v_fg uuid;
  v_date date;
begin
  select * into w from public.weddings where id = p_wid;
  select id into v_b from public.people where wedding_id = p_wid and kind = 'bride';
  select id into v_g from public.people where wedding_id = p_wid and kind = 'groom';
  select id into v_fb from public.people where wedding_id = p_wid and kind = 'fam_bride';
  select id into v_fg from public.people where wedding_id = p_wid and kind = 'fam_groom';
  v_date := coalesce(nullif(e->>'date', '')::date, case when v_kind = 'akad' then w.wedding_date end);
  if jsonb_typeof(e->'parts') = 'array' and jsonb_array_length(e->'parts') > 0 and v_date is null then
    v_date := nullif(e->'parts'->0->>'date', '')::date;
  end if;

  insert into public.events (wedding_id, kind, name, event_date, start_time, end_time, location, is_main, sort, color, icon, payer_id)
  values (p_wid, v_kind,
          coalesce(nullif(trim(e->>'name'), ''), case v_kind when 'lamaran' then 'Lamaran' when 'akad' then 'Akad & Resepsi' when 'unduh' then 'Unduh mantu' else 'Acara keluarga' end),
          v_date,
          coalesce(nullif(e->>'time', '')::time, case v_kind when 'akad' then '08:00'::time when 'lainnya' then null else '10:00'::time end),
          case when v_kind = 'akad' then '14:00'::time end,
          coalesce(e->>'location', ''), v_kind = 'akad', p_sort,
          coalesce(nullif(e->>'color', ''), case v_kind when 'lamaran' then 'c1' when 'akad' then 'c2' when 'unduh' then 'c3' else 'c' || (4 + p_sort % 3)::text end),
          coalesce(nullif(e->>'icon', ''), case v_kind when 'lamaran' then 'hati' when 'akad' then 'rings' when 'unduh' then 'rumah' else 'bunga' end),
          case coalesce(nullif(e->>'payer', ''), case v_kind when 'lamaran' then 'fam_groom' when 'unduh' then 'fam_groom' else 'fam_bride' end)
            when 'fam_groom' then v_fg when 'fam_bride' then v_fb when 'groom' then v_g when 'bride' then v_b
            else (select id from public.people where wedding_id = p_wid and id::text = e->>'payer') end)
  returning id into v_ev;

  if jsonb_typeof(e->'parts') = 'array' and jsonb_array_length(e->'parts') > 0 then
    for pt in select * from jsonb_array_elements(e->'parts') loop
      j := j + 1;
      v_pk := coalesce(nullif(pt->>'kind', ''), 'lainnya');
      insert into public.events (wedding_id, parent_id, kind, name, event_date, start_time, location, sort, payer_id, color, icon)
      values (p_wid, v_ev, v_pk,
              coalesce(nullif(trim(pt->>'name'), ''), case v_pk when 'lamaran' then 'Lamaran' when 'balasan' then 'Balasan lamaran' else 'Bagian ' || j end),
              nullif(pt->>'date', '')::date, coalesce(nullif(pt->>'time', '')::time, '10:00'::time), coalesce(pt->>'location', ''), j,
              case coalesce(nullif(pt->>'payer', ''), case v_pk when 'balasan' then 'fam_bride' when 'lamaran' then 'fam_groom' else 'fam_bride' end)
                when 'fam_groom' then v_fg when 'fam_bride' then v_fb when 'groom' then v_g when 'bride' then v_b
                else (select id from public.people where wedding_id = p_wid and id::text = pt->>'payer') end,
              'c0', 'hati')
      returning id into v_pt;
      if p_seed then perform public.v4_seed_target(p_wid, v_pt, v_pk, p_me); end if;
    end loop;
  elsif p_seed then
    perform public.v4_seed_target(p_wid, v_ev, v_kind, p_me);
  end if;
  return v_ev;
end $$;

-- Dipanggil dari tombol "+ Tambah acara"
create or replace function public.add_event(p_wid uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_me uuid; v_sort int; v_id uuid;
begin
  if not public.can_edit(p_wid) then raise exception 'Kamu hanya punya akses lihat di pernikahan ini.'; end if;
  select id into v_me from public.people where wedding_id = p_wid and (select auth.uid()) = any(user_ids) order by sort limit 1;
  select coalesce(max(sort), 0) + 1 into v_sort from public.events where wedding_id = p_wid and parent_id is null;
  perform set_config('app.seeding', '1', true);
  v_id := public.v4_add_event(p_wid, p, v_sort, v_me, coalesce((p->>'seed')::boolean, true));
  perform set_config('app.seeding', '0', true);
  return v_id;
end $$;

-- =====================================================================
-- 6. Buat pernikahan baru (v4: langkah pilih acara)
-- =====================================================================
create or replace function public.create_wedding_core(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  wid uuid;
  v_rel text := coalesce(nullif(p->>'religion', ''), 'islam');
  v_scale text := coalesce(nullif(p->>'scale', ''), 'm');
  v_tier text;
  v_date date := (p->>'wedding_date')::date;
  v_invites int := coalesce(nullif(p->>'target_invites', '')::int, 300);
  v_label text := coalesce(p->>'my_label', '');
  v_bride text := trim(p->>'bride_name');
  v_groom text := trim(p->>'groom_name');
  v_b uuid; v_g uuid; v_fb uuid; v_fg uuid; v_me uuid;
  evs jsonb; e jsonb; i int := 0; v_ev uuid; v_akad uuid;
  v_akad_t time := coalesce(nullif(p->>'akad_time', '')::time, '08:00');
  v_res_t time := coalesce(nullif(p->>'resepsi_time', '')::time, '11:00');
  v_sub bigint;
begin
  if uid is null then raise exception 'Silakan masuk dulu'; end if;
  if v_date is null then raise exception 'Tanggal pernikahan wajib diisi'; end if;
  v_tier := case v_scale when 's' then 'min' when 'p' then 'prem' else 'std' end;
  perform set_config('app.seeding', '1', true);

  insert into public.weddings (bride_name, groom_name, wedding_date, city, concept, religion, scale, price_tier,
                               total_budget, target_invites, portions_per_invite, created_by)
  values (v_bride, v_groom, v_date, coalesce(p->>'city', ''), coalesce(p->>'concept', ''),
          v_rel, v_scale, v_tier, coalesce(nullif(p->>'total_budget', '')::bigint, 0), v_invites, 1.5, uid)
  returning id into wid;

  insert into public.wedding_members (wedding_id, user_id, role, label) values (wid, uid, 'owner', v_label);

  -- Orang & pihak bawaan
  insert into public.people (wedding_id, name, role_label, side, can_pic, can_pay, kind, user_ids, sort)
  values (wid, v_bride, 'Pengantin wanita', 'wanita', true, true, 'bride', case when v_label = 'Pengantin wanita' then array[uid] else '{}' end, 1)
  returning id into v_b;
  insert into public.people (wedding_id, name, role_label, side, can_pic, can_pay, kind, user_ids, sort)
  values (wid, v_groom, 'Pengantin pria', 'pria', true, true, 'groom', case when v_label = 'Pengantin pria' then array[uid] else '{}' end, 2)
  returning id into v_g;
  insert into public.people (wedding_id, name, role_label, side, can_pic, can_pay, kind, sort)
  values (wid, left('Keluarga ' || v_bride, 80), 'Keluarga pengantin wanita', 'wanita', false, true, 'fam_bride', 3)
  returning id into v_fb;
  insert into public.people (wedding_id, name, role_label, side, can_pic, can_pay, kind, sort)
  values (wid, left('Keluarga ' || v_groom, 80), 'Keluarga pengantin pria', 'pria', false, true, 'fam_groom', 4)
  returning id into v_fg;
  v_me := case v_label when 'Pengantin wanita' then v_b when 'Pengantin pria' then v_g end;
  if v_me is null and v_label <> '' then
    insert into public.people (wedding_id, name, role_label, side, can_pic, can_pay, user_ids, sort)
    values (wid, left(coalesce(nullif((select display_name from public.profiles where id = uid), ''), v_label), 80), v_label, 'lainnya', true, false, array[uid], 5)
    returning id into v_me;
  end if;

  insert into public.budget_categories (wedding_id, name, kind, sort)
  select wid, c.name, c.kind, c.sort from public.tpl_budget_categories c;

  -- Acara yang dipilih (bentuk lama tetap didukung)
  evs := p->'events';
  if evs is null or jsonb_typeof(evs) <> 'array' or jsonb_array_length(evs) = 0 then
    evs := '[]'::jsonb;
    if nullif(p->>'lamaran_date', '') is not null then
      evs := evs || jsonb_build_array(jsonb_build_object('kind', 'lamaran', 'parts', jsonb_build_array(
        jsonb_build_object('kind', 'lamaran', 'date', p->>'lamaran_date', 'location', coalesce(p->>'lamaran_location', '')),
        jsonb_build_object('kind', 'balasan'))));
    end if;
    evs := evs || jsonb_build_array(jsonb_build_object('kind', 'akad', 'date', v_date,
      'location', coalesce(nullif(p->>'resepsi_location', ''), p->>'akad_location', '')));
  end if;
  if not exists (select 1 from jsonb_array_elements(evs) x where x->>'kind' = 'akad') then
    evs := jsonb_build_array(jsonb_build_object('kind', 'akad', 'date', v_date)) || evs;
  end if;

  for e in select * from jsonb_array_elements(evs) loop
    i := i + 1;
    if e->>'kind' = 'akad' then
      e := e || jsonb_build_object('date', coalesce(nullif(e->>'date', ''), v_date::text), 'time', v_akad_t::text);
    end if;
    v_ev := public.v4_add_event(wid, e, i, v_me, true);
    if e->>'kind' = 'akad' and v_akad is null then v_akad := v_ev; end if;
  end loop;
  update public.events set end_time = v_res_t + interval '3 hours',
         detail = trim(both ' · ' from concat_ws(' · ',
           nullif('Akad ' || to_char(v_akad_t, 'HH24.MI') || coalesce(' ' || nullif(p->>'akad_location', ''), ''), 'Akad '),
           'Resepsi ' || to_char(v_res_t, 'HH24.MI') || coalesce(' ' || nullif(p->>'resepsi_location', ''), '')))
   where id = v_akad;
  update public.weddings set wedding_date = coalesce((select event_date from public.events where id = v_akad), v_date) where id = wid;

  -- Dana cadangan (persen dari subtotal) di Akad & Resepsi
  select coalesce(sum(planned), 0) into v_sub from public.budget_items where wedding_id = wid;
  insert into public.budget_items (wedding_id, category_id, event_id, name, detail, planned, catalog_code, sort, source, pic_id, payer_id)
  select wid, bc.id, v_akad, t.name, t.detail,
         round(v_sub * (case v_tier when 'min' then t.price_min when 'prem' then t.price_prem else t.price_std end) / 100.0),
         t.code, t.sort, 'manual', coalesce(v_me, v_b), v_fb
  from public.tpl_catalog t
  join public.budget_categories bc on bc.wedding_id = wid and bc.name = t.category
  where t.unit = 'persen' and position(v_scale in t.scales) > 0;

  update public.weddings
     set gift_budget = coalesce((select sum(gi.planned) from public.gift_items gi
                                 join public.gift_categories gc on gc.id = gi.category_id
                                 where gi.wedding_id = wid and gc.list = 'seserahan' and gc.event_id = v_akad), 0)
   where id = wid;

  -- Dokumen, persiapan diri, catatan penting
  insert into public.documents (wedding_id, party, name, detail, sort)
  select wid, d.party, d.name, d.detail, d.sort from public.tpl_documents d where d.religion in ('semua', v_rel);
  insert into public.selfprep (wedding_id, title, who, freq, total, sort)
  select wid, s.title, s.who, s.freq, s.total, s.sort from public.tpl_selfprep s where s.religion in ('semua', v_rel);
  insert into public.notes (wedding_id, event_id, label, value, secret, sort) values
    (wid, v_akad, 'Kontak darurat WO', '', false, 1),
    (wid, v_akad, 'Dress code', '', false, 2),
    (wid, v_akad, 'Hashtag', '', false, 3),
    (wid, v_akad, 'Parkir tamu', '', false, 4),
    (wid, v_akad, 'Rekening untuk amplop digital', '', true, 5);

  -- Rundown akad & resepsi
  insert into public.rundown_items (wedding_id, event_id, start_time, duration_min, title, pic, location, needs, sort)
  values
    (wid, v_akad, v_akad_t - interval '3 hours', 120, 'Rias & busana pengantin', 'MUA', 'Ruang rias', '', 1),
    (wid, v_akad, v_akad_t - interval '45 minutes', 30, 'Kedatangan keluarga pria & penyerahan seserahan', 'Juru bicara keluarga', '', 'Seserahan', 2),
    (wid, v_akad, v_akad_t - interval '15 minutes', 15, 'Pembukaan & tilawah', 'MC', '', 'Mic', 3),
    (wid, v_akad, v_akad_t, 30, case when v_rel = 'islam' then 'Ijab kabul' else 'Pemberkatan' end, 'Penghulu & wali', '', 'Mahar, cincin, dokumen asli', 4),
    (wid, v_akad, v_akad_t + interval '30 minutes', 30, 'Sungkeman & foto keluarga inti', 'WO', '', 'Daftar urutan foto', 5),
    (wid, v_akad, v_res_t - interval '60 minutes', 60, 'Ganti busana resepsi', 'MUA', 'Ruang rias', '', 6),
    (wid, v_akad, v_res_t, 180, 'Resepsi: kirab, salam tamu, hiburan', 'WO', '', 'Buku tamu', 7),
    (wid, v_akad, v_res_t + interval '180 minutes', 30, 'Penutupan & foto bersama panitia', 'MC', '', '', 8);

  perform set_config('app.seeding', '0', true);
  return wid;
end $$;

revoke execute on function public.create_wedding_core(jsonb) from public, anon, authenticated;
revoke execute on function public.v4_seed_target(uuid, uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.v4_add_event(uuid, jsonb, int, uuid, boolean) from public, anon, authenticated;
revoke execute on function public.match_person(uuid, text) from public, anon, authenticated;
revoke execute on function public.add_event(uuid, jsonb) from public, anon;
revoke execute on function public.check_in_invite(uuid, int, boolean) from public, anon;
grant execute on function public.add_event(uuid, jsonb) to authenticated;
grant execute on function public.check_in_invite(uuid, int, boolean) to authenticated;

-- =====================================================================
-- 7. Pindahkan data lama ke bentuk per acara
-- =====================================================================
do $$
declare
  w record; m record;
  ev_a uuid; ev_r uuid; ev_l uuid; part_l uuid; part_b uuid;
  p_b uuid; p_g uuid; p_fb uuid; p_fg uuid;
  r_loc text; r_end time; r_start time; a_loc text; a_start time;
begin
  perform set_config('app.seeding', '1', true);
  for w in select * from public.weddings where not exists (select 1 from public.people p where p.wedding_id = weddings.id) loop
    ev_a := null; ev_r := null; ev_l := null; part_l := null; part_b := null;

    -- Orang bawaan
    insert into public.people (wedding_id, name, role_label, side, can_pic, can_pay, kind, sort)
    values (w.id, w.bride_name, 'Pengantin wanita', 'wanita', true, true, 'bride', 1) returning id into p_b;
    insert into public.people (wedding_id, name, role_label, side, can_pic, can_pay, kind, sort)
    values (w.id, w.groom_name, 'Pengantin pria', 'pria', true, true, 'groom', 2) returning id into p_g;
    insert into public.people (wedding_id, name, role_label, side, can_pic, can_pay, kind, sort)
    values (w.id, left('Keluarga ' || w.bride_name, 80), 'Keluarga pengantin wanita', 'wanita', false, true, 'fam_bride', 3) returning id into p_fb;
    insert into public.people (wedding_id, name, role_label, side, can_pic, can_pay, kind, sort)
    values (w.id, left('Keluarga ' || w.groom_name, 80), 'Keluarga pengantin pria', 'pria', false, true, 'fam_groom', 4) returning id into p_fg;
    for m in select * from public.wedding_members where wedding_id = w.id order by role = 'owner' desc loop
      if lower(m.label) in ('pengantin wanita', lower(w.bride_name)) then
        update public.people set user_ids = array_append(user_ids, m.user_id) where id = p_b;
      elsif lower(m.label) in ('pengantin pria', lower(w.groom_name)) then
        update public.people set user_ids = array_append(user_ids, m.user_id) where id = p_g;
      elsif trim(m.label) <> '' then
        insert into public.people (wedding_id, name, role_label, side, can_pic, can_pay, user_ids, sort)
        values (w.id, left(trim(m.label), 80), '', 'lainnya', true, false, array[m.user_id], 10);
      end if;
    end loop;

    -- Akad & resepsi jadi satu acara
    select id, location, start_time into ev_a, a_loc, a_start from public.events where wedding_id = w.id and kind = 'akad' order by sort, created_at limit 1;
    select id, location, start_time, end_time into ev_r, r_loc, r_start, r_end from public.events where wedding_id = w.id and kind = 'resepsi' order by sort, created_at limit 1;
    if ev_a is null and ev_r is not null then ev_a := ev_r; a_loc := r_loc; a_start := r_start; ev_r := null; end if;
    if ev_a is null then
      insert into public.events (wedding_id, kind, name, event_date, start_time, is_main, sort)
      values (w.id, 'akad', 'Akad & Resepsi', w.wedding_date, '08:00', true, 2) returning id into ev_a;
    end if;
    update public.events
       set kind = 'akad', name = 'Akad & Resepsi', color = 'c2', icon = 'rings', payer_id = p_fb, is_main = true, sort = 2,
           event_date = coalesce(event_date, w.wedding_date),
           location = coalesce(nullif(r_loc, ''), location),
           end_time = coalesce(r_end, end_time),
           detail = trim(both ' · ' from concat_ws(' · ',
             case when a_start is not null or coalesce(a_loc, '') <> '' then trim('Akad ' || coalesce(to_char(a_start, 'HH24.MI'), '') || ' ' || coalesce(a_loc, '')) end,
             case when ev_r is not null then trim('Resepsi ' || coalesce(to_char(r_start, 'HH24.MI'), '') || ' ' || coalesce(r_loc, '')) end))
     where id = ev_a;
    if ev_r is not null then
      update public.rundown_items set event_id = ev_a where event_id = ev_r;
      update public.budget_items set event_id = ev_a where event_id = ev_r;
      delete from public.events where id = ev_r;
    end if;

    -- Lamaran jadi acara dengan bagian Lamaran & Balasan lamaran
    select id into ev_l from public.events where wedding_id = w.id and kind = 'lamaran' and parent_id is null and id <> ev_a order by sort, created_at limit 1;
    if ev_l is not null then
      update public.events set name = 'Lamaran', color = 'c1', icon = 'hati', payer_id = p_fg, is_main = false, sort = 1 where id = ev_l;
      insert into public.events (wedding_id, parent_id, kind, name, event_date, start_time, location, sort, payer_id)
      select w.id, ev_l, 'lamaran', 'Lamaran', event_date, start_time, location, 1, p_fg from public.events where id = ev_l
      returning id into part_l;
      insert into public.events (wedding_id, parent_id, kind, name, sort, payer_id, start_time)
      values (w.id, ev_l, 'balasan', 'Balasan lamaran', 2, p_fb, '10:00') returning id into part_b;
      update public.rundown_items set event_id = part_l where event_id = ev_l;
      update public.budget_items set event_id = part_l where event_id = ev_l;
    end if;

    -- Acara lain tetap jadi acara sendiri
    update public.events
       set kind = case when kind in ('akad', 'resepsi', 'lamaran') then 'lainnya' else kind end,
           color = 'c4', icon = 'bunga', payer_id = p_fb, sort = sort + 10
     where wedding_id = w.id and parent_id is null and id <> ev_a and id is distinct from ev_l;

    -- Tugas: lamaran → Lamaran, lainnya → Akad & Resepsi; deadline dihitung dari tanggal acaranya
    update public.tasks set event_id = case when event_kind = 'lamaran' and part_l is not null then part_l else ev_a end
     where wedding_id = w.id;
    update public.tasks t set offset_days = t.offset_days - (w.wedding_date - coalesce(e.event_date, w.wedding_date))
      from public.events e where e.id = t.event_id and t.wedding_id = w.id;
    update public.tasks set pic_id = public.match_person(w.id, pic) where wedding_id = w.id;

    -- Anggaran: ikut acaranya, tanpa label → Akad & Resepsi; vendor jadi baris vendor
    update public.budget_items set event_id = ev_a where wedding_id = w.id and event_id is null;
    update public.budget_items b
       set pic_id = public.match_person(w.id, b.pic),
           payer_id = coalesce((select e.payer_id from public.events e where e.id = b.event_id), p_fb),
           source = case when b.vendor_id is not null
                          or b.catalog_code in (select code from public.tpl_catalog where is_vendor) then 'vendor' else 'manual' end
     where b.wedding_id = w.id;
    insert into public.budget_items (wedding_id, category_id, event_id, vendor_id, name, detail, planned, offer, source, payer_id, sort)
    select w.id, null, ev_a, v.id, coalesce(nullif(v.category, ''), v.name), v.notes, coalesce(v.estimate, 0),
           case when v.stage = 'nego' then v.estimate end, 'vendor', p_fb, 900 + v.sort
      from public.vendors v
     where v.wedding_id = w.id and not exists (select 1 from public.budget_items b where b.vendor_id = v.id);

    -- Seserahan → Akad & Resepsi
    update public.gift_categories
       set event_id = ev_a, pic_id = public.match_person(w.id, pic),
           payer_id = case list when 'seserahan' then p_fg when 'balasan' then p_fb else p_fb end
     where wedding_id = w.id;
    update public.gift_items set pic_id = public.match_person(w.id, pic) where wedding_id = w.id;

    -- Tamu masuk buku induk & dicentang Akad & Resepsi
    insert into public.guest_invites (wedding_id, guest_id, event_id, pax, rsvp, sent, table_no, checked_in_at, arrived_pax)
    select w.id, g.id, ev_a, g.pax, g.rsvp, g.sent, g.table_no, g.checked_in_at, g.arrived_pax
      from public.guests g where g.wedding_id = w.id
    on conflict (guest_id, event_id) do nothing;

    -- Catatan
    update public.reminders set event_id = ev_a, pic_id = public.match_person(w.id, pic) where wedding_id = w.id;
    update public.notes set event_id = ev_a where wedding_id = w.id;
  end loop;
  perform set_config('app.seeding', '0', true);
end $$;
