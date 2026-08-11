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
  FileDown,
} from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useFetchClient_v2 as useFetchClient } from "../../../hook/useFetchClient";
import { RESTOCK_SUGGESTION_API_ENDPOINTS } from "../../../constants/inventory/restockSuggestionApiEndpoint";
import ExcelJS from "exceljs";

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

const getUrgency = (item: RestockSuggestionItem) => {
  const stock = item.available_stock !== undefined ? item.available_stock : item.stock_quantity;
  if (stock <= 0) {
    return {
      rank: URGENCY_RANK.HET_HANG,
      label: "Hết hàng",
      icon: AlertTriangle,
      badgeClass: "bg-rose-700 text-white",
    };
  }
  const ratio = item.projected_demand > 0 ? stock / item.projected_demand : 0;
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
  const { searchQuery, showToast } = useOutletContext<{
    searchQuery: string;
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();
  const { fetchPrivate } = useFetchClient();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<RestockSuggestionItem[]>([]);
  const [localSearch, setLocalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "HET_HANG" | "SAP_HET" | "NEN_NHAP">("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const effectiveSearch = (searchQuery || localSearch).toLowerCase();

  const loadSuggestions = async () => {
    setIsLoading(true);
    try {
      const result = await fetchPrivate<RestockSuggestionResponse>(
        RESTOCK_SUGGESTION_API_ENDPOINTS.LIST,
        "GET",
      );
      setSuggestions(result.data?.suggestions ?? []);
    } catch (error) {
      console.error("Lỗi khi tải đề xuất nhập hàng:", error);
      showToast("Không thể tải đề xuất nhập hàng.", "warning");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownloadExcel = async () => {
    if (filtered.length === 0) return;
    try {
      showToast("Đang xuất Excel...", "info");
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Don dat hang");

      sheet.columns = [
        { width: 8 },
        { width: 18 },
        { width: 45 },
        { width: 18 },
        { width: 15 },
        { width: 18 },
        { width: 20 },
      ];

      const thinBorder = { style: "thin", color: { argb: "FFD1D5DB" } } as const;
      const cellBorder = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };

      let currentY = 1;

      const headerRow = sheet.getRow(currentY);
      headerRow.values = ["STT", "SKU", "Tên phụ tùng", "Thương hiệu", "Số lượng", "Đơn giá nhập", "Thành tiền"];
      headerRow.height = 24;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF00285E" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = cellBorder;
      });
      currentY++;

      const dataStartRow = currentY;
      filtered.forEach((item, idx) => {
        const row = sheet.getRow(currentY);
        row.values = [
          idx + 1,
          item.sku || "—",
          item.name || "—",
          item.brand || "—",
          item.suggested_quantity || 0,
          null,
          { formula: `E${currentY}*F${currentY}` },
        ];
        row.height = 20;

        const isEven = idx % 2 === 1;
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.border = cellBorder;
          cell.font = { size: 9.5 };
          if (isEven) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
          }
          if (colNumber === 3) {
            cell.alignment = { horizontal: "left", vertical: "middle" };
            cell.font = { bold: true, size: 9.5 };
          } else {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }
          if (colNumber === 5) {
            cell.font = { bold: true, color: { argb: "FF0F172A" }, size: 9.5 };
          }
          if (colNumber === 6) {
            cell.numFmt = '#,##0" VND"';
          }
          if (colNumber === 7) {
            cell.font = { bold: true, color: { argb: "FF00285E" }, size: 9.5 };
            cell.numFmt = '#,##0" VND"';
          }
        });
        currentY++;
      });
      const dataEndRow = currentY - 1;

      sheet.mergeCells(`A${currentY}:D${currentY}`);
      const totalLabel = sheet.getCell(`A${currentY}`);
      totalLabel.value = "TỔNG CỘNG";
      totalLabel.font = { bold: true, size: 10, color: { argb: "FF00285E" } };
      totalLabel.alignment = { horizontal: "right", vertical: "middle" };

      const qtyCell = sheet.getCell(`E${currentY}`);
      qtyCell.value = { formula: `SUM(E${dataStartRow}:E${dataEndRow})` };
      qtyCell.font = { bold: true, size: 10 };
      qtyCell.alignment = { horizontal: "center", vertical: "middle" };

      sheet.getCell(`F${currentY}`).value = "";

      const amountCell = sheet.getCell(`G${currentY}`);
      amountCell.value = { formula: `SUM(G${dataStartRow}:G${dataEndRow})` };
      amountCell.font = { bold: true, size: 10, color: { argb: "FF00285E" } };
      amountCell.alignment = { horizontal: "center", vertical: "middle" };
      amountCell.numFmt = '#,##0" VND"';

      const totalRow = sheet.getRow(currentY);
      totalRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = cellBorder;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const day = String(new Date().getDate()).padStart(2, "0");
      const month = String(new Date().getMonth() + 1).padStart(2, "0");
      const year = new Date().getFullYear();
      anchor.download = `DonDatHang-${year}${month}${day}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);

      showToast("Xuất Excel thành công!", "success");
    } catch (error) {
      console.error("Excel generation failed:", error);
      showToast("Tạo file Excel thất bại.", "warning");
    }
  };

  const sorted = useMemo(() => {
    return [...suggestions].sort((a, b) => {
      const rankDiff = getUrgency(a).rank - getUrgency(b).rank;
      if (rankDiff !== 0) return rankDiff;
      return b.suggested_quantity - a.suggested_quantity;
    });
  }, [suggestions]);

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
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto font-sans">
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(-1)}
          title="Quay lại"
          className="mt-0.5 w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-[#00285E] border border-[#00285E] text-white hover:bg-[#003C7D] hover:border-[#003C7D] active:scale-[0.97] transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2 flex items-center gap-2">
            Đề xuất nhập hàng
          </h1>
          <p className="text-slate-500 text-sm">
            Danh sách phụ tùng cần nhập thêm, tính theo tốc độ tiêu thụ trung bình 3 tháng gần nhất.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              Chi tiết đơn đặt hàng đề xuất
            </h2>
            <span className="bg-[#EDF3FF] text-[#00285E] px-2.5 py-0.5 rounded-full text-xs font-bold">
              {filtered.length} phụ tùng
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm tên, mã, hãng..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
              />
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFilterOpen((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 border border-slate-200/80 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
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
                  <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)} />
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
                          setStatusFilter(option.value as any);
                          setIsFilterOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 transition-colors ${
                          statusFilter === option.value ? "text-[#00285E] bg-[#EDF3FF]/40 font-bold" : "text-slate-600"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleDownloadExcel}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#00285E] hover:bg-[#00285E]/90 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileDown size={14} />
              Xuất Excel
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-24 flex items-center justify-center gap-2 text-slate-400 text-sm">
            <Loader2 size={24} className="animate-spin text-[#00285E]" />
            Đang tải đề xuất nhập hàng...
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                    <th className="py-4 px-6">Mã sản phẩm</th>
                    <th className="py-4 px-4">Tên sản phẩm</th>
                    <th className="py-4 px-4">Trạng thái</th>
                    <th className="py-4 px-4 text-center">Số lượng tồn kho</th>
                    <th className="py-4 px-4 text-center">Đề xuất nhập</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-14 text-center text-slate-400 text-xs">
                        Không tìm thấy phụ tùng đề xuất phù hợp...
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((item) => {
                      const urgency = getUrgency(item);
                      const UrgencyIcon = urgency.icon;
                      const currentStock = item.stock_quantity ?? item.available_stock ?? 0;
                      return (
                        <tr
                          key={item.part_id}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-4 px-6">
                            <p className="text-xs font-bold text-slate-800">{item.sku || "Chưa có mã"}</p>
                            {item.brand && <p className="text-[10px] text-slate-400 mt-0.5">{item.brand}</p>}
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-semibold text-slate-800 text-xs">{item.name}</p>
                            {item.trend_percent !== null && item.trend_percent >= 20 && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-rose-500 font-semibold mt-0.5">
                                <TrendingUp size={10} />
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
                              {currentStock.toLocaleString("vi-VN")}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold text-white bg-[#00285E] tabular-nums">
                              Số lượng: {item.suggested_quantity.toLocaleString("vi-VN")}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
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
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors cursor-pointer ${
                        n === safePage ? "bg-[#00285E] text-white shadow-sm" : "border border-slate-200 text-slate-600 hover:bg-white"
                      }`}
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
