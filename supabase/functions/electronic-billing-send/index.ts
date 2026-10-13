import { enqueueHandler } from '../_shared/sunat-signing/billing-runtime.ts';
Deno.serve(enqueueHandler);
