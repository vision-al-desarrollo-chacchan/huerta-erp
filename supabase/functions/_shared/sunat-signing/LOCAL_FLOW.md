# Flujo SUNAT integrado en pruebas locales — 2026-10-12

`local-flow.test.mjs` une los módulos existentes de carga, validación PFX/P12,
cifrado por empresa, reserva de prueba, firma desde el certificado cifrado,
SOAP/ZIP, lectura CDR y persistencia del resultado.

## Qué se ejecutó realmente

- Los handlers de certificado y beta procesan objetos Request/Response reales.
- Se generan en memoria certificados y PFX ficticios con contraseña.
- AES-256-GCM cifra PFX y contraseña con una clave de ensayo aleatoria en memoria.
- Una base PostgreSQL local PGlite ejecuta las dos migraciones SUNAT y las RPC.
- La firma XMLDSig usa el certificado obtenido del ciphertext almacenado.
- El transporte construye la petición SOAP y procesa una respuesta CDR simulada.
- XML y ZIP CDR se guardan como bytes en una tabla local que representa Storage.
- Se registran estado, código, mensajes y rutas en ef_sunat_beta_pruebas.

Auth usa identidades de ensayo, no sesiones JWT de Supabase. Los esquemas auth,
rest y storage son mínimos; Storage HTTP y SUNAT se simulan. No se ejecutó un
servidor Supabase completo, ni se cambió la configuración de endpoints desplegados.
El endpoint beta existente conserva su certificado efímero: esta composición con
el certificado cargado corresponde al harness local, no a un despliegue conectado.

## Casos verificados

1. Una contraseña incorrecta no guarda certificado ni activa emisión.
2. Carga cifrada → reserva → firma → SOAP → CDR → resultado, con dos solicitudes
   concurrentes: un solo envío simulado. Se guardan XML y CDR en rutas de empresa.
   Una repetición posterior conserva el resultado y no vuelve a enviar.
3. Personal sin permiso u otra empresa no pueden cargar ni iniciar pruebas;
   tampoco pueden leer los artefactos de ese propietario.
4. Timeout simulado después de iniciar envío: estado incierto y sin reenvío al
   repetir la misma clave. Solo el ensayo local adelanta su fecha para probar el
   límite de un minuto, sin modificar bases remotas.

Los cuatro casos pasaron. La factura generada a través del certificado cifrado
pasó además el XSD oficial UBL-Invoice-2.1.xsd y una verificación independiente
del digest SHA256 y firma RSA con lxml + cryptography.

## Reproducir

Node >=24, Python y las dependencias locales ya documentadas:

```sh
npm ci --prefix supabase/functions/_shared/sunat-signing
node --test supabase/functions/_shared/sunat-signing/local-flow.test.mjs
```

Para exportar únicamente el XML ficticio y el certificado público y verificarlo:

```sh
SUNAT_LOCAL_FLOW_OUTPUT=/tmp/huerta-sunat-flujo node --test supabase/functions/_shared/sunat-signing/local-flow.test.mjs
python supabase/functions/_shared/sunat-signing/validate_xml.py /tmp/huerta-sunat-flujo/factura.xml --schema '/tmp/huerta-sunat-xsd/Archivos XSD/2.1/maindoc/UBL-Invoice-2.1.xsd' --certificate /tmp/huerta-sunat-flujo/certificate.pem
```

Ninguna clave privada, contraseña, PFX o clave maestra se exporta. La base es
efímera y se cierra al terminar; no hay solicitudes a servicios remotos ni costos
de nuevas ramas/proyectos. La aceptación de este ensayo es SIMULADA; la aceptación
beta real del paso anterior sigue documentada aparte en BETA_RESULT.json.

Pendiente: verificar Auth/PostgREST/Storage en un Supabase aislado completo,
conectar el certificado almacenado al endpoint autorizado, revisar reglas CPE
completas y confianza/registro del certificado real antes de emitir.
