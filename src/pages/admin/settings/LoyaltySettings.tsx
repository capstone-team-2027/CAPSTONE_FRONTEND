import { useState, useEffect, useCallback } from 'react';
import { Award, Save, Loader2, AlertCircle } from 'lucide-react';
import { useFetchClient_v2 } from '../../../hook/useFetchClient';
import { LOYALTY_SETTINGS_API_ENDPOINTS } from '../../../constants/admin/loyaltySettingsApiEndpoint';

interface LoyaltySettingsProps {
  showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
}

interface GarageConfig {
  config_key: string;
  config_value: string;
}

const CONFIG_FIELDS = [
  { key: 'LOYALTY_TIER_SILVER_THRESHOLD', label: 'Ngưỡng chi tiêu lên hạng Bạc', suffix: 'VND', group: 'threshold' as const, isMoney: true },
  { key: 'LOYALTY_TIER_GOLD_THRESHOLD', label: 'Ngưỡng chi tiêu lên hạng Vàng', suffix: 'VND', group: 'threshold' as const, isMoney: true },
  { key: 'LOYALTY_TIER_PLATINUM_THRESHOLD', label: 'Ngưỡng chi tiêu lên hạng Kim Cương', suffix: 'VND', group: 'threshold' as const, isMoney: true },
  { key: 'LOYALTY_MULTIPLIER_BRONZE', label: 'Thành viên Đồng', suffix: 'lần', group: 'multiplier' as const, isMoney: false },
  { key: 'LOYALTY_MULTIPLIER_SILVER', label: 'Thành viên Bạc', suffix: 'lần', group: 'multiplier' as const, isMoney: false },
  { key: 'LOYALTY_MULTIPLIER_GOLD', label: 'Thành viên Vàng', suffix: 'lần', group: 'multiplier' as const, isMoney: false },
  { key: 'LOYALTY_MULTIPLIER_PLATINUM', label: 'Thành viên Kim Cương', suffix: 'lần', group: 'multiplier' as const, isMoney: false },
];

export default function LoyaltySettings({ showToast }: LoyaltySettingsProps) {
  const { fetchPublic, fetchPrivate } = useFetchClient_v2();

  const [values, setValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadConfigurations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchPublic(LOYALTY_SETTINGS_API_ENDPOINTS.LIST_CONFIGURATIONS);
      if (response && response.success) {
        const data = response.data as GarageConfig[];
        const map: Record<string, string> = {};
        CONFIG_FIELDS.forEach((field) => {
          const found = data.find((c) => c.config_key === field.key);
          if (found) map[field.key] = found.config_value;
        });
        setValues(map);
      }
    } catch (error) {
      showToast((error as Error)?.message || 'Lỗi khi tải cấu hình hạng thành viên', 'warning');
    } finally {
      setIsLoading(false);
    }
  }, [fetchPublic, showToast]);

  useEffect(() => {
    void loadConfigurations();
  }, [loadConfigurations]);

  const validateAll = (): boolean => {
    const errs: Record<string, string> = {};
    CONFIG_FIELDS.forEach((field) => {
      const value = values[field.key] ?? '';
      const num = Number(value);
      if (!value.trim() || Number.isNaN(num)) {
        errs[field.key] = 'Giá trị phải là số hợp lệ';
      } else if (num <= 0) {
        errs[field.key] = 'Giá trị phải lớn hơn 0';
      }
    });

    const silver = Number(values.LOYALTY_TIER_SILVER_THRESHOLD);
    const gold = Number(values.LOYALTY_TIER_GOLD_THRESHOLD);
    const platinum = Number(values.LOYALTY_TIER_PLATINUM_THRESHOLD);
    if (!errs.LOYALTY_TIER_GOLD_THRESHOLD && Number.isFinite(silver) && Number.isFinite(gold) && gold <= silver) {
      errs.LOYALTY_TIER_GOLD_THRESHOLD = 'Ngưỡng Vàng phải lớn hơn ngưỡng Bạc';
    }
    if (!errs.LOYALTY_TIER_PLATINUM_THRESHOLD && Number.isFinite(gold) && Number.isFinite(platinum) && platinum <= gold) {
      errs.LOYALTY_TIER_PLATINUM_THRESHOLD = 'Ngưỡng Kim Cương phải lớn hơn ngưỡng Vàng';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) {
      showToast('Vui lòng kiểm tra lại các trường thông tin.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      await Promise.all(
        CONFIG_FIELDS.map((field) =>
          fetchPrivate(
            LOYALTY_SETTINGS_API_ENDPOINTS.UPDATE_CONFIGURATION(field.key),
            'PUT',
            { config_value: values[field.key].trim() }
          )
        )
      );
      showToast('Đã cập nhật cấu hình hạng thành viên thành công.', 'success');
    } catch (error) {
      showToast((error as Error)?.message || 'Lỗi khi lưu cấu hình', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  const thresholdFields = CONFIG_FIELDS.filter((f) => f.group === 'threshold');
  const multiplierFields = CONFIG_FIELDS.filter((f) => f.group === 'multiplier');

  // values lưu số thuần (không dấu chấm) để gửi thẳng lên API — ô tiền chỉ FORMAT lúc HIỂN THỊ,
  // khi gõ thì strip hết ký tự không phải số trước khi lưu lại vào state.
  const renderField = (field: (typeof CONFIG_FIELDS)[number]) => {
    const rawValue = values[field.key] ?? '';
    const displayValue = field.isMoney && rawValue
      ? Number(rawValue).toLocaleString('vi-VN')
      : rawValue;

    return (
      <div key={field.key} className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {field.label}
        </label>
        <div className="relative rounded-xl shadow-xs">
          <input
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={(e) => {
              const raw = field.isMoney
                ? e.target.value.replace(/[^\d]/g, '')
                : e.target.value.replace(/[^\d.]/g, '');
              setValues((prev) => ({ ...prev, [field.key]: raw }));
              setErrors((prev) => ({ ...prev, [field.key]: '' }));
            }}
            className={`w-full bg-white border rounded-xl pl-4 pr-16 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800 ${
              errors[field.key] ? 'border-rose-500' : 'border-slate-200'
            }`}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
            <span className="text-slate-400 font-bold text-xs">{field.suffix}</span>
          </div>
        </div>
        {errors[field.key] && (
          <p className="text-xs text-rose-500 font-semibold flex items-center gap-1">
            <AlertCircle size={12} />
            {errors[field.key]}
          </p>
        )}
      </div>
    );
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
            <Award className="text-[#00285E]" size={16} />
          </span>
          Cấu hình hạng thành viên
        </h2>
        <p className="text-xs text-slate-400 mt-1.5 ml-[42px]">
          Thiết lập ngưỡng chi tiêu để lên hạng và hệ số nhân điểm thưởng theo từng hạng.
        </p>
      </div>

      <form onSubmit={handleSave} className="px-6 md:px-8 py-6 space-y-6">
        <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-1">Ngưỡng nâng hạng</h3>
          <p className="text-xs text-slate-400 mb-4">
            Dựa trên tổng chi tiêu tích lũy của khách hàng (không tính điểm thưởng đã đổi).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {thresholdFields.map(renderField)}
          </div>
        </div>

        <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-1">Hệ số nhân điểm thưởng</h3>
          <p className="text-xs text-slate-400 mb-4">
            Điểm thưởng = (tổng chi tiêu / 100.000đ) × hệ số theo hạng hiện tại của khách khi thanh toán.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {multiplierFields.map(renderField)}
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-6">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-[#00285E] hover:bg-[#062047] disabled:bg-slate-400 text-white rounded-xl text-sm font-semibold shadow-md shadow-[#00285E]/10 hover:shadow-lg transition-all active:scale-[0.98]"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
