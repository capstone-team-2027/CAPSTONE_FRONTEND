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