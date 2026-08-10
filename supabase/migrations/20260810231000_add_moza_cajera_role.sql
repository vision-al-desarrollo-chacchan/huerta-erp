-- Permite que una sola trabajadora atienda mesas y cobre desde el mismo PIN.
alter table public.erp_empleados
  drop constraint if exists erp_empleados_acceso_rol_check;

alter table public.erp_empleados
  add constraint erp_empleados_acceso_rol_check
  check (acceso_rol is null or acceso_rol in ('cajero','mozo','moza_cajera','cocina','supervisor'));

create or replace function public.erp_configurar_pin_empleado(
  p_empresa_id uuid,
  p_empleado_id uuid,
  p_rol text,
  p_pin text
) returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.rest_es_admin(p_empresa_id) then
    raise exception 'Solo el propietario o administrador puede configurar accesos';
  end if;
  if p_rol not in ('cajero','mozo','moza_cajera','cocina','supervisor') then
    raise exception 'Rol operativo inválido';
  end if;
  if p_pin !~ '^[0-9]{6}$' then
    raise exception 'El PIN debe tener exactamente 6 números';
  end if;

  update public.erp_empleados
     set acceso_rol = p_rol,
         pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 10)),
         pin_actualizado_at = now(),
         intentos_pin = 0,
         bloqueado_hasta = null
   where id = p_empleado_id
     and empresa_id = p_empresa_id
     and estado = 'activo';

  if not found then
    raise exception 'Trabajador activo no encontrado';
  end if;
end;
$$;

revoke all on function public.erp_configurar_pin_empleado(uuid,uuid,text,text) from public;
grant execute on function public.erp_configurar_pin_empleado(uuid,uuid,text,text) to authenticated;
