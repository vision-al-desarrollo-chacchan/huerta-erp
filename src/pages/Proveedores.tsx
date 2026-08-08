import { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Building2, 
  UserCheck, 
  CreditCard,
  ShoppingCart,
  Edit, 
  Trash2, 
  ArrowUpDown,
  MoreVertical,
  Download,
  History,
  Phone,
  Mail,
  Building
} from 'lucide-react';

// Interfaces
interface Supplier {
  id: string;
  ruc: string;
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  status: 'Activo' | 'Inactivo';
  pendingBalance: number;
  monthlyPurchases: number;
}

// Datos de prueba (Mock Data adaptada para restaurante/pollería)
const initialSuppliers: Supplier[] = [
  { id: '1', ruc: '20100152356', businessName: 'Avícola San Fernando S.A.', contactName: 'Carlos Mendoza', phone: '987654321', email: 'ventas@sanfernando.pe', status: 'Activo', pendingBalance: 0, monthlyPurchases: 12500.00 },
  { id: '2', ruc: '20543219876', businessName: 'Distribuidora de Bebidas SAC', contactName: 'Ana Ruiz', phone: '912345678', email: 'pedidos@distribebidas.pe', status: 'Activo', pendingBalance: 1250.50, monthlyPurchases: 4800.00 },
  { id: '3', ruc: '10456789123', businessName: 'Mercado Central - Verduras', contactName: 'Juan Pérez', phone: '945612378', email: 'juan.perez@gmail.com', status: 'Activo', pendingBalance: 0, monthlyPurchases: 2300.00 },
  { id: '4', ruc: '20601234567', businessName: 'Empaques Ecológicos del Perú', contactName: 'Lucía Fernández', phone: '978456123', email: 'contacto@ecopack.pe', status: 'Activo', pendingBalance: 640.00, monthlyPurchases: 1200.00 },
  { id: '5', ruc: '10789456123', businessName: 'El Parrillero - Carbón', contactName: 'Miguel Torres', phone: '932165487', email: 'ventas@elparrillero.com', status: 'Activo', pendingBalance: 250.00, monthlyPurchases: 800.00 },
  { id: '6', ruc: '20894561237', businessName: 'Insumos Industriales Makro', contactName: 'Elena Castro', phone: '965478123', email: 'corporativo@makro.pe', status: 'Activo', pendingBalance: 0, monthlyPurchases: 5600.00 },
  { id: '7', ruc: '20123456789', businessName: 'Mantenimiento Equipos SAC', contactName: 'Roberto Gómez', phone: '998877665', email: 'soporte@mantenimiento.pe', status: 'Inactivo', pendingBalance: 0, monthlyPurchases: 0 },
];

export default function Proveedores() {
  const [suppliers] = useState<Supplier[]>(initialSuppliers);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Todos');

  // Filtrado de proveedores
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier => {
      const matchesSearch = supplier.businessName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            supplier.ruc.includes(searchTerm) ||
                            supplier.contactName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = selectedStatus === 'Todos' || supplier.status === selectedStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchTerm, selectedStatus]);

  // KPIs
  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter(s => s.status === 'Activo').length;
  const totalPendingBalance = suppliers.reduce((acc, s) => acc + s.pendingBalance, 0);
  const totalMonthlyPurchases = suppliers.reduce((acc, s) => acc + s.monthlyPurchases, 0);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Proveedores</h1>
          <p className="text-sm text-slate-500 mt-1">Gestión de proveedores, contactos y estado de cuentas</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 border border-slate-300 text-slate-700 bg-white rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md shadow-blue-500/20 transition-all font-medium">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Proveedores</p>
              <h3 className="text-3xl font-bold text-slate-900">{totalSuppliers}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Proveedores Activos</p>
              <h3 className="text-3xl font-bold text-slate-900">{activeSuppliers}</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Cuentas Pendientes</p>
              <h3 className="text-3xl font-bold text-slate-900">S/ {totalPendingBalance.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-500 rounded-lg">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Compras del Mes</p>
              <h3 className="text-3xl font-bold text-slate-900">S/ {totalMonthlyPurchases.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-lg">
              <ShoppingCart className="w-6 h-6" />
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
            placeholder="Buscar por RUC, nombre o contacto..."
            className="pl-10 pr-4 py-2.5 w-full border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <select 
              className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2.5 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="Todos">Todos los Estados</option>
              <option value="Activo">Activos</option>
              <option value="Inactivo">Inactivos</option>
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
                  RUC <ArrowUpDown className="w-3 h-3" />
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Razón Social / Comercial
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Teléfono
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Email
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
              {filteredSuppliers.length > 0 ? (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-4 px-6">
                      <span className="font-mono text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                        {supplier.ruc}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                          <Building className="h-4 w-4" />
                        </div>
                        <span className="font-semibold text-slate-900">{supplier.businessName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-slate-700">{supplier.contactName}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center text-sm text-slate-600">
                        <Phone className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                        {supplier.phone}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center text-sm text-slate-600">
                        <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                        {supplier.email}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        supplier.status === 'Activo' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {supplier.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-md transition-colors" title="Historial de Compras">
                          <History className="w-4 h-4" />
                        </button>
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
                      <Building2 className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-base font-medium text-slate-600">No se encontraron proveedores</p>
                      <p className="text-sm mt-1">Ajusta los filtros o intenta con otra búsqueda.</p>
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
            Mostrando <span className="font-medium text-slate-900">{filteredSuppliers.length}</span> de <span className="font-medium text-slate-900">{suppliers.length}</span> proveedores
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