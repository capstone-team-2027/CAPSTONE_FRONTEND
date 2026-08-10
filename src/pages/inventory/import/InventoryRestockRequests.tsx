import { useState, useEffect } from "react";
import { Search, Package, ArrowLeft, Loader2, User, Download, History, Clock } from "lucide-react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useFetchClient } from "../../../hook/useFetchClient";
import { RESTOCK_REQUEST_API_ENDPOINTS } from "../../../constants/inventory/restockRequestApiEndpoint";

type Tab = "pending" | "history";

interface SparePartRef {
  id: number;
  sku: string;
  name: string;
  brand: string | null;
  stock_quantity: number;
}

interface RequestedByRef {
  id: number;
  fullName: string | null;
}

interface ByServiceOrderItem {
  id: number;
  spare_part_id: number;
  sparePart: SparePartRef | null;
  quantity_needed: number;
  requestedByUser: RequestedByRef | null;
  createdAt: string;
  serviceOrderId: number | null;
  vehiclePlate: string | null;
}

interface BySparePartItem {
  spare_part_id: number;
  sparePart: SparePartRef | null;
  stock_quantity: number;
  total_quantity_needed: number;
  request_ids: number[];
}

interface HistoryItem extends ByServiceOrderItem {
  status: "FULFILLED" | "RESOLVED" | "CANCELLED";
  updatedAt: string;
}

const HISTORY_STATUS_LABEL: Record<string, { label: string; className: string }> = {
  FULFILLED: { label: "Đã bổ sung đủ", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  RESOLVED: { label: "Đã xử lý", className: "bg-slate-100 text-slate-600 border-slate-200" },
  CANCELLED: { label: "Đã huỷ", className: "bg-rose-50 text-rose-600 border-rose-200" },
};

// Quản lý kho — yêu cầu bổ sung phụ tùng. Restock_Requests được hệ thống tự tạo khi khách hàng
// duyệt báo giá có phụ tùng thiếu tồn (xem approveQuotation ở customer/technicianLeader
// quoteManagement.service.js). Việc nhập kho thực tế (chọn Excel, chọn supplier, xác nhận) nằm
// ở trang "Lịch sử nhập kho" (InventoryImport.tsx, nút "Nhập kho từ Excel") — trang này chỉ để
// xem tổng hợp nhu cầu + xuất Excel + xem lịch sử. Việc giao phụ tùng cho đúng KTV vẫn qua
// "Yêu cầu xuất kho" (KTV tự bấm) + màn Duyệt xuất kho có sẵn (approveExportRequest), không tự
// động hoá gộp 2 bước này.
export default function InventoryRestockRequests() {
  const { searchQuery, showToast } = useOutletContext<{
    searchQuery: string;
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();

  const { fetchPrivate } = useFetchClient();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("pending");
  const [localSearch, setLocalSearch] = useState("");
  const effectiveSearch = (searchQuery || localSearch).toLowerCase();

  const [byServiceOrder, setByServiceOrder] = useState<ByServiceOrderItem[]>([]);
  const [bySparePart, setBySparePart] = useState<BySparePartItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab]);

  const loadSummary = async () => {
    setIsLoading(true);
    try {
      const result = await fetchPrivate<{ byServiceOrder: ByServiceOrderItem[]; bySparePart: BySparePartItem[] }>(
        RESTOCK_REQUEST_API_ENDPOINTS.SUMMARY,
        "GET",
      );
      setByServiceOrder(result.data?.byServiceOrder ?? []);
      setBySparePart(result.data?.bySparePart ?? []);
    } catch (error) {
      console.error("Lỗi lấy tổng hợp yêu cầu bổ sung phụ tùng", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const result = await fetchPrivate<HistoryItem[]>(RESTOCK_REQUEST_API_ENDPOINTS.HISTORY, "GET");
      setHistory(result.data ?? []);
    } catch (error) {
      console.error("Lỗi lấy lịch sử yêu cầu bổ sung phụ tùng", error);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(RESTOCK_REQUEST_API_ENDPOINTS.EXPORT_EXCEL, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Không thể xuất file Excel");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `yeu-cau-bo-sung-phu-tung-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      showToast(error?.message || "Không thể xuất file Excel.", "warning");
    } finally {
      setIsExporting(false);
    }
  };

  const filteredByServiceOrder = byServiceOrder.filter((item) => {
    const name = item.sparePart?.name?.toLowerCase() ?? "";
    const sku = item.sparePart?.sku?.toLowerCase() ?? "";
    const requester = item.requestedByUser?.fullName?.toLowerCase() ?? "";
    return name.includes(effectiveSearch) || sku.includes(effectiveSearch) || requester.includes(effectiveSearch);
  });

  const filteredBySparePart = bySparePart.filter((item) => {
    const name = item.sparePart?.name?.toLowerCase() ?? "";
    const sku = item.sparePart?.sku?.toLowerCase() ?? "";
    return name.includes(effectiveSearch) || sku.includes(effectiveSearch);
  });

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
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
              Quản lý kho — Yêu cầu bổ sung phụ tùng
            </h1>
            <p className="text-slate-500 text-sm">
              Phụ tùng có sẵn trong danh mục nhưng đang thiếu tồn — tự động phát sinh khi khách hàng duyệt báo giá.
              Vào trang "Lịch sử nhập kho" để nhập kho từ Excel.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: "pending" as Tab, label: "Đang chờ", icon: Clock },
          { id: "history" as Tab, label: "Lịch sử", icon: History },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? "border-[#00285E] text-[#00285E]"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "pending" && (
        <div className="space-y-6">
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm tên phụ tùng, SKU, người yêu cầu..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
            />
          </div>

          {/* Tổng hợp theo phụ tùng */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Tổng hợp cần mua</h2>
                <span className="bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
                  {filteredBySparePart.length} phụ tùng
                </span>
              </div>
              <button
                onClick={handleExportExcel}
                disabled={isExporting || filteredBySparePart.length === 0}
                className="h-9 flex items-center gap-1.5 px-4 rounded-lg text-xs font-bold text-white bg-[#00285E] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                Xuất Excel
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                    <th className="py-3 px-6">Phụ tùng</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Tồn hiện tại</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Tổng cần mua</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={3} className="py-10 text-center text-slate-400 text-sm">
                        <Loader2 size={20} className="animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : filteredBySparePart.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-10 text-center text-slate-400 text-sm">
                        Không có phụ tùng nào đang thiếu tồn.
                      </td>
                    </tr>
                  ) : (
                    filteredBySparePart.map((item) => (
                      <tr key={item.spare_part_id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-2">
                            <Package size={13} className="text-amber-500 shrink-0" />
                            <span className="text-sm font-semibold text-slate-800">{item.sparePart?.name ?? "—"}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 ml-5">
                            {item.sparePart?.sku}
                            {item.sparePart?.brand && ` · ${item.sparePart.brand}`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-sm font-semibold text-slate-700">{item.stock_quantity}</td>
                        <td className="py-3 px-4 text-center text-sm font-bold text-amber-600">{item.total_quantity_needed}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Theo từng đơn */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Theo từng lệnh sửa chữa</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                    <th className="py-3 px-6">Lệnh sửa chữa</th>
                    <th className="py-3 px-4">Phụ tùng</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Số lượng</th>
                    <th className="py-3 px-4">Người yêu cầu</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredByServiceOrder.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-400 text-sm">
                        Không có yêu cầu nào đang chờ xử lý.
                      </td>
                    </tr>
                  ) : (
                    filteredByServiceOrder.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-6 text-sm font-bold text-[#00285E]">
                          {item.serviceOrderId ? `SO-${String(item.serviceOrderId).padStart(3, "0")}` : "—"}
                          {item.vehiclePlate && (
                            <span className="block text-[11px] font-medium text-slate-400">{item.vehiclePlate}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-700">{item.sparePart?.name ?? "—"}</td>
                        <td className="py-3 px-4 text-center text-sm font-bold text-amber-600">{item.quantity_needed}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                            <User size={12} className="text-slate-400 shrink-0" />
                            {item.requestedByUser?.fullName ?? "—"}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th className="py-3 px-6">Lệnh sửa chữa</th>
                  <th className="py-3 px-4">Phụ tùng</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Số lượng</th>
                  <th className="py-3 px-4">Người yêu cầu</th>
                  <th className="py-3 px-4">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400 text-sm">
                      Chưa có lịch sử yêu cầu bổ sung nào.
                    </td>
                  </tr>
                ) : (
                  history.map((item) => {
                    const cfg = HISTORY_STATUS_LABEL[item.status] ?? HISTORY_STATUS_LABEL.RESOLVED;
                    return (
                      <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-6 text-sm font-bold text-[#00285E]">
                          {item.serviceOrderId ? `SO-${String(item.serviceOrderId).padStart(3, "0")}` : "—"}
                          {item.vehiclePlate && (
                            <span className="block text-[11px] font-medium text-slate-400">{item.vehiclePlate}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-700">{item.sparePart?.name ?? "—"}</td>
                        <td className="py-3 px-4 text-center text-sm font-bold text-slate-700">{item.quantity_needed}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                            <User size={12} className="text-slate-400 shrink-0" />
                            {item.requestedByUser?.fullName ?? "—"}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.className}`}>
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
