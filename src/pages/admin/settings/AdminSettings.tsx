import { ArrowLeft } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import GeneralSettings from './GeneralSettings';

export default function AdminSettings() {
  const navigate = useNavigate();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  }>();

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto font-sans">
      {/* HEADER SECTION */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(-1)}
          title="Quay lại"
          className="mt-0.5 w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-[#00285E] border border-[#00285E] text-white hover:bg-[#003C7D] hover:border-[#003C7D] active:scale-[0.97] transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2">Cài đặt hệ thống</h1>
          <p className="text-slate-500 text-sm">
            Quản lý cấu hình dịch vụ, chính sách bảo hành và thông tin chung của Garage.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <GeneralSettings showToast={showToast} />
      </div>
    </div>
  );
}
