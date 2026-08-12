import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  UserCog,
  Wrench,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  Bell,
  Menu,
  X,
  CheckCircle,
  Info,
  AlertTriangle,
  Package,
  ShieldCheck,
  CalendarClock,
  Sparkles
} from 'lucide-react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import type { UserModel } from '../../model/User';
import { useFetchClient_v2 } from '../../hook/useFetchClient';
import { loginSuccess, logout } from '../../store/slices/userSlice';
import { API_BASE_URL } from '../../constants/customer/profileApiEndpoint';
import LogoutConfirmModal from '../../components/share/LogoutConfirmModal';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { fetchPrivate } = useFetchClient_v2();

  const user = useSelector((state: RootState) => state.user.user as UserModel | null);
  const { i18n } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'warning'; text: string } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    setIsMobileSidebarOpen(false);
    showToast('Đang đăng xuất tài khoản...', 'warning');
    localStorage.removeItem('token');
    localStorage.removeItem('userAvatar');
    dispatch(logout());
    setTimeout(() => {
      window.location.href = '/login';
    }, 1000);
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetchPrivate(`${API_BASE_URL}/api/auth/profile`);
        const userData = response?.data;
        if (!userData) return;
        dispatch(
          loginSuccess({
            id: userData.id,
            fullName: userData.fullName,
            phoneNumber: userData.phoneNumber,
            avatar: userData.avatar,
            role: typeof userData.role === 'object' ? userData.role?.roleCode : userData.role,
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
  const displayName = user?.fullName || 'Nguyễn Văn Admin';
  const displayRole = user?.role?.toUpperCase() === 'ADMIN' ? 'Quản trị viên' : (user?.role || 'Quản trị viên');

  // Menu groups for the sidebar with corresponding route paths
  const menuGroups = [
    {
      label: null,
      items: [
        { name: 'Thống kê', icon: BarChart3, path: '/admin/statistics' },
        { name: 'AI phân tích hệ thống', icon: Sparkles, path: '/admin/ai-analysis' },
      ],
    },
    {
      label: 'Khách hàng',
      items: [{ name: 'Khách Hàng', icon: Users, path: '/admin/customers' }],
    },
    {
      label: 'Nhân sự',
      items: [
        { name: 'Nhân sự', icon: UserCog, path: '/admin/staff' },
        { name: 'Ca làm việc', icon: CalendarClock, path: '/admin/shifts' },
      ],
    },
    {
      label: 'Dịch vụ',
      items: [
        { name: 'Dịch vụ', icon: Wrench, path: '/admin/services' },
        { name: 'Tài nguyên', icon: Package, path: '/admin/resources' },
        { name: 'Chính sách bảo hành', icon: ShieldCheck, path: '/admin/warranty' },
      ],
    },
    {
      label: 'Cài đặt',
      items: [{ name: 'Cài đặt', icon: Settings, path: '/admin/settings' }],
    },
  ];

  // Dynamic active menu item based on current URL path
  const activeMenu = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/ai-analysis')) return 'AI phân tích hệ thống';
    if (path === '/admin' || path === '/admin/' || path.includes('/statistics')) return 'Thống kê';
    if (path.includes('/customers')) return 'Khách Hàng';
    if (path.includes('/staff')) return 'Nhân sự';
    if (path.includes('/shifts')) return 'Ca làm việc';
    if (path.includes('/services')) return 'Dịch vụ';
    if (path.includes('/resources')) return 'Tài nguyên';
    if (path.includes('/warranty')) return 'Chính sách bảo hành';
    if (path.includes('/settings')) return 'Cài đặt';
    return 'Thống kê';
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#F4F7FC] font-sans antialiased text-slate-800 flex flex-col md:flex-row relative">

      {/* Dynamic Toast Notifications */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 16, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-0 left-1/2 z-50 transform -translate-x-1/2 flex items-center gap-2.5 px-5 py-3.5 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 text-sm font-semibold"
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
            <span className="font-bold text-slate-800 uppercase tracking-tight text-sm">AGM Intelligent</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => showToast('Không có thông báo mới', 'info')}
              className="p-1.5 rounded-full hover:bg-slate-100 transition-colors text-slate-600 relative"
            >
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>
          </div>
          <img
            src={avatarUrl}
            alt="Admin Profile"
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
        <div className="h-20 shrink-0 px-6 border-b border-[#D2E2FF] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00285E] flex items-center justify-center shadow-md">
              <Wrench size={20} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[#00285E] uppercase tracking-wider text-base">AGM Intelligent</span>
              <span className="text-[10px] text-slate-500 font-semibold tracking-widest uppercase">Hệ thống quản lý</span>
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
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7 scrollbar-none">
          <div>
            {menuGroups.map((group, groupIndex) => (
              <div key={group.label ?? `group-${groupIndex}`}>
                {group.label && (
                  <span className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
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
                          setIsMobileSidebarOpen(false);
                          showToast(`Đã chuyển sang màn hình: ${item.name}`, 'info');
                        }}
                        className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all group ${isActive
                          ? 'bg-[#00285E] text-white shadow-lg shadow-[#00285E]/15'
                          : 'text-slate-600 hover:bg-[#E0ECFF] hover:text-[#00285E]'
                          }`}>
                        <Icon
                          size={18}
                          className={isActive ? 'text-[#F9A11B]' : 'text-slate-500 group-hover:text-[#00285E]'}
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
            onClick={() => showToast('Chức năng hỗ trợ đang được kết nối...', 'info')}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-[#E0ECFF] hover:text-[#00285E] transition-colors"
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
      </aside>

      {/* MOBILE DRAWER SIDEBAR - ACTUAL DRAWER (PORTAL-LIKE OVERLAY) */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          ></div>
          <aside className="relative flex flex-col w-72 bg-[#EDF3FF] border-r border-[#D2E2FF] h-full p-0">
            {/* Sidebar Header */}
            <div className="p-6 border-b border-[#D2E2FF] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00285E] flex items-center justify-center shadow-md">
                  <Wrench size={20} className="text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-[#00285E] uppercase tracking-wider text-sm">AGM Intelligent</span>
                  <span className="text-[9px] text-slate-500 font-semibold tracking-widest uppercase">Hệ thống quản lý</span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1 rounded-lg hover:bg-[#D2E2FF] text-[#00285E] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7 scrollbar-none">
              {menuGroups.map((group, groupIndex) => (
                <div key={group.label ?? `group-${groupIndex}`}>
                  {group.label && (
                    <span className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
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
                </div>
              ))}
            </div>

            {/* Footer */}
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
                onClick={() => setShowLogoutConfirm(true)}
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
        <header className="hidden md:flex bg-white h-20 px-8 items-center justify-end border-b border-slate-100 shadow-xs sticky top-0 z-25">
        {/* User profile & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border border-slate-200 rounded-full p-0.5 bg-slate-50 select-none">
            <button
              onClick={() => i18n.changeLanguage('vi')}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all ${i18n.language === 'vi' ? 'bg-[#00285E] text-white' : 'text-slate-500 hover:text-slate-700'}`}>
              VI
            </button>
            <button
              onClick={() => i18n.changeLanguage('en')}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all ${i18n.language.startsWith('en') ? 'bg-[#00285E] text-white' : 'text-slate-500 hover:text-slate-700'}`}>
              EN
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => showToast('Không có thông báo mới', 'info')}
              title="Thông báo"
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-white text-[#00285E] hover:bg-slate-50 transition-colors relative"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
            </button>
            <button
              onClick={() => showToast('Mở trung tâm trợ giúp...', 'info')}
              title="Trợ giúp"
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-white text-[#00285E] hover:bg-slate-50 transition-colors"
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
                alt="Admin User Avatar"
                className="w-10 h-10 rounded-full object-cover border-2 border-[#EDF3FF] shadow-sm"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>
          </div>
        </div>
      </header>
        <Outlet context={{ searchQuery, setSearchQuery, showToast }} />

        {/* PAGE FOOTER */}
        <footer className="mt-auto px-8 py-6 border-t border-slate-200/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-400">
          <div>
            © 2024 <span className="text-slate-500 font-bold">AGM Intelligent</span> - Hệ thống quản lý gara chuyên nghiệp
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-slate-600 transition-colors">Điều khoản</a>
            <a href="#" className="hover:text-slate-600 transition-colors">Bảo mật</a>
            <a href="#" className="hover:text-slate-600 transition-colors">Liên hệ</a>
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
