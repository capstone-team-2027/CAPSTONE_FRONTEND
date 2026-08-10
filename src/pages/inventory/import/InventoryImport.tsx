import { useState, useMemo, useEffect, useRef, Fragment } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar,
  Plus,
  Trash2,
  AlertTriangle,
  AlertCircle,
  X,
  Package,
  Eye,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useOutletContext, useNavigate } from "react-router-dom";
import {
  type ImportReceipt,
  type ImportDetailLine,
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
import { RESTOCK_REQUEST_API_ENDPOINTS } from "../../../constants/inventory/restockRequestApiEndpoint";
const PAGE_SIZE = 6;

const formatPrice = (v: number) => v.toLocaleString("vi-VN") + " VND";

const formatDate = (d: string) => {
  const date = new Date(d);
  return date.toLocaleDateString("vi-VN");
};

const lineTotal = (r: ImportDetailLine) => r.quantity * r.unit_price;

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

// 1 dòng trong bảng preview sau khi đọc file Excel yêu cầu bổ sung phụ tùng (Restock_Requests)
// — khớp shape trả về của previewImportRestockExcel ở BE.
interface RestockPreviewRow {
  row_index: number;
  isValid: boolean;
  error?: string;
  spare_part_id?: number;
  sku?: string;
  name?: string;
  quantity?: number;
  unit_price?: number;
  retail_price?: number;
  category_name?: string | null;
  warranty_period_months?: number | null;
  warranty_km_limit?: number | null;
}

export default function ImportHistory() {
  const { searchQuery, showToast } = useOutletContext<{
    searchQuery: string;
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();

  const navigate = useNavigate();
  const [localSearch, setLocalSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<ImportReceipt | null>(null);
  const effectiveSearch = (searchQuery || localSearch).toLowerCase();
  const [inventoryLog, setInventoryLog] = useState<ImportReceipt[]>([]);
  // Chi tiết phụ tùng của phiếu đang mở (gọi riêng khi bấm vào dòng)
  const [detailLines, setDetailLines] = useState<ImportDetailLine[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
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

  // ── Nhập kho từ Excel (yêu cầu bổ sung phụ tùng thiếu tồn — Restock_Requests) ──
  const [excelImportOpen, setExcelImportOpen] = useState(false);
  const [excelSupplierId, setExcelSupplierId] = useState<number | null>(null);
  const [excelPreviewRows, setExcelPreviewRows] = useState<RestockPreviewRow[]>([]);
  const [isExcelPreviewing, setIsExcelPreviewing] = useState(false);
  const [isExcelConfirming, setIsExcelConfirming] = useState(false);
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  const resetExcelImportForm = () => {
    setExcelSupplierId(null);
    setExcelPreviewRows([]);
  };

  const handlePickExcelFile = () => excelFileInputRef.current?.click();

  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIsExcelPreviewing(true);
    setExcelPreviewRows([]);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("token");
      const res = await fetch(RESTOCK_REQUEST_API_ENDPOINTS.IMPORT_EXCEL_PREVIEW, {
        method: "POST",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Không thể đọc file Excel");
      setExcelPreviewRows(data?.data ?? []);
    } catch (error: any) {
      showToast(error?.message || "Không thể đọc file Excel.", "warning");
    } finally {
      setIsExcelPreviewing(false);
    }
  };

  const updateExcelPreviewRow = (
    rowIndex: number,
    field: "quantity" | "unit_price" | "retail_price",
    value: number,
  ) => {
    setExcelPreviewRows((prev) =>
      prev.map((row) => (row.row_index === rowIndex ? { ...row, [field]: Math.max(0, value) } : row)),
    );
  };

  const removeExcelPreviewRow = (rowIndex: number) => {
    setExcelPreviewRows((prev) => prev.filter((row) => row.row_index !== rowIndex));
  };

  const validExcelRows = excelPreviewRows.filter((row) => row.isValid);

  const handleConfirmExcelImport = async () => {
    if (!excelSupplierId) {
      showToast("Vui lòng chọn nhà cung cấp.", "warning");
      return;
    }
    if (validExcelRows.length === 0) {
      showToast("Không có dòng hợp lệ nào để nhập kho.", "warning");
      return;
    }
    setIsExcelConfirming(true);
    try {
      const result = await fetchPrivate<{
        receipt_code: string;
        fulfilled: { spare_part_id: number; name: string; count: number }[];
        stillPending: { spare_part_id: number; name: string; stillNeeded: number }[];
      }>(RESTOCK_REQUEST_API_ENDPOINTS.CONFIRM_IMPORT, "POST", {
        supplier_id: excelSupplierId,
        items: validExcelRows.map((row) => ({
          spare_part_id: row.spare_part_id,
          quantity: row.quantity,
          unit_price: row.unit_price,
          retail_price: row.retail_price,
        })),
      });
      const fulfilledCount = result.data?.fulfilled?.length ?? 0;
      const stillPendingCount = result.data?.stillPending?.length ?? 0;
      showToast(
        `Đã nhập kho thành công${fulfilledCount ? ` — ${fulfilledCount} phụ tùng đã đủ tồn` : ""}${
          stillPendingCount ? `, ${stillPendingCount} phụ tùng vẫn còn thiếu` : ""
        }.`,
        "success",
      );
      resetExcelImportForm();
      setExcelImportOpen(false);
      await handleGetInventoryLog();
    } catch (error: any) {
      showToast(error?.message || "Không thể xác nhận nhập kho.", "warning");
    } finally {
      setIsExcelConfirming(false);
    }
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
      const result = await fetchPrivate<ImportReceipt[]>(
        INVENTORY_LOG_API_ENDPOINTS.INVENTORY_LOG,
        "GET",
      );
      setInventoryLog(result.data);
    } catch (error) {
      console.error("Lỗi lấy danh sách", error);
    }
  };

  // Mở phiếu -> gọi API lấy các dòng phụ tùng thuộc phiếu đó
  const openDetail = async (receipt: ImportReceipt) => {
    setSelected(receipt);
    setDetailLines([]);
    setIsLoadingDetail(true);
    try {
      const result = await fetchPrivate<ImportDetailLine[]>(
        INVENTORY_LOG_API_ENDPOINTS.IMPORT_DETAIL(receipt.receipt_code),
        "GET",
      );
      setDetailLines(result.data);
    } catch (error) {
      console.error("Lỗi lấy chi tiết phiếu nhập", error);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    setSelected(null);
    setDetailLines([]);
  };

  // Hàm tạo hóa đơn nhập kho
  const handleCreateImport = async () => {
    setFormError(null);
    const payload: ImportSparePartRequest = {
      supplier_id: supplierId!,
      items: lines.map((line) => ({
        quantity: line.quantity,
        unit_price: line.unit_price,
        retail_price: line.retail_price,
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
        (r.manager_name ?? "").toLowerCase().includes(effectiveSearch),
    );
  }, [inventoryLog, effectiveSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  // Summary stats
  const stats = useMemo(() => {
    const totalReceipts = inventoryLog.length;
    const totalValue = inventoryLog.reduce(
      (s, r) => s + Number(r.total_amount),
      0,
    );
    return { totalReceipts, totalValue };
  }, [inventoryLog]);

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* TITLE & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(-1)}
            title="Quay lại"
            className="mt-0.5 w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#00285E] hover:border-slate-300 active:scale-[0.97] transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">
              Lịch sử nhập kho
            </h1>
            <p className="text-slate-500 text-sm">
              Danh sách các phiếu nhập kho đã thực hiện.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setExcelImportOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all transform hover:translate-y-[-1px] active:translate-y-0 self-start"
          >
            <FileSpreadsheet size={16} />
            <span>Nhập kho từ Excel</span>
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#00285E] text-white rounded-xl text-sm font-semibold shadow-md shadow-[#00285E]/10 hover:bg-[#082245] transition-all transform hover:translate-y-[-1px] active:translate-y-0 self-start"
          >
            <Plus size={16} />
            <span>Tạo phiếu nhập</span>
          </button>
        </div>
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
              onChange={(e) => {
                setLocalSearch(e.target.value);
                setPage(1);
              }}
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
                <th className="py-4 px-4">Người nhập</th>
                <th className="py-4 px-4">Số phụ tùng</th>
                <th className="py-4 px-4">Ngày nhập</th>
                <th className="py-4 px-4">Tổng giá trị</th>
                <th className="py-4 px-6">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-14 text-center text-slate-400 text-sm"
                  >
                    Không tìm thấy phiếu nhập phù hợp...
                  </td>
                </tr>
              ) : (
                pageItems.map((r) => (
                  <tr
                    key={r.receipt_code}
                    onClick={() => openDetail(r)}
                    className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-800 text-sm group-hover:text-[#00285E] transition-colors">
                        {r.receipt_code}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm font-semibold text-slate-700">
                      {r.manager_name || "—"}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 bg-[#EDF3FF] text-[#00285E] px-2.5 py-1 rounded-full text-xs font-bold">
                        <Package size={12} />
                        {r.item_count} phụ tùng
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                        <Calendar size={13} className="text-slate-400" />
                        {formatDate(r.imported_at)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm font-bold text-slate-800">
                      {formatPrice(Number(r.total_amount))}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-start">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(r);
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

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs font-medium text-slate-400">
            Hiển thị {pageItems.length} / {filtered.length} phiếu nhập
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

      {/* ── RECEIPT DETAIL MODAL ── */}
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
                    <ArrowDownToLine size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">
                      {selected.receipt_code}
                    </h3>
                    <span className="text-xs font-semibold text-emerald-300">
                      Phiếu nhập kho
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
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
                      Thông tin nhập
                    </span>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-3">
                        <span className="w-20 shrink-0 text-xs text-slate-400">
                          Người nhập
                        </span>
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          {selected.manager_name || "—"}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="w-20 shrink-0 text-xs text-slate-400">
                          Ngày nhập
                        </span>
                        <span className="text-sm font-semibold text-slate-800">
                          {formatDate(selected.imported_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
                      Nhà cung cấp
                    </span>
                    <span className="text-sm font-semibold text-slate-800 leading-relaxed">
                      {detailLines[0]?.supplier?.name || "—"}
                    </span>
                  </div>
                </div>

                {/* Phụ tùng đã nhập */}
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Package size={14} className="text-slate-500" />
                      Phụ tùng đã nhập
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
                    ) : detailLines.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-sm">
                        Phiếu này chưa có phụ tùng nào.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px] text-left border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                              <th className="py-3 px-4 align-middle">
                                Phụ tùng
                              </th>
                              <th className="py-3 px-4 align-middle whitespace-nowrap">
                                Hãng
                              </th>
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
                                    {line.part?.name ?? "—"}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    {line.part?.sku ?? ""}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-xs font-semibold text-slate-600">
                                    {line.part?.brand || "—"}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center text-xs font-semibold text-slate-700">
                                  {line.quantity}
                                </td>
                                <td className="py-3 px-4 text-right whitespace-nowrap text-xs text-slate-600 font-medium">
                                  {formatPrice(Number(line.unit_price))}
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
                  {formatPrice(Number(selected.total_amount))}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── EXCEL IMPORT MODAL (yêu cầu bổ sung phụ tùng thiếu tồn) ── */}
      <AnimatePresence>
        {excelImportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setExcelImportOpen(false);
                resetExcelImportForm();
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00285E] to-[#1a4a8a] flex items-center justify-center shadow-md shadow-[#00285E]/20">
                    <FileSpreadsheet size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Nhập kho từ Excel</h3>
                    <p className="text-xs text-slate-400">
                      Xuất danh sách cần mua ở trang "Yêu cầu bổ sung phụ tùng", điền số lượng/giá rồi tải lên đây.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setExcelImportOpen(false);
                    resetExcelImportForm();
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <select
                    value={excelSupplierId ?? ""}
                    onChange={(e) => setExcelSupplierId(e.target.value ? Number(e.target.value) : null)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                  >
                    <option value="">-- Chọn nhà cung cấp --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <input
                    ref={excelFileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleExcelFileChange}
                  />
                  <button
                    onClick={handlePickExcelFile}
                    disabled={isExcelPreviewing}
                    className="h-9 flex items-center gap-1.5 px-4 rounded-lg text-xs font-bold text-[#00285E] bg-white border border-[#00285E]/25 hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    {isExcelPreviewing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    Chọn file Excel
                  </button>
                </div>

                {excelPreviewRows.length > 0 && (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">Kiểm tra trước khi nhập kho</span>
                      <span className="text-xs font-semibold text-slate-400">
                        {validExcelRows.length}/{excelPreviewRows.length} dòng hợp lệ
                      </span>
                    </div>
                    <div className="overflow-x-auto max-h-72 overflow-y-auto">
                      <table className="w-full min-w-[820px] text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                            <th className="py-2.5 px-4 w-56">Phụ tùng</th>
                            <th className="py-2.5 px-3 w-32">Danh mục</th>
                            <th className="py-2.5 px-3 text-center whitespace-nowrap w-24">BH (tháng/km)</th>
                            <th className="py-2.5 px-3 text-center whitespace-nowrap w-20">SL mua</th>
                            <th className="py-2.5 px-3 text-center whitespace-nowrap w-24">Giá nhập</th>
                            <th className="py-2.5 px-3 text-center whitespace-nowrap w-24">Giá bán</th>
                            <th className="py-2.5 px-3 text-center whitespace-nowrap w-20">Trạng thái</th>
                            <th className="py-2.5 px-3 w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {excelPreviewRows.map((row) => (
                            <tr key={row.row_index} className="border-b border-slate-100">
                              <td className="py-2 px-4">
                                {row.isValid ? (
                                  <>
                                    <span className="block text-xs font-semibold text-slate-800 truncate max-w-[13rem]" title={row.name}>
                                      {row.name}
                                    </span>
                                    <span className="block text-[10px] text-slate-400">{row.sku}</span>
                                  </>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">Dòng {row.row_index}</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                {row.isValid && (
                                  <span className="text-xs text-slate-600 truncate block max-w-[7rem]" title={row.category_name ?? undefined}>
                                    {row.category_name ?? "—"}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {row.isValid && (
                                  <span className="text-xs text-slate-600 whitespace-nowrap">
                                    {row.warranty_period_months ?? "—"}T / {row.warranty_km_limit ?? "—"}km
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {row.isValid && (
                                  <input
                                    type="number"
                                    min={0}
                                    value={row.quantity ?? 0}
                                    onChange={(e) => updateExcelPreviewRow(row.row_index, "quantity", Number(e.target.value))}
                                    className="w-16 text-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E]"
                                  />
                                )}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {row.isValid && (
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={row.unit_price ? row.unit_price.toLocaleString("vi-VN") : ""}
                                    onChange={(e) => {
                                      const raw = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, "");
                                      updateExcelPreviewRow(row.row_index, "unit_price", raw ? Number(raw) : 0);
                                    }}
                                    placeholder="0"
                                    className="w-24 text-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E]"
                                  />
                                )}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {row.isValid && (
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={row.retail_price ? row.retail_price.toLocaleString("vi-VN") : ""}
                                    placeholder="Giữ nguyên"
                                    onChange={(e) => {
                                      const raw = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, "");
                                      updateExcelPreviewRow(row.row_index, "retail_price", raw ? Number(raw) : 0);
                                    }}
                                    className="w-24 text-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] placeholder:text-[10px]"
                                  />
                                )}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {row.isValid ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 whitespace-nowrap">
                                    <CheckCircle2 size={11} /> Hợp lệ
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 whitespace-nowrap"
                                    title={row.error}
                                  >
                                    <AlertCircle size={11} /> Lỗi
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  onClick={() => removeExcelPreviewRow(row.row_index)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                  title="Bỏ dòng này"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
                <button
                  onClick={() => {
                    setExcelImportOpen(false);
                    resetExcelImportForm();
                  }}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmExcelImport}
                  disabled={isExcelConfirming || validExcelRows.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#00285E] text-white hover:bg-[#082245] transition-colors shadow-md shadow-[#00285E]/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isExcelConfirming ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      Xác nhận nhập kho
                    </>
                  )}
                </button>
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
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[92rem] max-h-[95vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00285E] to-[#1a4a8a] flex items-center justify-center shadow-md shadow-[#00285E]/20">
                    <ArrowDownToLine size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Tạo phiếu nhập</h3>
                    <p className="text-xs text-slate-400">{lines.length} sản phẩm · {formatPrice(formTotal)}</p>
                  </div>
                </div>
                <button onClick={() => setCreateOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Nhà cung cấp */}
              <div className="px-6 py-3 border-b border-slate-100 shrink-0 flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500 shrink-0">Nhà cung cấp</span>
                <select
                  value={supplierId ?? ""}
                  onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : null)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                >
                  <option value="">-- Chọn nhà cung cấp --</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="py-2.5 px-3 w-12 text-center">STT</th>
                      <th className="py-2.5 px-3 w-28">Loại</th>
                      <th className="py-2.5 px-3 w-64">Sản phẩm</th>
                      <th className="py-2.5 px-3 w-48">Danh mục</th>
                      <th className="py-2.5 px-3 w-20 text-center">BH(T)</th>
                      <th className="py-2.5 px-3 w-24 text-center">BH(km)</th>
                      <th className="py-2.5 px-3 w-20 text-center">SL</th>
                      <th className="py-2.5 px-3 w-36">Đơn giá nhập</th>
                      <th className="py-2.5 px-3 w-36">Giá bán lẻ</th>
                      <th className="py-2.5 px-3 w-32 text-right">Thành tiền</th>
                      <th className="py-2.5 px-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => {
                      // Phụ tùng đã có trong kho -> lấy danh mục/bảo hành đã lưu để hiển thị
                      const selectedPart =
                        line.mode === 'existing' && line.part_id
                          ? parts.find((p) => p.id === line.part_id)
                          : undefined;
                      return (
                      <Fragment key={index}>
                        <tr className={`border-b transition-colors ${line.conflict ? 'bg-amber-50/50 border-amber-200' : 'hover:bg-slate-50/60 border-slate-100'}`}>
                          {/* STT */}
                          <td className="py-2 px-3 text-center text-xs font-bold text-slate-400">{index + 1}</td>
                          {/* Loại toggle */}
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5 w-fit">
                              <button type="button" onClick={() => updateLine(index, { mode: 'existing' })}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${line.mode === 'existing' ? 'bg-white text-[#00285E] shadow-sm' : 'text-slate-400'}`}>
                                Có sẵn
                              </button>
                              <button type="button" onClick={() => updateLine(index, { mode: 'new' })}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${line.mode === 'new' ? 'bg-white text-[#00285E] shadow-sm' : 'text-slate-400'}`}>
                                Mới
                              </button>
                            </div>
                          </td>
                          {/* Sản phẩm + Thương hiệu */}
                          <td className="py-2 px-3">
                            {line.mode === 'existing' ? (
                              <div className="flex flex-col gap-1">
                                <select value={line.part_id ?? ''} onChange={(e) => {
                                  const selected = parts.find(p => p.id === Number(e.target.value));
                                  updateLine(index, { part_id: e.target.value ? Number(e.target.value) : null, brand: selected?.brand ?? '' });
                                }} className={tableCellInput}>
                                  <option value="">-- Chọn --</option>
                                  {parts.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                                </select>
                                {line.brand && <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#EDF3FF] text-[#00285E] w-fit ml-1">{line.brand}</span>}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <input value={line.name} onChange={(e) => updateLine(index, { name: e.target.value })} className={tableCellInput} placeholder="Tên phụ tùng" />
                                <input value={line.brand} onChange={(e) => updateLine(index, { brand: e.target.value })} className={`${tableCellInput} text-[11px]`} placeholder="Thương hiệu..." />
                              </div>
                            )}
                          </td>
                          {/* Danh mục — dòng có sẵn thì hiện thông tin đã lưu của phụ tùng */}
                          <td className="py-2 px-3">
                            {line.mode === 'new' ? (
                              <select value={line.category_id ?? ''} onChange={(e) => updateLine(index, { category_id: e.target.value ? Number(e.target.value) : null })} className={tableCellInput}>
                                <option value="">-- Chọn --</option>
                                {categories.map((c) => <option key={c.id} value={c.id}>{c.category_name}</option>)}
                              </select>
                            ) : (
                              <span className="text-xs font-semibold text-slate-500">
                                {selectedPart?.category?.category_name ?? '—'}
                              </span>
                            )}
                          </td>
                          {/* BH tháng */}
                          <td className="py-2 px-3 text-center">
                            {line.mode === 'new' ? (
                              <input type="text" inputMode="numeric"
                                value={line.warranty_period_months != null ? line.warranty_period_months.toLocaleString('vi-VN') : ''}
                                onChange={(e) => { const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, ''); updateLine(index, { warranty_period_months: raw ? Number(raw) : null }); }}
                                className={`${tableCellInput} text-center`} placeholder="6" />
                            ) : (
                              <span className="text-xs font-semibold text-slate-500">
                                {selectedPart?.warranty_period_months != null
                                  ? selectedPart.warranty_period_months.toLocaleString('vi-VN')
                                  : '—'}
                              </span>
                            )}
                          </td>
                          {/* BH km */}
                          <td className="py-2 px-3 text-center">
                            {line.mode === 'new' ? (
                              <input type="text" inputMode="numeric"
                                value={line.warranty_km_limit != null ? line.warranty_km_limit.toLocaleString('vi-VN') : ''}
                                onChange={(e) => { const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, ''); updateLine(index, { warranty_km_limit: raw ? Number(raw) : null }); }}
                                className={`${tableCellInput} text-center`} placeholder="5000" />
                            ) : (
                              <span className="text-xs font-semibold text-slate-500">
                                {selectedPart?.warranty_km_limit != null
                                  ? selectedPart.warranty_km_limit.toLocaleString('vi-VN')
                                  : '—'}
                              </span>
                            )}
                          </td>
                          {/* SL */}
                          <td className="py-2 px-3">
                            <input type="number" min={1} value={line.quantity || ''} onChange={(e) => updateLine(index, { quantity: e.target.value ? Number(e.target.value) : 0 })} className={`${tableCellInput} text-center`} />
                          </td>
                          {/* Đơn giá nhập */}
                          <td className="py-2 px-3">
                            <input type="text" inputMode="numeric"
                              value={line.unit_price ? line.unit_price.toLocaleString('vi-VN') : ''}
                              onChange={(e) => { const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, ''); updateLine(index, { unit_price: raw ? Number(raw) : 0 }); }}
                              className={tableCellInput} placeholder="0" />
                          </td>
                          {/* Giá bán lẻ */}
                          <td className="py-2 px-3">
                            <input type="text" inputMode="numeric"
                              value={line.retail_price ? line.retail_price.toLocaleString('vi-VN') : ''}
                              onChange={(e) => { const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, ''); updateLine(index, { retail_price: raw ? Number(raw) : 0 }); }}
                              className={tableCellInput} placeholder="0" />
                          </td>
                          {/* Thành tiền */}
                          <td className="py-2 px-3 text-right text-xs font-bold text-[#00285E] whitespace-nowrap">
                            {formatPrice(line.quantity * line.unit_price)}
                          </td>
                          {/* Xóa */}
                          <td className="py-2 px-2">
                            {lines.length > 1 && (
                              <button type="button" onClick={() => removeLine(index)} className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                        {/* Conflict warning row */}
                        {line.conflict && (
                          <tr className="border-b border-amber-200 bg-amber-50">
                            <td colSpan={12} className="px-4 py-2.5">
                              <div className="flex items-start gap-2">
                                <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                                <p className="text-xs font-semibold text-amber-700 flex-1">{line.conflict.message}</p>
                                <div className="flex gap-2 shrink-0">
                                  {line.conflict.candidates.map((c) => (
                                    <button key={c.id} type="button"
                                      onClick={() => updateLine(index, { mode: 'existing', part_id: c.id, conflict: null })}
                                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors">
                                      <Package size={11} />
                                      Dùng: {c.name}{c.brand ? ` (${c.brand})` : ''}
                                    </button>
                                  ))}
                                  {!line.conflict.isExact && (
                                    <button type="button" onClick={() => updateLine(index, { conflict: null, force: true })}
                                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#00285E] text-white hover:bg-[#082245] transition-colors">
                                      Tạo mới
                                    </button>
                                  )}
                                  <button type="button" onClick={() => updateLine(index, { conflict: null })}
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-100 transition-colors">
                                    Hủy
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                      );
                    })}
                    {/* Thêm dòng row */}
                    <tr>
                      <td colSpan={12} className="px-3 py-2">
                        <button type="button" onClick={addLine}
                          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-[#00285E] transition-colors py-1">
                          <Plus size={14} />
                          Thêm dòng
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-white shrink-0 space-y-3">
                {formError && (
                  <div ref={formErrorRef} className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                    <AlertTriangle size={16} className="text-rose-500 mt-0.5 shrink-0" />
                    <p className="text-xs font-semibold text-rose-700">{formError}</p>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 bg-[#EDF3FF] rounded-xl px-4 py-2.5">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng giá trị đơn nhập kho </span>
                    <span className="text-lg font-bold text-[#00285E]">{formatPrice(formTotal)}</span>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => { resetCreateForm(); setCreateOpen(false); }}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                      Hủy
                    </button>
                    <button onClick={handleCreateImport}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#00285E] text-white hover:bg-[#082245] transition-colors shadow-md shadow-[#00285E]/20">
                      <ArrowDownToLine size={15} />
                      Tạo phiếu nhập
                    </button>
                  </div>
                </div>
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

const tableCellInput =
  "w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] focus:bg-white transition-all hover:border-slate-300 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed";
