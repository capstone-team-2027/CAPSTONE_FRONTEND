import { useState, useEffect, useMemo } from "react";
import {
  Package,
  Loader2,
  ArrowLeft,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
} from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useFetchClient_v2 as useFetchClient } from "../../../hook/useFetchClient";
import { RESTOCK_SUGGESTION_API_ENDPOINTS } from "../../../constants/inventory/restockSuggestionApiEndpoint";

interface RestockSuggestionItem {
  part_id: number;
  sku: string | null;
  name: string;
  brand: string | null;
  stock_quantity: number;
  held_quantity: number;
  available_stock: number;
  daily_consumption: number;
  trend_percent: number | null;
  restock_days: number;
  projected_demand: number;
  suggested_quantity: number;
}

interface RestockSuggestionResponse {
  restock_days: number;
  consumption_window_days: number;
  suggestions: RestockSuggestionItem[];
}

const URGENCY_RANK = { HET_HANG: 0, SAP_HET: 1, NEN_NHAP: 2 } as const;

// Mức độ cấp thiết dựa trên tỉ lệ còn lại so với nhu cầu dự kiến — để người xem hiểu ngay
// "cần nhập gấp" hay "còn dùng tạm được" mà không phải tự suy ra từ các con số kỹ thuật.
const getUrgency = (item: RestockSuggestionItem) => {
  if (item.available_stock <= 0) {
    return {
      rank: URGENCY_RANK.HET_HANG,
      label: "Hết hàng",
      icon: AlertTriangle,
      badgeClass: "bg-rose-700 text-white",
    };
  }
  const ratio = item.projected_demand > 0 ? item.available_stock / item.projected_demand : 0;
  if (ratio < 0.34) {
    return {
      rank: URGENCY_RANK.SAP_HET,
      label: "Sắp hết",
      icon: TrendingDown,
      badgeClass: "bg-amber-100 text-amber-700",
    };
  }
  return {
    rank: URGENCY_RANK.NEN_NHAP,
    label: "Nên nhập thêm",
    icon: Package,
    badgeClass: "bg-[#00285E] text-white",
  };
};

const PAGE_SIZE = 8;

export default function InventoryRestockSuggestions() {
  const { searchQuery } = useOutletContext<{
    searchQuery: string;
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();
  const { fetchPrivate } = useFetchClient();
  const navigate = useNavigate();
  const [localSearch, setLocalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "HET_HANG" | "SAP_HET" | "NEN_NHAP">("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [data, setData] = useState<RestockSuggestionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const effectiveSearch = (searchQuery || localSearch).toLowerCase();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const result = await fetchPrivate<RestockSuggestionResponse>(
          RESTOCK_SUGGESTION_API_ENDPOINTS.LIST,
          "GET",
        );
        setData(result.data);
      } catch (error) {
        console.error("Lỗi khi lấy đề xuất nhập hàng", error);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [fetchPrivate]);

  const sorted = useMemo(() => {
    const suggestions = data?.suggestions ?? [];
    return [...suggestions].sort((a, b) => {
      const rankDiff = getUrgency(a).rank - getUrgency(b).rank;
      if (rankDiff !== 0) return rankDiff;
      return b.suggested_quantity - a.suggested_quantity;
    });
  }, [data]);

  const filtered = useMemo(() => {
    return sorted.filter((item) => {
      const matchSearch =
        !effectiveSearch ||
        item.name.toLowerCase().includes(effectiveSearch) ||
        (item.sku ?? "").toLowerCase().includes(effectiveSearch) ||
        (item.brand ?? "").toLowerCase().includes(effectiveSearch);
      const matchStatus =
        statusFilter === "all" || getUrgency(item).rank === URGENCY_RANK[statusFilter];
      return matchSearch && matchStatus;
    });
  }, [sorted, effectiveSearch, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [effectiveSearch, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(-1)}
          title="Quay lại"
          className="mt-0.5 w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#00285E] hover:border-slate-300 active:scale-[0.97] transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2 flex items-center gap-2">
            Đề xuất nhập hàng
          </h1>
          <p className="text-slate-500 text-sm">
            Dựa trên tồn kho hiện tại và tốc độ dùng thực tế, đảm bảo đủ hàng dùng trong{" "}
            {data?.restock_days ?? 14} ngày tới.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm tên, mã, hãng phụ tùng..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
            />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 border border-slate-200/80 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <Filter size={13} />
              {statusFilter === "all"
                ? "Tất cả trạng thái"
                : statusFilter === "HET_HANG"
                ? "Hết hàng"
                : statusFilter === "SAP_HET"
                ? "Sắp hết"
                : "Nên nhập thêm"}
            </button>
            {isFilterOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsFilterOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-1.5 w-44 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                  {[
                    { value: "all", label: "Tất cả trạng thái" },
                    { value: "HET_HANG", label: "Hết hàng" },
                    { value: "SAP_HET", label: "Sắp hết" },
                    { value: "NEN_NHAP", label: "Nên nhập thêm" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setStatusFilter(option.value as typeof statusFilter);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                        statusFilter === option.value
                          ? "bg-[#EDF3FF] text-[#00285E]"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center gap-2 text-slate-400 text-sm">
            <Loader2 size={18} className="animate-spin" />
            Đang phân tích dữ liệu tồn kho...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Package size={32} className="text-slate-300" />
            <p className="text-sm font-semibold">
              Không có phụ tùng nào cần nhập thêm lúc này.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                    <th className="py-4 px-6">Mã</th>
                    <th className="py-4 px-4">Phụ tùng</th>
                    <th className="py-4 px-4">Trạng thái</th>
                    <th className="py-4 px-4 text-center">Số lượng tồn kho</th>
                    <th className="py-4 px-6 text-center">Đề xuất nhập</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item) => {
                    const urgency = getUrgency(item);
                    const UrgencyIcon = urgency.icon;
                    return (
                      <tr
                        key={item.part_id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <p className="text-sm text-slate-600">{item.sku ? item.sku : "Chưa có mã"}</p>
                          {item.brand && (
                            <p className="text-xs text-slate-400">{item.brand}</p>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-semibold text-slate-800 text-sm">{item.name}</p>
                          {item.trend_percent !== null && item.trend_percent >= 20 && (
                            <span className="inline-flex items-center gap-0.5 text-xs text-rose-500 font-semibold mt-0.5">
                              <TrendingUp size={11} />
                              Nhu cầu tăng {item.trend_percent}%
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${urgency.badgeClass}`}
                          >
                            <UrgencyIcon size={12} />
                            {urgency.label}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-base font-bold text-[#00285E] tabular-nums">
                            {item.stock_quantity.toLocaleString("vi-VN")}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold text-white bg-[#00285E] tabular-nums">
                            Số lượng: {item.suggested_quantity.toLocaleString("vi-VN")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
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
            )}
          </>
        )}
      </div>
    </div>
  );
}
