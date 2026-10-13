# Integración SUNAT — 2026-10-13

## Instalado

- Formulario por empresa: datos fiscales, certificado PFX/P12 y contraseña, usuario y clave SOL.
- Certificado: validación de contraseña, vigencia, RSA y correspondencia de RUC; almacenamiento AES-256-GCM.
- SOL: cifrado AES-256-GCM vinculado a empresa, RUC y propósito, separado del certificado.
- Clave dedicada aleatoria de 32 bytes en Supabase Vault. Vault protege esa clave con una clave administrada fuera de la base. La RPC de acceso es exclusiva de service_role y delega a una función en esquema privado. Nunca se imprime el secreto en las comprobaciones, ni se incluye en código o frontend.
- Factura: pedido leído del servidor, conciliación de montos, UBL gravado al 18%, firma desde certificado almacenado, ZIP, SOAP, lectura de CDR y archivos privados.
- Reserva del envío atómica y marcador durable anterior a la conexión. Tras una respuesta incierta no se reenvía. Consulta CDR independiente con getStatusCdr.
- Frontend lee solamente metadatos; permisos SQL impiden lectura del ciphertext por authenticated.
- Boletas: XML individual firmado más resumen diario firmado, correlativo de resumen reservado por empresa/día, sendSummary y ticket persistido. getStatus consulta sin reenviar y solo marca aceptación/rechazo al leer el CDR del resumen correspondiente. Un resumen complementario por boleta en esta versión.

## Verificación

Build frontend y ESLint de archivos modificados correctos. TypeScript del backend comprobado con declaración mínima del runtime Deno: la instalación local de Deno no pudo resolver sus paquetes de tipos en este entorno. Supabase sí compiló y desplegó las tres Edge Functions con JWT requerido.

22 pruebas Node de SOL, transporte, consulta CDR, handlers de carga, cifrado y flujo local pasan. Cuatro grupos de verificaciones PostgreSQL locales comprueban permisos, metadatos, guardado transaccional y reserva/marcador durable. Vault y esquemas de Auth/Storage son simulados en esas pruebas.

Verificación remota: clave dedicada existente y de longitud correcta sin mostrar su valor; authenticated sin acceso a clave ni tabla SOL; service_role con acceso a la RPC; ciphertext de configuración oculto al navegador. OPTIONS 200 y POST sin autenticación 401 en las tres funciones. Esto NO verifica una carga completa con una sesión administrativa.

## No terminado / no apto todavía para emisión real

`SUNAT_REAL_ISSUANCE_ENABLED` permanece desactivado. La integración no emite comprobantes reales ni activa empresas automáticamente. Falta validar el primer caso con una empresa habilitada, certificado real, registro/confianza del certificado, acceso SOL y reglas CPE completas. No se dispone de esos datos; Chicken Huerta sigue en Nuevo RUS y conserva pruebas ficticias.

El transporte implementado admite facturas y boletas gravadas al 18% y al contado. La firma del resumen, el envío del ticket, su consulta y el rechazo de CDR ajenos tienen tres pruebas locales. El resumen ficticio firmado pasó el XSD oficial UBLPE-SummaryDocuments-1.0.xsd del paquete SUNAT con checksum 5cac9d9353521340fbc15d23f465a4946b004535b9ff411541c87da01694dbd5. Se envió un resumen ficticio al servicio beta real: RC-20261012-42793, ticket 1791863156402, CDR aceptado código 0. Esta prueba directa usa curl con TLS, no Auth/PostgREST/Storage del endpoint desplegado. Notas de crédito, débito, bajas, descuentos, operaciones exoneradas/gratuitas, detracciones y crédito no están cubiertos. No habilitar ni anunciar facturación completa con este estado.

Fuentes: https://supabase.com/docs/guides/database/vault ; https://cpe.sunat.gob.pe/sites/default/files/inline-files/manual_programador%20%281%29.pdf ; https://cpe.sunat.gob.pe/sistema_emision/see_contribuyente

## Activación por empresa — 2026-10-13

El formulario incorpora revisión de requisitos, selección de régimen, confirmación del administrador y un botón de activación conectado al backend. Los requisitos se calculan con los datos guardados, no con los campos aún sin guardar. La revisión fiscal se vincula al RUC y la huella del certificado de esa empresa; ni el navegador ni el personal pueden aprobarla o llamar directamente a la RPC de activación. El envío vuelve a verificar esa aprobación antes de preparar un comprobante.

La aprobación del piloto y el interruptor global siguen pendientes. No se aprobó ni activó ninguna empresa. La primera emisión real requiere validar la empresa, certificado registrado y credenciales SOL. Los tres casos de readiness y tres grupos SQL de autorización/activación pasaron localmente. El formulario y las nuevas funciones se verifican por separado de la prueba beta.
