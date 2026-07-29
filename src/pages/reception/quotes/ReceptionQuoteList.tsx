import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import type {
  GetQuotationResponse,
  GetAllSparePartsResponse,
  GetServicesResponse,
} from "../../../model/dto/quoteManagement.dto";
import {
  ArrowLeft,
  History,
  Search,
  Filter,
  FileText,
  ClipboardList,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  CheckCircle2,
  Clock,
  XCircle,
  Wrench,
  Package,
  Pencil,
  Printer,
  Trash2,
  Wallet,
  QrCode,
  Copy,
  Check,
  Banknote,
} from "lucide-react";
import { useFetchClient } from "../../../hook/useFetchClient";
import { useSocket } from "../../../hook/useSocket";
import { QUOTE_MANAGEMENT_ENDPOINTS } from "../../../constants/reception/quoteManagementEndpoints";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import "react-phone-input-2/lib/style.css";
import * as PhoneInputLib from "react-phone-input-2";
import type { ConfirmationResult } from "firebase/auth";
import {
  clearRecaptcha,
  sendOtp as sendFirebaseOtp,
  verifyOtp,
} from "../../../services/firebaseOtp";

type PhoneInputModule = { default?: unknown };

const resolvePhoneInput = <T,>(phoneInputModule: unknown): T => {
  const module = phoneInputModule as PhoneInputModule;
  if (module && typeof module === "object" && "default" in module) {
    const defaultExport = module.default as unknown;
    if (
      defaultExport &&
      typeof defaultExport === "object" &&
      "default" in (defaultExport as PhoneInputModule)
    ) {
      return (defaultExport as PhoneInputModule).default as T;
    }
    return defaultExport as T;
  }
  return phoneInputModule as T;
};

type PhoneInputProps = {
  country?: string;
  value?: string;
  onChange?: (value: string) => void;
  enableSearch?: boolean;
  searchPlaceholder?: string;
  inputProps?: { name?: string; autoFocus?: boolean; readOnly?: boolean };
  countryCodeEditable?: boolean;
  disableDropdown?: boolean;
};

const PhoneInput =
  resolvePhoneInput<React.ComponentType<PhoneInputProps>>(PhoneInputLib);

const quotationPhoneStyles = `
  .quotation-otp-phone .react-tel-input .form-control {
    width: 100% !important;
    height: 48px !important;
    border: 1px solid #e2e8f0 !important;
    border-radius: 0.75rem !important;
    padding-left: 58px !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    color: #1e293b !important;
    outline: none !important;
    transition: all 0.2s !important;
  }
  .quotation-otp-phone .react-tel-input .form-control:focus {
    border-color: #00285e !important;
    box-shadow: 0 0 0 4px rgba(0, 40, 94, 0.1) !important;
  }
  .quotation-otp-phone .react-tel-input .form-control[readonly] {
    background: #f8fafc !important;
    color: #475569 !important;
    cursor: not-allowed !important;
  }
  .quotation-otp-phone .react-tel-input .form-control[readonly]:focus {
    border-color: #e2e8f0 !important;
    box-shadow: none !important;
  }
  .quotation-otp-phone .react-tel-input .flag-dropdown {
    background: #f8fafc !important;
    border: 1px solid #e2e8f0 !important;
    border-right: 0 !important;
    border-radius: 0.75rem 0 0 0.75rem !important;
  }
  .quotation-otp-phone .react-tel-input .selected-flag {
    padding-left: 14px !important;
    border-radius: 0.75rem 0 0 0.75rem !important;
  }
  .quotation-otp-phone .react-tel-input .country-list {
    width: 340px !important;
    max-height: 220px !important;
    margin-top: 4px !important;
    border: 1px solid #e2e8f0 !important;
    border-radius: 0.75rem !important;
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16) !important;
  }
  .quotation-otp-phone .react-tel-input .country-list .search {
    background: #f8fafc !important;
    padding: 8px !important;
  }
  .quotation-otp-phone .react-tel-input .search-box {
    width: calc(100% - 8px) !important;
    margin-left: 4px !important;
    border: 1px solid #e2e8f0 !important;
    border-radius: 0.5rem !important;
    padding: 7px 10px !important;
    outline: none !important;
  }
`;

interface QuotationRow extends GetQuotationResponse {
  code: string;
  customerName: string;
  customerPhone: string;
  vehiclePlate: string;
  vehicleName: string;
  vehicleColor: string;
}

// 1 dòng đang chỉnh sửa trong modal (đổi sản phẩm/SL khi khách không ưng).
// uid định danh dòng ở FE (dòng cũ dùng detailId, dòng mới thêm chưa có detailId).
interface EditRow {
  uid: number;
  detailId: number | null;
  issueId: number | null;
  kind: "part" | "custom" | "service";
  partId: number | null;
  customItemName: string;
  customUnitPrice: number;
  quantity: number;
  serviceId: number | null;
  serviceName: string;
  hasDbPrice: boolean;
  repairPrice: number;
}

// 1 hạng mục lỗi rút ra từ báo giá đang sửa (nguồn để gắn phụ tùng/dịch vụ)
interface EditIssue {
  issueId: number;
  componentName: string;
  description: string;
}

const QUOTATION_STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: React.ElementType }
> = {
  PENDING: {
    label: "Chờ duyệt",
    className: "bg-amber-50 text-amber-600 border border-amber-200",
    icon: Clock,
  },
  PENDING_DEPOSIT: {
    label: "Chờ đặt cọc",
    className: "bg-orange-50 text-orange-600 border border-orange-200",
    icon: Clock,
  },
  APPROVED: {
    label: "Đã duyệt",
    className: "bg-emerald-50 text-emerald-600 border border-emerald-200",
    icon: CheckCircle2,
  },
  EXPORTED: {
    label: "Đã xuất kho",
    className: "bg-violet-50 text-violet-700 border border-violet-200",
    icon: Package,
  },
  REJECTED: {
    label: "Từ chối",
    className: "bg-rose-50 text-rose-600 border border-rose-200",
    icon: XCircle,
  },
};

const DEFAULT_STATUS = {
  label: "Không rõ",
  className: "bg-slate-50 text-slate-500 border border-slate-200",
  icon: AlertCircle,
};

const ITEMS_PER_PAGE = 5;
const QUOTE_RECAPTCHA_CONTAINER_ID = "quotation-recaptcha-container";

// Báo giá có phụ tùng đặt riêng thì phải cọc trước; chưa có deposit_paid_at
// nghĩa là khách chưa chuyển tiền cọc -> cần lễ tân theo dõi và xác nhận.
const isAwaitingDeposit = (quotation: GetQuotationResponse) =>
  ["APPROVED", "PENDING_DEPOSIT"].includes(quotation.status) &&
  Number(quotation.deposit_amount) > 0 &&
  !quotation.deposit_paid_at;

const formatVND = (value: number | string) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value) || 0)} VND`;

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

const sanitizeFileNamePart = (value: string, fallback: string) =>
  (value.trim() || fallback)
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

const normalizePhoneForCountryInput = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `84${digits.slice(1)}`;
  return digits;
};

// Hiển thị số dạng "+84 999 999 993" giống ô nhập có cờ quốc gia
const formatPhoneForDisplay = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "—";
  const countryCode = digits.startsWith("84") ? "84" : digits.slice(0, 2);
  const rest = digits.slice(countryCode.length);
  const grouped = rest.replace(/(\d{3})(?=\d)/g, "$1 ");
  return `+${countryCode} ${grouped}`.trim();
};

// Ô nhập giá: giữ chuỗi đang gõ ở local state cho mượt (không reformat từng phím,
// caret không nhảy), chỉ đẩy số ra ngoài + format lại khi rời ô.
function PriceInput({
  value,
  readOnly,
  title,
  className,
  placeholder,
  commitOnChange,
  formatWhileTyping,
  onCommit,
}: {
  value: number;
  readOnly?: boolean;
  title?: string;
  className?: string;
  placeholder?: string;
  commitOnChange?: boolean;
  formatWhileTyping?: boolean;
  onCommit: (value: number) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");

  const display = focused
    ? formatWhileTyping && draft
      ? new Intl.NumberFormat("vi-VN").format(Number(draft))
      : draft
    : value
      ? new Intl.NumberFormat("vi-VN").format(value)
      : "";

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      readOnly={readOnly}
      title={title}
      value={display}
      onFocus={() => {
        setDraft(value ? String(value) : "");
        setFocused(true);
      }}
      onChange={(e) => {
        const nextDraft = e.target.value.replace(/\D/g, "");
        setDraft(nextDraft);
        if (commitOnChange) onCommit(Number(nextDraft) || 0);
      }}
      onBlur={() => {
        setFocused(false);
        onCommit(Number(draft) || 0);
      }}
      className={className}
    />
  );
}

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function ReceptionQuoteList() {
  const navigate = useNavigate();
  // TODO: tự viết hàm fetch API rồi setQuotations(data) + setIsLoading
  const [quotations, setQuotations] = useState<GetQuotationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedQuotation, setSelectedQuotation] =
    useState<QuotationRow | null>(null);
  const { fetchPrivate, fetchPublic } = useFetchClient();
  const socket = useSocket();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();
  const [spareParts, setSpareParts] = useState<GetAllSparePartsResponse[]>([]);
  const [services, setServices] = useState<GetServicesResponse[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editRows, setEditRows] = useState<EditRow[]>([]);
  const [editNote, setEditNote] = useState("");
  const [showEditCustomPartForm, setShowEditCustomPartForm] = useState(false);
  const [editCustomIssueId, setEditCustomIssueId] = useState<number | "">("");
  const [editCustomName, setEditCustomName] = useState("");
  const [editCustomQuantity, setEditCustomQuantity] = useState(1);
  const [editCustomPrice, setEditCustomPrice] = useState(0);
  // Khu thêm dịch vụ: chọn 1 dịch vụ + tích các lỗi rồi mới bấm "Thêm"
  const [servicePicker, setServicePicker] = useState<number | "">("");
  const [pickedIssueIds, setPickedIssueIds] = useState<number[]>([]);
  const editUidRef = useRef(0);
  // Modal mã thanh toán tiền cọc phụ tùng đặt riêng
  const [showDepositPayment, setShowDepositPayment] = useState(false);
  const [isDepositPaid, setIsDepositPaid] = useState(false);

  const handleCopyDepositInfo = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Đã sao chép ${label}`, "info");
  };

  // Polling deposit payment status matching BookingPage.tsx
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    let timeoutId: ReturnType<typeof setTimeout>;
    if (showDepositPayment && !isDepositPaid && selectedQuotation?.id) {
      intervalId = setInterval(async () => {
        try {
          const amount = selectedQuotation.deposit_amount || 0;
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
          const res = await fetchPublic(
            `${apiBaseUrl}/api/payment/check-status?bookingCode=BG-${selectedQuotation.id}&amount=${amount}`
          );
          if (res && res.success && res.isPaid) {
            clearInterval(intervalId);
            setIsDepositPaid(true);
            showToast(
              `Hệ thống đã nhận được tiền cọc cho Báo giá ${selectedQuotation.code}!`,
              "success"
            );
            await handleGetQuotationHistory();

            // Cho lễ tân thấy trạng thái "đã cọc" một chút rồi mới đóng cả 2 modal
            timeoutId = setTimeout(() => {
              setShowDepositPayment(false);
              setSelectedQuotation(null);
              setIsDepositPaid(false);
            }, 2000);
          }
        } catch (err) {
          console.error("Lỗi kiểm tra thanh toán tiền cọc:", err);
        }
      }, 5000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [showDepositPayment, isDepositPaid, selectedQuotation?.id]);
  // Modal nhập OTP trước khi duyệt báo giá
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [otpPhone, setOtpPhone] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [resendCountdown, setResendCountdown] = useState(60);
  const [otpConfirmation, setOtpConfirmation] =
    useState<ConfirmationResult | null>(null);
  const [otpError, setOtpError] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const isSendingOtpRef = useRef(false);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    handleGetQuotationHistory();
  }, []);

  // Có cập nhật mới -> BE emit new_notification -> tự tải lại danh sách
  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = () => {
      handleGetQuotationHistory();
    };
    socket.on("new_notification", handleNewNotification);
    return () => {
      socket.off("new_notification", handleNewNotification);
    };
  }, [socket]);

  useEffect(() => {
    if (!confirmApprove || !isOtpSent || resendCountdown <= 0) return;
    const countdownTimer = window.setInterval(() => {
      setResendCountdown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(countdownTimer);
  }, [confirmApprove, isOtpSent, resendCountdown]);

  const handleGetQuotationHistory = async () => {
    try {
      const result = await fetchPrivate(QUOTE_MANAGEMENT_ENDPOINTS.QUOTE_MANAGEMENT, "GET");
      setQuotations(result.data);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    handleGetSpareParts();
  }, []);

  const handleGetSpareParts = async () => {
    try {
      const result = await fetchPrivate(
        QUOTE_MANAGEMENT_ENDPOINTS.GET_SPARE_PARTS,
        "GET",
      );
      setSpareParts(result.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    handleGetServices();
  }, []);

  const handleGetServices = async () => {
    try {
      const result = await fetchPrivate(
        QUOTE_MANAGEMENT_ENDPOINTS.GET_SERVICES,
        "GET",
      );
      setServices(result.data);
    } catch (error) {
      console.error(error);
    }
  };

  // Gắn mã BG-ddMMyyyy-stt (stt đánh theo thứ tự createdAt trong cùng ngày)
  // và rút thông tin khách hàng/xe từ task -> serviceOrder -> vehicle
  const quotationRows = useMemo<QuotationRow[]>(() => {
    const rows: QuotationRow[] = quotations.map((q) => {
      const vehicle = q.task?.serviceOrder?.vehicle;
      const customer = vehicle?.customer;
      return {
        ...q,
        code: "",
        customerName:
          customer?.name || customer?.user?.fullName || "Khách vãng lai",
        customerPhone: customer?.phone || customer?.user?.phoneNumber || "",
        vehiclePlate: vehicle?.license_plate || "",
        vehicleName: vehicle?.model?.model_name || "",
        vehicleColor: vehicle?.color || "",
      };
    });
    const counters: Record<string, number> = {};
    [...rows]
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
      .forEach((row) => {
        const d = new Date(row.createdAt);
        const dateKey = `${String(d.getDate()).padStart(2, "0")}${String(
          d.getMonth() + 1,
        ).padStart(2, "0")}${d.getFullYear()}`;
        counters[dateKey] = (counters[dateKey] ?? 0) + 1;
        row.code = `BG-${dateKey}-${String(counters[dateKey]).padStart(2, "0")}`;
      });
    return rows;
  }, [quotations]);

  const filteredQuotations = useMemo(() => {
    return quotationRows.filter((q) => {
      const keyword = searchTerm.toLowerCase();
      const matchSearch =
        searchTerm === "" ||
        q.code.toLowerCase().includes(keyword) ||
        q.customerName.toLowerCase().includes(keyword) ||
        q.vehiclePlate.toLowerCase().includes(keyword) ||
        q.note?.toLowerCase().includes(keyword) ||
        q.items.some(
          (item) =>
            item.sparePart?.name?.toLowerCase().includes(keyword) ||
            item.custom_item_name?.toLowerCase().includes(keyword) ||
            item.service_catalog?.service_name
              ?.toLowerCase()
              .includes(keyword),
        );

      const matchStatus = statusFilter === "all" || q.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [searchTerm, statusFilter, quotationRows]);

  const totalPages = Math.ceil(filteredQuotations.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredQuotations.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredQuotations, currentPage]);

  const getStatusConfig = (status?: string) =>
    (status && QUOTATION_STATUS_CONFIG[status]) || DEFAULT_STATUS;

  const downloadQuotationPdf = async (quotation: QuotationRow) => {
    try {
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

      const navy: [number, number, number] = [0, 40, 94];
      const slate: [number, number, number] = [51, 65, 85];
      const lightSlate: [number, number, number] = [100, 116, 139];
      const pageWidth = document.internal.pageSize.getWidth();
      const pageHeight = document.internal.pageSize.getHeight();
      const margin = 14;
      const serviceItems = quotation.items.filter(
        (item) => item.service_catalog,
      );
      const partItems = quotation.items.filter(
        (item) => item.sparePart || item.custom_item_name,
      );
      const sortedItems = [...serviceItems, ...partItems];

      const drawPageFooter = () => {
        const currentPage = document.getNumberOfPages();
        document.setDrawColor(226, 232, 240);
        document.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);
        document.setFontSize(7.5);
        document.setTextColor(...lightSlate);
        document.text(
          "AGM GARAGE · Báo giá được tạo từ hệ thống quản lý garage",
          margin,
          pageHeight - 6,
        );
        document.text(
          `Trang ${currentPage}`,
          pageWidth - margin,
          pageHeight - 6,
          { align: "right" },
        );
      };

      // Header tối giản
      document.setTextColor(...navy);
      document.setFont("NotoSans", "bold");
      document.setFontSize(9);
      document.text("AGM INTELLIGENT GARAGE", pageWidth / 2, 14, {
        align: "center",
      });
      document.setFontSize(18);
      document.text("BÁO GIÁ DỊCH VỤ", pageWidth / 2, 24, {
        align: "center",
      });
      document.setFont("NotoSans", "normal");
      document.setDrawColor(...navy);
      document.setLineWidth(0.5);
      document.line(margin, 30, pageWidth - margin, 30);

      // Thông tin dạng chữ, không card
      const leftX = margin;
      const rightX = 116;
      const infoStartY = 39;
      const lineGap = 5.5;
      document.setFontSize(8.5);
      document.setTextColor(...slate);
      document.text(`Khách hàng: ${quotation.customerName}`, leftX, infoStartY);
      document.text(
        `SĐT: ${quotation.customerPhone || "—"}`,
        leftX,
        infoStartY + lineGap,
      );
      document.text(
        `Phương tiện: ${quotation.vehiclePlate || "—"}`,
        leftX,
        infoStartY + lineGap * 2,
      );
      document.text(
        `Tên xe: ${[quotation.vehicleName, quotation.vehicleColor]
          .filter(Boolean)
          .join(" · ") || "—"
        }`,
        leftX,
        infoStartY + lineGap * 3,
      );
      document.text(`Mã báo giá: ${quotation.code}`, rightX, infoStartY);
      document.text(
        `Người lập: ${quotation.creator?.fullName || "Nhân viên lễ tân"}`,
        rightX,
        infoStartY + lineGap,
      );
      document.text(
        `Ngày lập: ${formatDateTime(quotation.createdAt)}`,
        rightX,
        infoStartY + lineGap * 2,
      );
      document.text(
        `Trạng thái: ${getStatusConfig(quotation.status).label}`,
        rightX,
        infoStartY + lineGap * 3,
      );
      document.setDrawColor(226, 232, 240);
      document.line(margin, 64, pageWidth - margin, 64);

      // Một bảng duy nhất, dịch vụ trước rồi phụ tùng
      autoTable(document, {
        startY: 71,
        head: [
          [
            "STT",
            "Loại",
            "Nội dung",
            "Hạng mục lỗi",
            "SL",
            "Đơn giá",
            "Thành tiền",
          ],
        ],
        body: sortedItems.map((item, index) => {
          const itemName =
            item.sparePart?.name ||
            item.custom_item_name ||
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
              : item.custom_item_name
                ? "Phụ tùng đặt riêng"
                : "Phụ tùng",
            itemName,
            issueText || "—",
            item.quantity,
            formatVND(
              item.sparePart ? item.unit_price : item.repair_price,
            ),
            formatVND(item.amount),
          ];
        }),
        styles: {
          font: "NotoSans",
          fontStyle: "normal",
          fontSize: 7.5,
          cellPadding: 2.2,
          textColor: slate,
          lineColor: [226, 232, 240],
          lineWidth: 0.15,
        },
        headStyles: {
          fillColor: navy,
          textColor: [255, 255, 255],
          font: "NotoSans",
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { cellWidth: 21 },
          2: { cellWidth: 37 },
          3: { cellWidth: 47 },
          4: { halign: "center", cellWidth: 11 },
          5: { halign: "right", cellWidth: 28 },
          6: { halign: "right", cellWidth: 29 },
        },
        margin: { left: margin, right: margin, top: 18, bottom: 22 },
        didDrawPage: drawPageFooter,
      });

      let currentY = (
        document as jsPDF & { lastAutoTable: { finalY: number } }
      ).lastAutoTable.finalY;
      if (currentY > pageHeight - 86) {
        document.addPage();
        currentY = 26;
      }

      // Ghi chú và tổng tiền tách riêng
      document.setDrawColor(226, 232, 240);
      document.line(margin, currentY + 7, pageWidth - margin, currentY + 7);
      const noteLines = document.splitTextToSize(
        quotation.note || "Không có ghi chú.",
        108,
      );
      document.setFontSize(7.5);
      document.setTextColor(...lightSlate);
      document.text("GHI CHÚ", margin + 5, currentY + 15);
      document.setFontSize(8.5);
      document.setTextColor(...slate);
      document.text(noteLines, margin + 5, currentY + 22);
      document.setFont("NotoSans", "bold");
      document.setFontSize(9);
      document.setTextColor(...navy);
      document.text("TỔNG CỘNG", pageWidth - margin - 5, currentY + 15, {
        align: "right",
      });
      document.setFontSize(16);
      document.text(
        formatVND(quotation.total_amount),
        pageWidth - margin - 5,
        currentY + 24,
        { align: "right" },
      );
      if (Number(quotation.deposit_amount) > 0) {
        document.setFontSize(8);
        document.setTextColor(180, 83, 9);
        document.text(
          `Tiền cọc phụ tùng đặt riêng (30%): ${formatVND(
            quotation.deposit_amount ?? 0,
          )}`,
          pageWidth - margin - 5,
          currentY + 30,
          { align: "right" },
        );
      }
      document.setFont("NotoSans", "normal");
      drawPageFooter();

      const customerName = sanitizeFileNamePart(
        quotation.customerName,
        "Khach-hang",
      );
      const vehicleName = sanitizeFileNamePart(
        quotation.vehicleName,
        "Xe",
      );
      const vehiclePlate = sanitizeFileNamePart(
        quotation.vehiclePlate,
        "Khong-bien-so",
      );
      document.save(
        `BG-${customerName}-${vehicleName}-${vehiclePlate}.pdf`,
      );
    } catch (error) {
      console.error("Lỗi khi tạo PDF:", error);
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể tạo file PDF.",
        "warning",
      );
    }
  };

  const kpiCounts = useMemo(
    () => ({
      total: quotations.length,
      pending: quotations.filter((q) => q.status === "PENDING").length,
      approved: quotations.filter((q) => q.status === "APPROVED").length,
      rejected: quotations.filter((q) => q.status === "REJECTED").length,
    }),
    [quotations],
  );

  const openQuotationDetail = (q: QuotationRow) => {
    setIsEditing(false);
    setSelectedQuotation(q);
  };

  const closeQuotationDetail = () => {
    setIsEditing(false);
    setSelectedQuotation(null);
    setServicePicker("");
    setPickedIssueIds([]);
    setShowDepositPayment(false);
    setConfirmApprove(false);
    setOtpPhone("");
    setIsOtpSent(false);
    setOtpValue("");
    setResendCountdown(60);
    setOtpConfirmation(null);
    setOtpError("");
    clearRecaptcha();
  };

  const closeOtpModal = () => {
    if (isSendingOtp || isApproving) return;
    setConfirmApprove(false);
    setOtpPhone("");
    setIsOtpSent(false);
    setOtpValue("");
    setResendCountdown(60);
    setOtpConfirmation(null);
    setOtpError("");
    clearRecaptcha();
  };

  const sendOtp = async () => {
    if (isSendingOtpRef.current) return;
    const normalizedPhone = otpPhone.replace(/\D/g, "");
    if (!/^\d{7,15}$/.test(normalizedPhone)) {
      showToast("Vui lòng nhập số điện thoại hợp lệ.", "warning");
      return;
    }
    isSendingOtpRef.current = true;
    setIsSendingOtp(true);
    setOtpError("");
    try {
      clearRecaptcha();
      const confirmation = await sendFirebaseOtp(
        `+${normalizedPhone}`,
        QUOTE_RECAPTCHA_CONTAINER_ID,
      );
      setOtpPhone(normalizedPhone);
      setOtpConfirmation(confirmation);
      setOtpValue("");
      setIsOtpSent(true);
      setResendCountdown(60);
    } catch (error: any) {
      console.error(error);
      setOtpError(error?.message || "Không thể gửi mã OTP. Vui lòng thử lại.");
      clearRecaptcha();
    } finally {
      isSendingOtpRef.current = false;
      setIsSendingOtp(false);
    }
  };

  const resendOtp = async () => {
    if (
      resendCountdown > 0 ||
      isSendingOtp ||
      isSendingOtpRef.current
    ) {
      return;
    }
    isSendingOtpRef.current = true;
    setIsSendingOtp(true);
    setOtpError("");
    try {
      clearRecaptcha();
      const confirmation = await sendFirebaseOtp(
        `+${otpPhone}`,
        QUOTE_RECAPTCHA_CONTAINER_ID,
      );
      setOtpConfirmation(confirmation);
      setOtpValue("");
      setResendCountdown(60);
      otpInputRefs.current[0]?.focus();
    } catch (error: any) {
      console.error(error);
      setOtpError(
        error?.message || "Không thể gửi lại mã OTP. Vui lòng thử lại.",
      );
      clearRecaptcha();
    } finally {
      isSendingOtpRef.current = false;
      setIsSendingOtp(false);
    }
  };

  const updateOtpDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const digits = otpValue.padEnd(6, " ").split("");
    digits[index] = digit || " ";
    setOtpValue(digits.join("").trimEnd());
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedOtp = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!pastedOtp) return;
    event.preventDefault();
    setOtpValue(pastedOtp);
    otpInputRefs.current[Math.min(pastedOtp.length, 6) - 1]?.focus();
  };

  const handleOtpConfirmation = async () => {
    if (!/^\d{6}$/.test(otpValue)) return;
    if (!selectedQuotation || !otpConfirmation) {
      setOtpError("Phiên xác thực đã hết hạn. Vui lòng gửi lại mã OTP.");
      return;
    }
    setIsApproving(true);
    setOtpError("");
    try {
      const idToken = await verifyOtp(otpConfirmation, otpValue);
      await fetchPrivate(
        QUOTE_MANAGEMENT_ENDPOINTS.APPROVE_QUOTE_OTP(
          selectedQuotation.id,
        ),
        "PATCH",
        { idToken },
      );
      showToast("Xác thực OTP thành công!", "success");
      setOtpConfirmation(null);
      clearRecaptcha();
      closeQuotationDetail();
      await handleGetQuotationHistory();
    } catch (error: any) {
      console.error(error);
      const message =
        error?.code === "auth/invalid-verification-code"
          ? "Mã OTP không đúng. Vui lòng kiểm tra và thử lại."
          : error?.code === "auth/code-expired"
            ? "Mã OTP đã hết hạn. Vui lòng gửi lại mã mới."
            : error?.message || "Không thể xác thực và duyệt báo giá.";
      setOtpError(message);
    } finally {
      setIsApproving(false);
    }
  };

  // Bật chế độ sửa: đổ items hiện tại vào form chỉnh sửa
  const startEdit = () => {
    if (!selectedQuotation) return;
    const mappedRows: EditRow[] = selectedQuotation.items.map((item) => {
      editUidRef.current += 1;
      const isPart = !!item.sparePart;
      const isCustom = Boolean(item.custom_item_name);
      const svc = item.service_catalog;
      return {
        uid: editUidRef.current,
        detailId: item.id,
        issueId: item.issue?.id ?? null,
        kind: isPart ? "part" : isCustom ? "custom" : "service",
        partId: item.sparePart?.id ?? null,
        customItemName: item.custom_item_name ?? "",
        customUnitPrice: isCustom ? Number(item.unit_price) || 0 : 0,
        quantity: item.quantity,
        serviceId: svc?.id ?? null,
        serviceName: svc?.service_name ?? "Dịch vụ sửa chữa",
        hasDbPrice: Number(svc?.labor_price) > 0,
        repairPrice: Number(item.repair_price) || 0,
      };
    });
    const issueIds = [
      ...new Set(
        selectedQuotation.items
          .map((item) => item.issue?.id)
          .filter((id): id is number => Boolean(id)),
      ),
    ];
    const makeEmptyPartRow = (issueId: number): EditRow => {
      editUidRef.current += 1;
      return {
        uid: editUidRef.current,
        detailId: null,
        issueId,
        kind: "part",
        partId: null,
        customItemName: "",
        customUnitPrice: 0,
        quantity: 1,
        serviceId: null,
        serviceName: "",
        hasDbPrice: false,
        repairPrice: 0,
      };
    };
    // Gom theo hạng mục lỗi: các dòng đã có của lỗi đó rồi tới 1 dòng trống,
    // để bảng sửa xếp giống hệt modal tạo báo giá.
    const groupedRows = issueIds.flatMap((issueId) => [
      ...mappedRows.filter(
        (row) => row.issueId === issueId && row.kind !== "service",
      ),
      makeEmptyPartRow(issueId),
    ]);
    const serviceRows = mappedRows.filter((row) => row.kind === "service");
    const orphanRows = mappedRows.filter(
      (row) =>
        row.kind !== "service" &&
        (row.issueId == null || !issueIds.includes(row.issueId)),
    );
    setEditRows([...groupedRows, ...orphanRows, ...serviceRows]);
    setEditNote(selectedQuotation.note ?? "");
    setShowEditCustomPartForm(false);
    setEditCustomIssueId(issueIds[0] ?? "");
    setEditCustomName("");
    setEditCustomQuantity(1);
    setEditCustomPrice(0);
    setServicePicker("");
    setPickedIssueIds([]);
    setIsEditing(true);
  };

  // Danh sách hạng mục lỗi rút từ báo giá đang sửa (nguồn để gắn phụ tùng/dịch vụ)
  const editIssues = useMemo<EditIssue[]>(() => {
    if (!selectedQuotation) return [];
    const seen = new Map<number, EditIssue>();
    selectedQuotation.items.forEach((item) => {
      const issue = item.issue;
      if (issue && !seen.has(issue.id)) {
        seen.set(issue.id, {
          issueId: issue.id,
          componentName: issue.component?.name ?? `Lỗi #${issue.id}`,
          description: issue.error_description ?? "",
        });
      }
    });
    return [...seen.values()];
  }, [selectedQuotation]);

  // Giá bán lẻ của sản phẩm đang chọn (fallback về đơn giá cũ nếu chưa đổi)
  const getEditUnitPrice = (row: EditRow) => {
    if (row.kind === "custom") return row.customUnitPrice;
    const part = spareParts.find((p) => p.id === row.partId);
    if (part) return Number(part.retail_price) || 0;
    const original = selectedQuotation?.items.find(
      (i) => i.id === row.detailId,
    );
    return original?.sparePart?.id === row.partId
      ? Number(original.unit_price) || 0
      : 0;
  };

  const updateEditPart = (uid: number, partId: number | null) =>
    setEditRows((prev) => {
      const currentRow = prev.find((row) => row.uid === uid);
      const updatedRows = prev.map((row) =>
        row.uid === uid ? { ...row, partId } : row,
      );
      if (!partId || !currentRow?.issueId) return updatedRows;
      const hasEmptyRow = updatedRows.some(
        (row) =>
          row.kind === "part" &&
          row.issueId === currentRow.issueId &&
          !row.partId,
      );
      if (hasEmptyRow) return updatedRows;
      editUidRef.current += 1;
      return [
        ...updatedRows,
        {
          ...currentRow,
          uid: editUidRef.current,
          detailId: null,
          partId: null,
          quantity: 1,
        },
      ];
    });

  const updateEditCustomItem = (
    uid: number,
    updates: Partial<Pick<EditRow, "customItemName" | "customUnitPrice">>,
  ) =>
    setEditRows((prev) =>
      prev.map((row) =>
        row.uid === uid ? { ...row, ...updates } : row,
      ),
    );

  const addEditCustomItem = () => {
    if (
      editCustomIssueId === "" ||
      !editCustomName.trim() ||
      editCustomQuantity <= 0 ||
      editCustomPrice <= 0
    ) {
      return;
    }
    editUidRef.current += 1;
    const newRow: EditRow = {
      uid: editUidRef.current,
      detailId: null,
      issueId: editCustomIssueId,
      kind: "custom",
      partId: null,
      customItemName: editCustomName.trim(),
      customUnitPrice: editCustomPrice,
      quantity: editCustomQuantity,
      serviceId: null,
      serviceName: "",
      hasDbPrice: false,
      repairPrice: 0,
    };
    setEditRows((prev) => [...prev, newRow]);
    setShowEditCustomPartForm(false);
    setEditCustomName("");
    setEditCustomQuantity(1);
    setEditCustomPrice(0);
  };

  const updateEditQuantity = (uid: number, quantity: number) =>
    setEditRows((prev) =>
      prev.map((row) => {
        if (row.uid !== uid) return row;
        // available_quantity: tồn đã trừ phần bị báo giá APPROVED giữ chỗ
        const part = spareParts.find((p) => p.id === row.partId);
        const stock = part ? Number(part.available_quantity) : Infinity;
        return { ...row, quantity: Math.min(Math.max(0, quantity), stock) };
      }),
    );

  const updateEditIssue = (uid: number, issueId: number | null) =>
    setEditRows((prev) =>
      prev.map((row) => (row.uid === uid ? { ...row, issueId } : row)),
    );

  const updateEditFee = (uid: number, fee: number) =>
    setEditRows((prev) =>
      prev.map((row) =>
        row.uid === uid ? { ...row, repairPrice: Math.max(0, fee) } : row,
      ),
    );

  const removeEditRow = (uid: number) =>
    setEditRows((prev) => prev.filter((row) => row.uid !== uid));

  // Thêm dịch vụ: chọn 1 dịch vụ rồi tích nhiều lỗi -> sinh mỗi lỗi 1 dòng.
  // Bỏ qua lỗi đã có chính dịch vụ đó để không tạo dòng trùng (service + lỗi).
  const addEditServicesForIssues = (id: number, issueIds: number[]) => {
    const service = services.find((s) => s.id === id);
    if (!service || issueIds.length === 0) return;
    const dbPrice = Number(service.labor_price) || 0;
    setEditRows((prev) => {
      const newRows = issueIds
        .filter(
          (issueId) =>
            !prev.some(
              (r) =>
                r.kind === "service" &&
                r.serviceId === id &&
                r.issueId === issueId,
            ),
        )
        .map<EditRow>((issueId) => {
          editUidRef.current += 1;
          return {
            uid: editUidRef.current,
            detailId: null,
            issueId,
            kind: "service",
            partId: null,
            customItemName: "",
            customUnitPrice: 0,
            quantity: 1,
            serviceId: id,
            serviceName: service.service_name,
            hasDbPrice: dbPrice > 0,
            repairPrice: dbPrice,
          };
        });
      return [...prev, ...newRows];
    });
  };

  const editTotal = editRows.reduce(
    (sum, row) =>
      row.kind === "part" || row.kind === "custom"
        ? sum + row.quantity * getEditUnitPrice(row)
        : sum + row.repairPrice,
    0,
  );
  const editDeposit = Math.round(
    editRows.reduce(
      (sum, row) =>
        row.kind === "custom"
          ? sum + row.quantity * row.customUnitPrice
          : sum,
      0,
    ) * 0.3,
  );

  const handleUpdateQuotation = async () => {
    if (!selectedQuotation) return;
    const payload = {
      items: editRows
        .filter((row) => row.kind !== "part" || row.partId)
        .map((row) => {
          if (row.kind === "part") {
            return {
              issue_id: row.issueId != null ? Number(row.issueId) : undefined,
              spare_part_id: row.partId != null ? Number(row.partId) : undefined,
              quantity: Number(row.quantity),
            };
          }
          if (row.kind === "custom") {
            return {
              issue_id: row.issueId != null ? Number(row.issueId) : undefined,
              custom_item_name: row.customItemName.trim(),
              unit_price: Number(row.customUnitPrice),
              quantity: Number(row.quantity),
            };
          }
          return {
            issue_id: row.issueId != null ? Number(row.issueId) : undefined,
            service_id: row.serviceId != null ? Number(row.serviceId) : undefined,
            quantity: 1,
            repair_price: Number(row.repairPrice),
          };
        }),
      deposit_amount: editDeposit,
      note: editNote || undefined,
    };
    try {
      // BE: PATCH /quote/:id -> xóa hết QuotationDetail cũ rồi tạo lại từ items
      await fetchPrivate(
        `${QUOTE_MANAGEMENT_ENDPOINTS.QUOTE_MANAGEMENT}/${selectedQuotation.id}`,
        "PATCH",
        payload,
      );
      showToast("Đã cập nhật báo giá!", "success");
      closeQuotationDetail();
      handleGetQuotationHistory();
    } catch (error: any) {
      console.error(error);
      showToast(
        error?.message || "Đã xảy ra lỗi khi cập nhật báo giá.",
        "warning",
      );
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* HEADER */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(-1)}
          title="Quay lại"
          className="mt-0.5 w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#00285E] hover:border-slate-300 active:scale-[0.97] transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2 flex items-center gap-2">
            <History className="text-[#F9A11B]" size={28} />
            Lịch sử báo giá
          </h1>
          <p className="text-slate-500 text-sm">
            Xem lại các báo giá đã tạo và trạng thái duyệt của khách hàng.
          </p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Tổng báo giá",
            value: kpiCounts.total,
            icon: <FileText size={22} />,
            color: "#00285E",
            bg: "#EDF3FF",
          },
          {
            label: "Đang chờ duyệt",
            value: kpiCounts.pending,
            icon: <Clock size={22} />,
            color: "#D97706",
            bg: "#FEF3C7",
          },
          {
            label: "Đã duyệt",
            value: kpiCounts.approved,
            icon: <CheckCircle2 size={22} />,
            color: "#10B981",
            bg: "#ECFDF5",
          },
          {
            label: "Bị từ chối",
            value: kpiCounts.rejected,
            icon: <XCircle size={22} />,
            color: "#E11D48",
            bg: "#FFF1F2",
          },
        ].map((card, i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  {card.label}
                </span>
                <span className="text-2xl font-bold text-slate-900 tracking-tight block">
                  {card.value}
                </span>
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: card.bg, color: card.color }}
              >
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH & FILTER */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-4">
        <div className="relative flex-1 group">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00285E] transition-colors"
          />
          <input
            type="text"
            placeholder="Tìm theo mã báo giá, tên phụ tùng, dịch vụ, ghi chú..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-11 pr-10 py-2.5 text-sm font-semibold placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 cursor-pointer hover:border-slate-300 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="PENDING_DEPOSIT">Chờ đặt cọc</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Từ chối</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 size={48} className="mb-4 text-[#00285E] animate-spin" />
            <p className="text-lg font-semibold mb-1 text-slate-700">
              Đang tải lịch sử báo giá...
            </p>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <AlertCircle size={48} className="mb-4 text-slate-300" />
            <p className="text-lg font-semibold mb-1">Chưa có báo giá nào</p>
            <p className="text-sm">
              Thử thay đổi từ khóa hoặc bộ lọc trạng thái.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th className="py-3 px-3 align-middle whitespace-nowrap">
                    Đơn báo giá
                  </th>
                  <th className="py-3 px-3 align-middle whitespace-nowrap">
                    Khách hàng
                  </th>
                  <th className="py-3 px-3 align-middle whitespace-nowrap">
                    Xe
                  </th>
                  <th className="py-3 px-3 align-middle">Hạng mục</th>
                  <th className="py-3 px-3 align-middle whitespace-nowrap">
                    Tổng tiền
                  </th>
                  <th className="py-3 px-3 align-middle whitespace-nowrap">
                    Trạng thái
                  </th>
                  <th className="py-3 px-3 align-middle text-center whitespace-nowrap">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((q) => {
                  const statusCfg = getStatusConfig(q.status);
                  const StatusIcon = statusCfg.icon;
                  const visibleItems = q.items.slice(0, 2);
                  const hiddenCount = q.items.length - visibleItems.length;
                  return (
                    <tr
                      key={q.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-3.5 px-3 align-middle whitespace-nowrap">
                        <span className="font-bold text-[#00285E] text-xs block">
                          {q.code}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDateTime(q.createdAt)}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 align-middle">
                        <div className="min-w-[120px] max-w-[160px]">
                          <p className="font-semibold text-slate-700 text-xs truncate">
                            {q.customerName}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {q.customerPhone}
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 align-middle">
                        <div className="min-w-[100px] max-w-[130px]">
                          <p className="font-semibold text-slate-700 text-xs truncate">
                            {q.vehiclePlate || "—"}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {q.vehicleName}
                            {q.vehicleColor && ` · ${q.vehicleColor}`}
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 align-middle">
                        <div className="flex flex-wrap gap-1 min-w-[150px] max-w-[210px]">
                          {visibleItems.map((item) => (
                            <span
                              key={item.id}
                              className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-600 font-medium"
                            >
                              {item.sparePart?.name ||
                                item.custom_item_name ||
                                item.service_catalog?.service_name ||
                                `#${item.id}`}
                            </span>
                          ))}
                          {hiddenCount > 0 && (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-[#EDF3FF] text-[10px] text-[#00285E] font-bold">
                              +{hiddenCount} khác
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 align-middle whitespace-nowrap">
                        <span className="text-xs font-bold text-[#00285E]">
                          {formatVND(q.total_amount)}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 align-middle whitespace-nowrap">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold ${statusCfg.className}`}
                          >
                            {q.status === "PENDING" ? (
                              <span className="relative flex h-2 w-2 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                              </span>
                            ) : (
                              <StatusIcon size={11} className="shrink-0" />
                            )}
                            {statusCfg.label}
                          </span>
                          {/* Nhãn phụ: còn nợ cọc phụ tùng đặt riêng */}
                          {isAwaitingDeposit(q) && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                              title={`Cần thu cọc ${formatVND(
                                q.deposit_amount ?? 0,
                              )}`}
                            >
                              <Wallet size={11} className="shrink-0" />
                              Chờ cọc
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 align-middle">
                        <div className="flex items-center justify-center whitespace-nowrap">
                          <button
                            onClick={() => openQuotationDetail(q)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                          >
                            <Eye size={13} />
                            Chi tiết
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-400">
              Hiển thị {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredQuotations.length)}{" "}
              / {filteredQuotations.length} báo giá
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${page === currentPage
                        ? "bg-[#00285E] text-white shadow-md"
                        : "text-slate-500 hover:bg-slate-100"
                      }`}
                  >
                    {page}
                  </button>
                ),
              )}
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL CHI TIẾT BÁO GIÁ */}
      {selectedQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={closeQuotationDetail}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5">
            <div
              className="relative flex items-start justify-between px-7 pt-7 pb-6 shrink-0 text-white overflow-hidden"
              style={{ backgroundColor: "#00285E" }}
            >
              <div className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-white/10" />
              <div className="absolute -bottom-14 -left-6 w-40 h-40 rounded-full bg-white/5" />
              <div className="relative flex items-center gap-4">
                <div
                  className="flex items-center justify-center w-12 h-12 rounded-2xl shrink-0"
                  style={{ backgroundColor: "#F9A11B" }}
                >
                  <FileText size={24} className="text-white" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-white/80 uppercase tracking-widest">
                    Báo giá {selectedQuotation.code}
                  </p>
                  <h3 className="text-xl font-bold text-white leading-none">
                    {isEditing ? "Chỉnh sửa báo giá" : "Chi tiết báo giá"}
                  </h3>
                </div>
              </div>
              <div className="relative flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void downloadQuotationPdf(selectedQuotation)
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                >
                  <Printer size={14} />
                  Tải về PDF
                </button>
                <button
                  onClick={closeQuotationDetail}
                  className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-7 py-6 space-y-5 bg-slate-50/50">
              {/* Thông tin khách hàng & xe */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
                    Khách hàng
                  </span>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3">
                      <span className="w-14 shrink-0 text-xs text-slate-400">
                        Tên
                      </span>
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {selectedQuotation.customerName}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="w-14 shrink-0 text-xs text-slate-400">
                        SĐT
                      </span>
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {selectedQuotation.customerPhone || "—"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
                    Phương tiện
                  </span>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3">
                      <span className="w-14 shrink-0 text-xs text-slate-400">
                        Biển số
                      </span>
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {selectedQuotation.vehiclePlate || "—"}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="w-14 shrink-0 text-xs text-slate-400">
                        Tên xe
                      </span>
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {selectedQuotation.vehicleName || "—"}
                        {selectedQuotation.vehicleColor &&
                          ` · ${selectedQuotation.vehicleColor}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trạng thái & ngày tạo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                    Trạng thái
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {(() => {
                      const cfg = getStatusConfig(selectedQuotation.status);
                      const Icon = cfg.icon;
                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.className}`}
                        >
                          {selectedQuotation.status === "PENDING" ? (
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                            </span>
                          ) : (
                            <Icon size={12} className="shrink-0" />
                          )}
                          {cfg.label}
                        </span>
                      );
                    })()}
                    {/* Nhãn phụ: phụ tùng đặt riêng chưa thu cọc */}
                    {isAwaitingDeposit(selectedQuotation) && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <Wallet size={12} className="shrink-0" />
                        Chờ cọc{" "}
                        {
                          selectedQuotation.items.filter(
                            (item) => item.custom_item_name,
                          ).length
                        }{" "}
                        phụ tùng
                      </span>
                    )}
                  </div>
                  {isAwaitingDeposit(selectedQuotation) && (
                    <p className="text-[11px] font-semibold text-amber-600 mt-1.5">
                      Cần thu cọc:{" "}
                      {formatVND(selectedQuotation.deposit_amount ?? 0)}
                    </p>
                  )}
                  {selectedQuotation.deposit_paid_at && (
                    <p className="text-[11px] text-emerald-600 mt-1.5">
                      Đã cọc lúc:{" "}
                      {formatDateTime(selectedQuotation.deposit_paid_at)}
                    </p>
                  )}
                  {selectedQuotation.approved_at && (
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Duyệt lúc: {formatDateTime(selectedQuotation.approved_at)}
                    </p>
                  )}
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                    Ngày tạo
                  </span>
                  <p className="text-sm font-semibold text-slate-800">
                    {formatDateTime(selectedQuotation.createdAt)}
                  </p>
                  {selectedQuotation.creator?.fullName && (
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Người tạo: {selectedQuotation.creator.fullName}
                    </p>
                  )}
                </div>
              </div>

              {/* Hạng mục báo giá nhóm theo lỗi: lỗi gì -> phụ tùng/dịch vụ cho lỗi đó */}
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <label className="text-sm font-bold text-slate-700">
                    {isEditing ? "Chỉnh sửa hạng mục" : "Hạng mục báo giá"}
                  </label>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: "#00285E", color: "#fff" }}
                  >
                    {selectedQuotation.items.length} hạng mục
                  </span>
                </div>
                {!isEditing ? (
                  /* ===== CHẾ ĐỘ XEM: tách 2 tầng - Phụ tùng và Dịch vụ ===== */
                  (() => {
                    const partItems = selectedQuotation.items.filter(
                      (i) => i.sparePart || i.custom_item_name,
                    );
                    const serviceItems = selectedQuotation.items.filter(
                      (i) => i.service_catalog,
                    );
                    return (
                      <div className="space-y-5">
                        {/* Tầng phụ tùng */}
                        <div>
                          <div className="flex items-center gap-2 mb-2 px-1">
                            <Package size={14} className="text-slate-500" />
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                              Phụ tùng
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400">
                              ({partItems.length})
                            </span>
                          </div>
                          {partItems.length > 0 ? (
                            <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full min-w-[560px] text-left border-collapse text-sm">
                                  <thead>
                                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                                      <th className="py-2.5 px-4 align-middle">
                                        Hạng mục lỗi
                                      </th>
                                      <th className="py-2.5 px-4 align-middle">
                                        Phụ tùng
                                      </th>
                                      <th className="py-2.5 px-2 align-middle text-center w-14 whitespace-nowrap">
                                        SL
                                      </th>
                                      <th className="py-2.5 px-4 align-middle text-right whitespace-nowrap">
                                        Đơn giá
                                      </th>
                                      <th className="py-2.5 px-4 align-middle text-right whitespace-nowrap">
                                        Thành tiền
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {partItems.map((item) => (
                                      <tr
                                        key={item.id}
                                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                                      >
                                        <td className="py-3 px-4">
                                          <p
                                            className="text-xs font-semibold text-slate-800 max-w-[130px] truncate"
                                            title={
                                              item.issue?.component?.name ?? ""
                                            }
                                          >
                                            {item.issue?.component?.name ?? "—"}
                                          </p>
                                          {item.issue?.error_description && (
                                            <p
                                              className="text-[10px] text-slate-400 max-w-[130px] truncate mt-0.5"
                                              title={item.issue.error_description}
                                            >
                                              {item.issue.error_description}
                                            </p>
                                          )}
                                        </td>
                                        <td className="py-3 px-4">
                                          <div className="flex items-center gap-2">
                                            <Package
                                              size={13}
                                              className="text-slate-400 shrink-0"
                                            />
                                            <span className="text-xs font-semibold text-slate-800 truncate max-w-[170px]">
                                              {item.sparePart?.name ||
                                                item.custom_item_name}
                                            </span>
                                          </div>
                                          {item.custom_item_name && (
                                            <span
                                              className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                item.status ===
                                                "WAITING_DEPOSIT"
                                                  ? "bg-amber-50 text-amber-700"
                                                  : "bg-emerald-50 text-emerald-700"
                                              }`}
                                            >
                                              {item.status ===
                                              "WAITING_DEPOSIT" ? (
                                                <>
                                                  Phụ tùng đặt riêng · Cần cọc:{" "}
                                                  {formatVND(
                                                    selectedQuotation.deposit_amount ??
                                                      0,
                                                  )}
                                                </>
                                              ) : (
                                                "Phụ tùng đặt riêng · Đã cọc"
                                              )}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-3 px-2 text-center">
                                          <span className="text-xs font-semibold text-slate-700">
                                            {item.quantity}
                                          </span>
                                        </td>
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                          <span className="text-xs text-slate-600 font-medium">
                                            {formatVND(item.unit_price)}
                                          </span>
                                        </td>
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                          <span className="text-xs font-bold text-[#00285E]">
                                            {formatVND(item.amount)}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic px-1">
                              Không có phụ tùng.
                            </p>
                          )}
                        </div>

                        {/* Tầng dịch vụ */}
                        <div>
                          <div className="flex items-center gap-2 mb-2 px-1">
                            <Wrench size={14} className="text-slate-500" />
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                              Dịch vụ
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400">
                              ({serviceItems.length})
                            </span>
                          </div>
                          {serviceItems.length > 0 ? (
                            <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full min-w-[480px] text-left border-collapse text-sm">
                                  <thead>
                                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                                      <th className="py-2.5 px-4 align-middle">
                                        Hạng mục lỗi
                                      </th>
                                      <th className="py-2.5 px-4 align-middle">
                                        Dịch vụ
                                      </th>
                                      <th className="py-2.5 px-4 align-middle text-right whitespace-nowrap">
                                        Giá sửa chữa
                                      </th>
                                      <th className="py-2.5 px-4 align-middle text-right whitespace-nowrap">
                                        Thành tiền
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {serviceItems.map((item) => (
                                      <tr
                                        key={item.id}
                                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                                      >
                                        <td className="py-3 px-4">
                                          <p
                                            className="text-xs font-semibold text-slate-800 max-w-[130px] truncate"
                                            title={
                                              item.issue?.component?.name ?? ""
                                            }
                                          >
                                            {item.issue?.component?.name ?? "—"}
                                          </p>
                                          {item.issue?.error_description && (
                                            <p
                                              className="text-[10px] text-slate-400 max-w-[130px] truncate mt-0.5"
                                              title={item.issue.error_description}
                                            >
                                              {item.issue.error_description}
                                            </p>
                                          )}
                                        </td>
                                        <td className="py-3 px-4">
                                          <div className="flex items-center gap-2">
                                            <Wrench
                                              size={13}
                                              className="text-slate-400 shrink-0"
                                            />
                                            <span className="text-xs font-semibold text-slate-800 truncate max-w-[170px]">
                                              {item.service_catalog
                                                ?.service_name ||
                                                "Dịch vụ sửa chữa"}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                          <span className="text-xs text-slate-600 font-medium">
                                            {formatVND(item.repair_price)}
                                          </span>
                                        </td>
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                          <span className="text-xs font-bold text-[#00285E]">
                                            {formatVND(item.amount)}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic px-1">
                              Không có dịch vụ.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  /* ===== CHẾ ĐỘ SỬA: form giống modal tạo báo giá ===== */
                  <div className="space-y-5">
                    {/* Tầng phụ tùng: mỗi dòng gắn 1 hạng mục lỗi */}
                    <div>
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <Package size={14} className="text-slate-500" />
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                          Phụ tùng
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          (
                          {
                            editRows.filter(
                              (r) =>
                                (r.kind === "part" && r.partId) ||
                                r.kind === "custom",
                            ).length
                          }
                          )
                        </span>
                      </div>
                      {editRows.some(
                        (r) =>
                          r.kind === "part" || r.kind === "custom",
                      ) ? (
                        <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[560px] text-left border-collapse text-sm">
                              <thead>
                                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                                  <th className="py-3 px-4 align-middle">
                                    Hạng mục lỗi
                                  </th>
                                  <th className="py-3 px-4 align-middle">
                                    Sản phẩm trong kho
                                  </th>
                                  <th className="py-3 px-3 align-middle w-20">
                                    SL
                                  </th>
                                  <th className="py-3 px-4 align-middle text-right whitespace-nowrap">
                                    Thành tiền
                                  </th>
                                  <th className="py-3 px-2 align-middle w-10"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {editRows
                                  .filter(
                                    (row) =>
                                      row.kind === "part" ||
                                      row.kind === "custom",
                                  )
                                  .map((row, rowIndex, visibleRows) => {
                                    const detail = selectedQuotation.items.find(
                                      (i) => i.id === row.detailId,
                                    );
                                    const unitPrice = getEditUnitPrice(row);
                                    const isEmptyPart =
                                      row.kind === "part" && !row.partId;
                                    // Chỉ dòng đầu của mỗi hạng mục lỗi mới hiện tên lỗi
                                    const isFirstRowOfIssue =
                                      visibleRows.findIndex(
                                        (r) => r.issueId === row.issueId,
                                      ) === rowIndex;
                                    const issueName =
                                      detail?.issue?.component?.name ??
                                      editIssues.find(
                                        (issue) =>
                                          issue.issueId === row.issueId,
                                      )?.componentName ??
                                      "Không gắn lỗi";
                                    const issueDescription =
                                      detail?.issue?.error_description ??
                                      editIssues.find(
                                        (issue) =>
                                          issue.issueId === row.issueId,
                                      )?.description ??
                                      "";
                                    return (
                                      <tr
                                        key={row.uid}
                                        className="border-b border-slate-100 last:border-0 align-top"
                                      >
                                        <td className="py-3.5 px-4">
                                          {isFirstRowOfIssue && (
                                            <>
                                              <p
                                                className="text-xs font-semibold text-slate-800 max-w-[140px] truncate"
                                                title={issueName}
                                              >
                                                {issueName}
                                              </p>
                                              {issueDescription && (
                                                <p
                                                  className="text-[11px] text-slate-400 max-w-[140px] truncate mt-0.5"
                                                  title={issueDescription}
                                                >
                                                  {issueDescription}
                                                </p>
                                              )}
                                            </>
                                          )}
                                        </td>
                                        <td className="py-3.5 px-4">
                                          {row.kind === "custom" ? (
                                            <div>
                                              <div className="grid grid-cols-[minmax(0,1fr)_130px] gap-2">
                                                <input
                                                  type="text"
                                                  value={row.customItemName}
                                                  onChange={(event) =>
                                                    updateEditCustomItem(
                                                      row.uid,
                                                      {
                                                        customItemName:
                                                          event.target.value,
                                                      },
                                                    )
                                                  }
                                                  placeholder="Tên phụ tùng đặt riêng"
                                                  className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E]"
                                                />
                                                <PriceInput
                                                  value={row.customUnitPrice}
                                                  placeholder="Đơn giá"
                                                  commitOnChange
                                                  formatWhileTyping
                                                  onCommit={(value) =>
                                                    updateEditCustomItem(
                                                      row.uid,
                                                      {
                                                        customUnitPrice: value,
                                                      },
                                                    )
                                                  }
                                                  className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right text-xs font-semibold text-slate-800 outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E]"
                                                />
                                              </div>
                                              <p className="mt-1 text-[10px] font-semibold text-amber-600">
                                                Phụ tùng đặt riêng · Cọc 30%:{" "}
                                                {formatVND(
                                                  Math.round(
                                                    row.quantity *
                                                    row.customUnitPrice *
                                                    0.3,
                                                  ),
                                                )}
                                              </p>
                                            </div>
                                          ) : (
                                            <>
                                              <select
                                                value={row.partId ?? ""}
                                                onChange={(e) =>
                                                  updateEditPart(
                                                    row.uid,
                                                    e.target.value
                                                      ? Number(e.target.value)
                                                      : null,
                                                  )
                                                }
                                                className={`w-full min-w-[180px] bg-slate-50 border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors ${row.partId
                                                    ? "border-slate-200 text-slate-800"
                                                    : "border-amber-300 text-slate-400"
                                                  }`}
                                              >
                                                <option value="">
                                                  -- Chọn phụ tùng tiếp theo --
                                                </option>
                                                {detail?.sparePart &&
                                                  !spareParts.some(
                                                    (p) =>
                                                      p.id === detail.sparePart!.id,
                                                  ) && (
                                                    <option
                                                      value={detail.sparePart.id}
                                                    >
                                                      {detail.sparePart.name}
                                                    </option>
                                                  )}
                                                {spareParts.map((part) => {
                                                  const available = Number(
                                                    part.available_quantity,
                                                  );
                                                  return (
                                                    <option
                                                      key={part.id}
                                                      value={part.id}
                                                      disabled={available <= 0}
                                                    >
                                                      {part.name}
                                                      {part.brand
                                                        ? ` - ${part.brand}`
                                                        : ""}
                                                      {available <= 0
                                                        ? " (hết hàng)"
                                                        : ` (còn: ${available})`}
                                                    </option>
                                                  );
                                                })}
                                              </select>
                                              {row.partId != null && (
                                                <p className="text-[11px] text-slate-400 mt-1">
                                                  Đơn giá:{" "}
                                                  <span className="font-semibold text-slate-600">
                                                    {formatVND(unitPrice)}
                                                  </span>
                                                </p>
                                              )}
                                            </>
                                          )}
                                        </td>
                                        <td className="py-3.5 px-3">
                                          {!isEmptyPart ? (
                                            <input
                                              type="number"
                                              min={0}
                                              value={row.quantity}
                                              onChange={(e) =>
                                                updateEditQuantity(
                                                  row.uid,
                                                  Number(e.target.value),
                                                )
                                              }
                                              className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-800 text-center focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors"
                                            />
                                          ) : (
                                            <span className="text-xs text-slate-300">—</span>
                                          )}
                                        </td>
                                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                          {!isEmptyPart ? (
                                            <span className="text-xs font-bold text-[#00285E]">
                                              {formatVND(row.quantity * unitPrice)}
                                            </span>
                                          ) : (
                                            <span className="text-xs text-slate-300">—</span>
                                          )}
                                        </td>
                                        <td className="py-3.5 px-2 text-center">
                                          {!isEmptyPart && (
                                            <button
                                              onClick={() => removeEditRow(row.uid)}
                                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                              title="Xóa phụ tùng"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic px-1">
                          Không có phụ tùng.
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setShowEditCustomPartForm((current) => !current)
                        }
                        className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-[#00285E]/25 bg-white px-3 text-xs font-semibold text-[#00285E] hover:bg-slate-50"
                      >
                        <span className="text-base font-normal">+</span>
                        Đặt phụ tùng riêng
                      </button>
                      {showEditCustomPartForm && (
                        <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="mb-4 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                Thêm phụ tùng đặt riêng
                              </p>
                              <p className="mt-0.5 text-xs text-slate-400">
                                Nhập thông tin phụ tùng cần đặt cho hạng mục lỗi.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowEditCustomPartForm(false)}
                              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                Hạng mục lỗi
                              </label>
                              <select
                                value={editCustomIssueId}
                                onChange={(event) =>
                                  setEditCustomIssueId(
                                    Number(event.target.value),
                                  )
                                }
                                className="h-9 w-full rounded-lg border border-amber-300 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E]"
                              >
                                {editIssues.map((issue) => (
                                  <option
                                    key={issue.issueId}
                                    value={issue.issueId}
                                  >
                                    {issue.componentName}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                Tên phụ tùng
                              </label>
                              <input
                                type="text"
                                value={editCustomName}
                                onChange={(event) =>
                                  setEditCustomName(event.target.value)
                                }
                                placeholder="Nhập tên phụ tùng"
                                className="h-9 w-full rounded-lg border border-amber-300 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E]"
                              />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                Số lượng
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={editCustomQuantity}
                                onChange={(event) =>
                                  setEditCustomQuantity(
                                    Math.max(1, Number(event.target.value)),
                                  )
                                }
                                className="h-9 w-full rounded-lg border border-amber-300 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E]"
                              />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                Đơn giá
                              </label>
                              <PriceInput
                                value={editCustomPrice}
                                placeholder="Nhập đơn giá"
                                commitOnChange
                                formatWhileTyping
                                onCommit={setEditCustomPrice}
                                className="h-9 w-full rounded-lg border border-amber-300 bg-slate-50 px-3 text-right text-xs font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E]"
                              />
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between gap-3">
                            <div className="text-xs text-slate-500">
                              Cọc áp dụng:{" "}
                              <span className="font-bold text-amber-600">30%</span>
                              {editCustomPrice > 0 && (
                                <span className="ml-2 font-semibold text-slate-700">
                                  (
                                  {formatVND(
                                    Math.round(
                                      editCustomQuantity *
                                      editCustomPrice *
                                      0.3,
                                    ),
                                  )}
                                  )
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={addEditCustomItem}
                              disabled={
                                editCustomIssueId === "" ||
                                !editCustomName.trim() ||
                                editCustomQuantity <= 0 ||
                                editCustomPrice <= 0
                              }
                              className="h-9 rounded-lg bg-[#00285E] px-4 text-xs font-semibold text-white hover:bg-[#003C7D] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Thêm vào báo giá
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tầng dịch vụ: chọn 1 dịch vụ + tích các lỗi -> thêm dòng */}
                    <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <Wrench size={14} className="text-slate-500" />
                          Dịch vụ
                        </label>
                        {editRows.some((r) => r.kind === "service") && (
                          <span
                            className="text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ backgroundColor: "#00285E", color: "#fff" }}
                          >
                            {editRows.filter((r) => r.kind === "service").length}{" "}
                            dịch vụ
                          </span>
                        )}
                      </div>

                      {/* Chọn 1 dịch vụ + tích các lỗi cần áp -> bấm Thêm */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-3">
                        <select
                          value={servicePicker}
                          onChange={(e) => {
                            setServicePicker(
                              e.target.value ? Number(e.target.value) : "",
                            );
                            setPickedIssueIds([]);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors"
                        >
                          <option value="">
                            -- Chọn dịch vụ trong hệ thống --
                          </option>
                          {services.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.service_name}
                            </option>
                          ))}
                        </select>

                        {servicePicker !== "" &&
                          (() => {
                            const availableIssues = editIssues.filter(
                              (item) =>
                                !editRows.some(
                                  (r) =>
                                    r.kind === "service" &&
                                    r.serviceId === servicePicker &&
                                    r.issueId === item.issueId,
                                ),
                            );
                            if (availableIssues.length === 0)
                              return (
                                <p className="text-xs text-rose-500 italic px-1">
                                  Mọi hạng mục lỗi đã được áp dịch vụ này.
                                </p>
                              );
                            return (
                              <>
                                <div className="flex items-center justify-between px-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Áp cho hạng mục lỗi
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPickedIssueIds(
                                        pickedIssueIds.length ===
                                          availableIssues.length
                                          ? []
                                          : availableIssues.map(
                                            (i) => i.issueId,
                                          ),
                                      )
                                    }
                                    className="text-[11px] font-semibold text-[#00285E] hover:underline"
                                  >
                                    {pickedIssueIds.length ===
                                      availableIssues.length
                                      ? "Bỏ chọn tất cả"
                                      : "Chọn tất cả"}
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {availableIssues.map((item) => {
                                    const checked = pickedIssueIds.includes(
                                      item.issueId,
                                    );
                                    return (
                                      <label
                                        key={item.issueId}
                                        className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${checked
                                            ? "border-[#00285E] bg-white text-slate-800"
                                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                          }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() =>
                                            setPickedIssueIds((prev) =>
                                              prev.includes(item.issueId)
                                                ? prev.filter(
                                                  (id) => id !== item.issueId,
                                                )
                                                : [...prev, item.issueId],
                                            )
                                          }
                                          className="accent-[#00285E]"
                                        />
                                        <span className="truncate">
                                          {item.componentName}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                                <button
                                  type="button"
                                  disabled={pickedIssueIds.length === 0}
                                  onClick={() => {
                                    addEditServicesForIssues(
                                      servicePicker,
                                      pickedIssueIds,
                                    );
                                    setServicePicker("");
                                    setPickedIssueIds([]);
                                  }}
                                  style={{ backgroundColor: "#00285E" }}
                                  className="w-full py-2 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-125 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  Thêm dịch vụ cho {pickedIssueIds.length} hạng
                                  mục
                                </button>
                              </>
                            );
                          })()}
                      </div>

                      {editRows.some((r) => r.kind === "service") && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-3 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <span className="flex-1 min-w-[140px]">Dịch vụ</span>
                            <span className="w-40">Hạng mục lỗi</span>
                            <span className="w-32 text-right">Đơn giá (VND)</span>
                            <span className="w-28 text-right">Thành tiền</span>
                            <span className="w-7" />
                          </div>
                          {editRows
                            .filter((row) => row.kind === "service")
                            .map((row) => (
                              <div
                                key={row.uid}
                                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5"
                              >
                                <span className="flex-1 min-w-[140px] text-sm font-semibold text-slate-800 truncate">
                                  {row.serviceName}
                                </span>
                                <select
                                  value={row.issueId ?? ""}
                                  onChange={(e) =>
                                    updateEditIssue(
                                      row.uid,
                                      e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                    )
                                  }
                                  className={`w-40 bg-white border rounded-lg px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors ${row.issueId
                                      ? "border-slate-200 text-slate-800"
                                      : "border-amber-300 text-slate-400"
                                    }`}
                                >
                                  <option value="">-- Chọn hạng mục --</option>
                                  {editIssues
                                    .filter(
                                      (item) =>
                                        item.issueId === row.issueId ||
                                        !editRows.some(
                                          (s) =>
                                            s.uid !== row.uid &&
                                            s.kind === "service" &&
                                            s.serviceId === row.serviceId &&
                                            s.issueId === item.issueId,
                                        ),
                                    )
                                    .map((item) => (
                                      <option
                                        key={item.issueId}
                                        value={item.issueId}
                                      >
                                        {item.componentName}
                                      </option>
                                    ))}
                                </select>
                                <PriceInput
                                  placeholder="Nhập giá"
                                  formatWhileTyping
                                  value={row.repairPrice}
                                  onCommit={(v) => updateEditFee(row.uid, v)}
                                  className="w-32 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-right transition-colors focus:outline-none bg-white text-slate-800 focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E]"
                                />
                                <span className="w-28 text-right text-xs font-bold text-[#00285E] whitespace-nowrap">
                                  {formatVND(row.repairPrice)}
                                </span>
                                <button
                                  onClick={() => removeEditRow(row.uid)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                  title="Xóa dịch vụ"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Ghi chú */}
              <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <ClipboardList size={13} className="text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Ghi chú
                  </span>
                </div>
                {isEditing ? (
                  <textarea
                    rows={3}
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="Ghi chú thêm cho báo giá..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors resize-none"
                  />
                ) : (
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {selectedQuotation.note || "Không có ghi chú."}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-7 py-4 border-t border-slate-200 shrink-0 bg-white">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Tổng cộng
                </span>
                <span className="text-lg font-bold text-[#00285E]">
                  {formatVND(
                    isEditing ? editTotal : selectedQuotation.total_amount,
                  )}
                </span>
                {isEditing && editDeposit > 0 && (
                  <span className="ml-2 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                    Tiền cọc phụ tùng đặt riêng: {formatVND(editDeposit)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="h-11 px-5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleUpdateQuotation}
                      disabled={editRows.some(
                        (r) =>
                          (r.kind === "part" &&
                            Boolean(r.partId) &&
                            r.quantity <= 0) ||
                          (r.kind === "custom" &&
                            (!r.customItemName.trim() ||
                              r.customUnitPrice <= 0 ||
                              r.quantity <= 0)) ||
                          (r.kind === "service" && !r.serviceId),
                      )}
                      className="h-11 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-[#003C7D] to-[#00285E] shadow-lg shadow-[#00285E]/25 hover:shadow-[#00285E]/40 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100"
                    >
                      Lưu thay đổi
                    </button>
                  </>
                ) : (
                  <>
                    {["PENDING", "REJECTED"].includes(
                      selectedQuotation.status,
                    ) && (
                      <button
                        onClick={startEdit}
                        className="h-11 flex items-center gap-2 px-5 rounded-xl text-sm font-semibold text-white bg-[#00285E] shadow-lg shadow-[#00285E]/25 hover:shadow-[#00285E]/40 hover:brightness-110 active:scale-[0.98] transition-all"
                      >
                        <Pencil size={14} />
                        Cập nhật báo giá
                      </button>
                    )}
                    {/* Gọi điện xác nhận với khách xong -> duyệt để chuyển kho xuất hàng */}
                    {selectedQuotation.status === "PENDING" && (
                      <button
                        onClick={() => {
                          setOtpPhone(
                            normalizePhoneForCountryInput(
                              selectedQuotation.customerPhone || "",
                            ),
                          );
                          setIsOtpSent(false);
                          setOtpValue("");
                          setResendCountdown(60);
                          setOtpConfirmation(null);
                          setOtpError("");
                          setConfirmApprove(true);
                        }}
                        className="h-11 flex items-center gap-2 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:brightness-105 active:scale-[0.98] transition-all"
                      >
                        <CheckCircle2 size={16} />
                        Hỗ trợ duyệt báo giá
                      </button>
                    )}
                    {/* Duyệt xong mới thu cọc phụ tùng đặt riêng */}
                    {["APPROVED", "PENDING_DEPOSIT"].includes(
                      selectedQuotation.status,
                    ) &&
                      isAwaitingDeposit(selectedQuotation) && (
                        <button
                          onClick={() => {
                            setIsDepositPaid(false);
                            setShowDepositPayment(true);
                          }}
                          className="h-11 flex items-center gap-2 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-amber-500 to-amber-600 shadow-lg shadow-amber-600/25 hover:shadow-amber-600/40 hover:brightness-105 active:scale-[0.98] transition-all"
                        >
                          <Wallet size={16} />
                          Tạo mã thanh toán cọc
                        </button>
                      )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* XÁC THỰC OTP TRƯỚC KHI DUYỆT BÁO GIÁ */}
      {confirmApprove && selectedQuotation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <style>{quotationPhoneStyles}</style>
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={closeOtpModal}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden ring-1 ring-slate-900/5">
            <div className="px-7 pt-7 pb-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-[#EDF3FF] shrink-0">
                    <CheckCircle2 size={20} className="text-[#00285E]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">
                      {isOtpSent ? "Xác thực mã OTP" : "Gửi mã xác thực"}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed mt-1">
                      Xác thực sự đồng ý của khách hàng trước khi duyệt báo giá.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeOtpModal}
                  className="p-2 -mt-1 -mr-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  aria-label="Đóng"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Khách hàng
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {selectedQuotation.customerName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedQuotation.customerPhone || "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Thông tin xe
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {selectedQuotation.vehiclePlate || "—"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {[selectedQuotation.vehicleName, selectedQuotation.vehicleColor]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </div>
              </div>

              {!isOtpSent ? (
                <div className="mt-6">
                  <label
                    htmlFor="quotation-otp-phone"
                    className="block text-sm font-semibold text-slate-700 mb-2"
                  >
                    Số điện thoại nhận OTP
                  </label>
                  <div className="quotation-otp-phone">
                    <PhoneInput
                      country="vn"
                      value={otpPhone}
                      enableSearch
                      searchPlaceholder="Tìm quốc gia..."
                      inputProps={{
                        name: "quotation-otp-phone",
                        readOnly: true,
                      }}
                      disableDropdown
                      countryCodeEditable={false}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Mã OTP được gửi tới số điện thoại của khách hàng trên phiếu
                    dịch vụ.
                  </p>
                </div>
              ) : (
                <div className="mt-6">
                  <div className="mb-4 rounded-xl border border-[#00285E]/10 bg-[#EDF3FF] px-4 py-3">
                    <p className="text-xs text-slate-500">
                      Mã đã được gửi đến
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-[#00285E]">
                      {formatPhoneForDisplay(otpPhone)}
                    </p>
                  </div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Mã OTP gồm 6 chữ số
                  </label>
                  <div className="flex items-center justify-between gap-2">
                    {Array.from({ length: 6 }, (_, index) => (
                      <input
                        key={index}
                        ref={(element) => {
                          otpInputRefs.current[index] = element;
                        }}
                        type="text"
                        inputMode="numeric"
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        maxLength={1}
                        autoFocus={index === 0}
                        value={otpValue[index]?.trim() || ""}
                        onChange={(event) =>
                          updateOtpDigit(index, event.target.value)
                        }
                        onPaste={handleOtpPaste}
                        onKeyDown={(event) => {
                          if (
                            event.key === "Backspace" &&
                            !otpValue[index] &&
                            index > 0
                          ) {
                            otpInputRefs.current[index - 1]?.focus();
                          }
                        }}
                        aria-label={`Chữ số OTP ${index + 1}`}
                        className="h-12 min-w-0 w-full rounded-xl border border-slate-200 bg-white text-center text-lg font-bold text-[#00285E] outline-none transition-all focus:border-[#00285E] focus:ring-4 focus:ring-[#00285E]/10"
                      />
                    ))}
                  </div>
                  <div className="mt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={() => void resendOtp()}
                      disabled={resendCountdown > 0 || isSendingOtp}
                      className="text-sm font-semibold text-[#00285E] transition-colors hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
                    >
                      {isSendingOtp
                        ? "Đang gửi lại mã..."
                        : resendCountdown > 0
                          ? `Gửi lại mã sau ${resendCountdown}s`
                          : "Gửi lại mã OTP"}
                    </button>
                  </div>
                  <p className="mt-3 text-center text-xs text-slate-400">
                    Chỉ tiếp tục duyệt báo giá khi mã OTP được xác thực chính xác.
                  </p>
                </div>
              )}
              {otpError && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-600">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}
              <div id={QUOTE_RECAPTCHA_CONTAINER_ID} />
            </div>
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={closeOtpModal}
                disabled={isSendingOtp || isApproving}
                className="h-11 px-5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Hủy
              </button>
              <button
                onClick={() =>
                  void (isOtpSent ? handleOtpConfirmation() : sendOtp())
                }
                disabled={
                  isSendingOtp ||
                  isApproving ||
                  (isOtpSent
                    ? !/^\d{6}$/.test(otpValue)
                    : !otpPhone.trim())
                }
                className="h-11 flex items-center gap-2 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {isSendingOtp || isApproving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                {isApproving
                  ? "Đang xác thực..."
                  : isSendingOtp
                    ? "Đang gửi..."
                    : isOtpSent
                      ? "Xác nhận"
                      : "Gửi mã OTP"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MÃ THANH TOÁN TIỀN CỌC PHỤ TÙNG ĐẶT RIÊNG (RỘNG CÂN ĐỐI - MAX-W-2XL) */}
      {showDepositPayment && selectedQuotation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => {
              setShowDepositPayment(false);
              setIsDepositPaid(false);
            }}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden ring-1 ring-slate-900/5">
            {/* Header */}
            <div className="px-7 pt-6 pb-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 shrink-0">
                  <Wallet size={20} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    Thanh toán tiền cọc
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Khách quét mã để chuyển cọc phụ tùng đặt riêng.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDepositPayment(false);
                  setIsDepositPaid(false);
                }}
                className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body - 2 Columns (Wider & Balanced Height) */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* LEFT COLUMN: Deposit Info & Customer/Vehicle */}
              <div className="flex flex-col justify-between space-y-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                      Số tiền cần cọc
                    </p>
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200">
                      {selectedQuotation.code}
                    </span>
                  </div>

                  <p className="mt-1.5 text-2xl font-black text-amber-600">
                    {formatVND(selectedQuotation.deposit_amount ?? 0)}
                  </p>

                  {/* Chi tiết từng phụ tùng đặt thêm (custom_item_name) cần cọc 30% */}
                  <div className="mt-3 pt-3 border-t border-amber-200/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                        Phụ tùng đặt thêm ({selectedQuotation.items.filter((item) => item.custom_item_name).length}):
                      </p>
                      <span className="text-[10px] text-amber-700/90 italic">
                        * Cọc 30% giá trị
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {selectedQuotation.items
                        .filter((item) => item.custom_item_name)
                        .map((item, idx) => {
                          const itemName = item.custom_item_name || "Phụ tùng đặt thêm";
                          const unitPrice = item.unit_price || (item.quantity > 0 ? item.amount / item.quantity : item.amount);
                          return (
                            <div key={idx} className="bg-white/90 p-2.5 rounded-xl border border-amber-200/80 text-xs flex justify-between items-start gap-2 shadow-2xs">
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 truncate">{itemName}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Đơn giá x1: <span className="font-semibold text-slate-700">{formatVND(unitPrice)}</span> · SL: <span className="font-bold text-amber-700">x{item.quantity}</span>
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-[10px] text-slate-400 block uppercase font-medium">Thành tiền</span>
                                <span className="font-extrabold text-slate-900 text-xs">{formatVND(item.amount)}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Khách hàng
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800 truncate">
                      {selectedQuotation.customerName}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {selectedQuotation.customerPhone || "—"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Thông tin xe
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800 truncate">
                      {selectedQuotation.vehiclePlate || "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 truncate">
                      {[
                        selectedQuotation.vehicleName,
                        selectedQuotation.vehicleColor,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: VietQR Code Container - LARGER QR & FULL CONTAINER */}
              <div className="flex flex-col items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center h-full">
                {!isDepositPaid ? (
                  <>
                    <div className="w-full flex items-center justify-between pb-2 border-b border-slate-200/80 mb-2">
                      <span className="text-xs font-bold text-[#00285E] uppercase tracking-wide">
                        Quét mã VietQR cọc
                      </span>
                      <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-200">
                        {import.meta.env.VITE_SEPAY_BANK || "TPBank"}
                      </span>
                    </div>

                    {/* Larger QR Image */}
                    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-md my-1 w-full flex items-center justify-center">
                      <img
                        src={`https://vietqr.app/img?acc=${import.meta.env.VITE_SEPAY_ACC || "05979551201"}&bank=${import.meta.env.VITE_SEPAY_BANK || "TPBank"}&amount=${selectedQuotation.deposit_amount || 0}&template=compact&showinfo=true&addInfo=BG-${selectedQuotation.id}`}
                        alt="VietQR Deposit Code"
                        className="w-56 h-56 rounded-xl object-contain mx-auto"
                      />
                    </div>

                    {/* Bank & Memo Detail Boxes */}
                    <div className="w-full space-y-1.5 text-xs text-slate-700 my-2">
                      <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-[11px] text-slate-500 font-medium">Số tài khoản:</span>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-[#00285E]">
                          <span>{import.meta.env.VITE_SEPAY_ACC || "05979551201"}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyDepositInfo(import.meta.env.VITE_SEPAY_ACC || "05979551201", "Số tài khoản")}
                            className="p-1 text-slate-400 hover:text-[#00285E] rounded transition-colors"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-[11px] text-slate-500 font-medium">Nội dung CK:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[#00285E] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            BG-{selectedQuotation.id}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyDepositInfo(`BG-${selectedQuotation.id}`, "Nội dung chuyển khoản")}
                            className="p-1 text-slate-400 hover:text-[#00285E] rounded transition-colors"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      Hệ thống đang tự động chờ nhận tiền cọc...
                    </div>
                  </>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 my-auto">
                    <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-sm mb-2">
                      <Check size={32} strokeWidth={3} />
                    </div>
                    <p className="text-base font-extrabold text-emerald-700">Đã nhận được tiền cọc!</p>
                    <p className="text-xs text-slate-500 max-w-[200px]">Hệ thống đã tự động cập nhật nhận tiền cọc cho báo giá {selectedQuotation.code}.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-6 py-3.5 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowDepositPayment(false);
                  setIsDepositPaid(false);
                }}
                className="h-10 px-6 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
