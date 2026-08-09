import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { getActiveOperator } from '../services/operator-session';
import { canOperatorAccess, operatorHome } from '../services/operator-permissions';

export default function OperatorRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const operator = getActiveOperator();

  if (!operator) return children;
  if (canOperatorAccess(operator.role, location.pathname)) return children;

  return <Navigate to={operatorHome(operator.role)} replace />;
}
