-- Integridad del POS, cobro atomico, permisos y Realtime para la prueba real.
alter table public.rest_pedidos
  add column if not exists idempotency_key text;

create unique index if not exists rest_pedidos_idempotency_idx
  on public.rest_pedidos(empresa_id, idempotency_key)
  where idempotency_key is not null;

create or replace function public.rest_tiene_rol_operativo(
  target_empresa uuid,
  allowed_roles text[]
) returns boolean
language sql stable security definer set search_path=public
as $$
  select exists(
    select 1
    from public.rest_miembros
    where empresa_id=target_empresa
      and user_id=auth.uid()
      and activo
      and roles && allowed_roles
  );
$$;

revoke all on function public.rest_tiene_rol_operativo(uuid,text[]) from public,anon;
grant execute on function public.rest_tiene_rol_operativo(uuid,text[]) to authenticated;

create or replace function public.rest_crear_pedido(
  p_empresa_id uuid,
  p_sucursal_id uuid,
  p_caja_id uuid,
  p_tipo_servicio text,
  p_mesa text,
  p_cliente text,
  p_items jsonb,
  p_idempotency_key text
) returns public.rest_pedidos
language plpgsql security invoker set search_path=public
as $$
declare
  pedido public.rest_pedidos;
begin
  if not public.rest_tiene_rol_operativo(p_empresa_id,array['propietario','administrador','supervisor','cajero','mozo','moza_cajera']) then
    raise exception 'No tienes permiso para crear pedidos';
  end if;
  if nullif(trim(p_idempotency_key),'') is null then raise exception 'Falta la clave unica del pedido'; end if;
  if p_tipo_servicio not in ('salon','llevar','delivery') then raise exception 'Tipo de servicio invalido'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'El pedido no contiene productos'; end if;
  if not exists(
    select 1 from public.rest_cajas
    where id=p_caja_id and empresa_id=p_empresa_id and sucursal_id=p_sucursal_id and estado='abierta'
  ) then raise exception 'La caja seleccionada no esta abierta'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_empresa_id::text||':'||trim(p_idempotency_key),0));
  select * into pedido from public.rest_pedidos
  where empresa_id=p_empresa_id and idempotency_key=trim(p_idempotency_key);
  if found then return pedido; end if;

  if exists(
    select 1
    from jsonb_array_elements(p_items) item
    left join public.rest_productos producto
      on producto.id::text=item->>'productId'
      and producto.empresa_id=p_empresa_id
      and producto.activo
    where producto.id is null
      or coalesce(item->>'quantity','') !~ '^[0-9]+([.][0-9]+)?$'
      or (item->>'quantity')::numeric<=0
  ) then raise exception 'El pedido contiene un producto o cantidad invalida'; end if;

  insert into public.rest_pedidos(
    empresa_id,sucursal_id,caja_id,tipo_servicio,mesa,cliente,total,creado_por,idempotency_key
  )
  select p_empresa_id,p_sucursal_id,p_caja_id,p_tipo_servicio,nullif(trim(p_mesa),''),nullif(trim(p_cliente),''),
    sum(producto.precio*(item->>'quantity')::numeric),auth.uid(),trim(p_idempotency_key)
  from jsonb_array_elements(p_items) item
  join public.rest_productos producto on producto.id::text=item->>'productId' and producto.empresa_id=p_empresa_id and producto.activo
  returning * into pedido;

  insert into public.rest_pedido_items(pedido_id,producto_id,nombre,cantidad,precio_unitario,notas)
  select pedido.id,producto.id,producto.nombre,(item->>'quantity')::numeric,producto.precio,nullif(trim(item->>'notes'),'')
  from jsonb_array_elements(p_items) item
  join public.rest_productos producto on producto.id::text=item->>'productId' and producto.empresa_id=p_empresa_id and producto.activo;

  return pedido;
end;
$$;

revoke all on function public.rest_crear_pedido(uuid,uuid,uuid,text,text,text,jsonb,text) from public,anon;
grant execute on function public.rest_crear_pedido(uuid,uuid,uuid,text,text,text,jsonb,text) to authenticated;
revoke all on function public.rest_crear_pedido(uuid,uuid,uuid,text,text,text,jsonb) from public,anon,authenticated;

create or replace function public.rest_actualizar_estado_pedido(
  p_pedido_id uuid,
  p_estado text,
  p_metodo_pago text default null
) returns public.rest_pedidos
language plpgsql security definer set search_path=public
as $$
declare p public.rest_pedidos;
begin
  select * into p from public.rest_pedidos where id=p_pedido_id for update;
  if p.id is null or not public.rest_tiene_acceso(p.empresa_id) then raise exception 'Pedido no encontrado'; end if;
  if p.estado='anulado' or p.estado='pagado' then raise exception 'El pedido ya esta finalizado'; end if;

  if p_estado='preparando' and p.estado='nuevo' then
    if not public.rest_tiene_rol_operativo(p.empresa_id,array['propietario','administrador','supervisor','cocina']) then raise exception 'Sin permiso de cocina'; end if;
  elsif p_estado='listo' and p.estado='preparando' then
    if not public.rest_tiene_rol_operativo(p.empresa_id,array['propietario','administrador','supervisor','cocina']) then raise exception 'Sin permiso de cocina'; end if;
  elsif p_estado='entregado' and p.estado='listo' then
    if not public.rest_tiene_rol_operativo(p.empresa_id,array['propietario','administrador','supervisor','cocina','mozo','moza_cajera']) then raise exception 'Sin permiso para entregar'; end if;
  elsif p_estado='pagado' and p.estado='entregado' then
    if not public.rest_tiene_rol_operativo(p.empresa_id,array['propietario','administrador','supervisor','cajero','moza_cajera']) then raise exception 'Sin permiso para cobrar'; end if;
    if p_metodo_pago not in ('Efectivo','Yape/Plin','Tarjeta','Transferencia') then raise exception 'Metodo de pago invalido'; end if;
    if not exists(select 1 from public.rest_cajas where id=p.caja_id and estado='abierta') then raise exception 'La caja del pedido ya no esta abierta'; end if;
  else
    raise exception 'Cambio de estado no permitido: % a %',p.estado,p_estado;
  end if;

  update public.rest_pedidos
  set estado=p_estado,metodo_pago=case when p_estado='pagado' then p_metodo_pago else metodo_pago end,updated_at=now()
  where id=p.id returning * into p;
  return p;
end;
$$;

revoke all on function public.rest_actualizar_estado_pedido(uuid,text,text) from public,anon;
grant execute on function public.rest_actualizar_estado_pedido(uuid,text,text) to authenticated;

-- Impide que una cuenta de trabajador evite las transiciones controladas con un UPDATE directo.
revoke update,delete on public.rest_pedidos from authenticated;
alter function public.erp_anular_pedido(uuid,text) security definer;
revoke all on function public.erp_anular_pedido(uuid,text) from public,anon;
grant execute on function public.erp_anular_pedido(uuid,text) to authenticated;

-- Los trabajadores ven el catalogo; solo administracion o supervision lo modifica.
drop policy if exists rest_productos_miembros on public.rest_productos;
create policy rest_productos_select on public.rest_productos for select to authenticated using(public.rest_tiene_acceso(empresa_id));
create policy rest_productos_insert on public.rest_productos for insert to authenticated with check(public.rest_tiene_rol_operativo(empresa_id,array['propietario','administrador','supervisor']));
create policy rest_productos_update on public.rest_productos for update to authenticated using(public.rest_tiene_rol_operativo(empresa_id,array['propietario','administrador','supervisor'])) with check(public.rest_tiene_rol_operativo(empresa_id,array['propietario','administrador','supervisor']));
create policy rest_productos_delete on public.rest_productos for delete to authenticated using(public.rest_es_admin(empresa_id));

-- Recursos Humanos y contabilidad son informacion administrativa.
drop policy if exists erp_empleados_miembros on public.erp_empleados;
create policy erp_empleados_admin on public.erp_empleados for all to authenticated using(public.rest_es_admin(empresa_id)) with check(public.rest_es_admin(empresa_id));
drop policy if exists erp_movimientos_contables_miembros on public.erp_movimientos_contables;
create policy erp_movimientos_contables_admin on public.erp_movimientos_contables for all to authenticated using(public.rest_es_admin(empresa_id)) with check(public.rest_es_admin(empresa_id));

-- Quita acceso anonimo heredado de las funciones privilegiadas antiguas.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as signature,p.proname
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in(
      'can_manage_cash','can_manage_inventory','can_manage_organization','can_sell','create_organization',
      'erp_aceptar_invitacion','erp_quitar_pin_empleado','erp_validar_pin_empleado','handle_new_user',
      'has_organization_role','is_organization_member','rest_crear_empresa_inicial',
      'rest_descontar_inventario_pedido','rest_nombre_usuario','rest_tiene_acceso'
    )
  loop
    execute format('revoke all on function %s from public,anon',f.signature);
    if f.proname not in ('handle_new_user','rest_descontar_inventario_pedido') then
      execute format('grant execute on function %s to authenticated',f.signature);
    end if;
  end loop;
end $$;

-- Publica las tablas que ya escucha la interfaz.
do $$
declare t text;
begin
  foreach t in array array['rest_productos','rest_cajas','rest_movimientos_caja'] loop
    if not exists(
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t
    ) then execute format('alter publication supabase_realtime add table public.%I',t);
    end if;
  end loop;
end $$;
