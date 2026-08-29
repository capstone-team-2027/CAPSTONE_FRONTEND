import { useState } from 'react';
import { ArrowLeft, Store, Award } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import GeneralSettings from './GeneralSettings';
import LoyaltySettings from './LoyaltySettings';

export default function AdminSettings() {
  const navigate = useNavigate();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  }>();
  const [activeTab, setActiveTab] = useState<'general' | 'loyalty'>('general');

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
          <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2">Cấu hình hệ thống</h1>
          <p className="text-slate-500 text-sm">
            Quản lý thông tin chung của Garage và chính sách hạng thành viên.
          </p>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'general'
              ? 'bg-white text-[#00285E] shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Store size={16} />
          Thông tin chung
        </button>
        <button
          onClick={() => setActiveTab('loyalty')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'loyalty'
              ? 'bg-white text-[#00285E] shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Award size={16} />
          Hạng thành viên
        </button>
      </div>

      {activeTab === 'general' && <GeneralSettings showToast={showToast} />}
      {activeTab === 'loyalty' && <LoyaltySettings showToast={showToast} />}
    </div>
  );
}
