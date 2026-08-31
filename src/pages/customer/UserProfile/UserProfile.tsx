import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Calendar,
    LogOut,
    CheckCircle2,
    History,
    Clock,
    MapPin,
    ReceiptText,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { logout, loginSuccess } from '../../../store/slices/userSlice';

import DashboardTab from './DashboardTab';
import QuoteTrackingTab from './QuoteTrackingTab';
import AppointmentsTab from './AppointmentsTab';
import HistoryTab from './HistoryTab';
import TrackingTab from './TrackingTab';
import MapTab from './MapTab';
import type { RootState } from '../../../store/store';
import type { UserModel } from '../../../model/User';
import { useFetchClient } from '../../../hook/useFetchClient';
import { PROFILE_API_ENDPOINTS } from '../../../constants/customer/profileApiEndpoint';

const MENU_ITEMS = [
    { id: 'dashboard', label: 'Hồ sơ người dùng', icon: LayoutDashboard },
    { id: 'quoteTracking', label: 'Theo dõi báo giá', icon: ReceiptText },
    { id: 'appointments', label: 'Lịch hẹn', icon: Calendar },
    { id: 'history', label: 'Lịch sử dịch vụ', icon: History },
    { id: 'tracking', label: 'Theo dõi', icon: Clock },
    { id: 'map', label: 'Yêu cầu cứu hộ', icon: MapPin },
] as const;

type TabId = typeof MENU_ITEMS[number]['id'];

export default function UserProfile() {
    const { t } = useTranslation();

    useEffect(() => {
        document.title = `${t('profile.title', 'Thông tin cá nhân')} | AGM Intelligent`;
    }, [t]);

    const dispatch = useDispatch();
    const { fetchPrivate, fetchPrivateForm } = useFetchClient();

    const user = useSelector(
        (state: RootState) => state.user.user as UserModel | null
    );

    // loginSuccess lúc đăng nhập chỉ set 5 field cơ bản (id, fullName, phoneNumber,
    // avatar, role) — thiếu status/membershipTier/loyaltyPoints/createdAt mà trang
    // này cần hiển thị. Nên phải luôn tự fetch full profile khi vào trang, không thể
    // chỉ dựa vào `user` đã có sẵn trong Redux từ lúc login.
    const [isFetchingFullProfile, setIsFetchingFullProfile] = useState(true);

    useEffect(() => {
        const fetchFullProfile = async () => {
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
                        status: userData.status,
                        membershipTier: userData.customerProfile?.membership_tier,
                        loyaltyPoints: userData.customerProfile?.loyalty_points,
                        totalSpent: userData.customerProfile?.total_spent,
                        createdAt: userData.createdAt,
                    })
                );
            } catch (error) {
                console.error('Không lấy được thông tin user:', error);
            } finally {
                setIsFetchingFullProfile(false);
            }
        };
        void fetchFullProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('token');
    const isProfileLoading = hasToken && (isFetchingFullProfile || !user);

    const location = useLocation();
    const initialTab = (location.state as { activeTab?: string } | null)?.activeTab;
    const [activeTab, setActiveTab] = useState<TabId | string>(initialTab || 'dashboard');

    useEffect(() => {
        const label = MENU_ITEMS.find((item) => item.id === activeTab)?.label || String(activeTab);
        sessionStorage.setItem('customerActiveScreen', label);
        return () => sessionStorage.removeItem('customerActiveScreen');
    }, [activeTab]);
    const [isEditing, setIsEditing] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState(t('profile.updateSuccess', 'Cập nhật thông tin thành công!'));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // =====================================================
    // FORM DATA — derived từ Redux + editOverrides
    // =====================================================

    const [editOverrides, setEditOverrides] = useState<Partial<{
        fullName: string;
        email: string;
        phone: string;
        address: string;
    }>>({});

    const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);

    const formData = {
        fullName: editOverrides.fullName ?? user?.fullName ?? '',
        email: editOverrides.email ?? '',
        phone: editOverrides.phone ?? user?.phoneNumber ?? '',
        address: editOverrides.address ?? '',
    };

    // =====================================================
    // AVATAR
    // =====================================================

    const [avatarPreview, setAvatarPreview] = useState<string>('');
    const avatarUrl: string = avatarPreview || user?.avatar || '';


    // =====================================================
    // HELPER: Hiện toast
    // =====================================================

    const showSuccessToast = (message = t('profile.updateSuccess', 'Cập nhật thông tin thành công!')) => {
        setToastMessage(message);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    // =====================================================
    // HELPER: Cập nhật Redux store sau khi API thành công
    // =====================================================

    const syncUserToRedux = (userData: any) => {
        dispatch(loginSuccess({
            id: userData.id,
            fullName: userData.fullName,
            phoneNumber: userData.phoneNumber,
            avatar: userData.avatar,
            role: userData.role,
        }));
    };

    // =====================================================
    // HANDLE AVATAR
    // =====================================================

    const handleAvatarUpdate = () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';

        fileInput.onchange = (e: Event) => {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (file) {
                const previewUrl = URL.createObjectURL(file);
                setAvatarPreview(previewUrl);
                setPendingAvatarFile(file);
            }
        };

        fileInput.click();
    };

    // =====================================================
    // HANDLE FORM (Dashboard)
    // =====================================================

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditOverrides((prev) => ({ ...prev, [name]: value }));
    };

    // =====================================================
    // HANDLE SAVE DASHBOARD
    // =====================================================

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            const form = new FormData();

            const newFullName = editOverrides.fullName?.trim() ?? '';
            if (newFullName) {
                form.append('fullName', newFullName);
            }

            if (pendingAvatarFile) {
                form.append('avatar', pendingAvatarFile);
            }

            if (!newFullName && !pendingAvatarFile) {
                setIsEditing(false);
                return;
            }

            const response = await fetchPrivateForm(
                PROFILE_API_ENDPOINTS.UPDATE_PROFILE,
                'PUT',
                form,
            );

            syncUserToRedux(response.data);

            setEditOverrides({});
            setPendingAvatarFile(null);
            setAvatarPreview('');

            setIsEditing(false);
            showSuccessToast(t('profile.updateSuccess', 'Cập nhật thông tin thành công!'));
        } catch (error: any) {
            alert(error.message || t('profile.updateFail', 'Cập nhật thất bại, vui lòng thử lại.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // =====================================================
    // HANDLE SAVE AVATAR (DEDICATED)
    // =====================================================

    const handleAvatarSave = async () => {
        if (!pendingAvatarFile) return;
        setIsSubmitting(true);
        try {
            const form = new FormData();

            const currentFullName = formData.fullName || user?.fullName || '';
            if (currentFullName) {
                form.append('fullName', currentFullName);
            }

            form.append('avatar', pendingAvatarFile);

            const response = await fetchPrivateForm(
                PROFILE_API_ENDPOINTS.UPDATE_PROFILE,
                'PUT',
                form,
            );

            syncUserToRedux(response.data);

            setPendingAvatarFile(null);
            setAvatarPreview('');
            showSuccessToast(t('profile.avatarUpdateSuccess', 'Cập nhật ảnh đại diện thành công!'));
        } catch (error: any) {
            alert(error.message || t('profile.avatarUpdateFail', 'Cập nhật ảnh đại diện thất bại, vui lòng thử lại.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAvatarCancel = () => {
        setPendingAvatarFile(null);
        setAvatarPreview('');
    };

    // =====================================================
    // RENDER TAB
    // =====================================================

    const renderTabContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <DashboardTab
                        avatarUrl={avatarUrl}
                        formData={formData}
                        accountStatus={user?.status}
                        membershipTier={user?.membershipTier}
                        loyaltyPoints={user?.loyaltyPoints}
                        totalSpent={user?.totalSpent}
                        joinedAt={user?.createdAt}
                        isEditing={isEditing}
                        isSubmitting={isSubmitting}
                        onAvatarUpdate={handleAvatarUpdate}
                        onInputChange={handleInputChange}
                        onSave={handleSave}
                        onEditToggle={setIsEditing}
                        hasPendingAvatar={!!pendingAvatarFile}
                        onAvatarSave={handleAvatarSave}
                        onAvatarCancel={handleAvatarCancel}
                        onViewAllHistory={() => setActiveTab('history')}
                        onShowToast={showSuccessToast}
                    />
                );

            case 'quoteTracking':
                return <QuoteTrackingTab />;

            case 'appointments':
                return <AppointmentsTab />;

            case 'history':
                return <HistoryTab />;

            case 'tracking':
                return <TrackingTab />;

            case 'map':
                return <MapTab />;

            default:
                return null;
        }
    };

    if (isProfileLoading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4">
                <div className="relative w-14 h-14">
                    <div className="absolute inset-0 rounded-full border-4 border-[#00285E]/10 border-t-[#00285E] animate-spin"></div>
                    <div className="absolute inset-3 rounded-full bg-[#F9A11B]/80 animate-pulse"></div>
                </div>
                <span className="text-xs font-bold text-[#00285E] tracking-widest uppercase animate-pulse">
                    {t('profile.loading', 'Đang tải thông tin...')}
                </span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto font-sans">
            {/* TOAST */}
            <AnimatePresence>
                {showToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold text-sm border border-emerald-500"
                    >
                        <CheckCircle2 className="w-5 h-5 animate-bounce" />
                        <span>{toastMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* LOGOUT CONFIRM MODAL */}
            <AnimatePresence>
                {showLogoutConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-[2px]">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 12 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden"
                        >
                            <div className="p-6 text-center">
                                <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
                                    <LogOut className="w-6 h-6 text-rose-500" />
                                </div>
                                <h3 className="text-base font-extrabold text-brand-blue mb-2">
                                    {t('profile.logoutConfirmTitle', 'Đăng xuất tài khoản')}
                                </h3>
                                <p className="text-sm text-slate-500">
                                    {t('profile.logoutConfirm', 'Bạn có chắc chắn muốn đăng xuất?')}
                                </p>
                            </div>
                            <div className="flex gap-2 p-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowLogoutConfirm(false)}
                                    className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs font-bold transition-all"
                                >
                                    {t('common.cancel', 'Hủy')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        localStorage.removeItem('token');
                                        localStorage.removeItem('userAvatar');
                                        dispatch(logout());
                                        window.location.href = '/login';
                                    }}
                                    className="flex-1 py-2.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold transition-all"
                                >
                                    {t('profile.logout', 'Đăng xuất')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* SIDEBAR */}
                <div className="lg:col-span-3 lg:sticky lg:top-24">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white rounded-2xl p-3 md:p-4 flex flex-col border border-gray-200/70 shadow-xs"
                    >
                        <span className="hidden lg:block px-2 pt-1 pb-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                            {t('profile.title', 'Thông tin cá nhân')}
                        </span>

                        <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-col lg:space-y-1">
                            {MENU_ITEMS.map((item) => {
                                const IconComponent = item.icon;
                                const isActive = activeTab === item.id;

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        className={`w-full flex items-center gap-2.5 md:gap-3 px-3 py-2.5 md:px-4 md:py-3 rounded-xl font-semibold text-xs md:text-sm transition-colors text-left ${isActive
                                            ? 'bg-[#F9A11B]/15 text-brand-blue'
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-brand-blue'
                                            }`}
                                    >
                                        <IconComponent
                                            className={`w-4 h-4 md:w-[18px] md:h-[18px] shrink-0 ${isActive ? 'text-[#F9A11B]' : 'text-slate-400'
                                                }`}
                                        />
                                        <span className="truncate">{t(`profile.tabs.${item.id}`, item.label)}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="pt-2 mt-2 border-t border-gray-100 grid grid-cols-1 gap-2 lg:flex lg:flex-col lg:space-y-1">
                            <button
                                onClick={() => setShowLogoutConfirm(true)}
                                className="w-full flex items-center gap-2.5 md:gap-3 px-3 py-2.5 md:px-4 md:py-3 rounded-xl font-semibold text-xs md:text-sm text-rose-600 hover:bg-rose-50 transition-colors text-left"
                            >
                                <LogOut className="w-4 h-4 md:w-[18px] md:h-[18px] text-rose-500 shrink-0" />
                                <span className="truncate">{t('profile.logout', 'Đăng xuất')}</span>
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* MAIN CONTENT */}
                <div className="lg:col-span-9 flex flex-col gap-6">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
}
