# Totales calculados en Postgres — 13 octubre 2026

Dashboard, Reportes y Contabilidad ahora consultan resúmenes SQL, sin descargar todo el historial para calcular los indicadores.

- Ventas y conteos usan todos los pedidos pagados del periodo, con índices de empresa/sucursal/fecha. El día de cobro se obtiene de updated_at en America/Lima. Se verificó que los totales guardados de ventas reales coinciden con sus ítems (cero diferencias).
- Reportes mantiene periodos de 1/7/30/90 días y día elegido. Métodos de pago y ranking se agrupan en Postgres. Detalle por páginas de 100; ítems se solicitan al abrir una venta.
- Contabilidad incorpora desde/hasta (mes actual por defecto), excluye compras anuladas y calcula totales del periodo completo. Ventas corresponden a la sucursal; compras y movimientos manuales, a toda la empresa porque esos registros no tienen sucursal_id. La interfaz lo indica.
- Dashboard devuelve indicadores, ocho pedidos recientes, cinco productos del ranking, cinco alertas y totales semanales agrupados por día de apertura de caja. Comandas pendientes de días anteriores siguen contándose.
- CSV completo se genera en una consulta estable del periodo, evitando cientos de llamadas y sin el límite de filas de PostgREST. PDF imprime el resumen y el detalle cargado; el número de filas visibles frente al total está indicado.
- Funciones SECURITY INVOKER, conservan permisos y RLS de tablas. Rechazan usuarios anónimos, empresa/sucursal ajenas, páginas inválidas y periodos superiores a 366 días. No hay nuevas funciones SECURITY DEFINER.
- La paginación descarta respuestas que lleguen después de cambiar de periodo o desmontar el componente.

Validación: build TypeScript/Vite, ESLint de archivos modificados, prueba local Postgres/PGlite con 1.205 ventas y 250 compras, exclusión de anulaciones, límites de medianoche en Lima, paginación completa, CSV de 1.205 ventas, RLS y separación de empresas/sucursales, comandos antiguos y agrupación de turnos. Verificación read-only con rol authenticated en Supabase compara los totales SQL con los registros reales y comprueba dashboard, ledger y CSV sin imprimir datos financieros.

No modifica pedidos, cobros, stock ni la emisión SUNAT. No constituye una prueba de capacidad concurrente de producción. Queda pendiente el entorno aislado para medir la aplicación completa con Auth/RLS, red y Realtime.
