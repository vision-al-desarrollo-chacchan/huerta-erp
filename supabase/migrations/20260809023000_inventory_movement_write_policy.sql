-- Permite insertar asientos, pero conserva el Kardex sin edición ni borrado.
drop policy if exists rest_movimientos_inventario_insert on public.rest_movimientos_inventario;
create policy rest_movimientos_inventario_insert
on public.rest_movimientos_inventario for insert to authenticated
with check (public.rest_tiene_acceso(empresa_id));
