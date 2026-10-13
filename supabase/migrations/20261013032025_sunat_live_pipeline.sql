-- SUNAT únicamente. Clave dedicada protegida por Vault, sin devolverla al navegador.
create schema if not exists sunat_private;
revoke all on schema sunat_private from public,anon,authenticated;
grant usage on schema sunat_private to service_role;
do $$ begin
  if not exists(select 1 from vault.secrets where name='huerta_sunat_key_v1') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32),'base64'),'huerta_sunat_key_v1','Clave dedicada SUNAT AES-256-GCM v1');
  end if;
end $$;
create or replace function sunat_private.backend_key() returns text
language sql security definer set search_path='' as $$
  select decrypted_secret from vault.decrypted_secrets where name='huerta_sunat_key_v1';
$$;
revoke all on function sunat_private.backend_key() from public,anon,authenticated;
grant execute on function sunat_private.backend_key() to service_role;
create or replace function public.ef_sunat_backend_key() returns text
language sql security invoker set search_path='' as $$ select sunat_private.backend_key(); $$;
revoke all on function public.ef_sunat_backend_key() from public,anon,authenticated;
grant execute on function public.ef_sunat_backend_key() to service_role;

create table public.ef_sunat_sol (
 empresa_id uuid primary key references public.rest_empresas(id) on delete cascade,
 ruc text not null check(ruc ~ '^\d{11}$'),
 envelope text not null check(length(envelope) between 40 and 5000),
 key_id text not null default 'v1' check(key_id='v1'),
 updated_at timestamptz not null default now()
);
alter table public.ef_sunat_sol enable row level security;
revoke all on public.ef_sunat_sol from public,anon,authenticated;
grant select,insert,update on public.ef_sunat_sol to service_role;
create or replace function public.ef_sunat_guardar_sol(p_empresa_id uuid,p_usuario_id uuid,p_ruc text,p_usuario_sol text,p_envelope text)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.rest_empresas e join public.rest_miembros m on m.empresa_id=e.id where e.id=p_empresa_id and e.activa and e.ruc=p_ruc and m.user_id=p_usuario_id and m.activo and m.rol in('propietario','administrador')) then raise exception 'Sin autorización fiscal'; end if;
 if p_usuario_sol !~ '^[A-Za-z0-9]{1,30}$' then raise exception 'Usuario SOL inválido'; end if;
 insert into public.ef_sunat_sol(empresa_id,ruc,envelope) values(p_empresa_id,p_ruc,p_envelope)
 on conflict(empresa_id) do update set ruc=excluded.ruc,envelope=excluded.envelope,updated_at=now();
 insert into public.ef_configuraciones(empresa_id,usuario_sol,clave_sol_configurada,activo)
 values(p_empresa_id,p_usuario_sol,true,false)
 on conflict(empresa_id) do update set usuario_sol=excluded.usuario_sol,clave_sol_configurada=true,activo=false,updated_at=now();
end $$;
revoke all on function public.ef_sunat_guardar_sol(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.ef_sunat_guardar_sol(uuid,uuid,text,text,text) to service_role;

-- Estado incierto para impedir reenvíos tras timeout o caída del proceso.
alter table public.ef_documentos drop constraint if exists ef_documentos_estado_check;
alter table public.ef_documentos add constraint ef_documentos_estado_check check(estado in('pendiente','enviando','aceptado','observado','rechazado','anulado','error','incierto'));
alter table public.ef_documentos add column transmision_iniciada_at timestamptz;
alter table public.ef_documentos add column emisor_ruc text;
alter table public.ef_documentos add column ambiente_envio text check(ambiente_envio in('pruebas','produccion'));
alter table public.ef_documentos add column borrador_snapshot jsonb;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('sunat-comprobantes','sunat-comprobantes',false,5000000,array['application/xml','application/zip']) on conflict(id) do nothing;
create policy sunat_comprobantes_lectura on storage.objects for select to authenticated
using(bucket_id='sunat-comprobantes' and exists(select 1 from public.rest_miembros m where m.empresa_id::text=(storage.foldername(name))[1] and m.user_id=auth.uid() and m.activo));

-- Solo se pueden leer metadatos; el material cifrado no se expone por REST.
revoke select on public.ef_configuraciones from authenticated;
grant select(id,empresa_id,proveedor,ambiente,ruta_pruebas,ruta_produccion,usuario_sol,certificado_nombre,certificado_vence_at,token_configurado,clave_sol_configurada,certificado_configurado,activo,updated_at) on public.ef_configuraciones to authenticated;
