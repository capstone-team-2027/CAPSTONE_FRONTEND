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