import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Search,
  Calendar,
  X,
  Eye,
  CheckCircle2,
  Package,
  PackageCheck,
  StickyNote,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { useFetchClient } from "../../../hook/useFetchClient";
import { APPROVED_QUOTE_API_ENDPOINTS } from "../../../constants/inventory/approvedQuoteApiEndPoint";

const formatPrice = (v: number | string) =>
  Number(v).toLocaleString("vi-VN") + "đ";

const formatDate = (d: string) => {
  const date = new Date(d);
  return date.toLocaleDateString("vi-VN");
};

interface SparePartInfo {
  id: number;
  name: string;
  sku: string;
  stock_quantity: number;
}

interface QuotationItem {
  id: number;
  spare_part_id: number;
  quantity: number;
  unit_price: number;
  amount: number;
  sparePart: SparePartInfo;
}

interface ApprovedQuotation {
  id: number;
  service_order_id: number;
  total_amount: number;
  approved_at: string;
  note: string | null;
  createdAt: string;
  items: QuotationItem[];
}

export default function InventoryApprovedQuotes() {
  const { searchQuery, showToast } = useOutletContext<{
    searchQuery: string;
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();

  const { fetchPrivate } = useFetchClient();
  const [localSearch, setLocalSearch] = useState("");
  const [selected, setSelected] = useState<ApprovedQuotation | null>(null);
  const effectiveSearch = (searchQuery || localSearch).toLowerCase();

  const [quotations, setQuotations] = useState<ApprovedQuotation[]>([]);

  useEffect(() => {
    handleGetApprovedQuotes();
  }, []);

  const handleGetApprovedQuotes = async () => {
    try {
      const result = await fetchPrivate<ApprovedQuotation[]>(
        APPROVED_QUOTE_API_ENDPOINTS.APPROVED_QUOTES,
        "GET",
      );
      setQuotations(result.data);
    } catch (error) {
      console.error("Lỗi lấy danh sách báo giá đã duyệt", error);
    }
  };

  const handleExportStock = async (quotationId: number) => {
    try {
      await fetchPrivate(
        APPROVED_QUOTE_API_ENDPOINTS.APPROVE_EXPORT(quotationId),
        "POST",
      );
      showToast("Xuất kho thành công", "success");
      handleGetApprovedQuotes();
    } catch (error: any) {
      showToast(error?.message ?? "Xuất kho thất bại", "warning");
    }
  };

  const filtered = useMemo(() => {
    return quotations.filter(
      (q) =>
        String(q.id).includes(effectiveSearch) ||
        String(q.service_order_id).includes(effectiveSearch) ||
        (q.note ?? "").toLowerCase().includes(effectiveSearch) ||
        q.items.some(
          (item) =>
            item.sparePart.name.toLowerCase().includes(effectiveSearch) ||
            item.sparePart.sku.toLowerCase().includes(effectiveSearch),
        ),
    );
  }, [quotations, effectiveSearch]);

  const stats = useMemo(() => {
    const total = quotations.length;
    const totalParts = quotations.reduce((s, q) => s + q.items.length, 0);
    const totalValue = quotations.reduce((s, q) => s + Number(q.total_amount), 0);
    return { total, totalParts, totalValue };
  }, [quotations]);

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* TITLE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">
            Báo giá đã duyệt
          </h1>
          <p className="text-slate-500 text-sm">
            Danh sách báo giá đã được khách hàng duyệt — sẵn sàng xuất kho phụ
            tùng.
          </p>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {stats.total}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Báo giá đã duyệt
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[#EDF3FF] text-[#00285E]">
            <Package size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {stats.totalParts}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Tổng phụ tùng cần xuất
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
            <StickyNote size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatPrice(stats.totalValue)}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Tổng giá trị
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
              Danh sách báo giá
            </h2>
            <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
              {filtered.length} báo giá
            </span>
          </div>

          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Tìm mã báo giá, phụ tùng, SKU..."
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
                <th className="py-4 px-6">ID</th>
                <th className="py-4 px-4">Đơn DV</th>
                <th className="py-4 px-4">Phụ tùng</th>
                <th className="py-4 px-4">Tổng tiền</th>
                <th className="py-4 px-4">Ngày duyệt</th>
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
                    Không tìm thấy báo giá phù hợp...
                  </td>
                </tr>
              ) : (
                filtered.map((q) => (
                  <tr
                    key={q.id}
                    onClick={() => setSelected(q)}
                    className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-800 text-sm group-hover:text-[#00285E] transition-colors">
                        {q.id}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm font-semibold text-slate-700">
                      {q.service_order_id}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {q.items.slice(0, 2).map((item) => (
                          <span
                            key={item.id}
                            className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-xs font-semibold"
                          >
                            <Package size={11} className="text-slate-400" />
                            {item.sparePart.name}
                          </span>
                        ))}
                        {q.items.length > 2 && (
                          <span className="inline-flex items-center bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-xs font-bold">
                            +{q.items.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm font-bold text-slate-800">
                      {formatPrice(q.total_amount)}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                        <Calendar size={13} className="text-slate-400" />
                        {formatDate(q.approved_at)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(q);
                          }}
                          title="Xem chi tiết"
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportStock(q.id);
                          }}
                          title="Chấp nhận xuất kho"
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                        >
                          <PackageCheck size={15} />
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
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 leading-tight">
                      Báo giá #{selected.id}
                    </h3>
                    <span className="text-xs font-bold text-emerald-600">
                      Đã duyệt
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
                {/* Info grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Đơn dịch vụ
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {selected.service_order_id}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Ngày tạo
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {formatDate(selected.createdAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Ngày duyệt
                    </span>
                    <span className="text-sm font-bold text-emerald-700">
                      {formatDate(selected.approved_at)}
                    </span>
                  </div>
                </div>

                {/* Note */}
                {selected.note && (
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Ghi chú
                    </span>
                    <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3">
                      {selected.note}
                    </p>
                  </div>
                )}

                {/* Parts table */}
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Phụ tùng cần xuất kho
                  </span>
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-3">Phụ tùng</th>
                          <th className="py-2.5 px-3 text-center">SL cần</th>
                          <th className="py-2.5 px-3 text-center">Tồn kho</th>
                          <th className="py-2.5 px-3 text-right">Đơn giá</th>
                          <th className="py-2.5 px-3 text-right">
                            Thành tiền
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.items.map((item) => {
                          const isLowStock =
                            item.sparePart.stock_quantity < item.quantity;
                          return (
                            <tr
                              key={item.id}
                              className="border-t border-slate-100"
                            >
                              <td className="py-2.5 px-3">
                                <span className="text-sm font-bold text-slate-700 block">
                                  {item.sparePart.name}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {item.sparePart.sku}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center text-sm font-semibold text-slate-600">
                                {item.quantity}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`text-sm font-bold ${isLowStock ? "text-rose-600" : "text-emerald-600"}`}
                                >
                                  {item.sparePart.stock_quantity}
                                </span>
                                {isLowStock && (
                                  <span className="block text-[10px] font-bold text-rose-500 mt-0.5">
                                    Không đủ hàng
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right text-sm font-semibold text-slate-600">
                                {formatPrice(item.unit_price)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-sm font-bold text-slate-800">
                                {formatPrice(item.amount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Total */}
                <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-500">
                    Tổng giá trị
                  </span>
                  <span className="text-xl font-bold text-[#00285E]">
                    {formatPrice(selected.total_amount)}
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
