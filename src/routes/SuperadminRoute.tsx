import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { isSuperadmin, platformError } from '../services/platform';

export default function SuperadminRoute() {
  const [access, setAccess] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    isSuperadmin().then(value => { if (active) setAccess(value); }).catch(reason => { if (active) setError(platformError(reason)); });
    return () => { active = false; };
  }, []);
  if (error) return <div className="p-8" role="alert">No se pudo verificar el acceso: {error} <Link to="/dashboard" className="underline">Volver</Link></div>;
  if (access === null) return <p className="p-8" role="status">Verificando acceso al panel general…</p>;
  if (!access) return <div className="p-8"><h1 className="text-xl font-bold">Acceso restringido</h1><p>Este panel es exclusivo del superadministrador de Huerta ERP.</p><Link className="mt-4 inline-block underline" to="/dashboard">Volver a mi negocio</Link></div>;
  return <Outlet />;
}
