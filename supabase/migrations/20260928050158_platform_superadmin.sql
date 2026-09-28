-- Platform administration is separate from every restaurant role.
-- Bootstrap the SINGLE account only after its login email is confirmed.
create schema if not exists platform_private;
revoke all on schema platform_private from public, anon, authenticated;
grant usage on schema platform_private to authenticated;

create table platform_private.superadmin (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table platform_private.superadmin enable row level security;
revoke all on platform_private.superadmin from public, anon, authenticated;

create or replace function platform_private.is_superadmin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from platform_private.superadmin where user_id = auth.uid()
  );
$$;
revoke all on function platform_private.is_superadmin() from public, anon;
grant execute on function platform_private.is_superadmin() to authenticated;

create or replace function public.platform_is_superadmin()
returns boolean language sql stable security invoker set search_path = ''
as $$ select platform_private.is_superadmin(); $$;
revoke all on function public.platform_is_superadmin() from public, anon;
grant execute on function public.platform_is_superadmin() to authenticated;

create table platform_private.company_plans (
  empresa_id uuid primary key references public.rest_empresas(id) on delete cascade,
  plan text not null default 'Sin asignar' check (char_length(plan) between 1 and 80),
  vence_el date,
  updated_at timestamptz not null default now()
);
alter table platform_private.company_plans enable row level security;
revoke all on platform_private.company_plans from public, anon, authenticated;

create or replace function platform_private.list_companies()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if not platform_private.is_superadmin() then raise exception 'Acceso exclusivo del superadministrador' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id',e.id,'nombre',e.nombre,'activa',e.activa,'created_at',e.created_at,
    'plan',coalesce(p.plan,'Sin asignar'),'vence_el',p.vence_el,
    'usuarios',(select count(*) from public.rest_miembros m where m.empresa_id=e.id and m.activo),
    'propietarios',coalesce((select jsonb_agg(jsonb_build_object('email',u.email,'nombre',m.nombre))
      from public.rest_miembros m join auth.users u on u.id=m.user_id
      where m.empresa_id=e.id and m.activo and (m.rol='propietario' or 'propietario'=any(m.roles))), '[]'::jsonb),
    'puede_entrar',exists(select 1 from public.rest_miembros m where m.empresa_id=e.id and m.user_id=auth.uid() and m.activo)
  ) order by e.created_at) from public.rest_empresas e left join platform_private.company_plans p on p.empresa_id=e.id), '[]'::jsonb);
end;
$$;
revoke all on function platform_private.list_companies() from public, anon;
grant execute on function platform_private.list_companies() to authenticated;
create or replace function public.platform_list_companies()
returns jsonb language sql stable security invoker set search_path = ''
as $$ select platform_private.list_companies(); $$;
revoke all on function public.platform_list_companies() from public, anon;
grant execute on function public.platform_list_companies() to authenticated;

-- Exact email lookup is confined to the authorized platform account.
-- New owners first register their own login; no passwords or invitations are sent here.
create or replace function platform_private.create_company(p_nombre text, p_owner_email text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare owner_id uuid; company_id uuid;
begin
  if not platform_private.is_superadmin() then raise exception 'Acceso exclusivo del superadministrador' using errcode='42501'; end if;
  if p_nombre is null or char_length(btrim(p_nombre)) not between 2 and 120 then raise exception 'El nombre debe tener entre 2 y 120 caracteres'; end if;
  select id into owner_id from auth.users where lower(email)=lower(btrim(p_owner_email));
  if owner_id is null then raise exception 'El dueño debe registrar primero su cuenta en Huerta ERP con ese correo'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 0));
  if exists(select 1 from public.rest_miembros where user_id=owner_id) then
    raise exception 'Ese usuario ya pertenece a una empresa. Utiliza una cuenta independiente para el nuevo dueño';
  end if;
  insert into public.rest_empresas(nombre,nombre_comercial) values(btrim(p_nombre),btrim(p_nombre)) returning id into company_id;
  insert into public.rest_sucursales(empresa_id,nombre) values(company_id,'Local principal');
  insert into public.rest_miembros(empresa_id,user_id,rol,roles,activo,email)
    values(company_id,owner_id,'propietario',array['propietario'],true,lower(btrim(p_owner_email)));
  insert into platform_private.company_plans(empresa_id) values(company_id);
  return company_id;
end;
$$;
revoke all on function platform_private.create_company(text,text) from public, anon;
grant execute on function platform_private.create_company(text,text) to authenticated;
create or replace function public.platform_create_company(p_nombre text, p_owner_email text)
returns uuid language sql security invoker set search_path = ''
as $$ select platform_private.create_company(p_nombre,p_owner_email); $$;
revoke all on function public.platform_create_company(text,text) from public, anon;
grant execute on function public.platform_create_company(text,text) to authenticated;

create or replace function platform_private.save_plan(p_empresa_id uuid,p_plan text,p_vence_el date)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not platform_private.is_superadmin() then raise exception 'Acceso exclusivo del superadministrador' using errcode='42501'; end if;
  if p_plan is null or char_length(btrim(p_plan)) not between 1 and 80 then raise exception 'Indica el nombre del plan'; end if;
  insert into platform_private.company_plans(empresa_id,plan,vence_el) values(p_empresa_id,btrim(p_plan),p_vence_el)
  on conflict(empresa_id) do update set plan=excluded.plan,vence_el=excluded.vence_el,updated_at=now();
end;
$$;
revoke all on function platform_private.save_plan(uuid,text,date) from public, anon;
grant execute on function platform_private.save_plan(uuid,text,date) to authenticated;
create or replace function public.platform_save_plan(p_empresa_id uuid,p_plan text,p_vence_el date)
returns void language sql security invoker set search_path = ''
as $$ select platform_private.save_plan(p_empresa_id,p_plan,p_vence_el); $$;
revoke all on function public.platform_save_plan(uuid,text,date) from public, anon;
grant execute on function public.platform_save_plan(uuid,text,date) to authenticated;

-- An unassigned registration must not silently provision a Chicken Huerta copy.
-- Existing businesses and memberships are kept intact.
create or replace function public.rest_crear_empresa_inicial(nombre_empresa text default 'Chicken Huerta')
returns table(empresa_id uuid,sucursal_id uuid)
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Sesión requerida'; end if;
  return query select m.empresa_id,s.id from public.rest_miembros m
    join public.rest_empresas e on e.id=m.empresa_id and e.activa
    join public.rest_sucursales s on s.empresa_id=m.empresa_id and s.activa
    where m.user_id=auth.uid() and m.activo order by s.created_at,s.id limit 1;
  if not found then raise exception 'Tu cuenta no tiene una empresa activa asignada. Contacta a Huerta ERP'; end if;
end;
$$;
revoke all on function public.rest_crear_empresa_inicial(text) from public,anon;
grant execute on function public.rest_crear_empresa_inicial(text) to authenticated;

-- Worker account management must never reset the platform owner's password.
create or replace function platform_private.protected_account(p_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select auth.uid() is not null and exists(select 1 from platform_private.superadmin where user_id=p_user_id); $$;
revoke all on function platform_private.protected_account(uuid) from public,anon;
grant execute on function platform_private.protected_account(uuid) to authenticated;
create or replace function public.platform_is_protected_account(p_user_id uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$ select platform_private.protected_account(p_user_id); $$;
revoke all on function public.platform_is_protected_account(uuid) from public,anon;
grant execute on function public.platform_is_protected_account(uuid) to authenticated;
