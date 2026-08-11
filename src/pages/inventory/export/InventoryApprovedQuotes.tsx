import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar,
  X,
  Eye,
  CheckCircle2,
  Package,
  PackageCheck,
  StickyNote,
  AlertCircle,
  Loader2,
  User,
} from "lucide-react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useFetchClient } from "../../../hook/useFetchClient";
import { useSocket } from "../../../hook/useSocket";
import { EXPORT_REQUEST_API_ENDPOINTS } from "../../../constants/inventory/approvedQuoteApiEndPoint";

const PAGE_SIZE = 6;

const formatPrice = (v: number | string) =>
  Number(v).toLocaleString("vi-VN") + " VND";

const formatDate = (d: string) => new Date(d).toLocaleDateString("vi-VN");

interface SparePartInfo {
  id: number;
  sku: string;
  name: string;
  brand: string | null;
  stock_quantity: number;
}

interface RequestedByUser {
  id: number;
  fullName: string | null;
}

interface QuoteVehicleModel {
  id: number;
  model_name: string;
}

interface QuoteVehicle {
  id: number;
  license_plate: string | null;
  color: string | null;
  model?: QuoteVehicleModel | null;
}

// 1 dòng phụ tùng đang chờ duyệt (Quotation_Details status=REQUESTED)
interface ExportRequestItem {
  id: number;
  quantity: number;
  unit_price: number;
  amount: number;
  requested_by: number;
  createdAt: string;
  sparePart: SparePartInfo;
  requestedByUser: RequestedByUser;
  quotation: {
    id: number;
    task: {
      id: number;
      service_order_id: number;
      serviceOrder: { id: number; vehicle?: QuoteVehicle | null };
    };
  };
}

// Nhóm nhiều dòng của cùng 1 KTV + cùng 1 service order thành 1 "yêu cầu" hiển thị trên UI
interface GroupedRequest {
  key: string;
  code: string;
  technicianId: number;
  technicianName: string;
  serviceOrderId: number;
  vehicle?: QuoteVehicle | null;
  items: ExportRequestItem[];
  total_amount: number;
  createdAt: string;
}

const groupExportRequests = (rows: ExportRequestItem[]): GroupedRequest[] => {
  const map = new Map<string, GroupedRequest>();
  rows.forEach((row) => {
    const serviceOrderId = row.quotation.task.service_order_id;
    const key = `${row.requested_by}-${serviceOrderId}`;
    const existing = map.get(key);
    if (existing) {
      existing.items.push(row);
      existing.total_amount += Number(row.amount);
      if (new Date(row.createdAt) < new Date(existing.createdAt)) {
        existing.createdAt = row.createdAt;
      }
    } else {
      map.set(key, {
        key,
        code: "",
        technicianId: row.requested_by,
        technicianName: row.requestedByUser?.fullName || "Kỹ thuật viên",
        serviceOrderId,
        vehicle: row.quotation.task.serviceOrder.vehicle,
        items: [row],
        total_amount: Number(row.amount),
        createdAt: row.createdAt,
      });
    }
  });
  const groups = [...map.values()];
  const counters: Record<string, number> = {};
  [...groups]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .forEach((group) => {
      const d = new Date(group.createdAt);
      const dateKey = `${String(d.getDate()).padStart(2, "0")}${String(d.getMonth() + 1).padStart(2, "0")}${d.getFullYear()}`;
      counters[dateKey] = (counters[dateKey] ?? 0) + 1;
      group.code = `YC-${dateKey}-${String(counters[dateKey]).padStart(2, "0")}`;
    });
  return groups;
};

export default function InventoryApprovedQuotes() {
  const { searchQuery, showToast } = useOutletContext<{
    searchQuery: string;
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();

  const { fetchPrivate } = useFetchClient();
  const socket = useSocket();
  const navigate = useNavigate();
  const [localSearch, setLocalSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<GroupedRequest | null>(null);
  const effectiveSearch = (searchQuery || localSearch).toLowerCase();

  const [rows, setRows] = useState<ExportRequestItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const loadExportRequests = async () => {
    try {
      const result = await fetchPrivate<ExportRequestItem[]>(
        EXPORT_REQUEST_API_ENDPOINTS.GET_REQUESTS,
        "GET",
      );
      setRows(result.data ?? []);
    } catch (error) {
      console.error("Lỗi lấy danh sách yêu cầu xuất kho", error);
    }
  };

  useEffect(() => {
    void loadExportRequests();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = () => {
      void loadExportRequests();
    };
    socket.on("new_notification", handleNewNotification);
    return () => {
      socket.off("new_notification", handleNewNotification);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const handleApprove = async (group: GroupedRequest) => {
    setIsProcessing(true);
    try {
      const detailIds = group.items.map((item) => item.id);
      await fetchPrivate<{ receipt_code: string }>(
        EXPORT_REQUEST_API_ENDPOINTS.APPROVE,
        "POST",
        { detailIds },
      );
      showToast("Xuất kho thành công", "success");
      setSelected(null);
      void loadExportRequests();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Xuất kho thất bại", "warning");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (group: GroupedRequest) => {
    setIsProcessing(true);
    try {
      const detailIds = group.items.map((item) => item.id);
      await fetchPrivate(EXPORT_REQUEST_API_ENDPOINTS.REJECT, "POST", {
        detailIds,
        reason: rejectReason.trim() || undefined,
      });
      showToast("Đã từ chối yêu cầu xuất kho", "success");
      setIsRejectOpen(false);
      setRejectReason("");
      setSelected(null);
      void loadExportRequests();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Từ chối thất bại", "warning");
    } finally {
      setIsProcessing(false);
    }
  };

  // Sau khi duyệt, tự động tải PDF phiếu xuất kho ngay — cùng định dạng mẫu 04-VT
  // với phiếu trong lịch sử xuất kho (InventoryExport.tsx).
  const hasLowStock = useMemo(
    () => !!selected?.items.some((item) => item.sparePart.stock_quantity < item.quantity),
    [selected],
  );

  const groupedRequests = useMemo(() => groupExportRequests(rows), [rows]);

  const filtered = useMemo(() => {
    return groupedRequests.filter((group) => {
      return (
        group.code.toLowerCase().includes(effectiveSearch) ||
        group.technicianName.toLowerCase().includes(effectiveSearch) ||
        (group.vehicle?.license_plate ?? "").toLowerCase().includes(effectiveSearch) ||
        group.items.some(
          (item) =>
            item.sparePart.name.toLowerCase().includes(effectiveSearch) ||
            item.sparePart.sku.toLowerCase().includes(effectiveSearch),
        )
      );
    });
  }, [groupedRequests, effectiveSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const stats = useMemo(() => {
    const total = groupedRequests.length;
    const totalParts = groupedRequests.reduce((s, g) => s + g.items.length, 0);
    const totalValue = groupedRequests.reduce((s, g) => s + g.total_amount, 0);
    return { total, totalParts, totalValue };
  }, [groupedRequests]);

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* TITLE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(-1)}
            title="Quay lại"
            className="mt-0.5 w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-[#00285E] border border-[#00285E] text-white hover:bg-[#003C7D] hover:border-[#003C7D] active:scale-[0.97] transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">
              Yêu cầu xuất kho
            </h1>
            <p className="text-slate-500 text-sm">
              Duyệt hoặc từ chối các yêu cầu xuất phụ tùng do kỹ thuật viên gửi lên khi bắt đầu công việc.
            </p>
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{stats.total}</div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Yêu cầu chờ duyệt</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[#EDF3FF] text-[#00285E]">
            <Package size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{stats.totalParts}</div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Tổng phụ tùng cần xuất</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
            <StickyNote size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{formatPrice(stats.totalValue)}</div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Tổng giá trị</p>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Danh sách yêu cầu</h2>
            <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
              {filtered.length} yêu cầu
            </span>
          </div>

          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm mã yêu cầu, KTV, phụ tùng, SKU..."
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-64 bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th className="py-4 px-6">Mã yêu cầu</th>
                <th className="py-4 px-4">Kỹ thuật viên</th>
                <th className="py-4 px-4">Phụ tùng</th>
                <th className="py-4 px-4">Tổng tiền</th>
                <th className="py-4 px-4">Ngày yêu cầu</th>
                <th className="py-4 px-6">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400 text-sm">
                    Không có yêu cầu xuất kho nào phù hợp...
                  </td>
                </tr>
              ) : (
                pageItems.map((group) => (
                  <tr
                    key={group.key}
                    onClick={() => setSelected(group)}
                    className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6">
                      <span className="font-bold text-[#00285E] text-xs">{group.code}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 truncate max-w-[160px]">
                        <User size={13} className="text-slate-400 shrink-0" />
                        {group.technicianName}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {group.items.slice(0, 2).map((item) => (
                          <span
                            key={item.id}
                            className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-xs font-semibold"
                          >
                            <Package size={11} className="text-slate-400" />
                            {item.sparePart.name}
                          </span>
                        ))}
                        {group.items.length > 2 && (
                          <span className="inline-flex items-center bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-xs font-bold">
                            +{group.items.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm font-bold text-slate-800">{formatPrice(group.total_amount)}</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                        <Calendar size={13} className="text-slate-400" />
                        {formatDate(group.createdAt)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-start gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(group);
                          }}
                          title="Xem chi tiết"
                          className="h-8 flex items-center gap-1.5 px-3 rounded-lg text-[11px] font-bold text-white bg-[#00285E] hover:brightness-125 active:scale-[0.97] transition-all whitespace-nowrap"
                        >
                          <Eye size={13} />
                          Xem chi tiết
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs font-medium text-slate-400">
            Hiển thị {pageItems.length} / {filtered.length} yêu cầu
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${n === safePage ? "bg-[#00285E] text-white shadow-sm" : "border border-slate-200 text-slate-600 hover:bg-white"}`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── DETAIL MODAL ── */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5"
            >
              <div className="flex items-center justify-between px-7 py-5 shrink-0" style={{ backgroundColor: "#00285E" }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">Yêu cầu xuất kho {selected.code}</h3>
                    <span className="text-xs font-semibold text-amber-300">Chờ thủ kho duyệt</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-7 py-6 space-y-5 bg-slate-50/50">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
                      Kỹ thuật viên yêu cầu
                    </span>
                    <span className="text-sm font-semibold text-slate-800">{selected.technicianName}</span>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
                      Phương tiện
                    </span>
                    <span className="text-sm font-semibold text-slate-800">
                      {selected.vehicle?.license_plate || "—"}
                      {selected.vehicle?.model?.model_name && ` · ${selected.vehicle.model.model_name}`}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Package size={14} className="text-slate-500" />
                      Phụ tùng cần xuất kho
                    </label>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#00285E", color: "#fff" }}>
                      {selected.items.length} phụ tùng
                    </span>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                            <th className="py-3 px-4 align-middle">Phụ tùng</th>
                            <th className="py-3 px-3 align-middle text-center w-16 whitespace-nowrap">SL cần</th>
                            <th className="py-3 px-3 align-middle text-center w-20 whitespace-nowrap">Tồn kho</th>
                            <th className="py-3 px-4 align-middle text-right whitespace-nowrap">Đơn giá</th>
                            <th className="py-3 px-4 align-middle text-right whitespace-nowrap">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selected.items.map((item) => {
                            const isLowStock = item.sparePart.stock_quantity < item.quantity;
                            return (
                              <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-4">
                                  <span className="text-xs font-semibold text-slate-800 block truncate max-w-[200px]">
                                    {item.sparePart.name}
                                  </span>
                                  <span className="text-[11px] text-slate-400">{item.sparePart.sku}</span>
                                </td>
                                <td className="py-3 px-3 text-center text-xs font-semibold text-slate-700">{item.quantity}</td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`text-xs font-bold ${isLowStock ? "text-rose-600" : "text-slate-700"}`}>
                                    {item.sparePart.stock_quantity}
                                  </span>
                                  {isLowStock && (
                                    <span className="block text-[10px] font-semibold text-rose-500 mt-0.5">Không đủ</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right whitespace-nowrap text-xs text-slate-600 font-medium">
                                  {formatPrice(item.unit_price)}
                                </td>
                                <td className="py-3 px-4 text-right whitespace-nowrap text-xs font-bold text-[#00285E]">
                                  {formatPrice(item.amount)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {hasLowStock && (
                    <p className="flex items-center gap-1.5 text-xs text-rose-500 mt-2 px-1">
                      <AlertCircle size={13} className="shrink-0" />
                      Có phụ tùng không đủ tồn kho — chưa thể duyệt yêu cầu xuất kho này.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 px-7 py-4 border-t border-slate-200 shrink-0 bg-white">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Tổng giá trị</span>
                  <span className="text-lg font-bold text-[#00285E]">{formatPrice(selected.total_amount)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void handleApprove(selected)}
                    disabled={hasLowStock || isProcessing}
                    className="h-11 flex items-center gap-2 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <PackageCheck size={16} />
                        Duyệt xuất kho
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── REJECT MODAL ── */}
      <AnimatePresence>
        {isRejectOpen && selected && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRejectOpen(false)}
              className="absolute inset-0 bg-slate-900/55"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100">
                <h4 className="text-base font-bold text-[#00285E]">Từ chối yêu cầu xuất kho</h4>
              </div>
              <div className="px-6 py-5">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Lý do (không bắt buộc)</label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ví dụ: hết hàng, chờ nhập thêm..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-rose-300"
                />
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                <button
                  onClick={() => setIsRejectOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  onClick={() => void handleReject(selected)}
                  disabled={isProcessing}
                  className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60"
                >
                  {isProcessing ? "Đang xử lý..." : "Xác nhận từ chối"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
