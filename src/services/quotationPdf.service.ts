import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { GetQuotationResponse } from "../model/dto/quoteManagement.dto";

export type QuotationPdfInput = GetQuotationResponse & {
  code: string;
  customerName: string;
  customerPhone: string;
  vehiclePlate: string;
  vehicleName: string;
  vehicleColor: string;
};

export const formatVND = (value: number | string) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value) || 0)} VND`;

export const sanitizeFileNamePart = (value: string, fallback: string) =>
  (value.trim() || fallback)
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

const formatDateTimeForPdf = (dateStr: string) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Dựng file PDF báo giá dùng chung cho cả lễ tân (in tại quầy) và khách hàng
// (xem trước/tải về từ trang cá nhân) — layout đồng bộ giữa 2 phía.
export const buildQuotationPdfDocument = async (
  quotation: QuotationPdfInput,
  preparedByName: string,
  statusLabel: string,
) => {
  const [fontResponse, boldFontResponse] = await Promise.all([
    fetch("/fonts/NotoSans.ttf"),
    fetch("/fonts/NotoSans-Bold.ttf"),
  ]);
  if (!fontResponse.ok || !boldFontResponse.ok) {
    throw new Error("Không tải được font của báo giá.");
  }
  const fontBase64 = arrayBufferToBase64(await fontResponse.arrayBuffer());
  const boldFontBase64 = arrayBufferToBase64(
    await boldFontResponse.arrayBuffer(),
  );
  const document = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  document.addFileToVFS("NotoSans.ttf", fontBase64);
  document.addFileToVFS("NotoSans-Bold.ttf", boldFontBase64);
  document.addFont("NotoSans.ttf", "NotoSans", "normal");
  document.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
  document.setFont("NotoSans", "normal");

  // Bảng màu thương hiệu
  const navy: [number, number, number] = [0, 40, 94];
  const navyDark: [number, number, number] = [0, 26, 61];
  const amber: [number, number, number] = [249, 161, 27];
  const slate: [number, number, number] = [51, 65, 85];
  const lightSlate: [number, number, number] = [100, 116, 139];
  const paleBg: [number, number, number] = [237, 243, 255];
  const borderColor: [number, number, number] = [220, 232, 255];

  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const serviceItems = quotation.items.filter((item) => item.service_catalog);
  const partItems = quotation.items.filter(
    (item) => item.sparePart || item.customPartOrder,
  );

  const drawPageFooter = () => {
    const currentPage = document.getNumberOfPages();
    const totalPages = document.getNumberOfPages();
    document.setDrawColor(...borderColor);
    document.setLineWidth(0.3);
    document.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);
    document.setFont("NotoSans", "normal");
    document.setFontSize(7.5);
    document.setTextColor(...lightSlate);
    document.text(
      "AGM INTELLIGENT GARAGE · Phiếu báo giá điện tử, có giá trị tham khảo trước khi ký duyệt",
      margin,
      pageHeight - 11,
    );
    document.text(
      `Trang ${currentPage}/${totalPages}`,
      pageWidth - margin,
      pageHeight - 11,
      { align: "right" },
    );
  };

  // ===== HEADER: dải màu thương hiệu =====
  const headerHeight = 34;
  document.setFillColor(...navy);
  document.rect(0, 0, pageWidth, headerHeight, "F");
  document.setFillColor(...navyDark);
  document.circle(pageWidth - 14, -6, 26, "F");
  document.setFillColor(...amber);
  document.rect(0, headerHeight, pageWidth, 1.4, "F");

  document.setTextColor(255, 255, 255);
  document.setFont("NotoSans", "bold");
  document.setFontSize(14);
  document.text("AGM INTELLIGENT GARAGE", margin, 14);
  document.setFont("NotoSans", "normal");
  document.setFontSize(8);
  document.text(
    "Trung tâm chăm sóc & sửa chữa ô tô chính hãng",
    margin,
    20,
  );
  document.text(
    "Hotline: 1900 0000 · agmgarage.vn",
    margin,
    25.5,
  );

  document.setFont("NotoSans", "bold");
  document.setFontSize(15);
  document.text("PHIẾU BÁO GIÁ", pageWidth - margin, 14, { align: "right" });
  document.setFont("NotoSans", "normal");
  document.setFontSize(9);
  document.text(`Số: ${quotation.code}`, pageWidth - margin, 21, {
    align: "right",
  });
  // Badge trạng thái góc phải header
  document.setFontSize(8);
  const statusText = statusLabel.toLocaleUpperCase("vi-VN");
  const statusPadding = 3.5;
  const statusWidth = document.getTextWidth(statusText) + statusPadding * 2;
  const statusX = pageWidth - margin - statusWidth;
  document.setFillColor(...amber);
  document.roundedRect(statusX, 24.5, statusWidth, 6.5, 3.25, 3.25, "F");
  document.setTextColor(...navyDark);
  document.setFont("NotoSans", "bold");
  document.text(
    statusText,
    statusX + statusWidth / 2,
    28.8,
    { align: "center" },
  );

  // ===== INFO CARDS: khách hàng | chi tiết phiếu =====
  const cardsY = headerHeight + 8;
  const cardHeight = 34;
  const cardGap = 5;
  const cardWidth = (contentWidth - cardGap) / 2;

  const drawInfoCard = (
    x: number,
    title: string,
    rows: [string, string][],
  ) => {
    document.setFillColor(...paleBg);
    document.roundedRect(x, cardsY, cardWidth, cardHeight, 2.5, 2.5, "F");
    document.setDrawColor(...borderColor);
    document.setLineWidth(0.25);
    document.roundedRect(x, cardsY, cardWidth, cardHeight, 2.5, 2.5, "S");

    document.setFont("NotoSans", "bold");
    document.setFontSize(7.5);
    document.setTextColor(...navy);
    document.text(title.toLocaleUpperCase("vi-VN"), x + 5, cardsY + 6.5);
    document.setDrawColor(...amber);
    document.setLineWidth(0.6);
    document.line(x + 5, cardsY + 8.3, x + 22, cardsY + 8.3);

    let rowY = cardsY + 13.5;
    document.setFontSize(8);
    rows.forEach(([label, value]) => {
      document.setFont("NotoSans", "normal");
      document.setTextColor(...lightSlate);
      document.text(label, x + 5, rowY);
      document.setFont("NotoSans", "bold");
      document.setTextColor(...slate);
      const valueLines = document.splitTextToSize(value || "—", cardWidth - 32);
      document.text(valueLines, x + 26, rowY);
      rowY += 5.6;
    });
  };

  drawInfoCard(margin, "Thông tin khách hàng", [
    ["Họ tên", quotation.customerName],
    ["Điện thoại", quotation.customerPhone || "—"],
    ["Biển số xe", quotation.vehiclePlate || "—"],
    [
      "Loại xe",
      [quotation.vehicleName, quotation.vehicleColor].filter(Boolean).join(" · ") || "—",
    ],
  ]);
  drawInfoCard(margin + cardWidth + cardGap, "Thông tin phiếu báo giá", [
    ["Người lập", preparedByName],
    ["Ngày lập", formatDateTimeForPdf(quotation.createdAt)],
    [
      "Ngày duyệt",
      quotation.approved_at ? formatDateTimeForPdf(quotation.approved_at) : "—",
    ],
    ["Trạng thái", statusLabel],
  ]);

  // ===== BẢNG HẠNG MỤC: 1 bảng gộp, cột "Loại" phân biệt dịch vụ/phụ tùng =====
  let tableStartY = cardsY + cardHeight + 8;

  const tableColumns = [
    "STT",
    "Loại",
    "Nội dung",
    "Hạng mục lỗi liên quan",
    "SL",
    "Đơn giá",
    "Thành tiền",
  ];
  const columnStyles = {
    0: { halign: "center" as const, cellWidth: 10 },
    1: { cellWidth: 21 },
    2: { cellWidth: 37 },
    3: { cellWidth: 47 },
    4: { halign: "center" as const, cellWidth: 11 },
    5: { halign: "right" as const, cellWidth: 28 },
    6: { halign: "right" as const, cellWidth: 29 },
  };
  const tableBaseStyles = {
    styles: {
      font: "NotoSans",
      fontStyle: "normal" as const,
      fontSize: 7.8,
      cellPadding: 2.3,
      textColor: slate,
      lineColor: borderColor,
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: navy,
      textColor: [255, 255, 255] as [number, number, number],
      font: "NotoSans",
      fontStyle: "bold" as const,
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [249, 251, 255] as [number, number, number] },
    columnStyles,
    margin: { left: margin, right: margin, top: 18, bottom: 22 },
    didDrawPage: drawPageFooter,
  };

  const allItems = [...serviceItems, ...partItems];
  const bodyRows = allItems.map((item, index) => {
    const itemName =
      item.sparePart?.name ||
      item.customPartOrder?.item_name ||
      item.service_catalog?.service_name ||
      "Hạng mục khác";
    const issueText = [
      item.issue?.component?.name,
      item.issue?.error_description,
    ]
      .filter(Boolean)
      .join(" - ");
    return [
      index + 1,
      item.service_catalog
        ? "Dịch vụ"
        : item.customPartOrder
          ? "Phụ tùng đặt riêng"
          : "Phụ tùng",
      itemName,
      issueText || "—",
      item.quantity,
      formatVND(item.sparePart ? item.unit_price : item.repair_price),
      formatVND(item.amount),
    ];
  });

  autoTable(document, {
    ...tableBaseStyles,
    startY: tableStartY,
    head: [tableColumns],
    body: bodyRows,
  });
  tableStartY =
    (document as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 8;

  let currentY = tableStartY;
  const summaryBoxHeight = Number(quotation.deposit_amount) > 0 ? 32 : 24;
  if (currentY > pageHeight - summaryBoxHeight - 30) {
    document.addPage();
    currentY = 20;
  }

  // ===== GHI CHÚ (trái) + TỔNG KẾT (phải, dạng box nổi bật) =====
  const noteWidth = contentWidth - 70 - 6;
  document.setDrawColor(...borderColor);
  document.setLineWidth(0.25);
  document.roundedRect(margin, currentY, noteWidth, summaryBoxHeight, 2.5, 2.5, "S");
  document.setFont("NotoSans", "bold");
  document.setFontSize(7.5);
  document.setTextColor(...navy);
  document.text("GHI CHÚ", margin + 4, currentY + 6);
  document.setFont("NotoSans", "normal");
  document.setFontSize(8);
  document.setTextColor(...slate);
  const noteLines = document.splitTextToSize(
    quotation.note || "Không có ghi chú.",
    noteWidth - 8,
  );
  document.text(noteLines, margin + 4, currentY + 11.5);

  const summaryX = margin + noteWidth + 6;
  const summaryWidth = contentWidth - noteWidth - 6;
  document.setFillColor(...navy);
  document.roundedRect(summaryX, currentY, summaryWidth, summaryBoxHeight, 2.5, 2.5, "F");

  let summaryLineY = currentY + 7;
  document.setFont("NotoSans", "normal");
  document.setFontSize(8);
  document.setTextColor(226, 232, 255);
  document.text("Tạm tính", summaryX + 5, summaryLineY);
  document.text(
    formatVND(quotation.total_amount),
    summaryX + summaryWidth - 5,
    summaryLineY,
    { align: "right" },
  );

  if (Number(quotation.deposit_amount) > 0) {
    summaryLineY += 6;
    document.text("Tiền cọc (30%)", summaryX + 5, summaryLineY);
    document.setTextColor(...amber);
    document.text(
      formatVND(quotation.deposit_amount ?? 0),
      summaryX + summaryWidth - 5,
      summaryLineY,
      { align: "right" },
    );
  }

  summaryLineY += 8;
  document.setDrawColor(255, 255, 255);
  document.setLineWidth(0.2);
  document.line(summaryX + 5, summaryLineY - 5, summaryX + summaryWidth - 5, summaryLineY - 5);
  document.setFont("NotoSans", "bold");
  document.setFontSize(9);
  document.setTextColor(255, 255, 255);
  document.text("TỔNG CỘNG", summaryX + 5, summaryLineY);
  document.setFontSize(13);
  document.setTextColor(...amber);
  document.text(
    formatVND(quotation.total_amount),
    summaryX + summaryWidth - 5,
    summaryLineY + 0.5,
    { align: "right" },
  );

  // ===== KHỐI KÝ XÁC NHẬN =====
  // Báo giá đã duyệt (APPROVED) thì điền sẵn tên người ký thay cho chữ ký tay thật
  const isApproved = quotation.status === "APPROVED";
  const signatureBoxHeight = 26;
  const bottomPadding = 20;
  let signatureY = currentY + summaryBoxHeight + 14;
  if (signatureY + signatureBoxHeight + bottomPadding > pageHeight) {
    document.addPage();
    signatureY = 24;
  }
  const signatureColWidth = contentWidth / 2;
  document.setFont("NotoSans", "bold");
  document.setFontSize(8);
  document.setTextColor(...slate);
  document.text("ĐẠI DIỆN GARAGE", margin + signatureColWidth / 2, signatureY, {
    align: "center",
  });
  document.text(
    "KHÁCH HÀNG XÁC NHẬN",
    margin + signatureColWidth + signatureColWidth / 2,
    signatureY,
    { align: "center" },
  );

  if (isApproved) {
    document.setFont("NotoSans", "bold");
    document.setFontSize(11);
    document.setTextColor(...navy);
    document.text(
      preparedByName,
      margin + signatureColWidth / 2,
      signatureY + 9,
      { align: "center" },
    );
    document.text(
      quotation.customerName,
      margin + signatureColWidth + signatureColWidth / 2,
      signatureY + 9,
      { align: "center" },
    );
  }

  document.setFont("NotoSans", "normal");
  drawPageFooter();

  return document;
};
