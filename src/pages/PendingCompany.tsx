import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, prepareLoggedInAccess } from '../services/auth';
import { platformError } from '../services/platform';

export default function PendingCompany() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function check() {
    setBusy(true); setError('');
    try { const home = await prepareLoggedInAccess(); if (home === '/acceso-pendiente') setError('Tu empresa todavía no fue asignada.'); else navigate(home, { replace: true }); }
    catch (reason) { setError(platformError(reason)); }
    finally { setBusy(false); }
  }
  async function exit() {
    const { error: reason } = await logout();
    if (reason) setError(platformError(reason)); else navigate('/', { replace: true });
  }
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-slate-900"><section className="max-w-lg rounded-2xl border bg-white p-8 shadow-sm"><p className="text-sm font-bold text-blue-700">HUERTA ERP</p><h1 className="mt-3 text-2xl font-bold">Tu cuenta está lista</h1><p className="mt-4 text-slate-600">Falta que Huerta ERP te asigne tu empresa. Comunica al administrador el correo con el que te registraste.</p>{error && <p role="status" className="mt-4 text-amber-800">{error}</p>}<button disabled={busy} onClick={check} className="mt-6 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? 'Verificando…' : 'Comprobar acceso'}</button><button onClick={exit} className="ml-4 underline">Salir</button></section></main>;
}
