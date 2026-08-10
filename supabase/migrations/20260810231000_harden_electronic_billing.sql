-- Corrige la reserva fiscal para que solo la funcion validada cree documentos.
alter function public.ef_reservar_documento(uuid,uuid,uuid,text,text,numeric,text,text) security definer;
revoke all on function public.ef_reservar_documento(uuid,uuid,uuid,text,text,numeric,text,text) from public, anon;
grant execute on function public.ef_reservar_documento(uuid,uuid,uuid,text,text,numeric,text,text) to authenticated;

-- El navegador configura datos no secretos, pero no puede escribir credenciales cifradas ni banderas de seguridad.
revoke insert, update on public.ef_configuraciones from authenticated;
grant insert (empresa_id, proveedor, ambiente, ruta_pruebas, ruta_produccion, usuario_sol, certificado_nombre, certificado_vence_at, activo, updated_at) on public.ef_configuraciones to authenticated;
grant update (proveedor, ambiente, ruta_pruebas, ruta_produccion, usuario_sol, certificado_nombre, certificado_vence_at, activo, updated_at) on public.ef_configuraciones to authenticated;
