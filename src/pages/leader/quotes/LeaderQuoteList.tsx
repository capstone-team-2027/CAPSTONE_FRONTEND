import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import type {
  GetQuotationResponse,
  GetAllSparePartsResponse,
  GetServicesResponse,
} from "../../../model/dto/quoteManagement.dto";
import {
  ArrowLeft,
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
  ChevronDown,
  Check,
  Plus,
} from "lucide-react";
import { useFetchClient } from "../../../hook/useFetchClient";
import { useSocket } from "../../../hook/useSocket";
import { LEADER_QUOTE_MANAGEMENT_ENDPOINTS } from "../../../constants/technicianLeader/quoteManagementEndpoints";
import { buildQuotationPdfDocument } from "../../../services/quotationPdf.service";

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

// Báo giá có phụ tùng đặt riêng thì phải cọc trước; chưa có deposit_paid_at
// nghĩa là khách chưa chuyển tiền cọc -> lễ tân theo dõi và xác nhận (không thuộc trang này).
// Phải còn ít nhất 1 dòng phụ tùng đặt riêng chưa bị hủy: nếu mọi món cần cọc đều đã bị hủy
// (khách không cọc, lễ tân đóng đơn bỏ món đó) thì không còn gì để thu, dù deposit_amount cũ
// trong DB chưa kịp về 0.
const hasPendingCustomPart = (quotation: GetQuotationResponse) =>
  (quotation.items || []).some(
    (item) =>
      item.customPartOrder &&
      item.status !== "CANCELLED" &&
      item.customPartOrder.status !== "CANCELLED",
  );

const isAwaitingDeposit = (quotation: GetQuotationResponse) =>
  ["APPROVED", "PENDING_DEPOSIT"].includes(quotation.status) &&
  Number(quotation.deposit_amount) > 0 &&
  !quotation.deposit_paid_at &&
  hasPendingCustomPart(quotation);

const formatVND = (value: number | string) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value) || 0)} VND`;

const sanitizeFileNamePart = (value: string, fallback: string) =>
  (value.trim() || fallback)
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

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
        if (readOnly) return;
        setDraft(value ? String(value) : "");
        setFocused(true);
      }}
      onChange={(e) => {
        if (readOnly) return;
        const nextDraft = e.target.value.replace(/\D/g, "");
        setDraft(nextDraft);
        if (commitOnChange) onCommit(Number(nextDraft) || 0);
      }}
      onBlur={() => {
        if (readOnly) return;
        setFocused(false);
        onCommit(Number(draft) || 0);
      }}
      className={className}
    />
  );
}

interface SearchableSelectOption {
  value: number;
  label: string;
  sublabel?: string;
  outOfStock?: boolean;
}

// Dropdown tự vẽ thay cho <select> native — giống hệt form tạo báo giá: có ô tìm kiếm,
// danh sách cuộn giới hạn chiều cao, dùng position fixed để thoát khỏi vùng overflow của
// bảng/modal (trục overflow-x auto khiến trục dọc bị clip, absolute không thoát được).
function SearchableSelect({
  options,
  value,
  placeholder,
  emptyText,
  invalid,
  onChange,
}: {
  options: SearchableSelectOption[];
  value: number | null;
  placeholder: string;
  emptyText?: string;
  invalid?: boolean;
  onChange: (value: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPos({ top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 260) });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handleClickOutside = (e: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setKeyword("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sortedOptions = useMemo(
    () => [...options].sort((a, b) => a.label.localeCompare(b.label, "vi")),
    [options],
  );
  const filteredOptions = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return sortedOptions;
    return sortedOptions.filter(
      (o) => o.label.toLowerCase().includes(kw) || o.sublabel?.toLowerCase().includes(kw),
    );
  }, [sortedOptions, keyword]);

  const selected = options.find((o) => o.value === value) ?? null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full min-w-[180px] flex items-center justify-between gap-2 bg-slate-50 border rounded-lg px-3 py-2 text-xs font-semibold text-left focus:outline-none transition-colors ${
          invalid ? "border-amber-300 text-slate-400" : "border-slate-200 text-slate-800"
        } ${open ? "ring-1 ring-[#00285E] border-[#00285E]" : ""}`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && menuPos && (
        <div
          ref={menuRef}
          style={{ position: "fixed", top: menuPos.top, left: menuPos.left, width: menuPos.width }}
          className="z-[60] rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden"
        >
          <div className="relative p-2 border-b border-slate-100">
            <Search size={13} className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full bg-slate-50 rounded-lg pl-8 pr-2 py-1.5 text-xs font-semibold outline-none placeholder:font-normal placeholder:text-slate-400"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-3 text-xs text-slate-400 italic">
                {emptyText ?? "Không tìm thấy kết quả phù hợp."}
              </p>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                      setKeyword("");
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left transition-colors ${
                      isSelected
                        ? "bg-[#EDF3FF] text-[#00285E] font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected ? (
                      <Check size={13} className="shrink-0 text-[#00285E]" />
                    ) : option.outOfStock ? (
                      <span className="shrink-0 text-[10px] font-semibold text-amber-600">Thiếu tồn — chờ nhập kho</span>
                    ) : option.sublabel ? (
                      <span className="shrink-0 text-[10px] font-semibold text-slate-400">{option.sublabel}</span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
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

export default function LeaderQuoteList() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<GetQuotationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedQuotation, setSelectedQuotation] =
    useState<QuotationRow | null>(null);
  const { fetchPrivate } = useFetchClient();
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
  const [isApproving, setIsApproving] = useState(false);

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

  const handleGetQuotationHistory = async () => {
    try {
      const result = await fetchPrivate(LEADER_QUOTE_MANAGEMENT_ENDPOINTS.QUOTE_MANAGEMENT, "GET");
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
        LEADER_QUOTE_MANAGEMENT_ENDPOINTS.GET_SPARE_PARTS,
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
        LEADER_QUOTE_MANAGEMENT_ENDPOINTS.GET_SERVICES,
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
            item.customPartOrder?.item_name?.toLowerCase().includes(keyword) ||
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
      const document = await buildQuotationPdfDocument(
        quotation,
        quotation.creator?.fullName || "Kỹ thuật viên trưởng",
        getStatusConfig(quotation.status).label,
      );

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

  const openQuotationDetail = (q: QuotationRow) => {
    setIsEditing(false);
    setSelectedQuotation(q);
  };

  const closeQuotationDetail = () => {
    setIsEditing(false);
    setSelectedQuotation(null);
    setServicePicker("");
    setPickedIssueIds([]);
  };

  const handleApproveQuotation = async () => {
    if (!selectedQuotation) return;
    setIsApproving(true);
    try {
      await fetchPrivate(
        LEADER_QUOTE_MANAGEMENT_ENDPOINTS.APPROVE_QUOTE(selectedQuotation.id),
        "PATCH",
      );
      showToast("Đã duyệt báo giá tại chỗ!", "success");
      closeQuotationDetail();
      await handleGetQuotationHistory();
    } catch (error: any) {
      console.error(error);
      showToast(error?.message || "Không thể duyệt báo giá.", "warning");
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
      // Tên/giá thật của phụ tùng đặt riêng sống ở Custom_Part_Orders, không phải
      // Quotation_Details.custom_item_name — BE luôn ghi field đó null (dòng trong DB chỉ là
      // "shell"). Trước đây check theo custom_item_name nên luôn ra false, dòng phụ tùng đặt
      // riêng bị rơi vào nhánh "service" mặc định, hiện thành "Dịch vụ sửa chữa" ma.
      const isCustom = Boolean(item.customPartOrder);
      const svc = item.service_catalog;
      return {
        uid: editUidRef.current,
        detailId: item.id,
        issueId: item.issue?.id ?? null,
        kind: isPart ? "part" : isCustom ? "custom" : "service",
        partId: item.sparePart?.id ?? null,
        customItemName: item.customPartOrder?.item_name ?? item.custom_item_name ?? "",
        customUnitPrice: isCustom ? Number(item.customPartOrder?.unit_price ?? item.unit_price) || 0 : 0,
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

  const updateEditPart = (uid: number, partId: number | null) => {
    const currentRow = editRows.find((row) => row.uid === uid);
    const part = spareParts.find((p) => p.id === partId);
    if (part && currentRow) {
      const isDuplicatedInIssue = editRows.some(
        (row) =>
          row.uid !== uid &&
          row.kind === "part" &&
          row.issueId === currentRow.issueId &&
          row.partId === partId,
      );
      if (isDuplicatedInIssue) {
        showToast(`"${part.name}" đã được chọn cho hạng mục lỗi này.`, "warning");
        return;
      }
    }
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
      const emptyRow: EditRow = {
        ...currentRow,
        uid: editUidRef.current,
        detailId: null,
        kind: "part",
        partId: null,
        customItemName: "",
        customUnitPrice: 0,
        quantity: 1,
      };
      // Chèn ngay sau nhóm dòng của hạng mục lỗi đó thay vì đẩy xuống cuối mảng
      const lastIssueIndex = updatedRows.reduce(
        (lastIndex, row, index) =>
          row.kind !== "service" && row.issueId === currentRow.issueId ? index : lastIndex,
        -1,
      );
      return [
        ...updatedRows.slice(0, lastIssueIndex + 1),
        emptyRow,
        ...updatedRows.slice(lastIssueIndex + 1),
      ];
    });
  };

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

  // Cho phép vượt tồn giống form tạo — thiếu tồn chỉ hiện cảnh báo, hệ thống tự tạo yêu cầu
  // nhập kho khi khách duyệt báo giá.
  const updateEditQuantity = (uid: number, quantity: number) =>
    setEditRows((prev) =>
      prev.map((row) =>
        row.uid === uid ? { ...row, quantity: Math.max(0, quantity) } : row,
      ),
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

  // Xóa dòng phụ tùng cuối cùng của 1 hạng mục lỗi thì reset về dòng trống thay vì bỏ hẳn,
  // để hạng mục đó vẫn còn chỗ chọn phụ tùng mới — giống form tạo báo giá.
  const removeEditRow = (uid: number) =>
    setEditRows((prev) => {
      const target = prev.find((row) => row.uid === uid);
      if (!target) return prev;
      if (target.kind === "service") return prev.filter((row) => row.uid !== uid);
      const issueRows = prev.filter(
        (row) => row.kind !== "service" && row.issueId === target.issueId,
      );
      if (issueRows.length === 1) {
        return prev.map((row) =>
          row.uid === uid
            ? {
              ...row,
              kind: "part" as const,
              detailId: null,
              partId: null,
              customItemName: "",
              customUnitPrice: 0,
              quantity: 1,
            }
            : row,
        );
      }
      return prev.filter((row) => row.uid !== uid);
    });

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

  // Dịch vụ khách yêu cầu thêm ngoài các hạng mục lỗi đã báo (vd rửa xe, thay dầu định kỳ) —
  // không gắn issueId, không bị validate "phải có phụ tùng đi kèm dịch vụ" ở BE.
  const addEditStandaloneService = (id: number) => {
    const service = services.find((s) => s.id === id);
    if (!service) return;
    const dbPrice = Number(service.labor_price) || 0;
    editUidRef.current += 1;
    setEditRows((prev) => [
      ...prev,
      {
        uid: editUidRef.current,
        detailId: null,
        issueId: null,
        kind: "service",
        partId: null,
        customItemName: "",
        customUnitPrice: 0,
        quantity: 1,
        serviceId: id,
        serviceName: service.service_name,
        hasDbPrice: dbPrice > 0,
        repairPrice: dbPrice,
      },
    ]);
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
        `${LEADER_QUOTE_MANAGEMENT_ENDPOINTS.QUOTE_MANAGEMENT}/${selectedQuotation.id}`,
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
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(-1)}
            title="Quay lại"
            className="mt-0.5 w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-[#00285E] border border-[#00285E] text-white hover:bg-[#003C7D] hover:border-[#003C7D] active:scale-[0.97] transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2">
              Lịch sử báo giá
            </h1>
            <p className="text-slate-500 text-sm">
              Xem lại các báo giá đã tạo và trạng thái duyệt của khách hàng.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/leader/quotes/create")}
          className="h-11 flex items-center gap-2 px-5 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-[#003C7D] to-[#00285E] shadow-lg shadow-[#00285E]/25 hover:shadow-[#00285E]/40 hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <FileText size={16} />
          Tạo báo giá
        </button>
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
            <table className="w-full min-w-[640px] text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-blue-100 uppercase tracking-widest bg-[#00285E] lg:text-slate-400 lg:bg-slate-50/50">
                  <th className="py-3 px-3 align-middle whitespace-nowrap">
                    Đơn báo giá
                  </th>
                  <th className="py-3 px-3 align-middle whitespace-nowrap">
                    Khách hàng
                  </th>
                  <th className="py-3 px-3 align-middle whitespace-nowrap">
                    Xe
                  </th>
                  <th className="py-3 px-3 align-middle whitespace-nowrap">
                    Trạng thái
                  </th>
                  <th className="py-3 px-3 align-middle text-center whitespace-nowrap w-28">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((q) => {
                  const statusCfg = getStatusConfig(q.status);
                  const StatusIcon = statusCfg.icon;
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
                          {/* Nhãn phụ: còn nợ cọc phụ tùng đặt riêng (lễ tân thu, chỉ hiển thị tham khảo) */}
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
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#00285E] hover:brightness-125 transition-all"
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
              {(() => {
                const pages: (number | string)[] = [];
                if (totalPages <= 5) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  if (currentPage <= 3) {
                    pages.push(1, 2, 3, 4, '...', totalPages);
                  } else if (currentPage >= totalPages - 2) {
                    pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                  } else {
                    pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                  }
                }

                return pages.map((page, index) =>
                  page === '...' ? (
                    <span key={`ellipsis-${index}`} className="w-8 h-8 flex items-center justify-center text-slate-400 text-xs font-bold tracking-widest">...</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page as number)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${page === currentPage
                        ? "bg-[#00285E] text-white shadow-md"
                        : "text-slate-500 hover:bg-slate-100"
                        }`}
                    >
                      {page}
                    </button>
                  )
                );
              })()}
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
                    <div className="flex flex-col gap-1 pt-2 border-t border-slate-100 mt-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Tình trạng tiếp nhận
                      </span>
                      <span className="text-xs font-semibold text-slate-700 break-words">
                        {selectedQuotation.task?.serviceOrder?.symptoms || "—"}
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
                    {/* Nhãn phụ: phụ tùng đặt riêng chưa thu cọc (lễ tân xử lý) */}
                    {isAwaitingDeposit(selectedQuotation) && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <Wallet size={12} className="shrink-0" />
                        Chờ cọc{" "}
                        {
                          selectedQuotation.items.filter(
                            (item) => item.customPartOrder,
                          ).length
                        }{" "}
                        phụ tùng
                      </span>
                    )}
                  </div>
                  {isAwaitingDeposit(selectedQuotation) && (
                    <p className="text-[11px] font-semibold text-amber-600 mt-1.5">
                      Cần thu cọc (lễ tân xử lý):{" "}
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
                      (i) => i.sparePart || i.customPartOrder,
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
                                                item.customPartOrder?.item_name}
                                            </span>
                                          </div>
                                          {item.customPartOrder && (
                                            <span
                                              className={`mt-1 ml-3 flex w-fit min-w-[190px] rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.customPartOrder.status === "CANCELLED"
                                                ? "bg-rose-50 text-rose-700"
                                                : item.customPartOrder.status === "WAITING_DEPOSIT"
                                                  ? "bg-amber-50 text-amber-700"
                                                  : item.customPartOrder.status === "WAITING_ARRIVAL"
                                                    ? "bg-blue-50 text-blue-700"
                                                    : item.customPartOrder.status === "READY_FOR_USE"
                                                      ? "bg-violet-50 text-violet-700"
                                                      : "bg-emerald-50 text-emerald-700"
                                                }`}
                                            >
                                              {item.customPartOrder.status === "CANCELLED" ? (
                                                "Phụ tùng đặt riêng · Đã hủy"
                                              ) : item.customPartOrder.status === "WAITING_DEPOSIT" ? (
                                                <>
                                                  Phụ tùng đặt riêng · Cần cọc:{" "}
                                                  {formatVND(
                                                    Math.round(
                                                      item.customPartOrder.quantity *
                                                      item.customPartOrder.unit_price *
                                                      0.3,
                                                    ),
                                                  )}
                                                </>
                                              ) : item.customPartOrder.status === "WAITING_ARRIVAL" ? (
                                                "Phụ tùng đặt riêng · Đã cọc, chờ về hàng"
                                              ) : item.customPartOrder.status === "READY_FOR_USE" ? (
                                                "Phụ tùng đặt riêng · Đã về, chờ xuất kho"
                                              ) : (
                                                "Phụ tùng đặt riêng · Đã xuất kho"
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
                  /* ===== CHẾ ĐỘ SỬA: bố cục giống hệt form tạo báo giá ===== */
                  <div className="space-y-5">
                    {/* Danh sách hạng mục lỗi + Chọn dịch vụ cho hạng mục lỗi — chung 1 card */}
                    <div className="bg-white rounded-2xl border border-slate-200/70 p-4 space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <ClipboardList size={14} className="text-slate-500" />
                            Danh sách hạng mục lỗi
                          </label>
                          <span
                            className="text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ backgroundColor: "#00285E", color: "#fff" }}
                          >
                            {editIssues.length} hạng mục
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {editIssues.map((issue) => {
                            const hasService = editRows.some(
                              (r) => r.kind === "service" && r.issueId === issue.issueId,
                            );
                            return (
                              <div
                                key={issue.issueId}
                                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${hasService
                                  ? "border-emerald-200 bg-emerald-50/50"
                                  : "border-slate-200 bg-slate-50/60"
                                  }`}
                              >
                                {hasService ? (
                                  <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                                ) : (
                                  <AlertCircle size={14} className="shrink-0 text-amber-500" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-slate-800 truncate">
                                    {issue.componentName}
                                  </p>
                                  {issue.description && (
                                    <p className="text-[11px] text-slate-400 truncate">
                                      {issue.description}
                                    </p>
                                  )}
                                </div>
                                <span
                                  className={`shrink-0 text-[10px] font-bold ${hasService ? "text-emerald-600" : "text-amber-600"
                                    }`}
                                >
                                  {hasService ? "Đã có dịch vụ" : "Chưa có dịch vụ"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Wrench size={14} className="text-slate-500" />
                            Chọn dịch vụ cho hạng mục lỗi
                          </label>
                          {editRows.some((r) => r.kind === "service") && (
                            <span
                              className="text-xs font-semibold px-2.5 py-1 rounded-full"
                              style={{ backgroundColor: "#00285E", color: "#fff" }}
                            >
                              {editRows.filter((r) => r.kind === "service").length} dịch vụ
                            </span>
                          )}
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-3">
                          <SearchableSelect
                            value={servicePicker === "" ? null : servicePicker}
                            placeholder="-- Chọn dịch vụ trong hệ thống --"
                            emptyText="Không tìm thấy dịch vụ phù hợp."
                            onChange={(v) => {
                              setServicePicker(v ?? "");
                              setPickedIssueIds([]);
                            }}
                            options={services.map((service) => ({
                              value: service.id,
                              label: service.service_name,
                            }))}
                          />

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
                                          pickedIssueIds.length === availableIssues.length
                                            ? []
                                            : availableIssues.map((i) => i.issueId),
                                        )
                                      }
                                      className="text-[11px] font-semibold text-[#00285E] hover:underline"
                                    >
                                      {pickedIssueIds.length === availableIssues.length
                                        ? "Bỏ chọn tất cả"
                                        : "Chọn tất cả"}
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {availableIssues.map((item) => {
                                      const checked = pickedIssueIds.includes(item.issueId);
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
                                                  ? prev.filter((id) => id !== item.issueId)
                                                  : [...prev, item.issueId],
                                              )
                                            }
                                            className="accent-[#00285E]"
                                          />
                                          <span className="truncate">{item.componentName}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                  <button
                                    type="button"
                                    disabled={pickedIssueIds.length === 0}
                                    onClick={() => {
                                      addEditServicesForIssues(servicePicker, pickedIssueIds);
                                      setServicePicker("");
                                      setPickedIssueIds([]);
                                    }}
                                    style={{ backgroundColor: "#00285E" }}
                                    className="w-full py-2 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-125 disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    Thêm dịch vụ cho {pickedIssueIds.length} hạng mục
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      addEditStandaloneService(servicePicker);
                                      setServicePicker("");
                                      setPickedIssueIds([]);
                                    }}
                                    className="w-full py-2 rounded-lg border border-[#00285E]/25 text-xs font-semibold text-[#00285E] transition-all hover:bg-slate-50"
                                  >
                                    Thêm dịch vụ này không thuộc hạng mục lỗi nào
                                  </button>
                                </>
                              );
                            })()}
                        </div>
                      </div>
                    </div>

                    {/* Hạng mục báo giá — chỉ hiện lỗi đã có dịch vụ, gắn phụ tùng cho lỗi đó */}
                    <div>
                      <div className="flex items-center justify-between mb-3 px-1">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <Package size={14} className="text-slate-500" />
                          Hạng mục báo giá
                        </label>
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: "#00285E", color: "#fff" }}
                        >
                          {editIssues.length} hạng mục ·{" "}
                          {
                            editRows.filter(
                              (r) => (r.kind === "part" && r.partId) || r.kind === "custom",
                            ).length
                          }{" "}
                          phụ tùng
                        </span>
                      </div>
                      {(() => {
                        const issuesWithService = editIssues.filter((issue) =>
                          editRows.some(
                            (r) => r.kind === "service" && r.issueId === issue.issueId,
                          ),
                        );
                        if (issuesWithService.length === 0) {
                          return (
                            <div className="bg-white rounded-2xl border border-slate-200/70 p-6 text-center text-sm text-slate-400">
                              Chưa có hạng mục nào được áp dịch vụ — chọn dịch vụ ở trên trước.
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-3">
                            {issuesWithService.map((issue) => {
                              const issueServices = editRows.filter(
                                (r) => r.kind === "service" && r.issueId === issue.issueId,
                              );
                              const issueParts = editRows.filter(
                                (r) => r.kind !== "service" && r.issueId === issue.issueId,
                              );
                              return (
                                <div
                                  key={issue.issueId}
                                  className="rounded-2xl border border-slate-200/70 bg-white p-4"
                                >
                                  <p className="text-xs font-semibold text-slate-800">
                                    {issue.componentName}
                                  </p>
                                  {issue.description && (
                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                      {issue.description}
                                    </p>
                                  )}

                                  <div className="mt-3">
                                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                      Dịch vụ cần dùng
                                    </span>
                                    <div className="space-y-1.5">
                                      {issueServices.map((row) => (
                                        <div
                                          key={row.uid}
                                          className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2"
                                        >
                                          <Wrench size={12} className="shrink-0 text-slate-400" />
                                          <span className="flex-1 min-w-[120px] text-xs font-semibold text-slate-800 truncate">
                                            {row.serviceName}
                                          </span>
                                          <PriceInput
                                            placeholder="Nhập giá"
                                            formatWhileTyping
                                            value={row.repairPrice}
                                            onCommit={(v) => updateEditFee(row.uid, v)}
                                            readOnly={row.hasDbPrice}
                                            title={row.hasDbPrice ? "Giá đã có sẵn trong hệ thống, không thể sửa" : undefined}
                                            className={`w-28 border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-right transition-colors focus:outline-none ${row.hasDbPrice
                                              ? "border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                                              : "border-slate-200 bg-white text-slate-800 focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E]"
                                              }`}
                                          />
                                          <button
                                            onClick={() => removeEditRow(row.uid)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                            title="Xóa dịch vụ"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="mt-4 pt-4 border-t border-slate-100">
                                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                      Phụ tùng cần dùng
                                    </span>
                                    <div className="space-y-2">
                                      {issueParts.map((row) => {
                                        const unitPrice = getEditUnitPrice(row);
                                        const isEmptyItem = row.kind === "part" && !row.partId;
                                        return (
                                          <div key={row.uid} className="flex items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                              {row.kind !== "custom" ? (
                                                <SearchableSelect
                                                  value={row.partId}
                                                  placeholder="-- Chọn phụ tùng tiếp theo --"
                                                  emptyText="Không tìm thấy phụ tùng phù hợp."
                                                  invalid={!row.partId}
                                                  onChange={(v) => updateEditPart(row.uid, v)}
                                                  options={spareParts.map((part) => {
                                                    const usedElsewhere = editRows
                                                      .filter(
                                                        (r) =>
                                                          r.uid !== row.uid &&
                                                          r.kind === "part" &&
                                                          r.partId === part.id,
                                                      )
                                                      .reduce((sum, r) => sum + r.quantity, 0);
                                                    const available =
                                                      Number(part.available_quantity) - usedElsewhere;
                                                    const outOfStock = available <= 0;
                                                    return {
                                                      value: part.id,
                                                      label: `${part.name}${part.brand ? ` - ${part.brand}` : ""}`,
                                                      sublabel: outOfStock ? "Hết hàng" : `Còn: ${available}`,
                                                      outOfStock,
                                                    };
                                                  })}
                                                />
                                              ) : (
                                                <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-2">
                                                  <input
                                                    type="text"
                                                    value={row.customItemName}
                                                    onChange={(e) =>
                                                      updateEditCustomItem(row.uid, {
                                                        customItemName: e.target.value,
                                                      })
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
                                                      updateEditCustomItem(row.uid, {
                                                        customUnitPrice: value,
                                                      })
                                                    }
                                                    className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right text-xs font-semibold text-slate-800 outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E]"
                                                  />
                                                </div>
                                              )}
                                              {row.kind === "custom" && (
                                                <p className="mt-1 text-[10px] font-semibold text-amber-600">
                                                  Phụ tùng đặt riêng · Cọc 30%:{" "}
                                                  {formatVND(
                                                    Math.round(row.quantity * row.customUnitPrice * 0.3),
                                                  )}
                                                </p>
                                              )}
                                              {row.kind === "part" && row.partId && (() => {
                                                const selectedPart = spareParts.find(
                                                  (p) => p.id === row.partId,
                                                );
                                                if (!selectedPart) return null;
                                                const usedElsewhere = editRows
                                                  .filter(
                                                    (r) =>
                                                      r.uid !== row.uid &&
                                                      r.kind === "part" &&
                                                      r.partId === row.partId,
                                                  )
                                                  .reduce((sum, r) => sum + r.quantity, 0);
                                                const available =
                                                  Number(selectedPart.available_quantity) - usedElsewhere;
                                                if (available >= row.quantity) return null;
                                                return (
                                                  <p className="mt-1 text-[10px] font-semibold text-amber-600">
                                                    Thiếu tồn kho — sẽ tự động gửi yêu cầu nhập kho khi khách duyệt báo giá.
                                                  </p>
                                                );
                                              })()}
                                            </div>
                                            {!isEmptyItem && (
                                              <input
                                                type="number"
                                                min={0}
                                                value={row.quantity}
                                                onChange={(e) =>
                                                  updateEditQuantity(row.uid, Number(e.target.value))
                                                }
                                                className="w-16 shrink-0 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-800 text-center focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors"
                                              />
                                            )}
                                            {!isEmptyItem && (
                                              <span className="w-24 shrink-0 pt-2 text-right text-xs font-bold text-[#00285E]">
                                                {formatVND(row.quantity * unitPrice)}
                                              </span>
                                            )}
                                            {!isEmptyItem && (
                                              <button
                                                onClick={() => removeEditRow(row.uid)}
                                                className="shrink-0 p-1.5 mt-0.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                                title="Xóa phụ tùng"
                                              >
                                                <Trash2 size={14} />
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditCustomIssueId(issue.issueId);
                                        setShowEditCustomPartForm((v) =>
                                          editCustomIssueId === issue.issueId ? !v : true,
                                        );
                                      }}
                                      className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-[#00285E]/25 bg-white px-3 text-xs font-semibold text-[#00285E] hover:bg-slate-50"
                                    >
                                      <Plus size={14} />
                                      Đặt phụ tùng riêng
                                    </button>
                                    {showEditCustomPartForm && editCustomIssueId === issue.issueId && (
                                      <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4">
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                          <div>
                                            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                              Tên phụ tùng
                                            </label>
                                            <input
                                              type="text"
                                              value={editCustomName}
                                              onChange={(e) => setEditCustomName(e.target.value)}
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
                                              onChange={(e) =>
                                                setEditCustomQuantity(Math.max(1, Number(e.target.value)))
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
                                                ({formatVND(Math.round(editCustomQuantity * editCustomPrice * 0.3))})
                                              </span>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={addEditCustomItem}
                                            disabled={
                                              (editCustomIssueId as number | "") === "" ||
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

                                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                      Thành tiền hạng mục
                                    </span>
                                    <span className="text-sm font-bold text-[#00285E]">
                                      {formatVND(
                                        issueServices.reduce((sum, r) => sum + r.repairPrice, 0) +
                                        issueParts.reduce(
                                          (sum, r) => sum + r.quantity * getEditUnitPrice(r),
                                          0,
                                        ),
                                      )}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Dịch vụ không thuộc hạng mục lỗi nào — khách yêu cầu thêm ngoài các lỗi đã báo */}
                    {editRows.some((r) => r.kind === "service" && r.issueId === null) && (
                      <div>
                        <div className="flex items-center justify-between mb-3 px-1">
                          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Wrench size={14} className="text-slate-500" />
                            Dịch vụ khác (không thuộc hạng mục lỗi)
                          </label>
                        </div>
                        <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                          <div className="space-y-1.5">
                            {editRows
                              .filter((r) => r.kind === "service" && r.issueId === null)
                              .map((row) => (
                                <div
                                  key={row.uid}
                                  className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2"
                                >
                                  <Wrench size={12} className="shrink-0 text-slate-400" />
                                  <span className="flex-1 min-w-[120px] text-xs font-semibold text-slate-800 truncate">
                                    {row.serviceName}
                                  </span>
                                  <PriceInput
                                    placeholder="Nhập giá"
                                    formatWhileTyping
                                    value={row.repairPrice}
                                    onCommit={(v) => updateEditFee(row.uid, v)}
                                    readOnly={row.hasDbPrice}
                                    title={row.hasDbPrice ? "Giá đã có sẵn trong hệ thống, không thể sửa" : undefined}
                                    className={`w-28 border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-right transition-colors focus:outline-none ${row.hasDbPrice
                                      ? "border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                                      : "border-slate-200 bg-white text-slate-800 focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E]"
                                      }`}
                                  />
                                  <button
                                    onClick={() => removeEditRow(row.uid)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                    title="Xóa dịch vụ"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Phụ tùng không gắn hạng mục lỗi nào (dữ liệu cũ) — vẫn cho sửa để không mất dòng */}
                    {editRows.some(
                      (r) =>
                        r.kind !== "service" &&
                        (r.issueId == null ||
                          !editIssues.some((i) => i.issueId === r.issueId)),
                    ) && (
                        <div>
                          <div className="flex items-center justify-between mb-3 px-1">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                              <Package size={14} className="text-slate-500" />
                              Phụ tùng khác (không thuộc hạng mục lỗi)
                            </label>
                          </div>
                          <div className="rounded-2xl border border-slate-200/70 bg-white p-4 space-y-2">
                            {editRows
                              .filter(
                                (r) =>
                                  r.kind !== "service" &&
                                  (r.issueId == null ||
                                    !editIssues.some((i) => i.issueId === r.issueId)),
                              )
                              .map((row) => {
                                const unitPrice = getEditUnitPrice(row);
                                return (
                                  <div key={row.uid} className="flex items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                      {row.kind !== "custom" ? (
                                        <SearchableSelect
                                          value={row.partId}
                                          placeholder="-- Chọn phụ tùng --"
                                          emptyText="Không tìm thấy phụ tùng phù hợp."
                                          invalid={!row.partId}
                                          onChange={(v) => updateEditPart(row.uid, v)}
                                          options={spareParts.map((part) => {
                                            const available = Number(part.available_quantity);
                                            return {
                                              value: part.id,
                                              label: `${part.name}${part.brand ? ` - ${part.brand}` : ""}`,
                                              sublabel: available <= 0 ? "Hết hàng" : `Còn: ${available}`,
                                              outOfStock: available <= 0,
                                            };
                                          })}
                                        />
                                      ) : (
                                        <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-2">
                                          <input
                                            type="text"
                                            value={row.customItemName}
                                            onChange={(e) =>
                                              updateEditCustomItem(row.uid, {
                                                customItemName: e.target.value,
                                              })
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
                                              updateEditCustomItem(row.uid, {
                                                customUnitPrice: value,
                                              })
                                            }
                                            className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right text-xs font-semibold text-slate-800 outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E]"
                                          />
                                        </div>
                                      )}
                                    </div>
                                    <input
                                      type="number"
                                      min={0}
                                      value={row.quantity}
                                      onChange={(e) => updateEditQuantity(row.uid, Number(e.target.value))}
                                      className="w-16 shrink-0 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-800 text-center focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors"
                                    />
                                    <span className="w-24 shrink-0 pt-2 text-right text-xs font-bold text-[#00285E]">
                                      {formatVND(row.quantity * unitPrice)}
                                    </span>
                                    <button
                                      onClick={() => removeEditRow(row.uid)}
                                      className="shrink-0 p-1.5 mt-0.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                      title="Xóa phụ tùng"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Lý do khách từ chối */}
              {selectedQuotation.status === "REJECTED" &&
                selectedQuotation.rejection_reason && (
                  <div className="bg-rose-50 rounded-2xl border border-rose-200 p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <ClipboardList size={13} className="text-rose-500" />
                      <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">
                        Lý do khách từ chối
                      </span>
                    </div>
                    <p className="text-sm text-rose-700 leading-relaxed whitespace-pre-line">
                      {selectedQuotation.rejection_reason}
                    </p>
                  </div>
                )}

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
                    {/* Đã xác nhận trực tiếp với khách tại chỗ -> duyệt để chuyển kho xuất hàng */}
                    {selectedQuotation.status === "PENDING" && (
                      <button
                        onClick={() => void handleApproveQuotation()}
                        disabled={isApproving}
                        className="h-11 flex items-center gap-2 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isApproving ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={16} />
                        )}
                        Duyệt tại chỗ (khách đã xác nhận)
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
