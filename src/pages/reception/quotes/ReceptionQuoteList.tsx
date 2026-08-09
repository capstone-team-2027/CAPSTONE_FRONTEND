import { useState, useMemo, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { GetQuotationResponse } from "../../../model/dto/quoteManagement.dto";
import {
  ArrowLeft,
  History,
  Search,
  Filter,
  FileText,
  ClipboardList,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  CheckCircle2,
  Clock,
  XCircle,
  Wrench,
  Package,
  Phone,
} from "lucide-react";
import { useFetchClient } from "../../../hook/useFetchClient";
import { useSocket } from "../../../hook/useSocket";
import { QUOTE_MANAGEMENT_ENDPOINTS } from "../../../constants/reception/quoteManagementEndpoints";

interface QuotationRow extends GetQuotationResponse {
  code: string;
  customerName: string;
  customerPhone: string;
  vehiclePlate: string;
  vehicleName: string;
  vehicleColor: string;
}

const QUOTATION_STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: React.ElementType }
> = {
  PENDING: {
    label: "Chờ xác nhận với khách",
    className: "bg-amber-50 text-amber-600 border border-amber-200",
    icon: Clock,
  },
  PENDING_DEPOSIT: {
    label: "Chờ đặt cọc",
    className: "bg-orange-50 text-orange-600 border border-orange-200",
    icon: Clock,
  },
  APPROVED: {
    label: "Đã duyệt",
    className: "bg-emerald-50 text-emerald-600 border border-emerald-200",
    icon: CheckCircle2,
  },
  EXPORTED: {
    label: "Đã xuất kho",
    className: "bg-violet-50 text-violet-700 border border-violet-200",
    icon: Package,
  },
  REJECTED: {
    label: "Từ chối",
    className: "bg-rose-50 text-rose-600 border border-rose-200",
    icon: XCircle,
  },
};

const DEFAULT_STATUS = {
  label: "Không rõ",
  className: "bg-slate-50 text-slate-500 border border-slate-200",
  icon: AlertCircle,
};

const ITEMS_PER_PAGE = 5;

const formatVND = (value: number | string) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value) || 0)} VND`;

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function ReceptionQuoteList() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<GetQuotationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationRow | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const { fetchPrivate } = useFetchClient();
  const socket = useSocket();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();

  const handleGetQuotationHistory = async () => {
    setIsLoading(true);
    try {
      const result = await fetchPrivate(QUOTE_MANAGEMENT_ENDPOINTS.QUOTE_MANAGEMENT, "GET");
      setQuotations(result.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleGetQuotationHistory();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = () => handleGetQuotationHistory();
    socket.on("new_notification", handleNewNotification);
    return () => {
      socket.off("new_notification", handleNewNotification);
    };
  }, [socket]);

  const quotationRows = useMemo<QuotationRow[]>(() => {
    const rows: QuotationRow[] = quotations.map((q) => {
      const vehicle = q.task?.serviceOrder?.vehicle;
      const customer = vehicle?.customer;
      return {
        ...q,
        code: "",
        customerName: customer?.name || customer?.user?.fullName || "Khách vãng lai",
        customerPhone: customer?.phone || customer?.user?.phoneNumber || "",
        vehiclePlate: vehicle?.license_plate || "",
        vehicleName: vehicle?.model?.model_name || "",
        vehicleColor: vehicle?.color || "",
      };
    });
    const counters: Record<string, number> = {};
    [...rows]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .forEach((row) => {
        const d = new Date(row.createdAt);
        const dateKey = `${String(d.getDate()).padStart(2, "0")}${String(d.getMonth() + 1).padStart(2, "0")}${d.getFullYear()}`;
        counters[dateKey] = (counters[dateKey] ?? 0) + 1;
        row.code = `BG-${dateKey}-${String(counters[dateKey]).padStart(2, "0")}`;
      });
    return rows;
  }, [quotations]);

  const filteredQuotations = useMemo(() => {
    return quotationRows.filter((q) => {
      const keyword = searchTerm.toLowerCase();
      const matchSearch =
        searchTerm === "" ||
        q.code.toLowerCase().includes(keyword) ||
        q.customerName.toLowerCase().includes(keyword) ||
        q.vehiclePlate.toLowerCase().includes(keyword);
      const matchStatus = statusFilter === "all" || q.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [searchTerm, statusFilter, quotationRows]);

  const totalPages = Math.ceil(filteredQuotations.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredQuotations.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredQuotations, currentPage]);

  const getStatusConfig = (status?: string) => (status && QUOTATION_STATUS_CONFIG[status]) || DEFAULT_STATUS;

  const kpiCounts = useMemo(
    () => ({
      pending: quotations.filter((q) => q.status === "PENDING").length,
      approved: quotations.filter((q) => q.status === "APPROVED").length,
      rejected: quotations.filter((q) => q.status === "REJECTED").length,
    }),
    [quotations],
  );

  const openQuotationDetail = (q: QuotationRow) => setSelectedQuotation(q);
  const closeQuotationDetail = () => setSelectedQuotation(null);

  const handleApproveQuotation = async () => {
    if (!selectedQuotation) return;
    setIsApproving(true);
    try {
      await fetchPrivate(QUOTE_MANAGEMENT_ENDPOINTS.APPROVE_QUOTE(selectedQuotation.id), "PATCH");
      showToast("Đã duyệt báo giá thay khách!", "success");
      closeQuotationDetail();
      await handleGetQuotationHistory();
    } catch (error: any) {
      console.error(error);
      showToast(error?.message || "Không thể duyệt báo giá.", "warning");
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* HEADER */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(-1)}
          title="Quay lại"
          className="mt-0.5 w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#00285E] hover:border-slate-300 active:scale-[0.97] transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2 flex items-center gap-2">
            <History className="text-[#F9A11B]" size={28} />
            Báo giá chờ xác nhận
          </h1>
          <p className="text-slate-500 text-sm">
            Gọi điện hoặc gửi PDF qua Zalo cho khách xác nhận, sau đó hỗ trợ duyệt hộ.
          </p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Đang chờ xác nhận", value: kpiCounts.pending, icon: <Clock size={22} />, color: "#D97706", bg: "#FEF3C7" },
          { label: "Đã duyệt", value: kpiCounts.approved, icon: <CheckCircle2 size={22} />, color: "#10B981", bg: "#ECFDF5" },
          { label: "Bị từ chối", value: kpiCounts.rejected, icon: <XCircle size={22} />, color: "#E11D48", bg: "#FFF1F2" },
        ].map((card, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  {card.label}
                </span>
                <span className="text-2xl font-bold text-slate-900 tracking-tight block">{card.value}</span>
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: card.bg, color: card.color }}
              >
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH & FILTER */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-4">
        <div className="relative flex-1 group">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00285E] transition-colors"
          />
          <input
            type="text"
            placeholder="Tìm theo mã báo giá, tên khách, biển số..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-11 pr-10 py-2.5 text-sm font-semibold placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 cursor-pointer hover:border-slate-300 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="PENDING">Chờ xác nhận</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Từ chối</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 size={48} className="mb-4 text-[#00285E] animate-spin" />
            <p className="text-lg font-semibold mb-1 text-slate-700">Đang tải danh sách báo giá...</p>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <AlertCircle size={48} className="mb-4 text-slate-300" />
            <p className="text-lg font-semibold mb-1">Không có báo giá nào</p>
            <p className="text-sm">Thử thay đổi từ khóa hoặc bộ lọc trạng thái.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th className="py-3 px-3 align-middle whitespace-nowrap">Đơn báo giá</th>
                  <th className="py-3 px-3 align-middle whitespace-nowrap">Khách hàng</th>
                  <th className="py-3 px-3 align-middle whitespace-nowrap">Xe</th>
                  <th className="py-3 px-3 align-middle whitespace-nowrap">Trạng thái</th>
                  <th className="py-3 px-3 align-middle text-center whitespace-nowrap w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((q) => {
                  const statusCfg = getStatusConfig(q.status);
                  const StatusIcon = statusCfg.icon;
                  return (
                    <tr key={q.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-3 align-middle whitespace-nowrap">
                        <span className="font-bold text-[#00285E] text-xs block">{q.code}</span>
                        <span className="text-[10px] text-slate-400">{formatDateTime(q.createdAt)}</span>
                      </td>
                      <td className="py-3.5 px-3 align-middle">
                        <div className="min-w-[120px] max-w-[160px]">
                          <p className="font-semibold text-slate-700 text-xs truncate">{q.customerName}</p>
                          <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                            <Phone size={9} />
                            {q.customerPhone}
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 align-middle">
                        <div className="min-w-[100px] max-w-[130px]">
                          <p className="font-semibold text-slate-700 text-xs truncate">{q.vehiclePlate || "—"}</p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {q.vehicleName}
                            {q.vehicleColor && ` · ${q.vehicleColor}`}
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 align-middle whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold ${statusCfg.className}`}>
                          {q.status === "PENDING" ? (
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                            </span>
                          ) : (
                            <StatusIcon size={11} className="shrink-0" />
                          )}
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 align-middle whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => openQuotationDetail(q)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#00285E] hover:brightness-125 transition-all"
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
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-400">
              Hiển thị {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredQuotations.length)} / {filteredQuotations.length} báo giá
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${page === currentPage ? "bg-[#00285E] text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL CHI TIẾT BÁO GIÁ (chỉ xem + duyệt, không sửa) */}
      {selectedQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeQuotationDetail} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5">
            <div className="relative flex items-start justify-between px-7 pt-7 pb-6 shrink-0 text-white overflow-hidden" style={{ backgroundColor: "#00285E" }}>
              <div className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-white/10" />
              <div className="absolute -bottom-14 -left-6 w-40 h-40 rounded-full bg-white/5" />
              <div className="relative flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl shrink-0" style={{ backgroundColor: "#F9A11B" }}>
                  <FileText size={24} className="text-white" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-white/80 uppercase tracking-widest">
                    Báo giá {selectedQuotation.code}
                  </p>
                  <h3 className="text-xl font-bold text-white leading-none">Chi tiết báo giá</h3>
                </div>
              </div>
              <button onClick={closeQuotationDetail} className="relative p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-7 py-6 space-y-5 bg-slate-50/50">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Khách hàng</span>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3">
                      <span className="w-14 shrink-0 text-xs text-slate-400">Tên</span>
                      <span className="text-sm font-semibold text-slate-800 truncate">{selectedQuotation.customerName}</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="w-14 shrink-0 text-xs text-slate-400">SĐT</span>
                      <span className="text-sm font-semibold text-slate-800 truncate">{selectedQuotation.customerPhone || "—"}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Phương tiện</span>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3">
                      <span className="w-16 shrink-0 text-xs text-slate-400">Biển số</span>
                      <span className="text-sm font-semibold text-slate-800 truncate">{selectedQuotation.vehiclePlate || "—"}</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="w-16 shrink-0 text-xs text-slate-400">Tên xe</span>
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {selectedQuotation.vehicleName || "—"}
                        {selectedQuotation.vehicleColor && ` · ${selectedQuotation.vehicleColor}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <label className="text-sm font-bold text-slate-700">Hạng mục báo giá</label>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#00285E", color: "#fff" }}>
                    {selectedQuotation.items.length} hạng mục
                  </span>
                </div>
                {(() => {
                  const partItems = selectedQuotation.items.filter((i) => i.sparePart || i.custom_item_name);
                  const serviceItems = selectedQuotation.items.filter((i) => i.service_catalog);
                  return (
                    <div className="space-y-5">
                      <div>
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <Package size={14} className="text-slate-500" />
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Phụ tùng</span>
                          <span className="text-[11px] font-semibold text-slate-400">({partItems.length})</span>
                        </div>
                        {partItems.length > 0 ? (
                          <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[480px] text-left border-collapse text-sm">
                                <thead>
                                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                                    <th className="py-2.5 px-4 align-middle">Phụ tùng</th>
                                    <th className="py-2.5 px-2 align-middle text-center w-14">SL</th>
                                    <th className="py-2.5 px-4 align-middle text-right whitespace-nowrap">Thành tiền</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {partItems.map((item) => (
                                    <tr key={item.id} className="border-b border-slate-100 last:border-0">
                                      <td className="py-3 px-4">
                                        <span className="text-xs font-semibold text-slate-800 truncate">
                                          {item.sparePart?.name || item.custom_item_name}
                                        </span>
                                      </td>
                                      <td className="py-3 px-2 text-center">
                                        <span className="text-xs font-semibold text-slate-700">{item.quantity}</span>
                                      </td>
                                      <td className="py-3 px-4 text-right whitespace-nowrap">
                                        <span className="text-xs font-bold text-[#00285E]">{formatVND(item.amount)}</span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic px-1">Không có phụ tùng.</p>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <Wrench size={14} className="text-slate-500" />
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Dịch vụ</span>
                          <span className="text-[11px] font-semibold text-slate-400">({serviceItems.length})</span>
                        </div>
                        {serviceItems.length > 0 ? (
                          <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[480px] text-left border-collapse text-sm">
                                <thead>
                                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                                    <th className="py-2.5 px-4 align-middle">Dịch vụ</th>
                                    <th className="py-2.5 px-4 align-middle text-right whitespace-nowrap">Thành tiền</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {serviceItems.map((item) => (
                                    <tr key={item.id} className="border-b border-slate-100 last:border-0">
                                      <td className="py-3 px-4">
                                        <span className="text-xs font-semibold text-slate-800 truncate">
                                          {item.service_catalog?.service_name || "Dịch vụ sửa chữa"}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 text-right whitespace-nowrap">
                                        <span className="text-xs font-bold text-[#00285E]">{formatVND(item.amount)}</span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic px-1">Không có dịch vụ.</p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <ClipboardList size={13} className="text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ghi chú</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedQuotation.note || "Không có ghi chú."}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between px-7 py-4 border-t border-slate-200 shrink-0 bg-white">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Tổng cộng</span>
                <span className="text-lg font-bold text-[#00285E]">{formatVND(selectedQuotation.total_amount)}</span>
              </div>
              {selectedQuotation.status === "PENDING" && (
                <button
                  onClick={() => void handleApproveQuotation()}
                  disabled={isApproving}
                  className="h-11 flex items-center gap-2 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isApproving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Khách đã đồng ý, duyệt hộ
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
