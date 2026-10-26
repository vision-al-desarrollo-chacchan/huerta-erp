import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getActiveOperator, type ActiveOperator } from '../services/operator-session';
import { canOperatorRolesAccess, operatorRolesHome } from '../services/operator-permissions';
import { getCompanyAccess, platformError, type CompanyAccess } from '../services/platform';

export default function OperatorRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [operator, setOperator] = useState<ActiveOperator | null>(getActiveOperator());
  const [access, setAccess] = useState<CompanyAccess | null>(null);
  const [accessError, setAccessError] = useState('');

  useEffect(() => {
    let mounted = true;
    let checking = false;
    const check = () => {
      if (checking) return;
      checking = true;
      void getCompanyAccess().then(value => {
        if (mounted) { setAccess(value); setAccessError(''); }
      }).catch(reason => { if (mounted) setAccessError(platformError(reason)); }).finally(() => { checking = false; });
    };
    check();
    const timer = window.setInterval(check, 15000);
    window.addEventListener('focus', check);
    return () => { mounted = false; window.clearInterval(timer); window.removeEventListener('focus', check); };
  }, []);

  useEffect(() => {
    const refresh = () => setOperator(getActiveOperator());
    window.addEventListener('huerta-operator-updated', refresh);
    return () => window.removeEventListener('huerta-operator-updated', refresh);
  }, []);

  if (accessError) return <div role="alert" className="p-6 text-red-700">No se pudo verificar el acceso. {accessError} <button className="underline" onClick={() => window.location.reload()}>Reintentar</button></div>;
  if (access === null) return <div role="status" className="p-6">Verificando empresa…</div>;
  if (access !== 'active') return <Navigate to="/acceso-pendiente" replace />;
  if (!operator) return children;
  const roles = operator.roles?.length ? operator.roles : [operator.role];
  if (canOperatorRolesAccess(roles, location.pathname)) return children;

  return <Navigate to={operatorRolesHome(roles)} replace />;
}
