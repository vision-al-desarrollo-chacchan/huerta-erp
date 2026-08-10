-- La función solo debe ser invocable por usuarios autenticados.
revoke execute on function public.erp_configurar_pin_empleado(uuid,uuid,text,text) from anon;
revoke execute on function public.erp_configurar_pin_empleado(uuid,uuid,text,text) from public;
grant execute on function public.erp_configurar_pin_empleado(uuid,uuid,text,text) to authenticated;
