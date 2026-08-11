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
  Sparkles,
  History,
  FileDown,
  Brain,
  Calendar,
  User,
  Eye,
  X,
} from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useFetchClient_v2 as useFetchClient } from "../../../hook/useFetchClient";
import { RESTOCK_SUGGESTION_API_ENDPOINTS } from "../../../constants/inventory/restockSuggestionApiEndpoint";
import ExcelJS from "exceljs";
import { motion, AnimatePresence } from "motion/react";

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
  reason?: string;
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

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

export default function InventoryRestockSuggestions() {
  const { searchQuery, showToast } = useOutletContext<{
    searchQuery: string;
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();
  const { fetchPrivate } = useFetchClient();
  const navigate = useNavigate();

  // Tab state
  const [activeTab, setActiveTab] = useState<"current" | "history">("current");

  // Standard tab state
  const [localSearch, setLocalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "HET_HANG" | "SAP_HET" | "NEN_NHAP">("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const effectiveSearch = (searchQuery || localSearch).toLowerCase();

  // AI Tab State
  const [aiProposal, setAiProposal] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // History Tab State
  const [historyProposals, setHistoryProposals] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedHistory, setSelectedHistory] = useState<any | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");



  // Load historical proposals
  const loadHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const result = await fetchPrivate<any[]>(
        RESTOCK_SUGGESTION_API_ENDPOINTS.PROPOSALS_LIST,
        "GET",
      );
      setHistoryProposals(result.data);
    } catch (error) {
      console.error("Lỗi khi tải lịch sử đề xuất", error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      void loadHistory();
    }
  }, [activeTab]);

  // AI Proposal Handler
  const handleAiAnalyze = async () => {
    setIsAiLoading(true);
    try {
      const result = await fetchPrivate<any>(
        RESTOCK_SUGGESTION_API_ENDPOINTS.AI_ANALYZE,
        "POST",
      );
      setAiProposal(result.data);
      showToast("Phân tích tồn kho bằng AI hoàn tất!", "success");
    } catch (error) {
      console.error("AI Analysis failed:", error);
      showToast("Phân tích AI thất bại, vui lòng thử lại.", "warning");
    } finally {
      setIsAiLoading(false);
    }
  };

  // PDF Export
  // Excel Export - Đơn đặt hàng gửi nhà cung cấp
  const handleDownloadProposalExcel = async (proposal: any) => {
    if (!proposal) return;
    try {
      showToast("Đang tạo đơn đặt hàng Excel...", "info");
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Don dat hang");

      // Cấu hình cột
      sheet.columns = [
        { width: 8 },   // STT
        { width: 18 },  // SKU
        { width: 45 },  // Tên phụ tùng
        { width: 18 },  // Thương hiệu
        { width: 15 },  // Số lượng
        { width: 18 },  // Đơn giá nhập
        { width: 20 },  // Thành tiền
      ];

      const thinBorder = { style: "thin", color: { argb: "FFD1D5DB" } } as const;
      const cellBorder = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };

      // ===== Dòng 1: Tiêu đề chính =====
      sheet.mergeCells("A1:G1");
      const titleCell = sheet.getCell("A1");
      titleCell.value = "ĐƠN ĐẶT HÀNG PHỤ TÙNG";
      titleCell.font = { bold: true, size: 14, color: { argb: "FF00285E" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      sheet.getRow(1).height = 28;

      // ===== Dòng 2: Thông tin chung =====
      const creatorName = proposal.creator?.fullName || "Quản lý kho";
      const createdDate = new Date(proposal.createdAt).toLocaleDateString("vi-VN");
      
      sheet.mergeCells("A2:G2");
      const subCell = sheet.getCell("A2");
      subCell.value = `Mã đơn hàng: ${proposal.proposal_code.replace("DXAI", "OD")}   |   Ngày lập: ${createdDate}   |   Đơn vị đặt: AGM Intelligent Garage`;
      subCell.font = { italic: true, size: 10, color: { argb: "FF475569" } };
      subCell.alignment = { horizontal: "center", vertical: "middle" };
      sheet.getRow(2).height = 20;

      // ===== Dòng 3: Dòng trống phân cách =====
      sheet.getRow(3).height = 8;

      let currentY = 4;

      // ===== Header của bảng dữ liệu =====
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

      // ===== Nội dung bảng =====
      const items = proposal.items || [];
      const dataStartRow = currentY;
      items.forEach((item: any, idx: number) => {
        const row = sheet.getRow(currentY);
        row.values = [
          idx + 1,
          item.sku || "—",
          item.name || "—",
          item.brand || "—",
          item.suggested_quantity || 0,
          null, // Đơn giá để nhà cung cấp điền
          { formula: `E${currentY}*F${currentY}` }, // Thành tiền tự động tính
        ];
        row.height = 20;

        const isEven = idx % 2 === 1;
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.border = cellBorder;
          cell.font = { size: 9.5 };
          if (isEven) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
          }
          // Căn lề
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

      // ===== Dòng Tổng cộng =====
      sheet.mergeCells(`A${currentY}:D${currentY}`);
      const totalLabel = sheet.getCell(`A${currentY}`);
      totalLabel.value = "TỔNG CỘNG";
      totalLabel.font = { bold: true, size: 10, color: { argb: "FF00285E" } };
      totalLabel.alignment = { horizontal: "right", vertical: "middle" };

      // Sum of quantity
      const qtyCell = sheet.getCell(`E${currentY}`);
      qtyCell.value = { formula: `SUM(E${dataStartRow}:E${dataEndRow})` };
      qtyCell.font = { bold: true, size: 10 };
      qtyCell.alignment = { horizontal: "center", vertical: "middle" };

      // Empty price cell
      sheet.getCell(`F${currentY}`).value = "";

      // Sum of total amount
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
      currentY++;

      // ===== Dòng trống phân cách trước chữ ký =====
      sheet.getRow(currentY).height = 14;
      currentY++;

      // ===== Khối chữ ký =====
      sheet.mergeCells(`A${currentY}:C${currentY}`);
      sheet.mergeCells(`D${currentY}:G${currentY}`);
      const dateCell = sheet.getCell(`D${currentY}`);
      dateCell.value = `Ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`;
      dateCell.font = { italic: true, size: 9.5, color: { argb: "FF475569" } };
      dateCell.alignment = { horizontal: "center", vertical: "middle" };
      sheet.getRow(currentY).height = 18;
      currentY++;

      sheet.mergeCells(`A${currentY}:C${currentY}`);
      sheet.mergeCells(`D${currentY}:G${currentY}`);
      const sig1 = sheet.getCell(`A${currentY}`);
      sig1.value = "ĐẠI DIỆN BÊN NHẬN (NHÀ CUNG CẤP)";
      sig1.font = { bold: true, size: 9.5, color: { argb: "FF1E293B" } };
      sig1.alignment = { horizontal: "center", vertical: "middle" };

      const sig2 = sheet.getCell(`D${currentY}`);
      sig2.value = "ĐẠI DIỆN BÊN ĐẶT (AGM GARAGE)";
      sig2.font = { bold: true, size: 9.5, color: { argb: "FF1E293B" } };
      sig2.alignment = { horizontal: "center", vertical: "middle" };
      sheet.getRow(currentY).height = 18;
      currentY++;

      // Chữ ký trống ký tên
      sheet.getRow(currentY).height = 24;
      currentY++;

      // Điền tên người ký
      sheet.mergeCells(`A${currentY}:C${currentY}`);
      sheet.mergeCells(`D${currentY}:G${currentY}`);
      const nameSign1 = sheet.getCell(`A${currentY}`);
      nameSign1.value = "............................";
      nameSign1.font = { size: 9.5, color: { argb: "FF64748B" } };
      nameSign1.alignment = { horizontal: "center", vertical: "middle" };

      const nameSign2 = sheet.getCell(`D${currentY}`);
      nameSign2.value = creatorName;
      nameSign2.font = { bold: true, size: 9.5, color: { argb: "FF1E293B" } };
      nameSign2.alignment = { horizontal: "center", vertical: "middle" };
      sheet.getRow(currentY).height = 18;

      // Xuất file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const finalFileName = proposal.proposal_code.replace("DXAI", "OD");
      anchor.download = `${finalFileName}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);

      showToast("Tải đơn đặt hàng Excel thành công!", "success");
    } catch (error) {
      console.error("Excel generation failed:", error);
      showToast("Tạo file Excel thất bại.", "warning");
    }
  };

  // Determine current active suggestions items (Standard vs AI result)
  const currentList = useMemo(() => {
    if (aiProposal) {
      return (aiProposal.items || []) as RestockSuggestionItem[];
    }
    return [] as RestockSuggestionItem[];
  }, [aiProposal]);

  const sorted = useMemo(() => {
    return [...currentList].sort((a, b) => {
      const rankDiff = getUrgency(a).rank - getUrgency(b).rank;
      if (rankDiff !== 0) return rankDiff;
      return b.suggested_quantity - a.suggested_quantity;
    });
  }, [currentList]);

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

  // History filtering
  const filteredHistory = useMemo(() => {
    return historyProposals.filter((p) => {
      const matchText =
        !historySearch ||
        p.proposal_code.toLowerCase().includes(historySearch.toLowerCase()) ||
        (p.creator?.fullName ?? "").toLowerCase().includes(historySearch.toLowerCase());
      
      let matchDate = true;
      if (startDate) {
        const sDate = new Date(startDate);
        sDate.setHours(0, 0, 0, 0);
        const pDate = new Date(p.createdAt);
        if (pDate < sDate) matchDate = false;
      }
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        const pDate = new Date(p.createdAt);
        if (pDate > eDate) matchDate = false;
      }
      return matchText && matchDate;
    });
  }, [historyProposals, historySearch, startDate, endDate]);

  useEffect(() => {
    setPage(1);
  }, [effectiveSearch, statusFilter]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const totalHistoryPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
  const safeHistoryPage = Math.min(historyPage, totalHistoryPages);
  const historyPageItems = filteredHistory.slice((safeHistoryPage - 1) * PAGE_SIZE, safeHistoryPage * PAGE_SIZE);

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto font-sans">
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
            Hệ thống hỗ trợ phân tích kho và tự động thiết lập danh sách đề xuất nhập hàng thông minh.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("current")}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "current"
              ? "border-[#00285E] text-[#00285E]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Sparkles size={16} className={activeTab === "current" ? "text-[#F9A11B]" : ""} />
          Đề xuất nhập hàng
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "history"
              ? "border-[#00285E] text-[#00285E]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <History size={16} />
          Lịch sử đề xuất
        </button>
      </div>

      {/* TAB CONTENT: CURRENT SUGGESTIONS */}
      {activeTab === "current" && (
        <div className="space-y-6">
          {/* AI trigger Banner */}
          {!aiProposal && !isAiLoading && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Brain size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Hệ thống Phân tích Tồn kho Tự động</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hệ thống sẽ phân tích toàn bộ tồn kho, đối chiếu tốc độ bán và đề xuất các phụ tùng cần nhập.
                  </p>
                </div>
              </div>
              <button
                onClick={handleAiAnalyze}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#00285E] hover:bg-[#00285E]/90 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer shrink-0"
              >
                <Sparkles size={14} className="text-[#F9A11B] animate-pulse" />
                Tự động phân tích tồn kho
              </button>
            </div>
          )}

          {/* Empty state invitation to analyze */}
          {!aiProposal && !isAiLoading && (
            <div className="bg-white border border-slate-200/60 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                <Package size={32} />
              </div>
              <div className="max-w-md">
                <h4 className="font-bold text-slate-800 text-base">Chưa chạy phân tích kho</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Hãy nhấn nút <strong>"Tự động phân tích tồn kho"</strong> ở trên để hệ thống tiến hành kiểm tra kho, đối chiếu tốc độ bán và lập đơn đặt hàng đề xuất.
                </p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isAiLoading && (
            <div className="bg-white border border-slate-200/60 rounded-2xl p-16 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-[#00285E] animate-spin" />
              <div className="text-center">
                <h4 className="font-bold text-slate-800 text-sm">Đang phân tích tồn kho...</h4>
                <p className="text-xs text-slate-400 mt-1">Hệ thống đang đối chiếu dữ liệu xuất nhập kho 3 tháng qua và tính toán số lượng đặt hàng tối ưu...</p>
              </div>
            </div>
          )}

          {/* AI Result Card */}
          {aiProposal && (
            <div className="bg-gradient-to-r from-blue-900 to-[#00285E] text-white rounded-2xl p-6 shadow-xl border border-blue-950 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center shadow-inner">
                    <Brain size={20} className="text-[#F9A11B]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base tracking-tight">Báo cáo Đề xuất Nhập hàng</h3>
                    <p className="text-[10px] text-blue-200">
                      Mã đề xuất: {aiProposal.proposal_code} · Người tạo: {aiProposal.creator?.fullName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadProposalExcel(aiProposal)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#00285E] bg-white hover:bg-slate-50 active:scale-[0.97] transition-all cursor-pointer"
                  >
                    <FileDown size={14} />
                    Tải đơn đặt hàng Excel
                  </button>
                  <button
                    onClick={() => setAiProposal(null)}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
                  >
                    Quay lại mặc định
                  </button>
                </div>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-xs leading-relaxed text-blue-50 font-medium">
                {aiProposal.analysis_result}
              </div>
            </div>
          )}

          {/* Main Suggestions Table container */}
          {aiProposal && (
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
                </div>
              </div>

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
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: PROPOSALS HISTORY */}
      {activeTab === "history" && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Lịch sử đề xuất nhập kho</h2>
              <span className="bg-[#EDF3FF] text-[#00285E] px-2.5 py-0.5 rounded-full text-xs font-bold">
                {filteredHistory.length} đề xuất
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-56">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm mã đề xuất, người tạo..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">Từ:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all text-slate-600"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">Đến:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all text-slate-600"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                  title="Xoá bộ lọc ngày"
                >
                  Xoá lọc
                </button>
              )}
            </div>
          </div>

          {isHistoryLoading ? (
            <div className="py-24 flex items-center justify-center gap-2 text-slate-400 text-sm">
              <Loader2 size={24} className="animate-spin text-[#00285E]" />
              Đang tải lịch sử đề xuất...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center gap-2 text-slate-400">
              <History size={36} className="text-slate-300" />
              <p className="text-sm font-semibold">Chưa có lịch sử đề xuất nào được tạo.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                      <th className="py-4 px-6">Mã đề xuất</th>
                      <th className="py-4 px-4">Người tạo</th>
                      <th className="py-4 px-4">Ngày tạo</th>
                      <th className="py-4 px-4 text-center">Số lượng loại phụ tùng</th>
                      <th className="py-4 px-6 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyPageItems.map((p) => {
                      const count = p.items ? p.items.length : 0;
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-4 px-6 font-bold text-[#00285E]">{p.proposal_code}</td>
                          <td className="py-4 px-4 text-slate-700 font-semibold">{p.creator?.fullName || "Quản lý kho"}</td>
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-1.5 text-slate-500 font-semibold text-xs">
                              <Calendar size={13} className="text-slate-400" />
                              {new Date(p.createdAt).toLocaleString("vi-VN")}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-xs font-bold">
                              {count} phụ tùng
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedHistory(p)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#00285E] hover:brightness-110 cursor-pointer"
                              >
                                <Eye size={12} />
                                Chi tiết
                              </button>
                              <button
                                onClick={() => handleDownloadProposalExcel(p)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                              >
                                <FileDown size={12} />
                                Tải Excel
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalHistoryPages > 1 && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-3">
                  <span className="text-xs font-medium text-slate-400">
                    Hiển thị {historyPageItems.length} / {filteredHistory.length} đề xuất
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      disabled={safeHistoryPage === 1}
                      className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: totalHistoryPages }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        onClick={() => setHistoryPage(n)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors cursor-pointer ${
                          n === safeHistoryPage ? "bg-[#00285E] text-white shadow-sm" : "border border-slate-200 text-slate-600 hover:bg-white"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                      disabled={safeHistoryPage === totalHistoryPages}
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
      )}

      {/* HISTORICAL DETAIL MODAL */}
      <AnimatePresence>
        {selectedHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedHistory(null)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-7 py-5 bg-[#00285E] text-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                    <Brain size={18} className="text-[#F9A11B]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold leading-tight">{selectedHistory.proposal_code}</h3>
                    <span className="text-xs font-semibold text-blue-200">Chi tiết đề xuất nhập kho</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadProposalExcel(selectedHistory)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#00285E] bg-white hover:bg-slate-50 transition-colors"
                  >
                    <FileDown size={14} />
                    Tải Excel
                  </button>
                  <button
                    onClick={() => setSelectedHistory(null)}
                    className="p-2 rounded-full hover:bg-white/20 text-white/85 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto flex-1 px-7 py-6 space-y-6 bg-slate-50/50">
                {/* Meta details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200/70 p-4 rounded-xl flex items-center gap-3">
                    <User className="text-slate-400" size={18} />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Người lập</span>
                      <span className="text-sm font-semibold text-slate-800">
                        {selectedHistory.creator?.fullName || "Quản lý kho"}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200/70 p-4 rounded-xl flex items-center gap-3">
                    <Calendar className="text-slate-400" size={18} />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Thời gian tạo</span>
                      <span className="text-sm font-semibold text-slate-800">
                        {new Date(selectedHistory.createdAt).toLocaleString("vi-VN")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Analysis Summary */}
                {selectedHistory.analysis_result && (
                  <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50 border border-blue-100 rounded-xl p-5 space-y-2">
                    <h4 className="text-xs font-bold text-[#00285E] flex items-center gap-1.5">
                      <Brain size={14} className="text-[#F9A11B]" />
                      TỔNG QUAN PHÂN TÍCH
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {selectedHistory.analysis_result}
                    </p>
                  </div>
                )}

                {/* Items list */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
                    <Package size={14} className="text-slate-500" />
                    Danh sách phụ tùng đề xuất
                  </label>
                  <div className="bg-white rounded-xl border border-slate-200/70 overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                          <th className="py-3 px-4 w-12 text-center">STT</th>
                          <th className="py-3 px-4">Mã SKU</th>
                          <th className="py-3 px-4">Tên phụ tùng</th>
                          <th className="py-3 px-4">Hãng</th>
                          <th className="py-3 px-4 text-center">Tồn kho</th>
                          <th className="py-3 px-4 text-center">Đề xuất nhập</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedHistory.items || []).map((item: any, idx: number) => {
                          const currentStock = item.available_stock !== undefined ? item.available_stock : item.stock_quantity;
                          return (
                            <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/40">
                              <td className="py-3 px-4 text-center text-slate-500 font-semibold">{idx + 1}</td>
                              <td className="py-3 px-4 font-medium text-slate-600">{item.sku || "—"}</td>
                              <td className="py-3 px-4 font-bold text-slate-800">{item.name}</td>
                              <td className="py-3 px-4 text-slate-500 font-semibold">{item.brand || "—"}</td>
                              <td className="py-3 px-4 text-center font-bold text-[#00285E]">{currentStock}</td>
                              <td className="py-3 px-4 text-center">
                                <span className="inline-flex px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">
                                  {item.suggested_quantity}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-7 py-4 border-t border-slate-100 flex justify-end shrink-0 bg-white">
                <button
                  onClick={() => setSelectedHistory(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Đóng lại
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
