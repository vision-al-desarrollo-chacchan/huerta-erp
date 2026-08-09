import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import GuestRoute from "./GuestRoute";
import ProtectedRoute from "./ProtectedRoute";

const Login = lazy(() => import("../pages/Login"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Ventas = lazy(() => import("../pages/Ventas"));
const Pedidos = lazy(() => import("../pages/Pedidos"));
const Facturacion = lazy(() => import("../pages/Facturacion"));
const Cotizaciones = lazy(() => import("../pages/Cotizaciones"));
const Cocina = lazy(() => import("../pages/Cocina"));
const Compras = lazy(() => import("../pages/Compras"));
const Inventario = lazy(() => import("../pages/Inventario"));
const Clientes = lazy(() => import("../pages/Clientes"));
const Proveedores = lazy(() => import("../pages/Proveedores"));
const Caja = lazy(() => import("../pages/Caja"));
const Reportes = lazy(() => import("../pages/Reportes"));
const Usuarios = lazy(() => import("../pages/Usuarios"));
const Configuracion = lazy(() => import("../pages/Configuracion"));
const Contabilidad = lazy(() => import("../pages/Contabilidad"));
const RecursosHumanos = lazy(() => import("../pages/RecursosHumanos"));
const Produccion = lazy(() => import("../pages/Produccion"));
const Documentos = lazy(() => import("../pages/Documentos"));
const Calendario = lazy(() => import("../pages/Calendario"));
const NotFound = lazy(() => import("../pages/NotFound"));

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="p-6 text-slate-600">Cargando Huerta ERP...</div>}>
        <Routes>

        <Route element={<GuestRoute />}>
          <Route path="/" element={<Login />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>

          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/ventas/pos" element={<Ventas />} />
          <Route path="/ventas/pedidos" element={<Pedidos />} />
          <Route path="/ventas/facturacion" element={<Facturacion />} />
          <Route path="/ventas/cotizaciones" element={<Cotizaciones />} />

          <Route path="/cocina" element={<Cocina />} />

          <Route path="/compras" element={<Compras />} />

          <Route path="/inventario" element={<Inventario />} />

          <Route path="/productos/*" element={<Inventario />} />

          <Route path="/clientes" element={<Clientes />} />

          <Route path="/proveedores" element={<Proveedores />} />

          <Route path="/caja" element={<Caja />} />

          <Route path="/reportes" element={<Reportes />} />

          <Route path="/usuarios" element={<Usuarios />} />

          <Route path="/configuracion" element={<Configuracion />} />

          <Route path="/contabilidad" element={<Contabilidad />} />

          <Route path="/recursos-humanos" element={<RecursosHumanos />} />

          <Route path="/produccion" element={<Produccion />} />

          <Route path="/documentos" element={<Documentos />} />

          <Route path="/calendario" element={<Calendario />} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
