-- Wedding Planner by Wanncch v2 — pasang database sekaligus
-- Cara pakai: Supabase › SQL Editor › New query › tempel seluruh isi file ini › Run


-- ===== migrations/0001_schema.sql =====
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

-- ===== migrations/0002_security.sql =====
-- Keamanan, trigger, dan fungsi RPC

-- =====================================================================
-- Fungsi bantu hak akses
-- =====================================================================
create or replace function public.member_role(w uuid)
returns text language sql stable security definer set search_path = '' as $$
  select m.role from public.wedding_members m
  where m.wedding_id = w and m.user_id = (select auth.uid())
$$;

create or replace function public.is_member(w uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.wedding_members m
                 where m.wedding_id = w and m.user_id = (select auth.uid()))
$$;

create or replace function public.can_edit(w uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.wedding_members m
                 where m.wedding_id = w and m.user_id = (select auth.uid())
                   and m.role in ('owner','editor'))
$$;

create or replace function public.is_owner(w uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.wedding_members m
                 where m.wedding_id = w and m.user_id = (select auth.uid())
                   and m.role = 'owner')
$$;

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.weddings enable row level security;
alter table public.wedding_members enable row level security;
alter table public.wedding_invites enable row level security;
alter table public.activity_log enable row level security;

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or exists (
    select 1 from public.wedding_members a
    join public.wedding_members b on a.wedding_id = b.wedding_id
    where a.user_id = (select auth.uid()) and b.user_id = profiles.id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy weddings_select on public.weddings for select to authenticated using (public.is_member(id));
create policy weddings_update on public.weddings for update to authenticated
  using (public.can_edit(id)) with check (public.can_edit(id));
create policy weddings_delete on public.weddings for delete to authenticated using (public.is_owner(id));

create policy members_select on public.wedding_members for select to authenticated using (public.is_member(wedding_id));
create policy members_update on public.wedding_members for update to authenticated
  using (public.is_owner(wedding_id) and user_id <> (select auth.uid()))
  with check (public.is_owner(wedding_id) and role in ('editor','viewer'));
create policy members_delete on public.wedding_members for delete to authenticated
  using ((public.is_owner(wedding_id) and user_id <> (select auth.uid()))
      or (user_id = (select auth.uid()) and role <> 'owner'));

create policy invites_owner on public.wedding_invites for all to authenticated
  using (public.is_owner(wedding_id)) with check (public.is_owner(wedding_id));

create policy log_select on public.activity_log for select to authenticated using (public.is_member(wedding_id));

do $$
declare t text;
begin
  foreach t in array array['events','tasks','vendors','budget_categories','budget_items','payments',
    'gift_categories','gift_items','guests','rundown_items','documents','reminders','notes','selfprep']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_member(wedding_id))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.can_edit(wedding_id))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.can_edit(wedding_id)) with check (public.can_edit(wedding_id))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.can_edit(wedding_id))', t || '_delete', t);
  end loop;
  foreach t in array array['tpl_budget_categories','tpl_catalog','tpl_tasks','tpl_gifts','tpl_documents','tpl_selfprep']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_read', t);
  end loop;
end $$;

-- =====================================================================
-- Trigger
-- =====================================================================
-- Profil otomatis saat daftar
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, email)
  values (new.id,
          coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)),
          lower(new.email))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

-- Tanggal selesai otomatis
create or replace function public.stamp_done()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'tasks' then
    if new.status = 'selesai' and (tg_op = 'INSERT' or old.status <> 'selesai') then new.done_at = now();
    elsif new.status <> 'selesai' then new.done_at = null; end if;
  elsif tg_table_name = 'reminders' then
    if new.done and (tg_op = 'INSERT' or not old.done) then new.done_at = now();
    elsif not new.done then new.done_at = null; end if;
  end if;
  return new;
end $$;
create trigger tasks_done before insert or update on public.tasks for each row execute function public.stamp_done();
create trigger reminders_done before insert or update on public.reminders for each row execute function public.stamp_done();

-- Log aktivitas (dilewati saat pengisian awal)
create or replace function public.log_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  rec jsonb;
  w uuid;
  nm text;
  act text;
  uid uuid := (select auth.uid());
begin
  if coalesce(current_setting('app.seeding', true), '') = '1' then
    return coalesce(new, old);
  end if;
  if tg_op = 'DELETE' then rec := to_jsonb(old); act := 'hapus';
  elsif tg_op = 'INSERT' then rec := to_jsonb(new); act := 'tambah';
  else rec := to_jsonb(new); act := 'ubah'; end if;
  w := (rec->>'wedding_id')::uuid;
  if tg_table_name = 'weddings' then w := (rec->>'id')::uuid; end if;
  select display_name into nm from public.profiles where id = uid;
  insert into public.activity_log (wedding_id, user_id, user_name, action, entity, entity_id, summary)
  values (w, uid, coalesce(nm, 'Sistem'), act, tg_table_name, (rec->>'id')::uuid,
          left(coalesce(rec->>'title', rec->>'name', rec->>'label', rec->>'bride_name', ''), 160));
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['weddings','events','tasks','vendors','budget_items','payments','gift_items',
    'guests','rundown_items','documents','reminders','notes','selfprep']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', t || '_touch', t);
  end loop;
  foreach t in array array['events','tasks','vendors','budget_items','payments','gift_items',
    'guests','rundown_items','documents','reminders','notes','selfprep']
  loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.log_change()', t || '_log', t);
  end loop;
  execute 'create trigger weddings_log after update on public.weddings for each row execute function public.log_change()';
end $$;

-- =====================================================================
-- RPC
-- =====================================================================

-- Check-in tamu: boleh untuk semua anggota (termasuk "lihat saja" yang bertugas jadi penerima tamu)
create or replace function public.check_in_guest(p_guest uuid, p_pax int, p_undo boolean default false)
returns public.guests language plpgsql security definer set search_path = '' as $$
declare g public.guests;
begin
  select * into g from public.guests where id = p_guest;
  if g.id is null or not public.is_member(g.wedding_id) then
    raise exception 'Tamu tidak ditemukan' using errcode = 'P0002';
  end if;
  update public.guests
     set checked_in_at = case when p_undo then null else now() end,
         arrived_pax = case when p_undo then null else greatest(coalesce(p_pax, g.pax), 0) end,
         rsvp = case when p_undo then rsvp else 'hadir' end
   where id = p_guest
   returning * into g;
  return g;
end $$;

-- Info undangan sebelum diterima (hanya dengan token)
create or replace function public.invite_info(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'couple', w.bride_name || ' & ' || w.groom_name,
    'wedding_date', w.wedding_date,
    'email', i.email, 'role', i.role, 'status', i.status,
    'invited_by', coalesce(p.display_name, ''))
  from public.wedding_invites i
  join public.weddings w on w.id = i.wedding_id
  left join public.profiles p on p.id = i.invited_by
  where i.token = p_token
$$;

create or replace function public.accept_invite(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  inv public.wedding_invites;
  my_email text := lower(coalesce((select auth.jwt()) ->> 'email', ''));
begin
  if (select auth.uid()) is null then raise exception 'Silakan masuk dulu'; end if;
  select * into inv from public.wedding_invites where token = p_token for update;
  if inv.id is null or inv.status = 'revoked' then
    raise exception 'Undangan tidak berlaku lagi. Minta pemilik mengirim ulang.';
  end if;
  if inv.email <> my_email then
    raise exception 'Undangan ini untuk %. Masuk dengan email tersebut.', inv.email;
  end if;
  insert into public.wedding_members (wedding_id, user_id, role, label)
  values (inv.wedding_id, (select auth.uid()), inv.role, inv.label)
  on conflict (wedding_id, user_id) do nothing;
  update public.wedding_invites set status = 'accepted', accepted_at = now() where id = inv.id;
  return inv.wedding_id;
end $$;

-- Buat pernikahan baru + isi data awal dari template
create or replace function public.create_wedding(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  wid uuid;
  v_rel text := coalesce(nullif(p->>'religion', ''), 'islam');
  v_scale text := coalesce(nullif(p->>'scale', ''), 'm');
  v_tier text;
  v_date date := (p->>'wedding_date')::date;
  v_invites int := coalesce(nullif(p->>'target_invites', '')::int, 300);
  v_portion numeric := 1.5;
  ev_lamaran uuid; ev_akad uuid; ev_resepsi uuid;
  v_akad time := coalesce(nullif(p->>'akad_time', '')::time, '08:00');
  v_resepsi time := coalesce(nullif(p->>'resepsi_time', '')::time, '11:00');
  v_sub bigint;
begin
  if uid is null then raise exception 'Silakan masuk dulu'; end if;
  if v_date is null then raise exception 'Tanggal pernikahan wajib diisi'; end if;
  if (select count(*) from public.wedding_members where user_id = uid and role = 'owner') >= 5 then
    raise exception 'Maksimal 5 pernikahan per akun';
  end if;
  v_tier := case v_scale when 's' then 'min' when 'p' then 'prem' else 'std' end;
  perform set_config('app.seeding', '1', true);

  insert into public.weddings (bride_name, groom_name, wedding_date, city, concept, religion, scale, price_tier,
                               total_budget, target_invites, portions_per_invite, created_by)
  values (trim(p->>'bride_name'), trim(p->>'groom_name'), v_date, coalesce(p->>'city', ''), coalesce(p->>'concept', ''),
          v_rel, v_scale, v_tier, coalesce(nullif(p->>'total_budget', '')::bigint, 0), v_invites, v_portion, uid)
  returning id into wid;

  insert into public.wedding_members (wedding_id, user_id, role, label)
  values (wid, uid, 'owner', coalesce(p->>'my_label', ''));

  -- Acara
  if nullif(p->>'lamaran_date', '') is not null then
    insert into public.events (wedding_id, kind, name, event_date, start_time, location, sort)
    values (wid, 'lamaran', 'Lamaran', (p->>'lamaran_date')::date, '10:00', coalesce(p->>'lamaran_location', ''), 1)
    returning id into ev_lamaran;
  end if;
  insert into public.events (wedding_id, kind, name, event_date, start_time, location, is_main, sort)
  values (wid, 'akad', case when v_rel = 'islam' then 'Akad nikah' else 'Pemberkatan' end, v_date, v_akad,
          coalesce(p->>'akad_location', ''), true, 2)
  returning id into ev_akad;
  insert into public.events (wedding_id, kind, name, event_date, start_time, end_time, location, is_main, sort)
  values (wid, 'resepsi', 'Resepsi', v_date, v_resepsi, v_resepsi + interval '3 hours',
          coalesce(p->>'resepsi_location', ''), true, 3)
  returning id into ev_resepsi;

  -- Kategori & item anggaran
  insert into public.budget_categories (wedding_id, name, kind, sort)
  select wid, c.name, c.kind, c.sort from public.tpl_budget_categories c;

  insert into public.budget_items (wedding_id, category_id, event_id, name, detail, planned, catalog_code, sort)
  select wid, bc.id,
         case t.event_kind when 'lamaran' then ev_lamaran when 'akad' then ev_akad when 'resepsi' then ev_resepsi end,
         t.name, t.detail,
         (case v_tier when 'min' then t.price_min when 'prem' then t.price_prem else t.price_std end)
           * case t.unit when 'porsi' then round(v_invites * v_portion) when 'undangan' then v_invites else 1 end,
         t.code, t.sort
  from public.tpl_catalog t
  join public.budget_categories bc on bc.wedding_id = wid and bc.name = t.category
  where t.unit <> 'persen' and position(v_scale in t.scales) > 0
    and t.religion in ('semua', v_rel)
    and (t.event_kind is distinct from 'lamaran' or ev_lamaran is not null);

  select coalesce(sum(planned), 0) into v_sub from public.budget_items where wedding_id = wid;
  insert into public.budget_items (wedding_id, category_id, name, detail, planned, catalog_code, sort)
  select wid, bc.id, t.name, t.detail,
         round(v_sub * (case v_tier when 'min' then t.price_min when 'prem' then t.price_prem else t.price_std end) / 100.0),
         t.code, t.sort
  from public.tpl_catalog t
  join public.budget_categories bc on bc.wedding_id = wid and bc.name = t.category
  where t.unit = 'persen' and position(v_scale in t.scales) > 0;

  -- Seserahan, hantaran balasan, bawaan hari H
  insert into public.gift_categories (wedding_id, list, name, sort)
  select wid, g.list, g.category, min(g.sort)
  from public.tpl_gifts g
  where g.religion in ('semua', v_rel)
  group by g.list, g.category;

  insert into public.gift_items (wedding_id, category_id, name, brand, qty, unit, planned, count_in_budget, sort)
  select wid, gc.id, g.name, g.brand, g.qty, g.unit, g.planned, g.list <> 'hari_h', g.sort
  from public.tpl_gifts g
  join public.gift_categories gc on gc.wedding_id = wid and gc.list = g.list and gc.name = g.category
  where g.is_default and g.religion in ('semua', v_rel);

  update public.weddings
     set gift_budget = coalesce((select sum(planned) from public.gift_items gi
                                 join public.gift_categories gc on gc.id = gi.category_id
                                 where gi.wedding_id = wid and gc.list = 'seserahan'), 0)
   where id = wid;

  -- Tugas persiapan
  insert into public.tasks (wedding_id, title, detail, stage, event_kind, offset_days, due_date, pic, priority, sort)
  select wid, t.title, t.detail, t.stage, t.event_kind,
         case when t.event_kind = 'lamaran' and ev_lamaran is not null
              then v_date - ((p->>'lamaran_date')::date - t.offset_days) else t.offset_days end,
         null, t.pic, t.priority, t.sort
  from public.tpl_tasks t
  where t.religion in ('semua', v_rel)
    and (t.event_kind is distinct from 'lamaran' or ev_lamaran is not null);

  -- Dokumen, persiapan diri, catatan penting
  insert into public.documents (wedding_id, party, name, detail, sort)
  select wid, d.party, d.name, d.detail, d.sort from public.tpl_documents d where d.religion in ('semua', v_rel);

  insert into public.selfprep (wedding_id, title, who, freq, total, sort)
  select wid, s.title, s.who, s.freq, s.total, s.sort from public.tpl_selfprep s where s.religion in ('semua', v_rel);

  insert into public.notes (wedding_id, label, value, secret, sort) values
    (wid, 'Kontak darurat WO', '', false, 1),
    (wid, 'Dress code', '', false, 2),
    (wid, 'Hashtag', '', false, 3),
    (wid, 'Parkir tamu', '', false, 4),
    (wid, 'Rekening untuk amplop digital', '', true, 5);

  -- Rundown awal hari H (bisa diubah)
  insert into public.rundown_items (wedding_id, event_id, start_time, duration_min, title, pic, location, needs, sort)
  values
    (wid, ev_akad, v_akad - interval '3 hours', 120, 'Rias & busana pengantin', 'MUA', 'Ruang rias', '', 1),
    (wid, ev_akad, v_akad - interval '45 minutes', 30, 'Kedatangan keluarga pria & penyerahan seserahan', 'Juru bicara keluarga', '', 'Seserahan', 2),
    (wid, ev_akad, v_akad - interval '15 minutes', 15, 'Pembukaan & tilawah', 'MC', '', 'Mic', 3),
    (wid, ev_akad, v_akad, 30, case when v_rel = 'islam' then 'Ijab kabul' else 'Pemberkatan' end, 'Penghulu & wali', '', 'Mahar, cincin, dokumen asli', 4),
    (wid, ev_akad, v_akad + interval '30 minutes', 30, 'Sungkeman & foto keluarga inti', 'WO', '', 'Daftar urutan foto', 5),
    (wid, ev_resepsi, v_resepsi - interval '60 minutes', 60, 'Ganti busana resepsi', 'MUA', 'Ruang rias', '', 1),
    (wid, ev_resepsi, v_resepsi, 180, 'Resepsi: kirab, salam tamu, hiburan', 'WO', '', 'Buku tamu', 2),
    (wid, ev_resepsi, v_resepsi + interval '180 minutes', 30, 'Penutupan & foto bersama panitia', 'MC', '', '', 3);

  perform set_config('app.seeding', '0', true);
  return wid;
end $$;

-- Hak eksekusi: hanya pengguna yang sudah masuk
revoke execute on function public.create_wedding(jsonb) from public, anon;
revoke execute on function public.accept_invite(text) from public, anon;
revoke execute on function public.check_in_guest(uuid, int, boolean) from public, anon;
revoke execute on function public.invite_info(text) from public, anon;
grant execute on function public.create_wedding(jsonb) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.check_in_guest(uuid, int, boolean) to authenticated;
grant execute on function public.invite_info(text) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.log_change() from public, anon, authenticated;

-- =====================================================================
-- Penyimpanan file (foto seserahan, scan dokumen, bukti transfer)
-- Path: <wedding_id>/<folder>/<nama file>
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wedding-files', 'wedding-files', false, 10485760,
        array['image/jpeg','image/png','image/webp','image/heic','application/pdf'])
on conflict (id) do nothing;

create or replace function public.path_wedding(p_name text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  return split_part(p_name, '/', 1)::uuid;
exception when others then
  return null;
end $$;

create policy files_select on storage.objects for select to authenticated
  using (bucket_id = 'wedding-files' and public.is_member(public.path_wedding(name)));
create policy files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'wedding-files' and public.can_edit(public.path_wedding(name)));
create policy files_update on storage.objects for update to authenticated
  using (bucket_id = 'wedding-files' and public.can_edit(public.path_wedding(name)));
create policy files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'wedding-files' and public.can_edit(public.path_wedding(name)));

-- =====================================================================
-- Realtime: perubahan langsung tampil di HP lain (check-in, rundown, tugas)
-- =====================================================================
alter publication supabase_realtime add table public.guests, public.rundown_items, public.tasks;

-- ===== migrations/0003_templates.sql =====
-- Template katalog, tugas, seserahan, dokumen (dibuat oleh seed_data.py)

insert into public.tpl_budget_categories (name, kind, sort) values
  ('Tempat & dekorasi', 'biasa', 1),
  ('Konsumsi', 'biasa', 2),
  ('MUA & busana', 'biasa', 3),
  ('Dokumentasi', 'biasa', 4),
  ('WO & acara', 'biasa', 5),
  ('Undangan & souvenir', 'biasa', 6),
  ('Administrasi', 'biasa', 7),
  ('Keluarga & transportasi', 'biasa', 8),
  ('Lamaran', 'biasa', 9),
  ('Mahar & seserahan', 'seserahan', 10),
  ('Bulan madu & lain-lain', 'biasa', 11);

insert into public.tpl_catalog (code, category, name, detail, unit, price_min, price_std, price_prem, scales, religion, event_kind, sort) values
  ('ADM-01', 'Administrasi', 'Formulir N1–N4 dari kelurahan', 'Pengantar RT/RW lalu formulir nikah di kelurahan/desa domisili.', 'paket', 0, 50000, 100000, 'smp', 'islam', null, 1),
  ('ADM-02', 'Administrasi', 'Biaya nikah di luar KUA (PNBP)', 'Rp600.000 bila akad di luar kantor KUA atau di luar jam kerja. Gratis di kantor KUA pada jam kerja.', 'paket', 0, 600000, 600000, 'mp', 'islam', 'akad', 2),
  ('ADM-03', 'Administrasi', 'Pemeriksaan kesehatan pranikah', 'Surat keterangan sehat / imunisasi TT dari puskesmas bila diminta daerah.', 'paket', 0, 150000, 1500000, 'smp', 'semua', null, 3),
  ('ADM-04', 'Administrasi', 'Dokumen identitas, pas foto & fotokopi', 'KTP, KK, akta kelahiran, pas foto latar biru, legalisir.', 'paket', 50000, 100000, 200000, 'smp', 'semua', null, 4),
  ('ADM-05', 'Administrasi', 'Surat keterangan pemuka agama & kursus pranikah', 'Dari rumah ibadah tempat pemberkatan.', 'paket', 0, 500000, 2500000, 'smp', 'lainnya', 'akad', 5),
  ('ADM-06', 'Administrasi', 'Pencatatan perkawinan Disdukcapil', 'Akta perkawinan & KK baru.', 'paket', 0, 0, 300000, 'smp', 'lainnya', null, 6),
  ('VEN-01', 'Tempat & dekorasi', 'Sewa gedung / venue resepsi', 'Cek kapasitas, jam pakai, dan vendor rekanan wajib.', 'paket', 3000000, 15000000, 60000000, 'mp', 'semua', 'resepsi', 7),
  ('VEN-02', 'Tempat & dekorasi', 'Tenda, kursi & perlengkapan (acara di rumah)', 'Tenda, kursi, meja, alat makan.', 'paket', 3000000, 8000000, 20000000, 's', 'semua', 'resepsi', 8),
  ('VEN-03', 'Tempat & dekorasi', 'Lokasi akad / pemberkatan', 'Masjid, KUA, gereja, rumah, atau venue yang sama.', 'paket', 0, 1000000, 5000000, 'smp', 'semua', 'akad', 9),
  ('DEC-01', 'Tempat & dekorasi', 'Dekorasi pelaminan', 'Pelaminan, backdrop, karpet, gate masuk sesuai tema.', 'paket', 3000000, 12000000, 50000000, 'smp', 'semua', 'resepsi', 10),
  ('DEC-02', 'Tempat & dekorasi', 'Dekorasi akad / pemberkatan', 'Meja akad, bunga, backdrop kecil.', 'paket', 1000000, 4000000, 15000000, 'mp', 'semua', 'akad', 11),
  ('DEC-03', 'Tempat & dekorasi', 'Bunga & meja penerima tamu', 'Rangkaian bunga, meja tamu, papan nama.', 'paket', 500000, 3000000, 12000000, 'mp', 'semua', 'resepsi', 12),
  ('DEC-04', 'Tempat & dekorasi', 'Lighting acara', 'Lampu dekor dan panggung.', 'paket', 0, 3000000, 15000000, 'p', 'semua', 'resepsi', 13),
  ('DEC-05', 'Tempat & dekorasi', 'Photobooth', 'Area foto + cetak instan.', 'paket', 1000000, 2500000, 6000000, 'p', 'semua', 'resepsi', 14),
  ('CAT-01', 'Konsumsi', 'Catering prasmanan', 'Porsi = undangan × porsi per undangan.', 'porsi', 25000, 50000, 110000, 'smp', 'semua', 'resepsi', 15),
  ('CAT-02', 'Konsumsi', 'Gubukan / food stall', 'Sate, bakso, dimsum, kambing guling, dan lain-lain.', 'paket', 2000000, 6000000, 20000000, 'mp', 'semua', 'resepsi', 16),
  ('CAT-03', 'Konsumsi', 'Konsumsi akad, keluarga & panitia', 'Snack dan makan untuk keluarga inti, panitia, vendor.', 'paket', 1000000, 3000000, 8000000, 'smp', 'semua', 'akad', 17),
  ('CAT-04', 'Konsumsi', 'Kue pernikahan', 'Wedding cake atau kue simbolis.', 'paket', 500000, 2000000, 8000000, 'p', 'semua', 'resepsi', 18),
  ('CAT-05', 'Konsumsi', 'Snack bingkisan & air mineral', 'Untuk tamu yang pulang / tamu akad.', 'undangan', 8000, 12000, 20000, 'mp', 'semua', 'resepsi', 19),
  ('BG-01', 'MUA & busana', 'Busana akad / pemberkatan', 'Kedua mempelai, sewa atau jahit.', 'paket', 1500000, 5000000, 25000000, 'smp', 'semua', 'akad', 20),
  ('BG-02', 'MUA & busana', 'Busana resepsi', 'Kedua mempelai, bisa lebih dari satu sesi.', 'paket', 1500000, 6000000, 30000000, 'smp', 'semua', 'resepsi', 21),
  ('BG-03', 'MUA & busana', 'Rias akad & resepsi', 'Termasuk hijab do atau paes adat.', 'paket', 1500000, 5000000, 20000000, 'smp', 'semua', null, 22),
  ('BG-04', 'MUA & busana', 'Rias keluarga inti', 'Ibu, saudara, dan pendamping.', 'paket', 500000, 2000000, 6000000, 'mp', 'semua', null, 23),
  ('BG-05', 'MUA & busana', 'Cincin nikah', 'Sepasang cincin, cek ukuran dan bahan.', 'paket', 2000000, 5000000, 20000000, 'smp', 'semua', 'akad', 24),
  ('BG-06', 'MUA & busana', 'Sepatu & aksesori pengantin', 'Sepatu, perhiasan pendukung, kain/selop adat.', 'paket', 300000, 1500000, 6000000, 'smp', 'semua', null, 25),
  ('BG-07', 'MUA & busana', 'Perawatan pranikah', 'Perawatan kulit, rambut, kebugaran.', 'paket', 300000, 2000000, 8000000, 'mp', 'semua', null, 26),
  ('BG-08', 'MUA & busana', 'Nail art & hena', 'Hena tangan/kaki dan kuku.', 'paket', 150000, 450000, 1500000, 'mp', 'semua', null, 27),
  ('BG-09', 'MUA & busana', 'Busana bridesmaid & pendamping', 'Seragam sahabat / pagar ayu.', 'paket', 0, 1500000, 5000000, 'p', 'semua', 'resepsi', 28),
  ('DOC-01', 'Dokumentasi', 'Foto + video acara', 'Akad & resepsi, album dan file digital.', 'paket', 2000000, 10000000, 35000000, 'smp', 'semua', null, 29),
  ('DOC-02', 'Dokumentasi', 'Foto prewedding', 'Untuk undangan / galeri.', 'paket', 0, 3000000, 15000000, 'mp', 'semua', null, 30),
  ('DOC-03', 'Dokumentasi', 'WCC (wedding content creator)', 'Video pendek & story di hari H.', 'paket', 750000, 1500000, 3500000, 'mp', 'semua', null, 31),
  ('DOC-04', 'Dokumentasi', 'Live streaming', 'Untuk keluarga yang tidak hadir.', 'paket', 0, 1500000, 5000000, 'p', 'semua', 'akad', 32),
  ('ENT-01', 'WO & acara', 'Wedding organizer / koordinator hari H', 'Full planning atau koordinator hari H.', 'paket', 3000000, 12000000, 40000000, 'mp', 'semua', null, 33),
  ('ENT-02', 'WO & acara', 'MC', 'Akad dan/atau resepsi.', 'paket', 500000, 2000000, 8000000, 'smp', 'semua', null, 34),
  ('ENT-03', 'WO & acara', 'Sound system', 'Kadang termasuk paket venue atau hiburan.', 'paket', 1000000, 3000000, 10000000, 'smp', 'semua', 'resepsi', 35),
  ('ENT-04', 'WO & acara', 'Hiburan musik', 'Organ tunggal, akustik, atau band.', 'paket', 1000000, 4000000, 25000000, 'mp', 'semua', 'resepsi', 36),
  ('ENT-05', 'WO & acara', 'Prosesi / hiburan adat', 'Tari, upacara adat, atau pengisi prosesi.', 'paket', 1000000, 4000000, 15000000, 'p', 'semua', 'resepsi', 37),
  ('ENT-06', 'WO & acara', 'Qori / tilawah & doa', 'Pembaca Al-Qur''an dan doa saat akad.', 'paket', 300000, 750000, 1500000, 'smp', 'islam', 'akad', 38),
  ('INV-01', 'Undangan & souvenir', 'Undangan digital', 'Website undangan dengan RSVP, peta, galeri.', 'paket', 0, 150000, 1000000, 'smp', 'semua', null, 39),
  ('INV-02', 'Undangan & souvenir', 'Undangan cetak', 'Untuk keluarga dan tamu yang perlu diantar langsung.', 'undangan', 2500, 7000, 25000, 'smp', 'semua', null, 40),
  ('INV-03', 'Undangan & souvenir', 'Buku tamu & kotak angpao', 'Manual atau digital.', 'paket', 200000, 500000, 2000000, 'mp', 'semua', 'resepsi', 41),
  ('SOU-01', 'Undangan & souvenir', 'Souvenir tamu', 'Cinderamata per undangan.', 'undangan', 3000, 10000, 35000, 'mp', 'semua', 'resepsi', 42),
  ('FAM-01', 'Keluarga & transportasi', 'Seragam keluarga kedua pihak', 'Kain/batik keluarga inti & panitia, bros orang tua.', 'paket', 1000000, 4000000, 15000000, 'mp', 'semua', null, 43),
  ('FAM-02', 'Keluarga & transportasi', 'Panitia, keamanan, parkir & kebersihan', 'Uang lelah, konsumsi, petugas parkir.', 'paket', 500000, 2000000, 6000000, 'smp', 'semua', null, 44),
  ('FAM-03', 'Keluarga & transportasi', 'Pengajian & prosesi adat keluarga', 'Siraman, pengajian, midodareni sesuai adat.', 'paket', 1000000, 5000000, 20000000, 'mp', 'semua', null, 45),
  ('FAM-04', 'Keluarga & transportasi', 'Mobil pengantin', 'Sewa + hias mobil.', 'paket', 0, 1500000, 5000000, 'mp', 'semua', null, 46),
  ('FAM-05', 'Keluarga & transportasi', 'Transportasi rombongan keluarga', 'Bus/minibus dari luar kota.', 'paket', 500000, 3000000, 10000000, '', 'semua', null, 47),
  ('FAM-06', 'Keluarga & transportasi', 'Penginapan keluarga', 'Untuk keluarga dari luar kota.', 'paket', 0, 2000000, 10000000, '', 'semua', null, 48),
  ('LAM-01', 'Lamaran', 'Konsumsi acara lamaran', 'Hidangan keluarga kedua pihak.', 'paket', 1000000, 3000000, 8000000, 'smp', 'semua', 'lamaran', 49),
  ('LAM-02', 'Lamaran', 'Dekorasi & dokumentasi lamaran', 'Backdrop sederhana + foto.', 'paket', 0, 1500000, 5000000, 'mp', 'semua', 'lamaran', 50),
  ('LAM-03', 'Lamaran', 'Cincin tunangan', 'Opsional sesuai kesepakatan.', 'paket', 1000000, 3000000, 10000000, 'mp', 'semua', 'lamaran', 51),
  ('LAM-04', 'Lamaran', 'Hantaran lamaran', 'Kue, buah, dan bingkisan saat lamaran.', 'paket', 500000, 1500000, 5000000, 'smp', 'semua', 'lamaran', 52),
  ('OTH-01', 'Bulan madu & lain-lain', 'Emergency kit hari H', 'Peniti, obat, jarum benang, tisu, charger, payung.', 'paket', 100000, 300000, 600000, 'smp', 'semua', null, 53),
  ('OTH-02', 'Bulan madu & lain-lain', 'Bulan madu', 'Transportasi dan akomodasi.', 'paket', 0, 5000000, 30000000, 'p', 'semua', null, 54),
  ('OTH-03', 'Bulan madu & lain-lain', 'Dana cadangan', 'Persen dari total item lain, untuk biaya tak terduga.', 'persen', 5, 7, 10, 'smp', 'semua', null, 55);

insert into public.tpl_tasks (stage, title, detail, offset_days, pic, priority, religion, event_kind, sort) values
  ('Perencanaan awal', 'Tentukan tanggal pernikahan', 'Cek kalender keluarga & ketersediaan venue', 365, 'Berdua', 'tinggi', 'semua', null, 1),
  ('Perencanaan awal', 'Diskusi konsep bersama pasangan', '', 360, 'Berdua', 'tinggi', 'semua', null, 2),
  ('Perencanaan awal', 'Diskusi dengan kedua keluarga', 'Adat, jumlah tamu, pembagian biaya', 350, 'Keluarga', 'tinggi', 'semua', null, 3),
  ('Perencanaan awal', 'Tentukan konsep & tema', 'Kumpulkan inspirasi di Pinterest/IG', 340, 'Berdua', 'sedang', 'semua', null, 4),
  ('Perencanaan awal', 'Tentukan total anggaran', 'Isi di Pengaturan, cek simulasi di Anggaran', 330, 'Berdua', 'tinggi', 'semua', null, 5),
  ('Perencanaan awal', 'Estimasi jumlah tamu', 'Dari kedua keluarga + teman', 320, 'Keluarga', 'tinggi', 'semua', null, 6),
  ('Perencanaan awal', 'Survey & tentukan lokasi acara', 'Bandingkan minimal 3 tempat', 300, 'Berdua', 'tinggi', 'semua', null, 7),
  ('Booking vendor', 'Booking venue', 'DP & kontrak tertulis', 290, 'Berdua', 'tinggi', 'semua', null, 8),
  ('Booking vendor', 'Booking wedding organizer', 'Minta portofolio & referensi 3 WO', 270, 'Berdua', 'sedang', 'semua', null, 9),
  ('Booking vendor', 'Booking catering & food testing', 'Bandingkan harga per pax & menu', 240, 'Berdua', 'tinggi', 'semua', null, 10),
  ('Booking vendor', 'Booking dekorasi', 'Kirim moodboard', 240, 'Berdua', 'tinggi', 'semua', null, 11),
  ('Booking vendor', 'Booking MUA & trial makeup', '', 240, 'Pengantin wanita', 'tinggi', 'semua', null, 12),
  ('Booking vendor', 'Booking fotografer & videografer', 'Cek gaya foto & isi paket', 220, 'Berdua', 'tinggi', 'semua', null, 13),
  ('Booking vendor', 'Booking WCC', 'Wedding content creator', 180, 'Berdua', 'biasa', 'semua', null, 14),
  ('Booking vendor', 'Booking MC', '', 180, 'Berdua', 'sedang', 'semua', null, 15),
  ('Booking vendor', 'Booking sound system & hiburan', '', 170, 'Berdua', 'sedang', 'semua', null, 16),
  ('Booking vendor', 'Pilih qori / pembaca doa', '', 60, 'Keluarga', 'biasa', 'islam', null, 17),
  ('Busana & rias', 'Pilih busana akad / pemberkatan', '', 180, 'Berdua', 'tinggi', 'semua', null, 18),
  ('Busana & rias', 'Pilih busana resepsi', '', 180, 'Berdua', 'tinggi', 'semua', null, 19),
  ('Busana & rias', 'Pesan seragam keluarga', 'Ukur & bagikan kain', 120, 'Keluarga', 'sedang', 'semua', null, 20),
  ('Busana & rias', 'Pesan cincin nikah', 'Ukur jari & ukir nama', 100, 'Berdua', 'tinggi', 'semua', null, 21),
  ('Busana & rias', 'Mulai perawatan pranikah', '', 90, 'Berdua', 'biasa', 'semua', null, 22),
  ('Busana & rias', 'Booking nail art & hena', '', 60, 'Pengantin wanita', 'biasa', 'semua', null, 23),
  ('Busana & rias', 'Fitting akhir busana', 'Bawa sepatu & aksesori', 21, 'Berdua', 'tinggi', 'semua', null, 24),
  ('Administrasi & dokumen', 'Cek KTP, KK, akta kelahiran', 'Pastikan data sama di semua dokumen', 150, 'Berdua', 'tinggi', 'semua', null, 25),
  ('Administrasi & dokumen', 'Konsultasi syarat ke KUA', 'Tanya jadwal Bimwin & berkas', 130, 'Pengantin pria', 'tinggi', 'islam', null, 26),
  ('Administrasi & dokumen', 'Foto 2×3 & 4×6 latar biru', '', 120, 'Berdua', 'sedang', 'semua', null, 27),
  ('Administrasi & dokumen', 'Pengantar RT/RW & formulir N1–N4', 'Di kelurahan domisili masing-masing', 100, 'Pengantin pria', 'tinggi', 'islam', null, 28),
  ('Administrasi & dokumen', 'Surat rekomendasi nikah (bila beda kecamatan)', '', 90, 'Pengantin pria', 'sedang', 'islam', null, 29),
  ('Administrasi & dokumen', 'Daftar nikah di SIMKAH / KUA', 'Paling lambat 10 hari kerja sebelum akad', 75, 'Pengantin pria', 'tinggi', 'islam', null, 30),
  ('Administrasi & dokumen', 'Tentukan wali nikah & dua saksi', '', 70, 'Keluarga', 'tinggi', 'islam', null, 31),
  ('Administrasi & dokumen', 'Bayar PNBP bila nikah di luar KUA', 'Rp600.000 lewat bank persepsi', 60, 'Pengantin pria', 'tinggi', 'islam', null, 32),
  ('Administrasi & dokumen', 'Ikut Bimbingan Perkawinan (Bimwin)', '', 45, 'Berdua', 'tinggi', 'islam', null, 33),
  ('Administrasi & dokumen', 'Pemeriksaan data di KUA bersama wali', '', 14, 'Berdua', 'tinggi', 'islam', null, 34),
  ('Administrasi & dokumen', 'Kursus / konseling pranikah', '', 90, 'Berdua', 'tinggi', 'lainnya', null, 35),
  ('Administrasi & dokumen', 'Jadwalkan pemberkatan', '', 90, 'Berdua', 'tinggi', 'lainnya', null, 36),
  ('Administrasi & dokumen', 'Cek syarat pencatatan di Disdukcapil', '', 60, 'Berdua', 'tinggi', 'lainnya', null, 37),
  ('Administrasi & dokumen', 'Siapkan saksi & formulir Disdukcapil', '', 30, 'Berdua', 'tinggi', 'lainnya', null, 38),
  ('Undangan & tamu', 'Buat daftar tamu awal', 'Kumpulkan dari kedua keluarga', 210, 'Berdua', 'tinggi', 'semua', null, 39),
  ('Undangan & tamu', 'Daftar tamu keluarga pria', '', 140, 'Keluarga pria', 'sedang', 'semua', null, 40),
  ('Undangan & tamu', 'Daftar tamu keluarga wanita', '', 140, 'Keluarga wanita', 'sedang', 'semua', null, 41),
  ('Undangan & tamu', 'Daftar tamu teman & kantor', '', 130, 'Berdua', 'sedang', 'semua', null, 42),
  ('Undangan & tamu', 'Siapkan undangan digital', '', 75, 'Berdua', 'sedang', 'semua', null, 43),
  ('Undangan & tamu', 'Kirim desain undangan ke percetakan', '', 80, 'Berdua', 'sedang', 'semua', null, 44),
  ('Undangan & tamu', 'Distribusi undangan', 'Cetak diantar, digital via WA', 45, 'Keluarga', 'tinggi', 'semua', null, 45),
  ('Undangan & tamu', 'Pantau & ingatkan RSVP', '', 21, 'Berdua', 'sedang', 'semua', null, 46),
  ('Undangan & tamu', 'Atur meja / area VIP', '', 14, 'Berdua', 'biasa', 'semua', null, 47),
  ('Undangan & tamu', 'Rekap jumlah tamu untuk catering', '', 10, 'Berdua', 'tinggi', 'semua', null, 48),
  ('Seserahan & lamaran', 'Susun list seserahan', 'Isi di menu Seserahan', 210, 'Pengantin pria', 'sedang', 'semua', null, 49),
  ('Seserahan & lamaran', 'Belanja seserahan', '', 100, 'Berdua', 'sedang', 'semua', null, 50),
  ('Seserahan & lamaran', 'Siapkan hantaran balasan', '', 14, 'Keluarga wanita', 'sedang', 'semua', null, 51),
  ('Seserahan & lamaran', 'Packing seserahan bersama keluarga', 'Cek jumlah kotak', 7, 'Keluarga', 'sedang', 'semua', null, 52),
  ('Seserahan & lamaran', 'Sepakati tanggal & konsep lamaran', '', 45, 'Keluarga', 'tinggi', 'semua', 'lamaran', 53),
  ('Seserahan & lamaran', 'Siapkan cincin tunangan', '', 21, 'Pengantin pria', 'sedang', 'semua', 'lamaran', 54),
  ('Seserahan & lamaran', 'Tentukan juru bicara keluarga', '', 14, 'Keluarga', 'sedang', 'semua', 'lamaran', 55),
  ('Seserahan & lamaran', 'Siapkan hantaran lamaran', 'Kue, buah, bingkisan', 14, 'Keluarga pria', 'sedang', 'semua', 'lamaran', 56),
  ('Seserahan & lamaran', 'Pesan konsumsi lamaran', '', 10, 'Keluarga wanita', 'sedang', 'semua', 'lamaran', 57),
  ('Seserahan & lamaran', 'Konfirmasi kehadiran keluarga', '', 3, 'Keluarga', 'sedang', 'semua', 'lamaran', 58),
  ('Keluarga & acara', 'Koordinasi keluarga besar', '', 150, 'Keluarga', 'tinggi', 'semua', null, 59),
  ('Keluarga & acara', 'Bentuk panitia & bagi tugas', '', 90, 'Keluarga', 'tinggi', 'semua', null, 60),
  ('Keluarga & acara', 'Tentukan penerima tamu', 'Undang sebagai anggota "lihat saja" untuk check-in', 60, 'Keluarga', 'sedang', 'semua', null, 61),
  ('Keluarga & acara', 'Susun rundown akad & resepsi', 'Isi di menu Rundown', 45, 'Berdua', 'tinggi', 'semua', null, 62),
  ('Keluarga & acara', 'Pesan souvenir', '', 90, 'Berdua', 'biasa', 'semua', null, 63),
  ('Keluarga & acara', 'Atur transportasi & penginapan keluarga', '', 60, 'Keluarga', 'biasa', 'semua', null, 64),
  ('Persiapan akhir', 'Finalisasi dekorasi', '', 30, 'Berdua', 'tinggi', 'semua', null, 65),
  ('Persiapan akhir', 'Finalisasi catering & jumlah porsi', '', 21, 'Berdua', 'tinggi', 'semua', null, 66),
  ('Persiapan akhir', 'Technical meeting vendor', '', 14, 'WO', 'tinggi', 'semua', null, 67),
  ('Persiapan akhir', 'Konfirmasi seluruh vendor', '', 10, 'WO', 'tinggi', 'semua', null, 68),
  ('Persiapan akhir', 'Cek venue', '', 10, 'Panitia', 'sedang', 'semua', null, 69),
  ('Persiapan akhir', 'Siapkan emergency kit', '', 7, 'Panitia', 'sedang', 'semua', null, 70),
  ('H-7 s.d. hari H', 'Pelunasan pembayaran sesuai kesepakatan', 'Cek menu Anggaran', 7, 'Berdua', 'tinggi', 'semua', null, 71),
  ('H-7 s.d. hari H', 'Briefing keluarga & panitia', 'Bagikan rundown & daftar PIC', 7, 'Keluarga', 'tinggi', 'semua', null, 72),
  ('H-7 s.d. hari H', 'Final meeting dengan WO', 'Bawa rundown & daftar PIC', 5, 'Berdua', 'tinggi', 'semua', null, 73),
  ('H-7 s.d. hari H', 'Cek busana & aksesori', '', 5, 'Berdua', 'tinggi', 'semua', null, 74),
  ('H-7 s.d. hari H', 'Cek cincin, mahar & seserahan', '', 3, 'Berdua', 'tinggi', 'semua', null, 75),
  ('H-7 s.d. hari H', 'Cek dokumen asli', '', 3, 'Berdua', 'tinggi', 'semua', null, 76),
  ('H-7 s.d. hari H', 'Siapkan barang bawaan hari H', 'Lihat Seserahan › Bawaan hari H', 2, 'Berdua', 'sedang', 'semua', null, 77),
  ('H-7 s.d. hari H', 'Gladi resik', '', 1, 'Semua', 'biasa', 'semua', null, 78),
  ('H-7 s.d. hari H', 'Pelaksanaan akad & resepsi', 'Pakai Mode hari H di Rundown', 0, 'Semua', 'tinggi', 'semua', null, 79),
  ('Setelah menikah', 'Lunasi vendor yang tersisa', '', -3, 'Berdua', 'tinggi', 'semua', null, 80),
  ('Setelah menikah', 'Kembalikan barang sewaan', '', -3, 'Panitia', 'tinggi', 'semua', null, 81),
  ('Setelah menikah', 'Rekap hadiah & amplop', '', -3, 'Berdua', 'sedang', 'semua', null, 82),
  ('Setelah menikah', 'Ucapan terima kasih ke tamu', '', -7, 'Berdua', 'biasa', 'semua', null, 83),
  ('Setelah menikah', 'Ambil buku nikah / akta perkawinan', '', -14, 'Berdua', 'tinggi', 'semua', null, 84),
  ('Setelah menikah', 'Kumpulkan file dokumentasi', '', -30, 'Berdua', 'biasa', 'semua', null, 85),
  ('Setelah menikah', 'Urus KK & KTP baru', '', -30, 'Berdua', 'tinggi', 'semua', null, 86),
  ('Setelah menikah', 'Rencana keuangan setelah menikah', '', -30, 'Berdua', 'sedang', 'semua', null, 87);

insert into public.tpl_gifts (list, category, name, brand, qty, unit, planned, is_default, religion, sort) values
  ('seserahan', 'Mahar & akad', 'Seperangkat alat sholat', '', 1, 'pcs', 500000, true, 'islam', 1),
  ('seserahan', 'Mahar & akad', 'Al-Qur''an & tafsir', '', 1, 'pcs', 300000, true, 'islam', 2),
  ('seserahan', 'Mahar & akad', 'Mahar (uang / logam mulia)', '', 1, 'pcs', 5000000, true, 'semua', 3),
  ('seserahan', 'Mahar & akad', 'Kotak / bingkai mahar', '', 1, 'pcs', 250000, true, 'semua', 4),
  ('seserahan', 'Mahar & akad', 'Perhiasan emas', '', 1, 'pcs', 0, false, 'semua', 5),
  ('seserahan', 'Mahar & akad', 'Logam mulia', '', 1, 'pcs', 0, false, 'semua', 6),
  ('seserahan', 'Mahar & akad', 'Uang tunai dibingkai', '', 1, 'pcs', 0, false, 'semua', 7),
  ('seserahan', 'Perlengkapan ibadah', 'Mukena', '', 1, 'pcs', 400000, true, 'islam', 8),
  ('seserahan', 'Perlengkapan ibadah', 'Sajadah', '', 1, 'pcs', 200000, true, 'islam', 9),
  ('seserahan', 'Perlengkapan ibadah', 'Tasbih', '', 1, 'pcs', 50000, true, 'islam', 10),
  ('seserahan', 'Perlengkapan ibadah', 'Hijab / kerudung', '', 2, 'pcs', 150000, true, 'islam', 11),
  ('seserahan', 'Perlengkapan ibadah', 'Kitab suci & buku renungan', '', 1, 'pcs', 300000, true, 'lainnya', 12),
  ('seserahan', 'Pakaian', 'Kebaya / dress', '', 1, 'pcs', 750000, true, 'semua', 13),
  ('seserahan', 'Pakaian', 'Kain batik', '', 1, 'pcs', 300000, true, 'semua', 14),
  ('seserahan', 'Pakaian', 'Blouse', '', 1, 'pcs', 250000, true, 'semua', 15),
  ('seserahan', 'Pakaian', 'Gamis / outer', '', 1, 'pcs', 400000, true, 'semua', 16),
  ('seserahan', 'Pakaian', 'Rok', '', 1, 'pcs', 0, false, 'semua', 17),
  ('seserahan', 'Pakaian', 'Celana kulot', '', 1, 'pcs', 0, false, 'semua', 18),
  ('seserahan', 'Pakaian', 'Cardigan', '', 1, 'pcs', 0, false, 'semua', 19),
  ('seserahan', 'Pakaian dalam & tidur', 'Set pakaian dalam', '', 3, 'set', 300000, true, 'semua', 20),
  ('seserahan', 'Pakaian dalam & tidur', 'Piyama / baju tidur', '', 2, 'pcs', 250000, true, 'semua', 21),
  ('seserahan', 'Pakaian dalam & tidur', 'Kaus kaki', '', 3, 'pasang', 50000, true, 'semua', 22),
  ('seserahan', 'Pakaian dalam & tidur', 'Daster / homewear', '', 1, 'pcs', 150000, true, 'semua', 23),
  ('seserahan', 'Skincare & makeup', 'Facial wash', '', 1, 'pcs', 200000, true, 'semua', 24),
  ('seserahan', 'Skincare & makeup', 'Toner', '', 1, 'pcs', 250000, true, 'semua', 25),
  ('seserahan', 'Skincare & makeup', 'Moisturizer', '', 1, 'pcs', 150000, true, 'semua', 26),
  ('seserahan', 'Skincare & makeup', 'Sunscreen', '', 1, 'pcs', 100000, true, 'semua', 27),
  ('seserahan', 'Skincare & makeup', 'Make up set', '', 1, 'pcs', 900000, true, 'semua', 28),
  ('seserahan', 'Skincare & makeup', 'Serum', '', 1, 'pcs', 0, false, 'semua', 29),
  ('seserahan', 'Skincare & makeup', 'Essence', '', 1, 'pcs', 0, false, 'semua', 30),
  ('seserahan', 'Skincare & makeup', 'Lip tint', '', 1, 'pcs', 0, false, 'semua', 31),
  ('seserahan', 'Skincare & makeup', 'Cushion', '', 1, 'pcs', 0, false, 'semua', 32),
  ('seserahan', 'Skincare & makeup', 'Masker wajah', '', 1, 'pcs', 0, false, 'semua', 33),
  ('seserahan', 'Skincare & makeup', 'Micellar water', '', 1, 'pcs', 0, false, 'semua', 34),
  ('seserahan', 'Skincare & makeup', 'Lip balm', '', 1, 'pcs', 0, false, 'semua', 35),
  ('seserahan', 'Bodycare', 'Body wash', '', 1, 'pcs', 80000, true, 'semua', 36),
  ('seserahan', 'Bodycare', 'Body lotion', '', 1, 'pcs', 100000, true, 'semua', 37),
  ('seserahan', 'Bodycare', 'Shampoo & conditioner', '', 1, 'pcs', 150000, true, 'semua', 38),
  ('seserahan', 'Bodycare', 'Parfum', '', 1, 'pcs', 400000, true, 'semua', 39),
  ('seserahan', 'Bodycare', 'Deodoran', '', 1, 'pcs', 50000, true, 'semua', 40),
  ('seserahan', 'Bodycare', 'Body scrub', '', 1, 'pcs', 0, false, 'semua', 41),
  ('seserahan', 'Bodycare', 'Hand cream', '', 1, 'pcs', 0, false, 'semua', 42),
  ('seserahan', 'Bodycare', 'Hair mist', '', 1, 'pcs', 0, false, 'semua', 43),
  ('seserahan', 'Bodycare', 'Hair dryer', '', 1, 'pcs', 0, false, 'semua', 44),
  ('seserahan', 'Tas & sepatu', 'Tas', '', 1, 'pcs', 600000, true, 'semua', 45),
  ('seserahan', 'Tas & sepatu', 'Sepatu / sandal', '', 1, 'pasang', 400000, true, 'semua', 46),
  ('seserahan', 'Tas & sepatu', 'Dompet', '', 1, 'pcs', 0, false, 'semua', 47),
  ('seserahan', 'Tas & sepatu', 'Jam tangan', '', 1, 'pcs', 0, false, 'semua', 48),
  ('seserahan', 'Rumah tangga', 'Handuk set', '', 1, 'set', 200000, true, 'semua', 49),
  ('seserahan', 'Rumah tangga', 'Sprei & bed cover', '', 1, 'set', 350000, true, 'semua', 50),
  ('seserahan', 'Rumah tangga', 'Peralatan makan', '', 1, 'pcs', 0, false, 'semua', 51),
  ('seserahan', 'Rumah tangga', 'Peralatan masak', '', 1, 'pcs', 0, false, 'semua', 52),
  ('seserahan', 'Rumah tangga', 'Cermin', '', 1, 'pcs', 0, false, 'semua', 53),
  ('seserahan', 'Kue & buah', 'Parcel buah', '', 1, 'pcs', 350000, true, 'semua', 54),
  ('seserahan', 'Kue & buah', 'Kue tradisional', '', 1, 'pcs', 300000, true, 'semua', 55),
  ('seserahan', 'Kue & buah', 'Roti / bolu', '', 1, 'pcs', 250000, true, 'semua', 56),
  ('seserahan', 'Kue & buah', 'Cokelat', '', 1, 'pcs', 0, false, 'semua', 57),
  ('seserahan', 'Kue & buah', 'Kue kering', '', 1, 'pcs', 0, false, 'semua', 58),
  ('seserahan', 'Kotak hantaran', 'Sewa kotak hantaran', '', 10, 'kotak', 500000, true, 'semua', 59),
  ('balasan', 'Pakaian pria', 'Kemeja batik', '', 1, 'pcs', 350000, true, 'semua', 60),
  ('balasan', 'Pakaian pria', 'Kemeja / kaos', '', 2, 'pcs', 250000, true, 'semua', 61),
  ('balasan', 'Pakaian pria', 'Sarung & peci', '', 1, 'pcs', 250000, true, 'islam', 62),
  ('balasan', 'Perawatan pria', 'Parfum pria', '', 1, 'pcs', 350000, true, 'semua', 63),
  ('balasan', 'Perawatan pria', 'Skincare pria set', '', 1, 'set', 300000, true, 'semua', 64),
  ('balasan', 'Aksesori', 'Jam tangan', '', 1, 'pcs', 500000, true, 'semua', 65),
  ('balasan', 'Aksesori', 'Dompet pria', '', 1, 'pcs', 250000, true, 'semua', 66),
  ('balasan', 'Aksesori', 'Ikat pinggang', '', 1, 'pcs', 200000, true, 'semua', 67),
  ('balasan', 'Makanan', 'Kue basah / tradisional', '', 1, 'pcs', 300000, true, 'semua', 68),
  ('balasan', 'Makanan', 'Buah', '', 1, 'pcs', 250000, true, 'semua', 69),
  ('balasan', 'Makanan', 'Makanan khas daerah', '', 1, 'pcs', 300000, true, 'semua', 70),
  ('balasan', 'Kotak balasan', 'Kotak hantaran balasan', '', 5, 'kotak', 250000, true, 'semua', 71),
  ('balasan', 'Aksesori', 'Sepatu pria', '', 1, 'pcs', 0, false, 'semua', 72),
  ('balasan', 'Aksesori', 'Tas kerja', '', 1, 'pcs', 0, false, 'semua', 73),
  ('hari_h', 'Dokumen & akad', 'Dokumen asli (KTP, KK, akta)', '', 1, 'map', 0, true, 'semua', 74),
  ('hari_h', 'Dokumen & akad', 'Mahar & cincin nikah', '', 1, 'set', 0, true, 'semua', 75),
  ('hari_h', 'Dokumen & akad', 'Seserahan (cek jumlah kotak)', '', 1, 'set', 0, true, 'semua', 76),
  ('hari_h', 'Dokumen & akad', 'Berkas KUA / pemberkatan', '', 1, 'map', 0, true, 'semua', 77),
  ('hari_h', 'Busana & rias', 'Busana akad', '', 1, 'set', 0, true, 'semua', 78),
  ('hari_h', 'Busana & rias', 'Busana resepsi', '', 1, 'set', 0, true, 'semua', 79),
  ('hari_h', 'Busana & rias', 'Sepatu ganti / sandal', '', 1, 'pasang', 0, true, 'semua', 80),
  ('hari_h', 'Busana & rias', 'Hijab & aksesori rambut', '', 1, 'pcs', 0, true, 'semua', 81),
  ('hari_h', 'Busana & rias', 'Peniti & jarum pentul', '', 1, 'kotak', 0, true, 'semua', 82),
  ('hari_h', 'Kesehatan & darurat', 'Obat pribadi', '', 1, 'pcs', 0, true, 'semua', 83),
  ('hari_h', 'Kesehatan & darurat', 'Minyak kayu putih', '', 1, 'pcs', 0, true, 'semua', 84),
  ('hari_h', 'Kesehatan & darurat', 'Plester & kapas', '', 1, 'pcs', 0, true, 'semua', 85),
  ('hari_h', 'Kesehatan & darurat', 'Tisu basah & kering', '', 1, 'pcs', 0, true, 'semua', 86),
  ('hari_h', 'Kesehatan & darurat', 'Payung', '', 1, 'pcs', 0, true, 'semua', 87),
  ('hari_h', 'Elektronik', 'Charger & powerbank', '', 1, 'pcs', 0, true, 'semua', 88),
  ('hari_h', 'Elektronik', 'HP cadangan', '', 1, 'pcs', 0, true, 'semua', 89),
  ('hari_h', 'Untuk tamu & vendor', 'Amplop uang lelah', '', 10, 'pcs', 0, true, 'semua', 90),
  ('hari_h', 'Untuk tamu & vendor', 'Buku tamu & pulpen', '', 1, 'pcs', 0, true, 'semua', 91),
  ('hari_h', 'Untuk tamu & vendor', 'Kotak angpao', '', 1, 'pcs', 0, true, 'semua', 92),
  ('hari_h', 'Untuk tamu & vendor', 'Daftar kontak vendor', '', 1, 'pcs', 0, true, 'semua', 93),
  ('hari_h', 'Untuk tamu & vendor', 'Rundown cetak', '', 5, 'lembar', 0, true, 'semua', 94),
  ('hari_h', 'Makan & minum', 'Air mineral pengantin', '', 1, 'dus', 0, true, 'semua', 95),
  ('hari_h', 'Makan & minum', 'Camilan', '', 1, 'pcs', 0, true, 'semua', 96),
  ('hari_h', 'Makan & minum', 'Sedotan', '', 1, 'pak', 0, true, 'semua', 97);

insert into public.tpl_documents (religion, party, name, detail, sort) values
  ('semua', 'wanita', 'Fotokopi KTP', '3 lembar', 1),
  ('semua', 'wanita', 'Kartu keluarga', '', 2),
  ('semua', 'wanita', 'Akta kelahiran', '', 3),
  ('islam', 'wanita', 'Formulir N1–N4', 'Dari kelurahan · berlaku 6 bulan', 4),
  ('semua', 'wanita', 'Pas foto 2×3 & 4×6 latar biru', '4 lembar masing-masing', 5),
  ('semua', 'wanita', 'Surat izin orang tua (N5)', 'Bila usia di bawah 21 tahun', 6),
  ('islam', 'wanita', 'Sertifikat Bimwin', '', 7),
  ('semua', 'wanita', 'Surat keterangan sehat / imunisasi TT', 'Bila diminta daerah', 8),
  ('semua', 'pria', 'Fotokopi KTP', '3 lembar', 9),
  ('semua', 'pria', 'Kartu keluarga', '', 10),
  ('semua', 'pria', 'Akta kelahiran', '', 11),
  ('islam', 'pria', 'Formulir N1–N4', 'Dari kelurahan · berlaku 6 bulan', 12),
  ('islam', 'pria', 'Surat rekomendasi nikah', 'Bila domisili beda kecamatan · dari KUA asal', 13),
  ('semua', 'pria', 'Pas foto 2×3 & 4×6 latar biru', '4 lembar masing-masing', 14),
  ('islam', 'pria', 'Sertifikat Bimwin', '', 15),
  ('semua', 'pria', 'Surat keterangan sehat', 'Bila diminta daerah', 16),
  ('islam', 'lainnya', 'KTP wali nikah', '', 17),
  ('semua', 'lainnya', 'KTP 2 saksi', '', 18),
  ('islam', 'lainnya', 'Bukti bayar PNBP', 'Bila akad di luar KUA / luar jam kerja', 19),
  ('semua', 'lainnya', 'Akta cerai / akta kematian', 'Bila pernah menikah', 20),
  ('semua', 'lainnya', 'Izin komandan (TNI/Polri)', 'Bila salah satu anggota TNI/Polri', 21),
  ('lainnya', 'lainnya', 'Surat keterangan pemuka agama', 'Setelah pemberkatan', 22),
  ('lainnya', 'lainnya', 'Formulir pencatatan Disdukcapil', '', 23),
  ('islam', 'lainnya', 'Buku nikah', 'Diterima setelah akad', 24),
  ('lainnya', 'lainnya', 'Akta perkawinan', '', 25),
  ('semua', 'lainnya', 'Kartu keluarga baru', 'Setelah menikah', 26);

insert into public.tpl_selfprep (religion, title, who, freq, total, sort) values
  ('islam', 'Belajar fiqh nikah', 'Berdua', '', 0, 1),
  ('islam', 'Sholat hajat & dzikir rutin', 'Berdua', 'Harian', 0, 2),
  ('lainnya', 'Konseling pranikah', 'Berdua', '', 0, 3),
  ('lainnya', 'Doa bersama pasangan', 'Berdua', 'Mingguan', 0, 4),
  ('semua', 'Pertanyaan pranikah', 'Berdua', '', 40, 5),
  ('semua', 'Sepakati keuangan rumah tangga', 'Berdua', '', 0, 6),
  ('semua', 'Saling kenal keluarga besar', 'Berdua', '', 0, 7),
  ('semua', 'Cek kesehatan pranikah', 'Berdua', '', 0, 8),
  ('semua', 'Rencana tempat tinggal', 'Berdua', '', 0, 9),
  ('islam', 'Sedekah sebelum akad', 'Berdua', '', 0, 10);

-- ===== migrations/0004_revoke_anon_helpers.sql =====
-- Fungsi bantu hak akses hanya untuk pengguna yang sudah masuk
revoke execute on function public.member_role(uuid) from public, anon;
revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.can_edit(uuid) from public, anon;
revoke execute on function public.is_owner(uuid) from public, anon;
grant execute on function public.member_role(uuid) to authenticated;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.can_edit(uuid) to authenticated;
grant execute on function public.is_owner(uuid) to authenticated;

-- ===== migrations/0005_fit_budget.sql =====
-- Rencana awal disesuaikan dengan total anggaran yang diisi pengguna
alter function public.create_wedding(jsonb) rename to create_wedding_core;
revoke execute on function public.create_wedding_core(jsonb) from public, anon, authenticated;

create or replace function public.create_wedding(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  wid uuid;
  v_budget bigint;
  v_gift bigint;
  v_items bigint;
  f numeric;
begin
  wid := public.create_wedding_core(p);
  select total_budget, gift_budget into v_budget, v_gift from public.weddings where id = wid;
  select coalesce(sum(planned), 0) into v_items from public.budget_items where wedding_id = wid;
  if v_budget > 0 and v_items > 0 then
    f := (v_budget * 0.96 - v_gift) / v_items;
    if f > 0.2 then
      perform set_config('app.seeding', '1', true);
      update public.budget_items
         set planned = greatest(round(planned * f / 50000.0) * 50000, case when planned > 0 then 50000 else 0 end)
       where wedding_id = wid;
      perform set_config('app.seeding', '0', true);
    end if;
  end if;
  return wid;
end $$;
revoke execute on function public.create_wedding(jsonb) from public, anon;
grant execute on function public.create_wedding(jsonb) to authenticated;
