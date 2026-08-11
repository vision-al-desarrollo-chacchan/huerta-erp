-- Cuentas individuales, varios roles y bitácora de trabajadores.
alter table public.rest_miembros
  add column if not exists roles text[],
  add column if not exists email text;

update public.rest_miembros set roles=array[rol] where roles is null or cardinality(roles)=0;
alter table public.rest_miembros alter column roles set default array['mozo']::text[];
alter table public.rest_miembros drop constraint if exists rest_miembros_roles_check;
alter table public.rest_miembros add constraint rest_miembros_roles_check check (
  roles <@ array['propietario','administrador','cajero','mozo','moza_cajera','cocina','supervisor']::text[]
  and cardinality(roles)>0
);

create or replace function public.rest_es_admin(target_empresa uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.rest_miembros where empresa_id=target_empresa and user_id=auth.uid() and activo and ('propietario'=any(roles) or 'administrador'=any(roles)));
$$;

create table if not exists public.erp_actividad_empleados(
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.rest_empresas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  accion text not null,
  detalle jsonb not null default '{}'::jsonb,
  realizada_por uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists erp_actividad_empleados_idx on public.erp_actividad_empleados(empresa_id,user_id,created_at desc);
alter table public.erp_actividad_empleados enable row level security;
drop policy if exists erp_actividad_empleados_admin on public.erp_actividad_empleados;
create policy erp_actividad_empleados_admin on public.erp_actividad_empleados for select to authenticated using(public.rest_es_admin(empresa_id));

