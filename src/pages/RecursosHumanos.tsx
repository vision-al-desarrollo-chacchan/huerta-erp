import  { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Users, 
  UserCheck, 
  Clock, 
  UserMinus,
  Edit, 
  Power,
  Eye,
  MoreVertical,
  Download,
  Phone,
  Briefcase,
  Calendar,
  CheckCircle,
  AlertCircle,
  ArrowUpDown,
  CreditCard
} from 'lucide-react';

// Interfaces
interface Employee {
  id: string;
  name: string;
  dni: string;
  position: string;
  area: string;
  phone: string;
  hireDate: string;
  status: 'Activo' | 'Inactivo' | 'Vacaciones' | 'Descanso Médico';
  todayAttendance: 'Presente' | 'Falta' | 'Tardanza' | 'Pendiente' | 'No Aplica';
}

// Datos de prueba (Mock Data adaptada al contexto)
const initialEmployees: Employee[] = [
  { id: '1', name: 'Carlos Mendoza', dni: '45678912', position: 'Administrador de Tienda', area: 'Administración', phone: '987654321', hireDate: '2024-01-15', status: 'Activo', todayAttendance: 'Presente' },
  { id: '2', name: 'Juan Pérez', dni: '78912345', position: 'Maestro Hornero', area: 'Cocina', phone: '912345678', hireDate: '2024-02-01', status: 'Activo', todayAttendance: 'Presente' },
  { id: '3', name: 'Ana Rojas', dni: '12345678', position: 'Cajera Principal', area: 'Caja', phone: '945612378', hireDate: '2024-03-10', status: 'Activo', todayAttendance: 'Tardanza' },
  { id: '4', name: 'Luis Silva', dni: '74185296', position: 'Ayudante de Cocina', area: 'Cocina', phone: '978456123', hireDate: '2025-06-20', status: 'Activo', todayAttendance: 'Falta' },
  { id: '5', name: 'María Gómez', dni: '96325874', position: 'Azafata', area: 'Salón', phone: '932165487', hireDate: '2025-08-01', status: 'Activo', todayAttendance: 'Pendiente' },
  { id: '6', name: 'Pedro Suárez', dni: '85296374', position: 'Motorizado', area: 'Delivery', phone: '965478123', hireDate: '2025-09-15', status: 'Vacaciones', todayAttendance: 'No Aplica' },
  { id: '7', name: 'Rosa Torres', dni: '15975348', position: 'Personal de Limpieza', area: 'Mantenimiento', phone: '998877665', hireDate: '2026-01-10', status: 'Descanso Médico', todayAttendance: 'No Aplica' },
  { id: '8', name: 'Miguel Vargas', dni: '35715928', position: 'Azafato', area: 'Salón', phone: '921456987', hireDate: '2024-11-05', status: 'Inactivo', todayAttendance: 'No Aplica' },
];

export default function RecursosHumanos() {
  const [employees] = useState<Employee[]>(initialEmployees);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState('Todas');
  const [selectedStatus, setSelectedStatus] = useState('Todos');

  // Áreas únicas para el filtro
  const areas = ['Todas', ...Array.from(new Set(employees.map(e => e.area)))];

  // Filtrado de trabajadores
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            emp.dni.includes(searchTerm);
      const matchesArea = selectedArea === 'Todas' || emp.area === selectedArea;
      const matchesStatus = selectedStatus === 'Todos' || emp.status === selectedStatus;
      
      return matchesSearch && matchesArea && matchesStatus;
    });
  }, [employees, searchTerm, selectedArea, selectedStatus]);

  // KPIs
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.status === 'Activo').length;
  const todayAttendances = employees.filter(e => e.todayAttendance === 'Presente' || e.todayAttendance === 'Tardanza').length;
  const pendingStaff = employees.filter(e => e.todayAttendance === 'Pendiente' && e.status === 'Activo').length;

  // Renderizadores de estado y asistencia
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Activo':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Activo</span>;
      case 'Inactivo':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">Inactivo</span>;
      case 'Vacaciones':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-200">Vacaciones</span>;
      case 'Descanso Médico':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Descanso Médico</span>;
      default:
        return null;
    }
  };

  const renderAttendanceBadge = (attendance: string) => {
    switch (attendance) {
      case 'Presente':
        return <span className="text-xs font-bold text-emerald-600 flex items-center"><CheckCircle className="w-3 h-3 mr-1" /> Presente</span>;
      case 'Tardanza':
        return <span className="text-xs font-bold text-amber-600 flex items-center"><AlertCircle className="w-3 h-3 mr-1" /> Tardanza</span>;
      case 'Falta':
        return <span className="text-xs font-bold text-rose-600 flex items-center"><AlertCircle className="w-3 h-3 mr-1" /> Falta</span>;
      case 'Pendiente':
        return <span className="text-xs font-bold text-slate-500 flex items-center"><Clock className="w-3 h-3 mr-1" /> Pendiente</span>;
      default:
        return <span className="text-xs font-medium text-slate-400">-</span>;
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Recursos Humanos</h1>
          <p className="text-sm text-slate-500 mt-1">Gestión de personal, planillas, asistencia y perfiles</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 border border-slate-300 text-slate-700 bg-white rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md shadow-blue-500/20 transition-all font-medium">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Trabajador
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Trabajadores</p>
              <h3 className="text-3xl font-bold text-slate-900">{totalEmployees}</h3>
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
              <p className="text-sm font-medium text-slate-500 mb-1">Trabajadores Activos</p>
              <h3 className="text-3xl font-bold text-slate-900">{activeEmployees}</h3>
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
              <p className="text-sm font-medium text-slate-500 mb-1">Asistencias del Día</p>
              <h3 className="text-3xl font-bold text-slate-900">{todayAttendances}</h3>
            </div>
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Personal Pendiente</p>
              <h3 className="text-3xl font-bold text-slate-900">{pendingStaff}</h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-500 rounded-lg">
              <UserMinus className="w-6 h-6" />
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
            placeholder="Buscar por nombre o DNI..."
            className="pl-10 pr-4 py-2.5 w-full border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:flex-none sm:min-w-[180px]">
            <select 
              className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2.5 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
            >
              {areas.map(area => (
                <option key={area} value={area}>{area === 'Todas' ? 'Todas las Áreas' : area}</option>
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
              <option value="Activo">Activos</option>
              <option value="Inactivo">Inactivos</option>
              <option value="Vacaciones">Vacaciones</option>
              <option value="Descanso Médico">Descanso Médico</option>
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
                  Trabajador <ArrowUpDown className="w-3 h-3" />
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Documento
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Cargo y Área
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Ingreso
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                  Asistencia Hoy
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
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold mr-3 border border-slate-300 shadow-sm">
                          {emp.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{emp.name}</span>
                          <span className="text-xs text-slate-500 flex items-center mt-0.5">
                            <Phone className="w-3 h-3 mr-1" /> {emp.phone}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="flex items-center text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded w-max border border-slate-200">
                        <CreditCard className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                        {emp.dni}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-800">{emp.position}</span>
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-max mt-1 flex items-center">
                          <Briefcase className="w-3 h-3 mr-1" /> {emp.area}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center text-sm text-slate-600">
                        <Calendar className="w-4 h-4 mr-1.5 text-slate-400" />
                        {new Date(emp.hireDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                        {renderAttendanceBadge(emp.todayAttendance)}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {renderStatusBadge(emp.status)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Ver Perfil Completo">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors" title="Editar Trabajador">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title={emp.status === 'Activo' ? 'Desactivar' : 'Activar'}>
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
                      <p className="text-base font-medium text-slate-600">No se encontraron trabajadores</p>
                      <p className="text-sm mt-1">Ajusta los filtros o registra un nuevo empleado.</p>
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
            Mostrando <span className="font-medium text-slate-900">{filteredEmployees.length}</span> de <span className="font-medium text-slate-900">{employees.length}</span> trabajadores
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