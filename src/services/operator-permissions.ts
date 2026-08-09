import type { ActiveOperator } from './operator-session';

type Role = ActiveOperator['role'];

const permissions: Record<Role, string[]> = {
  cajero: ['/dashboard', '/ventas/pos', '/ventas/pedidos', '/ventas/facturacion', '/clientes', '/caja', '/calendario'],
  mozo: ['/ventas/pos', '/ventas/pedidos', '/clientes', '/calendario'],
  cocina: ['/cocina', '/produccion', '/calendario'],
  supervisor: ['/dashboard', '/ventas', '/cocina', '/compras', '/inventario', '/productos', '/clientes', '/proveedores', '/caja', '/produccion', '/calendario', '/documentos', '/reportes'],
};

const home: Record<Role, string> = {
  cajero: '/ventas/pos',
  mozo: '/ventas/pos',
  cocina: '/cocina',
  supervisor: '/dashboard',
};

export function canOperatorAccess(role: Role, path: string) {
  return permissions[role].some((allowed) => path === allowed || path.startsWith(`${allowed}/`));
}

export function operatorHome(role: Role) {
  return home[role];
}
