-- Caja chica y desglose: ingresos/egresos fuera de ventas.
create table if not exists public.rest_movimientos_caja (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.rest_empresas(id) on delete cascade,
  sucursal_id uuid not null references public.rest_sucursales(id) on delete restrict,
  caja_id uuid not null references public.rest_cajas(id) on delete cascade,
  tipo text not null check (tipo in ('ingreso','egreso')),
  concepto text not null,
  monto numeric(12,2) not null check (monto > 0),
  metodo_pago text not null default 'Efectivo',
  registrado_por uuid not null references auth.users(id),
  registrado_por_nombre text not null,
  created_at timestamptz not null default now()
);

create index if not exists rest_movimientos_caja_idx
  on public.rest_movimientos_caja(caja_id, created_at desc);

alter table public.rest_movimientos_caja enable row level security;
drop policy if exists rest_movimientos_caja_miembros on public.rest_movimientos_caja;
create policy rest_movimientos_caja_miembros on public.rest_movimientos_caja
for all to authenticated
using (public.rest_tiene_acceso(empresa_id))
with check (public.rest_tiene_acceso(empresa_id));

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
  select * into caja from public.rest_cajas where id = p_caja_id;
  if caja.id is null or not public.rest_tiene_acceso(caja.empresa_id) then raise exception 'Caja no encontrada'; end if;
  if caja.estado <> 'abierta' then raise exception 'La caja se encuentra cerrada'; end if;
  if p_tipo not in ('ingreso','egreso') then raise exception 'Tipo de movimiento inválido'; end if;
  if nullif(trim(p_concepto), '') is null then raise exception 'El concepto es obligatorio'; end if;
  if p_monto <= 0 then raise exception 'El monto debe ser mayor a cero'; end if;

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

grant execute on function public.rest_registrar_movimiento_caja(uuid,text,text,numeric,text) to authenticated;

create or replace function public.rest_cerrar_caja_con_arqueo(
  p_caja_id uuid,
  p_monto_contado numeric,
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
  if caja.id is null or not public.rest_tiene_acceso(caja.empresa_id) then raise exception 'Caja no encontrada'; end if;
  if caja.estado <> 'abierta' then raise exception 'La caja ya se encuentra cerrada'; end if;
  if p_monto_contado < 0 then raise exception 'El efectivo contado no puede ser negativo'; end if;

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
    diferencia = diferencia_calculada, observaciones = nullif(trim(p_observaciones), ''),
    cerrada_por = auth.uid(), cerrada_por_nombre = public.rest_nombre_usuario(caja.empresa_id),
    cerrada_at = now()
  where id = p_caja_id returning * into caja;
  return caja;
end;
$$;
