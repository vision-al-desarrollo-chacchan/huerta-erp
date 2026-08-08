import React from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  CreditCard, 
  Wallet, 
  AlertCircle, 
  Users, 
  ShoppingCart, 
  Package,
  Download,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const kpis = [
    { 
      title: "Ventas Hoy", 
      value: "S/ 12,450", 
      badge: "+15%", 
      trend: "up",
      color: "text-emerald-600 dark:text-emerald-400",
      bgBadge: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      icon: <DollarSign className="w-4 h-4" />
    },
    { 
      title: "Ventas Mes", 
      value: "S/ 184,200", 
      badge: "+8%", 
      trend: "up",
      color: "text-emerald-600 dark:text-emerald-400",
      bgBadge: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      icon: <TrendingUp className="w-4 h-4" />
    },
    { 
      title: "Utilidad (Mes)", 
      value: "S/ 42,800", 
      badge: "28% Mg", 
      trend: "neutral",
      color: "text-brand-cyan",
      bgBadge: "bg-brand-cyan/10 text-brand-cyan",
      icon: <Wallet className="w-4 h-4" />
    },
    { 
      title: "Caja Efectivo", 
      value: "S/ 3,450", 
      badge: "Abierta", 
      trend: "neutral",
      color: "text-slate-800 dark:text-white",
      bgBadge: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
      icon: <DollarSign className="w-4 h-4" />
    },
    { 
      title: "Bancos", 
      value: "S/ 89,120", 
      badge: "Consolidado", 
      trend: "neutral",
      color: "text-brand-blue",
      bgBadge: "bg-brand-blue/10 text-brand-blue",
      icon: <CreditCard className="w-4 h-4" />
    },
    { 
      title: "Por Cobrar", 
      value: "S/ 24,500", 
      badge: "6 Vencidas", 
      trend: "down",
      color: "text-amber-600 dark:text-amber-500",
      bgBadge: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
      icon: <AlertCircle className="w-4 h-4" />
    },
    { 
      title: "Por Pagar", 
      value: "S/ 18,200", 
      badge: "Próx. 15", 
      trend: "down",
      color: "text-red-600 dark:text-red-400",
      bgBadge: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400",
      icon: <AlertTriangle className="w-4 h-4" />
    },
    { 
      title: "Stock Crítico", 
      value: "28 SKUs", 
      badge: "Alerta", 
      trend: "down",
      color: "text-red-600 dark:text-red-400",
      bgBadge: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400",
      icon: <Package className="w-4 h-4" />
    },
    { 
      title: "Clientes Nuevos", 
      value: "45", 
      badge: "+12", 
      trend: "up",
      color: "text-emerald-600 dark:text-emerald-400",
      bgBadge: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      icon: <Users className="w-4 h-4" />
    },
    { 
      title: "Compras", 
      value: "12 Activas", 
      badge: "En Tránsito", 
      trend: "neutral",
      color: "text-brand-blue",
      bgBadge: "bg-brand-blue/10 text-brand-blue",
      icon: <ShoppingCart className="w-4 h-4" />
    },
    { 
      title: "Pedidos", 
      value: "18", 
      badge: "En Cola", 
      trend: "neutral",
      color: "text-brand-blue",
      bgBadge: "bg-brand-blue/10 text-brand-blue",
      icon: <Package className="w-4 h-4" />
    },
    { 
      title: "Alertas SUNAT", 
      value: "3", 
      badge: "Rechazados", 
      trend: "down",
      color: "text-red-600 dark:text-red-400",
      bgBadge: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400",
      icon: <AlertTriangle className="w-4 h-4" />
    },
  ];

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Visión General</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Métricas operativas consolidadas al día de hoy.</p>
        </div>
        <button className="flex items-center gap-2 bg-white dark:bg-brand-surfaceDark border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-colors">
          <Download className="w-4 h-4" />
          Descargar Reporte
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <div 
            key={index} 
            className="group bg-white dark:bg-brand-surfaceDark p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-soft hover:shadow-premium hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                {kpi.icon}
                <span className="text-xs font-semibold uppercase tracking-wider">{kpi.title}</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${kpi.bgBadge}`}>
                {kpi.trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
                {kpi.trend === 'down' && <ArrowDownRight className="w-3 h-3" />}
                {kpi.badge}
              </span>
            </div>
            <p className={`text-2xl font-bold tracking-tight ${kpi.color}`}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-brand-surfaceDark rounded-xl border border-slate-200 dark:border-slate-700 shadow-soft p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-900 dark:text-white">Flujo de Caja & Utilidades</h3>
            <select className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/50">
              <option>Últimos 6 meses</option>
              <option>Este año</option>
            </select>
          </div>
          <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 rounded-lg flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-700 min-h-[250px]">
            <span className="text-sm text-slate-400 font-medium">Gráfico de Ventas - Integración de ApexCharts / ECharts</span>
          </div>
        </div>

        <div className="bg-white dark:bg-brand-surfaceDark rounded-xl border border-slate-200 dark:border-slate-700 shadow-soft p-6 flex flex-col">
          <h3 className="font-bold text-slate-900 dark:text-white mb-6">Ranking de Productos</h3>
          <div className="flex-1">
            <ul className="space-y-4">
              <li className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-bold text-sm">1</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Laptop Dell XPS 15</p>
                    <p className="text-[10px] text-slate-500">Tecnología</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-brand-dark dark:text-white">142 und</span>
              </li>
              <li className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-bold text-sm">2</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Monitor LG 27"</p>
                    <p className="text-[10px] text-slate-500">Periféricos</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-brand-dark dark:text-white">98 und</span>
              </li>
              <li className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-bold text-sm">3</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Teclado Mecánico RGB</p>
                    <p className="text-[10px] text-slate-500">Accesorios</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-brand-dark dark:text-white">85 und</span>
              </li>
              <li className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-bold text-sm">4</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Mouse MX Master 3S</p>
                    <p className="text-[10px] text-slate-500">Periféricos</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-brand-dark dark:text-white">64 und</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;