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

// Công việc kỹ thuật viên đang gánh (khớp getAllTechnician bên BE)
export interface TechnicianCurrentTask {
  id: number;
  status: string;
  catalog?: LeaderServiceCatalog | null;
  serviceOrder?: {
    id: number;
    vehicle?: {
      id: number;
      license_plate: string | null;
    } | null;
  } | null;
}

export interface TechnicianCurrentAssignment {
  id: number;
  status: string;
  task_id: number;
  actual_start_time: string | null;
  actual_end_time: string | null;
  createdAt: string;
  task?: TechnicianCurrentTask | null;
}

export interface GetTechniciansResponse {
  id: number;
  fullName: string;
  skill_level: string | null;
  // BE chỉ trả về việc chưa xong trong assignments
  assignments?: TechnicianCurrentAssignment[];
  total_assigned: number;
  completed_count: number;
  remaining_count: number;
  in_progress_count: number;
  pending_count: number;
  paused_count: number;
}

// --- Lịch sử phân công (khớp getAssignmentHistory bên BE) ---

export interface LeaderHistoryAssignment {
  id: number;
  status: string | null;
  role_in_task: string | null;
  contribution_percent: number | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  remarks: string | null;
  technician?: LeaderAssignedTechnician | null;
}

export interface LeaderHistoryTask {
  id: number;
  type: string | null;
  status: string;
  createdAt: string;
  catalog?: LeaderServiceCatalog | null;
  assignments: LeaderHistoryAssignment[];
}

export interface UpdateAssignmentRequest {
  technician_id: number;
}

export interface GetAssignmentHistoryResponse {
  id: number;
  status: string;
  createdAt: string;
  vehicle?: LeaderVehicle | null;
  tasks: LeaderHistoryTask[];
}

export interface AssignTaskRequest {
  task_ids: number[];
  technician_id: number;
}