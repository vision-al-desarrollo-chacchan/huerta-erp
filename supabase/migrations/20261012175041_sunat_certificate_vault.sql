-- Certificados SUNAT cifrados: solo backend. No habilita emisión ni modifica otros módulos.
create table public.ef_sunat_certificados (
 empresa_id uuid primary key references public.rest_empresas(id) on delete cascade,
 ruc text not null check (ruc ~ '^[0-9]{11}$'),
 nombre text not null check (length(nombre) between 1 and 120),
 envelope text not null check (length(envelope) between 1 and 4000000),
 key_id text not null check (key_id ~ '^[A-Za-z0-9_-]{1,40}$'),
 vence_at timestamptz not null,
 huella text not null,
 actualizado_por uuid not null references auth.users(id),
 updated_at timestamptz not null default now()
);
alter table public.ef_sunat_certificados enable row level security;
revoke all on public.ef_sunat_certificados from public,anon,authenticated;
grant select,insert,update,delete on public.ef_sunat_certificados to service_role;
-- Sin políticas para el navegador: la única lectura es por service_role en backend.

create function public.ef_sunat_guardar_certificado(
 p_empresa_id uuid,p_usuario_id uuid,p_ruc text,p_nombre text,p_envelope text,
 p_key_id text,p_vence_at timestamptz,p_huella text
) returns void language plpgsql security invoker set search_path = '' as $$
begin
 if not exists(select 1 from public.rest_miembros m join public.rest_empresas e on e.id=m.empresa_id
  where m.empresa_id=p_empresa_id and m.user_id=p_usuario_id and m.activo
  and m.rol in ('propietario','administrador') and e.activa and e.ruc=p_ruc)
 then raise exception 'Administrador o RUC no válido'; end if;
 if p_vence_at <= now() or p_vence_at is null then raise exception 'Certificado vencido'; end if;
 if length(p_envelope)>4000000 or p_envelope is null or
  (p_envelope::jsonb->>'version') is distinct from '1' or
  (p_envelope::jsonb->>'algorithm') is distinct from 'AES-256-GCM' or
  (p_envelope::jsonb->>'keyId') is distinct from p_key_id or
  coalesce(length(p_envelope::jsonb->>'iv'),0)<>16 or
  coalesce(length(p_envelope::jsonb->>'ciphertext'),0)<24
 then raise exception 'Sobre cifrado inválido'; end if;
 insert into public.ef_sunat_certificados(empresa_id,ruc,nombre,envelope,key_id,vence_at,huella,actualizado_por)
 values(p_empresa_id,p_ruc,p_nombre,p_envelope,p_key_id,p_vence_at,p_huella,p_usuario_id)
 on conflict(empresa_id) do update set ruc=excluded.ruc,nombre=excluded.nombre,envelope=excluded.envelope,
 key_id=excluded.key_id,vence_at=excluded.vence_at,huella=excluded.huella,
 actualizado_por=excluded.actualizado_por,updated_at=now();
 insert into public.ef_configuraciones(empresa_id,certificado_configurado,certificado_nombre,certificado_vence_at,updated_at)
 values(p_empresa_id,true,p_nombre,(p_vence_at at time zone 'UTC')::date,now())
 on conflict(empresa_id) do update set certificado_configurado=true,certificado_nombre=excluded.certificado_nombre,
 certificado_vence_at=excluded.certificado_vence_at,updated_at=now();
end $$;
revoke all on function public.ef_sunat_guardar_certificado(uuid,uuid,text,text,text,text,timestamptz,text) from public,anon,authenticated;
grant execute on function public.ef_sunat_guardar_certificado(uuid,uuid,text,text,text,text,timestamptz,text) to service_role;
