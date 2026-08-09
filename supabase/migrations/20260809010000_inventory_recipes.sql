-- Inventario real, kardex y recetas con descuento automático al cobrar.
create table if not exists public.rest_insumos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.rest_empresas(id) on delete cascade,
  codigo text not null,
  nombre text not null,
  categoria text not null default 'Otros',
  unidad text not null check (unidad in ('unidad','kg','g','litro','ml')),
  stock numeric(12,3) not null default 0 check (stock >= 0),
  stock_minimo numeric(12,3) not null default 0 check (stock_minimo >= 0),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (empresa_id, codigo)
);

create table if not exists public.rest_recetas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.rest_empresas(id) on delete cascade,
  producto_id uuid not null references public.rest_productos(id) on delete cascade,
  insumo_id uuid not null references public.rest_insumos(id) on delete restrict,
  cantidad numeric(12,3) not null check (cantidad > 0),
  created_at timestamptz not null default now(),
  unique (producto_id, insumo_id)
);

create table if not exists public.rest_movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.rest_empresas(id) on delete cascade,
  insumo_id uuid not null references public.rest_insumos(id) on delete restrict,
  pedido_id uuid references public.rest_pedidos(id) on delete set null,
  tipo text not null check (tipo in ('entrada','salida','ajuste','venta','merma')),
  cantidad numeric(12,3) not null check (cantidad > 0),
  saldo_anterior numeric(12,3) not null,
  saldo_nuevo numeric(12,3) not null,
  motivo text not null,
  registrado_por uuid references auth.users(id),
  registrado_por_nombre text,
  created_at timestamptz not null default now()
);

alter table public.rest_pedidos add column if not exists inventario_descontado boolean not null default false;
create index if not exists rest_insumos_empresa_idx on public.rest_insumos(empresa_id, activo, nombre);
create index if not exists rest_movimientos_inventario_idx on public.rest_movimientos_inventario(empresa_id, created_at desc);

alter table public.rest_insumos enable row level security;
alter table public.rest_recetas enable row level security;
alter table public.rest_movimientos_inventario enable row level security;
drop policy if exists rest_insumos_miembros on public.rest_insumos;
create policy rest_insumos_miembros on public.rest_insumos for all to authenticated using (public.rest_tiene_acceso(empresa_id)) with check (public.rest_tiene_acceso(empresa_id));
drop policy if exists rest_recetas_miembros on public.rest_recetas;
create policy rest_recetas_miembros on public.rest_recetas for all to authenticated using (public.rest_tiene_acceso(empresa_id)) with check (public.rest_tiene_acceso(empresa_id));
drop policy if exists rest_movimientos_inventario_miembros on public.rest_movimientos_inventario;
create policy rest_movimientos_inventario_miembros on public.rest_movimientos_inventario for select to authenticated using (public.rest_tiene_acceso(empresa_id));

create or replace function public.rest_registrar_movimiento_inventario(
  p_insumo_id uuid, p_tipo text, p_cantidad numeric, p_motivo text
) returns public.rest_insumos
language plpgsql security invoker set search_path = public as $$
declare insumo public.rest_insumos; nuevo numeric; movimiento_tipo text;
begin
  select * into insumo from public.rest_insumos where id = p_insumo_id for update;
  if insumo.id is null or not public.rest_tiene_acceso(insumo.empresa_id) then raise exception 'Insumo no encontrado'; end if;
  if p_tipo not in ('entrada','salida','ajuste','merma') then raise exception 'Tipo de movimiento inválido'; end if;
  if p_cantidad = 0 then raise exception 'La cantidad no puede ser cero'; end if;
  movimiento_tipo := p_tipo;
  if p_tipo = 'entrada' then nuevo := insumo.stock + abs(p_cantidad);
  elsif p_tipo in ('salida','merma') then nuevo := insumo.stock - abs(p_cantidad);
  else nuevo := insumo.stock + p_cantidad;
  end if;
  if nuevo < 0 then raise exception 'Stock insuficiente para %: disponible % %', insumo.nombre, insumo.stock, insumo.unidad; end if;
  update public.rest_insumos set stock = nuevo where id = insumo.id returning * into insumo;
  insert into public.rest_movimientos_inventario(empresa_id,insumo_id,tipo,cantidad,saldo_anterior,saldo_nuevo,motivo,registrado_por,registrado_por_nombre)
  values(insumo.empresa_id,insumo.id,movimiento_tipo,abs(p_cantidad),insumo.stock - case when p_tipo='entrada' then abs(p_cantidad) when p_tipo in ('salida','merma') then -abs(p_cantidad) else p_cantidad end,insumo.stock,coalesce(nullif(trim(p_motivo),''),'Movimiento manual'),auth.uid(),public.rest_nombre_usuario(insumo.empresa_id));
  return insumo;
end; $$;
grant execute on function public.rest_registrar_movimiento_inventario(uuid,text,numeric,text) to authenticated;

create or replace function public.rest_descontar_inventario_pedido() returns trigger
language plpgsql security definer set search_path = public as $$
declare consumo record; actual numeric;
begin
  if new.estado <> 'pagado' or old.estado = 'pagado' or new.inventario_descontado then return new; end if;
  for consumo in
    select r.insumo_id, i.nombre, i.unidad, sum(r.cantidad * pi.cantidad)::numeric(12,3) cantidad
    from public.rest_pedido_items pi join public.rest_recetas r on r.producto_id=pi.producto_id
    join public.rest_insumos i on i.id=r.insumo_id where pi.pedido_id=new.id group by r.insumo_id,i.nombre,i.unidad
  loop
    select stock into actual from public.rest_insumos where id=consumo.insumo_id for update;
    if actual < consumo.cantidad then raise exception 'Stock insuficiente de %: necesitas % %, disponible %', consumo.nombre, consumo.cantidad, consumo.unidad, actual; end if;
    update public.rest_insumos set stock=stock-consumo.cantidad where id=consumo.insumo_id;
    insert into public.rest_movimientos_inventario(empresa_id,insumo_id,pedido_id,tipo,cantidad,saldo_anterior,saldo_nuevo,motivo,registrado_por,registrado_por_nombre)
    values(new.empresa_id,consumo.insumo_id,new.id,'venta',consumo.cantidad,actual,actual-consumo.cantidad,'Descuento automático · Pedido #'||new.numero,auth.uid(),public.rest_nombre_usuario(new.empresa_id));
  end loop;
  new.inventario_descontado := true;
  return new;
end; $$;

drop trigger if exists rest_pedidos_descontar_inventario on public.rest_pedidos;
create trigger rest_pedidos_descontar_inventario before update of estado on public.rest_pedidos for each row execute function public.rest_descontar_inventario_pedido();

do $$ begin
  alter publication supabase_realtime add table public.rest_insumos;
exception when duplicate_object then null; end $$;
