# Pruebas de boleta SUNAT beta

El panel permite elegir factura (01) o boleta (03), siempre con identidad, certificado y credenciales ficticios. El total es S/ 11.80. No modifica ventas, series reales ni activa emisión tributaria.

La boleta B001-1 se comunica mediante resumen diario firmado. El primer envío guarda el ticket; «Actualizar resultado» consulta getStatus y guarda el CDR al recibirlo. Un ticket recibido todavía no significa aceptación. La clave queda ligada al tipo de comprobante y un resultado incierto nunca dispara otro envío.

## Publicación

1. Aplicar `20261028053034_sunat_beta_receipt.sql` en el proyecto correspondiente.
2. Desplegar `electronic-billing-beta` con sus dependencias compartidas.
3. Publicar el frontend.
4. Como administrador, seleccionar Boleta, ejecutar y consultar el resultado hasta obtener aceptación o rechazo. Verificar también una factura de regresión.

La migración mantiene la firma RPC anterior para clientes existentes. Los datos de pruebas previas se consideran facturas.

## Verificación local

`npm run build`, `npm run lint` y la suite offline de 90 pruebas pasaron. La verificación inicial no incluyó un envío de boleta beta.

## Corrección del rechazo 2992

SUNAT beta rechazó el resumen por ausencia de `cbc:Percent` dentro de `cac:TaxCategory`. Se agregó 18.00 para las operaciones gravadas admitidas por este generador. Los SOAP Fault Client con código de cuatro dígitos se muestran como rechazo explícito; errores de servidor, transporte o respuesta ambigua continúan sin confirmar.

Una prueba directa ficticia del resumen RC-20261028-21361 obtuvo ticket y aceptación código 0. Esta aceptación valida únicamente el entorno beta, no habilita producción. Los intentos anteriores permanecen sin confirmar; el operador puede preparar otra prueba ficticia con una clave nueva, sin reenviar el intento anterior.
