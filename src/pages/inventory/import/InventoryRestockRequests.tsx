import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Package,
  PackagePlus,
  CheckCircle2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
} from "lucide-react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useFetchClient } from "../../../hook/useFetchClient";
import { RESTOCK_REQUEST_API_ENDPOINTS } from "../../../constants/inventory/restockRequestApiEndpoint";

const PAGE_SIZE = 8;

interface RestockRequestItem {
  id: number;
  quantity_needed: number;
  status: "PENDING" | "RESOLVED" | "CANCELLED";
  createdAt: string;
  sparePart?: {
    id: number;
    sku: string;
    name: string;
    brand: string | null;
    stock_quantity: number;
  } | null;
  requestedByUser?: {
    id: number;
    fullName: string | null;
  } | null;
}

// Leader phát hiện phụ tùng có sẵn trong danh mục nhưng thiếu tồn khả dụng lúc lập báo giá ->
// gửi yêu cầu này để thủ kho biết cần mua thêm. Chỉ hiện các yêu cầu đang PENDING — sau khi
// thủ kho tự nhập kho đủ hàng (qua trang Lịch sử nhập kho bình thường), họ đánh dấu hoàn tất ở đây.
export default function InventoryRestockRequests() {
  const { searchQuery, showToast } = useOutletContext<{
    searchQuery: string;
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();

  const { fetchPrivate } = useFetchClient();
  const navigate = useNavigate();
  const [localSearch, setLocalSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<RestockRequestItem[]>([]);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const effectiveSearch = (searchQuery || localSearch).toLowerCase();

  useEffect(() => {
    handleGetRestockRequests();
  }, []);

  const handleGetRestockRequests = async () => {
    try {
      const result = await fetchPrivate<RestockRequestItem[]>(
        RESTOCK_REQUEST_API_ENDPOINTS.RESTOCK_REQUESTS,
        "GET",
      );
      setItems(result.data ?? []);
    } catch (error) {
      console.error("Lỗi lấy danh sách yêu cầu bổ sung phụ tùng", error);
    }
  };

  const handleResolve = async (item: RestockRequestItem) => {
    setResolvingId(item.id);
    try {
      await fetchPrivate(RESTOCK_REQUEST_API_ENDPOINTS.RESOLVE(item.id), "POST");
      showToast(`Đã đánh dấu hoàn tất yêu cầu bổ sung "${item.sparePart?.name}".`, "success");
      await handleGetRestockRequests();
    } catch (error: any) {
      showToast(error?.message || "Không thể xử lý yêu cầu.", "warning");
    } finally {
      setResolvingId(null);
    }
  };

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const name = item.sparePart?.name?.toLowerCase() ?? "";
      const sku = item.sparePart?.sku?.toLowerCase() ?? "";
      const requester = item.requestedByUser?.fullName?.toLowerCase() ?? "";
      return (
        name.includes(effectiveSearch) ||
        sku.includes(effectiveSearch) ||
        requester.includes(effectiveSearch)
      );
    });
  }, [items, effectiveSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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
              Yêu cầu bổ sung phụ tùng
            </h1>
            <p className="text-slate-500 text-sm">
              Phụ tùng có sẵn trong danh mục nhưng đang thiếu tồn — kỹ thuật viên trưởng gửi yêu cầu khi lập báo giá.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Danh sách</h2>
            <span className="bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
              {filtered.length} yêu cầu
            </span>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm tên phụ tùng, SKU, người yêu cầu..."
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-72 bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th className="py-4 px-6 align-middle">Phụ tùng</th>
                <th className="py-4 px-4 align-middle text-center whitespace-nowrap">Tồn hiện tại</th>
                <th className="py-4 px-4 align-middle text-center whitespace-nowrap">Cần bổ sung</th>
                <th className="py-4 px-4 align-middle">Người yêu cầu</th>
                <th className="py-4 px-6 align-middle whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-slate-400 text-sm">
                    Không có yêu cầu bổ sung nào đang chờ xử lý.
                  </td>
                </tr>
              ) : (
                pageItems.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 align-middle">
                      <div className="flex items-center gap-2">
                        <Package size={13} className="text-amber-500 shrink-0" />
                        <span className="text-sm font-semibold text-slate-800 truncate max-w-[220px]">
                          {item.sparePart?.name ?? "—"}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 ml-5">
                        {item.sparePart?.sku}
                        {item.sparePart?.brand && ` · ${item.sparePart.brand}`}
                      </span>
                    </td>
                    <td className="py-4 px-4 align-middle text-center text-sm font-semibold text-slate-700">
                      {item.sparePart?.stock_quantity ?? 0}
                    </td>
                    <td className="py-4 px-4 align-middle text-center text-sm font-bold text-amber-600">
                      {item.quantity_needed}
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                        <User size={12} className="text-slate-400 shrink-0" />
                        {item.requestedByUser?.fullName ?? "—"}
                      </div>
                    </td>
                    <td className="py-4 px-6 align-middle">
                      <button
                        onClick={() => handleResolve(item)}
                        disabled={resolvingId === item.id}
                        className="h-8 flex items-center gap-1.5 px-3 rounded-lg text-[11px] font-bold text-white bg-emerald-600 hover:brightness-110 active:scale-[0.97] transition-all whitespace-nowrap disabled:opacity-50"
                      >
                        {resolvingId === item.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={12} />
                        )}
                        Đã bổ sung
                      </button>
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
    </div>
  );
}
