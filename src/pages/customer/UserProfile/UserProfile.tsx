import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Calendar,
    HelpCircle,
    LogOut,
    CheckCircle2,
    History,
    Clock,
    MapPin,
    ReceiptText,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
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
    { id: 'map', label: 'Bản đồ', icon: MapPin },
] as const;

type TabId = typeof MENU_ITEMS[number]['id'];

export default function UserProfile() {
    const { t } = useTranslation();

    useEffect(() => {
        document.title = `${t('profile.title', 'Thông tin cá nhân')} | AGM Intelligent`;
    }, [t]);

    const dispatch = useDispatch();
    const { fetchPrivateForm } = useFetchClient();

    const user = useSelector(
        (state: RootState) => state.user.user as UserModel | null
    );

    // =====================================================
    // TAB STATE
    // =====================================================

    const [activeTab, setActiveTab] = useState<TabId | string>('dashboard');
    const [isEditing, setIsEditing] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState(t('profile.updateSuccess', 'Cập nhật thông tin thành công!'));
    const [isSubmitting, setIsSubmitting] = useState(false);

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

                        <div className="pt-2 mt-2 border-t border-gray-100 grid grid-cols-2 gap-2 lg:flex lg:flex-col lg:space-y-1">
                            <button
                                onClick={() => alert(t('profile.supportMessage', 'Hệ thống hỗ trợ trực tuyến đang kết nối...'))}
                                className="w-full flex items-center gap-2.5 md:gap-3 px-3 py-2.5 md:px-4 md:py-3 rounded-xl font-semibold text-xs md:text-sm text-slate-500 hover:bg-slate-50 hover:text-brand-blue transition-colors text-left"
                            >
                                <HelpCircle className="w-4 h-4 md:w-[18px] md:h-[18px] text-slate-400 shrink-0" />
                                <span className="truncate">{t('profile.support', 'Trợ giúp & Hỗ trợ')}</span>
                            </button>

                            <button
                                onClick={() => {
                                    if (confirm(t('profile.logoutConfirm', 'Bạn có chắc chắn muốn đăng xuất?'))) {
                                        localStorage.removeItem('token');
                                        localStorage.removeItem('userAvatar');
                                        dispatch(logout());
                                        window.location.href = '/login';
                                    }
                                }}
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
