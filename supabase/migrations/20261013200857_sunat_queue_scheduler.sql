-- Only wake the internal worker if durable jobs are due. Never store a key in cron text.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
select cron.schedule('huerta-sunat-worker','10 seconds',$cron$
 select net.http_post(
  url:='https://ksmraxusmcwwzpoyhtqv.supabase.co/functions/v1/electronic-billing-worker',
  headers:=jsonb_build_object('Content-Type','application/json','x-sunat-worker-key',(select decrypted_secret from vault.decrypted_secrets where name='huerta_sunat_worker_v1' limit 1)),
  body:='{}'::jsonb,
  timeout_milliseconds:=10000
 ) where exists(select 1 from public.ef_sunat_trabajos where (estado='queued' and disponible_at<=now()) or (estado='processing' and lease_until<now()))
 and (select count(*) from public.ef_sunat_trabajos where estado='processing' and lease_until>=now())<2;
$cron$);
