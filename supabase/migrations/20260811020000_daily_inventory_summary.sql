-- Resumen diario para cierre de inventario y lista de compras del día siguiente.
create or replace function public.rest_resumen_inventario_diario(p_empresa_id uuid, p_fecha date default current_date)
returns table(insumo_id uuid,codigo text,nombre text,categoria text,unidad text,stock_inicial numeric,comprado numeric,consumido numeric,merma numeric,ajuste numeric,stock_final numeric,stock_minimo numeric,compra_sugerida numeric)
language sql stable security invoker set search_path=public as $$
  with movimientos as (
    select m.insumo_id,
      coalesce(sum(m.saldo_nuevo-m.saldo_anterior),0) delta,
      coalesce(sum(case when m.tipo='entrada' then greatest(m.saldo_nuevo-m.saldo_anterior,0) else 0 end),0) comprado,
      coalesce(sum(case when m.tipo in ('venta','salida') then greatest(m.saldo_anterior-m.saldo_nuevo,0) else 0 end),0) consumido,
      coalesce(sum(case when m.tipo='merma' then greatest(m.saldo_anterior-m.saldo_nuevo,0) else 0 end),0) merma,
      coalesce(sum(case when m.tipo='ajuste' then m.saldo_nuevo-m.saldo_anterior else 0 end),0) ajuste
    from public.rest_movimientos_inventario m
    where m.empresa_id=p_empresa_id and (m.created_at at time zone 'America/Lima')::date=p_fecha
    group by m.insumo_id
  )
  select i.id,i.codigo,i.nombre,i.categoria,i.unidad,
    round(i.stock-coalesce(m.delta,0),3),round(coalesce(m.comprado,0),3),round(coalesce(m.consumido,0),3),round(coalesce(m.merma,0),3),round(coalesce(m.ajuste,0),3),round(i.stock,3),round(i.stock_minimo,3),
    round(greatest(coalesce(m.consumido,0)+coalesce(m.merma,0)+i.stock_minimo-i.stock,0),3)
  from public.rest_insumos i left join movimientos m on m.insumo_id=i.id
  where i.empresa_id=p_empresa_id and i.activo and public.rest_tiene_acceso(i.empresa_id)
  order by (greatest(coalesce(m.consumido,0)+coalesce(m.merma,0)+i.stock_minimo-i.stock,0)>0) desc,i.categoria,i.nombre;
$$;
revoke all on function public.rest_resumen_inventario_diario(uuid,date) from public,anon;
grant execute on function public.rest_resumen_inventario_diario(uuid,date) to authenticated;
