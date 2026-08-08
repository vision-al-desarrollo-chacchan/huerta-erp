import  { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Clock,
  Plus, 
  Minus, 
  Lock, 
  Unlock,
  FileText,
  ArrowUpDown,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Banknote,
  Smartphone
} from 'lucide-react';

// Interfaces
interface Movement {
  id: string;
  date: string;
  type: 'Ingreso' | 'Egreso';
  description: string;
  user: string;
  paymentMethod: 'Efectivo' | 'Tarjeta' | 'Yape' | 'Plin' | 'Transferencia' | 'Caja Chica';
  amount: number;
  status: 'Completado' | 'Pendiente' | 'Anulado';
}

// Datos de prueba (Mock Data adaptada al contexto del 7 de agosto de 2026)
const initialMovements: Movement[] = [
  { id: '1', date: '2026-08-07T08:30:00', type: 'Ingreso', description: 'Apertura de Caja - Turno Mañana', user: 'Admin', paymentMethod: 'Efectivo', amount: 300.00, status: 'Completado' },
  { id: '2', date: '2026-08-07T12:15:00', type: 'Ingreso', description: 'Venta Mostrador - TCK-00145', user: 'Ana Rojas (Caja 1)', paymentMethod: 'Efectivo', amount: 85.50, status: 'Completado' },
  { id: '3', date: '2026-08-07T13:45:00', type: 'Ingreso', description: 'Venta Delivery - Pedido #402', user: 'Ana Rojas (Caja 1)', paymentMethod: 'Yape', amount: 120.00, status: 'Completado' },
  { id: '4', date: '2026-08-07T14:20:00', type: 'Egreso', description: 'Pago a Proveedor - Mercado Central', user: 'Admin', paymentMethod: 'Efectivo', amount: 150.00, status: 'Completado' },
  { id: '5', date: '2026-08-07T15:00:00', type: 'Egreso', description: 'Compra urgente - Útiles de limpieza', user: 'Carlos M. (Caja 2)', paymentMethod: 'Caja Chica', amount: 35.00, status: 'Completado' },
  { id: '6', date: '2026-08-07T16:10:00', type: 'Ingreso', description: 'Venta Salón - Mesa 04', user: 'Carlos M. (Caja 2)', paymentMethod: 'Tarjeta', amount: 210.00, status: 'Completado' },
  { id: '7', date: '2026-08-07T16:45:00', type: 'Ingreso', description: 'Venta Delivery - Pedido #405', user: 'Carlos M. (Caja 2)', paymentMethod: 'Transferencia', amount: 95.00, status: 'Pendiente' },
  { id: '8', date: '2026-08-07T17:15:00', type: 'Egreso', description: 'Adelanto de sueldo - Ayudante', user: 'Admin', paymentMethod: 'Efectivo', amount: 100.00, status: 'Completado' },
];

export default function Caja() {
  const [movements] = useState<Movement[]>(initialMovements);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('Todos');
  const [isCashRegisterOpen, setIsCashRegisterOpen] = useState(true);

  // Filtrado de movimientos
  const filteredMovements = useMemo(() => {
    return movements.filter(mov => {
      const matchesSearch = mov.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            mov.user.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'Todos' || mov.type === selectedType;
      
      return matchesSearch && matchesType;
    });
  }, [movements, searchTerm, selectedType]);

  // KPIs
  const totalIngresos = movements.filter(m => m.type === 'Ingreso' && m.status !== 'Anulado').reduce((acc, m) => acc + m.amount, 0);
  const totalEgresos = movements.filter(m => m.type === 'Egreso' && m.status !== 'Anulado').reduce((acc, m) => acc + m.amount, 0);
  const saldoActual = totalIngresos - totalEgresos;
  const pendingMovements = movements.filter(m => m.status === 'Pendiente').length;

  // Renderizadores de estado y tipo
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Completado':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-3 h-3 mr-1" /> Completado</span>;
      case 'Pendiente':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3 h-3 mr-1" /> Pendiente</span>;
      case 'Anulado':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"><AlertCircle className="w-3 h-3 mr-1" /> Anulado</span>;
      default:
        return null;
    }
  };

  const renderTypeBadge = (type: string) => {
    return type === 'Ingreso' 
      ? <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center w-max"><TrendingUp className="w-3 h-3 mr-1" /> Ingreso</span>
      : <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded flex items-center w-max"><TrendingDown className="w-3 h-3 mr-1" /> Egreso</span>;
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'Efectivo':
      case 'Caja Chica':
        return <Banknote className="w-4 h-4 text-slate-400" />;
      case 'Tarjeta':
        return <CreditCard className="w-4 h-4 text-slate-400" />;
      case 'Yape':
      case 'Plin':
      case 'Transferencia':
        return <Smartphone className="w-4 h-4 text-slate-400" />;
      default:
        return <Banknote className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Caja y Bancos</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center ${isCashRegisterOpen ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              {isCashRegisterOpen ? <Unlock className="w-3 h-3 mr-1.5" /> : <Lock className="w-3 h-3 mr-1.5" />}
              {isCashRegisterOpen ? 'CAJA ABIERTA' : 'CAJA CERRADA'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">Control de flujo de caja, ingresos, egresos y arqueos diarios</p>
        </div>
        
        {/* Acciones de Caja */}
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
          <button className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors text-sm font-medium">
            <Plus className="w-4 h-4 mr-2" />
            Ingreso
          </button>
          <button className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition-colors text-sm font-medium">
            <Minus className="w-4 h-4 mr-2" />
            Egreso
          </button>
          <button className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm transition-colors text-sm font-medium">
            <FileText className="w-4 h-4 mr-2" />
            Arqueo
          </button>
          <button 
            onClick={() => setIsCashRegisterOpen(!isCashRegisterOpen)}
            className={`flex-1 sm:flex-none flex items-center justify-center px-4 py-2 border rounded-lg shadow-sm transition-colors text-sm font-medium ${
              isCashRegisterOpen 
                ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100' 
                : 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            {isCashRegisterOpen ? (
              <><Lock className="w-4 h-4 mr-2" /> Cerrar Caja</>
            ) : (
              <><Unlock className="w-4 h-4 mr-2" /> Abrir Caja</>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Saldo Actual</p>
              <h3 className="text-3xl font-bold text-slate-900">S/ {saldoActual.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Ingresos del Día</p>
              <h3 className="text-3xl font-bold text-emerald-600">+S/ {totalIngresos.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Egresos del Día</p>
              <h3 className="text-3xl font-bold text-rose-600">-S/ {totalEgresos.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Movimientos Pendientes</p>
              <h3 className="text-3xl font-bold text-slate-900">{pendingMovements}</h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-500 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar: Search and Filters */}
      <div className="bg-white rounded-t-xl border-x border-t border-slate-200 p-5 flex flex-col lg:flex-row gap-4 justify-between items-center">
        <div className="relative w-full lg:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por descripción o usuario..."
            className="pl-10 pr-4 py-2.5 w-full border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <select 
              className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2.5 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="Todos">Todos los Movimientos</option>
              <option value="Ingreso">Solo Ingresos</option>
              <option value="Egreso">Solo Egresos</option>
            </select>
            <Filter className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-b-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:text-slate-800">
                  Hora <ArrowUpDown className="w-3 h-3" />
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Método de Pago
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                  Monto
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
                filteredMovements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">
                          {new Date(movement.date).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(movement.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {renderTypeBadge(movement.type)}
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-medium text-slate-800">{movement.description}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-slate-600">{movement.user}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center text-sm font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md w-max">
                        {getPaymentIcon(movement.paymentMethod)}
                        <span className="ml-2">{movement.paymentMethod}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className={`font-bold ${movement.type === 'Ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {movement.type === 'Ingreso' ? '+' : '-'}S/ {movement.amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {renderStatusBadge(movement.status)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Ver Detalle">
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
                      <Wallet className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-base font-medium text-slate-600">No se encontraron movimientos</p>
                      <p className="text-sm mt-1">Ajusta los filtros o realiza una nueva operación.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination (Visual only) */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            Mostrando <span className="font-medium text-slate-900">{filteredMovements.length}</span> de <span className="font-medium text-slate-900">{movements.length}</span> movimientos
          </span>
          <div className="flex gap-1">
            <button className="px-3 py-1.5 border border-slate-300 text-slate-600 bg-white rounded-md text-sm font-medium hover:bg-slate-50 disabled:opacity-50">Anterior</button>
            <button className="px-3 py-1.5 border border-slate-300 text-slate-600 bg-white rounded-md text-sm font-medium hover:bg-slate-50 disabled:opacity-50">Siguiente</button>
          </div>
        </div>
      </div>
    </div>
  );
}