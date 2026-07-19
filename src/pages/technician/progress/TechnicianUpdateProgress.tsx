import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useFetchClient } from '../../../hook/useFetchClient';
import { TASK_ASSIGNMENT_ENDPOINTS } from '../../../constants/technician/taskAssignmentEndpoint';

// ========== TYPES ==========
interface RepairTask {
  id: string;
  // id của Task_Assignment - dùng khi gọi API hoàn thành công việc
  taskAssignmentId?: number;
  name: string;
  category: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  progress: number;
  estimatedTime: string;
}

// Trạng thái assignment bên BE -> trạng thái hiển thị ở FE
const mapAssignmentStatus = (status?: string): RepairTask['status'] => {
  switch (status) {
    case 'COMPLETED':
    case 'PENDING_QC':
      return 'completed';
    case 'IN_PROGRESS':
      return 'in_progress';
    case 'PAUSED':
      return 'blocked';
    default:
      return 'not_started';
  }
};

const TASK_STATUS_OPTIONS = [
  { value: 'not_started', label: 'Chưa bắt đầu', color: '#6B7280', bg: '#F3F4F6' },
  { value: 'in_progress', label: 'Đang thực hiện', color: '#3B82F6', bg: '#EFF6FF' },
  { value: 'completed', label: 'Hoàn thành', color: '#10B981', bg: '#ECFDF5' },
  { value: 'blocked', label: 'Bị chặn', color: '#EF4444', bg: '#FEF2F2' },
];

const EMPTY_VEHICLE_INFO = {
  repairOrderId: '—',
  vehiclePlate: '—',
  vehicleModel: '—',
  vehicleColor: '—',
  customerName: '—',
  customerPhone: '—',
};

export default function TechnicianUpdateProgress() {
  const { id } = useParams<{ id: string }>();

  const { fetchPrivate } = useFetchClient();

  const [tasks, setTasks] = useState<RepairTask[]>([]);
  const [vehicleInfo, setVehicleInfo] = useState(EMPTY_VEHICLE_INFO);
  const [isLoading, setIsLoading] = useState(true);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  // Lấy công việc của lệnh sửa chữa này. Dùng GET_MY_ASSIGNMENTS (giống trang
  // danh sách phân công) vì API đó đã lọc sẵn theo kỹ thuật viên đang đăng nhập.
  const loadTasks = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await fetchPrivate(TASK_ASSIGNMENT_ENDPOINTS.GET_MY_ASSIGNMENTS);
      const orders = Array.isArray(res) ? res : (res?.data ?? []);
      const so = orders.find((o: any) => String(o.id) === String(id));
      if (!so) {
        setTasks([]);
        return;
      }
      // Chỉ giữ task thực sự được giao cho mình
      const myTasks = (so.tasks ?? []).filter(
        (t: any) => (t.assignments ?? []).length > 0,
      );
      const mapped: RepairTask[] = myTasks.map((t: any) => {
        const assignment = t.assignments?.[0];
        const status = mapAssignmentStatus(assignment?.status ?? t.status);
        return {
          id: String(t.id),
          taskAssignmentId: assignment?.id,
          name: t.catalog?.service_name || `Công việc #${t.id}`,
          category: t.catalog?.service_name ? 'Dịch vụ' : 'Khác',
          status,
          progress: status === 'completed' ? 100 : 0,
          estimatedTime: t.catalog?.estimated_duration
            ? `${t.catalog.estimated_duration} phút`
            : '—',
        };
      });
      setTasks(mapped);
      setVehicleInfo({
        repairOrderId: `RO-${so?.id ?? id}`,
        vehiclePlate: so?.vehicle?.license_plate || '—',
        vehicleModel:
          `${so?.vehicle?.model?.make?.make_name || ''} ${so?.vehicle?.model?.model_name || ''}`.trim() || '—',
        vehicleColor: so?.vehicle?.color || '—',
        customerName:
          so?.vehicle?.customer?.name ||
          so?.vehicle?.customer?.user?.fullName ||
          'Khách vãng lai',
        customerPhone:
          so?.vehicle?.customer?.phone ||
          so?.vehicle?.customer?.user?.phoneNumber ||
          '—',
      });
    } catch (error) {
      console.error('Lỗi khi tải công việc:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [id]);

  // Overall progress (tasks rỗng lúc đang tải -> tránh chia cho 0)
  const overallProgress =
    tasks.length === 0
      ? 0
      : Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length);

  // Hoàn thành 1 công việc -> BE chuyển assignment sang PENDING_QC và emit realtime
  const completeTask = async (task: RepairTask) => {
    if (!task.taskAssignmentId) {
      alert('Không tìm thấy thông tin phân công của công việc này.');
      return;
    }
    setCompletingTaskId(task.id);
    try {
      await fetchPrivate(TASK_ASSIGNMENT_ENDPOINTS.COMPLETE_TASK, 'PUT', {
        taskAssignmentId: task.taskAssignmentId,
      });
      await loadTasks();
    } catch (error: any) {
      console.error('Lỗi khi hoàn thành công việc:', error);
      alert(error?.message || 'Đã xảy ra lỗi khi hoàn thành công việc.');
    } finally {
      setCompletingTaskId(null);
    }
  };


  if (isLoading) {
    return (
      <div className="flex-1 p-4 md:p-8 max-w-4xl w-full mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs py-20 flex items-center justify-center gap-2 text-slate-400 text-sm">
          <Loader2 size={18} className="animate-spin" />
          Đang tải công việc...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 space-y-4 max-w-7xl w-full mx-auto">
      <style>{`
        @keyframes progressStripes {
          from { background-position: 1rem 0; }
          to { background-position: 0 0; }
        }
        /* Sọc chạy trên thanh tiến độ khi công việc đang thực hiện */
        .bar-running {
          background-image: linear-gradient(
            45deg,
            rgba(255,255,255,0.3) 25%, transparent 25%,
            transparent 50%, rgba(255,255,255,0.3) 50%,
            rgba(255,255,255,0.3) 75%, transparent 75%, transparent
          );
          background-size: 1rem 1rem;
          animation: progressStripes 0.7s linear infinite;
        }
      `}</style>

      {/* TITLE */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2">
          Cập nhật tiến độ sửa chữa
        </h1>
        <p className="text-slate-500 text-sm">
          Đánh dấu hoàn thành từng hạng mục được phân công.
        </p>
      </div>

      {/* HERO: thông tin xe + tiến độ tổng */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        <div className="p-6 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Khách hàng */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                Khách hàng
              </span>
              <div className="space-y-2">
                <div className="flex items-baseline gap-3">
                  <span className="w-28 shrink-0 text-xs text-slate-500">
                    Họ và tên
                  </span>
                  <span className="text-sm font-bold text-slate-800 truncate">
                    {vehicleInfo.customerName}
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="w-28 shrink-0 text-xs text-slate-500">
                    Số điện thoại
                  </span>
                  <span className="text-sm font-bold text-slate-800 truncate">
                    {vehicleInfo.customerPhone}
                  </span>
                </div>
              </div>
            </div>
            {/* Phương tiện */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                Phương tiện
              </span>
              <div className="space-y-2">
                <div className="flex items-baseline gap-3">
                  <span className="w-28 shrink-0 text-xs text-slate-500">
                    Biển số xe
                  </span>
                  <span className="text-sm font-bold text-slate-800 truncate">
                    {vehicleInfo.vehiclePlate}
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="w-28 shrink-0 text-xs text-slate-500">
                    Loại xe
                  </span>
                  <span className="text-sm font-bold text-slate-800 truncate">
                    {vehicleInfo.vehicleModel} · {vehicleInfo.vehicleColor}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tiến độ tổng */}
        <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/40">
          <div className="flex items-baseline justify-between gap-4 mb-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Tiến độ tổng quan
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-slate-400 font-medium">
                {tasks.filter(t => t.status === 'completed').length}/{tasks.length} công việc
              </span>
              <span className="text-2xl font-bold text-[#00285E] tabular-nums leading-none">
                {overallProgress}%
              </span>
            </div>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-200/70 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#00285E] bar-running transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* DANH SÁCH CÔNG VIỆC */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Danh sách công việc
          </span>
          <span className="text-xs font-semibold text-slate-400">
            {tasks.length} hạng mục
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {tasks.map((task) => {
            const statusOpt = TASK_STATUS_OPTIONS.find(o => o.value === task.status)!;
            const isDone = task.status === 'completed';
            const isSending = completingTaskId === task.id;
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 px-6 py-4 hover:bg-slate-50/70 transition-colors"
              >
                {/* Chấm trạng thái */}
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: statusOpt.color }}
                />

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate text-slate-800">
                    {task.name}
                  </p>
                  <span className="text-xs text-slate-400">
                    {task.category} · {task.estimatedTime}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold"
                    style={{ backgroundColor: statusOpt.bg, color: statusOpt.color }}
                  >
                    {statusOpt.label}
                  </span>
                  {!isDone && (
                    <button
                      onClick={() => completeTask(task)}
                      disabled={isSending}
                      title="Đánh dấu hoàn thành"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSending ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={13} />
                      )}
                      {isSending ? 'Đang gửi...' : 'Hoàn thành'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
