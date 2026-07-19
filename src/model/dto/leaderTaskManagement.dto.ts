// DTO cho màn phân công kỹ thuật của tổ trưởng (khớp getAllTasks bên BE)

export interface LeaderServiceCatalog {
  id: number;
  service_name: string;
  estimated_duration: number | null;
}

export interface LeaderVehicleComponent {
  id: number;
  name: string;
}

export interface LeaderVehicleIssue {
  id: number;
  error_description: string | null;
  note: string | null;
  component?: LeaderVehicleComponent | null;
}

export interface LeaderQuotationItem {
  id: number;
  quantity: number;
  issue?: LeaderVehicleIssue | null;
}

export interface LeaderVehicleMake {
  id: number;
  make_name: string;
}

export interface LeaderVehicleModel {
  id: number;
  model_name: string;
  make?: LeaderVehicleMake | null;
}

export interface LeaderCustomerUser {
  id: number;
  fullName: string | null;
  phoneNumber: string | null;
}

export interface LeaderCustomer {
  id: number;
  name: string | null;
  phone: string | null;
  user?: LeaderCustomerUser | null;
}

export interface LeaderVehicle {
  id: number;
  license_plate: string | null;
  color: string | null;
  model?: LeaderVehicleModel | null;
  customer?: LeaderCustomer | null;
}

export interface LeaderAssignedTechnician {
  id: number;
  fullName: string | null;
}

export interface LeaderTaskAssignment {
  id: number;
  status: string | null;
  technician?: LeaderAssignedTechnician | null;
}

export interface LeaderTask {
  id: number;
  status: string;
  createdAt: string;
  catalog?: LeaderServiceCatalog | null;
  quotationItem?: LeaderQuotationItem | null;
  assignments: LeaderTaskAssignment[];
}

export interface GetLeaderTasksResponse {
  id: number;
  createdAt: string;
  vehicle?: LeaderVehicle | null;
  tasks: LeaderTask[];
}

export interface GetTechniciansResponse {
  id: number;
  fullName: string;
}

export interface AssignTaskRequest {
  task_ids: number[];
  technician_id: number;
}