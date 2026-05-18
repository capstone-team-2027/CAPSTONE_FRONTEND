import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    LayoutDashboard,
    Car,
    Calendar,
    Settings,
    HelpCircle,
    LogOut,
    CheckCircle2,
} from 'lucide-react';

import DashboardTab from './DashboardTab';
import VehiclesTab from './VehiclesTab';
import AppointmentsTab from './AppointmentsTab';
import SettingsTab from './SettingsTab';

const DEFAULT_AVATAR_URL =
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

const MENU_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'vehicles', label: 'Xe sở hữu', icon: Car },
    { id: 'appointments', label: 'Lịch hẹn', icon: Calendar },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
];

export default function UserProfile() {
    useEffect(() => {
        document.title = 'Thông tin cá nhân | AGM Intelligent';
    }, []);

    const [activeTab, setActiveTab] = useState('dashboard');

    // Dashboard tab state
    const [isEditing, setIsEditing] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [formData, setFormData] = useState({
        fullName: 'Nguyễn Văn An',
        email: 'an.nguyen@email.com',
        phone: '+84 90 123 4567',
        address: '72 Lê Thánh Tôn, Quận 1, TP. HCM',
    });

    // Appointments tab state
    const [selectedVehicle, setSelectedVehicle] = useState('porsche');
    const [selectedService, setSelectedService] = useState('tongquat');
    const [selectedDate, setSelectedDate] = useState(3);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState('10:30 AM');
    const [isAccepted, setIsAccepted] = useState(false);

    // Settings tab state
    const [settingsData, setSettingsData] = useState({
        fullName: 'Nguyễn Văn An',
        email: 'an.nguyen@example.com',
        phone: '0901 234 567',
        newPassword: '',
        confirmPassword: '',
        enable2FA: false,
        notifyEmail: true,
        notifySMS: false,
        notifyPush: true,
        language: 'Tiếng Việt',
        darkMode: false,
    });

    // Shared avatar state
    const [avatarUrl, setAvatarUrl] = useState(
        () => localStorage.getItem('userAvatar') || DEFAULT_AVATAR_URL
    );

    useEffect(() => {
        const handleAvatarChange = () => {
            setAvatarUrl(localStorage.getItem('userAvatar') || DEFAULT_AVATAR_URL);
        };
        window.addEventListener('storage', handleAvatarChange);
        window.addEventListener('avatarChanged', handleAvatarChange);
        return () => {
            window.removeEventListener('storage', handleAvatarChange);
            window.removeEventListener('avatarChanged', handleAvatarChange);
        };
    }, []);

    const handleAvatarUpdate = () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';

        fileInput.onchange = (e: any) => {
            const file = e.target?.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const resultString = reader.result as string;
                    try {
                        localStorage.setItem('userAvatar', resultString);
                        setAvatarUrl(resultString);
                        window.dispatchEvent(new Event('avatarChanged'));
                        alert('Tải lên và đồng bộ ảnh đại diện thành công!');
                    } catch {
                        alert('Dung lượng ảnh quá lớn để lưu trữ cục bộ. Vui lòng chọn ảnh có kích thước nhỏ hơn.');
                    }
                };
                reader.readAsDataURL(file);
            }
        };

        fileInput.click();
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        setIsEditing(false);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const handleSettingChange = (field: string, value: any) => {
        setSettingsData((prev) => ({ ...prev, [field]: value }));
    };

    const handleResetAppointment = () => {
        setSelectedVehicle('porsche');
        setSelectedService('tongquat');
        setSelectedDate(3);
        setSelectedTimeSlot('10:30 AM');
        setIsAccepted(false);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <DashboardTab
                        avatarUrl={avatarUrl}
                        formData={formData}
                        isEditing={isEditing}
                        onAvatarUpdate={handleAvatarUpdate}
                        onInputChange={handleInputChange}
                        onSave={handleSave}
                        onEditToggle={setIsEditing}
                    />
                );
            case 'vehicles':
                return <VehiclesTab />;
            case 'appointments':
                return (
                    <AppointmentsTab
                        selectedVehicle={selectedVehicle}
                        selectedService={selectedService}
                        selectedDate={selectedDate}
                        selectedTimeSlot={selectedTimeSlot}
                        isAccepted={isAccepted}
                        onSelectVehicle={setSelectedVehicle}
                        onSelectService={setSelectedService}
                        onSelectDate={setSelectedDate}
                        onSelectTimeSlot={setSelectedTimeSlot}
                        onAccept={() => setIsAccepted(true)}
                        onReset={handleResetAppointment}
                        onNavigateBack={() => setActiveTab('vehicles')}
                    />
                );
            case 'settings':
                return (
                    <SettingsTab
                        settingsData={settingsData}
                        avatarUrl={avatarUrl}
                        onAvatarUpdate={handleAvatarUpdate}
                        onSettingChange={handleSettingChange}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans">
            {/* Toast Notification */}
            <AnimatePresence>
                {showToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold text-sm border border-emerald-500"
                    >
                        <CheckCircle2 className="w-5 h-5 animate-bounce" />
                        <span>Cập nhật thông tin thành công!</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Sidebar */}
                <div className="lg:col-span-3 flex flex-col gap-2 md:gap-3">
                    <div className="hidden lg:block px-4 py-1">
                        <h2 className="text-gray-400 font-bold text-base tracking-wide">Thông tin cá nhân</h2>
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
                                            className={`w-4 h-4 md:w-5 md:h-5 shrink-0 ${isActive ? 'text-brand-blue' : 'text-brand-blue/60'}`}
                                        />
                                        <span className="truncate">{item.label}</span>
                                    </motion.button>
                                );
                            })}
                        </div>

                        <div className="pt-3 lg:pt-4 border-t border-gray-200/80 grid grid-cols-2 gap-2 lg:flex lg:flex-col lg:space-y-2 mt-3 lg:mt-auto">
                            <button
                                onClick={() => alert('Hệ thống hỗ trợ trực tuyến đang kết nối...')}
                                className="w-full flex items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl font-medium text-xs md:text-sm text-brand-blue/70 hover:bg-white/60 hover:text-brand-blue transition-all text-left bg-white/40 lg:bg-transparent"
                            >
                                <HelpCircle className="w-4 h-4 md:w-5 md:h-5 text-brand-blue/60 shrink-0" />
                                <span className="truncate">Trợ giúp & Hỗ trợ</span>
                            </button>

                            <button
                                onClick={() => {
                                    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                                        localStorage.removeItem('isAuthenticated');
                                        window.location.href = '/login';
                                    }
                                }}
                                className="w-full flex items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl font-bold text-xs md:text-sm text-red-600 hover:bg-red-50 transition-all text-left group bg-red-50/30 lg:bg-transparent"
                            >
                                <LogOut className="w-4 h-4 md:w-5 md:h-5 text-red-600 group-hover:translate-x-1 transition-transform shrink-0" />
                                <span className="truncate">Đăng xuất</span>
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-9 flex flex-col gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="pt-1"
                    >
                        <h1 className="text-2xl font-display font-bold text-brand-blue">Hồ sơ người dùng</h1>
                    </motion.div>

                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
}
