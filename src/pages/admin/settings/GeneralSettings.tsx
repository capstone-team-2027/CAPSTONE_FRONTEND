import { useState, useEffect, useCallback } from 'react';
import { Store, Clock, Save, Loader2, Building2, Phone, MapPin, Mail } from 'lucide-react';
import { useFetchClient_v2 } from '../../../hook/useFetchClient';
import { LOYALTY_SETTINGS_API_ENDPOINTS } from '../../../constants/admin/loyaltySettingsApiEndpoint';

interface GeneralSettingsProps {
  showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
}

interface GarageConfig {
  config_key: string;
  config_value: string;
}

// Dùng chung bảng Garage_Configurations (key-value) — cùng API GET/PUT với LoyaltySettings.tsx.
const KEYS = {
  NAME: 'GARAGE_NAME',
  PHONE: 'GARAGE_PHONE',
  ADDRESS: 'GARAGE_ADDRESS',
  EMAIL: 'GARAGE_EMAIL',
  HOURS_WEEKDAY: 'GARAGE_HOURS_WEEKDAY',
  HOURS_SATURDAY: 'GARAGE_HOURS_SATURDAY',
  HOURS_SUNDAY: 'GARAGE_HOURS_SUNDAY',
};

const inputBaseClass =
  'w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-medium text-slate-800';

export default function GeneralSettings({ showToast }: GeneralSettingsProps) {
  const { fetchPublic, fetchPrivate } = useFetchClient_v2();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [garageName, setGarageName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [hours, setHours] = useState({ weekday: '', saturday: '', sunday: '' });

  const loadConfigurations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchPublic(LOYALTY_SETTINGS_API_ENDPOINTS.LIST_CONFIGURATIONS);
      if (response && response.success) {
        const data = response.data as GarageConfig[];
        const findValue = (key: string) => data.find((c) => c.config_key === key)?.config_value ?? '';
        setGarageName(findValue(KEYS.NAME));
        setPhone(findValue(KEYS.PHONE));
        setAddress(findValue(KEYS.ADDRESS));
        setEmail(findValue(KEYS.EMAIL));
        setHours({
          weekday: findValue(KEYS.HOURS_WEEKDAY),
          saturday: findValue(KEYS.HOURS_SATURDAY),
          sunday: findValue(KEYS.HOURS_SUNDAY),
        });
      }
    } catch (error) {
      showToast((error as Error)?.message || 'Lỗi khi tải thông tin Garage', 'warning');
    } finally {
      setIsLoading(false);
    }
  }, [fetchPublic, showToast]);

  useEffect(() => {
    void loadConfigurations();
  }, [loadConfigurations]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await Promise.all(
        Object.entries({
          [KEYS.NAME]: garageName,
          [KEYS.PHONE]: phone,
          [KEYS.ADDRESS]: address,
          [KEYS.EMAIL]: email,
          [KEYS.HOURS_WEEKDAY]: hours.weekday,
          [KEYS.HOURS_SATURDAY]: hours.saturday,
          [KEYS.HOURS_SUNDAY]: hours.sunday,
        }).map(([key, value]) =>
          fetchPrivate(LOYALTY_SETTINGS_API_ENDPOINTS.UPDATE_CONFIGURATION(key), 'PUT', {
            config_value: value.trim(),
          })
        )
      );
      showToast('Đã lưu thông tin cấu hình Garage thành công!', 'success');
    } catch (error) {
      showToast((error as Error)?.message || 'Lỗi khi lưu thông tin Garage', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-16 flex justify-center">
        <Loader2 size={24} className="animate-spin text-[#00285E]" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
      <div className="px-6 md:px-8 py-6 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-[#00285E]/10 flex items-center justify-center">
            <Store className="text-[#00285E]" size={16} />
          </span>
          Thông tin Garage
        </h2>
        <p className="text-xs text-slate-400 mt-1.5 ml-[42px]">
          Thông tin này hiển thị công khai cho khách hàng trên website và các kênh liên hệ.
        </p>
      </div>

      <form onSubmit={handleSave} className="px-6 md:px-8 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Tên Garage
            </label>
            <div className="relative">
              <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={garageName}
                onChange={(e) => setGarageName(e.target.value)}
                required
                className={inputBaseClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Số điện thoại
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className={inputBaseClass}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Địa chỉ
            </label>
            <div className="relative">
              <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className={inputBaseClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Email liên hệ
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputBaseClass}
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Clock className="text-[#00285E]" size={16} />
            Giờ hoạt động
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Thứ 2 - Thứ 6
              </label>
              <input
                type="text"
                value={hours.weekday}
                onChange={(e) => setHours({ ...hours, weekday: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-medium text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Thứ 7
              </label>
              <input
                type="text"
                value={hours.saturday}
                onChange={(e) => setHours({ ...hours, saturday: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-medium text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Chủ Nhật
              </label>
              <input
                type="text"
                value={hours.sunday}
                onChange={(e) => setHours({ ...hours, sunday: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-medium text-slate-800"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-6">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-[#00285E] hover:bg-[#062047] disabled:bg-slate-400 text-white rounded-xl text-sm font-semibold shadow-md shadow-[#00285E]/10 hover:shadow-lg transition-all active:scale-[0.98]"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{isSaving ? 'Đang lưu...' : 'Lưu thông tin'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
