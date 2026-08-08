import  { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Users, 
  UserCheck, 
  ShieldCheck, 
  ShoppingCart,
  Edit, 
  Power,
  Key,
  MoreVertical,
  Download,
  Mail,
  Phone,
  Shield,
  Clock,
  ArrowUpDown
} from 'lucide-react';

// Interfaces
interface User {
  id: string;
  name: string;
  email: string;
  role: 'Administrador' | 'Vendedor' | 'Cajero';
  phone: string;
  lastLogin: string;
  status: 'Activo' | 'Inactivo';
  modules: string[];
}

// Datos de prueba (Mock Data)
const initialUsers: User[] = [
  { 
    id: '1', 
    name: 'Fredy Ramirez', 
    email: 'admin@huertaerp.com', 
    role: 'Administrador', 
    phone: '987654321', 
    lastLogin: '2026-08-07T12:30:00', 
    status: 'Activo',
    modules: ['Dashboard', 'Ventas', 'Compras', 'Inventario', 'Caja', 'Reportes']
  },
  { 
    id: '2', 
    name: 'Ana Rojas', 
    email: 'arojas@huertaerp.com', 
    role: 'Cajero', 
    phone: '912345678', 
    lastLogin: '2026-08-07T08:15:00', 
    status: 'Activo',
    modules: ['Ventas', 'Caja']
  },
  { 
    id: '3', 
    name: 'Carlos Mendoza', 
    email: 'cmendoza@huertaerp.com', 
    role: 'Vendedor', 
    phone: '945612378', 
    lastLogin: '2026-08-06T18:45:00', 
    status: 'Activo',
    modules: ['Ventas', 'Clientes']
  },
  { 
    id: '4', 
    name: 'Lucía Fernández', 
    email: 'lfernandez@huertaerp.com', 
    role: 'Vendedor', 
    phone: '978456123', 
    lastLogin: '2026-08-05T14:20:00', 
    status: 'Inactivo',
    modules: ['Ventas', 'Clientes']
  },
  { 
    id: '5', 
    name: 'Miguel Torres', 
    email: 'mtorres@huertaerp.com', 
    role: 'Administrador', 
    phone: '932165487', 
    lastLogin: '2026-08-07T10:10:00', 
    status: 'Activo',
    modules: ['Dashboard', 'Ventas', 'Compras', 'Inventario', 'Caja', 'Reportes']
  },
];

export default function Usuarios() {
  const [users] = useState<User[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('Todos');
  const [selectedStatus, setSelectedStatus] = useState('Todos');

  // Filtrado de usuarios
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = selectedRole === 'Todos' || user.role === selectedRole;
      const matchesStatus = selectedStatus === 'Todos' || user.status === selectedStatus;
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, selectedRole, selectedStatus]);

  // KPIs
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'Activo').length;
  const adminUsers = users.filter(u => u.role === 'Administrador').length;
  const sellerUsers = users.filter(u => u.role === 'Vendedor').length;

  // Renderizadores de estado y rol
  const renderRoleBadge = (role: string) => {
    switch (role) {
      case 'Administrador':
        return <span className="inline-flex items-center text-xs font-semibold text-cyan-700 bg-cyan-50 border border-cyan-200 px-2.5 py-1 rounded-md"><Shield className="w-3 h-3 mr-1.5" /> Administrador</span>;
      case 'Vendedor':
        return <span className="inline-flex items-center text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md"><ShoppingCart className="w-3 h-3 mr-1.5" /> Vendedor</span>;
      case 'Cajero':
        return <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md"><Users className="w-3 h-3 mr-1.5" /> Cajero</span>;
      default:
        return <span className="inline-flex items-center text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">{role}</span>;
    }
  };

  const renderStatusBadge = (status: string) => {
    return status === 'Activo' 
      ? <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Activo</span>
      : <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">Inactivo</span>;
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Usuarios y Roles</h1>
          <p className="text-sm text-slate-500 mt-1">Gestión de accesos, permisos y personal del sistema</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 border border-slate-300 text-slate-700 bg-white rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md shadow-blue-500/20 transition-all font-medium">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Usuarios</p>
              <h3 className="text-3xl font-bold text-slate-900">{totalUsers}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Usuarios Activos</p>
              <h3 className="text-3xl font-bold text-slate-900">{activeUsers}</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Administradores</p>
              <h3 className="text-3xl font-bold text-slate-900">{adminUsers}</h3>
            </div>
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Vendedores</p>
              <h3 className="text-3xl font-bold text-slate-900">{sellerUsers}</h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
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
            placeholder="Buscar por nombre o correo..."
            className="pl-10 pr-4 py-2.5 w-full border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:flex-none sm:min-w-[180px]">
            <select 
              className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2.5 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="Todos">Todos los Roles</option>
              <option value="Administrador">Administradores</option>
              <option value="Vendedor">Vendedores</option>
              <option value="Cajero">Cajeros</option>
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
                  Nombre de Usuario <ArrowUpDown className="w-3 h-3" />
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Permisos / Módulos
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Último Acceso
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
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mr-3 border border-blue-200">
                          {user.name.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center text-sm text-slate-600">
                          <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                          {user.email}
                        </div>
                        <div className="flex items-center text-sm text-slate-600">
                          <Phone className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                          {user.phone}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {renderRoleBadge(user.role)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {user.modules.slice(0, 3).map((mod, idx) => (
                          <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                            {mod}
                          </span>
                        ))}
                        {user.modules.length > 3 && (
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                            +{user.modules.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center text-sm text-slate-600">
                        <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                        {new Date(user.lastLogin).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' })}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {renderStatusBadge(user.status)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-md transition-colors" title="Ver Permisos">
                          <Key className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Editar">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors" title={user.status === 'Activo' ? 'Desactivar' : 'Activar'}>
                          <Power className="w-4 h-4" />
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
                      <Users className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-base font-medium text-slate-600">No se encontraron usuarios</p>
                      <p className="text-sm mt-1">Ajusta los filtros o crea un nuevo usuario.</p>
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
            Mostrando <span className="font-medium text-slate-900">{filteredUsers.length}</span> de <span className="font-medium text-slate-900">{users.length}</span> usuarios
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