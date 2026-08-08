-- Arqueo profesional: esperado, contado, diferencia y sustento.
alter table public.rest_cajas add column if not exists monto_esperado numeric(12,2);
alter table public.rest_cajas add column if not exists diferencia numeric(12,2);
alter table public.rest_cajas add column if not exists observaciones text;

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

  select caja.monto_apertura + coalesce(sum(p.total), 0)
  into esperado
  from public.rest_pedidos p
  where p.caja_id = caja.id
    and p.estado = 'pagado'
    and p.metodo_pago = 'Efectivo';

  diferencia_calculada := p_monto_contado - esperado;
  if abs(diferencia_calculada) >= 0.01 and nullif(trim(p_observaciones), '') is null then
    raise exception 'Debes explicar el sobrante o faltante de caja';
  end if;

  update public.rest_cajas set
    estado = 'cerrada',
    monto_cierre = p_monto_contado,
    monto_esperado = esperado,
    diferencia = diferencia_calculada,
    observaciones = nullif(trim(p_observaciones), ''),
    cerrada_por = auth.uid(),
    cerrada_por_nombre = public.rest_nombre_usuario(caja.empresa_id),
    cerrada_at = now()
  where id = p_caja_id
  returning * into caja;
  return caja;
end;
$$;

grant execute on function public.rest_cerrar_caja_con_arqueo(uuid,numeric,text) to authenticated;
