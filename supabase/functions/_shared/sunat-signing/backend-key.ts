/** Solo se llama con el cliente service_role del backend. Nunca registrar la respuesta. */
export async function backendSunatKey(admin: { rpc: (name: string) => PromiseLike<{ data: unknown; error: unknown }> }): Promise<string> {
  const { data, error } = await admin.rpc('ef_sunat_backend_key');
  if (error || typeof data !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(data)) throw new Error('Almacén de claves SUNAT no disponible.');
  return data;
}
