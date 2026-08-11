import type { ActiveOperator } from './operator-session';

type Role = ActiveOperator['role'];

const permissions: Record<Role, string[]> = {
  cajero: ['/dashboard', '/ventas/pos', '/ventas/pedidos', '/ventas/facturacion', '/clientes', '/caja', '/calendario'],
  mozo: ['/ventas/pos', '/ventas/pedidos', '/clientes', '/calendario'],
  moza_cajera: ['/dashboard', '/ventas/pos', '/ventas/pedidos', '/ventas/facturacion', '/clientes', '/caja', '/calendario'],
  cocina: ['/cocina', '/produccion', '/calendario'],
  supervisor: ['/dashboard', '/ventas', '/cocina', '/impresion', '/compras', '/inventario', '/productos', '/clientes', '/proveedores', '/caja', '/produccion', '/calendario', '/documentos', '/reportes'],
};

const home: Record<Role, string> = {
  cajero: '/ventas/pos',
  mozo: '/ventas/pos',
  moza_cajera: '/ventas/pos',
  cocina: '/cocina',
  supervisor: '/dashboard',
};

export function canOperatorAccess(role: Role, path: string) {
  return permissions[role].some((allowed) => path === allowed || path.startsWith(`${allowed}/`));
}

export function canOperatorRolesAccess(roles: Role[], path: string) {
  return roles.some((role) => canOperatorAccess(role, path));
}

export function operatorHome(role: Role) {
  return home[role];
}

export function operatorRolesHome(roles: Role[]) {
  if (roles.includes('supervisor')) return home.supervisor;
  if (roles.includes('moza_cajera') || roles.includes('cajero') || roles.includes('mozo')) return home.cajero;
  return home[roles[0] ?? 'mozo'];
}
