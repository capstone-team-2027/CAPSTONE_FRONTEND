import { motion } from 'motion/react';
import { User, Shield, Bell, Sliders, Info, Edit3 } from 'lucide-react';

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
  onAvatarUpdate: () => void;
  onSettingChange: (field: string, value: any) => void;
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
      className={`w-11 h-6 rounded-full transition-colors relative px-0.5 ${
        active ? 'bg-brand-orange' : 'bg-gray-200'
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
          active ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function SettingsTab({
  settingsData,
  avatarUrl,
  onAvatarUpdate,
  onSettingChange,
}: SettingsTabProps) {
  const handleSave = () => {
    if (settingsData.newPassword && settingsData.newPassword !== settingsData.confirmPassword) {
      alert('Mật khẩu mới và xác nhận mật khẩu không khớp!');
      return;
    }
    alert('Đã lưu thành công toàn bộ cấu hình cài đặt hệ thống!');
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
          Cài đặt hệ thống
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-brand-blue">Hồ sơ cá nhân</h3>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="flex flex-col items-center gap-2 shrink-0 sm:w-28">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-gray-200 shadow-xs bg-gray-50">
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={onAvatarUpdate}
                    className="absolute bottom-1 right-1 w-6 h-6 bg-brand-orange text-brand-blue rounded-full flex items-center justify-center shadow-xs hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </div>
                <span className="text-[11px] font-bold text-gray-400">Ảnh đại diện</span>
              </div>

              <div className="flex-1 flex flex-col gap-3 w-full">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Họ và tên</label>
                  <input
                    type="text"
                    value={settingsData.fullName}
                    onChange={(e) => onSettingChange('fullName', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold text-xs text-brand-blue focus:outline-none focus:border-brand-blue"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">Email</label>
                    <input
                      type="email"
                      value={settingsData.email}
                      onChange={(e) => onSettingChange('email', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold text-xs text-brand-blue focus:outline-none focus:border-brand-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">Số điện thoại</label>
                    <input
                      type="text"
                      value={settingsData.phone}
                      onChange={(e) => onSettingChange('phone', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold text-xs text-brand-blue focus:outline-none focus:border-brand-blue"
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
              <h3 className="text-sm font-bold text-brand-blue">Bảo mật</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Mật khẩu mới</label>
                <input
                  type="password"
                  placeholder="********"
                  value={settingsData.newPassword}
                  onChange={(e) => onSettingChange('newPassword', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-brand-blue focus:outline-none focus:border-brand-blue"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Xác nhận mật khẩu</label>
                <input
                  type="password"
                  placeholder="********"
                  value={settingsData.confirmPassword}
                  onChange={(e) => onSettingChange('confirmPassword', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-brand-blue focus:outline-none focus:border-brand-blue"
                />
              </div>
            </div>

            <div className="bg-blue-50/60 rounded-xl p-4 border border-blue-100 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-bold text-xs text-brand-blue">Xác thực 2 yếu tố (2FA)</span>
                <span className="text-[10px] text-gray-400 mt-0.5">
                  Tăng cường bảo mật cho tài khoản của bạn.
                </span>
              </div>
              <ToggleSwitch
                active={settingsData.enable2FA}
                onToggle={() => onSettingChange('enable2FA', !settingsData.enable2FA)}
              />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Notifications Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-brand-blue">Thông báo</h3>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Quản lý cách bạn nhận lời nhắc bảo trì và cập nhật lịch hẹn.
            </p>
            <div className="flex flex-col gap-4 pt-1">
              {[
                { label: 'Email', field: 'notifyEmail', value: settingsData.notifyEmail },
                { label: 'SMS', field: 'notifySMS', value: settingsData.notifySMS },
                { label: 'Push Notification', field: 'notifyPush', value: settingsData.notifyPush },
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
              <h3 className="text-sm font-bold text-brand-blue">Tùy chỉnh</h3>
            </div>
            <div className="flex flex-col gap-4 pt-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-brand-blue">Ngôn ngữ</span>
                <select
                  value={settingsData.language}
                  onChange={(e) => onSettingChange('language', e.target.value)}
                  className="bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5 font-bold text-xs text-brand-blue focus:outline-none focus:border-brand-blue cursor-pointer"
                >
                  <option value="Tiếng Việt">Tiếng Việt</option>
                  <option value="English">English</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-brand-blue">Chế độ tối</span>
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
              <h4 className="font-bold text-xs">Thông tin ứng dụng</h4>
            </div>
            <span className="text-[11px] text-gray-600 font-medium">Phiên bản: 2.4.0 (Build 108)</span>
            <div className="flex items-center gap-4 pt-1">
              <a
                href="#terms"
                onClick={(e) => { e.preventDefault(); alert('Điều khoản sử dụng dịch vụ AMG Intelligent.'); }}
                className="font-bold text-[11px] text-brand-blue hover:underline"
              >
                Điều khoản
              </a>
              <a
                href="#privacy"
                onClick={(e) => { e.preventDefault(); alert('Chính sách bảo mật dữ liệu.'); }}
                className="font-bold text-[11px] text-brand-blue hover:underline"
              >
                Quyền riêng tư
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 mt-2">
        <button
          type="button"
          onClick={() => alert('Đã hủy bỏ các thay đổi cài đặt chưa lưu.')}
          className="px-6 py-2.5 font-bold text-xs text-brand-blue hover:bg-gray-50 rounded-xl transition-all cursor-pointer"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-8 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-brand-blue font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
        >
          Lưu thay đổi
        </button>
      </div>
    </motion.div>
  );
}
