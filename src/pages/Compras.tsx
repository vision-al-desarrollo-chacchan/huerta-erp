import { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  ShoppingCart, 
  Truck, 
  CreditCard,
  FileText,
  Edit, 
  Trash2, 
  ArrowUpDown,
  MoreVertical,
  Download,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

// Interfaces
interface Purchase {
  id: string;
  orderNumber: string;
  supplier: string;
  date: string;
  expectedDate: string;
  total: number;
  status: 'Completado' | 'Pendiente' | 'En Tránsito' | 'Cancelado';
  paymentStatus: 'Pagado' | 'Por Pagar' | 'Crédito';
  items: number;
}

// Datos de prueba (Mock Data adaptada para restaurante/pollería)
const initialPurchases: Purchase[] = [
  { id: '1', orderNumber: 'OC-26-0801', supplier: 'Avícola San Fernando', date: '2026-08-01', expectedDate: '2026-08-02', total: 1250.00, status: 'Completado', paymentStatus: 'Pagado', items: 3 },
  { id: '2', orderNumber: 'OC-26-0802', supplier: 'Distribuidora de Bebidas SAC', date: '2026-08-03', expectedDate: '2026-08-04', total: 850.50, status: 'Completado', paymentStatus: 'Crédito', items: 5 },
  { id: '3', orderNumber: 'OC-26-0803', supplier: 'Mercado Central - Verduras', date: '2026-08-05', expectedDate: '2026-08-05', total: 320.00, status: 'Completado', paymentStatus: 'Pagado', items: 12 },
  { id: '4', orderNumber: 'OC-26-0804', supplier: 'Empaques Ecológicos del Perú', date: '2026-08-06', expectedDate: '2026-08-08', total: 640.00, status: 'En Tránsito', paymentStatus: 'Por Pagar', items: 2 },
  { id: '5', orderNumber: 'OC-26-0805', supplier: 'El Parrillero - Carbón', date: '2026-08-07', expectedDate: '2026-08-07', total: 250.00, status: 'Pendiente', paymentStatus: 'Por Pagar', items: 1 },
  { id: '6', orderNumber: 'OC-26-0806', supplier: 'Insumos Industriales Makro', date: '2026-08-07', expectedDate: '2026-08-09', total: 1150.20, status: 'En Tránsito', paymentStatus: 'Pagado', items: 8 },
  { id: '7', orderNumber: 'OC-26-0807', supplier: 'Avícola San Fernando', date: '2026-08-07', expectedDate: '2026-08-08', total: 980.00, status: 'Pendiente', paymentStatus: 'Crédito', items: 2 },
  { id: '8', orderNumber: 'OC-26-0808', supplier: 'Mantenimiento Equipos SAC', date: '2026-07-28', expectedDate: '2026-07-29', total: 450.00, status: 'Cancelado', paymentStatus: 'Por Pagar', items: 1 },
];

export default function Compras() {
  const [purchases] = useState<Purchase[]>(initialPurchases);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [selectedSupplier, setSelectedSupplier] = useState('Todos');

  // Proveedores únicos para el filtro
  const suppliers = ['Todos', ...Array.from(new Set(purchases.map(p => p.supplier)))];

  // Filtrado de compras
  const filteredPurchases = useMemo(() => {
    return purchases.filter(purchase => {
      const matchesSearch = purchase.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            purchase.supplier.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = selectedStatus === 'Todos' || purchase.status === selectedStatus;
      const matchesSupplier = selectedSupplier === 'Todos' || purchase.supplier === selectedSupplier;
      
      return matchesSearch && matchesStatus && matchesSupplier;
    });
  }, [purchases, searchTerm, selectedStatus, selectedSupplier]);

  // KPIs
  const totalPurchasesAmount = purchases.filter(p => p.status !== 'Cancelado').reduce((acc, p) => acc + p.total, 0);
  const pendingPaymentsAmount = purchases.filter(p => p.paymentStatus !== 'Pagado' && p.status !== 'Cancelado').reduce((acc, p) => acc + p.total, 0);
  const activeOrders = purchases.filter(p => p.status === 'Pendiente' || p.status === 'En Tránsito').length;
  const uniqueSuppliers = new Set(purchases.filter(p => p.status !== 'Cancelado').map(p => p.supplier)).size;

  // Renderizadores de estado
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Completado':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-3 h-3 mr-1" /> Completado</span>;
      case 'Pendiente':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3 h-3 mr-1" /> Pendiente</span>;
      case 'En Tránsito':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"><Truck className="w-3 h-3 mr-1" /> En Tránsito</span>;
      case 'Cancelado':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"><AlertCircle className="w-3 h-3 mr-1" /> Cancelado</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">{status}</span>;
    }
  };

  const renderPaymentBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'Pagado':
        return <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Pagado</span>;
      case 'Por Pagar':
        return <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">Por Pagar</span>;
      case 'Crédito':
        return <span className="text-xs font-semibold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md">Crédito</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Compras</h1>
          <p className="text-sm text-slate-500 mt-1">Gestión de órdenes de compra, proveedores y cuentas por pagar</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 border border-slate-300 text-slate-700 bg-white rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md shadow-blue-500/20 transition-all font-medium">
            <Plus className="w-5 h-5 mr-2" />
            Nueva Compra
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Inversión Mensual</p>
              <h3 className="text-3xl font-bold text-slate-900">S/ {totalPurchasesAmount.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <ShoppingCart className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Cuentas por Pagar</p>
              <h3 className="text-3xl font-bold text-slate-900">S/ {pendingPaymentsAmount.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-lg">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Órdenes en Proceso</p>
              <h3 className="text-3xl font-bold text-slate-900">{activeOrders}</h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-500 rounded-lg">
              <Truck className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Proveedores Activos</p>
              <h3 className="text-3xl font-bold text-slate-900">{uniqueSuppliers}</h3>
            </div>
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-lg">
              <Truck className="w-6 h-6" />
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
            placeholder="Buscar por orden o proveedor..."
            className="pl-10 pr-4 py-2.5 w-full border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:flex-none sm:min-w-[200px]">
            <select 
              className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2.5 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
            >
              {suppliers.map(sup => (
                <option key={sup} value={sup}>{sup}</option>
              ))}
            </select>
            <Filter className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative flex-1 sm:flex-none sm:min-w-[160px]">
            <select 
              className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2.5 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="Todos">Todos los Estados</option>
              <option value="Completado">Completado</option>
              <option value="Pendiente">Pendiente</option>
              <option value="En Tránsito">En Tránsito</option>
              <option value="Cancelado">Cancelado</option>
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
                  Orden <ArrowUpDown className="w-3 h-3" />
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Fecha Emisión
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Estado Logístico
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                  Total
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                  Pago
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPurchases.length > 0 ? (
                filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="inline-flex items-center font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                          <FileText className="w-4 h-4 mr-1.5 text-slate-400" />
                          {purchase.orderNumber}
                        </span>
                        <span className="text-xs text-slate-500 mt-1">{purchase.items} items</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-slate-900">{purchase.supplier}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-700 flex items-center">
                          <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                          {new Date(purchase.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        {purchase.status !== 'Completado' && purchase.status !== 'Cancelado' && (
                          <span className="text-xs text-slate-500 mt-1 flex items-center">
                            <span className="font-medium mr-1">Entrega:</span> 
                            {new Date(purchase.expectedDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {renderStatusBadge(purchase.status)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="font-bold text-slate-900">
                        S/ {purchase.total.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {renderPaymentBadge(purchase.paymentStatus)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Editar">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Eliminar">
                          <Trash2 className="w-4 h-4" />
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
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <ShoppingCart className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-base font-medium text-slate-600">No se encontraron órdenes de compra</p>
                      <p className="text-sm mt-1">Ajusta los filtros o crea una nueva orden.</p>
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
            Mostrando <span className="font-medium text-slate-900">{filteredPurchases.length}</span> de <span className="font-medium text-slate-900">{purchases.length}</span> órdenes
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