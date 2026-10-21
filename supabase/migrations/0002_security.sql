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
