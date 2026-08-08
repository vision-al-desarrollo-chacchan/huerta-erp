import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Users, 
  Truck, 
  Wallet, 
  Calculator, 
  UserCheck, 
  Factory, 
  Wrench, 
  Rocket, 
  Calendar, 
  Folder, 
  FileText, 
  Bot, 
  Shield, 
  Settings, 
  HelpCircle,
  ChefHat,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    ventas: true,
    productos: false,
  });

  const toggleMenu = (menu: string) => {
    setOpenMenus((prev) => ({ ...prev, [menu]: !prev[menu] }));
  };

  const baseLinkClass = "flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors w-full";
  const activeClass = "bg-brand-blue/10 text-brand-cyan border border-brand-blue/20";
  const inactiveClass = "text-slate-400 hover:bg-slate-800 hover:text-white";
  const subLinkClass = "block py-1.5 text-sm text-slate-400 hover:text-white transition-colors w-full text-left pl-10 pr-3";
  const activeSubLinkClass = "block py-1.5 text-sm text-brand-cyan transition-colors w-full text-left pl-10 pr-3 font-medium";

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) => 
    `${baseLinkClass} ${isActive ? activeClass : inactiveClass}`;
    
  const getSubNavLinkClass = ({ isActive }: { isActive: boolean }) => 
    isActive ? activeSubLinkClass : subLinkClass;

  return (
    <aside className="w-72 bg-brand-dark text-slate-300 flex flex-col flex-shrink-0 border-r border-slate-800 shadow-xl z-20 h-screen overflow-hidden">
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 flex-shrink-0 bg-slate-900/50">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">H</div>
        <h1 className="text-white font-bold text-lg tracking-wide">HUERTA ERP</h1>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 content-scroll">
        
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2 mt-2">Principal</div>
        <NavLink to="/dashboard" className={getNavLinkClass}>
          <LayoutDashboard className="w-5 h-5" /> Dashboard
        </NavLink>
        
        <div className="mt-1">
          <button onClick={() => toggleMenu('ventas')} className={`${baseLinkClass} ${inactiveClass} justify-between`}>
            <div className="flex items-center gap-3"><ShoppingBag className="w-5 h-5" /> Ventas</div>
            {openMenus.ventas ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {openMenus.ventas && (
            <div className="py-1 space-y-1">
              <NavLink to="/ventas/pos" className={getSubNavLinkClass}>POS</NavLink>
              <NavLink to="/ventas/cotizaciones" className={getSubNavLinkClass}>Cotizaciones</NavLink>
              <NavLink to="/ventas/pedidos" className={getSubNavLinkClass}>Pedidos</NavLink>
              <NavLink to="/ventas/facturacion" className={getSubNavLinkClass}>Facturación Electrónica</NavLink>
            </div>
          )}
        </div>

        <div className="mt-1">
          <button onClick={() => toggleMenu('productos')} className={`${baseLinkClass} ${inactiveClass} justify-between`}>
            <div className="flex items-center gap-3"><Package className="w-5 h-5" /> Productos</div>
            {openMenus.productos ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {openMenus.productos && (
            <div className="py-1 space-y-1">
              <NavLink to="/inventario" className={getSubNavLinkClass}>Inventario</NavLink>
              <NavLink to="/productos/almacenes" className={getSubNavLinkClass}>Almacenes</NavLink>
              <NavLink to="/productos/categorias" className={getSubNavLinkClass}>Categorías / Marcas</NavLink>
              <NavLink to="/productos/kardex" className={getSubNavLinkClass}>Kardex</NavLink>
            </div>
          )}
        </div>

        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2 mt-6">Gestión y Operaciones</div>
        <NavLink to="/clientes" className={getNavLinkClass}><Users className="w-5 h-5" /> Clientes (CRM)</NavLink>
        <NavLink to="/cocina" className={getNavLinkClass}><ChefHat className="w-5 h-5" /> Cocina & Comandas</NavLink>
        <NavLink to="/compras" className={getNavLinkClass}><Truck className="w-5 h-5" /> Compras & Prov.</NavLink>
        <NavLink to="/caja" className={getNavLinkClass}><Wallet className="w-5 h-5" /> Caja & Bancos</NavLink>
        <NavLink to="/contabilidad" className={getNavLinkClass}><Calculator className="w-5 h-5" /> Contabilidad</NavLink>
        <NavLink to="/recursos-humanos" className={getNavLinkClass}><UserCheck className="w-5 h-5" /> Recursos Humanos</NavLink>
        <NavLink to="/produccion" className={getNavLinkClass}><Factory className="w-5 h-5" /> Producción</NavLink>
        <NavLink to="/servicios" className={getNavLinkClass}><Wrench className="w-5 h-5" /> Servicios</NavLink>
        <NavLink to="/proyectos" className={getNavLinkClass}><Rocket className="w-5 h-5" /> Proyectos</NavLink>

        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2 mt-6">Herramientas</div>
        <NavLink to="/calendario" className={getNavLinkClass}><Calendar className="w-5 h-5" /> Calendario & Tareas</NavLink>
        <NavLink to="/documentos" className={getNavLinkClass}><Folder className="w-5 h-5" /> Documentos</NavLink>
        <NavLink to="/reportes" className={getNavLinkClass}><FileText className="w-5 h-5" /> Reportes</NavLink>
        <NavLink to="/centro-ia" className={({ isActive }) => `${getNavLinkClass({ isActive })} justify-between`}>
          <div className="flex items-center gap-3"><Bot className="w-5 h-5" /> Centro IA</div>
          <span className="bg-brand-blue text-white text-[10px] font-bold px-1.5 py-0.5 rounded">BETA</span>
        </NavLink>

        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2 mt-6">Sistema</div>
        <NavLink to="/usuarios" className={getNavLinkClass}><Shield className="w-5 h-5" /> Usuarios y Roles</NavLink>
        <NavLink to="/configuracion" className={getNavLinkClass}><Settings className="w-5 h-5" /> Configuración</NavLink>
        <NavLink to="/ayuda" className={getNavLinkClass}><HelpCircle className="w-5 h-5" /> Ayuda</NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;
