import { useEffect, useState } from 'react';
import { getSunatBetaAccess, getSunatBetaResult, runSunatBetaTest, type SunatBetaDocumentType, type SunatBetaResult } from '../../services/sunat/beta-tests';
const labels = { pendiente: 'Pendiente', enviando: 'Enviando', aceptado: 'Aceptada en beta', observado: 'Aceptada con observaciones', rechazado: 'Rechazada en beta', error: 'Error al preparar', incierto: 'Resultado sin confirmar' };
export default function SunatBetaPanel() {
  const [access, setAccess] = useState<Awaited<ReturnType<typeof getSunatBetaAccess>> | null>(null);
  const [result, setResult] = useState<SunatBetaResult | null>(null);
  const [documentType, setDocumentType] = useState<SunatBetaDocumentType>('01');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [key, setKey] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void getSunatBetaAccess().then(async value => {
      const saved = value.allowed ? sessionStorage.getItem(`sunat-beta:${value.userId}:${value.empresaId}`) : null;
      const previous = saved ? await getSunatBetaResult(value.empresaId, saved) : null;
      if (!cancelled) { setAccess(value); setKey(saved); setResult(previous); setDocumentType(previous?.documentType ?? (sessionStorage.getItem(`sunat-beta:${value.userId}:${value.empresaId}:type`) === '03' ? '03' : '01')); }
    }).catch(() => { if (!cancelled) setError('No se pudo cargar el acceso a las pruebas SUNAT.'); });
    return () => { cancelled = true; };
  }, []);
  const run = async () => {
    if (!access?.allowed || busy) return;
    const idempotencyKey = key ?? crypto.randomUUID();
    sessionStorage.setItem(`sunat-beta:${access.userId}:${access.empresaId}`, idempotencyKey);
    sessionStorage.setItem(`sunat-beta:${access.userId}:${access.empresaId}:type`, documentType);
    setKey(idempotencyKey); setBusy(true); setError('');
    try { setResult(await runSunatBetaTest(access.empresaId, idempotencyKey, documentType)); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se confirmó la prueba.'); }
    finally { setBusy(false); }
  };
  const refresh = async () => {
    if (!access?.allowed || !key || busy) return;
    setBusy(true); setError('');
    try { const saved = documentType === '03' ? await runSunatBetaTest(access.empresaId, key, documentType) : await getSunatBetaResult(access.empresaId, key); setResult(saved); if (!saved) setError('Todavía no hay un resultado guardado. Puedes consultar nuevamente o repetir la misma prueba.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo consultar.'); }
    finally { setBusy(false); }
  };
  if (!access?.allowed) return error ? <p role="status" className="text-sm text-slate-600">{error}</p> : null;
  const finished = !!result && ['aceptado', 'observado', 'rechazado', 'error'].includes(result.estado);
  return <section aria-label="Prueba SUNAT beta" className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50 p-5">
    <div><h2 className="text-lg font-black text-blue-950">Prueba SUNAT beta</h2><p className="mt-1 text-sm text-blue-900">Prueba una factura o una boleta ficticia de S/ 11.80. La boleta se envía mediante resumen diario y su aceptación se consulta con el ticket de SUNAT. Usa un certificado de prueba y guarda el XML y la respuesta por separado.</p><p className="mt-1 text-sm font-bold text-blue-900">Solo para administradores. La emisión real permanece desactivada.</p></div>
    <label className="block text-sm font-bold text-blue-950">Comprobante de prueba
      <select value={documentType} disabled={busy || !!key} onChange={event => setDocumentType(event.target.value as SunatBetaDocumentType)} className="ml-3 rounded-lg border border-blue-300 bg-white p-2 disabled:opacity-60">
        <option value="01">Factura</option><option value="03">Boleta</option>
      </select>
    </label>
    <div className="flex flex-wrap gap-2">
      <button disabled={busy || !!result && ['pendiente', 'enviando', 'incierto'].includes(result.estado)} onClick={() => void run()} className="rounded-xl bg-blue-600 px-5 py-3 font-black text-white disabled:opacity-50">{busy ? 'Procesando…' : key ? 'Consultar la misma prueba' : documentType === '03' ? 'Probar boleta beta' : 'Probar factura beta'}</button>
      {key && <button disabled={busy} onClick={() => void refresh()} className="rounded-xl border border-blue-300 bg-white px-4 py-3 font-bold text-blue-900 disabled:opacity-50">Actualizar resultado</button>}
      {finished && <button disabled={busy} onClick={() => { sessionStorage.removeItem(`sunat-beta:${access.userId}:${access.empresaId}`); setKey(null); setResult(null); setError(''); }} className="rounded-xl border border-blue-300 bg-white px-4 py-3 font-bold text-blue-900">Preparar nueva prueba</button>}
    </div>
    <p className="text-xs text-blue-800">Espera un minuto entre pruebas nuevas. Si un envío queda sin confirmar, actualiza su resultado antes de repetir.</p>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 font-semibold text-red-800">{error}</p>}
    {result && <div role="status" className="space-y-1 rounded-xl bg-white p-4 text-slate-900"><p className="text-sm">{documentType === '03' ? 'Boleta ficticia B001-1 · resumen diario' : 'Factura ficticia F001-1'}</p><p className="font-black">{labels[result.estado] ?? 'Resultado de prueba'}</p>{result.codigo && <p>Código SUNAT: {result.codigo}</p>}{result.mensaje && <p>{result.mensaje}</p>}{result.observaciones.map((note, i) => <p key={i} className="text-sm">{note}</p>)}<p className="text-xs text-slate-500">Prueba: {result.id}</p></div>}
  </section>;
}
