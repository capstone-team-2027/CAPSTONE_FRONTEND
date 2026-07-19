import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowUpFromLine,
  Search,
  Calendar,
  X,
  Package,
  Eye,
  Loader2,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { useFetchClient } from "../../../hook/useFetchClient";
import { EXPORT_LOG_API_ENDPOINTS } from "../../../constants/inventory/exportManagementApiEndPoint";

const formatPrice = (v: number | string) =>
  Number(v).toLocaleString("vi-VN") + "đ";

const formatDate = (d: string) => new Date(d).toLocaleDateString("vi-VN");

// 1 phiếu xuất đã gom theo receipt_code (GET /export)
interface ExportReceipt {
  receipt_code: string;
  exported_at: string;
  item_count: number;
  total_amount: number;
  manager_name: string;
}

// 1 dòng phụ tùng trong phiếu (GET /export/:receiptCode)
interface ExportDetailLine {
  id: number;
  receipt_code: string;
  createdAt: string;
  quantity: number;
  unit_price: number;
  part: { sku: string; name: string };
}

const lineTotal = (r: ExportDetailLine) => r.quantity * Number(r.unit_price);

export default function InventoryExport() {
  const { searchQuery } = useOutletContext<{
    searchQuery: string;
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();

  const { fetchPrivate } = useFetchClient();
  const [localSearch, setLocalSearch] = useState("");
  const effectiveSearch = (searchQuery || localSearch).toLowerCase();

  const [receipts, setReceipts] = useState<ExportReceipt[]>([]);

  // Modal chi tiết: phiếu đang mở + các dòng phụ tùng của nó
  const [selected, setSelected] = useState<ExportReceipt | null>(null);
  const [detailLines, setDetailLines] = useState<ExportDetailLine[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    handleGetExportHistory();
  }, []);

  const handleGetExportHistory = async () => {
    try {
      const result = await fetchPrivate<ExportReceipt[]>(
        EXPORT_LOG_API_ENDPOINTS.EXPORT_LOG,
        "GET",
      );
      setReceipts(result.data);
    } catch (error) {
      console.error("Lỗi lấy lịch sử xuất kho", error);
    }
  };

  const openDetail = async (receipt: ExportReceipt) => {
    setSelected(receipt);
    setDetailLines([]);
    setIsLoadingDetail(true);
    try {
      const result = await fetchPrivate<ExportDetailLine[]>(
        EXPORT_LOG_API_ENDPOINTS.EXPORT_DETAIL(receipt.receipt_code),
        "GET",
      );
      setDetailLines(result.data);
    } catch (error) {
      console.error("Lỗi lấy chi tiết phiếu xuất", error);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    setSelected(null);
    setDetailLines([]);
  };

  const filtered = useMemo(
    () =>
      receipts.filter(
        (r) =>
          (r.receipt_code ?? "").toLowerCase().includes(effectiveSearch) ||
          (r.manager_name ?? "").toLowerCase().includes(effectiveSearch),
      ),
    [receipts, effectiveSearch],
  );

  const stats = useMemo(() => {
    const totalReceipts = receipts.length;
    const totalValue = receipts.reduce(
      (s, r) => s + Number(r.total_amount),
      0,
    );
    return { totalReceipts, totalValue };
  }, [receipts]);

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* TITLE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">
            Lịch sử xuất kho
          </h1>
          <p className="text-slate-500 text-sm">
            Danh sách các phiếu xuất kho đã thực hiện.
          </p>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-orange-50 text-orange-600">
            <ArrowUpFromLine size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {stats.totalReceipts}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Tổng phiếu xuất
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600">
            <Package size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatPrice(stats.totalValue)}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Tổng giá trị xuất
            </p>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              Danh sách phiếu xuất
            </h2>
            <span className="bg-orange-50 text-orange-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
              {filtered.length} phiếu
            </span>
          </div>

          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Tìm mã phiếu, người xuất..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full sm:w-64 bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
            />
          </div>
        </div>

        {/* Table body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th className="py-4 px-6">Mã phiếu</th>
                <th className="py-4 px-4">Người xuất</th>
                <th className="py-4 px-4">Ngày xuất</th>
                <th className="py-4 px-4">Số phụ tùng</th>
                <th className="py-4 px-4">Tổng giá trị</th>
                <th className="py-4 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-14 text-center text-slate-400 text-sm"
                  >
                    Không tìm thấy phiếu xuất phù hợp...
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.receipt_code}
                    onClick={() => openDetail(r)}
                    className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6">
                      <span className="font-bold text-[#00285E] text-sm">
                        {r.receipt_code}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm font-semibold text-slate-700">
                      {r.manager_name}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                        <Calendar size={13} className="text-slate-400" />
                        {formatDate(r.exported_at)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-xs font-bold">
                        <Package size={11} className="text-slate-400" />
                        {r.item_count} phụ tùng
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm font-bold text-slate-800">
                      {formatPrice(r.total_amount)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(r);
                          }}
                          title="Xem chi tiết"
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
              onClick={closeDetail}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5"
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-7 py-5 shrink-0"
                style={{ backgroundColor: "#00285E" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center">
                    <ArrowUpFromLine size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">
                      {selected.receipt_code}
                    </h3>
                    <span className="text-xs font-semibold text-orange-300">
                      Phiếu xuất kho
                    </span>
                  </div>
                </div>
                <button
                  onClick={closeDetail}
                  className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-7 py-6 space-y-5 bg-slate-50/50">
                {/* Thông tin phiếu */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                      Người xuất
                    </span>
                    <span className="text-sm font-semibold text-slate-800">
                      {selected.manager_name}
                    </span>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                      Ngày xuất
                    </span>
                    <span className="text-sm font-semibold text-slate-800">
                      {formatDate(selected.exported_at)}
                    </span>
                  </div>
                </div>

                {/* Phụ tùng đã xuất */}
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Package size={14} className="text-slate-500" />
                      Phụ tùng đã xuất
                    </label>
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: "#00285E", color: "#fff" }}
                    >
                      {selected.item_count} phụ tùng
                    </span>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
                    {isLoadingDetail ? (
                      <div className="py-12 flex items-center justify-center gap-2 text-slate-400 text-sm">
                        <Loader2 size={16} className="animate-spin" />
                        Đang tải chi tiết...
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[480px] text-left border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                              <th className="py-3 px-4 align-middle">Phụ tùng</th>
                              <th className="py-3 px-3 align-middle text-center w-16 whitespace-nowrap">
                                SL
                              </th>
                              <th className="py-3 px-4 align-middle text-right whitespace-nowrap">
                                Đơn giá
                              </th>
                              <th className="py-3 px-4 align-middle text-right whitespace-nowrap">
                                Thành tiền
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailLines.map((line) => (
                              <tr
                                key={line.id}
                                className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                              >
                                <td className="py-3 px-4">
                                  <span className="text-xs font-semibold text-slate-800 block truncate max-w-[220px]">
                                    {line.part.name}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    {line.part.sku}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center text-xs font-semibold text-slate-700">
                                  {line.quantity}
                                </td>
                                <td className="py-3 px-4 text-right whitespace-nowrap text-xs text-slate-600 font-medium">
                                  {formatPrice(line.unit_price)}
                                </td>
                                <td className="py-3 px-4 text-right whitespace-nowrap text-xs font-bold text-[#00285E]">
                                  {formatPrice(lineTotal(line))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 px-7 py-4 border-t border-slate-200 shrink-0 bg-white">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Tổng giá trị
                </span>
                <span className="text-lg font-bold text-[#00285E]">
                  {formatPrice(selected.total_amount)}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}