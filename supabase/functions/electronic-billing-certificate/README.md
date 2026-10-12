# Carga de certificados SUNAT — preparada para pruebas locales

Nueva función `electronic-billing-certificate`. Está deshabilitada por defecto,
no se desplegó y su migración no se aplicó a ningún proyecto Supabase remoto.

POST autenticado: empresaId (UUID), fileName (.pfx/.p12), pfxBase64 y password.
No acepta RUC elegido por el navegador. Verifica el JWT con getUser, comprueba
membresía activa de propietario/administrador y obtiene el RUC de rest_empresas.
Valida PFX, contraseña, vigencia, correspondencia de clave y RUC.

El PFX y la contraseña se cifran juntos con AES-256-GCM. La clave de cifrado
es dedicada, de 32 bytes aleatorios, y se mantiene fuera de la base de datos.
Los datos autenticados vinculan el cifrado a empresa, RUC, propósito, versión
 y keyId. Cambiar empresa, RUC, clave o ciphertext impide descifrar.

## Configuración futura del backend

- SUNAT_CERTIFICATE_UPLOAD_ENABLED=true únicamente en el entorno autorizado.
- SUNAT_CERTIFICATE_KEY_BASE64: 32 bytes aleatorios, codificados en base64.
- SUNAT_CERTIFICATE_KEY_ID: identificador de la clave (por defecto v1).
- Variables estándar de Supabase para autenticación y cliente administrativo.

No usar la service-role key como clave de cifrado. No incluir estos valores
reales en archivos del repositorio, respuestas, frontend o logs. La pérdida de
la clave dedicada impide recuperar los certificados; la rotación requiere
conservar acceso a la clave de cada keyId y recifrar de forma controlada.
No se creó ninguna clave de producción durante esta entrega.

## Base de datos

La migración generada con Supabase CLI es
`20261012175041_sunat_certificate_vault.sql`.

`ef_sunat_certificados` tiene RLS y no concede acceso a anon/authenticated.
El backend utiliza service_role para la lectura. La RPC de guardado solo permite
service_role, vuelve a comprobar miembro activo, empresa activa y RUC, y guarda
el certificado y los metadatos de ef_configuraciones en una sola transacción.
La función es SECURITY INVOKER, con search_path vacío y nombres cualificados.
No activa facturación, no cambia proveedores ni almacena la contraseña en texto.
La tabla sin políticas para navegador es intencional.

La respuesta HTTP contiene únicamente metadatos públicos y Cache-Control:no-store.
No contiene el PFX, contraseña, clave privada, ciphertext o clave de cifrado.
El lector limita el cuerpo a 2.9 MB y el PFX a 2 MB. Se limpian buffers cuando es
posible; JavaScript no garantiza borrar inmediatamente cadenas u objetos de memoria.

## Firma desde el certificado almacenado

El backend autorizado puede leer el envelope de esa empresa y llamar a
`signSunatXmlWithStoredCertificate({xml,envelope,empresaId,issuerRuc,keyId,keyBase64})`.
El módulo descifra internamente y devuelve solamente el XML firmado. No devuelve
la clave privada ni la contraseña. `inspectStoredSunatCertificate` devuelve metadatos
públicos para comprobar vigencia e identidad.

La función de envío real existente no se modificó ni se conectó a esta carga.
No hay formulario frontend, ni envío automático, ni uso de un certificado real.

## Verificación local — 2026-10-12

- 5 pruebas de cifrado/descifrado/firma correctas en Node y Deno.
- 6 pruebas de autenticación, autorización y respuesta de carga correctas en Node y Deno.
- 7 comprobaciones PostgreSQL local con PGlite: guardado de metadatos sin activar,
  navegador sin lectura/RPC, anónimo bloqueado, RUC/empresa ajenos rechazados,
  vigencia/envelope inválidos rechazados, miembro revocado bloqueado y rollback
  completo si falla la actualización de metadatos.
- Typecheck Deno de la nueva Edge Function correcto.

```sh
npm ci --prefix supabase/functions/_shared/sunat-signing
node --test supabase/functions/_shared/sunat-signing/certificate-vault.test.mjs supabase/functions/_shared/sunat-signing/certificate-handler.test.mjs
node supabase/functions/_shared/sunat-signing/certificate-db.test.mjs
```

PGlite usa esquemas mínimos de auth/rest, no un Supabase remoto. Las llamadas de
Auth/PostgREST en las pruebas de handler son simuladas. Quedan pendientes pruebas
HTTP completas en Supabase, asesores sobre el esquema real y revisión de recursos
CPU/tiempos para formatos reales antes de habilitar la carga. No se verifican cadena
de confianza, revocación o registro SUNAT; estos siguen siendo requisitos separados.
