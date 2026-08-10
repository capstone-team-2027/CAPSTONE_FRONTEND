import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowUpFromLine,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar,
  X,
  Package,
  Eye,
  Loader2,
  FileDown,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useFetchClient } from "../../../hook/useFetchClient";
import { EXPORT_LOG_API_ENDPOINTS } from "../../../constants/inventory/exportManagementApiEndPoint";

const PAGE_SIZE = 6;

const formatPrice = (v: number | string) =>
  Number(v).toLocaleString("vi-VN") + " VND";

const formatDate = (d: string) => new Date(d).toLocaleDateString("vi-VN");

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

const DIGIT_WORDS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

const threeDigitToWords = (n: number, isFirstGroup: boolean): string => {
  const hundred = Math.floor(n / 100);
  const remainder = n % 100;
  const ten = Math.floor(remainder / 10);
  const unit = remainder % 10;
  const parts: string[] = [];

  if (hundred > 0 || !isFirstGroup) {
    parts.push(DIGIT_WORDS[hundred], "trăm");
  }
  if (ten === 0) {
    if (unit > 0 && (hundred > 0 || !isFirstGroup)) parts.push("lẻ");
    if (unit > 0) parts.push(DIGIT_WORDS[unit]);
  } else if (ten === 1) {
    parts.push("mười");
    if (unit === 1) parts.push("một");
    else if (unit === 5) parts.push("lăm");
    else if (unit > 0) parts.push(DIGIT_WORDS[unit]);
  } else {
    parts.push(DIGIT_WORDS[ten], "mươi");
    if (unit === 1) parts.push("mốt");
    else if (unit === 5) parts.push("lăm");
    else if (unit > 0) parts.push(DIGIT_WORDS[unit]);
  }
  return parts.join(" ");
};

const numberToVietnameseWords = (value: number): string => {
  const n = Math.round(Math.abs(value));
  if (n === 0) return "Không đồng";

  const groups: number[] = [];
  let remaining = n;
  while (remaining > 0) {
    groups.unshift(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const groupNames = ["", "nghìn", "triệu", "tỷ"];
  const words: string[] = [];
  const groupCount = groups.length;

  groups.forEach((group, index) => {
    if (group === 0) return;
    const isFirstGroup = index === 0;
    const groupText = threeDigitToWords(group, isFirstGroup);
    const suffix = groupNames[groupCount - 1 - index];
    words.push(suffix ? `${groupText} ${suffix}` : groupText);
  });

  const sentence = words.join(" ").replace(/\s+/g, " ").trim();
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + " đồng";
};

// 1 phiếu xuất đã gom theo receipt_code (GET /export)
interface ExportReceipt {
  receipt_code: string;
  exported_at: string;
  item_count: number;
  total_amount: number;
  manager_name: string;
  technician_name: string | null;
  signature_method: string | null;
  signed_at: string | null;
}

// 1 dòng phụ tùng trong phiếu (GET /export/:receiptCode)
interface ExportDetailLine {
  id: number;
  receipt_code: string;
  createdAt: string;
  quantity: number;
  unit_price: number;
  signature_method: string | null;
  proof_image_url: string | null;
  received_at: string | null;
  part: { sku: string; name: string };
  receiver: { id: number; fullName: string | null } | null;
  manager: { id: number; fullName: string | null } | null;
}

const lineTotal = (r: ExportDetailLine) => r.quantity * Number(r.unit_price);

export default function InventoryExport() {
  const { searchQuery, showToast } = useOutletContext<{
    searchQuery: string;
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();

  const { fetchPrivate } = useFetchClient();
  const navigate = useNavigate();
  const [localSearch, setLocalSearch] = useState("");
  const [page, setPage] = useState(1);
  const effectiveSearch = (searchQuery || localSearch).toLowerCase();

  const [receipts, setReceipts] = useState<ExportReceipt[]>([]);

  // Modal chi tiết: phiếu đang mở + các dòng phụ tùng của nó
  const [selected, setSelected] = useState<ExportReceipt | null>(null);
  const [detailLines, setDetailLines] = useState<ExportDetailLine[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    handleGetExportHistory();
  }, []);

  const handleGetExportHistory = async () => {
    try {
      const result = await fetchPrivate<ExportReceipt[]>(
        EXPORT_LOG_API_ENDPOINTS.EXPORT_LOG,
        "GET",
      );
      setReceipts(result.data);
    } catch (error) {
      console.error("Lỗi lấy lịch sử xuất kho", error);
    }
  };

  const openDetail = async (receipt: ExportReceipt) => {
    setSelected(receipt);
    setDetailLines([]);
    setIsLoadingDetail(true);
    try {
      const result = await fetchPrivate<ExportDetailLine[]>(
        EXPORT_LOG_API_ENDPOINTS.EXPORT_DETAIL(receipt.receipt_code),
        "GET",
      );
      setDetailLines(result.data);
    } catch (error) {
      console.error("Lỗi lấy chi tiết phiếu xuất", error);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    setSelected(null);
    setDetailLines([]);
  };

  const handleDownloadReceiptPdf = async () => {
    if (!selected) return;
    try {
      const [fontResponse, boldFontResponse] = await Promise.all([
        fetch("/fonts/NotoSans.ttf"),
        fetch("/fonts/NotoSans-Bold.ttf"),
      ]);
      if (!fontResponse.ok || !boldFontResponse.ok) {
        throw new Error("Không tải được font của phiếu xuất kho.");
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

      const receiver = detailLines.find((line) => line.receiver)?.receiver;
      const receiverName = receiver?.fullName || selected.technician_name || "...................";
      const exportDate = new Date(selected.exported_at);
      const day = exportDate.getDate();
      const month = exportDate.getMonth() + 1;
      const year = exportDate.getFullYear();

      // ===== HEADER: dải màu thương hiệu =====
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
      doc.text(`Số: ${selected.receipt_code}`, pageWidth - margin, 16, { align: "right" });
      doc.setFontSize(8);
      doc.text(`Ngày ${day} tháng ${month} năm ${year}`, pageWidth - margin, 22, { align: "right" });

      doc.setTextColor(...navy);
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(16);
      doc.text("PHIẾU XUẤT KHO", pageWidth / 2, headerHeight + 12, { align: "center" });

      doc.setTextColor(...black);
      const infoY = headerHeight + 22;
      const infoCol2X = margin + contentWidth / 2;
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(9.5);
      doc.text(`Họ và tên người nhận hàng: ${receiverName}`, margin, infoY);
      doc.text(`Lý do xuất kho: Xuất phụ tùng phục vụ sửa chữa, bảo dưỡng xe`, infoCol2X, infoY);
      doc.text(`Bộ phận: Kỹ thuật viên`, margin, infoY + 5.5);
      doc.text(`Xuất tại kho: Kho vật tư - AGM Intelligent Garage`, infoCol2X, infoY + 5.5);
      doc.text(`Người lập phiếu: ${selected.manager_name}`, margin, infoY + 11);

      autoTable(doc, {
        startY: infoY + 18,
        head: [["STT", "Tên, nhãn hiệu phụ tùng", "Mã số", "ĐVT", "SL", "Đơn giá", "Thành tiền"]],
        body: detailLines.map((line, index) => [
          index + 1,
          line.part?.name ?? "—",
          line.part?.sku ?? "—",
          "Cái",
          line.quantity,
          formatPrice(line.unit_price),
          formatPrice(lineTotal(line)),
        ]),
        foot: [[
          "", "Cộng", "", "", "", "",
          formatPrice(selected.total_amount),
        ]],
        styles: { font: "NotoSans", fontSize: 8.5, cellPadding: 2.5, textColor: black, lineColor: black, lineWidth: 0.2 },
        headStyles: { fillColor: [230, 230, 230], textColor: black, font: "NotoSans", fontStyle: "bold", halign: "center" },
        footStyles: { fillColor: [255, 255, 255], textColor: black, font: "NotoSans", fontStyle: "bold" },
        theme: "grid",
        margin: { left: margin, right: margin },
      });

      const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
      const footerY = finalY + 8;
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...black);
      doc.text(
        `Tổng số tiền (bằng chữ): ${numberToVietnameseWords(Number(selected.total_amount))}`,
        margin,
        footerY,
        { maxWidth: contentWidth },
      );
      const signBlockY = footerY + 8;
      const col1 = margin + contentWidth * (1 / 4);
      const col2 = margin + contentWidth * (3 / 4);

      doc.setFont("NotoSans", "normal");
      doc.setFontSize(8.5);
      doc.text(`Ngày ${day} tháng ${month} năm ${year}`, col2, signBlockY, { align: "center" });

      const titleY = signBlockY + 6;
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(9);
      doc.text("Người lập phiếu", col1, titleY, { align: "center" });
      doc.text("Người nhận hàng", col2, titleY, { align: "center" });

      doc.setFont("NotoSans", "normal");
      doc.setFontSize(7.5);
      doc.text("(Ký, họ tên)", col1, titleY + 4, { align: "center" });
      doc.text("(Ký, họ tên)", col2, titleY + 4, { align: "center" });

      const nameY = titleY + 24;
      doc.setFontSize(8.5);
      doc.text(selected.manager_name || "—", col1, nameY, { align: "center" });
      doc.text(receiverName, col2, nameY, { align: "center" });

      doc.save(`${selected.receipt_code}.pdf`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể tạo phiếu xuất kho.", "warning");
    }
  };

  const filtered = useMemo(
    () =>
      receipts.filter(
        (r) =>
          (r.receipt_code ?? "").toLowerCase().includes(effectiveSearch) ||
          (r.manager_name ?? "").toLowerCase().includes(effectiveSearch),
      ),
    [receipts, effectiveSearch],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const stats = useMemo(() => {
    const totalReceipts = receipts.length;
    const totalValue = receipts.reduce(
      (s, r) => s + Number(r.total_amount),
      0,
    );
    return { totalReceipts, totalValue };
  }, [receipts]);

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
              Lịch sử xuất kho
            </h1>
            <p className="text-slate-500 text-sm">
              Danh sách các phiếu xuất kho đã thực hiện.
            </p>
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-orange-50 text-orange-600">
            <ArrowUpFromLine size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {stats.totalReceipts}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Tổng phiếu xuất
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
              Tổng giá trị xuất
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
              Danh sách phiếu xuất
            </h2>
            <span className="bg-orange-50 text-orange-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
              {filtered.length} phiếu
            </span>
          </div>

          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Tìm mã phiếu, người xuất..."
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
                <th className="py-4 px-4">Người xuất</th>
                <th className="py-4 px-4">Ngày xuất</th>
                <th className="py-4 px-4">Số phụ tùng</th>
                <th className="py-4 px-4">Tổng giá trị</th>
                <th className="py-4 px-4">Trạng thái</th>
                <th className="py-4 px-6">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-14 text-center text-slate-400 text-sm"
                  >
                    Không tìm thấy phiếu xuất phù hợp...
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
                      <span className="font-bold text-[#00285E] text-sm">
                        {r.receipt_code}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm font-semibold text-slate-700">
                      {r.manager_name}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                        <Calendar size={13} className="text-slate-400" />
                        {formatDate(r.exported_at)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-xs font-bold">
                        <Package size={11} className="text-slate-400" />
                        {r.item_count} phụ tùng
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm font-bold text-slate-800">
                      {formatPrice(r.total_amount)}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 whitespace-nowrap">
                        Đã xuất kho
                      </span>
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
            Hiển thị {pageItems.length} / {filtered.length} phiếu xuất
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
        {selected && (() => {
          return (
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
                    <ArrowUpFromLine size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">
                      {selected.receipt_code}
                    </h3>
                    <span className="text-xs font-semibold text-orange-300">
                      Phiếu xuất kho
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => void handleDownloadReceiptPdf()}
                    disabled={isLoadingDetail}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileDown size={15} />
                    Tải phiếu PDF
                  </button>
                  <button
                    onClick={closeDetail}
                    className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 px-7 py-6 space-y-5 bg-slate-50/50">
                {/* Thông tin phiếu */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                      Người xuất
                    </span>
                    <span className="text-sm font-semibold text-slate-800">
                      {selected.manager_name}
                    </span>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                      Ngày xuất
                    </span>
                    <span className="text-sm font-semibold text-slate-800">
                      {formatDate(selected.exported_at)}
                    </span>
                  </div>
                </div>

                {/* Trạng thái */}
                <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
                    Trạng thái
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                    Đã xuất kho
                  </span>
                </div>

                {/* Phụ tùng đã xuất */}
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Package size={14} className="text-slate-500" />
                      Phụ tùng đã xuất
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
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[480px] text-left border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                              <th className="py-3 px-4 align-middle">Phụ tùng</th>
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
                                    {line.part.name}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    {line.part.sku}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center text-xs font-semibold text-slate-700">
                                  {line.quantity}
                                </td>
                                <td className="py-3 px-4 text-right whitespace-nowrap text-xs text-slate-600 font-medium">
                                  {formatPrice(line.unit_price)}
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
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Tổng giá trị
                  </span>
                  <span className="text-lg font-bold text-[#00285E]">
                    {formatPrice(selected.total_amount)}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}