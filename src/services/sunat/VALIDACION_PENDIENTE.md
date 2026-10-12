# Auditoría inicial SUNAT — 2026-10-12

Alcance: `src/services/sunat/` en rama `feature/sunat-integracion-segura`.
No se han enviado comprobantes ni desplegado cambios a producción.

## Fuentes oficiales
- SUNAT guías, reglas de validación y XSD: https://cpe.sunat.gob.pe/guias-y-manuales
- Guía XML factura UBL 2.1: https://cpe.sunat.gob.pe/sites/default/files/inline-files/guia%2Bxml%2Bfactura%2Bversion%202-1%2B1%2B0%20%282%29_0%20%282%29.pdf
- Guía XML boleta UBL 2.1: https://cpe.sunat.gob.pe/sites/default/files/inline-files/guia%2Bxml%2Bboleta%2Bversion%202-1%2B1%2B0_0_0%20%282%29.pdf
- Servicio beta (solo pruebas estructurales): https://cpe.sunat.gob.pe/noticias/servicio-beta-para-realizar-pruebas-ubl-21

## Hallazgos de inspección estática (NO equivalen a ejecución de pruebas)
1. **CORREGIDO:** `build-ubl-draft.ts` incluye `cbc:ProfileID=0101`; sus metadatos aún deben contrastarse con las reglas oficiales.
2. **AVANCE LOCAL:** Existe firma XMLDSig en `supabase/functions/_shared/sunat-signing/`; factura y boleta firmadas con certificados ficticios verificadas. Falta carga segura de PFX/P12 y certificado real.
3. **XSD LOCAL CORRECTO:** Factura y boleta firmadas válidas contra el XSD UBL 2.1 oficial descargado de SUNAT. Las reglas CPE vigentes completas aún no se han validado.
4. **BETA AISLADA ACEPTADA:** `probe_beta.py` envió una factura ficticia firmada; SUNAT beta devolvió HTTP 200 y CDR código 0. Existe lectura de SOAP Fault/CDR con pruebas. Falta integrarlo al backend y estados del ERP; no se desplegó.
5. **ALCANCE LIMITADO:** Solo admite operaciones gravadas al 18% con precios que incluyen IGV; no cubre exoneraciones, descuentos, gratuitas, detracciones ni otros supuestos.
6. **REVISAR:** Comprobar metadatos de catálogos SUNAT, tipo de precio, datos del emisor, datos de cliente y orden de elementos contra guías y XSD.
7. **REVISAR:** Redondeo del precio unitario neto en cantidades fraccionarias y conciliación de montos con reglas SUNAT.
8. **PRUEBAS LOCALES EJECUTADAS:** Tres suites correctas con Node 24.19.0 (borrador/IGV, SOAP y WS-Security). Se comprobaron también rechazos de tipos desconocidos, series incompatibles y correlativo cero. No se ha ejecutado Deno, CI ni el typecheck completo del proyecto.

## Reproducir pruebas aisladas

Con Node 24 o posterior, sin dependencias, credenciales ni permisos de red:

```sh
node --test src/services/sunat/run-offline-tests.mjs
```

El runner de Deno conserva sus tres suites y ahora todas sus importaciones locales incluyen `.ts`.
Los resultados locales no acreditan conformidad XSD ni aceptación por SUNAT.

## Criterio de salida
- Ejecutar pruebas unitarias y regresión.
- Validar XML de factura y boleta contra XSD y reglas CPE oficiales.
- Implementar firma XMLDSig del lado del servidor y protección de credenciales.
- Probar con SUNAT beta sin cargas masivas y sin documentos reales.
- Validar procesamiento CDR, estados y reintentos.
- Solicitar autorización expresa antes de fusionar o desplegar.

**Estado: NO APTO PARA PRODUCCIÓN.**

