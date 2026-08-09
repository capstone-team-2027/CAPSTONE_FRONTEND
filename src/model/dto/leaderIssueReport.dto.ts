export interface VehicleComponent {
  id: number;
  name: string;
  parent_id: number | null;
}

export interface ActiveTaskCatalogRef {
  id: number;
  service_name: string;
}
export interface ActiveTaskItem {
  id: number;
  type: "INSPECTION" | "REPAIR";
  status: string;
  createdAt: string;
  catalog?: ActiveTaskCatalogRef | null;
}
export interface ActiveServiceOrderCustomerUser {
  id: number;
  fullName: string | null;
  phoneNumber: string | null;
}
export interface ActiveServiceOrderCustomer {
  id: number;
  name: string | null;
  phone: string | null;
  user?: ActiveServiceOrderCustomerUser | null;
}
export interface ActiveServiceOrderVehicleModel {
  id: number;
  model_name: string;
}
export interface ActiveServiceOrderVehicle {
  id: number;
  license_plate: string;
  color: string;
  model?: ActiveServiceOrderVehicleModel | null;
  customer?: ActiveServiceOrderCustomer | null;
}
export interface ActiveServiceOrderForIssueReport {
  id: number;
  status: string;
  vehicle?: ActiveServiceOrderVehicle | null;
  tasks: ActiveTaskItem[];
}

export interface CreateLeaderIssueReportItem {
  component_id: number;
  description: string;
}
export interface CreateLeaderIssueReportRequest {
  task_id: number;
  issues: CreateLeaderIssueReportItem[];
  note?: string;
}

// Báo cáo lỗi đã tạo (từ trang Theo dõi công việc) nhưng chưa được đưa vào báo giá nào
export interface UnquotedIssueComponentRef {
  id: number;
  name: string;
}
export interface UnquotedIssueComponent {
  id: number;
  name: string;
  parent_id: number | null;
  parent?: UnquotedIssueComponentRef | null;
}
export interface UnquotedIssueServiceOrder {
  id: number;
  vehicle?: ActiveServiceOrderVehicle | null;
}
export interface UnquotedIssueTask {
  id: number;
  serviceOrder?: UnquotedIssueServiceOrder | null;
}
export interface UnquotedIssueReport {
  id: number;
  error_description: string;
  note: string | null;
  createdAt: string;
  task?: UnquotedIssueTask | null;
  component?: UnquotedIssueComponent | null;
}
