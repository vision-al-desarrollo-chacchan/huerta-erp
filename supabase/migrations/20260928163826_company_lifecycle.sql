-- Company lifecycle: only the platform superadmin may suspend or delete.
-- No existing company is suspended or deleted by this migration.
create or replace function platform_private.member_has_access(target_empresa uuid, allowed_roles text[] default null)
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.rest_miembros m
    join public.rest_empresas e on e.id=m.empresa_id
    where m.empresa_id=target_empresa and m.user_id=auth.uid() and m.activo and e.activa
      and (allowed_roles is null or m.roles && allowed_roles)
  );
$$;
revoke all on function platform_private.member_has_access(uuid,text[]) from public,anon;
grant execute on function platform_private.member_has_access(uuid,text[]) to authenticated;

create or replace function public.rest_tiene_acceso(target_empresa uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$ select platform_private.member_has_access(target_empresa); $$;
create or replace function public.rest_es_admin(target_empresa uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$ select platform_private.member_has_access(target_empresa,array['propietario','administrador']); $$;
create or replace function public.rest_tiene_rol_operativo(target_empresa uuid,allowed_roles text[])
returns boolean language sql stable security invoker set search_path = ''
as $$ select platform_private.member_has_access(target_empresa,allowed_roles); $$;
revoke all on function public.rest_tiene_acceso(uuid),public.rest_es_admin(uuid),public.rest_tiene_rol_operativo(uuid,text[]) from public,anon;
grant execute on function public.rest_tiene_acceso(uuid),public.rest_es_admin(uuid),public.rest_tiene_rol_operativo(uuid,text[]) to authenticated;

-- Edge functions also authorize through membership rows: suspended members
-- must not be returned by the self-read policy.
alter policy rest_miembros_propios on public.rest_miembros
  using (public.rest_tiene_acceso(empresa_id));

create or replace function platform_private.company_access()
returns text language sql stable security definer set search_path = ''
as $$
  select case
    when auth.uid() is null then 'pending'
    when exists(select 1 from public.rest_miembros m join public.rest_empresas e on e.id=m.empresa_id where m.user_id=auth.uid() and m.activo and e.activa) then 'active'
    when exists(select 1 from public.rest_miembros m join public.rest_empresas e on e.id=m.empresa_id where m.user_id=auth.uid() and m.activo and not e.activa) then 'suspended'
    else 'pending' end;
$$;
revoke all on function platform_private.company_access() from public,anon;
grant execute on function platform_private.company_access() to authenticated;
create or replace function public.platform_company_access()
returns text language sql stable security invoker set search_path = ''
as $$ select platform_private.company_access(); $$;
revoke all on function public.platform_company_access() from public,anon;
grant execute on function public.platform_company_access() to authenticated;

create or replace function platform_private.set_company_active(p_empresa_id uuid,p_activa boolean)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not platform_private.is_superadmin() then
    raise exception 'Acceso exclusivo del superadministrador' using errcode='42501';
  end if;
  if p_activa is null then raise exception 'Indica el estado de la empresa'; end if;
  update public.rest_empresas set activa=p_activa where id=p_empresa_id;
  if not found then raise exception 'La empresa ya no existe'; end if;
end;
$$;
revoke all on function platform_private.set_company_active(uuid,boolean) from public,anon;
grant execute on function platform_private.set_company_active(uuid,boolean) to authenticated;
create or replace function public.platform_set_company_active(p_empresa_id uuid,p_activa boolean)
returns void language sql security invoker set search_path = ''
as $$ select platform_private.set_company_active(p_empresa_id,p_activa); $$;
revoke all on function public.platform_set_company_active(uuid,boolean) from public,anon;
grant execute on function public.platform_set_company_active(uuid,boolean) to authenticated;

create or replace function platform_private.delete_company(p_empresa_id uuid,p_confirmation text)
returns void language plpgsql security definer set search_path = ''
as $$
declare company_name text;
begin
  if auth.uid() is null or not platform_private.is_superadmin() then
    raise exception 'Acceso exclusivo del superadministrador' using errcode='42501';
  end if;
  select nombre into company_name from public.rest_empresas where id=p_empresa_id for update;
  if not found then raise exception 'La empresa ya no existe'; end if;
  if p_confirmation is distinct from company_name then
    raise exception 'Escribe exactamente el nombre de la empresa para confirmar';
  end if;
  -- Delete dependants with RESTRICT/NO ACTION first, scoped to this tenant.
  -- Remaining dependants have ON DELETE CASCADE. The RPC is one transaction.
  delete from public.erp_pagos_trabajadores where empresa_id=p_empresa_id;
  delete from public.rest_arqueos where empresa_id=p_empresa_id;
  delete from public.ef_intentos where empresa_id=p_empresa_id;
  delete from public.ef_documentos where empresa_id=p_empresa_id;
  delete from public.print_jobs where empresa_id=p_empresa_id;
  delete from public.rest_movimientos_inventario where empresa_id=p_empresa_id;
  delete from public.rest_compras_inventario where empresa_id=p_empresa_id;
  delete from public.rest_recetas where empresa_id=p_empresa_id;
  delete from public.erp_cotizaciones where empresa_id=p_empresa_id;
  delete from public.rest_pedidos where empresa_id=p_empresa_id;
  delete from public.rest_movimientos_caja where empresa_id=p_empresa_id;
  delete from public.rest_cajas where empresa_id=p_empresa_id;
  delete from public.rest_empresas where id=p_empresa_id;
end;
$$;
revoke all on function platform_private.delete_company(uuid,text) from public,anon;
grant execute on function platform_private.delete_company(uuid,text) to authenticated;
create or replace function public.platform_delete_company(p_empresa_id uuid,p_confirmation text)
returns void language sql security invoker set search_path = ''
as $$ select platform_private.delete_company(p_empresa_id,p_confirmation); $$;
revoke all on function public.platform_delete_company(uuid,text) from public,anon;
grant execute on function public.platform_delete_company(uuid,text) to authenticated;
