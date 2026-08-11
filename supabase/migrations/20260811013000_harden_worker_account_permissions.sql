-- La comprobación administrativa solo debe poder invocarse con sesión autenticada.
revoke all on function public.rest_es_admin(uuid) from public;
revoke all on function public.rest_es_admin(uuid) from anon;
grant execute on function public.rest_es_admin(uuid) to authenticated;
