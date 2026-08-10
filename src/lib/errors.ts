type ErrorLike = { message?: string; code?: string; status?: number };

export function userErrorMessage(reason: unknown, fallback = 'No se pudo completar la acción.') {
  if (!navigator.onLine) return 'Sin conexión a internet. Revisa tu red e inténtalo nuevamente.';

  const error = (reason ?? {}) as ErrorLike;
  const message = String(error.message ?? '').toLowerCase();

  if (error.code === '42501' || message.includes('row-level security') || message.includes('permission denied')) {
    return 'No tienes permiso para realizar esta acción. Comunícate con el administrador.';
  }
  if (message.includes('jwt') || message.includes('session') || error.status === 401) {
    return 'Tu sesión venció. Vuelve a iniciar sesión.';
  }
  if (message.includes('failed to fetch') || message.includes('network') || message.includes('timeout')) {
    return 'No se pudo conectar con el servidor. Revisa tu internet e inténtalo nuevamente.';
  }

  return error.message || fallback;
}
