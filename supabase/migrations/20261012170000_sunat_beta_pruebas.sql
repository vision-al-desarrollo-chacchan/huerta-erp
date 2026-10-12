-- Solo pruebas SUNAT con datos ficticios. No altera comprobantes, ventas, caja ni series.
create table public.ef_sunat_beta_pruebas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.rest_empresas(id) on delete cascade,
  creado_por uuid not null references auth.users(id),
  idempotency_key uuid not null,
  ambiente text not null default 'beta' check (ambiente = 'beta'),
  estado text not null default 'pendiente' check (estado in ('pendiente','enviando','aceptado','observado','rechazado','error','incierto')),
  codigo_sunat text,
  mensaje_sunat text,
  observaciones jsonb not null default '[]'::jsonb,
  xml_path text,
  cdr_path text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  unique (empresa_id, idempotency_key)
);
alter table public.ef_sunat_beta_pruebas enable row level security;
revoke all on public.ef_sunat_beta_pruebas from public, anon, authenticated;
grant select on public.ef_sunat_beta_pruebas to authenticated;
grant all on public.ef_sunat_beta_pruebas to service_role;
create policy ef_sunat_beta_lectura on public.ef_sunat_beta_pruebas
for select to authenticated using (exists (
  select 1 from public.rest_miembros m where m.empresa_id = ef_sunat_beta_pruebas.empresa_id
  and m.user_id = auth.uid() and m.activo and m.rol in ('propietario','administrador')
));

create function public.ef_sunat_beta_reservar(p_empresa_id uuid, p_idempotency_key uuid)
returns public.ef_sunat_beta_pruebas
language plpgsql security definer set search_path = '' as $$
declare v_job public.ef_sunat_beta_pruebas; begin
  if auth.uid() is null or not exists (
    select 1 from public.rest_miembros m where m.empresa_id = p_empresa_id
    and m.user_id = auth.uid() and m.activo and m.rol in ('propietario','administrador')
  ) then raise exception 'Solo administradores activos de esta empresa'; end if;
  if p_idempotency_key is null then raise exception 'Clave de idempotencia obligatoria'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_empresa_id::text, 0));
  select * into v_job from public.ef_sunat_beta_pruebas where empresa_id = p_empresa_id and idempotency_key = p_idempotency_key;
  if found then return v_job; end if;
  if exists (select 1 from public.ef_sunat_beta_pruebas where empresa_id = p_empresa_id
    and (estado in ('pendiente','enviando') or created_at > now() - interval '1 minute'))
    then raise exception 'Prueba en curso o demasiado reciente'; end if;
  insert into public.ef_sunat_beta_pruebas(empresa_id, creado_por, idempotency_key)
  values (p_empresa_id, auth.uid(), p_idempotency_key) returning * into v_job;
  return v_job;
end $$;
revoke all on function public.ef_sunat_beta_reservar(uuid,uuid) from public, anon;
grant execute on function public.ef_sunat_beta_reservar(uuid,uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('sunat-beta-pruebas','sunat-beta-pruebas',false,5000000,array['application/xml','application/zip']);
create policy sunat_beta_artifact_lectura on storage.objects for select to authenticated
using (bucket_id = 'sunat-beta-pruebas' and exists (
  select 1 from public.rest_miembros m where m.empresa_id::text = (storage.foldername(name))[1]
  and m.user_id = auth.uid() and m.activo and m.rol in ('propietario','administrador')
));
