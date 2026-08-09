export interface CreateIssueReportItemRequest {
    component_id: number;
    description: string;
}
export interface CreateIssueReportRequest {
    task_id: number;
    issues: CreateIssueReportItemRequest[];
    note?: string;
}
export interface GetComponentsResponse {
    id: number;
    name: string;
    parent_id: number
}

export interface IssueHistoryComponentRef {
    id: number;
    name: string;
}
export interface IssueHistoryComponent {
    id: number;
    name: string;
    parent_id: number | null;
    parent?: IssueHistoryComponentRef | null;
    children?: IssueHistoryComponentRef[];
}
export interface IssueHistoryUser{
    id: number;
    fullName: string | null;
    phone: string | null;
}
export interface IssueHistoryCustomer{
    id: number;
    name: string | null;
    phone: string | null;
    user?: IssueHistoryUser | null;
}
export interface IssueHistoryVehiclesModel{
    id: number;
    model_name: string;
}
export interface IssueHistoryVehicles{
    id: number;
    license_plate: string;
    color: string;
    model?: IssueHistoryVehiclesModel
    customer?: IssueHistoryCustomer | null;
}
export interface IssueHistoryServiceOrder{
    id: number;
    vehicle?: IssueHistoryVehicles | null;
}
export interface IssueHistoryTask{
    id: number;
    status: string;
    serviceOrder?: IssueHistoryServiceOrder | null
}
export interface GetIssuesReportItemResponse {
    id: number;
    error_description: string;
    note: string | null;
    createdAt: string;
    task?: IssueHistoryTask;
    component?: IssueHistoryComponent | null;
}

// ===== Tra cứu chẩn đoán (Diagnostic Knowledge) =====

export interface DiagnosticVehicleModel {
    id: number;
    model_name: string;
}
export interface DiagnosticVehicleMake {
    id: number;
    make_name: string;
}
export interface DiagnosticKnowledge {
    id: number;
    symptom: string;
    possible_causes: string | null;
    model_id: number | null;
    make_id: number | null;
    model?: DiagnosticVehicleModel | null;
    make?: DiagnosticVehicleMake | null;
}

export interface VehicleMake {
    id: number;
    make_name: string;
}
export interface VehicleModel {
    id: number;
    make_id: number;
    model_name: string;
}

// Gợi ý nguyên nhân từ AI — BE tự lấy triệu chứng từ công việc, KTV không cần nhập tay.
// followUpQuestion (tùy chọn) dùng khi KTV muốn hỏi thêm sau câu trả lời đầu tiên.
export interface AiSuggestCausesRequest {
    taskAssignmentId: number;
    followUpQuestion?: string;
}
export interface AiSuggestCausesResponse {
    symptom: string;
    ai_suggestion: string;
    disclaimer: string;
}

export type PauseTaskStatus = "PAUSED" | "WAITING_STOCK";

export interface PauseTaskRequest {
    taskAssignmentId: string | number;
    reason?: string | null;
    status: PauseTaskStatus;
}

export interface ResumeTaskRequest {
    taskAssignmentId: string | number;
}

// ===== Yêu cầu xuất kho phụ tùng (Requestable parts / Request export) =====

export interface RequestablePartSparePart {
    id: number;
    sku: string | null;
    name: string;
    brand?: string | null;
    stock_quantity?: number | null;
}

export interface RequestablePartItem {
    id: number;
    quantity: number;
    unit_price?: number | string | null;
    amount?: number | string | null;
    sparePart: RequestablePartSparePart | null;
}

export interface RequestExportRequest {
    detailIds: number[];
}
