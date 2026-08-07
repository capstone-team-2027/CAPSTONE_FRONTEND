import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  LayoutDashboard,
  Wrench,
} from "lucide-react";
import type { RootState } from "../../../store/store";
import type { UserModel } from "../../../model/User";
import { useFetchClient } from "../../../hook/useFetchClient";
import { MY_SHIFTS_ENDPOINT } from "../../../constants/technician/myShiftsEndpoint";
import { TASK_ASSIGNMENT_ENDPOINTS } from "../../../constants/technician/taskAssignmentEndpoint";

interface ShiftSlot {
  id: number;
  slot_name: string;
  start_time: string;
  end_time: string;
}

interface ShiftData {
  id: number;
  work_date: string;
  is_confirmed: boolean;
  shiftSlot: ShiftSlot;
}

interface AssignmentTaskLite {
  taskId: number;
  taskType?: string;
  status?: string;
  serviceName?: string;
}

interface AssignmentLite {
  id: string;
  serviceOrderId: string;
  vehiclePlate: string;
  vehicleModel: string;
  customerName: string;
  status: string;
  tasks: AssignmentTaskLite[];
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

const todayStr = () => new Date().toISOString().split("T")[0];

const ASSIGNMENT_STATUS_LABEL: Record<string, string> = {
  ASSIGNED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang thực hiện",
  PAUSED: "Tạm dừng",
  WAITING_STOCK: "Chờ phụ tùng",
  PENDING_QC: "Chờ nghiệm thu",
  COMPLETED: "Hoàn thành",
};

const PAGE_SIZE = 6;

export default function TechnicianOverview() {
  const navigate = useNavigate();
  const { fetchPrivate } = useFetchClient();
  const user = useSelector(
    (state: RootState) => state.user.user as UserModel | null,
  );
  const [isLoadingShifts, setIsLoadingShifts] = useState(true);
  const [todayShifts, setTodayShifts] = useState<ShiftData[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [assignments, setAssignments] = useState<AssignmentLite[]>([]);
  const [assignmentsPage, setAssignmentsPage] = useState(1);
  const [isLoadingCompleted, setIsLoadingCompleted] = useState(true);
  const [completedTasks, setCompletedTasks] = useState<CompletedTaskLite[]>(
    [],
  );
  const [completedPage, setCompletedPage] = useState(1);

  useEffect(() => {
    const fetchShifts = async () => {
      setIsLoadingShifts(true);
      try {
        const today = todayStr();
        const response = await fetchPrivate(
          `${MY_SHIFTS_ENDPOINT.GET_MY_SHIFTS}?startDate=${today}&endDate=${today}`,
        );
        setTodayShifts(response?.data ?? []);
      } catch (error) {
        console.error("Lỗi khi lấy ca làm việc hôm nay:", error);
      } finally {
        setIsLoadingShifts(false);
      }
    };
    void fetchShifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchAssignments = async () => {
      setIsLoadingAssignments(true);
      try {
        const response = await fetchPrivate(
          TASK_ASSIGNMENT_ENDPOINTS.GET_MY_ASSIGNMENTS,
        );
        const raw = Array.isArray(response) ? response : (response?.data ?? []);
        const mapped: AssignmentLite[] = raw.map((so: any) => ({
          id: so.id?.toString() ?? "",
          serviceOrderId: so.id?.toString() ?? "",
          vehiclePlate: so.vehicle?.license_plate || "—",
          vehicleModel: so.vehicle?.model?.model_name || "—",
          customerName:
            so.vehicle?.customer?.user?.fullName ||
            so.vehicle?.customer?.name ||
            "Khách hàng",
          status: so.status || "ASSIGNED",
          tasks: (so.tasks ?? []).map((t: any) => ({
            taskId: t.id,
            taskType: t.type,
            status: t.status,
            serviceName: t.catalog?.service_name,
          })),
        }));
        setAssignments(mapped.filter((a) => a.status !== "COMPLETED"));
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
    const inProgressCount = assignments.filter(
      (a) => a.status === "IN_PROGRESS",
    ).length;
    const pendingQcCount = assignments.filter(
      (a) => a.status === "PENDING_QC",
    ).length;
    const totalTasksToday = assignments.reduce(
      (sum, a) => sum + a.tasks.length,
      0,
    );
    return {
      shiftsToday: todayShifts.length,
      inProgressCount,
      pendingQcCount,
      totalTasksToday,
    };
  }, [assignments, todayShifts]);

  const assignmentsTotalPages = Math.max(
    1,
    Math.ceil(assignments.length / PAGE_SIZE),
  );
  const pagedAssignments = useMemo(
    () =>
      assignments.slice(
        (assignmentsPage - 1) * PAGE_SIZE,
        assignmentsPage * PAGE_SIZE,
      ),
    [assignments, assignmentsPage],
  );

  const completedTotalPages = Math.max(
    1,
    Math.ceil(completedTasks.length / PAGE_SIZE),
  );
  const pagedCompletedTasks = useMemo(
    () =>
      completedTasks.slice(
        (completedPage - 1) * PAGE_SIZE,
        completedPage * PAGE_SIZE,
      ),
    [completedTasks, completedPage],
  );

  const displayName = user?.fullName || "Kỹ thuật viên";

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(-1)}
          title="Quay lại"
          className="mt-0.5 w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#00285E] hover:border-slate-300 active:scale-[0.97] transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-3">
            <LayoutDashboard className="text-[#00285E] shrink-0" size={28} />
            <span className="truncate">Tổng quan</span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            Xin chào, {displayName}. Đây là tổng quan công việc và ca làm việc của bạn hôm nay.
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100">
        <div className="p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EDF3FF] flex items-center justify-center shrink-0">
            <CalendarClock className="text-[#00285E]" size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Ca hôm nay
            </div>
            <div className="text-lg font-bold text-slate-800">
              {isLoadingShifts ? "—" : stats.shiftsToday}
            </div>
          </div>
        </div>
        <div className="p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Wrench className="text-blue-600" size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Đang thực hiện
            </div>
            <div className="text-lg font-bold text-slate-800">
              {isLoadingAssignments ? "—" : stats.inProgressCount}
            </div>
          </div>
        </div>
        <div className="p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <ClipboardList className="text-amber-600" size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Chờ nghiệm thu
            </div>
            <div className="text-lg font-bold text-slate-800">
              {isLoadingAssignments ? "—" : stats.pendingQcCount}
            </div>
          </div>
        </div>
        <div className="p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="text-emerald-600" size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Tổng công việc
            </div>
            <div className="text-lg font-bold text-slate-800">
              {isLoadingAssignments ? "—" : stats.totalTasksToday}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Công việc được giao trong hôm nay */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Wrench size={16} className="text-[#00285E]" />
              Công việc được giao trong hôm nay
            </h2>
            <button
              onClick={() => navigate("/technician/assignments")}
              className="text-xs font-bold text-[#00285E] hover:text-[#F9A11B] transition-colors"
            >
              Xem tất cả
            </button>
          </div>

          {isLoadingAssignments ? (
            <div className="py-8 flex items-center justify-center">
              <Loader2 className="animate-spin text-[#00285E]" size={24} />
            </div>
          ) : assignments.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400 italic">
              Hiện không có công việc nào đang được giao.
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {pagedAssignments.map((assignment) => (
                  <button
                    key={assignment.id}
                    onClick={() =>
                      navigate(`/technician/assignments/${assignment.id}`)
                    }
                    className="w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-800 truncate">
                        {assignment.vehiclePlate} · {assignment.vehicleModel}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {assignment.customerName} · {assignment.tasks.length} công việc
                      </div>
                    </div>
                    <span className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#00285E] bg-[#EDF3FF]">
                      {ASSIGNMENT_STATUS_LABEL[assignment.status] || assignment.status}
                    </span>
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

        {/* Các công việc đã hoàn thành */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              Các công việc đã hoàn thành
            </h2>
            <button
              onClick={() => navigate("/technician/work-history")}
              className="text-xs font-bold text-[#00285E] hover:text-[#F9A11B] transition-colors"
            >
              Xem tất cả
            </button>
          </div>

          {isLoadingCompleted ? (
            <div className="py-8 flex items-center justify-center">
              <Loader2 className="animate-spin text-[#00285E]" size={24} />
            </div>
          ) : completedTasks.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400 italic">
              Chưa có công việc nào hoàn thành.
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {pagedCompletedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border border-slate-100"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-800 truncate">
                        {task.vehiclePlate} · {task.vehicleModel}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {task.customerName} · {task.serviceName}
                      </div>
                    </div>
                    <span className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50">
                      Hoàn thành
                    </span>
                  </div>
                ))}
              </div>
              {completedTotalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-semibold text-slate-400">
                    Trang {completedPage}/{completedTotalPages}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        setCompletedPage((p) => Math.max(1, p - 1))
                      }
                      disabled={completedPage === 1}
                      className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() =>
                        setCompletedPage((p) =>
                          Math.min(completedTotalPages, p + 1),
                        )
                      }
                      disabled={completedPage === completedTotalPages}
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
    </div>
  );
}
