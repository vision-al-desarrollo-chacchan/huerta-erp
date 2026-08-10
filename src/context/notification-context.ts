import { createContext, useContext } from 'react';

export type ToastType = 'success' | 'error' | 'info';
export type NotificationApi = { notify: (message: string, type?: ToastType) => void };

export const NotificationContext = createContext<NotificationApi | null>(null);

export function useNotification() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error('useNotification debe usarse dentro de NotificationProvider.');
  return value;
}
