import { useState, useMemo, useEffect } from "react";
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
import { useNavigate, useOutletContext } from "react-router-dom";
import { useFetchClient_v2 as useFetchClient } from "../../../hook/useFetchClient";
import { useSocket } from "../../../hook/useSocket";
import { TASK_ASSIGNMENT_ENDPOINTS } from "../../../constants/technician/taskAssignmentEndpoint";
import type {
  DiagnosticKnowledge,
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
    label: "Chờ QC",
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
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupView, setLookupView] = useState<"common" | "garage">("common");
  const [lookupTerm, setLookupTerm] = useState("");
  const [diagnostics, setDiagnostics] = useState<DiagnosticKnowledge[]>([]);
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
    if (lookupView === "common") {
      return diagnostics.map((item) => ({
        id: `common-${item.id}`,
        issue: item.symptom || "—",
        cause: item.possible_causes || "—",
      }));
    }
    return inspectionDiagnostics.map((item) => {
      const componentName = item.component?.name?.trim() ?? "";
      const errorDescription = item.error_description?.trim() ?? "";
      return {
        id: `garage-${item.id}`,
        issue: item.task?.serviceOrder?.symptoms?.trim() || "—",
        cause:
          componentName && errorDescription
            ? `${componentName} - ${errorDescription}`
            : componentName || errorDescription || "—",
      };
    });
  }, [diagnostics, inspectionDiagnostics, lookupView]);

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
            // WAITING_STOCK cũng cho bấm lại "Bắt đầu công việc", nhưng CHỈ khi task đó còn
            // dòng phụ tùng ở PENDING (đã nhập kho/cọc xong nhưng CHƯA từng được request xuất
            // kho) — bấm "Bắt đầu" lúc đó mới có tác dụng thật (gửi yêu cầu xuất kho qua
            // autoRequestPartsForTask). Nếu phụ tùng đã REQUESTED (đang chờ thủ kho duyệt)
            // thì task đang WAITING_STOCK vì lý do khác, không liên quan gì tới KTV nữa —
            // không được hiện nút, bấm vào cũng không có tác dụng gì.
            const hasPendingPartToRequest = (task: ServiceTaskApi) => {
              const details = task.quotationItem?.issue?.quotationDetails;
              if (details && details.length > 0) {
                return details.some((d) => d.status === "PENDING");
              }
              return task.quotationItem?.status === "PENDING";
            };
            const unstartedAssignment = allAssignments.find((item) => {
              if (item.status === "ASSIGNED") return true;
              if (item.status !== "WAITING_STOCK") return false;
              const parentTask = so.tasks?.find((t) =>
                t.assignments?.some((a) => a.id === item.id),
              );
              return parentTask ? hasPendingPartToRequest(parentTask) : false;
            });
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
            const status: Assignment["status"] = allTasksCompleted
              ? "COMPLETED"
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
                      detail.custom_item_name ||
                      "",
                    sku: detail.sparePart?.sku ?? undefined,
                    quantity: detail.quantity ?? 0,
                    isCustom: Boolean(detail.custom_item_name),
                    status: detail.status ?? undefined,
                  }))
                  .filter(
                    (part, index, list) =>
                      part.name &&
                      list.findIndex(
                        (item) =>
                          item.name === part.name && item.sku === part.sku,
                      ) === index,
                  );
                const taskStatus =
                  t.status === "WAITING_STOCK" ||
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

  useEffect(() => {
    if (!issueReportAssignment) return;
    const refreshed = assignments.find(
      (a) => a.serviceOrderId === issueReportAssignment.serviceOrderId,
    );
    if (refreshed && refreshed !== issueReportAssignment) {
      setIssueReportAssignment(refreshed);
    }
  }, [assignments, issueReportAssignment]);

  const handleStartTask = async (asg: Assignment) => {
    if (!asg.taskAssignmentId) {
      alert("Không tìm thấy thông tin phân công.");
      return;
    }
    try {
      await fetchPrivate(TASK_ASSIGNMENT_ENDPOINTS.START_TASK, "PUT", {
        taskAssignmentId: asg.taskAssignmentId,
      });
      const startedAssignment: Assignment = {
        ...asg,
        status: "IN_PROGRESS",
        hasUnstartedTasks: false,
        tasks: asg.tasks.map((task) => {
          if (
            task.status === "COMPLETED" ||
            task.status === "PAUSED" ||
            task.status === "IN_PROGRESS" ||
            task.status === "WAITING_STOCK"
          ) {
            return task;
          }

          return {
            ...task,
            status: task.spareParts?.length
              ? "WAITING_STOCK"
              : "IN_PROGRESS",
          };
        }),
      };
      setAssignments((current) =>
        current.map((item) =>
          item.id === asg.id ? startedAssignment : item,
        ),
      );
      // Mở modal bằng trạng thái mới, đồng thời refetch để đồng bộ dữ liệu từ BE.
      openIssueReportModal(startedAssignment);
      setRefreshKey((prev) => prev + 1);
    } catch (error: unknown) {
      console.error("Lỗi khi bắt đầu công việc:", error);
      alert(getErrorMessage(error, "Đã xảy ra lỗi khi bắt đầu công việc."));
    }
  };

  // ===== Tra cứu chẩn đoán =====

  // Mở modal tra cứu: điền sẵn symptom của đơn, tự tìm nếu có; nếu trống thì
  // load toàn bộ lỗi. Luôn load danh sách hãng xe cho filter.
  const openLookup = () => {
    const symptom = issueReportAssignment?.symptom?.trim() ?? "";
    setLookupView("common");
    setLookupTerm(symptom);
    setDiagMakeId("");
    setDiagModelId("");
    setLookupOpen(true);
    if (symptom) {
      searchDiagnostics(symptom);
    } else {
      loadAllDiagnostics();
    }
    loadMakes();
  };

  const loadAllDiagnostics = async () => {
    setIsDiagLoading(true);
    try {
      const result = await fetchPrivate<DiagnosticKnowledge[]>(
        TASK_ASSIGNMENT_ENDPOINTS.GET_ALL_DIAGNOSTICS,
        "GET",
      );
      setDiagnostics(result.data ?? []);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách chẩn đoán", error);
    } finally {
      setIsDiagLoading(false);
    }
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

  const searchDiagnostics = async (keyword: string) => {
    setIsDiagLoading(true);
    try {
      const result = await fetchPrivate<DiagnosticKnowledge[]>(
        TASK_ASSIGNMENT_ENDPOINTS.SEARCH_DIAGNOSTICS(keyword),
        "GET",
      );
      setDiagnostics(result.data ?? []);
    } catch (error) {
      console.error("Lỗi khi tìm kiếm chẩn đoán", error);
    } finally {
      setIsDiagLoading(false);
    }
  };

  const filterDiagnostics = async (makeId?: number, modelId?: number) => {
    setIsDiagLoading(true);
    try {
      const result = await fetchPrivate<DiagnosticKnowledge[]>(
        TASK_ASSIGNMENT_ENDPOINTS.FILTER_DIAGNOSTICS({ makeId, modelId }),
        "GET",
      );
      setDiagnostics(result.data ?? []);
    } catch (error) {
      console.error("Lỗi khi lọc chẩn đoán", error);
    } finally {
      setIsDiagLoading(false);
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

  // Đổi tab vẫn giữ nguyên triệu chứng gốc của đơn (nếu có) và tự tìm lại theo triệu chứng đó
  // trên tab mới — tránh việc tab "garage" luôn load toàn bộ không liên quan như trước đây.
  const changeLookupView = (view: "common" | "garage") => {
    const symptom = issueReportAssignment?.symptom?.trim() ?? "";
    setLookupView(view);
    setLookupTerm(symptom);
    setDiagMakeId("");
    setDiagModelId("");
    setDiagModels([]);
    setShowFilterPanel(false);
    if (view === "common") {
      if (symptom) searchDiagnostics(symptom);
      else loadAllDiagnostics();
    } else {
      if (symptom) searchInspectionDiagnostics(symptom);
      else loadAllInspectionDiagnostics();
    }
  };

  // Mở khung chat AI — AI tự lấy triệu chứng từ công việc đang xem, KTV không cần gõ tay.
  // Hiện luôn triệu chứng đã lấy được (như tin nhắn hỏi) trước khi chờ AI trả lời, để KTV
  // biết rõ AI đang phân tích dựa trên nội dung gì.
  const openAiChat = async () => {
    const assignment = issueReportAssignment;
    const symptom = assignment?.symptom?.trim();
    setAiChatOpen(true);
    setAiInput("");
    setAiTaskAssignmentId(null);
    if (!assignment) {
      setAiMessages([]);
      return;
    }
    if (symptom) {
      setAiMessages([{ role: "user", text: symptom }]);
    } else {
      setAiMessages([]);
    }
    const targetTask =
      assignment.taskType === "REPAIR"
        ? (assignment.tasks.find(
            (t) => t.taskType === "REPAIR" && t.status === "IN_PROGRESS",
          ) ?? assignment.tasks.find((t) => t.taskType === "REPAIR"))
        : (assignment.tasks.find((t) => t.taskType === "INSPECTION") ??
          assignment.tasks[0]);
    if (!targetTask?.taskAssignmentId) {
      setAiMessages((prev) => [
        ...prev,
        { role: "ai", text: "Không tìm thấy thông tin phân công của công việc này." },
      ]);
      return;
    }
    setAiTaskAssignmentId(targetTask.taskAssignmentId);
    setIsAiLoading(true);
    try {
      const payload: AiSuggestCausesRequest = {
        taskAssignmentId: targetTask.taskAssignmentId,
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

  // KTV hỏi thêm sau câu trả lời đầu tiên (vd làm rõ, hỏi cách kiểm tra) — không cần gõ lại
  // triệu chứng, BE vẫn dùng đúng symptom gốc + ghép thêm câu hỏi này vào prompt.
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
          className="mt-0.5 w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#00285E] hover:border-slate-300 active:scale-[0.97] transition-all"
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
            color: "#00285E",
            bg: "#EDF3FF",
          },
          {
            label: "Mới phân công",
            value: kpiCounts.assigned,
            icon: <Clock size={22} />,
            color: "#D97706",
            bg: "#FEF3C7",
          },
          {
            label: "Đang thực hiện",
            value: kpiCounts.inProgress,
            icon: <CheckSquare size={22} />,
            color: "#3B82F6",
            bg: "#EFF6FF",
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
              <option value="PENDING_QC">Chờ QC</option>
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
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
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
                  const hasProgressTask = asg.tasks.some((task) =>
                    ["PENDING", "IN_PROGRESS", "PAUSED", "WAITING_STOCK"].includes(
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
                    {/* Danh sách công việc + nút hoàn thành */}
                    <div className="divide-y divide-slate-100">
                      {modalTasks.map((t) => {
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
                        const taskStatusLabel = isDone
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
                            className="px-4 py-4"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                  isDone
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-[#00285E] text-white"
                                }`}
                              >
                                <Wrench size={15} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-800 truncate">
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
                              {isDone ? (
                                <span className="inline-flex self-start sm:self-auto items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200">
                                  <CheckCircle2 size={13} />
                                  Hoàn thành
                                </span>
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
                        );
                      })}
                    </div>

                    {/* Tiến độ tổng */}
                    <div className="px-4 py-4 border-t border-slate-100">
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
                  </div>
                );
              })()}

            </div>

            {/* Footer */}
            {issueReportAssignment.hasUnstartedTasks ? (
              <div className="flex items-center justify-end gap-2 px-4 sm:px-7 py-4 border-t border-slate-200 shrink-0 bg-white">
                <button
                  onClick={() => handleStartTask(issueReportAssignment)}
                  className="h-9 flex items-center justify-center gap-1.5 px-4 rounded-lg text-xs font-bold text-white bg-[#00285E] shadow-sm hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  <PlayCircle size={13} />
                  Bắt đầu công việc
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
                  Tra cứu các lỗi thường gặp
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
              <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => changeLookupView("common")}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                    lookupView === "common"
                      ? "bg-white text-[#00285E] shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Các lỗi thường gặp
                </button>
                <button
                  type="button"
                  onClick={() => changeLookupView("garage")}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                    lookupView === "garage"
                      ? "bg-white text-[#00285E] shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Lỗi đã gặp tại garage
                </button>
              </div>

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
                        if (lookupView === "common") {
                          loadAllDiagnostics();
                        } else {
                          loadAllInspectionDiagnostics();
                        }
                        return;
                      }
                      if (lookupView === "common") {
                        searchDiagnostics(value);
                      } else {
                        searchInspectionDiagnostics(value);
                      }
                    }}
                    placeholder={
                      lookupView === "common"
                        ? "Nhập triệu chứng, nguyên nhân cần tra cứu..."
                        : "Nhập lỗi hoặc nguyên nhân đã gặp tại garage..."
                    }
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
                          if (lookupView === "common") {
                            filterDiagnostics(val, undefined);
                          } else {
                            filterInspectionDiagnostics(val, undefined);
                          }
                        } else {
                          if (lookupView === "common") {
                            loadAllDiagnostics();
                          } else {
                            loadAllInspectionDiagnostics();
                          }
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
                        if (lookupView === "common") {
                          filterDiagnostics(makeId, modelId);
                        } else {
                          filterInspectionDiagnostics(makeId, modelId);
                        }
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
  <div className="grid grid-cols-[36px_1fr_1fr] sm:grid-cols-[56px_1.4fr_1.6fr] border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-widest text-slate-400">
    <div className="px-2 sm:px-3 py-2.5">STT</div>
    <div className="px-2 sm:px-3 py-2.5">
      {lookupView === "common" ? "Các lỗi thường gặp" : "Lỗi đã gặp"}
    </div>
    <div className="px-2 sm:px-3 py-2.5">Nguyên nhân</div>
  </div>

  {lookupRows.map((row, index) => (
    <div
      key={row.id}
      className="grid grid-cols-[36px_1fr_1fr] sm:grid-cols-[56px_1.4fr_1.6fr] border-b border-slate-100 last:border-b-0"
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
              {aiMessages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-md bg-[#00285E] text-white px-3.5 py-2.5 text-sm">
                      {m.text}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white border border-slate-200 px-3.5 py-2.5">
                      <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                        {m.text}
                      </p>
                      {m.disclaimer && (
                        <p className="text-[11px] text-slate-400 italic mt-2 pt-2 border-t border-slate-100">
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
