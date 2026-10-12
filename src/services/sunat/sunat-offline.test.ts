/**
 * Pruebas SUNAT aisladas, sin credenciales ni llamadas de red.
 * Ejecutar desde la raíz del repositorio:
 *   deno test --no-check src/services/sunat/sunat-offline.test.ts
 *
 * --no-check omite el typecheck de dependencias de Vite; las comprobaciones
 * de tipos deben realizarse por separado en el pipeline del proyecto.
 */
import { runSunatDraftChecks } from './draft-checks.ts';
import { runSunatSoapPreflightChecks } from './soap-preflight-checks.ts';
import { runSunatWsseChecks } from '../../../supabase/functions/_shared/sunat-wsse-checks.ts';

Deno.test('SUNAT: borrador UBL e IGV', () => {
  runSunatDraftChecks();
});

Deno.test('SUNAT: prevalidación SOAP y bloqueo de producción', () => {
  runSunatSoapPreflightChecks();
});

Deno.test('SUNAT: cabecera WS-Security con credenciales ficticias', () => {
  runSunatWsseChecks();
});

