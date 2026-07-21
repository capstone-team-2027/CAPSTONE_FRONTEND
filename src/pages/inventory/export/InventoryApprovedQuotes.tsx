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
  AlertCircle,
  Loader2,
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

interface QuotationCreator {
  id: number;
  fullName: string | null;
}

// task -> serviceOrder -> vehicle -> model/customer -> user
interface QuoteVehicleModel {
  id: number;
  model_name: string;
}

interface QuoteCustomerUser {
  id: number;
  fullName: string | null;
  phoneNumber: string | null;
}

interface QuoteCustomer {
  id: number;
  name: string | null;
  phone: string | null;
  user?: QuoteCustomerUser | null;
}

interface QuoteVehicle {
  id: number;
  color: string | null;
  license_plate: string | null;
  model?: QuoteVehicleModel | null;
  customer?: QuoteCustomer | null;
}

interface QuoteServiceOrder {
  id: number;
  vehicle?: QuoteVehicle | null;
}

interface QuoteTask {
  id: number;
  serviceOrder?: QuoteServiceOrder | null;
}

interface ApprovedQuotation {
  id: number;
  total_amount: number;
  approved_at: string;
  note: string | null;
  createdAt: string;
  items: QuotationItem[];
  creator?: QuotationCreator | null;
  task?: QuoteTask | null;
}

// Báo giá kèm mã BG-... sinh ở FE
interface QuotationRow extends ApprovedQuotation {
  code: string;
}

// Rút thông tin khách/xe/đơn dịch vụ từ cây task -> serviceOrder -> vehicle
const getQuoteInfo = (q: ApprovedQuotation) => {
  const vehicle = q.task?.serviceOrder?.vehicle;
  const customer = vehicle?.customer;
  return {
    serviceOrderId: q.task?.serviceOrder?.id ?? null,
    customerName: customer?.name || customer?.user?.fullName || "Khách vãng lai",
    customerPhone: customer?.phone || customer?.user?.phoneNumber || "",
    vehiclePlate: vehicle?.license_plate || "",
    vehicleName: vehicle?.model?.model_name || "",
    vehicleColor: vehicle?.color || "",
    creatorName: q.creator?.fullName || "",
  };
};

export default function InventoryApprovedQuotes() {
  const { searchQuery, showToast } = useOutletContext<{
    searchQuery: string;
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();

  const { fetchPrivate } = useFetchClient();
  const [localSearch, setLocalSearch] = useState("");
  const [selected, setSelected] = useState<QuotationRow | null>(null);
  const effectiveSearch = (searchQuery || localSearch).toLowerCase();

  const [quotations, setQuotations] = useState<ApprovedQuotation[]>([]);
  const [isExporting, setIsExporting] = useState(false);

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

  const handleExportStock = async (quotation: QuotationRow) => {
    setIsExporting(true);
    try {
      // BE lọc items theo detailIds -> phải gửi id các dòng phụ tùng cần xuất
      const detailIds = quotation.items.map((item) => item.id);
      await fetchPrivate(
        APPROVED_QUOTE_API_ENDPOINTS.APPROVE_EXPORT(quotation.id),
        "POST",
        { detailIds },
      );
      showToast("Xuất kho thành công", "success");
      setSelected(null);
      handleGetApprovedQuotes();
    } catch (error: any) {
      showToast(error?.message ?? "Xuất kho thất bại", "warning");
    } finally {
      setIsExporting(false);
    }
  };

  // Thiếu tồn kho ở bất kỳ dòng nào -> chặn xuất kho
  const hasLowStock = useMemo(
    () =>
      !!selected?.items.some(
        (item) => item.sparePart.stock_quantity < item.quantity,
      ),
    [selected],
  );

  // Thông tin khách/xe của báo giá đang mở
  const selectedInfo = useMemo(
    () =>
      selected
        ? getQuoteInfo(selected)
        : {
            serviceOrderId: null,
            customerName: "",
            customerPhone: "",
            vehiclePlate: "",
            vehicleName: "",
            vehicleColor: "",
            creatorName: "",
          },
    [selected],
  );

  // Gắn mã BG-ddMMyyyy-stt (stt theo thứ tự createdAt trong cùng ngày), đồng bộ
  // với cách đánh mã ở trang lịch sử báo giá bên lễ tân
  const quotationRows = useMemo(() => {
    const rows = quotations.map((q) => ({ ...q, code: "" }));
    const counters: Record<string, number> = {};
    [...rows]
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
      .forEach((row) => {
        const d = new Date(row.createdAt);
        const dateKey = `${String(d.getDate()).padStart(2, "0")}${String(
          d.getMonth() + 1,
        ).padStart(2, "0")}${d.getFullYear()}`;
        counters[dateKey] = (counters[dateKey] ?? 0) + 1;
        row.code = `BG-${dateKey}-${String(counters[dateKey]).padStart(2, "0")}`;
      });
    return rows;
  }, [quotations]);

  const filtered = useMemo(() => {
    return quotationRows.filter((q) => {
      const info = getQuoteInfo(q);
      return (
        q.code.toLowerCase().includes(effectiveSearch) ||
        info.customerName.toLowerCase().includes(effectiveSearch) ||
        info.vehiclePlate.toLowerCase().includes(effectiveSearch) ||
        (q.note ?? "").toLowerCase().includes(effectiveSearch) ||
        q.items.some(
          (item) =>
            item.sparePart.name.toLowerCase().includes(effectiveSearch) ||
            item.sparePart.sku.toLowerCase().includes(effectiveSearch),
        )
      );
    });
  }, [quotationRows, effectiveSearch]);

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
                <th className="py-4 px-6">Đơn báo giá</th>
                <th className="py-4 px-4">Người tạo</th>
                <th className="py-4 px-4">Phụ tùng</th>
                <th className="py-4 px-4">Tổng tiền</th>
                <th className="py-4 px-4">Ngày tạo</th>
                <th className="py-4 px-4">Trạng thái</th>
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
                    Không tìm thấy báo giá phù hợp...
                  </td>
                </tr>
              ) : (
                filtered.map((q) => {
                  const info = getQuoteInfo(q);
                  return (
                  <tr
                    key={q.id}
                    onClick={() => setSelected(q)}
                    className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6">
                      <span className="font-bold text-[#00285E] text-xs">
                        {q.code}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-semibold text-slate-700 truncate block max-w-[160px]">
                        {info.creatorName || "—"}
                      </span>
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
                        {formatDate(q.createdAt)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 whitespace-nowrap">
                        <CheckCircle2 size={11} />
                        Đã duyệt
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
                      </div>
                    </td>
                  </tr>
                  );
                })
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
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5"
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-7 py-5 shrink-0"
                style={{ backgroundColor: "#00285E" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">
                      Báo giá {selected.code}
                    </h3>
                    <span className="text-xs font-semibold text-emerald-300">
                      Đã duyệt · chờ xuất kho
                    </span>
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
                {/* Thông tin báo giá */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
                      Ngày tạo
                    </span>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-3">
                        <span className="w-16 shrink-0 text-xs text-slate-400">
                          Thời gian
                        </span>
                        <span className="text-sm font-semibold text-slate-800">
                          {formatDate(selected.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="w-16 shrink-0 text-xs text-slate-400">
                          Người tạo
                        </span>
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          {selectedInfo.creatorName || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
                      Ngày duyệt
                    </span>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-3">
                        <span className="w-16 shrink-0 text-xs text-slate-400">
                          Thời gian
                        </span>
                        <span className="text-sm font-semibold text-emerald-600">
                          {formatDate(selected.approved_at)}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="w-16 shrink-0 text-xs text-slate-400">
                          Trạng thái
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                          <CheckCircle2 size={11} />
                          Đã duyệt
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phụ tùng cần xuất kho */}
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Package size={14} className="text-slate-500" />
                      Phụ tùng cần xuất kho
                    </label>
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: "#00285E", color: "#fff" }}
                    >
                      {selected.items.length} phụ tùng
                    </span>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                            <th className="py-3 px-4 align-middle">Phụ tùng</th>
                            <th className="py-3 px-3 align-middle text-center w-16 whitespace-nowrap">
                              SL cần
                            </th>
                            <th className="py-3 px-3 align-middle text-center w-20 whitespace-nowrap">
                              Tồn kho
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
                          {selected.items.map((item) => {
                            const isLowStock =
                              item.sparePart.stock_quantity < item.quantity;
                            return (
                              <tr
                                key={item.id}
                                className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                              >
                                <td className="py-3 px-4">
                                  <span className="text-xs font-semibold text-slate-800 block truncate max-w-[200px]">
                                    {item.sparePart.name}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    {item.sparePart.sku}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center text-xs font-semibold text-slate-700">
                                  {item.quantity}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span
                                    className={`text-xs font-bold ${isLowStock ? "text-rose-600" : "text-slate-700"}`}
                                  >
                                    {item.sparePart.stock_quantity}
                                  </span>
                                  {isLowStock && (
                                    <span className="block text-[10px] font-semibold text-rose-500 mt-0.5">
                                      Không đủ
                                    </span>
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
                      Có phụ tùng không đủ tồn kho — không thể xuất kho báo giá
                      này.
                    </p>
                  )}
                </div>

                {/* Ghi chú */}
                <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <StickyNote size={13} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Ghi chú
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {selected.note || "Không có ghi chú."}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 px-7 py-4 border-t border-slate-200 shrink-0 bg-white">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Tổng giá trị
                  </span>
                  <span className="text-lg font-bold text-[#00285E]">
                    {formatPrice(selected.total_amount)}
                  </span>
                </div>
                <button
                  onClick={() => handleExportStock(selected)}
                  disabled={hasLowStock || isExporting}
                  className="h-11 flex items-center gap-2 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100"
                >
                  {isExporting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Đang xuất kho...
                    </>
                  ) : (
                    <>
                      <PackageCheck size={16} />
                      Xác nhận xuất kho
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
