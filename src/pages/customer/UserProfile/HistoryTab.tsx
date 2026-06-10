import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Download, CheckCircle2, Eye, X, Calendar, User } from 'lucide-react';

export interface HistoryItem {
    id: string;
    date: string;
    vehicleName: string;
    vehiclePlate: string;
    serviceName: string;
    price: string;
    status: 'Hoàn thành' | 'Đang xử lý' | 'Đã hủy';
    technician: string;
    details: {
        laborCost: string;
        partsUsed: { name: string; qty: number; price: string }[];
        discount: string;
        vat: string;
    };
}

export const mockHistoryData: HistoryItem[] = [
    {
        id: 'HD-2023-8891',
        date: '15/10/2023',
        vehicleName: 'Porsche 911 Carrera',
        vehiclePlate: '29A-123.45',
        serviceName: 'Bảo Dưỡng Cấp Cao & Thay Nhớt',
        price: '2.450.000đ',
        status: 'Hoàn thành',
        technician: 'Lê Minh Hoàng',
        details: {
            laborCost: '600.000đ',
            partsUsed: [
                { name: 'Nhớt máy Porsche Mobil 1 0W-40', qty: 1, price: '1.500.000đ' },
                { name: 'Lọc nhớt chính hãng OEM', qty: 1, price: '350.000đ' }
            ],
            discount: '0đ',
            vat: '245.000đ'
        }
    },
    {
        id: 'HD-2023-7712',
        date: '02/09/2023',
        vehicleName: 'BMW M4 Competition',
        vehiclePlate: '30H-999.88',
        serviceName: 'Thay Má Phanh Ceramic Trước',
        price: '1.925.000đ',
        status: 'Hoàn thành',
        technician: 'Nguyễn Tuấn Hải',
        details: {
            laborCost: '500.000đ',
            partsUsed: [
                { name: 'Má phanh Ceramic Pro', qty: 1, price: '1.250.000đ' }
            ],
            discount: '0đ',
            vat: '175.000đ'
        }
    },
    {
        id: 'HD-2023-6610',
        date: '20/07/2023',
        vehicleName: 'Porsche 911 Carrera',
        vehiclePlate: '29A-123.45',
        serviceName: 'Kiểm Tra Tổng Quát & Vệ Sinh Điều Hòa',
        price: '1.200.000đ',
        status: 'Hoàn thành',
        technician: 'Trần Đại Nghĩa',
        details: {
            laborCost: '400.000đ',
            partsUsed: [
                { name: 'Dung dịch vệ sinh dàn lạnh Sonax', qty: 1, price: '350.000đ' },
                { name: 'Lọc gió điều hòa carbon', qty: 1, price: '450.000đ' }
            ],
            discount: '0đ',
            vat: '120.000đ'
        }
    }
];

export default function HistoryTab() {
    const { t } = useTranslation();
    const [selectedInvoice, setSelectedInvoice] = useState<HistoryItem | null>(null);
    const historyData = mockHistoryData;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 text-left"
        >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-display font-bold text-brand-blue tracking-tight">
                        {t('history.title', 'Lịch Sử Sửa Chữa')}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        {t('history.description', 'Xem lại lịch sử sửa chữa, bảo dưỡng và các hóa đơn dịch vụ của bạn.')}
                    </p>
                </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-gray-100 text-brand-blue font-bold text-[10px] uppercase tracking-wider">
                                <th className="p-4">{t('history.invoiceId', 'Mã Hóa Đơn')}</th>
                                <th className="p-4">{t('history.date', 'Ngày Thực Hiện')}</th>
                                <th className="p-4">{t('history.vehicle', 'Xe')}</th>
                                <th className="p-4">{t('history.service', 'Dịch Vụ')}</th>
                                <th className="p-4">{t('history.totalPrice', 'Tổng Tiền')}</th>
                                <th className="p-4">{t('history.status', 'Trạng Thái')}</th>
                                <th className="p-4 text-center">{t('common.actions', 'Thao Tác')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-slate-600 font-medium">
                            {historyData.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 font-mono font-bold text-brand-blue">{item.id}</td>
                                    <td className="p-4">{item.date}</td>
                                    <td className="p-4">
                                        <div>
                                            <div className="font-bold text-brand-blue">{item.vehicleName}</div>
                                            <div className="text-[10px] text-gray-400 mt-0.5">{item.vehiclePlate}</div>
                                        </div>
                                    </td>
                                    <td className="p-4 font-bold text-brand-blue">{item.serviceName}</td>
                                    <td className="p-4 font-mono font-bold text-brand-orange">{item.price}</td>
                                    <td className="p-4">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 font-bold text-[10px] border border-emerald-100">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            {t(`history.status_${item.status.replace(' ', '')}`, item.status)}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => setSelectedInvoice(item)}
                                                className="p-2 bg-blue-50 hover:bg-blue-100 text-brand-blue rounded-lg transition-colors"
                                                title={t('history.invoiceDetail', 'Chi tiết hóa đơn')}
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => alert(t('history.pdfAlert', { defaultValue: `Đang chuẩn bị tải PDF cho hóa đơn ${item.id}...`, id: item.id }))}
                                                className="p-2 border border-gray-200 hover:bg-slate-50 text-gray-500 rounded-lg transition-colors"
                                                title={t('history.downloadPdf', 'Tải hóa đơn PDF')}
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Invoice Detail Modal */}
            <AnimatePresence>
                {selectedInvoice && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedInvoice(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
                        />

                        {/* Modal Box */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 max-w-lg w-full relative z-10 text-left flex flex-col max-h-[85vh]"
                        >
                            {/* Header */}
                            <div className="p-6 bg-brand-blue text-white flex justify-between items-center relative shrink-0">
                                <div>
                                    <div className="text-[10px] uppercase font-bold tracking-widest text-white/50">
                                        {t('history.invoiceDetail', 'Chi tiết hóa đơn')}
                                    </div>
                                    <h3 className="text-lg font-bold font-display mt-0.5">{selectedInvoice.id}</h3>
                                </div>
                                <button
                                    onClick={() => setSelectedInvoice(null)}
                                    className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors border border-white/5"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 overflow-y-auto space-y-6 flex-grow text-xs text-slate-600">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="space-y-1">
                                        <div className="text-gray-400">{t('history.vehicleLabel', 'Phương tiện:')}</div>
                                        <div className="font-bold text-brand-blue">{selectedInvoice.vehicleName}</div>
                                        <div className="text-[10px] text-gray-400">{selectedInvoice.vehiclePlate}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-gray-400">{t('history.invoiceDate', 'Ngày lập hóa đơn:')}</div>
                                        <div className="font-bold text-brand-blue flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-brand-orange" />
                                            {selectedInvoice.date}
                                        </div>
                                    </div>
                                </div>

                                {/* Items Breakdown */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-brand-blue uppercase tracking-wider">
                                        {t('history.itemDetails', 'Chi tiết hạng mục')}
                                    </h4>
                                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                                        <div className="bg-slate-50/50 p-3 font-bold border-b border-slate-100 grid grid-cols-12 text-brand-blue">
                                            <span className="col-span-8">{t('history.item', 'Hạng mục')}</span>
                                            <span className="col-span-2 text-center">{t('history.qty', 'SL')}</span>
                                            <span className="col-span-2 text-right">{t('history.price', 'Đơn giá')}</span>
                                        </div>
                                        <div className="divide-y divide-slate-100">
                                            <div className="p-3 grid grid-cols-12 hover:bg-slate-50/30">
                                                <span className="col-span-8 font-bold text-brand-blue">{selectedInvoice.serviceName}</span>
                                                <span className="col-span-2 text-center">1</span>
                                                <span className="col-span-2 text-right">{selectedInvoice.details.laborCost}</span>
                                            </div>
                                            {selectedInvoice.details.partsUsed.map((part, i) => (
                                                <div key={i} className="p-3 grid grid-cols-12 hover:bg-slate-50/30">
                                                    <span className="col-span-8">{part.name}</span>
                                                    <span className="col-span-2 text-center">{part.qty}</span>
                                                    <span className="col-span-2 text-right">{part.price}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Technician Info */}
                                <div className="flex items-center gap-3 bg-blue-50/20 p-4 rounded-xl border border-blue-50/50">
                                    <div className="w-9 h-9 bg-white rounded-lg border border-slate-100 flex items-center justify-center text-brand-blue shrink-0">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-gray-400">{t('history.technician', 'Kỹ thuật viên phụ trách:')}</div>
                                        <div className="font-bold text-brand-blue">{selectedInvoice.technician}</div>
                                    </div>
                                </div>

                                {/* Invoice Total Breakdown */}
                                <div className="border-t border-slate-100 pt-4 space-y-2 font-medium">
                                    <div className="flex justify-between">
                                        <span>{t('history.laborCost', 'Chi phí nhân công:')}</span>
                                        <span>{selectedInvoice.details.laborCost}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>{t('history.partsCost', 'Chi phí linh kiện:')}</span>
                                        <span>
                                            {selectedInvoice.details.partsUsed.reduce(
                                                (acc, part) => acc + parseInt(part.price.replace(/\./g, '').replace('đ', '')), 0
                                            ).toLocaleString()}đ
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-gray-400">
                                        <span>{t('history.discount', 'Khấu trừ / Giảm giá:')}</span>
                                        <span>{selectedInvoice.details.discount}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-400">
                                        <span>{t('history.vat', 'Thuế VAT (10%):')}</span>
                                        <span>{selectedInvoice.details.vat}</span>
                                    </div>
                                    <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline font-bold text-sm">
                                        <span className="text-brand-blue">{t('history.grandTotal', 'TỔNG THANH TOÁN:')}</span>
                                        <span className="text-lg text-brand-orange font-mono">{selectedInvoice.price}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 shrink-0">
                                <button
                                    onClick={() => setSelectedInvoice(null)}
                                    className="flex-1 py-2.5 border border-slate-200 text-gray-600 hover:bg-slate-100 rounded-xl font-bold transition-all"
                                >
                                    {t('history.close', 'Đóng')}
                                </button>
                                <button
                                    onClick={() => alert(t('history.pdfAlert', { defaultValue: `Đang chuẩn bị tải PDF cho hóa đơn ${selectedInvoice.id}...`, id: selectedInvoice.id }))}
                                    className="flex-1 py-2.5 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
                                >
                                    <Download className="w-4 h-4" /> {t('history.downloadPdf', 'Tải hóa đơn PDF')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
