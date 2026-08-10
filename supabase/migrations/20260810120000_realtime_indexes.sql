-- Rendimiento multiempresa y claves foráneas usadas por POS, KDS e inventario.
create index if not exists rest_sucursales_empresa_idx on public.rest_sucursales(empresa_id);
create index if not exists rest_cajas_empresa_sucursal_idx on public.rest_cajas(empresa_id, sucursal_id, estado);
create index if not exists rest_pedidos_sucursal_idx on public.rest_pedidos(sucursal_id);
create index if not exists rest_pedidos_caja_idx on public.rest_pedidos(caja_id);
create index if not exists rest_pedido_items_pedido_idx on public.rest_pedido_items(pedido_id);
create index if not exists rest_pedido_items_producto_idx on public.rest_pedido_items(producto_id);
create index if not exists rest_recetas_empresa_idx on public.rest_recetas(empresa_id);
create index if not exists rest_recetas_producto_idx on public.rest_recetas(producto_id);
create index if not exists rest_recetas_insumo_idx on public.rest_recetas(insumo_id);
create index if not exists rest_movimientos_inventario_insumo_idx on public.rest_movimientos_inventario(insumo_id);
create index if not exists rest_movimientos_inventario_pedido_idx on public.rest_movimientos_inventario(pedido_id) where pedido_id is not null;
create index if not exists rest_compras_inventario_empresa_idx on public.rest_compras_inventario(empresa_id, created_at desc);
create index if not exists rest_compras_inventario_insumo_idx on public.rest_compras_inventario(insumo_id);
create index if not exists rest_movimientos_caja_empresa_sucursal_idx on public.rest_movimientos_caja(empresa_id, sucursal_id, created_at desc);
create index if not exists rest_movimientos_caja_caja_idx on public.rest_movimientos_caja(caja_id, created_at desc);
create index if not exists erp_cotizaciones_sucursal_idx on public.erp_cotizaciones(sucursal_id);
create index if not exists erp_cotizaciones_cliente_idx on public.erp_cotizaciones(cliente_id) where cliente_id is not null;
create index if not exists erp_cotizacion_items_cotizacion_idx on public.erp_cotizacion_items(cotizacion_id);
create index if not exists erp_cotizacion_items_producto_idx on public.erp_cotizacion_items(producto_id) where producto_id is not null;

-- Los detalles también cambian inmediatamente en KDS cuando una comanda se crea o edita.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rest_pedido_items'
  ) then
    alter publication supabase_realtime add table public.rest_pedido_items;
  end if;
end $$;
