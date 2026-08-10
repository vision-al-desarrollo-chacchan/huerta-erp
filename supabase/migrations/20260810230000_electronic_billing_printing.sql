-- Huerta ERP: facturacion electronica multi-RUC y colas de impresion
create table if not exists public.ef_configuraciones (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null unique references public.rest_empresas(id) on delete cascade,
  proveedor text not null default 'sunat' check (proveedor in ('sunat','nubefact','pse')),
  ambiente text not null default 'pruebas' check (ambiente in ('pruebas','produccion')),
  ruta_pruebas text,
  ruta_produccion text,
  usuario_sol text,
  token_cifrado text,
  clave_sol_cifrada text,
  certificado_cifrado text,
  certificado_nombre text,
  certificado_vence_at date,
  token_configurado boolean not null default false,
  clave_sol_configurada boolean not null default false,
  certificado_configurado boolean not null default false,
  activo boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.ef_series (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.rest_empresas(id) on delete cascade,
  sucursal_id uuid not null references public.rest_sucursales(id) on delete cascade,
  tipo_documento text not null check (tipo_documento in ('boleta','factura','nota_credito','nota_debito')),
  serie text not null,
  siguiente_numero bigint not null default 1 check (siguiente_numero > 0),
  activa boolean not null default true,
  unique (empresa_id, sucursal_id, tipo_documento, serie)
);

create table if not exists public.ef_documentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.rest_empresas(id) on delete cascade,
  sucursal_id uuid not null references public.rest_sucursales(id) on delete restrict,
  pedido_id uuid references public.rest_pedidos(id) on delete restrict,
  tipo_documento text not null check (tipo_documento in ('boleta','factura','nota_credito','nota_debito','anulacion')),
  serie text not null,
  numero bigint not null,
  idempotency_key text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente','enviando','aceptado','observado','rechazado','anulado','error')),
  moneda text not null default 'PEN',
  total numeric(12,2) not null check (total >= 0),
  receptor_documento text,
  receptor_nombre text,
  xml_path text,
  pdf_path text,
  cdr_path text,
  codigo_sunat text,
  mensaje_sunat text,
  intentos integer not null default 0,
  proximo_reintento_at timestamptz,
  ultimo_intento_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, tipo_documento, serie, numero),
  unique (empresa_id, idempotency_key),
  unique (pedido_id, tipo_documento)
);

create table if not exists public.ef_intentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.rest_empresas(id) on delete cascade,
  documento_id uuid not null references public.ef_documentos(id) on delete cascade,
  numero_intento integer not null,
  resultado text not null check (resultado in ('enviando','aceptado','rechazado','error')),
  codigo text,
  mensaje text,
  created_at timestamptz not null default now(),
  unique (documento_id, numero_intento)
);

create table if not exists public.print_configuraciones (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.rest_empresas(id) on delete cascade,
  sucursal_id uuid not null references public.rest_sucursales(id) on delete cascade,
  area text not null check (area in ('cocina','caja','bar')),
  nombre_impresora text not null,
  ancho_mm integer not null default 80 check (ancho_mm in (58,80)),
  copias integer not null default 1 check (copias between 1 and 5),
  auto_imprimir boolean not null default true,
  activa boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (empresa_id, sucursal_id, area)
);

create table if not exists public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.rest_empresas(id) on delete cascade,
  sucursal_id uuid not null references public.rest_sucursales(id) on delete cascade,
  pedido_id uuid references public.rest_pedidos(id) on delete cascade,
  area text not null check (area in ('cocina','caja','bar')),
  idempotency_key text not null,
  payload jsonb not null,
  estado text not null default 'pendiente' check (estado in ('pendiente','imprimiendo','impreso','fallido')),
  intentos integer not null default 0,
  ultimo_error text,
  impreso_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, idempotency_key)
);

create index if not exists ef_documentos_pendientes_idx on public.ef_documentos(empresa_id, estado, proximo_reintento_at) where estado in ('pendiente','error');
create index if not exists ef_documentos_sucursal_idx on public.ef_documentos(empresa_id, sucursal_id, created_at desc);
create index if not exists print_jobs_cola_idx on public.print_jobs(empresa_id, sucursal_id, estado, created_at) where estado in ('pendiente','fallido');

alter table public.ef_configuraciones enable row level security;
alter table public.ef_series enable row level security;
alter table public.ef_documentos enable row level security;
alter table public.ef_intentos enable row level security;
alter table public.print_configuraciones enable row level security;
alter table public.print_jobs enable row level security;

create policy ef_configuraciones_empresa on public.ef_configuraciones for all to authenticated using (public.rest_tiene_acceso(empresa_id)) with check (public.rest_tiene_acceso(empresa_id));
create policy ef_series_empresa on public.ef_series for all to authenticated using (public.rest_tiene_acceso(empresa_id)) with check (public.rest_tiene_acceso(empresa_id));
create policy ef_documentos_empresa on public.ef_documentos for select to authenticated using (public.rest_tiene_acceso(empresa_id));
create policy ef_intentos_empresa on public.ef_intentos for select to authenticated using (public.rest_tiene_acceso(empresa_id));
create policy print_configuraciones_empresa on public.print_configuraciones for all to authenticated using (public.rest_tiene_acceso(empresa_id)) with check (public.rest_tiene_acceso(empresa_id));
create policy print_jobs_empresa on public.print_jobs for all to authenticated using (public.rest_tiene_acceso(empresa_id)) with check (public.rest_tiene_acceso(empresa_id));

-- Reserva atomica: la serie avanza una sola vez y la clave evita documentos repetidos.
create or replace function public.ef_reservar_documento(
  p_empresa_id uuid, p_sucursal_id uuid, p_pedido_id uuid, p_tipo_documento text,
  p_idempotency_key text, p_total numeric, p_receptor_documento text default null,
  p_receptor_nombre text default null
) returns public.ef_documentos
language plpgsql security definer set search_path = public
as $$
declare v_serie public.ef_series; v_doc public.ef_documentos;
begin
  if not public.rest_tiene_acceso(p_empresa_id) then raise exception 'Sin acceso a la empresa'; end if;
  select * into v_doc from public.ef_documentos where empresa_id=p_empresa_id and idempotency_key=p_idempotency_key;
  if found then return v_doc; end if;
  select * into v_serie from public.ef_series where empresa_id=p_empresa_id and sucursal_id=p_sucursal_id and tipo_documento=p_tipo_documento and activa for update;
  if not found then raise exception 'No existe una serie activa para %', p_tipo_documento; end if;
  insert into public.ef_documentos(empresa_id,sucursal_id,pedido_id,tipo_documento,serie,numero,idempotency_key,total,receptor_documento,receptor_nombre)
  values(p_empresa_id,p_sucursal_id,p_pedido_id,p_tipo_documento,v_serie.serie,v_serie.siguiente_numero,p_idempotency_key,p_total,nullif(p_receptor_documento,''),nullif(p_receptor_nombre,'')) returning * into v_doc;
  update public.ef_series set siguiente_numero=siguiente_numero+1 where id=v_serie.id;
  return v_doc;
end $$;
grant execute on function public.ef_reservar_documento(uuid,uuid,uuid,text,text,numeric,text,text) to authenticated;

revoke all on table public.ef_configuraciones from anon;
revoke all on table public.ef_series from anon;
revoke all on table public.ef_documentos from anon;
revoke all on table public.ef_intentos from anon;
revoke all on table public.print_configuraciones from anon;
revoke all on table public.print_jobs from anon;
grant select,insert,update on public.ef_configuraciones, public.ef_series, public.print_configuraciones, public.print_jobs to authenticated;
grant select on public.ef_documentos, public.ef_intentos to authenticated;
