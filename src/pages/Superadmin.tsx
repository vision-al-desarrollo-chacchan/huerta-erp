import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, ShieldCheck, Plus, Search, LogOut, ArrowUpRight } from 'lucide-react';
import { logout } from '../services/auth';
import { createPlatformCompany, deletePlatformCompany, listPlatformCompanies, platformError, savePlatformPlan, setPlatformCompanyActive, type PlatformCompany } from '../services/platform';

const field = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500';
const primary = 'rounded-xl bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-50';

function CompanyCard({ company, onSaved }: { company: PlatformCompany; onSaved: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [plan, setPlan] = useState(company.plan);
  const [date, setDate] = useState(company.vence_el ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [action, setAction] = useState<'suspend' | 'reactivate' | 'delete' | null>(null);
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { await savePlatformPlan(company.id, plan, date); await onSaved(); setEditing(false); }
    catch (reason) { setError(platformError(reason)); }
    finally { setBusy(false); }
  }
  return <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex items-start justify-between gap-3"><div className="rounded-xl bg-blue-50 p-3 text-blue-700"><Building2 size={24} /></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${company.activa ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{company.activa ? 'Activa' : 'Suspendida'}</span></div>
    <h2 className="mt-5 text-xl font-bold">{company.nombre}</h2>
    <p className="mt-1 text-sm text-slate-500">{company.usuarios} usuarios activos</p>
    <div className="my-5 border-y border-slate-100 py-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Dueño</p>{company.propietarios.length ? company.propietarios.map(owner => <p key={owner.email} className="mt-1 break-all text-sm">{owner.email}</p>) : <p className="mt-1 text-sm text-amber-700">Sin propietario asignado</p>}</div>
    {editing ? <form onSubmit={save} className="space-y-3">
      <label className="block text-sm font-medium">Plan<input className={field} value={plan} maxLength={80} required onChange={e => setPlan(e.target.value)} /></label>
      <label className="block text-sm font-medium">Fecha de renovación<input type="date" className={field} value={date} onChange={e => setDate(e.target.value)} /></label>
      <p className="text-xs text-slate-500">La fecha es un recordatorio; no genera cobros ni suspende el servicio automáticamente.</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-3"><button disabled={busy} className={primary}>{busy ? 'Guardando…' : 'Guardar'}</button><button type="button" disabled={busy} onClick={() => setEditing(false)}>Cancelar</button></div>
    </form> : <><div className="flex justify-between gap-4 text-sm"><span className="font-semibold">{company.plan}</span><span className="text-slate-500">{company.vence_el ? `Renueva: ${company.vence_el.split('-').reverse().join('/')}` : 'Sin vencimiento'}</span></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><button onClick={() => { setPlan(company.plan); setDate(company.vence_el ?? ''); setEditing(true); }} className="text-sm font-semibold text-blue-700">Editar plan</button>{company.activa && company.puede_entrar && <Link to="/dashboard" className="flex items-center gap-1 text-sm font-semibold">Entrar a mi negocio <ArrowUpRight size={16} /></Link>}</div></>}
    <div className="mt-5 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-4">
      <button type="button" disabled={busy} onClick={() => setAction(company.activa ? 'suspend' : 'reactivate')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">{company.activa ? 'Suspender' : 'Reactivar'}</button>
      <button type="button" disabled={busy} onClick={() => setAction('delete')} className="rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Eliminar empresa</button>
    </div>
    {action && <CompanyActionDialog company={company} action={action} onClose={() => setAction(null)} onSaved={onSaved} />}
  </article>;
}

function CompanyActionDialog({ company, action, onClose, onSaved }: { company: PlatformCompany; action: 'suspend' | 'reactivate' | 'delete'; onClose: () => void; onSaved: () => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const deleting = action === 'delete';
  const label = deleting ? 'Eliminar definitivamente' : action === 'suspend' ? 'Suspender empresa' : 'Reactivar empresa';
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (busy || (!done && deleting && confirmation !== company.nombre)) return;
    setBusy(true); setError('');
    try {
      if (!done) {
        if (deleting) await deletePlatformCompany(company.id, confirmation);
        else await setPlatformCompanyActive(company.id, action === 'reactivate');
        setDone(true);
      }
      await onSaved(); onClose();
    } catch (reason) { setError(platformError(reason)); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} aria-labelledby="company-action-title" aria-describedby="company-action-description" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} className="w-[calc(100%_-_2rem)] max-w-lg rounded-2xl bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-slate-950/50">
    <form onSubmit={confirm}>
      <h2 id="company-action-title" className="text-xl font-bold">{done ? 'Operación completada' : `${label}: ${company.nombre}`}</h2>
      <p id="company-action-description" className="mt-3 text-sm leading-6 text-slate-600">{done ? 'El cambio se guardó. Actualiza la lista para ver el resultado.' : deleting ? '¿Deseas eliminar esta empresa? Se borrarán permanentemente sus ventas, pedidos, productos, inventario, cajas, trabajadores, reportes, configuración y accesos al negocio. Esta acción no se puede deshacer.' : action === 'suspend' ? 'Se bloqueará el acceso de todos los usuarios de este negocio. Sus datos se conservarán y podrás reactivar el servicio cuando quieras.' : 'Los usuarios de esta empresa podrán volver a acceder al servicio con sus datos y permisos conservados.'}</p>
      {deleting && !done && <><p className="mt-3 text-xs text-slate-500">Las cuentas personales de inicio de sesión se conservan, pero pierden su vínculo con esta empresa.</p><label className="mt-5 block text-sm font-semibold">Para confirmar, escribe exactamente: <span className="break-all">{company.nombre}</span><input className={field} value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" disabled={busy} /></label></>}
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" autoFocus disabled={busy} onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 font-semibold disabled:opacity-50">{done ? 'Cerrar' : 'Cancelar'}</button><button disabled={busy || (!done && deleting && confirmation !== company.nombre)} className={`${primary} ${deleting && !done ? '!bg-red-700 hover:!bg-red-800' : ''}`}>{busy ? 'Procesando…' : done ? 'Actualizar lista' : label}</button></div>
    </form>
  </dialog>;
}

export default function Superadmin() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<PlatformCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => { setCompanies(await listPlatformCompanies()); }, []);
  useEffect(() => {
    let active = true;
    listPlatformCompanies().then(rows => { if (active) setCompanies(rows); }).catch(reason => { if (active) setError(platformError(reason)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { await createPlatformCompany(name,email); setCreating(false); setName(''); setEmail(''); setNotice('Empresa creada. El dueño ya puede iniciar sesión y configurar su negocio.'); await refresh(); }
    catch (reason) { setError(platformError(reason)); }
    finally { setBusy(false); }
  }
  async function signOut() {
    try { const { error: signOutError } = await logout(); if (signOutError) throw signOutError; navigate('/', { replace: true }); }
    catch (reason) { setError(platformError(reason)); }
  }
  const filtered = companies.filter(company => `${company.nombre} ${company.propietarios.map(owner => owner.email).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8"><div className="flex items-center gap-3"><div className="rounded-xl bg-slate-950 p-3 text-white"><ShieldCheck size={24} /></div><div><p className="text-lg font-extrabold tracking-tight">HUERTA ERP</p><p className="text-xs text-slate-500">Administración de la plataforma</p></div></div><button onClick={signOut} className="flex items-center gap-2 text-sm font-semibold"><LogOut size={18} /> Salir</button></div></header>
    <main className="mx-auto max-w-7xl px-5 py-9 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Superadministrador</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Tus empresas</h1><p className="mt-3 max-w-xl text-slate-500">Gestiona tus clientes desde un solo lugar. Cada negocio mantiene sus propios usuarios y su información.</p></div><button className={`${primary} flex items-center gap-2`} onClick={() => setCreating(value => !value)}><Plus size={18} /> {creating ? 'Cerrar formulario' : 'Nueva empresa'}</button></div>
      {error && <div role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-red-800">{error} <button className="ml-3 underline" onClick={() => { setError(''); refresh().catch(reason => setError(platformError(reason))); }}>Reintentar carga</button></div>}
      {notice && <p role="status" className="mt-6 rounded-xl bg-emerald-50 p-4 text-emerald-800">{notice}</p>}
      {creating && <form onSubmit={create} className="mt-7 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm"><h2 className="text-lg font-bold">Registrar una pollería</h2><p className="mt-2 text-sm text-slate-500">El dueño debe crear primero una cuenta en la pantalla de ingreso de Huerta ERP. Usa aquí ese mismo correo. La nueva empresa comienza sin ventas ni productos.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Nombre del negocio<input autoFocus className={field} required minLength={2} maxLength={120} value={name} onChange={e => setName(e.target.value)} placeholder="Nombre de la pollería" /></label><label className="text-sm font-medium">Correo del dueño<input className={field} type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="dueno@correo.com" /></label></div><button disabled={busy} className={`${primary} mt-5`}>{busy ? 'Creando empresa…' : 'Crear empresa y asignar dueño'}</button></form>}
      <div className="my-8 grid gap-4 sm:grid-cols-3">{[['Empresas',companies.length],['Activas',companies.filter(company => company.activa).length],['Usuarios activos',companies.reduce((total,company) => total+company.usuarios,0)]].map(([label,value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{loading ? '—' : value}</p></div>)}</div>
      <label className="mb-6 flex max-w-md items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"><Search size={18} className="text-slate-400" /><input aria-label="Buscar empresa o dueño" value={query} onChange={e => setQuery(e.target.value)} className="w-full bg-transparent outline-none" placeholder="Buscar empresa o correo del dueño" /></label>
      {loading ? <p role="status">Cargando empresas…</p> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.map(company => <CompanyCard key={company.id} company={company} onSaved={refresh} />)}</div>}
      {!loading && !error && !filtered.length && <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">{query ? 'No hay empresas que coincidan con la búsqueda.' : 'Todavía no hay empresas registradas.'}</p>}
    </main>
  </div>;
}
