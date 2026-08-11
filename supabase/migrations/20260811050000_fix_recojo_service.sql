-- Mantiene alineados los tipos de servicio del POS y la validacion segura.
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
  if p_tipo_servicio not in ('salon','delivery','recojo') then raise exception 'Tipo de servicio invalido'; end if;
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
