import type { ChangeEvent } from 'react';
import { motion } from 'motion/react';
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
  Car,
  Calendar,
  Loader2,
} from 'lucide-react';
import { mockHistoryData } from './HistoryTab';

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
}

interface ContactFlowState {
  type: 'email' | 'phone' | null;
  value: string;
  otpCode: string;
  step: 'idle' | 'otpRequested';
  isSubmitting: boolean;
}

interface DashboardTabProps {
  avatarUrl: string;
  formData: FormData;
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
  contactFlow: ContactFlowState;
  onContactStart: (type: 'email' | 'phone') => void;
  onContactValueChange: (value: string) => void;
  onContactOtpChange: (value: string) => void;
  onContactSubmit: () => void;
  onContactVerify: () => void;
  onContactCancel: () => void;
}

export default function DashboardTab({
  avatarUrl,
  formData,
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
  contactFlow,
  onContactStart,
  onContactValueChange,
  onContactOtpChange,
  onContactSubmit,
  onContactVerify,
  onContactCancel,
}: DashboardTabProps) {
  const { t } = useTranslation();
  const inputClass = (editing: boolean, isPhone = false) =>
    `w-full px-3 py-2 text-sm rounded-lg font-medium transition-all ${isPhone
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
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF3C7] text-[#D97706] text-xs font-bold shadow-xs">
                <Award className="w-3.5 h-3.5 fill-current" />
                {t('profile.goldMember', 'Thành viên Vàng')}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                {t('profile.joined', 'Tham gia từ:')} 12/2022
              </span>
            </div>
          </div>
        </div>

        {/* Progress Tier */}
        <div className="w-full md:w-auto md:min-w-[320px] bg-[#F8FAFC] p-4 rounded-xl border border-gray-200/60 shadow-inner">
          <div className="flex justify-between items-center mb-2 font-medium text-xs text-brand-blue">
            <span>{t('profile.tierProgress', 'Tiến trình hạng: Bạch Kim')}</span>
            <span className="font-bold text-brand-blue">850 / 1000 pts</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '85%' }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-brand-blue rounded-full"
            />
          </div>
          <p className="text-[11px] text-gray-400 italic text-center">
            {t('profile.pointsRemaining', 'Còn 150 điểm để đạt hạng Bạch Kim')}
          </p>
        </div>
      </motion.div>

      {/* Middle Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column */}
        <div className="sm:col-span-1 lg:col-span-5 space-y-6">
          {/* Personal Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, boxShadow: '0 16px 32px rgba(10,35,87,0.10)' }}
            transition={{ duration: 0.6, delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-100">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 block">{t('profile.fullName', 'Họ và Tên')}</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={onInputChange}
                    disabled={!isEditing || isSubmitting}
                    className={inputClass(isEditing)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 block">{t('profile.phone', 'Số điện thoại')}</label>
                  <div className="w-full px-3 py-2 text-sm rounded-lg font-medium bg-slate-50 border border-slate-200 text-brand-blue/70">
                    {formData.phone || t('profile.notSet', 'Chưa thiết lập')}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {t('profile.contactVerification', 'Thông tin liên hệ')}
                </div>

                {[
                  { key: 'email' as const, label: t('profile.email', 'Email'), value: formData.email },
                  { key: 'phone' as const, label: t('profile.phone', 'Số điện thoại'), value: formData.phone },
                ].map((field) => {
                  const hasValue = Boolean(field.value?.trim());
                  const isActive = contactFlow.type === field.key;

                  return (
                    <div key={field.key} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-gray-500">{field.label}</div>
                          {hasValue ? (
                            <div className="text-sm font-semibold text-brand-blue">{field.value}</div>
                          ) : (
                            <div className="text-xs text-gray-400">{t('profile.notSet', 'Chưa thiết lập')}</div>
                          )}
                        </div>

                        {!hasValue && (
                          <button
                            type="button"
                            onClick={() => (isActive ? onContactCancel() : onContactStart(field.key))}
                            disabled={contactFlow.isSubmitting}
                            className="px-3 py-1.5 rounded-lg border border-brand-blue/20 text-brand-blue hover:bg-brand-blue/5 text-xs font-bold transition-all disabled:opacity-60"
                          >
                            {isActive ? t('common.cancel', 'Hủy') : t('profile.add', 'Thêm')}
                          </button>
                        )}
                      </div>

                      {isActive && (
                        <div className="mt-3 space-y-2">
                          {contactFlow.step === 'idle' ? (
                            <>
                              <input
                                type={field.key === 'email' ? 'email' : 'text'}
                                value={contactFlow.value}
                                onChange={(e) => onContactValueChange(e.target.value)}
                                disabled={contactFlow.isSubmitting}
                                placeholder={field.key === 'email' ? 'name@example.com' : '0987654321'}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-brand-blue focus:outline-none focus:border-brand-blue"
                              />
                              <button
                                type="button"
                                onClick={onContactSubmit}
                                disabled={contactFlow.isSubmitting}
                                className="w-full px-3 py-2 rounded-lg bg-brand-blue text-white text-xs font-bold hover:bg-brand-blue/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                              >
                                {contactFlow.isSubmitting ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : null}
                                {t('profile.sendOtp', 'Gửi mã OTP')}
                              </button>
                            </>
                          ) : (
                            <>
                              <input
                                type="text"
                                value={contactFlow.otpCode}
                                onChange={(e) => onContactOtpChange(e.target.value)}
                                disabled={contactFlow.isSubmitting}
                                placeholder="Nhập mã OTP"
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-brand-blue focus:outline-none focus:border-brand-blue"
                              />
                              <button
                                type="button"
                                onClick={onContactVerify}
                                disabled={contactFlow.isSubmitting}
                                className="w-full px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                              >
                                {contactFlow.isSubmitting ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : null}
                                {t('profile.verifyOtp', 'Xác nhận OTP')}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {isEditing && (
              <p className="text-[11px] text-brand-orange mt-4 italic">
                {t('profile.editNotice', '* Bạn có thể thay đổi các thông tin trên và nhấn nút Lưu để áp dụng.')}
              </p>
            )}
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
          >
            <div className="flex justify-between items-center mb-4">
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

            <div className="border border-gray-100 shadow-inner rounded-xl divide-y divide-gray-100 overflow-hidden">
              {mockHistoryData.map((item) => (
                <div
                  key={item.id}
                  onClick={onViewAllHistory}
                  className="p-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors cursor-pointer group"
                  title={t('profile.historyTooltip', 'Xem chi tiết trong Lịch sử sửa chữa')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-brand-blue shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-brand-blue group-hover:text-brand-orange transition-colors">
                        {item.serviceName}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {item.date} • {item.status}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-brand-blue">{item.price}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-blue group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Column (My Car Card) */}
        <div className="sm:col-span-1 lg:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, boxShadow: '0 16px 32px rgba(10,35,87,0.10)' }}
            transition={{ duration: 0.6, delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 text-brand-blue font-bold text-base mb-4">
                <Car className="w-4 h-4 text-brand-blue" />
                <span>{t('profile.myCar', 'Xe của tôi')}</span>
              </div>

              <div className="relative aspect-[16/9] rounded-xl overflow-hidden mb-4 bg-[#050B18] shadow-inner group">
                <img
                  src="/images/Porsche911.png"
                  alt="Porsche 911 Carrera"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 mix-blend-lighten"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050B18]/90 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 text-white">
                  <div className="font-display font-bold text-sm tracking-wide">Porsche 911 Carrera</div>
                  <div className="text-xs text-white/80 font-mono tracking-wider font-medium">
                    BSX: 51H-123.45
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex justify-between items-center p-2.5 bg-[#F8FAFC] rounded-lg text-xs font-medium">
                  <span className="text-gray-500">{t('profile.carStatus', 'Tình trạng')}</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    <Check className="w-3 h-3 stroke-[3]" /> {t('profile.good', 'Tốt')}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-[#F8FAFC] rounded-lg text-xs font-medium">
                  <span className="text-gray-500">{t('profile.nextMaintenance', 'Bảo dưỡng tiếp')}</span>
                  <span className="font-bold text-[#D97706]">2,450 km {t('profile.more', 'nữa')}</span>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => alert(t('profile.viewCarAlert', 'Chuyển đến trang quản lý thông số kỹ thuật xe chi tiết...'))}
              className="w-full py-2.5 bg-brand-blue text-white rounded-lg font-bold text-xs shadow-md hover:bg-brand-blue/90 transition-all text-center"
            >
              {t('profile.viewCarDetails', 'Xem chi tiết xe')}
            </motion.button>
          </motion.div>
        </div>
      </div>
    </>
  );
}