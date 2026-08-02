export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const CHAT_API_ENDPOINTS = {
    GET_CONVERSATIONS: `${API_BASE_URL}/api/receptionist/chat/conversations`,
    GET_CONVERSATION_DETAIL: (id: string | number) => `${API_BASE_URL}/api/receptionist/chat/conversations/${id}`,
    CLAIM: (id: string | number) => `${API_BASE_URL}/api/receptionist/chat/conversations/${id}/claim`,
    UNCLAIM: (id: string | number) => `${API_BASE_URL}/api/receptionist/chat/conversations/${id}/unclaim`,
    SEND_MESSAGE: (id: string | number) => `${API_BASE_URL}/api/receptionist/chat/conversations/${id}/message`,
    GET_UNREAD_COUNT: `${API_BASE_URL}/api/receptionist/chat/unread-count`,
};
