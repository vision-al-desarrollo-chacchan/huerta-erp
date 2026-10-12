# Backend SUNAT beta aislado

Nueva Edge Function `electronic-billing-beta`, deshabilitada por defecto.
No sustituye `electronic-billing-send`, no lee credenciales fiscales reales y no
modifica `ef_documentos`, ventas, caja, pedidos, series ni inventario.

Solo acepta `{empresaId, idempotencyKey}` (ambos UUID), con JWT válido del usuario.
La RPC verifica que sea propietario o administrador activo de esa empresa. El
servidor genera una factura ficticia fija con un certificado autofirmado efímero,
firma XMLDSig, empaqueta ZIP y envía exclusivamente a SUNAT beta con MODDATOS.
La clave privada solo existe en memoria durante la generación de la prueba.

## Persistencia

La migración `20261012170000_sunat_beta_pruebas.sql` crea una tabla beta separada,
una RPC de reserva y un bucket privado `sunat-beta-pruebas`.

- Misma empresa y clave: devuelve la misma prueba, sin volver a enviar.
- Reserva serializada por empresa; una prueba pendiente/enviando a la vez y
  al menos un minuto entre pruebas nuevas.
- Inicio con actualización condicional de pendiente a enviando: solo un proceso
  puede enviar. Los estados finales nunca se vuelven a tomar automáticamente.
- XML y CDR se guardan en `<empresaId>/<pruebaId>/` dentro del bucket privado.
- Los administradores solo leen sus pruebas y artefactos; el navegador no puede
  insertar ni modificar resultados.
- Respuestas: aceptado, observado, rechazado. Un error antes del envío produce
  error; timeout o fallo después de iniciar el envío produce incierto.
- Un proceso interrumpido puede quedar enviando. Requiere revisión manual; no hay
  reintentos, recuperación automática ni cola activada.

## Preparación de un entorno de pruebas

Estos pasos NO se ejecutaron contra una cuenta Supabase durante esta entrega:

1. Revisar y aplicar la nueva migración exclusivamente en un Supabase de pruebas
   con el esquema HUERTA ERP. No usar `db push` apuntando a producción.
2. Desplegar únicamente `electronic-billing-beta` en ese proyecto, conservando la
   verificación JWT de la plataforma. Su `deno.json` fija los imports npm.
3. Configurar `SUNAT_BETA_ENABLED=true` solo allí. Las variables Supabase estándar
   son SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY.
4. Invocar con JWT de un administrador y una nueva clave UUID; conservar esa clave
   si el cliente repite la solicitud. No enviar documentId, XML ni credenciales.
5. Verificar tabla beta, XML privado y CDR. Ningún resultado beta habilita emisión
   real ni cambia los estados de documentos comerciales.

Ejemplo de cuerpo:

```json
{"empresaId":"UUID-DE-EMPRESA-DE-PRUEBAS","idempotencyKey":"UUID-NUEVO"}
```

No se agregó un botón al frontend ni se activó emisión real.

## Verificación local — 2026-10-12

- Node: 20 pruebas de cálculo, validación, firma, transporte y orquestación correctas.
- Python: 6 pruebas previas de lectura SOAP/CDR correctas.
- PostgreSQL local mediante PGlite: 8 comprobaciones correctas de reserva, roles,
  RLS por empresa, escrituras denegadas, artefactos y toma condicional del trabajo.
  Usa esquemas mínimos de auth/storage/rest; no reemplaza pruebas de todas las
  migraciones ni de la plataforma Supabase real.
- Deno: typecheck de la nueva Edge Function correcto; 12 pruebas de cliente y
  orquestación correctas en Deno. El transporte de estas pruebas es simulado.
- La respuesta beta real del paso anterior fue leída por el nuevo parser JS:
  código 0, aceptado. No se hizo un nuevo envío durante estas pruebas de backend.

Desde la raíz del repositorio, Node >=24:

```sh
npm ci --prefix supabase/functions/_shared/sunat-signing
node --test src/services/sunat/run-offline-tests.mjs supabase/functions/_shared/sunat-signing/sign-xml.test.mjs supabase/functions/_shared/sunat-signing/beta-handler.test.mjs supabase/functions/_shared/sunat-signing/beta-client.test.mjs
node supabase/functions/_shared/sunat-signing/beta-db.test.mjs
python supabase/functions/_shared/sunat-signing/test_beta_response.py
```

Para Deno, instalar los paquetes del `deno.json` del endpoint en el entorno de
pruebas y ejecutar `deno check` sobre su `index.ts`; no deshabilitar TLS.

Pendiente: prueba completa JWT/RPC/Storage/SUNAT en Supabase aislado, carga segura
PFX/P12 real, validación tributaria completa y futura conexión a documentos reales.
La lectura CDR todavía no valida criptográficamente su firma.
