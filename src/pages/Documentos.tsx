import  { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Download,
  FileText,
  Clock,
  CheckCircle,
  Archive,
  ArrowUpDown,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  FileSignature,
  FileSpreadsheet,
  FileCode2,
  Receipt,
  Truck
} from 'lucide-react';

// Interfaces
interface DocumentItem {
  id: string;
  code: string;
  name: string;
  type: 'Contrato' | 'Factura' | 'Boleta' | 'Guía' | 'Reporte' | 'Otros';
  date: string;
  user: string;
  status: 'Pendiente' | 'Aprobado' | 'Archivado';
}

// Datos de prueba (Mock Data adaptada al contexto)
const initialDocuments: DocumentItem[] = [
  { id: '1', code: 'DOC-2608-001', name: 'Contrato Alquiler Local', type: 'Contrato', date: '2026-08-01T10:00:00', user: 'Fredy Ramirez', status: 'Aprobado' },
  { id: '2', code: 'FAC-001-4589', name: 'Factura Avícola San Fernando', type: 'Factura', date: '2026-08-05T14:30:00', user: 'Carlos Mendoza', status: 'Pendiente' },
  { id: '3', code: 'GUI-002-1245', name: 'Guía de Remisión Insumos', type: 'Guía', date: '2026-08-06T09:15:00', user: 'Ana Rojas', status: 'Aprobado' },
  { id: '4', code: 'REP-2607-001', name: 'Reporte Mensual Julio', type: 'Reporte', date: '2026-08-01T16:00:00', user: 'Fredy Ramirez', status: 'Archivado' },
  { id: '5', code: 'BOL-001-9985', name: 'Boleta de Venta - Evento', type: 'Boleta', date: '2026-08-07T11:20:00', user: 'Carlos Mendoza', status: 'Aprobado' },
  { id: '6', code: 'DOC-2608-002', name: 'Renovación Licencia de Funcionamiento', type: 'Otros', date: '2026-08-07T08:00:00', user: 'Fredy Ramirez', status: 'Pendiente' },
  { id: '7', code: 'FAC-002-1102', name: 'Factura Luz del Sur', type: 'Factura', date: '2026-08-04T10:45:00', user: 'Ana Rojas', status: 'Archivado' },
];

export default function Documentos() {
  const [documents] = useState<DocumentItem[]>(initialDocuments);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('Todos');
  const [selectedStatus, setSelectedStatus] = useState('Todos');

  // Filtrado de documentos
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            doc.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'Todos' || doc.type === selectedType;
      const matchesStatus = selectedStatus === 'Todos' || doc.status === selectedStatus;
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [documents, searchTerm, selectedType, selectedStatus]);

  // KPIs
  const totalDocuments = documents.length;
  const pendingDocuments = documents.filter(d => d.status === 'Pendiente').length;
  const approvedDocuments = documents.filter(d => d.status === 'Aprobado').length;
  // Consideramos recientes los últimos 3 en este mock
  const recentDocuments = 3; 

  // Renderizadores de estado y tipo
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Aprobado':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-3 h-3 mr-1" /> Aprobado</span>;
      case 'Pendiente':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3 h-3 mr-1" /> Pendiente</span>;
      case 'Archivado':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"><Archive className="w-3 h-3 mr-1" /> Archivado</span>;
      default:
        return null;
    }
  };

  const getDocIcon = (type: string) => {
    switch (type) {
      case 'Contrato': return <FileSignature className="w-4 h-4 text-blue-500" />;
      case 'Factura': return <Receipt className="w-4 h-4 text-emerald-500" />;
      case 'Boleta': return <Receipt className="w-4 h-4 text-cyan-500" />;
      case 'Guía': return <Truck className="w-4 h-4 text-amber-500" />;
      case 'Reporte': return <FileSpreadsheet className="w-4 h-4 text-purple-500" />;
      default: return <FileCode2 className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Documentos</h1>
          <p className="text-sm text-slate-500 mt-1">Gestión centralizada de archivos, contratos y comprobantes</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 border border-slate-300 text-slate-700 bg-white rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md shadow-blue-500/20 transition-all font-medium">
            <Plus className="w-5 h-5 mr-2" />
            Crear Documento
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Documentos</p>
              <h3 className="text-3xl font-bold text-slate-900">{totalDocuments}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Doc. Pendientes</p>
              <h3 className="text-3xl font-bold text-slate-900">{pendingDocuments}</h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-500 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Doc. Aprobados</p>
              <h3 className="text-3xl font-bold text-slate-900">{approvedDocuments}</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-cyan-300 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Recientes</p>
              <h3 className="text-3xl font-bold text-slate-900">{recentDocuments}</h3>
            </div>
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-lg">
              <FileSpreadsheet className="w-6 h-6" />
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
            placeholder="Buscar por código o nombre del documento..."
            className="pl-10 pr-4 py-2.5 w-full border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:flex-none sm:min-w-[160px]">
            <select 
              className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2.5 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="Todos">Tipo de Documento</option>
              <option value="Contrato">Contratos</option>
              <option value="Factura">Facturas</option>
              <option value="Boleta">Boletas</option>
              <option value="Guía">Guías</option>
              <option value="Reporte">Reportes</option>
              <option value="Otros">Otros</option>
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
              <option value="Pendiente">Pendientes</option>
              <option value="Aprobado">Aprobados</option>
              <option value="Archivado">Archivados</option>
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
                  Código <ArrowUpDown className="w-3 h-3" />
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Nombre del Documento
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Responsable
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
              {filteredDocuments.length > 0 ? (
                filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {doc.code}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-slate-900">{doc.name}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="p-1.5 bg-white border border-slate-200 rounded-md shadow-sm mr-2">
                          {getDocIcon(doc.type)}
                        </div>
                        <span className="text-sm text-slate-700 font-medium">{doc.type}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center text-sm text-slate-600">
                        {new Date(doc.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-slate-600">{doc.user}</span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {renderStatusBadge(doc.status)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Ver Documento">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Editar">
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
                      <FileText className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-base font-medium text-slate-600">No se encontraron documentos</p>
                      <p className="text-sm mt-1">Ajusta los filtros o crea un nuevo registro documental.</p>
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
            Mostrando <span className="font-medium text-slate-900">{filteredDocuments.length}</span> de <span className="font-medium text-slate-900">{documents.length}</span> documentos
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