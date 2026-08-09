export type OrderStatus = 'nuevo' | 'preparando' | 'listo' | 'entregado' | 'pagado' | 'anulado';
export type ServiceType = 'salon' | 'delivery' | 'recojo';

export interface RestaurantProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  active: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface RestaurantOrder {
  id: string;
  number: number;
  serviceType: ServiceType;
  table?: string;
  customer?: string;
  status: OrderStatus;
  items: OrderItem[];
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashSession {
  id: string;
  openedAt: string;
  closedAt?: string;
  openingAmount: number;
  closingAmount?: number;
  status: 'abierta' | 'cerrada';
  openedByName?: string;
  closedByName?: string;
  expectedAmount?: number;
  difference?: number;
  notes?: string;
  nextShiftFund?: number;
  withdrawnAmount?: number;
}

export interface CashMovement {
  id: string;
  type: 'ingreso' | 'egreso';
  concept: string;
  amount: number;
  paymentMethod: string;
  registeredByName: string;
  createdAt: string;
}
