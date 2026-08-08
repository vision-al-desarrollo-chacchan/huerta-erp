import { BrowserRouter, Routes, Route } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Ventas from "../pages/Ventas";
import Compras from "../pages/Compras";
import Inventario from "../pages/Inventario";
import Clientes from "../pages/Clientes";
import Proveedores from "../pages/Proveedores";
import Caja from "../pages/Caja";
import Reportes from "../pages/Reportes";
import Usuarios from "../pages/Usuarios";
import Configuracion from "../pages/Configuracion";

import Contabilidad from "../pages/Contabilidad";
import RecursosHumanos from "../pages/RecursosHumanos";
import Produccion from "../pages/Produccion";
import Documentos from "../pages/Documentos";


export default function AppRoutes() {
  return (
    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Login />} />

        <Route element={<DashboardLayout />}>

          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/ventas" element={<Ventas />} />

          <Route path="/compras" element={<Compras />} />

          <Route path="/inventario" element={<Inventario />} />

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

        </Route>

      </Routes>

    </BrowserRouter>
  );
}