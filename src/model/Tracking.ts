export interface TaskDetail {
  taskId: number;
  serviceName: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  estimatedDuration: number;
}

export interface ActiveOrder {
  serviceOrderId: number;
  vehicle: {
    id: number;
    license_plate: string;
    vin_number: string;
  };
  orderStatus: string;
  totalRemainingTimeMinutes: number;
  tasks: TaskDetail[];
}

export interface TrackingData {
  hasActiveOrder: boolean;
  activeOrders?: ActiveOrder[];
  message: string;
}

export type FilterCategory = 'ACTIVE' | 'COMPLETED';
