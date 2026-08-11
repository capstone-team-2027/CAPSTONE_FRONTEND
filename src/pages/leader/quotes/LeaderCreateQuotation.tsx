import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useOutletContext, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  ClipboardList,
  AlertCircle,
  Loader2,
  Car,
  Users,
  Plus,
  Trash2,
  Package,
  Wrench,
  CheckCircle2,
  ChevronRight,
  FileWarning,
  Search,
  ChevronDown,
  Check,
} from "lucide-react";
import { useFetchClient } from "../../../hook/useFetchClient";
import { LEADER_QUOTE_MANAGEMENT_ENDPOINTS } from "../../../constants/technicianLeader/quoteManagementEndpoints";
import type {
  ActiveServiceOrderForIssueReport,
  VehicleComponent,
  UnquotedIssueReport,
} from "../../../model/dto/leaderIssueReport.dto";
import type {
  CreateQuotationRequest,
  GetAllSparePartsResponse,
  GetServicesResponse,
} from "../../../model/dto/quoteManagement.dto";

const formatVND = (value: number) =>
  `${new Intl.NumberFormat("vi-VN").format(value)} VND`;

// Ô nhập giá: giữ chuỗi đang gõ ở local state cho mượt (không reformat từng phím,
// caret không nhảy), chỉ đẩy số ra ngoài + format lại khi rời ô.
function PriceInput({
  value,
  className,
  placeholder,
  onCommit,
  readOnly,
  title,
}: {
  value: number;
  className?: string;
  placeholder?: string;
  onCommit: (value: number) => void;
  readOnly?: boolean;
  title?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");
  const display = focused
    ? draft
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
      value={display}
      readOnly={readOnly}
      title={title}
      onFocus={() => {
        if (readOnly) return;
        setDraft(value ? String(value) : "");
        setFocused(true);
      }}
      onChange={(e) => {
        if (readOnly) return;
        const nextDraft = e.target.value.replace(/\D/g, "");
        setDraft(nextDraft);
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
  // Thiếu tồn khả dụng — vẫn chọn được bình thường, chỉ hiện badge cảnh báo. Yêu cầu nhập kho
  // thực sự được hệ thống tự tạo khi khách hàng duyệt báo giá, không cần Leader tự bấm ở đây.
  outOfStock?: boolean;
}

// Dropdown tự vẽ thay cho <select> native — <select> có option quá dài thì trình duyệt tự
// phóng danh sách tràn gần hết màn hình, không style hay giới hạn chiều cao được. Component
// này có ô tìm kiếm, danh sách cuộn giới hạn chiều cao cố định, tự đóng khi click ra ngoài.
// Dùng position: fixed (tính toạ độ bằng JS) thay vì absolute — vì nút này luôn nằm trong
// bảng có overflow-x-auto để cuộn ngang trên màn nhỏ, mà theo spec CSS hễ 1 trục overflow là
// auto/hidden thì trục kia dù đặt "visible" vẫn bị trình duyệt quy về "auto" và clip theo
// chiều dọc — absolute/relative thông thường không thể thoát ra được, chỉ fixed mới thoát.
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
          className="z-50 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden"
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

// 1 hạng mục lỗi đã lưu (từ createIssueReports trả về) dùng để gắn phụ tùng/dịch vụ
interface QuotationItemForm {
  uid: number;
  issueId: number;
  componentName: string;
  description: string;
  partId: number | null;
  isCustom: boolean;
  customItemName: string;
  quantity: number;
  unitPrice: number;
}

interface QuotationServiceForm {
  uid: number;
  serviceId: number;
  serviceName: string;
  fee: number;
  hasDbPrice: boolean;
  issueId: number | null;
}

type Step = "select-report" | "build-quotation";

// 1 nhóm báo cáo lỗi = các issue cùng chung 1 task (Leader tick nhiều linh kiện lỗi cùng lúc
// khi bấm "Tạo báo cáo lỗi" ở trang Theo dõi công việc), chưa có báo giá nào gắn vào.
interface IssueReportGroup {
  taskId: number;
  vehicle: ActiveServiceOrderForIssueReport["vehicle"];
  issues: UnquotedIssueReport[];
  latestCreatedAt: string;
}

export default function LeaderCreateQuotation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchPrivate } = useFetchClient();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();

  // Đến từ trang Theo dõi công việc: task INSPECTION đã được complete + lỗi đã ghi sẵn
  // (createIssueReports gọi từ đó rồi) — bỏ qua bước chọn báo cáo, vào thẳng lập báo giá.
  const navState = location.state as
    | { fromTaskTracking?: boolean; taskId?: number; order?: ActiveServiceOrderForIssueReport; savedIssues?: any[] }
    | undefined;

  const [step, setStep] = useState<Step>(navState?.fromTaskTracking ? "build-quotation" : "select-report");
  const [unquotedIssues, setUnquotedIssues] = useState<UnquotedIssueReport[]>([]);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [components, setComponents] = useState<VehicleComponent[]>([]);
  const [selectedOrder, setSelectedOrder] =
    useState<ActiveServiceOrderForIssueReport | null>(null);

  // Bước dựng báo giá (sau khi chọn 1 báo cáo lỗi)
  const [quotationItems, setQuotationItems] = useState<QuotationItemForm[]>([]);
  const [quotationServices, setQuotationServices] = useState<QuotationServiceForm[]>([]);
  const [quotationNote, setQuotationNote] = useState("");
  const [spareParts, setSpareParts] = useState<GetAllSparePartsResponse[]>([]);
  const [services, setServices] = useState<GetServicesResponse[]>([]);
  const [showCustomPartForm, setShowCustomPartForm] = useState(false);
  const [customPartIssueId, setCustomPartIssueId] = useState<number | "">("");
  const [customPartName, setCustomPartName] = useState("");
  const [customPartQuantity, setCustomPartQuantity] = useState(1);
  const [customPartPrice, setCustomPartPrice] = useState(0);
  // Bước 1 (đặt trước): chọn 1 dịch vụ rồi tick nhiều hạng mục lỗi cùng lúc để áp dịch vụ đó.
  const [servicePicker, setServicePicker] = useState<number | "">("");
  const [pickedIssueIds, setPickedIssueIds] = useState<number[]>([]);
  const [isSubmittingQuotation, setIsSubmittingQuotation] = useState(false);
  const [approveNow, setApproveNow] = useState(false);
  const issueDraftUidRef = useRef(0);
  const savedTaskIdRef = useRef<number | null>(null);

  useEffect(() => {
    handleGetComponents();
    handleGetSpareParts();
    handleGetServices();
    if (navState?.fromTaskTracking) {
      savedTaskIdRef.current = navState.taskId ?? null;
      setSelectedOrder(navState.order ?? null);
      const items: QuotationItemForm[] = (navState.savedIssues ?? []).map((issue: any) => {
        issueDraftUidRef.current += 1;
        return {
          uid: issueDraftUidRef.current,
          issueId: issue.id,
          componentName: `Linh kiện #${issue.component_id}`,
          description: issue.error_description ?? "",
          partId: null,
          isCustom: false,
          customItemName: "",
          quantity: 1,
          unitPrice: 0,
        };
      });
      setQuotationItems(items);
    } else {
      handleGetUnquotedIssues();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGetUnquotedIssues = async () => {
    setIsLoadingIssues(true);
    try {
      const result = await fetchPrivate(LEADER_QUOTE_MANAGEMENT_ENDPOINTS.ISSUES_REPORT, "GET");
      setUnquotedIssues(result.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingIssues(false);
    }
  };

  const handleGetComponents = async () => {
    try {
      const result = await fetchPrivate(LEADER_QUOTE_MANAGEMENT_ENDPOINTS.GET_COMPONENTS, "GET");
      setComponents(result.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleGetSpareParts = async () => {
    try {
      const result = await fetchPrivate(LEADER_QUOTE_MANAGEMENT_ENDPOINTS.GET_SPARE_PARTS, "GET");
      setSpareParts(result.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleGetServices = async () => {
    try {
      const result = await fetchPrivate(LEADER_QUOTE_MANAGEMENT_ENDPOINTS.GET_SERVICES, "GET");
      setServices(result.data);
    } catch (error) {
      console.error(error);
    }
  };

  const componentLabel = (id: number | "") => {
    const c = components.find((item) => item.id === id);
    if (!c) return "";
    const parent = c.parent_id ? components.find((p) => p.id === c.parent_id) : null;
    return parent ? `${parent.name} · ${c.name}` : c.name;
  };

  // Đến từ Task Tracking: lúc build quotationItems ban đầu chưa có components nên tên linh
  // kiện tạm hiện "Linh kiện #id" — cập nhật lại tên thật ngay khi components tải xong.
  useEffect(() => {
    if (!navState?.fromTaskTracking || components.length === 0) return;
    setQuotationItems((prev) =>
      prev.map((item) => {
        const issue = (navState.savedIssues ?? []).find((i: any) => i.id === item.issueId);
        if (!issue) return item;
        return { ...item, componentName: componentLabel(issue.component_id) || item.componentName };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [components]);

  // Gom các issue chưa có báo giá theo cùng 1 task -> mỗi nhóm là 1 báo cáo lỗi hiển thị 1 card
  const issueReportGroups = useMemo<IssueReportGroup[]>(() => {
    const groups = new Map<number, IssueReportGroup>();
    unquotedIssues.forEach((issue) => {
      const taskId = issue.task?.id;
      if (!taskId) return;
      const existing = groups.get(taskId);
      if (existing) {
        existing.issues.push(issue);
        if (issue.createdAt > existing.latestCreatedAt) existing.latestCreatedAt = issue.createdAt;
      } else {
        groups.set(taskId, {
          taskId,
          vehicle: issue.task?.serviceOrder?.vehicle ?? null,
          issues: [issue],
          latestCreatedAt: issue.createdAt,
        });
      }
    });
    return [...groups.values()].sort((a, b) => (a.latestCreatedAt < b.latestCreatedAt ? 1 : -1));
  }, [unquotedIssues]);

  const selectIssueReport = (group: IssueReportGroup) => {
    savedTaskIdRef.current = group.taskId;
    setSelectedOrder({
      id: group.taskId,
      status: "",
      vehicle: group.vehicle,
      tasks: [],
    });
    const items: QuotationItemForm[] = group.issues.map((issue) => {
      issueDraftUidRef.current += 1;
      const componentName = issue.component
        ? issue.component.parent
          ? `${issue.component.parent.name} · ${issue.component.name}`
          : issue.component.name
        : `Linh kiện lỗi #${issue.id}`;
      return {
        uid: issueDraftUidRef.current,
        issueId: issue.id,
        componentName,
        description: issue.error_description,
        partId: null,
        isCustom: false,
        customItemName: "",
        quantity: 1,
        unitPrice: 0,
      };
    });
    setQuotationItems(items);
    setQuotationServices([]);
    setQuotationNote("");
    setStep("build-quotation");
  };

  const selectQuotationPart = (uid: number, partId: number | null) => {
    const part = spareParts.find((p) => p.id === partId);
    const currentItem = quotationItems.find((item) => item.uid === uid);
    if (part) {
      const isDuplicatedInIssue = quotationItems.some(
        (item) =>
          item.uid !== uid && item.issueId === currentItem?.issueId && item.partId === partId,
      );
      if (isDuplicatedInIssue) {
        showToast(`"${part.name}" đã được chọn cho hạng mục lỗi này.`, "warning");
        return;
      }
    }
    setQuotationItems((prev) => {
      const updatedItems = prev.map((item) => {
        if (item.uid !== uid) return item;
        return {
          ...item,
          partId,
          isCustom: false,
          customItemName: "",
          unitPrice: Number(part?.retail_price ?? 0) || 0,
          quantity: Math.max(1, item.quantity),
        };
      });
      if (!partId || !currentItem) return updatedItems;
      const hasEmptyRow = updatedItems.some(
        (item) => item.issueId === currentItem.issueId && !item.partId && !item.isCustom,
      );
      if (hasEmptyRow) return updatedItems;
      issueDraftUidRef.current += 1;
      const emptyItem: QuotationItemForm = {
        ...currentItem,
        uid: issueDraftUidRef.current,
        partId: null,
        isCustom: false,
        customItemName: "",
        quantity: 1,
        unitPrice: 0,
      };
      const lastIssueIndex = updatedItems.reduce(
        (lastIndex, item, index) => (item.issueId === currentItem.issueId ? index : lastIndex),
        -1,
      );
      return [
        ...updatedItems.slice(0, lastIssueIndex + 1),
        emptyItem,
        ...updatedItems.slice(lastIssueIndex + 1),
      ];
    });
  };

  const addCustomQuotationItem = (
    issueId: number,
    customItemName: string,
    quantity: number,
    unitPrice: number,
  ) => {
    const issueItem = quotationItems.find((item) => item.issueId === issueId);
    if (!issueItem) return;
    issueDraftUidRef.current += 1;
    const customItem: QuotationItemForm = {
      ...issueItem,
      uid: issueDraftUidRef.current,
      partId: null,
      isCustom: true,
      customItemName,
      quantity,
      unitPrice,
    };
    setQuotationItems((prev) => {
      const lastIssueIndex = prev.reduce(
        (lastIndex, item, index) => (item.issueId === issueId ? index : lastIndex),
        -1,
      );
      return [...prev.slice(0, lastIssueIndex), customItem, ...prev.slice(lastIssueIndex)];
    });
  };

  const submitCustomQuotationItem = () => {
    if (
      customPartIssueId === "" ||
      !customPartName.trim() ||
      customPartQuantity <= 0 ||
      customPartPrice <= 0
    ) {
      return;
    }
    addCustomQuotationItem(customPartIssueId, customPartName.trim(), customPartQuantity, customPartPrice);
    setShowCustomPartForm(false);
    setCustomPartIssueId("");
    setCustomPartName("");
    setCustomPartQuantity(1);
    setCustomPartPrice(0);
  };

  const updateCustomQuotationItem = (
    uid: number,
    updates: Partial<Pick<QuotationItemForm, "customItemName" | "unitPrice">>,
  ) => {
    setQuotationItems((prev) => prev.map((item) => (item.uid === uid ? { ...item, ...updates } : item)));
  };

  const updateQuotationQuantity = (uid: number, quantity: number) => {
    setQuotationItems((prev) =>
      prev.map((it) => {
        if (it.uid !== uid) return it;
        return { ...it, quantity: Math.max(0, quantity) };
      }),
    );
  };

  const removeQuotationItem = (uid: number) =>
    setQuotationItems((prev) => {
      const target = prev.find((item) => item.uid === uid);
      if (!target) return prev;
      const issueRows = prev.filter((item) => item.issueId === target.issueId);
      if (issueRows.length === 1) {
        return prev.map((item) =>
          item.uid === uid
            ? { ...item, partId: null, isCustom: false, customItemName: "", quantity: 1, unitPrice: 0 }
            : item,
        );
      }
      return prev.filter((item) => item.uid !== uid);
    });

  // Thêm dịch vụ: chọn 1 dịch vụ rồi tick nhiều lỗi -> sinh mỗi lỗi 1 dòng.
  const addQuotationServiceForIssues = (id: number, issueIds: number[]) => {
    const service = services.find((s) => s.id === id);
    if (!service || issueIds.length === 0) return;
    const dbPrice = Number(service.labor_price) || 0;
    setQuotationServices((prev) => {
      const newRows = issueIds
        .filter((issueId) => !prev.some((s) => s.serviceId === id && s.issueId === issueId))
        .map<QuotationServiceForm>((issueId) => {
          issueDraftUidRef.current += 1;
          return {
            uid: issueDraftUidRef.current,
            serviceId: id,
            serviceName: service.service_name,
            fee: dbPrice,
            hasDbPrice: dbPrice > 0,
            issueId,
          };
        });
      return [...prev, ...newRows];
    });
  };

  // Dịch vụ khách yêu cầu thêm ngoài các hạng mục lỗi đã báo (vd rửa xe, thay dầu định kỳ) —
  // không gắn issueId, không bị validate "phải có phụ tùng đi kèm dịch vụ" ở BE vì đó chỉ áp
  // dụng cho các dòng có issue_id.
  const addStandaloneQuotationService = (id: number) => {
    const service = services.find((s) => s.id === id);
    if (!service) return;
    const dbPrice = Number(service.labor_price) || 0;
    issueDraftUidRef.current += 1;
    setQuotationServices((prev) => [
      ...prev,
      {
        uid: issueDraftUidRef.current,
        serviceId: id,
        serviceName: service.service_name,
        fee: dbPrice,
        hasDbPrice: dbPrice > 0,
        issueId: null,
      },
    ]);
  };

  const updateQuotationServiceFee = (uid: number, fee: number) =>
    setQuotationServices((prev) => prev.map((s) => (s.uid === uid ? { ...s, fee: Math.max(0, fee) } : s)));

  const removeQuotationService = (uid: number) =>
    setQuotationServices((prev) => prev.filter((s) => s.uid !== uid));

  const quotationPartsTotal = quotationItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const quotationServicesTotal = quotationServices.reduce((sum, s) => sum + s.fee, 0);
  const quotationTotal = quotationPartsTotal + quotationServicesTotal;
  const hasCustomQuotationItem = quotationItems.some((item) => item.isCustom);
  const customQuotationItemsTotal = quotationItems.reduce(
    (sum, item) => (item.isCustom ? sum + item.quantity * item.unitPrice : sum),
    0,
  );
  const quotationDeposit = Math.round(customQuotationItemsTotal * 0.3);
  const quotationIssueItems = Array.from(new Map(quotationItems.map((item) => [item.issueId, item])).values());
  const selectedQuotationItemsCount = quotationItems.filter((item) => item.partId || item.isCustom).length;
  // Mỗi hạng mục lỗi bắt buộc phải có ít nhất 1 dịch vụ (đúng luồng "chọn dịch vụ trước") —
  // khớp với validate BE: có phụ tùng thì phải có dịch vụ đi kèm, gara không bán rời phụ tùng.
  const hasIncompleteQuotationIssue = quotationIssueItems.some(
    (issue) => !quotationServices.some((s) => s.issueId === issue.issueId),
  );

  const handleCreateQuotation = async () => {
    if (!savedTaskIdRef.current) return;
    setIsSubmittingQuotation(true);
    try {
      const payload: CreateQuotationRequest = {
        task_id: savedTaskIdRef.current,
        items: [
          ...quotationItems
            .filter((i) => i.partId || i.isCustom)
            .map((i) =>
              i.isCustom
                ? {
                  issue_id: Number(i.issueId),
                  custom_item_name: i.customItemName.trim(),
                  unit_price: Number(i.unitPrice),
                  quantity: Number(i.quantity),
                }
                : {
                  issue_id: Number(i.issueId),
                  spare_part_id: Number(i.partId!),
                  quantity: Number(i.quantity),
                },
            ),
          ...quotationServices.map((s) => ({
            issue_id: s.issueId != null ? Number(s.issueId) : undefined,
            service_id: Number(s.serviceId),
            quantity: 1,
            repair_price: Number(s.fee),
          })),
        ],
        deposit_amount: hasCustomQuotationItem ? quotationDeposit : 0,
        note: quotationNote,
      };
      const result = await fetchPrivate(
        LEADER_QUOTE_MANAGEMENT_ENDPOINTS.QUOTE_MANAGEMENT,
        "POST",
        payload,
      );
      const quotationId = result?.data?.id;
      if (approveNow && quotationId) {
        await fetchPrivate(
          LEADER_QUOTE_MANAGEMENT_ENDPOINTS.APPROVE_QUOTE(quotationId),
          "PATCH",
        );
        showToast("Đã tạo và duyệt báo giá tại chỗ!", "success");
      } else {
        showToast("Tạo báo giá thành công!", "success");
      }
      navigate("/leader/quotes");
    } catch (error: any) {
      console.error(error);
      showToast(error?.message || "Đã xảy ra lỗi khi tạo báo giá.", "warning");
    } finally {
      setIsSubmittingQuotation(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-5xl w-full mx-auto">
      {/* HEADER */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => {
            if (navState?.fromTaskTracking) navigate(-1);
            else if (step === "select-report") navigate(-1);
            else setStep("select-report");
          }}
          title="Quay lại"
          className="mt-0.5 w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#00285E] hover:border-slate-300 active:scale-[0.97] transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2 flex items-center gap-2">
            <FileText className="text-[#F9A11B]" size={28} />
            Tạo báo giá
          </h1>
          <p className="text-slate-500 text-sm">
            {step === "select-report" && "Chọn báo cáo lỗi đã ghi nhận để lập báo giá."}
            {step === "build-quotation" && "Gắn phụ tùng/dịch vụ cho từng hạng mục lỗi rồi lưu báo giá."}
          </p>
        </div>
      </div>

      {/* STEP INDICATOR */}
      <div className="flex items-center gap-2 text-xs font-bold">
        {(["select-report", "build-quotation"] as Step[]).map((s, idx) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center ${step === s ? "bg-[#00285E] text-white" : "bg-slate-100 text-slate-400"
                }`}
            >
              {idx + 1}
            </span>
            <span className={step === s ? "text-[#00285E]" : "text-slate-400"}>
              {s === "select-report" && "Chọn báo cáo lỗi"}
              {s === "build-quotation" && "Lập báo giá"}
            </span>
            {idx < 1 && <span className="w-8 h-px bg-slate-200 mx-1" />}
          </div>
        ))}
      </div>

      {/* BƯỚC 1: CHỌN BÁO CÁO LỖI */}
      {step === "select-report" && (
        <>
          {isLoadingIssues ? (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 size={48} className="mb-4 text-[#00285E] animate-spin" />
              <p className="text-sm font-semibold">Đang tải danh sách báo cáo lỗi...</p>
            </div>
          ) : issueReportGroups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs flex flex-col items-center justify-center py-20 text-slate-400">
              <AlertCircle size={48} className="mb-4 text-slate-300" />
              <p className="text-lg font-semibold mb-1">Chưa có báo cáo lỗi nào chờ lập báo giá</p>
              <p className="text-sm">Vào trang Theo dõi công việc để tạo báo cáo lỗi sau khi kiểm tra xe.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {issueReportGroups.map((group) => {
                const vehicle = group.vehicle;
                const customer = vehicle?.customer;
                return (
                  <div
                    key={group.taskId}
                    className="w-full bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden hover:border-[#00285E]/40 transition-colors"
                  >
                    <div className="flex items-center gap-4 px-5 py-4">
                      <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 text-amber-600">
                        <FileWarning size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-800 truncate">
                            {vehicle?.license_plate || "—"} · {vehicle?.model?.model_name || "—"}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap bg-amber-50 text-amber-700">
                            {group.issues.length} lỗi
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate mt-0.5">
                          <Users size={11} className="shrink-0" />
                          {customer?.name || customer?.user?.fullName || "Khách vãng lai"}
                          {(customer?.phone || customer?.user?.phoneNumber) &&
                            ` · ${customer?.phone || customer?.user?.phoneNumber}`}
                        </p>
                        <p className="text-xs text-slate-400 truncate mt-1">
                          {group.issues
                            .map((i) => i.component?.name || i.error_description)
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                      <button
                        onClick={() => selectIssueReport(group)}
                        className="shrink-0 h-9 flex items-center gap-1.5 px-3.5 rounded-lg text-xs font-bold text-white bg-[#00285E] hover:brightness-125 active:scale-[0.97] transition-all"
                      >
                        Tạo báo giá
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* BƯỚC 2: LẬP BÁO GIÁ */}
      {step === "build-quotation" && selectedOrder && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#EDF3FF] flex items-center justify-center shrink-0">
              <Car size={16} className="text-[#00285E]" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 text-sm truncate">
                {selectedOrder.vehicle?.license_plate} · {selectedOrder.vehicle?.model?.model_name}
              </p>
              <p className="text-xs text-slate-400">
                {selectedOrder.vehicle?.customer?.name || "Khách vãng lai"}
              </p>
            </div>
          </div>

          {/* Danh sách hạng mục lỗi + Chọn dịch vụ cho hạng mục lỗi — chung 1 card, 2 tiêu đề */}
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
                  {quotationIssueItems.length} hạng mục
                </span>
              </div>
              <div className="space-y-1.5">
                {quotationIssueItems.map((issueRow) => {
                  const hasService = quotationServices.some((s) => s.issueId === issueRow.issueId);
                  return (
                    <div
                      key={issueRow.issueId}
                      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${hasService ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-slate-50/60"
                        }`}
                    >
                      {hasService ? (
                        <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                      ) : (
                        <AlertCircle size={14} className="shrink-0 text-amber-500" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 truncate">{issueRow.componentName}</p>
                        {issueRow.description && (
                          <p className="text-[11px] text-slate-400 truncate">{issueRow.description}</p>
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
                {quotationServices.length > 0 && (
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: "#00285E", color: "#fff" }}
                  >
                    {quotationServices.length} dịch vụ
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
                  const availableIssues = quotationIssueItems.filter(
                    (item) =>
                      !quotationServices.some(
                        (r) => r.serviceId === servicePicker && r.issueId === item.issueId,
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
                          {pickedIssueIds.length === availableIssues.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {availableIssues.map((item) => {
                          const checked = pickedIssueIds.includes(item.issueId);
                          return (
                            <label
                              key={item.issueId}
                              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${checked ? "border-[#00285E] bg-white text-slate-800" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
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
                          addQuotationServiceForIssues(servicePicker, pickedIssueIds);
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
                          addStandaloneQuotationService(servicePicker);
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

          {/* Hạng mục báo giá — bước 2: chỉ hiện lỗi đã có dịch vụ, gắn phụ tùng dùng chung cho lỗi đó */}
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
                {quotationIssueItems.length} hạng mục · {selectedQuotationItemsCount} phụ tùng
              </span>
            </div>
            {(() => {
              const issuesWithService = quotationIssueItems.filter((issueRow) =>
                quotationServices.some((s) => s.issueId === issueRow.issueId),
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
                  {issuesWithService.map((issueRow) => {
                    const issueServices = quotationServices.filter((s) => s.issueId === issueRow.issueId);
                    const issueParts = quotationItems.filter((item) => item.issueId === issueRow.issueId);
                    return (
                      <div key={issueRow.issueId} className="rounded-2xl border border-slate-200/70 bg-white p-4">
                        <p className="text-xs font-semibold text-slate-800">{issueRow.componentName}</p>
                        {issueRow.description && (
                          <p className="mt-0.5 text-[11px] text-slate-400">{issueRow.description}</p>
                        )}

                        <div className="mt-3">
                          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Dịch vụ cần dùng
                          </span>
                          <div className="space-y-1.5">
                            {issueServices.map((s) => (
                              <div
                                key={s.uid}
                                className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2"
                              >
                                <Wrench size={12} className="shrink-0 text-slate-400" />
                              <span className="flex-1 min-w-[120px] text-xs font-semibold text-slate-800 truncate">
                                {s.serviceName}
                              </span>
                              <PriceInput
                                placeholder="Nhập giá"
                                value={s.fee}
                                onCommit={(v) => updateQuotationServiceFee(s.uid, v)}
                                readOnly={s.hasDbPrice}
                                title={s.hasDbPrice ? "Giá đã có sẵn trong hệ thống, không thể sửa" : undefined}
                                className={`w-28 border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-right transition-colors focus:outline-none ${s.hasDbPrice
                                    ? "border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                                    : "border-slate-200 bg-white text-slate-800 focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E]"
                                  }`}
                              />
                                <button
                                  onClick={() => removeQuotationService(s.uid)}
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
                            {issueParts.map((item) => {
                              const isEmptyItem = !item.partId && !item.isCustom;
                              return (
                                <div key={item.uid} className="flex items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    {!item.isCustom ? (
                                      <SearchableSelect
                                        value={item.partId}
                                        placeholder="-- Chọn phụ tùng tiếp theo --"
                                        emptyText="Không tìm thấy phụ tùng phù hợp."
                                        invalid={!item.partId}
                                        onChange={(v) => selectQuotationPart(item.uid, v)}
                                        options={spareParts.map((part) => {
                                          const usedElsewhere = quotationItems
                                            .filter((qi) => qi.uid !== item.uid && qi.partId === part.id)
                                            .reduce((sum, qi) => sum + qi.quantity, 0);
                                          const available = Number(part.available_quantity) - usedElsewhere;
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
                                          value={item.customItemName}
                                          onChange={(e) =>
                                            updateCustomQuotationItem(item.uid, { customItemName: e.target.value })
                                          }
                                          placeholder="Tên phụ tùng đặt riêng"
                                          className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E]"
                                        />
                                        <PriceInput
                                          value={item.unitPrice}
                                          placeholder="Đơn giá"
                                          onCommit={(value) => updateCustomQuotationItem(item.uid, { unitPrice: value })}
                                          className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right text-xs font-semibold text-slate-800 outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E]"
                                        />
                                      </div>
                                    )}
                                    {item.isCustom && (
                                      <p className="mt-1 text-[10px] font-semibold text-amber-600">
                                        Phụ tùng đặt riêng · Cọc 30%:{" "}
                                        {formatVND(Math.round(item.quantity * item.unitPrice * 0.3))}
                                      </p>
                                    )}
                                    {!item.isCustom && item.partId && (() => {
                                      const selectedPart = spareParts.find((p) => p.id === item.partId);
                                      if (!selectedPart) return null;
                                      const usedElsewhere = quotationItems
                                        .filter((qi) => qi.uid !== item.uid && qi.partId === item.partId)
                                        .reduce((sum, qi) => sum + qi.quantity, 0);
                                      const available = Number(selectedPart.available_quantity) - usedElsewhere;
                                      if (available >= item.quantity) return null;
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
                                      value={item.quantity}
                                      onChange={(e) => updateQuotationQuantity(item.uid, Number(e.target.value))}
                                      className="w-16 shrink-0 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-800 text-center focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors"
                                    />
                                  )}
                                  {!isEmptyItem && (
                                    <span className="w-24 shrink-0 pt-2 text-right text-xs font-bold text-[#00285E]">
                                      {formatVND(item.quantity * item.unitPrice)}
                                    </span>
                                  )}
                                  {!isEmptyItem && (
                                    <button
                                      onClick={() => removeQuotationItem(item.uid)}
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
                              setCustomPartIssueId(issueRow.issueId);
                              setShowCustomPartForm((v) => (customPartIssueId === issueRow.issueId ? !v : true));
                            }}
                            className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-[#00285E]/25 bg-white px-3 text-xs font-semibold text-[#00285E] hover:bg-slate-50"
                          >
                            <Plus size={14} />
                            Đặt phụ tùng riêng
                          </button>
                          {showCustomPartForm && customPartIssueId === issueRow.issueId && (
                            <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div>
                                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                    Tên phụ tùng
                                  </label>
                                  <input
                                    type="text"
                                    value={customPartName}
                                    onChange={(e) => setCustomPartName(e.target.value)}
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
                                    value={customPartQuantity}
                                    onChange={(e) => setCustomPartQuantity(Math.max(1, Number(e.target.value)))}
                                    className="h-9 w-full rounded-lg border border-amber-300 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E]"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                    Đơn giá
                                  </label>
                                  <PriceInput
                                    value={customPartPrice}
                                    placeholder="Nhập đơn giá"
                                    onCommit={setCustomPartPrice}
                                    className="h-9 w-full rounded-lg border border-amber-300 bg-slate-50 px-3 text-right text-xs font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E]"
                                  />
                                </div>
                              </div>
                              <div className="mt-4 flex items-center justify-between gap-3">
                                <div className="text-xs text-slate-500">
                                  Cọc áp dụng: <span className="font-bold text-amber-600">30%</span>
                                  {customPartPrice > 0 && (
                                    <span className="ml-2 font-semibold text-slate-700">
                                      ({formatVND(Math.round(customPartQuantity * customPartPrice * 0.3))})
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={submitCustomQuotationItem}
                                  disabled={
                                    customPartIssueId === "" ||
                                    !customPartName.trim() ||
                                    customPartQuantity <= 0 ||
                                    customPartPrice <= 0
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
                              issueServices.reduce((sum, s) => sum + s.fee, 0) +
                              issueParts.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
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
          {quotationServices.some((s) => s.issueId === null) && (
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Wrench size={14} className="text-slate-500" />
                  Dịch vụ khác (không thuộc hạng mục lỗi)
                </label>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <div className="space-y-1.5">
                  {quotationServices
                    .filter((s) => s.issueId === null)
                    .map((s) => (
                      <div
                        key={s.uid}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2"
                      >
                        <Wrench size={12} className="shrink-0 text-slate-400" />
                        <span className="flex-1 min-w-[120px] text-xs font-semibold text-slate-800 truncate">
                          {s.serviceName}
                        </span>
                        <PriceInput
                          placeholder="Nhập giá"
                          value={s.fee}
                          onCommit={(v) => updateQuotationServiceFee(s.uid, v)}
                          readOnly={s.hasDbPrice}
                          title={s.hasDbPrice ? "Giá đã có sẵn trong hệ thống, không thể sửa" : undefined}
                          className={`w-28 border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-right transition-colors focus:outline-none ${s.hasDbPrice
                              ? "border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                              : "border-slate-200 bg-white text-slate-800 focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E]"
                            }`}
                        />
                        <button
                          onClick={() => removeQuotationService(s.uid)}
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

          {/* Ghi chú */}
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <ClipboardList size={13} className="text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ghi chú</span>
            </div>
            <textarea
              rows={3}
              value={quotationNote}
              onChange={(e) => setQuotationNote(e.target.value)}
              placeholder="Ghi chú thêm cho báo giá..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors resize-none"
            />
          </div>

          {/* Footer tổng tiền + duyệt tại chỗ */}
          <div className="bg-white rounded-2xl border border-slate-200/70 p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Tổng cộng
              </span>
              <span className="text-lg font-bold text-[#00285E]">{formatVND(quotationTotal)}</span>
              {hasCustomQuotationItem && (
                <span className="ml-2 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                  Tiền cọc phụ tùng đặt riêng: {formatVND(quotationDeposit)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={approveNow}
                  onChange={(e) => setApproveNow(e.target.checked)}
                  className="accent-[#00285E] w-4 h-4"
                />
                Khách đã xác nhận tại chỗ, duyệt luôn
              </label>
              <button
                onClick={() => void handleCreateQuotation()}
                disabled={
                  hasIncompleteQuotationIssue ||
                  selectedQuotationItemsCount + quotationServices.length === 0 ||
                  isSubmittingQuotation
                }
                className="h-11 flex items-center gap-2 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-[#003C7D] to-[#00285E] shadow-lg shadow-[#00285E]/25 hover:shadow-[#00285E]/40 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmittingQuotation ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                {approveNow ? "Lưu và duyệt báo giá" : "Lưu báo giá"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
