-- Limit per-company fiscal backlog and share the global worker budget fairly.
-- No increase to real SUNAT concurrency; measure first.
create index if not exists ef_sunat_trabajos_usuario_idx on public.ef_sunat_trabajos(usuario_id);
create or replace function public.ef_sunat_encolar(p_documento_id uuid,p_usuario_id uuid) returns text language plpgsql security invoker set search_path=public as $$
declare d public.ef_documentos;begin
 select * into d from public.ef_documentos where id=p_documento_id for update;
 if d.id is null or not exists(select 1 from rest_miembros where empresa_id=d.empresa_id and user_id=p_usuario_id and activo and rol in('propietario','administrador','cajero','moza_cajera','supervisor')) then raise exception 'Sin acceso';end if;
 if d.estado not in('pendiente','error') or d.transmision_iniciada_at is not null then return d.estado;end if;
 if not exists(select 1 from ef_configuraciones c join ef_sunat_habilitaciones h using(empresa_id) join ef_sunat_certificados k using(empresa_id) join rest_empresas e on e.id=c.empresa_id where c.empresa_id=d.empresa_id and c.activo and c.ambiente='produccion' and c.proveedor='sunat' and e.activa and h.aprobada and h.revisada_at is not null and h.ruc=e.ruc and h.certificado_huella=k.huella) then raise exception 'Empresa no habilitada';end if;
 perform pg_advisory_xact_lock(hashtextextended('sunat-limit:'||d.empresa_id::text,0));
 if not exists(select 1 from ef_sunat_trabajos where documento_id=d.id and estado in('queued','processing'))
 and (select count(*) from ef_sunat_trabajos j join ef_documentos doc on doc.id=j.documento_id where doc.empresa_id=d.empresa_id and j.estado in('queued','processing'))>=100 then raise exception 'Límite de cola alcanzado; espera a que se procesen los comprobantes';end if;
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
 return query with ranked as (
  select j.documento_id,j.disponible_at,d.empresa_id,
   row_number() over(partition by d.empresa_id order by j.disponible_at,j.documento_id) turn
  from ef_sunat_trabajos j join ef_documentos d on d.id=j.documento_id
  where j.estado='queued' and j.disponible_at<=now()
 ), candidates as (
  select j.documento_id from ef_sunat_trabajos j join ranked r on r.documento_id=j.documento_id
  order by r.turn,r.disponible_at,r.documento_id limit capacity for update of j skip locked
 ) update ef_sunat_trabajos j set estado='processing',lease_until=now()+interval '5 minutes',lease_token=gen_random_uuid(),updated_at=now()
 where j.documento_id in(select documento_id from candidates) returning j.*;
end$$;

revoke all on function public.ef_sunat_encolar(uuid,uuid),public.ef_sunat_tomar_trabajos() from public,anon,authenticated;
grant execute on function public.ef_sunat_encolar(uuid,uuid),public.ef_sunat_tomar_trabajos() to service_role;

-- Bound in-memory CSV construction; never silently truncate exports.
create or replace function public.erp_ventas_exportar(p_empresa_id uuid,p_sucursal_id uuid,p_desde date,p_hasta date) returns text language plpgsql stable security invoker set search_path=public as $$
declare result text;begin
 perform erp_validar_periodo(p_empresa_id,p_sucursal_id,p_desde,p_hasta);
 if (select count(*) from(select 1 from public.rest_pedidos where empresa_id=p_empresa_id and sucursal_id=p_sucursal_id and estado='pagado'
 and updated_at>=p_desde::timestamp at time zone 'America/Lima' and updated_at<(p_hasta+1)::timestamp at time zone 'America/Lima' limit 10001) bounded)>10000 then
 raise exception 'Exporta un período menor: máximo 10000 ventas por archivo';end if;
 select '"Fecha","Pedido","Servicio","Método","Total"'||coalesce(E'\n'||string_agg(line,E'\n' order by updated_at desc,id desc),'') into result from(
 select p.id,p.updated_at,(select string_agg('"'||replace(case when value~'^[=+@-]' then chr(39)||value else value end,'"','""')||'"',',' order by ordinal) from unnest(array[to_char(p.updated_at at time zone 'America/Lima','DD/MM/YYYY'),p.numero::text,p.tipo_servicio,coalesce(p.metodo_pago,''),to_char(p.total,'FM999999999999990.00')]) with ordinality as cells(value,ordinal)) line
 from rest_pedidos p where p.empresa_id=p_empresa_id and p.sucursal_id=p_sucursal_id and p.estado='pagado' and p.updated_at>=p_desde::timestamp at time zone 'America/Lima' and p.updated_at<(p_hasta+1)::timestamp at time zone 'America/Lima')t;
 return result;end$$;

