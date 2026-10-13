-- Managed pg_net tables are owned by supabase_admin and have PUBLIC transport ACLs.
-- The postgres role cannot revoke that owner's grants. Never send permanent secrets.
create table public.ef_sunat_worker_nonces(nonce uuid primary key,created_at timestamptz not null default now());
alter table public.ef_sunat_worker_nonces enable row level security;
revoke all on public.ef_sunat_worker_nonces from public,anon,authenticated;
grant all on public.ef_sunat_worker_nonces to service_role;
create or replace function public.ef_sunat_consumir_nonce(p_nonce uuid,p_timestamp bigint) returns boolean language plpgsql security invoker set search_path=public as $$
begin
 if abs(extract(epoch from clock_timestamp())*1000-p_timestamp)>60000 then return false;end if;
 delete from ef_sunat_worker_nonces where created_at<now()-interval '2 minutes';
 insert into ef_sunat_worker_nonces(nonce)values(p_nonce) on conflict do nothing;
 return found;
end$$;
revoke all on function public.ef_sunat_consumir_nonce(uuid,bigint) from public,anon,authenticated;
grant execute on function public.ef_sunat_consumir_nonce(uuid,bigint) to service_role;
-- Rotate the credential used by the earlier connectivity probe; key stays inside Vault.
select vault.update_secret(secret_id:=id,new_secret:=encode(extensions.gen_random_bytes(32),'hex')) from vault.secrets where name='huerta_sunat_worker_v1';
select cron.schedule('huerta-sunat-worker','10 seconds',$cron$
 with request as materialized(select floor(extract(epoch from clock_timestamp())*1000)::bigint::text as stamp,gen_random_uuid()::text as nonce)
 select net.http_post(
  url:='https://ksmraxusmcwwzpoyhtqv.supabase.co/functions/v1/electronic-billing-worker',
  headers:=jsonb_build_object('Content-Type','application/json','x-sunat-worker-time',stamp,'x-sunat-worker-nonce',nonce,'x-sunat-worker-signature',encode(extensions.hmac(stamp||':'||nonce,(select decrypted_secret from vault.decrypted_secrets where name='huerta_sunat_worker_v1' limit 1),'sha256'),'hex')),
  body:='{}'::jsonb,timeout_milliseconds:=10000
 ) from request where exists(select 1 from public.ef_sunat_trabajos where (estado='queued' and disponible_at<=now()) or (estado='processing' and lease_until<now()))
 and (select count(*) from public.ef_sunat_trabajos where estado='processing' and lease_until>=now())<2;
$cron$);
