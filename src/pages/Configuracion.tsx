import  { useState } from 'react';
import { 
  Building2, 
  Store, 
  Sliders, 
  Settings, 
  Shield, 
  Save, 
  X, 
  Edit,
  Camera,
  Laptop,
  Smartphone,
  Globe,
  Bell,
  Moon,
  CheckCircle,
  Key
} from 'lucide-react';

export default function Configuracion() {
  const [activeTab, setActiveTab] = useState('empresa');
  const [isEditing, setIsEditing] = useState(false);

  // Estados de datos de prueba
  const [empresa, setEmpresa] = useState({
    ruc: '20123456789',
    razonSocial: 'INVERSIONES HUERTA S.A.C.',
    nombreComercial: 'Pollería Huerta',
    direccion: 'Av. Los Laureles 123, Trujillo, La Libertad',
    telefono: '987 654 321',
    email: 'contacto@huertaerp.com'
  });

  const [sucursal, setSucursal] = useState({
    nombre: 'Local Principal',
    direccion: 'Av. Los Laureles 123, Trujillo',
    estado: 'Activo'
  });

  const [parametros, setParametros] = useState({
    moneda: 'PEN',
    impuesto: '18',
    formato: 'Ticket 80mm',
    numeracionF: 'F001',
    numeracionB: 'B001'
  });

  const [preferencias, setPreferencias] = useState({
    notificacionesEmail: true,
    notificacionesPush: false,
    tema: 'Claro',
    idioma: 'Español (Perú)'
  });

  const tabs = [
    { id: 'empresa', label: 'Empresa', icon: Building2, desc: 'Información fiscal y comercial' },
    { id: 'sucursal', label: 'Sucursal', icon: Store, desc: 'Gestión de locales y estado' },
    { id: 'parametros', label: 'Parámetros', icon: Sliders, desc: 'Monedas, impuestos y series' },
    { id: 'preferencias', label: 'Preferencias', icon: Settings, desc: 'Notificaciones y apariencia' },
    { id: 'seguridad', label: 'Seguridad', icon: Shield, desc: 'Contraseñas y accesos' },
  ];

  const handleSave = () => {
    setIsEditing(false);
    // Simulación de guardado
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Restaurar datos originales (omitido en mockup)
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Configuración del Sistema</h1>
          <p className="text-sm text-slate-500 mt-1">Administre los parámetros generales y preferencias de Huerta ERP</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-sm transition-colors text-sm font-medium"
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar Información
            </button>
          ) : (
            <>
              <button 
                onClick={handleCancel}
                className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm transition-colors text-sm font-medium"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md shadow-blue-500/20 transition-all text-sm font-medium"
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar Cambios
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Menú lateral de configuración */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Menú de Ajustes</h3>
            </div>
            <div className="p-2 flex flex-col gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center text-left w-full px-4 py-3 rounded-lg transition-all ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div>
                      <span className="block font-semibold text-sm">{tab.label}</span>
                      <span className={`block text-xs mt-0.5 ${isActive ? 'text-blue-500' : 'text-slate-400'}`}>
                        {tab.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Área de contenido principal */}
        <div className="flex-1">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {/* 1. Empresa */}
            {activeTab === 'empresa' && (
              <div>
                <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center">
                    <Building2 className="w-5 h-5 mr-2 text-blue-600" /> Datos de la Empresa
                  </h2>
                  {isEditing && <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded">Modo Edición</span>}
                </div>
                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Logo */}
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 relative overflow-hidden group">
                        <span className="text-4xl font-extrabold text-slate-300">H</span>
                        {isEditing && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Camera className="w-8 h-8 text-white" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium">Logo de la Empresa</p>
                    </div>
                    
                    {/* Campos */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">RUC</label>
                        <input type="text" disabled={!isEditing} value={empresa.ruc} onChange={e => setEmpresa({...empresa, ruc: e.target.value})} className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2.5 px-4 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-70 text-sm font-medium" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Razón Social</label>
                        <input type="text" disabled={!isEditing} value={empresa.razonSocial} onChange={e => setEmpresa({...empresa, razonSocial: e.target.value})} className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2.5 px-4 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-70 text-sm font-medium" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Nombre Comercial</label>
                        <input type="text" disabled={!isEditing} value={empresa.nombreComercial} onChange={e => setEmpresa({...empresa, nombreComercial: e.target.value})} className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2.5 px-4 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-70 text-sm font-medium" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Teléfono</label>
                        <input type="text" disabled={!isEditing} value={empresa.telefono} onChange={e => setEmpresa({...empresa, telefono: e.target.value})} className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2.5 px-4 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-70 text-sm font-medium" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Dirección Fiscal</label>
                        <input type="text" disabled={!isEditing} value={empresa.direccion} onChange={e => setEmpresa({...empresa, direccion: e.target.value})} className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2.5 px-4 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-70 text-sm font-medium" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Correo Electrónico</label>
                        <input type="email" disabled={!isEditing} value={empresa.email} onChange={e => setEmpresa({...empresa, email: e.target.value})} className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2.5 px-4 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-70 text-sm font-medium" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Sucursal */}
            {activeTab === 'sucursal' && (
              <div>
                <div className="px-6 py-5 border-b border-slate-200 flex items-center bg-slate-50">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center">
                    <Store className="w-5 h-5 mr-2 text-cyan-600" /> Configuración de Sucursal
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Nombre de Sucursal</label>
                      <input type="text" disabled={!isEditing} value={sucursal.nombre} onChange={e => setSucursal({...sucursal, nombre: e.target.value})} className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2.5 px-4 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-70 text-sm font-medium" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Estado</label>
                      <select disabled={!isEditing} value={sucursal.estado} onChange={e => setSucursal({...sucursal, estado: e.target.value})} className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2.5 px-4 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-70 text-sm font-medium appearance-none">
                        <option value="Activo">Activo</option>
                        <option value="Inactivo">Inactivo</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Dirección de la Sucursal</label>
                      <input type="text" disabled={!isEditing} value={sucursal.direccion} onChange={e => setSucursal({...sucursal, direccion: e.target.value})} className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2.5 px-4 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-70 text-sm font-medium" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Parámetros */}
            {activeTab === 'parametros' && (
              <div>
                <div className="px-6 py-5 border-b border-slate-200 flex items-center bg-slate-50">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center">
                    <Sliders className="w-5 h-5 mr-2 text-emerald-600" /> Parámetros del Sistema
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Moneda Principal</label>
                      <select disabled={!isEditing} value={parametros.moneda} onChange={e => setParametros({...parametros, moneda: e.target.value})} className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2.5 px-4 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-70 text-sm font-medium appearance-none">
                        <option value="PEN">Soles (PEN - S/)</option>
                        <option value="USD">Dólares (USD - $)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Impuesto (IGV %)</label>
                      <input type="number" disabled={!isEditing} value={parametros.impuesto} onChange={e => setParametros({...parametros, impuesto: e.target.value})} className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2.5 px-4 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-70 text-sm font-medium" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Formato de Impresión</label>
                      <select disabled={!isEditing} value={parametros.formato} onChange={e => setParametros({...parametros, formato: e.target.value})} className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2.5 px-4 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-70 text-sm font-medium appearance-none">
                        <option value="Ticket 80mm">Ticket 80mm</option>
                        <option value="Ticket 58mm">Ticket 58mm</option>
                        <option value="A4">A4 (PDF)</option>
                      </select>
                    </div>
                    <div></div>
                    <div className="col-span-1 md:col-span-2 pt-4 border-t border-slate-100">
                      <h4 className="text-sm font-bold text-slate-800 mb-4">Numeración de Comprobantes</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Serie Factura</label>
                          <input type="text" disabled={!isEditing} value={parametros.numeracionF} onChange={e => setParametros({...parametros, numeracionF: e.target.value})} className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2.5 px-4 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-70 text-sm font-medium" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Serie Boleta</label>
                          <input type="text" disabled={!isEditing} value={parametros.numeracionB} onChange={e => setParametros({...parametros, numeracionB: e.target.value})} className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2.5 px-4 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-70 text-sm font-medium" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Preferencias */}
            {activeTab === 'preferencias' && (
              <div>
                <div className="px-6 py-5 border-b border-slate-200 flex items-center bg-slate-50">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-amber-600" /> Preferencias
                  </h2>
                </div>
                <div className="p-6">
                  <div className="max-w-2xl">
                    <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center"><Bell className="w-4 h-4 mr-2" /> Notificaciones</h4>
                    <div className="space-y-4 mb-8">
                      <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50 cursor-pointer">
                        <div>
                          <span className="block text-sm font-semibold text-slate-800">Alertas por Correo Electrónico</span>
                          <span className="block text-xs text-slate-500">Recibir reportes de cierre de caja y alertas de stock bajo.</span>
                        </div>
                        <div className={`w-12 h-6 rounded-full transition-colors relative ${preferencias.notificacionesEmail ? 'bg-blue-600' : 'bg-slate-300'}`}>
                          <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${preferencias.notificacionesEmail ? 'left-7' : 'left-1'}`}></div>
                        </div>
                      </label>
                      <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50 cursor-pointer">
                        <div>
                          <span className="block text-sm font-semibold text-slate-800">Notificaciones Push</span>
                          <span className="block text-xs text-slate-500">Avisos en tiempo real sobre nuevas órdenes en el navegador.</span>
                        </div>
                        <div className={`w-12 h-6 rounded-full transition-colors relative ${preferencias.notificacionesPush ? 'bg-blue-600' : 'bg-slate-300'}`}>
                          <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${preferencias.notificacionesPush ? 'left-7' : 'left-1'}`}></div>
                        </div>
                      </label>
                    </div>

                    <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center"><Moon className="w-4 h-4 mr-2" /> Apariencia y Región</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tema del Sistema</label>
                        <select disabled={!isEditing} value={preferencias.tema} onChange={e => setPreferencias({...preferencias, tema: e.target.value})} className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2.5 px-4 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-70 text-sm font-medium appearance-none">
                          <option value="Claro">Claro</option>
                          <option value="Oscuro">Oscuro</option>
                          <option value="Sistema">Sincronizar con el Sistema</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Idioma Local</label>
                        <select disabled={!isEditing} value={preferencias.idioma} onChange={e => setPreferencias({...preferencias, idioma: e.target.value})} className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2.5 px-4 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-70 text-sm font-medium appearance-none">
                          <option value="Español (Perú)">Español (Perú)</option>
                          <option value="Inglés">Inglés</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Seguridad */}
            {activeTab === 'seguridad' && (
              <div>
                <div className="px-6 py-5 border-b border-slate-200 flex items-center bg-slate-50">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-rose-600" /> Seguridad y Accesos
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Cambio Contraseña */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center"><Key className="w-4 h-4 mr-2" /> Cambiar Contraseña</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Contraseña Actual</label>
                          <input type="password" placeholder="••••••••" className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2.5 px-4 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-medium" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Nueva Contraseña</label>
                          <input type="password" placeholder="••••••••" className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2.5 px-4 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-medium" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Confirmar Contraseña</label>
                          <input type="password" placeholder="••••••••" className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2.5 px-4 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-medium" />
                        </div>
                        <button className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors text-sm font-medium mt-2">
                          Actualizar Contraseña
                        </button>
                      </div>
                    </div>

                    {/* Sesiones Activas */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center"><Globe className="w-4 h-4 mr-2" /> Sesiones Activas</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 border border-blue-200 bg-blue-50 rounded-lg">
                          <div className="flex items-center">
                            <Laptop className="w-8 h-8 text-blue-600 mr-3" />
                            <div>
                              <p className="text-sm font-bold text-slate-900">Windows • Chrome</p>
                              <p className="text-xs text-slate-500">Trujillo, Perú • IP: 190.234.xx.xx</p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-emerald-600 flex items-center"><CheckCircle className="w-3 h-3 mr-1" /> Actual</span>
                        </div>
                        <div className="flex items-center justify-between p-4 border border-slate-200 bg-white rounded-lg">
                          <div className="flex items-center">
                            <Smartphone className="w-8 h-8 text-slate-400 mr-3" />
                            <div>
                              <p className="text-sm font-bold text-slate-900">iPhone • Safari</p>
                              <p className="text-xs text-slate-500">Trujillo, Perú • Hace 2 horas</p>
                            </div>
                          </div>
                          <button className="text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 px-2 py-1 rounded">Cerrar</button>
                        </div>
                      </div>
                      <button className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                        Cerrar todas las demás sesiones
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}