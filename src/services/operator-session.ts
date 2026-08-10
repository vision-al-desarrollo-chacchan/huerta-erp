export type ActiveOperator = {
  employeeId: string;
  name: string;
  role: 'cajero' | 'mozo' | 'moza_cajera' | 'cocina' | 'supervisor';
};

const OPERATOR_KEY = 'huerta-active-operator';

export function getActiveOperator(): ActiveOperator | null {
  try {
    const value = sessionStorage.getItem(OPERATOR_KEY);
    return value ? JSON.parse(value) as ActiveOperator : null;
  } catch {
    return null;
  }
}

export function setActiveOperator(operator: ActiveOperator) {
  sessionStorage.setItem(OPERATOR_KEY, JSON.stringify(operator));
  window.dispatchEvent(new Event('huerta-operator-updated'));
}

export function clearActiveOperator() {
  sessionStorage.removeItem(OPERATOR_KEY);
  window.dispatchEvent(new Event('huerta-operator-updated'));
}
