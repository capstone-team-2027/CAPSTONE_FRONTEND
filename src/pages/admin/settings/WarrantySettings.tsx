import { useState, useEffect } from 'react';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WarrantySettingsProps {
  showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
}

export default function WarrantySettings({ showToast }: WarrantySettingsProps) {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<any[]>([]);

  useEffect(() => {
    if (false) showToast('');
    const stored = localStorage.getItem('warranty_policies');
    if (stored) {
      try {
        setPolicies(JSON.parse(stored));
      } catch (e) {
        // Fallback
      }
    }
  }, []);

  const getWarrantyConditions = (policy: any) => {
    if (policy.warrantyType === 'NONE') return 'Không áp dụng bảo hành';
    const timeText = policy.durationMonths > 0 ? `${policy.durationMonths} tháng` : '';
    const kmText = policy.kmLimit > 0 ? `${policy.kmLimit.toLocaleString('vi-VN')} KM` : '';
    
    if (policy.warrantyType === 'BOTH') {
      return `${timeText} hoặc ${kmText} (tùy ĐK nào đến trước)`;
    }
    return timeText || kmText || '—';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      {/* List of Policies Overview */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="text-[#00285E]" size={20} />
            Danh sách chính sách đang áp dụng
          </h2>
          <span className="bg-blue-50 text-[#00285E] text-xs px-2.5 py-0.5 rounded-full font-bold border border-blue-100">
            {policies.length} chính sách
          </span>
        </div>

        <div className="space-y-4">
          {policies.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">Chưa có chính sách bảo hành nào được thiết lập.</p>
          ) : (
            policies.map((policy) => (
              <div
                key={policy.id}
                className="flex items-start justify-between p-5 bg-slate-50 border border-slate-100 rounded-2xl transition-all hover:bg-slate-100/40"
              >
                <div className="space-y-1 pr-6">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm md:text-base">{policy.name}</span>
                    <span className="bg-emerald-50 text-emerald-600 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-100">
                      {policy.warrantyType === 'NONE' ? 'Không bảo hành' : 'Bảo hành'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-semibold">
                    {policy.sparePart} • {policy.vehicleMake} {policy.vehicleModel}
                  </p>
                  <p className="text-xs text-slate-500 font-bold">
                    Điều kiện: {getWarrantyConditions(policy)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Advanced configuration link */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6 md:p-8 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Quản lý nâng cao</h2>
            <p className="text-slate-500 text-xs mt-1 leading-relaxed">
              Các tính năng thêm mới, chỉnh sửa chi tiết hãng xe, dòng xe, điều kiện bảo hành, và kiểm tra trùng lặp đã được di chuyển sang trang quản lý chuyên biệt.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/admin/warranty')}
          className="w-full mt-6 py-3 bg-[#00285E] hover:bg-[#062047] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#00285E]/10 flex items-center justify-center gap-1.5 active:scale-[0.98]"
        >
          <span>Mở trang Quản lý chính sách</span>
          <ArrowUpRight size={14} />
        </button>
      </div>
    </div>
  );
}
