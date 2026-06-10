import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Menu, X, Home, Wrench, Cpu, Phone, User, Check, Trash2, Info, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import Logo from '../../components/share/Logo';
import { Button } from '../../components/share/Button';
import { COLORS } from '../../components/share/Color';

import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import type { UserModel } from '../../model/User';

import { useFetchClient } from '../../hook/useFetchClient';
import { loginSuccess } from '../../store/slices/userSlice';
import { PROFILE_API_ENDPOINTS } from '../../constants/customer/profileApiEndpoint';

type NavItem = { name: string; path: string };
type NavLinkProps = {
    item: NavItem;
    active: boolean;
    mobile?: boolean;
    onClick?: () => void;
};

function NavLink({ item, active, mobile = false, onClick }: NavLinkProps) {
    if (mobile) {
        return (
            <Link
                to={item.path}
                onClick={onClick}
                className={`px-4 py-3 rounded-2xl text-base font-semibold transition-all duration-300 block ${active
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
            >
                {item.name}
            </Link>
        );
    }

    return (
        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
            <Link
                to={item.path}
                onClick={onClick}
                className={`text-base font-semibold transition-colors duration-200 ${active ? 'text-white' : 'text-white/60 hover:text-white'
                    }`}
            >
                {item.name}
            </Link>
        </motion.div>
    );
}

// ─── Avatar với skeleton loading ───────────────────────────────────────────────
function AvatarWithSkeleton({ src }: { src: string | null }) {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    const showSkeleton = !src || (!loaded && !error);
    const showFallback = !src || error;

    return (
        <div
            className="w-10 h-10 rounded-full overflow-hidden border-2 shadow-lg relative"
            style={{ borderColor: COLORS.orange }}
        >
            {/* Skeleton pulse */}
            {showSkeleton && (
                <div className="absolute inset-0 bg-white/10 animate-pulse rounded-full" />
            )}

            {/* Fallback icon khi không có avatar */}
            {showFallback && !showSkeleton && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/10 rounded-full">
                    <User className="w-5 h-5 text-white/60" />
                </div>
            )}

            {/* Ảnh thật */}
            {src && !error && (
                <img
                    src={src}
                    alt="Avatar"
                    className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'
                        }`}
                    onLoad={() => setLoaded(true)}
                    onError={() => setError(true)}
                />
            )}
        </div>
    );
}

// ───────────────────────────────────────────────────────────────────────────────

export default function Navbar() {
    const location = useLocation();
    const dispatch = useDispatch();
    const { fetchPrivate } = useFetchClient();
    const { t, i18n } = useTranslation();

    const [isOpen, setIsOpen] = useState(false);

    const user = useSelector((state: RootState) => state.user.user as UserModel | null);
    const isAuthenticated = !!localStorage.getItem('token');

    // =====================================================
    // NOTIFICATION DROPDOWN STATE & LOGIC
    // =====================================================
    interface NotificationItem {
        id: string;
        titleKey: string;
        descKey: string;
        timeKey: string;
        read: boolean;
        type: 'info' | 'success' | 'warning';
    }

    const [notifications, setNotifications] = useState<NotificationItem[]>([
        {
            id: '1',
            titleKey: 'notification.item1.title',
            descKey: 'notification.item1.desc',
            timeKey: 'notification.item1.time',
            read: false,
            type: 'success'
        },
        {
            id: '2',
            titleKey: 'notification.item2.title',
            descKey: 'notification.item2.desc',
            timeKey: 'notification.item2.time',
            read: false,
            type: 'info'
        },
        {
            id: '3',
            titleKey: 'notification.item3.title',
            descKey: 'notification.item3.desc',
            timeKey: 'notification.item3.time',
            read: true,
            type: 'warning'
        }
    ]);
    const [showDropdown, setShowDropdown] = useState(false);

    const unreadCount = notifications.filter(n => !n.read).length;

    const toggleRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    useEffect(() => {
        setShowDropdown(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!showDropdown) return;
        const handleOutsideClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.notification-bell-container')) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, [showDropdown]);

    const renderDropdown = () => {
        return (
            <AnimatePresence>
                {showDropdown && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-[290px] xs:w-80 sm:w-96 bg-[#001C43] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 text-left"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <span className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
                                {t('notification.title', 'Thông báo')}
                                {unreadCount > 0 && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#F9A11B] text-brand-blue rounded-full">
                                        {unreadCount}
                                    </span>
                                )}
                            </span>
                            {unreadCount > 0 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        markAllAsRead();
                                    }}
                                    className="text-[10px] font-bold text-[#F9A11B] hover:underline"
                                >
                                    {t('notification.markAllRead', 'Đọc tất cả')}
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div className="max-h-[280px] overflow-y-auto divide-y divide-white/5">
                            {notifications.length > 0 ? (
                                notifications.map((item) => {
                                    const IconComponent =
                                        item.type === 'success'
                                            ? Check
                                            : item.type === 'warning'
                                                ? AlertTriangle
                                                : Info;

                                    return (
                                        <div
                                            key={item.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleRead(item.id);
                                            }}
                                            className={`p-3.5 hover:bg-white/5 cursor-pointer transition-colors flex gap-3 items-start relative ${
                                                !item.read ? 'bg-white/[0.02]' : ''
                                            }`}
                                        >
                                            {/* Unread Indicator Bar */}
                                            {!item.read && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#F9A11B]" />
                                            )}

                                            {/* Icon indicator */}
                                            <div className={`p-1.5 rounded-lg shrink-0 ${
                                                item.type === 'success'
                                                    ? 'bg-emerald-500/10 text-emerald-400'
                                                    : item.type === 'warning'
                                                        ? 'bg-amber-500/10 text-amber-400'
                                                        : 'bg-blue-500/10 text-blue-400'
                                            }`}>
                                                <IconComponent className="w-3.5 h-3.5" />
                                            </div>

                                            <div className="space-y-0.5 flex-1 min-w-0">
                                                <h4 className={`text-xs font-bold text-white truncate ${!item.read ? 'font-extrabold text-[#F9A11B]' : ''}`}>
                                                    {t(item.titleKey)}
                                                </h4>
                                                <p className="text-[10px] text-white/60 leading-normal break-words">
                                                    {t(item.descKey)}
                                                </p>
                                                <span className="text-[9px] text-white/40 block pt-1">
                                                    {t(item.timeKey)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-8 text-center text-white/40 text-xs flex flex-col items-center gap-2">
                                    <Bell className="w-6 h-6 text-white/20" />
                                    <span>{t('notification.empty', 'Không có thông báo mới')}</span>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="p-2 border-t border-white/5 text-center">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        clearAll();
                                    }}
                                    className="w-full py-1.5 text-[10px] font-bold text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center gap-1"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    {t('notification.clearAll', 'Xóa tất cả')}
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        );
    };

    // Không còn DEFAULT_AVATAR — null nếu chưa có
    const avatarUrl = user?.avatar?.trim() || null;

    const currentNavItems: NavItem[] = [
        { name: t('nav.home', 'Trang chủ'), path: '/' },
        { name: t('nav.services', 'Dịch vụ'), path: '/services' },
        { name: t('nav.parts', 'Linh kiện'), path: '/parts' },
        { name: t('nav.team', 'Đội ngũ'), path: '/team' },
        { name: t('nav.booking', 'Đặt lịch ngay'), path: '/phone-service' },
    ];

    const currentMobileTabItems = [
        { name: t('nav.home', 'Trang chủ'), path: '/', icon: Home },
        { name: t('nav.services', 'Dịch vụ'), path: '/services', icon: Wrench },
        { name: t('nav.parts', 'Linh kiện'), path: '/parts', icon: Cpu },
        { name: t('nav.booking', 'Đặt lịch ngay'), path: '/phone-service', icon: Phone },
        { name: t('nav.profile', 'Cá nhân'), path: '/user-profile', icon: User },
    ];

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

    const closeMenu = () => setIsOpen(false);
    const toggleMenu = () => setIsOpen((prev) => !prev);

    return (
        <>
            <header
                className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/5"
                style={{ backgroundColor: `${COLORS.navy}F2` }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="h-20 flex items-center justify-between">
                        <Logo size="md" />

                        <nav className="hidden md:flex items-center gap-10 ml-12 mr-auto">
                            {currentNavItems.map((item) => (
                                <NavLink key={item.name} item={item} active={location.pathname === item.path} />
                            ))}
                        </nav>

                        {/* DESKTOP ACTIONS */}
                        <div className="hidden md:flex items-center gap-5">
                            {/* Language Switcher */}
                            <div className="flex items-center gap-1 border border-white/10 rounded-full p-0.5 bg-white/5 mr-1 select-none shrink-0">
                                <button
                                    onClick={() => i18n.changeLanguage('vi')}
                                    className={`px-2 py-1 text-[10px] font-bold rounded-full transition-all cursor-pointer ${
                                        i18n.language === 'vi'
                                            ? 'bg-[#F9A11B] text-brand-blue'
                                            : 'text-white/60 hover:text-white'
                                    }`}
                                >
                                    VI
                                </button>
                                <button
                                    onClick={() => i18n.changeLanguage('en')}
                                    className={`px-2 py-1 text-[10px] font-bold rounded-full transition-all cursor-pointer ${
                                        i18n.language.startsWith('en')
                                            ? 'bg-[#F9A11B] text-brand-blue'
                                            : 'text-white/60 hover:text-white'
                                    }`}
                                >
                                    EN
                                </button>
                            </div>

                            {isAuthenticated ? (
                                <>
                                    <div className="relative notification-bell-container">
                                        <button
                                            type="button"
                                            onClick={() => setShowDropdown(prev => !prev)}
                                            aria-label="Notifications"
                                            className="relative p-2 text-white/70 hover:text-white transition-colors"
                                        >
                                            <Bell className="w-5 h-5" />
                                            {unreadCount > 0 && (
                                                <span
                                                    className="absolute top-1 right-1 w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: COLORS.orange }}
                                                />
                                            )}
                                        </button>
                                        {renderDropdown()}
                                    </div>

                                    <Link to="/user-profile" className="group transition-transform duration-300 hover:scale-105">
                                        <AvatarWithSkeleton src={avatarUrl} />
                                    </Link>

                                    <Button to="/phone-service" size="sm" bg={COLORS.orange} color={COLORS.navy}>
                                        {t('nav.booking', 'Đặt lịch ngay')}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                                        <Link to="/login" className="text-base font-bold text-white hover:text-white/70 transition-colors">
                                            {t('nav.login', 'Đăng nhập')}
                                        </Link>
                                    </motion.div>
                                    <Button to="/phone-service" size="sm" bg={COLORS.orange} color={COLORS.navy}>
                                        {t('nav.booking', 'Đặt lịch ngay')}
                                    </Button>
                                </>
                            )}
                        </div>

                        {/* MOBILE ACTIONS */}
                        <div className="flex md:hidden items-center gap-3">
                            {/* Language Switcher Mobile */}
                            <div className="flex items-center gap-1 border border-white/10 rounded-full p-0.5 bg-white/5 select-none shrink-0">
                                <button
                                    onClick={() => i18n.changeLanguage('vi')}
                                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full transition-all cursor-pointer ${
                                        i18n.language === 'vi'
                                            ? 'bg-[#F9A11B] text-brand-blue'
                                            : 'text-white/60 hover:text-white'
                                    }`}
                                >
                                    VI
                                </button>
                                <button
                                    onClick={() => i18n.changeLanguage('en')}
                                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full transition-all cursor-pointer ${
                                        i18n.language.startsWith('en')
                                            ? 'bg-[#F9A11B] text-brand-blue'
                                            : 'text-white/60 hover:text-white'
                                    }`}
                                >
                                    EN
                                </button>
                            </div>

                            {isAuthenticated && (
                                <div className="relative notification-bell-container">
                                    <button
                                        type="button"
                                        onClick={() => setShowDropdown(prev => !prev)}
                                        aria-label="Notifications"
                                        className="relative p-2 text-white/70 hover:text-white transition-colors"
                                    >
                                        <Bell className="w-5 h-5" />
                                        {unreadCount > 0 && (
                                            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.orange }} />
                                        )}
                                    </button>
                                    {renderDropdown()}
                                </div>
                            )}
                            <button type="button" onClick={toggleMenu} aria-label="Toggle menu" className="p-2 text-white/70 hover:text-white transition-colors">
                                {isOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* MOBILE MENU */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="md:hidden overflow-hidden border-t border-white/5"
                            style={{ backgroundColor: COLORS.navy }}
                        >
                            <div className="px-4 py-6 space-y-6">
                                <nav className="flex flex-col gap-3">
                                    {currentNavItems.map((item) => (
                                        <NavLink key={item.name} item={item} mobile onClick={closeMenu} active={location.pathname === item.path} />
                                    ))}
                                </nav>
                                <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                                    {isAuthenticated ? (
                                        <Link to="/user-profile" onClick={closeMenu}>
                                            <button
                                                type="button"
                                                className="w-full px-4 py-3 rounded-2xl text-white font-semibold border transition-all hover:bg-white/10"
                                                style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)' }}
                                            >
                                                {t('profile.personalInfo', 'Thông tin cá nhân')}
                                            </button>
                                        </Link>
                                    ) : (
                                        <Link to="/login" onClick={closeMenu} className="w-full text-center py-3 text-white font-bold text-base hover:text-white/70 transition-colors">
                                            {t('nav.login', 'Đăng nhập')}
                                        </Link>
                                    )}
                                    <Button to="/phone-service" size="sm" bg={COLORS.orange} color={COLORS.navy} onClick={closeMenu}>
                                        {t('nav.booking', 'Đặt lịch ngay')}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            <main className="pb-20 md:pb-0">
                <Outlet />
            </main>

            {/* MOBILE BOTTOM NAV */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#00285E]/95 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgb(0,0,0,0.5)]">
                <div className="h-16 flex items-center justify-around px-2 relative">
                    {currentMobileTabItems.map((item) => {
                        const active =
                            item.path === '/'
                                ? location.pathname === '/'
                                : item.path === '/user-profile'
                                    ? ['/user-profile', '/login', '/signup', '/forgot-password'].includes(location.pathname)
                                    : location.pathname === item.path;

                        const Icon = item.icon;
                        const targetPath = item.path === '/user-profile' && !isAuthenticated ? '/login' : item.path;

                        return (
                            <Link key={item.name} to={targetPath} className="flex flex-col items-center justify-center flex-1 h-full relative group">
                                <motion.div
                                    animate={active ? { scale: 1.12, y: -4 } : { scale: 1, y: 0 }}
                                    transition={{ type: 'spring', stiffness: 350, damping: 15 }}
                                    className="relative flex items-center justify-center p-1"
                                >
                                    {active && (
                                        <motion.div
                                            layoutId="activeTabGlow"
                                            className="absolute -inset-2 bg-[#F9A11B]/15 blur-md rounded-full -z-10"
                                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                    <Icon className={`w-6 h-6 transition-colors duration-300 ${active ? 'text-[#F9A11B]' : 'text-white/50 group-hover:text-white'}`} />
                                </motion.div>
                                <span className={`text-[10px] mt-0.5 font-medium tracking-wide transition-all duration-300 ${active ? 'text-[#F9A11B]' : 'text-white/40'}`}>
                                    {item.name}
                                </span>
                                {active && (
                                    <motion.div
                                        layoutId="activeTabDot"
                                        className="absolute bottom-1.5 w-1 h-1 rounded-full bg-[#F9A11B]"
                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </>
    );
}