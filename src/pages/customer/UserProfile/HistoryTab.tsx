import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Download, CheckCircle2, Eye, X, Calendar, User, Loader2, AlertCircle, Search, ReceiptText, Package, Wrench, MessageSquare, Star } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ProfileSectionHeader from './ProfileSectionHeader';
import Pagination from '../../../components/share/Pagination';
import { useFetchClient } from '../../../hook/useFetchClient';
import { SERVICE_HISTORY_API_ENDPOINTS } from '../../../constants/customer/serviceHistoryApiEndpoint';

interface QuotationItem {
    id: number;
    quantity: number;
    unit_price: number | string;
    repair_price: number | string;
    amount: number | string;
    custom_item_name: string | null;
    sparePart: { id: number; name: string; sku: string } | null;
    service_catalog: { id: number; service_name: string } | null;
    customPartOrder?: { id: number; item_name: string; status: string } | null;
}

interface QuotationSummary {
    id: number;
    total_amount: number | string;
    deposit_amount: number | string | null;
    deposit_paid_at: string | null;
    approved_at: string | null;
    items: QuotationItem[];
}

interface TaskAssignmentTechnician {
    technician: { id: number; fullName: string | null } | null;
}

interface TaskSummary {
    id: number;
    catalog?: { id: number; service_name: string; labor_price: number | string } | null;
    assignments: TaskAssignmentTechnician[];
    quotations: QuotationSummary[];
}

interface AppointmentSummary {
    id: number;
    booking_type: string;
    appointmentDetails?: {
        catalog?: { id: number; service_name: string; labor_price: number | string } | null;
        combo?: { id: number; combo_name: string } | null;
    }[];
}

interface ServiceOrderHistory {
    id: number;
    status: string;
    entry_time: string | null;
    actual_finish_time: string | null;
    exit_time: string | null;
    vehicle: {
        id: number;
        license_plate: string | null;
        color: string | null;
        model?: { id: number; model_name: string } | null;
    } | null;
    payment: { id: number; payment_status: string; amount: number | string; payment_method: string | null } | null;
    feedback?: { id: number; rating: number } | null;
    tasks: TaskSummary[];
    appointment?: AppointmentSummary | null;
}

const formatCurrency = (value?: number | string | null) =>
    `${Number(value ?? 0).toLocaleString('vi-VN')} VNĐ`;

const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const getItemName = (item: QuotationItem) =>
    item.service_catalog?.service_name || item.sparePart?.name || item.customPartOrder?.item_name || item.custom_item_name || `Hạng mục #${item.id}`;

// Cùng logic xác định "đã thanh toán" như trang chi tiết đơn hàng của lễ tân
const isOrderPaid = (order: ServiceOrderHistory) =>
    order.payment?.payment_status === 'PAID' || order.payment?.payment_status === 'COMPLETED';

// Gộp toàn bộ hạng mục + KTV phụ trách từ tất cả báo giá đã duyệt của 1 lệnh sửa chữa
const flattenOrder = (order: ServiceOrderHistory) => {
    let items = (order.tasks || []).flatMap((t) => (t.quotations || []).flatMap((q) => q.items));
    const quotations = (order.tasks || []).flatMap((t) => t.quotations || []);
    
    // Nếu không có quotation (dịch vụ lẻ SPECIFIC)
    if (items.length === 0) {
        // Ưu tiên lấy trực tiếp từ Task (nếu có lưu catalog)
        const taskItems = (order.tasks || [])
            .filter(t => t.catalog)
            .map((t, idx) => ({
                id: t.catalog!.id || idx,
                quantity: 1,
                unit_price: 0,
                repair_price: t.catalog!.labor_price || 0,
                amount: t.catalog!.labor_price || 0,
                custom_item_name: null,
                sparePart: null,
                service_catalog: { id: t.catalog!.id, service_name: t.catalog!.service_name }
            } as QuotationItem));
        
        if (taskItems.length > 0) {
            items = taskItems;
        } else if (order.appointment?.appointmentDetails) {
            // Hoặc fallback lấy từ Appointment Details
            items = order.appointment.appointmentDetails.map((detail, idx) => {
                if (detail.catalog) {
                    return {
                        id: detail.catalog.id || idx,
                        quantity: 1,
                        unit_price: 0,
                        repair_price: detail.catalog.labor_price || 0,
                        amount: detail.catalog.labor_price || 0,
                        custom_item_name: null,
                        sparePart: null,
                        service_catalog: { id: detail.catalog.id, service_name: detail.catalog.service_name }
                    } as QuotationItem;
                } else if (detail.combo) {
                    return {
                        id: detail.combo.id || idx,
                        quantity: 1,
                        unit_price: 0,
                        repair_price: 0,
                        amount: 0,
                        custom_item_name: detail.combo.combo_name,
                        sparePart: null,
                        service_catalog: null
                    } as QuotationItem;
                }
                return null;
            }).filter(Boolean) as QuotationItem[];
        }
    }

    const technicianNames = [
        ...new Set(
            (order.tasks || [])
                .flatMap((t) => t.assignments || [])
                .map((a) => a.technician?.fullName)
                .filter((name): name is string => Boolean(name)),
        ),
    ];
    let totalAmount = quotations.reduce((sum, q) => sum + Number(q.total_amount), 0);
    const totalDeposit = quotations.reduce((sum, q) => sum + Number(q.deposit_amount ?? 0), 0);
    
    if (totalAmount === 0 && order.payment?.amount) {
        totalAmount = Number(order.payment.amount);
    }
    
    return { items, technicianNames, totalAmount, totalDeposit };
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 8192;
    for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return btoa(binary);
};

export default function HistoryTab() {
    const { t } = useTranslation();
    const { fetchPrivate } = useFetchClient();
    const [orders, setOrders] = useState<ServiceOrderHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<ServiceOrderHistory | null>(null);
    const [feedbackOrder, setFeedbackOrder] = useState<ServiceOrderHistory | null>(null);
    const [rating, setRating] = useState(5);
    const [feedbackText, setFeedbackText] = useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const ITEMS_PER_PAGE = 10;

    const showToast = (text: string) => {
        setToastMessage(text);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const loadServiceHistory = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetchPrivate<ServiceOrderHistory[]>(
                SERVICE_HISTORY_API_ENDPOINTS.GET_SERVICE_HISTORY,
            );
            setOrders(response?.data ?? []);
        } catch (err: any) {
            setError(err?.message || 'Không thể tải lịch sử dịch vụ.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedbackOrder) return;
        setIsSubmittingFeedback(true);
        try {
            await fetchPrivate(SERVICE_HISTORY_API_ENDPOINTS.SUBMIT_FEEDBACK, 'POST', {
                service_order_id: feedbackOrder.id,
                rating,
                comment: feedbackText
            });
            showToast('Cảm ơn bạn đã đánh giá dịch vụ!');
            
            // Cập nhật lại state orders để hiện "Đã đánh giá" mà không cần reload
            setOrders(prev => prev.map(order => 
                order.id === feedbackOrder.id 
                    ? { ...order, feedback: { id: Date.now(), rating } } 
                    : order
            ));
            
            setFeedbackOrder(null);
            setRating(5);
            setFeedbackText('');
        } catch (err: any) {
            alert(err?.message || 'Có lỗi xảy ra khi gửi đánh giá.');
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    useEffect(() => {
        void loadServiceHistory();
    }, []);

    const rows = useMemo(
        () =>
            orders.map((order) => ({
                order,
                code: `LSD-${order.id}`,
                ...flattenOrder(order),
            })),
        [orders],
    );

    const filteredRows = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        if (!keyword) return rows;
        return rows.filter((row) => {
            const plate = row.order.vehicle?.license_plate?.toLowerCase() ?? '';
            const model = row.order.vehicle?.model?.model_name?.toLowerCase() ?? '';
            const technicians = row.technicianNames.join(' ').toLowerCase();
            const itemNames = row.items.map((item) => getItemName(item).toLowerCase()).join(' ');
            return (
                row.code.toLowerCase().includes(keyword) ||
                plate.includes(keyword) ||
                model.includes(keyword) ||
                technicians.includes(keyword) ||
                itemNames.includes(keyword)
            );
        });
    }, [rows, searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE));
    const paginatedRows = useMemo(
        () => filteredRows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
        [filteredRows, currentPage],
    );

    const handleDownloadPdf = async (row: (typeof rows)[number]) => {
        try {
            const [fontResponse, boldFontResponse] = await Promise.all([
                fetch('/fonts/NotoSans.ttf'),
                fetch('/fonts/NotoSans-Bold.ttf'),
            ]);
            if (!fontResponse.ok || !boldFontResponse.ok) {
                throw new Error('Không tải được font.');
            }
            const fontBase64 = arrayBufferToBase64(await fontResponse.arrayBuffer());
            const boldFontBase64 = arrayBufferToBase64(await boldFontResponse.arrayBuffer());
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            doc.addFileToVFS('NotoSans.ttf', fontBase64);
            doc.addFileToVFS('NotoSans-Bold.ttf', boldFontBase64);
            doc.addFont('NotoSans.ttf', 'NotoSans', 'normal');
            doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
            doc.setFont('NotoSans', 'normal');

            const navy: [number, number, number] = [0, 40, 94];
            const slate: [number, number, number] = [51, 65, 85];
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 14;

            doc.setTextColor(...navy);
            doc.setFont('NotoSans', 'bold');
            doc.setFontSize(9);
            doc.text('AGM INTELLIGENT GARAGE', pageWidth / 2, 14, { align: 'center' });
            doc.setFontSize(18);
            doc.text('HÓA ĐƠN DỊCH VỤ', pageWidth / 2, 24, { align: 'center' });
            doc.setFont('NotoSans', 'normal');
            doc.setDrawColor(...navy);
            doc.setLineWidth(0.5);
            doc.line(margin, 30, pageWidth - margin, 30);

            doc.setFontSize(8.5);
            doc.setTextColor(...slate);
            doc.text(`Mã: ${row.code}`, margin, 39);
            doc.text(`Xe: ${row.order.vehicle?.license_plate || '—'} ${row.order.vehicle?.model?.model_name || ''}`, margin, 44.5);
            doc.text(`Kỹ thuật viên: ${row.technicianNames.join(', ') || '—'}`, margin, 50);
            doc.text(`Ngày hoàn thành: ${formatDate(row.order.actual_finish_time)}`, 116, 39);

            autoTable(doc, {
                startY: 58,
                head: [['Hạng mục', 'SL', 'Đơn giá', 'Thành tiền']],
                body: row.items.map((item) => [
                    getItemName(item),
                    item.quantity,
                    formatCurrency(item.sparePart ? item.unit_price : item.repair_price),
                    formatCurrency(item.amount),
                ]),
                styles: { font: 'NotoSans', fontSize: 8.5, cellPadding: 2.5, textColor: slate },
                headStyles: { fillColor: navy, textColor: [255, 255, 255], font: 'NotoSans', fontStyle: 'bold' },
                margin: { left: margin, right: margin },
            });

            const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
            doc.setFont('NotoSans', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...navy);
            doc.text('TỔNG CỘNG', pageWidth - margin - 5, finalY + 12, { align: 'right' });
            doc.setFontSize(14);
            doc.text(formatCurrency(row.totalAmount), pageWidth - margin - 5, finalY + 20, { align: 'right' });
            if (row.totalDeposit > 0) {
                doc.setFont('NotoSans', 'normal');
                doc.setFontSize(8.5);
                doc.text(`Đã cọc: ${formatCurrency(row.totalDeposit)}`, pageWidth - margin - 5, finalY + 27, { align: 'right' });
                doc.text(
                    `Còn lại: ${formatCurrency(row.totalAmount - row.totalDeposit)}`,
                    pageWidth - margin - 5,
                    finalY + 33,
                    { align: 'right' },
                );
            }

            doc.save(`${row.code}.pdf`);
        } catch (err) {
            console.error('Lỗi khi tạo PDF:', err);
        }
    };

    const selectedRow = selectedOrder ? rows.find((r) => r.order.id === selectedOrder.id) : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 text-left"
        >
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, x: "-50%" }}
                        animate={{ opacity: 1, y: 16, x: "-50%" }}
                        exit={{ opacity: 0, y: -20, x: "-50%" }}
                        className="fixed top-0 left-1/2 z-[100] transform -translate-x-1/2 flex items-center gap-2.5 px-5 py-3.5 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 text-sm font-semibold"
                    >
                        <CheckCircle2 size={18} className="text-emerald-400" />
                        <span>{toastMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <ProfileSectionHeader
                    title={t('history.title', 'Lịch Sử Dịch Vụ')}
                    description={t('history.description', 'Xem lại lịch sử dịch vụ, bảo dưỡng và các hóa đơn của bạn.')}
                />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs p-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder={t('history.searchPlaceholder', 'Tìm mã hóa đơn, biển số xe, hạng mục, kỹ thuật viên...')}
                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50/60 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#F9A11B] focus:bg-white transition-all"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-xs">Đang tải lịch sử dịch vụ...</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                        <AlertCircle className="w-8 h-8 text-rose-400" />
                        <p className="text-sm font-semibold text-slate-600">{error}</p>
                    </div>
                ) : filteredRows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center gap-2 text-slate-400">
                        <p className="text-sm">
                            {searchTerm.trim()
                                ? t('history.noSearchResults', 'Không tìm thấy hóa đơn phù hợp.')
                                : t('history.empty', 'Bạn chưa có dịch vụ nào đã hoàn thành.')}
                        </p>
                    </div>
                ) : (
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
                                {paginatedRows.map((row) => (
                                    <tr key={row.order.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 font-mono font-bold text-brand-blue">{row.code}</td>
                                        <td className="p-4">{formatDate(row.order.actual_finish_time)}</td>
                                        <td className="p-4">
                                            <div>
                                                <div className="font-bold text-brand-blue">
                                                    {row.order.vehicle?.model?.model_name || '—'}
                                                </div>
                                                <div className="text-[10px] text-gray-400 mt-0.5">
                                                    {row.order.vehicle?.license_plate || '—'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 font-bold text-brand-blue">
                                            {row.items.length > 0 ? `${row.items.length} hạng mục` : '—'}
                                        </td>
                                        <td className="p-4 font-mono font-bold text-brand-orange">
                                            {formatCurrency(row.totalAmount)}
                                        </td>
                                        <td className="p-4">
                                            {isOrderPaid(row.order) ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 font-bold text-[10px] border border-emerald-100">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    {t('history.statusPaid', 'Đã thanh toán')}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 font-bold text-[10px] border border-amber-100">
                                                    <Loader2 className="w-3.5 h-3.5" />
                                                    {t('history.statusUnpaid', 'Chưa thanh toán')}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => setSelectedOrder(row.order)}
                                                    className="p-2 bg-blue-50 hover:bg-blue-100 text-brand-blue rounded-lg transition-colors"
                                                    title={t('history.invoiceDetail', 'Chi tiết hóa đơn')}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {isOrderPaid(row.order) && (
                                                    row.order.feedback ? (
                                                        <span
                                                            className="flex items-center gap-1 p-2 border border-green-200 bg-green-50 text-green-600 rounded-lg text-xs font-semibold cursor-default"
                                                            title="Đã đánh giá"
                                                        >
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => setFeedbackOrder(row.order)}
                                                            className="p-2 border border-gray-200 hover:bg-slate-50 text-amber-500 rounded-lg transition-colors"
                                                            title="Đánh giá dịch vụ"
                                                        >
                                                            <MessageSquare className="w-4 h-4" />
                                                        </button>
                                                    )
                                                )}
                                                <button
                                                    onClick={() => void handleDownloadPdf(row)}
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
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </div>
                )}
            </div>

            <AnimatePresence>
                {selectedRow && (() => {
                    const partItems = selectedRow.items.filter((item) => !item.service_catalog);
                    const serviceItems = selectedRow.items.filter((item) => item.service_catalog);

                    return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-[2px]">
                        <div
                            className="bg-white shadow-2xl overflow-hidden flex flex-col border border-slate-200"
                            style={{
                                width: 'min(768px, calc(100vw - 32px))',
                                maxWidth: '768px',
                                maxHeight: '86vh',
                                borderRadius: '20px',
                            }}
                        >
                            <div className="relative shrink-0 h-[100px] px-7 bg-[#00285E] text-white overflow-hidden flex items-center">
                                <div className="absolute -left-14 -bottom-20 w-44 h-44 rounded-full bg-white/5" />
                                <div className="absolute -right-10 -top-16 w-40 h-40 rounded-full bg-white/10" />

                                <div className="relative w-full flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-2xl bg-[#F9A11B] flex items-center justify-center shadow-lg shadow-black/10">
                                            <ReceiptText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-extrabold uppercase tracking-widest text-white/70">
                                                {t('history.invoiceCode', 'Hóa đơn {{code}}', { code: selectedRow.code })}
                                            </p>
                                            <h3 className="text-xl font-extrabold tracking-tight mt-0.5">
                                                {t('history.invoiceDetail', 'Chi tiết hóa đơn')}
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {isOrderPaid(selectedRow.order) && (
                                            selectedRow.order.feedback ? (
                                                <span
                                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-green-700 bg-green-100/90 transition-colors"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Đã đánh giá ({selectedRow.order.feedback.rating} <Star className="w-3 h-3 fill-current inline -mt-0.5" />)
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setFeedbackOrder(selectedRow.order)}
                                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 transition-colors"
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                    Đánh giá
                                                </button>
                                            )
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => void handleDownloadPdf(selectedRow)}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            {t('history.downloadPdf', 'Tải hóa đơn PDF')}
                                        </button>
                                        <button
                                            onClick={() => setSelectedOrder(null)}
                                            className="w-9 h-9 rounded-xl text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-5 bg-white">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                                        <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-4">
                                            {t('quoteTracking.modal.vehicle', 'Phương tiện')}
                                        </p>
                                        <div className="grid grid-cols-[70px_1fr] gap-y-3 text-sm">
                                            <span className="text-slate-400">{t('quoteTracking.modal.plate', 'Biển số')}</span>
                                            <span className="font-semibold text-slate-700">
                                                {selectedRow.order.vehicle?.license_plate || '—'}
                                            </span>
                                            <span className="text-slate-400">{t('quoteTracking.modal.vehicleName', 'Tên xe')}</span>
                                            <span className="font-semibold text-slate-700">
                                                {selectedRow.order.vehicle?.model?.model_name || '—'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                                        <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-4">
                                            {t('history.invoiceDate', 'Ngày hoàn thành')}
                                        </p>
                                        <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-[#F9A11B]" />
                                            {formatDate(selectedRow.order.actual_finish_time)}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                                        <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-4">
                                            {t('history.technician', 'Kỹ thuật viên phụ trách')}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                                <User className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-sm font-semibold text-slate-700">
                                                {selectedRow.technicianNames.join(', ') || '—'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                                        <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-4">
                                            {t('quoteTracking.modal.status', 'Trạng thái')}
                                        </p>
                                        {isOrderPaid(selectedRow.order) ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold border-emerald-200 bg-emerald-50 text-emerald-700">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                {t('history.statusPaid', 'Đã thanh toán')}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold border-amber-200 bg-amber-50 text-amber-700">
                                                <Loader2 className="w-3.5 h-3.5" />
                                                {t('history.statusUnpaid', 'Chưa thanh toán')}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <h4 className="text-base font-extrabold text-slate-800">
                                        {t('history.itemDetails', 'Chi tiết hạng mục')}
                                    </h4>
                                    <span className="px-3 py-1 rounded-full bg-[#00285E] text-white text-xs font-extrabold">
                                        {t('quoteTracking.modal.itemsCount', '{{count}} hạng mục', { count: selectedRow.items.length })}
                                    </span>
                                </div>

                                {selectedRow.items.length === 0 ? (
                                    <div className="rounded-xl border border-slate-200/80 overflow-hidden">
                                        <p className="px-3 py-6 text-center text-xs text-slate-400">
                                            {t('history.noItems', 'Không có hạng mục nào.')}
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {partItems.length > 0 && (
                                            <div>
                                                <div className="flex items-center gap-2 mb-2 text-slate-600">
                                                    <Package className="w-4 h-4" />
                                                    <span className="text-xs font-extrabold uppercase tracking-widest">
                                                        {t('history.partsSection', 'Phụ tùng ({{count}})', { count: partItems.length })}
                                                    </span>
                                                </div>
                                                <div className="rounded-xl border border-slate-200/80 overflow-hidden">
                                                    <table className="w-full min-w-[480px] text-left text-xs">
                                                        <thead>
                                                            <tr className="bg-slate-50 text-[11px] uppercase tracking-widest text-slate-400">
                                                                <th className="px-3 py-3">{t('history.partCol', 'Phụ tùng')}</th>
                                                                <th className="px-3 py-3 text-center">{t('history.qty', 'SL')}</th>
                                                                <th className="px-3 py-3 text-right">{t('history.unitPriceCol', 'Đơn giá')}</th>
                                                                <th className="px-3 py-3 text-right">{t('history.price', 'Thành tiền')}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {partItems.map((item) => (
                                                                <tr key={item.id} className="bg-white">
                                                                    <td className="px-3 py-3.5">
                                                                        <p className="text-xs font-semibold text-slate-700">{getItemName(item)}</p>
                                                                    </td>
                                                                    <td className="px-3 py-3.5 text-center text-slate-600">{item.quantity}</td>
                                                                    <td className="px-3 py-3.5 text-right text-slate-700">{formatCurrency(item.unit_price)}</td>
                                                                    <td className="px-3 py-3.5 text-right font-extrabold text-[#00285E]">
                                                                        {formatCurrency(item.amount)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {serviceItems.length > 0 && (
                                            <div>
                                                <div className="flex items-center gap-2 mb-2 text-slate-600">
                                                    <Wrench className="w-4 h-4" />
                                                    <span className="text-xs font-extrabold uppercase tracking-widest">
                                                        {t('history.servicesSection', 'Dịch vụ ({{count}})', { count: serviceItems.length })}
                                                    </span>
                                                </div>
                                                <div className="rounded-xl border border-slate-200/80 overflow-hidden">
                                                    <table className="w-full min-w-[480px] text-left text-xs">
                                                        <thead>
                                                            <tr className="bg-slate-50 text-[11px] uppercase tracking-widest text-slate-400">
                                                                <th className="px-3 py-3">{t('history.serviceCol', 'Dịch vụ')}</th>
                                                                <th className="px-3 py-3 text-right">{t('history.repairPriceCol', 'Giá sửa chữa')}</th>
                                                                <th className="px-3 py-3 text-right">{t('history.price', 'Thành tiền')}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {serviceItems.map((item) => (
                                                                <tr key={item.id} className="bg-white">
                                                                    <td className="px-3 py-3.5 text-slate-700 font-semibold">{getItemName(item)}</td>
                                                                    <td className="px-3 py-3.5 text-right text-slate-700">{formatCurrency(item.repair_price)}</td>
                                                                    <td className="px-3 py-3.5 text-right font-extrabold text-[#00285E]">
                                                                        {formatCurrency(item.amount)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="shrink-0 px-7 py-4 border-t border-slate-200 bg-white flex items-center justify-between gap-4">
                                <div>
                                    {selectedRow.totalDeposit > 0 && (
                                        <p className="text-xs font-bold text-slate-400 mb-1">
                                            {t('history.depositPaid', 'Đã cọc:')} {formatCurrency(selectedRow.totalDeposit)}
                                        </p>
                                    )}
                                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                                        {t('history.grandTotal', 'Tổng thanh toán')}
                                    </p>
                                    <p className="text-xl font-extrabold text-[#00285E] mt-1">
                                        {formatCurrency(selectedRow.totalAmount)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    );
                })()}
            </AnimatePresence>

            {/* Modal đánh giá phản hồi */}
            <AnimatePresence>
                {feedbackOrder && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
                        >
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-[#00285E]">Đánh giá dịch vụ</h3>
                                <button
                                    onClick={() => setFeedbackOrder(null)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmitFeedback} className="p-6">
                                <div className="mb-6 flex flex-col items-center">
                                    <p className="text-sm font-semibold text-slate-600 mb-3">Mức độ hài lòng của bạn</p>
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setRating(star)}
                                                className={`p-1 transition-colors ${rating >= star ? 'text-amber-400' : 'text-slate-200'}`}
                                            >
                                                <Star className="w-8 h-8 fill-current" />
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-amber-500 font-medium mt-3 uppercase tracking-wider">
                                        {rating === 5 ? 'Tuyệt vời' : rating === 4 ? 'Hài lòng' : rating === 3 ? 'Bình thường' : rating === 2 ? 'Không hài lòng' : 'Rất tệ'}
                                    </p>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        Ý kiến đóng góp
                                    </label>
                                    <textarea
                                        value={feedbackText}
                                        onChange={(e) => setFeedbackText(e.target.value)}
                                        placeholder="Chia sẻ trải nghiệm của bạn về dịch vụ..."
                                        rows={4}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 transition-all text-sm resize-none"
                                    />
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFeedbackOrder(null)}
                                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingFeedback}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-[#00285E] text-white font-semibold text-sm hover:bg-blue-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isSubmittingFeedback && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Gửi đánh giá
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
