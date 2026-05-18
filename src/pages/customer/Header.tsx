import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Menu, X, Home, Wrench, Cpu, Phone, User } from 'lucide-react';

import Logo from '../../components/share/Logo';
import { Button } from '../../components/share/Button';
import { COLORS } from '../../components/share/Color';

type NavItem = { name: string; path: string };
type NavLinkProps = { item: NavItem; active: boolean; mobile?: boolean; onClick?: () => void };

const DEFAULT_AVATAR =
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

const NAV_ITEMS: NavItem[] = [
    { name: 'Trang Chủ', path: '/' },
    { name: 'Dịch Vụ', path: '/services' },
    { name: 'Linh Kiện', path: '/parts' },
    { name: 'Đội Ngũ', path: '/team' },
    { name: 'Tư Vấn', path: '/phone-service' },
];

const MOBILE_TAB_ITEMS = [
    { name: 'Trang Chủ', path: '/', icon: Home },
    { name: 'Dịch Vụ', path: '/services', icon: Wrench },
    { name: 'Linh Kiện', path: '/parts', icon: Cpu },
    { name: 'Tư Vấn', path: '/phone-service', icon: Phone },
    { name: 'Cá Nhân', path: '/userprofile', icon: User },
];

// ────────────────────────────────────────────────────────────
// NAV LINK — text-base (to hơn) + hover nổi lên (y: -2)
// ────────────────────────────────────────────────────────────

function NavLink({ item, active, mobile = false, onClick }: NavLinkProps) {
    if (mobile) {
        return (
            <Link
                to={item.path}
                onClick={onClick}
                className={`
                    px-4 py-3 rounded-2xl text-base font-semibold
                    transition-all duration-300 block
                    ${active ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}
                `}
            >
                {item.name}
            </Link>
        );
    }

    return (
        <motion.div
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
            <Link
                to={item.path}
                onClick={onClick}
                className={`
                    text-base font-semibold transition-colors duration-200
                    ${active ? 'text-white' : 'text-white/60 hover:text-white'}
                `}
            >
                {item.name}
            </Link>
        </motion.div>
    );
}

// ────────────────────────────────────────────────────────────
// NAVBAR
// ────────────────────────────────────────────────────────────

export default function Navbar() {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const [avatarUrl, setAvatarUrl] = useState(
        localStorage.getItem('userAvatar') || DEFAULT_AVATAR
    );

    useEffect(() => {
        const sync = () =>
            setAvatarUrl(localStorage.getItem('userAvatar') || DEFAULT_AVATAR);
        window.addEventListener('storage', sync);
        window.addEventListener('avatarChanged', sync);
        return () => {
            window.removeEventListener('storage', sync);
            window.removeEventListener('avatarChanged', sync);
        };
    }, []);

    const closeMenu = () => setIsOpen(false);
    const toggleMenu = () => setIsOpen((p) => !p);

    return (
        <>
            <header
                className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/5"
                style={{ backgroundColor: `${COLORS.navy}F2` }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="h-20 flex items-center justify-between">

                        {/* LOGO */}
                        <Logo size="md" />

                        {/* DESKTOP NAV — ml-12 mr-auto → dịch sang trái */}
                        <nav className="hidden md:flex items-center gap-10 ml-12 mr-auto">
                            {NAV_ITEMS.map((item) => (
                                <NavLink
                                    key={item.name}
                                    item={item}
                                    active={location.pathname === item.path}
                                />
                            ))}
                        </nav>

                        {/* DESKTOP ACTIONS */}
                        <div className="hidden md:flex items-center gap-5">
                            {isAuthenticated ? (
                                <>
                                    <button
                                        type="button"
                                        aria-label="Notifications"
                                        className="relative p-2 text-white/70 hover:text-white transition-colors"
                                    >
                                        <Bell className="w-5 h-5" />
                                        <span
                                            className="absolute top-1 right-1 w-2 h-2 rounded-full"
                                            style={{ backgroundColor: COLORS.orange }}
                                        />
                                    </button>

                                    <Link to="/userprofile" className="group">
                                        <div
                                            className="w-10 h-10 rounded-full overflow-hidden border-2 shadow-lg transition-transform duration-300 group-hover:scale-105"
                                            style={{ borderColor: COLORS.orange }}
                                        >
                                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        </div>
                                    </Link>

                                    <Button to="/phone-service" size="sm" bg={COLORS.orange} color={COLORS.navy}>
                                        Tư Vấn Ngay
                                    </Button>
                                </>
                            ) : (
                                <>
                                    {/* Đăng Nhập — text link, hover nổi lên */}
                                    <motion.div
                                        whileHover={{ y: -2 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                    >
                                        <Link
                                            to="/login"
                                            className="text-base font-bold text-white hover:text-white/70 transition-colors"
                                        >
                                            Đăng Nhập
                                        </Link>
                                    </motion.div>

                                    <Button to="/phone-service" size="sm" bg={COLORS.orange} color={COLORS.navy}>
                                        Tư Vấn Ngay
                                    </Button>
                                </>
                            )}
                        </div>

                        {/* MOBILE ACTIONS */}
                        <div className="flex md:hidden items-center gap-3">
                            {isAuthenticated && (
                                <button
                                    type="button"
                                    aria-label="Notifications"
                                    className="relative p-2 text-white/70 hover:text-white transition-colors"
                                >
                                    <Bell className="w-5 h-5" />
                                    <span
                                        className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                                        style={{ backgroundColor: COLORS.orange }}
                                    />
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={toggleMenu}
                                aria-label="Toggle menu"
                                className="p-2 text-white/70 hover:text-white transition-colors"
                            >
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
                                    {NAV_ITEMS.map((item) => (
                                        <NavLink
                                            key={item.name}
                                            item={item}
                                            mobile
                                            onClick={closeMenu}
                                            active={location.pathname === item.path}
                                        />
                                    ))}
                                </nav>

                                <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                                    {isAuthenticated ? (
                                        <Link to="/userprofile" onClick={closeMenu}>
                                            <button
                                                type="button"
                                                className="w-full px-4 py-3 rounded-2xl text-white font-semibold border transition-all hover:bg-white/10"
                                                style={{
                                                    borderColor: 'rgba(255,255,255,0.1)',
                                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                                }}
                                            >
                                                Thông tin cá nhân
                                            </button>
                                        </Link>
                                    ) : (
                                        <Link
                                            to="/login"
                                            onClick={closeMenu}
                                            className="w-full text-center py-3 text-white font-bold text-base hover:text-white/70 transition-colors"
                                        >
                                            Đăng Nhập
                                        </Link>
                                    )}

                                    <Button to="/phone-service" size="sm" bg={COLORS.orange} color={COLORS.navy}>
                                        Tư Vấn Ngay
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

            {/* MOBILE BOTTOM NAVIGATION BAR (Shopee Style) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#00285E]/95 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgb(0,0,0,0.5)]">
                <div className="h-16 flex items-center justify-around px-2 relative">
                    {MOBILE_TAB_ITEMS.map((item) => {
                        // Check if current route matches this tab
                        const active = item.path === '/' 
                            ? location.pathname === '/' 
                            : item.path === '/userprofile'
                                ? ['/userprofile', '/login', '/signup', '/forgot-password'].includes(location.pathname)
                                : location.pathname === item.path;
                        
                        const Icon = item.icon;
                        
                        // If "Cá Nhân" and not logged in, navigate to /login
                        const targetPath = item.path === '/userprofile' && !isAuthenticated ? '/login' : item.path;

                        return (
                            <Link
                                key={item.name}
                                to={targetPath}
                                className="flex flex-col items-center justify-center flex-1 h-full relative group"
                            >
                                <motion.div
                                    animate={active ? { scale: 1.12, y: -4 } : { scale: 1, y: 0 }}
                                    transition={{ type: 'spring', stiffness: 350, damping: 15 }}
                                    className="relative flex items-center justify-center p-1"
                                >
                                    {/* Active background glow */}
                                    {active && (
                                        <motion.div
                                            layoutId="activeTabGlow"
                                            className="absolute -inset-2 bg-[#F9A11B]/15 blur-md rounded-full -z-10"
                                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                    
                                    <Icon
                                        className={`w-6 h-6 transition-colors duration-300 ${
                                            active ? 'text-[#F9A11B]' : 'text-white/50 group-hover:text-white'
                                        }`}
                                    />
                                </motion.div>
                                
                                <span
                                    className={`text-[10px] mt-0.5 font-medium tracking-wide transition-all duration-300 ${
                                        active ? 'text-[#F9A11B] font-semibold scale-105' : 'text-white/40'
                                    }`}
                                >
                                    {item.name}
                                </span>

                                {/* Safe small active indicator dot under the text */}
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