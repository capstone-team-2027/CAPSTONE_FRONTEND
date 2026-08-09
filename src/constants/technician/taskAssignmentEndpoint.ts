export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const TASK_ASSIGNMENT_ENDPOINTS = {
    GET_MY_ASSIGNMENTS: `${API_BASE_URL}/api/technician/task-assignments`,
    GET_COMPLETED_TASKS: `${API_BASE_URL}/api/technician/completed-tasks`,
    GET_SERVICE_ORDER_DETAIL: (id: string | number) => `${API_BASE_URL}/api/technician/service-orders/${id}`,
    START_TASK: `${API_BASE_URL}/api/technician/task-assignments/start`,
    PAUSE_TASK: `${API_BASE_URL}/api/technician/task-assignments/pause`,
    RESUME_TASK: `${API_BASE_URL}/api/technician/task-assignments/resume`,
    COMPLETE_TASK: `${API_BASE_URL}/api/technician/task-assignments/complete`,
    GET_MY_RESCUE: `${API_BASE_URL}/api/technician/rescue/my-active`,
    GET_MY_RESCUE_HISTORY: `${API_BASE_URL}/api/technician/rescue/my-history`,
    START_RESCUE: `${API_BASE_URL}/api/technician/rescue/start`,
    CREATE_QUOTATION: `${API_BASE_URL}/api/technician/quote`,
    ISSUES_REPORT: `${API_BASE_URL}/api/technician/issues`,
    ADDITIONAL_ISSUES_REPORT: `${API_BASE_URL}/api/technician/issues/additional`,
    GET_COMPONENTS: `${API_BASE_URL}/api/technician/component`,
    GET_REPORT_HISTORY: `${API_BASE_URL}/api/technician/component`,
    GET_SPARE_PARTS: `${API_BASE_URL}/api/technician/spare-parts`,
    GET_REQUESTABLE_PARTS: (serviceOrderId: number | string) =>
        `${API_BASE_URL}/api/technician/service-orders/${serviceOrderId}/requestable-parts`,
    REQUEST_EXPORT: (serviceOrderId: number | string) =>
        `${API_BASE_URL}/api/technician/service-orders/${serviceOrderId}/request-export`,
    // Tra cứu chẩn đoán (Diagnostic Knowledge)
    GET_ALL_DIAGNOSTICS: `${API_BASE_URL}/api/technician/diagnostics`,
    SEARCH_DIAGNOSTICS: (keyword: string) =>
        `${API_BASE_URL}/api/technician/diagnostics/search?keyword=${encodeURIComponent(keyword)}`,
    FILTER_DIAGNOSTICS: (params: { makeId?: number; modelId?: number }) => {
        const q = new URLSearchParams();
        if (params.makeId) q.set("makeId", String(params.makeId));
        if (params.modelId) q.set("modelId", String(params.modelId));
        const qs = q.toString();
        return `${API_BASE_URL}/api/technician/diagnostics/filter${qs ? `?${qs}` : ""}`;
    },
    GET_ALL_INSPECTION_HISTORY: `${API_BASE_URL}/api/technician/inspection-history`,
    SEARCH_INSPECTION_HISTORY: (keyword: string) =>
        `${API_BASE_URL}/api/technician/inspection-history/search?keyword=${encodeURIComponent(keyword)}`,
    FILTER_INSPECTION_HISTORY: (params: { makeId?: number; modelId?: number }) => {
        const q = new URLSearchParams();
        if (params.makeId) q.set("makeId", String(params.makeId));
        if (params.modelId) q.set("modelId", String(params.modelId));
        const qs = q.toString();
        return `${API_BASE_URL}/api/technician/inspection-history/filter${qs ? `?${qs}` : ""}`;
    },
    AI_SUGGEST_CAUSES: `${API_BASE_URL}/api/technician/diagnostics/ai-suggest`,
    GET_VEHICLE_MAKES: `${API_BASE_URL}/api/technician/vehicle-makes`,
    GET_VEHICLE_MODELS: (makeId?: number) =>
        `${API_BASE_URL}/api/technician/vehicle-models${makeId ? `?makeId=${makeId}` : ""}`,
    // Tra cứu kinh nghiệm sửa lỗi (Inspection History) — task REPAIR
    GET_ALL_REPAIR_HISTORY: `${API_BASE_URL}/api/technician/repair-history`,
    SEARCH_REPAIR_HISTORY: (keyword: string) =>
        `${API_BASE_URL}/api/technician/repair-history/search?keyword=${encodeURIComponent(keyword)}`,
    SEARCH_REPAIR_HISTORY_SMART: `${API_BASE_URL}/api/technician/repair-history/smart-search`,
    FILTER_REPAIR_HISTORY: (params: { makeId?: number; modelId?: number }) => {
        const q = new URLSearchParams();
        if (params.makeId) q.set("makeId", String(params.makeId));
        if (params.modelId) q.set("modelId", String(params.modelId));
        const qs = q.toString();
        return `${API_BASE_URL}/api/technician/repair-history/filter${qs ? `?${qs}` : ""}`;
    },
};
