import React, { useEffect, useState } from "react";
import {
  Search,
  Bell,
  MessageSquare,
  Calendar,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useTheme } from "../context/useTheme";
import { logout } from "../services/auth";
import {
  getCompanySettings,
  getDocuments,
  getQuotes,
  getTasks,
} from "../services/erp-store";
import { getSupplies } from "../services/inventory-store";
import {
  getCashSession,
  getCurrentStaffName,
  getOrders,
} from "../services/restaurant-store";

type Notice = {
  id: string;
  title: string;
  detail: string;
  route: string;
  tone: "red" | "amber" | "blue" | "green";
};

const Header: React.FC = () => {
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [company, setCompany] = useState("Empresa");
  const [branch, setBranch] = useState("Sucursal");
  const [staff, setStaff] = useState("Usuario");
  const [notifications, setNotifications] = useState<Notice[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const load = () => {
      void getCompanySettings().then((data) => {
        setCompany(data.nombreComercial || data.nombre);
        setBranch(data.sucursal);
      });
    };
    const loadNotifications = () => {
      void Promise.all([
        getTasks(),
        getSupplies(),
        getOrders(),
        getCashSession(true),
        getQuotes(),
        getDocuments(),
      ]).then(([tasks, supplies, orders, cash, quotes, documents]) => {
        const notices: Notice[] = [];
        tasks
          .filter((task) => task.estado === "pendiente")
          .forEach((task) =>
            notices.push({
              id: `task-${task.id}`,
              title: task.titulo,
              detail: `Tarea · ${task.fecha} · ${task.responsable || "Sin responsable"}`,
              route: "/calendario",
              tone: task.prioridad === "alta" ? "red" : "blue",
            }),
          );
        supplies
          .filter((supply) => supply.stock <= supply.minStock)
          .forEach((supply) =>
            notices.push({
              id: `stock-${supply.id}`,
              title: `Stock bajo: ${supply.name}`,
              detail: `${supply.stock} ${supply.unit} disponibles · mínimo ${supply.minStock}`,
              route: "/inventario",
              tone: "red",
            }),
          );
        orders
          .filter((order) =>
            ["nuevo", "preparando", "listo"].includes(order.status),
          )
          .forEach((order) =>
            notices.push({
              id: `order-${order.id}`,
              title: `Pedido #${String(order.number).padStart(3, "0")} · ${order.status}`,
              detail: `${order.serviceType} · ${order.items.length} productos`,
              route: order.status === "listo" ? "/ventas/pedidos" : "/cocina",
              tone: order.status === "listo" ? "green" : "amber",
            }),
          );
        if (!cash)
          notices.push({
            id: "cash-closed",
            title: "Caja cerrada",
            detail: "Abre una caja antes de comenzar las ventas.",
            route: "/caja",
            tone: "amber",
          });
        quotes
          .filter((quote) => quote.estado === "aceptada")
          .forEach((quote) =>
            notices.push({
              id: `quote-${quote.id}`,
              title: `Cotización aceptada COT-${String(quote.numero).padStart(6, "0")}`,
              detail: quote.cliente_nombre,
              route: "/ventas/cotizaciones",
              tone: "green",
            }),
          );
        const limit = new Date();
        limit.setDate(limit.getDate() + 30);
        documents
          .filter(
            (document) =>
              document.vence_at &&
              new Date(`${document.vence_at}T00:00:00`) <= limit,
          )
          .forEach((document) =>
            notices.push({
              id: `document-${document.id}`,
              title: `Documento por vencer: ${document.nombre}`,
              detail: document.vence_at || "",
              route: "/documentos",
              tone: "amber",
            }),
          );
        setNotifications(notices);
      });
    };
    load();
    loadNotifications();
    void getCurrentStaffName().then(setStaff);
    window.addEventListener("huerta-settings-updated", load);
    window.addEventListener("huerta-tasks-updated", loadNotifications);
    window.addEventListener("huerta-data-updated", loadNotifications);
    const interval = window.setInterval(loadNotifications, 60000);
    return () => {
      window.removeEventListener("huerta-settings-updated", load);
      window.removeEventListener("huerta-tasks-updated", loadNotifications);
      window.removeEventListener("huerta-data-updated", loadNotifications);
      window.clearInterval(interval);
    };
  }, []);

  const handleLogout = async () => {
    const { error } = await logout();

    if (error) {
      alert("No se pudo cerrar la sesión. Inténtalo nuevamente.");
      return;
    }

    navigate("/", { replace: true });
  };

  return (
    <header className="h-16 bg-white dark:bg-brand-surfaceDark border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 flex-shrink-0 z-10 shadow-sm transition-colors w-full">
      {/* Selectores Multi-Tenant */}
      <div className="hidden md:flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
            Empresa
          </span>
          <select className="bg-transparent text-sm font-semibold text-brand-dark dark:text-white focus:outline-none cursor-pointer border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
            <option>{company}</option>
          </select>
        </div>
        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
            Sucursal
          </span>
          <select className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer">
            <option>{branch}</option>
          </select>
        </div>
      </div>

      {/* Utilidades y Perfil */}
      <div className="flex items-center gap-5 ml-auto">
        <div className="relative hidden lg:block">
          <input
            type="text"
            placeholder="Buscar (Ctrl+K)"
            className="w-64 pl-9 pr-4 py-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-brand-blue/50 outline-none dark:text-white transition-all"
          />
          <Search className="absolute left-3 top-2 w-4 h-4 text-slate-400" />
        </div>

        <div className="flex items-center gap-3 border-r border-slate-200 dark:border-slate-700 pr-5">
          <button
            onClick={toggleDarkMode}
            className="p-2 text-slate-500 hover:text-brand-blue hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {darkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
          <button className="relative p-2 text-slate-500 hover:text-brand-blue hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors hidden sm:block">
            <MessageSquare className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate("/calendario")}
            className="relative hidden rounded-lg p-2 text-slate-500 transition-colors hover:bg-blue-50 hover:text-brand-blue dark:hover:bg-slate-800 sm:block"
          >
            <Calendar className="w-5 h-5" />
          </button>
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen((open) => !open)}
              className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-blue-50 hover:text-brand-blue dark:hover:bg-slate-800"
              aria-label="Notificaciones"
            >
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <span className="absolute right-0 top-0 min-w-5 rounded-full border-2 border-white bg-red-500 px-1 text-center text-[9px] font-bold text-white dark:border-brand-surfaceDark">
                  {notifications.length > 99 ? "99+" : notifications.length}
                </span>
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b p-4 font-black text-slate-900 dark:text-white">
                  Centro de notificaciones ({notifications.length})
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="p-6 text-center text-sm text-slate-500">
                      No tienes avisos pendientes.
                    </p>
                  ) : (
                    notifications.slice(0, 12).map((notice) => (
                      <button
                        key={notice.id}
                        onClick={() => {
                          setNotificationsOpen(false);
                          navigate(notice.route);
                        }}
                        className="block w-full border-b p-4 text-left hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        <span className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${notice.tone === "red" ? "bg-red-500" : notice.tone === "amber" ? "bg-amber-500" : notice.tone === "green" ? "bg-emerald-500" : "bg-blue-500"}`}
                          />
                          {notice.title}
                        </span>
                        <span className="text-xs text-slate-500">
                          {notice.detail}
                        </span>
                      </button>
                    ))
                  )}
                </div>
                <button
                  onClick={() => {
                    setNotificationsOpen(false);
                    navigate("/calendario");
                  }}
                  className="w-full bg-slate-50 p-3 text-sm font-black text-blue-600 dark:bg-slate-800"
                >
                  Abrir calendario y tareas
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Perfil del Usuario */}
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="text-right hidden sm:block">
            <p className="max-w-28 truncate text-sm font-bold leading-tight text-slate-800 dark:text-white">
              {staff}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Online
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold text-sm shadow-md">
            {staff.slice(0, 2).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
