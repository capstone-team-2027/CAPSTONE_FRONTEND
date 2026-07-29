import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Boxes,
  Tags,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardCheck,
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
} from "lucide-react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import type { UserModel } from "../../model/User";
import { useFetchClient } from "../../hook/useFetchClient";
import { loginSuccess, logout } from "../../store/slices/userSlice";
import { PROFILE_API_ENDPOINTS } from "../../constants/common/profileEndpoints";

export default function InventoryLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { fetchPrivate } = useFetchClient();
  const { i18n } = useTranslation();

  const user = useSelector(
    (state: RootState) => state.user.user as UserModel | null,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "info" | "warning";
    text: string;
  } | null>(null);

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
        { name: "Kiểm kê", icon: ClipboardCheck, path: "/inventory/stocktake" },
        { name: "Phụ tùng", icon: Boxes, path: "/inventory/parts" },
        {
          name: "Danh mục phụ tùng",
          icon: Tags,
          path: "/inventory/categories",
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
          name: "Phụ tùng cần xuất kho",
          icon: FileCheck2,
          path: "/inventory/approved-quotes",
        },
        {
          name: "Phụ tùng chờ nhập",
          icon: PackageSearch,
          path: "/inventory/waiting-stock",
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
    if (path.includes("/waiting-stock")) return "Phụ tùng chờ nhập";
    if (path.includes("/import")) return "Lịch sử nhập kho";
    if (path.includes("/export")) return "Lịch sử xuất kho";
    if (path.includes("/stocktake")) return "Kiểm kê";
    if (path.includes("/approved-quotes")) return "Phụ tùng cần xuất kho";
    if (path.includes("/suppliers")) return "Đối tác, nhà cung cấp";
    return "Tổng quan";
  }, [location.pathname]);

  const renderNav = () => (
    <nav className="space-y-6">
      {menuGroups.map((group, groupIndex) => (
        <div key={group.label ?? `group-${groupIndex}`}>
          {group.label && (
            <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
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
          </div>
        </div>
      ))}
    </nav>
  );

  const handleLogout = () => {
    if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
      setIsMobileSidebarOpen(false);
      showToast("Đang đăng xuất tài khoản...", "warning");
      localStorage.removeItem("token");
      localStorage.removeItem("userAvatar");
      dispatch(logout());
      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);
    }
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
          <button
            onClick={() => showToast("Không có thông báo mới", "info")}
            className="p-1.5 rounded-full hover:bg-slate-100 transition-colors text-slate-600 relative"
          >
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
          </button>
          <img
            src={avatarUrl}
            alt="Inventory Manager Profile"
            className="w-9 h-9 rounded-full object-cover border border-slate-200"
          />
        </div>
      </header>

      {/* SIDEBAR ON DESKTOP */}
      <aside
        className="fixed inset-y-0 left-0 bg-[#EDF3FF] border-r border-[#D2E2FF] w-72 transform -translate-x-full md:translate-x-0 transition-transform duration-300 ease-in-out z-40 md:sticky md:h-screen md:flex md:flex-col shrink-0 hidden md:block"
        style={{ height: "100vh" }}
      >
        {/* Sidebar Header — cùng chiều cao h-20 với header bên phải */}
        <div className="h-20 shrink-0 px-6 border-b border-[#D2E2FF] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00285E] flex items-center justify-center shadow-md">
              <Warehouse size={20} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[#00285E] uppercase tracking-wider text-base">
                AGM Intelligent
              </span>
              <span className="text-[10px] text-slate-500 font-semibold tracking-widest uppercase">
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
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
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
          <aside className="relative flex flex-col w-72 bg-[#EDF3FF] border-r border-[#D2E2FF] h-full p-0">
            <div className="p-6 border-b border-[#D2E2FF] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00285E] flex items-center justify-center shadow-md">
                  <Warehouse size={20} className="text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-[#00285E] uppercase tracking-wider text-sm">
                    AGM Intelligent
                  </span>
                  <span className="text-[9px] text-slate-500 font-semibold tracking-widest uppercase">
                    Quản lý kho
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1 rounded-lg hover:bg-[#E0ECFF] text-[#00285E] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-none">
              {renderNav()}
            </div>

            <div className="p-4 border-t border-[#D2E2FF] space-y-1">
              <button
                onClick={() => {
                  showToast("Chức năng hỗ trợ đang được kết nối...", "info");
                  setIsMobileSidebarOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-[#E0ECFF] hover:text-[#00285E] transition-colors"
              >
                <HelpCircle size={18} className="text-slate-500" />
                <span>Hỗ trợ</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
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
            {/* Language Switcher */}
            <div className="flex items-center gap-1 border border-slate-200 rounded-full p-0.5 bg-slate-50 select-none shrink-0">
              <button
                onClick={() => i18n.changeLanguage("vi")}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all cursor-pointer ${
                  i18n.language === "vi"
                    ? "bg-[#00285E] text-white"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                VI
              </button>
              <button
                onClick={() => i18n.changeLanguage("en")}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all cursor-pointer ${
                  i18n.language.startsWith("en")
                    ? "bg-[#00285E] text-white"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                EN
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => showToast("Không có thông báo mới", "info")}
                title="Thông báo"
                className="w-10 h-10 rounded-xl flex items-center justify-center bg-white text-[#00285E] hover:bg-slate-50 transition-colors relative"
              >
                <Bell size={19} strokeWidth={2} />
                <span className="absolute top-1.5 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 ring-2 ring-white"></span>
                </span>
              </button>
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

        {/* PAGE FOOTER */}
        <footer className="mt-auto px-8 py-6 border-t border-slate-200/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-400">
          <div>
            © 2024{" "}
            <span className="text-slate-500 font-bold">AGM Intelligent</span> -
            Hệ thống quản lý kho phụ tùng
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
    </div>
  );
}
