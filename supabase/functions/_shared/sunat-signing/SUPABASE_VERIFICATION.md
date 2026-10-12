# Instalación y verificación Supabase — 2026-10-12

El usuario autorizó instalar exclusivamente las tablas y funciones de pruebas
SUNAT en el proyecto existente `huerta-erp` (ref `ksmraxusmcwwzpoyhtqv`), manteniendo
la emisión real desactivada. No se creó rama/proyecto adicional ni se modificaron
ventas, caja, inventario, usuarios, funciones de otros módulos o frontend.

## Cambios remotos efectuados

- Migración `sunat_beta_pruebas`: tabla ef_sunat_beta_pruebas, RPC de reserva y
  bucket privado sunat-beta-pruebas.
- Migración `sunat_certificate_vault`: tabla ef_sunat_certificados y RPC de
  guardado atómico con metadatos fiscales.
- Edge Function electronic-billing-beta: versión 1, JWT requerido.
- Edge Function electronic-billing-certificate: versión 1, JWT requerido.

Ambas funciones están desplegadas pero sus funcionalidades están DESHABILITADAS
por los interruptores de entorno. No se configuró clave maestra ni se cargó un
certificado real. electronic-billing-send y electronic-billing-secrets conservaron
su versión 1; manage-worker conservó su versión 2.

## Verificación remota real

- Ambas tablas tienen RLS habilitado.
- authenticated no puede insertar en las tablas nuevas, ni leer ef_sunat_certificados.
- anon no puede ejecutar la reserva beta.
- authenticated puede reservar beta, con comprobación interna de administración.
- authenticated no puede ejecutar la RPC de guardado de certificados; service_role sí.
- Dentro de una transacción con rollback se usó el contexto SQL de un administrador
  existente, sin cambiar su cuenta: la reserva devolvió el mismo ID para la misma
  clave, rechazó una nueva prueba concurrente y rechazó la llamada sin auth.uid().
- Tras rollback: 0 pruebas persistidas y 0 certificados persistidos.
- HTTP OPTIONS beta: 200 desde Supabase Edge Runtime.
- HTTP POST sin Authorization, ambas funciones: 401, Missing authorization header.
- HTTP POST con la clave anon pública como JWT de compatibilidad, ambas funciones:
  503 con mensaje explícito de funcionalidad deshabilitada. Esto confirma el arranque
  e imports de las funciones desplegadas, no una sesión de usuario administrador.

No se usaron contraseñas del usuario ni claves privadas reales. No hubo envío
SUNAT durante esta verificación de instalación.

## Asesor de seguridad

Se ejecutó get_advisors sobre el proyecto. Los dos avisos relativos al módulo nuevo
son intencionales y se revisaron contra los permisos efectivos:

- ef_sunat_certificados tiene RLS sin políticas porque ningún navegador debe acceder
  al material cifrado; solamente el backend con service_role lo lee/escribe.
  https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- ef_sunat_beta_reservar es SECURITY DEFINER y ejecutable por authenticated para
  reservar sin conceder INSERT directo. Tiene search_path vacío, comprueba auth.uid(),
  rol administrativo activo y empresa, y bloquea reservas simultáneas. anon está revocado.
  https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

Los avisos preexistentes de otros módulos y de configuración Auth no se modificaron.

## Pendiente para la prueba completa

Hace falta habilitar SOLO beta y ejecutar el endpoint con una sesión válida de
administrador, comprobar la reserva PostgREST, upload a Storage, envío y CDR dentro
de la función desplegada. La prueba SQL no sustituye una sesión Supabase Auth.
La función beta aún genera su certificado ficticio efímero; no usa el certificado
real ni cambia los estados de ef_documentos. El flujo local con certificado cargado
sigue descrito en LOCAL_FLOW.md.

La carga de certificados reales queda apagada hasta configurar de forma segura la
clave dedicada y comprobar permisos/formatos. Emisión real no autorizada ni activada.

## Actualización: beta activada por autorización expresa

Se desplegó electronic-billing-beta versión 2. En huerta-erp se habilita por
defecto salvo SUNAT_BETA_ENABLED=false; otros proyectos conservan el valor
default deshabilitado. Sigue requiriendo JWT de usuario y administración activa.
HTTP POST con la clave anon: 401 «Sesión inválida», confirmando que ya no devuelve
503 de beta deshabilitada y que no se concede acceso de usuario a una clave pública.
La función de certificados sigue devolviendo 503 de carga deshabilitada.
No se envió documento durante esta activación. El control de prueba del frontend
y la ejecución con sesión administrativa siguen pendientes.
