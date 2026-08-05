import { AnimatePresence, motion } from 'framer-motion';
import { LogOut } from 'lucide-react';

interface LogoutConfirmModalProps {
    isOpen: boolean;
    onCancel: () => void;
    onConfirm: () => void;
    title?: string;
    message?: string;
}

export default function LogoutConfirmModal({
    isOpen,
    onCancel,
    onConfirm,
    title = 'Đăng xuất tài khoản',
    message = 'Bạn có chắc chắn muốn đăng xuất?',
}: LogoutConfirmModalProps) {
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
                            <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
                                <LogOut className="w-6 h-6 text-rose-500" />
                            </div>
                            <h3 className="text-base font-extrabold text-[#00285E] mb-2">
                                {title}
                            </h3>
                            <p className="text-sm text-slate-500">
                                {message}
                            </p>
                        </div>
                        <div className="flex gap-2 p-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs font-bold transition-all"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                className="flex-1 py-2.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold transition-all"
                            >
                                Đăng xuất
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
