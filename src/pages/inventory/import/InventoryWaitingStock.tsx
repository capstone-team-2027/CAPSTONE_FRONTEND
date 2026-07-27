import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Calendar,
  X,
  Package,
  PackageSearch,
  Wallet,
  CheckCircle2,
  Clock,
  Car,
  User,
  Truck,
  ArrowDownToLine,
  ArrowLeft,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useFetchClient } from "../../../hook/useFetchClient";
import { WAITING_STOCK_API_ENDPOINTS } from "../../../constants/inventory/waitingStockApiEndPoint";
import { INVENTORY_LOG_API_ENDPOINTS } from "../../../constants/inventory/importManagementApiEndPoint";
import { SUPPLIER_API_ENDPOINTS } from "../../../constants/inventory/supplierApiEndPoint";
import { PART_CATEGORY_API_ENDPOINTS } from "../../../constants/inventory/sparePartCategoryApiEndPoint";
import { type GetSupplierResponse } from "../../../model/dto/supplierManagement.dto";
import { type GetPartCategory } from "../../../model/dto/sparePartCategory.dto";
import { type ImportSparePartRequest } from "../../../model/dto/importManagement.dto";

const formatPrice = (v: number | string) =>
  Number(v).toLocaleString("vi-VN") + " VND";

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

interface WaitingStockVehicleModel {
  id: number;
  model_name: string | null;
}

interface WaitingStockCustomerUser {
  id: number;
  fullName: string | null;
  phoneNumber: string | null;
}

interface WaitingStockCustomer {
  id: number;
  name: string | null;
  phone: string | null;
  user?: WaitingStockCustomerUser | null;
}

interface WaitingStockVehicle {
  id: number;
  license_plate: string | null;
  color: string | null;
  model?: WaitingStockVehicleModel | null;
  customer?: WaitingStockCustomer | null;
}

interface WaitingStockServiceOrder {
  id: number;
  vehicle?: WaitingStockVehicle | null;
}

interface WaitingStockTask {
  id: number;
  serviceOrder?: WaitingStockServiceOrder | null;
}

interface WaitingStockQuotation {
  id: number;
  deposit_amount: string | number | null;
  deposit_paid_at: string | null;
  task?: WaitingStockTask | null;
}

// 1 dòng QuotationDetail có status WAITING_STOCK: phụ tùng đặt ngoài hệ thống,
// khách đã cọc xong, chờ kho đặt hàng và nhập về.
interface WaitingStockItem {
  id: number;
  status: string;
  custom_item_name: string | null;
  quantity: number;
  unit_price: string | number;
  createdAt: string;
  quotation: WaitingStockQuotation;
}

const DETAIL_STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: typeof Clock }
> = {
  WAITING_STOCK: {
    label: "Chờ nhập kho",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: Clock,
  },
  ORDERED: {
    label: "Đã đặt hàng",
    className: "bg-blue-50 text-blue-600 border border-blue-200",
    icon: Truck,
  },
  RECEIVED: {
    label: "Đã nhập kho",
    className: "bg-emerald-50 text-emerald-600 border border-emerald-200",
    icon: CheckCircle2,
  },
};

const DEFAULT_DETAIL_STATUS = {
  label: "Không rõ",
  className: "bg-slate-50 text-slate-500 border border-slate-200",
  icon: Clock,
};

const getDetailStatus = (status?: string) =>
  (status && DETAIL_STATUS_CONFIG[status]) || DEFAULT_DETAIL_STATUS;

// 1 dòng trong modal nhập kho. unit_price của báo giá là GIÁ BÁN cho khách,
// nên giá nhập từ nhà cung cấp phải để kho tự nhập.
interface ImportFormLine {
  detailId: number;
  name: string;
  quantity: number;
  // Giá đã báo khách, chỉ để tham chiếu
  quotedPrice: number;
  // Giá vốn nhập từ nhà cung cấp
  costPrice: number;
  categoryId: number | null;
  brand: string;
  warrantyMonths: number | null;
  warrantyKm: number | null;
}

// Rút thông tin khách/xe từ cây quotation -> task -> serviceOrder -> vehicle
const getItemInfo = (item: WaitingStockItem) => {
  const vehicle = item.quotation?.task?.serviceOrder?.vehicle;
  const customer = vehicle?.customer;
  return {
    quotationId: item.quotation?.id ?? null,
    serviceOrderId: item.quotation?.task?.serviceOrder?.id ?? null,
    customerName:
      customer?.name || customer?.user?.fullName || "Khách vãng lai",
    customerPhone: customer?.phone || customer?.user?.phoneNumber || "",
    vehiclePlate: vehicle?.license_plate || "",
    vehicleName: vehicle?.model?.model_name || "",
    vehicleColor: vehicle?.color || "",
    depositAmount: Number(item.quotation?.deposit_amount) || 0,
    depositPaidAt: item.quotation?.deposit_paid_at ?? null,
  };
};

export default function InventoryWaitingStock() {
  const { searchQuery, showToast } = useOutletContext<{
    searchQuery: string;
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();

  const { fetchPrivate } = useFetchClient();
  const navigate = useNavigate();
  const [localSearch, setLocalSearch] = useState("");
  const [selected, setSelected] = useState<WaitingStockItem | null>(null);
  const [items, setItems] = useState<WaitingStockItem[]>([]);
  // Các dòng được tick để gộp vào 1 đơn nhập kho
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const effectiveSearch = (searchQuery || localSearch).toLowerCase();

  // ── Modal tạo phiếu nhập kho ──
  const [importOpen, setImportOpen] = useState(false);
  const [importLines, setImportLines] = useState<ImportFormLine[]>([]);
  const [importSupplierId, setImportSupplierId] = useState<number | null>(null);
  const [suppliers, setSuppliers] = useState<GetSupplierResponse[]>([]);
  const [categories, setCategories] = useState<GetPartCategory[]>([]);
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    handleGetWaitingStockItems();
  }, []);

  const handleGetWaitingStockItems = async () => {
    try {
      const result = await fetchPrivate<WaitingStockItem[]>(
        WAITING_STOCK_API_ENDPOINTS.WAITING_STOCK_ITEMS,
        "GET",
      );
      setItems(result.data ?? []);
    } catch (error) {
      console.error("Lỗi lấy danh sách phụ tùng chờ nhập kho", error);
    }
  };

  // Nguồn cho dropdown trong modal nhập kho
  useEffect(() => {
    handleGetSuppliers();
    handleGetCategories();
  }, []);

  const handleGetSuppliers = async () => {
    try {
      const result = await fetchPrivate<GetSupplierResponse[]>(
        SUPPLIER_API_ENDPOINTS.SUPPLIER_API,
        "GET",
      );
      setSuppliers(result.data ?? []);
    } catch (error) {
      console.error("Lỗi lấy danh sách nhà cung cấp", error);
    }
  };

  const handleGetCategories = async () => {
    try {
      const result = await fetchPrivate<GetPartCategory[]>(
        PART_CATEGORY_API_ENDPOINTS.PART_CATEGORY,
        "GET",
      );
      setCategories(result.data ?? []);
    } catch (error) {
      console.error("Lỗi lấy danh mục phụ tùng", error);
    }
  };

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const info = getItemInfo(item);
      return (
        (item.custom_item_name ?? "").toLowerCase().includes(effectiveSearch) ||
        info.customerName.toLowerCase().includes(effectiveSearch) ||
        info.customerPhone.toLowerCase().includes(effectiveSearch) ||
        info.vehiclePlate.toLowerCase().includes(effectiveSearch) ||
        info.vehicleName.toLowerCase().includes(effectiveSearch)
      );
    });
  }, [items, effectiveSearch]);

  const stats = useMemo(() => {
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, i) => sum + Number(i.quantity), 0);
    const totalValue = items.reduce(
      (sum, i) => sum + Number(i.quantity) * Number(i.unit_price),
      0,
    );
    const totalDeposit = items.reduce(
      (sum, i) => sum + (Number(i.quotation?.deposit_amount) || 0),
      0,
    );
    return { totalItems, totalQuantity, totalValue, totalDeposit };
  }, [items]);

  const selectedInfo = selected ? getItemInfo(selected) : null;

  const toggleChecked = (id: number) =>
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );

  // Tick "chọn tất cả" chỉ áp cho các dòng đang hiển thị sau khi lọc
  const isAllChecked =
    filtered.length > 0 && filtered.every((i) => checkedIds.includes(i.id));

  const toggleCheckedAll = () =>
    setCheckedIds(isAllChecked ? [] : filtered.map((i) => i.id));

  const checkedItems = useMemo(
    () => items.filter((i) => checkedIds.includes(i.id)),
    [items, checkedIds],
  );

  const checkedValue = checkedItems.reduce(
    (sum, i) => sum + Number(i.quantity) * Number(i.unit_price),
    0,
  );

  // Mở modal nhập kho cho 1 dòng (nút trong bảng) hoặc nhiều dòng đã tick
  const handleCreateImportOrder = (targetItems: WaitingStockItem[]) => {
    if (targetItems.length === 0) return;
    setImportLines(
      targetItems.map((item) => ({
        detailId: item.id,
        name: item.custom_item_name ?? "",
        quantity: Number(item.quantity),
        quotedPrice: Number(item.unit_price),
        costPrice: 0,
        categoryId: null,
        brand: "",
        warrantyMonths: null,
        warrantyKm: null,
      })),
    );
    setImportSupplierId(null);
    setImportError(null);
    setImportOpen(true);
  };

  const closeImportModal = () => {
    setImportOpen(false);
    setImportLines([]);
    setImportSupplierId(null);
    setImportError(null);
  };

  const updateImportLine = (
    detailId: number,
    patch: Partial<ImportFormLine>,
  ) =>
    setImportLines((prev) =>
      prev.map((line) =>
        line.detailId === detailId ? { ...line, ...patch } : line,
      ),
    );

  const importTotal = importLines.reduce(
    (sum, line) => sum + line.quantity * line.costPrice,
    0,
  );

  const handleSubmitImport = async () => {
    setImportError(null);
    if (!importSupplierId) {
      setImportError("Vui lòng chọn nhà cung cấp.");
      return;
    }
    const invalidLine = importLines.find(
      (line) =>
        !line.name.trim() ||
        line.quantity <= 0 ||
        line.costPrice <= 0 ||
        !line.categoryId,
    );
    if (invalidLine) {
      setImportError(
        "Mỗi phụ tùng cần có tên, danh mục, số lượng và giá nhập lớn hơn 0.",
      );
      return;
    }
    setIsSubmittingImport(true);
    try {
      // Phụ tùng đặt riêng chưa có trong kho -> tạo mới, retail_price giữ đúng
      // giá đã báo khách để không lệch với báo giá.
      const payload: ImportSparePartRequest = {
        supplier_id: importSupplierId,
        items: importLines.map((line) => ({
          quantity: line.quantity,
          unit_price: line.costPrice,
          retail_price: line.quotedPrice,
          name: line.name.trim(),
          brand: line.brand.trim(),
          category_id: line.categoryId!,
          warranty_period_months: line.warrantyMonths ?? undefined,
          warranty_km_limit: line.warrantyKm ?? undefined,
          force: true,
        })),
      };
      await fetchPrivate(
        INVENTORY_LOG_API_ENDPOINTS.INVENTORY_LOG,
        "POST",
        payload,
      );
      showToast(
        `Đã tạo phiếu nhập cho ${importLines.length} phụ tùng`,
        "success",
      );
      closeImportModal();
      setCheckedIds([]);
      handleGetWaitingStockItems();
    } catch (error: any) {
      setImportError(error?.message ?? "Không thể tạo phiếu nhập kho.");
    } finally {
      setIsSubmittingImport(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* TITLE */}
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
              Phụ tùng chờ nhập kho
            </h1>
            <p className="text-slate-500 text-sm">
              Phụ tùng đặt ngoài hệ thống theo yêu cầu khách — cần đặt hàng nhà
              cung cấp và nhập về kho.
            </p>
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 text-amber-600">
            <PackageSearch size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {stats.totalItems}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Phụ tùng chờ nhập
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[#EDF3FF] text-[#00285E]">
            <Package size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {stats.totalQuantity}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Tổng số lượng
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600">
            <Wallet size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatPrice(stats.totalDeposit)}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Tiền cọc đã thu
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
            <Calendar size={20} />
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
              Danh sách chờ nhập kho
            </h2>
            <span className="bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
              {filtered.length} phụ tùng
            </span>
          </div>

          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Tìm tên phụ tùng, khách hàng, biển số..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full sm:w-72 bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
            />
          </div>
        </div>

        {/* Thanh hành động khi có dòng được tick */}
        {checkedItems.length > 0 && (
          <div className="px-5 py-3 bg-[#EDF3FF] border-b border-[#D2E2FF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-[#00285E]">
                Đã chọn {checkedItems.length} phụ tùng
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Tổng giá trị: {formatPrice(checkedValue)}
              </span>
              <button
                onClick={() => setCheckedIds([])}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline"
              >
                Bỏ chọn
              </button>
            </div>
            <button
              onClick={() => handleCreateImportOrder(checkedItems)}
              className="h-10 flex items-center justify-center gap-2 px-5 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-[#003C7D] to-[#00285E] shadow-lg shadow-[#00285E]/25 hover:shadow-[#00285E]/40 hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <ArrowDownToLine size={16} />
              Tạo đơn nhập kho
            </button>
          </div>
        )}

        {/* Table body */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th className="py-4 pl-6 pr-2 align-middle w-10">
                  <input
                    type="checkbox"
                    checked={isAllChecked}
                    onChange={toggleCheckedAll}
                    aria-label="Chọn tất cả"
                    className="w-4 h-4 rounded border-slate-300 accent-[#00285E] cursor-pointer align-middle"
                  />
                </th>
                <th className="py-4 px-4 align-middle">Phụ tùng</th>
                <th className="py-4 px-4 align-middle">Khách hàng</th>
                <th className="py-4 px-4 align-middle">Xe</th>
                <th className="py-4 px-4 align-middle text-center whitespace-nowrap">
                  SL
                </th>
                <th className="py-4 px-4 align-middle whitespace-nowrap">
                  Đơn giá
                </th>
                <th className="py-4 px-4 align-middle whitespace-nowrap">
                  Đã cọc
                </th>
                <th className="py-4 px-4 align-middle whitespace-nowrap">
                  Trạng thái
                </th>
                <th className="py-4 px-6 align-middle whitespace-nowrap">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-14 text-center text-slate-400 text-sm"
                  >
                    Không có phụ tùng nào đang chờ nhập kho...
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const info = getItemInfo(item);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelected(item)}
                      className={`border-b border-slate-100 transition-colors cursor-pointer ${
                        checkedIds.includes(item.id)
                          ? "bg-[#EDF3FF]/60 hover:bg-[#EDF3FF]"
                          : "hover:bg-slate-50/70"
                      }`}
                    >
                      <td
                        className="py-4 pl-6 pr-2 align-middle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={checkedIds.includes(item.id)}
                          onChange={() => toggleChecked(item.id)}
                          aria-label={`Chọn ${item.custom_item_name ?? "phụ tùng"}`}
                          className="w-4 h-4 rounded border-slate-300 accent-[#00285E] cursor-pointer align-middle"
                        />
                      </td>
                      <td className="py-4 px-4 align-middle">
                        <div className="flex items-center gap-2">
                          <Package
                            size={13}
                            className="text-amber-500 shrink-0"
                          />
                          <span className="text-sm font-semibold text-slate-800 truncate max-w-[200px]">
                            {item.custom_item_name || "—"}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 ml-5">
                          Đặt ngoài hệ thống
                        </span>
                      </td>
                      <td className="py-4 px-4 align-middle">
                        <p className="text-sm font-semibold text-slate-700 truncate max-w-[150px]">
                          {info.customerName}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate max-w-[150px]">
                          {info.customerPhone || "—"}
                        </p>
                      </td>
                      <td className="py-4 px-4 align-middle">
                        <p className="text-sm font-semibold text-slate-700 truncate max-w-[130px]">
                          {info.vehiclePlate || "—"}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate max-w-[130px]">
                          {[info.vehicleName, info.vehicleColor]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </p>
                      </td>
                      <td className="py-4 px-4 align-middle text-center text-sm font-bold text-slate-800">
                        {item.quantity}
                      </td>
                      <td className="py-4 px-4 align-middle text-sm font-semibold text-slate-700 whitespace-nowrap">
                        {formatPrice(item.unit_price)}
                      </td>
                      <td className="py-4 px-4 align-middle">
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap bg-orange-50 text-orange-600 border border-orange-200">
                          <Wallet size={11} className="shrink-0" />
                          (30%) · {formatPrice(info.depositAmount)}
                        </span>
                      </td>
                      <td className="py-4 px-4 align-middle">
                        {(() => {
                          const statusCfg = getDetailStatus(item.status);
                          const StatusIcon = statusCfg.icon;
                          return (
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${statusCfg.className}`}
                            >
                              <StatusIcon size={11} className="shrink-0" />
                              {statusCfg.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <div className="flex justify-start">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateImportOrder([item]);
                            }}
                            title="Tạo đơn nhập kho cho phụ tùng này"
                            className="h-8 flex items-center gap-1.5 px-3 rounded-lg text-[11px] font-bold text-white bg-[#00285E] hover:brightness-125 active:scale-[0.97] transition-all whitespace-nowrap"
                          >
                            <ArrowDownToLine size={12} />
                            Nhập kho
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
        {selected && selectedInfo && (
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
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5"
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-7 py-5 shrink-0"
                style={{ backgroundColor: "#00285E" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center">
                    <PackageSearch size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">
                      {selected.custom_item_name || "Phụ tùng đặt riêng"}
                    </h3>
                    <span className="text-xs font-semibold text-amber-300">
                      Đặt ngoài hệ thống · chờ nhập kho
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
                {/* Khách hàng & xe */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                      <User size={12} />
                      Khách hàng
                    </span>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-3">
                        <span className="w-12 shrink-0 text-xs text-slate-400">
                          Tên
                        </span>
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          {selectedInfo.customerName}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="w-12 shrink-0 text-xs text-slate-400">
                          SĐT
                        </span>
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          {selectedInfo.customerPhone || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                      <Car size={12} />
                      Phương tiện
                    </span>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-3">
                        <span className="w-14 shrink-0 text-xs text-slate-400">
                          Biển số
                        </span>
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          {selectedInfo.vehiclePlate || "—"}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="w-14 shrink-0 text-xs text-slate-400">
                          Tên xe
                        </span>
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          {[
                            selectedInfo.vehicleName,
                            selectedInfo.vehicleColor,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Thông tin phụ tùng cần đặt */}
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Package size={14} className="text-slate-500" />
                      Phụ tùng cần đặt
                    </label>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
                    <table className="w-full text-left border-collapse text-sm">
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="py-3 px-4 text-xs text-slate-400 w-40">
                            Tên phụ tùng
                          </td>
                          <td className="py-3 px-4 text-sm font-semibold text-slate-800">
                            {selected.custom_item_name || "—"}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-3 px-4 text-xs text-slate-400">
                            Số lượng
                          </td>
                          <td className="py-3 px-4 text-sm font-semibold text-slate-800">
                            {selected.quantity}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-3 px-4 text-xs text-slate-400">
                            Đơn giá báo khách
                          </td>
                          <td className="py-3 px-4 text-sm font-semibold text-slate-800">
                            {formatPrice(selected.unit_price)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 text-xs text-slate-400">
                            Thành tiền
                          </td>
                          <td className="py-3 px-4 text-sm font-bold text-[#00285E]">
                            {formatPrice(
                              Number(selected.quantity) *
                                Number(selected.unit_price),
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tình trạng cọc */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <PackageSearch size={13} className="text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Trạng thái
                      </span>
                    </div>
                    {(() => {
                      const statusCfg = getDetailStatus(selected.status);
                      const StatusIcon = statusCfg.icon;
                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${statusCfg.className}`}
                        >
                          <StatusIcon size={12} />
                          {statusCfg.label}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Wallet size={13} className="text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Tiền cọc đã thu
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      {formatPrice(selectedInfo.depositAmount)}
                    </p>
                    {selectedInfo.depositPaidAt && (
                      <p className="text-[11px] text-emerald-600 mt-1.5">
                        {formatDateTime(selectedInfo.depositPaidAt)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Thời gian */}
                <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Calendar size={13} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Ngày báo giá
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    {formatDateTime(selected.createdAt)}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 px-7 py-4 border-t border-slate-200 shrink-0 bg-white">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Giá trị đơn hàng
                  </span>
                  <span className="text-lg font-bold text-[#00285E]">
                    {formatPrice(
                      Number(selected.quantity) * Number(selected.unit_price),
                    )}
                  </span>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="h-11 px-6 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL TẠO PHIẾU NHẬP KHO ── */}
      <AnimatePresence>
        {importOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeImportModal}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#EDF3FF] flex items-center justify-center">
                    <ArrowDownToLine size={16} className="text-[#00285E]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800 leading-tight">
                      Tạo phiếu nhập kho
                    </h3>
                    <p className="text-xs text-slate-400">
                      {importLines.length} phụ tùng đặt riêng ·{" "}
                      {formatPrice(importTotal)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeImportModal}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Nhà cung cấp */}
              <div className="px-6 py-3 border-b border-slate-100 shrink-0 flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500 shrink-0">
                  Nhà cung cấp
                </span>
                <select
                  value={importSupplierId ?? ""}
                  onChange={(e) =>
                    setImportSupplierId(
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                >
                  <option value="">-- Chọn nhà cung cấp --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="py-2.5 px-2 w-10 text-center">STT</th>
                      <th className="py-2.5 px-2 w-52">Sản phẩm</th>
                      <th className="py-2.5 px-2 w-44">Danh mục</th>
                      <th className="py-2.5 px-2 w-16 text-center">BH(T)</th>
                      <th className="py-2.5 px-2 w-20 text-center">BH(km)</th>
                      <th className="py-2.5 px-2 w-20 text-center">SL</th>
                      <th className="py-2.5 px-2 w-28">Đơn giá nhập</th>
                      <th className="py-2.5 px-2 w-28">Giá bán lẻ</th>
                      <th className="py-2.5 px-2 w-24 text-right">
                        Thành tiền
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {importLines.map((line, index) => (
                      <tr
                        key={line.detailId}
                        className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="py-2 px-2 text-center text-xs font-bold text-slate-400">
                          {index + 1}
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex flex-col gap-1">
                            <input
                              value={line.name}
                              onChange={(e) =>
                                updateImportLine(line.detailId, {
                                  name: e.target.value,
                                })
                              }
                              placeholder="Tên phụ tùng"
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                            />
                            <input
                              value={line.brand}
                              onChange={(e) =>
                                updateImportLine(line.detailId, {
                                  brand: e.target.value,
                                })
                              }
                              placeholder="Thương hiệu..."
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                            />
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <select
                            value={line.categoryId ?? ""}
                            onChange={(e) =>
                              updateImportLine(line.detailId, {
                                categoryId: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              })
                            }
                            className={`w-full bg-slate-50 border rounded-lg px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all ${
                              line.categoryId
                                ? "border-slate-200"
                                : "border-amber-300"
                            }`}
                          >
                            <option value="">-- Chọn --</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.category_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={line.warrantyMonths ?? ""}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9]/g, "");
                              updateImportLine(line.detailId, {
                                warrantyMonths: raw ? Number(raw) : null,
                              });
                            }}
                            placeholder="6"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-center text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={
                              line.warrantyKm != null
                                ? line.warrantyKm.toLocaleString("vi-VN")
                                : ""
                            }
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9]/g, "");
                              updateImportLine(line.detailId, {
                                warrantyKm: raw ? Number(raw) : null,
                              });
                            }}
                            placeholder="5.000"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-center text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min={1}
                            value={line.quantity || ""}
                            onChange={(e) =>
                              updateImportLine(line.detailId, {
                                quantity: Number(e.target.value) || 0,
                              })
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={
                              line.costPrice
                                ? line.costPrice.toLocaleString("vi-VN")
                                : ""
                            }
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9]/g, "");
                              updateImportLine(line.detailId, {
                                costPrice: raw ? Number(raw) : 0,
                              });
                            }}
                            placeholder="Giá vốn"
                            className={`w-full bg-slate-50 border rounded-lg px-2.5 py-1.5 text-sm text-right text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all ${
                              line.costPrice > 0
                                ? "border-slate-200"
                                : "border-amber-300"
                            }`}
                          />
                        </td>
                        {/* Giá bán lẻ khóa theo báo giá đã duyệt */}
                        <td className="py-2 px-2">
                          <div
                            title="Giá đã báo khách, không chỉnh được"
                            className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-right font-semibold text-slate-500 cursor-not-allowed"
                          >
                            {line.quotedPrice.toLocaleString("vi-VN")}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right whitespace-nowrap text-sm font-bold text-[#00285E]">
                          {formatPrice(line.quantity * line.costPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {importError && (
                <div className="mx-6 mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-600 shrink-0">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 shrink-0 bg-white">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Tổng giá trị đơn nhập kho 
                  </span>
                  <span className="text-lg font-bold text-[#00285E]">
                    {formatPrice(importTotal)}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={closeImportModal}
                    disabled={isSubmittingImport}
                    className="h-11 px-5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all disabled:opacity-40"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSubmitImport}
                    disabled={isSubmittingImport}
                    className="h-11 flex items-center gap-2 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-[#003C7D] to-[#00285E] shadow-lg shadow-[#00285E]/25 hover:shadow-[#00285E]/40 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSubmittingImport ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Đang tạo phiếu...
                      </>
                    ) : (
                      <>
                        <ArrowDownToLine size={16} />
                        Xác nhận nhập kho
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
