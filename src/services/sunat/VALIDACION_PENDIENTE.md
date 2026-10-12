# Auditoría inicial SUNAT — 2026-10-12

Alcance: `src/services/sunat/` en rama `feature/sunat-integracion-segura`.
No se han enviado comprobantes ni desplegado cambios a producción.

## Fuentes oficiales
- SUNAT guías, reglas de validación y XSD: https://cpe.sunat.gob.pe/guias-y-manuales
- Guía XML factura UBL 2.1: https://cpe.sunat.gob.pe/sites/default/files/inline-files/guia%2Bxml%2Bfactura%2Bversion%202-1%2B1%2B0%20%282%29_0%20%282%29.pdf
- Guía XML boleta UBL 2.1: https://cpe.sunat.gob.pe/sites/default/files/inline-files/guia%2Bxml%2Bboleta%2Bversion%202-1%2B1%2B0_0_0%20%282%29.pdf
- Servicio beta (solo pruebas estructurales): https://cpe.sunat.gob.pe/noticias/servicio-beta-para-realizar-pruebas-ubl-21

## Hallazgos de inspección estática (NO equivalen a ejecución de pruebas)
1. **BLOQUEANTE:** `build-ubl-draft.ts` no incluye `cbc:ProfileID` (tipo de operación, catálogo 51).
2. **BLOQUEANTE:** `ext:ExtensionContent` está vacío; no existe firma XMLDSig ni certificado aplicado.
3. **BLOQUEANTE:** No se ha comprobado conformidad XSD ni reglas de validación CPE vigentes.
4. **BLOQUEANTE:** No existe envío SOAP, recepción CDR ni gestión de respuestas en los nuevos archivos.
5. **ALCANCE LIMITADO:** Solo admite operaciones gravadas al 18% con precios que incluyen IGV; no cubre exoneraciones, descuentos, gratuitas, detracciones ni otros supuestos.
6. **REVISAR:** Comprobar metadatos de catálogos SUNAT, tipo de precio, datos del emisor, datos de cliente y orden de elementos contra guías y XSD.
7. **REVISAR:** Redondeo del precio unitario neto en cantidades fraccionarias y conciliación de montos con reglas SUNAT.
8. **PRUEBAS PENDIENTES:** `draft-checks.ts` contiene verificaciones de regresión, pero no se han ejecutado en un runner ni en CI.

## Criterio de salida
- Ejecutar pruebas unitarias y regresión.
- Validar XML de factura y boleta contra XSD y reglas CPE oficiales.
- Implementar firma XMLDSig del lado del servidor y protección de credenciales.
- Probar con SUNAT beta sin cargas masivas y sin documentos reales.
- Validar procesamiento CDR, estados y reintentos.
- Solicitar autorización expresa antes de fusionar o desplegar.

**Estado: NO APTO PARA PRODUCCIÓN.**
