import  { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Download, 
  Filter, 
  Printer,
  ShoppingBag,
  Package,
  ArrowRight,
  PieChart
} from 'lucide-react';

// Interfaces para datos de prueba
interface SalesSummary {
  id: string;
  date: string;
  document: string;
  client: string;
  amount: number;
  status: string;
}

interface TopProduct {
  id: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
  percentage: number;
}

// Datos de prueba (Mock Data)
const mockSalesSummary: SalesSummary[] = [
  { id: '1', date: '2026-08-07', document: 'B001-000145', client: 'Público General', amount: 85.50, status: 'Completado' },
  { id: '2', date: '2026-08-07', document: 'F001-000089', client: 'Inversiones ABC SAC', amount: 320.00, status: 'Completado' },
  { id: '3', date: '2026-08-06', document: 'B001-000144', client: 'María López', amount: 45.00, status: 'Completado' },
  { id: '4', date: '2026-08-06', document: 'B001-000143', client: 'Juan Pérez', amount: 120.00, status: 'Completado' },
  { id: '5', date: '2026-08-05', document: 'F001-000088', client: 'Constructora del Norte', amount: 450.00, status: 'Completado' },
];

const mockTopProducts: TopProduct[] = [
  { id: '1', name: 'Pollo a la Brasa Entero', category: 'Platos Principales', quantity: 145, revenue: 10135.50, percentage: 85 },
  { id: '2', name: '1/2 Pollo a la Brasa', category: 'Platos Principales', quantity: 98, revenue: 3822.00, percentage: 65 },
  { id: '3', name: 'Gaseosa 1.5L', category: 'Bebidas', quantity: 210, revenue: 2100.00, percentage: 45 },
  { id: '4', name: 'Porción de Papas Extra', category: 'Guarniciones', quantity: 85, revenue: 1020.00, percentage: 30 },
  { id: '5', name: 'Chicha Morada Jarra', category: 'Bebidas', quantity: 64, revenue: 960.00, percentage: 25 },
];

// Datos para el gráfico simulado
const chartData = [
  { day: 'Lun', ingresos: 80, gastos: 40 },
  { day: 'Mar', ingresos: 65, gastos: 35 },
  { day: 'Mié', ingresos: 90, gastos: 45 },
  { day: 'Jue', ingresos: 75, gastos: 30 },
  { day: 'Vie', ingresos: 110, gastos: 60 },
  { day: 'Sáb', ingresos: 140, gastos: 80 },
  { day: 'Dom', ingresos: 160, gastos: 85 },
];

export default function Reportes() {
  const [reportType, setReportType] = useState('General');
  const [dateRange, setDateRange] = useState('Este Mes');

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Reportes y Estadísticas</h1>
          <p className="text-sm text-slate-500 mt-1">Análisis financiero, rendimiento de ventas y control de inventario</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 border border-slate-300 text-slate-700 bg-white rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md shadow-blue-500/20 transition-all font-medium">
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Toolbar: Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-8 flex flex-col lg:flex-row gap-4 items-end lg:items-center justify-between shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="w-full sm:w-48">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Reporte</label>
            <div className="relative">
              <select 
                className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2 pl-3 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="General">Resumen General</option>
                <option value="Ventas">Reporte de Ventas</option>
                <option value="Compras">Reporte de Compras</option>
                <option value="Inventario">Movimientos de Inventario</option>
              </select>
              <Filter className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          
          <div className="w-full sm:w-48">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Periodo</label>
            <div className="relative">
              <select 
                className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2 pl-3 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="Hoy">Hoy</option>
                <option value="Esta Semana">Esta Semana</option>
                <option value="Este Mes">Este Mes</option>
                <option value="Mes Anterior">Mes Anterior</option>
                <option value="Personalizado">Personalizado...</option>
              </select>
              <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {dateRange === 'Personalizado' && (
            <>
              <div className="w-full sm:w-40">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fecha Inicio</label>
                <input type="date" className="w-full bg-slate-50 border border-slate-300 text-slate-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium" />
              </div>
              <div className="w-full sm:w-40">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fecha Fin</label>
                <input type="date" className="w-full bg-slate-50 border border-slate-300 text-slate-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium" />
              </div>
            </>
          )}
        </div>
        
        <button className="w-full lg:w-auto px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-sm transition-colors text-sm font-medium">
          Generar Reporte
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                <TrendingUp className="w-3 h-3 mr-1" /> +12.5%
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Ventas del Día</p>
            <h3 className="text-2xl font-bold text-slate-900">S/ 1,245.50</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-cyan-300 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-lg">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                <TrendingUp className="w-3 h-3 mr-1" /> +8.2%
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Ventas del Mes</p>
            <h3 className="text-2xl font-bold text-slate-900">S/ 45,890.00</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <BarChart3 className="w-5 h-5" />
              </div>
              <span className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                <TrendingUp className="w-3 h-3 mr-1" /> +15.3%
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Utilidad Estimada</p>
            <h3 className="text-2xl font-bold text-slate-900">S/ 18,356.00</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-rose-300 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
                <TrendingDown className="w-5 h-5" />
              </div>
              <span className="flex items-center text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
                <TrendingUp className="w-3 h-3 mr-1" /> +2.1%
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Gastos del Mes</p>
            <h3 className="text-2xl font-bold text-slate-900">S/ 27,534.00</h3>
          </div>
        </div>
      </div>

      {/* Gráficos Visuales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Gráfico 1: Comparación Ingresos vs Gastos */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Ingresos vs Gastos</h3>
              <p className="text-sm text-slate-500">Comparativa de los últimos 7 días</p>
            </div>
            <div className="flex gap-4 text-xs font-medium">
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span> Ingresos</div>
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-rose-400 mr-2"></span> Gastos</div>
            </div>
          </div>
          
          <div className="flex-1 min-h-[250px] flex items-end justify-between gap-2 pt-4 relative">
            {/* Líneas guías horizontales (decorativas) */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
              <div className="w-full h-px bg-slate-400"></div>
              <div className="w-full h-px bg-slate-400"></div>
              <div className="w-full h-px bg-slate-400"></div>
              <div className="w-full h-px bg-slate-400"></div>
            </div>
            
            {/* Barras */}
            {chartData.map((data, index) => (
              <div key={index} className="flex flex-col items-center flex-1 z-10 group cursor-pointer">
                <div className="flex items-end justify-center w-full gap-1 sm:gap-2 h-48 mb-2">
                  <div 
                    className="w-1/3 max-w-[24px] bg-blue-500 rounded-t-md group-hover:bg-blue-600 transition-colors relative"
                    style={{ height: `${data.ingresos}%` }}
                    title={`Ingresos: ${data.ingresos}`}
                  ></div>
                  <div 
                    className="w-1/3 max-w-[24px] bg-rose-400 rounded-t-md group-hover:bg-rose-500 transition-colors relative"
                    style={{ height: `${data.gastos}%` }}
                    title={`Gastos: ${data.gastos}`}
                  ></div>
                </div>
                <span className="text-xs font-medium text-slate-500">{data.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico 2: Productos Más Vendidos */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Top Productos</h3>
              <p className="text-sm text-slate-500">Los artículos con mayor movimiento</p>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg text-slate-500 border border-slate-200">
              <PieChart className="w-5 h-5" />
            </div>
          </div>
          
          <div className="space-y-5">
            {mockTopProducts.map((product, index) => (
              <div key={product.id}>
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <div className="flex items-center">
                      <span className="w-5 h-5 rounded flex items-center justify-center bg-slate-100 text-xs font-bold text-slate-500 mr-2">
                        {index + 1}
                      </span>
                      <span className="text-sm font-bold text-slate-800">{product.name}</span>
                    </div>
                    <span className="text-xs text-slate-500 ml-7">{product.quantity} unidades vendidas</span>
                  </div>
                  <span className="text-sm font-bold text-blue-600">S/ {product.revenue.toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 ml-7" style={{ width: 'calc(100% - 28px)' }}>
                  <div 
                    className="bg-blue-500 h-2.5 rounded-full" 
                    style={{ width: `${product.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center">
            Ver Catálogo Completo <ArrowRight className="w-4 h-4 ml-1.5" />
          </button>
        </div>
      </div>

      {/* Tablas de Resumen */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-900 flex items-center">
            <Package className="w-5 h-5 mr-2 text-slate-500" />
            Resumen de Últimas Transacciones
          </h3>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-md text-xs font-semibold hover:bg-slate-50 shadow-sm transition-colors">Ventas</button>
            <button className="px-3 py-1.5 bg-transparent border border-transparent text-slate-500 rounded-md text-xs font-semibold hover:bg-slate-100 transition-colors">Compras</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Documento</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente / Proveedor</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Monto</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockSalesSummary.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-6 text-sm text-slate-600">
                    {new Date(sale.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-3 px-6">
                    <span className="font-mono text-sm font-medium text-blue-600">{sale.document}</span>
                  </td>
                  <td className="py-3 px-6">
                    <span className="text-sm font-medium text-slate-800">{sale.client}</span>
                  </td>
                  <td className="py-3 px-6 text-right">
                    <span className="font-bold text-slate-900">S/ {sale.amount.toFixed(2)}</span>
                  </td>
                  <td className="py-3 px-6 text-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {sale.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-200 text-center">
          <button className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
            Ver todas las transacciones
          </button>
        </div>
      </div>
    </div>
  );
}