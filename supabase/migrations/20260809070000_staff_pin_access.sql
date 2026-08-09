-- Acceso operativo rápido por PIN para terminales previamente autenticados.
-- El PIN nunca se almacena ni se devuelve en texto plano.
create extension if not exists pgcrypto;

alter table public.erp_empleados
  add column if not exists acceso_rol text,
  add column if not exists pin_hash text,
  add column if not exists pin_actualizado_at timestamptz,
  add column if not exists intentos_pin integer not null default 0,
  add column if not exists bloqueado_hasta timestamptz;

alter table public.erp_empleados drop constraint if exists erp_empleados_acceso_rol_check;
alter table public.erp_empleados add constraint erp_empleados_acceso_rol_check
  check (acceso_rol is null or acceso_rol in ('cajero','mozo','cocina','supervisor'));

create or replace function public.erp_configurar_pin_empleado(
  p_empresa_id uuid,
  p_empleado_id uuid,
  p_rol text,
  p_pin text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.rest_es_admin(p_empresa_id) then
    raise exception 'Solo el propietario o administrador puede configurar accesos';
  end if;
  if p_rol not in ('cajero','mozo','cocina','supervisor') then
    raise exception 'Rol operativo inválido';
  end if;
  if p_pin !~ '^[0-9]{6}$' then
    raise exception 'El PIN debe tener exactamente 6 números';
  end if;
  update public.erp_empleados
     set acceso_rol = p_rol,
         pin_hash = crypt(p_pin, gen_salt('bf', 10)),
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
grant execute on function public.erp_configurar_pin_empleado(uuid,uuid,text,text) to authenticated;

create or replace function public.erp_validar_pin_empleado(
  p_empresa_id uuid,
  p_empleado_id uuid,
  p_pin text
) returns table(empleado_id uuid, nombre text, rol text)
language plpgsql
security definer
set search_path = public
as $$
declare
  empleado public.erp_empleados;
begin
  if not public.rest_tiene_acceso(p_empresa_id) then
    raise exception 'Este equipo no tiene una sesión autorizada para la empresa';
  end if;

  select * into empleado
    from public.erp_empleados
   where id = p_empleado_id
     and empresa_id = p_empresa_id
     and estado = 'activo'
     and pin_hash is not null
   for update;

  if empleado.id is null then
    raise exception 'Trabajador sin acceso por PIN';
  end if;
  if empleado.bloqueado_hasta is not null and empleado.bloqueado_hasta > now() then
    raise exception 'Acceso bloqueado temporalmente. Intenta nuevamente más tarde';
  end if;

  if empleado.pin_hash <> crypt(p_pin, empleado.pin_hash) then
    update public.erp_empleados
       set intentos_pin = intentos_pin + 1,
           bloqueado_hasta = case when intentos_pin + 1 >= 5 then now() + interval '15 minutes' else null end
     where id = empleado.id;
    raise exception 'PIN incorrecto';
  end if;

  update public.erp_empleados
     set intentos_pin = 0, bloqueado_hasta = null
   where id = empleado.id;

  return query select empleado.id, trim(empleado.nombres || ' ' || empleado.apellidos), empleado.acceso_rol;
end;
$$;
grant execute on function public.erp_validar_pin_empleado(uuid,uuid,text) to authenticated;

create or replace function public.erp_quitar_pin_empleado(
  p_empresa_id uuid,
  p_empleado_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.rest_es_admin(p_empresa_id) then
    raise exception 'Solo el propietario o administrador puede quitar accesos';
  end if;
  update public.erp_empleados
     set acceso_rol = null, pin_hash = null, pin_actualizado_at = null,
         intentos_pin = 0, bloqueado_hasta = null
   where id = p_empleado_id and empresa_id = p_empresa_id;
end;
$$;
grant execute on function public.erp_quitar_pin_empleado(uuid,uuid) to authenticated;
