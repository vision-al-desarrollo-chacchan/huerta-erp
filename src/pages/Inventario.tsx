import  { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Download,
  Package,
  AlertTriangle,
  XCircle,
  Clock,
  CheckCircle,
  History,
  Calendar,
  ArrowRightLeft,
  Edit,
  Trash2,
  Box,
  TrendingDown,
  TrendingUp,
  RefreshCcw,
  X,
  Save,
  ShoppingCart
} from 'lucide-react';

// --- Interfaces ---
interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  expirationDate: string | null;
}

interface KardexMovement {
  id: string;
  date: string;
  productId: string;
  productName: string;
  type: 'Entrada por compra' | 'Salida por producción' | 'Salida por venta' | 'Ajuste';
  quantity: number;
  unit: string;
  responsible: string;
  notes: string;
}

type MovementType = KardexMovement['type'];

interface MovementForm {
  productId: string;
  type: MovementType;
  quantity: number;
  responsible: string;
  notes: string;
}

// --- Datos Iniciales ---
const TODAY = new Date('2026-08-07T00:00:00');

const initialProducts: Product[] = [
  { id: '1', code: 'POL-001', name: 'Pollo Crudo Entero', category: 'Cárnicos', unit: 'unid', stock: 15, minStock: 30, expirationDate: '2026-08-09' },
  { id: '2', code: 'PAP-001', name: 'Papa Canchán', category: 'Verduras', unit: 'kg', stock: 0, minStock: 50, expirationDate: '2026-08-15' },
  { id: '3', code: 'ACE-001', name: 'Aceite Vegetal Premium', category: 'Abarrotes', unit: 'litros', stock: 25, minStock: 10, expirationDate: '2027-02-10' },
  { id: '4', code: 'ARR-001', name: 'Arroz Extra', category: 'Abarrotes', unit: 'kg', stock: 45, minStock: 20, expirationDate: '2027-05-20' },
  { id: '5', code: 'CAR-001', name: 'Carbón Vegetal', category: 'Suministros', unit: 'kg', stock: 120, minStock: 50, expirationDate: '' },
  { id: '6', code: 'SAL-001', name: 'Mayonesa Alacena', category: 'Salsas', unit: 'litros', stock: 3, minStock: 5, expirationDate: '2026-08-12' },
  { id: '7', code: 'BEB-001', name: 'Gaseosa Inka Kola 1.5L', category: 'Bebidas', unit: 'unid', stock: 48, minStock: 24, expirationDate: '2026-12-01' },
  { id: '8', code: 'EMP-001', name: 'Envases Tecnopor', category: 'Empaques', unit: 'unid', stock: 500, minStock: 150, expirationDate: '' },
];

const initialMovements: KardexMovement[] = [
  { id: '1', date: '2026-08-07T08:30:00', productId: '1', productName: 'Pollo Crudo Entero', type: 'Salida por producción', quantity: 40, unit: 'unid', responsible: 'Juan (Hornero)', notes: 'Lote mañana' },
  { id: '2', date: '2026-08-07T09:00:00', productId: '2', productName: 'Papa Canchán', type: 'Salida por producción', quantity: 30, unit: 'kg', responsible: 'Luis (Freidora)', notes: 'Producción papas fritas' },
  { id: '3', date: '2026-08-06T15:00:00', productId: '3', productName: 'Aceite Vegetal Premium', type: 'Entrada por compra', quantity: 20, unit: 'litros', responsible: 'Fredy Ramirez', notes: 'Factura F001-4589' },
  { id: '4', date: '2026-08-06T12:30:00', productId: '7', productName: 'Gaseosa Inka Kola 1.5L', type: 'Salida por venta', quantity: 2, unit: 'unid', responsible: 'Ana (Caja)', notes: 'Venta salón' },
];

export default function Inventario() {
  // --- Estados de Datos con Persistencia (LocalStorage) ---
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('huerta_products');
      return saved ? JSON.parse(saved) : initialProducts;
    } catch {
      return initialProducts;
    }
  });

  const [movements, setMovements] = useState<KardexMovement[]>(() => {
    try {
      const saved = localStorage.getItem('huerta_movements');
      return saved ? JSON.parse(saved) : initialMovements;
    } catch {
      return initialMovements;
    }
  });
  
  // Guardar en localStorage cada vez que cambien
  useEffect(() => {
    localStorage.setItem('huerta_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('huerta_movements', JSON.stringify(movements));
  }, [movements]);
  
  // --- Estados de UI y Filtros ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [activeTab, setActiveTab] = useState<'catalogo' | 'vencimientos' | 'kardex' | 'recomendaciones'>('catalogo');

  // --- Estados de Modales ---
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

  // --- Estados Formularios ---
  const [productForm, setProductForm] = useState({ code: '', name: '', category: 'Cárnicos', unit: 'unid', stock: 0, minStock: 0, expirationDate: '' });
  const [movementForm, setMovementForm] = useState<MovementForm>({ productId: '', type: 'Entrada por compra', quantity: 0, responsible: '', notes: '' });

  // --- Lógica de Alertas y Vencimientos ---
  const getStockAlert = (stock: number, minStock: number) => {
    if (stock <= 0) return { level: 'Agotado', color: 'text-rose-700 bg-rose-50 border-rose-200', icon: XCircle };
    if (stock <= minStock) return { level: 'Bajo', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: AlertTriangle };
    return { level: 'Correcto', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle };
  };

  const getExpirationStatus = (dateString: string | null) => {
    if (!dateString) return { text: 'N/A', days: Infinity, color: 'text-slate-500' };
    const expDate = new Date(dateString);
    const diffTime = expDate.getTime() - TODAY.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: 'Vencido', days: diffDays, color: 'text-rose-600 bg-rose-50' };
    if (diffDays <= 7) return { text: 'Próx. a vencer', days: diffDays, color: 'text-amber-600 bg-amber-50' };
    return { text: 'Vigente', days: diffDays, color: 'text-emerald-600 bg-emerald-50' };
  };

  // --- KPIs y Filtros ---
  const categories = ['Todas', 'Cárnicos', 'Verduras', 'Abarrotes', 'Suministros', 'Salsas', 'Bebidas', 'Empaques', 'Otros'];
  
  const totalProducts = products.length;
  const outOfStock = products.filter(p => p.stock <= 0).length;
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
  const expiringSoon = products.filter(p => getExpirationStatus(p.expirationDate).days <= 7).length;

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
      const alert = getStockAlert(p.stock, p.minStock).level;
      const matchStatus = selectedStatus === 'Todos' || alert === selectedStatus;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [products, searchTerm, selectedCategory, selectedStatus]);

  const filteredMovements = useMemo(() => {
    return movements.filter(m => m.productName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [movements, searchTerm]);

  // Lista de recomendaciones de compra
  const purchaseRecommendations = useMemo(() => {
    return products.filter(p => p.stock <= p.minStock).map(p => {
      const suggestedAmount = (p.minStock * 2) - p.stock;
      return { ...p, suggestedAmount };
    }).sort((a, b) => a.stock - b.stock); // Ordenar por stock (agotados primero)
  }, [products]);

  // --- Exportar CSV ---
  const handleExportCSV = () => {
    const headers = ['Código', 'Producto', 'Categoría', 'Stock', 'Unidad', 'Estado de Stock'];
    const rows = products.map(p => {
      const alert = getStockAlert(p.stock, p.minStock).level;
      return [p.code, `"${p.name}"`, p.category, p.stock, p.unit, alert];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Inventario_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Acciones Formulario Producto ---
  const openNewProductModal = () => {
    setEditingProduct(null);
    setProductForm({ code: '', name: '', category: 'Cárnicos', unit: 'unid', stock: 0, minStock: 0, expirationDate: '' });
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      code: product.code,
      name: product.name,
      category: product.category,
      unit: product.unit,
      stock: product.stock,
      minStock: product.minStock,
      expirationDate: product.expirationDate || ''
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = () => {
    if (!productForm.name) return;
    
    let finalCode = productForm.code.trim();
    if (!finalCode) {
      finalCode = `INS-${(products.length + 1).toString().padStart(3, '0')}`;
    }

    if (editingProduct) {
      setProducts(products.map(p => p.id === editingProduct.id ? { 
        ...p, ...productForm, code: finalCode,
        stock: Number(productForm.stock), 
        minStock: Number(productForm.minStock) 
      } : p));
    } else {
      const newId = Date.now().toString();
      setProducts([...products, { 
        id: newId, 
        ...productForm, 
        code: finalCode,
        stock: Number(productForm.stock), 
        minStock: Number(productForm.minStock) 
      }]);
    }
    setIsProductModalOpen(false);
  };

  const handleDeleteProduct = (id: string) => {
    if(confirm('¿Estás seguro de eliminar este producto?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  // --- Acciones Formulario Movimiento ---
  const openMovementModal = () => {
    setMovementForm({ productId: products[0]?.id || '', type: 'Entrada por compra', quantity: 0, responsible: '', notes: '' });
    setIsMovementModalOpen(true);
  };

  const handleSaveMovement = () => {
    if (!movementForm.productId || movementForm.quantity === 0) return;
    
    const product = products.find(p => p.id === movementForm.productId);
    if (!product) return;

    const isExit = movementForm.type.includes('Salida');
    let qtyChange = Number(movementForm.quantity);

    // Validación de stock
    if (isExit) {
      qtyChange = -Math.abs(qtyChange);
      if (product.stock < Math.abs(qtyChange)) {
        alert(`❌ Error: Stock insuficiente. Solo tienes ${product.stock} ${product.unit} de ${product.name}.`);
        return;
      }
      if (!confirm(`¿Confirmar la salida de ${Math.abs(qtyChange)} ${product.unit} de ${product.name}?`)) {
        return;
      }
    } else if (movementForm.type === 'Ajuste') {
      // Permitir ajustes negativos y positivos
      qtyChange = Number(movementForm.quantity);
      if (qtyChange < 0 && product.stock < Math.abs(qtyChange)) {
        alert(`❌ Error: El ajuste negativo superaría el stock actual de ${product.stock}.`);
        return;
      }
    }

    // Actualizar Stock
    setProducts(products.map(p => {
      if (p.id === product.id) {
        return { ...p, stock: p.stock + qtyChange };
      }
      return p;
    }));

    // Registrar Movimiento
    const newMovement: KardexMovement = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      productId: product.id,
      productName: product.name,
      type: movementForm.type as KardexMovement['type'],
      quantity: Math.abs(Number(movementForm.quantity)),
      unit: product.unit,
      responsible: movementForm.responsible || 'Usuario Sistema',
      notes: movementForm.notes
    };
    
    setMovements([newMovement, ...movements]);
    setIsMovementModalOpen(false);
  };

  const getMovementIcon = (type: string) => {
    switch(type) {
      case 'Entrada por compra': return <TrendingUp className="w-4 h-4 text-emerald-500 mr-2" />;
      case 'Salida por producción': return <TrendingDown className="w-4 h-4 text-blue-500 mr-2" />;
      case 'Salida por venta': return <TrendingDown className="w-4 h-4 text-cyan-500 mr-2" />;
      case 'Ajuste': return <RefreshCcw className="w-4 h-4 text-amber-500 mr-2" />;
      default: return <ArrowRightLeft className="w-4 h-4 text-slate-500 mr-2" />;
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Inventario y Almacén</h1>
          <p className="text-sm text-slate-500 mt-1">Gestión de productos, insumos, alertas de stock y kardex</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={handleExportCSV}
            className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 border border-slate-300 text-slate-700 bg-white rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Inventario
          </button>
          <button 
            onClick={openMovementModal}
            className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-md transition-all font-medium"
          >
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Registrar Movimiento
          </button>
          <button 
            onClick={openNewProductModal}
            className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md shadow-blue-500/20 transition-all font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Productos</p>
              <h3 className="text-3xl font-bold text-slate-900">{totalProducts}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Package className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Stock Bajo</p>
              <h3 className="text-3xl font-bold text-slate-900">{lowStock}</h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-500 rounded-lg">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-rose-300 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Agotados</p>
              <h3 className="text-3xl font-bold text-slate-900">{outOfStock}</h3>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
              <XCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-cyan-300 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Próx. a Vencer</p>
              <h3 className="text-3xl font-bold text-slate-900">{expiringSoon}</h3>
            </div>
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 mb-6 gap-6 overflow-x-auto">
        <button onClick={() => setActiveTab('catalogo')} className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center whitespace-nowrap ${activeTab === 'catalogo' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <Box className="w-4 h-4 mr-2" /> Catálogo de Productos
        </button>
        <button onClick={() => setActiveTab('recomendaciones')} className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center whitespace-nowrap ${activeTab === 'recomendaciones' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <ShoppingCart className="w-4 h-4 mr-2" /> Recomendaciones de Compra
        </button>
        <button onClick={() => setActiveTab('vencimientos')} className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center whitespace-nowrap ${activeTab === 'vencimientos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <Calendar className="w-4 h-4 mr-2" /> Vencimientos
        </button>
        <button onClick={() => setActiveTab('kardex')} className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center whitespace-nowrap ${activeTab === 'kardex' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <History className="w-4 h-4 mr-2" /> Kardex / Movimientos
        </button>
      </div>

      {/* Toolbar Común de Búsqueda */}
      <div className="bg-white rounded-t-xl border-x border-t border-slate-200 p-5 flex flex-col lg:flex-row gap-4 justify-between items-center">
        <div className="relative w-full lg:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por producto, insumo o código..."
            className="pl-10 pr-4 py-2.5 w-full border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {activeTab === 'catalogo' && (
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-1 sm:flex-none sm:min-w-[160px]">
              <select 
                className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2.5 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <Filter className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative flex-1 sm:flex-none sm:min-w-[160px]">
              <select 
                className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2.5 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="Todos">Cualquier Estado</option>
                <option value="Correcto">Stock Correcto</option>
                <option value="Bajo">Stock Bajo</option>
                <option value="Agotado">Agotado</option>
              </select>
              <Filter className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* CONTENIDOS POR PESTAÑA */}

      {/* Tab 1: Catálogo de Productos */}
      {activeTab === 'catalogo' && (
        <div className="bg-white border border-slate-200 rounded-b-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Código</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Producto</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Categoría</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Stock Actual</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Stock Mínimo</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado / Alerta</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => {
                  const alert = getStockAlert(product.stock, product.minStock);
                  let msg = `🟢 Stock correcto`;
                  if (alert.level === 'Agotado') msg = `🔴 Comprar urgente`;
                  if (alert.level === 'Bajo') msg = `🟡 Stock bajo`;

                  return (
                    <tr key={product.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-700 font-mono text-xs border border-slate-200">
                          {product.code}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-900">{product.name}</td>
                      <td className="py-4 px-6 text-sm text-slate-600">{product.category}</td>
                      <td className="py-4 px-6 text-center">
                        <span className={`text-base font-bold ${alert.level === 'Agotado' ? 'text-rose-600' : 'text-slate-900'}`}>
                          {product.stock} <span className="text-xs font-normal text-slate-500">{product.unit}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center text-sm font-medium text-slate-500">
                        {product.minStock} {product.unit}
                      </td>
                      <td className="py-4 px-6">
                        <div className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-md border ${alert.color}`}>
                          {msg}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditProductModal(product)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Editar">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteProduct(product.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Eliminar">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No se encontraron productos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Mostrando <span className="font-medium text-slate-900">{filteredProducts.length}</span> productos
            </span>
          </div>
        </div>
      )}

      {/* Tab 2: Recomendaciones de Compra */}
      {activeTab === 'recomendaciones' && (
        <div className="bg-white border border-slate-200 rounded-b-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 bg-blue-50">
            <h2 className="text-lg font-bold text-blue-800 flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2" /> Recomendaciones de Compra Inteligente
            </h2>
            <p className="text-xs text-blue-700 mt-1">Sugerencias basadas en el stock mínimo requerido para la pollería.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Producto</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Categoría</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Stock Actual</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Mínimo</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Comprar Sugerido</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Prioridad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseRecommendations.length > 0 ? (
                  purchaseRecommendations.map(p => {
                    const alert = getStockAlert(p.stock, p.minStock);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-800">{p.name}</td>
                        <td className="py-4 px-6 text-sm text-slate-600">{p.category}</td>
                        <td className="py-4 px-6 text-center font-bold text-rose-600">{p.stock} <span className="text-xs font-normal">{p.unit}</span></td>
                        <td className="py-4 px-6 text-center text-slate-500">{p.minStock}</td>
                        <td className="py-4 px-6 text-center font-extrabold text-blue-600">{p.suggestedAmount} <span className="text-xs font-normal">{p.unit}</span></td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${alert.color}`}>
                            {alert.level === 'Agotado' ? '🔴 Urgente' : '🟡 Próximo'}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                      <p className="text-base font-medium text-slate-600">¡Todo en orden!</p>
                      <p className="text-sm mt-1">Ningún producto requiere abastecimiento urgente.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Vencimientos */}
      {activeTab === 'vencimientos' && (
        <div className="bg-white border border-slate-200 rounded-b-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 bg-amber-50">
            <h2 className="text-lg font-bold text-amber-800 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" /> Control de Vencimientos
            </h2>
            <p className="text-xs text-amber-700 mt-1">Monitoreo de insumos perecibles</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Producto</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock Actual</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha de Vencimiento</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Días Restantes</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products
                  .filter(p => p.expirationDate)
                  .sort((a, b) => new Date(a.expirationDate!).getTime() - new Date(b.expirationDate!).getTime())
                  .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((product) => {
                  const status = getExpirationStatus(product.expirationDate);
                  return (
                    <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-800">{product.name}</td>
                      <td className="py-4 px-6 text-sm font-medium text-slate-600">
                        {product.stock} {product.unit}
                      </td>
                      <td className="py-4 px-6 text-sm font-medium text-slate-700">
                        {new Date(product.expirationDate!).toLocaleDateString('es-PE')}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`font-bold ${status.days <= 7 ? 'text-rose-600' : 'text-slate-700'}`}>
                          {status.days} días
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Kardex / Movimientos */}
      {activeTab === 'kardex' && (
        <div className="bg-white border border-slate-200 rounded-b-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Producto</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Movimiento</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Cantidad</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Responsable</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.map((mov) => (
                  <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">
                          {new Date(mov.date).toLocaleDateString('es-PE')}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(mov.date).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-6 font-bold text-slate-800">{mov.productName}</td>
                    <td className="py-3 px-6">
                      <div className="flex items-center text-sm font-medium text-slate-700">
                        {getMovementIcon(mov.type)}
                        {mov.type}
                      </div>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <span className={`font-bold ${mov.type.includes('Entrada') || (mov.type==='Ajuste' && mov.quantity>0) ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {mov.type.includes('Entrada') || (mov.type==='Ajuste' && mov.quantity>0) ? '+' : '-'}{mov.quantity} <span className="text-xs font-normal opacity-70 text-slate-500">{mov.unit}</span>
                      </span>
                    </td>
                    <td className="py-3 px-6 text-sm text-slate-600">{mov.responsible}</td>
                    <td className="py-3 px-6 text-xs text-slate-500 italic">{mov.notes}</td>
                  </tr>
                ))}
                {filteredMovements.length === 0 && (
                   <tr>
                   <td colSpan={6} className="py-12 text-center text-slate-500">
                     No se encontraron movimientos.
                   </td>
                 </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 text-center">
            <span className="text-xs text-slate-500">El Kardex permite rastrear ingresos y salidas de almacén.</span>
          </div>
        </div>
      )}

      {/* --- MODAL FORMULARIO DE PRODUCTO --- */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                <Package className="w-5 h-5 mr-2 text-blue-600" /> 
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Nombre del Producto *</label>
                  <input type="text" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej. Pollo Crudo Entero" />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Código Personalizado (Opcional)</label>
                  <input type="text" value={productForm.code} onChange={e => setProductForm({...productForm, code: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none uppercase" placeholder="Ej. POL-001" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Categoría</label>
                  <select value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                    {categories.filter(c => c !== 'Todas').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Unidad de Medida</label>
                  <select value={productForm.unit} onChange={e => setProductForm({...productForm, unit: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                    <option value="unid">Unidades (unid)</option>
                    <option value="kg">Kilogramos (kg)</option>
                    <option value="litros">Litros (l)</option>
                    <option value="cajas">Cajas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Stock Inicial</label>
                  <input type="number" min="0" value={productForm.stock} onChange={e => setProductForm({...productForm, stock: Number(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Stock Mínimo (Alerta)</label>
                  <input type="number" min="0" value={productForm.minStock} onChange={e => setProductForm({...productForm, minStock: Number(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Fecha de Vencimiento (Opcional)</label>
                  <input type="date" value={productForm.expirationDate} onChange={e => setProductForm({...productForm, expirationDate: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700" />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsProductModalOpen(false)} className="px-5 py-2.5 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium">Cancelar</button>
              <button onClick={handleSaveProduct} disabled={!productForm.name} className="px-5 py-2.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium flex items-center disabled:opacity-50">
                <Save className="w-4 h-4 mr-2" /> Guardar Producto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL FORMULARIO DE MOVIMIENTO --- */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                <ArrowRightLeft className="w-5 h-5 mr-2 text-blue-600" /> 
                Registrar Movimiento
              </h2>
              <button onClick={() => setIsMovementModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex flex-col gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Producto / Insumo *</label>
                  <select value={movementForm.productId} onChange={e => setMovementForm({...movementForm, productId: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-medium text-slate-800">
                    <option value="" disabled>Seleccione un producto...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock} {p.unit})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tipo de Movimiento</label>
                  <select value={movementForm.type} onChange={e => setMovementForm({...movementForm, type: e.target.value as MovementType})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none appearance-none text-slate-700">
                    <option value="Entrada por compra">Entrada por compra (+)</option>
                    <option value="Salida por producción">Salida por producción (-)</option>
                    <option value="Salida por venta">Salida por venta (-)</option>
                    <option value="Ajuste">Ajuste de Inventario</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cantidad (± para Ajuste) *</label>
                  <input type="number" step="0.1" value={movementForm.quantity} onChange={e => setMovementForm({...movementForm, quantity: Number(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej. 10 o -5" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Responsable</label>
                  <input type="text" value={movementForm.responsible} onChange={e => setMovementForm({...movementForm, responsible: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej. Carlos Mendoza" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Notas / Referencia</label>
                  <input type="text" value={movementForm.notes} onChange={e => setMovementForm({...movementForm, notes: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej. Factura F002-1234, Merma, etc." />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsMovementModalOpen(false)} className="px-5 py-2.5 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium">Cancelar</button>
              <button onClick={handleSaveMovement} disabled={!movementForm.productId || movementForm.quantity === 0} className="px-5 py-2.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium flex items-center disabled:opacity-50">
                <CheckCircle className="w-4 h-4 mr-2" /> Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
