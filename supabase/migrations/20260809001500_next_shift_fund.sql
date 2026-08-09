-- Fondo para el siguiente turno y efectivo retirado.
alter table public.rest_cajas add column if not exists fondo_siguiente numeric(12,2) not null default 0;
alter table public.rest_cajas add column if not exists efectivo_retirado numeric(12,2);

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
  if caja.id is null or not public.rest_tiene_acceso(caja.empresa_id) then raise exception 'Caja no encontrada'; end if;
  if caja.estado <> 'abierta' then raise exception 'La caja ya se encuentra cerrada'; end if;
  if p_monto_contado < 0 then raise exception 'El efectivo contado no puede ser negativo'; end if;
  if p_fondo_siguiente < 0 or p_fondo_siguiente > p_monto_contado then raise exception 'El fondo siguiente no puede superar el efectivo contado'; end if;

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
    fondo_siguiente = p_fondo_siguiente,
    efectivo_retirado = p_monto_contado - p_fondo_siguiente,
    cerrada_por = auth.uid(), cerrada_por_nombre = public.rest_nombre_usuario(caja.empresa_id),
    cerrada_at = now()
  where id = p_caja_id returning * into caja;
  return caja;
end;
$$;

grant execute on function public.rest_cerrar_caja_con_fondo(uuid,numeric,numeric,text) to authenticated;
