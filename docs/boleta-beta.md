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

`npm run build`, `npm run lint` y la suite offline de 90 pruebas pasaron. No se ha efectuado un envío real de esta nueva boleta beta ni se ha desplegado el cambio en el sitio.
