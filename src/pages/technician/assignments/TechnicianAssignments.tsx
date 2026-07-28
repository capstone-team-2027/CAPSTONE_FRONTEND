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
  Calendar,
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
  Sparkles,
  Send,
} from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useFetchClient_v2 as useFetchClient } from "../../../hook/useFetchClient";
import { TASK_ASSIGNMENT_ENDPOINTS } from "../../../constants/technician/taskAssignmentEndpoint";
import type {
  CreateIssueReportRequest,
  GetComponentsResponse,
  DiagnosticKnowledge,
  VehicleMake,
  VehicleModel,
  AiSuggestCausesRequest,
  AiSuggestCausesResponse,
} from "../../../model/dto/taskAssignment.dto";

// ========== TYPES ==========
interface AssignmentTask {
  taskId: number;
  serviceName: string;
  repairIssue?: string;
  // Dùng cho modal tiến độ công việc
  taskAssignmentId?: number;
  status?: string;
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
  status: "ASSIGNED" | "IN_PROGRESS" | "PAUSED" | "PENDING_QC" | "COMPLETED";
  // Trạng thái của service order (khác assignment status) — quyết định luồng báo cáo
  orderStatus?: string;
  rejectedAt?: string;
  taskAssignmentId?: string | number;
  bookingType: string;
  // INSPECTION: kiểm tra rồi tạo báo cáo sự cố | REPAIR: sửa chữa, cập nhật tiến độ
  taskType?: string;
  // Mô tả lỗi khách báo lúc lễ tân tiếp nhận xe
  symptom?: string;
}

interface IssueChecklistItem {
  component_id: number;
  component_name: string;
  category: string;
  checked: boolean;
  description: string;
}

interface ApiEnvelope<T> {
  data: T;
}

interface TaskAssignmentApi {
  id: number;
  technician_id?: number;
  status?: string;
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
    issue?: {
      id?: number;
      error_description?: string | null;
      note?: string | null;
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

const ASSIGNMENT_STATUSES: Assignment["status"][] = [
  "ASSIGNED",
  "IN_PROGRESS",
  "PAUSED",
  "PENDING_QC",
  "COMPLETED",
];

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
    label: "Đã phân công",
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

// Mock assignments removed to use API data

const ITEMS_PER_PAGE = 5;

export default function TechnicianAssignments() {
  const navigate = useNavigate();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();
  const { fetchPrivate } = useFetchClient();
  const [components, setComponents] = useState<GetComponentsResponse[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [issueReportOpen, setIssueReportOpen] = useState(false);
  const [issueReportAssignment, setIssueReportAssignment] =
    useState<Assignment | null>(null);
  const [showIncidentIssueReport, setShowIncidentIssueReport] = useState(false);
  const [issueTaskId, setIssueTaskId] = useState<number | null>(null);
  const [issueChecklist, setIssueChecklist] = useState<IssueChecklistItem[]>(
    [],
  );
  const [issueNote, setIssueNote] = useState("");
  const [isSubmittingIssueReport, setIsSubmittingIssueReport] = useState(false);
  const [pickedCategories, setPickedCategories] = useState<string[]>([]);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [catSearch, setCatSearch] = useState("");
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
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState<
    { role: "user" | "ai"; text: string; disclaimer?: string }[]
  >([]);
  const [repairExperienceByTask, setRepairExperienceByTask] = useState<
    Record<number, string>
  >({});
  const [confirmTask, setConfirmTask] = useState<AssignmentTask | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);
  const [taskActionMenuId, setTaskActionMenuId] = useState<number | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const updateTaskStatusInModal = (
    task: AssignmentTask,
    status: AssignmentTask["status"],
  ) => {
    const updateTask = (item: AssignmentTask) =>
      item.taskId === task.taskId ? { ...item, status } : item;

    setIssueReportAssignment((prev) =>
      prev ? { ...prev, tasks: prev.tasks.map(updateTask) } : prev,
    );
    setAssignments((prev) =>
      prev.map((assignment) =>
        assignment.serviceOrderId === issueReportAssignment?.serviceOrderId
          ? { ...assignment, tasks: assignment.tasks.map(updateTask) }
          : assignment,
      ),
    );
  };

  const changeTaskRunningStatus = async (
    task: AssignmentTask,
    action: "pause" | "resume",
  ) => {
    if (!task.taskAssignmentId) {
      showToast("Không tìm thấy thông tin phân công của công việc này.", "warning");
      return;
    }

    setTaskActionMenuId(null);
    setCompletingTaskId(task.taskId);
    try {
      await fetchPrivate(
        action === "pause"
          ? TASK_ASSIGNMENT_ENDPOINTS.PAUSE_TASK
          : TASK_ASSIGNMENT_ENDPOINTS.RESUME_TASK,
        "PUT",
        {
          taskAssignmentId: task.taskAssignmentId,
          ...(action === "pause" ? { reason: null } : {}),
        },
      );
      updateTaskStatusInModal(task, action === "pause" ? "PAUSED" : "IN_PROGRESS");
      showToast(
        action === "pause"
          ? "Đã tạm dừng công việc."
          : "Đã tiếp tục công việc.",
        "success",
      );
      setRefreshKey((prev) => prev + 1);
    } catch (error: unknown) {
      console.error("Lỗi khi cập nhật trạng thái công việc:", error);
      showToast(
        getErrorMessage(error, "Đã xảy ra lỗi khi cập nhật trạng thái công việc."),
        "warning",
      );
    } finally {
      setCompletingTaskId(null);
    }
  };

  const completeTaskInModal = async (task: AssignmentTask) => {
    if (!task.taskAssignmentId) {
      showToast("Không tìm thấy thông tin phân công của công việc này.", "warning");
      return;
    }
    setConfirmTask(null);
    setTaskActionMenuId(null);
    setCompletingTaskId(task.taskId);
    try {
      await fetchPrivate(TASK_ASSIGNMENT_ENDPOINTS.COMPLETE_TASK, "PATCH", {
        taskAssignmentId: task.taskAssignmentId,
        content: repairExperienceByTask[task.taskId] ?? "",
      });
      const markDone = (t: AssignmentTask) =>
        t.taskId === task.taskId ? { ...t, status: "COMPLETED" } : t;
      // Danh sách task sau khi đánh dấu xong, để kiểm tra đã hết chưa
      const updatedTasks = (issueReportAssignment?.tasks ?? []).map(markDone);
      setIssueReportAssignment((prev) =>
        prev ? { ...prev, tasks: prev.tasks.map(markDone) } : prev,
      );
      setAssignments((prev) =>
        prev.map((a) =>
          a.serviceOrderId === issueReportAssignment?.serviceOrderId
            ? { ...a, tasks: a.tasks.map(markDone) }
            : a,
        ),
      );
      showToast("Đã hoàn thành công việc!", "success");
      // Xong hết mọi công việc -> đóng modal + refetch để lấy orderStatus mới
      // (BE chuyển order sang PENDING_QUOTATION / PENDING_FINAL_QC)
      const allDone = updatedTasks.every(
        (t) => t.status === "COMPLETED" || t.status === "PENDING_QC",
      );
      if (allDone) {
        setIssueReportOpen(false);
        setRefreshKey((prev) => prev + 1);
      }
    } catch (error: unknown) {
      console.error("Lỗi khi hoàn thành công việc:", error);
      showToast(
        getErrorMessage(
          error,
          "Đã xảy ra lỗi khi hoàn thành công việc.",
        ),
        "warning",
      );
    } finally {
      setCompletingTaskId(null);
    }
  };
  const openIssueReportModal = (assignment: Assignment) => {
    setIssueReportAssignment(assignment);
    setIssueTaskId(assignment.tasks[0]?.taskId ?? null);
    // Cha (parent_id null/0) = category, con (có parent_id) = item checkbox
    const categoryNameById = new Map(
      components
        .filter((c) => !c.parent_id)
        .map((c) => [c.id, c.name] as const),
    );
    setIssueChecklist(
      components
        .filter((c) => c.parent_id)
        .map((c) => ({
          component_id: c.id,
          component_name: c.name,
          category: categoryNameById.get(c.parent_id) ?? "Khác",
          checked: false,
          description: "",
        })),
    );
    setIssueNote("");
    setPickedCategories([]);
    setCatDropdownOpen(false);
    setCatSearch("");
    setLookupTerm("");
    setRepairExperienceByTask({});
    setShowIncidentIssueReport(false);
    setIssueReportOpen(true);
  };

  const toggleIssueChecklistItem = (componentId: number) =>
    setIssueChecklist((prev) =>
      prev.map((item) =>
        item.component_id === componentId
          ? { ...item, checked: !item.checked }
          : item,
      ),
    );

  const updateIssueChecklistDescription = (
    componentId: number,
    description: string,
  ) =>
    setIssueChecklist((prev) =>
      prev.map((item) =>
        item.component_id === componentId ? { ...item, description } : item,
      ),
    );

  const checkedIssueItems = issueChecklist.filter((item) => item.checked);

  const checklistByCategory = useMemo(() => {
    const groups: { category: string; items: IssueChecklistItem[] }[] = [];
    issueChecklist.forEach((item) => {
      let group = groups.find((g) => g.category === item.category);
      if (!group) {
        group = { category: item.category, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    });
    return groups;
  }, [issueChecklist]);

  // Thêm/bỏ 1 nhóm lỗi từ dropdown (cộng dồn danh sách bên dưới)
  const toggleCategory = (category: string) => {
    setPickedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  // Bỏ 1 nhóm + gỡ tích các lỗi thuộc nhóm đó
  const removeCategory = (category: string) => {
    setPickedCategories((prev) => prev.filter((c) => c !== category));
    setIssueChecklist((prev) =>
      prev.map((item) =>
        item.category === category
          ? { ...item, checked: false, description: "" }
          : item,
      ),
    );
  };

  // Nhóm hiện trong dropdown, lọc theo search (khớp tên nhóm hoặc tên lỗi con)
  const categoryOptions = useMemo(() => {
    const kw = catSearch.trim().toLowerCase();
    return checklistByCategory.filter((g) => {
      if (!kw) return true;
      return (
        g.category.toLowerCase().includes(kw) ||
        g.items.some((i) => i.component_name.toLowerCase().includes(kw))
      );
    });
  }, [checklistByCategory, catSearch]);

  // Các nhóm đã chọn, kèm item — để render list lỗi bên dưới
  const pickedGroups = useMemo(
    () =>
      checklistByCategory.filter((g) => pickedCategories.includes(g.category)),
    [checklistByCategory, pickedCategories],
  );

  const repairHistoryRows = useMemo(
    () =>
      inspectionHistory.flatMap((task) => {
        const content = task.catalog?.service_name || `Công việc #${task.id}`;
        if (!task.repairNotes?.length) {
          return [
            {
              key: `task-${task.id}-empty`,
              content,
              guide: "Chưa có hướng dẫn",
            },
          ];
        }
        return task.repairNotes.map((note) => ({
          key: `task-${task.id}-note-${note.id}`,
          content,
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
              allAssignments.find((item) => item.status === "ASSIGNED") ??
              allAssignments.find((item) => item.status === "PENDING_QC") ??
              allAssignments[0];

            let status: Assignment["status"] = "ASSIGNED";
            if (
              selectedAssignment?.status &&
              ASSIGNMENT_STATUSES.includes(
                selectedAssignment.status as Assignment["status"],
              )
            ) {
              status = selectedAssignment.status as Assignment["status"];
            }

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
                return {
                  taskId: t.id,
                  serviceName: t.catalog?.service_name || `Task #${t.id}`,
                  repairIssue: getRepairIssueText(t),
                  taskAssignmentId: taskAssignment?.id,
                  status: taskAssignment?.status ?? t.status,
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
              taskAssignmentId: selectedAssignment?.id,
              bookingType: so.appointment?.booking_type || "WALK_IN",
              taskType: so.tasks?.[0]?.type,
              symptom: so.symptoms ?? "",
            };
          });
          setAssignments(mappedData);
        }
      } catch (error) {
        console.error("Lỗi khi tải danh sách phân công:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssignments();
  }, [fetchPrivate, refreshKey]);

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
        tasks: asg.tasks.map((task) =>
          task.taskAssignmentId === asg.taskAssignmentId
            ? { ...task, status: "IN_PROGRESS" }
            : task,
        ),
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

  useEffect(() => {
    const handleGetComponent = async () => {
      try {
        const result = await fetchPrivate<
          ApiEnvelope<GetComponentsResponse[]>
        >(TASK_ASSIGNMENT_ENDPOINTS.GET_COMPONENTS, "GET");
        setComponents(result.data ?? []);
      } catch (error) {
        console.error("Lỗi khi lấy components", error);
      }
    };
    void handleGetComponent();
  }, [fetchPrivate]);

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

  const changeLookupView = (view: "common" | "garage") => {
    setLookupView(view);
    setLookupTerm("");
    setDiagMakeId("");
    setDiagModelId("");
    setDiagModels([]);
    setShowFilterPanel(false);
    if (view === "common") {
      loadAllDiagnostics();
    } else {
      loadAllInspectionDiagnostics();
    }
  };

  // Mở khung chat AI, điền sẵn symptom của đơn
  const openAiChat = () => {
    setAiMessages([]);
    setAiInput(issueReportAssignment?.symptom?.trim() ?? "");
    setAiChatOpen(true);
  };

  // ===== Tra cứu kinh nghiệm sửa lỗi (Inspection History) =====

  const openRepairLookup = () => {
    setRepairLookupTerm("");
    setRepairMakeId("");
    setRepairModelId("");
    setShowRepairFilter(false);
    setRepairLookupOpen(true);
    loadAllInspectionHistory();
    loadMakes();
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

  // Gửi 1 câu hỏi tới AI (mỗi lượt độc lập, không giữ context — khớp BE)
  const sendAiMessage = async () => {
    const symptom = aiInput.trim();
    if (!symptom || isAiLoading) return;
    setAiMessages((prev) => [...prev, { role: "user", text: symptom }]);
    setAiInput("");
    setIsAiLoading(true);
    try {
      const payload: AiSuggestCausesRequest = {
        symptom,
        modelName: issueReportAssignment?.vehicleModel || undefined,
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
        {
          role: "ai",
          text: getErrorMessage(error, "Không lấy được gợi ý từ AI."),
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };


  const handleCreateIssuesReport = async () => {
    if (!issueTaskId) {
      showToast("Không tìm thấy thông tin công việc.", "warning");
      return;
    }
    if (checkedIssueItems.length === 0) {
      showToast("Chọn ít nhất một hạng mục lỗi để báo cáo.", "warning");
      return;
    }
    const payload: CreateIssueReportRequest = {
      task_id: issueTaskId,
      issues: checkedIssueItems.map((item) => ({
        component_id: item.component_id,
        description: item.description,
      })),
      note: issueNote.trim() || undefined,
    };
    try {
      setIsSubmittingIssueReport(true);
      await fetchPrivate(
        TASK_ASSIGNMENT_ENDPOINTS.ISSUES_REPORT,
        "POST",
        payload,
      );
      // BE tự complete task + chuyển order sang PENDING_QUOTATION
      setShowIncidentIssueReport(false);
      setIssueReportOpen(false);
      showToast(
        issueReportAssignment?.taskType === "INSPECTION"
          ? "Đã hoàn tất kiểm tra và gửi báo cáo!"
          : "Đã gửi báo cáo lỗi phát sinh!",
        "success",
      );
      setRefreshKey((prev) => prev + 1);
    } catch (error: unknown) {
      console.error("Lỗi khi tạo báo cáo:", error);
      showToast(
        getErrorMessage(error, "Đã xảy ra lỗi khi tạo báo cáo."),
        "warning",
      );
    } finally {
      setIsSubmittingIssueReport(false);
    }
  };

  const handleCreateAdditionalIssuesReport = async () => {
    if (!issueTaskId) {
      showToast("Không tìm thấy thông tin công việc.", "warning");
      return;
    }
    if (checkedIssueItems.length === 0) {
      showToast("Chọn ít nhất một hạng mục lỗi phát sinh để báo cáo.", "warning");
      return;
    }
    const payload: CreateIssueReportRequest = {
      task_id: issueTaskId,
      issues: checkedIssueItems.map((item) => ({
        component_id: item.component_id,
        description: item.description,
      })),
      note: issueNote.trim() || undefined,
    };
    try {
      setIsSubmittingIssueReport(true);
      await fetchPrivate(
        TASK_ASSIGNMENT_ENDPOINTS.ADDITIONAL_ISSUES_REPORT,
        "POST",
        payload,
      );
      setShowIncidentIssueReport(false);
      showToast("Đã gửi báo cáo lỗi phát sinh!", "success");
      setRefreshKey((prev) => prev + 1);
    } catch (error: unknown) {
      console.error("Lỗi khi tạo báo cáo lỗi phát sinh:", error);
      showToast(
        getErrorMessage(
          error,
          "Đã xảy ra lỗi khi tạo báo cáo lỗi phát sinh.",
        ),
        "warning",
      );
    } finally {
      setIsSubmittingIssueReport(false);
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

      const matchStatus = statusFilter === "all" || asg.status === statusFilter;

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
      assigned: assignments.filter((a) => a.status === "ASSIGNED").length,
      inProgress: assignments.filter((a) => a.status === "IN_PROGRESS").length,
      completed: assignments.filter((a) => a.status === "COMPLETED").length,
    }),
    [assignments],
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
            <CheckSquare className="text-[#F9A11B]" size={28} />
            Quản lý phân công
          </h1>
          <p className="text-slate-500 text-sm">
            Xem và quản lý trạng thái phân công công việc sửa chữa.
          </p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          {
            label: "Hoàn thành",
            value: kpiCounts.completed,
            icon: <CheckCircle2 size={22} />,
            color: "#10B981",
            bg: "#ECFDF5",
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
              <option value="PENDING_QC">Chờ QC</option>
              <option value="COMPLETED">Hoàn thành</option>
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
            <table className="w-full min-w-[1100px] text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th className="py-3 px-4 align-middle whitespace-nowrap">
                    Mã
                  </th>
                  <th className="py-3 px-4 align-middle whitespace-nowrap">
                    Khách hàng
                  </th>
                  <th className="py-3 px-4 align-middle whitespace-nowrap">
                    Xe
                  </th>
                  <th className="py-3 px-4 align-middle whitespace-nowrap">
                    Dịch vụ
                  </th>
                  <th className="py-3 px-4 align-middle whitespace-nowrap">
                    Lịch hẹn
                  </th>
                  <th className="py-3 px-4 align-middle whitespace-nowrap">
                    Ngày phân công
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
                  const statusCfg = ASSIGNMENT_STATUS_CONFIG[asg.status];
                  const StatusIcon = statusCfg.icon;
                  return (
                    <tr
                      key={asg.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <span className="font-bold text-[#00285E] text-xs">
                          {asg.id}
                        </span>
                      </td>
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
                      <td className="py-4 px-4 align-middle">
                        <div className="flex flex-wrap gap-1 min-w-[160px] max-w-[220px]">
                          {asg.services.length > 0 ? (
                            asg.services.map((svc, i) => (
                              <span
                                key={i}
                                className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-600 font-medium"
                              >
                                {svc}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              —
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar
                            size={11}
                            className="text-slate-400 shrink-0"
                          />
                          <div>
                            <p className="text-xs text-slate-700 font-semibold">
                              {formatDate(asg.appointmentDate)}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {asg.appointmentTime}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <span className="text-xs text-slate-600 font-medium">
                          {formatDateTime(asg.assignedAt)}
                        </span>
                      </td>
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusCfg.className}`}
                        >
                          <StatusIcon size={12} className="shrink-0" />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 align-middle">
                        <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                          {asg.status === "ASSIGNED" ? (
                            <button
                              onClick={() => handleStartTask(asg)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#00285E] bg-[#EDF3FF] hover:bg-[#DCE8FF] transition-colors"
                            >
                              <PlayCircle size={13} />
                              Bắt đầu làm
                            </button>
                          ) : asg.orderStatus === "PENDING_QUOTATION" ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200">
                              <CheckCircle2 size={13} />
                              Đã báo cáo
                            </span>
                          ) : asg.status === "IN_PROGRESS" ? (
                            <button
                              onClick={() => openIssueReportModal(asg)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#00285E] bg-[#EDF3FF] hover:bg-[#DCE8FF] transition-colors"
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
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
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
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-400">
              Hiển thị {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(
                currentPage * ITEMS_PER_PAGE,
                filteredAssignments.length,
              )}{" "}
              / {filteredAssignments.length} phân công
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
                  <Wrench size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white leading-none">
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

            <div className="overflow-y-auto flex-1 px-7 py-6 space-y-6 bg-slate-50/50">
              {/* SECTION: Thông tin khách hàng & xe */}
              <div className="grid grid-cols-2 gap-3">
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
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-1.5">
                    <ClipboardList size={13} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Mô tả lỗi tiếp nhận từ nhân viên
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
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
                    <div className="divide-y divide-slate-100">
                      {modalTasks.map((t) => {
                        const isDone =
                          t.status === "COMPLETED" ||
                          t.status === "PENDING_QC";
                        const isPaused = t.status === "PAUSED";
                        const isSending = completingTaskId === t.taskId;
                        const taskStatusLabel = isDone
                          ? "Đã xong"
                          : isPaused
                            ? "Tạm dừng"
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
                                    : "bg-[#EDF3FF] text-[#00285E]"
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
                              ) : issueReportAssignment.taskType ===
                                "INSPECTION" ? (
                                // Task kiểm tra: hoàn tất bằng cách gửi báo cáo lỗi bên dưới
                                <span className="inline-flex self-start sm:self-auto items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200">
                                  Đang kiểm tra
                                </span>
                              ) : (
                                <div className="relative self-start sm:self-auto">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setTaskActionMenuId((current) =>
                                        current === t.taskId ? null : t.taskId,
                                      )
                                    }
                                    disabled={isSending}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                      isPaused
                                        ? "text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100"
                                        : "text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100"
                                    }`}
                                  >
                                    {isSending ? (
                                      <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                      <Clock size={13} />
                                    )}
                                    {isSending ? "Đang xử lý..." : taskStatusLabel}
                                    <ChevronDown size={12} />
                                  </button>

                                  {taskActionMenuId === t.taskId ? (
                                    <div className="absolute right-0 top-full z-20 mt-2 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                                      {isPaused ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            changeTaskRunningStatus(t, "resume")
                                          }
                                          className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                        >
                                          Tiếp tục
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            changeTaskRunningStatus(t, "pause")
                                          }
                                          className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-amber-700 hover:bg-amber-50"
                                        >
                                          Tạm dừng
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setTaskActionMenuId(null);
                                          setConfirmTask(t);
                                        }}
                                        className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                                      >
                                        Hoàn thành
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              )}
                            </div>
                            {issueReportAssignment.taskType === "REPAIR" && (
                              <div className="mt-3 sm:pl-12">
                                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                                  Kinh nghiệm sửa chữa
                                </label>
                                <textarea
                                  rows={3}
                                  value={
                                    repairExperienceByTask[t.taskId] ?? ""
                                  }
                                  onChange={(event) =>
                                    setRepairExperienceByTask((current) => ({
                                      ...current,
                                      [t.taskId]: event.target.value,
                                    }))
                                  }
                                  placeholder="Nhập kinh nghiệm sửa chữa cho công việc này..."
                                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors resize-none"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* SECTION: Ghi nhận lỗi (chỉ task kiểm tra) */}
              {issueReportAssignment.taskType === "INSPECTION" && (
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <AlertCircle size={14} className="text-slate-500" />
                      Ghi nhận lỗi phát hiện
                    </label>
                    {checkedIssueItems.length > 0 && (
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: "#00285E", color: "#fff" }}
                      >
                        {checkedIssueItems.length} lỗi đã chọn
                      </span>
                    )}
                  </div>
                  {/* Dropdown chọn nhóm lỗi (search bên trong, chọn xong đóng) */}
                  <div className="relative mb-3">
                    <button
                      type="button"
                      onClick={() => setCatDropdownOpen((v) => !v)}
                      className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left text-sm text-slate-700 hover:border-slate-300 focus:outline-none focus:border-[#00285E] transition-colors"
                    >
                      <span
                        className={
                          pickedCategories.length === 0 ? "text-slate-400" : ""
                        }
                      >
                        {pickedCategories.length === 0
                          ? "Chọn nhóm lỗi cần ghi nhận..."
                          : `Đã chọn ${pickedCategories.length} nhóm`}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`text-slate-400 shrink-0 transition-transform ${
                          catDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {catDropdownOpen && (
                      <div className="absolute z-10 mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                        <div className="p-2 border-b border-slate-100">
                          <div className="relative">
                            <Search
                              size={14}
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                              autoFocus
                              type="text"
                              value={catSearch}
                              onChange={(e) => setCatSearch(e.target.value)}
                              placeholder="Tìm nhóm hoặc tên lỗi..."
                              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2.5 py-1.5 text-sm focus:outline-none focus:border-[#00285E] transition-colors"
                            />
                          </div>
                        </div>
                        <div className="max-h-56 overflow-y-auto py-1">
                          {categoryOptions.length === 0 ? (
                            <p className="px-3 py-4 text-center text-xs text-slate-400">
                              Không tìm thấy nhóm lỗi phù hợp.
                            </p>
                          ) : (
                            categoryOptions.map((g) => {
                              const picked = pickedCategories.includes(
                                g.category,
                              );
                              return (
                                <button
                                  key={g.category}
                                  type="button"
                                  onClick={() => {
                                    toggleCategory(g.category);
                                    setCatSearch("");
                                    setCatDropdownOpen(false);
                                  }}
                                  className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                                >
                                  <span className="min-w-0">
                                    <span className="text-sm text-slate-700 block truncate">
                                      {g.category}
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                      {g.items.length} lỗi
                                    </span>
                                  </span>
                                  <span
                                    className={`shrink-0 w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                      picked
                                        ? "bg-[#00285E] border-[#00285E] text-white"
                                        : "border-slate-300"
                                    }`}
                                  >
                                    {picked && <CheckCircle2 size={11} />}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* List lỗi của các nhóm đã chọn */}
                  {pickedGroups.length === 0 ? (
                    <p className="text-xs text-slate-400 italic px-1 py-4 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                      Chọn nhóm lỗi ở trên để hiển thị danh sách lỗi.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {pickedGroups.map((group) => (
                        <div
                          key={group.category}
                          className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden"
                        >
                          <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
                            <span className="text-sm font-semibold text-[#00285E]">
                              {group.category}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeCategory(group.category)}
                              className="text-slate-400 hover:text-rose-500 transition-colors"
                              title="Bỏ nhóm này"
                            >
                              <X size={15} />
                            </button>
                          </div>
                          <div className="p-2 space-y-1.5">
                            {group.items.map((item) => (
                              <div
                                key={item.component_id}
                                className="rounded-xl px-3 py-2.5 transition-colors border"
                                style={{
                                  backgroundColor: item.checked
                                    ? "#EDF3FF"
                                    : "transparent",
                                  borderColor: item.checked
                                    ? "#c7d7f0"
                                    : "transparent",
                                }}
                              >
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={item.checked}
                                    onChange={() =>
                                      toggleIssueChecklistItem(
                                        item.component_id,
                                      )
                                    }
                                    className="accent-[#00285E] shrink-0"
                                  />
                                  <span className="text-sm text-slate-700">
                                    {item.component_name}
                                  </span>
                                </label>
                                {item.checked && (
                                  <input
                                    type="text"
                                    value={item.description}
                                    onChange={(e) =>
                                      updateIssueChecklistDescription(
                                        item.component_id,
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Mô tả chi tiết lỗi..."
                                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#00285E] transition-colors"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Ghi chú chung cho báo cáo */}
                  <div className="mt-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">
                      Ghi chú
                    </label>
                    <textarea
                      rows={3}
                      value={issueNote}
                      onChange={(e) => setIssueNote(e.target.value)}
                      placeholder="Ghi chú thêm cho báo cáo (không bắt buộc)..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors resize-none"
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-7 py-4 border-t border-slate-200 shrink-0 bg-white">
              {issueReportAssignment.taskType === "INSPECTION" ? (
                <>
                  <span className="text-xs text-slate-400">
                    {checkedIssueItems.length > 0
                      ? `${checkedIssueItems.length} lỗi sẽ được báo cáo`
                      : "Chọn lỗi phát hiện để hoàn tất kiểm tra"}
                  </span>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setIssueReportOpen(false)}
                      disabled={isSubmittingIssueReport}
                      className="h-11 px-5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200/60 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-40"
                    >
                      Đóng
                    </button>
                    <button
                      onClick={handleCreateIssuesReport}
                      disabled={
                        isSubmittingIssueReport ||
                        checkedIssueItems.length === 0
                      }
                      className="h-11 flex items-center gap-2 px-6 rounded-xl text-sm font-semibold text-white bg-[#00285E] shadow-lg shadow-[#00285E]/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isSubmittingIssueReport ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          Đang gửi...
                        </>
                      ) : (
                        <>
                          <ClipboardList size={15} />
                          Hoàn tất & gửi báo cáo
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="ml-auto flex items-center gap-2.5">
                  {issueReportAssignment.taskType === "REPAIR" && (
                    <button
                      type="button"
                      onClick={() => setShowIncidentIssueReport(true)}
                      className="h-11 inline-flex items-center px-5 rounded-xl text-sm font-semibold text-white bg-[#00285E] shadow-lg shadow-[#00285E]/20 hover:brightness-110 active:scale-[0.98] transition-all"
                    >
                      Tạo báo cáo lỗi phát sinh
                    </button>
                  )}
                  <button
                    onClick={() => setIssueReportOpen(false)}
                    className="h-11 px-5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200/60 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all"
                  >
                    Đóng
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showIncidentIssueReport && issueReportAssignment && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            onClick={() => setShowIncidentIssueReport(false)}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5">
            <div
              className="flex items-center justify-between px-6 py-4 shrink-0"
              style={{ backgroundColor: "#00285E" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl text-white flex items-center justify-center"
                  style={{ backgroundColor: "#F9A11B" }}
                >
                  <AlertCircle size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    Tạo báo cáo lỗi phát sinh
                  </h3>
                  <span className="text-xs font-semibold text-white/60">
                    {issueReportAssignment.vehiclePlate || "—"} ·{" "}
                    {issueReportAssignment.vehicleModel || "—"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowIncidentIssueReport(false)}
                className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-7 py-6 space-y-5 bg-slate-50/50">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#EDF3FF] rounded-2xl border border-[#c7d7f0] p-4">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Users size={13} className="text-[#00285E]" />
                    <span className="text-[10px] font-bold text-[#00285E] uppercase tracking-widest">
                      Khách hàng
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-baseline gap-2">
                      <span className="w-12 shrink-0 text-xs text-slate-500">
                        Tên:
                      </span>
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {issueReportAssignment.customerName}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="w-12 shrink-0 text-xs text-slate-500">
                        SĐT:
                      </span>
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {issueReportAssignment.customerPhone || "—"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Car size={13} className="text-amber-700" />
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">
                      Phương tiện
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-baseline gap-2">
                      <span className="w-16 shrink-0 text-xs text-slate-500">
                        Biển số:
                      </span>
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {issueReportAssignment.vehiclePlate || "—"}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="w-16 shrink-0 text-xs text-slate-500">
                        Xe:
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

              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <AlertCircle size={14} className="text-slate-500" />
                    Ghi nhận lỗi phát sinh
                  </label>
                  {checkedIssueItems.length > 0 && (
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: "#00285E", color: "#fff" }}
                    >
                      {checkedIssueItems.length} lỗi đã chọn
                    </span>
                  )}
                </div>

                <div className="relative mb-3">
                  <button
                    type="button"
                    onClick={() => setCatDropdownOpen((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm text-slate-700 hover:border-slate-300 focus:outline-none focus:border-[#00285E] transition-colors"
                  >
                    <span
                      className={
                        pickedCategories.length === 0 ? "text-slate-400" : ""
                      }
                    >
                      {pickedCategories.length === 0
                        ? "Chọn nhóm lỗi cần ghi nhận..."
                        : `Đã chọn ${pickedCategories.length} nhóm`}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 shrink-0 transition-transform ${
                        catDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {catDropdownOpen && (
                    <div className="absolute z-10 mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                      <div className="p-2 border-b border-slate-100">
                        <div className="relative">
                          <Search
                            size={14}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            autoFocus
                            type="text"
                            value={catSearch}
                            onChange={(e) => setCatSearch(e.target.value)}
                            placeholder="Tìm nhóm hoặc tên lỗi..."
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2.5 py-1.5 text-sm focus:outline-none focus:border-[#00285E] transition-colors"
                          />
                        </div>
                      </div>
                      <div className="max-h-56 overflow-y-auto py-1">
                        {categoryOptions.length === 0 ? (
                          <p className="px-3 py-4 text-center text-xs text-slate-400">
                            Không tìm thấy nhóm lỗi phù hợp.
                          </p>
                        ) : (
                          categoryOptions.map((g) => {
                            const picked = pickedCategories.includes(
                              g.category,
                            );
                            return (
                              <button
                                key={g.category}
                                type="button"
                                onClick={() => {
                                  toggleCategory(g.category);
                                  setCatSearch("");
                                  setCatDropdownOpen(false);
                                }}
                                className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                              >
                                <span className="min-w-0">
                                  <span className="text-sm text-slate-700 block truncate">
                                    {g.category}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    {g.items.length} lỗi
                                  </span>
                                </span>
                                <span
                                  className={`shrink-0 w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                    picked
                                      ? "bg-[#00285E] border-[#00285E] text-white"
                                      : "border-slate-300"
                                  }`}
                                >
                                  {picked && <CheckCircle2 size={11} />}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {pickedGroups.length === 0 ? (
                  <p className="text-xs text-slate-400 italic px-1 py-4 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                    Chọn nhóm lỗi ở trên để hiển thị danh sách lỗi phát sinh.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pickedGroups.map((group) => (
                      <div
                        key={group.category}
                        className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden"
                      >
                        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
                          <span className="text-sm font-semibold text-[#00285E]">
                            {group.category}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeCategory(group.category)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                          >
                            <X size={15} />
                          </button>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {group.items.map((item) => (
                            <div key={item.component_id} className="p-3">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.checked}
                                  onChange={() =>
                                    toggleIssueChecklistItem(item.component_id)
                                  }
                                  className="w-4 h-4 accent-[#00285E]"
                                />
                                <span className="text-sm font-semibold text-slate-700">
                                  {item.component_name}
                                </span>
                              </label>
                              {item.checked && (
                                <textarea
                                  rows={2}
                                  value={item.description}
                                  onChange={(e) =>
                                    updateIssueChecklistDescription(
                                      item.component_id,
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Mô tả lỗi phát sinh..."
                                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors resize-none"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">
                  Ghi chú
                </label>
                <textarea
                  rows={3}
                  value={issueNote}
                  onChange={(e) => setIssueNote(e.target.value)}
                  placeholder="Ghi chú thêm cho báo cáo lỗi phát sinh..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-7 py-4 border-t border-slate-200 shrink-0 bg-white">
              <span className="text-xs text-slate-400">
                {checkedIssueItems.length > 0
                  ? `${checkedIssueItems.length} lỗi sẽ được báo cáo`
                  : "Chọn lỗi phát sinh để gửi báo cáo"}
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowIncidentIssueReport(false)}
                  disabled={isSubmittingIssueReport}
                  className="h-11 px-5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200/60 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-40"
                >
                  Đóng
                </button>
                <button
                  onClick={handleCreateAdditionalIssuesReport}
                  disabled={
                    isSubmittingIssueReport || checkedIssueItems.length === 0
                  }
                  className="h-11 flex items-center gap-2 px-6 rounded-xl text-sm font-semibold text-white bg-[#00285E] shadow-lg shadow-[#00285E]/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmittingIssueReport ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <ClipboardList size={15} />
                      Gửi báo cáo lỗi phát sinh
                    </>
                  )}
                </button>
              </div>
            </div>
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
              className="flex items-center justify-between px-6 py-4 shrink-0"
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

            <div className="px-6 py-4 border-b border-slate-100 shrink-0 space-y-3">
              <div className="inline-flex rounded-xl bg-slate-100 p-1">
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
                  <div className="flex items-center gap-2">
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
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4 bg-slate-50/50">
             <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
  <div className="grid grid-cols-[56px_1.4fr_1.6fr] border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-widest text-slate-400">
    <div className="px-3 py-2.5">STT</div>
    <div className="px-3 py-2.5">
      {lookupView === "common" ? "Các lỗi thường gặp" : "Lỗi đã gặp"}
    </div>
    <div className="px-3 py-2.5">Nguyên nhân</div>
  </div>

  {lookupRows.map((row, index) => (
    <div
      key={row.id}
      className="grid grid-cols-[56px_1.4fr_1.6fr] border-b border-slate-100 last:border-b-0"
    >
      <div className="px-3 py-3 text-sm font-semibold text-slate-500">
        {index + 1}
      </div>
      <div className="px-3 py-3 text-sm text-slate-700 font-semibold">
        {row.issue}
      </div>
      <div className="px-3 py-3 text-sm text-slate-600 whitespace-pre-line leading-relaxed">
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
              className="flex items-center justify-between px-6 py-4 shrink-0"
              style={{ backgroundColor: "#00285E" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    Tham khảo AI
                  </h3>
                  <span className="text-xs font-semibold text-white/60">
                    {issueReportAssignment?.vehicleModel || "Chẩn đoán ô tô"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setAiChatOpen(false)}
                className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Khung hội thoại */}
            <div className="overflow-y-auto flex-1 px-4 py-4 space-y-3 bg-slate-50/50">
              {aiMessages.length === 0 && !isAiLoading && (
                <div className="h-full flex flex-col items-center justify-center text-center px-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#EDF3FF] text-[#00285E] flex items-center justify-center mb-3">
                    <Sparkles size={22} />
                  </div>
                  <p className="text-sm text-slate-500">
                    Mô tả triệu chứng để AI gợi ý nguyên nhân khả dĩ và bộ phận
                    cần kiểm tra.
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

            {/* Ô nhập */}
            <div className="px-4 py-3 border-t border-slate-200 shrink-0 bg-white">
              <div className="flex items-end gap-2">
                <textarea
                  rows={1}
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendAiMessage();
                    }
                  }}
                  placeholder="Nhập triệu chứng cần hỏi..."
                  className="flex-1 max-h-28 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors"
                />
                <button
                  onClick={sendAiMessage}
                  disabled={!aiInput.trim() || isAiLoading}
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
              className="flex items-center justify-between px-6 py-4 shrink-0"
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

            <div className="px-6 py-4 border-b border-slate-100 shrink-0 space-y-3">
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
                <div className="flex items-center gap-2">
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

            <div className="overflow-y-auto flex-1 px-6 py-5 bg-slate-50/50">
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
                          <td className="px-4 py-4 font-semibold text-slate-800">
                            {row.content}
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

      {/* MODAL XÁC NHẬN HOÀN THÀNH */}
      {confirmTask && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            onClick={() => setConfirmTask(null)}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden ring-1 ring-slate-900/5">
            <div className="px-6 pt-6 pb-5 text-center">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
                <CheckCircle2 size={24} className="text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1.5">
                Hoàn thành công việc?
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Xác nhận đánh dấu hoàn thành{" "}
                <span className="font-semibold text-slate-700">
                  “{confirmTask.serviceName}”
                </span>
                . Thao tác này không thể hoàn tác.
              </p>
            </div>
            <div className="flex items-center gap-2.5 px-6 pb-6">
              <button
                onClick={() => setConfirmTask(null)}
                className="flex-1 h-11 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200/60 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                Hủy
              </button>
              <button
                onClick={() => completeTaskInModal(confirmTask)}
                className="flex-1 h-11 inline-flex items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:brightness-110 active:scale-[0.98] transition-all"
              >
                <CheckCircle2 size={15} />
                Hoàn thành
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
