export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const CHAT_API_ENDPOINTS = {
    GET_MY_CONVERSATION: `${API_BASE_URL}/api/customer/chat/conversation`,
    SEND_MESSAGE: `${API_BASE_URL}/api/customer/chat/conversation/message`,
    SEND_QUOTE_REFERENCE: `${API_BASE_URL}/api/customer/chat/conversation/quote-reference`,
    GET_UNREAD_COUNT: `${API_BASE_URL}/api/customer/chat/unread-count`,
};
