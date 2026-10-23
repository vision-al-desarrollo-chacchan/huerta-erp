-- Security remediation. Apply only after rehearsal and backup verification.
-- Public APIs are invoker wrappers; guarded elevated implementations live outside exposed schemas.
-- Finish existing shifts first; do not invent recipe snapshots for historical open orders.
do $$begin
 if exists(select 1 from public.rest_pedidos where estado not in('pagado','anulado')) then
  raise exception 'Cierra o anula los pedidos abiertos antes de aplicar esta migración';
 end if;
end$$;
create schema if not exists pos_private;
revoke all on schema pos_private from public,anon;
grant usage on schema pos_private to authenticated;
revoke create on schema public from public,anon,authenticated;

-- Business writes must pass guarded RPCs. Preserve SELECT/RLS for the UI.
revoke insert,update,delete,truncate on public.rest_pedidos,public.rest_pedido_items,
 public.rest_cajas,public.rest_movimientos_caja,public.rest_insumos,
 public.rest_movimientos_inventario,public.rest_compras_inventario,
 public.erp_pagos_trabajadores,public.erp_auditoria,public.print_jobs from anon,authenticated;
-- TRUNCATE is not protected by RLS, including on other tenant tables.
do $$declare t record;begin
 for t in select tablename from pg_tables where schemaname='public' loop
  execute format('revoke truncate on public.%I from anon,authenticated',t.tablename);
 end loop;
end$$;

alter table public.rest_insumos add column if not exists sucursal_id uuid references public.rest_sucursales(id);
-- Never duplicate a shared stock balance between branches. Ambiguous legacy data requires assignment before deployment.
do $$begin
 if exists(select 1 from public.rest_insumos i where i.sucursal_id is null and
   (select count(*) from public.rest_sucursales s where s.empresa_id=i.empresa_id and s.activa)<>1)
 then raise exception 'Asigna el inventario legado a una sucursal antes de migrar: empresa con varias sucursales o sin sucursal activa';end if;
end$$;
update public.rest_insumos i set sucursal_id=(select s.id from public.rest_sucursales s where s.empresa_id=i.empresa_id and s.activa) where i.sucursal_id is null;
do $$begin
 if exists(select 1 from public.rest_insumos i join public.rest_sucursales s on s.id=i.sucursal_id where s.empresa_id<>i.empresa_id) then raise exception 'Inventario asignado a una sucursal de otra empresa';end if;
end$$;
alter table public.rest_insumos alter column sucursal_id set not null;
create unique index rest_cajas_una_abierta_sucursal_idx on public.rest_cajas(empresa_id,sucursal_id) where estado='abierta';
alter table public.rest_insumos drop constraint rest_insumos_empresa_id_codigo_key;
alter table public.rest_insumos add unique(empresa_id,sucursal_id,codigo);
alter table public.rest_insumos add column reservado numeric(12,3) not null default 0 check(reservado>=0 and reservado<=stock);
alter table public.rest_productos add column control_inventario boolean not null default false;
update public.rest_productos p set control_inventario=true where exists(select 1 from public.rest_recetas r where r.producto_id=p.id);
alter table public.rest_pedido_items add column receta_snapshot jsonb;
alter table public.rest_pedido_items add column insumos_consumidos boolean not null default false;
alter table public.rest_pedidos add column solicitud_snapshot jsonb;
alter table public.rest_pedido_adiciones add column solicitud_snapshot jsonb;
alter table public.rest_pedidos add column pagado_at timestamptz;
update public.rest_pedidos set pagado_at=updated_at where estado='pagado';
-- Legacy unpaid orders retain old consumption timing until reviewed; no invented historical recipes.

-- Restrict metadata writes. Stock/cost/initial balances use audited RPCs.
drop policy if exists rest_recetas_miembros on public.rest_recetas;
create policy rest_recetas_read on public.rest_recetas for select to authenticated using(public.rest_tiene_acceso(empresa_id));
create policy rest_recetas_manage on public.rest_recetas for all to authenticated
 using(public.rest_tiene_rol_operativo(empresa_id,array['propietario','administrador','supervisor']))
 with check(public.rest_tiene_rol_operativo(empresa_id,array['propietario','administrador','supervisor']));
drop policy if exists print_configuraciones_empresa on public.print_configuraciones;
create policy print_config_read on public.print_configuraciones for select to authenticated using(public.rest_tiene_acceso(empresa_id));
create policy print_config_manage on public.print_configuraciones for all to authenticated
 using(public.rest_tiene_rol_operativo(empresa_id,array['propietario','administrador','supervisor']))
 with check(public.rest_tiene_rol_operativo(empresa_id,array['propietario','administrador','supervisor']));
drop policy if exists ef_configuraciones_empresa on public.ef_configuraciones;
create policy ef_config_read on public.ef_configuraciones for select to authenticated using(public.rest_tiene_acceso(empresa_id));
create policy ef_config_manage on public.ef_configuraciones for all to authenticated using(public.rest_es_admin(empresa_id)) with check(public.rest_es_admin(empresa_id));
drop policy if exists ef_series_empresa on public.ef_series;
create policy ef_series_read on public.ef_series for select to authenticated using(public.rest_tiene_acceso(empresa_id));
create policy ef_series_manage on public.ef_series for all to authenticated using(public.rest_es_admin(empresa_id)) with check(public.rest_es_admin(empresa_id));
-- Harden branch metadata too.
drop policy if exists rest_sucursales_miembros on public.rest_sucursales;
create policy rest_sucursales_read on public.rest_sucursales for select to authenticated using(public.rest_tiene_acceso(empresa_id));
create policy rest_sucursales_manage on public.rest_sucursales for all to authenticated using(public.rest_es_admin(empresa_id)) with check(public.rest_es_admin(empresa_id));


alter table public.rest_cajas add column metodos_cierre jsonb;
alter table public.rest_cajas add column movimientos_cierre jsonb;

create or replace function public.rest_abrir_caja(
  p_empresa_id uuid,
  p_sucursal_id uuid,
  p_monto_apertura numeric
)
returns public.rest_cajas
language plpgsql
security invoker
set search_path = public
as $$
declare
  nueva_caja public.rest_cajas;
begin
  if not public.rest_tiene_rol_operativo(p_empresa_id,array['propietario','administrador','supervisor','cajero','moza_cajera']) then raise exception 'Sin acceso a la empresa'; end if;
  if p_monto_apertura is null or p_monto_apertura::text in ('NaN','Infinity','-Infinity') or p_monto_apertura < 0 then raise exception 'El monto inicial no puede ser negativo'; end if;
  perform pg_advisory_xact_lock(hashtextextended('cash:'||p_sucursal_id::text,0));
  if not exists(select 1 from public.rest_sucursales where id=p_sucursal_id and empresa_id=p_empresa_id and activa) then raise exception 'Sucursal inválida';end if;
  if exists (select 1 from public.rest_cajas where empresa_id = p_empresa_id and sucursal_id = p_sucursal_id and estado = 'abierta') then
    raise exception 'Ya existe una caja abierta en esta sucursal';
  end if;

  insert into public.rest_cajas (
    empresa_id, sucursal_id, abierta_por, abierta_por_nombre, monto_apertura
  ) values (
    p_empresa_id, p_sucursal_id, auth.uid(), public.rest_nombre_usuario(p_empresa_id), p_monto_apertura
  ) returning * into nueva_caja;
  return nueva_caja;
end;
$$;

create or replace function public.rest_cerrar_caja_con_fondo(
  p_caja_id uuid,
  p_monto_contado numeric,
  p_fondo_siguiente numeric default 0,
  p_observaciones text default null
)
returns public.rest_cajas
language plpgsql
security invoker
set search_path = public
as $$
declare
  caja public.rest_cajas;
  esperado numeric(12,2);
  diferencia_calculada numeric(12,2);
begin
  select * into caja from public.rest_cajas where id = p_caja_id for update;
  if caja.id is null or not public.rest_tiene_rol_operativo(caja.empresa_id,array['propietario','administrador','supervisor','cajero','moza_cajera']) then raise exception 'Caja no encontrada'; end if;
  if caja.estado <> 'abierta' then raise exception 'La caja ya se encuentra cerrada'; end if;
  if p_monto_contado is null or p_monto_contado::text in ('NaN','Infinity','-Infinity') or p_monto_contado < 0 then raise exception 'El efectivo contado no puede ser negativo'; end if;
  if p_fondo_siguiente is null or p_fondo_siguiente::text in ('NaN','Infinity','-Infinity') or p_fondo_siguiente < 0 or p_fondo_siguiente > p_monto_contado then raise exception 'El fondo siguiente no puede superar el efectivo contado'; end if;

  if exists(select 1 from public.rest_pedidos where caja_id=caja.id and estado not in('pagado','anulado')) then raise exception 'Resuelve los pedidos abiertos antes de cerrar';end if;
  select caja.monto_apertura
    + coalesce((select sum(p.total) from public.rest_pedidos p where p.caja_id = caja.id and p.estado = 'pagado' and p.metodo_pago = 'Efectivo'), 0)
    + coalesce((select sum(case when m.tipo = 'ingreso' then m.monto else -m.monto end) from public.rest_movimientos_caja m where m.caja_id = caja.id and m.metodo_pago = 'Efectivo'), 0)
  into esperado;

  diferencia_calculada := p_monto_contado - esperado;
  if abs(diferencia_calculada) >= 0.01 and nullif(trim(p_observaciones), '') is null then
    raise exception 'Debes explicar el sobrante o faltante de caja';
  end if;

  update public.rest_cajas set
    estado = 'cerrada', monto_cierre = p_monto_contado, monto_esperado = esperado,
    metodos_cierre=(select coalesce(jsonb_object_agg(metodo_pago,total),'{}'::jsonb) from (select metodo_pago,sum(total) total from public.rest_pedidos where caja_id=caja.id and estado='pagado' group by metodo_pago) totals where metodo_pago is not null),
    movimientos_cierre=(select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at),'[]'::jsonb) from public.rest_movimientos_caja m where m.caja_id=caja.id),
    diferencia = diferencia_calculada, observaciones = nullif(trim(p_observaciones), ''),
    fondo_siguiente = p_fondo_siguiente,
    efectivo_retirado = p_monto_contado - p_fondo_siguiente,
    cerrada_por = auth.uid(), cerrada_por_nombre = public.rest_nombre_usuario(caja.empresa_id),
    cerrada_at = now()
  where id = p_caja_id returning * into caja;
  return caja;
end;
$$;

create or replace function public.rest_registrar_movimiento_caja(
  p_caja_id uuid,
  p_tipo text,
  p_concepto text,
  p_monto numeric,
  p_metodo_pago text default 'Efectivo'
)
returns public.rest_movimientos_caja
language plpgsql
security invoker
set search_path = public
as $$
declare
  caja public.rest_cajas;
  movimiento public.rest_movimientos_caja;
begin
  select * into caja from public.rest_cajas where id = p_caja_id for update;
  if caja.id is null or not public.rest_tiene_rol_operativo(caja.empresa_id,array['propietario','administrador','supervisor','cajero','moza_cajera']) then raise exception 'Caja no encontrada'; end if;
  if caja.estado <> 'abierta' then raise exception 'La caja se encuentra cerrada'; end if;
  if p_tipo is null or p_tipo not in ('ingreso','egreso') then raise exception 'Tipo de movimiento inválido'; end if;
  if nullif(trim(p_concepto), '') is null then raise exception 'El concepto es obligatorio'; end if;
  if p_monto is null or p_monto::text in ('NaN','Infinity','-Infinity') or p_monto <= 0 then raise exception 'El monto debe ser mayor a cero'; end if;

  if p_metodo_pago is null or p_metodo_pago not in ('Efectivo','Yape/Plin','Tarjeta','Transferencia') then raise exception 'Método inválido';end if;
  insert into public.rest_movimientos_caja (
    empresa_id, sucursal_id, caja_id, tipo, concepto, monto, metodo_pago,
    registrado_por, registrado_por_nombre
  ) values (
    caja.empresa_id, caja.sucursal_id, caja.id, p_tipo, trim(p_concepto), p_monto,
    p_metodo_pago, auth.uid(), public.rest_nombre_usuario(caja.empresa_id)
  ) returning * into movimiento;
  return movimiento;
end;
$$;

create or replace function public.rest_cerrar_caja(p_caja_id uuid,p_monto_cierre numeric)
returns public.rest_cajas language sql security invoker set search_path='' as $$
 select public.rest_cerrar_caja_con_fondo(p_caja_id,p_monto_cierre,0,null)$$;
create or replace function public.rest_cerrar_caja_con_arqueo(p_caja_id uuid,p_monto_contado numeric,p_observaciones text default null)
returns public.rest_cajas language sql security invoker set search_path='' as $$
 select public.rest_cerrar_caja_con_fondo(p_caja_id,p_monto_contado,0,p_observaciones)$$;


create table pos_private.order_requests(
 empresa_id uuid not null references public.rest_empresas(id), clave text not null,
 solicitud jsonb not null,pedido_id uuid not null references public.rest_pedidos(id),
 primary key(empresa_id,clave)
);
alter table pos_private.order_requests enable row level security;
revoke all on pos_private.order_requests from public,anon,authenticated;

create or replace function public.rest_crear_pedido(
  p_empresa_id uuid,p_sucursal_id uuid,p_caja_id uuid,p_tipo_servicio text,p_mesa text,p_cliente text,p_items jsonb,p_idempotency_key text
) returns public.rest_pedidos
language plpgsql security invoker set search_path=public
as $$
declare
  pedido public.rest_pedidos;
  solicitud jsonb; anterior record;
  mesa_normalizada text:=nullif(trim(p_mesa),'');
begin
  if auth.uid() is null then raise exception 'Sesión requerida';end if;
  if not public.rest_tiene_rol_operativo(p_empresa_id,array['propietario','administrador','supervisor','cajero','mozo','moza_cajera']) then raise exception 'No tienes permiso para crear pedidos'; end if;
  if nullif(trim(p_idempotency_key),'') is null then raise exception 'Falta la clave unica del pedido'; end if;
  if p_tipo_servicio is null or p_tipo_servicio not in ('salon','delivery','recojo') then raise exception 'Tipo de servicio invalido'; end if;
  if p_tipo_servicio='salon' and mesa_normalizada is null then raise exception 'Selecciona una mesa'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'El pedido no contiene productos'; end if;
  if jsonb_array_length(p_items) not between 1 and 200 then raise exception 'Cantidad de productos inválida';end if;
  perform 1 from public.rest_cajas where id=p_caja_id for update;
  if not exists(select 1 from public.rest_cajas where id=p_caja_id and empresa_id=p_empresa_id and sucursal_id=p_sucursal_id and estado='abierta') then raise exception 'La caja seleccionada no esta abierta'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_empresa_id::text||':'||trim(p_idempotency_key),0));
  solicitud:=jsonb_build_object('items',p_items,'servicio',p_tipo_servicio,'mesa',mesa_normalizada,'cliente',p_cliente,'caja',p_caja_id);
  select * into anterior from pos_private.order_requests where empresa_id=p_empresa_id and clave=trim(p_idempotency_key);
  if found then
   if anterior.solicitud is distinct from solicitud then raise exception 'Clave reutilizada con otro contenido';end if;
   select * into pedido from public.rest_pedidos where id=anterior.pedido_id;return pedido;
  end if;
  select * into pedido from public.rest_pedidos where empresa_id=p_empresa_id and idempotency_key=trim(p_idempotency_key);
  if found then
    if pedido.solicitud_snapshot is distinct from jsonb_build_object('items',p_items,'servicio',p_tipo_servicio,'mesa',mesa_normalizada,'cliente',p_cliente,'caja',p_caja_id) then raise exception 'Clave reutilizada con otro contenido';end if;
    return pedido; end if;

  if exists(
    select 1 from jsonb_array_elements(p_items) item
    left join public.rest_productos producto on producto.id::text=item->>'productId' and producto.empresa_id=p_empresa_id and producto.activo
    where producto.id is null or coalesce(item->>'quantity','')!~'^[0-9]+([.][0-9]{1,3})?$' or (item->>'quantity')::numeric<=0 or (item->>'quantity')::numeric>10000
  ) then raise exception 'El pedido contiene un producto o cantidad invalida'; end if;

  if p_tipo_servicio='salon' then
    perform pg_advisory_xact_lock(hashtextextended(p_empresa_id::text||':'||p_sucursal_id::text||':'||lower(mesa_normalizada),0));
    select * into pedido from public.rest_pedidos
    where empresa_id=p_empresa_id and sucursal_id=p_sucursal_id and tipo_servicio='salon'
      and lower(trim(mesa))=lower(mesa_normalizada) and estado not in ('pagado','anulado')
    order by created_at limit 1;
    if found then
     pedido:=public.rest_agregar_items_pedido(pedido.id,p_items,trim(p_idempotency_key));
     insert into pos_private.order_requests values(p_empresa_id,trim(p_idempotency_key),solicitud,pedido.id);
     return pedido;
    end if;
  end if;

  insert into public.rest_pedidos(empresa_id,sucursal_id,caja_id,tipo_servicio,mesa,cliente,total,creado_por,idempotency_key)
  select p_empresa_id,p_sucursal_id,p_caja_id,p_tipo_servicio,mesa_normalizada,nullif(trim(p_cliente),''),sum(round(producto.precio*(item->>'quantity')::numeric,2)),auth.uid(),trim(p_idempotency_key)
  from jsonb_array_elements(p_items) item join public.rest_productos producto on producto.id::text=item->>'productId' and producto.empresa_id=p_empresa_id and producto.activo returning * into pedido;
  update public.rest_pedidos set solicitud_snapshot=jsonb_build_object('items',p_items,'servicio',p_tipo_servicio,'mesa',mesa_normalizada,'cliente',p_cliente,'caja',p_caja_id) where id=pedido.id;

  insert into public.rest_pedido_items(pedido_id,producto_id,nombre,cantidad,precio_unitario,notas)
  select pedido.id,producto.id,producto.nombre,(item->>'quantity')::numeric,producto.precio,nullif(trim(item->>'notes'),'')
  from jsonb_array_elements(p_items) item join public.rest_productos producto on producto.id::text=item->>'productId' and producto.empresa_id=p_empresa_id and producto.activo;
  insert into pos_private.order_requests values(p_empresa_id,trim(p_idempotency_key),solicitud,pedido.id);
  return pedido;
end;
$$;

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
  caja_id uuid;
  anterior jsonb;
begin
  if auth.uid() is null then raise exception 'Sesión requerida';end if;
  select p.caja_id into caja_id from public.rest_pedidos p where p.id=p_pedido_id;
  perform 1 from public.rest_cajas where id=caja_id for update;
  if nullif(trim(p_idempotency_key),'') is null then raise exception 'Falta la clave unica de la adicion'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'La adicion no contiene productos'; end if;

  if jsonb_array_length(p_items) not between 1 and 200 then raise exception 'Cantidad de productos inválida';end if;
  select * into pedido from public.rest_pedidos where id=p_pedido_id for update;
  if pedido.id is null or not public.rest_tiene_rol_operativo(pedido.empresa_id,array['propietario','administrador','supervisor','cajero','mozo','moza_cajera']) then
    raise exception 'Pedido no encontrado o sin permiso';
  end if;
  select solicitud_snapshot into anterior from public.rest_pedido_adiciones where pedido_id=pedido.id and idempotency_key=trim(p_idempotency_key);
  if found then
   if anterior is distinct from p_items then raise exception 'Clave reutilizada con otro contenido';end if;
   return pedido;
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
      or coalesce(item->>'quantity','') !~ '^[0-9]+([.][0-9]{1,3})?$'
      or (item->>'quantity')::numeric<=0 or (item->>'quantity')::numeric>10000
  ) then raise exception 'La adicion contiene un producto o cantidad invalida'; end if;

  insert into public.rest_pedido_adiciones(pedido_id,idempotency_key,creado_por)
  values(pedido.id,trim(p_idempotency_key),auth.uid())
  on conflict(pedido_id,idempotency_key) do nothing
  returning id into adicion;
  if not found then return pedido; end if;

  update public.rest_pedido_adiciones set solicitud_snapshot=p_items where id=adicion;
  insert into public.rest_pedido_items(pedido_id,producto_id,nombre,cantidad,precio_unitario,notas,adicion_id)
  select pedido.id,producto.id,producto.nombre,(item->>'quantity')::numeric,producto.precio,nullif(trim(item->>'notes'),''),adicion
  from jsonb_array_elements(p_items) item
  join public.rest_productos producto on producto.id::text=item->>'productId' and producto.empresa_id=pedido.empresa_id and producto.activo;

  update public.rest_pedidos
  set total=(select coalesce(sum(round(cantidad*precio_unitario,2)),0) from public.rest_pedido_items where pedido_id=pedido.id),
      estado='nuevo',metodo_pago=null,adicion_activa_id=adicion,updated_at=now()
  where id=pedido.id returning * into pedido;
  return pedido;
end;
$$;

create or replace function public.rest_actualizar_estado_pedido(
  p_pedido_id uuid,
  p_estado text,
  p_metodo_pago text default null
) returns public.rest_pedidos
language plpgsql security definer set search_path=public
as $$
declare p public.rest_pedidos; caja_id uuid;
begin
  if auth.uid() is null then raise exception 'Sesión requerida';end if;
  select x.caja_id into caja_id from public.rest_pedidos x where x.id=p_pedido_id;
  perform 1 from public.rest_cajas where id=caja_id for update;
  select * into p from public.rest_pedidos where id=p_pedido_id for update;
  if p.id is null or not public.rest_tiene_acceso(p.empresa_id) then raise exception 'Pedido no encontrado'; end if;
  if p.estado=p_estado and (p_estado<>'pagado' or p.metodo_pago is not distinct from p_metodo_pago) then return p;end if;
  if p.estado='anulado' or p.estado='pagado' then raise exception 'El pedido ya esta finalizado'; end if;

  if p_estado='preparando' and p.estado='nuevo' then
    if not public.rest_tiene_rol_operativo(p.empresa_id,array['propietario','administrador','supervisor','cocina']) then raise exception 'Sin permiso de cocina'; end if;
  elsif p_estado='listo' and p.estado='preparando' then
    if not public.rest_tiene_rol_operativo(p.empresa_id,array['propietario','administrador','supervisor','cocina']) then raise exception 'Sin permiso de cocina'; end if;
  elsif p_estado='entregado' and p.estado='listo' then
    if not public.rest_tiene_rol_operativo(p.empresa_id,array['propietario','administrador','supervisor','cocina','mozo','moza_cajera']) then raise exception 'Sin permiso para entregar'; end if;
  elsif p_estado='pagado' and p.estado='entregado' then
    if not public.rest_tiene_rol_operativo(p.empresa_id,array['propietario','administrador','supervisor','cajero','moza_cajera']) then raise exception 'Sin permiso para cobrar'; end if;
    if p_metodo_pago is null or p_metodo_pago not in ('Efectivo','Yape/Plin','Tarjeta','Transferencia') then raise exception 'Metodo de pago invalido'; end if;
    if not exists(select 1 from public.rest_cajas where id=p.caja_id and estado='abierta') then raise exception 'La caja del pedido ya no esta abierta'; end if;
  else
    raise exception 'Cambio de estado no permitido: % a %',p.estado,p_estado;
  end if;

  update public.rest_pedidos
  set estado=p_estado,pagado_at=case when p_estado='pagado' then now() else pagado_at end,metodo_pago=case when p_estado='pagado' then p_metodo_pago else metodo_pago end,updated_at=now()
  where id=p.id returning * into p;
  return p;
end;
$$;

create or replace function public.erp_anular_pedido(p_pedido_id uuid,p_motivo text)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare p public.rest_pedidos; c uuid;begin
 if auth.uid() is null then raise exception 'Sesión requerida';end if;
 select caja_id into c from public.rest_pedidos where id=p_pedido_id;
 perform 1 from public.rest_cajas where id=c for update;
 select * into p from public.rest_pedidos where id=p_pedido_id for update;
 if p.id is null or not public.rest_es_admin(p.empresa_id) then raise exception 'Sin autorización';end if;
 if p.estado='anulado' then return;end if;
 if p.estado in('pagado','entregado') then raise exception 'Pedido cobrado o entregado: requiere devolución separada, no anulación';end if;
 if not exists(select 1 from public.rest_cajas where id=c and estado='abierta') then raise exception 'Caja cerrada';end if;
 if nullif(trim(p_motivo),'') is null then raise exception 'Motivo obligatorio';end if;
 if exists(select 1 from public.ef_documentos where pedido_id=p.id and estado not in('rechazado','anulado')) then raise exception 'Resuelve primero el comprobante electrónico';end if;
 update public.print_jobs set estado='cancelado',updated_at=now() where pedido_id=p.id and estado in('pendiente','fallido');
 insert into public.print_jobs(empresa_id,sucursal_id,pedido_id,area,idempotency_key,payload)
 select p.empresa_id,p.sucursal_id,p.id,c.area,'cancel:'||p.id||':'||c.area,
 jsonb_build_object('printerName',c.nombre_impresora,'widthMm',c.ancho_mm,'copies',c.copias,'content','ANULACIÓN - NO PREPARAR / NO DESPACHAR'||E'\nPedido #'||p.numero||E'\nMotivo: '||trim(p_motivo)||E'\n')
 from public.print_configuraciones c where c.empresa_id=p.empresa_id and c.sucursal_id=p.sucursal_id and c.activa and c.auto_imprimir
 and exists(select 1 from public.print_jobs j where j.pedido_id=p.id and j.area=c.area and j.estado in('impreso','imprimiendo','incierto'))
 on conflict(empresa_id,idempotency_key) do nothing;
 update public.rest_pedidos set estado='anulado',anulado_at=now(),anulado_por=auth.uid(),motivo_anulacion=trim(p_motivo) where id=p.id;
 insert into public.erp_auditoria(empresa_id,entidad,entidad_id,accion,motivo,datos,realizado_por,realizado_por_nombre)
 values(p.empresa_id,'pedido',p.id,'anular',trim(p_motivo),jsonb_build_object('estado_anterior',p.estado,'total',p.total,'consumo_conservado',p.inventario_descontado),auth.uid(),public.rest_nombre_usuario(p.empresa_id));
end$$;

create or replace function public.rest_registrar_movimiento_inventario(
  p_insumo_id uuid, p_tipo text, p_cantidad numeric, p_motivo text
) returns public.rest_insumos
language plpgsql security invoker set search_path = public as $$
declare insumo public.rest_insumos; nuevo numeric; movimiento_tipo text;
begin
  select * into insumo from public.rest_insumos where id = p_insumo_id for update;
  if insumo.id is null or not public.rest_tiene_rol_operativo(insumo.empresa_id,array['propietario','administrador','supervisor']) then raise exception 'Insumo no encontrado'; end if;
  if p_tipo is null or p_tipo not in ('entrada','salida','ajuste','merma') then raise exception 'Tipo de movimiento inválido'; end if;
  if p_cantidad is null or p_cantidad::text in ('NaN','Infinity','-Infinity') or p_cantidad = 0 then raise exception 'La cantidad no puede ser cero'; end if;
  if nullif(trim(p_motivo),'') is null then raise exception 'Motivo obligatorio';end if;
  movimiento_tipo := p_tipo;
  if p_tipo = 'entrada' then nuevo := insumo.stock + abs(p_cantidad);
  elsif p_tipo in ('salida','merma') then nuevo := insumo.stock - abs(p_cantidad);
  else nuevo := insumo.stock + p_cantidad;
  end if;
  if nuevo < insumo.reservado then raise exception 'Stock insuficiente para %: disponible % %', insumo.nombre, insumo.stock, insumo.unidad; end if;
  update public.rest_insumos set stock = nuevo where id = insumo.id returning * into insumo;
  insert into public.rest_movimientos_inventario(empresa_id,insumo_id,tipo,cantidad,saldo_anterior,saldo_nuevo,motivo,registrado_por,registrado_por_nombre)
  values(insumo.empresa_id,insumo.id,movimiento_tipo,abs(p_cantidad),insumo.stock - case when p_tipo='entrada' then abs(p_cantidad) when p_tipo in ('salida','merma') then -abs(p_cantidad) else p_cantidad end,insumo.stock,coalesce(nullif(trim(p_motivo),''),'Movimiento manual'),auth.uid(),public.rest_nombre_usuario(insumo.empresa_id));
  return insumo;
end; $$;

create or replace function public.rest_registrar_compra_inventario(p_insumo_id uuid,p_presentacion text,p_cantidad_presentaciones numeric,p_contenido numeric,p_costo_total numeric,p_proveedor text default null)
returns public.rest_insumos language plpgsql security invoker set search_path=public as $$
declare i public.rest_insumos; cantidad_base numeric(12,3); costo_nuevo numeric(14,4); stock_anterior numeric(12,3);
begin
 select * into i from public.rest_insumos where id=p_insumo_id for update;
 if i.id is null or not public.rest_tiene_rol_operativo(i.empresa_id,array['propietario','administrador','supervisor']) then raise exception 'Insumo no encontrado'; end if;
 if p_cantidad_presentaciones is null or p_contenido is null or p_costo_total is null or p_cantidad_presentaciones::text in('NaN','Infinity','-Infinity') or p_contenido::text in('NaN','Infinity','-Infinity') or p_costo_total::text in('NaN','Infinity','-Infinity') or p_cantidad_presentaciones<=0 or p_contenido<=0 or p_costo_total<0 then raise exception 'Revisa las cantidades y el costo'; end if;
 cantidad_base:=p_cantidad_presentaciones*p_contenido; stock_anterior:=i.stock;
 costo_nuevo:=((i.stock*i.costo_promedio)+p_costo_total)/(i.stock+cantidad_base);
 update public.rest_insumos set stock=stock+cantidad_base,costo_promedio=costo_nuevo where id=i.id returning * into i;
 insert into public.rest_compras_inventario(empresa_id,insumo_id,presentacion,cantidad_presentaciones,contenido_por_presentacion,unidad_base,cantidad_base,costo_total,costo_unitario,proveedor,registrado_por)
 values(i.empresa_id,i.id,trim(p_presentacion),p_cantidad_presentaciones,p_contenido,i.unidad,cantidad_base,p_costo_total,p_costo_total/cantidad_base,nullif(trim(p_proveedor),''),auth.uid());
 insert into public.rest_movimientos_inventario(empresa_id,insumo_id,tipo,cantidad,saldo_anterior,saldo_nuevo,motivo,registrado_por,registrado_por_nombre)
 values(i.empresa_id,i.id,'entrada',cantidad_base,stock_anterior,i.stock,'Compra: '||p_cantidad_presentaciones||' '||trim(p_presentacion),auth.uid(),public.rest_nombre_usuario(i.empresa_id));
 return i;
end; $$;

create or replace function public.erp_anular_compra_inventario(p_compra_id uuid,p_motivo text)
returns void language plpgsql security invoker set search_path=public as $$
declare c public.rest_compras_inventario; i public.rest_insumos; anterior numeric;
begin
 select * into c from public.rest_compras_inventario where id=p_compra_id for update;
 if c.id is null or not public.rest_es_admin(c.empresa_id) then raise exception 'Compra no encontrada o sin autorización'; end if;
 if c.estado='anulada' then raise exception 'La compra ya fue anulada'; end if;
 if nullif(trim(p_motivo),'') is null then raise exception 'El motivo es obligatorio'; end if;
 select * into i from public.rest_insumos where id=c.insumo_id for update; anterior:=i.stock;
 if i.stock-i.reservado<c.cantidad_base then raise exception 'No se puede anular: parte del stock comprado ya fue consumido'; end if;
 update public.rest_insumos set costo_promedio=case when stock=c.cantidad_base then 0 else greatest(0,(stock*costo_promedio-c.costo_total)/(stock-c.cantidad_base)) end,stock=stock-c.cantidad_base where id=i.id;
 insert into public.rest_movimientos_inventario(empresa_id,insumo_id,tipo,cantidad,saldo_anterior,saldo_nuevo,motivo,registrado_por,registrado_por_nombre)
 values(c.empresa_id,i.id,'ajuste',c.cantidad_base,anterior,anterior-c.cantidad_base,'Anulación de compra · '||trim(p_motivo),auth.uid(),public.rest_nombre_usuario(c.empresa_id));
 update public.rest_compras_inventario set estado='anulada',anulada_at=now(),anulada_por=auth.uid(),motivo_anulacion=trim(p_motivo) where id=c.id;
 insert into public.erp_auditoria(empresa_id,entidad,entidad_id,accion,motivo,datos,realizado_por,realizado_por_nombre)
 values(c.empresa_id,'compra',c.id,'anular',trim(p_motivo),jsonb_build_object('monto',c.costo_total,'cantidad',c.cantidad_base),auth.uid(),public.rest_nombre_usuario(c.empresa_id));
end $$;

create or replace function public.erp_registrar_pago_trabajador(p_empresa_id uuid,p_empleado_id uuid,p_periodo text,p_monto numeric,p_metodo_pago text,p_observacion text default null)
returns public.erp_pagos_trabajadores language plpgsql security invoker set search_path=public as $$
declare e public.erp_empleados; c public.rest_cajas; mc public.erp_movimientos_contables; caja_mov public.rest_movimientos_caja; pago public.erp_pagos_trabajadores; concepto text;
begin
 if not public.rest_es_admin(p_empresa_id) then raise exception 'Solo el propietario o administrador puede registrar pagos'; end if;
 select * into e from public.erp_empleados where id=p_empleado_id and empresa_id=p_empresa_id;
 if e.id is null then raise exception 'Trabajador no encontrado'; end if;
 if p_monto is null or p_monto::text in('NaN','Infinity','-Infinity') or p_monto<=0 or nullif(trim(p_periodo),'') is null then raise exception 'Completa periodo y monto'; end if;
 concepto:='Pago de personal · '||trim(e.nombres||' '||e.apellidos)||' · '||trim(p_periodo);
 insert into public.erp_movimientos_contables(empresa_id,fecha,tipo,categoria,descripcion,monto,metodo_pago,referencia,registrado_por)
 values(p_empresa_id,current_date,'egreso','Planilla y personal',concepto,p_monto,p_metodo_pago,trim(p_periodo),auth.uid()) returning * into mc;
 if p_metodo_pago is null or p_metodo_pago not in('Efectivo','Yape/Plin','Tarjeta','Transferencia') then raise exception 'Método inválido';end if;
 if lower(p_metodo_pago)='efectivo' then
   if (select count(*) from public.rest_cajas where empresa_id=p_empresa_id and estado='abierta')<>1 then raise exception 'Pago en efectivo requiere una única caja abierta';end if;
   select * into c from public.rest_cajas where empresa_id=p_empresa_id and estado='abierta' order by abierta_at desc limit 1 for update;
   if c.id is null then raise exception 'Abre la caja antes de pagar en efectivo'; end if;
   insert into public.rest_movimientos_caja(empresa_id,sucursal_id,caja_id,tipo,concepto,monto,metodo_pago,registrado_por,registrado_por_nombre)
   values(p_empresa_id,c.sucursal_id,c.id,'egreso',concepto,p_monto,'Efectivo',auth.uid(),public.rest_nombre_usuario(p_empresa_id)) returning * into caja_mov;
 end if;
 insert into public.erp_pagos_trabajadores(empresa_id,empleado_id,periodo,monto,metodo_pago,observacion,movimiento_contable_id,movimiento_caja_id,pagado_por)
 values(p_empresa_id,e.id,trim(p_periodo),p_monto,p_metodo_pago,nullif(trim(p_observacion),''),mc.id,caja_mov.id,auth.uid()) returning * into pago;
 insert into public.erp_auditoria(empresa_id,entidad,entidad_id,accion,motivo,datos,realizado_por,realizado_por_nombre)
 values(p_empresa_id,'empleado',e.id,'pago',coalesce(nullif(trim(p_observacion),''),'Pago de remuneración'),jsonb_build_object('periodo',p_periodo,'monto',p_monto,'metodo',p_metodo_pago),auth.uid(),public.rest_nombre_usuario(p_empresa_id));
 return pago;
end $$;

create or replace function public.ef_reservar_documento(
 p_empresa_id uuid,p_sucursal_id uuid,p_pedido_id uuid,p_tipo_documento text,p_idempotency_key text,p_total numeric,
 p_receptor_documento text default null,p_receptor_nombre text default null)
returns public.ef_documentos language plpgsql security invoker set search_path=public,pg_temp as $$
declare p public.rest_pedidos;d public.ef_documentos;s public.ef_series;begin
 if auth.uid() is null or not public.rest_tiene_rol_operativo(p_empresa_id,array['propietario','administrador','supervisor','cajero','moza_cajera']) then raise exception 'Sin autorización fiscal';end if;
 if nullif(trim(p_idempotency_key),'') is null or p_tipo_documento is null or p_tipo_documento not in('boleta','factura') then raise exception 'Solicitud inválida';end if;
 perform pg_advisory_xact_lock(hashtextextended('fiscal:'||p_empresa_id::text||':'||p_idempotency_key,0));
 select * into p from public.rest_pedidos where id=p_pedido_id and empresa_id=p_empresa_id and sucursal_id=p_sucursal_id for update;
 if p.id is null or p.estado<>'pagado' or p_total is null or p_total<>p.total then raise exception 'Pedido o total inválido; cobra primero';end if;
 select * into d from public.ef_documentos where empresa_id=p_empresa_id and idempotency_key=trim(p_idempotency_key);
 if found then
  if d.pedido_id is distinct from p.id or d.tipo_documento is distinct from p_tipo_documento or d.total is distinct from p.total
   or d.receptor_documento is distinct from nullif(p_receptor_documento,'') or d.receptor_nombre is distinct from nullif(p_receptor_nombre,'') then raise exception 'Clave reutilizada';end if;
  return d;
 end if;
 if exists(select 1 from public.ef_documentos where pedido_id=p.id and tipo_documento=p_tipo_documento) then raise exception 'El pedido ya tiene comprobante de ese tipo';end if;
 if (select count(*) from public.ef_series where empresa_id=p_empresa_id and sucursal_id=p_sucursal_id and tipo_documento=p_tipo_documento and activa)<>1 then raise exception 'Configura una única serie activa';end if;
 select * into s from public.ef_series where empresa_id=p_empresa_id and sucursal_id=p_sucursal_id and tipo_documento=p_tipo_documento and activa for update;
 insert into public.ef_documentos(empresa_id,sucursal_id,pedido_id,tipo_documento,serie,numero,idempotency_key,total,receptor_documento,receptor_nombre)
 values(p_empresa_id,p_sucursal_id,p.id,p_tipo_documento,s.serie,s.siguiente_numero,trim(p_idempotency_key),p.total,nullif(p_receptor_documento,''),nullif(p_receptor_nombre,'')) returning * into d;
 update public.ef_series set siguiente_numero=siguiente_numero+1 where id=s.id;return d;
end$$;

create or replace function public.rest_guardar_insumo(p_empresa_id uuid,p_sucursal_id uuid,p_codigo text,p_nombre text,p_categoria text,p_unidad text,p_stock numeric,p_minimo numeric,p_costo numeric,p_id uuid default null)
returns public.rest_insumos language plpgsql security invoker set search_path=public,pg_temp as $$
declare i public.rest_insumos;begin
 if auth.uid() is null or not public.rest_tiene_rol_operativo(p_empresa_id,array['propietario','administrador','supervisor']) then raise exception 'Sin permiso de inventario';end if;
 if not exists(select 1 from public.rest_sucursales where id=p_sucursal_id and empresa_id=p_empresa_id and activa) then raise exception 'Sucursal inválida';end if;
 if nullif(trim(p_codigo),'') is null or nullif(trim(p_nombre),'') is null or p_unidad is null or p_unidad not in('unidad','kg','g','litro','ml')
 or p_stock is null or p_minimo is null or p_costo is null or p_stock::text in('NaN','Infinity','-Infinity') or p_minimo::text in('NaN','Infinity','-Infinity') or p_costo::text in('NaN','Infinity','-Infinity') or least(p_stock,p_minimo,p_costo)<0 then raise exception 'Datos inválidos';end if;
 if p_id is not null then
  select * into i from public.rest_insumos where id=p_id and empresa_id=p_empresa_id and sucursal_id=p_sucursal_id for update;
  if i.id is null then raise exception 'Insumo no encontrado';end if;
  if i.unidad<>p_unidad and (i.stock>0 or exists(select 1 from public.rest_recetas where insumo_id=i.id)) then raise exception 'No puedes cambiar la unidad de un insumo con existencias o recetas';end if;
  if i.stock<>p_stock or i.costo_promedio<>p_costo then raise exception 'Usa compras o ajustes para cambiar stock y costo';end if;
  update public.rest_insumos set codigo=trim(p_codigo),nombre=trim(p_nombre),categoria=p_categoria,unidad=p_unidad,stock_minimo=p_minimo where id=i.id returning * into i;
 else
  insert into public.rest_insumos(empresa_id,sucursal_id,codigo,nombre,categoria,unidad,stock,stock_minimo,costo_promedio)
  values(p_empresa_id,p_sucursal_id,trim(p_codigo),trim(p_nombre),p_categoria,p_unidad,p_stock,p_minimo,p_costo) returning * into i;
  if p_stock>0 then
   insert into public.rest_movimientos_inventario(empresa_id,insumo_id,tipo,cantidad,saldo_anterior,saldo_nuevo,motivo,registrado_por,registrado_por_nombre)
   values(p_empresa_id,i.id,'entrada',p_stock,0,p_stock,'Saldo inicial',auth.uid(),public.rest_nombre_usuario(p_empresa_id));
  end if;
 end if;
 insert into public.erp_auditoria(empresa_id,entidad,entidad_id,accion,motivo,datos,realizado_por,realizado_por_nombre)
 values(p_empresa_id,'insumo',i.id,'guardar','Configuración de insumo',to_jsonb(i),auth.uid(),public.rest_nombre_usuario(p_empresa_id));return i;
end$$;
revoke update on public.rest_insumos from authenticated;
grant update(activo) on public.rest_insumos to authenticated;
drop policy if exists rest_insumos_miembros on public.rest_insumos;
create policy rest_insumos_read on public.rest_insumos for select to authenticated using(public.rest_tiene_acceso(empresa_id));
create policy rest_insumos_manage on public.rest_insumos for update to authenticated using(public.rest_tiene_rol_operativo(empresa_id,array['propietario','administrador','supervisor'])) with check(public.rest_tiene_rol_operativo(empresa_id,array['propietario','administrador','supervisor']));


-- Move guarded implementations; preserve public RPC signatures/defaults.
do $$declare f record; args text;begin
 for f in select p.oid,p.proname,pg_get_function_arguments(p.oid) arguments,pg_get_function_identity_arguments(p.oid) identity_args,pg_get_function_result(p.oid) result,p.pronargs from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any(array['rest_abrir_caja','rest_cerrar_caja_con_fondo','rest_registrar_movimiento_caja','rest_crear_pedido','rest_agregar_items_pedido','rest_actualizar_estado_pedido','erp_anular_pedido','rest_registrar_movimiento_inventario','rest_registrar_compra_inventario','erp_anular_compra_inventario','erp_registrar_pago_trabajador','ef_reservar_documento','rest_guardar_insumo']) loop
  execute format('alter function public.%I(%s) security definer',f.proname,f.identity_args);
  execute format('alter function public.%I(%s) set search_path=public,pg_temp',f.proname,f.identity_args);
  execute format('alter function public.%I(%s) set schema pos_private',f.proname,f.identity_args);
  select string_agg('$'||x,',' order by x) into args from generate_series(1,f.pronargs) x;
  execute format('create function public.%I(%s) returns %s language sql security invoker set search_path=%L as %L',f.proname,f.arguments,f.result,'','select pos_private.'||quote_ident(f.proname)||'('||args||')');
  execute format('revoke all on function pos_private.%I(%s) from public,anon',f.proname,f.identity_args);
  execute format('revoke all on function public.%I(%s) from public,anon',f.proname,f.identity_args);
  execute format('grant execute on function pos_private.%I(%s) to authenticated',f.proname,f.identity_args);
  execute format('grant execute on function public.%I(%s) to authenticated',f.proname,f.identity_args);
 end loop;
end$$;

-- Recipe snapshots are immutable per line. Reserve on order entry, consume on preparation.
-- New stock is never inferred for already existing orders.
create function pos_private.snapshot_recipe() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare p public.rest_pedidos; controlled boolean;begin
 select * into p from public.rest_pedidos where id=new.pedido_id;
 if p.id is null or p.estado in('pagado','anulado') then raise exception 'Pedido finalizado';end if;
 select control_inventario into controlled from public.rest_productos where id=new.producto_id and empresa_id=p.empresa_id;
 if not found then raise exception 'Producto de otra empresa';end if;
 select coalesce(jsonb_agg(jsonb_build_object('insumo_id',i.id,'cantidad',r.cantidad,'unidad',i.unidad) order by i.id),'[]'::jsonb) into new.receta_snapshot
 from public.rest_recetas r join public.rest_insumos i on i.id=r.insumo_id
 where r.producto_id=new.producto_id and r.empresa_id=p.empresa_id and i.empresa_id=p.empresa_id and i.sucursal_id=p.sucursal_id and i.activo;
 if controlled and jsonb_array_length(new.receta_snapshot)=0 then raise exception 'Configura la receta de este producto en la sucursal';end if;
 new.insumos_consumidos:=false;return new;
end$$;
create trigger rest_items_snapshot before insert on public.rest_pedido_items for each row execute function pos_private.snapshot_recipe();

create function pos_private.reserve_items() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare c record; i public.rest_insumos;begin
 for c in select (r->>'insumo_id')::uuid id,sum((r->>'cantidad')::numeric*a.cantidad)::numeric(12,3) cantidad
 from affected_items a cross join lateral jsonb_array_elements(a.receta_snapshot) r
 group by (r->>'insumo_id')::uuid order by (r->>'insumo_id')::uuid loop
  select * into i from public.rest_insumos where id=c.id for update;
  if c.cantidad<=0 then raise exception 'Cantidad inferior a la precisión de inventario';end if;
  if i.stock-i.reservado<c.cantidad then raise exception 'Stock disponible insuficiente de %',i.nombre;end if;
  update public.rest_insumos set reservado=reservado+c.cantidad where id=i.id;
 end loop;return null;
end$$;
create trigger rest_items_reserve after insert on public.rest_pedido_items referencing new table as affected_items for each statement execute function pos_private.reserve_items();

-- Replace old pay-time trigger. Legacy unsnapshotted unpaid lines are snapshotted and checked at preparation/payment.
create or replace function public.rest_descontar_inventario_pedido() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
declare c record;i public.rest_insumos;begin
 if new.estado=old.estado then return new;end if;
 if new.estado='anulado' then
  for c in select (r->>'insumo_id')::uuid id,sum((r->>'cantidad')::numeric*pi.cantidad)::numeric(12,3) cantidad
   from public.rest_pedido_items pi cross join lateral jsonb_array_elements(pi.receta_snapshot) r
   where pi.pedido_id=new.id and not pi.insumos_consumidos
   group by (r->>'insumo_id')::uuid order by (r->>'insumo_id')::uuid loop
   perform 1 from public.rest_insumos where id=c.id for update;
   update public.rest_insumos set reservado=reservado-c.cantidad where id=c.id;
  end loop;return new;
 end if;
 if new.estado not in('preparando','pagado') then return new;end if;
 -- Do not replay legacy paid consumption; historical rows remain unchanged.
 if old.inventario_descontado and not exists(select 1 from public.rest_pedido_items where pedido_id=new.id and receta_snapshot is not null and not insumos_consumidos) then return new;end if;
 for c in select (r->>'insumo_id')::uuid id,sum((r->>'cantidad')::numeric*pi.cantidad)::numeric(12,3) cantidad
  from public.rest_pedido_items pi cross join lateral jsonb_array_elements(pi.receta_snapshot) r
  where pi.pedido_id=new.id and not pi.insumos_consumidos
  group by (r->>'insumo_id')::uuid order by (r->>'insumo_id')::uuid loop
  select * into i from public.rest_insumos where id=c.id for update;
  if i.stock<c.cantidad or i.reservado<c.cantidad then raise exception 'Inventario reservado inconsistente';end if;
  update public.rest_insumos set stock=stock-c.cantidad,reservado=reservado-c.cantidad where id=i.id;
  insert into public.rest_movimientos_inventario(empresa_id,insumo_id,pedido_id,tipo,cantidad,saldo_anterior,saldo_nuevo,motivo,registrado_por,registrado_por_nombre)
  values(new.empresa_id,i.id,new.id,'venta',c.cantidad,i.stock,i.stock-c.cantidad,'Consumo de receta al preparar',auth.uid(),public.rest_nombre_usuario(new.empresa_id));
 end loop;
 if exists(select 1 from public.rest_pedido_items where pedido_id=new.id and receta_snapshot is null) and not old.inventario_descontado then
  raise exception 'Pedido legado: revisa sus recetas antes de preparar o cobrar';
 end if;
 update public.rest_pedido_items set insumos_consumidos=true where pedido_id=new.id and receta_snapshot is not null and not insumos_consumidos;
 new.inventario_descontado:=true;return new;
end$$;
revoke all on function public.rest_descontar_inventario_pedido() from public,anon,authenticated;

create function pos_private.validate_recipe() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare base_unit text;begin
 if auth.uid() is null or not public.rest_tiene_rol_operativo(new.empresa_id,array['propietario','administrador','supervisor']) then raise exception 'Sin permiso de recetas';end if;
 if not exists(select 1 from public.rest_productos where id=new.producto_id and empresa_id=new.empresa_id)
 or not exists(select 1 from public.rest_insumos where id=new.insumo_id and empresa_id=new.empresa_id)
 or new.cantidad::text in('NaN','Infinity','-Infinity') then raise exception 'Receta inválida';end if;
 select unidad into base_unit from public.rest_insumos where id=new.insumo_id;
 new.cantidad_uso:=coalesce(new.cantidad_uso,new.cantidad);
 new.unidad_uso:=coalesce(new.unidad_uso,base_unit);
 if new.cantidad_uso::text in('NaN','Infinity','-Infinity') or new.cantidad_uso<=0 then raise exception 'Cantidad de receta inválida';end if;
 if new.unidad_uso=base_unit then new.cantidad:=new.cantidad_uso;
 elsif (new.unidad_uso='g' and base_unit='kg') or (new.unidad_uso='ml' and base_unit='litro') then new.cantidad:=new.cantidad_uso/1000;
 else raise exception 'Unidades incompatibles';end if;
 update public.rest_productos set control_inventario=true where id=new.producto_id;
 return new;
end$$;
create trigger rest_recetas_validate before insert or update on public.rest_recetas for each row execute function pos_private.validate_recipe();
revoke all on function pos_private.snapshot_recipe(),pos_private.reserve_items(),pos_private.validate_recipe() from public,anon,authenticated;

-- Protect the relationship used by elevated RPCs, even if future grants change.
create function pos_private.validate_branch_reference() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from public.rest_sucursales where id=new.sucursal_id and empresa_id=new.empresa_id) then raise exception 'Sucursal de otra empresa';end if;
 return new;
end$$;
create trigger rest_insumos_branch before insert or update on public.rest_insumos for each row execute function pos_private.validate_branch_reference();
create trigger print_config_branch before insert or update on public.print_configuraciones for each row execute function pos_private.validate_branch_reference();
create trigger ef_series_branch before insert or update on public.ef_series for each row execute function pos_private.validate_branch_reference();
revoke all on function pos_private.validate_branch_reference() from public,anon,authenticated;

-- Atomic print outbox. A stable job UUID is the bridge's deduplication identity.
alter table public.print_jobs drop constraint print_jobs_estado_check;
alter table public.print_jobs add constraint print_jobs_estado_check check(estado in('pendiente','imprimiendo','impreso','fallido','incierto','cancelado'));
alter table public.print_jobs add column lease_token uuid;
alter table public.print_jobs add column lease_until timestamptz;
alter table public.print_jobs add column claimed_by uuid references auth.users(id);
create function pos_private.enqueue_items() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 insert into public.print_jobs(empresa_id,sucursal_id,pedido_id,area,idempotency_key,payload)
 select p.empresa_id,p.sucursal_id,p.id,c.area,'order:'||p.id||':'||c.area||':'||coalesce(a.adicion_id::text,'v1'),
 jsonb_build_object('printerName',c.nombre_impresora,'widthMm',c.ancho_mm,'copies',c.copias,
 'content',e.nombre||E'\n'||upper(c.area)||' - COMANDA #'||p.numero||E'\nServicio: '||p.tipo_servicio||coalesce(' - '||p.mesa,'')||E'\n'||
 string_agg(a.cantidad||' x '||a.nombre||coalesce(E'\nNota: '||a.notas,''),E'\n' order by a.id)||E'\n')
 from affected_items a join public.rest_pedidos p on p.id=a.pedido_id
 join public.rest_empresas e on e.id=p.empresa_id
 join public.print_configuraciones c on c.empresa_id=p.empresa_id and c.sucursal_id=p.sucursal_id and c.activa and c.auto_imprimir
 group by p.id,e.nombre,c.area,c.nombre_impresora,c.ancho_mm,c.copias,a.adicion_id
 on conflict(empresa_id,idempotency_key) do nothing;
 return null;
end$$;
create trigger rest_items_outbox after insert on public.rest_pedido_items referencing new table as affected_items for each statement execute function pos_private.enqueue_items();
revoke all on function pos_private.enqueue_items() from public,anon,authenticated;

create function pos_private.claim_print(p_job_id uuid) returns public.print_jobs language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.print_jobs;begin
 select * into j from public.print_jobs where id=p_job_id for update;
 if j.id is null or auth.uid() is null or not public.rest_tiene_rol_operativo(j.empresa_id,array['propietario','administrador','supervisor','cajero','moza_cajera','cocina']) then raise exception 'Sin permiso de impresión';end if;
 if j.estado='imprimiendo' and j.lease_until<now() then
  update public.print_jobs set estado='incierto',lease_token=null,lease_until=null,ultimo_error='Se perdió la confirmación; verifica el papel antes de reimprimir' where id=j.id;
  return null;
 end if;
 if j.estado not in('pendiente','fallido') then return null;end if;
 update public.print_jobs set estado='imprimiendo',lease_token=gen_random_uuid(),lease_until=now()+interval '1 minute',claimed_by=auth.uid(),intentos=intentos+1,updated_at=now() where id=j.id returning * into j;return j;
end$$;
create function pos_private.finish_print(p_job_id uuid,p_lease_token uuid,p_estado text,p_error text default null) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or p_estado is null or p_estado not in('impreso','fallido','incierto') then raise exception 'Resultado inválido';end if;
 update public.print_jobs set estado=p_estado,ultimo_error=left(p_error,500),impreso_at=case when p_estado='impreso' then now() else null end,lease_token=null,lease_until=null,updated_at=now()
 where id=p_job_id and claimed_by=auth.uid() and lease_token=p_lease_token and estado='imprimiendo' and lease_until>=now() and public.rest_tiene_acceso(empresa_id);
 if not found then raise exception 'El trabajo cambió de propietario o venció';end if;
end$$;
create function public.rest_tomar_impresion(p_job_id uuid) returns public.print_jobs language sql security invoker set search_path='' as $$select pos_private.claim_print(p_job_id)$$;
create function public.rest_finalizar_impresion(p_job_id uuid,p_lease_token uuid,p_estado text,p_error text default null) returns void language sql security invoker set search_path='' as $$select pos_private.finish_print(p_job_id,p_lease_token,p_estado,p_error)$$;
create function pos_private.retry_print(p_job_id uuid,p_motivo text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.print_jobs;begin
 select * into j from public.print_jobs where id=p_job_id for update;
 if j.id is null or auth.uid() is null or not public.rest_tiene_rol_operativo(j.empresa_id,array['propietario','administrador','supervisor']) then raise exception 'Solo supervisión puede autorizar una reimpresión';end if;
 if j.estado not in('incierto','impreso') or nullif(trim(p_motivo),'') is null then raise exception 'Confirma el estado físico y un motivo';end if;
 insert into public.erp_auditoria(empresa_id,entidad,entidad_id,accion,motivo,datos,realizado_por,realizado_por_nombre)
 values(j.empresa_id,'impresion',j.id,'reimprimir',p_motivo,jsonb_build_object('estado_anterior',j.estado,'intentos',j.intentos),auth.uid(),public.rest_nombre_usuario(j.empresa_id));
 -- A new UUID avoids the bridge suppressing a deliberately authorized reprint.
 insert into public.print_jobs(empresa_id,sucursal_id,pedido_id,area,idempotency_key,payload)
 values(j.empresa_id,j.sucursal_id,j.pedido_id,j.area,'reprint:'||gen_random_uuid(),jsonb_set(j.payload,'{content}',to_jsonb('REIMPRESIÓN AUTORIZADA'||E'\n'||(j.payload->>'content'))));
end$$;
create function public.rest_reimprimir(p_job_id uuid,p_motivo text) returns void language sql security invoker set search_path='' as $$select pos_private.retry_print(p_job_id,p_motivo)$$;
revoke all on function pos_private.claim_print(uuid),pos_private.finish_print(uuid,uuid,text,text),pos_private.retry_print(uuid,text),public.rest_tomar_impresion(uuid),public.rest_finalizar_impresion(uuid,uuid,text,text),public.rest_reimprimir(uuid,text) from public,anon;
grant execute on function pos_private.claim_print(uuid),pos_private.finish_print(uuid,uuid,text,text),pos_private.retry_print(uuid,text),public.rest_tomar_impresion(uuid),public.rest_finalizar_impresion(uuid,uuid,text,text),public.rest_reimprimir(uuid,text) to authenticated;

-- Item updates are internal consumption flags; parent state changes already notify clients.
drop trigger if exists rest_items_update_refresh on public.rest_pedido_items;
drop trigger if exists rest_items_delete_refresh on public.rest_pedido_items;

-- Audit mutable catalog/recipe metadata. No client can insert its own audit records.
create function pos_private.audit_metadata() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare before_data jsonb; after_data jsonb; company uuid; entity_id uuid;begin
 if TG_OP<>'INSERT' then before_data:=to_jsonb(old);end if;
 if TG_OP<>'DELETE' then after_data:=to_jsonb(new);end if;
 company:=coalesce((after_data->>'empresa_id')::uuid,(before_data->>'empresa_id')::uuid);
 entity_id:=coalesce((after_data->>'id')::uuid,(before_data->>'id')::uuid);
 if auth.uid() is null then raise exception 'Sesión requerida para cambios de catálogo';end if;
 insert into public.erp_auditoria(empresa_id,entidad,entidad_id,accion,motivo,datos,realizado_por,realizado_por_nombre)
 values(company,TG_TABLE_NAME,entity_id,lower(TG_OP),'Cambio de configuración',jsonb_build_object('antes',before_data,'despues',after_data),auth.uid(),public.rest_nombre_usuario(company));
 if TG_OP='DELETE' then return old;end if;return new;
end$$;
create trigger rest_productos_audit after update or delete on public.rest_productos for each row execute function pos_private.audit_metadata();
create trigger rest_recetas_audit after insert or update or delete on public.rest_recetas for each row execute function pos_private.audit_metadata();
revoke all on function pos_private.audit_metadata() from public,anon,authenticated;

-- Live cash totals are server aggregates; closed reports use snapshots taken under the cash lock.
create function public.rest_resumen_caja(p_caja_id uuid) returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare c public.rest_cajas;begin
 select * into c from public.rest_cajas where id=p_caja_id;
 if auth.uid() is null or c.id is null or not public.rest_tiene_rol_operativo(c.empresa_id,array['propietario','administrador','supervisor','cajero','moza_cajera']) then raise exception 'Sin permiso de caja';end if;
 return jsonb_build_object('sales',coalesce((select sum(total) from public.rest_pedidos where caja_id=c.id and estado='pagado'),0),
 'payments',(select coalesce(jsonb_object_agg(metodo_pago,total),'{}'::jsonb) from(select metodo_pago,sum(total) total from public.rest_pedidos where caja_id=c.id and estado='pagado' group by metodo_pago) totals where metodo_pago is not null),
 'cashMovementNet',coalesce((select sum(case when tipo='ingreso' then monto else -monto end) from public.rest_movimientos_caja where caja_id=c.id and metodo_pago='Efectivo'),0));
end$$;
revoke all on function public.rest_resumen_caja(uuid) from public,anon;
grant execute on function public.rest_resumen_caja(uuid) to authenticated;
