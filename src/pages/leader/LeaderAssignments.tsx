import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ClipboardList,
  Search,
  Car,
  User,
  UserPlus,
  X,
  Clock,
  Wrench,
  AlertCircle,
  Loader2,
  Users,
  CheckCircle2,
  Eye,
  Calendar,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { useFetchClient } from "../../hook/useFetchClient";
import { TECHNICIAN_LEADER_TASK_ENDPOINTS } from "../../constants/technicianLeader/taskManagementEndpoint";
import type {
  GetLeaderTasksResponse,
  GetTechniciansResponse,
  AssignTaskRequest,
  GetAssignmentHistoryResponse,
  UpdateAssignmentRequest,
} from "../../model/dto/leaderTaskManagement.dto";

const TASK_STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Chờ phân công",
    className: "bg-amber-50 text-amber-600 border border-amber-200",
  },
  IN_PROGRESS: {
    label: "Đang thực hiện",
    className: "bg-blue-50 text-blue-600 border border-blue-200",
  },
};

// Task ở tab lịch sử đã có người nhận, nên PENDING là "chưa bắt đầu làm"
// chứ không phải "chờ phân công" như ở tab chờ phân công
const HISTORY_TASK_STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Chưa bắt đầu",
    className: "bg-slate-50 text-slate-600 border border-slate-200",
  },
  IN_PROGRESS: {
    label: "Đang thực hiện",
    className: "bg-blue-50 text-blue-600 border border-blue-200",
  },
  PENDING_QC: {
    label: "Chờ kiểm tra",
    className: "bg-violet-50 text-violet-600 border border-violet-200",
  },
  COMPLETED: {
    label: "Hoàn thành",
    className: "bg-emerald-50 text-emerald-600 border border-emerald-200",
  },
};

const formatDate = (d: string) => new Date(d).toLocaleDateString("vi-VN");

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDuration = (minutes: number | null | undefined) => {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes} phút`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${m}` : `${h} giờ`;
};

// Mã đơn DV-ddMMyyyy-stt, đồng bộ cách đánh mã của các trang khác
const buildOrderCode = (
  orders: { id: number; createdAt: string }[],
): Record<number, string> => {
  const counters: Record<string, number> = {};
  const codes: Record<number, string> = {};
  [...orders]
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    .forEach((order) => {
      const d = new Date(order.createdAt);
      const dateKey = `${String(d.getDate()).padStart(2, "0")}${String(
        d.getMonth() + 1,
      ).padStart(2, "0")}${d.getFullYear()}`;
      counters[dateKey] = (counters[dateKey] ?? 0) + 1;
      codes[order.id] =
        `DV-${dateKey}-${String(counters[dateKey]).padStart(2, "0")}`;
    });
  return codes;
};

// Trạng thái công việc kỹ thuật viên đang gánh
const ASSIGNMENT_STATUS_DOT: Record<string, string> = {
  IN_PROGRESS: "bg-blue-500",
  ASSIGNED: "bg-amber-500",
  PAUSED: "bg-slate-400",
};

const ASSIGNMENT_STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: "Đang làm",
  ASSIGNED: "Chờ làm",
  PAUSED: "Tạm dừng",
};

// Nhãn tay nghề kỹ thuật viên
const SKILL_LEVEL_LABEL: Record<string, string> = {
  JUNIOR: "Sơ cấp",
  INTERMEDIATE: "Trung cấp",
  SENIOR: "Cao cấp",
  EXPERT: "Chuyên gia",
};

// Thẻ chọn kỹ thuật viên — dùng chung cho modal phân công và modal đổi KTV
const TechnicianCard = ({
  tech,
  picked,
  onPick,
  onViewDetail,
}: {
  tech: GetTechniciansResponse;
  picked: boolean;
  onPick: () => void;
  onViewDetail: () => void;
}) => {
  const busy = tech.remaining_count > 0;
  return (
    <div
      onClick={onPick}
      className={`w-full rounded-xl border px-3 py-3 cursor-pointer transition-all ${picked
          ? "border-[#00285E] bg-white ring-1 ring-[#00285E]"
          : "border-slate-200 bg-white hover:border-slate-300"
        }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-full bg-[#EDF3FF] flex items-center justify-center shrink-0">
            <User size={15} className="text-[#00285E]" />
          </span>
          <div className="min-w-0">
            <span className="text-sm font-semibold text-slate-800 block truncate">
              {tech.fullName}
            </span>
            {tech.skill_level && (
              <span className="text-[11px] text-slate-400">
                {SKILL_LEVEL_LABEL[tech.skill_level] ?? tech.skill_level}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${busy
                ? "bg-amber-50 text-amber-600"
                : "bg-emerald-50 text-emerald-600"
              }`}
          >
            {busy ? `${tech.remaining_count} việc` : "Đang rảnh"}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetail();
            }}
            title="Xem chi tiết khối lượng công việc"
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <Eye size={13} />
          </button>
          {picked && (
            <CheckCircle2 size={18} className="text-[#00285E] shrink-0" />
          )}
        </div>
      </div>

      {/* Việc đang làm dở */}
      {busy && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1">
          {(tech.assignments ?? []).slice(0, 3).map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 text-[11px] text-slate-500"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${ASSIGNMENT_STATUS_DOT[a.status] ?? "bg-slate-300"
                  }`}
              />
              <span className="truncate">
                {a.task?.catalog?.service_name ?? `Công việc #${a.task_id}`}
              </span>
              {a.task?.serviceOrder?.vehicle?.license_plate && (
                <span className="text-slate-400 shrink-0">
                  · {a.task.serviceOrder.vehicle.license_plate}
                </span>
              )}
            </div>
          ))}
          {(tech.assignments ?? []).length > 3 && (
            <span className="text-[11px] text-slate-400 block">
              +{(tech.assignments ?? []).length - 3} việc khác
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default function LeaderAssignments() {
  const { searchQuery, showToast } = useOutletContext<{
    searchQuery: string;
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();

  const { fetchPrivate } = useFetchClient();
  const [serviceOrders, setServiceOrders] = useState<GetLeaderTasksResponse[]>(
    [],
  );
  const [technicians, setTechnicians] = useState<GetTechniciansResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [localSearch, setLocalSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentHistoryPage, setCurrentHistoryPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const effectiveSearch = (searchQuery || localSearch).toLowerCase();

  // Đơn đang mở chi tiết
  const [selected, setSelected] = useState<GetLeaderTasksResponse | null>(null);
  // Task được tích chọn trong modal chi tiết
  const [pickedTaskIds, setPickedTaskIds] = useState<number[]>([]);
  // Modal chọn kỹ thuật viên
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [pickedTechId, setPickedTechId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Tab: chờ phân công / lịch sử đã phân công
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [history, setHistory] = useState<GetAssignmentHistoryResponse[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Modal chi tiết đơn đã phân công
  const [historySelected, setHistorySelected] =
    useState<GetAssignmentHistoryResponse | null>(null);
  // Các assignment được tích chọn để đổi kỹ thuật viên hàng loạt
  const [pickedAssignmentIds, setPickedAssignmentIds] = useState<number[]>([]);
  // Bật màn chọn kỹ thuật viên sau khi bấm nút "Đổi kỹ thuật viên"
  const [isPickingTech, setIsPickingTech] = useState(false);
  const [replaceTechId, setReplaceTechId] = useState<number | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);

  // Xem chi tiết khối lượng công việc của 1 kỹ thuật viên
  const [techDetail, setTechDetail] = useState<GetTechniciansResponse | null>(
    null,
  );

  useEffect(() => {
    handleGetTasks();
    handleGetTechnicians();
  }, []);

  const handleGetTasks = async () => {
    setIsLoading(true);
    try {
      const result = await fetchPrivate<GetLeaderTasksResponse[]>(
        TECHNICIAN_LEADER_TASK_ENDPOINTS.GET_ALL_TASKS,
        "GET",
      );
      setServiceOrders(result.data ?? []);
    } catch (error) {
      console.error("Lỗi lấy danh sách công việc", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetTechnicians = async () => {
    try {
      const result = await fetchPrivate<GetTechniciansResponse[]>(
        TECHNICIAN_LEADER_TASK_ENDPOINTS.GET_ALL_TECHNICIAN,
        "GET",
      );
      setTechnicians(result.data ?? []);
      console.log("technicians:", result)
    } catch (error) {
      console.error("Lỗi lấy danh sách kỹ thuật viên", error);
    }
  };

  const handleAssign = async () => {
    if (!pickedTechId || pickedTaskIds.length === 0) return;
    setIsSaving(true);
    try {
      const payload: AssignTaskRequest = {
        task_ids: pickedTaskIds,
        technician_id: pickedTechId,
      };
      await fetchPrivate(
        TECHNICIAN_LEADER_TASK_ENDPOINTS.ASSIGN_TASK,
        "POST",
        payload,
      );
      showToast(`Đã phân công ${pickedTaskIds.length} công việc`, "success");
      closeAssign();
      closeDetail();
      handleGetTasks();
    } catch (error: any) {
      showToast(error?.message ?? "Phân công thất bại", "warning");
    } finally {
      setIsSaving(false);
    }
  };

  // Sau khi refetch, cập nhật lại đơn đang mở để modal hiện KTV mới
  useEffect(() => {
    if (!historySelected) return;
    const fresh = history.find((o) => o.id === historySelected.id);
    if (fresh && fresh !== historySelected) setHistorySelected(fresh);
  }, [history]);

  const handleGetHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const result = await fetchPrivate<GetAssignmentHistoryResponse[]>(
        TECHNICIAN_LEADER_TASK_ENDPOINTS.GET_ASSIGNMENT_HISTORY,
        "GET",
      );
      setHistory(result.data ?? []);
    } catch (error) {
      console.error("Lỗi lấy lịch sử phân công", error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // Lấy lịch sử lần đầu mở tab, các lần sau dùng lại dữ liệu đã tải
  const handleTabChange = (tab: "pending" | "history") => {
    setActiveTab(tab);
    if (tab === "history" && history.length === 0) handleGetHistory();
  };

  const openHistoryDetail = (order: GetAssignmentHistoryResponse) => {
    setHistorySelected(order);
    setPickedAssignmentIds([]);
    setIsPickingTech(false);
    setReplaceTechId(null);
  };

  const closeHistoryDetail = () => {
    setHistorySelected(null);
    setPickedAssignmentIds([]);
    setIsPickingTech(false);
    setReplaceTechId(null);
  };

  const openReplaceTech = () => {
    setReplaceTechId(null);
    setIsPickingTech(true);
  };

  const closeReplaceTech = () => {
    setIsPickingTech(false);
    setReplaceTechId(null);
  };

  const toggleAssignment = (assignmentId: number) =>
    setPickedAssignmentIds((prev) =>
      prev.includes(assignmentId)
        ? prev.filter((id) => id !== assignmentId)
        : [...prev, assignmentId],
    );

  const handleReplaceTech = async () => {
    if (pickedAssignmentIds.length === 0 || !replaceTechId) return;
    setIsReplacing(true);
    try {
      const payload: UpdateAssignmentRequest = {
        technician_id: replaceTechId,
      };
      // BE nhận từng assignment một, gọi lần lượt để lỗi của cái này
      // không nuốt mất kết quả của cái kia
      const results = await Promise.allSettled(
        pickedAssignmentIds.map((id) =>
          fetchPrivate(
            TECHNICIAN_LEADER_TASK_ENDPOINTS.UPDATE_ASSIGNMENT(id),
            "PATCH",
            payload,
          ),
        ),
      );
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length === 0) {
        showToast(
          `Đã đổi kỹ thuật viên cho ${pickedAssignmentIds.length} công việc`,
          "success",
        );
      } else {
        const firstError = (failed[0] as PromiseRejectedResult).reason;
        showToast(
          failed.length === results.length
            ? (firstError?.message ?? "Đổi kỹ thuật viên thất bại")
            : `${results.length - failed.length}/${results.length} công việc đã đổi, ${failed.length} thất bại`,
          "warning",
        );
      }
      setPickedAssignmentIds([]);
      setIsPickingTech(false);
      setReplaceTechId(null);
      await handleGetHistory();
      handleGetTasks();
    } catch (error: any) {
      showToast(error?.message ?? "Đổi kỹ thuật viên thất bại", "warning");
    } finally {
      setIsReplacing(false);
    }
  };

  const openDetail = (order: GetLeaderTasksResponse) => {
    setSelected(order);
    setPickedTaskIds([]);
  };

  const closeDetail = () => {
    setSelected(null);
    setPickedTaskIds([]);
  };

  const openAssign = () => {
    setPickedTechId(null);
    setIsAssignOpen(true);
  };

  const closeAssign = () => {
    setIsAssignOpen(false);
    setPickedTechId(null);
  };

  const toggleTask = (taskId: number) =>
    setPickedTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId],
    );

  const filtered = useMemo(() => {
    if (!effectiveSearch) return serviceOrders;
    const codes = buildOrderCode(serviceOrders);
    return serviceOrders.filter((order) => {
      const plate = order.vehicle?.license_plate?.toLowerCase() ?? "";
      const model = order.vehicle?.model?.model_name?.toLowerCase() ?? "";
      return (
        (codes[order.id] ?? "").toLowerCase().includes(effectiveSearch) ||
        plate.includes(effectiveSearch) ||
        model.includes(effectiveSearch) ||
        (order.tasks ?? []).some((task) => {
          const service = task.catalog?.service_name?.toLowerCase() ?? "";
          const component =
            task.quotationItem?.issue?.component?.name?.toLowerCase() ?? "";
          return (
            service.includes(effectiveSearch) ||
            component.includes(effectiveSearch) ||
            (task.assignments ?? []).some((a) =>
              (a.technician?.fullName ?? "")
                .toLowerCase()
                .includes(effectiveSearch),
            )
          );
        })
      );
    });
  }, [serviceOrders, effectiveSearch]);

  // Mã đơn đánh theo toàn bộ danh sách để không đổi khi lọc tìm kiếm
  const orderCodes = useMemo(
    () => buildOrderCode(serviceOrders),
    [serviceOrders],
  );

  // Mã đơn + lọc riêng cho danh sách lịch sử phân công
  const historyCodes = useMemo(() => buildOrderCode(history), [history]);

  const filteredHistory = useMemo(() => {
    const keyword = effectiveSearch;
    if (!keyword) return history;
    return history.filter((order) => {
      const plate = order.vehicle?.license_plate?.toLowerCase() ?? "";
      const model = order.vehicle?.model?.model_name?.toLowerCase() ?? "";
      return (
        (historyCodes[order.id] ?? "").toLowerCase().includes(keyword) ||
        plate.includes(keyword) ||
        model.includes(keyword) ||
        (order.tasks ?? []).some(
          (task) =>
            (task.catalog?.service_name ?? "")
              .toLowerCase()
              .includes(keyword) ||
            (task.assignments ?? []).some((a) =>
              (a.technician?.fullName ?? "").toLowerCase().includes(keyword),
            ),
        )
      );
    });
  }, [history, historyCodes, effectiveSearch]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const totalHistoryPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);

  const paginatedOrders = useMemo(() => {
    const activePage = Math.min(Math.max(currentPage, 1), totalPages || 1);
    const start = (activePage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage, totalPages]);

  const paginatedHistory = useMemo(() => {
    const activePage = Math.min(Math.max(currentHistoryPage, 1), totalHistoryPages || 1);
    const start = (activePage - 1) * ITEMS_PER_PAGE;
    return filteredHistory.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredHistory, currentHistoryPage, totalHistoryPages]);

  useEffect(() => {
    setCurrentPage(1);
    setCurrentHistoryPage(1);
  }, [effectiveSearch]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages || 1);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (currentHistoryPage > totalHistoryPages) {
      setCurrentHistoryPage(totalHistoryPages || 1);
    }
  }, [currentHistoryPage, totalHistoryPages]);

  const stats = useMemo(() => {
    const allTasks = serviceOrders.flatMap((o) => o.tasks ?? []);
    const assigned = allTasks.filter(
      (t) => (t.assignments ?? []).length > 0,
    ).length;
    return {
      orders: serviceOrders.length,
      total: allTasks.length,
      pending: allTasks.length - assigned,
    };
  }, [serviceOrders]);

  // Thống kê nhanh cho 1 đơn
  const orderSummary = (order: {
    tasks?: { assignments?: unknown[] }[];
  }) => {
    const tasks = order.tasks ?? [];
    const unassigned = tasks.filter(
      (t) => (t.assignments ?? []).length === 0,
    ).length;
    return { total: tasks.length, unassigned };
  };

  const selectedTasks = selected?.tasks ?? [];
  const assignableTasks = selectedTasks.filter(
    (t) => (t.assignments ?? []).length === 0,
  );
  const allPicked =
    assignableTasks.length > 0 &&
    assignableTasks.every((t) => pickedTaskIds.includes(t.id));

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* TITLE */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">
          Phân công kỹ thuật
        </h1>
        <p className="text-slate-500 text-sm">
          Danh sách đơn dịch vụ đang có công việc cần xử lý.
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[#EDF3FF] text-[#00285E]">
            <Car size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {stats.orders}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Đơn dịch vụ
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
            <ClipboardList size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {stats.total}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Tổng công việc
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 text-amber-600">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {stats.pending}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Chờ phân công
            </p>
          </div>
        </div>
      </div>

      {/* TABS SWITCHER */}
      <div className="flex border-b border-slate-200/60">
        <button
          onClick={() => handleTabChange("pending")}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-all ${activeTab === "pending"
              ? "border-[#00285E] text-[#00285E]"
              : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
        >
          Chờ phân công
        </button>
        <button
          onClick={() => handleTabChange("history")}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-all ${activeTab === "history"
              ? "border-[#00285E] text-[#00285E]"
              : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
        >
          Lịch sử phân công
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              {activeTab === "pending"
                ? "Danh sách đơn dịch vụ"
                : "Đơn đã phân công"}
            </h2>
            <span className="bg-[#EDF3FF] text-[#00285E] px-2.5 py-0.5 rounded-full text-xs font-bold">
              {activeTab === "pending" ? filtered.length : filteredHistory.length}{" "}
              đơn
            </span>
          </div>
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Tìm biển số, dịch vụ, kỹ thuật viên..."
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                setCurrentPage(1);
                setCurrentHistoryPage(1);
              }}
              className="w-full sm:w-72 bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
            />
          </div>
        </div>

        {activeTab === "history" ? (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th className="py-4 px-6">Đơn dịch vụ</th>
                  <th className="py-4 px-4">Xe</th>
                  <th className="py-4 px-4">Công việc</th>
                  <th className="py-4 px-4">Ngày tạo</th>
                  <th className="py-4 px-4">Trạng thái</th>
                  <th className="py-4 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isHistoryLoading ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center">
                      <span className="inline-flex items-center gap-2 text-slate-400 text-sm">
                        <Loader2 size={16} className="animate-spin" />
                        Đang tải lịch sử...
                      </span>
                    </td>
                  </tr>
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-14 text-center text-slate-400 text-sm"
                    >
                      Chưa có công việc nào được phân công...
                    </td>
                  </tr>
                ) : (
                  paginatedHistory.map((order) => {
                    const sum = orderSummary(order);
                    return (
                      <tr
                        key={order.id}
                        onClick={() => openHistoryDetail(order)}
                        className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      >
                        <td className="py-4 px-6">
                          <span className="font-bold text-[#00285E] text-sm">
                            {historyCodes[order.id] ?? `#${order.id}`}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                            <Car
                              size={13}
                              className="text-slate-400 shrink-0"
                            />
                            {order.vehicle?.license_plate ?? "—"}
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            {order.vehicle?.model?.model_name ?? ""}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-xs font-bold">
                            <ClipboardList
                              size={11}
                              className="text-slate-400"
                            />
                            {sum.total} công việc
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                            <Calendar size={13} className="text-slate-400" />
                            {formatDate(order.createdAt)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {sum.unassigned > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200 whitespace-nowrap">
                              <AlertCircle size={11} />
                              Còn {sum.unassigned} chưa gán
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 whitespace-nowrap">
                              <CheckCircle2 size={11} />
                              Đã phân công đủ
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openHistoryDetail(order);
                              }}
                              title="Xem chi tiết"
                              className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                              <Eye size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalHistoryPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200 text-sm text-slate-500">
              <span>
                Hiển thị {filteredHistory.length === 0 ? 0 : (Math.min(Math.max(currentHistoryPage, 1), totalHistoryPages) - 1) * ITEMS_PER_PAGE + 1}–{Math.min(Math.min(Math.max(currentHistoryPage, 1), totalHistoryPages) * ITEMS_PER_PAGE, filteredHistory.length)} trên {filteredHistory.length} đơn
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentHistoryPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentHistoryPage === 1}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >Trước</button>
                {Array.from({ length: totalHistoryPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentHistoryPage(page)}
                    className={`w-9 h-9 rounded-xl text-sm font-semibold transition ${page === currentHistoryPage ? 'bg-[#00285E] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentHistoryPage((prev) => Math.min(totalHistoryPages, prev + 1))}
                  disabled={currentHistoryPage === totalHistoryPages}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >Sau</button>
              </div>
            </div>
          )}
          </>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th className="py-4 px-6">Đơn dịch vụ</th>
                  <th className="py-4 px-4">Xe</th>
                  <th className="py-4 px-4">Công việc</th>
                  <th className="py-4 px-4">Ngày tạo</th>
                  <th className="py-4 px-4">Trạng thái</th>
                  <th className="py-4 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center">
                      <span className="inline-flex items-center gap-2 text-slate-400 text-sm">
                        <Loader2 size={16} className="animate-spin" />
                        Đang tải danh sách...
                      </span>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-14 text-center text-slate-400 text-sm"
                    >
                      Không có đơn dịch vụ nào chờ xử lý...
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => {
                    const sum = orderSummary(order);
                    return (
                      <tr
                        key={order.id}
                        onClick={() => openDetail(order)}
                        className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      >
                        <td className="py-4 px-6">
                          <span className="font-bold text-[#00285E] text-sm">
                            {orderCodes[order.id] ?? `#${order.id}`}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                            <Car size={13} className="text-slate-400 shrink-0" />
                            {order.vehicle?.license_plate ?? "—"}
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            {order.vehicle?.model?.model_name ?? ""}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-xs font-bold">
                            <ClipboardList size={11} className="text-slate-400" />
                            {sum.total} công việc
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                            <Calendar size={13} className="text-slate-400" />
                            {formatDate(order.createdAt)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {sum.unassigned > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200 whitespace-nowrap">
                              <AlertCircle size={11} />
                              Còn {sum.unassigned} chưa gán
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 whitespace-nowrap">
                              <CheckCircle2 size={11} />
                              Đã phân công đủ
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetail(order);
                              }}
                              title="Xem chi tiết"
                              className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                              <Eye size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200 text-sm text-slate-500">
              <span>
                Hiển thị {filtered.length === 0 ? 0 : (Math.min(Math.max(currentPage, 1), totalPages) - 1) * ITEMS_PER_PAGE + 1}–{Math.min(Math.min(Math.max(currentPage, 1), totalPages) * ITEMS_PER_PAGE, filtered.length)} trên {filtered.length} đơn
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >Trước</button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 rounded-xl text-sm font-semibold transition ${page === currentPage ? 'bg-[#00285E] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >Sau</button>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      {/* ── MODAL CHI TIẾT ĐƠN ── */}
      <AnimatePresence>
        {selected && (
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
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5"
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-7 py-5 shrink-0"
                style={{ backgroundColor: "#00285E" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center">
                    <Car size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">
                      Đơn dịch vụ {orderCodes[selected.id] ?? `#${selected.id}`}
                    </h3>
                    <span className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-md bg-white/10 text-xs font-bold text-[#F9A11B]">
                      <Calendar size={11} />
                      {formatDateTime(selected.createdAt)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={closeDetail}
                  className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-7 py-6 space-y-5 bg-slate-50/50">
                {/* Khách hàng & phương tiện */}
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
                          {selected.vehicle?.customer?.name ||
                            selected.vehicle?.customer?.user?.fullName ||
                            "Khách vãng lai"}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="w-14 shrink-0 text-xs text-slate-400">
                          SĐT
                        </span>
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          {selected.vehicle?.customer?.phone ||
                            selected.vehicle?.customer?.user?.phoneNumber ||
                            "—"}
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
                          {selected.vehicle?.license_plate ?? "—"}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="w-14 shrink-0 text-xs text-slate-400">
                          Tên xe
                        </span>
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          {selected.vehicle?.model?.make?.make_name
                            ? `${selected.vehicle.model.make.make_name} `
                            : ""}
                          {selected.vehicle?.model?.model_name ?? "—"}
                          {selected.vehicle?.color
                            ? ` · ${selected.vehicle.color}`
                            : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tiến độ phân công */}
                <div className="bg-white rounded-2xl border border-slate-200/70 p-4 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Chờ phân công
                  </span>
                  <span className="text-sm font-semibold text-amber-600">
                    {assignableTasks.length}/{selectedTasks.length} công việc
                  </span>
                </div>

                {/* Danh sách công việc */}
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <ClipboardList size={14} className="text-slate-500" />
                      Công việc trong đơn
                    </label>
                    {assignableTasks.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setPickedTaskIds(
                            allPicked ? [] : assignableTasks.map((t) => t.id),
                          )
                        }
                        className="text-[11px] font-semibold text-[#00285E] hover:underline"
                      >
                        {allPicked ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                      </button>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden divide-y divide-slate-100">
                    {selectedTasks.map((task) => {
                      const statusCfg = TASK_STATUS_CONFIG[task.status] ?? {
                        label: task.status,
                        className:
                          "bg-slate-50 text-slate-500 border border-slate-200",
                      };
                      const assignments = task.assignments ?? [];
                      const canPick = assignments.length === 0;
                      const picked = pickedTaskIds.includes(task.id);
                      const issue = task.quotationItem?.issue;

                      return (
                        <label
                          key={task.id}
                          className={`flex items-start gap-3 px-4 py-4 transition-colors ${canPick
                              ? "cursor-pointer hover:bg-slate-50/70"
                              : "cursor-default"
                            } ${picked ? "bg-[#EDF3FF]/50" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={picked}
                            disabled={!canPick}
                            onChange={() => toggleTask(task.id)}
                            className="mt-1 accent-[#00285E] disabled:opacity-30 shrink-0"
                          />

                          <div className="flex-1 min-w-0">
                            {/* Dòng 1: dịch vụ + trạng thái */}
                            <div className="flex items-start justify-between gap-3">
                              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800 min-w-0">
                                <Wrench
                                  size={13}
                                  className="text-slate-400 shrink-0"
                                />
                                <span className="truncate">
                                  {task.catalog?.service_name ?? "—"}
                                </span>
                              </span>
                              <span
                                className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 ${statusCfg.className}`}
                              >
                                {statusCfg.label}
                              </span>
                            </div>

                            {/* Dòng 2: hạng mục lỗi */}
                            <div className="mt-1.5">
                              <span className="text-xs font-semibold text-slate-600">
                                {issue?.component?.name ?? "—"}
                              </span>
                              {issue?.error_description && (
                                <span className="text-xs text-slate-400">
                                  {" · "}
                                  {issue.error_description}
                                </span>
                              )}
                            </div>

                            {/* Dòng 3: thời lượng + kỹ thuật viên */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                <Clock size={11} />
                                Ước tính{" "}
                                {formatDuration(
                                  task.catalog?.estimated_duration,
                                )}
                              </span>
                              {assignments.length === 0 ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                                  <AlertCircle size={11} />
                                  Chưa có kỹ thuật viên
                                </span>
                              ) : (
                                assignments.map((a) => (
                                  <span
                                    key={a.id}
                                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700"
                                  >
                                    <span className="w-4 h-4 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                      <User
                                        size={9}
                                        className="text-emerald-600"
                                      />
                                    </span>
                                    {a.technician?.fullName ?? "—"}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 px-7 py-4 border-t border-slate-200 shrink-0 bg-white">
                <span className="text-xs font-semibold text-slate-500">
                  {pickedTaskIds.length > 0
                    ? `Đã chọn ${pickedTaskIds.length} công việc`
                    : "Chọn công việc để phân công"}
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={closeDetail}
                    className="h-11 px-5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200/60 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all"
                  >
                    Đóng
                  </button>
                  <button
                    onClick={openAssign}
                    disabled={pickedTaskIds.length === 0}
                    className="h-11 flex items-center gap-2 px-6 rounded-xl text-sm font-semibold text-white bg-[#00285E] shadow-lg shadow-[#00285E]/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    <UserPlus size={15} />
                    Phân công
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL CHỌN KỸ THUẬT VIÊN ── */}
      <AnimatePresence>
        {isAssignOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAssign}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5"
            >
              <div
                className="flex items-center justify-between px-6 py-4 shrink-0"
                style={{ backgroundColor: "#00285E" }}
              >
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    Chọn kỹ thuật viên
                  </h3>
                  <span className="text-xs font-semibold text-white/60">
                    {pickedTaskIds.length} công việc được chọn
                  </span>
                </div>
                <button
                  onClick={closeAssign}
                  className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-4 space-y-2 bg-slate-50/50">
                {technicians.length === 0 ? (
                  <p className="text-xs text-slate-400 italic px-1 py-6 text-center">
                    Không có kỹ thuật viên nào đang hoạt động.
                  </p>
                ) : (
                  technicians.map((tech) => (
                    <TechnicianCard
                      key={tech.id}
                      tech={tech}
                      picked={pickedTechId === tech.id}
                      onPick={() => setPickedTechId(tech.id)}
                      onViewDetail={() => setTechDetail(tech)}
                    />
                  ))
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-200 shrink-0 bg-white">
                <button
                  onClick={closeAssign}
                  disabled={isSaving}
                  className="h-11 px-5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200/60 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-40"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAssign}
                  disabled={pickedTechId == null || isSaving}
                  className="h-11 flex items-center gap-2 px-6 rounded-xl text-sm font-semibold text-white bg-[#00285E] shadow-lg shadow-[#00285E]/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Users size={15} />
                      Xác nhận
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL CHI TIẾT KỸ THUẬT VIÊN ── */}
      <AnimatePresence>
        {techDetail && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTechDetail(null)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5"
            >
              <div
                className="flex items-center justify-between px-6 py-4 shrink-0"
                style={{ backgroundColor: "#00285E" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center">
                    <User size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">
                      {techDetail.fullName}
                    </h3>
                    <span className="text-xs font-semibold text-white/60">
                      {techDetail.skill_level
                        ? (SKILL_LEVEL_LABEL[techDetail.skill_level] ??
                          techDetail.skill_level)
                        : "Kỹ thuật viên"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setTechDetail(null)}
                  className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5 bg-slate-50/50">
                {/* Thống kê khối lượng */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-white rounded-xl border border-slate-200/70 p-3 text-center">
                    <div className="text-xl font-bold text-slate-900">
                      {techDetail.remaining_count}
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Việc còn lại
                    </p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200/70 p-3 text-center">
                    <div className="text-xl font-bold text-emerald-600">
                      {techDetail.completed_count}
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Đã hoàn thành
                    </p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200/70 p-3 text-center">
                    <div className="text-xl font-bold text-slate-900">
                      {techDetail.total_assigned}
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Tổng được giao
                    </p>
                  </div>
                </div>

                {/* Phân bổ trạng thái */}
                <div className="bg-white rounded-2xl border border-slate-200/70 p-4 space-y-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Việc chưa xong
                  </span>
                  {(
                    [
                      ["IN_PROGRESS", techDetail.in_progress_count],
                      ["ASSIGNED", techDetail.pending_count],
                      ["PAUSED", techDetail.paused_count],
                    ] as const
                  ).map(([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center justify-between"
                    >
                      <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                        <span
                          className={`w-2 h-2 rounded-full ${ASSIGNMENT_STATUS_DOT[status]}`}
                        />
                        {ASSIGNMENT_STATUS_LABEL[status]}
                      </span>
                      <span className="text-sm font-bold text-slate-800">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Danh sách việc đang gánh */}
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Wrench size={14} className="text-slate-500" />
                      Công việc đang đảm nhận
                    </label>
                    <span className="bg-[#EDF3FF] text-[#00285E] px-2.5 py-1 rounded-full text-xs font-bold">
                      {techDetail.assignments?.length ?? 0} việc
                    </span>
                  </div>
                  {(techDetail.assignments ?? []).length === 0 ? (
                    <p className="text-xs text-slate-400 italic px-1 py-6 text-center bg-white rounded-2xl border border-slate-200/70">
                      Kỹ thuật viên đang rảnh, không có việc nào chưa xong.
                    </p>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden divide-y divide-slate-100">
                      {(techDetail.assignments ?? []).map((a) => (
                        <div key={a.id} className="px-4 py-3">
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {a.task?.catalog?.service_name ??
                                `Công việc #${a.task_id}`}
                            </p>
                            <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${ASSIGNMENT_STATUS_DOT[a.status] ??
                                  "bg-slate-300"
                                  }`}
                              />
                              {ASSIGNMENT_STATUS_LABEL[a.status] ?? a.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                            {a.task?.serviceOrder?.vehicle?.license_plate && (
                              <span className="inline-flex items-center gap-1">
                                <Car size={10} />
                                {a.task.serviceOrder.vehicle.license_plate}
                              </span>
                            )}
                            {a.task?.catalog?.estimated_duration ? (
                              <span className="inline-flex items-center gap-1">
                                <Clock size={10} />
                                Ước tính{" "}
                                {formatDuration(
                                  a.task.catalog.estimated_duration,
                                )}
                              </span>
                            ) : null}
                            <span className="inline-flex items-center gap-1">
                              <Calendar size={10} />
                              Phân công {formatDateTime(a.createdAt)}
                            </span>
                            {a.actual_start_time && (
                              <span className="inline-flex items-center gap-1">
                                <Clock size={10} />
                                Bắt đầu {formatDateTime(a.actual_start_time)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end px-6 py-4 border-t border-slate-200 shrink-0 bg-white">
                <button
                  onClick={() => setTechDetail(null)}
                  className="h-11 px-5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200/60 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL ĐỔI KỸ THUẬT VIÊN ── */}
      <AnimatePresence>
        {isPickingTech && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeReplaceTech}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5"
            >
              <div
                className="flex items-center justify-between px-6 py-4 shrink-0"
                style={{ backgroundColor: "#00285E" }}
              >
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    Đổi kỹ thuật viên
                  </h3>
                  <span className="text-xs font-semibold text-white/60">
                    {pickedAssignmentIds.length} công việc được chọn
                  </span>
                </div>
                <button
                  onClick={closeReplaceTech}
                  className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-4 space-y-2 bg-slate-50/50">
                {technicians.length === 0 ? (
                  <p className="text-xs text-slate-400 italic px-1 py-6 text-center">
                    Không có kỹ thuật viên nào đang hoạt động.
                  </p>
                ) : (
                  technicians.map((tech) => (
                    <TechnicianCard
                      key={tech.id}
                      tech={tech}
                      picked={replaceTechId === tech.id}
                      onPick={() => setReplaceTechId(tech.id)}
                      onViewDetail={() => setTechDetail(tech)}
                    />
                  ))
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-200 shrink-0 bg-white">
                <button
                  onClick={closeReplaceTech}
                  disabled={isReplacing}
                  className="h-11 px-5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200/60 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-40"
                >
                  Hủy
                </button>
                <button
                  onClick={handleReplaceTech}
                  disabled={replaceTechId == null || isReplacing}
                  className="h-11 flex items-center gap-2 px-6 rounded-xl text-sm font-semibold text-white bg-[#00285E] shadow-lg shadow-[#00285E]/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isReplacing ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Users size={15} />
                      Xác nhận
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL CHI TIẾT ĐƠN ĐÃ PHÂN CÔNG ── */}
      <AnimatePresence>
        {historySelected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeHistoryDetail}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5"
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-7 py-5 shrink-0"
                style={{ backgroundColor: "#00285E" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center">
                    <Car size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">
                      Đơn dịch vụ{" "}
                      {historyCodes[historySelected.id] ??
                        `#${historySelected.id}`}
                    </h3>
                    <span className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-md bg-white/10 text-xs font-bold text-[#F9A11B]">
                      <Calendar size={11} />
                      {formatDateTime(historySelected.createdAt)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={closeHistoryDetail}
                  className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-7 py-6 space-y-5 bg-slate-50/50">
                {/* Khách hàng & phương tiện */}
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
                          {historySelected.vehicle?.customer?.name ||
                            historySelected.vehicle?.customer?.user?.fullName ||
                            "Khách vãng lai"}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="w-14 shrink-0 text-xs text-slate-400">
                          SĐT
                        </span>
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          {historySelected.vehicle?.customer?.phone ||
                            historySelected.vehicle?.customer?.user
                              ?.phoneNumber ||
                            "—"}
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
                          {historySelected.vehicle?.license_plate ?? "—"}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="w-14 shrink-0 text-xs text-slate-400">
                          Tên xe
                        </span>
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          {historySelected.vehicle?.model?.make?.make_name
                            ? `${historySelected.vehicle.model.make.make_name} `
                            : ""}
                          {historySelected.vehicle?.model?.model_name ?? "—"}
                          {historySelected.vehicle?.color
                            ? ` · ${historySelected.vehicle.color}`
                            : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tình trạng phân công */}
                <div className="bg-white rounded-2xl border border-slate-200/70 p-4 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Tình trạng phân công
                  </span>
                  {orderSummary(historySelected).unassigned > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                      <AlertCircle size={11} />
                      Còn {orderSummary(historySelected).unassigned} chưa gán
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                      <CheckCircle2 size={11} />
                      Đã phân công đủ
                    </span>
                  )}
                </div>

                {/* Danh sách công việc + kỹ thuật viên */}
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Wrench size={14} className="text-slate-500" />
                      Công việc đã phân công
                    </label>
                    <span className="bg-[#EDF3FF] text-[#00285E] px-2.5 py-1 rounded-full text-xs font-bold">
                      {historySelected.tasks?.length ?? 0} công việc
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {(historySelected.tasks ?? []).map((task) => {
                      const cfg = HISTORY_TASK_STATUS_CONFIG[task.status];
                      return (
                        <div
                          key={task.id}
                          className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden"
                        >
                          {/* Tên công việc */}
                          <div className="px-4 py-3 border-b border-slate-100">
                            <div className="flex items-start justify-between gap-3">
                              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800 min-w-0">
                                <Wrench
                                  size={13}
                                  className="text-slate-400 shrink-0"
                                />
                                <span className="truncate">
                                  {task.catalog?.service_name ??
                                    `Công việc #${task.id}`}
                                </span>
                              </span>
                              <span
                                className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${cfg?.className ??
                                  "bg-slate-50 text-slate-500 border border-slate-200"
                                  }`}
                              >
                                {cfg?.label ?? task.status}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                <Clock size={11} />
                                Ước tính{" "}
                                {formatDuration(
                                  task.catalog?.estimated_duration,
                                )}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                <Calendar size={11} />
                                Tạo {formatDate(task.createdAt)}
                              </span>
                            </div>
                          </div>

                          {/* Kỹ thuật viên phụ trách — tích chọn để đổi */}
                          <div className="divide-y divide-slate-100">
                            {(task.assignments ?? []).map((a) => {
                              const picked = pickedAssignmentIds.includes(a.id);
                              const isDone = a.status === "COMPLETED";
                              return (
                                <div
                                  key={a.id}
                                  onClick={
                                    isDone ? undefined : () => toggleAssignment(a.id)
                                  }
                                  title={
                                    isDone
                                      ? "Phân công đã hoàn thành, không thể đổi người"
                                      : undefined
                                  }
                                  className={`px-4 py-3 flex items-center gap-3 transition-colors ${isDone
                                      ? "opacity-50"
                                      : `cursor-pointer ${picked
                                        ? "bg-[#EDF3FF]"
                                        : "hover:bg-slate-50"
                                      }`
                                    }`}
                                >
                                  <span
                                    className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${picked
                                        ? "bg-[#00285E] border-[#00285E] text-white"
                                        : "border-slate-300 bg-white"
                                      }`}
                                  >
                                    {picked && (
                                      <CheckCircle2 size={13} />
                                    )}
                                  </span>
                                  <div className="w-7 h-7 rounded-lg bg-[#EDF3FF] text-[#00285E] flex items-center justify-center shrink-0">
                                    <User size={13} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-slate-800 truncate">
                                      {a.technician?.fullName ?? "—"}
                                    </p>
                                    {(a.actual_start_time || a.remarks) && (
                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                                        {a.actual_start_time && (
                                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                            <Clock size={10} />
                                            Bắt đầu{" "}
                                            {formatDateTime(a.actual_start_time)}
                                          </span>
                                        )}
                                        {a.remarks && (
                                          <span className="text-[11px] text-slate-400 truncate">
                                            {a.remarks}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  {isDone && (
                                    <span className="shrink-0 text-[10px] font-bold text-emerald-600">
                                      Đã xong
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-7 py-4 border-t border-slate-200 shrink-0 bg-white">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">
                    {pickedAssignmentIds.length > 0
                      ? `Đã chọn ${pickedAssignmentIds.length} công việc`
                      : "Tích chọn công việc để đổi kỹ thuật viên"}
                  </span>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={closeHistoryDetail}
                      className="h-11 px-5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200/60 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all"
                    >
                      Đóng
                    </button>
                    <button
                      onClick={openReplaceTech}
                      disabled={pickedAssignmentIds.length === 0}
                      className="h-11 flex items-center gap-2 px-6 rounded-xl text-sm font-semibold text-white bg-[#00285E] shadow-lg shadow-[#00285E]/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      <Users size={15} />
                      Đổi kỹ thuật viên
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
