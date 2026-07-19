import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Save,
  ChevronDown,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

// ========== TYPES ==========
interface RepairTask {
  id: string;
  name: string;
  category: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  progress: number;
  estimatedTime: string;
  techNotes: string;
}

const TASK_STATUS_OPTIONS = [
  { value: 'not_started', label: 'Chưa bắt đầu', color: '#6B7280', bg: '#F3F4F6' },
  { value: 'in_progress', label: 'Đang thực hiện', color: '#3B82F6', bg: '#EFF6FF' },
  { value: 'completed', label: 'Hoàn thành', color: '#10B981', bg: '#ECFDF5' },
  { value: 'blocked', label: 'Bị chặn', color: '#EF4444', bg: '#FEF2F2' },
];

// Mock data
const MOCK_VEHICLE_INFO = {
  repairOrderId: 'RO-001',
  vehiclePlate: '51A-123.45',
  vehicleModel: 'Toyota Camry 2.5Q',
  vehicleColor: 'Trắng',
  customerName: 'Nguyễn Văn An',
};

const INITIAL_TASKS: RepairTask[] = [
  {
    id: 'TASK-001',
    name: 'Bảo dưỡng định kỳ cấp 1',
    category: 'Bảo dưỡng',
    status: 'in_progress',
    progress: 60,
    estimatedTime: '45 phút',
    techNotes: 'Đã thay dầu, đang kiểm tra lọc gió',
  },
  {
    id: 'TASK-002',
    name: 'Thay dầu động cơ Castrol',
    category: 'Dầu nhớt',
    status: 'completed',
    progress: 100,
    estimatedTime: '30 phút',
    techNotes: 'Đã hoàn thành thay dầu Castrol Edge 5W-30',
  },
  {
    id: 'TASK-003',
    name: 'Kiểm tra hệ thống phanh',
    category: 'Phanh',
    status: 'not_started',
    progress: 0,
    estimatedTime: '40 phút',
    techNotes: '',
  },
  {
    id: 'TASK-004',
    name: 'Vệ sinh kim phun điện tử',
    category: 'Động cơ',
    status: 'blocked',
    progress: 20,
    estimatedTime: '60 phút',
    techNotes: 'Thiếu dung dịch vệ sinh chuyên dụng, đã yêu cầu bổ sung',
  },
];

export default function TechnicianUpdateProgress() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [tasks, setTasks] = useState<RepairTask[]>(INITIAL_TASKS);
  const [estimatedCompletion, setEstimatedCompletion] = useState('2026-06-05T16:00');
  const [overallNotes, setOverallNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(INITIAL_TASKS[0]?.id || null);

  // Overall progress
  const overallProgress = Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length);

  // Chỉ cho chốt công việc khi mọi hạng mục đã hoàn thành
  const canComplete =
    tasks.length > 0 && tasks.every(t => t.status === 'completed');

  // Đánh dấu 1 công việc đã xong -> tiến độ 100%
  const completeTask = (taskId: string) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, status: 'completed', progress: 100 } : t,
      ),
    );
  };

  const updateTaskNotes = (taskId: string, notes: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, techNotes: notes } : t));
  };

  // Submit
  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setSubmitSuccess(true);
  };

  // Chốt cả phân công sau khi mọi hạng mục đã xong
  const handleCompleteAssignment = async () => {
    if (!canComplete) return;
    if (!confirm('Bạn có chắc chắn muốn HOÀN THÀNH công việc này?')) return;

    setIsCompleting(true);
    try {
      // TODO: nối API hoàn thành phân công (COMPLETE_TASK)
      await new Promise(resolve => setTimeout(resolve, 800));
      navigate('/technician/assignments');
    } catch (error) {
      console.error('Lỗi khi hoàn thành công việc:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const formatPrice = (price: number) => price.toLocaleString('vi-VN') + ' đ';

  if (submitSuccess) {
    return (
      <div className="flex-1 p-4 md:p-8 max-w-3xl w-full mx-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl border border-emerald-200 shadow-xs p-10 text-center space-y-5"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 size={40} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Cập nhật tiến độ thành công!</h2>
          <p className="text-slate-500 max-w-md mx-auto">
            Tiến độ sửa chữa đã được cập nhật. Hệ thống đã ghi nhận ghi chú và trạng thái mới của các công việc.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 text-sm max-w-sm mx-auto space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Tiến độ tổng:</span>
              <span className="font-bold text-[#00285E]">{overallProgress}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Hoàn thành:</span>
              <span className="font-bold text-slate-800">{tasks.filter(t => t.status === 'completed').length}/{tasks.length} công việc</span>
            </div>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => navigate('/technician/service-orders')}
              className="px-6 py-3 bg-[#00285E] text-white rounded-xl text-sm font-bold hover:bg-[#0a3a30] transition-colors"
            >
              Quay về danh sách
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 space-y-4 max-w-4xl w-full mx-auto">
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

      {/* HERO: thông tin xe + tiến độ tổng */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        <div className="p-6 pb-5">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-4">
            Cập nhật tiến độ sửa chữa
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Khách hàng */}
            <div className="rounded-xl border border-[#DCE8FF] bg-[#EDF3FF]/60 p-4">
              <span className="block text-[11px] font-bold text-[#00285E]/50 uppercase tracking-widest mb-1.5">
                Khách hàng
              </span>
              <span className="block text-lg font-bold text-[#00285E] leading-tight truncate">
                {MOCK_VEHICLE_INFO.customerName}
              </span>
            </div>
            {/* Phương tiện */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Phương tiện
              </span>
              <span className="block text-lg font-bold text-slate-800 leading-tight truncate">
                {MOCK_VEHICLE_INFO.vehiclePlate}
              </span>
              <span className="block text-xs text-slate-400 mt-0.5 truncate">
                {MOCK_VEHICLE_INFO.vehicleModel} · {MOCK_VEHICLE_INFO.vehicleColor}
              </span>
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
            const isExpanded = expandedTask === task.id;
            const statusOpt = TASK_STATUS_OPTIONS.find(o => o.value === task.status)!;
            const isDone = task.status === 'completed';
            return (
              <div key={task.id}>
                {/* Task Header (collapsible) */}
                <button
                  onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                  className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-slate-50/70 transition-colors"
                >
                  {/* Chấm trạng thái */}
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: statusOpt.color }}
                  />

                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold text-sm truncate ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
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
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          completeTask(task.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            completeTask(task.id);
                          }
                        }}
                        title="Đánh dấu hoàn thành"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 active:scale-[0.97] transition-all cursor-pointer"
                      >
                        <CheckCircle2 size={13} />
                        Hoàn thành
                      </span>
                    )}
                    <ChevronDown
                      size={16}
                      className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {/* Task Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-5 pl-11">
                        <textarea
                          value={task.techNotes}
                          onChange={(e) => updateTaskNotes(task.id, e.target.value)}
                          placeholder="Ghi chú của kỹ thuật viên: tình trạng, vấn đề gặp phải..."
                          rows={3}
                          className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all resize-none"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* THỜI GIAN DỰ KIẾN + GHI CHÚ TỔNG */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6 space-y-5">
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Thời gian hoàn thành dự kiến
          </label>
          <input
            type="datetime-local"
            value={estimatedCompletion}
            onChange={(e) => setEstimatedCompletion(e.target.value)}
            className="w-full md:w-auto bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Ghi chú tổng quan
          </label>
          <textarea
            value={overallNotes}
            onChange={(e) => setOverallNotes(e.target.value)}
            placeholder="Ghi chú chung về tiến độ sửa chữa..."
            rows={3}
            className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all resize-none"
          />
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {!canComplete && (
          <p className="flex items-center gap-1.5 text-xs text-slate-400 sm:mr-auto">
            <AlertCircle size={13} className="shrink-0" />
            Còn {tasks.filter((t) => t.status !== 'completed').length} hạng mục
            chưa hoàn thành
          </p>
        )}
        <button
          onClick={() => navigate(-1)}
          className="h-11 px-5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all"
        >
          Hủy
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="h-11 flex items-center justify-center gap-2 px-5 rounded-xl text-sm font-semibold text-[#00285E] bg-[#EDF3FF] border border-[#00285E]/15 hover:bg-[#DCE8FF] active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {isSubmitting ? 'Đang lưu...' : 'Lưu tiến độ'}
        </button>
        {/* Hành động chính: chốt cả phân công khi mọi hạng mục đã xong */}
        <button
          onClick={handleCompleteAssignment}
          disabled={!canComplete || isCompleting}
          title={
            canComplete
              ? undefined
              : 'Hoàn thành tất cả hạng mục trước khi chốt công việc'
          }
          className="h-11 flex items-center justify-center gap-2 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-600/25 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isCompleting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <CheckCircle2 size={16} />
          )}
          {isCompleting ? 'Đang hoàn thành...' : 'Hoàn thành công việc'}
        </button>
      </div>
    </div>
  );
}
