import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowUpFromLine,
  Search,
  Calendar,
  X,
  Package,
  Eye,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { useFetchClient } from "../../../hook/useFetchClient";
import { EXPORT_LOG_API_ENDPOINTS } from "../../../constants/inventory/exportManagementApiEndPoint";

const formatPrice = (v: number | string) =>
  Number(v).toLocaleString("vi-VN") + "đ";

const formatDate = (d: string) => {
  const date = new Date(d);
  return date.toLocaleDateString("vi-VN");
};

interface ExportLogRecord {
  id: number;
  receipt_code: string;
  createdAt: string;
  type: string;
  quantity: number;
  unit_price: number;
  manager: { fullName: string };
  part: { sku: string; name: string };
}

const lineTotal = (r: ExportLogRecord) => r.quantity * Number(r.unit_price);

export default function InventoryExport() {
  const { searchQuery } = useOutletContext<{
    searchQuery: string;
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();

  const { fetchPrivate } = useFetchClient();
  const [localSearch, setLocalSearch] = useState("");
  const [selected, setSelected] = useState<ExportLogRecord | null>(null);
  const effectiveSearch = (searchQuery || localSearch).toLowerCase();
  const [exportLog, setExportLog] = useState<ExportLogRecord[]>([]);

  useEffect(() => {
    handleGetExportLog();
  }, []);

  const handleGetExportLog = async () => {
    try {
      const result = await fetchPrivate<ExportLogRecord[]>(
        EXPORT_LOG_API_ENDPOINTS.EXPORT_LOG,
        "GET",
      );
      setExportLog(result.data);
    } catch (error) {
      console.error("Lỗi lấy danh sách xuất kho", error);
    }
  };

  const filtered = useMemo(() => {
    return exportLog.filter(
      (r) =>
        (r.receipt_code ?? "").toLowerCase().includes(effectiveSearch) ||
        (r.part?.name ?? "").toLowerCase().includes(effectiveSearch) ||
        (r.part?.sku ?? "").toLowerCase().includes(effectiveSearch) ||
        (r.manager?.fullName ?? "").toLowerCase().includes(effectiveSearch),
    );
  }, [exportLog, effectiveSearch]);

  const stats = useMemo(() => {
    const totalReceipts = exportLog.length;
    const totalValue = exportLog.reduce((s, r) => s + lineTotal(r), 0);
    return { totalReceipts, totalValue };
  }, [exportLog]);

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
              Tổng dòng xuất
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
              {filtered.length} dòng
            </span>
          </div>

          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Tìm mã phiếu, phụ tùng..."
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
                <th className="py-4 px-4">Phụ tùng</th>
                <th className="py-4 px-4">Ngày xuất</th>
                <th className="py-4 px-4">Số lượng</th>
                <th className="py-4 px-4">Tổng giá trị</th>
                <th className="py-4 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-14 text-center text-slate-400 text-sm"
                  >
                    Không tìm thấy phiếu xuất phù hợp...
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-800 text-sm group-hover:text-[#00285E] transition-colors">
                        {r.receipt_code}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm font-semibold text-slate-700">
                      {r.manager.fullName}
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-bold text-slate-700 block">
                        {r.part.name}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        {r.part.sku}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                        <Calendar size={13} className="text-slate-400" />
                        {formatDate(r.createdAt)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm font-semibold text-slate-600">
                      {r.quantity}
                    </td>
                    <td className="py-4 px-4 text-sm font-bold text-slate-800">
                      {formatPrice(lineTotal(r))}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(r);
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
              onClick={() => setSelected(null)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                    <ArrowUpFromLine size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 leading-tight">
                      {selected.receipt_code}
                    </h3>
                    <span className="text-xs font-bold text-slate-400">
                      {selected.type}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Người xuất
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {selected.manager.fullName}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Ngày xuất
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {formatDate(selected.createdAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Phụ tùng
                    </span>
                    <span className="text-sm font-bold text-slate-800 block">
                      {selected.part.name}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {selected.part.sku}
                    </span>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3 text-center">SL</th>
                        <th className="py-2.5 px-3 text-right">Đơn giá</th>
                        <th className="py-2.5 px-3 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-slate-100">
                        <td className="py-2.5 px-3 text-center text-sm font-semibold text-slate-600">
                          {selected.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right text-sm font-semibold text-slate-600">
                          {formatPrice(selected.unit_price)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-sm font-bold text-slate-800">
                          {formatPrice(lineTotal(selected))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-500">
                    Tổng giá trị
                  </span>
                  <span className="text-xl font-bold text-[#00285E]">
                    {formatPrice(lineTotal(selected))}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
