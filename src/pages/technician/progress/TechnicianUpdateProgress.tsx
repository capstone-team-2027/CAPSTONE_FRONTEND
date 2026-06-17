import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Car,
  Activity,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock,
  Wrench,
  MessageSquare,
  Save,
  ChevronDown,
  Timer,
  BarChart3,
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
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedTask, setExpandedTask] = useState<string | null>(INITIAL_TASKS[0]?.id || null);

  // Overall progress
  const overallProgress = Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length);

  // Overall status derived from tasks
  const getOverallStatus = () => {
    if (tasks.every(t => t.status === 'completed')) return { label: 'Hoàn thành', color: '#10B981', bg: '#ECFDF5' };
    if (tasks.some(t => t.status === 'blocked')) return { label: 'Có công việc bị chặn', color: '#EF4444', bg: '#FEF2F2' };
    if (tasks.some(t => t.status === 'in_progress')) return { label: 'Đang sửa chữa', color: '#3B82F6', bg: '#EFF6FF' };
    return { label: 'Chưa bắt đầu', color: '#6B7280', bg: '#F3F4F6' };
  };

  const overallStatus = getOverallStatus();

  // Update task handlers
  const updateTaskProgress = (taskId: string, progress: number) => {
    const clamped = Math.min(100, Math.max(0, progress));
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      // Auto-set status based on progress
      let newStatus = t.status;
      if (clamped === 100) newStatus = 'completed';
      else if (clamped > 0 && t.status !== 'blocked') newStatus = 'in_progress';
      else if (clamped === 0 && t.status !== 'blocked') newStatus = 'not_started';
      return { ...t, progress: clamped, status: newStatus };
    }));
    setErrors({});
  };

  const updateTaskStatus = (taskId: string, status: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      let newProgress = t.progress;
      if (status === 'completed') newProgress = 100;
      else if (status === 'not_started') newProgress = 0;
      return { ...t, status: status as RepairTask['status'], progress: newProgress };
    }));
    setErrors({});
  };

  const updateTaskNotes = (taskId: string, notes: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, techNotes: notes } : t));
  };

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    tasks.forEach(t => {
      if (t.progress < 0 || t.progress > 100) {
        newErrors[t.id] = `Tiến độ phải từ 0% đến 100%.`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit
  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setSubmitSuccess(true);
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
              <span className="font-bold text-[#0E4D40]">{overallProgress}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Hoàn thành:</span>
              <span className="font-bold text-slate-800">{tasks.filter(t => t.status === 'completed').length}/{tasks.length} công việc</span>
            </div>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => navigate('/technician/service-orders')}
              className="px-6 py-3 bg-[#0E4D40] text-white rounded-xl text-sm font-bold hover:bg-[#0a3a30] transition-colors"
            >
              Quay về danh sách
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-5xl w-full mx-auto">
      {/* BACK + HEADER */}
      <div className="flex flex-col gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#0E4D40] transition-colors self-start"
        >
          <ArrowLeft size={16} />
          Quay lại
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#0E4D40] tracking-tight leading-none mb-2 flex items-center gap-2">
            <Activity className="text-amber-500" size={28} />
            Cập nhật tiến độ sửa chữa
          </h1>
          <p className="text-slate-500 text-sm">
            Cập nhật trạng thái và tiến độ của các công việc sửa chữa được phân công.
          </p>
        </div>
      </div>

      {/* VEHICLE INFO BANNER */}
      <div className="bg-gradient-to-r from-[#E8F5F0] to-[#D5F0E8] p-5 rounded-2xl border border-[#C4E8E0]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mã lệnh sửa chữa</p>
            <p className="font-bold text-[#0E4D40]">{MOCK_VEHICLE_INFO.repairOrderId}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Biển số xe</p>
            <p className="font-semibold text-slate-700">{MOCK_VEHICLE_INFO.vehiclePlate}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dòng xe</p>
            <p className="font-semibold text-slate-700">{MOCK_VEHICLE_INFO.vehicleModel}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Khách hàng</p>
            <p className="font-semibold text-slate-700">{MOCK_VEHICLE_INFO.customerName}</p>
          </div>
        </div>
      </div>

      {/* OVERALL PROGRESS CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="text-[#0E4D40]"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${overallProgress}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-[#0E4D40]">{overallProgress}%</span>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Tiến độ tổng quan</h3>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold"
                  style={{ backgroundColor: overallStatus.bg, color: overallStatus.color }}
                >
                  {overallStatus.label}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {tasks.filter(t => t.status === 'completed').length}/{tasks.length} công việc hoàn thành
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {TASK_STATUS_OPTIONS.map(opt => {
              const count = tasks.filter(t => t.status === opt.value).length;
              return (
                <div key={opt.value} className="text-center">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1 text-sm font-bold"
                    style={{ backgroundColor: opt.bg, color: opt.color }}
                  >
                    {count}
                  </div>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{opt.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* REPAIR TASK LIST */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <BarChart3 size={18} className="text-[#0E4D40]" />
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Danh sách công việc</h3>
        </div>

        {tasks.map((task) => {
          const isExpanded = expandedTask === task.id;
          const statusOpt = TASK_STATUS_OPTIONS.find(o => o.value === task.status)!;
          return (
            <div key={task.id} className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
              {/* Task Header (collapsible) */}
              <button
                onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Progress mini-circle */}
                  <div className="relative w-10 h-10 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-100"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke={statusOpt.color}
                        strokeWidth="4"
                        strokeDasharray={`${task.progress}, 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[9px] font-bold" style={{ color: statusOpt.color }}>{task.progress}%</span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{task.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-medium text-slate-500">{task.category}</span>
                      <span className="text-[10px] text-slate-400">⏱ {task.estimatedTime}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
                    style={{ backgroundColor: statusOpt.bg, color: statusOpt.color }}
                  >
                    {statusOpt.label}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
                    <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-4">
                      {/* Status selector */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Trạng thái
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {TASK_STATUS_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => updateTaskStatus(task.id, opt.value)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                                task.status === opt.value
                                  ? 'shadow-sm'
                                  : 'border-transparent opacity-60 hover:opacity-100'
                              }`}
                              style={{
                                backgroundColor: opt.bg,
                                color: opt.color,
                                borderColor: task.status === opt.value ? opt.color : 'transparent',
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Progress slider */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Tiến độ: <span className="text-[#0E4D40]">{task.progress}%</span>
                        </label>
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={task.progress}
                            onChange={(e) => updateTaskProgress(task.id, parseInt(e.target.value))}
                            className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                            style={{
                              background: `linear-gradient(to right, #0E4D40 ${task.progress}%, #E2E8F0 ${task.progress}%)`,
                            }}
                          />
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={task.progress}
                            onChange={(e) => updateTaskProgress(task.id, parseInt(e.target.value) || 0)}
                            className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0E4D40]/10 focus:border-[#0E4D40]"
                          />
                          <span className="text-xs text-slate-400 font-medium">%</span>
                        </div>
                        {errors[task.id] && (
                          <p className="text-xs text-rose-500 font-semibold mt-1.5 flex items-center gap-1">
                            <AlertCircle size={12} />
                            {errors[task.id]}
                          </p>
                        )}
                      </div>

                      {/* Task notes */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Ghi chú kỹ thuật viên
                        </label>
                        <textarea
                          value={task.techNotes}
                          onChange={(e) => updateTaskNotes(task.id, e.target.value)}
                          placeholder="Mô tả tình trạng, vấn đề gặp phải..."
                          rows={3}
                          className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E4D40]/10 focus:border-[#0E4D40] transition-all resize-none"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ESTIMATED COMPLETION TIME */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-[#E8F5F0] flex items-center justify-center">
            <Timer size={16} className="text-[#0E4D40]" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Thời gian hoàn thành dự kiến</h3>
        </div>
        <input
          type="datetime-local"
          value={estimatedCompletion}
          onChange={(e) => setEstimatedCompletion(e.target.value)}
          className="w-full md:w-auto bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0E4D40]/10 focus:border-[#0E4D40] transition-all"
        />
      </div>

      {/* OVERALL NOTES */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <MessageSquare size={16} className="text-amber-600" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Ghi chú tổng quan</h3>
        </div>
        <textarea
          value={overallNotes}
          onChange={(e) => setOverallNotes(e.target.value)}
          placeholder="Ghi chú chung về tiến độ sửa chữa..."
          rows={4}
          className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E4D40]/10 focus:border-[#0E4D40] transition-all resize-none"
        />
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex-1 px-6 py-3.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
        >
          Hủy
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-[#0E4D40] hover:bg-[#0a3a30] text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật'}
        </button>
      </div>
    </div>
  );
}
