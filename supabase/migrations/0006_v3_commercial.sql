-- v3: ikon & warna kategori seserahan, sistem langganan, Pusat Kontrol admin

-- =====================================================================
-- Ikon & warna kategori seserahan
-- =====================================================================
alter table public.gift_categories add column if not exists icon text not null default 'kado';
alter table public.gift_categories add column if not exists color text not null default 'k1';

create or replace function public.gift_style(p_name text, p_sort int)
returns text[] language sql immutable set search_path = '' as $$
  select case
    when p_name ~* 'mahar|akad|cincin|perhiasan' then array['cincin','k1']
    when p_name ~* 'ibadah|sholat|mukena' then array['ibadah','k2']
    when p_name ~* 'dalam|tidur|piyama' then array['bulan','k4']
    when p_name ~* 'pakaian|baju|busana' then array['baju','k3']
    when p_name ~* 'skincare|makeup|kosmetik' then array['botol','k5']
    when p_name ~* 'body|mandi|perawatan' then array['tetes','k6']
    when p_name ~* 'tas|sepatu|dompet' then array['tas','k7']
    when p_name ~* 'rumah|dapur' then array['rumah','k8']
    when p_name ~* 'kue|buah|makan|minum' then array['kue','k9']
    when p_name ~* 'kotak|hantaran|kemasan' then array['kado','k10']
    when p_name ~* 'aksesori|jam' then array['jam','k5']
    when p_name ~* 'dokumen' then array['buku','k2']
    when p_name ~* 'kesehatan|darurat|obat' then array['hati','k8']
    when p_name ~* 'elektronik|charger' then array['bintang','k6']
    when p_name ~* 'tamu|vendor|amplop' then array['uang','k3']
    else array['kado', 'k' || ((coalesce(p_sort, 0) % 10) + 1)::text]
  end
$$;

create or replace function public.gift_category_defaults()
returns trigger language plpgsql set search_path = '' as $$
declare s text[];
begin
  if tg_op = 'INSERT' and (new.icon is null or new.icon = 'kado') and (new.color is null or new.color = 'k1') then
    s := public.gift_style(new.name, new.sort);
    new.icon := s[1]; new.color := s[2];
  end if;
  return new;
end $$;
drop trigger if exists gift_categories_defaults on public.gift_categories;
create trigger gift_categories_defaults before insert on public.gift_categories
  for each row execute function public.gift_category_defaults();

update public.gift_categories g
   set icon = (public.gift_style(g.name, g.sort))[1], color = (public.gift_style(g.name, g.sort))[2];

-- =====================================================================
-- Admin, paket, langganan, pembayaran
-- =====================================================================
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.plans (
  id text primary key,
  name text not null,
  price bigint not null default 0 check (price >= 0),
  duration_days int,                     -- null = sampai hari H + 30 hari
  max_weddings int not null default 1,
  description text not null default '',
  is_active boolean not null default true,
  sort int not null default 0
);

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users on delete cascade,
  plan_id text not null references public.plans(id) default 'trial',
  status text not null default 'trial' check (status in ('trial','active','expired','blocked')),
  valid_until timestamptz,
  note text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  plan_id text not null references public.plans(id),
  amount bigint not null check (amount >= 0),
  method text not null default '',
  proof_url text not null default '',
  note text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text not null default '',
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists payment_requests_user_idx on public.payment_requests (user_id);
create index if not exists payment_requests_status_idx on public.payment_requests (status, created_at desc);

create table if not exists public.app_settings (
  key text primary key,
  value text not null default ''
);

create table if not exists public.admin_log (
  id bigint generated always as identity primary key,
  admin_id uuid,
  action text not null,
  target_user uuid,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);

insert into public.plans (id, name, price, duration_days, max_weddings, description, sort) values
  ('trial', 'Trial', 0, 14, 1, '14 hari · 1 pernikahan · semua fitur', 1),
  ('premium', 'Premium', 149000, null, 1, '1 pernikahan · sampai hari H + 30 hari', 2),
  ('wo', 'Vendor / WO', 499000, 365, 10, 'sampai 10 pernikahan klien · 1 tahun', 3)
on conflict (id) do nothing;

insert into public.app_settings (key, value) values
  ('pay_instructions', 'Transfer ke rekening di bawah, lalu upload bukti bayar. Premium aktif setelah dicek admin.'),
  ('bank_accounts', ''),
  ('qris_url', ''),
  ('contact_wa', '')
on conflict (key) do nothing;

-- Fungsi bantu
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()))
$$;

create or replace function public.account_active(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select s.status in ('trial','active') and (s.valid_until is null or s.valid_until > now())
    from public.subscriptions s where s.user_id = p_user), false)
  or exists (select 1 from public.platform_admins a where a.user_id = p_user)
$$;

create or replace function public.wedding_active(w uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.wedding_members m
                 where m.wedding_id = w and m.role = 'owner' and public.account_active(m.user_id))
$$;

-- Edit hanya bila akun pemilik pernikahan masih aktif (trial / premium). Data tetap bisa dibaca.
create or replace function public.can_edit(w uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.wedding_members m
                 where m.wedding_id = w and m.user_id = (select auth.uid())
                   and m.role in ('owner','editor'))
     and public.wedding_active(w)
$$;

-- Akun baru otomatis trial
create or replace function public.start_trial()
returns trigger language plpgsql security definer set search_path = '' as $$
declare d int;
begin
  select duration_days into d from public.plans where id = 'trial';
  insert into public.subscriptions (user_id, plan_id, status, valid_until)
  values (new.id, 'trial', 'trial', now() + make_interval(days => coalesce(d, 14)))
  on conflict (user_id) do nothing;
  return new;
end $$;
drop trigger if exists profiles_start_trial on public.profiles;
create trigger profiles_start_trial after insert on public.profiles
  for each row execute function public.start_trial();

-- Akun yang sudah ada: trial 14 hari dari sekarang
insert into public.subscriptions (user_id, plan_id, status, valid_until)
select id, 'trial', 'trial', now() + interval '14 days' from auth.users
on conflict (user_id) do nothing;

-- Pembuatan pernikahan: cek akun aktif & batas jumlah pernikahan
create or replace function public.create_wedding(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  wid uuid;
  v_budget bigint; v_gift bigint; v_items bigint; f numeric;
  v_max int; v_have int;
begin
  if uid is null then raise exception 'Silakan masuk dulu'; end if;
  if not public.account_active(uid) then
    raise exception 'Masa trial / langganan sudah habis. Upgrade ke Premium untuk membuat pernikahan baru.';
  end if;
  select coalesce(p2.max_weddings, 1) into v_max
    from public.subscriptions s join public.plans p2 on p2.id = s.plan_id where s.user_id = uid;
  select count(*) into v_have from public.wedding_members where user_id = uid and role = 'owner';
  if not public.is_admin() and v_have >= coalesce(v_max, 1) then
    raise exception 'Paketmu hanya untuk % pernikahan. Hubungi admin untuk menambah.', coalesce(v_max, 1);
  end if;

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
  -- Premium per pernikahan: berlaku sampai hari H + 30
  update public.subscriptions s set valid_until = (select (w.wedding_date + 30)::timestamptz from public.weddings w where w.id = wid)
   where s.user_id = uid and s.status = 'active' and s.plan_id = 'premium' and s.valid_until is null;
  return wid;
end $$;

-- RLS
alter table public.platform_admins enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_requests enable row level security;
alter table public.app_settings enable row level security;
alter table public.admin_log enable row level security;

create policy admins_self on public.platform_admins for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy plans_read on public.plans for select to authenticated using (true);
create policy plans_admin on public.plans for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy subs_read on public.subscriptions for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy pay_read on public.payment_requests for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy pay_insert on public.payment_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending' and decided_by is null);
create policy settings_read on public.app_settings for select to authenticated using (true);
create policy settings_admin on public.app_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy adminlog_read on public.admin_log for select to authenticated using (public.is_admin());

-- File bukti bayar: wedding-files/payments/<user_id>/...
create policy files_pay_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'wedding-files' and split_part(name, '/', 1) = 'payments' and split_part(name, '/', 2) = (select auth.uid())::text);
create policy files_pay_select on storage.objects for select to authenticated
  using (bucket_id = 'wedding-files' and split_part(name, '/', 1) = 'payments'
         and (split_part(name, '/', 2) = (select auth.uid())::text or public.is_admin()));
-- File bersama milik admin (mis. gambar QRIS): wedding-files/public/...
create policy files_public_select on storage.objects for select to authenticated
  using (bucket_id = 'wedding-files' and split_part(name, '/', 1) = 'public');
create policy files_public_admin on storage.objects for insert to authenticated
  with check (bucket_id = 'wedding-files' and split_part(name, '/', 1) = 'public' and public.is_admin());

-- =====================================================================
-- RPC pelanggan
-- =====================================================================
create or replace function public.my_account()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'is_admin', public.is_admin(),
    'active', public.account_active((select auth.uid())),
    'plan_id', s.plan_id, 'plan_name', p.name, 'status', s.status, 'valid_until', s.valid_until,
    'max_weddings', p.max_weddings,
    'days_left', case when s.valid_until is null then null else greatest(0, ceil(extract(epoch from (s.valid_until - now())) / 86400))::int end,
    'pending', (select count(*) from public.payment_requests r where r.user_id = (select auth.uid()) and r.status = 'pending'))
  from public.subscriptions s join public.plans p on p.id = s.plan_id
  where s.user_id = (select auth.uid())
$$;

-- =====================================================================
-- RPC admin (semua dicek is_admin, semua aksi tercatat)
-- =====================================================================
create or replace function public.admin_guard()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Khusus admin' using errcode = '42501'; end if;
end $$;

create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
begin
  perform public.admin_guard();
  select jsonb_build_object(
    'total', (select count(*) from auth.users),
    'new_week', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'premium', (select count(*) from public.subscriptions where status = 'active' and (valid_until is null or valid_until > now())),
    'trial', (select count(*) from public.subscriptions where status = 'trial' and valid_until > now()),
    'trial_ending', (select count(*) from public.subscriptions where status = 'trial' and valid_until between now() and now() + interval '7 days'),
    'expired', (select count(*) from public.subscriptions where status = 'expired' or (status in ('trial','active') and valid_until <= now())),
    'blocked', (select count(*) from public.subscriptions where status = 'blocked'),
    'weddings', (select count(*) from public.weddings),
    'revenue_month', (select coalesce(sum(amount), 0) from public.payment_requests where status = 'approved' and decided_at >= date_trunc('month', now())),
    'revenue_total', (select coalesce(sum(amount), 0) from public.payment_requests where status = 'approved'),
    'monthly', (select coalesce(jsonb_agg(jsonb_build_object('m', to_char(m, 'YYYY-MM'), 'n', n, 'rev', rev) order by m), '[]'::jsonb) from (
        select gs as m,
               (select count(*) from public.payment_requests q where q.status = 'approved' and date_trunc('month', q.decided_at) = gs) n,
               (select coalesce(sum(amount), 0) from public.payment_requests q where q.status = 'approved' and date_trunc('month', q.decided_at) = gs) rev
        from generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') gs) x),
    'pending', (select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'user_id', q.user_id, 'email', u.email,
        'name', coalesce(pr.display_name, ''), 'plan_id', q.plan_id, 'amount', q.amount, 'method', q.method,
        'proof_url', q.proof_url, 'note', q.note, 'created_at', q.created_at) order by q.created_at), '[]'::jsonb)
      from public.payment_requests q join auth.users u on u.id = q.user_id left join public.profiles pr on pr.id = q.user_id
      where q.status = 'pending')
  ) into r;
  return r;
end $$;

create or replace function public.admin_list_users()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_guard();
  return (select coalesce(jsonb_agg(row_to_json(x) order by x.created_at desc), '[]'::jsonb) from (
    select u.id, u.email, coalesce(p.display_name, '') as name, u.created_at, u.last_sign_in_at,
           coalesce(s.plan_id, 'trial') as plan_id, coalesce(s.status, 'trial') as status, s.valid_until, s.note,
           (s.status in ('trial','active') and (s.valid_until is null or s.valid_until > now())) as active,
           exists (select 1 from public.platform_admins a where a.user_id = u.id) as is_admin,
           (select count(*) from public.wedding_members m where m.user_id = u.id and m.role = 'owner') as weddings,
           (select count(*) from public.wedding_members m where m.user_id = u.id and m.role <> 'owner') as joined
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.subscriptions s on s.user_id = u.id) x);
end $$;

create or replace function public.admin_user_detail(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_guard();
  return jsonb_build_object(
    'payments', (select coalesce(jsonb_agg(row_to_json(q) order by q.created_at desc), '[]'::jsonb) from public.payment_requests q where q.user_id = p_user),
    'weddings', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', w.id, 'couple', w.bride_name || ' & ' || w.groom_name, 'date', w.wedding_date, 'role', m.role,
        'members', (select count(*) from public.wedding_members x where x.wedding_id = w.id),
        'tasks', (select count(*) from public.tasks t where t.wedding_id = w.id),
        'gifts', (select count(*) from public.gift_items g where g.wedding_id = w.id),
        'guests', (select count(*) from public.guests g where g.wedding_id = w.id)) order by w.wedding_date), '[]'::jsonb)
      from public.wedding_members m join public.weddings w on w.id = m.wedding_id where m.user_id = p_user),
    'log', (select coalesce(jsonb_agg(jsonb_build_object('action', l.action, 'detail', l.detail, 'at', l.created_at) order by l.created_at desc), '[]'::jsonb)
      from (select * from public.admin_log where target_user = p_user order by created_at desc limit 20) l));
end $$;

create or replace function public.admin_set_subscription(p_user uuid, p_plan text, p_status text, p_until timestamptz, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.admin_guard();
  if p_status not in ('trial','active','expired','blocked') then raise exception 'Status tidak dikenal'; end if;
  insert into public.subscriptions (user_id, plan_id, status, valid_until, note, updated_at)
  values (p_user, p_plan, p_status, p_until, coalesce(p_note, ''), now())
  on conflict (user_id) do update set plan_id = excluded.plan_id, status = excluded.status, valid_until = excluded.valid_until,
     note = coalesce(p_note, public.subscriptions.note), updated_at = now();
  -- Blokir = tidak bisa login
  update auth.users set banned_until = case when p_status = 'blocked' then 'infinity'::timestamptz else null end where id = p_user;
  insert into public.admin_log (admin_id, action, target_user, detail)
  values ((select auth.uid()), 'ubah langganan', p_user, jsonb_build_object('plan', p_plan, 'status', p_status, 'until', p_until));
end $$;

create or replace function public.admin_record_payment(p_user uuid, p_plan text, p_amount bigint, p_method text, p_note text, p_until timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.admin_guard();
  insert into public.payment_requests (user_id, plan_id, amount, method, note, status, decided_by, decided_at)
  values (p_user, p_plan, p_amount, coalesce(p_method, ''), coalesce(p_note, ''), 'approved', (select auth.uid()), now());
  perform public.admin_set_subscription(p_user, p_plan, 'active', p_until, null);
  insert into public.admin_log (admin_id, action, target_user, detail)
  values ((select auth.uid()), 'catat pembayaran', p_user, jsonb_build_object('plan', p_plan, 'amount', p_amount));
end $$;

create or replace function public.admin_decide_payment(p_id uuid, p_approve boolean, p_note text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare q public.payment_requests; pl public.plans; v_until timestamptz;
begin
  perform public.admin_guard();
  select * into q from public.payment_requests where id = p_id for update;
  if q.id is null or q.status <> 'pending' then raise exception 'Pembayaran sudah diproses'; end if;
  update public.payment_requests set status = case when p_approve then 'approved' else 'rejected' end,
         admin_note = coalesce(p_note, ''), decided_by = (select auth.uid()), decided_at = now() where id = p_id;
  if p_approve then
    select * into pl from public.plans where id = q.plan_id;
    if pl.duration_days is not null then
      v_until := greatest(now(), coalesce((select valid_until from public.subscriptions where user_id = q.user_id and status = 'active'), now()))
                 + make_interval(days => pl.duration_days);
    else
      v_until := (select (max(w.wedding_date) + 30)::timestamptz from public.wedding_members m join public.weddings w on w.id = m.wedding_id
                  where m.user_id = q.user_id and m.role = 'owner');
    end if;
    perform public.admin_set_subscription(q.user_id, q.plan_id, 'active', v_until, null);
  end if;
  insert into public.admin_log (admin_id, action, target_user, detail)
  values ((select auth.uid()), case when p_approve then 'setujui pembayaran' else 'tolak pembayaran' end, q.user_id,
          jsonb_build_object('amount', q.amount, 'plan', q.plan_id, 'note', p_note));
end $$;

create or replace function public.admin_delete_user(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.admin_guard();
  if p_user = (select auth.uid()) then raise exception 'Tidak bisa menghapus akun sendiri'; end if;
  insert into public.admin_log (admin_id, action, target_user, detail)
  values ((select auth.uid()), 'hapus akun', p_user, jsonb_build_object('email', (select email from auth.users where id = p_user)));
  delete from public.weddings w using public.wedding_members m
   where m.wedding_id = w.id and m.user_id = p_user and m.role = 'owner';
  delete from auth.users where id = p_user;
end $$;

-- Hak eksekusi
do $$
declare f text;
begin
  foreach f in array array['my_account()','admin_overview()','admin_list_users()','admin_user_detail(uuid)',
    'admin_set_subscription(uuid,text,text,timestamptz,text)','admin_record_payment(uuid,text,bigint,text,text,timestamptz)',
    'admin_decide_payment(uuid,boolean,text)','admin_delete_user(uuid)','is_admin()','account_active(uuid)','wedding_active(uuid)',
    'admin_guard()','create_wedding(jsonb)']
  loop
    execute 'revoke execute on function public.' || f || ' from public, anon';
    execute 'grant execute on function public.' || f || ' to authenticated';
  end loop;
end $$;
revoke execute on function public.start_trial() from public, anon, authenticated;
