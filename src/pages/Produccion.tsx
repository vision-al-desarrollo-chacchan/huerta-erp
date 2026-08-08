import { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Download,
  ChefHat,
  Flame,
  Package,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ClipboardList,
  CheckCircle,
  Clock,
  ArrowUpDown,
  MoreVertical,
  Scale,
  UtensilsCrossed,
  Trash2,
  FileCheck,
  Ban,
  Calculator,
  X,
  Save,
  ShoppingCart,
  History
} from 'lucide-react';

// --- Interfaces ---
interface ProductionBatch {
  id: string;
  time: string;
  product: string;
  quantity: number;
  unit: string;
  responsible: string;
  status: 'Terminado' | 'En Horno' | 'Preparando';
  cost: number;
}

interface FinishedProduct {
  id: string;
  name: string;
  produced: number;
  sold: number;
  unit: string;
  price: number; 
}

interface RawMaterial {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  dailyConsumption: number;
  unit: string;
}

interface Recipe {
  id: string;
  product: string;
  cost: number;
  salePrice: number;
  ingredients: {
    name: string;
    quantity: number;
    unit: string;
  }[];
}

interface WasteRecord {
  id: string;
  product: string;
  quantity: number;
  unit: string;
  reason: 'Quemado' | 'Vencido' | 'Sobrante' | 'Error de preparación';
  responsible: string;
  lostCost: number;
}

interface DailyClosure {
  id: string;
  date: string;
  time: string;
  responsible: string;
  producedItems: number;
  cost: number;
  estSales: number;
  waste: number;
  profit: number;
}

// --- Nueva Interfaz para Conexión Futura con Inventario ---
interface ProductionConsumption {
  id: string;
  date: string;
  productProduced: string;
  quantityProduced: number;
  material: string;
  quantityConsumed: number;
  unit: string;
}

// --- Datos de prueba iniciales ---
const initialBatches: ProductionBatch[] = [
  { id: '1', time: '11:00 AM', product: 'Pollo a la Brasa Entero', quantity: 30, unit: 'unid', responsible: 'Juan (Hornero)', status: 'Terminado', cost: 600.00 },
  { id: '2', time: '11:30 AM', product: 'Porción de Papas', quantity: 15, unit: 'porciones', responsible: 'Luis (Freidora)', status: 'Terminado', cost: 45.00 },
  { id: '3', time: '12:30 PM', product: 'Salchipapa', quantity: 20, unit: 'platos', responsible: 'Carlos (Cocina)', status: 'Terminado', cost: 70.00 },
];

const initialFinishedProducts: FinishedProduct[] = [
  { id: '1', name: 'Pollo a la Brasa Entero', produced: 30, sold: 12, unit: 'unid', price: 70 },
  { id: '2', name: '1/2 Pollo', produced: 0, sold: 14, unit: 'platos', price: 35 }, 
  { id: '3', name: '1/4 Pollo', produced: 0, sold: 25, unit: 'platos', price: 20 },
  { id: '4', name: 'Porción de Papas', produced: 60, sold: 45, unit: 'porciones', price: 10 },
  { id: '5', name: 'Arroz Chaufa', produced: 20, sold: 20, unit: 'porciones', price: 20 },
  { id: '6', name: 'Salchipapa', produced: 20, sold: 8, unit: 'platos', price: 15 },
];

const initialMaterials: RawMaterial[] = [
  { id: '1', name: 'Pollo Crudo (Macerado)', category: 'Cárnicos', currentStock: 8, minStock: 20, dailyConsumption: 80, unit: 'unid' }, 
  { id: '2', name: 'Papa Canchán Picada', category: 'Verduras', currentStock: 2, minStock: 30, dailyConsumption: 60, unit: 'kg' }, 
  { id: '3', name: 'Aceite Vegetal', category: 'Abarrotes', currentStock: 4, minStock: 5, dailyConsumption: 3, unit: 'litros' }, 
  { id: '4', name: 'Arroz', category: 'Abarrotes', currentStock: 45, minStock: 15, dailyConsumption: 10, unit: 'kg' }, 
  { id: '5', name: 'Carbón', category: 'Suministros', currentStock: 120, minStock: 50, dailyConsumption: 40, unit: 'kg' }, 
  { id: '6', name: 'Cremas (Mayonesa/Ají)', category: 'Salsas', currentStock: 9, minStock: 10, dailyConsumption: 5, unit: 'litros' }, 
  { id: '7', name: 'Envases Tecnopor/Cartón', category: 'Empaques', currentStock: 350, minStock: 100, dailyConsumption: 120, unit: 'unid' }, 
];

const initialWaste: WasteRecord[] = [
  { id: '1', product: 'Pollo a la Brasa Entero', quantity: 2, unit: 'unid', reason: 'Quemado', responsible: 'Juan (Hornero)', lostCost: 40.00 },
  { id: '2', product: 'Porción de Papas', quantity: 2, unit: 'kg', reason: 'Sobrante', responsible: 'Luis (Freidora)', lostCost: 6.00 },
];

const initialRecipes: Recipe[] = [
  { 
    id: '1', 
    product: 'Pollo a la Brasa Entero', 
    cost: 20.00, 
    salePrice: 70.00,
    ingredients: [
      { name: 'Pollo Crudo (Macerado)', quantity: 1, unit: 'unid' },
      { name: 'Carbón', quantity: 0.5, unit: 'kg' },
      { name: 'Papa Canchán Picada', quantity: 0.35, unit: 'kg' },
      { name: 'Envases Tecnopor/Cartón', quantity: 1, unit: 'unid' }
    ]
  },
  { 
    id: '2', 
    product: 'Porción de Papas', 
    cost: 3.00, 
    salePrice: 10.00,
    ingredients: [
      { name: 'Papa Canchán Picada', quantity: 0.35, unit: 'kg' },
      { name: 'Aceite Vegetal', quantity: 0.05, unit: 'litros' }
    ]
  },
  { 
    id: '3', 
    product: 'Salchipapa', 
    cost: 3.50, 
    salePrice: 15.00,
    ingredients: [
      { name: 'Papa Canchán Picada', quantity: 0.3, unit: 'kg' },
      { name: 'Hot Dog', quantity: 2, unit: 'unid' }
    ]
  }
];

export default function Produccion() {
  // --- Estados Persistentes (LocalStorage) ---
  const [batches, setBatches] = useState<ProductionBatch[]>(() => {
    try { const saved = localStorage.getItem('huerta_batches'); return saved ? JSON.parse(saved) : initialBatches; } catch { return initialBatches; }
  });
  const [finishedProducts, setFinishedProducts] = useState<FinishedProduct[]>(() => {
    try { const saved = localStorage.getItem('huerta_finishedProducts'); return saved ? JSON.parse(saved) : initialFinishedProducts; } catch { return initialFinishedProducts; }
  });
  const [materials, setMaterials] = useState<RawMaterial[]>(() => {
    try { const saved = localStorage.getItem('huerta_materials'); return saved ? JSON.parse(saved) : initialMaterials; } catch { return initialMaterials; }
  });
  const [waste, setWaste] = useState<WasteRecord[]>(() => {
    try { const saved = localStorage.getItem('huerta_waste'); return saved ? JSON.parse(saved) : initialWaste; } catch { return initialWaste; }
  });
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    try { const saved = localStorage.getItem('huerta_recipes'); return saved ? JSON.parse(saved) : initialRecipes; } catch { return initialRecipes; }
  });
  const [closures, setClosures] = useState<DailyClosure[]>(() => {
    try { const saved = localStorage.getItem('huerta_closures'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [consumptions, setConsumptions] = useState<ProductionConsumption[]>(() => {
    try { const saved = localStorage.getItem('huerta_consumptions'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });

  // --- Guardar en LocalStorage ---
  useEffect(() => { localStorage.setItem('huerta_batches', JSON.stringify(batches)); }, [batches]);
  useEffect(() => { localStorage.setItem('huerta_finishedProducts', JSON.stringify(finishedProducts)); }, [finishedProducts]);
  useEffect(() => { localStorage.setItem('huerta_materials', JSON.stringify(materials)); }, [materials]);
  useEffect(() => { localStorage.setItem('huerta_waste', JSON.stringify(waste)); }, [waste]);
  useEffect(() => { localStorage.setItem('huerta_recipes', JSON.stringify(recipes)); }, [recipes]);
  useEffect(() => { localStorage.setItem('huerta_closures', JSON.stringify(closures)); }, [closures]);
  useEffect(() => { localStorage.setItem('huerta_consumptions', JSON.stringify(consumptions)); }, [consumptions]);

  // --- Estados de UI ---
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'diaria' | 'vitrina' | 'insumos' | 'recetas' | 'mermas' | 'cierre'>('diaria');

  // --- Modales y Formularios ---
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [batchForm, setBatchForm] = useState({ product: '', customName: '', customCost: 0, customPrice: 0, quantity: 0, unit: 'unid', responsible: '', status: 'Preparando' });

  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false);
  const [wasteForm, setWasteForm] = useState({ product: '', quantity: 0, unit: 'unid', reason: 'Quemado', responsible: '', lostCost: 0 });

  // --- Cálculos de KPIs y Cierre Diario (Valores Reales del Estado) ---
  const totalProducedItems = finishedProducts.reduce((acc, p) => acc + p.produced, 0);
  const totalProductionCost = batches.reduce((acc, b) => acc + b.cost, 0);
  const actualRevenue = finishedProducts.reduce((acc, p) => acc + (p.sold * p.price), 0); // Venta real en base a lo vendido
  const totalWasteCost = waste.reduce((acc, w) => acc + w.lostCost, 0);
  const estimatedProfit = actualRevenue - totalProductionCost; // Margen bruto basado en ventas
  const realProfit = actualRevenue - totalProductionCost - totalWasteCost; // Ganancia real = Ventas - Costo - Merma
  
  const lowStockAlerts = materials.filter(m => m.currentStock <= m.minStock).length;

  // --- Filtrados ---
  const filteredMaterials = useMemo(() => materials.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase())), [materials, searchTerm]);
  const filteredBatches = useMemo(() => batches.filter(b => b.product.toLowerCase().includes(searchTerm.toLowerCase())), [batches, searchTerm]);
  const filteredWaste = useMemo(() => waste.filter(w => w.product.toLowerCase().includes(searchTerm.toLowerCase())), [waste, searchTerm]);
  const filteredFinished = useMemo(() => finishedProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())), [finishedProducts, searchTerm]);

  // --- Funciones de Lógica ---
  const getMaterialAlert = (mat: RawMaterial) => {
    const shortName = mat.name.split(' ')[0];
    if (mat.currentStock <= mat.minStock * 0.5) {
      return { level: 'critico', text: `🔴 Comprar urgente: ${shortName}`, color: 'text-rose-700 bg-rose-50 border-rose-200', icon: AlertTriangle };
    } else if (mat.currentStock <= mat.minStock) {
      return { level: 'bajo', text: `🟡 Próximo a comprar: ${shortName}`, color: 'text-amber-700 bg-amber-50 border-amber-200', icon: Clock };
    } else {
      return { level: 'suficiente', text: `🟢 Disponible: ${shortName}`, color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle };
    }
  };

  // --- PREPARAR CONEXIÓN FUTURA CON INVENTARIO ---
  const syncInventoryConsumption = (newConsumptions: ProductionConsumption[]) => {
    console.log(`[Futuro: Sincronizando con Inventario]`, newConsumptions);
  };

  // --- Manejadores de Eventos ---

  const handleSaveBatch = () => {
    if (!batchForm.product) {
      alert("⚠️ Debe seleccionar o escribir un producto.");
      return;
    }
    if (batchForm.quantity <= 0) {
      alert("⚠️ La cantidad debe ser mayor a cero.");
      return;
    }
    if (batchForm.product === 'Otro' && !batchForm.customName.trim()) {
      alert("⚠️ Debe ingresar el nombre del nuevo producto.");
      return;
    }

    const finalProductName = batchForm.product === 'Otro' ? batchForm.customName.trim() : batchForm.product;
    
    const recipe = recipes.find(r => r.product.toLowerCase() === finalProductName.toLowerCase());
    
    if (batchForm.product === 'Otro' && !recipe) {
      const newRecipe: Recipe = {
        id: Date.now().toString(),
        product: finalProductName,
        cost: Number(batchForm.customCost) || 0,
        salePrice: Number(batchForm.customPrice) || 0,
        ingredients: [] 
      };
      setRecipes([...recipes, newRecipe]);
    }

    const estimatedCost = batchForm.product === 'Otro' 
      ? Number(batchForm.customCost) * Number(batchForm.quantity)
      : (recipe ? recipe.cost * batchForm.quantity : batchForm.quantity * 5); 
      
    const salePrice = batchForm.product === 'Otro' 
      ? Number(batchForm.customPrice)
      : (recipe ? recipe.salePrice : 0);

    const newBatch: ProductionBatch = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      product: finalProductName,
      quantity: Number(batchForm.quantity),
      unit: batchForm.unit,
      responsible: batchForm.responsible || 'Usuario',
      status: batchForm.status as any,
      cost: estimatedCost
    };

    setBatches([newBatch, ...batches]);

    if (recipe && recipe.ingredients.length > 0) {
      const batchConsumptions: ProductionConsumption[] = recipe.ingredients.map(ing => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
        productProduced: finalProductName,
        quantityProduced: Number(batchForm.quantity),
        material: ing.name,
        quantityConsumed: ing.quantity * Number(batchForm.quantity),
        unit: ing.unit
      }));
      
      setConsumptions([...batchConsumptions, ...consumptions]);
      syncInventoryConsumption(batchConsumptions); 
    }

    if (batchForm.status === 'Terminado') {
      const existingProduct = finishedProducts.find(p => p.name.toLowerCase() === finalProductName.toLowerCase());
      if (existingProduct) {
        setFinishedProducts(finishedProducts.map(p => 
          p.name.toLowerCase() === finalProductName.toLowerCase() 
            ? { ...p, produced: p.produced + Number(batchForm.quantity), price: p.price || salePrice } 
            : p
        ));
      } else {
        setFinishedProducts([...finishedProducts, {
          id: Date.now().toString(),
          name: finalProductName,
          produced: Number(batchForm.quantity),
          sold: 0,
          unit: batchForm.unit,
          price: salePrice
        }]);
      }
    }

    setIsBatchModalOpen(false);
    setBatchForm({ product: '', customName: '', customCost: 0, customPrice: 0, quantity: 0, unit: 'unid', responsible: '', status: 'Preparando' });
  };

  const handleDeleteBatch = (id: string, product: string, quantity: number, status: string) => {
    if (!window.confirm('¿Eliminar esta orden de producción?')) return;
    setBatches(prev => prev.filter(b => b.id !== id));
    
    if (status === 'Terminado') {
      setFinishedProducts(prev => prev.map(p => {
        if (p.name === product) {
          return { ...p, produced: Math.max(0, p.produced - quantity) };
        }
        return p;
      }));
    }
  };

  const handleSaveWaste = () => {
    if (!wasteForm.product) {
      alert("⚠️ Debe ingresar el producto perdido.");
      return;
    }
    if (wasteForm.quantity <= 0) {
      alert("⚠️ La cantidad debe ser mayor a cero.");
      return;
    }

    const newWaste: WasteRecord = {
      id: Date.now().toString(),
      product: wasteForm.product,
      quantity: Number(wasteForm.quantity),
      unit: wasteForm.unit,
      reason: wasteForm.reason as any,
      responsible: wasteForm.responsible || 'Usuario',
      lostCost: Number(wasteForm.lostCost)
    };

    setWaste([newWaste, ...waste]);
    setIsWasteModalOpen(false);
    setWasteForm({ product: '', quantity: 0, unit: 'unid', reason: 'Quemado', responsible: '', lostCost: 0 });
  };

  const handleDeleteWaste = (id: string) => {
    if (!window.confirm('¿Eliminar este registro de merma?')) return;
    setWaste(prev => prev.filter(w => w.id !== id));
  };

  const handleRegisterSale = (id: string) => {
    const qtyStr = window.prompt('Ingrese la cantidad vendida:');
    if (!qtyStr) return;
    const qty = parseInt(qtyStr, 10);
    if (isNaN(qty) || qty <= 0) {
      alert("⚠️ Cantidad inválida.");
      return;
    }
    
    setFinishedProducts(prev => prev.map(p => {
      if (p.id === id) {
        const available = p.produced - p.sold;
        if (qty > available && p.produced > 0) {
          alert(`❌ No hay suficiente stock en vitrina. Disponible: ${available}`);
          return p;
        }
        return { ...p, sold: p.sold + qty };
      }
      return p;
    }));
  };

  const handleExportCSV = () => {
    const headers = ['Hora', 'Producto', 'Cantidad', 'Unidad', 'Responsable', 'Estado', 'Costo'];
    const rows = batches.map(b => [b.time, `"${b.product}"`, b.quantity, b.unit, `"${b.responsible}"`, b.status, b.cost.toFixed(2)]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Produccion_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleApproveClose = () => {
    if (batches.length === 0 && waste.length === 0 && totalProducedItems === 0) {
      alert('⚠️ No hay datos de producción o merma para cerrar en el día actual.');
      return;
    }

    if(!window.confirm('¿Está seguro de aprobar el cierre diario? Se guardará en el historial y se limpiará la producción del día actual.')) return;
    
    const responsibleName = window.prompt('Nombre del responsable del cierre:', 'Admin') || 'Admin';

    const newClosure: DailyClosure = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('es-PE'),
      time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      responsible: responsibleName,
      producedItems: totalProducedItems,
      cost: totalProductionCost,
      estSales: actualRevenue,
      waste: totalWasteCost,
      profit: realProfit
    };

    setClosures([newClosure, ...closures]);

    setBatches([]);
    setWaste([]);
    setFinishedProducts(prev => prev.map(p => ({ ...p, produced: 0, sold: 0 })));
    
    alert('✅ Cierre diario aprobado y guardado correctamente en el historial.');
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Producción y Cocina</h1>
          <p className="text-sm text-slate-500 mt-1">Control de horneado, insumos, vitrina y mermas de la pollería</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <button 
            onClick={handleExportCSV}
            className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition-colors shadow-sm font-medium"
          >
            <Download className="w-4 h-4 mr-2" />
            Reporte Diario
          </button>
          <button 
            onClick={() => setIsWasteModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors shadow-sm font-medium"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Registrar Merma
          </button>
          <button 
            onClick={() => setIsBatchModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md shadow-blue-500/20 transition-all font-medium"
          >
            <Flame className="w-5 h-5 mr-2" />
            Nueva Producción
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Platos Preparados</p>
              <h3 className="text-3xl font-bold text-slate-900">{totalProducedItems}</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Costo Producción</p>
              <h3 className="text-3xl font-bold text-slate-900">S/ {totalProductionCost.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-cyan-300 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Venta Estimada</p>
              <h3 className="text-3xl font-bold text-cyan-600">S/ {actualRevenue.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-rose-300 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Alertas Insumos</p>
              <h3 className="text-3xl font-bold text-rose-600">{lowStockAlerts}</h3>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 mb-6 gap-6 overflow-x-auto">
        <button onClick={() => setActiveTab('diaria')} className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center whitespace-nowrap ${activeTab === 'diaria' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <ClipboardList className="w-4 h-4 mr-2" /> Producción Diaria
        </button>
        <button onClick={() => setActiveTab('vitrina')} className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center whitespace-nowrap ${activeTab === 'vitrina' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <Package className="w-4 h-4 mr-2" /> Productos Listos (Vitrina)
        </button>
        <button onClick={() => setActiveTab('insumos')} className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center whitespace-nowrap ${activeTab === 'insumos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <Scale className="w-4 h-4 mr-2" /> Control de Insumos
        </button>
        <button onClick={() => setActiveTab('mermas')} className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center whitespace-nowrap ${activeTab === 'mermas' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <Trash2 className="w-4 h-4 mr-2" /> Merma del Día
        </button>
        <button onClick={() => setActiveTab('recetas')} className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center whitespace-nowrap ${activeTab === 'recetas' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <ChefHat className="w-4 h-4 mr-2" /> Recetas y Costos
        </button>
        <button onClick={() => setActiveTab('cierre')} className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center whitespace-nowrap ${activeTab === 'cierre' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <FileCheck className="w-4 h-4 mr-2" /> Cierre Diario
        </button>
      </div>

      {/* Toolbar Común de Búsqueda */}
      {['diaria', 'insumos', 'vitrina', 'mermas'].includes(activeTab) && (
        <div className="bg-white rounded-t-xl border-x border-t border-slate-200 p-5 flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="relative w-full lg:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar producto o insumo..."
              className="pl-10 pr-4 py-2.5 w-full border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* CONTENIDOS POR PESTAÑA */}

      {/* Tab 1: Producción Diaria */}
      {activeTab === 'diaria' && (
        <div className="bg-white border border-slate-200 rounded-b-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Hora</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Producto / Lote</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cantidad</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Responsable</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Estado</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Costo (S/)</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-4 px-6">
                      <span className="flex items-center text-sm font-medium text-slate-600">
                        <Clock className="w-4 h-4 mr-1.5 text-slate-400" />
                        {batch.time}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-900">{batch.product}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                        {batch.quantity} <span className="text-xs text-slate-500 font-normal">{batch.unit}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600">
                      {batch.responsible}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {batch.status === 'Terminado' && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-3 h-3 mr-1" /> Terminado</span>}
                      {batch.status === 'En Horno' && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200"><Flame className="w-3 h-3 mr-1 animate-pulse" /> En Horno</span>}
                      {batch.status === 'Preparando' && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"><ChefHat className="w-3 h-3 mr-1" /> Preparando</span>}
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-slate-900">
                      {batch.cost.toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleDeleteBatch(batch.id, batch.product, batch.quantity, batch.status)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Eliminar Orden">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredBatches.length === 0 && (
                   <tr>
                   <td colSpan={7} className="py-12 text-center text-slate-500">
                     No se encontró producción registrada.
                   </td>
                 </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Productos Listos (Vitrina) */}
      {activeTab === 'vitrina' && (
        <div className="bg-white border border-slate-200 rounded-b-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Producto</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Preparados</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Vendidos</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Disponibles</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4">Rotación</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFinished.map((prod) => {
                  const available = prod.produced - prod.sold > 0 ? prod.produced - prod.sold : 0;
                  const percentSold = prod.produced > 0 ? (prod.sold / prod.produced) * 100 : (prod.sold > 0 ? 100 : 0);
                  
                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-4 px-6 font-bold text-slate-900">{prod.name}</td>
                      <td className="py-4 px-6 text-center font-medium text-slate-600">{prod.produced} <span className="text-xs text-slate-400">{prod.unit}</span></td>
                      <td className="py-4 px-6 text-center font-bold text-emerald-600">{prod.sold} <span className="text-xs font-normal opacity-70">{prod.unit}</span></td>
                      <td className="py-4 px-6 text-center">
                        <span className={`font-bold px-2 py-1 rounded ${available === 0 ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-700'}`}>
                          {available} <span className="text-xs font-normal opacity-70">{prod.unit}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${percentSold >= 90 ? 'bg-emerald-500' : percentSold >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`} 
                            style={{ width: `${Math.min(percentSold, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1 block">{Math.round(percentSold)}% vendido</span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button 
                          onClick={() => handleRegisterSale(prod.id)}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors flex items-center ml-auto"
                        >
                          <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Vender
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Control de Insumos */}
      {activeTab === 'insumos' && (
        <div className="bg-white border border-slate-200 rounded-b-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Insumo</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Stock Actual</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Stock Mínimo</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Consumo Diario Estim.</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado / Alerta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMaterials.map((mat) => {
                  const alert = getMaterialAlert(mat);
                  const Icon = alert.icon;
                  
                  return (
                    <tr key={mat.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-800">{mat.name}</p>
                        <p className="text-xs text-slate-500">{mat.category}</p>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`text-lg font-bold ${alert.level === 'critico' ? 'text-rose-600' : alert.level === 'bajo' ? 'text-amber-600' : 'text-slate-900'}`}>
                          {mat.currentStock} <span className="text-sm font-normal text-slate-500">{mat.unit}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center text-sm font-medium text-slate-500">
                        {mat.minStock} {mat.unit}
                      </td>
                      <td className="py-4 px-6 text-center text-sm text-slate-600">
                        {mat.dailyConsumption} {mat.unit}
                      </td>
                      <td className="py-4 px-6">
                        <div className={`flex items-center text-xs font-bold px-3 py-1.5 rounded border w-max ${alert.color}`}>
                          <Icon className="w-4 h-4 mr-1.5" /> 
                          {alert.text}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Mermas del Día */}
      {activeTab === 'mermas' && (
        <div className="bg-white border border-slate-200 rounded-b-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Producto Perdido</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Cantidad</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Motivo</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Responsable</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Costo Perdido (S/)</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWaste.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-4 px-6 font-bold text-slate-800">{w.product}</td>
                    <td className="py-4 px-6 text-center">
                      <span className="text-sm font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                        {w.quantity} <span className="text-xs text-slate-500 font-normal">{w.unit}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
                        <Ban className="w-3 h-3 mr-1" /> {w.reason}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600">{w.responsible}</td>
                    <td className="py-4 px-6 text-right font-bold text-rose-600">S/ {w.lostCost.toFixed(2)}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleDeleteWaste(w.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Eliminar Merma">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredWaste.length === 0 && (
                   <tr>
                   <td colSpan={6} className="py-12 text-center text-slate-500">
                     No se encontraron mermas registradas.
                   </td>
                 </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Recetas y Costos */}
      {activeTab === 'recetas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => {
            const margin = recipe.salePrice > 0 ? ((recipe.salePrice - recipe.cost) / recipe.salePrice) * 100 : 0;
            return (
              <div key={recipe.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg leading-tight pr-2">{recipe.product}</h3>
                  </div>
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-lg shrink-0">
                    <ChefHat className="w-5 h-5" />
                  </div>
                </div>
                <div className="p-5 flex-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Ingredientes por plato</h4>
                  {recipe.ingredients.length > 0 ? (
                    <ul className="space-y-2 mb-4">
                      {recipe.ingredients.map((ing, idx) => (
                        <li key={idx} className="flex justify-between text-sm items-center border-b border-slate-50 pb-2 last:border-0">
                          <span className="text-slate-700 flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-2"></span> {ing.name}</span>
                          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">{ing.quantity} {ing.unit}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No hay ingredientes registrados (Producto personalizado).</p>
                  )}
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-slate-500">Costo Aprox.</span>
                    <span className="font-bold text-rose-600">S/ {recipe.cost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-semibold text-slate-500">Precio Venta</span>
                    <span className="font-bold text-emerald-600 text-lg">S/ {recipe.salePrice.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mb-1">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${margin}%` }}></div>
                  </div>
                  <p className="text-[10px] text-right text-slate-500 font-medium">Margen: {margin.toFixed(0)}%</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tab 6: Cierre Diario */}
      {activeTab === 'cierre' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-6 border-b border-slate-100 gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 flex items-center">
                <Calculator className="w-7 h-7 mr-3 text-emerald-600" />
                Cierre de Producción Diario
              </h2>
              <p className="text-sm text-slate-500 mt-1">Resumen financiero y operativo calculado automáticamente.</p>
            </div>
            <button onClick={handleApproveClose} className="w-full md:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-md transition-colors flex items-center justify-center">
              <CheckCircle className="w-4 h-4 mr-2" /> Aprobar Cierre
            </button>
          </div>

          {/* Resumen del Día Actual */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col justify-center">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Costo Total Producción</span>
              <span className="text-4xl font-extrabold text-slate-800">S/ {totalProductionCost.toFixed(2)}</span>
              <div className="mt-4 pt-4 border-t border-slate-200">
                <span className="flex items-center text-sm font-medium text-slate-600">
                  <UtensilsCrossed className="w-4 h-4 mr-2 text-slate-400" />
                  Productos preparados: <strong className="ml-1 text-slate-900">{totalProducedItems}</strong>
                </span>
              </div>
            </div>

            <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 flex flex-col justify-center">
              <span className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-2">Ventas Reales (Basado en venta)</span>
              <span className="text-4xl font-extrabold text-emerald-700">S/ {actualRevenue.toFixed(2)}</span>
              <div className="mt-4 pt-4 border-t border-emerald-200/60">
                <span className="flex items-center text-sm font-medium text-emerald-700">
                  <TrendingUp className="w-4 h-4 mr-2 opacity-70" />
                  Margen bruto: <strong className="ml-1">S/ {estimatedProfit.toFixed(2)}</strong>
                </span>
              </div>
            </div>

            <div className="bg-rose-50 p-6 rounded-xl border border-rose-100 flex flex-col justify-center">
              <span className="text-sm font-bold text-rose-600 uppercase tracking-wider mb-2">Total de Merma</span>
              <span className="text-4xl font-extrabold text-rose-700">S/ {totalWasteCost.toFixed(2)}</span>
              <div className="mt-4 pt-4 border-t border-rose-200/60">
                <span className="flex items-center text-sm font-medium text-rose-700">
                  <Trash2 className="w-4 h-4 mr-2 opacity-70" />
                  Impacto en rentabilidad: <strong className="ml-1">Negativo</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-8 text-white flex flex-col md:flex-row justify-between items-center shadow-lg relative overflow-hidden mb-12">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-20 -mr-20 -mt-20"></div>
            <div className="relative z-10 mb-4 md:mb-0">
              <h3 className="text-lg font-medium text-slate-300">Ganancia Real del Día (Proyectada a ventas)</h3>
              <p className="text-sm text-slate-400 mt-1">Ventas Reales - (Costo de prod. + Mermas)</p>
            </div>
            <div className="relative z-10 text-right">
              <span className="text-5xl font-extrabold text-emerald-400 drop-shadow-md">S/ {realProfit.toFixed(2)}</span>
            </div>
          </div>

          {/* Historial de Cierres Diarios */}
          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
              <History className="w-5 h-5 mr-2 text-slate-500" /> Historial de Cierres Diarios
            </h3>
            
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha / Hora</th>
                      <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Responsable</th>
                      <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Producción</th>
                      <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Costos (S/)</th>
                      <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ventas (S/)</th>
                      <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Merma (S/)</th>
                      <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ganancia (S/)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {closures.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6">
                          <span className="font-medium text-slate-900 block">{c.date}</span>
                          <span className="text-xs text-slate-500">{c.time}</span>
                        </td>
                        <td className="py-4 px-6 text-center text-sm text-slate-600">{c.responsible}</td>
                        <td className="py-4 px-6 text-center text-sm font-semibold text-slate-700 bg-slate-50">{c.producedItems} unid.</td>
                        <td className="py-4 px-6 text-right font-medium text-slate-800">{c.cost.toFixed(2)}</td>
                        <td className="py-4 px-6 text-right font-bold text-emerald-600">{c.estSales.toFixed(2)}</td>
                        <td className="py-4 px-6 text-right font-medium text-rose-500">{c.waste.toFixed(2)}</td>
                        <td className="py-4 px-6 text-right font-extrabold text-blue-600">{c.profit.toFixed(2)}</td>
                      </tr>
                    ))}
                    {closures.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          Aún no hay cierres registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL NUEVA PRODUCCIÓN --- */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                <Flame className="w-5 h-5 mr-2 text-blue-600" /> 
                Registrar Nueva Producción
              </h2>
              <button onClick={() => setIsBatchModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="flex flex-col gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Producto / Receta *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input 
                      type="text" 
                      value={batchForm.product} 
                      onChange={e => {
                        setBatchForm({...batchForm, product: e.target.value});
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                      className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-800"
                      placeholder="Buscar o escribir nombre del producto..." 
                      autoComplete="off"
                    />
                    {showProductDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {recipes
                          .filter(r => r.product.toLowerCase().includes(batchForm.product.toLowerCase()))
                          .map(r => (
                          <div 
                            key={r.id} 
                            className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-sm text-slate-700 flex items-center"
                            onClick={() => {
                              setBatchForm({...batchForm, product: r.product});
                              setShowProductDropdown(false);
                            }}
                          >
                            <ChefHat className="w-4 h-4 mr-2 text-slate-400" />
                            {r.product}
                          </div>
                        ))}
                        {batchForm.product && !recipes.find(r => r.product.toLowerCase() === batchForm.product.toLowerCase()) && (
                          <div 
                            className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm font-medium text-blue-600 border-t border-slate-100 flex items-center"
                            onClick={() => {
                              setBatchForm({...batchForm, product: 'Otro', customName: batchForm.product});
                              setShowProductDropdown(false);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Crear producto personalizado: "{batchForm.product}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {batchForm.product === 'Otro' && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex flex-col gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">Nombre del Producto *</label>
                      <input type="text" value={batchForm.customName} onChange={e => setBatchForm({...batchForm, customName: e.target.value})} className="w-full border border-blue-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Ej. Chaufa Especial" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">Costo Total Prod. (S/)</label>
                        <input type="number" min="0" step="0.1" value={batchForm.customCost} onChange={e => setBatchForm({...batchForm, customCost: Number(e.target.value)})} className="w-full border border-blue-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Ej. 50.00" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">Precio Venta Unit. (S/)</label>
                        <input type="number" min="0" step="0.1" value={batchForm.customPrice} onChange={e => setBatchForm({...batchForm, customPrice: Number(e.target.value)})} className="w-full border border-blue-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Ej. 15.00" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cantidad *</label>
                    <input type="number" min="0.1" step="0.1" value={batchForm.quantity} onChange={e => setBatchForm({...batchForm, quantity: Number(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej. 10" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Unidad</label>
                    <select value={batchForm.unit} onChange={e => setBatchForm({...batchForm, unit: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                      <option value="unid">Unidades</option>
                      <option value="porciones">Porciones</option>
                      <option value="platos">Platos</option>
                      <option value="kg">Kilogramos</option>
                      <option value="litros">Litros</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Responsable</label>
                  <input type="text" value={batchForm.responsible} onChange={e => setBatchForm({...batchForm, responsible: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej. Juan (Hornero)" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Estado</label>
                  <select value={batchForm.status} onChange={e => setBatchForm({...batchForm, status: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                    <option value="Preparando">Preparando</option>
                    <option value="En Horno">En Horno / Cocción</option>
                    <option value="Terminado">Terminado (Listo para Vitrina)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsBatchModalOpen(false)} className="px-5 py-2.5 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium">Cancelar</button>
              <button 
                onClick={handleSaveBatch} 
                disabled={!batchForm.product || batchForm.quantity <= 0 || (batchForm.product === 'Otro' && !batchForm.customName)} 
                className="px-5 py-2.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium flex items-center disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" /> Guardar Producción
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL REGISTRAR MERMA --- */}
      {isWasteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-rose-50 shrink-0">
              <h2 className="text-lg font-bold text-rose-900 flex items-center">
                <Trash2 className="w-5 h-5 mr-2 text-rose-600" /> 
                Registrar Merma / Pérdida
              </h2>
              <button onClick={() => setIsWasteModalOpen(false)} className="text-rose-400 hover:text-rose-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="flex flex-col gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Producto *</label>
                  <input type="text" value={wasteForm.product} onChange={e => setWasteForm({...wasteForm, product: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-rose-500 outline-none" placeholder="Ej. Pollo Entero, Papas, etc." />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cantidad *</label>
                    <input type="number" min="0.1" step="0.1" value={wasteForm.quantity} onChange={e => setWasteForm({...wasteForm, quantity: Number(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-rose-500 outline-none" placeholder="Ej. 2" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Unidad</label>
                    <select value={wasteForm.unit} onChange={e => setWasteForm({...wasteForm, unit: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-rose-500 outline-none appearance-none">
                      <option value="unid">Unidades</option>
                      <option value="porciones">Porciones</option>
                      <option value="kg">Kilogramos</option>
                      <option value="litros">Litros</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Motivo</label>
                  <select value={wasteForm.reason} onChange={e => setWasteForm({...wasteForm, reason: e.target.value as any})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-rose-500 outline-none appearance-none">
                    <option value="Quemado">Quemado</option>
                    <option value="Vencido">Vencido</option>
                    <option value="Sobrante">Sobrante (Desechado)</option>
                    <option value="Error de preparación">Error de preparación</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Responsable</label>
                    <input type="text" value={wasteForm.responsible} onChange={e => setWasteForm({...wasteForm, responsible: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-rose-500 outline-none" placeholder="Ej. Juan (Hornero)" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-rose-600 uppercase tracking-wider mb-2">Costo Perdido (S/)</label>
                    <input type="number" min="0" step="0.1" value={wasteForm.lostCost} onChange={e => setWasteForm({...wasteForm, lostCost: Number(e.target.value)})} className="w-full border border-rose-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-rose-500 outline-none bg-rose-50 text-rose-900 font-bold" placeholder="Ej. 25.50" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsWasteModalOpen(false)} className="px-5 py-2.5 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium">Cancelar</button>
              <button onClick={handleSaveWaste} disabled={!wasteForm.product || wasteForm.quantity <= 0} className="px-5 py-2.5 text-white bg-rose-600 rounded-lg hover:bg-rose-700 font-medium flex items-center disabled:opacity-50">
                <CheckCircle className="w-4 h-4 mr-2" /> Confirmar Merma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}