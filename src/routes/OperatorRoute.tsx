import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getActiveOperator, type ActiveOperator } from '../services/operator-session';
import { canOperatorAccess, operatorHome } from '../services/operator-permissions';

export default function OperatorRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [operator, setOperator] = useState<ActiveOperator | null>(getActiveOperator());

  useEffect(() => {
    const refresh = () => setOperator(getActiveOperator());
    window.addEventListener('huerta-operator-updated', refresh);
    return () => window.removeEventListener('huerta-operator-updated', refresh);
  }, []);

  if (!operator) return children;
  if (canOperatorAccess(operator.role, location.pathname)) return children;

  return <Navigate to={operatorHome(operator.role)} replace />;
}
