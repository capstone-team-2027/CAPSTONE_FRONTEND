export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Danh sách dùng chung route công khai (guest) vì chỉ đọc, không cần quyền admin — sửa (PUT)
// mới cần quyền admin, đã có sẵn route riêng trong admin.routes.js.
export const LOYALTY_SETTINGS_API_ENDPOINTS = {
    LIST_CONFIGURATIONS: `${API_BASE_URL}/api/guest/garage-configurations`,
    UPDATE_CONFIGURATION: (key: string) => `${API_BASE_URL}/api/admin/garage-configurations/${key}`,
};
