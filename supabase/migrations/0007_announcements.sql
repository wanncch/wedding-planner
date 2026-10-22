-- v3.1: Pengumuman dari admin ke pelanggan
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  level text not null default 'info' check (level in ('info','promo','penting')),
  audience text not null default 'all' check (audience in ('all','trial','paid','expired')),
  link_label text not null default '',
  link_url text not null default '',
  is_active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
create policy ann_read on public.announcements for select to authenticated
  using (public.is_admin() or (is_active and starts_at <= now() and (ends_at is null or ends_at > now())));
create policy ann_admin on public.announcements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.log_announcement()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.admin_log (admin_id, action, detail)
  values ((select auth.uid()), case tg_op when 'INSERT' then 'buat pengumuman' when 'UPDATE' then 'ubah pengumuman' else 'hapus pengumuman' end,
          jsonb_build_object('title', coalesce(new.title, old.title)));
  return coalesce(new, old);
end $$;
drop trigger if exists announcements_log on public.announcements;
create trigger announcements_log after insert or update or delete on public.announcements
  for each row execute function public.log_announcement();
revoke execute on function public.log_announcement() from public, anon, authenticated;
