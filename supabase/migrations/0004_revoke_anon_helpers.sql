-- Fungsi bantu hak akses hanya untuk pengguna yang sudah masuk
revoke execute on function public.member_role(uuid) from public, anon;
revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.can_edit(uuid) from public, anon;
revoke execute on function public.is_owner(uuid) from public, anon;
grant execute on function public.member_role(uuid) to authenticated;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.can_edit(uuid) to authenticated;
grant execute on function public.is_owner(uuid) to authenticated;
