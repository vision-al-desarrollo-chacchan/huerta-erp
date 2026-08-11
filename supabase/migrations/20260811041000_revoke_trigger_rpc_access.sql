-- Las funciones de trigger solo deben ejecutarse por sus triggers, no por la API.
revoke all on function public.handle_new_user() from public,anon,authenticated;
revoke all on function public.rest_descontar_inventario_pedido() from public,anon,authenticated;
