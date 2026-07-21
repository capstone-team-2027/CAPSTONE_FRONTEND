export interface TaskDetail {
  taskId: number;
  serviceName: string;
  // PENDING_QC: kỹ thuật viên làm xong, đang chờ kiểm định chất lượng
  status: 'PENDING' | 'IN_PROGRESS' | 'PENDING_QC' | 'COMPLETED';
  estimatedDuration: number;
}

// TODO: BE bổ sung model/make/color + customer cho endpoint tracking
export interface ActiveOrder {
  serviceOrderId: number;
  vehicle: {
    id: number;
    license_plate: string;
    vin_number: string;
    color?: string | null;
    model?: {
      id: number;
      model_name: string;
      make?: { id: number; make_name: string } | null;
    } | null;
    customer?: {
      id: number;
      name?: string | null;
      phone?: string | null;
      user?: { fullName?: string | null; phoneNumber?: string | null } | null;
    } | null;
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
