import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Clock3, Eye, Filter, Package, ReceiptText, Search, Wallet, Wrench, X, XCircle } from 'lucide-react';
import { useFetchClient } from '../../../hook/useFetchClient';
import { PROFILE_API_ENDPOINTS } from '../../../constants/customer/profileApiEndpoint';
import type { GetQuotationResponse } from '../../../model/dto/quoteManagement.dto';

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
  Number(quote.deposit_amount ?? 0) > 0 &&
  !quote.deposit_paid_at &&
  quote.status !== 'REJECTED';

const getVehicleText = (quote: CustomerQuotationRow) => {
  const vehicle = quote.task?.serviceOrder?.vehicle;
  const model = quote.vehicleName || vehicle?.model?.model_name;
  const color = quote.vehicleColor || vehicle?.color;
  const plate = quote.vehiclePlate || vehicle?.license_plate;

  return [plate, [model, color].filter(Boolean).join(' · ')].filter(Boolean).join(' - ') || '—';
};

export default function QuoteTrackingTab() {
  const { fetchPrivate } = useFetchClient();
  const [pendingQuotes, setPendingQuotes] = useState<GetQuotationResponse[]>([]);
  const [historyQuotes, setHistoryQuotes] = useState<GetQuotationResponse[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<CustomerQuotationRow | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatusFilter>('PENDING');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    void loadPendingQuotations();
  }, []);

  useEffect(() => {
    if (statusFilter !== 'PENDING' && historyQuotes.length === 0) {
      void loadHistoryQuotations();
    }
  }, [statusFilter]);

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
                    onClick={() => setSelectedQuote(null)}
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
                <button
                  onClick={() => setSelectedQuote(null)}
                  className="px-6 py-2.5 rounded-xl bg-[#00285E] text-sm font-bold text-white hover:bg-[#001E46] transition-colors shadow-sm"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </motion.div>
  );
}
