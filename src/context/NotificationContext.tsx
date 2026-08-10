import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, WifiOff, X } from 'lucide-react';
import { NotificationContext, type ToastType } from './notification-context';

type Toast = { id: number; message: string; type: ToastType };

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++nextId.current;
    setToasts((current) => [...current.slice(-3), { id, message, type }]);
    window.setTimeout(() => dismiss(id), type === 'error' ? 7000 : 4500);
  }, [dismiss]);

  useEffect(() => {
    const offline = () => notify('Sin conexión a internet. Los cambios no podrán guardarse.', 'error');
    const online = () => notify('Conexión recuperada.', 'success');
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    return () => {
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
    };
  }, [notify]);

  const value = useMemo(() => ({ notify }), [notify]);
  return (
    <NotificationContext.Provider value={value}>
      {children}
      {!navigator.onLine && <div className="fixed inset-x-0 top-0 z-[70] flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-sm font-bold text-white"><WifiOff className="h-4 w-4" />Sin conexión</div>}
      <div className="fixed bottom-4 right-4 z-[80] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? AlertCircle : Info;
          const color = toast.type === 'success' ? 'border-emerald-200 text-emerald-700' : toast.type === 'error' ? 'border-red-200 text-red-700' : 'border-blue-200 text-blue-700';
          return <div key={toast.id} className={`flex items-start gap-3 rounded-xl border bg-white p-4 shadow-xl ${color}`} role={toast.type === 'error' ? 'alert' : 'status'}><Icon className="mt-0.5 h-5 w-5 shrink-0" /><p className="flex-1 text-sm font-semibold">{toast.message}</p><button onClick={() => dismiss(toast.id)} aria-label="Cerrar aviso"><X className="h-4 w-4" /></button></div>;
        })}
      </div>
    </NotificationContext.Provider>
  );
}
