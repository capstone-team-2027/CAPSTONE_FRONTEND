import { useState, useMemo, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import type {
  GetQuotationResponse,
  GetAllSparePartsResponse,
  GetServicesResponse,
} from "../../../model/dto/quoteManagement.dto";
import {
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
  Trash2,
} from "lucide-react";
import { useFetchClient } from "../../../hook/useFetchClient";
import { QUOTE_MANAGEMENT_ENDPOINTS } from "../../../constants/reception/quoteManagementEndpoints";

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
  kind: "part" | "service";
  partId: number | null;
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

const formatVND = (value: number | string) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value) || 0)} VND`;

// Ô nhập giá: giữ chuỗi đang gõ ở local state cho mượt (không reformat từng phím,
// caret không nhảy), chỉ đẩy số ra ngoài + format lại khi rời ô.
function PriceInput({
  value,
  readOnly,
  title,
  className,
  placeholder,
  onCommit,
}: {
  value: number;
  readOnly?: boolean;
  title?: string;
  className?: string;
  placeholder?: string;
  onCommit: (value: number) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");

  const display = focused
    ? draft
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
      onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
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
  // TODO: tự viết hàm fetch API rồi setQuotations(data) + setIsLoading
  const [quotations, setQuotations] = useState<GetQuotationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedQuotation, setSelectedQuotation] =
    useState<QuotationRow | null>(null);
  const { fetchPrivate } = useFetchClient();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();
  const [spareParts, setSpareParts] = useState<GetAllSparePartsResponse[]>([]);
  const [services, setServices] = useState<GetServicesResponse[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editRows, setEditRows] = useState<EditRow[]>([]);
  const [editNote, setEditNote] = useState("");
  // Khu thêm dịch vụ: chọn 1 dịch vụ + tích các lỗi rồi mới bấm "Thêm"
  const [servicePicker, setServicePicker] = useState<number | "">("");
  const [pickedIssueIds, setPickedIssueIds] = useState<number[]>([]);
  const editUidRef = useRef(0);
  // Hộp xác nhận trước khi duyệt báo giá
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    handleGetQuotationHistory();
  },[]);

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
  };

  // Bật chế độ sửa: đổ items hiện tại vào form chỉnh sửa
  const startEdit = () => {
    if (!selectedQuotation) return;
    setEditRows(
      selectedQuotation.items.map((item) => {
        editUidRef.current += 1;
        const isPart = !!item.sparePart;
        const svc = item.service_catalog;
        return {
          uid: editUidRef.current,
          detailId: item.id,
          issueId: item.issue?.id ?? null,
          kind: isPart ? "part" : "service",
          partId: item.sparePart?.id ?? null,
          quantity: item.quantity,
          serviceId: svc?.id ?? null,
          serviceName: svc?.service_name ?? "Dịch vụ sửa chữa",
          hasDbPrice: Number(svc?.labor_price) > 0,
          repairPrice: Number(item.repair_price) || 0,
        };
      }),
    );
    setEditNote(selectedQuotation.note ?? "");
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
    setEditRows((prev) =>
      prev.map((row) => (row.uid === uid ? { ...row, partId } : row)),
    );

  const updateEditQuantity = (uid: number, quantity: number) =>
    setEditRows((prev) =>
      prev.map((row) => {
        if (row.uid !== uid) return row;
        const stock =
          spareParts.find((p) => p.id === row.partId)?.stock_quantity ??
          Infinity;
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
      row.kind === "part"
        ? sum + row.quantity * getEditUnitPrice(row)
        : sum + row.repairPrice,
    0,
  );

  const handleUpdateQuotation = async () => {
    if (!selectedQuotation) return;
    const payload = {
      items: editRows.map((row) =>
        row.kind === "part"
          ? {
              issue_id: row.issueId ?? undefined,
              spare_part_id: row.partId ?? undefined,
              quantity: row.quantity,
            }
          : {
              issue_id: row.issueId ?? undefined,
              service_id: row.serviceId ?? undefined,
              quantity: 1,
              repair_price: row.repairPrice,
            },
      ),
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

  // Lễ tân gọi điện xác nhận với khách xong -> duyệt báo giá (PENDING -> APPROVED)
  const handleApproveQuotation = async () => {
    if (!selectedQuotation) return;
    setIsApproving(true);
    try {
      await fetchPrivate(
        QUOTE_MANAGEMENT_ENDPOINTS.APPROVE_QUOTE(selectedQuotation.id),
        "PATCH",
      );
      showToast("Đã duyệt báo giá!", "success");
      setConfirmApprove(false);
      closeQuotationDetail();
      handleGetQuotationHistory();
    } catch (error: any) {
      console.error(error);
      showToast(
        error?.message || "Đã xảy ra lỗi khi duyệt báo giá.",
        "warning",
      );
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2 flex items-center gap-2">
          <History className="text-[#F9A11B]" size={28} />
          Lịch sử báo giá
        </h1>
        <p className="text-slate-500 text-sm">
          Xem lại các báo giá đã tạo và trạng thái duyệt của khách hàng.
        </p>
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
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      page === currentPage
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
              <button
                onClick={closeQuotationDetail}
                className="relative p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
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
                      (i) => i.sparePart,
                    );
                    const serviceItems = selectedQuotation.items.filter(
                      (i) => !i.sparePart,
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
                                              {item.sparePart?.name}
                                            </span>
                                          </div>
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
                          ({editRows.filter((r) => r.kind === "part").length})
                        </span>
                      </div>
                      {editRows.some((r) => r.kind === "part") ? (
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
                                  .filter((row) => row.kind === "part")
                                  .map((row) => {
                                    const detail = selectedQuotation.items.find(
                                      (i) => i.id === row.detailId,
                                    );
                                    const unitPrice = getEditUnitPrice(row);
                                    return (
                                      <tr
                                        key={row.uid}
                                        className="border-b border-slate-100 last:border-0 align-top"
                                      >
                                        <td className="py-3.5 px-4">
                                          <p
                                            className="text-xs font-semibold text-slate-800 max-w-[140px] truncate"
                                            title={
                                              detail?.issue?.component?.name ?? ""
                                            }
                                          >
                                            {detail?.issue?.component?.name ??
                                              "Không gắn lỗi"}
                                          </p>
                                          {detail?.issue?.error_description && (
                                            <p
                                              className="text-[11px] text-slate-400 max-w-[140px] truncate mt-0.5"
                                              title={
                                                detail.issue.error_description
                                              }
                                            >
                                              {detail.issue.error_description}
                                            </p>
                                          )}
                                        </td>
                                        <td className="py-3.5 px-4">
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
                                            className={`w-full min-w-[180px] bg-slate-50 border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors ${
                                              row.partId
                                                ? "border-slate-200 text-slate-800"
                                                : "border-amber-300 text-slate-400"
                                            }`}
                                          >
                                            <option value="">
                                              -- Chọn sản phẩm --
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
                                            {spareParts.map((part) => (
                                              <option
                                                key={part.id}
                                                value={part.id}
                                              >
                                                {part.name}
                                                {part.brand
                                                  ? ` - ${part.brand}`
                                                  : ""}
                                                {` (tồn: ${part.stock_quantity})`}
                                              </option>
                                            ))}
                                          </select>
                                          {row.partId != null && (
                                            <p className="text-[11px] text-slate-400 mt-1">
                                              Đơn giá:{" "}
                                              <span className="font-semibold text-slate-600">
                                                {formatVND(unitPrice)}
                                              </span>
                                            </p>
                                          )}
                                        </td>
                                        <td className="py-3.5 px-3">
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
                                        </td>
                                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                          <span className="text-xs font-bold text-[#00285E]">
                                            {formatVND(row.quantity * unitPrice)}
                                          </span>
                                        </td>
                                        <td className="py-3.5 px-2 text-center">
                                          <button
                                            onClick={() => removeEditRow(row.uid)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                            title="Xóa phụ tùng"
                                          >
                                            <Trash2 size={14} />
                                          </button>
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
                      {editRows.some(
                        (row) => row.kind === "part" && !row.partId,
                      ) && (
                        <p className="flex items-center gap-1.5 text-xs text-amber-600 mt-2 px-1">
                          <AlertCircle size={13} className="shrink-0" />
                          Chọn sản phẩm trong kho cho tất cả hạng mục để lưu báo
                          giá.
                        </p>
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
                                        className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                                          checked
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
                                  className={`w-40 bg-white border rounded-lg px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors ${
                                    row.issueId
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
                                  readOnly={row.hasDbPrice}
                                  title={
                                    row.hasDbPrice
                                      ? "Giá lấy từ hệ thống, không chỉnh được"
                                      : undefined
                                  }
                                  value={row.repairPrice}
                                  onCommit={(v) => updateEditFee(row.uid, v)}
                                  className={`w-32 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-right transition-colors focus:outline-none ${
                                    row.hasDbPrice
                                      ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                                      : "bg-white text-slate-800 focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E]"
                                  }`}
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
                            (!r.partId || r.quantity <= 0)) ||
                          (r.kind === "service" && !r.serviceId),
                      )}
                      className="h-11 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-[#003C7D] to-[#00285E] shadow-lg shadow-[#00285E]/25 hover:shadow-[#00285E]/40 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100"
                    >
                      Lưu thay đổi
                    </button>
                  </>
                ) : (
                  <>
                    {selectedQuotation.status === "PENDING" && (
                      <button
                        onClick={startEdit}
                        className="h-11 flex items-center gap-2 px-5 rounded-xl text-sm font-semibold text-white bg-[#00285E] shadow-lg shadow-[#00285E]/25 hover:shadow-[#00285E]/40 hover:brightness-110 active:scale-[0.98] transition-all"
                      >
                        <Pencil size={14} />
                        Sửa báo giá
                      </button>
                    )}
                    {/* Gọi điện xác nhận với khách xong -> duyệt để chuyển kho xuất hàng */}
                    {selectedQuotation.status === "PENDING" && (
                      <button
                        onClick={() => setConfirmApprove(true)}
                        className="h-11 flex items-center gap-2 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:brightness-105 active:scale-[0.98] transition-all"
                      >
                        <CheckCircle2 size={16} />
                        Duyệt báo giá
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* XÁC NHẬN DUYỆT BÁO GIÁ */}
      {confirmApprove && selectedQuotation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setConfirmApprove(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden ring-1 ring-slate-900/5">
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-50 shrink-0">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Duyệt báo giá {selectedQuotation.code}?
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed mt-1">
                    Xác nhận khách hàng{" "}
                    <span className="font-semibold text-slate-700">
                      {selectedQuotation.customerName}
                    </span>{" "}
                    đã đồng ý báo giá{" "}
                    <span className="font-semibold text-[#00285E]">
                      {formatVND(selectedQuotation.total_amount)}
                    </span>
                    . Sau khi duyệt, kho sẽ tiến hành xuất phụ tùng và báo giá
                    không sửa được nữa.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setConfirmApprove(false)}
                disabled={isApproving}
                className="h-11 px-5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all disabled:opacity-40"
              >
                Hủy
              </button>
              <button
                onClick={handleApproveQuotation}
                disabled={isApproving}
                className="h-11 flex items-center gap-2 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {isApproving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Đang duyệt...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    Xác nhận duyệt
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
