-- Anulaciones trazables y pagos de personal con efecto contable/caja.
create table if not exists public.erp_auditoria (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.rest_empresas(id) on delete cascade,
 entidad text not null, entidad_id uuid not null, accion text not null, motivo text not null,
 datos jsonb not null default '{}'::jsonb, realizado_por uuid not null references auth.users(id), realizado_por_nombre text not null,
 created_at timestamptz not null default now()
);
alter table public.erp_auditoria enable row level security;
create policy erp_auditoria_admin_select on public.erp_auditoria for select to authenticated using(public.rest_es_admin(empresa_id));
create policy erp_auditoria_admin_insert on public.erp_auditoria for insert to authenticated with check(public.rest_es_admin(empresa_id));
create index if not exists erp_auditoria_empresa_idx on public.erp_auditoria(empresa_id,created_at desc);

create table if not exists public.erp_pagos_trabajadores (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.rest_empresas(id) on delete cascade,
 empleado_id uuid not null references public.erp_empleados(id) on delete restrict, periodo text not null, monto numeric(12,2) not null check(monto>0),
 metodo_pago text not null, observacion text, movimiento_contable_id uuid references public.erp_movimientos_contables(id),
 movimiento_caja_id uuid references public.rest_movimientos_caja(id), pagado_por uuid not null references auth.users(id), created_at timestamptz not null default now()
);
alter table public.erp_pagos_trabajadores enable row level security;
create policy erp_pagos_trabajadores_admin on public.erp_pagos_trabajadores for all to authenticated using(public.rest_es_admin(empresa_id)) with check(public.rest_es_admin(empresa_id));
create index if not exists erp_pagos_trabajadores_idx on public.erp_pagos_trabajadores(empresa_id,created_at desc);

alter table public.rest_compras_inventario add column if not exists estado text not null default 'registrada' check(estado in('registrada','anulada'));
alter table public.rest_compras_inventario add column if not exists anulada_at timestamptz;
alter table public.rest_compras_inventario add column if not exists anulada_por uuid references auth.users(id);
alter table public.rest_compras_inventario add column if not exists motivo_anulacion text;
alter table public.rest_pedidos add column if not exists anulado_at timestamptz;
alter table public.rest_pedidos add column if not exists anulado_por uuid references auth.users(id);
alter table public.rest_pedidos add column if not exists motivo_anulacion text;

create or replace function public.erp_registrar_pago_trabajador(p_empresa_id uuid,p_empleado_id uuid,p_periodo text,p_monto numeric,p_metodo_pago text,p_observacion text default null)
returns public.erp_pagos_trabajadores language plpgsql security invoker set search_path=public as $$
declare e public.erp_empleados; c public.rest_cajas; mc public.erp_movimientos_contables; caja_mov public.rest_movimientos_caja; pago public.erp_pagos_trabajadores; concepto text;
begin
 if not public.rest_es_admin(p_empresa_id) then raise exception 'Solo el propietario o administrador puede registrar pagos'; end if;
 select * into e from public.erp_empleados where id=p_empleado_id and empresa_id=p_empresa_id;
 if e.id is null then raise exception 'Trabajador no encontrado'; end if;
 if p_monto<=0 or nullif(trim(p_periodo),'') is null then raise exception 'Completa periodo y monto'; end if;
 concepto:='Pago de personal · '||trim(e.nombres||' '||e.apellidos)||' · '||trim(p_periodo);
 insert into public.erp_movimientos_contables(empresa_id,fecha,tipo,categoria,descripcion,monto,metodo_pago,referencia,registrado_por)
 values(p_empresa_id,current_date,'egreso','Planilla y personal',concepto,p_monto,p_metodo_pago,trim(p_periodo),auth.uid()) returning * into mc;
 if lower(p_metodo_pago)='efectivo' then
   select * into c from public.rest_cajas where empresa_id=p_empresa_id and estado='abierta' order by abierta_at desc limit 1;
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

create or replace function public.erp_anular_compra_inventario(p_compra_id uuid,p_motivo text)
returns void language plpgsql security invoker set search_path=public as $$
declare c public.rest_compras_inventario; i public.rest_insumos; anterior numeric;
begin
 select * into c from public.rest_compras_inventario where id=p_compra_id for update;
 if c.id is null or not public.rest_es_admin(c.empresa_id) then raise exception 'Compra no encontrada o sin autorización'; end if;
 if c.estado='anulada' then raise exception 'La compra ya fue anulada'; end if;
 if nullif(trim(p_motivo),'') is null then raise exception 'El motivo es obligatorio'; end if;
 select * into i from public.rest_insumos where id=c.insumo_id for update; anterior:=i.stock;
 if i.stock<c.cantidad_base then raise exception 'No se puede anular: parte del stock comprado ya fue consumido'; end if;
 update public.rest_insumos set stock=stock-c.cantidad_base where id=i.id;
 insert into public.rest_movimientos_inventario(empresa_id,insumo_id,tipo,cantidad,saldo_anterior,saldo_nuevo,motivo,registrado_por,registrado_por_nombre)
 values(c.empresa_id,i.id,'ajuste',c.cantidad_base,anterior,anterior-c.cantidad_base,'Anulación de compra · '||trim(p_motivo),auth.uid(),public.rest_nombre_usuario(c.empresa_id));
 update public.rest_compras_inventario set estado='anulada',anulada_at=now(),anulada_por=auth.uid(),motivo_anulacion=trim(p_motivo) where id=c.id;
 insert into public.erp_auditoria(empresa_id,entidad,entidad_id,accion,motivo,datos,realizado_por,realizado_por_nombre)
 values(c.empresa_id,'compra',c.id,'anular',trim(p_motivo),jsonb_build_object('monto',c.costo_total,'cantidad',c.cantidad_base),auth.uid(),public.rest_nombre_usuario(c.empresa_id));
end $$;

create or replace function public.erp_anular_pedido(p_pedido_id uuid,p_motivo text)
returns void language plpgsql security invoker set search_path=public as $$
declare p public.rest_pedidos; m record; actual numeric;
begin
 select * into p from public.rest_pedidos where id=p_pedido_id for update;
 if p.id is null or not public.rest_es_admin(p.empresa_id) then raise exception 'Pedido no encontrado o sin autorización'; end if;
 if p.estado='anulado' then raise exception 'El pedido ya fue anulado'; end if;
 if nullif(trim(p_motivo),'') is null then raise exception 'El motivo es obligatorio'; end if;
 if exists(select 1 from public.ef_documentos where pedido_id=p.id and estado in('aceptado','enviando')) then raise exception 'El comprobante electrónico requiere nota de crédito o comunicación de baja'; end if;
 if p.inventario_descontado then
  for m in select insumo_id,sum(cantidad) cantidad from public.rest_movimientos_inventario where pedido_id=p.id and tipo='venta' group by insumo_id loop
   select stock into actual from public.rest_insumos where id=m.insumo_id for update;
   update public.rest_insumos set stock=stock+m.cantidad where id=m.insumo_id;
   insert into public.rest_movimientos_inventario(empresa_id,insumo_id,pedido_id,tipo,cantidad,saldo_anterior,saldo_nuevo,motivo,registrado_por,registrado_por_nombre)
   values(p.empresa_id,m.insumo_id,p.id,'ajuste',m.cantidad,actual,actual+m.cantidad,'Reposición por anulación · Pedido #'||p.numero,auth.uid(),public.rest_nombre_usuario(p.empresa_id));
  end loop;
 end if;
 update public.rest_pedidos set estado='anulado',anulado_at=now(),anulado_por=auth.uid(),motivo_anulacion=trim(p_motivo) where id=p.id;
 insert into public.erp_auditoria(empresa_id,entidad,entidad_id,accion,motivo,datos,realizado_por,realizado_por_nombre)
 values(p.empresa_id,'pedido',p.id,'anular',trim(p_motivo),jsonb_build_object('numero',p.numero,'total',p.total,'estado_anterior',p.estado),auth.uid(),public.rest_nombre_usuario(p.empresa_id));
end $$;

revoke all on function public.erp_registrar_pago_trabajador(uuid,uuid,text,numeric,text,text) from public,anon;
revoke all on function public.erp_anular_compra_inventario(uuid,text) from public,anon;
revoke all on function public.erp_anular_pedido(uuid,text) from public,anon;
grant execute on function public.erp_registrar_pago_trabajador(uuid,uuid,text,numeric,text,text) to authenticated;
grant execute on function public.erp_anular_compra_inventario(uuid,text) to authenticated;
grant execute on function public.erp_anular_pedido(uuid,text) to authenticated;
grant select,insert on public.erp_pagos_trabajadores,public.erp_auditoria to authenticated;
