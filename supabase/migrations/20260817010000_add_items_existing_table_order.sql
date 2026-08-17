create table if not exists public.rest_pedido_adiciones (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.rest_pedidos(id) on delete cascade,
  idempotency_key text not null,
  creado_por uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (pedido_id, idempotency_key)
);

alter table public.rest_pedido_adiciones enable row level security;
revoke all on table public.rest_pedido_adiciones from public, anon, authenticated;

alter table public.rest_pedido_items add column if not exists adicion_id uuid references public.rest_pedido_adiciones(id) on delete set null;
alter table public.rest_pedidos add column if not exists adicion_activa_id uuid references public.rest_pedido_adiciones(id) on delete set null;

create or replace function public.rest_agregar_items_pedido(
  p_pedido_id uuid,
  p_items jsonb,
  p_idempotency_key text
) returns public.rest_pedidos
language plpgsql security definer set search_path=public
as $$
declare
  pedido public.rest_pedidos;
  adicion uuid;
begin
  if nullif(trim(p_idempotency_key),'') is null then raise exception 'Falta la clave unica de la adicion'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'La adicion no contiene productos'; end if;

  select * into pedido from public.rest_pedidos where id=p_pedido_id for update;
  if pedido.id is null or not public.rest_tiene_rol_operativo(pedido.empresa_id,array['propietario','administrador','supervisor','cajero','mozo','moza_cajera']) then
    raise exception 'Pedido no encontrado o sin permiso';
  end if;
  if pedido.tipo_servicio<>'salon' or pedido.estado in ('pagado','anulado') then
    raise exception 'Solo puedes agregar productos a una mesa con pedido abierto';
  end if;
  if not exists(select 1 from public.rest_cajas where id=pedido.caja_id and estado='abierta') then
    raise exception 'La caja del pedido ya no esta abierta';
  end if;

  if exists(
    select 1
    from jsonb_array_elements(p_items) item
    left join public.rest_productos producto
      on producto.id::text=item->>'productId' and producto.empresa_id=pedido.empresa_id and producto.activo
    where producto.id is null
      or coalesce(item->>'quantity','') !~ '^[0-9]+([.][0-9]+)?$'
      or (item->>'quantity')::numeric<=0
  ) then raise exception 'La adicion contiene un producto o cantidad invalida'; end if;

  insert into public.rest_pedido_adiciones(pedido_id,idempotency_key,creado_por)
  values(pedido.id,trim(p_idempotency_key),auth.uid())
  on conflict(pedido_id,idempotency_key) do nothing
  returning id into adicion;
  if not found then return pedido; end if;

  insert into public.rest_pedido_items(pedido_id,producto_id,nombre,cantidad,precio_unitario,notas,adicion_id)
  select pedido.id,producto.id,producto.nombre,(item->>'quantity')::numeric,producto.precio,nullif(trim(item->>'notes'),''),adicion
  from jsonb_array_elements(p_items) item
  join public.rest_productos producto on producto.id::text=item->>'productId' and producto.empresa_id=pedido.empresa_id and producto.activo;

  update public.rest_pedidos
  set total=(select coalesce(sum(cantidad*precio_unitario),0) from public.rest_pedido_items where pedido_id=pedido.id),
      estado='nuevo',metodo_pago=null,adicion_activa_id=adicion,updated_at=now()
  where id=pedido.id returning * into pedido;
  return pedido;
end;
$$;

revoke all on function public.rest_agregar_items_pedido(uuid,jsonb,text) from public,anon;
grant execute on function public.rest_agregar_items_pedido(uuid,jsonb,text) to authenticated;

create or replace function public.rest_limpiar_adicion_entregada() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if new.estado='entregado' and old.estado is distinct from new.estado and new.adicion_activa_id is not null then
    update public.rest_pedidos set adicion_activa_id=null where id=new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists rest_pedidos_limpiar_adicion on public.rest_pedidos;
create trigger rest_pedidos_limpiar_adicion after update of estado on public.rest_pedidos
for each row execute function public.rest_limpiar_adicion_entregada();

revoke all on function public.rest_limpiar_adicion_entregada() from public,anon,authenticated;
