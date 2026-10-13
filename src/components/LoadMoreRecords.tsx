import { useState } from 'react';
export default function LoadMoreRecords<T extends { id: string }>({ rows, load, onLoaded }: {
 rows: T[]; load: (page: number) => Promise<T[]>; onLoaded: (rows: T[]) => void;
}) {
 const [loading, setLoading] = useState(false), [error, setError] = useState('');
 const [endAt, setEndAt] = useState<string | null>(null);
 const marker = rows.map(row => row.id).join(',');
 const more = async () => {
  if (loading) return;
  setLoading(true); setError('');
  try {
   const next = await load(Math.floor(rows.length / 100));
   const unique = new Map([...rows, ...next].map(row => [row.id, row]));
   const merged = [...unique.values()];
   if (next.length < 100 || merged.length === rows.length) setEndAt(merged.map(row => row.id).join(','));
   onLoaded(merged);
  } catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron cargar más registros.'); }
  finally { setLoading(false); }
 };
 return <div className="space-y-2 p-4 text-center">
  {rows.length >= 100 && endAt !== marker && <button disabled={loading} onClick={() => void more()} className="rounded-xl border px-5 py-2 font-bold text-blue-600 disabled:opacity-50">{loading ? 'Cargando…' : 'Cargar más registros'}</button>}
  {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
 </div>;
}
