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
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useFetchClient } from "../../../hook/useFetchClient";
import { WAITING_STOCK_API_ENDPOINTS } from "../../../constants/inventory/waitingStockApiEndPoint";

const PAGE_SIZE = 6;

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

interface WaitingStockQuotationDetail {
  id: number;
  quotation?: WaitingStockQuotation | null;
}

// 1 dòng Custom_Part_Orders: phụ tùng đặt ngoài hệ thống, khách đã cọc xong, chờ kho đặt
// hàng nhà cung cấp và xác nhận đã về (WAITING_ARRIVAL), rồi giao trực tiếp cho KTV khi họ
// tới lấy (READY_FOR_USE) — không phải nghiệp vụ nhập/xuất kho chính thức.
interface WaitingStockItem {
  id: number;
  item_name: string;
  quantity: number;
  unit_price: string | number;
  actual_unit_price: string | number | null;
  arrived_at: string | null;
  status: "WAITING_ARRIVAL" | "READY_FOR_USE" | string;
  createdAt: string;
  quotationDetail?: WaitingStockQuotationDetail | null;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: typeof Clock }
> = {
  WAITING_ARRIVAL: {
    label: "Chờ về hàng",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: Truck,
  },
  READY_FOR_USE: {
    label: "Chờ giao cho KTV",
    className: "bg-emerald-50 text-emerald-600 border border-emerald-200",
    icon: CheckCircle2,
  },
};

const getStatusConfig = (status: string) =>
  STATUS_CONFIG[status] || {
    label: status,
    className: "bg-slate-50 text-slate-500 border border-slate-200",
    icon: Clock,
  };

// Rút thông tin khách/xe từ cây quotationDetail -> quotation -> task -> serviceOrder -> vehicle
const getItemInfo = (item: WaitingStockItem) => {
  const quotation = item.quotationDetail?.quotation;
  const vehicle = quotation?.task?.serviceOrder?.vehicle;
  const customer = vehicle?.customer;
  return {
    quotationId: quotation?.id ?? null,
    customerName:
      customer?.name || customer?.user?.fullName || "Khách vãng lai",
    customerPhone: customer?.phone || customer?.user?.phoneNumber || "",
    vehiclePlate: vehicle?.license_plate || "",
    vehicleName: vehicle?.model?.model_name || "",
    vehicleColor: vehicle?.color || "",
    depositAmount: Number(quotation?.deposit_amount) || 0,
    depositPaidAt: quotation?.deposit_paid_at ?? null,
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
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<WaitingStockItem | null>(null);
  const [items, setItems] = useState<WaitingStockItem[]>([]);
  const effectiveSearch = (searchQuery || localSearch).toLowerCase();

  // ── Modal xác nhận đã về hàng (nhập giá thực tế) ──
  const [arrivalTarget, setArrivalTarget] = useState<WaitingStockItem | null>(null);
  const [arrivalPrice, setArrivalPrice] = useState(0);
  const [isConfirmingArrival, setIsConfirmingArrival] = useState(false);
  const [arrivalError, setArrivalError] = useState<string | null>(null);

  // ── Xác nhận đã giao cho KTV ──
  const [exportingId, setExportingId] = useState<number | null>(null);

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

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const info = getItemInfo(item);
      return (
        item.item_name.toLowerCase().includes(effectiveSearch) ||
        info.customerName.toLowerCase().includes(effectiveSearch) ||
        info.customerPhone.toLowerCase().includes(effectiveSearch) ||
        info.vehiclePlate.toLowerCase().includes(effectiveSearch) ||
        info.vehicleName.toLowerCase().includes(effectiveSearch)
      );
    });
  }, [items, effectiveSearch]);

  const stats = useMemo(() => {
    const totalItems = items.length;
    const waitingArrival = items.filter((i) => i.status === "WAITING_ARRIVAL").length;
    const readyForUse = items.filter((i) => i.status === "READY_FOR_USE").length;
    const totalValue = items.reduce(
      (sum, i) => sum + Number(i.quantity) * Number(i.unit_price),
      0,
    );
    return { totalItems, waitingArrival, readyForUse, totalValue };
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const selectedInfo = selected ? getItemInfo(selected) : null;

  const openArrivalModal = (item: WaitingStockItem) => {
    setArrivalTarget(item);
    setArrivalPrice(Number(item.unit_price));
    setArrivalError(null);
  };

  const closeArrivalModal = () => {
    setArrivalTarget(null);
    setArrivalError(null);
  };

  const handleConfirmArrival = async () => {
    if (!arrivalTarget) return;
    setArrivalError(null);
    if (arrivalPrice <= 0) {
      setArrivalError("Vui lòng nhập giá mua thực tế lớn hơn 0.");
      return;
    }
    if (arrivalPrice > Number(arrivalTarget.unit_price)) {
      setArrivalError(
        `Giá mua (${formatPrice(arrivalPrice)}) cao hơn giá đã báo khách (${formatPrice(arrivalTarget.unit_price)}). Không thể xác nhận.`,
      );
      return;
    }
    setIsConfirmingArrival(true);
    try {
      await fetchPrivate(
        WAITING_STOCK_API_ENDPOINTS.CONFIRM_ARRIVAL(arrivalTarget.id),
        "POST",
        { actual_unit_price: arrivalPrice },
      );
      showToast(`Đã xác nhận "${arrivalTarget.item_name}" về hàng.`, "success");
      closeArrivalModal();
      setSelected(null);
      await handleGetWaitingStockItems();
    } catch (error: any) {
      setArrivalError(error?.message || "Không thể xác nhận đã về hàng.");
    } finally {
      setIsConfirmingArrival(false);
    }
  };

  const handleExport = async (item: WaitingStockItem) => {
    setExportingId(item.id);
    try {
      await fetchPrivate(WAITING_STOCK_API_ENDPOINTS.EXPORT_CUSTOM_PART(item.id), "POST");
      showToast(`Đã xác nhận giao "${item.item_name}" cho kỹ thuật viên.`, "success");
      setSelected(null);
      await handleGetWaitingStockItems();
    } catch (error: any) {
      showToast(error?.message || "Không thể xuất phụ tùng.", "warning");
    } finally {
      setExportingId(null);
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
              Phụ tùng đặt riêng
            </h1>
            <p className="text-slate-500 text-sm">
              Phụ tùng đặt ngoài hệ thống theo yêu cầu khách — xác nhận đã về hàng và giao cho kỹ thuật viên khi tới lấy.
            </p>
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 text-amber-600">
            <Truck size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {stats.waitingArrival}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Chờ về hàng</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {stats.readyForUse}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Chờ giao cho KTV</p>
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
            <p className="text-xs text-slate-400 font-medium mt-0.5">Tổng giá trị</p>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Danh sách</h2>
            <span className="bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
              {filtered.length} phụ tùng
            </span>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm tên phụ tùng, khách hàng, biển số..."
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-72 bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
            />
          </div>
        </div>

        {/* Table body */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th className="py-4 px-6 align-middle">Phụ tùng</th>
                <th className="py-4 px-4 align-middle">Khách hàng</th>
                <th className="py-4 px-4 align-middle">Xe</th>
                <th className="py-4 px-4 align-middle text-center whitespace-nowrap">SL</th>
                <th className="py-4 px-4 align-middle whitespace-nowrap">Đơn giá báo khách</th>
                <th className="py-4 px-4 align-middle whitespace-nowrap">Trạng thái</th>
                <th className="py-4 px-6 align-middle whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400 text-sm">
                    Không có phụ tùng đặt riêng nào đang chờ xử lý...
                  </td>
                </tr>
              ) : (
                pageItems.map((item) => {
                  const info = getItemInfo(item);
                  const statusCfg = getStatusConfig(item.status);
                  const StatusIcon = statusCfg.icon;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelected(item)}
                      className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-6 align-middle">
                        <div className="flex items-center gap-2">
                          <Package size={13} className="text-amber-500 shrink-0" />
                          <span className="text-sm font-semibold text-slate-800 truncate max-w-[200px]">
                            {item.item_name}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 ml-5">Đặt ngoài hệ thống</span>
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
                          {[info.vehicleName, info.vehicleColor].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </td>
                      <td className="py-4 px-4 align-middle text-center text-sm font-bold text-slate-800">
                        {item.quantity}
                      </td>
                      <td className="py-4 px-4 align-middle text-sm font-semibold text-slate-700 whitespace-nowrap">
                        {formatPrice(item.unit_price)}
                      </td>
                      <td className="py-4 px-4 align-middle">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${statusCfg.className}`}>
                          <StatusIcon size={11} className="shrink-0" />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="py-4 px-6 align-middle" onClick={(e) => e.stopPropagation()}>
                        {item.status === "WAITING_ARRIVAL" ? (
                          <button
                            onClick={() => openArrivalModal(item)}
                            className="h-8 flex items-center gap-1.5 px-3 rounded-lg text-[11px] font-bold text-white bg-[#00285E] hover:brightness-125 active:scale-[0.97] transition-all whitespace-nowrap"
                          >
                            <Truck size={12} />
                            Xác nhận đã về
                          </button>
                        ) : item.status === "READY_FOR_USE" ? (
                          <button
                            onClick={() => handleExport(item)}
                            disabled={exportingId === item.id}
                            className="h-8 flex items-center gap-1.5 px-3 rounded-lg text-[11px] font-bold text-white bg-emerald-600 hover:brightness-110 active:scale-[0.97] transition-all whitespace-nowrap disabled:opacity-50"
                          >
                            {exportingId === item.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={12} />
                            )}
                            Xác nhận đã giao
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs font-medium text-slate-400">
            Hiển thị {pageItems.length} / {filtered.length} phụ tùng
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
              <div className="flex items-center justify-between px-7 py-5 shrink-0" style={{ backgroundColor: "#00285E" }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center">
                    <PackageSearch size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">{selected.item_name}</h3>
                    <span className="text-xs font-semibold text-amber-300">Đặt ngoài hệ thống</span>
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
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                      <User size={12} />
                      Khách hàng
                    </span>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-3">
                        <span className="w-12 shrink-0 text-xs text-slate-400">Tên</span>
                        <span className="text-sm font-semibold text-slate-800 truncate">{selectedInfo.customerName}</span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="w-12 shrink-0 text-xs text-slate-400">SĐT</span>
                        <span className="text-sm font-semibold text-slate-800 truncate">{selectedInfo.customerPhone || "—"}</span>
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
                        <span className="w-14 shrink-0 text-xs text-slate-400">Biển số</span>
                        <span className="text-sm font-semibold text-slate-800 truncate">{selectedInfo.vehiclePlate || "—"}</span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="w-14 shrink-0 text-xs text-slate-400">Tên xe</span>
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          {[selectedInfo.vehicleName, selectedInfo.vehicleColor].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Package size={14} className="text-slate-500" />
                      Phụ tùng đặt riêng
                    </label>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
                    <table className="w-full text-left border-collapse text-sm">
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="py-3 px-4 text-xs text-slate-400 w-40">Tên phụ tùng</td>
                          <td className="py-3 px-4 text-sm font-semibold text-slate-800">{selected.item_name}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-3 px-4 text-xs text-slate-400">Số lượng</td>
                          <td className="py-3 px-4 text-sm font-semibold text-slate-800">{selected.quantity}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-3 px-4 text-xs text-slate-400">Đơn giá báo khách</td>
                          <td className="py-3 px-4 text-sm font-semibold text-slate-800">{formatPrice(selected.unit_price)}</td>
                        </tr>
                        {selected.actual_unit_price != null && (
                          <tr className="border-b border-slate-100">
                            <td className="py-3 px-4 text-xs text-slate-400">Giá mua thực tế</td>
                            <td className="py-3 px-4 text-sm font-semibold text-emerald-600">{formatPrice(selected.actual_unit_price)}</td>
                          </tr>
                        )}
                        <tr>
                          <td className="py-3 px-4 text-xs text-slate-400">Thành tiền</td>
                          <td className="py-3 px-4 text-sm font-bold text-[#00285E]">
                            {formatPrice(Number(selected.quantity) * Number(selected.unit_price))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <PackageSearch size={13} className="text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trạng thái</span>
                    </div>
                    {(() => {
                      const statusCfg = getStatusConfig(selected.status);
                      const StatusIcon = statusCfg.icon;
                      return (
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${statusCfg.className}`}>
                          <StatusIcon size={12} />
                          {statusCfg.label}
                        </span>
                      );
                    })()}
                    {selected.arrived_at && (
                      <p className="text-[11px] text-emerald-600 mt-1.5">Về hàng: {formatDateTime(selected.arrived_at)}</p>
                    )}
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Wallet size={13} className="text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tiền cọc đã thu</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800">{formatPrice(selectedInfo.depositAmount)}</p>
                    {selectedInfo.depositPaidAt && (
                      <p className="text-[11px] text-emerald-600 mt-1.5">{formatDateTime(selectedInfo.depositPaidAt)}</p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Calendar size={13} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ngày báo giá</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{formatDateTime(selected.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 px-7 py-4 border-t border-slate-200 shrink-0 bg-white">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Giá trị đơn hàng</span>
                  <span className="text-lg font-bold text-[#00285E]">
                    {formatPrice(Number(selected.quantity) * Number(selected.unit_price))}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setSelected(null)}
                    className="h-11 px-6 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all"
                  >
                    Đóng
                  </button>
                  {selected.status === "WAITING_ARRIVAL" && (
                    <button
                      onClick={() => openArrivalModal(selected)}
                      className="h-11 flex items-center gap-2 px-5 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-[#003C7D] to-[#00285E] shadow-lg shadow-[#00285E]/25 hover:shadow-[#00285E]/40 hover:brightness-110 active:scale-[0.98] transition-all"
                    >
                      <Truck size={16} />
                      Xác nhận đã về
                    </button>
                  )}
                  {selected.status === "READY_FOR_USE" && (
                    <button
                      onClick={() => handleExport(selected)}
                      disabled={exportingId === selected.id}
                      className="h-11 flex items-center gap-2 px-5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {exportingId === selected.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                      Xác nhận đã giao
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL XÁC NHẬN ĐÃ VỀ HÀNG ── */}
      <AnimatePresence>
        {arrivalTarget && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeArrivalModal}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden ring-1 ring-slate-900/5"
            >
              <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ backgroundColor: "#00285E" }}>
                <div className="flex items-center gap-2.5 text-white">
                  <Truck size={18} />
                  <h3 className="text-base font-bold">Xác nhận đã về hàng</h3>
                </div>
                <button onClick={closeArrivalModal} className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-slate-50 rounded-xl px-4 py-3">
                  <p className="text-sm font-bold text-slate-800">{arrivalTarget.item_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Số lượng: {arrivalTarget.quantity} · Giá đã báo khách: {formatPrice(arrivalTarget.unit_price)}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
                    Giá mua thực tế
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={arrivalPrice ? arrivalPrice.toLocaleString("vi-VN") : ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      setArrivalPrice(raw ? Number(raw) : 0);
                    }}
                    placeholder="Nhập giá đã mua"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                  />
                </div>
                {arrivalError && (
                  <p className="text-xs font-semibold text-rose-600">{arrivalError}</p>
                )}
              </div>
              <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50">
                <button
                  onClick={closeArrivalModal}
                  disabled={isConfirmingArrival}
                  className="h-10 px-5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-all disabled:opacity-40"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmArrival}
                  disabled={isConfirmingArrival}
                  className="h-10 flex items-center gap-2 px-5 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-[#003C7D] to-[#00285E] hover:brightness-110 transition-all disabled:opacity-40"
                >
                  {isConfirmingArrival ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
