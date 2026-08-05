import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ClipboardList,
  Wrench,
  History,
  CheckSquare,
  HelpCircle,
  LogOut,
  Bell,
  Menu,
  X,
  CheckCircle,
  Info,
  AlertTriangle,
  Calendar,
  Siren,
  LayoutDashboard,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import type { UserModel } from "../../model/User";
import { useFetchClient } from "../../hook/useFetchClient";
import { useSocket } from '../../hook/useSocket';
import { loginSuccess, logout } from "../../store/slices/userSlice";
import { PROFILE_API_ENDPOINTS } from "../../constants/common/profileEndpoints";
import { NOTIFICATION_API_ENDPOINTS } from "../../constants/technician/notificationEndpoints";
import { AUTH_API_ENDPOINTS } from "../../constants/customer/authApiEndpoints";
import LogoutConfirmModal from "../../components/share/LogoutConfirmModal";

export default function TechnicianLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { fetchPrivate } = useFetchClient();
  const socket = useSocket();

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
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchNotifications = async () => {
    try {
      const response = await fetchPrivate(
        NOTIFICATION_API_ENDPOINTS.GET_NOTIFICATIONS,
      );
      if (Array.isArray(response)) {
        setNotifications(response);
      }
    } catch (error) {
      console.error("Không lấy được danh sách thông báo:", error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetchPrivate(
        NOTIFICATION_API_ENDPOINTS.GET_UNREAD_COUNT,
      );
      if (response?.count !== undefined) {
        setUnreadCount(response.count);
      }
    } catch (error) {
      console.error("Không lấy được số lượng thông báo:", error);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await fetchPrivate(NOTIFICATION_API_ENDPOINTS.MARK_AS_READ(id), "PUT");
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Lỗi khi cập nhật thông báo:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetchPrivate(NOTIFICATION_API_ENDPOINTS.MARK_ALL_AS_READ, "PUT");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Lỗi khi đánh dấu đọc tất cả:", error);
    }
  };

  useEffect(() => {
    if (isNotificationOpen) {
      fetchNotifications();
    }
  }, [isNotificationOpen]);

  const { i18n } = useTranslation();

  const showToast = (
    text: string,
    type: "success" | "info" | "warning" = "success",
  ) => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutConfirm(false);
    showToast("Đang đăng xuất tài khoản...", "warning");
    try {
      await fetchPrivate(AUTH_API_ENDPOINTS.LOGOUT, "POST");
    } catch (err) {
      console.error("Lỗi khi đăng xuất trên server:", err);
    }
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
            role: userData.role,
          }),
        );
      } catch (error) {
        console.error("Không lấy được thông tin user:", error);
      }
    };

    const token = localStorage.getItem("token");
    if (token) {
      if (!user) fetchUserProfile();
      fetchUnreadCount();
      // Poll dự phòng, vẫn giữ để không phụ thuộc hoàn toàn vào socket
      const intervalId = setInterval(fetchUnreadCount, 60000);
      return () => clearInterval(intervalId);
    }
  }, [dispatch, fetchPrivate, user]);

  // Realtime: vào room riêng theo user để nhận notifyUser (task assigned/unassigned, QC reject...)
  useEffect(() => {
    if (!socket || !user?.id) return;

    const joinUserRoom = () => socket.emit("join-user", user.id);
    joinUserRoom();
    socket.on("connect", joinUserRoom);

    const handleNewNotification = () => {
      fetchUnreadCount();
      if (isNotificationOpen) fetchNotifications();
    };
    socket.on("new_notification", handleNewNotification);

    return () => {
      socket.off("connect", joinUserRoom);
      socket.off("new_notification", handleNewNotification);
    };
  }, [socket, user?.id, isNotificationOpen]);

  const avatarUrl =
    user?.avatar?.trim() ||
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop";
  const displayName = user?.fullName || "Kỹ thuật viên";
  const displayRole = "Kỹ thuật viên";

  const menuGroups = [
    {
      label: null,
      items: [
        { name: "Tổng quan", icon: LayoutDashboard, path: "/technician/overview" },
      ],
    },
    {
      label: 'Công việc',
      items: [
        { name: 'Cứu hộ khẩn cấp', icon: Siren, path: '/technician/rescue' },
        { name: "Phân công", icon: CheckSquare, path: "/technician/assignments" },
      ],
    },
    {
      label: 'Lịch sử',
      items: [
        { name: "Lịch làm việc", icon: Calendar, path: "/technician/my-shifts" },
        { name: "Lịch sử báo cáo", icon: CheckSquare, path: "/technician/issues-reports" },
        { name: "Lịch sử công việc", icon: History, path: "/technician/work-history" },
      ],
    },
  ];

  const menuItems = menuGroups.flatMap((group) => group.items);

  const activeMenu = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/overview')) return 'Tổng quan';
    if (path.includes('/rescue')) return 'Cứu hộ khẩn cấp';
    if (path.includes("/assignments")) return "Phân công";
    if (path.includes("/my-shifts")) return "Lịch làm việc";
    if (path.includes("/issues-reports")) return "Lịch sử báo cáo";
    if (path.includes("/work-history")) return "Lịch sử công việc";
    if (path.includes("/progress")) return "Cập nhật tiến độ";
    return "Tổng quan";
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
              Kỹ thuật viên
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsMobileSidebarOpen(false)}
          className="lg:hidden p-1 rounded-lg hover:bg-slate-100 text-[#00285E] transition-colors"
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
                        className={isActive ? (item.name === 'Cứu hộ khẩn cấp' ? 'text-rose-400' : 'text-[#F9A11B]') : (item.name === 'Cứu hộ khẩn cấp' ? 'text-rose-500 group-hover:text-rose-600' : 'text-slate-500 group-hover:text-[#00285E]')}
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
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-[#E0ECFF] hover:text-[#00285E] transition-colors"
        >
          <HelpCircle size={18} className="text-slate-500" />
          <span>Hỗ trợ</span>
        </button>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut size={18} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#F4F7F6] font-sans antialiased text-slate-800 flex flex-col lg:flex-row relative">
      {/* Dynamic Toast Notifications */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: "-50%" }}
            animate={{ opacity: 1, y: 16, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-0 left-1/2 z-[100] transform -translate-x-1/2 flex items-center gap-2.5 px-5 py-3.5 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 text-sm font-semibold"
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
          <div className="flex items-center gap-1 border border-slate-200 rounded-full p-0.5 bg-slate-50 select-none shrink-0">
            <button
              onClick={() => i18n.changeLanguage('vi')}
              className={`px-2 py-1 text-[10px] font-bold rounded-full transition-all ${i18n.language === 'vi' ? 'bg-[#00285E] text-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              VI
            </button>
            <button
              onClick={() => i18n.changeLanguage('en')}
              className={`px-2 py-1 text-[10px] font-bold rounded-full transition-all ${i18n.language.startsWith('en') ? 'bg-[#00285E] text-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              EN
            </button>
          </div>
          <div className="relative">
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="p-1.5 rounded-full hover:bg-slate-100 transition-colors text-slate-600 relative"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] px-1 bg-rose-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {/* MOBILE NOTIFICATION DROPDOWN */}
            {isNotificationOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsNotificationOpen(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-[320px] bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h3 className="font-bold text-slate-800">Thông báo</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-xs font-semibold text-[#00285E] hover:text-[#F9A11B] transition-colors"
                      >
                        Đánh dấu đã đọc
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1 p-2">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-sm">
                        Không có thông báo nào
                      </div>
                    ) : (
                      notifications.map((notif: any) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            if (!notif.isRead) handleMarkAsRead(notif.id);
                          }}
                          className={`p-3 rounded-xl cursor-pointer transition-colors mb-1 ${notif.isRead ? "opacity-70 hover:bg-slate-50" : "bg-blue-50/50 hover:bg-blue-50 border border-blue-100/50"}`}
                        >
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <h4
                              className={`text-sm font-semibold ${notif.isRead ? "text-slate-700" : "text-slate-900"}`}
                            >
                              {notif.title}
                            </h4>
                            {!notif.isRead && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2">
                            {notif.content}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-2 block font-medium">
                            {new Date(notif.createdAt).toLocaleString("vi-VN")}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="hidden sm:flex flex-col text-right min-w-0 max-w-none">
            <span className="font-bold text-slate-800 text-xs sm:text-sm tracking-tight leading-tight truncate">
              {displayName}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase truncate">
              {displayRole}
            </span>
          </div>
          <img
            src={avatarUrl}
            alt="Technician Profile"
            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
          />
        </div>
      </header>

      {/* SIDEBAR ON DESKTOP */}
      <aside
        className="fixed inset-y-0 left-0 bg-[#EDF3FF] border-r border-[#D2E2FF] w-72 transform -translate-x-full lg:translate-x-0 transition-transform duration-300 ease-in-out z-40 lg:sticky lg:h-screen lg:flex lg:flex-col shrink-0 hidden lg:block"
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
          <aside className="relative flex flex-col w-72 bg-[#EDF3FF] border-r border-[#D2E2FF] h-full p-0">
            <SidebarContent onNavigate={() => setIsMobileSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 pb-16">
        {/* DESKTOP HEADER BAR */}
        <header className="hidden lg:flex bg-white h-20 px-8 items-center justify-end border-b border-slate-100 shadow-xs sticky top-0 z-25">
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
              <div className="relative">
                <button
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                  title="Thông báo"
                  className="w-10 h-10 rounded-xl flex items-center justify-center bg-white text-[#00285E] hover:bg-slate-50 transition-colors relative"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 bg-rose-500 rounded-full ring-2 ring-white text-[10px] font-bold text-white flex items-center justify-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* DESKTOP NOTIFICATION DROPDOWN */}
                {isNotificationOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsNotificationOpen(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-[320px] bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden flex flex-col max-h-[80vh]">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <h3 className="font-bold text-slate-800">Thông báo</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-xs font-semibold text-[#00285E] hover:text-[#F9A11B] transition-colors"
                          >
                            Đánh dấu đã đọc
                          </button>
                        )}
                      </div>
                      <div className="overflow-y-auto flex-1 p-2">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-slate-500 text-sm">
                            Không có thông báo nào
                          </div>
                        ) : (
                          notifications.map((notif: any) => (
                            <div
                              key={notif.id}
                              onClick={() => {
                                if (!notif.isRead) handleMarkAsRead(notif.id);
                              }}
                              className={`p-3 rounded-xl cursor-pointer transition-colors mb-1 ${notif.isRead ? "opacity-70 hover:bg-slate-50" : "bg-blue-50/50 hover:bg-blue-50 border border-blue-100/50"}`}
                            >
                              <div className="flex justify-between items-start gap-2 mb-1">
                                <h4
                                  className={`text-sm font-semibold ${notif.isRead ? "text-slate-700" : "text-slate-900"}`}
                                >
                                  {notif.title}
                                </h4>
                                {!notif.isRead && (
                                  <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 line-clamp-2">
                                {notif.content}
                              </p>
                              <span className="text-[10px] text-slate-400 mt-2 block font-medium">
                                {new Date(notif.createdAt).toLocaleString(
                                  "vi-VN",
                                )}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
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
                  alt="Technician User Avatar"
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

      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
}
