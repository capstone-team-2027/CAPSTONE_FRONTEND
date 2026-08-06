import type { ChangeEvent } from 'react';
import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  Award,
  Edit3,
  ChevronRight,
  FileText,
  Save,
  X,
  User,
  Check,
  Calendar,
  Loader2,
  Wallet,
  Wrench,
  Gift,
  CalendarClock,
  KeyRound,
  Sun,
  Moon,
  Car,
} from 'lucide-react';
import { useFetchClient } from '../../../hook/useFetchClient';
import { SERVICE_HISTORY_API_ENDPOINTS } from '../../../constants/customer/serviceHistoryApiEndpoint';
import { APPOINTMENT_API_ENDPOINTS } from '../../../constants/customer/appointmentsEndpoints';
import { PROFILE_API_ENDPOINTS } from '../../../constants/customer/profileApiEndpoint';
import { validateChangePasswordForm } from '../../../validate/ChangePasswordSchema';

interface RecentActivityOrder {
  id: number;
  actual_finish_time: string | null;
  vehicle?: { model?: { model_name: string } | null } | null;
  tasks: Array<{
    quotations: Array<{
      total_amount: number | string;
      items: Array<{
        service_catalog?: { service_name: string } | null;
        sparePart?: { name: string } | null;
        custom_item_name?: string | null;
      }>;
    }>;
  }>;
}

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
}

interface DashboardTabProps {
  avatarUrl: string;
  formData: FormData;
  accountStatus?: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'BANNED';
  membershipTier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  loyaltyPoints?: number;
  joinedAt?: string;
  isEditing: boolean;
  isSubmitting: boolean;
  onAvatarUpdate: () => void;
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onEditToggle: (val: boolean) => void;
  hasPendingAvatar?: boolean;
  onAvatarSave?: () => void;
  onAvatarCancel?: () => void;
  onViewAllHistory?: () => void;
  onShowToast?: (message: string) => void;
}

function CountUpNumber({ value, suffix = '', formatter }: { value: number; suffix?: string; formatter?: (n: number) => string }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => (formatter ? formatter(v) : Math.round(v).toLocaleString('vi-VN')));
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 1.2, ease: 'easeOut' });
    const unsubscribe = rounded.on('change', setDisplay);
    return () => {
      controls.stop();
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{display}{suffix}</>;
}

export default function DashboardTab({
  avatarUrl,
  formData,
  accountStatus,
  membershipTier,
  loyaltyPoints,
  joinedAt,
  isEditing,
  isSubmitting,
  onAvatarUpdate,
  onInputChange,
  onSave,
  onEditToggle,
  hasPendingAvatar = false,
  onAvatarSave,
  onAvatarCancel,
  onViewAllHistory,
  onShowToast,
}: DashboardTabProps) {
  const { t } = useTranslation();
  const { fetchPrivate } = useFetchClient();
  const [allOrders, setAllOrders] = useState<RecentActivityOrder[]>([]);
  const [upcomingAppointmentCount, setUpcomingAppointmentCount] = useState<number | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [passwordFields, setPasswordFields] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const recentOrders = allOrders.slice(0, 3);

  const closeChangePasswordModal = () => {
    setIsChangePasswordOpen(false);
    setPasswordFields({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    setPasswordErrors({});
  };

  const handlePasswordChangeSubmit = async () => {
    setPasswordErrors({});
    const validationErrors = validateChangePasswordForm(passwordFields);
    if (Object.keys(validationErrors).length > 0) {
      setPasswordErrors(validationErrors);
      return;
    }

    setIsPasswordSubmitting(true);
    try {
      await fetchPrivate(PROFILE_API_ENDPOINTS.CHANGE_PASSWORD, 'PUT', passwordFields);
      onShowToast?.(t('settings.changePasswordSuccess', 'Đổi mật khẩu thành công!'));
      closeChangePasswordModal();
    } catch (err: any) {
      setPasswordErrors({
        currentPassword: err.message || t('settings.changePasswordFail', 'Thay đổi mật khẩu thất bại. Vui lòng kiểm tra lại.'),
      });
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  useEffect(() => {
    const loadRecentActivity = async () => {
      try {
        const response = await fetchPrivate<RecentActivityOrder[]>(
          SERVICE_HISTORY_API_ENDPOINTS.GET_SERVICE_HISTORY,
        );
        setAllOrders(response?.data ?? []);
      } catch (error) {
        console.error('Không tải được hoạt động gần đây:', error);
      }
    };
    const loadUpcomingAppointments = async () => {
      try {
        const response = await fetchPrivate<Array<{ status: string }>>(
          APPOINTMENT_API_ENDPOINTS.GET_APPOINTMENTS,
        );
        const upcoming = (response?.data ?? []).filter(
          (appt: { status: string }) => appt.status === 'PENDING' || appt.status === 'CONFIRMED',
        );
        setUpcomingAppointmentCount(upcoming.length);
      } catch (error) {
        console.error('Không tải được lịch hẹn sắp tới:', error);
      }
    };
    void loadRecentActivity();
    void loadUpcomingAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getOrderServiceName = (order: RecentActivityOrder) => {
    const firstItem = order.tasks.flatMap((t) => t.quotations).flatMap((q) => q.items)[0];
    return (
      firstItem?.service_catalog?.service_name ||
      firstItem?.sparePart?.name ||
      firstItem?.custom_item_name ||
      order.vehicle?.model?.model_name ||
      'Dịch vụ'
    );
  };

  const getOrderTotal = (order: RecentActivityOrder) =>
    order.tasks
      .flatMap((t) => t.quotations)
      .reduce((sum, q) => sum + Number(q.total_amount), 0);

  const totalSpent = allOrders.reduce((sum, order) => sum + getOrderTotal(order), 0);
  const totalServiceCount = allOrders.length;

  const membershipTierMeta = {
    BRONZE: { label: t('profile.tier_BRONZE', 'Thành viên Đồng'), className: 'bg-orange-50 text-orange-700' },
    SILVER: { label: t('profile.tier_SILVER', 'Thành viên Bạc'), className: 'bg-slate-100 text-slate-600' },
    GOLD: { label: t('profile.tier_GOLD', 'Thành viên Vàng'), className: 'bg-[#FEF3C7] text-[#D97706]' },
    PLATINUM: { label: t('profile.tier_PLATINUM', 'Thành viên Bạch Kim'), className: 'bg-indigo-50 text-indigo-700' },
  }[membershipTier ?? 'BRONZE'];

  const TIER_THRESHOLDS: Record<'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM', number> = {
    BRONZE: 0,
    SILVER: 300,
    GOLD: 700,
    PLATINUM: 1000,
  };
  const TIER_ORDER: Array<'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'> = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
  const currentTier = membershipTier ?? 'BRONZE';
  const currentTierIndex = TIER_ORDER.indexOf(currentTier);
  const nextTier = TIER_ORDER[currentTierIndex + 1];
  const currentPoints = loyaltyPoints ?? 0;
  const nextTierThreshold = nextTier ? TIER_THRESHOLDS[nextTier] : TIER_THRESHOLDS[currentTier];
  const currentTierThreshold = TIER_THRESHOLDS[currentTier];
  const tierProgressPercent = nextTier
    ? Math.min(100, Math.max(0, ((currentPoints - currentTierThreshold) / (nextTierThreshold - currentTierThreshold)) * 100))
    : 100;

  const accountStatusMeta = {
    ACTIVE: { label: t('profile.status_ACTIVE', 'Hoạt động'), className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    PENDING: { label: t('profile.status_PENDING', 'Chờ xác minh'), className: 'bg-amber-50 text-amber-700 border-amber-100' },
    INACTIVE: { label: t('profile.status_INACTIVE', 'Ngừng hoạt động'), className: 'bg-gray-100 text-gray-600 border-gray-200' },
    BANNED: { label: t('profile.status_BANNED', 'Bị khóa'), className: 'bg-red-50 text-red-700 border-red-100' },
  }[accountStatus ?? 'PENDING'];

  const inputClass = (editing: boolean, isPhone = false) =>
    `w-full px-3 py-2.5 text-sm rounded-lg font-medium transition-all ${isPhone
      ? 'bg-slate-50 border border-slate-200 text-brand-blue/50 cursor-not-allowed focus:outline-none'
      : editing
        ? 'bg-white border-2 border-brand-blue text-brand-blue focus:outline-none shadow-xs'
        : 'bg-white border border-gray-200/80 text-brand-blue/90 cursor-default'
    }`;

  return (
    <>
      {/* Top Profile Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4, boxShadow: '0 16px 32px rgba(10,35,87,0.10)' }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
        className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
      >
        <div className="flex items-center gap-5">
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-brand-blue/5 shadow-inner bg-gray-100">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="User Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-200 animate-pulse" />
                )}
              </div>
              <button
                onClick={onAvatarUpdate}
                disabled={isSubmitting}
                className="absolute -bottom-1 -right-1 bg-brand-blue text-white p-1.5 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                title={t('profile.changeAvatar', 'Thay đổi ảnh đại diện')}
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {hasPendingAvatar && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1 bg-slate-50/90 backdrop-blur-xs p-0.5 rounded-lg border border-slate-100 shadow-xs"
              >
                <button
                  type="button"
                  onClick={onAvatarCancel}
                  disabled={isSubmitting}
                  className="px-1.5 py-0.5 rounded hover:bg-slate-200/60 text-slate-500 hover:text-slate-700 transition-all text-[9px] font-bold flex items-center gap-0.5 disabled:opacity-50 cursor-pointer"
                  title={t('profile.cancelPhoto', 'Hủy chọn ảnh')}
                >
                  <X className="w-2.5 h-2.5" /> {t('common.cancel', 'Hủy')}
                </button>
                <button
                  type="button"
                  onClick={onAvatarSave}
                  disabled={isSubmitting}
                  className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-all text-[9px] font-bold flex items-center gap-0.5 disabled:opacity-50 cursor-pointer shadow-xs"
                  title={t('profile.saveNewPhoto', 'Lưu ảnh đại diện mới')}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-2.5 h-2.5" /> {t('common.save', 'Lưu')}
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-display text-brand-blue tracking-tight">
              {formData.fullName || (
                <span className="inline-block w-32 h-6 bg-gray-200 animate-pulse rounded" />
              )}
            </h2>
            <div className="flex flex-wrap items-center gap-3 pt-0.5">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-xs ${membershipTierMeta.className}`}>
                <Award className="w-3.5 h-3.5 fill-current" />
                {membershipTierMeta.label}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="w-full md:w-auto flex flex-row gap-2">
          <button
            type="button"
            onClick={() => setIsChangePasswordOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-bold text-[11px] transition-all shadow-xs hover:opacity-90"
            style={{ backgroundColor: '#00285E' }}
          >
            <KeyRound className="w-3 h-3" />
            {t('profile.changePassword', 'Đổi mật khẩu')}
          </button>
          <button
            type="button"
            onClick={() => setIsDarkMode((prev) => !prev)}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-bold text-[11px] transition-all shadow-xs hover:opacity-90"
            style={{ backgroundColor: '#00285E' }}
          >
            {isDarkMode ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
            {isDarkMode ? t('profile.lightMode', 'Chế độ sáng') : t('profile.darkMode', 'Chế độ tối')}
          </button>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm grid grid-cols-2 lg:grid-cols-4 divide-y divide-gray-100 lg:divide-y-0 lg:divide-x"
      >
        {[
          {
            icon: Wallet,
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            label: t('profile.stat_totalSpent', 'Tổng chi tiêu'),
            value: totalSpent,
            suffix: ' VND',
          },
          {
            icon: Wrench,
            iconBg: 'bg-blue-50',
            iconColor: 'text-brand-blue',
            label: t('profile.stat_serviceCount', 'Số lần dịch vụ'),
            value: totalServiceCount,
            suffix: '',
          },
          {
            icon: Gift,
            iconBg: 'bg-[#FEF3C7]',
            iconColor: 'text-[#D97706]',
            label: t('profile.stat_loyaltyPoints', 'Điểm thưởng'),
            value: loyaltyPoints ?? 0,
            suffix: ' pts',
          },
          {
            icon: CalendarClock,
            iconBg: 'bg-indigo-50',
            iconColor: 'text-indigo-600',
            label: t('profile.stat_upcomingAppointments', 'Lịch hẹn sắp tới'),
            value: upcomingAppointmentCount ?? 0,
            suffix: '',
          },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 + idx * 0.1 }}
            className="p-5 flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center ${stat.iconColor} shrink-0`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-gray-500">{stat.label}</p>
              <p className="text-sm font-extrabold text-brand-blue truncate">
                <CountUpNumber value={stat.value} suffix={stat.suffix} />
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Middle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left Column */}
        <div className="h-full">
          {/* Personal Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, boxShadow: '0 16px 32px rgba(10,35,87,0.10)' }}
            transition={{ duration: 0.6, delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
            className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm h-full flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2 text-brand-blue font-bold text-base">
                  <User className="w-4 h-4 text-brand-blue" />
                  <span>{t('profile.personalInfo', 'Thông tin cá nhân')}</span>
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditToggle(false)}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X className="w-3.5 h-3.5" /> {t('common.cancel', 'Hủy')}
                    </button>
                    <button
                      onClick={onSave}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition-all shadow-sm flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('settings.saving', 'Đang lưu...')}
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" /> {t('common.save', 'Lưu')}
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onEditToggle(true)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-brand-blue hover:border-brand-blue hover:bg-brand-blue/5 text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> {t('common.edit', 'Chỉnh sửa')}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                {[
                  { label: t('profile.fullName', 'Họ và Tên'), name: 'fullName', type: 'text' },
                  { label: t('profile.phone', 'Số điện thoại'), name: 'phone', type: 'text' },
                ].map((field) => (
                  <div key={field.name} className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 block">{field.label}</label>
                    <input
                      type={field.type}
                      name={field.name}
                      value={formData[field.name as keyof FormData]}
                      onChange={onInputChange}
                      disabled={field.name === 'phone' || !isEditing || isSubmitting}
                      readOnly={field.name === 'phone'}
                      className={inputClass(isEditing, field.name === 'phone')}
                    />
                  </div>
                ))}

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 block">
                    {t('profile.accountStatus', 'Trạng thái tài khoản')}
                  </label>
                  <div className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${accountStatusMeta.className}`}>
                      {accountStatusMeta.label}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 block">
                    {t('profile.joined', 'Tham gia hệ thống')}
                  </label>
                  <div className="w-full px-3 py-2.5 text-sm rounded-lg font-medium bg-slate-50 border border-slate-200 text-brand-blue/50 cursor-not-allowed flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    {joinedAt
                      ? new Date(joinedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : '—'}
                  </div>
                </div>
              </div>
            </div>

            {isEditing && (
              <p className="text-[11px] text-brand-orange mt-6 italic">
                {t('profile.editNotice', '* Bạn có thể thay đổi các thông tin trên và nhấn nút Lưu để áp dụng.')}
              </p>
            )}
          </motion.div>
        </div>

        {/* Right Column (Recent Activity) */}
        <div className="h-full">
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm h-full flex flex-col"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-bold text-brand-blue tracking-wide uppercase">
                {t('profile.recentActivity', 'Hoạt động gần đây')}
              </h3>
              <button
                onClick={onViewAllHistory}
                className="text-[11px] font-bold text-brand-blue underline hover:text-brand-orange transition-colors"
              >
                {t('profile.viewAll', 'Xem tất cả')}
              </button>
            </div>

            <div className="border border-gray-100 shadow-inner rounded-xl divide-y divide-gray-100 overflow-hidden flex-1 flex flex-col">
              {recentOrders.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-4 text-center text-xs text-gray-400">
                  {t('profile.noRecentActivity', 'Chưa có hoạt động nào.')}
                </div>
              ) : (
                recentOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={onViewAllHistory}
                    className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors cursor-pointer group"
                    title={t('profile.historyTooltip', 'Xem chi tiết trong Lịch sử dịch vụ')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-brand-blue shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-brand-blue group-hover:text-brand-orange transition-colors">
                          {getOrderServiceName(order)}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {order.actual_finish_time
                            ? new Date(order.actual_finish_time).toLocaleDateString('vi-VN')
                            : '—'}{' '}
                          • {t('history.status_HoanThanh', 'Hoàn thành')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-brand-blue">
                        {Number(getOrderTotal(order)).toLocaleString('vi-VN')} VND
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-blue group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Progress Tier */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35 }}
        className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm"
      >
        <div className="flex justify-between items-center mb-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-xs ${membershipTierMeta.className}`}>
            <Award className="w-3.5 h-3.5 fill-current" />
            {t('profile.tierProgressLabel', 'Tiến trình hạng: {{tier}}', { tier: membershipTierMeta.label })}
          </span>
          <span className="text-base font-extrabold" style={{ color: '#00285E' }}>
            {currentPoints.toLocaleString('vi-VN')}{nextTier ? ` / ${nextTierThreshold.toLocaleString('vi-VN')}` : ''} pts
          </span>
        </div>

        <div className="relative pt-6 pb-2">
          <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden relative shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${tierProgressPercent}%` }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
              className="h-full rounded-full relative overflow-hidden"
              style={{ background: 'linear-gradient(90deg, #00285E 0%, #1E4D8C 50%, #F9A11B 100%)' }}
            >
              {/* Shimmer sweep */}
              <motion.div
                className="absolute inset-y-0 w-1/3"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)' }}
                animate={{ x: ['-100%', '300%'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear', repeatDelay: 0.4 }}
              />
            </motion.div>
          </div>

          {/* Chasing car icon */}
          <motion.div
            initial={{ left: '0%' }}
            animate={{ left: `${tierProgressPercent}%` }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            className="absolute top-0 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
              className="w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
              style={{ backgroundColor: '#F9A11B' }}
            >
              <Car className="w-3.5 h-3.5 text-white" />
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Change Password Modal */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-[2px]">
          <div className="bg-white shadow-2xl border border-slate-200 rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-extrabold text-brand-blue">
                {t('profile.changePassword', 'Đổi mật khẩu')}
              </h3>
              <button
                type="button"
                onClick={closeChangePasswordModal}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 block">
                  {t('profile.currentPassword', 'Mật khẩu hiện tại')}
                </label>
                <input
                  type="password"
                  value={passwordFields.currentPassword}
                  onChange={(e) => setPasswordFields((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  className={`w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:border-brand-blue ${passwordErrors.currentPassword ? 'border-red-400' : 'border-gray-200'}`}
                />
                {passwordErrors.currentPassword && (
                  <p className="text-[11px] text-red-500 font-medium">{passwordErrors.currentPassword}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 block">
                  {t('profile.newPassword', 'Mật khẩu mới')}
                </label>
                <input
                  type="password"
                  value={passwordFields.newPassword}
                  onChange={(e) => setPasswordFields((prev) => ({ ...prev, newPassword: e.target.value }))}
                  className={`w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:border-brand-blue ${passwordErrors.newPassword ? 'border-red-400' : 'border-gray-200'}`}
                />
                {passwordErrors.newPassword && (
                  <p className="text-[11px] text-red-500 font-medium">{passwordErrors.newPassword}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 block">
                  {t('profile.confirmNewPassword', 'Xác nhận mật khẩu mới')}
                </label>
                <input
                  type="password"
                  value={passwordFields.confirmNewPassword}
                  onChange={(e) => setPasswordFields((prev) => ({ ...prev, confirmNewPassword: e.target.value }))}
                  className={`w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:border-brand-blue ${passwordErrors.confirmNewPassword ? 'border-red-400' : 'border-gray-200'}`}
                />
                {passwordErrors.confirmNewPassword && (
                  <p className="text-[11px] text-red-500 font-medium">{passwordErrors.confirmNewPassword}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={closeChangePasswordModal}
                disabled={isPasswordSubmitting}
                className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs font-bold transition-all disabled:opacity-50"
              >
                {t('common.cancel', 'Hủy')}
              </button>
              <button
                type="button"
                onClick={() => void handlePasswordChangeSubmit()}
                disabled={isPasswordSubmitting}
                className="flex-1 py-2.5 rounded-lg bg-brand-blue text-white hover:bg-brand-blue/90 text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isPasswordSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {t('common.save', 'Lưu')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
