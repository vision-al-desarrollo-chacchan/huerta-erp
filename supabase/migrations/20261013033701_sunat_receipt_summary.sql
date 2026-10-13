-- Un resumen complementario por boleta. La reserva es exclusiva del backend.
alter table public.ef_documentos add column resumen_id text;
alter table public.ef_documentos add column resumen_xml_path text;
alter table public.ef_documentos add column ticket_sunat text;
create table public.ef_sunat_resumen_correlativos(
 empresa_id uuid not null references public.rest_empresas(id) on delete cascade,
 fecha date not null,
 ultimo_numero integer not null check(ultimo_numero between 1 and 99999),
 primary key(empresa_id,fecha)
);
alter table public.ef_sunat_resumen_correlativos enable row level security;
revoke all on public.ef_sunat_resumen_correlativos from public,anon,authenticated;
grant select,insert,update on public.ef_sunat_resumen_correlativos to service_role;
create function public.ef_sunat_reservar_resumen(p_documento_id uuid,p_fecha date) returns text
language plpgsql security invoker set search_path='' as $$
declare v_doc public.ef_documentos;v_num integer;v_id text;
begin
 select * into v_doc from public.ef_documentos where id=p_documento_id for update;
 if not found or v_doc.tipo_documento<>'boleta' or p_fecha is null then raise exception 'Boleta inválida'; end if;
 if v_doc.resumen_id is not null then return v_doc.resumen_id;end if;
 if v_doc.transmision_iniciada_at is not null then raise exception 'Ya se inició la transmisión';end if;
 insert into public.ef_sunat_resumen_correlativos(empresa_id,fecha,ultimo_numero)values(v_doc.empresa_id,p_fecha,1)
 on conflict(empresa_id,fecha)do update set ultimo_numero=public.ef_sunat_resumen_correlativos.ultimo_numero+1 returning ultimo_numero into v_num;
 v_id='RC-'||to_char(p_fecha,'YYYYMMDD')||'-'||v_num;
 update public.ef_documentos set resumen_id=v_id where id=p_documento_id;
 return v_id;
end $$;
revoke all on function public.ef_sunat_reservar_resumen(uuid,date) from public,anon,authenticated;
grant execute on function public.ef_sunat_reservar_resumen(uuid,date) to service_role;
