import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, Package, Users, Truck, Wallet, Calculator,
  UserCheck, Factory, Wrench, Rocket, Calendar, Folder, FileText, Bot,
  Shield, Settings, HelpCircle, ChefHat, ChevronDown, ChevronRight, X,
} from 'lucide-react';
import { getActiveOperator, type ActiveOperator } from '../services/operator-session';
import { canOperatorAccess } from '../services/operator-permissions';

type SidebarProps = { open?: boolean; onClose?: () => void };

const Sidebar: React.FC<SidebarProps> = ({ open = false, onClose }) => {
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({ ventas: true, productos: false });
  const [operator, setOperator] = useState<ActiveOperator | null>(getActiveOperator());

  useEffect(() => {
    const refresh = () => setOperator(getActiveOperator());
    window.addEventListener('huerta-operator-updated', refresh);
    return () => window.removeEventListener('huerta-operator-updated', refresh);
  }, []);

  const allowed = (path: string) => !operator || canOperatorAccess(operator.role, path);
  const toggleMenu = (menu: string) => setOpenMenus((previous) => ({ ...previous, [menu]: !previous[menu] }));
  const base = 'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors';
  const active = 'border border-brand-blue/20 bg-brand-blue/10 text-brand-cyan';
  const inactive = 'text-slate-400 hover:bg-slate-800 hover:text-white';
  const link = ({ isActive }: { isActive: boolean }) => `${base} ${isActive ? active : inactive}`;
  const sub = ({ isActive }: { isActive: boolean }) => `block w-full py-1.5 pl-10 pr-3 text-left text-sm transition-colors ${isActive ? 'font-medium text-brand-cyan' : 'text-slate-400 hover:text-white'}`;

  return <aside onClick={(event) => { if ((event.target as HTMLElement).closest('a')) onClose?.(); }} className={`fixed inset-y-0 left-0 z-40 flex h-screen w-[min(18rem,88vw)] flex-shrink-0 flex-col overflow-hidden border-r border-slate-800 bg-brand-dark text-slate-300 shadow-2xl transition-transform duration-300 lg:static lg:z-20 lg:w-72 lg:translate-x-0 lg:shadow-xl ${open ? 'translate-x-0' : '-translate-x-full'}`}>
    <div className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-slate-800 bg-slate-900/50 px-6">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-blue to-brand-cyan text-lg font-bold text-white shadow-lg shadow-blue-500/20">H</div>
      <div className="min-w-0 flex-1"><h1 className="text-lg font-bold tracking-wide text-white">HUERTA ERP</h1>{operator && <p className="text-[10px] font-bold uppercase text-brand-cyan">{operator.role}</p>}</div><button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden" aria-label="Cerrar menú"><X className="h-5 w-5" /></button>
    </div>

    <div className="content-scroll flex-1 space-y-1 overflow-y-auto px-3 py-4">
      <div className="mb-2 mt-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Principal</div>
      {allowed('/dashboard') && <NavLink to="/dashboard" className={link}><LayoutDashboard className="h-5 w-5" /> Dashboard</NavLink>}

      {(allowed('/ventas/pos') || allowed('/ventas/pedidos') || allowed('/ventas/facturacion') || allowed('/ventas/cotizaciones')) && <div className="mt-1">
        <button onClick={() => toggleMenu('ventas')} className={`${base} ${inactive} justify-between`}>
          <div className="flex items-center gap-3"><ShoppingBag className="h-5 w-5" /> Ventas</div>
          {openMenus.ventas ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {openMenus.ventas && <div className="space-y-1 py-1">
          {allowed('/ventas/pos') && <NavLink to="/ventas/pos" className={sub}>POS</NavLink>}
          {allowed('/ventas/cotizaciones') && <NavLink to="/ventas/cotizaciones" className={sub}>Cotizaciones</NavLink>}
          {allowed('/ventas/pedidos') && <NavLink to="/ventas/pedidos" className={sub}>Pedidos</NavLink>}
          {allowed('/ventas/facturacion') && <NavLink to="/ventas/facturacion" className={sub}>Facturación Electrónica</NavLink>}
        </div>}
      </div>}

      {(allowed('/inventario') || allowed('/productos')) && <div className="mt-1">
        <button onClick={() => toggleMenu('productos')} className={`${base} ${inactive} justify-between`}>
          <div className="flex items-center gap-3"><Package className="h-5 w-5" /> Productos</div>
          {openMenus.productos ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {openMenus.productos && <div className="space-y-1 py-1"><NavLink to="/inventario" className={sub}>Inventario y Recetas</NavLink></div>}
      </div>}

      <div className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Gestión y Operaciones</div>
      {allowed('/clientes') && <NavLink to="/clientes" className={link}><Users className="h-5 w-5" /> Clientes (CRM)</NavLink>}
      {allowed('/cocina') && <NavLink to="/cocina" className={link}><ChefHat className="h-5 w-5" /> Cocina & Comandas</NavLink>}
      {allowed('/compras') && <NavLink to="/compras" className={link}><Truck className="h-5 w-5" /> Compras & Prov.</NavLink>}
      {allowed('/caja') && <NavLink to="/caja" className={link}><Wallet className="h-5 w-5" /> Caja & Bancos</NavLink>}
      {allowed('/contabilidad') && <NavLink to="/contabilidad" className={link}><Calculator className="h-5 w-5" /> Contabilidad</NavLink>}
      {allowed('/recursos-humanos') && <NavLink to="/recursos-humanos" className={link}><UserCheck className="h-5 w-5" /> Recursos Humanos</NavLink>}
      {allowed('/produccion') && <NavLink to="/produccion" className={link}><Factory className="h-5 w-5" /> Producción</NavLink>}
      {!operator && <><NavLink to="/servicios" className={link}><Wrench className="h-5 w-5" /> Servicios</NavLink><NavLink to="/proyectos" className={link}><Rocket className="h-5 w-5" /> Proyectos</NavLink></>}

      <div className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Herramientas</div>
      {allowed('/calendario') && <NavLink to="/calendario" className={link}><Calendar className="h-5 w-5" /> Calendario & Tareas</NavLink>}
      {allowed('/documentos') && <NavLink to="/documentos" className={link}><Folder className="h-5 w-5" /> Documentos</NavLink>}
      {allowed('/reportes') && <NavLink to="/reportes" className={link}><FileText className="h-5 w-5" /> Reportes</NavLink>}
      {!operator && <NavLink to="/centro-ia" className={({ isActive }) => `${link({ isActive })} justify-between`}><div className="flex items-center gap-3"><Bot className="h-5 w-5" /> Centro IA</div><span className="rounded bg-brand-blue px-1.5 py-0.5 text-[10px] font-bold text-white">BETA</span></NavLink>}

      {!operator && <><div className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Sistema</div>
        <NavLink to="/usuarios" className={link}><Shield className="h-5 w-5" /> Usuarios y Roles</NavLink>
        <NavLink to="/configuracion" className={link}><Settings className="h-5 w-5" /> Configuración</NavLink>
        <NavLink to="/ayuda" className={link}><HelpCircle className="h-5 w-5" /> Ayuda</NavLink>
      </>}
    </div>
  </aside>;
};

export default Sidebar;
