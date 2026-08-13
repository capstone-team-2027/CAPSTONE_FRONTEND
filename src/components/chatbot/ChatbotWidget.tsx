import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useFetchClient_v2 } from '../../hook/useFetchClient';
import { COLORS } from '../share/Color';

type Message = {
    id: string;
    role: 'user' | 'model';
    content: string;
};

const getChatErrorMessage = (error: unknown, fallback: string) => {
    const message = error instanceof Error ? error.message.trim() : '';
    if (!message || message === 'Failed to fetch' || /networkerror|network request failed/i.test(message)) {
        return 'Không thể kết nối tới máy chủ chatbot. Vui lòng kiểm tra backend đã chạy hoặc đã được triển khai phiên bản mới rồi thử lại.';
    }
    if (/gửi tin nhắn quá nhanh|sau một phút/i.test(message)) {
        return message;
    }
    if (/phiên đăng nhập|đăng nhập lại/i.test(message)) {
        return message;
    }
    if (/tin nhắn.*để trống|vượt quá giới hạn/i.test(message)) {
        return message;
    }
    return fallback;
};

function BookingRouteButton({ navigate }: { navigate: (path: string) => void }) {
    return (
        <button
            type="button"
            onClick={() => navigate('/phone-service')}
            className="inline-block px-3 py-1 mx-0.5 rounded-full font-bold text-[13px] align-middle"
            style={{ backgroundColor: '#F9A11B', color: '#001C43' }}
        >
            Đặt lịch ngay
        </button>
    );
}

function AppointmentsRedirectButton({ navigate }: { navigate: (path: string, options?: { state?: unknown }) => void }) {
    return (
        <button
            type="button"
            onClick={() => navigate('/user-profile', { state: { activeTab: 'appointments' } })}
            className="mt-2 px-3 py-1.5 rounded-full font-bold text-[13px]"
            style={{ backgroundColor: '#F9A11B', color: '#001C43' }}
        >
            Xem lịch hẹn của tôi
        </button>
    );
}

function ChatMessageContent({ content, navigate }: { content: string; navigate: ReturnType<typeof useNavigate> }) {
    const isBookingSuccess = content.startsWith('Đặt lịch thành công');
    return (
        <>
            {content.split('\n').map((line, index, lines) => {
                const labelMatch = line.match(/^(\s*-?\s*)((?:Bước\s+\d+|Sau khi hoàn tất)\s*:)(.*)$/i);
                const bodyText = labelMatch ? labelMatch[3] : line;
                const segments = bodyText.split('/phone-service');
                return (
                    <React.Fragment key={`${index}-${line.slice(0, 20)}`}>
                        {labelMatch && (
                            <>
                                {labelMatch[1]}
                                <strong className="font-bold text-[#001C43]">{labelMatch[2]}</strong>
                            </>
                        )}
                        {segments.map((segment, segIndex) => (
                            <React.Fragment key={segIndex}>
                                {segment}
                                {segIndex < segments.length - 1 && <BookingRouteButton navigate={navigate} />}
                            </React.Fragment>
                        ))}
                        {index < lines.length - 1 && <br />}
                    </React.Fragment>
                );
            })}
            {isBookingSuccess && (
                <div>
                    <AppointmentsRedirectButton navigate={navigate} />
                </div>
            )}
        </>
    );
}

export default function ChatbotWidget() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'model',
            content: t('chatbot.greeting', 'Chào bạn! Mình là trợ lý ảo của Gara. Bạn cần hỗ trợ thông tin gì về dịch vụ, bảo hành hay cứu hộ không?')
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chatContext, setChatContext] = useState<any>({}); // Thêm state lưu context
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { fetchPublic, fetchPrivate } = useFetchClient_v2();

    // Tự động cuộn xuống tin nhắn mới nhất
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        
        if (!inputText.trim() || isLoading) return;

        const userMessage = inputText.trim();
        setInputText('');
        
        // Thêm tin nhắn của user vào giao diện
        const newUserMsg: Message = { id: Date.now().toString(), role: 'user', content: userMessage };
        setMessages(prev => [...prev, newUserMsg]);
        setIsLoading(true);

        try {
            // Chuyển đổi định dạng history để gửi lên API (API cần mảng { role, parts: [{ text }] })
            const history = messages
                .filter(m => m.id !== '1') // Bỏ câu chào mặc định ban đầu ra khỏi lịch sử nếu muốn
                .slice(-20) // Chỉ gửi các lượt gần nhất, tránh vượt giới hạn API khi hội thoại dài
                .map(m => ({
                    role: m.role,
                    parts: [{ text: m.content }]
                }));

            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
            const request = localStorage.getItem('token') ? fetchPrivate : fetchPublic;
            const response = await request(
                `${apiBaseUrl}/api/chatbot/chat`,
                'POST', 
                {
                    message: userMessage,
                    history,
                    context: {
                        ...chatContext,
                        currentPath: window.location.pathname,
                        currentScreen: sessionStorage.getItem('customerActiveScreen') || undefined
                    }
                }
            );

            if (response && response.data) {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'model',
                    content: response.data.reply || response.data.answer || t('chatbot.noReply', 'Không có nội dung trả về.')
                }]);
                // Cập nhật lại context mới từ server trả về
                if (response.data.context) {
                    setChatContext(response.data.context);
                }
            }
        } catch (error) {
            console.error("Lỗi khi chat:", error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'model',
                content: getChatErrorMessage(
                    error,
                    t('chatbot.errorReply', 'Xin lỗi, hệ thống đang bận. Bạn vui lòng thử lại sau nhé!')
                )
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="mb-4 w-[350px] sm:w-[380px] h-[500px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200"
                    >
                        {/* Header */}
                        <div 
                            className="px-4 py-4 flex items-center justify-between text-white"
                            style={{ backgroundColor: COLORS.navy }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                    <Bot className="w-6 h-6 text-[#F9A11B]" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base leading-tight">{t('chatbot.title', 'Gara Assistant')}</h3>
                                    <span className="text-xs text-white/70 flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                        {t('chatbot.subtitle', 'Luôn sẵn sàng hỗ trợ')}
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

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                            {messages.map((msg) => (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={msg.id} 
                                    className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-[#F9A11B] text-white' : 'bg-[#001C43] text-white'}`}>
                                        {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                                    </div>
                                    <div 
                                        className={`px-4 py-2 rounded-2xl text-[14px] leading-relaxed shadow-sm whitespace-pre-wrap ${
                                            msg.role === 'user' 
                                                ? 'bg-[#F9A11B] text-white rounded-tr-sm' 
                                                : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'
                                        }`}
                                    >
                                        <ChatMessageContent content={msg.content} navigate={navigate} />
                                    </div>
                                </motion.div>
                            ))}

                            {/* Typing Indicator */}
                            {isLoading && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-2 max-w-[85%]"
                                >
                                    <div className="w-8 h-8 rounded-full bg-[#001C43] text-white flex items-center justify-center shrink-0">
                                        <Bot className="w-5 h-5" />
                                    </div>
                                    <div className="px-4 py-3 bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white border-t border-gray-100">
                            <form 
                                onSubmit={handleSendMessage}
                                className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full p-1.5 px-3 focus-within:border-[#F9A11B] focus-within:ring-1 focus-within:ring-[#F9A11B]/50 transition-all"
                            >
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder={t('chatbot.inputPlaceholder', 'Nhập câu hỏi của bạn...')}
                                    className="flex-1 bg-transparent border-none outline-none text-[14px] text-gray-700 py-1.5 px-2"
                                    disabled={isLoading}
                                />
                                <button
                                    type="submit"
                                    disabled={!inputText.trim() || isLoading}
                                    className="p-2 bg-[#001C43] hover:bg-[#00285E] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full transition-colors flex items-center justify-center"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 -ml-0.5" />}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bubble Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:shadow-[0_8px_30px_rgb(249,161,27,0.4)] transition-all z-50 group"
                style={{ backgroundColor: COLORS.orange }}
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div
                            key="close"
                            initial={{ opacity: 0, rotate: -90 }}
                            animate={{ opacity: 1, rotate: 0 }}
                            exit={{ opacity: 0, rotate: 90 }}
                            transition={{ duration: 0.15 }}
                        >
                            <X className="w-7 h-7 text-white" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="chat"
                            initial={{ opacity: 0, rotate: -90 }}
                            animate={{ opacity: 1, rotate: 0 }}
                            exit={{ opacity: 0, rotate: 90 }}
                            transition={{ duration: 0.15 }}
                        >
                            <MessageCircle className="w-7 h-7 text-[#001C43] group-hover:text-white transition-colors" />
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {/* Ping animation effect */}
                {!isOpen && (
                    <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: COLORS.orange }}></span>
                )}
            </motion.button>
        </div>
    );
}
