/** Node >=24. Ejecutar: node --test src/services/sunat/run-offline-tests.mjs */
import { test } from 'node:test';
import { runSunatDraftChecks } from './draft-checks.ts';
import { runSunatSoapPreflightChecks } from './soap-preflight-checks.ts';
import { runSunatWsseChecks } from '../../../supabase/functions/_shared/sunat-wsse-checks.ts';

test('SUNAT: borrador UBL e IGV', runSunatDraftChecks);
test('SUNAT: SOAP y bloqueo de producción', runSunatSoapPreflightChecks);
test('SUNAT: WS-Security con credenciales ficticias', runSunatWsseChecks);
