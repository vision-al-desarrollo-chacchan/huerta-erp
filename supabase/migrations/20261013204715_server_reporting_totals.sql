-- Read-only reporting; caller's table grants and RLS remain in force.
create or replace function public.erp_validar_periodo(p_empresa_id uuid,p_sucursal_id uuid,p_desde date,p_hasta date) returns void language plpgsql stable security invoker set search_path=public as $$begin
 if auth.uid() is null or not public.rest_tiene_acceso(p_empresa_id) or not exists(select 1 from rest_sucursales where id=p_sucursal_id and empresa_id=p_empresa_id and activa) then raise exception 'Sin acceso a la empresa o sucursal';end if;
 if p_desde is null or p_hasta is null or p_hasta<p_desde or p_hasta-p_desde>365 then raise exception 'Selecciona un periodo de hasta 366 días';end if;
end$$;
create or replace function public.erp_resumen_periodo(p_empresa_id uuid,p_sucursal_id uuid,p_desde date,p_hasta date) returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare result jsonb;v_start timestamptz:=p_desde::timestamp at time zone 'America/Lima';v_end timestamptz:=(p_hasta+1)::timestamp at time zone 'America/Lima';begin
 perform erp_validar_periodo(p_empresa_id,p_sucursal_id,p_desde,p_hasta);
 with paid as materialized(select id,total,metodo_pago from rest_pedidos where empresa_id=p_empresa_id and sucursal_id=p_sucursal_id and estado='pagado' and updated_at>=v_start and updated_at<v_end),
 methods as(select coalesce(metodo_pago,'Sin método') name,sum(total) amount from paid group by coalesce(metodo_pago,'Sin método')),
 products as(select coalesce(i.producto_id::text,i.nombre) key,min(i.nombre) name,sum(i.cantidad) quantity,sum(i.cantidad*i.precio_unitario) amount from rest_pedido_items i join paid p on p.id=i.pedido_id group by coalesce(i.producto_id::text,i.nombre) order by sum(i.cantidad*i.precio_unitario) desc,coalesce(i.producto_id::text,i.nombre) limit 8),
 manual as(select tipo,sum(monto) amount from erp_movimientos_contables where empresa_id=p_empresa_id and fecha between p_desde and p_hasta group by tipo)
 select jsonb_build_object('sales',coalesce((select sum(total) from paid),0),'count',(select count(*) from paid),'otherIncome',coalesce((select amount from manual where tipo='ingreso'),0),
 'expenses',coalesce((select sum(costo_total) from rest_compras_inventario where empresa_id=p_empresa_id and estado='registrada' and created_at>=v_start and created_at<v_end),0)+coalesce((select amount from manual where tipo='egreso'),0),
 'methods',coalesce((select jsonb_object_agg(name,amount) from methods),'{}'::jsonb),'products',coalesce((select jsonb_agg(to_jsonb(products)) from products),'[]'::jsonb)) into result;
 return result;end$$;
create or replace function public.erp_ventas_pagina(p_empresa_id uuid,p_sucursal_id uuid,p_desde date,p_hasta date,p_pagina integer default 0) returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare result jsonb;begin
 perform erp_validar_periodo(p_empresa_id,p_sucursal_id,p_desde,p_hasta);
 if p_pagina is null or p_pagina<0 or p_pagina>100000 then raise exception 'Página inválida';end if;
 select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into result from(select id,numero,tipo_servicio,metodo_pago,total,updated_at from rest_pedidos where empresa_id=p_empresa_id and sucursal_id=p_sucursal_id and estado='pagado' and updated_at>=p_desde::timestamp at time zone 'America/Lima' and updated_at<(p_hasta+1)::timestamp at time zone 'America/Lima' order by updated_at desc,id desc limit 100 offset p_pagina*100)t;
 return result;end$$;
create or replace function public.erp_contabilidad_pagina(p_empresa_id uuid,p_sucursal_id uuid,p_desde date,p_hasta date,p_pagina integer default 0) returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare result jsonb;begin
 perform erp_validar_periodo(p_empresa_id,p_sucursal_id,p_desde,p_hasta);
 if p_pagina is null or p_pagina<0 or p_pagina>100000 then raise exception 'Página inválida';end if;
 with movements as(
 select 'v-'||id::text id,updated_at as date,'ingreso'::text type,'Ventas'::text category,'Pedido #'||numero::text description,total amount,coalesce(metodo_pago,'No indicado') method,'POS'::text source from rest_pedidos where empresa_id=p_empresa_id and sucursal_id=p_sucursal_id and estado='pagado' and updated_at>=p_desde::timestamp at time zone 'America/Lima' and updated_at<(p_hasta+1)::timestamp at time zone 'America/Lima'
 union all
 select 'c-'||c.id::text,c.created_at,'egreso','Compras',coalesce(i.nombre,'Insumo')||' · '||coalesce(c.proveedor,'Sin proveedor'),c.costo_total,'No indicado','Inventario' from rest_compras_inventario c left join rest_insumos i on i.id=c.insumo_id and i.empresa_id=c.empresa_id where c.empresa_id=p_empresa_id and c.estado='registrada' and c.created_at>=p_desde::timestamp at time zone 'America/Lima' and c.created_at<(p_hasta+1)::timestamp at time zone 'America/Lima'
 union all
 select 'm-'||id::text,fecha::timestamp at time zone 'America/Lima',tipo,categoria,descripcion,monto,coalesce(metodo_pago,'No indicado'),'Manual' from erp_movimientos_contables where empresa_id=p_empresa_id and fecha between p_desde and p_hasta)
 select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into result from(select * from movements order by date desc,id desc limit 100 offset p_pagina*100)t;
 return result;end$$;
create or replace function public.erp_dashboard_resumen(p_empresa_id uuid,p_sucursal_id uuid) returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare today date:=(now() at time zone 'America/Lima')::date;v_start timestamptz:=today::timestamp at time zone 'America/Lima';v_end timestamptz:=(today+1)::timestamp at time zone 'America/Lima';result jsonb;begin
 perform erp_validar_periodo(p_empresa_id,p_sucursal_id,today-6,today);
 with paid as materialized(select id,total from rest_pedidos where empresa_id=p_empresa_id and sucursal_id=p_sucursal_id and estado='pagado' and updated_at>=v_start and updated_at<v_end),
 ranking as(select i.nombre name,sum(i.cantidad) quantity from rest_pedido_items i join paid p on p.id=i.pedido_id group by i.nombre order by sum(i.cantidad) desc,i.nombre limit 5),
 recent as(select id,numero as number,tipo_servicio as "serviceType",mesa as "table",estado as status,total from rest_pedidos where empresa_id=p_empresa_id and sucursal_id=p_sucursal_id and estado<>'anulado' and created_at>=v_start and created_at<v_end order by created_at desc,id desc limit 8),
 lowstock as(select id,nombre as name,stock from rest_productos where empresa_id=p_empresa_id and activo and stock<=5 order by stock,nombre,id limit 5),
 cash as(select c.id,c.abierta_at,c.estado,coalesce(sum(p.total),0) total from rest_cajas c left join rest_pedidos p on p.caja_id=c.id and p.empresa_id=c.empresa_id and p.sucursal_id=c.sucursal_id and p.estado='pagado' where c.empresa_id=p_empresa_id and c.sucursal_id=p_sucursal_id and c.abierta_at>=(today-6)::timestamp at time zone 'America/Lima' and c.abierta_at<v_end group by c.id,c.abierta_at,c.estado)
 select jsonb_build_object('sales',coalesce((select sum(total) from paid),0),'paidCount',(select count(*) from paid),
 'activeCount',(select count(*) from rest_pedidos where empresa_id=p_empresa_id and sucursal_id=p_sucursal_id and estado in('nuevo','preparando','listo')),
 'cashOpen',exists(select 1 from rest_cajas where empresa_id=p_empresa_id and sucursal_id=p_sucursal_id and estado='abierta'),
 'lowStockCount',(select count(*) from rest_productos where empresa_id=p_empresa_id and activo and stock<=5),
 'recent',coalesce((select jsonb_agg(to_jsonb(recent)) from recent),'[]'::jsonb),'ranking',coalesce((select jsonb_agg(to_jsonb(ranking)) from ranking),'[]'::jsonb),'lowStock',coalesce((select jsonb_agg(to_jsonb(lowstock)) from lowstock),'[]'::jsonb),
 'cashSessionSales',coalesce((select jsonb_agg(jsonb_build_object('openedAt',day_key::timestamp at time zone 'America/Lima','total',total,'isOpen',is_open)) from(select (abierta_at at time zone 'America/Lima')::date as day_key,sum(total) total,bool_or(estado='abierta') is_open from cash group by (abierta_at at time zone 'America/Lima')::date)d),'[]'::jsonb)) into result;
 return result;end$$;
create or replace function public.erp_ventas_exportar(p_empresa_id uuid,p_sucursal_id uuid,p_desde date,p_hasta date) returns text language plpgsql stable security invoker set search_path=public as $$
declare result text;begin
 perform erp_validar_periodo(p_empresa_id,p_sucursal_id,p_desde,p_hasta);
 select '"Fecha","Pedido","Servicio","Método","Total"'||coalesce(E'\n'||string_agg(line,E'\n' order by updated_at desc,id desc),'') into result from(
 select p.id,p.updated_at,(select string_agg('"'||replace(case when value~'^[=+@-]' then chr(39)||value else value end,'"','""')||'"',',' order by ordinal) from unnest(array[to_char(p.updated_at at time zone 'America/Lima','DD/MM/YYYY'),p.numero::text,p.tipo_servicio,coalesce(p.metodo_pago,''),to_char(p.total,'FM999999999999990.00')]) with ordinality as cells(value,ordinal)) line
 from rest_pedidos p where p.empresa_id=p_empresa_id and p.sucursal_id=p_sucursal_id and p.estado='pagado' and p.updated_at>=p_desde::timestamp at time zone 'America/Lima' and p.updated_at<(p_hasta+1)::timestamp at time zone 'America/Lima')t;
 return result;end$$;
revoke all on function public.erp_ventas_exportar(uuid,uuid,date,date) from public,anon;
grant execute on function public.erp_ventas_exportar(uuid,uuid,date,date) to authenticated;
revoke all on function public.erp_validar_periodo(uuid,uuid,date,date),public.erp_resumen_periodo(uuid,uuid,date,date),public.erp_ventas_pagina(uuid,uuid,date,date,integer),public.erp_contabilidad_pagina(uuid,uuid,date,date,integer),public.erp_dashboard_resumen(uuid,uuid) from public,anon;
grant execute on function public.erp_validar_periodo(uuid,uuid,date,date),public.erp_resumen_periodo(uuid,uuid,date,date),public.erp_ventas_pagina(uuid,uuid,date,date,integer),public.erp_contabilidad_pagina(uuid,uuid,date,date,integer),public.erp_dashboard_resumen(uuid,uuid) to authenticated;
create index if not exists rest_pedidos_cobrados_fecha_idx on public.rest_pedidos(empresa_id,sucursal_id,updated_at desc,id desc) include(total,metodo_pago) where estado='pagado';
create index if not exists rest_compras_fecha_idx on public.rest_compras_inventario(empresa_id,created_at desc,id desc) where estado='registrada';
create index if not exists erp_contabilidad_fecha_idx on public.erp_movimientos_contables(empresa_id,fecha desc,id desc);
