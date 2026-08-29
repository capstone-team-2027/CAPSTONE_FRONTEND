import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  Search,
  Zap,
} from "lucide-react";
import type { RootState } from "../../../store/store";
import type { UserModel } from "../../../model/User";
import { useFetchClient } from "../../../hook/useFetchClient";
import { TASK_ASSIGNMENT_ENDPOINTS } from "../../../constants/technician/taskAssignmentEndpoint";

interface AssignmentTaskLite {
  taskId: number;
  taskType?: string;
  status?: string;
  serviceName?: string;
  assignedAt?: string;
}

interface AssignmentLite {
  id: string;
  serviceOrderId: string;
  vehiclePlate: string;
  vehicleModel: string;
  customerName: string;
  status: string;
  tasks: AssignmentTaskLite[];
  assignedAt?: string;
}

interface CompletedTaskLite {
  id: string;
  serviceOrderId: string;
  vehiclePlate: string;
  vehicleModel: string;
  customerName: string;
  serviceName: string;
  completedAt?: string;
}

const formatAssignedTime = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
};

const ASSIGNMENT_STATUS_LABEL: Record<string, string> = {
  INSPECTING: "Đã tiếp nhận",
  ASSIGNED: "Đã phân công",
  IN_PROGRESS: "Đang thực hiện",
  PAUSED: "Tạm dừng",
  WAITING_STOCK: "Chờ phụ tùng",
  WAITING_FOR_PARTS: "Chờ phụ tùng",
  WAITING_APPROVAL: "Chờ khách duyệt",
  QC_CHECKING: "Đang QC",
  PENDING_QC: "Chờ nghiệm thu",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã huỷ lệnh",
  CLOSED_PARTIAL: "Đã đóng một phần",
};

const PAGE_SIZE = 6;

export default function TechnicianOverview() {
  const navigate = useNavigate();
  const { fetchPrivate } = useFetchClient();
  const user = useSelector(
    (state: RootState) => state.user.user as UserModel | null,
  );
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [assignments, setAssignments] = useState<AssignmentLite[]>([]);
  const [assignmentsPage, setAssignmentsPage] = useState(1);
  const [isLoadingCompleted, setIsLoadingCompleted] = useState(true);
  const [completedTasks, setCompletedTasks] = useState<CompletedTaskLite[]>(
    [],
  );
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<
    "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "ALL"
  >("ALL");

  useEffect(() => {
    const fetchAssignments = async () => {
      setIsLoadingAssignments(true);
      try {
        const response = await fetchPrivate(
          TASK_ASSIGNMENT_ENDPOINTS.GET_MY_ASSIGNMENTS,
        );
        const raw = Array.isArray(response) ? response : (response?.data ?? []);
        const mapped: AssignmentLite[] = raw.map((so: any) => {
          const tasks: AssignmentTaskLite[] = (so.tasks ?? []).map((t: any) => ({
            taskId: t.id,
            taskType: t.type,
            status: t.status,
            serviceName: t.catalog?.service_name,
            assignedAt: t.assignments?.[0]?.createdAt,
          }));
          const assignedTimestamps = tasks
            .map((t) => (t.assignedAt ? new Date(t.assignedAt).getTime() : null))
            .filter((ts): ts is number => ts !== null);
          const earliestAssignedAt =
            assignedTimestamps.length > 0
              ? new Date(Math.min(...assignedTimestamps)).toISOString()
              : undefined;
          const aggregatedStatus =
            tasks.length > 0 && tasks.every((t) => t.status === "COMPLETED")
              ? "COMPLETED"
              : tasks.some(
                    (t) =>
                      !!t.status &&
                      ["IN_PROGRESS", "PAUSED", "WAITING_STOCK", "WAITING_FOR_PARTS", "QC_CHECKING", "PENDING_QC"].includes(
                        t.status,
                      ),
                  )
                ? "IN_PROGRESS"
                : so.status || "ASSIGNED";
          return {
            id: so.id?.toString() ?? "",
            serviceOrderId: so.id?.toString() ?? "",
            vehiclePlate: so.vehicle?.license_plate || "—",
            vehicleModel: so.vehicle?.model?.model_name || "—",
            customerName:
              so.vehicle?.customer?.user?.fullName ||
              so.vehicle?.customer?.name ||
              "Khách hàng",
            status: aggregatedStatus,
            tasks,
            assignedAt: earliestAssignedAt,
          };
        });
        const sorted = [...mapped].sort((a, b) => {
          if (!a.assignedAt && !b.assignedAt) return 0;
          if (!a.assignedAt) return 1;
          if (!b.assignedAt) return -1;
          return new Date(a.assignedAt).getTime() - new Date(b.assignedAt).getTime();
        });
        setAssignments(sorted);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách công việc:", error);
      } finally {
        setIsLoadingAssignments(false);
      }
    };
    void fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchCompleted = async () => {
      setIsLoadingCompleted(true);
      try {
        const response = await fetchPrivate(
          TASK_ASSIGNMENT_ENDPOINTS.GET_COMPLETED_TASKS,
        );
        const raw = response?.data ?? [];
        const mapped: CompletedTaskLite[] = raw.map((assignment: any) => {
          const serviceOrder = assignment.task?.serviceOrder;
          const vehicle = serviceOrder?.vehicle;
          const customer = vehicle?.customer;
          return {
            id: assignment.id?.toString() ?? "",
            serviceOrderId: serviceOrder?.id?.toString() ?? "",
            vehiclePlate: vehicle?.license_plate || "—",
            vehicleModel: vehicle?.model?.model_name || "—",
            customerName:
              customer?.name || customer?.user?.fullName || "Khách hàng",
            serviceName:
              assignment.task?.catalog?.service_name ||
              `Công việc #${assignment.task?.id ?? ""}`,
            completedAt: assignment.actual_end_time || undefined,
          };
        });
        setCompletedTasks(mapped);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách công việc đã hoàn thành:", error);
      } finally {
        setIsLoadingCompleted(false);
      }
    };
    void fetchCompleted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const activeAssignments = assignments.filter((a) => a.status !== "COMPLETED");
    const inProgressCount = activeAssignments.filter(
      (a) => a.status === "IN_PROGRESS",
    ).length;
    const totalTasksToday = activeAssignments.reduce(
      (sum, a) => sum + a.tasks.length,
      0,
    );
    return {
      inProgressCount,
      totalTasksToday,
    };
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    const keyword = assignmentSearch.trim().toLowerCase();
    return assignments.filter((a) => {
      const isNotStarted = a.status === "ASSIGNED" || a.status === "INSPECTING";
      const isCompleted = a.status === "COMPLETED";
      const isInProgress = !isNotStarted && !isCompleted;

      const matchesFilter =
        assignmentStatusFilter === "ALL"
          ? !isCompleted
          : assignmentStatusFilter === "NOT_STARTED"
            ? isNotStarted
            : assignmentStatusFilter === "IN_PROGRESS"
              ? isInProgress
              : isCompleted;

      const matchesSearch =
        !keyword ||
        a.vehiclePlate.toLowerCase().includes(keyword) ||
        a.vehicleModel.toLowerCase().includes(keyword) ||
        a.customerName.toLowerCase().includes(keyword);

      return matchesFilter && matchesSearch;
    });
  }, [assignments, assignmentSearch, assignmentStatusFilter]);

  const assignmentsTotalPages = Math.max(
    1,
    Math.ceil(filteredAssignments.length / PAGE_SIZE),
  );
  const pagedAssignments = useMemo(
    () =>
      filteredAssignments.slice(
        (assignmentsPage - 1) * PAGE_SIZE,
        assignmentsPage * PAGE_SIZE,
      ),
    [filteredAssignments, assignmentsPage],
  );

  useEffect(() => {
    setAssignmentsPage(1);
  }, [assignmentSearch, assignmentStatusFilter]);

  const displayName = user?.fullName || "Kỹ thuật viên";

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(-1)}
          title="Quay lại"
          className="mt-0.5 w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl flex items-center justify-center bg-[#00285E] border border-[#00285E] text-white hover:bg-[#003C7D] hover:border-[#003C7D] active:scale-[0.97] transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-3">
            <span className="truncate">Tổng quan</span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            Xin chào, {displayName}. Đây là tổng quan công việc của bạn hôm nay.
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl px-4 py-4 bg-white border border-slate-200/60 shadow-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide truncate">
              Tổng công việc
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#F9A11B] flex items-center justify-center shrink-0 shadow-sm shadow-[#F9A11B]/30">
              <ClipboardList className="text-white" size={15} />
            </div>
          </div>
          <div className="text-xl font-black text-slate-800 leading-none">
            {isLoadingAssignments ? "—" : stats.totalTasksToday}
          </div>
        </div>
        <div className="rounded-2xl px-4 py-4 bg-white border border-slate-200/60 shadow-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide truncate">
              Đang thực hiện
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#00285E] flex items-center justify-center shrink-0 shadow-sm shadow-[#00285E]/30">
              <Zap className="text-white" size={15} />
            </div>
          </div>
          <div className="text-xl font-black text-slate-800 leading-none">
            {isLoadingAssignments ? "—" : stats.inProgressCount}
          </div>
        </div>
        <div className="rounded-2xl px-4 py-4 bg-white border border-slate-200/60 shadow-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide truncate">
              Đã hoàn thành
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/30">
              <CheckCircle2 className="text-white" size={15} />
            </div>
          </div>
          <div className="text-xl font-black text-slate-800 leading-none">
            {isLoadingCompleted ? "—" : completedTasks.length}
          </div>
        </div>
      </div>

      {/* Công việc được giao trong hôm nay */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">
            Công việc được giao trong hôm nay
          </h2>
          <button
            onClick={() => navigate("/technician/assignments")}
            className="text-xs font-bold text-[#00285E] hover:text-[#F9A11B] transition-colors"
          >
            Xem tất cả
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={assignmentSearch}
              onChange={(e) => setAssignmentSearch(e.target.value)}
              placeholder="Tìm biển số, dòng xe, khách hàng..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#00285E] focus:border-[#00285E]"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {(
              [
                { key: "ALL", label: "Tất cả" },
                { key: "NOT_STARTED", label: "Chưa bắt đầu" },
                { key: "IN_PROGRESS", label: "Đang thực hiện" },
                { key: "COMPLETED", label: "Đã hoàn thành" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setAssignmentStatusFilter(opt.key)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                  assignmentStatusFilter === opt.key
                    ? "bg-[#00285E] text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {isLoadingAssignments ? (
            <div className="py-8 flex items-center justify-center">
              <Loader2 className="animate-spin text-[#00285E]" size={24} />
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400 italic">
              {assignments.length === 0
                ? "Hiện không có công việc nào đang được giao."
                : "Không tìm thấy công việc phù hợp."}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {pagedAssignments.map((assignment) => (
                  <button
                    key={assignment.id}
                    onClick={() =>
                      navigate(
                        assignment.status === "COMPLETED"
                          ? "/technician/work-history"
                          : "/technician/assignments",
                        {
                          state: { openServiceOrderId: assignment.serviceOrderId },
                        },
                      )
                    }
                    className="w-full flex items-stretch gap-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-colors text-left overflow-hidden"
                  >
                    <span className="w-1 shrink-0 bg-[#00285E]" />
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-3 py-3 pr-3.5">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-800 truncate">
                          {assignment.vehiclePlate} · {assignment.vehicleModel}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {assignment.customerName} · {assignment.tasks.length} công việc
                        </div>
                        {formatAssignedTime(assignment.assignedAt) && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Được giao lúc {formatAssignedTime(assignment.assignedAt)}
                          </div>
                        )}
                      </div>
                      <span className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#00285E] bg-[#EDF3FF]">
                        {ASSIGNMENT_STATUS_LABEL[assignment.status] || assignment.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              {assignmentsTotalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-semibold text-slate-400">
                    Trang {assignmentsPage}/{assignmentsTotalPages}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        setAssignmentsPage((p) => Math.max(1, p - 1))
                      }
                      disabled={assignmentsPage === 1}
                      className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() =>
                        setAssignmentsPage((p) =>
                          Math.min(assignmentsTotalPages, p + 1),
                        )
                      }
                      disabled={assignmentsPage === assignmentsTotalPages}
                      className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
    </div>
  );
}
