// DTO cho màn theo dõi tiến độ sửa chữa của khách (khớp getRepairProgress bên BE)

export interface RepairVehicleModel {
  id: number;
  model_name: string;
}

export interface RepairVehicle {
  id: number;
  license_plate: string | null;
  color: string | null;
  model?: RepairVehicleModel | null;
}

export interface RepairTaskTechnician {
  id: number;
  fullName: string | null;
}

export interface RepairTaskAssignment {
  id: number;
  status: string | null;
  technician?: RepairTaskTechnician | null;
}

export interface RepairTaskCatalog {
  id: number;
  service_name: string;
  estimated_duration?: number | null;
}

export interface RepairTask {
  id: number;
  status: string;
  type?: string;
  catalog?: RepairTaskCatalog | null;
  assignments?: RepairTaskAssignment[];
}

export interface GetRepairProgressResponse {
  id: number;
  status: string;
  entry_time: string | null;
  promised_finish_time: string | null;
  actual_finish_time: string | null;
  vehicle?: RepairVehicle | null;
  tasks?: RepairTask[];
}
