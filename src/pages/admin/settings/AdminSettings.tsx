import { useOutletContext } from 'react-router-dom';
import GeneralSettings from './GeneralSettings';

export default function AdminSettings() {
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  }>();

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto font-sans">
      {/* HEADER SECTION */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2">Cài đặt hệ thống</h1>
        <p className="text-slate-500 text-sm">
          Quản lý cấu hình dịch vụ, chính sách bảo hành và thông tin chung của Garage.
        </p>
      </div>

      <div className="mt-4">
        <GeneralSettings showToast={showToast} />
      </div>
    </div>
  );
}
