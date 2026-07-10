import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Boxes,
  Tags,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardCheck,
  Truck,
  BarChart3,
  FileCheck2,
  HelpCircle,
  LogOut,
  Search,
  Bell,
  Menu,
  X,
  CheckCircle,
  Info,
  AlertTriangle,
  Warehouse,
} from 'lucide-react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import type { UserModel } from '../../model/User';
import { useFetchClient } from '../../hook/useFetchClient';
import { loginSuccess, logout } from '../../store/slices/userSlice';
import { PROFILE_API_ENDPOINTS } from '../../constants/common/profileEndpoints';

export default function InventoryLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { fetchPrivate } = useFetchClient();

  const user = useSelector((state: RootState) => state.user.user as UserModel | null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'warning'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
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
          })
        );
      } catch (error) {
        console.error('Không lấy được thông tin user:', error);
      }
    };

    const token = localStorage.getItem('token');
    if (token && !user) fetchUserProfile();
  }, [dispatch, fetchPrivate, user]);

  const avatarUrl = user?.avatar?.trim() || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=256&auto=format&fit=crop';
  const displayName = user?.fullName || 'Nguyễn Văn Kho';
  const displayRole = 'Quản lý kho';

  // Sidebar menu items for inventory management
  const menuItems = [
    { name: 'Tổng quan', icon: LayoutDashboard, path: '/inventory' },
    { name: 'Phụ tùng', icon: Boxes, path: '/inventory/parts' },
    { name: 'Danh mục phụ tùng', icon: Tags, path: '/inventory/categories' },
    { name: 'Lịch sử nhập kho', icon: ArrowDownToLine, path: '/inventory/import' },
    { name: 'Lịch sử xuất kho', icon: ArrowUpFromLine, path: '/inventory/export' },
    { name: 'Kiểm kê', icon: ClipboardCheck, path: '/inventory/stocktake' },
    { name: 'Báo giá đã duyệt', icon: FileCheck2, path: '/inventory/approved-quotes' },
    { name: 'Nhà cung cấp', icon: Truck, path: '/inventory/suppliers' },
    { name: 'Báo cáo kho', icon: BarChart3, path: '/inventory/reports' },
  ];

  // Dynamic active menu item based on current URL path
  const activeMenu = useMemo(() => {
    const path = location.pathname;
    if (path === '/inventory' || path === '/inventory/') return 'Tổng quan';
    if (path.includes('/parts')) return 'Phụ tùng';
    if (path.includes('/categories')) return 'Danh mục phụ tùng';
    if (path.includes('/import')) return 'Lịch sử nhập kho';
    if (path.includes('/export')) return 'Lịch sử xuất kho';
    if (path.includes('/stocktake')) return 'Kiểm kê';
    if (path.includes('/approved-quotes')) return 'Báo giá đã duyệt';
    if (path.includes('/suppliers')) return 'Nhà cung cấp';
    if (path.includes('/reports')) return 'Báo cáo kho';
    return 'Tổng quan';
  }, [location.pathname]);

  const renderNav = () => (
    <nav className="space-y-1">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeMenu === item.name;
        return (
          <button
            key={item.name}
            onClick={() => {
              navigate(item.path);
              setIsMobileSidebarOpen(false);
              showToast(`Đã chuyển sang màn hình: ${item.name}`, 'info');
            }}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all group ${isActive
              ? 'bg-[#00285E] text-white shadow-lg shadow-[#00285E]/15'
              : 'text-slate-600 hover:bg-[#E0ECFF] hover:text-[#00285E]'
              }`}
          >
            <Icon
              size={18}
              className={isActive ? 'text-[#F9A11B]' : 'text-slate-500 group-hover:text-[#00285E]'}
            />
            <span>{item.name}</span>
          </button>
        );
      })}
    </nav>
  );

  const handleLogout = () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      setIsMobileSidebarOpen(false);
      showToast('Đang đăng xuất tài khoản...', 'warning');
      localStorage.removeItem('token');
      localStorage.removeItem('userAvatar');
      dispatch(logout());
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FC] font-sans antialiased text-slate-800 flex flex-col md:flex-row relative">

      {/* Dynamic Toast Notifications */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 16, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-0 left-1/2 z-[9999] transform -translate-x-1/2 flex items-center gap-2.5 px-5 py-3.5 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 text-sm font-semibold"
          >
            {toastMessage.type === 'success' && <CheckCircle size={18} className="text-emerald-400" />}
            {toastMessage.type === 'info' && <Info size={18} className="text-blue-400" />}
            {toastMessage.type === 'warning' && <AlertTriangle size={18} className="text-amber-400" />}
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
            <span className="font-bold text-slate-800 uppercase tracking-tight text-sm">AGM · Kho</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => showToast('Không có thông báo mới', 'info')}
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
        style={{ height: '100vh' }}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-[#D2E2FF] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00285E] flex items-center justify-center shadow-md">
              <Warehouse size={20} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[#00285E] uppercase tracking-wider text-base">AGM Intelligent</span>
              <span className="text-[10px] text-slate-500 font-semibold tracking-widest uppercase">Quản lý kho</span>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7 scrollbar-none">
          <div>
            <span className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
              Nghiệp vụ kho
            </span>
            {renderNav()}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#D2E2FF] space-y-1">
          <button
            onClick={() => showToast('Chức năng hỗ trợ đang được kết nối...', 'info')}
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
                  <span className="font-bold text-[#00285E] uppercase tracking-wider text-sm">AGM Intelligent</span>
                  <span className="text-[9px] text-slate-500 font-semibold tracking-widest uppercase">Quản lý kho</span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1 rounded-lg hover:bg-[#D2E2FF] text-[#00285E] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7 scrollbar-none">
              <div>
                <span className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
                  Nghiệp vụ kho
                </span>
                {renderNav()}
              </div>
            </div>

            <div className="p-4 border-t border-[#D2E2FF] space-y-1">
              <button
                onClick={() => {
                  showToast('Chức năng hỗ trợ đang được kết nối...', 'info');
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
      <main className="flex-1 flex flex-col min-w-0 pb-16">

        {/* DESKTOP HEADER BAR */}
        <header className="hidden md:flex bg-white h-20 px-8 items-center justify-between border-b border-slate-100 shadow-xs sticky top-0 z-30">
          {/* Search bar */}
          <div className="relative w-80">
            <Search size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm phụ tùng, mã phiếu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
            />
          </div>

          {/* User profile & Actions */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => showToast('Không có thông báo mới', 'info')}
                className="p-2.5 rounded-full hover:bg-slate-50 border border-slate-100 transition-colors text-slate-600 relative group"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
              </button>
              <button
                onClick={() => showToast('Mở trung tâm trợ giúp...', 'info')}
                className="p-2.5 rounded-full hover:bg-slate-50 border border-slate-100 transition-colors text-slate-600"
              >
                <HelpCircle size={18} />
              </button>
            </div>

            <div className="w-[1px] h-8 bg-slate-200"></div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right">
                <span className="font-bold text-slate-800 text-sm tracking-tight leading-tight">{displayName}</span>
                <span className="text-[11px] text-slate-400 font-semibold tracking-wide uppercase">{displayRole}</span>
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
            © 2024 <span className="text-slate-500 font-bold">AGM Intelligent</span> - Hệ thống quản lý kho phụ tùng
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-slate-600 transition-colors">Điều khoản</a>
            <a href="#" className="hover:text-slate-600 transition-colors">Bảo mật</a>
            <a href="#" className="hover:text-slate-600 transition-colors">Liên hệ</a>
          </div>
        </footer>

      </main>

    </div>
  );
}
