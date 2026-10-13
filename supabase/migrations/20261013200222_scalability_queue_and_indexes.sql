-- Bounded, durable SUNAT queue. Browser cannot claim or inspect internal jobs.
create table public.ef_sunat_trabajos (
 documento_id uuid primary key references public.ef_documentos(id) on delete cascade,
 usuario_id uuid not null references auth.users(id),
 accion text not null default 'enviar' check(accion in('enviar','consultar')),
 estado text not null default 'queued' check(estado in('queued','processing','done','blocked')),
 consultas integer not null default 0,
 disponible_at timestamptz not null default now(),
 lease_until timestamptz, lease_token uuid,
 updated_at timestamptz not null default now()
);
alter table public.ef_sunat_trabajos enable row level security;
revoke all on public.ef_sunat_trabajos from public,anon,authenticated;
grant all on public.ef_sunat_trabajos to service_role;
create index ef_sunat_trabajos_cola_idx on public.ef_sunat_trabajos(disponible_at) where estado='queued';
create or replace function public.ef_sunat_encolar(p_documento_id uuid,p_usuario_id uuid) returns text language plpgsql security invoker set search_path=public as $$
declare d public.ef_documentos;begin
 select * into d from public.ef_documentos where id=p_documento_id for update;
 if d.id is null or not exists(select 1 from rest_miembros where empresa_id=d.empresa_id and user_id=p_usuario_id and activo and rol in('propietario','administrador','cajero','moza_cajera','supervisor')) then raise exception 'Sin acceso';end if;
 if d.estado not in('pendiente','error') or d.transmision_iniciada_at is not null then return d.estado;end if;
 if not exists(select 1 from ef_configuraciones c join ef_sunat_habilitaciones h using(empresa_id) join ef_sunat_certificados k using(empresa_id) join rest_empresas e on e.id=c.empresa_id where c.empresa_id=d.empresa_id and c.activo and c.ambiente='produccion' and c.proveedor='sunat' and e.activa and h.aprobada and h.revisada_at is not null and h.ruc=e.ruc and h.certificado_huella=k.huella) then raise exception 'Empresa no habilitada';end if;
 insert into ef_sunat_trabajos(documento_id,usuario_id)values(d.id,p_usuario_id)
 on conflict(documento_id)do update set estado='queued',accion='enviar',usuario_id=excluded.usuario_id,consultas=0,disponible_at=now(),lease_until=null,lease_token=null,updated_at=now() where ef_sunat_trabajos.estado in('done','blocked');
 update ef_documentos set estado='pendiente' where id=d.id;
 return 'pendiente';end$$;
create or replace function public.ef_sunat_tomar_trabajos() returns setof public.ef_sunat_trabajos language plpgsql security invoker set search_path=public as $$
declare capacity integer;begin
 -- All worker instances share a global concurrency budget.
 perform pg_advisory_xact_lock(73492041);
 update ef_sunat_trabajos j set estado=case when d.transmision_iniciada_at is null then 'queued' else 'blocked' end,lease_until=null,lease_token=null,updated_at=now()
 from ef_documentos d where d.id=j.documento_id and j.estado='processing' and j.lease_until<now();
 -- Safe recovery BEFORE transmission only, after a five-minute lease.
 update ef_documentos d set estado='error' from ef_sunat_trabajos j where j.documento_id=d.id and j.estado='queued' and d.estado='enviando' and d.transmision_iniciada_at is null and d.ultimo_intento_at<now()-interval '5 minutes';
 select greatest(0,2-count(*)) into capacity from ef_sunat_trabajos where estado='processing';
 return query update ef_sunat_trabajos j set estado='processing',lease_until=now()+interval '5 minutes',lease_token=gen_random_uuid(),updated_at=now()
 where j.documento_id in(select documento_id from ef_sunat_trabajos where estado='queued' and disponible_at<=now() order by disponible_at,documento_id limit capacity for update skip locked) returning j.*;
end$$;
create or replace function public.ef_sunat_finalizar_trabajo(p_documento_id uuid,p_lease_token uuid,p_estado text) returns void language plpgsql security invoker set search_path=public as $$
begin
 if p_estado not in('done','blocked','consult')then raise exception 'Estado inválido';end if;
 update ef_sunat_trabajos set estado=case when p_estado='consult' and consultas<5 then 'queued' when p_estado='consult' then 'blocked' else p_estado end,
 accion=case when p_estado='consult' then 'consultar' else accion end,consultas=consultas+case when p_estado='consult' then 1 else 0 end,
 disponible_at=now()+interval '1 minute',lease_until=null,lease_token=null,updated_at=now()
 where documento_id=p_documento_id and lease_token=p_lease_token and estado='processing';
end$$;
revoke all on function public.ef_sunat_encolar(uuid,uuid),public.ef_sunat_tomar_trabajos(),public.ef_sunat_finalizar_trabajo(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.ef_sunat_encolar(uuid,uuid),public.ef_sunat_tomar_trabajos(),public.ef_sunat_finalizar_trabajo(uuid,uuid,text) to service_role;
-- Dedicated scheduler key; never return it to a browser.
do $$begin if not exists(select 1 from vault.secrets where name='huerta_sunat_worker_v1')then perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'huerta_sunat_worker_v1','SUNAT scheduler authentication');end if;end$$;
create or replace function sunat_private.worker_key() returns text language sql security definer set search_path='' as $$select decrypted_secret from vault.decrypted_secrets where name='huerta_sunat_worker_v1' limit 1$$;
revoke all on function sunat_private.worker_key() from public,anon,authenticated;
grant execute on function sunat_private.worker_key() to service_role;
create or replace function public.ef_sunat_worker_key() returns text language sql security invoker set search_path='' as $$select sunat_private.worker_key()$$;
revoke all on function public.ef_sunat_worker_key() from public,anon,authenticated;
grant execute on function public.ef_sunat_worker_key() to service_role;
-- Item changes invalidate only their parent order. One update per parent per SQL statement.
create or replace function public.rest_notificar_items() returns trigger language plpgsql security invoker set search_path=public as $$begin
 update rest_pedidos set updated_at=now() where id in(select distinct pedido_id from affected_items);return null;end$$;
revoke all on function public.rest_notificar_items() from public,anon,authenticated;
create trigger rest_items_insert_refresh after insert on public.rest_pedido_items referencing new table as affected_items for each statement execute function public.rest_notificar_items();
create trigger rest_items_update_refresh after update on public.rest_pedido_items referencing new table as affected_items for each statement execute function public.rest_notificar_items();
create trigger rest_items_delete_refresh after delete on public.rest_pedido_items referencing old table as affected_items for each statement execute function public.rest_notificar_items();
-- Indexes for the actual ordered, tenant-scoped lists.
create index if not exists erp_clientes_list_idx on public.erp_clientes(empresa_id,created_at desc,id desc);
create index if not exists erp_proveedores_list_idx on public.erp_proveedores(empresa_id,created_at desc,id desc);
create index if not exists erp_documentos_list_idx on public.erp_documentos(empresa_id,created_at desc,id desc);
create index if not exists erp_cotizaciones_list_idx on public.erp_cotizaciones(empresa_id,created_at desc,id desc);
create index if not exists erp_tareas_list_idx on public.erp_tareas(empresa_id,fecha desc,id desc);
