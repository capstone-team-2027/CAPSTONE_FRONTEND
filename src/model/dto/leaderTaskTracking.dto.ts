export interface TaskTrackingTechnician {
  id: number;
  fullName: string | null;
}
export interface TaskTrackingAssignment {
  id: number;
  status: string;
  actual_start_time: string | null;
  technician?: TaskTrackingTechnician | null;
}
export interface TaskTrackingCatalog {
  id: number;
  service_name: string;
}
export interface TaskTrackingTask {
  id: number;
  type: "INSPECTION" | "REPAIR";
  status: string;
  createdAt: string;
  catalog?: TaskTrackingCatalog | null;
  assignments: TaskTrackingAssignment[];
}
export interface TaskTrackingCustomerUser {
  id: number;
  fullName: string | null;
  phoneNumber: string | null;
}
export interface TaskTrackingCustomer {
  id: number;
  name: string | null;
  phone: string | null;
  user?: TaskTrackingCustomerUser | null;
}
export interface TaskTrackingVehicleModel {
  id: number;
  model_name: string;
}
export interface TaskTrackingVehicle {
  id: number;
  license_plate: string;
  color: string;
  model?: TaskTrackingVehicleModel | null;
  customer?: TaskTrackingCustomer | null;
}
export interface TaskTrackingServiceOrder {
  id: number;
  status: string;
  createdAt: string;
  vehicle?: TaskTrackingVehicle | null;
  tasks: TaskTrackingTask[];
}
