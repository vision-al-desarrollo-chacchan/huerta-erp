# Simulación local de carga — 13 octubre 2026

Se ejecutó un benchmark SQL reproducible con 100 empresas ficticias, 100.000 pedidos y 200.000 ítems. Son consultas representativas del patrón del ERP, sobre tablas sintéticas; no se invocaron los servicios React, Supabase remoto ni SUNAT.

| Clientes simulados | Filas por consulta | Consultas | Errores | p95 local |
|---|---:|---:|---:|---:|
| 10 | 100 | 100 | 0 | 25 ms |
| 50 | 100 | 500 | 0 | 142 ms |
| 100 | 100 | 1.000 | 0 | 225 ms |
| 100 | 250 (recarga amplia) | 1.000 | 0 | 499 ms |
| 100 | 1 (pedido afectado) | 1.000 | 0 | 64 ms |

Se completaron 3.600 consultas sin errores. Se comprobó que cada consulta devolvía la empresa filtrada y que el plan usa los índices de empresa/sucursal/fecha y pedido/ítems. Esto NO prueba RLS: es una comprobación del filtro explícito con datos sintéticos.

La consulta de 100 filas mostró aproximadamente un 55% menos de latencia p95 que la de 250; consultar un solo pedido mostró aproximadamente un 87% menos. Son resultados de esta ejecución local, no porcentajes garantizados de mejora de la aplicación.

## Reproducir

Desde la raíz del repositorio, con las dependencias de supabase/functions/_shared/sunat-signing instaladas:

```sh
node supabase/functions/_shared/sunat-signing/scalability-benchmark.mjs
```

El script actualiza docs/escalabilidad-benchmark-20261013.json con resultados y contexto. No contiene credenciales ni realiza solicitudes de red.

## Alcance y siguiente paso

PGlite es un único motor WASM y serializa las consultas; los clientes son tareas asíncronas, no sesiones independientes de Postgres. No es una certificación de capacidad para 100 empresas reales. No se midieron red, Auth, RLS real, conexiones, Realtime, escrituras concurrentes, firma de certificados ni tiempos SUNAT.

El entorno disponible no tiene PostgreSQL servidor ni Docker. Para la prueba completa hace falta un entorno aislado con la aplicación y Postgres/Supabase, cuentas ficticias y varios clientes HTTP autenticados. Allí medir p95, errores, bloqueos, consultas/segundo, conexiones, fanout Realtime y antigüedad/tamaño de la cola. No utilizar los datos ni la base operativa de Chicken Huerta.

Las pruebas funcionales de reserva, concurrencia máxima de dos trabajos y bloqueo de reenvíos ya están en scalability-db.test.mjs, queue-worker.test.mjs y live-pipeline.test.mjs. Esta medición nueva no mide la capacidad del worker contra SUNAT.
