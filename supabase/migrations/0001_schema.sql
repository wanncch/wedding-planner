-- Wedding Planner by Wanncch — skema database v2 (Supabase / Postgres)
-- Satu database untuk semua pasangan. Setiap baris data punya wedding_id,
-- dan Row Level Security memastikan orang hanya melihat pernikahan tempat ia jadi anggota.

-- =====================================================================
-- Akun & pernikahan
-- =====================================================================
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  email text,
  created_at timestamptz not null default now()
);

create table public.weddings (
  id uuid primary key default gen_random_uuid(),
  bride_name text not null check (length(bride_name) between 1 and 80),
  groom_name text not null check (length(groom_name) between 1 and 80),
  wedding_date date not null,
  city text not null default '',
  concept text not null default '',
  religion text not null default 'islam' check (religion in ('islam','lainnya')),
  scale text not null default 'm' check (scale in ('s','m','p')),
  price_tier text not null default 'std' check (price_tier in ('min','std','prem')),
  total_budget bigint not null default 0 check (total_budget >= 0),
  gift_budget bigint not null default 0 check (gift_budget >= 0),
  target_invites int not null default 300 check (target_invites >= 0),
  portions_per_invite numeric(4,2) not null default 1.5 check (portions_per_invite > 0),
  kua_step int not null default 1 check (kua_step between 1 and 7),
  created_by uuid references auth.users on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wedding_members (
  wedding_id uuid not null references public.weddings on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('owner','editor','viewer')),
  label text not null default '',          -- mis. "Ibu Rina", "WO Kirana"
  created_at timestamptz not null default now(),
  primary key (wedding_id, user_id)
);
create index on public.wedding_members (user_id);

create table public.wedding_invites (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings on delete cascade,
  email text not null check (email = lower(email) and email like '%@%'),
  role text not null default 'editor' check (role in ('editor','viewer')),
  label text not null default '',
  token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  invited_by uuid references auth.users on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create index on public.wedding_invites (wedding_id);

-- =====================================================================
-- Data pernikahan
-- =====================================================================
create table public.events (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings on delete cascade,
  kind text not null check (kind in ('lamaran','akad','resepsi','lainnya')),
  name text not null,
  event_date date,
  start_time time,
  end_time time,
  location text not null default '',
  is_main boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings on delete cascade,
  title text not null check (length(title) between 1 and 200),
  detail text not null default '',
  stage text not null default 'Lainnya',
  event_kind text check (event_kind in ('lamaran','akad','resepsi','lainnya')),
  offset_days int not null default 30,      -- hari sebelum hari H (negatif = sesudah)
  due_date date,                            -- isi untuk mengunci deadline manual
  pic text not null default '',
  priority text not null default 'sedang' check (priority in ('tinggi','sedang','biasa')),
  status text not null default 'belum' check (status in ('belum','proses','selesai','batal')),
  result text not null default '',
  link_url text not null default '',
  done_at timestamptz,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings on delete cascade,
  category text not null default '',
  name text not null check (length(name) between 1 and 120),
  contact_name text not null default '',
  phone text not null default '',
  instagram text not null default '',
  estimate bigint check (estimate >= 0),
  stage text not null default 'belum' check (stage in ('belum','nego')),  -- deal/lunas dihitung dari item anggaran
  notes text not null default '',
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings on delete cascade,
  name text not null,
  kind text not null default 'biasa' check (kind in ('biasa','seserahan')),
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings on delete cascade,
  category_id uuid not null references public.budget_categories on delete restrict,
  event_id uuid references public.events on delete set null,
  vendor_id uuid references public.vendors on delete set null,
  name text not null check (length(name) between 1 and 160),
  detail text not null default '',
  pic text not null default '',
  planned bigint not null default 0 check (planned >= 0),
  deal bigint check (deal >= 0),
  is_wishlist boolean not null default false,
  inspo_url text not null default '',
  contract_url text not null default '',
  notes text not null default '',
  catalog_code text,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings on delete cascade,
  item_id uuid not null references public.budget_items on delete cascade,
  label text not null default 'Pembayaran',
  amount bigint not null check (amount > 0),
  due_date date,
  paid_on date,                              -- kosong = masih jadwal / belum dibayar
  method text not null default '',
  proof_url text not null default '',
  note text not null default '',
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gift_categories (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings on delete cascade,
  list text not null check (list in ('seserahan','balasan','hari_h')),
  name text not null,
  pic text not null default '',
  note text not null default '',
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table public.gift_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings on delete cascade,
  category_id uuid not null references public.gift_categories on delete cascade,
  name text not null check (length(name) between 1 and 160),
  brand text not null default '',
  qty int not null default 1 check (qty > 0),
  unit text not null default 'pcs',
  planned bigint not null default 0 check (planned >= 0),
  actual bigint check (actual >= 0),
  status text not null default 'belum' check (status in ('belum','dipesan','siap')),
  pic text not null default '',
  target_date date,
  shop_url text not null default '',
  photo_url text not null default '',
  notes text not null default '',
  count_in_budget boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings on delete cascade,
  name text not null check (length(name) between 1 and 160),
  relation text not null default '',
  side text not null default 'bersama' check (side in ('pria','wanita','bersama')),
  source text not null default '',
  invite_type text not null default 'digital' check (invite_type in ('cetak','digital')),
  phone text not null default '',
  address text not null default '',
  pax int not null default 2 check (pax >= 0),
  sent boolean not null default false,
  rsvp text not null default 'belum' check (rsvp in ('belum','hadir','tidak','ragu')),
  table_no text not null default '',
  is_vip boolean not null default false,
  checked_in_at timestamptz,
  arrived_pax int,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rundown_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings on delete cascade,
  event_id uuid not null references public.events on delete cascade,
  start_time time not null,
  duration_min int not null default 30 check (duration_min between 0 and 1440),
  title text not null,
  pic text not null default '',
  location text not null default '',
  needs text not null default '',
  notes text not null default '',
  state text not null default 'todo' check (state in ('todo','live','done')),
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings on delete cascade,
  party text not null default 'lainnya' check (party in ('wanita','pria','lainnya')),
  name text not null,
  detail text not null default '',
  status text not null default 'belum' check (status in ('belum','proses','lengkap','tidak_perlu')),
  file_url text not null default '',
  expires_on date,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings on delete cascade,
  title text not null,
  detail text not null default '',
  due_date date,
  pic text not null default '',
  priority text not null default 'sedang' check (priority in ('tinggi','sedang','biasa')),
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings on delete cascade,
  label text not null,
  value text not null default '',
  secret boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.selfprep (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings on delete cascade,
  title text not null,
  who text not null default 'Berdua',
  freq text not null default '',
  done boolean not null default false,
  progress int not null default 0 check (progress >= 0),
  total int not null default 0 check (total >= 0),
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_log (
  id bigint generated always as identity primary key,
  wedding_id uuid not null references public.weddings on delete cascade,
  user_id uuid,
  user_name text not null default '',
  action text not null,          -- tambah / ubah / hapus
  entity text not null,
  entity_id uuid,
  summary text not null default '',
  created_at timestamptz not null default now()
);

-- Index wedding_id untuk semua tabel data
do $$
declare t text;
begin
  foreach t in array array['events','tasks','vendors','budget_categories','budget_items','payments',
    'gift_categories','gift_items','guests','rundown_items','documents','reminders','notes','selfprep']
  loop
    execute format('create index on public.%I (wedding_id)', t);
  end loop;
end $$;
create index on public.activity_log (wedding_id, created_at desc);
create index on public.payments (item_id);
create index on public.gift_items (category_id);
create index on public.budget_items (category_id);
create index on public.budget_items (vendor_id);
create index on public.budget_items (event_id);
create index on public.rundown_items (event_id);

-- =====================================================================
-- Template (katalog bersama, hanya dibaca aplikasi)
-- =====================================================================
create table public.tpl_budget_categories (
  name text primary key,
  kind text not null default 'biasa',
  sort int not null
);

create table public.tpl_catalog (
  code text primary key,
  category text not null references public.tpl_budget_categories(name),
  name text not null,
  detail text not null default '',
  unit text not null check (unit in ('paket','porsi','undangan','persen')),
  price_min bigint not null,
  price_std bigint not null,
  price_prem bigint not null,
  scales text not null default '',       -- skala yang otomatis memakai item ini: s/m/p
  religion text not null default 'semua' check (religion in ('semua','islam','lainnya')),
  event_kind text,
  sort int not null
);

create table public.tpl_tasks (
  id int generated always as identity primary key,
  stage text not null,
  title text not null,
  detail text not null default '',
  offset_days int not null,
  pic text not null default '',
  priority text not null default 'sedang',
  religion text not null default 'semua',
  event_kind text,
  sort int not null
);

create table public.tpl_gifts (
  id int generated always as identity primary key,
  list text not null check (list in ('seserahan','balasan','hari_h')),
  category text not null,
  name text not null,
  brand text not null default '',
  qty int not null default 1,
  unit text not null default 'pcs',
  planned bigint not null default 0,
  is_default boolean not null default true,   -- false = hanya muncul sebagai saran
  religion text not null default 'semua',
  sort int not null
);

create table public.tpl_documents (
  id int generated always as identity primary key,
  religion text not null default 'semua',
  party text not null,
  name text not null,
  detail text not null default '',
  sort int not null
);

create table public.tpl_selfprep (
  id int generated always as identity primary key,
  religion text not null default 'semua',
  title text not null,
  who text not null default 'Berdua',
  freq text not null default '',
  total int not null default 0,
  sort int not null
);
