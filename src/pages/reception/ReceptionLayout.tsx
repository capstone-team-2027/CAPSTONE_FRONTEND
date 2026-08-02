import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CalendarCheck,
  ClipboardPlus,
  FileText,
  CreditCard,
  MessageSquare,
  History,
  HelpCircle,
  LogOut,
  Bell,
  Menu,
  X,
  CheckCircle,
  Info,
  AlertTriangle,
  Wrench,
  Video,
  PhoneCall,
  Users,
  MessageCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import type { UserModel } from "../../model/User";
import { useFetchClient_v2 as useFetchClient } from "../../hook/useFetchClient";
import { loginSuccess, logout } from "../../store/slices/userSlice";
import { PROFILE_API_ENDPOINTS } from "../../constants/common/profileEndpoints";
import { NOTIFICATION_API_ENDPOINTS } from "../../constants/reception/notificationEndpoints";
import { CHAT_API_ENDPOINTS } from "../../constants/reception/chatEndpoints";
import { useSocket } from "../../hook/useSocket";
import ReceptionChatPanel from "./ReceptionChatPanel";

export default function ReceptionLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { fetchPrivate } = useFetchClient();

  const user = useSelector(
    (state: RootState) => state.user.user as UserModel | null,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "info" | "warning";
    text: string;
  } | null>(null);

  // State nhận cuộc gọi Video
  const [incomingCall, setIncomingCall] = useState<{
    roomId: string;
    timestamp: any;
  } | null>(null);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationDropdown, setShowNotificationDropdown] =
    useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const desktopNotifRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);
  // Hẹn giờ tự đóng dropdown khi mở do có thông báo mới
  const autoCloseNotifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showNotificationDropdown) {
        const target = event.target as Node;
        const isOutsideDesktop =
          desktopNotifRef.current && !desktopNotifRef.current.contains(target);
        const isOutsideMobile =
          mobileNotifRef.current && !mobileNotifRef.current.contains(target);

        // If clicked outside both the desktop and mobile dropdown containers
        if (isOutsideDesktop !== false && isOutsideMobile !== false) {
          setShowNotificationDropdown(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotificationDropdown]);

  const { i18n } = useTranslation();

  const showToast = (
    text: string,
    type: "success" | "info" | "warning" = "success",
  ) => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetchPrivate(PROFILE_API_ENDPOINTS.GET_PROFILE);
        const userData = response?.data;
        if (!userData) return;
        dispatch(
          loginSuccess({
            id: userData.id,
            fullName: userData.fullName,
            phoneNumber: userData.phoneNumber,
            avatar: userData.avatar,
            role:
              typeof userData.role === "object"
                ? userData.role?.roleCode
                : userData.role,
          }),
        );
      } catch (error) {
        console.error("Không lấy được thông tin user:", error);
      }
    };

    const token = localStorage.getItem("token");
    if (token && !user) fetchUserProfile();
  }, [dispatch, fetchPrivate, user]);

  const socket = useSocket();

  const loadChatUnreadCount = async () => {
    try {
      const response = await fetchPrivate(CHAT_API_ENDPOINTS.GET_UNREAD_COUNT);
      if (response && typeof response.count === "number") {
        setChatUnreadCount(response.count);
      }
    } catch (error) {
      console.error("Lỗi khi tải số lượng tin nhắn chưa đọc", error);
    }
  };

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const response = await fetchPrivate(
          NOTIFICATION_API_ENDPOINTS.GET_NOTIFICATIONS,
        );
        if (Array.isArray(response)) {
          setNotifications(response);
        }
      } catch (error) {
        console.error("Lỗi khi tải thông báo", error);
      }
    };

    const loadUnreadCount = async () => {
      try {
        const response = await fetchPrivate(
          NOTIFICATION_API_ENDPOINTS.GET_UNREAD_COUNT,
        );
        if (response && typeof response.count === "number") {
          setUnreadCount(response.count);
        }
      } catch (error) {
        console.error("Lỗi khi tải số lượng thông báo chưa đọc", error);
      }
    };

    if (user) {
      loadNotifications();
      loadUnreadCount();
      loadChatUnreadCount();
    }

    if (socket) {
      // Vào room theo role để nhận thông báo BE emit tới role-RECEPTIONIST.
      // Join ngay và join lại mỗi khi socket reconnect.
      const roleCode = user?.role;
      const joinRole = () => {
        if (roleCode) socket.emit("join-role", roleCode);
      };
      joinRole();
      socket.on("connect", joinRole);

      const handleNewNotification = () => {
        // Tải lại danh sách + số chưa đọc, rồi bật dropdown chuông vài giây
        loadNotifications();
        loadUnreadCount();
        setShowNotificationDropdown(true);
        if (autoCloseNotifTimer.current)
          clearTimeout(autoCloseNotifTimer.current);
        autoCloseNotifTimer.current = setTimeout(() => {
          setShowNotificationDropdown(false);
        }, 4000);
      };

      const handleIncomingCall = (data: any) => {
        setIncomingCall(data);
        showToast("Có cuộc gọi Video khẩn cấp từ khách hàng!", "warning");
      };

      const handleCallAnswered = (data: any) => {
        // Nếu 1 lễ tân khác đã bấm nghe, thì tắt chuông ở máy của các lễ tân còn lại
        setIncomingCall((current) => {
          if (current && current.roomId === data.roomId) {
            return null;
          }
          return current;
        });
      };

      const handleCallEnded = (data: any) => {
        // Nếu khách hàng dập máy hoặc quá giờ, tự tắt chuông
        setIncomingCall((current) => {
          if (current && current.roomId === data.roomId) {
            showToast("Khách hàng đã kết thúc cuộc gọi", "info");
            return null;
          }
          return current;
        });
      };

      const handleNewChatMessage = (payload: { message?: { sender_role?: string } }) => {
        if (payload?.message?.sender_role === "CUSTOMER") {
          loadChatUnreadCount();
        }
      };

      socket.on("new_notification", handleNewNotification);
      socket.on("incoming-video-call", handleIncomingCall);
      socket.on("call-answered", handleCallAnswered);
      socket.on("end-video-call", handleCallEnded);
      socket.on("new_chat_message", handleNewChatMessage);

      return () => {
        socket.off("connect", joinRole);
        socket.off("new_notification", handleNewNotification);
        socket.off("incoming-video-call", handleIncomingCall);
        socket.off("call-answered", handleCallAnswered);
        socket.off("new_chat_message", handleNewChatMessage);
        socket.off("end-video-call", handleCallEnded);
      };
    }
  }, [user, fetchPrivate, socket]);

  const avatarUrl =
    user?.avatar?.trim() ||
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=256&auto=format&fit=crop";
  const displayName = user?.fullName || "Nhân viên tiếp nhận";
  const displayRole =
    user?.role?.toUpperCase() === "RECEPTIONIST"
      ? "Nhân viên tiếp nhận"
      : user?.role || "Nhân viên tiếp nhận";

  const menuGroups = [
    {
      label: 'Dịch vụ',
      items: [
        { name: "Lịch hẹn", icon: CalendarCheck, path: "/reception/appointments" },
        { name: "Quản lý báo giá", icon: FileText, path: "/reception/quotes" },
        { name: "Quản lý hóa đơn dịch vụ", icon: ClipboardPlus, path: "/reception/service-orders" },
      ],
    },
    {
      label: 'Khách hàng',
      items: [
        { name: 'Khách hàng & Cứu hộ', icon: Users, path: '/reception/customers' },
        { name: 'Kỹ thuật viên hôm nay', icon: Wrench, path: '/reception/technicians' },
      ],
    },
    {
      label: 'Hỗ trợ',
      items: [
        { name: "Báo cáo lỗi", icon: FileText, path: "/reception/issues" },
        { name: "Phản hồi khách hàng", icon: MessageSquare, path: "/reception/feedback" },
      ],
    },
  ];

  const menuItems = menuGroups.flatMap((group) => group.items);

  // Dynamic active menu item based on current URL path
  const activeMenu = useMemo(() => {
    const path = location.pathname;
    if (path.includes("/appointments")) return "Lịch hẹn";
    if (path.includes("/additional-issues")) return "Lỗi phát sinh";
    if (path.includes("/issues")) return "Báo cáo lỗi";
    if (path.includes("/quotes")) return "Quản lý báo giá";
    if (path.includes('/customers')) return 'Khách hàng & Cứu hộ';
    if (path.includes('/technicians')) return 'Kỹ thuật viên hôm nay';
    if (path.includes("/feedback")) return "Phản hồi khách hàng";
    if (path.includes("/service-orders")) return "Quản lý hóa đơn dịch vụ";

    return "Danh sách lịch hẹn";
  }, [location.pathname]);

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {/* Sidebar Header */}
      <div className="h-20 px-4 border-b border-[#D2E2FF] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00285E] flex items-center justify-center shadow-md">
            <Wrench size={20} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[#00285E] uppercase tracking-wider text-base">
              AGM Intelligent
            </span>
            <span className="text-[10px] text-slate-500 font-semibold tracking-widest uppercase">
              Nhân viên tiếp nhận
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsMobileSidebarOpen(false)}
          className="md:hidden p-1 rounded-lg hover:bg-[#D2E2FF] text-[#00285E] transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation Section */}
      <div className="flex-1 overflow-y-auto px-2 py-5 space-y-5 scrollbar-none">
        <div className="w-full max-w-[220px] mx-auto space-y-5">
          {menuGroups.map((group, groupIndex) => (
            <div key={group.label ?? `group-${groupIndex}`}>
              {group.label && (
                <span className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  {group.label}
                </span>
              )}
              <nav className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeMenu === item.name;
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        navigate(item.path);
                        onNavigate?.();
                      }}
                      className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group ${isActive
                        ? "bg-[#00285E] text-white shadow-lg shadow-[#00285E]/15"
                        : "text-slate-600 hover:bg-[#E0ECFF] hover:text-[#00285E]"
                        }`}
                    >
                      <Icon
                        size={18}
                        className={
                          isActive
                            ? "text-[#F9A11B]"
                            : "text-slate-500 group-hover:text-[#00285E]"
                        }
                      />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-[#D2E2FF] space-y-1">
        <button
          onClick={() =>
            showToast("Chức năng hỗ trợ đang được kết nối...", "info")
          }
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-[#E0ECFF] hover:text-[#00285E] transition-colors"
        >
          <HelpCircle size={18} className="text-slate-500" />
          <span>Hỗ trợ</span>
        </button>
        <button
          onClick={() => {
            if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
              showToast("Đang đăng xuất tài khoản...", "warning");
              localStorage.removeItem("token");
              localStorage.removeItem("userAvatar");
              dispatch(logout());
              setTimeout(() => {
                window.location.href = "/login";
              }, 1000);
            }
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut size={18} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </>
  );

  const NotificationDropdown = () => (
    <AnimatePresence>
      {showNotificationDropdown && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[60] origin-top-right"
        >
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-800">Thông báo</h3>
            <span className="text-xs font-semibold bg-[#E0ECFF] text-[#00285E] px-2.5 py-1 rounded-md">
              {unreadCount} mới
            </span>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${!notif.isRead ? "bg-blue-50/30" : ""}`}
                  onClick={async () => {
                    if (!notif.isRead) {
                      try {
                        await fetchPrivate(
                          NOTIFICATION_API_ENDPOINTS.MARK_AS_READ(notif.id),
                          "PUT",
                        );
                        setNotifications((prev) =>
                          prev.map((n) =>
                            n.id === notif.id ? { ...n, isRead: true } : n,
                          ),
                        );
                        setUnreadCount((prev) => Math.max(0, prev - 1));
                      } catch (error) {
                        console.error(
                          "Lỗi khi đánh dấu thông báo đã đọc:",
                          error,
                        );
                      }
                    }
                    if (notif.link) {
                      navigate(notif.link);
                      setShowNotificationDropdown(false);
                    }
                  }}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <h4
                      className={`text-sm ${!notif.isRead ? "font-bold text-slate-800" : "font-semibold text-slate-600"}`}
                    >
                      {notif.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-2">
                      {new Date(notif.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {notif.content}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
                <Bell size={24} className="text-slate-300" />
                <span>Không có thông báo nào</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen bg-[#F4F7FC] font-sans antialiased text-slate-800 flex flex-col md:flex-row relative">
      {/* Dynamic Toast Notifications - card góc phải màn hình */}
      <div className="fixed top-5 right-5 z-[200] flex flex-col gap-3 w-[min(360px,calc(100vw-2.5rem))]">
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="relative flex items-start gap-3 bg-white rounded-2xl shadow-xl border border-slate-100 pl-5 pr-3 py-4 overflow-hidden"
            >
              {/* Thanh màu bên trái theo loại */}
              <span
                className={`absolute left-0 top-0 h-full w-1.5 rounded-r ${
                  toastMessage.type === "success"
                    ? "bg-emerald-500"
                    : toastMessage.type === "warning"
                      ? "bg-amber-500"
                      : "bg-blue-500"
                }`}
              />
              <span className="shrink-0 mt-0.5">
                {toastMessage.type === "success" && (
                  <CheckCircle size={18} className="text-emerald-500" />
                )}
                {toastMessage.type === "info" && (
                  <Info size={18} className="text-blue-500" />
                )}
                {toastMessage.type === "warning" && (
                  <AlertTriangle size={18} className="text-amber-500" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-slate-800 leading-tight">
                  {toastMessage.type === "success"
                    ? "Thành công"
                    : toastMessage.type === "warning"
                      ? "Cảnh báo"
                      : "Thông báo"}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {toastMessage.text}
                </p>
              </div>
              <button
                onClick={() => setToastMessage(null)}
                className="shrink-0 p-1 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <X size={15} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Màn hình hiển thị cuộc gọi đến (Video Call Ringing) */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
          >
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-rose-500/20 to-transparent"></div>

              <div className="w-24 h-24 bg-rose-100 rounded-full flex items-center justify-center mb-6 relative animate-bounce">
                <div className="absolute inset-0 bg-rose-500 rounded-full animate-ping opacity-20"></div>
                <Video size={40} className="text-rose-600 relative z-10" />
              </div>

              <h3 className="text-2xl font-bold text-slate-800 mb-2">
                Cuộc gọi khẩn cấp
              </h3>
              <p className="text-slate-500 mb-8">
                Một Khách hàng đang gọi Video (SOS) cho Lễ tân...
              </p>

              <div className="flex items-center gap-4 w-full">
                <button
                  type="button"
                  onClick={() => {
                    if (incomingCall?.roomId) {
                      socket?.emit('end-video-call', { roomId: incomingCall.roomId, reason: 'rejected' });
                    }
                    setIncomingCall(null);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Từ chối
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const roomId = incomingCall.roomId;
                    setIncomingCall(null);
                    // Báo cho Server biết "TÔI ĐÃ NGHE", hãy bảo các Lễ tân khác tắt chuông đi
                    socket?.emit("accept-video-call", { roomId });
                    navigate(`/video-call/${roomId}`);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
                >
                  <PhoneCall size={18} />
                  Nghe máy
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE HEADER BAR */}
      <header className="md:hidden bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100 shadow-sm z-30 sticky top-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 uppercase tracking-tight text-sm">
              AGM Intelligent
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative" ref={mobileNotifRef}>
            <button
              onClick={() =>
                setShowNotificationDropdown(!showNotificationDropdown)
              }
              className="p-1.5 rounded-full hover:bg-slate-100 transition-colors text-slate-600 relative"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            <NotificationDropdown />
          </div>
          <button
            onClick={() => {
              const next = !isChatOpen;
              setIsChatOpen(next);
              if (!next) loadChatUnreadCount();
            }}
            className="p-1.5 rounded-full hover:bg-slate-100 transition-colors text-slate-600 relative"
          >
            <MessageCircle size={20} />
            {chatUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white">
                {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
              </span>
            )}
          </button>
          <img
            src={avatarUrl}
            alt="Reception Profile"
            className="w-9 h-9 rounded-full object-cover border border-slate-200"
          />
        </div>
      </header>

      {/* SIDEBAR ON DESKTOP */}
      <aside
        className="fixed inset-y-0 left-0 bg-[#EDF3FF] border-r border-[#D2E2FF] w-72 transform -translate-x-full md:translate-x-0 transition-transform duration-300 ease-in-out z-40 md:sticky md:h-screen md:flex md:flex-col shrink-0 hidden md:block"
        style={{ height: "100vh" }}
      >
        <SidebarContent />
      </aside>

      {/* MOBILE DRAWER SIDEBAR */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          ></div>
          <aside className="relative flex flex-col w-72 bg-[#EDF3FF] border-r border-[#D2E2FF] h-full p-0">
            <SidebarContent onNavigate={() => setIsMobileSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 pb-16">
        {/* DESKTOP HEADER BAR */}
        <header className="hidden md:flex bg-white h-20 px-8 items-center justify-end border-b border-slate-100 shadow-xs sticky top-0 z-30">
          {/* Search bar */}


          {/* User profile & Actions */}
          <div className="flex items-center gap-6">
            {/* Quick action buttons */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 border border-slate-200 rounded-full p-0.5 bg-slate-50 select-none">
                <button
                  onClick={() => i18n.changeLanguage('vi')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all ${i18n.language === 'vi' ? 'bg-[#00285E] text-white' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  VI
                </button>
                <button
                  onClick={() => i18n.changeLanguage('en')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all ${i18n.language.startsWith('en') ? 'bg-[#00285E] text-white' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  EN
                </button>
              </div>
              <div className="relative" ref={desktopNotifRef}>
                <button
                  onClick={() =>
                    setShowNotificationDropdown(!showNotificationDropdown)
                  }
                  title="Thông báo"
                  className="w-10 h-10 rounded-xl flex items-center justify-center bg-white text-[#00285E] hover:bg-slate-50 transition-colors relative"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>
                <NotificationDropdown />
              </div>
              <button
                onClick={() => {
                  const next = !isChatOpen;
                  setIsChatOpen(next);
                  if (!next) loadChatUnreadCount();
                }}
                title="Tin nhắn khách hàng"
                className="w-10 h-10 rounded-xl flex items-center justify-center bg-white text-[#00285E] hover:bg-slate-50 transition-colors relative"
              >
                <MessageCircle size={18} />
                {chatUnreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white">
                    {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => showToast("Mở trung tâm trợ giúp...", "info")}
                title="Trợ giúp"
                className="w-10 h-10 rounded-xl flex items-center justify-center bg-white text-[#00285E] hover:bg-slate-50 transition-colors"
              >
                <HelpCircle size={18} />
              </button>
            </div>

            {/* Vertical Divider */}
            <div className="w-[1px] h-8 bg-slate-200"></div>

            {/* User detail */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right">
                <span className="font-bold text-slate-800 text-sm tracking-tight leading-tight">
                  {displayName}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold tracking-wide uppercase">
                  {displayRole}
                </span>
              </div>
              <div className="relative">
                <img
                  src={avatarUrl}
                  alt="Reception User Avatar"
                  className="w-10 h-10 rounded-full object-cover border-2 border-[#EDF3FF] shadow-sm"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>
            </div>
          </div>
        </header>

        {/* NESTED CONTENT PAGES RENDER HERE */}
        <Outlet context={{ searchQuery, setSearchQuery, showToast }} />

        {/* PAGE FOOTER */}
        <footer className="mt-auto px-8 py-6 border-t border-slate-200/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-400">
          <div>
            © 2024{" "}
            <span className="text-slate-500 font-bold">AGM Intelligent</span> -
            Hệ thống quản lý gara chuyên nghiệp
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-slate-600 transition-colors">
              Điều khoản
            </a>
            <a href="#" className="hover:text-slate-600 transition-colors">
              Bảo mật
            </a>
            <a href="#" className="hover:text-slate-600 transition-colors">
              Liên hệ
            </a>
          </div>
        </footer>
      </main>

      <ReceptionChatPanel
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          loadChatUnreadCount();
        }}
        currentUserId={user?.id}
      />
    </div>
  );
}
