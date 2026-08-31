import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, User, Loader2, UserCheck, MessageCircle, ReceiptText } from "lucide-react";
import { useFetchClient_v2 as useFetchClient } from "../../hook/useFetchClient";
import { useSocket } from "../../hook/useSocket";
import { CHAT_API_ENDPOINTS } from "../../constants/reception/chatEndpoints";
import { QUOTE_MANAGEMENT_ENDPOINTS } from "../../constants/reception/quoteManagementEndpoints";
import QuoteReferenceModal, { type QuoteReferenceData } from "../../components/chat/QuoteReferenceModal";

// Tin nhắn tham chiếu báo giá không có cột riêng - nhận diện qua mã "BG-<id>" trong content
const QUOTE_REFERENCE_PATTERN = /BG-(\d+)/;

interface ChatCustomer {
  id: number;
  fullName?: string | null;
  phoneNumber?: string | null;
  avatar?: string | null;
}

interface ChatConversation {
  id: number;
  customer_id: number;
  claimed_by: number | null;
  last_message_at: string | null;
  customer?: ChatCustomer;
  claimedByUser?: { id: number; fullName?: string | null } | null;
  unreadCount: number;
}

interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_role: "CUSTOMER" | "RECEPTIONIST";
  content: string;
  createdAt: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: number;
}

const formatTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
};

export default function ReceptionChatPanel({ isOpen, onClose, currentUserId }: Props) {
  const { fetchPrivate } = useFetchClient();
  const socket = useSocket();

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [viewingQuoteId, setViewingQuoteId] = useState<number | null>(null);
  const [quoteDetail, setQuoteDetail] = useState<QuoteReferenceData | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = async () => {
    setIsLoadingList(true);
    try {
      const response = await fetchPrivate(CHAT_API_ENDPOINTS.GET_CONVERSATIONS);
      if (response?.data) {
        setConversations(response.data);
      }
    } catch (error) {
      console.error("Không tải được danh sách hội thoại:", error);
    } finally {
      setIsLoadingList(false);
    }
  };

  const loadConversationDetail = async (id: number) => {
    setIsLoadingDetail(true);
    try {
      const response = await fetchPrivate(CHAT_API_ENDPOINTS.GET_CONVERSATION_DETAIL(id));
      if (response?.data) {
        setMessages(response.data.messages ?? []);
      }
      // Đã đọc xong -> reset badge chưa đọc của hội thoại này trên danh sách
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)),
      );
    } catch (error) {
      console.error("Không tải được chi tiết hội thoại:", error);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (selectedId) {
      loadConversationDetail(selectedId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime: tin nhắn mới (của bất kỳ khách nào) và trạng thái claim
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (payload: { conversationId: number; message: ChatMessage }) => {
      if (payload.conversationId === selectedId) {
        // Tin do chính lễ tân gửi đã được thêm ngay lúc gọi API, socket bắn lại lần nữa
        // -> chặn theo id để không hiện 2 tin trùng.
        setMessages((prev) =>
          prev.some((m) => m.id === payload.message.id)
            ? prev
            : [...prev, payload.message],
        );
      }
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === payload.conversationId);
        if (!exists) {
          loadConversations();
          return prev;
        }
        return prev
          .map((c) =>
            c.id === payload.conversationId
              ? {
                  ...c,
                  last_message_at: payload.message.createdAt,
                  unreadCount:
                    payload.conversationId === selectedId ||
                    payload.message.sender_role === "RECEPTIONIST"
                      ? c.unreadCount
                      : c.unreadCount + 1,
                }
              : c,
          )
          .sort(
            (a, b) =>
              new Date(b.last_message_at ?? 0).getTime() -
              new Date(a.last_message_at ?? 0).getTime(),
          );
      });
    };

    const handleClaimed = (payload: {
      conversationId: number;
      claimedBy: number | null;
      claimedByName: string | null;
    }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === payload.conversationId
            ? {
                ...c,
                claimed_by: payload.claimedBy,
                claimedByUser: payload.claimedBy
                  ? { id: payload.claimedBy, fullName: payload.claimedByName }
                  : null,
              }
            : c,
        ),
      );
    };

    socket.on("new_chat_message", handleNewMessage);
    socket.on("chat_conversation_claimed", handleClaimed);
    return () => {
      socket.off("new_chat_message", handleNewMessage);
      socket.off("chat_conversation_claimed", handleClaimed);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, selectedId]);

  const handleClaim = async (conversationId: number) => {
    try {
      await fetchPrivate(CHAT_API_ENDPOINTS.CLAIM(conversationId), "POST");
    } catch (error) {
      console.error("Lỗi khi nhận xử lý hội thoại:", error);
    }
  };

  const handleUnclaim = async (conversationId: number) => {
    try {
      await fetchPrivate(CHAT_API_ENDPOINTS.UNCLAIM(conversationId), "POST");
    } catch (error) {
      console.error("Lỗi khi bỏ nhận xử lý hội thoại:", error);
    }
  };

  const handleViewQuote = async (quotationId: number) => {
    setViewingQuoteId(quotationId);
    setQuoteDetail(null);
    setQuoteError(null);
    setIsQuoteLoading(true);
    try {
      const response = await fetchPrivate(QUOTE_MANAGEMENT_ENDPOINTS.GET_QUOTATION_BY_ID(quotationId));
      setQuoteDetail(response?.data ?? null);
    } catch (error: any) {
      setQuoteError(error?.message || "Không tải được báo giá.");
    } finally {
      setIsQuoteLoading(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !selectedId || isSending || !canSendMessage) return;
    const content = inputText.trim();
    setInputText("");
    setIsSending(true);
    try {
      const response = await fetchPrivate(
        CHAT_API_ENDPOINTS.SEND_MESSAGE(selectedId),
        "POST",
        { content },
      );
      if (response?.data) {
        setMessages((prev) =>
          prev.some((m) => m.id === response.data.id)
            ? prev
            : [...prev, response.data],
        );
      }
    } catch (error) {
      console.error("Lỗi khi gửi tin nhắn:", error);
    } finally {
      setIsSending(false);
    }
  };

  const selectedConversation = conversations.find((c) => c.id === selectedId);
  const isClaimedByOther =
    !!selectedConversation?.claimed_by &&
    selectedConversation.claimed_by !== currentUserId;
  const isClaimedByMe =
    !!selectedConversation?.claimed_by &&
    selectedConversation.claimed_by === currentUserId;
  const canSendMessage = isClaimedByMe;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="fixed right-6 top-20 z-[95] w-[min(720px,calc(100vw-3rem))] h-[min(560px,calc(100vh-8rem))] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cột trái: danh sách hội thoại */}
            <div className="w-[260px] shrink-0 border-r border-slate-100 flex flex-col bg-slate-50/60">
              <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
                <h3 className="font-bold text-slate-800 text-sm">Tin nhắn khách hàng</h3>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {isLoadingList ? (
                  <div className="flex items-center justify-center py-10 text-slate-400">
                    <Loader2 size={20} className="animate-spin" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Chưa có khách hàng nào nhắn tin
                  </div>
                ) : (
                  conversations.map((c) => {
                    const isActive = c.id === selectedId;
                    const name = c.customer?.fullName || c.customer?.phoneNumber || "Khách hàng";
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        className={`w-full text-left px-4 py-3 border-b border-slate-100 transition-colors ${
                          isActive ? "bg-[#EDF3FF]" : "hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-800 truncate">
                            {name}
                          </span>
                          {c.unreadCount > 0 && (
                            <span className="shrink-0 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                              {c.unreadCount > 99 ? "99+" : c.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <span className="text-[11px] text-slate-400">
                            {formatTime(c.last_message_at)}
                          </span>
                          {c.claimedByUser && (
                            <span className="text-[10px] font-semibold text-[#00285E] bg-white border border-slate-200 rounded-full px-1.5 py-0.5 truncate max-w-[110px]">
                              {c.claimedByUser.fullName ?? "Đang xử lý"}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Cột phải: khung chat */}
            <div className="flex-1 flex flex-col min-w-0">
              {!selectedId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <MessageCircle size={32} />
                  <p className="text-sm">Chọn một hội thoại để bắt đầu</p>
                </div>
              ) : (
                <>
                  <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {selectedConversation?.customer?.fullName ||
                          selectedConversation?.customer?.phoneNumber ||
                          "Khách hàng"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {selectedConversation?.customer?.phoneNumber}
                      </p>
                    </div>
                    {selectedConversation?.claimed_by ? (
                      <button
                        onClick={() => handleUnclaim(selectedConversation.id)}
                        disabled={isClaimedByOther}
                        title={
                          isClaimedByOther
                            ? `Đang được ${selectedConversation.claimedByUser?.fullName ?? "người khác"} xử lý`
                            : "Bỏ nhận xử lý"
                        }
                        className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <UserCheck size={13} />
                        {isClaimedByOther
                          ? selectedConversation.claimedByUser?.fullName ?? "Đang xử lý"
                          : "Đang xử lý (bạn)"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleClaim(selectedConversation!.id)}
                        className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[#00285E] text-white hover:brightness-110 transition-all"
                      >
                        <UserCheck size={13} />
                        Nhận xử lý
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                    {isLoadingDetail ? (
                      <div className="flex items-center justify-center h-full text-slate-400">
                        <Loader2 size={20} className="animate-spin" />
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const quoteMatch = msg.content.match(QUOTE_REFERENCE_PATTERN);
                        return (
                          <div
                            key={msg.id}
                            className={`flex gap-2 max-w-[80%] ${
                              msg.sender_role === "RECEPTIONIST" ? "ml-auto flex-row-reverse" : ""
                            }`}
                          >
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                msg.sender_role === "RECEPTIONIST"
                                  ? "bg-[#00285E] text-white"
                                  : "bg-[#F9A11B] text-white"
                              }`}
                            >
                              <User size={14} />
                            </div>
                            <div
                              className={`px-3.5 py-2 rounded-2xl text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap ${
                                msg.sender_role === "RECEPTIONIST"
                                  ? "bg-[#00285E] text-white rounded-tr-sm"
                                  : "bg-white text-slate-800 border border-slate-100 rounded-tl-sm"
                              }`}
                            >
                              {msg.content}
                              {quoteMatch && (
                                <button
                                  type="button"
                                  onClick={() => handleViewQuote(Number(quoteMatch[1]))}
                                  className={`mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-bold rounded-lg py-1.5 transition-all ${
                                    msg.sender_role === "RECEPTIONIST"
                                      ? "bg-white/20 hover:bg-white/30 text-white"
                                      : "bg-[#00285E] hover:brightness-110 text-white"
                                  }`}
                                >
                                  <ReceiptText size={13} />
                                  Xem chi tiết báo giá
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-3 border-t border-slate-100 shrink-0">
                    {!canSendMessage && (
                      <p className="text-[11px] text-slate-400 mb-1.5 px-1">
                        {isClaimedByOther
                          ? `Đang được ${selectedConversation?.claimedByUser?.fullName ?? "người khác"} xử lý — bạn không thể nhắn tin`
                          : "Bạn cần bấm \"Nhận xử lý\" trước khi nhắn tin"}
                      </p>
                    )}
                    <form
                      onSubmit={handleSend}
                      className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full p-1.5 px-3 focus-within:border-[#00285E]/40"
                    >
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={
                          canSendMessage
                            ? "Nhập tin nhắn trả lời khách..."
                            : "Nhận xử lý để bắt đầu nhắn tin"
                        }
                        className="flex-1 bg-transparent border-none outline-none text-[13px] text-slate-700 py-1.5 px-2 disabled:cursor-not-allowed"
                        disabled={isSending || !canSendMessage}
                      />
                      <button
                        type="submit"
                        disabled={!inputText.trim() || isSending || !canSendMessage}
                        className="p-2 bg-[#00285E] hover:brightness-110 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-full transition-colors flex items-center justify-center"
                      >
                        {isSending ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Send size={14} />
                        )}
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
      {viewingQuoteId !== null && (
        <QuoteReferenceModal
          quotationId={viewingQuoteId}
          isLoading={isQuoteLoading}
          error={quoteError}
          data={quoteDetail}
          onClose={() => setViewingQuoteId(null)}
        />
      )}
    </AnimatePresence>
  );
}
