import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Shield, Bell, Sliders, Info, Loader2, Key, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { validateChangePasswordForm } from '../../../validate/ChangePasswordSchema';
import { useFetchClient } from '../../../hook/useFetchClient';
import { PROFILE_API_ENDPOINTS } from '../../../constants/customer/profileApiEndpoint';

interface SettingsData {
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
}

interface SettingsTabProps {
  settingsData: SettingsData;
  avatarUrl: string;
  isSubmitting: boolean;       // ✅ thêm prop còn thiếu
  onAvatarUpdate?: () => void;
  onSettingChange: (field: string, value: any) => void;
  onSave: () => void;          // ✅ thêm prop còn thiếu
  onChangePassword?: (data: any) => Promise<void>;
}

function ToggleSwitch({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-11 h-6 rounded-full transition-colors relative px-0.5 ${active ? 'bg-brand-orange' : 'bg-gray-200'
        }`}
    >
      <div
        className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${active ? 'translate-x-5' : 'translate-x-0'
          }`}
      />
    </button>
  );
}

export default function SettingsTab({
  settingsData,
  avatarUrl,
  isSubmitting,
  onAvatarUpdate: _onAvatarUpdate,
  onSettingChange,
  onSave,   // ✅ nhận prop thay vì dùng handleSave nội bộ
  onChangePassword: _onChangePassword,
}: SettingsTabProps) {
  const { t } = useTranslation();
  const { fetchPrivate } = useFetchClient();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordFields, setPasswordFields] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  const handlePasswordChangeSubmit = async () => {
    setPasswordErrors({});
    const validationErrors = validateChangePasswordForm(passwordFields);
    if (Object.keys(validationErrors).length > 0) {
      setPasswordErrors(validationErrors);
      return;
    }

    setIsPasswordSubmitting(true);
    try {
      await fetchPrivate(
        PROFILE_API_ENDPOINTS.CHANGE_PASSWORD,
        'PUT',
        passwordFields
      );
      alert(t('settings.changePasswordSuccess', 'Đổi mật khẩu thành công!'));
      setIsChangingPassword(false);
      setPasswordFields({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err: any) {
      setPasswordErrors({ currentPassword: err.message || t('settings.changePasswordFail', 'Thay đổi mật khẩu thất bại. Vui lòng kiểm tra lại.') });
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-8 text-left"
    >
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-display font-bold text-brand-blue tracking-tight">
          {t('settings.title', 'Cài đặt hệ thống')}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column */}
        <div className="sm:col-span-1 lg:col-span-7 flex flex-col gap-6">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-brand-blue">{t('settings.profileCard', 'Hồ sơ cá nhân')}</h3>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="flex flex-col items-center gap-2 shrink-0 sm:w-28">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-gray-200 shadow-xs bg-gray-50">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-200 animate-pulse" />
                  )}
                </div>
                <span className="text-[11px] font-bold text-gray-400">{t('settings.avatar', 'Ảnh đại diện')}</span>
              </div>

              <div className="flex-1 w-full">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">{t('settings.fullNameLabel', 'Họ và tên')}</label>
                    <input
                      type="text"
                      value={settingsData.fullName}
                      readOnly
                      disabled
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-xs text-brand-blue/50 bg-slate-50 cursor-not-allowed focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">{t('settings.phoneLabel', 'Số điện thoại')}</label>
                    <input
                      type="text"
                      value={settingsData.phone}
                      readOnly
                      disabled
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-xs text-brand-blue/50 bg-slate-50 cursor-not-allowed focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-brand-blue">{t('settings.security', 'Bảo mật')}</h3>
            </div>

            <AnimatePresence mode="wait">
              {!isChangingPassword ? (
                <motion.div
                  key="password-cta"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50/50 border border-slate-100"
                >
                  <div className="flex flex-col gap-1 text-left">
                    <span className="font-bold text-xs text-brand-blue">{t('settings.changePasswordTitle', 'Đổi mật khẩu tài khoản')}</span>
                    <span className="text-[11px] text-gray-500 font-medium">
                      {t('settings.changePasswordDesc', 'Thay đổi mật khẩu thường xuyên giúp tăng cường độ bảo mật cho thông tin cá nhân của bạn.')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(true);
                      setPasswordErrors({});
                    }}
                    className="px-4 py-2 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold text-xs rounded-xl transition-all shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5" />
                    {t('settings.changePasswordBtn', 'Đổi mật khẩu')}
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="password-form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1">{t('settings.currentPasswordLabel', 'Mật khẩu hiện tại')}</label>
                      <div className="relative">
                        <input
                          type="password"
                          placeholder="********"
                          value={passwordFields.currentPassword}
                          onChange={(e) => setPasswordFields(prev => ({ ...prev, currentPassword: e.target.value }))}
                          disabled={isPasswordSubmitting}
                          className={`w-full px-3 py-2 rounded-xl border font-bold text-xs text-brand-blue focus:outline-none disabled:opacity-60 ${passwordErrors.currentPassword ? 'border-red-500 focus:border-red-500 animate-shake' : 'border-gray-200 focus:border-brand-blue'
                            }`}
                        />
                      </div>
                      {passwordErrors.currentPassword && (
                        <p className="text-red-500 text-[10px] font-bold mt-1 text-left">{passwordErrors.currentPassword}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1">{t('settings.newPasswordLabel', 'Mật khẩu mới')}</label>
                      <div className="relative">
                        <input
                          type="password"
                          placeholder="********"
                          value={passwordFields.newPassword}
                          onChange={(e) => setPasswordFields(prev => ({ ...prev, newPassword: e.target.value }))}
                          disabled={isPasswordSubmitting}
                          className={`w-full px-3 py-2 rounded-xl border font-bold text-xs text-brand-blue focus:outline-none disabled:opacity-60 ${passwordErrors.newPassword ? 'border-red-500 focus:border-red-500 animate-shake' : 'border-gray-200 focus:border-brand-blue'
                            }`}
                        />
                      </div>
                      {passwordErrors.newPassword && (
                        <p className="text-red-500 text-[10px] font-bold mt-1 text-left">{passwordErrors.newPassword}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1">{t('settings.confirmPasswordLabel', 'Xác nhận mật khẩu mới')}</label>
                      <div className="relative">
                        <input
                          type="password"
                          placeholder="********"
                          value={passwordFields.confirmNewPassword}
                          onChange={(e) => setPasswordFields(prev => ({ ...prev, confirmNewPassword: e.target.value }))}
                          disabled={isPasswordSubmitting}
                          className={`w-full px-3 py-2 rounded-xl border font-bold text-xs text-brand-blue focus:outline-none disabled:opacity-60 ${passwordErrors.confirmNewPassword ? 'border-red-500 focus:border-red-500 animate-shake' : 'border-gray-200 focus:border-brand-blue'
                            }`}
                        />
                      </div>
                      {passwordErrors.confirmNewPassword && (
                        <p className="text-red-500 text-[10px] font-bold mt-1 text-left">{passwordErrors.confirmNewPassword}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-50">
                    <button
                      type="button"
                      disabled={isPasswordSubmitting}
                      onClick={() => {
                        setIsChangingPassword(false);
                        setPasswordFields({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
                        setPasswordErrors({});
                      }}
                      className="px-4 py-2 font-bold text-xs text-gray-500 hover:bg-slate-50 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      {t('common.cancel', 'Hủy')}
                    </button>
                    <button
                      type="button"
                      disabled={isPasswordSubmitting}
                      onClick={handlePasswordChangeSubmit}
                      className="px-5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-brand-blue font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                    >
                      {isPasswordSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          {t('common.processing', 'Đang xử lý...')}
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          {t('settings.changePasswordBtn', 'Đổi mật khẩu')}
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Column */}
        <div className="sm:col-span-1 lg:col-span-5 flex flex-col gap-6">
          {/* Notifications Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-brand-blue">{t('settings.notifications', 'Thông báo')}</h3>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              {t('settings.notificationsDesc', 'Quản lý cách bạn nhận lời nhắc bảo trì và cập nhật lịch hẹn.')}
            </p>
            <div className="flex flex-col gap-4 pt-1">
              {[
                { label: 'SMS', field: 'notifySMS', value: settingsData.notifySMS },
                { label: t('settings.notifyPush', 'Thông báo đẩy'), field: 'notifyPush', value: settingsData.notifyPush },
              ].map((item) => (
                <div key={item.field} className="flex items-center justify-between">
                  <span className="font-bold text-xs text-brand-blue">{item.label}</span>
                  <ToggleSwitch
                    active={item.value}
                    onToggle={() => onSettingChange(item.field, !item.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Customization Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-brand-blue">{t('settings.customization', 'Tùy chỉnh')}</h3>
            </div>
            <div className="flex flex-col gap-4 pt-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-brand-blue">{t('settings.darkMode', 'Chế độ tối')}</span>
                <ToggleSwitch
                  active={settingsData.darkMode}
                  onToggle={() => onSettingChange('darkMode', !settingsData.darkMode)}
                />
              </div>
            </div>
          </div>

          {/* App Info Card */}
          <div className="bg-blue-50/60 rounded-2xl border border-blue-100 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-brand-blue">
              <Info className="w-4 h-4 text-brand-blue" />
              <h4 className="font-bold text-xs">{t('settings.appInfo', 'Thông tin ứng dụng')}</h4>
            </div>
            <span className="text-[11px] text-gray-600 font-medium">{t('settings.appVersion', 'Phiên bản: 2.4.0 (Build 108)')}</span>
            <div className="flex items-center gap-4 pt-1">
              <a
                href="#terms"
                onClick={(e) => {
                  e.preventDefault();
                  alert(t('settings.termsAlert', 'Điều khoản sử dụng dịch vụ AGM Intelligent.'));
                }}
                className="font-bold text-[11px] text-brand-blue hover:underline"
              >
                {t('settings.terms', 'Điều khoản')}
              </a>
              <a
                href="#privacy"
                onClick={(e) => {
                  e.preventDefault();
                  alert(t('settings.privacyAlert', 'Chính sách bảo mật dữ liệu.'));
                }}
                className="font-bold text-[11px] text-brand-blue hover:underline"
              >
                {t('settings.privacy', 'Quyền riêng tư')}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 mt-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => alert(t('settings.cancelAlert', 'Đã hủy bỏ các thay đổi cài đặt chưa lưu.'))}
          className="px-6 py-2.5 font-bold text-xs text-brand-blue hover:bg-gray-50 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('common.cancel', 'Hủy')}
        </button>
        <button
          type="button"
          onClick={onSave}   // ✅ gọi prop thay vì handleSave nội bộ
          disabled={isSubmitting}
          className="px-8 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-brand-blue font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />  {/* ✅ Loader2 đã import */}
              {t('settings.saving', 'Đang lưu...')}
            </>
          ) : (
            t('settings.saveChanges', 'Lưu thay đổi')
          )}
        </button>
      </div>
    </motion.div>
  );
}