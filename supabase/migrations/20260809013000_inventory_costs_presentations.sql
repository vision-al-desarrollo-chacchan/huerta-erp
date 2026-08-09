alter table public.rest_insumos add column if not exists costo_promedio numeric(14,4) not null default 0 check (costo_promedio >= 0);
alter table public.rest_recetas add column if not exists cantidad_uso numeric(12,3);
alter table public.rest_recetas add column if not exists unidad_uso text;
update public.rest_recetas set cantidad_uso=cantidad, unidad_uso=(select unidad from public.rest_insumos where id=insumo_id) where cantidad_uso is null;

create table if not exists public.rest_compras_inventario (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.rest_empresas(id) on delete cascade,
 insumo_id uuid not null references public.rest_insumos(id) on delete restrict, presentacion text not null,
 cantidad_presentaciones numeric(12,3) not null check(cantidad_presentaciones>0), contenido_por_presentacion numeric(12,3) not null check(contenido_por_presentacion>0),
 unidad_base text not null, cantidad_base numeric(12,3) not null, costo_total numeric(12,2) not null check(costo_total>=0), costo_unitario numeric(14,4) not null,
 proveedor text, registrado_por uuid references auth.users(id), created_at timestamptz not null default now()
);
alter table public.rest_compras_inventario enable row level security;
drop policy if exists rest_compras_inventario_miembros on public.rest_compras_inventario;
create policy rest_compras_inventario_miembros on public.rest_compras_inventario for all to authenticated using(public.rest_tiene_acceso(empresa_id)) with check(public.rest_tiene_acceso(empresa_id));

create or replace function public.rest_registrar_compra_inventario(p_insumo_id uuid,p_presentacion text,p_cantidad_presentaciones numeric,p_contenido numeric,p_costo_total numeric,p_proveedor text default null)
returns public.rest_insumos language plpgsql security invoker set search_path=public as $$
declare i public.rest_insumos; cantidad_base numeric(12,3); costo_nuevo numeric(14,4); stock_anterior numeric(12,3);
begin
 select * into i from public.rest_insumos where id=p_insumo_id for update;
 if i.id is null or not public.rest_tiene_acceso(i.empresa_id) then raise exception 'Insumo no encontrado'; end if;
 if p_cantidad_presentaciones<=0 or p_contenido<=0 or p_costo_total<0 then raise exception 'Revisa las cantidades y el costo'; end if;
 cantidad_base:=p_cantidad_presentaciones*p_contenido; stock_anterior:=i.stock;
 costo_nuevo:=((i.stock*i.costo_promedio)+p_costo_total)/(i.stock+cantidad_base);
 update public.rest_insumos set stock=stock+cantidad_base,costo_promedio=costo_nuevo where id=i.id returning * into i;
 insert into public.rest_compras_inventario(empresa_id,insumo_id,presentacion,cantidad_presentaciones,contenido_por_presentacion,unidad_base,cantidad_base,costo_total,costo_unitario,proveedor,registrado_por)
 values(i.empresa_id,i.id,trim(p_presentacion),p_cantidad_presentaciones,p_contenido,i.unidad,cantidad_base,p_costo_total,p_costo_total/cantidad_base,nullif(trim(p_proveedor),''),auth.uid());
 insert into public.rest_movimientos_inventario(empresa_id,insumo_id,tipo,cantidad,saldo_anterior,saldo_nuevo,motivo,registrado_por,registrado_por_nombre)
 values(i.empresa_id,i.id,'entrada',cantidad_base,stock_anterior,i.stock,'Compra: '||p_cantidad_presentaciones||' '||trim(p_presentacion),auth.uid(),public.rest_nombre_usuario(i.empresa_id));
 return i;
end; $$;
grant execute on function public.rest_registrar_compra_inventario(uuid,text,numeric,numeric,numeric,text) to authenticated;
