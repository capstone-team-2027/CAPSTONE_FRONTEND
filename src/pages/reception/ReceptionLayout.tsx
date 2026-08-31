import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CalendarCheck,
  ClipboardPlus,
  CreditCard,
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
  RefreshCw,
} from "lucide-react";
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
import LogoutConfirmModal from "../../components/share/LogoutConfirmModal";

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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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

  const showToast = (
    text: string,
    type: "success" | "info" | "warning" = "success",
  ) => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    showToast("Đang đăng xuất tài khoản...", "warning");
    localStorage.removeItem("token");
    localStorage.removeItem("userAvatar");
    dispatch(logout());
    setTimeout(() => {
      window.location.href = "/login";
    }, 1000);
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
      label: null,
      items: [
        { name: "Lịch hẹn", icon: CalendarCheck, path: "/reception/appointments" },
        { name: "Danh sách báo giá", icon: History, path: "/reception/quotes" },
        { name: "Quản lý hóa đơn dịch vụ", icon: ClipboardPlus, path: "/reception/service-orders" },
        { name: 'Khách hàng & Cứu hộ', icon: Users, path: '/reception/customers' },
        { name: "Thanh toán dịch vụ", icon: CreditCard, path: "/reception/payments" },
      ],
    },
  ];

  const menuItems = menuGroups.flatMap((group) => group.items);

  // Dynamic active menu item based on current URL path
  const activeMenu = useMemo(() => {
    const path = location.pathname;
    // Trang tiếp nhận khách được mở từ luồng Lịch hẹn, không thuộc danh sách
    // "Khách hàng & Cứu hộ" dù route hiện nằm dưới /customers.
    if (path === "/reception/customers/receive") return "Lịch hẹn";
    if (path.includes("/appointments")) return "Lịch hẹn";
    if (path.includes("/quotes")) return "Danh sách báo giá";
    if (path.includes('/customers')) return 'Khách hàng & Cứu hộ';
    if (path.includes('/technicians')) return 'Kỹ thuật viên hôm nay';
    if (path.includes("/service-orders")) return "Quản lý hóa đơn dịch vụ";
    if (path.includes("/payments")) return "Thanh toán dịch vụ";

    return "Danh sách lịch hẹn";
  }, [location.pathname]);

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {/* Sidebar Header */}
      <div className="h-20 px-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F9A11B] flex items-center justify-center shadow-md">
            <Wrench size={20} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-white uppercase tracking-wider text-base">
              AGM Intelligent
            </span>
            <span className="text-[10px] text-blue-200/70 font-semibold tracking-widest uppercase">
              Nhân viên tiếp nhận
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsMobileSidebarOpen(false)}
          className="lg:hidden p-1 rounded-lg hover:bg-white/10 text-white transition-colors"
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
                <span className="px-2.5 text-[10px] font-bold text-blue-300/60 uppercase tracking-widest block mb-2">
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
                        ? "bg-[#F9A11B] text-white shadow-lg shadow-[#F9A11B]/15"
                        : "text-blue-100/80 hover:bg-white/10 hover:text-white"
                        }`}
                    >
                      <Icon
                        size={18}
                        className={
                          isActive
                            ? "text-white"
                            : "text-blue-200/60 group-hover:text-white"
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
      <div className="p-4 border-t border-white/10 space-y-1">
        <button
          onClick={() =>
            showToast("Chức năng hỗ trợ đang được kết nối...", "info")
          }
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors"
        >
          <HelpCircle size={18} className="text-blue-200/60" />
          <span>Hỗ trợ</span>
        </button>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 transition-colors"
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
    <div className="min-h-screen bg-[#F4F7FC] font-sans antialiased text-slate-800 flex flex-col lg:flex-row relative">
      {/* Dynamic Toast Notifications */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: "-50%" }}
            animate={{ opacity: 1, y: 16, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-0 left-1/2 z-[200] transform -translate-x-1/2 flex items-center gap-2.5 px-5 py-3.5 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 text-sm font-semibold"
          >
            {toastMessage.type === "success" && (
              <CheckCircle size={18} className="text-emerald-400" />
            )}
            {toastMessage.type === "info" && (
              <Info size={18} className="text-blue-400" />
            )}
            {toastMessage.type === "warning" && (
              <AlertTriangle size={18} className="text-amber-400" />
            )}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

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
      <header className="lg:hidden bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100 shadow-sm z-30 sticky top-0">
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
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => window.location.reload()}
            title="Làm mới dữ liệu"
            className="p-1.5 rounded-full hover:bg-slate-100 transition-colors text-slate-600 shrink-0"
          >
            <RefreshCw size={20} />
          </button>
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
          <div className="hidden min-w-0 flex-col text-right sm:flex">
            <span className="max-w-32 truncate text-xs font-bold leading-tight text-slate-800">
              {displayName}
            </span>
            <span className="max-w-32 truncate text-[9px] font-semibold uppercase tracking-wide text-slate-400">
              {displayRole}
            </span>
          </div>
          <img
            src={avatarUrl}
            alt="Reception Profile"
            className="w-9 h-9 rounded-full object-cover border border-slate-200"
          />
        </div>
      </header>

      {/* SIDEBAR ON DESKTOP */}
      <aside
        className="fixed inset-y-0 left-0 bg-[#00285E] border-r border-white/10 w-72 transform -translate-x-full lg:translate-x-0 transition-transform duration-300 ease-in-out z-40 lg:sticky lg:h-screen lg:flex lg:flex-col shrink-0 hidden lg:block"
        style={{ height: "100vh" }}
      >
        <SidebarContent />
      </aside>

      {/* MOBILE DRAWER SIDEBAR */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          ></div>
          <aside className="relative flex flex-col w-72 bg-[#00285E] border-r border-white/10 h-full p-0">
            <SidebarContent onNavigate={() => setIsMobileSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 pb-16">
        {/* DESKTOP HEADER BAR */}
        <header className="hidden lg:flex bg-white h-20 px-8 items-center justify-end border-b border-slate-100 shadow-xs sticky top-0 z-30">
          {/* Search bar */}


          {/* User profile & Actions */}
          <div className="flex items-center gap-6">
            {/* Quick action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.location.reload()}
                title="Làm mới dữ liệu"
                className="w-10 h-10 rounded-xl flex items-center justify-center bg-white text-[#00285E] hover:bg-slate-50 transition-colors shrink-0"
              >
                <RefreshCw size={18} strokeWidth={2} />
              </button>
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
      </main>

      <ReceptionChatPanel
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          loadChatUnreadCount();
        }}
        currentUserId={user?.id}
      />

      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
}
