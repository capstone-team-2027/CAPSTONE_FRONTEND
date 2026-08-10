import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, TrendingDown, Sparkles } from "lucide-react";

interface InventoryStockAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewSuggestions: () => void;
  outOfStockCount: number;
  lowStockCount: number;
}

export default function InventoryStockAlertModal({
  isOpen,
  onClose,
  onViewSuggestions,
  outOfStockCount,
  lowStockCount,
}: InventoryStockAlertModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-[2px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden"
          >
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-base font-extrabold text-[#00285E] mb-2">
                Cảnh báo tồn kho
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Hệ thống phát hiện một số phụ tùng trong kho đang thiếu hàng hoặc sắp hết, vui lòng kiểm tra và lên kế hoạch nhập thêm để tránh gián đoạn công việc.
              </p>

              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="rounded-xl bg-rose-50 p-3">
                  <div className="flex items-center gap-1.5 text-rose-600 mb-1">
                    <AlertTriangle size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Hết hàng</span>
                  </div>
                  <span className="text-2xl font-bold text-rose-700">{outOfStockCount}</span>
                </div>
                <div className="rounded-xl bg-amber-50 p-3">
                  <div className="flex items-center gap-1.5 text-amber-600 mb-1">
                    <TrendingDown size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Sắp hết</span>
                  </div>
                  <span className="text-2xl font-bold text-amber-700">{lowStockCount}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 p-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs font-bold transition-all"
              >
                Để sau
              </button>
              <button
                type="button"
                onClick={onViewSuggestions}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#00285E] text-white hover:brightness-110 text-xs font-bold transition-all"
              >
                <Sparkles size={13} />
                Xem đề xuất
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
