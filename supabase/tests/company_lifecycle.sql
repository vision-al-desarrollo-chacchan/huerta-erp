-- Run as the database owner; all fixtures and mutations are rolled back.
begin;
do $$
declare
  admin_id uuid; owner_id uuid := gen_random_uuid();
  tenant uuid; other_tenant uuid; branch uuid; product uuid; cash uuid;
  order_id uuid; supply uuid; reconciliation uuid; row_count integer;
begin
  select user_id into admin_id from platform_private.superadmin limit 1;
  if admin_id is null then raise exception 'Test requires a configured superadmin'; end if;
  insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data)
    values(owner_id,'lifecycle-'||owner_id||'@example.invalid','{}','{}');
  insert into public.rest_empresas(nombre) values('Lifecycle Test') returning id into tenant;
  insert into public.rest_empresas(nombre) values('Other Lifecycle Test') returning id into other_tenant;
  insert into public.rest_miembros(empresa_id,user_id,rol,roles) values(tenant,owner_id,'propietario',array['propietario']);
  insert into public.rest_sucursales(empresa_id,nombre) values(tenant,'Test') returning id into branch;
  insert into public.rest_productos(empresa_id,nombre,categoria,precio) values(tenant,'Test','Test',10) returning id into product;
  insert into public.rest_cajas(empresa_id,sucursal_id,abierta_por) values(tenant,branch,owner_id) returning id into cash;
  insert into public.rest_pedidos(empresa_id,sucursal_id,caja_id,creado_por,tipo_servicio,numero)
    values(tenant,branch,cash,owner_id,'recojo',-1) returning id into order_id;
  insert into public.rest_pedido_items(pedido_id,producto_id,nombre,cantidad,precio_unitario) values(order_id,product,'Test',1,10);
  insert into public.rest_insumos(empresa_id,codigo,nombre,unidad) values(tenant,'TEST','Test','unidad') returning id into supply;
  insert into public.rest_recetas(empresa_id,producto_id,insumo_id,cantidad) values(tenant,product,supply,1);
  insert into public.rest_arqueos(empresa_id,sucursal_id,caja_id,responsable) values(tenant,branch,cash,'Test') returning id into reconciliation;
  insert into public.rest_arqueo_items(arqueo_id,insumo_id,nombre,unidad,stock_inicial,comprado,vendido,otras_salidas,stock_esperado,costo_unitario)
    values(reconciliation,supply,'Test','unidad',0,0,0,0,0,0);
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('role','authenticated',true);
  if not public.rest_tiene_acceso(tenant) or public.rest_tiene_acceso(other_tenant) then raise exception 'Tenant isolation failed'; end if;
  begin
    perform public.platform_set_company_active(tenant,false);
    raise exception 'Owner could suspend company';
  exception when insufficient_privilege then null; end;
  begin
    perform public.platform_delete_company(tenant,'Lifecycle Test');
    raise exception 'Owner could delete company';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform public.platform_set_company_active(tenant,false);
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  if public.platform_company_access()<>'suspended' or public.rest_tiene_acceso(tenant) or public.rest_es_admin(tenant)
    or public.rest_tiene_rol_operativo(tenant,array['propietario']) then raise exception 'Suspension access check failed'; end if;
  select count(*) into row_count from public.rest_productos where empresa_id=tenant;
  if row_count<>0 then raise exception 'Suspended member can read products through RLS'; end if;
  select count(*) into row_count from public.rest_miembros where empresa_id=tenant;
  if row_count<>0 then raise exception 'Suspended membership exposed to edge functions'; end if;
  begin
    insert into public.rest_productos(empresa_id,nombre,categoria,precio) values(tenant,'Blocked','Test',1);
    raise exception 'Suspended member can write';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform public.platform_set_company_active(tenant,true);
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  if public.platform_company_access()<>'active' then raise exception 'Reactivation failed'; end if;
  select count(*) into row_count from public.rest_productos where empresa_id=tenant;
  if row_count<>1 then raise exception 'Reactivation did not preserve data'; end if;
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  begin
    perform public.platform_delete_company(tenant,'wrong name');
    raise exception 'Incorrect confirmation accepted';
  exception when raise_exception then
    if sqlerrm not like 'Escribe exactamente%' then raise; end if;
  end;
  perform public.platform_delete_company(tenant,'Lifecycle Test');
  perform set_config('role','none',true);
  if exists(select 1 from public.rest_empresas where id=tenant)
    or exists(select 1 from public.rest_pedido_items where pedido_id=order_id)
    or exists(select 1 from public.rest_arqueo_items where arqueo_id=reconciliation)
    or exists(select 1 from public.rest_miembros where empresa_id=tenant) then raise exception 'Delete left company data'; end if;
  if not exists(select 1 from public.rest_empresas where id=other_tenant) then raise exception 'Delete affected another company'; end if;
  if not exists(select 1 from auth.users where id=owner_id) then raise exception 'Delete removed personal login'; end if;
  if has_function_privilege('anon','public.platform_delete_company(uuid,text)','EXECUTE')
    or has_function_privilege('anon','public.platform_set_company_active(uuid,boolean)','EXECUTE') then raise exception 'Anonymous execution allowed'; end if;
end $$;
select 'PASS: owner denied; tenant isolation; suspension RLS read/write; reactivation; name confirmation; dependent deletion; personal login preserved; anon denied' as result;
rollback;
