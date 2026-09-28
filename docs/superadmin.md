# Panel de plataforma

Ruta: `/superadmin`. La base de datos comprueba cada operación; el rol de propietario o administrador de una pollería no concede acceso al panel.

La migración crea un registro privado con una restricción de una sola cuenta. **Queda vacío hasta confirmar el correo del usuario que pidió el cambio.** No se debe elegir el primer propietario ni utilizar `user_metadata`.

Después de confirmar el correo, un operador autorizado de la base debe insertar el `auth.users.id` correspondiente en `platform_private.superadmin`. Verificar que la consulta resuelva exactamente una cuenta. No hay API de autoservicio para conceder este permiso.

El panel lista las empresas reales, incluido Chicken Huerta, y permite:
- Crear una empresa vacía y su sucursal principal, asignando como propietario una cuenta registrada sin otra empresa.
- Consultar propietarios y cantidad de usuarios activos.
- Registrar nombre del plan y fecha de renovación (informativos; no cobra ni suspende automáticamente).
- Volver al ERP cuando la cuenta tiene una membresía en el negocio.

La nueva cuenta del dueño se registra en el login sin código de invitación. Queda en `/acceso-pendiente` hasta la asignación. Los empleados conservan el registro con invitación y la gestión existente de usuarios. Los roles personalizados, suspensión de servicio y operación en varias empresas con una misma cuenta quedan fuera de esta primera etapa.

Desplegar la migración antes del frontend y desplegar `manage-worker` para proteger el cambio de contraseña de la cuenta de plataforma. La función también rechaza solicitudes contra usuarios ajenos al negocio.

No se modifica ni se copia el catálogo, caja, ventas o membresías existentes. La antigua función `rest_crear_empresa_inicial` resuelve la empresa existente, pero ya no crea una empresa automáticamente al iniciar sesión sin membresía.

## Verificación de esta entrega

- `npm run build`: correcto.
- ESLint de todos los archivos frontend modificados: correcto. El lint global conserva errores anteriores en `Arqueo.tsx` y `Reportes.tsx`.
- `supabase/tests/platform_access.sql`: pasó contra PostgreSQL con rollback. Comprueba creación atómica, propietario, plan, rechazo de dueño duplicado, aislamiento de empresas/productos/pedidos, denegación a anónimos y protección contra autoasignación. Ejecutar antes del bootstrap, con registro de superadmin vacío; los usuarios de prueba nunca se conservan.
- Asesor de seguridad: las tablas privadas sin políticas son intencionales (sin acceso directo, únicamente funciones con comprobación). Los avisos en funciones públicas preexistentes y protección de contraseñas filtradas corresponden a la configuración anterior. Referencias: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy y https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
- Verificación visual: no completada. El daemon de agent-browser no inició y la instalación de Chrome falló por certificado del entorno. No se probaron credenciales de usuarios reales.
