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
