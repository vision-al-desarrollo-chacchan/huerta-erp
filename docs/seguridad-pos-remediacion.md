# Remediación de seguridad e integridad del POS

Base revisada: `52788d3a55d222491f38450db3c6db6df4db3049`. Cambios preparados en rama; no desplegados, sin acceso a datos operativos.

## Cambios y límites

| Hallazgo | Corrección |
|---|---|
| H01, permisos amplios | Escrituras financieras e inventario mediante RPC autorizadas. Implementaciones privilegiadas en `pos_private`, wrappers públicos invoker. Sin TRUNCATE para clientes; catálogos y configuración fiscal/impresoras limitados por rol. |
| H02, trigger/permisos | Creación y adición dentro de la implementación autorizada; cliente sin UPDATE/DELETE de pedidos ni escritura de ítems. Trigger invoker ejecutado dentro de esa operación. |
| H03, anulaciones | Se bloquea anular pagados y entregados. Anulación previa libera reservas pero conserva consumo preparado. No se ha implementado un reembolso: requiere flujo financiero separado. Tickets pendientes se cancelan; si la comanda pudo imprimirse se crea aviso de anulación. |
| H04, cierre concurrente | Caja bloqueada antes de pedido; movimientos, creación, adiciones, anulación y cierre comparten ese protocolo. Cierre exige resolver pedidos abiertos y guarda desglose/movimientos en la misma transacción. |
| H05, NULL | Métodos obligatorios, rechazo de importes nulos/no finitos y validaciones de cantidad. |
| H06, HTML | Prueba de impresión construida con nodos y textContent. Cabeceras de assets con CSP, protección de framing y nosniff; verificar su aplicación en el hosting y navegador de ensayo. |
| H07, reserva fiscal | Rol, empresa/sucursal, pedido pagado, total servidor y reutilización de claves/contenido validados. Conserva restricciones únicas ya existentes. |
| H08, impresión | Outbox en transacción de ítems, claim con lease y UUID estable, finalización con token y usuario, resultado incierto sin reintento automático. Supervisión autoriza una nueva reimpresión auditada. Sin cola local compartida ni pérdida por recortar historial. |
| H09, idempotencia | Clave/payload persistidos antes de enviar; reintento recupera solicitud original y no pierde carrito editado. Registro servidor cubre creación fusionada en mesa existente. |
| H10, inventario | Copia de receta por línea, reserva al entrar, consumo al preparar, bloqueo ordenado por insumo, stock por sucursal y unidades convertidas en backend. Producto que tiene recetas queda bajo control de inventario. Productos excluidos deben configurarse explícitamente y su cambio se audita. |

Las correcciones no equivalen a certificación del sistema completo. Pagos mixtos, split bill, propinas, notas de crédito/devoluciones, asignación individual de zonas y reservas entre almacenes requieren diseño propio; las rutas peligrosas se bloquean en lugar de simular esas capacidades. El puente de impresión no está en este repositorio: hay que revisar sus orígenes permitidos, autenticación y deduplicación durable. Una confirmación del puente no demuestra por sí sola salida física de papel.

## Compatibilidad y precondiciones de despliegue

1. Restaurar una copia en un entorno aislado y comprobar la restauración. Ejecutar migraciones con el rol propietario habitual; no mediante un cliente de restaurante.
2. Revisar `pg_policies`, privilegios de tabla **y de columna**, propietarios de funciones y esquemas expuestos en ese entorno. `pos_private` no debe exponerse en Data API. Ejecutar advisors de Supabase allí. La prueba local simula grants estándar; no conoce personalizaciones del proyecto real.
3. Resolver los pedidos abiertos antes de migrar. La migración aborta si existen: no reconstruye recetas históricas ni cambia consumos pasados. No usar anulaciones para ocultar ventas; pedidos ya entregados deben cobrarse/conciliarse por su flujo actual antes del mantenimiento.
4. Una empresa con una sola sucursal activa recibe sus existencias legadas en ella. Si hay varias, el stock debe asignarse físicamente antes: añadir `rest_insumos.sucursal_id` si no existe, asignar cada fila a una sucursal de su empresa tras conteo, y después ejecutar la migración. No repartir ni duplicar automáticamente el mismo saldo. La migración admite esa columna preasignada.
5. No se arrastran automáticamente trabajos de localStorage: no tienen identidad de empresa/usuario verificable. Revisar tickets físicos/locales pendientes al entrar en mantenimiento. No repetirlos a ciegas. Las nuevas comandas generan outbox solo para configuraciones persistidas, activas y automáticas.
6. Desplegar migraciones y frontend coordinadamente en mantenimiento. El frontend anterior intenta escrituras que ahora se rechazan. Las migraciones son nuevas; no editar las antiguas ya aplicadas.
7. Probar todos los roles, dos empresas y dos sucursales. Validar caja con más de 250 ventas, reintentos tras respuesta perdida, stock insuficiente, anulaciones, caída de navegador y pérdida de confirmación física.
8. Antes de producción, ejecutar carreras con **conexiones PostgreSQL independientes**, incluyendo cobro/cierre y recetas comunes en órdenes concurrentes. PGlite no demuestra esa concurrencia.
9. Verificar ticketera y puente real. Mantener emisiones reales SUNAT apagadas hasta su piloto fiscal autorizado. No se cambió la bandera global ni se emitieron documentos reales.
10. Reversión: entrar en mantenimiento, detener consumidores y restaurar una copia validada o aplicar una corrección hacia adelante. No reinstalar simplemente el cliente viejo ni borrar reservas/outbox/recetas históricas para revertir.

## Verificación reproducible local

Desde la raíz, con Node compatible y dependencias instaladas en raíz y `supabase/functions/_shared/sunat-signing`:

```sh
npm run build
npm run lint
node --test scripts/refresh-scheduler.test.mjs src/services/sunat/run-offline-tests.mjs supabase/functions/_shared/sunat-signing/*.test.mjs
```

`pos-security.test.mjs` reproduce migraciones gastronómicas y helpers efectivos de membresía, RLS y roles en PGlite. Se omite pgcrypto (se usa stub solo para un default de invitaciones no ejercido); no se simulan Vault, pg_net, Auth remoto ni cron. Los permisos se prueban como authenticated/anon, no como superusuario. Se prueban commits/reversión de operaciones, bloqueo de accesos indebidos, reservas, snapshots, consumos, outbox, leases, claves, reserva fiscal y cierre. No es replay integral del proyecto Supabase.

`pos-client.test.mjs` prueba persistencia ante respuesta perdida y serialización de HTML malicioso como texto. `scalability-db.test.mjs` incluye selección entre empresas en la cola nueva.

Supabase advisors no pudo conectarse al entorno local (`127.0.0.1:54322`: ECONNREFUSED; sin servidor Docker/Postgres). No se consultó el proyecto remoto. Se requiere ejecutarlo sobre ensayo antes de instalar.

## Escalabilidad y costo

Se limita la cola fiscal a 100 trabajos pendientes/en procesamiento por empresa (los documentos no se eliminan), se distribuyen slots por empresa antes de tomar su segundo trabajo y se mantiene el límite global de dos. Las exportaciones CSV rechazan más de 10.000 ventas en vez de construir un archivo ilimitado o truncarlo. Insumos se consultan por sucursal en páginas de 100; totales de caja se agregan en servidor. El listado visual de impresión se limita a 300; el consumidor consulta por separado los 100 trabajos más antiguos, por lo que no descarta pendientes anteriores.

Medir 10/50/100/500 restaurantes con 2/5/10 usuarios por local, durante 15 minutos de calentamiento, 60 de carga y 10 de pico. Usar cuentas/datos ficticios y entorno de ensayo. Recoger p95/p99 por RPC, errores, throughput, CPU, conexiones, bloqueos/deadlocks, Realtime y edad de colas. Criterio de integridad: cero duplicados, fuga entre empresas y diferencias contables no explicadas. No se garantiza una cifra de capacidad sin esa ejecución.

Para S/39 mensual y S/290 anual, ingreso mensual equivalente = `39 × clientes_mensuales + (290/12) × clientes_anuales`. Restar infraestructura, proveedores, comisiones y soporte; no se estimaron costos reales sin facturas ni consumos. Copias y alertas operativas dependen de infraestructura: no se afirma que estén activadas.

## Resultado de esta ejecución

83 pruebas aprobadas, 0 fallidas; compilación TypeScript/Vite y ESLint completo aprobados. Se revisó `git diff --check`. No se midió capacidad de producción, no se probaron ticketera real ni conexiones PostgreSQL independientes. Estado: propuesta para ensayo, no autorización de despliegue automático.
