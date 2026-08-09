import { useEffect, useMemo, useState } from 'react';
import { archiveRecord, createClient, getClients, type Client } from '../services/erp-store';

const input = 'rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-600';

export default function Clientes() {
  const [rows, setRows] = useState<Client[]>([]), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [error, setError] = useState(''), [search, setSearch] = useState('');
  const [form, setForm] = useState({ tipo_documento: 'DNI', numero_documento: '', nombre: '', telefono: '', email: '', direccion: '' });
  const load = async () => { try { setRows(await getClients()); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron cargar los clientes.'); } finally { setLoading(false); } };
  useEffect(() => { void getClients().then(data => { setRows(data); setLoading(false); }).catch(e => { setError(e instanceof Error ? e.message : 'No se pudieron cargar los clientes.'); setLoading(false); }); }, []);
  const filtered = useMemo(() => rows.filter(r => r.activo && `${r.nombre} ${r.numero_documento ?? ''} ${r.telefono ?? ''}`.toLowerCase().includes(search.toLowerCase())), [rows, search]);
  const save = async () => {
    if (!form.nombre.trim()) return setError('Ingresa el nombre del cliente.');
    setSaving(true); setError('');
    try { await createClient({ ...form, numero_documento: form.numero_documento || null, telefono: form.telefono || null, email: form.email || null, direccion: form.direccion || null }); setForm({ tipo_documento: 'DNI', numero_documento: '', nombre: '', telefono: '', email: '', direccion: '' }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar.'); } finally { setSaving(false); }
  };
  return <div className="space-y-6 p-6">
    <div><h1 className="text-3xl font-black text-slate-950">Clientes (CRM)</h1><p className="font-medium text-slate-600">Historial único para pedidos, cotizaciones y comprobantes.</p></div>
    {error && <div className="rounded-xl bg-red-50 p-4 font-bold text-red-700">{error}</div>}
    <section className="grid gap-4 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-4">
      <select className={input} value={form.tipo_documento} onChange={e=>setForm({...form,tipo_documento:e.target.value})}><option>DNI</option><option>RUC</option><option>CE</option><option>Sin documento</option></select>
      <input className={input} placeholder="N.º documento" value={form.numero_documento} onChange={e=>setForm({...form,numero_documento:e.target.value})}/>
      <input className={input} placeholder="Nombre o razón social *" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}/>
      <input className={input} placeholder="Teléfono" value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})}/>
      <input className={input} placeholder="Correo" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
      <input className={`${input} md:col-span-2`} placeholder="Dirección" value={form.direccion} onChange={e=>setForm({...form,direccion:e.target.value})}/>
      <button disabled={saving} onClick={()=>void save()} className="rounded-xl bg-blue-600 px-5 py-3 font-black text-white disabled:opacity-50">{saving?'Guardando...':'Guardar cliente'}</button>
    </section>
    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="border-b p-4"><input className={`${input} w-full md:w-96`} placeholder="Buscar cliente..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50 text-xs font-black uppercase text-slate-600"><tr><th className="p-4">Cliente</th><th>Documento</th><th>Contacto</th><th>Acción</th></tr></thead><tbody className="divide-y">
      {loading?<tr><td colSpan={4} className="p-10 text-center">Cargando...</td></tr>:filtered.length===0?<tr><td colSpan={4} className="p-10 text-center text-slate-500">Aún no hay clientes.</td></tr>:filtered.map(r=><tr key={r.id}><td className="p-4 font-bold text-slate-900">{r.nombre}</td><td>{r.tipo_documento} {r.numero_documento||'—'}</td><td>{r.telefono||r.email||'—'}</td><td><button className="font-bold text-red-600" onClick={async()=>{if(confirm('¿Archivar este cliente?')){await archiveRecord('erp_clientes',r.id);await load();}}}>Archivar</button></td></tr>)}</tbody></table></div>
    </section>
  </div>;
}
