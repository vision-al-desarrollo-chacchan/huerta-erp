-- Aprobación del piloto por empresa y certificado. No activa ninguna empresa.
create table public.ef_sunat_habilitaciones (
 empresa_id uuid primary key references public.rest_empresas(id) on delete cascade,
 ruc text not null check(ruc ~ '^[0-9]{11}$'),
 certificado_huella text not null,
 aprobada boolean not null default false,
 revisada_at timestamptz,
 regimen_declarado text check(regimen_declarado in('rer','rmt','general')),
 activada_por uuid references auth.users(id),
 activada_at timestamptz
);
alter table public.ef_sunat_habilitaciones enable row level security;
revoke all on public.ef_sunat_habilitaciones from public,anon,authenticated;
grant select,insert,update on public.ef_sunat_habilitaciones to service_role;
create function public.ef_sunat_activar_empresa(p_empresa_id uuid,p_sucursal_id uuid,p_usuario_id uuid,p_regimen text,p_confirmado boolean)
returns void language plpgsql security invoker set search_path='' as $$
declare v_ruc text;v_huella text;
begin
 if p_confirmado is not true or coalesce(p_regimen,'') not in('rer','rmt','general') then raise exception 'Confirma un régimen habilitado y los requisitos de emisión';end if;
 select ruc into v_ruc from public.rest_empresas where id=p_empresa_id and activa for update;
 if not found or v_ruc is null then raise exception 'Empresa sin RUC';end if;
 if not exists(select 1 from public.rest_miembros where empresa_id=p_empresa_id and user_id=p_usuario_id and activo and rol in('propietario','administrador')) then raise exception 'Administrador requerido';end if;
 if not exists(select 1 from public.rest_sucursales where id=p_sucursal_id and empresa_id=p_empresa_id and activa) then raise exception 'Sucursal ajena';end if;
 select huella into v_huella from public.ef_sunat_certificados where empresa_id=p_empresa_id and ruc=v_ruc and vence_at>now();
 if not found then raise exception 'Certificado no vigente';end if;
 if not exists(select 1 from public.ef_sunat_sol where empresa_id=p_empresa_id and ruc=v_ruc) then raise exception 'SOL pendiente';end if;
 if not exists(select 1 from public.ef_sunat_habilitaciones where empresa_id=p_empresa_id and ruc=v_ruc and certificado_huella=v_huella and aprobada and revisada_at is not null) then raise exception 'Primera emisión real pendiente de validación';end if;
 if (select count(*) from public.ef_series where empresa_id=p_empresa_id and sucursal_id=p_sucursal_id and tipo_documento='factura' and activa and serie ~ '^F[A-Z0-9]{3}$')<>1 or (select count(*) from public.ef_series where empresa_id=p_empresa_id and sucursal_id=p_sucursal_id and tipo_documento='boleta' and activa and serie ~ '^B[A-Z0-9]{3}$')<>1 then raise exception 'Configura una serie activa por tipo';end if;
 update public.ef_configuraciones set activo=true,ambiente='produccion',proveedor='sunat',updated_at=now() where empresa_id=p_empresa_id and certificado_configurado and clave_sol_configurada;
 if not found then raise exception 'Configuración incompleta';end if;
 update public.ef_sunat_habilitaciones set regimen_declarado=p_regimen,activada_por=p_usuario_id,activada_at=now() where empresa_id=p_empresa_id;
end $$;
revoke all on function public.ef_sunat_activar_empresa(uuid,uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.ef_sunat_activar_empresa(uuid,uuid,uuid,text,boolean) to service_role;
