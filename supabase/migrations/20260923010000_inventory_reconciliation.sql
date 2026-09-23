-- Arqueo de insumos por turno. El kardex sigue siendo la fuente del stock esperado.
create table public.rest_arqueos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.rest_empresas(id),
  sucursal_id uuid not null references public.rest_sucursales(id),
  caja_id uuid not null references public.rest_cajas(id),
  estado text not null default 'abierto' check (estado in ('abierto','cerrado')),
  responsable text not null,
  observaciones text,
  iniciado_at timestamptz not null default now(),
  cerrado_at timestamptz,
  unique (caja_id)
);
create table public.rest_arqueo_items (
  arqueo_id uuid not null references public.rest_arqueos(id) on delete cascade,
  insumo_id uuid not null references public.rest_insumos(id),
  nombre text not null,
  unidad text not null,
  stock_inicial numeric(12,3) not null,
  comprado numeric(12,3) not null,
  vendido numeric(12,3) not null,
  otras_salidas numeric(12,3) not null,
  stock_esperado numeric(12,3) not null,
  costo_unitario numeric(14,4) not null,
  conteo numeric(12,3) check (conteo >= 0),
  primary key (arqueo_id, insumo_id)
);
create index rest_arqueos_empresa_idx on public.rest_arqueos(empresa_id, iniciado_at desc);
alter table public.rest_arqueos enable row level security;
alter table public.rest_arqueo_items enable row level security;
create policy rest_arqueos_read on public.rest_arqueos for select to authenticated using (public.rest_tiene_acceso(empresa_id));
create policy rest_arqueo_items_read on public.rest_arqueo_items for select to authenticated
using (exists (select 1 from public.rest_arqueos a where a.id=arqueo_id and public.rest_tiene_acceso(a.empresa_id)));
grant select on public.rest_arqueos, public.rest_arqueo_items to authenticated;

create function public.rest_iniciar_arqueo(p_caja_id uuid, p_responsable text, p_actualizar boolean default false)
returns uuid language plpgsql security definer set search_path=public as $$
declare c public.rest_cajas; a_id uuid;
begin
  select * into c from public.rest_cajas where id=p_caja_id for update;
  if c.id is null or c.estado<>'abierta' then raise exception 'Abre la caja antes de iniciar el arqueo'; end if;
  if not public.rest_tiene_rol_operativo(c.empresa_id,array['propietario','administrador','supervisor']) then
    raise exception 'No tienes permiso para hacer el arqueo';
  end if;
  select id into a_id from public.rest_arqueos where caja_id=c.id;
  if a_id is not null then
    if not p_actualizar then return a_id; end if;
    if exists(select 1 from public.rest_arqueos where id=a_id and estado='cerrado') then raise exception 'El arqueo ya está cerrado'; end if;
    delete from public.rest_arqueo_items where arqueo_id=a_id;
  else
    insert into public.rest_arqueos(empresa_id,sucursal_id,caja_id,responsable)
    values(c.empresa_id,c.sucursal_id,c.id,coalesce(nullif(trim(p_responsable),''),public.rest_nombre_usuario(c.empresa_id))) returning id into a_id;
  end if;
  insert into public.rest_arqueo_items(arqueo_id,insumo_id,nombre,unidad,stock_inicial,comprado,vendido,otras_salidas,stock_esperado,costo_unitario)
  select a_id,i.id,i.nombre,i.unidad,
    i.stock-coalesce(sum(case when m.tipo='entrada' then m.cantidad when m.tipo='ajuste' then m.saldo_nuevo-m.saldo_anterior else -m.cantidad end),0),
    coalesce(sum(m.cantidad) filter(where m.tipo='entrada'),0),
    coalesce(sum(m.cantidad) filter(where m.tipo='venta'),0),
    coalesce(sum(m.cantidad) filter(where m.tipo in ('salida','merma')),0),
    i.stock,i.costo_promedio
  from public.rest_insumos i
  left join public.rest_movimientos_inventario m on m.insumo_id=i.id and m.created_at>=c.abierta_at and m.created_at<=now()
  where i.empresa_id=c.empresa_id and i.activo
  group by i.id;
  return a_id;
end $$;

create function public.rest_cerrar_arqueo(p_arqueo_id uuid, p_conteos jsonb, p_observaciones text)
returns void language plpgsql security definer set search_path=public as $$
declare a public.rest_arqueos; item record; total integer; cantidad numeric;
begin
  select * into a from public.rest_arqueos where id=p_arqueo_id for update;
  if a.id is null or a.estado<>'abierto' then raise exception 'Arqueo inexistente o cerrado'; end if;
  if not public.rest_tiene_rol_operativo(a.empresa_id,array['propietario','administrador','supervisor']) then
    raise exception 'No tienes permiso para cerrar el arqueo';
  end if;
  if not exists(select 1 from public.rest_cajas where id=a.caja_id and estado='abierta') then
    raise exception 'La caja de este turno ya está cerrada';
  end if;
  if jsonb_typeof(p_conteos)<>'object' then raise exception 'Completa el conteo físico'; end if;
  select count(*) into total from public.rest_arqueo_items where arqueo_id=a.id;
  if (select count(*) from jsonb_object_keys(p_conteos))<>total then raise exception 'Cuenta todos los insumos'; end if;
  for item in select ai.insumo_id,ai.stock_esperado,i.stock
    from public.rest_arqueo_items ai join public.rest_insumos i on i.id=ai.insumo_id
    where ai.arqueo_id=a.id order by ai.insumo_id for update of i
  loop
    if item.stock<>item.stock_esperado then raise exception 'El inventario cambió mientras contabas. Revisa los movimientos antes de cerrar'; end if;
    if not p_conteos ? item.insumo_id::text then raise exception 'Falta contar un insumo'; end if;
    begin cantidad:=(p_conteos->>item.insumo_id::text)::numeric;
    exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'Conteo inválido'; end;
    if cantidad is null or cantidad<0 then raise exception 'Conteo inválido'; end if;
    update public.rest_arqueo_items set conteo=cantidad where arqueo_id=a.id and insumo_id=item.insumo_id;
  end loop;
  update public.rest_arqueos set estado='cerrado', cerrado_at=now(),observaciones=nullif(trim(p_observaciones),'') where id=a.id;
end $$;
revoke all on function public.rest_iniciar_arqueo(uuid,text,boolean), public.rest_cerrar_arqueo(uuid,jsonb,text) from public,anon;
grant execute on function public.rest_iniciar_arqueo(uuid,text,boolean), public.rest_cerrar_arqueo(uuid,jsonb,text) to authenticated;
