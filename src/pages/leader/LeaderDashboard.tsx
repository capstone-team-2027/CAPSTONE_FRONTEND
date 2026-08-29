import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Car, ClipboardList, User, UserPlus, Wrench } from "lucide-react";
import { useFetchClient } from "../../hook/useFetchClient";
import { TECHNICIAN_LEADER_TASK_ENDPOINTS } from "../../constants/technicianLeader/taskManagementEndpoint";
import type { TaskTrackingServiceOrder } from "../../model/dto/leaderTaskTracking.dto";

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("vi-VN") : "—";

// Lịch hẹn lễ tân đã tiếp nhận (Appointment.status) nhưng chưa tạo lệnh sửa chữa (Service_Order)
// — dùng chung API với LeaderAppointmentList.tsx (GET_RECEIVED_APPOINTMENTS), lọc còn lại những
// cái chưa có serviceOrder, khác hẳn "task chưa gán KTV" (task chỉ tồn tại sau khi có lệnh).
interface ReceivedAppointment {
  id: number;
  createdAt?: string;
  scheduled_time?: string;
  serviceOrder?: { id: number } | null;
  vehicle?: {
    license_plate?: string;
    model?: { model_name?: string; make?: { make_name?: string } };
  };
  customer?: { name?: string; user?: { fullName?: string } };
}

export default function LeaderDashboard() {
  const navigate = useNavigate();
  const { fetchPrivate } = useFetchClient();

  const [pendingAppointments, setPendingAppointments] = useState<ReceivedAppointment[]>([]);
  const [activeOrders, setActiveOrders] = useState<TaskTrackingServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadOverview = async () => {
      setIsLoading(true);
      try {
        const [appointmentsRes, trackingRes] = await Promise.all([
          fetchPrivate<ReceivedAppointment[]>(
            TECHNICIAN_LEADER_TASK_ENDPOINTS.GET_RECEIVED_APPOINTMENTS,
          ),
          fetchPrivate<TaskTrackingServiceOrder[]>(
            TECHNICIAN_LEADER_TASK_ENDPOINTS.GET_TASK_TRACKING,
          ),
        ]);
        const allAppointments: ReceivedAppointment[] = appointmentsRes?.data ?? [];
        setPendingAppointments(allAppointments.filter((a) => !a.serviceOrder));
        setActiveOrders(trackingRes?.data ?? []);
      } catch (error) {
        console.error("Lỗi khi tải tổng quan phân công:", error);
      } finally {
        setIsLoading(false);
      }
    };
    void loadOverview();
  }, []);

  const inProgressTaskCount = activeOrders.reduce(
    (sum, order) => sum + order.tasks.filter((t) => t.status === "IN_PROGRESS").length,
    0,
  );

  const stats = [
    {
      label: "Lịch hẹn chờ tạo lệnh",
      value: isLoading ? "—" : pendingAppointments.length,
      icon: UserPlus,
      tint: "bg-blue-50 text-blue-600",
    },
    {
      label: "Đơn đang hoạt động",
      value: isLoading ? "—" : activeOrders.length,
      icon: Car,
      tint: "bg-amber-50 text-amber-600",
    },
    {
      label: "Task đang thực hiện",
      value: isLoading ? "—" : inProgressTaskCount,
      icon: Wrench,
      tint: "bg-emerald-50 text-emerald-600",
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: "#00285E" }}>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ClipboardList size={16} className="text-[#F9A11B]" />
              Các lịch hẹn đã tiếp nhận
            </h2>
            <button
              onClick={() => navigate("/leader/appointments")}
              className="text-xs font-bold text-white/80 hover:text-[#F9A11B] transition-colors"
            >
              Xem tất cả
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-[#00285E] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pendingAppointments.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#EDF3FF] flex items-center justify-center">
                <UserPlus size={26} className="text-[#00285E]" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Không có lịch hẹn nào chờ tạo lệnh
              </h3>
              <p className="text-xs text-slate-500 max-w-md">
                Danh sách sẽ hiển thị ngay khi lễ tân tiếp nhận xe nhưng chưa tạo lệnh sửa chữa.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingAppointments.slice(0, 6).map((appt) => (
                <button
                  key={appt.id}
                  onClick={() => navigate("/leader/appointments")}
                  className="w-full flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#EDF3FF] flex items-center justify-center shrink-0 text-[#00285E]">
                      <Car size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-800 truncate">
                        {appt.vehicle?.license_plate || "—"} · {appt.vehicle?.model?.model_name || "—"}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                        <User size={11} className="shrink-0" />
                        {appt.customer?.name || appt.customer?.user?.fullName || "Khách hàng"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-[#00285E]">
                      Chờ tạo lệnh
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Tiếp nhận: {formatDate(appt.scheduled_time || appt.createdAt)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ACTIVE ORDERS LIST */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: "#00285E" }}>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Wrench size={16} className="text-[#F9A11B]" />
              Lệnh sửa chữa đang thực hiện
            </h2>
            <button
              onClick={() => navigate("/leader/task-tracking")}
              className="text-xs font-bold text-white/80 hover:text-[#F9A11B] transition-colors"
            >
              Xem tất cả
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-[#00285E] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeOrders.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#EDF3FF] flex items-center justify-center">
                <Wrench size={26} className="text-[#00285E]" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Không có lệnh sửa chữa nào đang hoạt động
              </h3>
              <p className="text-xs text-slate-500 max-w-md">
                Danh sách sẽ hiển thị ngay khi có xe đang được kiểm tra hoặc sửa chữa.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeOrders.slice(0, 6).map((order) => (
                <button
                  key={order.id}
                  onClick={() => navigate("/leader/task-tracking")}
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
                      {order.tasks.length} công việc
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
      </div>
    </div>
  );
}
