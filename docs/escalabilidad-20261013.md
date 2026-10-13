# HUERTA ERP — mejoras de escalabilidad (13 octubre 2026)

## Cambios implementados

- Empresa/sucursal: una sola solicitud compartida cuando varias pantallas arrancan en paralelo; el resultado no se reutiliza si cambia el usuario.
- Ventas y Cocina: selección de estados activos, paginación interna para no ocultar comandas antiguas, actualizaciones por IDs afectados en lugar de descargar todo el historial.
- Realtime: filtro de productos por empresa y pedidos por sucursal, suscripción global de ítems eliminada; trigger por sentencia actualiza una sola vez cada pedido afectado. RLS sigue vigente.
- Actualizaciones: agrupa ráfagas, permite una actualización a la vez, recupera cambios que llegan durante la consulta y limpia suscripciones al salir.
- Historiales de pedidos, facturación, clientes, proveedores, documentos, cotizaciones y tareas: páginas de 100 con carga adicional. La búsqueda de clientes consulta el servidor; índices para listados por empresa y fecha.
- Facturación: la lista pide campos visibles, sin descargar el borrador UBL de cada documento.
- SUNAT: cola persistente privada, un trabajo por documento, máximo global de dos trabajos en vuelo, leases de cinco minutos y consultas posteriores acotadas. La solicitud del usuario devuelve pendiente; NO significa aceptado.
- Scheduler cada 10 segundos únicamente si hay trabajos disponibles y capacidad. Worker autenticado mediante HMAC de corta duración y nonce de un solo uso, con clave exclusiva en Vault. El transporte gestionado pg_net tiene permisos amplios que postgres no puede revocar; por eso nunca transporta la clave permanente.
- Firma/envío conserva la validación de empresa, certificado, SOL, revisión y bandera global. Ningún envío con marcador de transmisión se vuelve a enviar; resultados ambiguos requieren consulta/revisión.

## Validación

- Frontend: TypeScript, Vite y ESLint de archivos cambiados.
- Backend: TypeScript y despliegue de ambas Edge Functions.
- 58 pruebas Node de SUNAT y SQL, más prueba del agrupador de actualizaciones.
- Base local PGlite: 100 empresas ficticias, 100.000 registros; consulta de 100 filas usa índice por empresa. NO representa una medición de concurrencia ni capacidad de producción.
- Seguridad: anon/authenticated no pueden leer trabajos, obtener la clave ni reservar lotes. Endpoint interno sin clave y emisión sin sesión responden 401.

## Límites y siguiente validación

Producción SUNAT sigue apagada y ninguna empresa se activó. No se emitieron comprobantes reales ni se ejecutó carga sobre la pollería.

El límite de dos trabajos es conservador. La capacidad real depende del tiempo de firma/envío, CPU del runtime, recursos de Postgres y cuotas de Realtime. Hay que medir latencia p95, errores y crecimiento de la cola en un entorno aislado antes de garantizar 100 empresas simultáneas o aumentar concurrencia.

Quedan para una fase de medición y mejora específica: agregaciones de Dashboard/Contabilidad/Reportes (algunos consumidores mantienen ventanas de historial y algunos selectores mantienen listas completas), migración de Realtime a Broadcast si los benchmarks lo justifican, alertas externas y dimensionamiento del plan de infraestructura. No eliminar índices simplemente porque figuran sin uso con los pocos datos actuales.

Para validar el primer comprobante real todavía se necesita una empresa habilitada, su certificado y SOL, completar la revisión fiscal del CPE y aprobar la activación. Chicken Huerta continúa Nuevo RUS, sin activar facturas.
