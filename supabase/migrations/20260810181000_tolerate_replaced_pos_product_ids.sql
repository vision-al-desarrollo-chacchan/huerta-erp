-- Permite enviar una comanda abierta antes de reemplazar el catalogo.
-- Si el identificador anterior ya no existe, conserva nombre y precio del item.
create or replace function public.rest_crear_pedido(
  p_empresa_id uuid,
  p_sucursal_id uuid,
  p_caja_id uuid,
  p_tipo_servicio text,
  p_mesa text,
  p_cliente text,
  p_items jsonb
)
returns public.rest_pedidos
language plpgsql
security invoker
set search_path = public
as $$
declare
  pedido public.rest_pedidos;
begin
  if not public.rest_tiene_acceso(p_empresa_id) then raise exception 'Sin acceso a la empresa'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'El pedido no contiene productos'; end if;

  insert into public.rest_pedidos (empresa_id, sucursal_id, caja_id, tipo_servicio, mesa, cliente, total, creado_por)
  select p_empresa_id, p_sucursal_id, p_caja_id, p_tipo_servicio, nullif(p_mesa, ''), nullif(p_cliente, ''),
    sum((item->>'quantity')::numeric * (item->>'unitPrice')::numeric), auth.uid()
  from jsonb_array_elements(p_items) item
  returning * into pedido;

  insert into public.rest_pedido_items (pedido_id, producto_id, nombre, cantidad, precio_unitario, notas)
  select pedido.id,
    case
      when exists (
        select 1 from public.rest_productos producto
        where producto.id = nullif(item->>'productId','')::uuid
          and producto.empresa_id = p_empresa_id
      ) then nullif(item->>'productId','')::uuid
      else null
    end,
    item->>'name',
    (item->>'quantity')::numeric,
    (item->>'unitPrice')::numeric,
    nullif(item->>'notes','')
  from jsonb_array_elements(p_items) item;

  return pedido;
end;
$$;

grant execute on function public.rest_crear_pedido(uuid,uuid,uuid,text,text,text,jsonb) to authenticated;
