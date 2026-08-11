import {
    AlertCircle,
    CheckCircle2,
    Clock3,
    Loader2,
    Package,
    ReceiptText,
    Wallet,
    Wrench,
    X,
    XCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

interface QuoteItem {
    id: number;
    quantity: number;
    unit_price: number | string;
    repair_price: number | string;
    amount: number | string;
    custom_item_name?: string | null;
    status?: string;
    issue?: {
        error_description?: string | null;
        component?: { name?: string | null; parent?: { name?: string | null } | null } | null;
    } | null;
    sparePart?: { id: number; name: string } | null;
    service_catalog?: { id: number; service_name: string } | null;
    customPartOrder?: { id: number; item_name: string; status: string } | null;
}

export interface QuoteReferenceData {
    id: number;
    total_amount: number | string;
    deposit_amount?: number | string | null;
    deposit_paid_at?: string | null;
    approved_at?: string | null;
    approval_method?: string | null;
    status: string;
    note?: string | null;
    createdAt: string;
    items: QuoteItem[];
    task?: {
        serviceOrder?: {
            vehicle?: {
                license_plate?: string | null;
                color?: string | null;
                model?: { model_name?: string | null } | null;
                customer?: {
                    name?: string | null;
                    phone?: string | null;
                    user?: { fullName?: string | null; phoneNumber?: string | null } | null;
                } | null;
            } | null;
        } | null;
    } | null;
}

interface Props {
    quotationId: number;
    isLoading: boolean;
    error: string | null;
    data: QuoteReferenceData | null;
    onClose: () => void;
}

const formatCurrency = (value?: number | string | null) =>
    `${Number(value ?? 0).toLocaleString('vi-VN')} VND`;

const formatDate = (value?: string | null) =>
    value
        ? new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '—';

const getStatusMeta = (status: string | undefined, t: TFunction) => {
    switch (status) {
        case 'PENDING':
            return { label: t('chat.status.pending', 'Chờ duyệt'), icon: Clock3, className: 'bg-amber-50 text-amber-700 border-amber-200' };
        case 'APPROVED':
            return { label: t('chat.status.approved', 'Đã duyệt'), icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
        case 'PENDING_DEPOSIT':
            return { label: t('chat.status.pendingDeposit', 'Chờ cọc'), icon: Wallet, className: 'bg-orange-50 text-orange-700 border-orange-200' };
        case 'EXPORTED':
            return { label: t('chat.status.exported', 'Đã xuất kho'), icon: Package, className: 'bg-violet-50 text-violet-700 border-violet-200' };
        case 'REJECTED':
            return { label: t('chat.status.rejected', 'Từ chối'), icon: XCircle, className: 'bg-rose-50 text-rose-700 border-rose-200' };
        default:
            return { label: status || t('chat.quoteModal.unknown', 'Không rõ'), icon: AlertCircle, className: 'bg-slate-50 text-slate-600 border-slate-200' };
    }
};

const isAwaitingDeposit = (quote: QuoteReferenceData) =>
    ['APPROVED', 'PENDING_DEPOSIT'].includes(quote.status) &&
    Number(quote.deposit_amount ?? 0) > 0 &&
    !quote.deposit_paid_at;

const getItemName = (item: QuoteItem, t: TFunction) =>
    item.service_catalog?.service_name || item.sparePart?.name || item.customPartOrder?.item_name || t('quoteTracking.unnamedItem', 'Hạng mục #{{id}}', { id: item.id });

const getIssueText = (item: QuoteItem) => {
    const component = item.issue?.component;
    const componentName = component?.parent?.name ? `${component.parent.name} - ${component.name}` : component?.name;
    return [componentName, item.issue?.error_description].filter(Boolean).join(' - ') || '—';
};

export default function QuoteReferenceModal({ quotationId, isLoading, error, data, onClose }: Props) {
    const { t } = useTranslation();
    const vehicle = data?.task?.serviceOrder?.vehicle;
    const customer = vehicle?.customer;
    const customerName = customer?.name || customer?.user?.fullName || '—';
    const customerPhone = customer?.phone || customer?.user?.phoneNumber || '—';
    const vehiclePlate = vehicle?.license_plate || '—';
    const vehicleModel = vehicle?.model?.model_name;
    const vehicleColor = vehicle?.color;

    const statusMeta = data ? getStatusMeta(data.status, t) : null;
    const StatusIcon = statusMeta?.icon ?? AlertCircle;
    const partItems = data?.items.filter((item) => !item.service_catalog) ?? [];
    const serviceItems = data?.items.filter((item) => item.service_catalog) ?? [];
    const depositItems = partItems.filter((item) => item.customPartOrder);

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-[2px]"
            onClick={onClose}
        >
            <div
                className="bg-white shadow-2xl overflow-hidden flex flex-col border border-slate-200"
                style={{
                    width: 'min(768px, calc(100vw - 32px))',
                    maxWidth: '768px',
                    maxHeight: '86vh',
                    borderRadius: '20px',
                }}
                onClick={(e) => e.stopPropagation()}
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
                                    {t('chat.quoteModal.codeLabel', 'Báo giá BG-{{id}}', { id: quotationId })}
                                </p>
                                <h3 className="text-xl font-extrabold tracking-tight mt-0.5">{t('chat.quoteModal.title', 'Chi tiết báo giá')}</h3>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto space-y-5 bg-white">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16 text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                    ) : error || !data ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                            <AlertCircle className="w-8 h-8 text-rose-400" />
                            <p className="text-sm font-semibold text-slate-600">{error || t('chat.quoteModal.loadError', 'Không tải được báo giá.')}</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-4">
                                        {t('chat.quoteModal.customer', 'Khách hàng')}
                                    </p>
                                    <div className="grid grid-cols-[70px_1fr] gap-y-3 text-sm">
                                        <span className="text-slate-400">{t('chat.quoteModal.name', 'Tên')}</span>
                                        <span className="font-semibold text-slate-700">{customerName}</span>
                                        <span className="text-slate-400">{t('chat.quoteModal.phone', 'SĐT')}</span>
                                        <span className="font-semibold text-slate-700">{customerPhone}</span>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-4">
                                        {t('chat.quoteModal.vehicle', 'Phương tiện')}
                                    </p>
                                    <div className="grid grid-cols-[70px_1fr] gap-y-3 text-sm">
                                        <span className="text-slate-400">{t('chat.quoteModal.plate', 'Biển số')}</span>
                                        <span className="font-semibold text-slate-700">{vehiclePlate}</span>
                                        <span className="text-slate-400">{t('chat.quoteModal.vehicleName', 'Tên xe')}</span>
                                        <span className="font-semibold text-slate-700">
                                            {vehicleModel || '—'}{vehicleColor && ` · ${vehicleColor}`}
                                        </span>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-4">
                                        {t('chat.quoteModal.status', 'Trạng thái')}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {statusMeta && (
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${statusMeta.className}`}>
                                                <StatusIcon className="w-3.5 h-3.5" />
                                                {statusMeta.label}
                                            </span>
                                        )}
                                        {isAwaitingDeposit(data) && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-xs font-bold text-amber-700">
                                                <Wallet className="w-3.5 h-3.5" />
                                                {t('chat.quoteModal.awaitingDeposit', 'Chờ cọc {{count}} phụ tùng', { count: depositItems.length || 1 })}
                                            </span>
                                        )}
                                    </div>
                                    {Number(data.deposit_amount ?? 0) > 0 && !data.deposit_paid_at && (
                                        <p className="text-xs font-bold text-[#D97706] mt-3">
                                            {t('chat.quoteModal.depositNeeded', 'Cần thu cọc: {{amount}}', { amount: formatCurrency(data.deposit_amount) })}
                                        </p>
                                    )}
                                    {data.approved_at && (
                                        <p className="text-xs text-slate-400 mt-2">{t('chat.quoteModal.approvedAt', 'Duyệt lúc: {{date}}', { date: formatDate(data.approved_at) })}</p>
                                    )}
                                </div>

                                <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-4">
                                        {t('chat.quoteModal.createdAt', 'Ngày tạo')}
                                    </p>
                                    <p className="text-sm font-bold text-slate-700">{formatDate(data.createdAt)}</p>
                                    {data.approval_method && (
                                        <p className="text-xs text-slate-400 mt-3">{t('chat.quoteModal.approvalMethod', 'Phương thức duyệt: {{method}}', { method: data.approval_method })}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <h4 className="text-base font-extrabold text-slate-800">{t('chat.quoteModal.itemsTitle', 'Hạng mục báo giá')}</h4>
                                <span className="px-3 py-1 rounded-full bg-[#00285E] text-white text-xs font-extrabold">
                                    {t('chat.quoteModal.itemsCount', '{{count}} hạng mục', { count: data.items.length })}
                                </span>
                            </div>

                            {partItems.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-2 text-slate-600">
                                        <Package className="w-4 h-4" />
                                        <span className="text-xs font-extrabold uppercase tracking-widest">
                                            {t('chat.quoteModal.partsSection', 'Phụ tùng ({{count}})', { count: partItems.length })}
                                        </span>
                                    </div>
                                    <div className="rounded-xl border border-slate-200/80 overflow-hidden">
                                        <table className="w-full min-w-[580px] text-left text-xs">
                                            <thead>
                                                <tr className="bg-slate-50 text-[11px] uppercase tracking-widest text-slate-400">
                                                    <th className="px-3 py-3">{t('chat.quoteModal.issueCol', 'Hạng mục lỗi')}</th>
                                                    <th className="px-3 py-3">{t('chat.quoteModal.partCol', 'Phụ tùng')}</th>
                                                    <th className="px-3 py-3 text-center">{t('chat.quoteModal.qtyCol', 'SL')}</th>
                                                    <th className="px-3 py-3 text-right">{t('chat.quoteModal.unitPriceCol', 'Đơn giá')}</th>
                                                    <th className="px-3 py-3 text-right">{t('chat.quoteModal.totalCol', 'Thành tiền')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {partItems.map((item) => {
                                                    const isCustom = !!item.customPartOrder;
                                                    return (
                                                        <tr key={item.id} className="bg-white">
                                                            <td className="px-3 py-3.5">
                                                                <p className="text-xs font-semibold text-slate-700">
                                                                    {getIssueText(item).split(' - ')[0]}
                                                                </p>
                                                                <p className="text-xs text-slate-400 mt-1">
                                                                    {item.issue?.error_description || '—'}
                                                                </p>
                                                            </td>
                                                            <td className="px-3 py-3.5">
                                                                <p className="text-xs font-semibold text-slate-700">{getItemName(item, t)}</p>
                                                                {isCustom && (
                                                                    <span
                                                                        className={`inline-flex mt-2 px-2 py-1 rounded-full text-[11px] font-semibold ${
                                                                            item.status === 'WAITING_DEPOSIT'
                                                                                ? 'bg-[#FFF3DA] text-[#C05600]'
                                                                                : 'bg-emerald-50 text-emerald-700'
                                                                        }`}
                                                                    >
                                                                        {item.status === 'WAITING_DEPOSIT' ? (
                                                                            t('chat.quoteModal.customPartWaiting', 'Phụ tùng đặt riêng · Cần cọc: {{amount}}', {
                                                                                amount: formatCurrency(Math.round(item.quantity * Number(item.unit_price) * 0.3)),
                                                                            })
                                                                        ) : (
                                                                            t('chat.quoteModal.customPartPaid', 'Phụ tùng đặt riêng · Đã cọc')
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-3.5 text-center text-slate-600">{item.quantity}</td>
                                                            <td className="px-3 py-3.5 text-right text-slate-700">
                                                                {formatCurrency(item.unit_price)}
                                                            </td>
                                                            <td className="px-3 py-3.5 text-right font-extrabold text-[#00285E]">
                                                                {formatCurrency(item.amount)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
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
                                            {t('chat.quoteModal.servicesSection', 'Dịch vụ ({{count}})', { count: serviceItems.length })}
                                        </span>
                                    </div>
                                    <div className="rounded-xl border border-slate-200/80 overflow-hidden">
                                        <table className="w-full min-w-[580px] text-left text-xs">
                                            <thead>
                                                <tr className="bg-slate-50 text-[11px] uppercase tracking-widest text-slate-400">
                                                    <th className="px-3 py-3">{t('chat.quoteModal.issueCol', 'Hạng mục lỗi')}</th>
                                                    <th className="px-3 py-3">{t('chat.quoteModal.serviceCol', 'Dịch vụ')}</th>
                                                    <th className="px-3 py-3 text-right">{t('chat.quoteModal.repairPriceCol', 'Giá sửa chữa')}</th>
                                                    <th className="px-3 py-3 text-right">{t('chat.quoteModal.totalCol', 'Thành tiền')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {serviceItems.map((item) => (
                                                    <tr key={item.id} className="bg-white">
                                                        <td className="px-3 py-3.5">
                                                            <p className="text-xs font-semibold text-slate-700">
                                                                {getIssueText(item).split(' - ')[0]}
                                                            </p>
                                                            <p className="text-xs text-slate-400 mt-1">
                                                                {item.issue?.error_description || '—'}
                                                            </p>
                                                        </td>
                                                        <td className="px-3 py-3.5 text-slate-700 font-semibold">{getItemName(item, t)}</td>
                                                        <td className="px-3 py-3.5 text-right text-slate-700">
                                                            {formatCurrency(item.repair_price)}
                                                        </td>
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

                            <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-4">
                                <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                                    {t('chat.quoteModal.note', 'Ghi chú')}
                                </p>
                                <p className="text-sm text-slate-600">{data.note || t('chat.quoteModal.noNote', 'Không có ghi chú.')}</p>
                            </div>
                        </>
                    )}
                </div>

                {data && (
                    <div className="shrink-0 px-7 py-4 border-t border-slate-200 bg-white flex items-center justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                                {t('chat.quoteModal.total', 'Tổng cộng')}
                            </p>
                            <p className="text-xl font-extrabold text-[#00285E] mt-1">
                                {formatCurrency(data.total_amount)}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
