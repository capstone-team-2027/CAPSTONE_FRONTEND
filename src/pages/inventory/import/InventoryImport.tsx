import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowDownToLine,
  Search,
  Calendar,
  Plus,
  Trash2,
  AlertTriangle,
  X,
  Package,
  Eye,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import {
  type ImportSparePartResponse,
  type Suppliers,
  type Parts,
  type ImportSparePartRequest,
} from "../../../model/dto/importManagement.dto";
import { type GetPartCategory } from "../../../model/dto/sparePartCategory.dto";
import { useFetchClient } from "../../../hook/useFetchClient";
import { INVENTORY_LOG_API_ENDPOINTS } from "../../../constants/inventory/importManagementApiEndPoint";
import { type GetSupplierResponse } from "../../../model/dto/supplierManagement.dto";
import { SUPPLIER_API_ENDPOINTS } from "../../../constants/inventory/supplierApiEndPoint";
import { SPARE_PART_API_ENDPOINTS } from "../../../constants/inventory/sparePartApiEnPoint";
import type { SparePartResponse } from "../../../model/dto/sparePartManagement.dto";
import { PART_CATEGORY_API_ENDPOINTS } from "../../../constants/inventory/sparePartCategoryApiEndPoint"
const formatPrice = (v: number) => v.toLocaleString("vi-VN") + "đ";

const formatDate = (d: string) => {
  const date = new Date(d);
  return date.toLocaleDateString("vi-VN");
};

const lineTotal = (r: ImportSparePartResponse) => r.quantity * r.unit_price;

// Một dòng nhập trong form tạo phiếu - khớp với param `items` của importSparePart
interface ImportLineForm {
  mode: "existing" | "new";
  part_id: number | null;
  name: string;
  brand: string;
  category_id: number | null;
  warranty_period_months: number | null;
  warranty_km_limit: number | null;
  quantity: number;
  unit_price: number;
  retail_price: number;

  conflict?: {
    message: string;
    candidates: { id: number; sku: string; name: string; brand?: string }[];
    isExact: boolean;
  } | null;
  force: boolean;
}

const emptyLine = (): ImportLineForm => ({
  mode: "existing",
  part_id: null,
  name: "",
  brand: "",
  category_id: null,
  warranty_period_months: null,
  warranty_km_limit: null,
  quantity: 1,
  unit_price: 0,
  retail_price: 0,
  conflict: null,
   force: false
});

export default function ImportHistory() {
  const { searchQuery, showToast } = useOutletContext<{
    searchQuery: string;
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();

  const [localSearch, setLocalSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<ImportSparePartResponse | null>(null);
  const effectiveSearch = (searchQuery || localSearch).toLowerCase();
  const [inventoryLog, setInventoryLog] = useState<ImportSparePartResponse[]>([]);
  const { fetchPrivate, fetchPrivateFormGeneric} = useFetchClient();

  // ── Form tạo phiếu nhập ──
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [suppliers, setSuppliers] = useState<GetSupplierResponse[]>([]);
  const [parts, setParts] = useState<SparePartResponse[]>([]);
  const [categories, setCategories] = useState<GetPartCategory[]>([]);
  const [lines, setLines] = useState<ImportLineForm[]>([emptyLine()]);
  const [formError, setFormError] = useState<string | null>(null);
  const formErrorRef = useRef<HTMLDivElement>(null);

  const resetCreateForm = () => {
    setSupplierId(null);
    setLines([emptyLine()]);
    setFormError(null);
  };

  const updateLine = (index: number, patch: Partial<ImportLineForm>) => {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);

  const removeLine = (index: number) => {
    setLines((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index),
    );
  };

  const formTotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0),
    [lines],
  );

// Hàm lấy tất các nhà cung cấp
  useEffect(() => {
    handleGetSuppliers();
  }, []);

  const handleGetSuppliers = async () => {
    try {
      const result = await fetchPrivate<GetSupplierResponse[]>(
        SUPPLIER_API_ENDPOINTS.SUPPLIER_API,
        "GET",
      );
      setSuppliers(result.data);
    } catch (error) {
      console.error("Lỗi lấy danh sách ", error);
    }
  };

  // Hàm lấy tất các phụ tùng
  useEffect(() => {
    handleGetSpareParts();
  }, []);

  const handleGetSpareParts = async () => {
    try {
      const result = await fetchPrivate<SparePartResponse[]>(
        SPARE_PART_API_ENDPOINTS.SPARE_PART,
        "GET",
      );
      console.log("result category :", result.data);
      setParts(result.data);
    } catch (error) {
      console.error("Lỗi lấy danh sách", error);
    }
  };
  useEffect(() => {
    handleGetInventoryLog();
  }, []);

    // Hàm lấy tất các danh mục phụ tùng
  useEffect(() => {
    handleGetSparePartCategories();
  }, []);

  const handleGetSparePartCategories = async () => {
    try {
      const result = await fetchPrivate<SparePartResponse[]>(
        PART_CATEGORY_API_ENDPOINTS.PART_CATEGORY,
        "GET",
      );
      console.log("result category :", result.data);
      setCategories(result.data);
    } catch (error) {
      console.error("Lỗi lấy danh sách", error);
    }
  };
  useEffect(() => {
    handleGetInventoryLog();
  }, []);

    // Hàm lấy tất các hóa đơn nhập kho
  const handleGetInventoryLog = async () => {
    try {
      const result = await fetchPrivate<ImportSparePartResponse[]>(
        INVENTORY_LOG_API_ENDPOINTS.INVENTORY_LOG,
        "GET",
      );
      console.log("result:", result.data);
      setInventoryLog(result.data);
    } catch (error) {
      console.error("Lỗi lấy danh sách", error);
    }
  };

  // Hàm tạo hóa đơn nhập kho
  const handleCreateImport = async () => {
    setFormError(null);
    const payload: ImportSparePartRequest = {
      supplier_id: supplierId!,
      items: lines.map((line) => ({
        quantity: line.quantity,
        unit_price: line.unit_price,
        retail_price: line.retail_price || undefined,
        ...(line.mode === 'existing'
          ? { part_id: line.part_id! }
          : {
              name: line.name,
              brand: line.brand,
              category_id: line.category_id!,
              warranty_period_months: line.warranty_period_months ?? undefined,
              warranty_km_limit: line.warranty_km_limit ?? undefined,
            }),
        force: line.force,
      })),
    };
    try {
      await fetchPrivateFormGeneric(
        INVENTORY_LOG_API_ENDPOINTS.INVENTORY_LOG,
        'POST',
        payload,
      );
      showToast('Tạo phiếu nhập thành công', 'success');
      resetCreateForm();
      setCreateOpen(false);
      handleGetInventoryLog();
    } catch (err: any) {
      if (err?.status === 409) {
        const isExact = !Array.isArray(err.part);
        const conflictParts = isExact ? [err.part] : err.part;
        // Lấy tên sản phẩm từ message BE: `"Tên sản phẩm"`
        const nameInMsg = err.message?.match(/"([^"]+)"/)?.[1];
        const targetIndex = nameInMsg
          ? lines.findIndex((l) => l.mode === 'new' && l.name === nameInMsg)
          : lines.findIndex((l) => l.mode === 'new');
        updateLine(targetIndex >= 0 ? targetIndex : 0, {
          conflict: { message: err.message, candidates: conflictParts, isExact },
        });
      } else {
        setFormError(err?.message ?? 'Tạo phiếu nhập thất bại');
        setTimeout(() => formErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      }
    }
  };

  const filtered = useMemo(() => {
    return inventoryLog.filter(
      (r) =>
        (r.receipt_code ?? "").toLowerCase().includes(effectiveSearch) ||
        (r.supplier?.name ?? "").toLowerCase().includes(effectiveSearch) ||
        (r.part?.name ?? "").toLowerCase().includes(effectiveSearch),
    );
  }, [inventoryLog, effectiveSearch]);

  // Summary stats
  const stats = useMemo(() => {
    const totalReceipts = inventoryLog.length;
    const totalValue = inventoryLog.reduce((s, r) => s + lineTotal(r), 0);
    return { totalReceipts, totalValue };
  }, [inventoryLog]);

  console.log('formError state:', formError);

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* TITLE & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">
            Lịch sử nhập kho
          </h1>
          <p className="text-slate-500 text-sm">
            Danh sách các phiếu nhập kho đã thực hiện.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#00285E] text-white rounded-xl text-sm font-semibold shadow-md shadow-[#00285E]/10 hover:bg-[#082245] transition-all transform hover:translate-y-[-1px] active:translate-y-0 self-start"
        >
          <Plus size={16} />
          <span>Tạo phiếu nhập</span>
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[#EDF3FF] text-[#00285E]">
            <ArrowDownToLine size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {stats.totalReceipts}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Tổng dòng nhập
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
              Tổng giá trị nhập
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
              Danh sách phiếu nhập
            </h2>
            <span className="bg-[#EDF3FF] text-[#00285E] px-2.5 py-0.5 rounded-full text-xs font-bold">
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
              placeholder="Tìm mã phiếu, nhà cung cấp..."
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
                <th className="py-4 px-4">Nhà cung cấp</th>
                <th className="py-4 px-4">Phụ tùng</th>
                <th className="py-4 px-4">Ngày nhập</th>
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
                    Không tìm thấy phiếu nhập phù hợp...
                  </td>
                </tr>
              ) : (
                filtered.map((i) => (
                  <tr
                    key={i.id}
                    onClick={() => setSelected(i)}
                    className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-800 text-sm group-hover:text-[#00285E] transition-colors">
                        {i.receipt_code}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm font-semibold text-slate-700">
                      {i.supplier.name}
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-bold text-slate-700 block">
                        {i.part.name}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        {i.part.sku}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                        <Calendar size={13} className="text-slate-400" />
                        {formatDate(i.createdAt)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm font-semibold text-slate-600">
                      {i.quantity}
                    </td>
                    <td className="py-4 px-4 text-sm font-bold text-slate-800">
                      {formatPrice(lineTotal(i))}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(i);
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

      {/* ── RECEIPT DETAIL MODAL ── */}
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
                  <div className="w-9 h-9 rounded-xl bg-[#EDF3FF] text-[#00285E] flex items-center justify-center">
                    <ArrowDownToLine size={18} />
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
                      Nhà cung cấp
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {selected.supplier.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Ngày nhập
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
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Người tạo
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {selected.manager.fullName}
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

      {/* ── CREATE IMPORT MODAL ── */}
      <AnimatePresence>
        {createOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center py-4 px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCreateOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white z-10 shrink-0">
                <h3 className="text-lg font-bold text-slate-800">
                  Tạo phiếu nhập
                </h3>
                <button
                  onClick={() => setCreateOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 pt-6 pb-4 space-y-5 overflow-y-auto flex-1 pr-4">
                {/* Nhà cung cấp */}
                <label className="block">
                  <span className="text-xs font-bold text-slate-500 mb-1.5 block">
                    Nhà cung cấp
                  </span>
                  <select
                    value={supplierId ?? ""}
                    onChange={(e) =>
                      setSupplierId(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className={createInputCls}
                  >
                    <option value="">-- Chọn nhà cung cấp --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Danh sách dòng nhập */}
                <div className="space-y-3">
                  {lines.map((line, index) => (
                    <div
                      key={index}
                      className="border border-slate-200 rounded-xl p-4 space-y-3 relative"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                          <button
                            type="button"
                            onClick={() =>
                              updateLine(index, { mode: "existing" })
                            }
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${line.mode === "existing" ? "bg-white text-[#00285E] shadow-sm" : "text-slate-500"}`}
                          >
                            Phụ tùng có sẵn
                          </button>
                          <button
                            type="button"
                            onClick={() => updateLine(index, { mode: "new" })}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${line.mode === "new" ? "bg-white text-[#00285E] shadow-sm" : "text-slate-500"}`}
                          >
                            Phụ tùng mới
                          </button>
                        </div>
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                            title="Xóa dòng"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      {line.mode === "existing" ? (
                        <label className="block">
                          <span className="text-xs font-bold text-slate-500 mb-1.5 block">
                            Phụ tùng
                          </span>
                          <select
                            value={line.part_id ?? ""}
                            onChange={(e) =>
                              updateLine(index, {
                                part_id: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              })
                            }
                            className={createInputCls}
                          >
                            <option value="">-- Chọn phụ tùng --</option>
                            {parts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku})
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <label className="block col-span-2">
                            <span className="text-xs font-bold text-slate-500 mb-1.5 block">
                              Tên phụ tùng
                            </span>
                            <input
                              value={line.name}
                              onChange={(e) =>
                                updateLine(index, { name: e.target.value })
                              }
                              className={createInputCls}
                              placeholder="VD: Lọc nhớt Honda"
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs font-bold text-slate-500 mb-1.5 block">
                              Danh mục
                            </span>
                            <select
                              value={line.category_id ?? ""}
                              onChange={(e) =>
                                updateLine(index, {
                                  category_id: e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                })
                              }
                              className={createInputCls}
                            >
                              <option value="">-- Chọn danh mục --</option>
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.category_name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block">
                            <span className="text-xs font-bold text-slate-500 mb-1.5 block">
                              Thương hiệu
                            </span>
                            <input
                              value={line.brand}
                              onChange={(e) =>
                                updateLine(index, { brand: e.target.value })
                              }
                              className={createInputCls}
                              placeholder="VD: Honda"
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs font-bold text-slate-500 mb-1.5 block">
                              Bảo hành (tháng)
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={line.warranty_period_months != null ? line.warranty_period_months.toLocaleString('vi-VN') : ''}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                                updateLine(index, { warranty_period_months: raw ? Number(raw) : null });
                              }}
                              className={createInputCls}
                              placeholder="VD: 6"
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs font-bold text-slate-500 mb-1.5 block">
                              Bảo hành (km)
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={line.warranty_km_limit != null ? line.warranty_km_limit.toLocaleString('vi-VN') : ''}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                                updateLine(index, { warranty_km_limit: raw ? Number(raw) : null });
                              }}
                              className={createInputCls}
                              placeholder="VD: 5.000"
                            />
                          </label>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-3">
                        <label className="block">
                          <span className="text-xs font-bold text-slate-500 mb-1.5 block">
                            Số lượng
                          </span>
                          <input
                            type="number"
                            min={1}
                            value={line.quantity || ''}
                            onChange={(e) =>
                              updateLine(index, {
                                quantity: e.target.value ? Number(e.target.value) : 0,
                              })
                            }
                            className={createInputCls}
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-bold text-slate-500 mb-1.5 block">
                            Đơn giá nhập
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={line.unit_price ? line.unit_price.toLocaleString('vi-VN') : ''}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                              updateLine(index, { unit_price: raw ? Number(raw) : 0 });
                            }}
                            className={createInputCls}
                            placeholder="0"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-bold text-slate-500 mb-1.5 block">
                            Giá bán
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={line.retail_price ? line.retail_price.toLocaleString('vi-VN') : ''}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                              updateLine(index, { retail_price: raw ? Number(raw) : 0 });
                            }}
                            className={createInputCls}
                            placeholder="0"
                          />
                        </label>
                      </div>

                      <div className="text-right text-xs font-bold text-slate-400">
                        Thành tiền:{" "}
                        <span className="text-[#00285E]">
                          {formatPrice(line.quantity * line.unit_price)}
                        </span>
                      </div>

                      {/* Gợi ý khi BE trả 409 - trùng/giống phụ tùng đã có */}
                      {line.conflict && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <AlertTriangle
                              size={16}
                              className="text-amber-500 mt-0.5 shrink-0"
                            />
                            <p className="text-xs font-semibold text-amber-700">
                              {line.conflict.message}
                            </p>
                          </div>
                          {line.conflict.candidates.length > 0 && (
                            <div className="space-y-1.5">
                              {line.conflict.candidates.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() =>
                                    updateLine(index, {
                                      mode: "existing",
                                      part_id: c.id,
                                      conflict: null,
                                    })
                                  }
                                  className="w-full flex items-center justify-between gap-2 bg-white rounded-lg px-3 py-2 text-left hover:bg-amber-100/60 transition-colors border border-amber-100"
                                >
                                  <div className="flex items-center gap-2">
                                    <Package
                                      size={14}
                                      className="text-amber-500 shrink-0"
                                    />
                                    <span className="text-xs font-bold text-slate-700">
                                      {c.name}
                                    </span>
                                    {c.brand && (
                                      <span className="text-xs text-slate-400">
                                        ({c.brand})
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs font-semibold text-slate-400">
                                    {c.sku}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                          {/* Nút hành động khi có conflict */}
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => updateLine(index, { conflict: null })}
                              className="flex-1 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors border border-slate-200"
                            >
                              Hủy
                            </button>
                            {line.conflict!.isExact !== true && (
                              <button
                                type="button"
                                onClick={() => updateLine(index, { conflict: null, force: true })}
                                className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white bg-[#00285E] hover:bg-[#082245] transition-colors"
                              >
                                Tạo mới
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addLine}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-slate-300 text-sm font-bold text-slate-500 hover:border-[#00285E] hover:text-[#00285E] transition-colors"
                >
                  <Plus size={16} />
                  Thêm dòng
                </button>

                {formError && (
                  <div ref={formErrorRef} className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                    <AlertTriangle size={16} className="text-rose-500 mt-0.5 shrink-0" />
                    <p className="text-xs font-semibold text-rose-700">{formError}</p>
                  </div>
                )}

                <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-500">
                    Tổng giá trị phiếu
                  </span>
                  <span className="text-xl font-bold text-[#00285E]">
                    {formatPrice(formTotal)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 bg-white shrink-0">
                <button
                  onClick={() => {
                    resetCreateForm();
                    setCreateOpen(false);
                  }}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateImport}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#00285E] text-white hover:bg-[#082245] transition-colors shadow-md shadow-[#00285E]/10"
                >
                  Tạo phiếu nhập
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const createInputCls =
  "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all";
