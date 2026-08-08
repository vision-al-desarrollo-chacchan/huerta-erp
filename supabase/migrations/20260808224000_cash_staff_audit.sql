-- Registra el responsable real de apertura y cierre de caja.
alter table public.rest_miembros add column if not exists nombre text;
alter table public.rest_cajas add column if not exists abierta_por_nombre text;
alter table public.rest_cajas add column if not exists cerrada_por_nombre text;

update public.rest_miembros m
set nombre = coalesce(
  nullif(u.raw_user_meta_data->>'full_name', ''),
  nullif(u.raw_user_meta_data->>'name', ''),
  split_part(u.email, '@', 1),
  'Usuario'
)
from auth.users u
where u.id = m.user_id and m.nombre is null;

update public.rest_cajas c
set abierta_por_nombre = coalesce(m.nombre, 'Usuario')
from public.rest_miembros m
where m.user_id = c.abierta_por
  and m.empresa_id = c.empresa_id
  and c.abierta_por_nombre is null;

create or replace function public.rest_nombre_usuario(p_empresa_id uuid)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    nullif(m.nombre, ''),
    nullif(u.raw_user_meta_data->>'full_name', ''),
    nullif(u.raw_user_meta_data->>'name', ''),
    split_part(u.email, '@', 1),
    'Usuario'
  )
  from auth.users u
  left join public.rest_miembros m
    on m.user_id = u.id and m.empresa_id = p_empresa_id
  where u.id = auth.uid();
$$;

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
  if not public.rest_tiene_acceso(p_empresa_id) then raise exception 'Sin acceso a la empresa'; end if;
  if p_monto_apertura < 0 then raise exception 'El monto inicial no puede ser negativo'; end if;
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

create or replace function public.rest_cerrar_caja(
  p_caja_id uuid,
  p_monto_cierre numeric
)
returns public.rest_cajas
language plpgsql
security invoker
set search_path = public
as $$
declare
  caja public.rest_cajas;
begin
  select * into caja from public.rest_cajas where id = p_caja_id for update;
  if caja.id is null or not public.rest_tiene_acceso(caja.empresa_id) then raise exception 'Caja no encontrada'; end if;
  if caja.estado <> 'abierta' then raise exception 'La caja ya se encuentra cerrada'; end if;
  if p_monto_cierre < 0 then raise exception 'El efectivo contado no puede ser negativo'; end if;

  update public.rest_cajas set
    estado = 'cerrada',
    monto_cierre = p_monto_cierre,
    cerrada_por = auth.uid(),
    cerrada_por_nombre = public.rest_nombre_usuario(caja.empresa_id),
    cerrada_at = now()
  where id = p_caja_id
  returning * into caja;
  return caja;
end;
$$;

grant execute on function public.rest_nombre_usuario(uuid) to authenticated;
grant execute on function public.rest_abrir_caja(uuid,uuid,numeric) to authenticated;
grant execute on function public.rest_cerrar_caja(uuid,numeric) to authenticated;
