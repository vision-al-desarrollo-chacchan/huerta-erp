import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getUser } from "../services/auth";

export default function ProtectedRoute() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    getUser()
      .then((user) => {
        if (isMounted) setIsAuthenticated(Boolean(user));
      })
      .catch(() => {
        if (isMounted) setIsAuthenticated(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isAuthenticated === null) {
    return <div className="p-6 text-slate-600">Verificando sesión...</div>;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/" replace />;
}
