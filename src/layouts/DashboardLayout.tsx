import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return <div className="flex h-screen min-h-0 overflow-hidden bg-slate-50">
    <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    {sidebarOpen && <button type="button" className="fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-[1px] lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú" />}

    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <Header onOpenMenu={() => setSidebarOpen(true)} />
      <main className="erp-main content-scroll min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <Outlet />
      </main>
    </div>
  </div>;
}
