import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useOutletContext } from 'react-router-dom';
import {
  Store,
  Coins,
  ShieldCheck,
  Calculator,
  BellRing
} from 'lucide-react';

// Import subcomponents
import GeneralSettings from './GeneralSettings';
import PricingSettings from './PricingSettings';
import WarrantySettings from './WarrantySettings';
import CommissionSettings from './CommissionSettings';
import NotificationSettings from './NotificationSettings';

// Define the tabs
type TabType = 'general' | 'pricing' | 'warranty' | 'commission' | 'notifications';

interface TabItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export default function AdminSettings() {
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  }>();

  // Active Tab State
  const [activeTab, setActiveTab] = useState<TabType>('general');

  const tabs: TabItem[] = [
    { id: 'general', label: 'Cài đặt chung', icon: Store },
    { id: 'pricing', label: 'Quy tắc giá phụ tùng', icon: Coins },
    { id: 'warranty', label: 'Chính sách bảo hành', icon: ShieldCheck },
    { id: 'commission', label: 'Quy tắc hoa hồng', icon: Calculator },
    { id: 'notifications', label: 'Cấu hình thông báo', icon: BellRing }
  ];

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto font-sans">
      {/* HEADER SECTION */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2">Cài đặt hệ thống</h1>
        <p className="text-slate-500 text-sm">
          Quản lý cấu hình dịch vụ, chính sách bảo hành và thông tin chung của Garage.
        </p>
      </div>

      {/* HORIZONTAL TAB NAVIGATION */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8 overflow-x-auto scrollbar-none" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'border-[#00285E] text-[#00285E]'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-[#00285E]' : 'text-slate-400'} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB CONTENT WITH ANIMATION */}
      <div className="mt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'general' && <GeneralSettings showToast={showToast} />}
            {activeTab === 'pricing' && <PricingSettings showToast={showToast} />}
            {activeTab === 'warranty' && <WarrantySettings showToast={showToast} />}
            {activeTab === 'commission' && <CommissionSettings showToast={showToast} />}
            {activeTab === 'notifications' && <NotificationSettings showToast={showToast} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
