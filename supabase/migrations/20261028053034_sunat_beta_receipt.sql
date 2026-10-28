-- Datos beta separados de comprobantes y series reales.
alter table public.ef_sunat_beta_pruebas
 add column document_type text not null default '01' check (document_type in ('01','03')),
 add column ticket text check (ticket ~ '^[0-9]{1,128}$'),
 add column summary_id text check (summary_id ~ '^RC-[0-9]{8}-[1-9][0-9]{0,4}$');

create function public.ef_sunat_beta_reservar(p_empresa_id uuid, p_idempotency_key uuid, p_document_type text)
returns public.ef_sunat_beta_pruebas
language plpgsql security definer set search_path = '' as $$
declare v_job public.ef_sunat_beta_pruebas; begin
  if auth.uid() is null or not exists (
    select 1 from public.rest_miembros m where m.empresa_id = p_empresa_id
    and m.user_id = auth.uid() and m.activo and m.rol in ('propietario','administrador')
  ) then raise exception 'Solo administradores activos de esta empresa'; end if;
  if p_document_type is null or p_document_type not in ('01','03') then raise exception 'Tipo beta inválido'; end if;
  if p_idempotency_key is null then raise exception 'Clave de idempotencia obligatoria'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_empresa_id::text, 0));
  select * into v_job from public.ef_sunat_beta_pruebas where empresa_id = p_empresa_id and idempotency_key = p_idempotency_key;
  if found then
    if v_job.document_type <> p_document_type then raise exception 'Clave de otro tipo'; end if;
    return v_job;
  end if;
  if exists (select 1 from public.ef_sunat_beta_pruebas where empresa_id = p_empresa_id
    and (estado in ('pendiente','enviando') or created_at > now() - interval '1 minute'))
    then raise exception 'Prueba en curso o demasiado reciente'; end if;
  insert into public.ef_sunat_beta_pruebas(empresa_id, creado_por, idempotency_key, document_type)
  values (p_empresa_id, auth.uid(), p_idempotency_key, p_document_type) returning * into v_job;
  return v_job;
end $$;
revoke all on function public.ef_sunat_beta_reservar(uuid,uuid,text) from public, anon;
grant execute on function public.ef_sunat_beta_reservar(uuid,uuid,text) to authenticated;


-- Compatibilidad con clientes anteriores; también comprueba el tipo de la clave.
create or replace function public.ef_sunat_beta_reservar(p_empresa_id uuid, p_idempotency_key uuid)
returns public.ef_sunat_beta_pruebas
language sql security invoker set search_path = '' as $$
 select public.ef_sunat_beta_reservar(p_empresa_id, p_idempotency_key, '01');
$$;
