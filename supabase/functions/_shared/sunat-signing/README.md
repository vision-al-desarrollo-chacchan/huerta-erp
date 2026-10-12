# Firma XMLDSig SUNAT aislada

Implementación exclusiva de servidor, aún sin conectar a una Edge Function ni desplegar.
`signSunatXml({xml, certificatePem, privateKeyPem})` devuelve el XML firmado.
`verifySunatXml(xml, trustedCertificatePem)` comprueba la firma con confianza fijada
al certificado suministrado por el backend, no al certificado recibido en el XML.

Perfil probado: RSA-SHA256, digest SHA256, C14N 1.0 sin comentarios, referencia
al documento completo (`URI=""`) y transformación enveloped-signature. La firma
se coloca en `ext:ExtensionContent`; se agrega la referencia UBL `cac:Signature`.
No hay llamadas a SUNAT, almacenamiento de claves ni logs de credenciales.

Se exige RSA >=2048, vigencia del certificado, correspondencia de clave privada
y RUC en serialNumber/UID del sujeto. Certificados de proveedores con otro formato
requieren revisar su representación de identidad. La verificación criptográfica
no comprueba cadena de confianza, revocación ni inscripción del certificado en SUNAT.
El código recibe PEM en memoria; aún falta la carga segura de PFX/P12 y su contraseña.
No almacenar certificados privados en git ni enviarlos al frontend.

## Pruebas locales

Node >=24 y Python con las dependencias de `requirements-test.txt`:

```sh
npm ci --prefix supabase/functions/_shared/sunat-signing
node --test src/services/sunat/run-offline-tests.mjs
SUNAT_TEST_OUTPUT_DIR=/tmp/huerta-sunat-prueba node --test supabase/functions/_shared/sunat-signing/sign-xml.test.mjs
python supabase/functions/_shared/sunat-signing/download_xsd.py /tmp/huerta-sunat-xsd
python supabase/functions/_shared/sunat-signing/validate_xml.py /tmp/huerta-sunat-prueba/boleta.xml --schema '/tmp/huerta-sunat-xsd/Archivos XSD/2.1/maindoc/UBL-Invoice-2.1.xsd' --certificate /tmp/huerta-sunat-prueba/certificate.pem
python supabase/functions/_shared/sunat-signing/validate_xml.py /tmp/huerta-sunat-prueba/factura.xml --schema '/tmp/huerta-sunat-xsd/Archivos XSD/2.1/maindoc/UBL-Invoice-2.1.xsd' --certificate /tmp/huerta-sunat-prueba/certificate.pem
```

Los certificados de las pruebas se generan en memoria, son autofirmados y no sirven
para producción. El directorio opcional solo conserva XML ficticios y el certificado
público; ninguna clave privada. `deno.json` fija los imports npm para ensayos en Deno;
ese runtime y el despliegue Supabase todavía no se han probado.

## Evidencia de 2026-10-12

- Tres pruebas previas y cinco pruebas nuevas de firma: correctas.
- Factura y boleta firmadas: válidas contra UBL-Invoice-2.1.xsd descargado de SUNAT.
- Segunda verificación con lxml + cryptography: digest y RSA correctos en ambas.
- Rechazos: importes/receptor/producto alterados, RUC ajeno, vigencia inválida,
  clave incorrecta, RSA débil, XML mal formado, DTD, extensión ocupada,
  firma previa/duplicada y referencia parcial.

Esto acredita estructura XSD y firma local, no aceptación tributaria por SUNAT.
Quedan pendientes reglas CPE actuales completas, certificado real registrado,
integración del transporte/CDR con el ERP y validación de extremo a extremo en su runtime real. Se realizó un envío aislado a beta, descrito abajo.

## Fuentes

- https://cpe.sunat.gob.pe/guias-y-manuales (XSD publicado 28/02/2022; reglas CPE listadas 26/08/2026).
- https://cpe.sunat.gob.pe/sites/default/files/inline-files/Archivos%20XSD%20%281%29.zip
- https://orientacion.sunat.gob.pe/12-pautas-servicio-beta
- https://github.com/node-saml/xml-crypto

## Envío real a beta — 2026-10-12

Factura ficticia `20123456789-01-F001-1`, firmada con certificado autofirmado.
Respuesta HTTP 200, CDR código `0`: «La Factura numero F001-1, ha sido aceptada».
Se usaron exclusivamente las credenciales públicas de beta MODDATOS. No se
usaron el RUC de Chicken Huerta, claves SOL reales ni producción.

Se corrigieron tres rechazos observados antes de la aceptación:
- 3030: código del local anexo (`AddressTypeCode`, por defecto 0000).
- 3205: tipo de operación (`InvoiceTypeCode/@listID=0101`).
- 3244: forma de pago (`PaymentTerms`, FormaPago/Contado).

El parser distingue SOAP Fault, CDR aceptado y CDR rechazado, verifica la
referencia del documento y limita tamaños. Admite un directorio dentro del ZIP.
Su lectura no verifica criptográficamente la firma del CDR; no está conectada
a estados persistentes del ERP, reintentos ni vistas de usuario.

`probe_beta.py` solo permite esta factura ficticia fija, bloquea redirecciones y
no admite endpoint configurable. No realiza reintentos automáticos. La prueba
manual requiere autorización de envío a beta y no es una prueba de carga.

```sh
python supabase/functions/_shared/sunat-signing/test_beta_response.py
python supabase/functions/_shared/sunat-signing/probe_beta.py /tmp/huerta-sunat-prueba/factura.xml --schema '/tmp/huerta-sunat-xsd/Archivos XSD/2.1/maindoc/UBL-Invoice-2.1.xsd' --certificate /tmp/huerta-sunat-prueba/certificate.pem --output-dir /tmp/huerta-sunat-beta-respuesta
```

Resultado mínimo en `BETA_RESULT.json`. Ocho pruebas Node y seis de lectura CDR
correctas después de las correcciones. Aceptación beta no equivale a autorización
ni aceptación tributaria en producción.
