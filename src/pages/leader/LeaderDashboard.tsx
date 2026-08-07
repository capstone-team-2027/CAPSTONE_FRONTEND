import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Car, CheckCircle2, ClipboardCheck, ClipboardList, Clock, ShieldCheck, User, UserPlus } from "lucide-react";
import { useFetchClient } from "../../hook/useFetchClient";
import { TECHNICIAN_LEADER_TASK_ENDPOINTS } from "../../constants/technicianLeader/taskManagementEndpoint";
import type { GetFinalQcOrderResponse } from "../../model/dto/finalQcManagement.dto";
import type { GetLeaderTasksResponse } from "../../model/dto/leaderTaskManagement.dto";

interface InspectionStatistics {
  pendingQC: number;
  approvedToday: number;
  rejectedToday: number;
}

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("vi-VN") : "—";

export default function LeaderDashboard() {
  const navigate = useNavigate();
  const { fetchPrivate } = useFetchClient();

  const [statistics, setStatistics] = useState<InspectionStatistics | null>(null);
  const [pendingOrders, setPendingOrders] = useState<GetFinalQcOrderResponse[]>([]);
  const [unassignedOrders, setUnassignedOrders] = useState<GetLeaderTasksResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadOverview = async () => {
      setIsLoading(true);
      try {
        const [statsRes, ordersRes, tasksRes] = await Promise.all([
          fetchPrivate<InspectionStatistics>(
            TECHNICIAN_LEADER_TASK_ENDPOINTS.GET_INSPECTION_STATISTICS,
          ),
          fetchPrivate<GetFinalQcOrderResponse[]>(
            TECHNICIAN_LEADER_TASK_ENDPOINTS.GET_FINAL_QC_ORDERS,
          ),
          fetchPrivate<GetLeaderTasksResponse[]>(
            TECHNICIAN_LEADER_TASK_ENDPOINTS.GET_ALL_TASKS,
          ),
        ]);
        setStatistics(statsRes?.data ?? null);
        setPendingOrders(ordersRes?.data ?? []);
        setUnassignedOrders(tasksRes?.data ?? []);
      } catch (error) {
        console.error("Lỗi khi tải tổng quan phân công:", error);
      } finally {
        setIsLoading(false);
      }
    };
    void loadOverview();
  }, []);

  const unassignedTaskCount = unassignedOrders.reduce(
    (sum, order) => sum + order.tasks.length,
    0,
  );

  const stats = [
    {
      label: "Task chưa gán",
      value: isLoading ? "—" : unassignedTaskCount,
      icon: UserPlus,
      tint: "bg-blue-50 text-blue-600",
    },
    {
      label: "Chờ kiểm định",
      value: isLoading ? "—" : statistics?.pendingQC ?? 0,
      icon: Clock,
      tint: "bg-amber-50 text-amber-600",
    },
    {
      label: "Đạt chất lượng (hôm nay)",
      value: isLoading ? "—" : statistics?.approvedToday ?? 0,
      icon: CheckCircle2,
      tint: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Cần sửa lại (hôm nay)",
      value: isLoading ? "—" : statistics?.rejectedToday ?? 0,
      icon: ShieldCheck,
      tint: "bg-rose-50 text-rose-600",
    },
  ];

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* TITLE */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">
          Tổng quan phân công
        </h1>
        <p className="text-slate-500 text-sm">
          Theo dõi việc phân công kỹ thuật viên cho các task.
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${s.tint}`}>
                <Icon size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                  {s.value}
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* UNASSIGNED TASKS LIST */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList size={16} className="text-[#00285E]" />
              Xe có công việc chưa gán kỹ thuật viên
            </h2>
            <button
              onClick={() => navigate("/leader/assignments")}
              className="text-xs font-bold text-[#00285E] hover:text-[#F9A11B] transition-colors"
            >
              Xem tất cả
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-[#00285E] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : unassignedOrders.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#EDF3FF] flex items-center justify-center">
                <UserPlus size={26} className="text-[#00285E]" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Không có công việc nào chờ phân công
              </h3>
              <p className="text-xs text-slate-500 max-w-md">
                Danh sách sẽ hiển thị ngay khi có task mới cần gán kỹ thuật viên phụ trách.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {unassignedOrders.slice(0, 6).map((order) => (
                <button
                  key={order.id}
                  onClick={() => navigate("/leader/assignments")}
                  className="w-full flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#EDF3FF] flex items-center justify-center shrink-0 text-[#00285E]">
                      <Car size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-800 truncate">
                        {order.vehicle?.license_plate || "—"} · {order.vehicle?.model?.model_name || "—"}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                        <User size={11} className="shrink-0" />
                        {order.vehicle?.customer?.name ||
                          order.vehicle?.customer?.user?.fullName ||
                          "Khách hàng"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-[#00285E]">
                      {order.tasks.length} task chưa gán
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Tiếp nhận: {formatDate(order.createdAt)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* PENDING QC LIST */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ClipboardCheck size={16} className="text-[#00285E]" />
              Lệnh sửa chữa đang chờ nghiệm thu
            </h2>
            <button
              onClick={() => navigate("/leader/final-qc")}
              className="text-xs font-bold text-[#00285E] hover:text-[#F9A11B] transition-colors"
            >
              Xem tất cả
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-[#00285E] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#EDF3FF] flex items-center justify-center">
                <ClipboardCheck size={26} className="text-[#00285E]" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Không có lệnh sửa chữa nào đang chờ nghiệm thu
              </h3>
              <p className="text-xs text-slate-500 max-w-md">
                Danh sách sẽ hiển thị ngay khi có lệnh sửa chữa hoàn tất công việc và cần tổ trưởng nghiệm thu.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingOrders.slice(0, 6).map((order) => (
                <button
                  key={order.id}
                  onClick={() => navigate("/leader/final-qc")}
                  className="w-full flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#EDF3FF] flex items-center justify-center shrink-0 text-[#00285E]">
                      <Car size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-800 truncate">
                        {order.vehicle?.license_plate || "—"} · {order.vehicle?.model?.model_name || "—"}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                        <User size={11} className="shrink-0" />
                        {order.vehicle?.customer?.name ||
                          order.vehicle?.customer?.user?.fullName ||
                          "Khách hàng"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-[#00285E]">
                      {order.tasks?.length ?? 0} công việc
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Tiếp nhận: {formatDate(order.entry_time)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
