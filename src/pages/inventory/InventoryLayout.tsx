import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Boxes,
  Tags,
  ArrowDownToLine,
  ArrowUpFromLine,
  Truck,
  FileCheck2,
  HelpCircle,
  LogOut,
  Bell,
  Menu,
  X,
  CheckCircle,
  Info,
  AlertTriangle,
  Warehouse,
  PackageSearch,
  Sparkles,
  PackagePlus,
  RefreshCw,
} from "lucide-react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import type { UserModel } from "../../model/User";
import { useFetchClient } from "../../hook/useFetchClient";
import { useSocket } from "../../hook/useSocket";
import { useFetchClient_v2 } from "../../hook/useFetchClient";
import { loginSuccess, logout } from "../../store/slices/userSlice";
import { clearAuthStorage } from "../../utils/clearAuthStorage";
import { PROFILE_API_ENDPOINTS } from "../../constants/common/profileEndpoints";
import { NOTIFICATION_API_ENDPOINTS } from "../../constants/inventory/notificationEndpoints";
import { RESTOCK_SUGGESTION_API_ENDPOINTS } from "../../constants/inventory/restockSuggestionApiEndpoint";
import LogoutConfirmModal from "../../components/share/LogoutConfirmModal";
import InventoryStockAlertModal from "../../components/share/InventoryStockAlertModal";
import { playAlertSound } from "../../util/playAlertSound";

export default function InventoryLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const socket = useSocket();
  const { fetchPrivate } = useFetchClient_v2();

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
  const [showSubtleAlert, setShowSubtleAlert] = useState(false);
  const [subtleAlertCount, setSubtleAlertCount] = useState(0);

  const showToast = useCallback(
    (text: string, type: "success" | "info" | "warning" = "success") => {
      setToastMessage({ text, type });
      setTimeout(() => {
        setToastMessage(null);
      }, 3000);
    },
    [],
  );

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
    if (token && !user) fetchUserProfile();
  }, [dispatch, fetchPrivate, user]);

  // Vừa đăng nhập xong (Login.tsx truyền state justLoggedIn) -> tự động kiểm tra tồn kho,
  // nếu có phụ tùng hết hàng/sắp hết thì cảnh báo ngay kèm âm thanh. Xoá state khỏi history
  // ngay sau đó để F5/quay lại trang không hiện lại cảnh báo.
  const checkLowStockStatus = useCallback(async () => {
    try {
      const response = await fetchPrivate<{
        data: { suggestions: Array<any> };
      }>(RESTOCK_SUGGESTION_API_ENDPOINTS.LIST);
      const suggestions = response?.data?.suggestions ?? [];
      const count = suggestions.length;
      if (count > 0) {
        setSubtleAlertCount(count);
        setShowSubtleAlert(true);
      } else {
        setSubtleAlertCount(0);
        setShowSubtleAlert(false);
      }
    } catch (error) {
      console.error("Không kiểm tra được cảnh báo tồn kho:", error);
    }
  }, [fetchPrivate]);

  useEffect(() => {
    void checkLowStockStatus();
    const intervalId = setInterval(() => {
      void checkLowStockStatus();
    }, 60000);
    return () => clearInterval(intervalId);
  }, [checkLowStockStatus]);

  useEffect(() => {
    if (showSubtleAlert && subtleAlertCount > 0) {
      playAlertSound();
    }
  }, [showSubtleAlert, subtleAlertCount]);

  const fetchNotifications = async () => {
    try {
      const response = await fetchPrivate(NOTIFICATION_API_ENDPOINTS.GET_NOTIFICATIONS);
      if (Array.isArray(response)) {
        setNotifications(response);
      }
    } catch (error) {
      console.error("Không lấy được danh sách thông báo:", error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetchPrivate(NOTIFICATION_API_ENDPOINTS.GET_UNREAD_COUNT);
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
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
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
    const token = localStorage.getItem("token");
    if (token) {
      fetchUnreadCount();
      const intervalId = setInterval(fetchUnreadCount, 60000);
      return () => clearInterval(intervalId);
    }
  }, []);

  // Realtime: vào room riêng theo user + room role INVENTORY_MANAGER để nhận thông báo
  useEffect(() => {
    if (!socket || !user?.id) return;

    const joinRooms = () => {
      socket.emit("join-user", user.id);
      if (user.role) socket.emit("join-role", user.role);
    };
    joinRooms();
    socket.on("connect", joinRooms);

    const handleNewNotification = () => {
      fetchUnreadCount();
      if (isNotificationOpen) fetchNotifications();
    };
    socket.on("new_notification", handleNewNotification);

    return () => {
      socket.off("connect", joinRooms);
      socket.off("new_notification", handleNewNotification);
    };
  }, [socket, user?.id, user?.role, isNotificationOpen]);

  useEffect(() => {
    if (isNotificationOpen) {
      fetchNotifications();
    }
  }, [isNotificationOpen]);

  const avatarUrl =
    user?.avatar?.trim() ||
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=256&auto=format&fit=crop";
  const displayName = user?.fullName || "Nguyễn Văn Kho";
  const displayRole = "Quản lý kho";

  // Menu sidebar gom theo nhóm nghiệp vụ
  const menuGroups = [
    {
      label: null,
      items: [{ name: "Tổng quan", icon: LayoutDashboard, path: "/inventory" }],
    },
    {
      label: "Kho hàng",
      items: [
        { name: "Phụ tùng", icon: Boxes, path: "/inventory/parts" },
        {
          name: "Danh mục phụ tùng",
          icon: Tags,
          path: "/inventory/categories",
        },
        {
          name: "Đề xuất nhập hàng",
          icon: Sparkles,
          path: "/inventory/restock-suggestions",
        },
      ],
    },
    {
      label: "Nhập · Xuất",
      items: [
        {
          name: "Lịch sử xuất kho",
          icon: ArrowUpFromLine,
          path: "/inventory/export",
        },
        {
          name: "Lịch sử nhập kho",
          icon: ArrowDownToLine,
          path: "/inventory/import",
        },

        {
          name: "Yêu cầu xuất kho",
          icon: FileCheck2,
          path: "/inventory/approved-quotes",
        },
        {
          name: "Phụ tùng đặt riêng",
          icon: PackageSearch,
          path: "/inventory/waiting-stock",
        },
        {
          name: "Yêu cầu bổ sung",
          icon: PackagePlus,
          path: "/inventory/restock-requests",
        },
      ],
    },
    {
      label: "Đối tác",
      items: [
        {
          name: "Đối tác, nhà cung cấp",
          icon: Truck,
          path: "/inventory/suppliers",
        },
      ],
    },
  ];

  // Dynamic active menu item based on current URL path
  const activeMenu = useMemo(() => {
    const path = location.pathname;
    if (path === "/inventory" || path === "/inventory/") return "Tổng quan";
    if (path.includes("/parts")) return "Phụ tùng";
    if (path.includes("/categories")) return "Danh mục phụ tùng";
    if (path.includes("/waiting-stock")) return "Phụ tùng đặt riêng";
    if (path.includes("/restock-requests")) return "Yêu cầu bổ sung";
    if (path.includes("/restock-suggestions")) return "Đề xuất nhập hàng";
    if (path.includes("/import")) return "Lịch sử nhập kho";
    if (path.includes("/export")) return "Lịch sử xuất kho";
    if (path.includes("/approved-quotes")) return "Yêu cầu xuất kho";
    if (path.includes("/suppliers")) return "Đối tác, nhà cung cấp";
    return "Tổng quan";
  }, [location.pathname]);

  const renderNav = () => (
    <nav className="space-y-6">
      {menuGroups.map((group, groupIndex) => (
        <div key={group.label ?? `group-${groupIndex}`}>
          {group.label && (
            <span className="px-3 text-[10px] font-bold text-blue-300/60 uppercase tracking-widest block mb-2">
              {group.label}
            </span>
          )}
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeMenu === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    navigate(item.path);
                    setIsMobileSidebarOpen(false);
                    showToast(`Đã chuyển sang màn hình: ${item.name}`, "info");
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                    isActive
                      ? "bg-[#F9A11B] text-white shadow-lg shadow-[#F9A11B]/15"
                      : "text-blue-100/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {Icon && (
                    <Icon
                      size={18}
                      className={
                        isActive
                          ? "text-white"
                          : "text-blue-200/60 group-hover:text-white"
                      }
                    />
                  )}
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    setIsMobileSidebarOpen(false);
    showToast("Đang đăng xuất tài khoản...", "warning");
    clearAuthStorage();
    dispatch(logout());
    setTimeout(() => {
      window.location.href = "/login";
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#F4F7FC] font-sans antialiased text-slate-800 flex flex-col md:flex-row relative">
      {/* Dynamic Toast Notifications */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: "-50%" }}
            animate={{ opacity: 1, y: 16, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-0 left-1/2 z-[9999] transform -translate-x-1/2 flex items-center gap-2.5 px-5 py-3.5 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 text-sm font-semibold"
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
              AGM · Kho
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
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

            {isNotificationOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsNotificationOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden flex flex-col max-h-[80vh]">
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
                      <div className="p-4 text-center text-slate-500 text-sm">Không có thông báo nào</div>
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
                            <h4 className={`text-sm font-semibold ${notif.isRead ? "text-slate-700" : "text-slate-900"}`}>
                              {notif.title}
                            </h4>
                            {!notif.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>}
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2">{notif.content}</p>
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
          <img
            src={avatarUrl}
            alt="Inventory Manager Profile"
            className="w-9 h-9 rounded-full object-cover border border-slate-200"
          />
        </div>
      </header>

      {/* SIDEBAR ON DESKTOP */}
      <aside
        className="fixed inset-y-0 left-0 bg-[#00285E] border-r border-white/10 w-72 transform -translate-x-full md:translate-x-0 transition-transform duration-300 ease-in-out z-40 md:sticky md:h-screen md:flex md:flex-col shrink-0 hidden md:block"
        style={{ height: "100vh" }}
      >
        {/* Sidebar Header — cùng chiều cao h-20 với header bên phải */}
        <div className="h-20 shrink-0 px-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F9A11B] flex items-center justify-center shadow-md">
              <Warehouse size={20} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white uppercase tracking-wider text-base">
                AGM Intelligent
              </span>
              <span className="text-[10px] text-blue-200/70 font-semibold tracking-widest uppercase">
                Quản lý kho
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-none">
          {renderNav()}
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
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 transition-colors"
          >
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* MOBILE DRAWER SIDEBAR */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          ></div>
          <aside className="relative flex flex-col w-72 bg-[#00285E] border-r border-white/10 h-full p-0">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F9A11B] flex items-center justify-center shadow-md">
                  <Warehouse size={20} className="text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-white uppercase tracking-wider text-sm">
                    AGM Intelligent
                  </span>
                  <span className="text-[9px] text-blue-200/70 font-semibold tracking-widest uppercase">
                    Quản lý kho
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-none">
              {renderNav()}
            </div>

            <div className="p-4 border-t border-white/10 space-y-1">
              <button
                onClick={() => {
                  showToast("Chức năng hỗ trợ đang được kết nối...", "info");
                  setIsMobileSidebarOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <HelpCircle size={18} className="text-blue-200/60" />
                <span>Hỗ trợ</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 transition-colors"
              >
                <LogOut size={18} />
                <span>Đăng xuất</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 pb-16 bg-[#F4F7FC]">
        {/* DESKTOP HEADER BAR */}
        <header className="hidden md:flex bg-white h-20 px-8 items-center justify-end border-b border-slate-100 shadow-xs sticky top-0 z-30">
          {/* User profile & Actions */}
          <div className="flex items-center gap-6">
            {/* Refresh Data */}
            <button
              onClick={() => window.location.reload()}
              title="Làm mới dữ liệu"
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-white text-[#00285E] hover:bg-slate-50 transition-colors shrink-0"
            >
              <RefreshCw size={18} strokeWidth={2} />
            </button>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                  title="Thông báo"
                  className="w-10 h-10 rounded-xl flex items-center justify-center bg-white text-[#00285E] hover:bg-slate-50 transition-colors relative"
                >
                  <Bell size={19} strokeWidth={2} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 bg-rose-500 rounded-full ring-2 ring-white text-[10px] font-bold text-white flex items-center justify-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {isNotificationOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsNotificationOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden flex flex-col max-h-[80vh]">
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
                          <div className="p-4 text-center text-slate-500 text-sm">Không có thông báo nào</div>
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
                                <h4 className={`text-sm font-semibold ${notif.isRead ? "text-slate-700" : "text-slate-900"}`}>
                                  {notif.title}
                                </h4>
                                {!notif.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>}
                              </div>
                              <p className="text-xs text-slate-500 line-clamp-2">{notif.content}</p>
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
              <button
                onClick={() => showToast("Mở trung tâm trợ giúp...", "info")}
                title="Trợ giúp"
                className="w-10 h-10 rounded-xl flex items-center justify-center bg-white text-[#00285E] hover:bg-slate-50 transition-colors"
              >
                <HelpCircle size={19} strokeWidth={2} />
              </button>
            </div>

            <div className="w-[1px] h-8 bg-slate-200"></div>

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
                  alt="Inventory Manager Avatar"
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

      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogoutConfirm}
      />

      {/* Subtle Low Stock Alert Toast */}
      <AnimatePresence>
        {showSubtleAlert && subtleAlertCount > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 100, y: 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full bg-white/95 backdrop-blur-md border border-amber-200 rounded-2xl p-4 shadow-2xl flex items-start gap-3.5 select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <AlertTriangle size={20} className="animate-bounce text-[#F9A11B]" />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="font-bold text-slate-800 text-sm">Cảnh báo tồn kho thấp!</h4>
              <p className="text-xs text-slate-500 leading-normal">
                Có <span className="font-bold text-[#F9A11B]">{subtleAlertCount}</span> phụ tùng sắp hết hoặc dưới mức tối thiểu cần nhập thêm.
              </p>
              <button
                onClick={() => {
                  navigate("/inventory/restock-suggestions");
                  setShowSubtleAlert(false);
                }}
                className="text-xs font-bold text-[#00285E] hover:text-[#F9A11B] transition-colors mt-1 block cursor-pointer bg-transparent border-0 p-0"
              >
                Xem chi tiết đề xuất &rarr;
              </button>
            </div>
            <button
              onClick={() => setShowSubtleAlert(false)}
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0 cursor-pointer bg-transparent border-0"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
