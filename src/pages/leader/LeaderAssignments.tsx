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
  const effectiveSearch = (searchQuery || localSearch).toLowerCase();

  // Đơn đang mở chi tiết
  const [selected, setSelected] = useState<GetLeaderTasksResponse | null>(null);
  // Task được tích chọn trong modal chi tiết
  const [pickedTaskIds, setPickedTaskIds] = useState<number[]>([]);
  // Modal chọn kỹ thuật viên
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [pickedTechId, setPickedTechId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
  const orderSummary = (order: GetLeaderTasksResponse) => {
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

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              Danh sách đơn dịch vụ
            </h2>
            <span className="bg-[#EDF3FF] text-[#00285E] px-2.5 py-0.5 rounded-full text-xs font-bold">
              {filtered.length} đơn
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
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full sm:w-72 bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
            />
          </div>
        </div>

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
                filtered.map((order) => {
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
                          className={`flex items-start gap-3 px-4 py-4 transition-colors ${
                            canPick
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
                  technicians.map((tech) => {
                    const picked = pickedTechId === tech.id;
                    return (
                      <button
                        key={tech.id}
                        onClick={() => setPickedTechId(tech.id)}
                        className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition-all ${
                          picked
                            ? "border-[#00285E] bg-white ring-1 ring-[#00285E]"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 rounded-full bg-[#EDF3FF] flex items-center justify-center shrink-0">
                            <User size={15} className="text-[#00285E]" />
                          </span>
                          <span className="text-sm font-semibold text-slate-800">
                            {tech.fullName}
                          </span>
                        </div>
                        {picked && (
                          <CheckCircle2
                            size={18}
                            className="text-[#00285E] shrink-0"
                          />
                        )}
                      </button>
                    );
                  })
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
    </div>
  );
}