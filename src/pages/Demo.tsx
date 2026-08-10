import { ArrowLeft, BarChart3, ChefHat, CreditCard, Package, ReceiptText, ShoppingCart, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const modules = [
  { icon: ShoppingCart, title: 'POS rápido', text: 'Carta completa, buscador, categorías y carrito.' },
  { icon: ChefHat, title: 'Cocina en tiempo real', text: 'Las comandas llegan sin actualizar la pantalla.' },
  { icon: Users, title: 'Mesas visuales', text: 'Identifica mesas libres y ocupadas.' },
  { icon: CreditCard, title: 'Pagos claros', text: 'Efectivo, Yape/Plin, tarjeta y transferencia.' },
  { icon: ReceiptText, title: 'Ticket de 80 mm', text: 'Comprobantes internos listos para impresora térmica.' },
  { icon: Package, title: 'Inventario y recetas', text: 'Control de insumos, costos y consumo.' },
  { icon: BarChart3, title: 'Reportes', text: 'Ventas, caja, productos y métodos de pago.' },
];

export default function Demo() {
  return <main className="min-h-screen bg-slate-950 text-white">
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
      <strong className="text-xl">HUERTA ERP</strong>
      <Link to="/" className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-bold"><ArrowLeft className="h-4 w-4" />Volver</Link>
    </header>
    <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 text-center">
      <span className="rounded-full bg-emerald-400/15 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-300">Demostración segura</span>
      <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black sm:text-6xl">Controla ventas, cocina, caja e inventario desde un solo lugar.</h1>
      <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-300">Vista informativa para futuros clientes. No utiliza ni expone información real de Chicken Huerta.</p>
      <div className="mt-10 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
        {modules.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <Icon className="h-8 w-8 text-blue-400" /><h2 className="mt-4 text-lg font-black">{title}</h2><p className="mt-2 text-sm text-slate-300">{text}</p>
        </article>)}
      </div>
      <div className="mt-10 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-5 text-sm text-amber-100">Facturación electrónica disponible en modo de prueba. La emisión SUNAT real se activa con RUC, certificado digital y credenciales autorizadas.</div>
    </section>
  </main>;
}
