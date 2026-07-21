// DTO cho màn nghiệm thu tổng thể (Final QC) của tổ trưởng
// Khớp getServiceOrdersPendingFinalQC bên BE

export interface FinalQcVehicleModel {
  id: number;
  model_name: string;
}

export interface FinalQcCustomerUser {
  id: number;
  fullName: string | null;
  phoneNumber: string | null;
}

export interface FinalQcCustomer {
  id: number;
  name: string | null;
  phone: string | null;
  user?: FinalQcCustomerUser | null;
}

export interface FinalQcVehicle {
  id: number;
  license_plate: string | null;
  color: string | null;
  model?: FinalQcVehicleModel | null;
  customer?: FinalQcCustomer | null;
}

export interface FinalQcServiceCatalog {
  id: number;
  service_name: string;
}

export interface FinalQcTechnician {
  id: number;
  fullName: string | null;
}

export interface FinalQcAssignment {
  id: number;
  status: string | null;
  technician?: FinalQcTechnician | null;
}

export interface FinalQcTask {
  id: number;
  status: string;
  catalog?: FinalQcServiceCatalog | null;
  assignments?: FinalQcAssignment[];
}

// Trả về làm lại: chọn các task cần sửa lại + lý do
export interface RejectFinalInspectionRequest {
  taskIds: number[];
  reason: string;
}

// 1 lệnh sửa chữa đang chờ nghiệm thu tổng thể
export interface GetFinalQcOrderResponse {
  id: number;
  status: string;
  entry_time: string | null;
  updatedAt: string | null;
  vehicle?: FinalQcVehicle | null;
  tasks?: FinalQcTask[];
}