import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Check, CheckCircle2, Clock3, Copy, Eye, Filter, Package, ReceiptText, Search, Wallet, Wrench, X, XCircle } from 'lucide-react';
import { useFetchClient } from '../../../hook/useFetchClient';
import { PROFILE_API_ENDPOINTS } from '../../../constants/customer/profileApiEndpoint';
import type {
  CustomerQuotationActionResponse,
  GetQuotationResponse,
  RejectCustomerQuotationRequest,
} from '../../../model/dto/quoteManagement.dto';

type QuoteStatusFilter = 'all' | 'PENDING' | 'PENDING_DEPOSIT' | 'APPROVED' | 'REJECTED';
type CustomerQuotationRow = GetQuotationResponse & {
  code: string;
  customerName: string;
  customerPhone: string;
  vehiclePlate: string;
  vehicleName: string;
  vehicleColor: string;
};

const formatCurrency = (value?: number | string | null) =>
  `${Number(value ?? 0).toLocaleString('vi-VN')} VND`;

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

const getStatusMeta = (status?: string) => {
  switch (status) {
    case 'PENDING':
      return {
        label: 'Chờ duyệt',
        icon: Clock3,
        className: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    case 'APPROVED':
      return {
        label: 'Đã duyệt',
        icon: CheckCircle2,
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'PENDING_DEPOSIT':
      return {
        label: 'Chờ cọc',
        icon: Wallet,
        className: 'bg-orange-50 text-orange-700 border-orange-200',
      };
    case 'REJECTED':
      return {
        label: 'Từ chối',
        icon: XCircle,
        className: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    default:
      return {
        label: status || 'Không rõ',
        icon: AlertCircle,
        className: 'bg-slate-50 text-slate-600 border-slate-200',
      };
  }
};

const mapQuotationRows = (quotations: GetQuotationResponse[]): CustomerQuotationRow[] => {
  const rows: CustomerQuotationRow[] = quotations.map((quote) => {
    const vehicle = quote.task?.serviceOrder?.vehicle;
    const customer = vehicle?.customer;

    return {
      ...quote,
      code: '',
      customerName: customer?.name || customer?.user?.fullName || 'Khách hàng',
      customerPhone: customer?.phone || customer?.user?.phoneNumber || '',
      vehiclePlate: vehicle?.license_plate || '',
      vehicleName: vehicle?.model?.model_name || '',
      vehicleColor: vehicle?.color || '',
    };
  });

  const counters: Record<string, number> = {};
  [...rows]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .forEach((row) => {
      const date = new Date(row.createdAt);
      const dateKey = `${String(date.getDate()).padStart(2, '0')}${String(date.getMonth() + 1).padStart(2, '0')}${date.getFullYear()}`;
      counters[dateKey] = (counters[dateKey] ?? 0) + 1;
      row.code = `BG-${dateKey}-${String(counters[dateKey]).padStart(2, '0')}`;
    });

  return rows;
};

const getIssueText = (item: GetQuotationResponse['items'][number]) => {
  const component = item.issue?.component;
  const componentName = component?.parent?.name
    ? `${component.parent.name} - ${component.name}`
    : component?.name;
  const error = item.issue?.error_description;

  return [componentName, error].filter(Boolean).join(' - ') || '—';
};

const getItemName = (item: GetQuotationResponse['items'][number]) =>
  item.service_catalog?.service_name ||
  item.sparePart?.name ||
  item.custom_item_name ||
  `Hạng mục #${item.id}`;

const getItemType = (item: GetQuotationResponse['items'][number]) =>
  item.service_catalog ? 'Dịch vụ' : 'Phụ tùng';

const isAwaitingDeposit = (quote: GetQuotationResponse) =>
  ['APPROVED', 'PENDING_DEPOSIT'].includes(quote.status) &&
  Number(quote.deposit_amount ?? 0) > 0 &&
  !quote.deposit_paid_at;

const getVehicleText = (quote: CustomerQuotationRow) => {
  const vehicle = quote.task?.serviceOrder?.vehicle;
  const model = quote.vehicleName || vehicle?.model?.model_name;
  const color = quote.vehicleColor || vehicle?.color;
  const plate = quote.vehiclePlate || vehicle?.license_plate;

  return [plate, [model, color].filter(Boolean).join(' · ')].filter(Boolean).join(' - ') || '—';
};

export default function QuoteTrackingTab() {
  const { fetchPrivate, fetchPublic } = useFetchClient();
  const [pendingQuotes, setPendingQuotes] = useState<GetQuotationResponse[]>([]);
  const [historyQuotes, setHistoryQuotes] = useState<GetQuotationResponse[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<CustomerQuotationRow | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatusFilter>('PENDING');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showDepositPayment, setShowDepositPayment] = useState(false);
  const [isDepositPaid, setIsDepositPaid] = useState(false);

  const loadPendingQuotations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const pendingRes = await fetchPrivate<GetQuotationResponse[]>(
        PROFILE_API_ENDPOINTS.GET_PENDING_QUOTATIONS,
      );
      setPendingQuotes(pendingRes?.data ?? []);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách báo giá.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistoryQuotations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const historyRes = await fetchPrivate<GetQuotationResponse[]>(
        PROFILE_API_ENDPOINTS.GET_QUOTATION_HISTORY,
      );
      setHistoryQuotes(historyRes?.data ?? []);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách báo giá.');
    } finally {
      setIsLoading(false);
    }
  };

  const reloadCurrentFilter = () => {
    if (statusFilter === 'PENDING') {
      void loadPendingQuotations();
      return;
    }

    void loadHistoryQuotations();
  };

  const handleApproveQuotation = async () => {
    if (!selectedQuote || isSubmittingAction) return;

    setIsSubmittingAction(true);
    setActionError('');
    try {
      await fetchPrivate<CustomerQuotationActionResponse>(
        PROFILE_API_ENDPOINTS.APPROVE_QUOTATION(selectedQuote.id),
        'PATCH',
      );
      setSelectedQuote(null);
      await loadPendingQuotations();
      setHistoryQuotes([]);
    } catch (err: any) {
      setActionError(err?.message || 'Không thể duyệt báo giá.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleRejectQuotation = async () => {
    if (!selectedQuote || isSubmittingAction) return;

    const reason = rejectReason.trim();
    if (!reason) {
      setActionError('Vui lòng nhập lý do từ chối báo giá.');
      return;
    }

    const payload: RejectCustomerQuotationRequest = { reason };
    setIsSubmittingAction(true);
    setActionError('');
    try {
      await fetchPrivate<CustomerQuotationActionResponse>(
        PROFILE_API_ENDPOINTS.REJECT_QUOTATION(selectedQuote.id),
        'PATCH',
        payload,
      );
      setIsRejectModalOpen(false);
      setRejectReason('');
      setSelectedQuote(null);
      await loadPendingQuotations();
      setHistoryQuotes([]);
    } catch (err: any) {
      setActionError(err?.message || 'Không thể từ chối báo giá.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  useEffect(() => {
    void loadPendingQuotations();
  }, []);

  useEffect(() => {
    if (statusFilter !== 'PENDING' && historyQuotes.length === 0) {
      void loadHistoryQuotations();
    }
  }, [statusFilter]);

  useEffect(() => {
    if (!showDepositPayment || isDepositPaid || !selectedQuote?.id) return;

    const quotationId = selectedQuote.id;
    const amount = Number(selectedQuote.deposit_amount ?? 0);
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

    const intervalId = window.setInterval(async () => {
      try {
        const result = await fetchPublic(
          `${apiBaseUrl}/api/payment/check-status?bookingCode=BG-${quotationId}&amount=${amount}`,
        );

        if (result?.success && result?.isPaid) {
          window.clearInterval(intervalId);
          setIsDepositPaid(true);
          setHistoryQuotes([]);
          await loadHistoryQuotations();
        }
      } catch (paymentError) {
        console.error('Không thể kiểm tra trạng thái thanh toán cọc:', paymentError);
      }
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [showDepositPayment, isDepositPaid, selectedQuote?.id]);

  const handleCopyDepositInfo = async (value: string) => {
    await navigator.clipboard.writeText(value);
  };

  const quotes = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const sourceQuotes =
      statusFilter === 'all'
        ? [...pendingQuotes, ...historyQuotes]
        : statusFilter === 'PENDING'
          ? pendingQuotes
          : historyQuotes;
    const rows = mapQuotationRows(sourceQuotes);

    return rows.filter((quote) => {
      const matchStatus = statusFilter === 'all' || quote.status === statusFilter;
      const matchKeyword =
        keyword === '' ||
        quote.code.toLowerCase().includes(keyword) ||
        quote.customerName.toLowerCase().includes(keyword) ||
        quote.customerPhone.toLowerCase().includes(keyword) ||
        quote.vehiclePlate.toLowerCase().includes(keyword) ||
        quote.vehicleName.toLowerCase().includes(keyword) ||
        quote.items.some((item) =>
          [
            getItemName(item),
            getIssueText(item),
            item.sparePart?.sku,
            item.sparePart?.brand,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(keyword)),
        );

      return matchStatus && matchKeyword;
    });
  }, [pendingQuotes, historyQuotes, searchTerm, statusFilter]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-6 text-left"
    >
      <div className="border-b border-gray-100 pb-5">
        <h2 className="text-2xl font-display font-bold text-[#00285E] tracking-tight">
          Theo dõi báo giá
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Kiểm tra báo giá đang chờ duyệt, tiền cọc phụ tùng và lịch sử báo giá đã xử lý.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm mã báo giá, xe, hạng mục, phụ tùng..."
              className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50/60 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#F9A11B] focus:bg-white transition-all"
            />
          </div>

          <div className="relative w-[210px] shrink-0">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as QuoteStatusFilter)}
              className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50/60 text-sm font-bold text-[#00285E] focus:outline-none focus:border-[#F9A11B] focus:bg-white transition-all appearance-none"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="PENDING_DEPOSIT">Chờ cọc</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Từ chối</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-xs p-12 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#F9A11B] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-400 mt-4">Đang tải báo giá...</span>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-rose-100 shadow-xs p-10 text-center">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-[#00285E]">{error}</p>
          <button
            onClick={reloadCurrentFilter}
            className="mt-4 px-5 py-2 rounded-xl bg-[#00285E] text-white text-xs font-bold hover:brightness-110 transition-all"
          >
            Thử lại
          </button>
        </div>
      ) : quotes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-xs p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mb-4">
            <ReceiptText className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[#00285E]">
            Chưa có báo giá nào
          </h3>
          <p className="text-sm text-slate-500 mt-2">
            Các báo giá liên quan đến xe của bạn sẽ được hiển thị tại đây.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th className="py-3 px-4 whitespace-nowrap">Đơn báo giá</th>
                  <th className="py-3 px-4 whitespace-nowrap">Khách hàng</th>
                  <th className="py-3 px-4 whitespace-nowrap">Xe</th>
                  <th className="py-3 px-4">Hạng mục</th>
                  <th className="py-3 px-4 whitespace-nowrap">Tổng tiền</th>
                  <th className="py-3 px-4 whitespace-nowrap">Trạng thái</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody>
            {quotes.map((quote) => {
              const statusMeta = getStatusMeta(quote.status);
              const StatusIcon = statusMeta.icon;
              const visibleItems = quote.items.slice(0, 2);
              const hiddenCount = quote.items.length - visibleItems.length;

              return (
                <tr
                  key={quote.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                >
                  <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                    <span className="font-bold text-[#00285E] text-xs block">{quote.code}</span>
                    <span className="text-[10px] text-slate-400">{formatDate(quote.createdAt)}</span>
                  </td>
                  <td className="py-3.5 px-4 align-middle">
                    <div className="min-w-[130px] max-w-[170px]">
                      <p className="font-semibold text-slate-700 text-xs truncate">{quote.customerName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{quote.customerPhone || '—'}</p>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 align-middle">
                    <div className="min-w-[110px] max-w-[140px]">
                      <p className="font-semibold text-slate-700 text-xs truncate">{quote.vehiclePlate || '—'}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {quote.vehicleName || '—'}{quote.vehicleColor && ` · ${quote.vehicleColor}`}
                      </p>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 align-middle">
                    <div className="flex flex-wrap gap-1 min-w-[170px] max-w-[240px]">
                      {visibleItems.map((item) => (
                        <span
                          key={item.id}
                          className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-600 font-medium"
                        >
                          {getItemName(item)}
                        </span>
                      ))}
                      {hiddenCount > 0 && (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-[#EDF3FF] text-[10px] text-[#00285E] font-bold">
                          +{hiddenCount} khác
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                    <span className="text-xs font-bold text-[#00285E]">{formatCurrency(quote.total_amount)}</span>
                  </td>
                  <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold border ${statusMeta.className}`}>
                        <StatusIcon size={11} className="shrink-0" />
                        {statusMeta.label}
                      </span>
                      {isAwaitingDeposit(quote) && quote.status !== 'PENDING_DEPOSIT' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Wallet size={11} className="shrink-0" />
                          Chờ cọc
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 align-middle">
                    <div className="flex items-center justify-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedQuote(quote)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#00285E] hover:bg-[#001E46] transition-colors shadow-sm"
                      >
                        <Eye size={13} />
                        Chi tiết
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedQuote && (() => {
        const statusMeta = getStatusMeta(selectedQuote.status);
        const StatusIcon = statusMeta.icon;
        const partItems = selectedQuote.items.filter((item) => !item.service_catalog);
        const serviceItems = selectedQuote.items.filter((item) => item.service_catalog);
        const depositItems = partItems.filter((item) => item.custom_item_name);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-[2px]">
            <div
              className="bg-white shadow-2xl overflow-hidden flex flex-col border border-slate-200"
              style={{
                width: 'min(700px, calc(100vw - 32px))',
                maxWidth: '700px',
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
                        Báo giá {selectedQuote.code}
                      </p>
                      <h3 className="text-xl font-extrabold tracking-tight mt-0.5">
                        Chi tiết báo giá
                      </h3>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedQuote(null);
                      setActionError('');
                      setRejectReason('');
                      setIsRejectModalOpen(false);
                      setShowDepositPayment(false);
                      setIsDepositPaid(false);
                    }}
                    className="w-9 h-9 rounded-xl text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto space-y-5 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-4">
                      Khách hàng
                    </p>
                    <div className="grid grid-cols-[70px_1fr] gap-y-3 text-sm">
                      <span className="text-slate-400">Tên</span>
                      <span className="font-semibold text-slate-700">{selectedQuote.customerName}</span>
                      <span className="text-slate-400">SĐT</span>
                      <span className="font-semibold text-slate-700">{selectedQuote.customerPhone || '—'}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-4">
                      Phương tiện
                    </p>
                    <div className="grid grid-cols-[70px_1fr] gap-y-3 text-sm">
                      <span className="text-slate-400">Biển số</span>
                      <span className="font-semibold text-slate-700">{selectedQuote.vehiclePlate || '—'}</span>
                      <span className="text-slate-400">Tên xe</span>
                      <span className="font-semibold text-slate-700">
                        {selectedQuote.vehicleName || '—'}{selectedQuote.vehicleColor && ` · ${selectedQuote.vehicleColor}`}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-4">
                      Trạng thái
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${statusMeta.className}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusMeta.label}
                      </span>
                      {isAwaitingDeposit(selectedQuote) && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-xs font-bold text-amber-700">
                          <Wallet className="w-3.5 h-3.5" />
                          Chờ cọc {depositItems.length || 1} phụ tùng
                        </span>
                      )}
                    </div>
                    {Number(selectedQuote.deposit_amount ?? 0) > 0 && (
                      <p className="text-xs font-bold text-[#D97706] mt-3">
                        Cần thu cọc: {formatCurrency(selectedQuote.deposit_amount)}
                      </p>
                    )}
                    {selectedQuote.approved_at && (
                      <p className="text-xs text-slate-400 mt-2">
                        Duyệt lúc: {formatDate(selectedQuote.approved_at)}
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-4">
                      Ngày tạo
                    </p>
                    <p className="text-sm font-bold text-slate-700">
                      {formatDate(selectedQuote.createdAt)}
                    </p>
                    {selectedQuote.approval_method && (
                      <p className="text-xs text-slate-400 mt-3">
                        Phương thức duyệt: {selectedQuote.approval_method}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="text-base font-extrabold text-slate-800">
                    Hạng mục báo giá
                  </h4>
                  <span className="px-3 py-1 rounded-full bg-[#00285E] text-white text-xs font-extrabold">
                    {selectedQuote.items.length} hạng mục
                  </span>
                </div>

                {partItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-slate-600">
                      <Package className="w-4 h-4" />
                      <span className="text-xs font-extrabold uppercase tracking-widest">
                        Phụ tùng ({partItems.length})
                      </span>
                    </div>
                    <div className="rounded-xl border border-slate-200/80 overflow-hidden">
                      <table className="w-full min-w-[580px] text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-[11px] uppercase tracking-widest text-slate-400">
                            <th className="px-3 py-3">Hạng mục lỗi</th>
                            <th className="px-3 py-3">Phụ tùng</th>
                            <th className="px-3 py-3 text-center">SL</th>
                            <th className="px-3 py-3 text-right">Đơn giá</th>
                            <th className="px-3 py-3 text-right">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {partItems.map((item) => {
                            const isCustom = !!item.custom_item_name;

                            return (
                              <tr key={item.id} className="bg-white">
                                <td className="px-3 py-3.5">
                                  <p className="text-xs font-semibold text-slate-700">{getIssueText(item).split(' - ')[0]}</p>
                                  <p className="text-xs text-slate-400 mt-1">{item.issue?.error_description || '—'}</p>
                                </td>
                                <td className="px-3 py-3.5">
                                  <p className="text-xs font-semibold text-slate-700">{getItemName(item)}</p>
                                  {isCustom && (
                                    <span className="inline-flex mt-2 px-2 py-1 rounded-full bg-[#FFF3DA] text-[#C05600] text-[11px] font-semibold">
                                      Phụ tùng đặt riêng · Cọc 30%
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-3.5 text-center text-slate-600">{item.quantity}</td>
                                <td className="px-3 py-3.5 text-right text-slate-700">{formatCurrency(item.unit_price)}</td>
                                <td className="px-3 py-3.5 text-right font-extrabold text-[#00285E]">{formatCurrency(item.amount)}</td>
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
                        Dịch vụ ({serviceItems.length})
                      </span>
                    </div>
                    <div className="rounded-xl border border-slate-200/80 overflow-hidden">
                      <table className="w-full min-w-[580px] text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-[11px] uppercase tracking-widest text-slate-400">
                            <th className="px-3 py-3">Hạng mục lỗi</th>
                            <th className="px-3 py-3">Dịch vụ</th>
                            <th className="px-3 py-3 text-right">Giá sửa chữa</th>
                            <th className="px-3 py-3 text-right">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {serviceItems.map((item) => (
                            <tr key={item.id} className="bg-white">
                              <td className="px-3 py-3.5">
                                <p className="text-xs font-semibold text-slate-700">{getIssueText(item).split(' - ')[0]}</p>
                                <p className="text-xs text-slate-400 mt-1">{item.issue?.error_description || '—'}</p>
                              </td>
                              <td className="px-3 py-3.5 text-slate-700 font-semibold">{getItemName(item)}</td>
                              <td className="px-3 py-3.5 text-right text-slate-700">{formatCurrency(item.repair_price)}</td>
                              <td className="px-3 py-3.5 text-right font-extrabold text-[#00285E]">{formatCurrency(item.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-4">
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                    Ghi chú
                  </p>
                  <p className="text-sm text-slate-600">{selectedQuote.note || 'Không có ghi chú.'}</p>
                </div>
              </div>

              <div className="shrink-0 px-7 py-4 border-t border-slate-200 bg-white flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                    Tổng cộng
                  </p>
                  <p className="text-xl font-extrabold text-[#00285E] mt-1">
                    {formatCurrency(selectedQuote.total_amount)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {actionError && (
                    <p className="max-w-[330px] text-right text-xs font-semibold text-rose-600">
                      {actionError}
                    </p>
                  )}
                  {selectedQuote.status === 'PENDING' && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={isSubmittingAction}
                        onClick={() => {
                          setActionError('');
                          setIsRejectModalOpen(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-rose-200 bg-white text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <XCircle className="w-4 h-4" />
                        Từ chối
                      </button>
                      <button
                        type="button"
                        disabled={isSubmittingAction}
                        onClick={() => void handleApproveQuotation()}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#00285E] text-sm font-bold text-white hover:bg-[#001E46] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {isSubmittingAction ? 'Đang xử lý...' : 'Duyệt báo giá'}
                      </button>
                    </div>
                  )}
                  {isAwaitingDeposit(selectedQuote) && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDepositPaid(false);
                        setShowDepositPayment(true);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-amber-600/20 transition-all hover:brightness-105"
                    >
                      <Wallet className="h-4 w-4" />
                      Thanh toán cọc
                    </button>
                  )}
                </div>
              </div>
            </div>

            {isRejectModalOpen && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4">
                <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-rose-500">
                        Từ chối báo giá
                      </p>
                      <h4 className="mt-1 text-lg font-extrabold text-[#00285E]">
                        Nhập lý do từ chối
                      </h4>
                    </div>
                    <button
                      type="button"
                      disabled={isSubmittingAction}
                      onClick={() => {
                        setIsRejectModalOpen(false);
                        setActionError('');
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="px-6 py-5">
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Lý do từ chối
                    </label>
                    <textarea
                      rows={4}
                      value={rejectReason}
                      onChange={(event) => {
                        setRejectReason(event.target.value);
                        if (actionError) setActionError('');
                      }}
                      placeholder="Nhập lý do bạn không đồng ý với báo giá..."
                      className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-rose-400"
                    />
                    {actionError && (
                      <p className="mt-2 text-xs font-semibold text-rose-600">{actionError}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                    <button
                      type="button"
                      disabled={isSubmittingAction}
                      onClick={() => {
                        setIsRejectModalOpen(false);
                        setActionError('');
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingAction || !rejectReason.trim()}
                      onClick={() => void handleRejectQuotation()}
                      className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmittingAction ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showDepositPayment && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4">
                <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-100 px-7 py-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                        <Wallet className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-lg font-extrabold text-slate-800">
                          Thanh toán tiền cọc
                        </h4>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Quét mã VietQR để thanh toán cọc phụ tùng đặt riêng.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDepositPayment(false);
                        setIsDepositPaid(false);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                            Số tiền cần cọc
                          </p>
                          <span className="rounded-md border border-amber-200 bg-white/70 px-2 py-1 text-[10px] font-bold text-amber-700">
                            {selectedQuote.code}
                          </span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-amber-600">
                          {formatCurrency(selectedQuote.deposit_amount)}
                        </p>
                        <div className="mt-3 space-y-2 border-t border-amber-200 pt-3">
                          {depositItems.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-xl border border-amber-100 bg-white/90 px-3 py-2.5"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-bold text-slate-700">
                                    {getItemName(item)}
                                  </p>
                                  <p className="mt-1 text-[11px] text-slate-500">
                                    Số lượng: {item.quantity} · Cọc 30%
                                  </p>
                                </div>
                                <span className="shrink-0 text-xs font-extrabold text-[#00285E]">
                                  {formatCurrency(item.amount)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          Khách hàng
                        </p>
                        <p className="mt-1.5 text-sm font-bold text-slate-700">
                          {selectedQuote.customerName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {selectedQuote.customerPhone || '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                      {!isDepositPaid ? (
                        <>
                          <div className="mb-3 flex w-full items-center justify-between border-b border-slate-200 pb-2">
                            <span className="text-xs font-bold uppercase tracking-wide text-[#00285E]">
                              Quét mã VietQR
                            </span>
                            <span className="rounded-md border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-700">
                              {import.meta.env.VITE_SEPAY_BANK || 'TPBank'}
                            </span>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                            <img
                              src={`https://vietqr.app/img?acc=${import.meta.env.VITE_SEPAY_ACC || '05979551201'}&bank=${import.meta.env.VITE_SEPAY_BANK || 'TPBank'}&amount=${selectedQuote.deposit_amount || 0}&template=compact&showinfo=true&addInfo=BG-${selectedQuote.id}`}
                              alt="Mã VietQR thanh toán cọc"
                              className="h-52 w-52 rounded-xl object-contain"
                            />
                          </div>
                          <div className="mt-3 w-full space-y-2 text-xs">
                            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                              <span className="text-slate-500">Số tài khoản</span>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleCopyDepositInfo(
                                    import.meta.env.VITE_SEPAY_ACC || '05979551201',
                                  )
                                }
                                className="flex items-center gap-1.5 font-mono font-bold text-[#00285E]"
                              >
                                {import.meta.env.VITE_SEPAY_ACC || '05979551201'}
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                              <span className="text-slate-500">Nội dung CK</span>
                              <button
                                type="button"
                                onClick={() => void handleCopyDepositInfo(`BG-${selectedQuote.id}`)}
                                className="flex items-center gap-1.5 font-mono font-bold text-[#00285E]"
                              >
                                BG-{selectedQuote.id}
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="mt-3 text-[11px] font-medium text-slate-500">
                            Hệ thống đang tự động chờ xác nhận tiền cọc...
                          </p>
                        </>
                      ) : (
                        <div className="my-auto flex flex-col items-center py-12">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <Check className="h-8 w-8" strokeWidth={3} />
                          </div>
                          <p className="mt-4 text-base font-extrabold text-emerald-700">
                            Thanh toán cọc thành công!
                          </p>
                          <p className="mt-2 max-w-[230px] text-xs leading-relaxed text-slate-500">
                            Hệ thống đã ghi nhận tiền cọc cho báo giá {selectedQuote.code}.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-6 py-3.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDepositPayment(false);
                        setIsDepositPaid(false);
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </motion.div>
  );
}
