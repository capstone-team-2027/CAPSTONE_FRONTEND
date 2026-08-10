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
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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
  const [data, setData] = useState<RestockSuggestionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  // Load computed on-the-fly stock suggestions
  const loadSuggestions = async () => {
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

  useEffect(() => {
    if (activeTab === "current") {
      void loadSuggestions();
    }
  }, [fetchPrivate, activeTab]);

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
  const handleDownloadProposalPdf = async (proposal: any) => {
    if (!proposal) return;
    try {
      showToast("Đang tạo tệp PDF đề xuất nhập hàng...", "info");
      const [fontResponse, boldFontResponse] = await Promise.all([
        fetch("/fonts/NotoSans.ttf"),
        fetch("/fonts/NotoSans-Bold.ttf"),
      ]);
      if (!fontResponse.ok || !boldFontResponse.ok) {
        throw new Error("Không tải được font tiếng Việt.");
      }
      const fontBase64 = arrayBufferToBase64(await fontResponse.arrayBuffer());
      const boldFontBase64 = arrayBufferToBase64(await boldFontResponse.arrayBuffer());
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      doc.addFileToVFS("NotoSans.ttf", fontBase64);
      doc.addFileToVFS("NotoSans-Bold.ttf", boldFontBase64);
      doc.addFont("NotoSans.ttf", "NotoSans", "normal");
      doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
      doc.setFont("NotoSans", "normal");

      const navy: [number, number, number] = [0, 40, 94];
      const navyDark: [number, number, number] = [0, 26, 61];
      const amber: [number, number, number] = [249, 161, 27];
      const black: [number, number, number] = [15, 23, 42];
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;

      const creatorName = proposal.creator?.fullName || "Quản lý kho";
      const createdDate = new Date(proposal.createdAt);
      const day = createdDate.getDate();
      const month = createdDate.getMonth() + 1;
      const year = createdDate.getFullYear();

      // ===== HEADER =====
      const headerHeight = 34;
      doc.setFillColor(...navy);
      doc.rect(0, 0, pageWidth, headerHeight, "F");
      doc.setFillColor(...navyDark);
      doc.circle(pageWidth - 14, -6, 26, "F");
      doc.setFillColor(...amber);
      doc.rect(0, headerHeight, pageWidth, 1.4, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(14);
      doc.text("AGM INTELLIGENT GARAGE", margin, 14);
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(8);
      doc.text("Trung tâm chăm sóc & sửa chữa ô tô chính hãng", margin, 20);
      doc.text("Hotline: 1900 0000 · agmgarage.vn", margin, 25.5);

      doc.setFont("NotoSans", "normal");
      doc.setFontSize(9);
      doc.text(`Số đề xuất: ${proposal.proposal_code}`, pageWidth - margin, 16, { align: "right" });
      doc.setFontSize(8);
      doc.text(`Ngày ${day} tháng ${month} năm ${year}`, pageWidth - margin, 22, { align: "right" });

      doc.setTextColor(...navy);
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(15);
      doc.text("ĐỀ XUẤT NHẬP HÀNG PHỤ TÙNG", pageWidth / 2, headerHeight + 10, { align: "center" });

      doc.setTextColor(...black);
      const infoY = headerHeight + 18;
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(9.5);
      doc.text(`Người lập đề xuất: ${creatorName}`, margin, infoY);
      doc.text(`Phương thức phân tích: Đánh giá dữ liệu tồn kho & dự báo`, margin, infoY + 5.5);

      let currentY = infoY + 12;

      // summary card in PDF
      if (proposal.analysis_result) {
        doc.setFillColor(244, 247, 252);
        doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, "F");
        doc.setDrawColor(220, 232, 255);
        doc.setLineWidth(0.2);
        doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, "S");
        
        doc.setFont("NotoSans", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...navy);
        doc.text("TỔNG QUAN PHÂN TÍCH TỒN KHO:", margin + 4, currentY + 5);

        doc.setFont("NotoSans", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...black);
        const textLines = doc.splitTextToSize(proposal.analysis_result, contentWidth - 8);
        doc.text(textLines, margin + 4, currentY + 10);
        currentY += 28;
      }

      autoTable(doc, {
        startY: currentY,
        head: [["STT", "Mã SKU", "Tên phụ tùng", "Hãng", "Tồn hiện tại", "Đề xuất nhập"]],
        body: (proposal.items || []).map((item: any, index: number) => [
          index + 1,
          item.sku || "—",
          item.name || "—",
          item.brand || "—",
          item.stock_quantity ?? item.available_stock ?? 0,
          item.suggested_quantity || 0
        ]),
        styles: { font: "NotoSans", fontSize: 8, cellPadding: 2, textColor: black, lineColor: black, lineWidth: 0.15 },
        headStyles: { fillColor: navy, textColor: [255, 255, 255], font: "NotoSans", fontStyle: "bold", halign: "center" },
        theme: "grid",
        margin: { left: margin, right: margin },
      });

      const finalY = (doc as any).lastAutoTable.finalY;
      const signBlockY = finalY + 12;
      const col1 = margin + contentWidth * (1 / 4);
      const col2 = margin + contentWidth * (3 / 4);

      doc.setFont("NotoSans", "normal");
      doc.setFontSize(8.5);
      doc.text(`Ngày ${day} tháng ${month} năm ${year}`, col2, signBlockY, { align: "center" });

      const titleY = signBlockY + 6;
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(9);
      doc.text("Người phê duyệt", col1, titleY, { align: "center" });
      doc.text("Người lập đề xuất", col2, titleY, { align: "center" });

      doc.setFont("NotoSans", "normal");
      doc.setFontSize(7.5);
      doc.text("(Ký, ghi rõ họ tên)", col1, titleY + 4, { align: "center" });
      doc.text("(Ký, ghi rõ họ tên)", col2, titleY + 4, { align: "center" });

      const nameY = titleY + 24;
      doc.setFontSize(8.5);
      doc.text("............................", col1, nameY, { align: "center" });
      doc.text(creatorName, col2, nameY, { align: "center" });

      doc.save(`${proposal.proposal_code}.pdf`);
      showToast("Tải tệp PDF thành công!", "success");
    } catch (error) {
      console.error("PDF generation failed:", error);
      showToast("Tạo PDF thất bại.", "warning");
    }
  };

  // Determine current active suggestions items (Standard vs AI result)
  const currentList = useMemo(() => {
    if (aiProposal) {
      return (aiProposal.items || []) as RestockSuggestionItem[];
    }
    return (data?.suggestions ?? []) as RestockSuggestionItem[];
  }, [aiProposal, data]);

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
      return matchText;
    });
  }, [historyProposals, historySearch]);

  useEffect(() => {
    setPage(1);
  }, [effectiveSearch, statusFilter]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch]);

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
                    onClick={() => handleDownloadProposalPdf(aiProposal)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#00285E] bg-white hover:bg-slate-50 active:scale-[0.97] transition-all cursor-pointer"
                  >
                    <FileDown size={14} />
                    Xem & Tải đề xuất PDF
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
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                  {aiProposal ? "Chi tiết đề xuất nhập kho" : "Danh mục phụ tùng cần nhập"}
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

                {!aiProposal && (
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
                                setStatusFilter(option.value as typeof statusFilter);
                                setIsFilterOpen(false);
                              }}
                              className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
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
                )}
              </div>
            </div>

            {/* AI Loading state */}
            {isAiLoading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={36} className="animate-spin text-[#00285E]" />
                <p className="text-sm font-bold text-slate-500 animate-pulse">
                  Đang chạy phân tích trên toàn bộ dữ liệu kho và nhu cầu...
                </p>
              </div>
            ) : isLoading ? (
              <div className="py-16 flex items-center justify-center gap-2 text-slate-400 text-sm">
                <Loader2 size={18} className="animate-spin" />
                Đang phân tích dữ liệu tồn kho...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Package size={32} className="text-slate-300" />
                <p className="text-sm font-semibold">Không có phụ tùng nào cần nhập thêm lúc này.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[780px] text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                        <th className="py-4 px-6">Mã</th>
                        <th className="py-4 px-4">Phụ tùng</th>
                        <th className="py-4 px-4">Trạng thái</th>
                        <th className="py-4 px-4 text-center">Số lượng tồn kho</th>
                        <th className="py-4 px-4 text-center">Đề xuất nhập</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((item) => {
                        const urgency = getUrgency(item);
                        const UrgencyIcon = urgency.icon;
                        const currentStock = item.available_stock !== undefined ? item.available_stock : item.stock_quantity;
                        return (
                          <tr
                            key={item.part_id}
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors"
                          >
                            <td className="py-4 px-6">
                              <p className="text-sm text-slate-600 font-medium">{item.sku ? item.sku : "Chưa có mã"}</p>
                              {item.brand && <p className="text-xs text-slate-400">{item.brand}</p>}
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
                                {currentStock.toLocaleString("vi-VN")}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold text-white bg-[#00285E] tabular-nums">
                                Số lượng: {item.suggested_quantity.toLocaleString("vi-VN")}
                              </span>
                            </td>
                            {/* Ly do column removed */}
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
            <div className="relative flex-1 sm:max-w-xs">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm mã đề xuất, người tạo..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
              />
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
                                onClick={() => handleDownloadProposalPdf(p)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                              >
                                <FileDown size={12} />
                                Tải PDF
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
                    onClick={() => handleDownloadProposalPdf(selectedHistory)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#00285E] bg-white hover:bg-slate-50 transition-colors"
                  >
                    <FileDown size={14} />
                    Tải PDF
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
