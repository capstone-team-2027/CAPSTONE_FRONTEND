import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Car,
    Calendar,
    Settings,
    HelpCircle,
    LogOut,
    CheckCircle2,
    History,
    ShieldCheck,
    Clock,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { logout, loginSuccess } from '../../../store/slices/userSlice';

import DashboardTab from './DashboardTab';
import VehiclesTab from './VehiclesTab';
import AppointmentsTab from './AppointmentsTab';
import SettingsTab from './SettingsTab';
import HistoryTab from './HistoryTab';
import WarrantyTab from './WarrantyTab';
import TrackingTab from './TrackingTab';
import type { RootState } from '../../../store/store';
import type { UserModel } from '../../../model/User';
import { useFetchClient } from '../../../hook/useFetchClient';
import { PROFILE_API_ENDPOINTS } from '../../../constants/customer/profileApiEndpoint';

const MENU_ITEMS = [
    { id: 'dashboard', label: 'Hồ sơ người dùng', icon: LayoutDashboard },
    { id: 'vehicles', label: 'Xe sở hữu', icon: Car },
    { id: 'appointments', label: 'Lịch hẹn', icon: Calendar },
    { id: 'history', label: 'Lịch sử sửa chữa', icon: History },
    { id: 'warranty', label: 'Bảo hành', icon: ShieldCheck },
    { id: 'tracking', label: 'Theo dõi', icon: Clock },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
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
    // SETTINGS DATA — derived từ Redux + settingsOverrides
    // =====================================================

    const [settingsOverrides, setSettingsOverrides] = useState<Partial<{
        fullName: string;
        email: string;
        phone: string;
        newPassword: string;
        confirmPassword: string;
        enable2FA: boolean;
        notifyEmail: boolean;
        notifySMS: boolean;
        notifyPush: boolean;
        language: string;
        darkMode: boolean;
    }>>({});

    const [pendingSettingsAvatarFile, setPendingSettingsAvatarFile] = useState<File | null>(null);

    const settingsData = {
        fullName: settingsOverrides.fullName ?? user?.fullName ?? '',
        email: settingsOverrides.email ?? '',
        phone: settingsOverrides.phone ?? user?.phoneNumber ?? '',
        newPassword: settingsOverrides.newPassword ?? '',
        confirmPassword: settingsOverrides.confirmPassword ?? '',
        enable2FA: settingsOverrides.enable2FA ?? false,
        notifyEmail: settingsOverrides.notifyEmail ?? true,
        notifySMS: settingsOverrides.notifySMS ?? false,
        notifyPush: settingsOverrides.notifyPush ?? true,
        language: settingsOverrides.language ?? 'Tiếng Việt',
        darkMode: settingsOverrides.darkMode ?? false,
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

    const handleAvatarUpdate = (forSettings = false) => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';

        fileInput.onchange = (e: Event) => {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (file) {
                const previewUrl = URL.createObjectURL(file);
                setAvatarPreview(previewUrl);

                if (forSettings) {
                    setPendingSettingsAvatarFile(file);
                } else {
                    setPendingAvatarFile(file);
                }
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
    // HANDLE SAVE SETTINGS
    // =====================================================

    const handleSettingsSave = async () => {
        if (
            settingsOverrides.newPassword &&
            settingsOverrides.newPassword !== settingsOverrides.confirmPassword
        ) {
            alert(t('settings.passwordMismatch', 'Mật khẩu mới và xác nhận mật khẩu không khớp!'));
            return;
        }

        setIsSubmitting(true);
        try {
            const form = new FormData();

            const newFullName = settingsOverrides.fullName?.trim() ?? '';
            if (newFullName) {
                form.append('fullName', newFullName);
            }

            if (pendingSettingsAvatarFile) {
                form.append('avatar', pendingSettingsAvatarFile);
            }

            if (!newFullName && !pendingSettingsAvatarFile) {
                showSuccessToast(t('settings.updateSuccess', 'Đã lưu cài đặt thành công!'));
                return;
            }

            const response = await fetchPrivateForm(
                PROFILE_API_ENDPOINTS.UPDATE_PROFILE,
                'PUT',
                form,
            );

            syncUserToRedux(response.data);

            setSettingsOverrides((prev) => ({
                ...prev,
                fullName: undefined,
            }));
            setPendingSettingsAvatarFile(null);
            setAvatarPreview('');

            showSuccessToast(t('settings.updateSuccess', 'Đã lưu cài đặt thành công!'));
        } catch (error: any) {
            alert(error.message || t('profile.updateFail', 'Cập nhật thất bại, vui lòng thử lại.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // =====================================================
    // HANDLE CHANGE PASSWORD
    // =====================================================
    const handleChangePassword = async (data: any) => {
        await fetchPrivate(
            PROFILE_API_ENDPOINTS.CHANGE_PASSWORD,
            'PUT',
            data
        );
        showSuccessToast(t('settings.changePasswordSuccess', 'Đổi mật khẩu thành công!'));
    };

    const handleSettingChange = (field: string, value: string | boolean) => {
        setSettingsOverrides((prev) => ({ ...prev, [field]: value }));
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
                        isEditing={isEditing}
                        isSubmitting={isSubmitting}
                        onAvatarUpdate={() => handleAvatarUpdate(false)}
                        onInputChange={handleInputChange}
                        onSave={handleSave}
                        onEditToggle={setIsEditing}
                        hasPendingAvatar={!!pendingAvatarFile}
                        onAvatarSave={handleAvatarSave}
                        onAvatarCancel={handleAvatarCancel}
                        onViewAllHistory={() => setActiveTab('history')}
                    />
                );

            case 'vehicles':
                return <VehiclesTab />;

            case 'appointments':
                return <AppointmentsTab />;

            case 'history':
                return <HistoryTab />;

            case 'warranty':
                return <WarrantyTab />;

            case 'tracking':
                return <TrackingTab />;

            case 'settings':
                return (
                    <SettingsTab
                        settingsData={settingsData}
                        avatarUrl={avatarUrl}
                        isSubmitting={isSubmitting}
                        onAvatarUpdate={() => handleAvatarUpdate(true)}
                        onSettingChange={handleSettingChange}
                        onSave={handleSettingsSave}
                        onChangePassword={handleChangePassword}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans">
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
                <div className="lg:col-span-3 flex flex-col gap-2 md:gap-3">
                    <div className="hidden lg:block px-4 py-1">
                        <h2 className="text-gray-400 font-bold text-base tracking-wide">
                            {t('profile.title', 'Thông tin cá nhân')}
                        </h2>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-[#F1F5F9] rounded-2xl p-3 md:p-4 flex flex-col justify-between border border-gray-200/60 shadow-sm min-h-auto lg:min-h-[580px]"
                    >
                        <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-col lg:space-y-2 pt-1 lg:pt-2">
                            {MENU_ITEMS.map((item) => {
                                const IconComponent = item.icon;
                                const isActive = activeTab === item.id;

                                return (
                                    <motion.button
                                        key={item.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setActiveTab(item.id)}
                                        className={`w-full flex items-center gap-2.5 md:gap-3 px-3 py-2.5 md:px-4 md:py-3.5 rounded-xl font-bold text-xs md:text-sm transition-all text-left ${isActive
                                            ? 'bg-[#F9A11B] text-brand-blue shadow-md shadow-orange-500/10'
                                            : 'text-brand-blue/70 hover:bg-white/60 hover:text-brand-blue'
                                            }`}
                                    >
                                        <IconComponent
                                            className={`w-4 h-4 md:w-5 md:h-5 shrink-0 ${isActive ? 'text-brand-blue' : 'text-brand-blue/60'
                                                }`}
                                        />
                                        <span className="truncate">{t(`profile.tabs.${item.id}`, item.label)}</span>
                                    </motion.button>
                                );
                            })}
                        </div>

                        <div className="pt-3 lg:pt-4 border-t border-gray-200/80 grid grid-cols-2 gap-2 lg:flex lg:flex-col lg:space-y-2 mt-3 lg:mt-auto">
                            <button
                                onClick={() => alert(t('profile.supportMessage', 'Hệ thống hỗ trợ trực tuyến đang kết nối...'))}
                                className="w-full flex items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl font-medium text-xs md:text-sm text-brand-blue/70 hover:bg-white/60 hover:text-brand-blue transition-all text-left bg-white/40 lg:bg-transparent"
                            >
                                <HelpCircle className="w-4 h-4 md:w-5 md:h-5 text-brand-blue/60 shrink-0" />
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
                                className="w-full flex items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl font-bold text-xs md:text-sm text-red-600 hover:bg-red-50 transition-all text-left group bg-red-50/30 lg:bg-transparent"
                            >
                                <LogOut className="w-4 h-4 md:w-5 md:h-5 text-red-600 group-hover:translate-x-1 transition-transform shrink-0" />
                                <span className="truncate">{t('profile.logout', 'Đăng xuất')}</span>
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* MAIN CONTENT */}
                <div className="lg:col-span-9 flex flex-col gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="pt-1"
                    >
                        <h1 className="text-2xl font-display font-bold text-brand-blue">
                            {t('profile.userProfile', 'Hồ sơ người dùng')}
                        </h1>
                    </motion.div>

                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
}