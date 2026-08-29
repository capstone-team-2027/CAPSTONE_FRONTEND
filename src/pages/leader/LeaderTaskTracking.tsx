import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  Search,
  Car,
  User,
  Wrench,
  ChevronDown,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock,
  CalendarClock,
  X,
  Plus,
  Trash2,
  FileWarning,
} from "lucide-react";
import { useFetchClient } from "../../hook/useFetchClient";
import { useSocket } from "../../hook/useSocket";
import { TECHNICIAN_LEADER_TASK_ENDPOINTS } from "../../constants/technicianLeader/taskManagementEndpoint";
import { LEADER_QUOTE_MANAGEMENT_ENDPOINTS } from "../../constants/technicianLeader/quoteManagementEndpoints";
import type { TaskTrackingServiceOrder } from "../../model/dto/leaderTaskTracking.dto";
import type { VehicleComponent } from "../../model/dto/leaderIssueReport.dto";

const TASK_STATUS_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  PENDING: { label: "Chờ thực hiện", className: "bg-slate-100 text-slate-500", dot: "bg-slate-400" },
  ASSIGNED: { label: "Đã giao thợ", className: "bg-indigo-50 text-indigo-600", dot: "bg-indigo-500" },
  IN_PROGRESS: { label: "Đang thực hiện", className: "bg-blue-50 text-blue-600", dot: "bg-blue-500" },
  PAUSED: { label: "Tạm dừng", className: "bg-amber-50 text-amber-600", dot: "bg-amber-500" },
  WAITING_STOCK: { label: "Chờ phụ tùng", className: "bg-orange-50 text-orange-600", dot: "bg-orange-500" },
  COMPLETED: { label: "Hoàn thành", className: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-500" },
  CANCELLED: { label: "Đã hủy", className: "bg-rose-50 text-rose-600", dot: "bg-rose-500" },
};

const getTaskStatusCfg = (status: string) =>
  TASK_STATUS_CONFIG[status] || { label: status, className: "bg-slate-100 text-slate-500", dot: "bg-slate-400" };

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("vi-VN") : "—";

const formatDateTime = (d?: string | null) =>
  d
    ? new Date(d).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

export default function LeaderTaskTracking() {
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchPrivate } = useFetchClient();
  const socket = useSocket();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();

  const [orders, setOrders] = useState<TaskTrackingServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [completingId, setCompletingId] = useState<number | null>(null);

  // Modal xác nhận trước khi hoàn thành 1 công việc (bấm "Xác nhận hoàn thành" trên danh sách)
  const [completeConfirmTarget, setCompleteConfirmTarget] = useState<{
    taskId: number;
    assignmentId: number;
    taskType: string;
    taskName: string;
    orderId: number;
    orderLabel: string;
  } | null>(null);

  // Modal hỏi có lỗi phát hiện không khi xác nhận hoàn thành task INSPECTION
  const [components, setComponents] = useState<VehicleComponent[]>([]);
  const [inspectionCompleteTarget, setInspectionCompleteTarget] = useState<{
    orderId: number;
    assignmentId: number;
    taskId: number;
    orderLabel: string;
  } | null>(null);
  const [selectedComponentIds, setSelectedComponentIds] = useState<Set<number>>(new Set());
  const [componentDescriptions, setComponentDescriptions] = useState<Record<number, string>>({});
  const [issueNote, setIssueNote] = useState("");
  const [isSubmittingIssues, setIsSubmittingIssues] = useState(false);
  const [componentSearchTerm, setComponentSearchTerm] = useState("");

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const result = await fetchPrivate(TECHNICIAN_LEADER_TASK_ENDPOINTS.GET_TASK_TRACKING, "GET");
      setOrders(result.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadComponents = async () => {
    try {
      const result = await fetchPrivate(LEADER_QUOTE_MANAGEMENT_ENDPOINTS.GET_COMPONENTS, "GET");
      setComponents(result.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    void loadOrders();
    void loadComponents();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = () => void loadOrders();
    socket.on("new_notification", handleNewNotification);
    socket.on("PROGRESS_UPDATED", handleNewNotification);
    return () => {
      socket.off("new_notification", handleNewNotification);
      socket.off("PROGRESS_UPDATED", handleNewNotification);
    };
  }, [socket]);

  // Vào từ card cảnh báo "Có công việc vừa hoàn thành" bên LeaderLayout — tự bung đúng đơn đó
  // ra để KTV trưởng thấy ngay danh sách công việc, khỏi phải tự tìm và bấm mở.
  useEffect(() => {
    const expandServiceOrderId = (
      location.state as { expandServiceOrderId?: number } | null
    )?.expandServiceOrderId;
    if (!expandServiceOrderId || orders.length === 0) return;
    if (!orders.some((order) => order.id === expandServiceOrderId)) return;
    setExpandedIds((prev) => new Set(prev).add(expandServiceOrderId));
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const toggleExpand = (orderId: number) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });

  const handleCompleteAssignment = async (assignmentId: number) => {
    setCompletingId(assignmentId);
    try {
      await fetchPrivate(
        TECHNICIAN_LEADER_TASK_ENDPOINTS.COMPLETE_ASSIGNMENT(assignmentId),
        "PATCH",
      );
      showToast("Đã xác nhận hoàn thành công việc", "success");
      await loadOrders();
    } catch (error: any) {
      console.error(error);
      showToast(error?.message || "Không thể xác nhận hoàn thành.", "warning");
    } finally {
      setCompletingId(null);
    }
  };

  const closeCompleteConfirm = () => setCompleteConfirmTarget(null);

  const handleConfirmComplete = () => {
    if (!completeConfirmTarget) return;
    const target = completeConfirmTarget;
    setCompleteConfirmTarget(null);
    if (target.taskType === "INSPECTION") {
      openInspectionComplete(target.orderId, target.orderLabel, target.taskId, target.assignmentId);
    } else {
      void handleCompleteAssignment(target.assignmentId);
    }
  };

  // Bấm hoàn thành trên task INSPECTION -> hỏi có lỗi phát hiện không trước khi đóng task,
  // vì hoàn thành xong mới có thể lập báo giá cho khách (createIssueReports tự complete task).
  // Task REPAIR vẫn hoàn thành thẳng như cũ, không hỏi gì (lỗi phát sinh giữa chừng để sau).
  const openInspectionComplete = (orderId: number, orderLabel: string, taskId: number, assignmentId: number) => {
    setInspectionCompleteTarget({ orderId, assignmentId, taskId, orderLabel });
    setSelectedComponentIds(new Set());
    setComponentDescriptions({});
    setIssueNote("");
    setComponentSearchTerm("");
  };

  const closeInspectionComplete = () => setInspectionCompleteTarget(null);

  const toggleComponent = (componentId: number) =>
    setSelectedComponentIds((prev) => {
      const next = new Set(prev);
      if (next.has(componentId)) next.delete(componentId);
      else next.add(componentId);
      return next;
    });

  const updateComponentDescription = (componentId: number, value: string) =>
    setComponentDescriptions((prev) => ({ ...prev, [componentId]: value }));

  // Kiểm tra xe chắc chắn phát hiện lỗi/vấn đề gì đó (đó là lý do khách mang xe tới) — không có
  // kịch bản "kiểm tra xong mà không có gì để báo cáo", nên chỉ có 1 lối duy nhất: ghi lỗi.
  // Gọi createIssueReports (tự complete task INSPECTION + tạo Vehicle_Issues),
  // rồi điều hướng thẳng sang bước lập báo giá, không cần quay lại chọn lệnh sửa chữa từ đầu.
  const handleSubmitInspectionIssues = async () => {
    if (!inspectionCompleteTarget || selectedComponentIds.size === 0) return;
    setIsSubmittingIssues(true);
    try {
      const payload = {
        task_id: inspectionCompleteTarget.taskId,
        issues: Array.from(selectedComponentIds).map((componentId) => ({
          component_id: componentId,
          description: componentDescriptions[componentId]?.trim() || "Chưa mô tả chi tiết",
        })),
        note: issueNote || undefined,
      };
      const result = await fetchPrivate(
        LEADER_QUOTE_MANAGEMENT_ENDPOINTS.CREATE_ISSUE_REPORT,
        "POST",
        payload,
      );
      showToast("Đã ghi nhận lỗi, chuyển sang lập báo giá.", "success");
      const order = orders.find((o) => o.id === inspectionCompleteTarget.orderId);
      navigate("/leader/quotes/create", {
        state: {
          fromTaskTracking: true,
          taskId: inspectionCompleteTarget.taskId,
          order,
          savedIssues: result.data || [],
        },
      });
    } catch (error: any) {
      console.error(error);
      showToast(error?.message || "Không thể ghi nhận lỗi.", "warning");
    } finally {
      setIsSubmittingIssues(false);
    }
  };

  const componentLabel = (id: number) => {
    const c = components.find((item) => item.id === id);
    if (!c) return `Linh kiện #${id}`;
    const parent = c.parent_id ? components.find((p) => p.id === c.parent_id) : null;
    return parent ? `${parent.name} · ${c.name}` : c.name;
  };

  const filteredComponents = useMemo(() => {
    const leafComponents = components.filter((c) => c.parent_id != null);
    const keyword = componentSearchTerm.trim().toLowerCase();
    if (!keyword) return leafComponents;
    return leafComponents.filter((c) => componentLabel(c.id).toLowerCase().includes(keyword));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [components, componentSearchTerm]);

  const filteredOrders = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return orders;
    return orders.filter((order) => {
      const vehicle = order.vehicle;
      const customer = vehicle?.customer;
      return (
        vehicle?.license_plate?.toLowerCase().includes(keyword) ||
        customer?.name?.toLowerCase().includes(keyword) ||
        customer?.user?.fullName?.toLowerCase().includes(keyword) ||
        order.tasks.some((t) => t.catalog?.service_name?.toLowerCase().includes(keyword)) ||
        order.tasks.some((t) =>
          t.assignments.some((a) => a.technician?.fullName?.toLowerCase().includes(keyword)),
        )
      );
    });
  }, [orders, searchTerm]);

  const kpiCounts = useMemo(
    () => ({
      activeOrders: orders.length,
      inProgressTasks: orders.reduce(
        (sum, o) => sum + o.tasks.filter((t) => t.status === "IN_PROGRESS").length,
        0,
      ),
      waitingStockTasks: orders.reduce(
        (sum, o) => sum + o.tasks.filter((t) => t.status === "WAITING_STOCK").length,
        0,
      ),
    }),
    [orders],
  );

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-6xl w-full mx-auto">
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
          <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2">
            Theo dõi công việc theo đơn
          </h1>
          <p className="text-slate-500 text-sm">
            Xem tất cả công việc và kỹ thuật viên đang thực hiện theo từng lệnh sửa chữa.
          </p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Đơn đang hoạt động",
            value: kpiCounts.activeOrders,
            icon: <Car size={20} />,
            color: "#00285E",
            bg: "#EDF3FF",
          },
          {
            label: "Task đang thực hiện",
            value: kpiCounts.inProgressTasks,
            icon: <Wrench size={20} />,
            color: "#2563EB",
            bg: "#EFF6FF",
          },
          {
            label: "Đang chờ phụ tùng",
            value: kpiCounts.waitingStockTasks,
            icon: <Clock size={20} />,
            color: "#D97706",
            bg: "#FEF3C7",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: card.bg, color: card.color }}
            >
              {card.icon}
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight">{card.value}</div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
        <div className="relative group">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00285E] transition-colors"
          />
          <input
            type="text"
            placeholder="Tìm theo biển số, khách hàng, dịch vụ, kỹ thuật viên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-11 pr-4 py-2.5 text-sm font-semibold placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
          />
        </div>
      </div>

      {/* LIST */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 size={48} className="mb-4 text-[#00285E] animate-spin" />
          <p className="text-sm font-semibold">Đang tải danh sách...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs flex flex-col items-center justify-center py-20 text-slate-400">
          <AlertCircle size={48} className="mb-4 text-slate-300" />
          <p className="text-lg font-semibold mb-1">Không có lệnh sửa chữa nào đang hoạt động</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order, orderIdx) => {
            const isExpanded = expandedIds.has(order.id);
            const vehicle = order.vehicle;
            const customer = vehicle?.customer;
            const totalTasks = order.tasks.length;
            const completedTasks = order.tasks.filter((t) => t.status === "COMPLETED").length;
            const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(orderIdx * 0.04, 0.3) }}
                className="flex items-stretch bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden"
              >
                <span className="w-1.5 shrink-0 bg-[#00285E]" />
                <div className="flex-1 min-w-0 flex flex-col">
                <button
                  onClick={() => toggleExpand(order.id)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Car size={15} className="text-[#00285E] shrink-0" />
                        <span className="text-sm font-bold text-slate-800 truncate">
                          {vehicle?.license_plate || "—"} · {vehicle?.model?.model_name || "—"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 truncate mt-0.5">
                        <User size={11} className="shrink-0" />
                        {customer?.name || customer?.user?.fullName || "Khách vãng lai"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="hidden sm:flex flex-col items-end gap-1.5 w-36">
                      <div className="flex items-center justify-between w-full text-[11px]">
                        <span className="font-bold text-[#00285E]">
                          {completedTasks}/{totalTasks} công việc
                        </span>
                        <span className="text-slate-400">{progressPct}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPct}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className="h-full rounded-full bg-[#00285E]"
                        />
                      </div>
                    </div>
                    <div className="text-right hidden md:block">
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 justify-end">
                        <CalendarClock size={11} />
                        Tiếp nhận: {formatDate(order.createdAt)}
                      </div>
                    </div>
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={18} className="text-slate-400" />
                    </motion.div>
                  </div>
                </button>

                {/* Progress bar mobile */}
                <div className="sm:hidden px-5 pb-3 -mt-1">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-[#00285E]">
                      {completedTasks}/{totalTasks} công việc
                    </span>
                    <span className="text-slate-400">{progressPct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#00285E]"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-slate-100 bg-slate-50/60 p-3 space-y-2.5">
                        {order.tasks.length === 0 ? (
                          <p className="px-5 py-4 text-sm text-slate-400 italic">
                            Chưa có công việc nào cho lệnh sửa chữa này.
                          </p>
                        ) : (
                          order.tasks.map((task, taskIdx) => {
                            const statusCfg = getTaskStatusCfg(task.status);
                            const activeAssignments = task.assignments.filter(
                              (a) => a.status !== "CANCELLED",
                            );
                            // PENDING_QC = KTV đã tự bấm "hoàn tất" task REPAIR trên máy họ, đang
                            // chờ trưởng nghiệm thu; IN_PROGRESS = thợ báo miệng, trưởng tự bấm.
                            const completableAssignment = task.assignments.find(
                              (a) => a.status === "IN_PROGRESS" || a.status === "PENDING_QC",
                            );
                            const isAwaitingQc = completableAssignment?.status === "PENDING_QC";
                            // Task INSPECTION đã COMPLETED do chính KTV tự bấm hoàn thành (không
                            // qua Leader xác nhận) thì chưa từng được hỏi "có lỗi phát hiện không"
                            // — luồng Leader tự xác nhận (completeConfirmTarget) đã tự hỏi sẵn rồi,
                            // nên chỉ cần bù riêng cho case này khi chưa có Vehicle_Issues nào.
                            const needsIssueReport =
                              task.type === "INSPECTION" &&
                              task.status === "COMPLETED" &&
                              !(task.issues && task.issues.length > 0);
                            const technicianNames =
                              activeAssignments
                                .map((a) => a.technician?.fullName)
                                .filter(Boolean)
                                .join(", ") || "Chưa có kỹ thuật viên phụ trách";
                            return (
                              <motion.div
                                key={task.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2, delay: taskIdx * 0.03 }}
                                className="flex items-stretch gap-3 rounded-xl border border-slate-200/70 bg-white overflow-hidden"
                              >
                                <span className="w-1 shrink-0 bg-[#00285E]" />
                                <div className="flex-1 min-w-0 flex items-center justify-between gap-4 py-3.5 pr-4">
                                  <div className="min-w-0">
                                    <span className="text-sm font-semibold text-slate-800 truncate block">
                                      {task.catalog?.service_name || `Công việc #${task.id}`}
                                    </span>
                                    <p className="text-xs text-slate-400 truncate mt-0.5">
                                      {technicianNames}
                                      {completableAssignment?.actual_start_time &&
                                        ` · Bắt đầu ${formatDateTime(completableAssignment.actual_start_time)}`}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    {isAwaitingQc ? (
                                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap bg-violet-50 text-violet-600">
                                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                                        Chờ nghiệm thu
                                      </span>
                                    ) : (
                                      <span
                                        className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${statusCfg.className}`}
                                      >
                                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                                        {statusCfg.label}
                                      </span>
                                    )}
                                    {completableAssignment && (
                                      <button
                                        onClick={() =>
                                          setCompleteConfirmTarget({
                                            taskId: task.id,
                                            assignmentId: completableAssignment.id,
                                            taskType: task.type,
                                            taskName: task.catalog?.service_name || `Công việc #${task.id}`,
                                            orderId: order.id,
                                            orderLabel: `${vehicle?.license_plate || "—"} · ${vehicle?.model?.model_name || "—"}`,
                                          })
                                        }
                                        disabled={completingId === completableAssignment.id}
                                        className="shrink-0 h-9 flex items-center gap-1.5 px-3.5 rounded-lg text-xs font-bold text-white bg-[#00285E] hover:brightness-125 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {completingId === completableAssignment.id ? (
                                          <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                          <CheckCircle2 size={14} />
                                        )}
                                        Xác nhận hoàn thành
                                      </button>
                                    )}
                                    {needsIssueReport && (
                                      <button
                                        onClick={() =>
                                          openInspectionComplete(
                                            order.id,
                                            `${vehicle?.license_plate || "—"} · ${vehicle?.model?.model_name || "—"}`,
                                            task.id,
                                            task.assignments.find((a) => a.status === "COMPLETED")?.id ?? 0,
                                          )
                                        }
                                        className="shrink-0 h-9 flex items-center gap-1.5 px-3.5 rounded-lg text-xs font-bold text-white bg-[#00285E] hover:brightness-125 active:scale-[0.97] transition-all"
                                      >
                                        <FileWarning size={14} />
                                        Tạo báo cáo lỗi
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* MODAL: XÁC NHẬN TRƯỚC KHI HOÀN THÀNH 1 CÔNG VIỆC */}
      <AnimatePresence>
        {completeConfirmTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={closeCompleteConfirm}
            />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden ring-1 ring-slate-900/5"
            >
              <div className="p-6 text-center">
                <div className="mx-auto mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50">
                  <CheckCircle2 size={22} className="text-emerald-600" />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  Xác nhận hoàn thành công việc?
                </h3>
                <p className="text-sm text-slate-500 mt-1.5">
                  {completeConfirmTarget.taskName} · {completeConfirmTarget.orderLabel}
                </p>
              </div>
              <div className="flex items-center gap-3 px-6 pb-6">
                <button
                  onClick={closeCompleteConfirm}
                  className="flex-1 h-11 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200/60 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmComplete}
                  className="flex-1 h-11 rounded-xl text-sm font-bold text-white bg-[#00285E] hover:brightness-125 active:scale-[0.98] transition-all"
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: HỎI CÓ LỖI PHÁT HIỆN KHÔNG TRƯỚC KHI HOÀN THÀNH TASK INSPECTION */}
      <AnimatePresence>
        {inspectionCompleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={closeInspectionComplete}
            />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5"
            >
              <div
                className="relative flex items-start justify-between px-6 pt-6 pb-5 shrink-0 text-white overflow-hidden"
                style={{ backgroundColor: "#00285E" }}
              >
                <div className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-white/10" />
                <div className="relative flex items-center gap-3">
                  <div
                    className="flex items-center justify-center w-11 h-11 rounded-2xl shrink-0"
                    style={{ backgroundColor: "#F9A11B" }}
                  >
                    <FileWarning size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-white/80 uppercase tracking-widest">
                      {inspectionCompleteTarget.orderLabel}
                    </p>
                    <h3 className="text-lg font-bold text-white leading-none">
                      Báo cáo lỗi sau kiểm tra
                    </h3>
                  </div>
                </div>
                <button
                  onClick={closeInspectionComplete}
                  className="relative p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4 bg-slate-50/50">
                <p className="text-xs text-slate-500">
                  Tick chọn linh kiện bị lỗi (có thể chọn nhiều), rồi mô tả cụ thể để lập báo giá cho khách.
                </p>

                <div className="relative group">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00285E] transition-colors"
                  />
                  <input
                    type="text"
                    value={componentSearchTerm}
                    onChange={(e) => setComponentSearchTerm(e.target.value)}
                    placeholder="Tìm linh kiện, ví dụ: phanh trước, lọc dầu..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs font-semibold placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                  />
                </div>

                {filteredComponents.length === 0 ? (
                  <p className="text-xs text-slate-400 italic px-1">Không tìm thấy linh kiện phù hợp.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                    {filteredComponents.map((c) => {
                      const checked = selectedComponentIds.has(c.id);
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold cursor-pointer transition-colors ${
                            checked
                              ? "border-[#00285E] bg-[#EDF3FF] text-slate-800"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleComponent(c.id)}
                            className="accent-[#00285E] shrink-0"
                          />
                          <span className="truncate">{componentLabel(c.id)}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {selectedComponentIds.size > 0 && (
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Mô tả chi tiết từng lỗi đã chọn
                    </span>
                    {Array.from(selectedComponentIds).map((componentId) => (
                      <div key={componentId} className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-xs font-bold text-[#00285E] mb-1.5">{componentLabel(componentId)}</p>
                        <div className="flex items-start gap-2">
                          <input
                            type="text"
                            value={componentDescriptions[componentId] ?? ""}
                            onChange={(e) => updateComponentDescription(componentId, e.target.value)}
                            placeholder="Mô tả lỗi thợ vừa báo"
                            className="flex-1 h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E]"
                          />
                          <button
                            type="button"
                            onClick={() => toggleComponent(componentId)}
                            className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                            title="Bỏ chọn"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Ghi chú chung (tuỳ chọn)
                  </label>
                  <textarea
                    rows={2}
                    value={issueNote}
                    onChange={(e) => setIssueNote(e.target.value)}
                    placeholder="Ghi chú thêm..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 shrink-0 bg-white">
                <button
                  onClick={() => void handleSubmitInspectionIssues()}
                  disabled={selectedComponentIds.size === 0 || isSubmittingIssues}
                  className="h-10 flex items-center gap-1.5 px-5 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-[#003C7D] to-[#00285E] shadow-lg shadow-[#00285E]/25 hover:shadow-[#00285E]/40 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmittingIssues ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Tạo báo cáo lỗi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
