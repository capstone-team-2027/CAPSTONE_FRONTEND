import { useState, useMemo, useEffect, useRef } from "react";
import {
  CheckSquare,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Car,
  Eye,
  PlayCircle,
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  X,
  Wrench,
  ClipboardList,
  Package,
  Sparkles,
  Send,
} from "lucide-react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { useFetchClient_v2 as useFetchClient } from "../../../hook/useFetchClient";
import { useSocket } from "../../../hook/useSocket";
import { TASK_ASSIGNMENT_ENDPOINTS } from "../../../constants/technician/taskAssignmentEndpoint";
import type {
  VehicleMake,
  VehicleModel,
  AiSuggestCausesRequest,
  AiSuggestCausesResponse,
} from "../../../model/dto/taskAssignment.dto";

// ========== TYPES ==========
interface AssignmentTask {
  taskId: number;
  taskType?: string;
  serviceName: string;
  repairIssue?: string;
  spareParts?: Array<{
    name: string;
    sku?: string;
    quantity?: number;
    isCustom: boolean;
    status?: string;
  }>;
  // Dùng cho modal tiến độ công việc
  taskAssignmentId?: number;
  status?: string;
  qcRejectionReason?: string;
  estimatedDuration?: number | null;
}

interface Assignment {
  id: string;
  serviceOrderId: string;
  technicianId: string;
  customerName: string;
  customerPhone: string;
  vehiclePlate: string;
  vehicleModel: string;
  vehicleColor: string;
  services: string[];
  tasks: AssignmentTask[];
  appointmentDate: string;
  appointmentTime: string;
  assignedAt: string;
  status:
    | "ASSIGNED"
    | "IN_PROGRESS"
    | "PAUSED"
    | "WAITING_STOCK"
    | "PENDING_QC"
    | "COMPLETED";
  // Trạng thái của service order (khác assignment status) — quyết định luồng báo cáo
  orderStatus?: string;
  rejectedAt?: string;
  taskAssignmentId?: string | number;
  hasUnstartedTasks?: boolean;
  bookingType: string;
  // INSPECTION: kiểm tra rồi tạo báo cáo sự cố | REPAIR: sửa chữa, cập nhật tiến độ
  taskType?: string;
  // Mô tả lỗi khách báo lúc lễ tân tiếp nhận xe
  symptom?: string;
}

interface ApiEnvelope<T> {
  data: T;
}

interface TaskAssignmentApi {
  id: number;
  technician_id?: number;
  status?: string;
  remarks?: string | null;
  createdAt?: string;
}

interface ServiceTaskApi {
  id: number;
  type?: string;
  status?: string;
  catalog?: {
    service_name?: string;
    estimated_duration?: number | null;
  };
  assignments?: TaskAssignmentApi[];
  quotationItem?: {
    id?: number;
    quantity?: number;
    custom_item_name?: string | null;
    status?: string | null;
    sparePart?: {
      id?: number;
      name?: string | null;
      sku?: string | null;
    } | null;
    issue?: {
      id?: number;
      error_description?: string | null;
      note?: string | null;
      quotationDetails?: Array<{
        id?: number;
        quantity?: number;
        custom_item_name?: string | null;
        status?: string | null;
        sparePart?: {
          id?: number;
          name?: string | null;
          sku?: string | null;
        } | null;
        customPartOrder?: {
          id?: number;
          item_name?: string | null;
          quantity?: number;
          unit_price?: number | string;
          status?: string | null;
          arrived_at?: string | null;
        } | null;
      }>;
      component?: {
        id?: number;
        name?: string | null;
      } | null;
    } | null;
  } | null;
}

interface ServiceOrderApi {
  id: number;
  status?: string;
  symptoms?: string;
  createdAt: string;
  appointment?: {
    scheduled_time?: string;
    booking_type?: string;
  };
  vehicle?: {
    license_plate?: string;
    color?: string;
    model?: {
      model_name?: string;
      make?: { make_name?: string };
    };
    customer?: {
      name?: string;
      phone?: string;
      user?: { fullName?: string; phoneNumber?: string };
    };
  };
  tasks?: ServiceTaskApi[];
}

interface RepairHistoryTask {
  id: number;
  createdAt?: string;
  catalog?: {
    service_name?: string;
  } | null;
  quotationItem?: {
    issue?: {
      error_description?: string | null;
      component?: {
        name?: string | null;
      } | null;
    } | null;
  } | null;
  repairNotes?: Array<{
    id: number;
    content?: string;
    createdAt?: string;
  }>;
}

interface InspectionHistoryItem {
  id: number;
  error_description?: string | null;
  component?: {
    name?: string | null;
  } | null;
  task?: {
    serviceOrder?: {
      symptoms?: string | null;
      vehicle?: {
        license_plate?: string | null;
        model?: {
          model_name?: string | null;
        } | null;
        customer?: {
          name?: string | null;
          user?: {
            fullName?: string | null;
          } | null;
        } | null;
      } | null;
    } | null;
  } | null;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const getRepairIssueText = (task?: ServiceTaskApi | null) => {
  const issue = task?.quotationItem?.issue;
  const componentName = issue?.component?.name?.trim() ?? "";
  const errorDescription = issue?.error_description?.trim() ?? "";

  if (componentName && errorDescription) {
    return `${componentName} - ${errorDescription}`;
  }

  return componentName || errorDescription || "";
};

const ASSIGNMENT_STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: React.ElementType }
> = {
  ASSIGNED: {
    label: "Chưa bắt đầu",
    className: "bg-amber-50 text-amber-600 border border-amber-200",
    icon: Clock,
  },
  PENDING: {
    label: "Chưa bắt đầu",
    className: "bg-amber-50 text-amber-600 border border-amber-200",
    icon: Clock,
  },
  IN_PROGRESS: {
    label: "Đang thực hiện",
    className: "bg-blue-50 text-blue-700 border border-blue-200",
    icon: CheckSquare,
  },
  PAUSED: {
    label: "Tạm dừng",
    className: "bg-rose-50 text-rose-600 border border-rose-200",
    icon: XCircle,
  },
  WAITING_STOCK: {
    label: "Chờ phụ tùng",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: Package,
  },
  PENDING_QC: {
    label: "Chờ nghiệm thu",
    className: "bg-violet-50 text-violet-700 border border-violet-200",
    icon: Eye,
  },
  COMPLETED: {
    label: "Hoàn thành",
    className: "bg-emerald-50 text-emerald-600 border border-emerald-200",
    icon: CheckCircle2,
  },
};

const PART_STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  PENDING_DEPOSIT: {
    label: "Đợi cọc",
    className: "border-orange-200 bg-orange-50 text-orange-700",
  },
  WAITING_DEPOSIT: {
    label: "Đợi cọc",
    className: "border-orange-200 bg-orange-50 text-orange-700",
  },
  WAITING_ARRIVAL: {
    label: "Chờ về hàng",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  READY_FOR_USE: {
    label: "Đã về, chờ xuất",
    className: "border-violet-200 bg-violet-50 text-violet-700",
  },
  WAITING_STOCK: {
    label: "Chờ nhập hàng",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  ORDERED: {
    label: "Đã đặt hàng",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  PENDING: {
    label: "Sẵn sàng",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  REQUESTED: {
    label: "Đã yêu cầu xuất kho",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  RECEIVED: {
    label: "Đã nhận",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  WAITING_SIGNATURE: {
    label: "Chờ ký nhận",
    className: "border-violet-200 bg-violet-50 text-violet-700",
  },
  EXPORTED: {
    label: "Đã nhận phụ tùng",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  WAITING_RECEIVE: {
    label: "Chờ nhận hàng",
    className: "border-violet-200 bg-violet-50 text-violet-700",
  },
  READY_FOR_RECEIPT: {
    label: "Chờ nhận hàng",
    className: "border-violet-200 bg-violet-50 text-violet-700",
  },
};

const getPartStatusConfig = (status?: string) =>
  PART_STATUS_CONFIG[status ?? ""] ?? {
    label: status?.replaceAll("_", " ") || "Chưa cập nhật",
    className: "border-slate-200 bg-slate-50 text-slate-500",
  };

// Luồng xuất kho hiện tại kết thúc ở EXPORTED (thủ kho duyệt + KTV ký điện tử tại quầy)
// RECEIVED giữ lại để tương thích dữ liệu cũ trước khi đổi luồng.
const RECEIVED_PART_STATUSES = ["EXPORTED", "RECEIVED"];

// Mock assignments removed to use API data

const ITEMS_PER_PAGE = 5;

export default function TechnicianAssignments() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();
  const { fetchPrivate } = useFetchClient();
  const socket = useSocket();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [issueReportOpen, setIssueReportOpen] = useState(false);
  const [issueReportAssignment, setIssueReportAssignment] =
    useState<Assignment | null>(null);
  // Bật lên khi tự đóng modal sau lúc hoàn thành hết task — chặn đúng 1 lần chạy kế tiếp của
  // effect đồng bộ modal, tránh nó lấy lại assignment cũ từ danh sách vừa tải và mở lại modal.
  const skipModalSyncRef = useRef(false);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupTerm, setLookupTerm] = useState("");
  const [inspectionDiagnostics, setInspectionDiagnostics] = useState<
    InspectionHistoryItem[]
  >([]);
  const [, setIsDiagLoading] = useState(false);
  const [diagMakes, setDiagMakes] = useState<VehicleMake[]>([]);
  const [diagModels, setDiagModels] = useState<VehicleModel[]>([]);
  const [diagMakeId, setDiagMakeId] = useState<number | "">("");
  const [diagModelId, setDiagModelId] = useState<number | "">("");
  // Tra cứu kinh nghiệm sửa lỗi (Inspection History) — task REPAIR
  const [repairLookupOpen, setRepairLookupOpen] = useState(false);
  const [repairLookupTerm, setRepairLookupTerm] = useState("");
  const [inspectionHistory, setInspectionHistory] = useState<
    RepairHistoryTask[]
  >([]);
  const [isRepairLoading, setIsRepairLoading] = useState(false);
  const [showRepairFilter, setShowRepairFilter] = useState(false);
  const [repairMakeId, setRepairMakeId] = useState<number | "">("");
  const [repairModelId, setRepairModelId] = useState<number | "">("");
  const [repairModels, setRepairModels] = useState<VehicleModel[]>([]);
  // Khung chat tham khảo AI
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState<
    { role: "user" | "ai"; text: string; disclaimer?: string }[]
  >([]);
  const [aiInput, setAiInput] = useState("");
  const [aiTaskAssignmentId, setAiTaskAssignmentId] = useState<number | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const [startingTaskAssignmentId, setStartingTaskAssignmentId] = useState<number | null>(null);
  const [completingTaskAssignmentId, setCompletingTaskAssignmentId] = useState<number | null>(null);
  const [requestingExportServiceOrderId, setRequestingExportServiceOrderId] = useState<string | null>(null);

  const openIssueReportModal = (assignment: Assignment) => {
    setIssueReportAssignment(assignment);
    setLookupTerm("");
    setIssueReportOpen(true);
  };

  const repairHistoryRows = useMemo(
    () =>
      inspectionHistory.flatMap((task) => {
        const issue = task.quotationItem?.issue;
        const componentName = issue?.component?.name?.trim() ?? "";
        const errorDescription = issue?.error_description?.trim() ?? "";
        const issueText =
          componentName && errorDescription
            ? `${componentName} - ${errorDescription}`
            : componentName || errorDescription;
        const serviceName =
          task.catalog?.service_name || `Công việc #${task.id}`;
        if (!task.repairNotes?.length) {
          return [
            {
              key: `task-${task.id}-empty`,
              serviceName,
              issueText,
              guide: "Chưa có hướng dẫn",
            },
          ];
        }
        return task.repairNotes.map((note) => ({
          key: `task-${task.id}-note-${note.id}`,
          serviceName,
          issueText,
          guide: note.content?.trim() || "Chưa có hướng dẫn",
        }));
      }),
    [inspectionHistory],
  );

  const lookupRows = useMemo(() => {
    return inspectionDiagnostics.map((item) => {
      const componentName = item.component?.name?.trim() ?? "";
      const errorDescription = item.error_description?.trim() ?? "";
      const vehicle = item.task?.serviceOrder?.vehicle;
      const plate = vehicle?.license_plate?.trim();
      const modelName = vehicle?.model?.model_name?.trim();
      const vehicleLabel = plate
        ? modelName
          ? `${plate} · ${modelName}`
          : plate
        : null;
      const customerName =
        vehicle?.customer?.name?.trim() ||
        vehicle?.customer?.user?.fullName?.trim() ||
        null;
      return {
        id: `garage-${item.id}`,
        issue: item.task?.serviceOrder?.symptoms?.trim() || "—",
        cause:
          componentName && errorDescription
            ? `${componentName} - ${errorDescription}`
            : componentName || errorDescription || "—",
        vehicleLabel,
        customerName,
      };
    });
  }, [inspectionDiagnostics]);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setIsLoading(true);
        const response = (await fetchPrivate<ServiceOrderApi[]>(
          TASK_ASSIGNMENT_ENDPOINTS.GET_MY_ASSIGNMENTS,
        )) as ServiceOrderApi[];
        if (Array.isArray(response)) {
          const mappedData: Assignment[] = response.map((so) => {
            const services = (
              so.tasks?.map((t) => t.catalog?.service_name) || []
            ).filter((service): service is string => Boolean(service));
            if (
              services.length === 0 &&
              so.appointment?.booking_type &&
              so.appointment.booking_type.includes("REPAIR")
            ) {
              services.push("Kiểm tra");
            }
            const allAssignments =
              so.tasks?.flatMap((task) => task.assignments ?? []) ?? [];
            const selectedAssignment =
              allAssignments.find((item) => item.status === "IN_PROGRESS") ??
              allAssignments.find((item) => item.status === "PAUSED") ??
              allAssignments.find((item) => item.status === "WAITING_STOCK") ??
              allAssignments.find((item) => item.status === "ASSIGNED") ??
              allAssignments.find((item) => item.status === "PENDING_QC") ??
              allAssignments[0];
            // WAITING_STOCK không còn "Bắt đầu lại" — yêu cầu xuất kho giờ là nút riêng KTV tự
            // bấm bất cứ lúc nào (xem handleRequestPartsExport), không còn gắn với hành động bắt
            // đầu công việc. Chỉ ASSIGNED (chưa từng bắt đầu) mới tính là "chưa bắt đầu".
            const unstartedAssignment = allAssignments.find((item) => item.status === "ASSIGNED");
            const allTasksCompleted =
              (so.tasks?.length ?? 0) > 0 &&
              (so.tasks ?? []).every((task) => {
                const assignment = task.assignments?.[0];
                return (task.status ?? assignment?.status) === "COMPLETED";
              });
            const hasStartedTask = (so.tasks ?? []).some((task) =>
              ["IN_PROGRESS", "PAUSED", "WAITING_STOCK"].includes(
                task.status ?? "",
              ) ||
              task.assignments?.some((assignment) =>
                ["IN_PROGRESS", "PAUSED", "WAITING_STOCK"].includes(
                  assignment.status ?? "",
                ),
              ),
            );
            // KTV đã báo xong task REPAIR, đang chờ KTV trưởng nghiệm thu — Task.status vẫn giữ
            // IN_PROGRESS ở BE (chỉ assignment chuyển PENDING_QC), nên phải xét riêng assignment,
            // và ưu tiên hiển thị "Chờ QC" khi không còn assignment nào thực sự đang làm dở.
            const hasWorkingAssignment = allAssignments.some((assignment) =>
              ["IN_PROGRESS", "PAUSED", "WAITING_STOCK"].includes(assignment.status ?? ""),
            );
            const hasPendingQcAssignment = allAssignments.some(
              (assignment) => assignment.status === "PENDING_QC",
            );
            const status: Assignment["status"] = allTasksCompleted
              ? "COMPLETED"
              : hasPendingQcAssignment && !hasWorkingAssignment
                ? "PENDING_QC"
                : hasStartedTask
                  ? "IN_PROGRESS"
                  : "ASSIGNED";

            const aptDate = so.appointment?.scheduled_time
              ? new Date(so.appointment.scheduled_time)
              : new Date(so.createdAt);

            return {
              id: `SO-${so.id}`,
              serviceOrderId: so.id.toString(),
              technicianId:
                selectedAssignment?.technician_id?.toString() || "",
              customerName:
                so.vehicle?.customer?.name ||
                so.vehicle?.customer?.user?.fullName ||
                "Khách vãng lai",
              customerPhone:
                so.vehicle?.customer?.phone ||
                so.vehicle?.customer?.user?.phoneNumber ||
                "",
              vehiclePlate: so.vehicle?.license_plate || "",
              vehicleModel:
                `${so.vehicle?.model?.make?.make_name || ""} ${so.vehicle?.model?.model_name || ""}`.trim(),
              vehicleColor: so.vehicle?.color || "",
              services,
              tasks: (so.tasks || []).map((t) => {
                const taskAssignment =
                  t.assignments?.find(
                    (item) => item.id === selectedAssignment?.id,
                  ) ?? t.assignments?.[0];
                const spareParts = (
                  t.quotationItem?.issue?.quotationDetails ?? []
                )
                  .map((detail) => ({
                    name:
                      detail.sparePart?.name ||
                      detail.customPartOrder?.item_name ||
                      "",
                    sku: detail.sparePart?.sku ?? undefined,
                    quantity: detail.quantity ?? 0,
                    isCustom: Boolean(detail.customPartOrder),
                    // Phụ tùng đặt riêng dùng trạng thái riêng (WAITING_ARRIVAL/READY_FOR_USE/
                    // EXPORTED) thay vì status của dòng shell (CUSTOM_ORDERED/EXPORTED).
                    status: detail.customPartOrder?.status ?? detail.status ?? undefined,
                  }))
                  .filter(
                    (part, index, list) =>
                      part.name &&
                      list.findIndex(
                        (item) =>
                          item.name === part.name && item.sku === part.sku,
                      ) === index,
                  );
                // PENDING_QC chỉ nằm ở assignment — BE giữ Task.status = IN_PROGRESS cho tới khi
                // KTV trưởng nghiệm thu, nên phải xét assignment trước, nếu không modal vẫn hiện
                // nút "Đã hoàn tất" dù KTV đã bấm xong.
                const taskStatus =
                  taskAssignment?.status === "PENDING_QC"
                    ? "PENDING_QC"
                    : t.status === "WAITING_STOCK" ||
                      taskAssignment?.status === "WAITING_STOCK"
                    ? "WAITING_STOCK"
                    : (t.status ?? taskAssignment?.status);
                return {
                  taskId: t.id,
                  taskType: t.type,
                  serviceName: t.catalog?.service_name || `Task #${t.id}`,
                  repairIssue: getRepairIssueText(t),
                  spareParts,
                  taskAssignmentId: taskAssignment?.id,
                  status: taskStatus,
                  // Nghiệm thu bị từ chối chỉ để lại remarks khi task quay về IN_PROGRESS
                  // (pause/wait_stock cũng dùng chung remarks nhưng gắn trạng thái khác)
                  qcRejectionReason:
                    taskStatus === "IN_PROGRESS" && taskAssignment?.remarks
                      ? taskAssignment.remarks
                      : undefined,
                  estimatedDuration: t.catalog?.estimated_duration ?? null,
                };
              }),
              appointmentDate: aptDate.toISOString(),
              appointmentTime: aptDate.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              assignedAt: selectedAssignment?.createdAt || so.createdAt,
              status: status,
              orderStatus: so.status,
              taskAssignmentId:
                unstartedAssignment?.id ?? selectedAssignment?.id,
              hasUnstartedTasks: Boolean(unstartedAssignment),
              bookingType: so.appointment?.booking_type || "WALK_IN",
              taskType:
                so.tasks?.find((task) => task.type === "REPAIR")?.type ??
                so.tasks?.[0]?.type,
              symptom: so.symptoms ?? "",
            };
          });
          setAssignments(
            mappedData.filter(
              (assignment) => assignment.status !== "COMPLETED",
            ),
          );
        }
      } catch (error) {
        console.error("Lỗi khi tải danh sách phân công:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssignments();
  }, [fetchPrivate, refreshKey]);

  // Có phân công/cập nhật mới -> BE emit new_notification -> tự tải lại danh sách
  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = () => {
      setRefreshKey((prev) => prev + 1);
    };
    socket.on("new_notification", handleNewNotification);
    return () => {
      socket.off("new_notification", handleNewNotification);
    };
  }, [socket]);

  // Thứ tự tiến triển của 1 task — dùng để không cho dữ liệu tải lại (có thể là ảnh chụp cũ do
  // request bay đi trước lúc KTV bấm xong) kéo ngược trạng thái đã tiến xa hơn ở máy KTV.
  const TASK_PROGRESS_RANK: Record<string, number> = {
    PENDING: 0,
    WAITING_STOCK: 1,
    PAUSED: 1,
    IN_PROGRESS: 2,
    PENDING_QC: 3,
    COMPLETED: 4,
  };

  useEffect(() => {
    if (!issueReportAssignment) return;
    // Vừa chủ động đóng modal (hoàn thành hết task) — bỏ qua đồng bộ để không lấy lại
    // assignment cũ từ danh sách vừa tải rồi mở lại modal.
    if (skipModalSyncRef.current) {
      skipModalSyncRef.current = false;
      return;
    }
    const refreshed = assignments.find(
      (a) => a.serviceOrderId === issueReportAssignment.serviceOrderId,
    );
    if (!refreshed || refreshed === issueReportAssignment) return;

    // Giữ lại trạng thái nào đang tiến xa hơn cho từng task: dữ liệu mới bổ sung được các thay
    // đổi từ nơi khác (vd thủ kho vừa xuất phụ tùng), nhưng không được kéo lùi task mà chính
    // KTV vừa bấm xong trên máy này.
    const mergedTasks = refreshed.tasks.map((incoming) => {
      const current = issueReportAssignment.tasks.find(
        (t) => t.taskAssignmentId === incoming.taskAssignmentId,
      );
      if (!current) return incoming;
      const currentRank = TASK_PROGRESS_RANK[current.status ?? ""] ?? -1;
      const incomingRank = TASK_PROGRESS_RANK[incoming.status ?? ""] ?? -1;
      return incomingRank >= currentRank ? incoming : { ...incoming, status: current.status };
    });

    const statusesUnchanged =
      mergedTasks.length === issueReportAssignment.tasks.length &&
      mergedTasks.every((t, index) => t.status === issueReportAssignment.tasks[index]?.status);
    if (statusesUnchanged && refreshed.tasks.every((t, i) => t === issueReportAssignment.tasks[i])) {
      return;
    }
    // Task cuối cùng vừa xong (có thể do KTV khác cùng đơn) — đóng modal luôn thay vì để trống.
    if (
      mergedTasks.length > 0 &&
      mergedTasks.every((t) => t.status === "COMPLETED" || t.status === "PENDING_QC")
    ) {
      skipModalSyncRef.current = true;
      setIssueReportOpen(false);
      setIssueReportAssignment(null);
      return;
    }
    setIssueReportAssignment({ ...refreshed, tasks: mergedTasks });
  }, [assignments, issueReportAssignment]);

  useEffect(() => {
    const openServiceOrderId = (location.state as { openServiceOrderId?: string } | null)
      ?.openServiceOrderId;
    if (!openServiceOrderId || assignments.length === 0) return;
    const target = assignments.find((a) => a.serviceOrderId === openServiceOrderId);
    if (target) {
      openIssueReportModal(target);
    }
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments]);

  // Bắt đầu ĐÚNG 1 Task trong modal (không còn hiệu ứng dây chuyền bắt cả đơn — khớp với BE
  // startTask đã sửa chỉ xử lý đúng assignment được bấm). Áp dụng khi 1 đơn có nhiều Task,
  // Task nào có phụ tùng sẵn thì bắt đầu trước, Task khác đang chờ phụ tùng không bị đụng tới.
  const handleStartSingleTask = async (taskAssignmentId: number) => {
    setStartingTaskAssignmentId(taskAssignmentId);
    try {
      await fetchPrivate(TASK_ASSIGNMENT_ENDPOINTS.START_TASK, "PUT", {
        taskAssignmentId,
      });
      setIssueReportAssignment((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) =>
                t.taskAssignmentId === taskAssignmentId
                  ? { ...t, status: t.spareParts?.length ? "WAITING_STOCK" : "IN_PROGRESS" }
                  : t,
              ),
            }
          : prev,
      );
      setRefreshKey((prev) => prev + 1);
    } catch (error: unknown) {
      console.error("Lỗi khi bắt đầu công việc:", error);
      showToast(getErrorMessage(error, "Đã xảy ra lỗi khi bắt đầu công việc."), "warning");
    } finally {
      setStartingTaskAssignmentId(null);
    }
  };

  const handleCompleteSingleTask = async (taskAssignmentId: number) => {
    setCompletingTaskAssignmentId(taskAssignmentId);
    try {
      await fetchPrivate(TASK_ASSIGNMENT_ENDPOINTS.COMPLETE_TASK, "PATCH", {
        taskAssignmentId,
      });
      let allCompleted = false;
      setIssueReportAssignment((prev) => {
        if (!prev) return prev;
        const updatedTasks = prev.tasks.map((t) => {
          if (t.taskAssignmentId !== taskAssignmentId) return t;
          // Task REPAIR chỉ dừng ở "chờ nghiệm thu" — KTV trưởng xác nhận mới thành COMPLETED
          // (khớp completeTask bên BE). INSPECTION vẫn xong thẳng như cũ.
          return { ...t, status: t.taskType === "REPAIR" ? "PENDING_QC" : "COMPLETED" };
        });
        allCompleted = updatedTasks.every(
          (t) => t.status === "COMPLETED" || t.status === "PENDING_QC",
        );
        return { ...prev, tasks: updatedTasks };
      });
      // Toàn bộ công việc trong lệnh sửa chữa này đã xong (hoặc đã chuyển sang chờ nghiệm thu) —
      // đóng modal và dọn state để lần mở sau không còn dính dữ liệu cũ, khỏi bắt KTV tự bấm X.
      // Bật cờ chặn để effect đồng bộ modal không vô tình mở lại modal vừa đóng.
      if (allCompleted) {
        skipModalSyncRef.current = true;
        setIssueReportOpen(false);
        setIssueReportAssignment(null);
      }
      setRefreshKey((prev) => prev + 1);
    } catch (error: unknown) {
      console.error("Lỗi khi hoàn thành công việc:", error);
      showToast(getErrorMessage(error, "Đã xảy ra lỗi khi hoàn thành công việc."), "warning");
    } finally {
      setCompletingTaskAssignmentId(null);
    }
  };

  // KTV tự bấm yêu cầu xuất kho 1 lần cho CẢ ĐƠN — gộp mọi phụ tùng đủ tồn nhưng thủ kho chưa
  // xuất của toàn bộ Task trong Service Order đó, tách riêng khỏi "Bắt đầu".
  const handleRequestPartsExport = async (serviceOrderId: string) => {
    setRequestingExportServiceOrderId(serviceOrderId);
    try {
      const res = await fetchPrivate(TASK_ASSIGNMENT_ENDPOINTS.REQUEST_PARTS_EXPORT, "PUT", {
        serviceOrderId,
      });
      showToast(res?.message || "Đã gửi yêu cầu xuất kho.", "success");
      setRefreshKey((prev) => prev + 1);
    } catch (error: unknown) {
      console.error("Lỗi khi gửi yêu cầu xuất kho:", error);
      showToast(getErrorMessage(error, "Đã xảy ra lỗi khi gửi yêu cầu xuất kho."), "warning");
    } finally {
      setRequestingExportServiceOrderId(null);
    }
  };

  // ===== Tra cứu chẩn đoán =====

  // Mở modal tra cứu: điền sẵn symptom của đơn, tự tìm nếu có; nếu trống thì
  // load toàn bộ lỗi. Luôn load danh sách hãng xe cho filter.
  const openLookup = () => {
    const symptom = issueReportAssignment?.symptom?.trim() ?? "";
    setLookupTerm(symptom);
    setDiagMakeId("");
    setDiagModelId("");
    setLookupOpen(true);
    if (symptom) {
      searchInspectionDiagnostics(symptom);
    } else {
      loadAllInspectionDiagnostics();
    }
    loadMakes();
  };

  const loadMakes = async () => {
    try {
      const result = await fetchPrivate<VehicleMake[]>(
        TASK_ASSIGNMENT_ENDPOINTS.GET_VEHICLE_MAKES,
        "GET",
      );
      setDiagMakes(result.data ?? []);
    } catch (error) {
      console.error("Lỗi khi lấy hãng xe", error);
    }
  };

  const loadModels = async (makeId: number) => {
    try {
      const result = await fetchPrivate<VehicleModel[]>(
        TASK_ASSIGNMENT_ENDPOINTS.GET_VEHICLE_MODELS(makeId),
        "GET",
      );
      setDiagModels(result.data ?? []);
    } catch (error) {
      console.error("Lỗi khi lấy dòng xe", error);
    }
  };

  const loadModelsForRepair = async (makeId: number) => {
    try {
      const result = await fetchPrivate<ApiEnvelope<VehicleModel[]>>(
        TASK_ASSIGNMENT_ENDPOINTS.GET_VEHICLE_MODELS(makeId),
        "GET",
      );
      setRepairModels(result.data ?? []);
    } catch (error) {
      console.error("Lỗi khi lấy dòng xe cho tra cứu sửa chữa", error);
      setRepairModels([]);
    }
  };

  const loadAllInspectionDiagnostics = async () => {
    setIsDiagLoading(true);
    try {
      const result = await fetchPrivate<ApiEnvelope<InspectionHistoryItem[]>>(
        TASK_ASSIGNMENT_ENDPOINTS.GET_ALL_INSPECTION_HISTORY,
        "GET",
      );
      setInspectionDiagnostics(result.data ?? []);
    } catch (error) {
      console.error("Lỗi khi lấy các lỗi đã gặp tại garage", error);
    } finally {
      setIsDiagLoading(false);
    }
  };

  const searchInspectionDiagnostics = async (keyword: string) => {
    setIsDiagLoading(true);
    try {
      const result = await fetchPrivate<ApiEnvelope<InspectionHistoryItem[]>>(
        TASK_ASSIGNMENT_ENDPOINTS.SEARCH_INSPECTION_HISTORY(keyword),
        "GET",
      );
      setInspectionDiagnostics(result.data ?? []);
    } catch (error) {
      console.error("Lỗi khi tìm các lỗi đã gặp tại garage", error);
    } finally {
      setIsDiagLoading(false);
    }
  };

  const filterInspectionDiagnostics = async (
    makeId?: number,
    modelId?: number,
  ) => {
    setIsDiagLoading(true);
    try {
      const result = await fetchPrivate<ApiEnvelope<InspectionHistoryItem[]>>(
        TASK_ASSIGNMENT_ENDPOINTS.FILTER_INSPECTION_HISTORY({
          makeId,
          modelId,
        }),
        "GET",
      );
      setInspectionDiagnostics(result.data ?? []);
    } catch (error) {
      console.error("Lỗi khi lọc các lỗi đã gặp tại garage", error);
    } finally {
      setIsDiagLoading(false);
    }
  };

  // Mở khung chat AI — chỉ điền sẵn triệu chứng vào ô nhập, KTV xem/sửa lại rồi tự bấm gửi.
  // Không tự động gọi AI khi mở modal để tránh tốn quota mỗi lần lỡ tay mở.
  const openAiChat = () => {
    const assignment = issueReportAssignment;
    setAiChatOpen(true);
    setAiMessages([]);
    setAiTaskAssignmentId(null);
    if (!assignment) {
      setAiInput("");
      return;
    }
    const targetTask =
      assignment.taskType === "REPAIR"
        ? (assignment.tasks.find(
            (t) => t.taskType === "REPAIR" && t.status === "IN_PROGRESS",
          ) ?? assignment.tasks.find((t) => t.taskType === "REPAIR"))
        : (assignment.tasks.find((t) => t.taskType === "INSPECTION") ??
          assignment.tasks[0]);
    let prefill: string | undefined;
    if (targetTask?.taskType === "REPAIR") {
      const issueText = targetTask.repairIssue?.trim() || targetTask.serviceName;
      const partNames = targetTask.spareParts?.map((p) => p.name).filter(Boolean) ?? [];
      const lines = [
        "Tham khảo tra cứu cách sửa lỗi / cách thực hiện về:",
        issueText ? `Vấn đề: ${issueText}.` : null,
        partNames.length ? `Phụ tùng đang dùng: ${partNames.join(", ")}.` : null,
        targetTask.serviceName ? `Dịch vụ: ${targetTask.serviceName}.` : null,
      ].filter(Boolean);
      prefill = lines.join("\n");
    } else {
      prefill = assignment.symptom?.trim();
    }
    setAiInput(prefill || "");
    if (!targetTask?.taskAssignmentId) {
      setAiMessages([
        { role: "ai", text: "Không tìm thấy thông tin phân công của công việc này." },
      ]);
      return;
    }
    setAiTaskAssignmentId(targetTask.taskAssignmentId);
  };

  const sendAiFollowUp = async () => {
    const question = aiInput.trim();
    if (!question || isAiLoading || !aiTaskAssignmentId) return;
    setAiMessages((prev) => [...prev, { role: "user", text: question }]);
    setAiInput("");
    setIsAiLoading(true);
    try {
      const payload: AiSuggestCausesRequest = {
        taskAssignmentId: aiTaskAssignmentId,
        followUpQuestion: question,
      };
      const result = await fetchPrivate<AiSuggestCausesResponse>(
        TASK_ASSIGNMENT_ENDPOINTS.AI_SUGGEST_CAUSES,
        "POST",
        payload,
      );
      const data = result.data;
      setAiMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: data?.ai_suggestion ?? "Không có phản hồi từ AI.",
          disclaimer: data?.disclaimer,
        },
      ]);
    } catch (error: unknown) {
      setAiMessages((prev) => [
        ...prev,
        { role: "ai", text: getErrorMessage(error, "Không lấy được gợi ý từ AI.") },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // ===== Tra cứu kinh nghiệm sửa lỗi (Inspection History) =====

  // Tự lấy triệu chứng gốc của lệnh sửa chữa, tách thành từ khóa rồi lọc kinh nghiệm sửa chữa
  // cũ theo các từ khóa đó — KTV không cần tự gõ đúng từ khớp chuỗi chính xác.
  const openRepairLookup = async () => {
    const assignment = issueReportAssignment;
    const targetTask =
      assignment?.tasks.find(
        (t) => t.taskType === "REPAIR" && t.status === "IN_PROGRESS",
      ) ?? assignment?.tasks.find((t) => t.taskType === "REPAIR");
    setRepairLookupTerm("");
    setRepairMakeId("");
    setRepairModelId("");
    setShowRepairFilter(false);
    setRepairLookupOpen(true);
    setInspectionHistory([]);
    loadMakes();
    if (!targetTask?.taskAssignmentId) {
      showToast("Không tìm thấy thông tin phân công của công việc này.", "warning");
      return;
    }
    setIsRepairLoading(true);
    try {
      const result = await fetchPrivate<
        ApiEnvelope<{ symptom: string; keywords: string[]; results: RepairHistoryTask[] }>
      >(TASK_ASSIGNMENT_ENDPOINTS.SEARCH_REPAIR_HISTORY_SMART, "POST", {
        taskAssignmentId: targetTask.taskAssignmentId,
      });
      setInspectionHistory(result.data?.results ?? []);
      setRepairLookupTerm(result.data?.symptom ?? "");
    } catch (error: unknown) {
      showToast(
        getErrorMessage(error, "Đã xảy ra lỗi khi tra cứu kinh nghiệm sửa lỗi."),
        "warning",
      );
    } finally {
      setIsRepairLoading(false);
    }
  };

  const loadAllInspectionHistory = async () => {
    setIsRepairLoading(true);
    try {
      const result = await fetchPrivate<ApiEnvelope<RepairHistoryTask[]>>(
        TASK_ASSIGNMENT_ENDPOINTS.GET_ALL_REPAIR_HISTORY,
        "GET",
      );
      setInspectionHistory(result.data ?? []);
    } catch (error) {
      console.error("Lỗi khi lấy kinh nghiệm sửa lỗi", error);
    } finally {
      setIsRepairLoading(false);
    }
  };

  const searchInspectionHistory = async (keyword: string) => {
    setIsRepairLoading(true);
    try {
      const result = await fetchPrivate<ApiEnvelope<RepairHistoryTask[]>>(
        TASK_ASSIGNMENT_ENDPOINTS.SEARCH_REPAIR_HISTORY(keyword),
        "GET",
      );
      setInspectionHistory(result.data ?? []);
    } catch (error) {
      console.error("Lỗi khi tìm kinh nghiệm sửa lỗi", error);
    } finally {
      setIsRepairLoading(false);
    }
  };

  const filterInspectionHistory = async (makeId?: number, modelId?: number) => {
    setIsRepairLoading(true);
    try {
      const result = await fetchPrivate<ApiEnvelope<RepairHistoryTask[]>>(
        TASK_ASSIGNMENT_ENDPOINTS.FILTER_REPAIR_HISTORY({ makeId, modelId }),
        "GET",
      );
      setInspectionHistory(result.data ?? []);
    } catch (error) {
      console.error("Lỗi khi lọc kinh nghiệm sửa lỗi", error);
    } finally {
      setIsRepairLoading(false);
    }
  };



  const filteredAssignments = useMemo(() => {
    return assignments.filter((asg) => {
      const matchSearch =
        searchTerm === "" ||
        asg.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asg.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asg.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asg.serviceOrderId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "ASSIGNED"
          ? asg.hasUnstartedTasks
          : statusFilter === "IN_PROGRESS" ||
              statusFilter === "COMPLETED"
            ? asg.status === statusFilter
            : asg.tasks.some((task) => task.status === statusFilter));

      return matchSearch && matchStatus;
    });
  }, [searchTerm, statusFilter, assignments]);

  const totalPages = Math.ceil(filteredAssignments.length / ITEMS_PER_PAGE);
  useEffect(() => {
    const lastPage = Math.max(1, totalPages);
    setCurrentPage((page) => Math.min(page, lastPage));
  }, [totalPages]);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAssignments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAssignments, currentPage]);

  const kpiCounts = useMemo(
    () => ({
      total: assignments.length,
      assigned: assignments.filter((a) => a.hasUnstartedTasks).length,
      inProgress: assignments.filter((a) => a.status === "IN_PROGRESS").length,
    }),
    [assignments],
  );

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* HEADER */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(-1)}
          title="Quay lại"
          className="mt-0.5 w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-[#00285E] border border-[#00285E] text-white hover:bg-[#003C7D] hover:border-[#003C7D] active:scale-[0.97] transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2 flex items-center gap-2">
            Quản lý phân công
          </h1>
          <p className="text-slate-500 text-sm">
            Xem và quản lý trạng thái phân công công việc sửa chữa.
          </p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Tổng phân công",
            value: kpiCounts.total,
            icon: <CheckSquare size={22} />,
            bg: "#00285E",
          },
          {
            label: "Mới phân công",
            value: kpiCounts.assigned,
            icon: <Clock size={22} />,
            bg: "#D97706",
          },
          {
            label: "Đang thực hiện",
            value: kpiCounts.inProgress,
            icon: <CheckSquare size={22} />,
            bg: "#3B82F6",
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
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                style={{ backgroundColor: card.bg }}
              >
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH & FILTER */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Tìm theo tên khách, biển số xe, mã phân công..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="ASSIGNED">Mới phân công</option>
              <option value="IN_PROGRESS">Đang thực hiện</option>
              <option value="PAUSED">Tạm dừng</option>
              <option value="WAITING_STOCK">Chờ phụ tùng</option>
              <option value="PENDING_QC">Chờ nghiệm thu</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 size={48} className="mb-4 text-[#00285E] animate-spin" />
            <p className="text-lg font-semibold mb-1 text-slate-700">
              Đang tải phân công...
            </p>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <AlertCircle size={48} className="mb-4 text-slate-300" />
            <p className="text-lg font-semibold mb-1">
              Không tìm thấy phân công
            </p>
            <p className="text-sm">
              Thử thay đổi từ khóa hoặc bộ lọc trạng thái.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-blue-100 uppercase tracking-widest bg-[#00285E] lg:text-slate-400 lg:bg-slate-50/50">
                  <th className="py-3 px-4 align-middle whitespace-nowrap">
                    Khách hàng
                  </th>
                  <th className="py-3 px-4 align-middle whitespace-nowrap">
                    Xe
                  </th>
                  <th className="py-3 px-4 align-middle whitespace-nowrap">
                    Trạng thái
                  </th>
                  <th className="py-3 px-4 align-middle text-center whitespace-nowrap">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((asg) => {
                  // PENDING_QC = đã báo xong, đang chờ KTV trưởng nghiệm thu — vẫn cho KTV mở
                  // modal xem tiến độ để biết công việc đang ở bước nào.
                  const hasProgressTask = asg.tasks.some((task) =>
                    ["PENDING", "IN_PROGRESS", "PAUSED", "WAITING_STOCK", "PENDING_QC"].includes(
                      task.status ?? "",
                    ),
                  );
                  return (
                    <tr
                      key={asg.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-4 px-4 align-middle">
                        <div className="flex items-center gap-2 min-w-[160px]">
                          <div className="w-8 h-8 shrink-0 rounded-full bg-[#EDF3FF] flex items-center justify-center">
                            <Users size={14} className="text-[#00285E]" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-700 text-xs truncate">
                              {asg.customerName}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {asg.customerPhone}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-middle">
                        <div className="flex items-center gap-1.5 min-w-[140px]">
                          <Car size={13} className="text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-700 text-xs truncate">
                              {asg.vehiclePlate}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {asg.vehicleModel}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        {(() => {
                          const statusCfg =
                            ASSIGNMENT_STATUS_CONFIG[asg.status] ??
                            ASSIGNMENT_STATUS_CONFIG.PENDING;
                          const StatusIcon = statusCfg.icon;

                          return (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusCfg.className}`}
                            >
                              <StatusIcon size={12} className="shrink-0" />
                              {statusCfg.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-4 px-4 align-middle">
                        <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                          {asg.orderStatus === "PENDING_QUOTATION" ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200">
                              <CheckCircle2 size={13} />
                              Đã báo cáo
                            </span>
                          ) : asg.hasUnstartedTasks ? (
                            <button
                              onClick={() => openIssueReportModal(asg)}
                              className="flex items-center gap-1 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold text-white bg-[#00285E] hover:brightness-110 transition-all"
                            >
                              <Eye size={13} />
                              Chi tiết
                            </button>
                          ) : hasProgressTask ? (
                            <button
                              onClick={() => openIssueReportModal(asg)}
                              className="flex items-center gap-1 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold text-white bg-[#00285E] hover:brightness-110 transition-all"
                            >
                              <ClipboardList size={13} />
                              Tiến độ công việc
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                navigate(
                                  `/technician/assignments/${asg.serviceOrderId}`,
                                )
                              }
                              className="flex items-center gap-1 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                              <Eye size={13} />
                              Chi tiết
                            </button>
                          )}
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-400 text-center sm:text-left">
              Hiển thị {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(
                currentPage * ITEMS_PER_PAGE,
                filteredAssignments.length,
              )}{" "}
              / {filteredAssignments.length} phân công
            </span>
            <div className="flex items-center gap-1 flex-wrap justify-center">
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
                    className={`w-9 h-9 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition-all ${
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

      {/* MODAL TIẾN ĐỘ CÔNG VIỆC */}
      {issueReportOpen && issueReportAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <style>{`
            @keyframes progressShimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
            .progress-shimmer::after {
              content: "";
              position: absolute;
              inset: 0;
              background: linear-gradient(
                90deg,
                transparent,
                rgba(0,40,94,0.12),
                transparent
              );
              animation: progressShimmer 1.6s ease-in-out infinite;
            }
            @keyframes progressStripes {
              from { background-position: 1rem 0; }
              to { background-position: 0 0; }
            }
            .progress-stripes {
              background-image: linear-gradient(
                45deg,
                rgba(255,255,255,0.25) 25%, transparent 25%,
                transparent 50%, rgba(255,255,255,0.25) 50%,
                rgba(255,255,255,0.25) 75%, transparent 75%, transparent
              );
              background-size: 1rem 1rem;
              animation: progressStripes 0.7s linear infinite;
            }
          `}</style>
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setIssueReportOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5">
            <div
              className="relative flex items-start justify-between px-4 sm:px-7 pt-5 sm:pt-7 pb-5 sm:pb-6 shrink-0 text-white overflow-hidden"
              style={{ backgroundColor: "#00285E" }}
            >
              <div className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-white/10" />
              <div className="absolute -bottom-14 -left-6 w-40 h-40 rounded-full bg-white/5" />
              <div className="relative flex items-center gap-3 sm:gap-4">
                <div
                  className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-2xl shrink-0"
                  style={{ backgroundColor: "#F9A11B" }}
                >
                  <Wrench size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white leading-none">
                    Tiến độ công việc
                  </h3>
                </div>
              </div>
              <div className="relative flex items-center gap-2">
                <button
                  onClick={() => setIssueReportOpen(false)}
                  className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-4 sm:px-7 py-4 sm:py-6 space-y-6 bg-slate-50/50">
              {/* SECTION: Thông tin khách hàng & xe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#EDF3FF] rounded-2xl border border-[#c7d7f0] p-4">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Users size={13} className="text-[#00285E]" />
                    <span className="text-[10px] font-bold text-[#00285E] uppercase tracking-widest">
                      Khách hàng
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-baseline gap-2">
                      <span className="w-14 shrink-0 text-xs text-slate-500">
                        Tên
                      </span>
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {issueReportAssignment.customerName}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="w-14 shrink-0 text-xs text-slate-500">
                        SĐT
                      </span>
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {issueReportAssignment.customerPhone || "—"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-[#EDF3FF] rounded-2xl border border-[#c7d7f0] p-4">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Car size={13} className="text-[#00285E]" />
                    <span className="text-[10px] font-bold text-[#00285E] uppercase tracking-widest">
                      Phương tiện
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-baseline gap-2">
                      <span className="w-16 shrink-0 text-xs text-slate-500">
                        Biển số
                      </span>
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {issueReportAssignment.vehiclePlate || "—"}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="w-16 shrink-0 text-xs text-slate-500">
                        Loại xe
                      </span>
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {issueReportAssignment.vehicleModel || "—"}
                        {issueReportAssignment.vehicleColor
                          ? ` · ${issueReportAssignment.vehicleColor}`
                          : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: Mô tả lỗi từ lễ tân + tra cứu lỗi */}
              <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-1.5">
                    <ClipboardList size={13} className="text-slate-400 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Mô tả lỗi tiếp nhận từ nhân viên
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
                    <button
                      onClick={
                        issueReportAssignment.taskType === "REPAIR"
                          ? openRepairLookup
                          : openLookup
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#00285E] bg-[#EDF3FF] hover:bg-[#DCE8FF] active:scale-[0.97] transition-all"
                    >
                      <Search size={13} />
                      {issueReportAssignment.taskType === "REPAIR"
                        ? "Tra cứu sửa lỗi"
                        : "Tra cứu lỗi"}
                    </button>
                    <button
                      onClick={openAiChat}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#00285E] hover:brightness-110 active:scale-[0.97] transition-all"
                    >
                      <Sparkles size={13} />
                      Tham khảo AI
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {issueReportAssignment.symptom?.trim() ||
                    "Nhân viên chưa ghi mô tả lỗi."}
                </p>
              </div>

              {/* SECTION: Tiến độ công việc */}
              {(() => {
                const modalTasks = issueReportAssignment.tasks;
                const doneCount = modalTasks.filter(
                  (t) => t.status === "COMPLETED" || t.status === "PENDING_QC",
                ).length;
                const overall =
                  modalTasks.length === 0
                    ? 0
                    : Math.round((doneCount / modalTasks.length) * 100);
                return (
                  <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
                    {/* Tiến độ tổng */}
                    <div className="px-4 py-4 border-b border-slate-100">
                      <div className="flex items-baseline justify-between gap-4 mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Tiến độ công việc
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs text-slate-400 font-medium">
                            {doneCount}/{modalTasks.length} công việc
                          </span>
                          <span className="text-xl font-bold text-[#00285E] tabular-nums leading-none">
                            {overall}%
                          </span>
                        </div>
                      </div>
                      <div className="relative h-2.5 w-full rounded-full bg-slate-200/70 overflow-hidden">
                        {/* Shimmer nền chạy khi chưa hoàn tất, để thanh đỡ trống */}
                        {overall < 100 && (
                          <div className="absolute inset-0 progress-shimmer" />
                        )}
                        <div
                          className={`relative h-full rounded-full bg-[#00285E] transition-all duration-700 ease-out ${
                            overall > 0 && overall < 100 ? "progress-stripes" : ""
                          }`}
                          style={{ width: `${overall}%` }}
                        />
                      </div>
                    </div>

                    {/* Danh sách công việc + nút hoàn thành */}
                    <div className="p-3 space-y-2.5 bg-slate-50/60">
                      {modalTasks.map((t, taskIndex) => {
                        // KTV đã báo xong task REPAIR, đang chờ KTV trưởng nghiệm thu — không còn
                        // thao tác gì, nhưng cũng chưa phải "Hoàn thành" nên tách badge riêng.
                        const isAwaitingQc = t.status === "PENDING_QC";
                        const isDone =
                          t.status === "COMPLETED" ||
                          t.status === "PENDING_QC";
                        const isPaused = t.status === "PAUSED";
                        const isWaitingStock = t.status === "WAITING_STOCK";
                        const isPending = t.status === "PENDING";
                        const receivedPartCount =
                          t.spareParts?.filter((part) =>
                            RECEIVED_PART_STATUSES.includes(part.status ?? ""),
                          ).length ?? 0;
                        const taskStatusLabel = isAwaitingQc
                          ? "Chờ nghiệm thu"
                          : isDone
                          ? "Đã xong"
                          : isWaitingStock
                            ? "Chờ phụ tùng"
                          : isPaused
                            ? "Tạm dừng"
                          : isPending
                            ? "Chưa bắt đầu"
                            : "Đang thực hiện";
                        return (
                          <div
                            key={t.taskId}
                            className="rounded-xl border border-slate-200/70 bg-white px-4 py-3.5"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-800 truncate">
                                  <span className="text-slate-400 font-bold mr-1.5">
                                    {taskIndex + 1}.
                                  </span>
                                  {t.serviceName}
                                </p>
                                {t.repairIssue ? (
                                  <div className="mt-1.5 inline-flex max-w-full rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                    <span className="truncate">
                                      Vấn đề đang sửa: {t.repairIssue}
                                    </span>
                                  </div>
                                ) : null}
                                {t.qcRejectionReason ? (
                                  <div className="mt-1.5 flex max-w-full items-start gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700">
                                    <AlertCircle size={12} className="mt-0.5 shrink-0" />
                                    <span>
                                      Nghiệm thu chưa đạt, cần sửa lại: {t.qcRejectionReason}
                                    </span>
                                  </div>
                                ) : null}
                                {t.spareParts?.length ? (
                                  <div className="mt-1.5 flex max-w-full items-start gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-xs text-blue-700">
                                    <Package
                                      size={12}
                                      className="mt-0.5 shrink-0"
                                    />
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="font-semibold">
                                          Phụ tùng:
                                        </span>
                                        <span className="ml-auto rounded-full border border-blue-100 bg-white px-2 py-0.5 text-[10px] font-bold text-[#00285E]">
                                          Đã nhận {receivedPartCount}/
                                          {t.spareParts.length}
                                        </span>
                                      </div>
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {t.spareParts.map((part) => {
                                          const partStatus =
                                            getPartStatusConfig(part.status);

                                          return (
                                            <span
                                              key={`${part.name}-${part.sku ?? ""}`}
                                              className="inline-flex flex-wrap items-center gap-1.5 rounded-md border border-blue-100 bg-white px-2 py-1 font-medium"
                                            >
                                              <span>
                                                {part.isCustom ? (
                                                  <span className="font-bold text-blue-600">
                                                    (Đặt riêng){" "}
                                                  </span>
                                                ) : null}
                                                {part.name}
                                                {part.sku
                                                  ? ` (${part.sku})`
                                                  : ""}{" "}
                                                - <strong>x{part.quantity ?? 1}</strong>
                                              </span>
                                              <span
                                                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${partStatus.className}`}
                                              >
                                                {partStatus.label}
                                              </span>
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                ) : null}
                                <div className="flex items-center gap-2 mt-0.5">
                                  {t.estimatedDuration ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                      <Clock size={10} />
                                      Ước tính: {t.estimatedDuration} phút
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              <div className="flex flex-col items-start sm:items-end gap-1.5">
                                {isAwaitingQc ? (
                                  <span className="inline-flex self-start sm:self-auto items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200">
                                    <Eye size={13} />
                                    Chờ nghiệm thu
                                  </span>
                                ) : isDone ? (
                                  <span className="inline-flex self-start sm:self-auto items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200">
                                    <CheckCircle2 size={13} />
                                    Hoàn thành
                                  </span>
                                ) : isPending && t.taskAssignmentId ? (
                                  <button
                                    onClick={() => void handleStartSingleTask(t.taskAssignmentId!)}
                                    disabled={startingTaskAssignmentId === t.taskAssignmentId}
                                    className="inline-flex self-start sm:self-auto items-center gap-1.5 px-2.5 py-2 sm:py-1 rounded-lg text-xs font-bold text-white bg-[#00285E] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
                                  >
                                    {startingTaskAssignmentId === t.taskAssignmentId ? (
                                      <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                      <PlayCircle size={13} />
                                    )}
                                    Bắt đầu
                                  </button>
                                ) : !isPaused && !isWaitingStock && t.taskAssignmentId ? (
                                  <button
                                    onClick={() => void handleCompleteSingleTask(t.taskAssignmentId!)}
                                    disabled={completingTaskAssignmentId === t.taskAssignmentId}
                                    className="inline-flex self-start sm:self-auto items-center gap-1.5 px-2.5 py-2 sm:py-1 rounded-lg text-xs font-bold text-white bg-[#00285E] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
                                  >
                                    {completingTaskAssignmentId === t.taskAssignmentId ? (
                                      <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                      <CheckCircle2 size={13} />
                                    )}
                                    Đã hoàn tất
                                  </button>
                                ) : (
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-2 sm:py-1 rounded-lg text-xs font-bold border self-start sm:self-auto ${
                                      isWaitingStock
                                        ? "text-orange-700 bg-orange-50 border-orange-200"
                                        : isPaused
                                        ? "text-amber-700 bg-amber-50 border-amber-200"
                                        : isPending
                                        ? "text-slate-500 bg-slate-100 border-slate-200"
                                        : "text-blue-700 bg-blue-50 border-blue-200"
                                    }`}
                                  >
                                    <Clock size={13} />
                                    {taskStatusLabel}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* FOOTER: Yêu cầu xuất kho chung cho cả đơn — chỉ hiện sau khi KTV đã bấm "Bắt
                đầu" ít nhất 1 Task (không còn PENDING), tránh yêu cầu xuất kho cho Task còn
                chưa ai động vào. */}
            {issueReportAssignment.tasks.some(
              (t) =>
                t.status !== "COMPLETED" &&
                t.status !== "PENDING_QC" &&
                t.status !== "PENDING" &&
                (t.spareParts?.some((part) => part.status === "PENDING") ?? false),
            ) ? (
              <div className="flex items-center justify-end px-4 sm:px-7 py-3.5 border-t border-slate-100 shrink-0 bg-white">
                <button
                  onClick={() => void handleRequestPartsExport(issueReportAssignment.serviceOrderId)}
                  disabled={requestingExportServiceOrderId === issueReportAssignment.serviceOrderId}
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-lg text-xs font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                  style={{ backgroundColor: "#00285E" }}
                >
                  {requestingExportServiceOrderId === issueReportAssignment.serviceOrderId ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Send size={13} />
                  )}
                  Yêu cầu xuất kho
                </button>
              </div>
            ) : null}

          </div>
        </div>
      )}

      {/* MODAL TRA CỨU LỖI */}
      {lookupOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            onClick={() => setLookupOpen(false)}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
<div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5">            <div
              className="flex items-center justify-between px-4 sm:px-6 py-4 shrink-0"
              style={{ backgroundColor: "#00285E" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center">
                  <Search size={16} />
                </div>
                <h3 className="text-base font-bold text-white leading-tight">
                  Lỗi đã gặp tại garage
                </h3>
              </div>
              <button
                onClick={() => setLookupOpen(false)}
                className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-4 sm:px-6 py-4 border-b border-slate-100 shrink-0 space-y-3">
              {/* Ô search + nút Hỏi AI */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    autoFocus
                    value={lookupTerm}
                  onChange={(e) => {
                      const value = e.target.value;
                      setLookupTerm(value);
                      if (value.trim() === "") {
                        loadAllInspectionDiagnostics();
                        return;
                      }
                      searchInspectionDiagnostics(value);
                    }}
                    placeholder="Nhập lỗi hoặc nguyên nhân đã gặp tại garage..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors"
                  />
                </div>
               <button
                type="button"
                onClick={() => setShowFilterPanel((v) => !v)}
                title="Bộ lọc hãng xe / dòng xe"
                className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-xl text-sm font-semibold text-[#00285E] border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.97] transition-all"
              >
                <Filter size={15} />
              </button>
              </div>

                         {showFilterPanel && (
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <select
                      value={diagMakeId}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : "";
                        setDiagMakeId(val);
                        setDiagModelId("");
                        setDiagModels([]);
                        if (val) {
                          loadModels(val);
                          filterInspectionDiagnostics(val, undefined);
                        } else {
                          loadAllInspectionDiagnostics();
                        }
                      }}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#00285E] transition-colors"
                    >
                      <option value="">Tất cả hãng xe</option>
                      {diagMakes.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.make_name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={diagModelId}
                      disabled={!diagMakeId}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : "";
                        setDiagModelId(val);
                        const makeId = diagMakeId
                          ? Number(diagMakeId)
                          : undefined;
                        const modelId = val ? Number(val) : undefined;
                        filterInspectionDiagnostics(makeId, modelId);
                      }}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#00285E] transition-colors disabled:opacity-50"
                    >
                      <option value="">Tất cả dòng xe</option>
                      {diagModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.model_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              </div>
            <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-5 space-y-4 bg-slate-50/50">
             <div className="overflow-x-auto overflow-hidden rounded-2xl border border-slate-200 bg-white">
  <div className="grid grid-cols-[36px_1fr_1fr_1fr] sm:grid-cols-[56px_1.2fr_1.3fr_1fr] border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-widest text-slate-400">
    <div className="px-2 sm:px-3 py-2.5">STT</div>
    <div className="px-2 sm:px-3 py-2.5">Lỗi đã gặp</div>
    <div className="px-2 sm:px-3 py-2.5">Nguyên nhân</div>
    <div className="px-2 sm:px-3 py-2.5">Thuộc đơn</div>
  </div>

  {lookupRows.map((row, index) => (
    <div
      key={row.id}
      className="grid grid-cols-[36px_1fr_1fr_1fr] sm:grid-cols-[56px_1.2fr_1.3fr_1fr] border-b border-slate-100 last:border-b-0"
    >
      <div className="px-2 sm:px-3 py-3 text-xs sm:text-sm font-semibold text-slate-500">
        {index + 1}
      </div>
      <div className="px-2 sm:px-3 py-3 text-xs sm:text-sm text-slate-700 font-semibold">
        {row.issue}
      </div>
      <div className="px-2 sm:px-3 py-3 text-xs sm:text-sm text-slate-600 whitespace-pre-line leading-relaxed">
        {row.cause}
      </div>
      <div className="px-2 sm:px-3 py-3 text-xs sm:text-sm text-slate-600">
        <p className="font-semibold text-slate-700">
          {row.customerName || "Khách vãng lai"}
        </p>
        <p className="text-slate-400">{row.vehicleLabel || "—"}</p>
      </div>
    </div>
  ))}
</div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHAT THAM KHẢO AI */}
      {aiChatOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            onClick={() => setAiChatOpen(false)}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg h-[85vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5">
            {/* Header */}
            <div
              className="flex items-center justify-between gap-2 px-4 sm:px-6 py-4 shrink-0"
              style={{ backgroundColor: "#00285E" }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 shrink-0 rounded-xl bg-white/10 text-white flex items-center justify-center">
                  <Sparkles size={16} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white leading-tight">
                    Tham khảo AI
                  </h3>
                  <span className="block truncate text-xs font-semibold text-white/60">
                    {issueReportAssignment?.vehicleModel || "Chẩn đoán ô tô"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setAiChatOpen(false)}
                className="shrink-0 p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Khung hội thoại */}
            <div className="overflow-y-auto flex-1 px-4 py-4 space-y-3 bg-slate-50/50">
              {aiMessages.length === 0 && !isAiLoading && (
                <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-10">
                  <div className="w-12 h-12 rounded-2xl bg-[#00285E]/10 text-[#00285E] flex items-center justify-center">
                    <Sparkles size={20} />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">
                    Nhập câu hỏi bên dưới để AI tư vấn nguyên nhân và cách xử lý
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Nội dung đã điền sẵn theo lỗi/triệu chứng của công việc này — bạn có thể sửa lại rồi gửi.
                  </p>
                </div>
              )}
              {aiMessages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-md bg-[#00285E] text-white px-3.5 py-2.5 text-sm">
                      {m.text}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex justify-start">
                    <div className="max-w-[90%] w-full rounded-2xl rounded-bl-md bg-white border border-slate-200 px-3.5 py-3 space-y-2">
                      <AiFormattedText text={m.text} />
                      {m.disclaimer && (
                        <p className="text-[11px] text-slate-400 italic pt-2 border-t border-slate-100">
                          {m.disclaimer}
                        </p>
                      )}
                    </div>
                  </div>
                ),
              )}
              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-white border border-slate-200 px-4 py-3">
                    <span className="inline-flex items-center gap-2 text-sm text-slate-400">
                      <Loader2 size={14} className="animate-spin" />
                      AI đang phân tích...
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Ô nhập để hỏi thêm */}
            <div className="px-4 py-3 border-t border-slate-200 shrink-0 bg-white">
              <div className="flex items-end gap-2">
                <textarea
                  rows={1}
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendAiFollowUp();
                    }
                  }}
                  placeholder="Hỏi thêm AI..."
                  className="flex-1 max-h-28 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors"
                />
                <button
                  onClick={sendAiFollowUp}
                  disabled={!aiInput.trim() || isAiLoading || !aiTaskAssignmentId}
                  className="h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-xl text-white bg-[#00285E] hover:brightness-110 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isAiLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TRA CỨU KINH NGHIỆM SỬA LỖI (task REPAIR) */}
      {repairLookupOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            onClick={() => setRepairLookupOpen(false)}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5">
            <div
              className="flex items-center justify-between px-4 sm:px-6 py-4 shrink-0"
              style={{ backgroundColor: "#00285E" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center">
                  <Wrench size={16} />
                </div>
                <h3 className="text-base font-bold text-white leading-tight">
                  Tra cứu kinh nghiệm sửa lỗi
                </h3>
              </div>
              <button
                onClick={() => setRepairLookupOpen(false)}
                className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-4 sm:px-6 py-4 border-b border-slate-100 shrink-0 space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    autoFocus
                    value={repairLookupTerm}
                    onChange={(e) => {
                      const value = e.target.value;
                      setRepairLookupTerm(value);
                      if (value.trim() === "") {
                        loadAllInspectionHistory();
                      } else {
                        searchInspectionHistory(value);
                      }
                    }}
                    placeholder="Nhập lỗi, bộ phận cần tra cứu kinh nghiệm sửa..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowRepairFilter((v) => !v)}
                  title="Bộ lọc hãng xe / dòng xe"
                  className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-xl text-sm font-semibold text-[#00285E] border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.97] transition-all"
                >
                  <Filter size={15} />
                </button>
              </div>

              {showRepairFilter && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <select
                    value={repairMakeId}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : "";
                      setRepairMakeId(val);
                      setRepairModelId("");
                      setRepairModels([]);
                      if (val) {
                        loadModelsForRepair(val);
                        filterInspectionHistory(val, undefined);
                      } else {
                        loadAllInspectionHistory();
                      }
                    }}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#00285E] transition-colors"
                  >
                    <option value="">Tất cả hãng xe</option>
                    {diagMakes.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.make_name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={repairModelId}
                    disabled={!repairMakeId}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : "";
                      setRepairModelId(val);
                      filterInspectionHistory(
                        repairMakeId ? Number(repairMakeId) : undefined,
                        val ? Number(val) : undefined,
                      );
                    }}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#00285E] transition-colors disabled:opacity-50"
                  >
                    <option value="">Tất cả dòng xe</option>
                    {repairModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.model_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-5 bg-slate-50/50">
              {isRepairLoading ? (
                <div className="py-12 text-center">
                  <span className="inline-flex items-center gap-2 text-slate-400 text-sm">
                    <Loader2 size={16} className="animate-spin" />
                    Đang tải dữ liệu...
                  </span>
                </div>
              ) : inspectionHistory.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
                  <p className="text-sm text-slate-400">
                    Không tìm thấy kinh nghiệm sửa lỗi phù hợp.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="w-16 px-4 py-3 text-center">STT</th>
                        <th className="w-1/3 px-4 py-3">Nội dung</th>
                        <th className="px-4 py-3">Kinh nghiệm</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {repairHistoryRows.map((row, index) => (
                        <tr
                          key={row.key}
                          className="align-top hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="px-4 py-4 text-center font-semibold text-slate-500">
                            {index + 1}
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-slate-800">
                              {row.serviceName}
                            </p>
                            {row.issueText && (
                              <p className="mt-1 text-xs text-slate-500">
                                {row.issueText}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-pre-line leading-relaxed text-slate-600">
                            {row.guide}
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
      )}

    </div>
  );
}

// Tiêu đề nhóm (vd "Nguyên nhân khả dĩ:") do formatAiCausesResponse/formatAiRepairStepsResponse
// ở BE luôn kết thúc bằng dấu ":" và không đứng đầu bằng số thứ tự hay gạch đầu dòng — dùng đặc
// điểm đó để tách tiêu đề khỏi nội dung mà không cần đổi shape response.
function AiFormattedText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, idx) => {
        if (!line.trim()) return null;
        const isTitle = /:$/.test(line.trim()) && !/^[-\d]/.test(line.trim());
        if (isTitle) {
          return (
            <div
              key={idx}
              className="px-3 py-1.5 rounded-lg bg-[#00285E] text-white text-xs font-bold uppercase tracking-wide"
            >
              {line.trim().replace(/:$/, "")}
            </div>
          );
        }
        return (
          <p key={idx} className="text-sm text-slate-700 leading-relaxed pl-1">
            {line}
          </p>
        );
      })}
    </div>
  );
}
