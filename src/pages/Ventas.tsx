import React, { useState } from 'react';
import { Search, Plus, Minus, X, CheckCircle, Tag, User } from 'lucide-react';

const Ventas: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [documentType, setDocumentType] = useState('Factura');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');

  const categories = [
    'Todas', 'Laptops & Hardware', 'Periféricos & Acces.', 'Redes & Conectividad', 'Servicios'
  ];

  const products = [
    { id: 1, sku: 'SKU-8921', name: 'Laptop Dell XPS 15 Intel i7', stock: 14, price: 4850.00, status: 'ok' },
    { id: 2, sku: 'SKU-1042', name: 'Monitor Gamer LG 27" UltraGear', stock: 3, price: 1120.00, status: 'warning' },
    { id: 3, sku: 'SKU-3321', name: 'Teclado Mecánico Keychron K2', stock: 48, price: 380.00, status: 'ok' },
    { id: 4, sku: 'SKU-0092', name: 'Mouse Ergonómico MX Master 3S', stock: 1, price: 450.00, status: 'danger' },
  ];

  const cart = [
    { id: 1, name: 'Laptop Dell XPS 15 Intel i7', qty: 1, price: 4850.00 },
    { id: 3, name: 'Teclado Mecánico Keychron K2', qty: 2, price: 380.00 },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] bg-brand-bgLight dark:bg-brand-bgDark overflow-hidden animate-fadeIn">
      
      {/* 65% - Panel Izquierdo: Catálogo y Búsqueda */}
      <section className="w-full lg:w-7/12 xl:w-2/3 p-4 flex flex-col space-y-4 border-r border-slate-200 dark:border-slate-800 bg-transparent overflow-hidden">
        
        {/* Buscador */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              autoFocus 
              placeholder="Escanear código o buscar producto (F2)..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-brand-surfaceDark border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-blue outline-none text-slate-800 dark:text-white transition-all shadow-soft" 
            />
          </div>
          <button className="bg-white dark:bg-brand-surfaceDark hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Manual
          </button>
        </div>

        {/* Categorías */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-shrink-0 text-xs content-scroll">
          {categories.map((cat) => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 font-medium rounded-lg transition-colors whitespace-nowrap border ${
                activeCategory === cat 
                  ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-600 shadow-sm' 
                  : 'bg-white dark:bg-brand-surfaceDark hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid de Productos */}
        <div className="flex-1 overflow-y-auto content-scroll grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 pr-2 pb-4">
          {products.map((prod) => (
            <div 
              key={prod.id} 
              className="group bg-white dark:bg-brand-surfaceDark p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-soft hover:border-brand-blue dark:hover:border-brand-cyan hover:shadow-premium transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400">{prod.sku}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    prod.status === 'ok' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' :
                    prod.status === 'warning' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' :
                    'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                  }`}>
                    Stock: {prod.stock}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 mb-1 group-hover:text-brand-blue dark:group-hover:text-brand-cyan transition-colors">
                  {prod.name}
                </h4>
              </div>
              <div className="flex items-end justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-400">Precio</span>
                <span className="text-base font-bold text-brand-dark dark:text-white">
                  S/ {prod.price.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 35% - Panel Derecho: Carrito y Resumen */}
      <section className="w-full lg:w-5/12 xl:w-1/3 flex flex-col h-full bg-white dark:bg-brand-surfaceDark border-l border-slate-200 dark:border-slate-800 shadow-2xl z-10">
        
        {/* Cabecera del Carrito */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 space-y-4">
          <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg text-xs font-semibold">
            {['Factura', 'Boleta', 'Nota Venta'].map((doc) => (
              <button 
                key={doc}
                onClick={() => setDocumentType(doc)}
                className={`py-1.5 rounded-md text-center transition-all ${
                  documentType === doc 
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-600' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {doc}
              </button>
            ))}
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Cliente
              </label>
              <button className="text-[10px] font-semibold text-brand-blue dark:text-brand-cyan hover:underline">
                Buscar / Nuevo
              </button>
            </div>
            
            {/* Tarjeta de cliente seleccionada */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-sm group">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-[12px] font-semibold text-slate-800 dark:text-white truncate">Corporación Aceros S.A.C.</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">RUC: 20601829301</span>
                </div>
              </div>
              <button className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Items */}
        <div className="flex-1 overflow-y-auto content-scroll px-5 py-2 space-y-1">
          {cart.map((item) => (
            <div key={item.id} className="py-3 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-start gap-3 last:border-0">
              <div className="flex-1">
                <h5 className="text-xs font-semibold text-slate-800 dark:text-white leading-snug">{item.name}</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Precio Unit: S/ {item.price.toFixed(2)}</p>
                <div className="flex items-center gap-2 mt-2.5">
                  <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                    <button className="px-2 py-0.5 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2 py-0.5 text-xs font-bold text-slate-800 dark:text-white w-6 text-center border-x border-slate-100 dark:border-slate-800">
                      {item.qty}
                    </span>
                    <button className="px-2 py-0.5 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <Tag className="w-3 h-3 text-slate-300 dark:text-slate-600 ml-1" />
                </div>
              </div>
              <div className="text-right flex flex-col items-end justify-between h-full">
                <span className="text-sm font-bold text-slate-900 dark:text-white block">
                  S/ {(item.price * item.qty).toFixed(2)}
                </span>
                <button className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 mt-3 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Resumen y Cobro */}
        <div className="px-5 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 space-y-4 flex-shrink-0">
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Op. Gravada:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">S/ 4,754.24</span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>IGV (18%):</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">S/ 855.76</span>
            </div>
            <div className="flex justify-between items-center pt-3 mt-1 border-t border-slate-200 dark:border-slate-700">
              <span className="text-sm font-bold text-slate-900 dark:text-white">Total a Pagar:</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">S/ 5,610.00</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-2">
            {['Efectivo', 'Yape/Plin', 'Tarjeta', 'Transf.'].map((method) => (
              <button 
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`py-2 rounded-lg text-[10px] sm:text-xs font-semibold text-center transition-all ${
                  paymentMethod === method 
                    ? 'bg-slate-800 text-white border border-slate-800 dark:bg-slate-700 dark:border-slate-600 shadow-sm' 
                    : 'bg-white dark:bg-brand-surfaceDark text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {method}
              </button>
            ))}
          </div>

          <button className="w-full mt-2 py-3 bg-brand-blue hover:bg-brand-blueHover text-white font-semibold text-sm rounded-xl shadow-lg shadow-brand-blue/20 transition-all flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Finalizar Venta (F9)
          </button>
        </div>

      </section>
    </div>
  );
};

export default Ventas;