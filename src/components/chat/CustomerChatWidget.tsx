import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MessageSquare, X, Send, Headset, User, Loader2, ReceiptText } from 'lucide-react';
import { useFetchClient } from '../../hook/useFetchClient';
import { useSocket } from '../../hook/useSocket';
import { COLORS } from '../share/Color';
import { CHAT_API_ENDPOINTS } from '../../constants/customer/chatEndpoints';
import { PROFILE_API_ENDPOINTS } from '../../constants/customer/profileApiEndpoint';
import QuoteReferenceModal, { type QuoteReferenceData } from './QuoteReferenceModal';

interface ChatMessage {
    id: number;
    conversation_id: number;
    sender_id: number | null;
    sender_role: 'CUSTOMER' | 'RECEPTIONIST' | 'SYSTEM';
    content: string;
    createdAt: string;
}

interface Props {
    currentUserId?: number;
}

// Tin nhắn tham chiếu báo giá không có cột riêng - nhận diện qua mã "BG-<id>" trong content
const QUOTE_REFERENCE_PATTERN = /BG-(\d+)/;

export default function CustomerChatWidget({ currentUserId }: Props) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [conversationId, setConversationId] = useState<number | null>(null);
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [claimedByName, setClaimedByName] = useState<string | null>(null);
    const [viewingQuoteId, setViewingQuoteId] = useState<number | null>(null);
    const [quoteDetail, setQuoteDetail] = useState<QuoteReferenceData | null>(null);
    const [isQuoteLoading, setIsQuoteLoading] = useState(false);
    const [quoteError, setQuoteError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { fetchPrivate } = useFetchClient();
    const socket = useSocket();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const loadConversation = async () => {
        setIsLoading(true);
        try {
            const response = await fetchPrivate(CHAT_API_ENDPOINTS.GET_MY_CONVERSATION);
            if (response?.data) {
                setConversationId(response.data.conversation.id);
                setMessages(response.data.messages ?? []);
                setClaimedByName(response.data.conversation.claimedByUser?.fullName ?? null);
            }
        } catch (error) {
            console.error('Không tải được hội thoại:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const response = await fetchPrivate(CHAT_API_ENDPOINTS.GET_UNREAD_COUNT);
            if (response?.count !== undefined) {
                setUnreadCount(response.count);
            }
        } catch (error) {
            console.error('Không lấy được số tin nhắn chưa đọc:', error);
        }
    };

    useEffect(() => {
        fetchUnreadCount();
        const intervalId = setInterval(fetchUnreadCount, 60000);
        return () => clearInterval(intervalId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (isOpen) {
            loadConversation();
            setUnreadCount(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Cho phép các trang khác (vd. Theo dõi báo giá) yêu cầu mở chat và gửi kèm 1 tin nhắn tham chiếu báo giá
    useEffect(() => {
        const handleOpenWithQuote = (e: Event) => {
            const detail = (e as CustomEvent<{ quotationId?: number }>).detail;
            setIsOpen(true);
            if (detail?.quotationId) {
                void sendQuoteReference(detail.quotationId);
            }
        };
        window.addEventListener('open-customer-chat', handleOpenWithQuote);
        return () => window.removeEventListener('open-customer-chat', handleOpenWithQuote);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Realtime: nhận tin nhắn mới từ lễ tân
    useEffect(() => {
        if (!socket || !currentUserId) return;

        const joinUserRoom = () => socket.emit('join-user', currentUserId);
        joinUserRoom();
        socket.on('connect', joinUserRoom);

        const handleNewMessage = (payload: { conversationId: number; message: ChatMessage }) => {
            if (isOpen) {
                setMessages((prev) => [...prev, payload.message]);
            } else if (payload.message.sender_role === 'RECEPTIONIST') {
                setUnreadCount((prev) => prev + 1);
            }
        };
        socket.on('new_chat_message', handleNewMessage);

        const handleClaimed = (payload: { claimedByName: string | null }) => {
            setClaimedByName(payload.claimedByName);
        };
        socket.on('chat_conversation_claimed', handleClaimed);

        return () => {
            socket.off('connect', joinUserRoom);
            socket.off('new_chat_message', handleNewMessage);
            socket.off('chat_conversation_claimed', handleClaimed);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, currentUserId, isOpen]);

    const sendQuoteReference = async (quotationId: number) => {
        try {
            const response = await fetchPrivate(CHAT_API_ENDPOINTS.SEND_QUOTE_REFERENCE, 'POST', { quotationId });
            if (response?.data) {
                setMessages((prev) => [...prev, response.data]);
                setConversationId(response.data.conversation_id);
            }
        } catch (error) {
            console.error('Không gửi được báo giá vào hội thoại:', error);
        }
    };

    const handleViewQuote = async (quotationId: number) => {
        setViewingQuoteId(quotationId);
        setQuoteDetail(null);
        setQuoteError(null);
        setIsQuoteLoading(true);
        try {
            const response = await fetchPrivate(PROFILE_API_ENDPOINTS.GET_QUOTATION_BY_ID(quotationId));
            setQuoteDetail(response?.data ?? null);
        } catch (error: any) {
            setQuoteError(error?.message || t('chat.quoteModal.loadError', 'Không tải được báo giá.'));
        } finally {
            setIsQuoteLoading(false);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || isSending) return;

        const content = inputText.trim();
        setInputText('');
        setIsSending(true);
        try {
            const response = await fetchPrivate(CHAT_API_ENDPOINTS.SEND_MESSAGE, 'POST', { content });
            if (response?.data) {
                setMessages((prev) => [...prev, response.data]);
                setConversationId(response.data.conversation_id);
            }
        } catch (error) {
            console.error('Lỗi khi gửi tin nhắn:', error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed bottom-24 right-6 z-[9998] flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="mb-4 w-[350px] sm:w-[380px] h-[500px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200"
                    >
                        <div
                            className="px-4 py-4 flex items-center justify-between text-white"
                            style={{ backgroundColor: COLORS.navy }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                    <Headset className="w-6 h-6 text-[#F9A11B]" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base leading-tight">{t('chat.widgetTitle', 'Hỗ trợ từ lễ tân')}</h3>
                                    <span className="text-xs text-white/70 flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                        {claimedByName ? t('chat.agentHandling', '{{name}} đang xử lý', { name: claimedByName }) : t('chat.directChat', 'Trao đổi trực tiếp với xưởng')}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-2">
                                    <Headset className="w-8 h-8" />
                                    <p className="text-sm">{t('chat.emptyState', 'Gửi tin nhắn để được lễ tân hỗ trợ trực tiếp.')}</p>
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    if (msg.sender_role === 'SYSTEM') {
                                        return (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                key={msg.id}
                                                className="flex justify-center"
                                            >
                                                <span className="text-[11px] text-gray-500 bg-gray-100 rounded-full px-3 py-1.5 text-center max-w-[90%]">
                                                    {msg.content}
                                                </span>
                                            </motion.div>
                                        );
                                    }
                                    const quoteMatch = msg.content.match(QUOTE_REFERENCE_PATTERN);
                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            key={msg.id}
                                            className={`flex gap-2 max-w-[85%] ${msg.sender_role === 'CUSTOMER' ? 'ml-auto flex-row-reverse' : ''}`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender_role === 'CUSTOMER' ? 'bg-[#F9A11B] text-white' : 'bg-[#001C43] text-white'}`}>
                                                {msg.sender_role === 'CUSTOMER' ? <User className="w-5 h-5" /> : <Headset className="w-5 h-5" />}
                                            </div>
                                            <div
                                                className={`px-4 py-2 rounded-2xl text-[14px] leading-relaxed shadow-sm whitespace-pre-wrap ${
                                                    msg.sender_role === 'CUSTOMER'
                                                        ? 'bg-[#F9A11B] text-white rounded-tr-sm'
                                                        : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'
                                                }`}
                                            >
                                                {msg.content}
                                                {quoteMatch && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewQuote(Number(quoteMatch[1]))}
                                                        className={`mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-bold rounded-lg py-1.5 transition-all ${
                                                            msg.sender_role === 'CUSTOMER'
                                                                ? 'bg-white/20 hover:bg-white/30 text-white'
                                                                : 'bg-[#00285E] hover:brightness-110 text-white'
                                                        }`}
                                                    >
                                                        <ReceiptText size={13} />
                                                        {t('chat.viewQuoteDetail', 'Xem chi tiết báo giá')}
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-3 bg-white border-t border-gray-100">
                            <form
                                onSubmit={handleSendMessage}
                                className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full p-1.5 px-3 focus-within:border-[#F9A11B] focus-within:ring-1 focus-within:ring-[#F9A11B]/50 transition-all"
                            >
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder={t('chat.inputPlaceholder', 'Nhập tin nhắn cho lễ tân...')}
                                    className="flex-1 bg-transparent border-none outline-none text-[14px] text-gray-700 py-1.5 px-2"
                                    disabled={isSending}
                                />
                                <button
                                    type="submit"
                                    disabled={!inputText.trim() || isSending}
                                    className="p-2 bg-[#001C43] hover:bg-[#00285E] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full transition-colors flex items-center justify-center"
                                >
                                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 -ml-0.5" />}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.3)] transition-all z-50 group"
                style={{ backgroundColor: COLORS.navy }}
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div key="close" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }} transition={{ duration: 0.15 }}>
                            <X className="w-7 h-7 text-white" />
                        </motion.div>
                    ) : (
                        <motion.div key="chat" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }} transition={{ duration: 0.15 }}>
                            <MessageSquare className="w-7 h-7 text-white" />
                        </motion.div>
                    )}
                </AnimatePresence>
                {unreadCount > 0 && !isOpen && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-rose-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </motion.button>

            {viewingQuoteId !== null && (
                <QuoteReferenceModal
                    quotationId={viewingQuoteId}
                    isLoading={isQuoteLoading}
                    error={quoteError}
                    data={quoteDetail}
                    onClose={() => setViewingQuoteId(null)}
                />
            )}
        </div>
    );
}
