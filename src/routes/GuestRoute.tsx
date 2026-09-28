import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getUser, prepareLoggedInAccess } from "../services/auth";

export default function GuestRoute() {
  const [destination, setDestination] = useState("/dashboard");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    getUser()
      .then(async (user) => {
        const home = user ? await prepareLoggedInAccess() : "/";
        if (isMounted) { setDestination(home); setIsAuthenticated(Boolean(user)); }
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

  return isAuthenticated ? <Navigate to={destination} replace /> : <Outlet />;
}
