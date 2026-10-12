import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createBetaHandler } from '../_shared/sunat-signing/beta-handler.mjs';
import { buildBetaFixture, sendBetaFixture } from '../_shared/sunat-signing/beta-client.mjs';

// Función nueva y deshabilitada por defecto. No consulta ni modifica ef_documentos.
const url = Deno.env.get('SUPABASE_URL') ?? '';
const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const enabled = Deno.env.get('SUNAT_BETA_ENABLED') === 'true' && !!url && !!anon && !!serviceKey;
const admin = enabled ? createClient(url, serviceKey, { auth: { persistSession: false } }) : null;
const repository = {
  async reserve(identity: { client: SupabaseClient }, empresaId: string, idempotencyKey: string) {
    const { data, error } = await identity.client.rpc('ef_sunat_beta_reservar', { p_empresa_id: empresaId, p_idempotency_key: idempotencyKey });
    if (error || !data) throw new Error('Reserva beta fallida.');
    return data;
  },
  async claim(job: { id: string; empresa_id: string }) {
    const { data, error } = await admin!.from('ef_sunat_beta_pruebas').update({ estado: 'enviando', started_at: new Date().toISOString() }).eq('id', job.id).eq('empresa_id', job.empresa_id).eq('estado', 'pendiente').select('*').maybeSingle();
    if (error) throw new Error('Inicio beta fallido.');
    return data;
  },
  async store(path: string, data: Uint8Array, contentType: string) {
    const { error } = await admin!.storage.from('sunat-beta-pruebas').upload(path, data, { contentType, upsert: false });
    if (error) throw new Error('Almacenamiento beta fallido.');
  },
  async finish(job: { id: string; empresa_id: string }, patch: Record<string, unknown>) {
    const { data, error } = await admin!.from('ef_sunat_beta_pruebas').update({ ...patch, finished_at: new Date().toISOString() }).eq('id', job.id).eq('empresa_id', job.empresa_id).eq('estado', 'enviando').select('*').single();
    if (error || !data) throw new Error('Resultado beta no guardado.');
    return data;
  },
};
Deno.serve(createBetaHandler({
  enabled, repository, buildFixture: buildBetaFixture, sendFixture: sendBetaFixture,
  async authenticate(authorization: string) {
    if (!authorization.startsWith('Bearer ')) return null;
    const client = createClient(url, anon, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const { data: { user }, error } = await client.auth.getUser();
    return error || !user ? null : { client, userId: user.id };
  },
}));
