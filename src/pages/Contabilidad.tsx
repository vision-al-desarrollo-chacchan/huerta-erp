import  { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  ArrowUpDown,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  Calculator,
  PieChart,
  FileText,
  CreditCard,
  Briefcase,
  Calendar,
  Building,
  Users
} from 'lucide-react';

// Interfaces
interface AccountingMovement {
  id: string;
  date: string;
  type: 'Ingreso' | 'Egreso';
  description: string;
  category: string;
  income: number;
  expense: number;
  status: 'Completado' | 'Pendiente' | 'Conciliado';
}

// Datos de prueba (Mock Data adaptada a agosto 2026)
const initialMovements: AccountingMovement[] = [
  { id: '1', date: '2026-08-07T18:00:00', type: 'Ingreso', description: 'Cierre de Caja - Ventas del Día', category: 'Ventas Operativas', income: 1450.50, expense: 0, status: 'Conciliado' },
  { id: '2', date: '2026-08-07T14:30:00', type: 'Egreso', description: 'Pago Proveedor - Avícola San Fernando', category: 'Costo de Ventas', income: 0, expense: 850.00, status: 'Completado' },
  { id: '3', date: '2026-08-06T10:15:00', type: 'Egreso', description: 'Pago de Servicios - Luz del Sur', category: 'Servicios Básicos', income: 0, expense: 320.00, status: 'Completado' },
  { id: '4', date: '2026-08-06T18:00:00', type: 'Ingreso', description: 'Cierre de Caja - Ventas del Día', category: 'Ventas Operativas', income: 1280.00, expense: 0, status: 'Conciliado' },
  { id: '5', date: '2026-08-05T09:00:00', type: 'Egreso', description: 'Alquiler de Local - Agosto', category: 'Alquileres', income: 0, expense: 2500.00, status: 'Completado' },
  { id: '6', date: '2026-08-05T15:45:00', type: 'Ingreso', description: 'Servicio de Catering Corporativo', category: 'Ventas Especiales', income: 3500.00, expense: 0, status: 'Pendiente' },
  { id: '7', date: '2026-08-04T11:20:00', type: 'Egreso', description: 'Compra de Empaques Biodegradables', category: 'Suministros', income: 0, expense: 450.00, status: 'Completado' },
  { id: '8', date: '2026-08-04T16:00:00', type: 'Egreso', description: 'Mantenimiento de Horno', category: 'Mantenimiento', income: 0, expense: 280.00, status: 'Pendiente' },
];

export default function Contabilidad() {
  const [movements] = useState<AccountingMovement[]>(initialMovements);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('Todos');
  const [selectedDate, setSelectedDate] = useState('Este Mes');
  const [activeTab, setActiveTab] = useState<'movimientos' | 'resumen' | 'cuentas'>('movimientos');

  // Filtrado de movimientos
  const filteredMovements = useMemo(() => {
    return movements.filter(mov => {
      const matchesSearch = mov.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            mov.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'Todos' || mov.type === selectedType;
      
      return matchesSearch && matchesType;
    });
  }, [movements, searchTerm, selectedType]);

  // KPIs
  const totalIngresos = movements.reduce((acc, mov) => acc + mov.income, 0);
  const totalGastos = movements.reduce((acc, mov) => acc + mov.expense, 0);
  const utilidadNeta = totalIngresos - totalGastos;
  const pendingAccounts = movements.filter(mov => mov.status === 'Pendiente').length;

  // Renderizadores
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Completado':
        return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-3 h-3 mr-1" /> Completado</span>;
      case 'Conciliado':
        return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"><ShieldCheck className="w-3 h-3 mr-1" /> Conciliado</span>;
      case 'Pendiente':
        return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3 h-3 mr-1" /> Pendiente</span>;
      default:
        return null;
    }
  };

  // Icono para conciliado
  const ShieldCheck = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Contabilidad</h1>
          <p className="text-sm text-slate-500 mt-1">Gestión financiera, libro diario, cuentas por cobrar y pagar</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 border border-slate-300 text-slate-700 bg-white rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium">
            <Download className="w-4 h-4 mr-2" />
            Exportar Reporte
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md shadow-blue-500/20 transition-all font-medium">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Movimiento
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Ingresos del Mes</p>
              <h3 className="text-3xl font-bold text-slate-900">S/ {totalIngresos.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-rose-300 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Gastos del Mes</p>
              <h3 className="text-3xl font-bold text-slate-900">S/ {totalGastos.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Utilidad Neta</p>
              <h3 className="text-3xl font-bold text-blue-600">S/ {utilidadNeta.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Cuentas Pendientes</p>
              <h3 className="text-3xl font-bold text-slate-900">{pendingAccounts} docs</h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-500 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 mb-6 gap-6">
        <button 
          onClick={() => setActiveTab('movimientos')}
          className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center ${activeTab === 'movimientos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <FileText className="w-4 h-4 mr-2" /> Movimientos
        </button>
        <button 
          onClick={() => setActiveTab('resumen')}
          className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center ${activeTab === 'resumen' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <PieChart className="w-4 h-4 mr-2" /> Resumen Contable
        </button>
        <button 
          onClick={() => setActiveTab('cuentas')}
          className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center ${activeTab === 'cuentas' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Briefcase className="w-4 h-4 mr-2" /> Cuentas por Cobrar/Pagar
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'movimientos' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          {/* Toolbar: Search and Filters */}
          <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row gap-4 justify-between items-center">
            <div className="relative w-full lg:w-96">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar por descripción o categoría..."
                className="pl-10 pr-4 py-2.5 w-full border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative flex-1 sm:flex-none sm:min-w-[160px]">
                <select 
                  className="w-full appearance-none bg-white border border-slate-300 text-slate-700 py-2.5 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium shadow-sm"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                >
                  <option value="Hoy">Hoy</option>
                  <option value="Esta Semana">Esta Semana</option>
                  <option value="Este Mes">Este Mes</option>
                  <option value="Mes Anterior">Mes Anterior</option>
                </select>
                <Calendar className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              <div className="relative flex-1 sm:flex-none sm:min-w-[180px]">
                <select 
                  className="w-full appearance-none bg-white border border-slate-300 text-slate-700 py-2.5 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium shadow-sm"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="Todos">Tipo de Operación</option>
                  <option value="Ingreso">Ingresos</option>
                  <option value="Egreso">Egresos</option>
                </select>
                <Filter className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-200">
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                    Ingreso
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                    Egreso
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                    Estado
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.length > 0 ? (
                  filteredMovements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3 px-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-900">
                            {new Date(mov.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(mov.date).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-6">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded flex items-center w-max ${mov.type === 'Ingreso' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                          {mov.type === 'Ingreso' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                          {mov.type}
                        </span>
                      </td>
                      <td className="py-3 px-6">
                        <span className="text-sm font-semibold text-slate-800">{mov.description}</span>
                      </td>
                      <td className="py-3 px-6">
                        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                          {mov.category}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right">
                        {mov.income > 0 ? (
                          <span className="font-bold text-emerald-600">S/ {mov.income.toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-right">
                        {mov.expense > 0 ? (
                          <span className="font-bold text-rose-600">S/ {mov.expense.toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-center">
                        {renderStatusBadge(mov.status)}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Ver Asiento">
                            <FileText className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <Calculator className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-base font-medium text-slate-600">No se encontraron movimientos contables</p>
                        <p className="text-sm mt-1">Intenta ajustando los filtros de búsqueda.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Mostrando <span className="font-medium text-slate-900">{filteredMovements.length}</span> registros
            </span>
            <div className="flex gap-1">
              <button className="px-3 py-1.5 border border-slate-300 text-slate-600 bg-white rounded-md text-sm font-medium hover:bg-slate-50 disabled:opacity-50">Anterior</button>
              <button className="px-3 py-1.5 border border-slate-300 text-slate-600 bg-white rounded-md text-sm font-medium hover:bg-slate-50 disabled:opacity-50">Siguiente</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'resumen' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Balance General Mock */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center">
              <Building className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="font-bold text-slate-800">Balance General</h3>
            </div>
            <div className="p-5 flex-1">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-slate-600">Total Activos</span>
                    <span className="font-bold text-emerald-600">S/ 125,400.00</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-slate-600">Total Pasivos</span>
                    <span className="font-bold text-rose-600">S/ 45,200.00</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-rose-500 h-2 rounded-full" style={{ width: '36%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-slate-600">Patrimonio Neto</span>
                    <span className="font-bold text-blue-600">S/ 80,200.00</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '64%' }}></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
              <button className="text-sm font-semibold text-blue-600 hover:text-blue-800">Ver Balance Completo</button>
            </div>
          </div>

          {/* Estado de Resultados Mock */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center">
              <TrendingUp className="w-5 h-5 text-emerald-600 mr-2" />
              <h3 className="font-bold text-slate-800">Estado de Resultados</h3>
            </div>
            <div className="p-5 flex-1 space-y-3">
              <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                <span className="text-slate-600">Ventas Brutas</span>
                <span className="font-medium text-slate-900">S/ 45,000.00</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                <span className="text-slate-600">Costo de Ventas</span>
                <span className="font-medium text-rose-600">- S/ 15,500.00</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-slate-100 bg-slate-50 px-2 -mx-2">
                <span className="font-bold text-slate-800">Utilidad Bruta</span>
                <span className="font-bold text-slate-900">S/ 29,500.00</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                <span className="text-slate-600">Gastos Operativos</span>
                <span className="font-medium text-rose-600">- S/ 8,200.00</span>
              </div>
              <div className="flex justify-between text-sm py-2 mt-2 bg-emerald-50 px-3 rounded-lg border border-emerald-100">
                <span className="font-bold text-emerald-800">Utilidad Neta</span>
                <span className="font-bold text-emerald-600">S/ 21,300.00</span>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
              <button className="text-sm font-semibold text-blue-600 hover:text-blue-800">Descargar P&G</button>
            </div>
          </div>

          {/* Flujo de Caja Mock */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center">
              <DollarSign className="w-5 h-5 text-amber-600 mr-2" />
              <h3 className="font-bold text-slate-800">Flujo de Caja (Mes)</h3>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-center items-center">
              <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-8 border-slate-100 mb-6">
                <div className="absolute inset-0 rounded-full border-8 border-emerald-400" style={{ clipPath: 'polygon(50% 50%, 50% 0, 100% 0, 100% 100%, 0 100%, 0 70%)' }}></div>
                <div className="absolute inset-0 rounded-full border-8 border-rose-400" style={{ clipPath: 'polygon(50% 50%, 0 70%, 0 0, 50% 0)' }}></div>
                <div className="text-center">
                  <span className="block text-xs font-semibold text-slate-500 uppercase">Saldo Neto</span>
                  <span className="block text-lg font-bold text-slate-900">+12.5k</span>
                </div>
              </div>
              <div className="w-full flex justify-between text-sm">
                <div className="flex items-center"><div className="w-3 h-3 bg-emerald-400 rounded-full mr-2"></div> <span className="text-slate-600">Entradas (70%)</span></div>
                <div className="flex items-center"><div className="w-3 h-3 bg-rose-400 rounded-full mr-2"></div> <span className="text-slate-600">Salidas (30%)</span></div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
              <button className="text-sm font-semibold text-blue-600 hover:text-blue-800">Ver Detalles de Flujo</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'cuentas' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cuentas por Cobrar */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center">
                <CreditCard className="w-5 h-5 text-emerald-600 mr-2" />
                Cuentas por Cobrar
              </h3>
              <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full">S/ 4,500.00</span>
            </div>
            <div className="p-0">
              <ul className="divide-y divide-slate-100">
                <li className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Inversiones ABC SAC</p>
                    <p className="text-xs text-slate-500 mt-0.5">Factura F001-000089 • Vence en 2 días</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">S/ 3,500.00</p>
                    <button className="text-xs font-semibold text-blue-600 hover:underline mt-0.5">Registrar Pago</button>
                  </div>
                </li>
                <li className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Constructora del Norte</p>
                    <p className="text-xs text-rose-500 font-medium mt-0.5">Factura F001-000045 • Vencida (5 días)</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">S/ 1,000.00</p>
                    <button className="text-xs font-semibold text-blue-600 hover:underline mt-0.5">Notificar</button>
                  </div>
                </li>
              </ul>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center mt-auto">
              <button className="text-sm font-semibold text-slate-600 hover:text-slate-800">Ver todas las cuentas por cobrar</button>
            </div>
          </div>

          {/* Cuentas por Pagar */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center">
                <Users className="w-5 h-5 text-rose-600 mr-2" />
                Cuentas por Pagar
              </h3>
              <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-1 rounded-full">S/ 2,850.00</span>
            </div>
            <div className="p-0">
              <ul className="divide-y divide-slate-100">
                <li className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Avícola San Fernando</p>
                    <p className="text-xs text-amber-500 font-medium mt-0.5">Orden OC-26-0801 • Vence hoy</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-rose-600">S/ 1,250.00</p>
                    <button className="text-xs font-semibold text-blue-600 hover:underline mt-0.5">Pagar</button>
                  </div>
                </li>
                <li className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Distribuidora de Bebidas SAC</p>
                    <p className="text-xs text-slate-500 mt-0.5">Orden OC-26-0795 • Vence en 5 días</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-rose-600">S/ 850.00</p>
                    <button className="text-xs font-semibold text-blue-600 hover:underline mt-0.5">Pagar</button>
                  </div>
                </li>
                <li className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Empaques Ecológicos del Perú</p>
                    <p className="text-xs text-slate-500 mt-0.5">Orden OC-26-0780 • Vence en 8 días</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-rose-600">S/ 750.00</p>
                    <button className="text-xs font-semibold text-blue-600 hover:underline mt-0.5">Pagar</button>
                  </div>
                </li>
              </ul>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center mt-auto">
              <button className="text-sm font-semibold text-slate-600 hover:text-slate-800">Ver todas las cuentas por pagar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}