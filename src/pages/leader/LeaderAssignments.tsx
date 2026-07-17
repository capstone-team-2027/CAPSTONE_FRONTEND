import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ClipboardList,
  Search,
  Car,
  User,
  UserPlus,
  X,
  CheckCircle2,
  Wrench,
  Clock,
  Loader2,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";

// ─── Kiểu dữ liệu (khớp dần với BE sau) ───────────────────────────────
interface Technician {
  id: number;
  fullName: string;
  activeTasks: number; // số task đang làm -> giúp cân tải khi phân công
  available: boolean;
}

interface TaskItem {
  id: number;
  code: string;
  serviceName: string;
  customerName: string;
  vehiclePlate: string;
  vehicleName: string;
  createdAt: string;
  assignee: Technician | null;
}

// ─── MOCK DATA (TODO: thay bằng API list task + list KTV) ─────────────
const MOCK_TECHNICIANS: Technician[] = [
  { id: 1, fullName: "Trần Văn Bình", activeTasks: 1, available: true },
  { id: 2, fullName: "Nguyễn Hoàng Sơn", activeTasks: 3, available: true },
  { id: 3, fullName: "Lê Thị Ngân", activeTasks: 0, available: true },
  { id: 4, fullName: "Phạm Mạnh", activeTasks: 2, available: false },
];

const MOCK_TASKS: TaskItem[] = [
  {
    id: 101,
    code: "TASK-16072026-01",
    serviceName: "Thay dầu động cơ",
    customerName: "Nguyễn Văn A",
    vehiclePlate: "51H-123.45",
    vehicleName: "Toyota Vios",
    createdAt: "2026-07-16T08:30:00",
    assignee: null,
  },
  {
    id: 102,
    code: "TASK-16072026-02",
    serviceName: "Kiểm tra phanh",
    customerName: "Trần Thị B",
    vehiclePlate: "59A-678.90",
    vehicleName: "Honda City",
    createdAt: "2026-07-16T09:15:00",
    assignee: { id: 1, fullName: "Trần Văn Bình", activeTasks: 1, available: true },
  },
  {
    id: 103,
    code: "TASK-16072026-03",
    serviceName: "Bảo dưỡng định kỳ",
    customerName: "Lê Văn C",
    vehiclePlate: "43C-111.22",
    vehicleName: "Mazda CX-5",
    createdAt: "2026-07-16T10:00:00",
    assignee: null,
  },
];

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function LeaderAssignments() {
  const { searchQuery } = useOutletContext<{
    searchQuery: string;
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();

  const [tasks, setTasks] = useState<TaskItem[]>(MOCK_TASKS);
  const [localSearch, setLocalSearch] = useState("");
  const [assigning, setAssigning] = useState<TaskItem | null>(null);
  const [pickedTechId, setPickedTechId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const effectiveSearch = (searchQuery || localSearch).toLowerCase();

  const filtered = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.code.toLowerCase().includes(effectiveSearch) ||
          t.serviceName.toLowerCase().includes(effectiveSearch) ||
          t.customerName.toLowerCase().includes(effectiveSearch) ||
          t.vehiclePlate.toLowerCase().includes(effectiveSearch),
      ),
    [tasks, effectiveSearch],
  );

  const stats = useMemo(() => {
    const total = tasks.length;
    const assigned = tasks.filter((t) => t.assignee).length;
    return { total, assigned, pending: total - assigned };
  }, [tasks]);

  const openAssign = (task: TaskItem) => {
    setAssigning(task);
    setPickedTechId(task.assignee?.id ?? null);
  };

  const closeAssign = () => {
    setAssigning(null);
    setPickedTechId(null);
  };

  const handleAssign = () => {
    if (!assigning || pickedTechId == null) return;
    const tech = MOCK_TECHNICIANS.find((t) => t.id === pickedTechId);
    if (!tech) return;
    setIsSaving(true);
    // TODO: gọi API gán KTV vào task rồi refetch list
    setTimeout(() => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === assigning.id ? { ...t, assignee: tech } : t,
        ),
      );
      showToast(`Đã phân công ${tech.fullName} cho ${assigning.code}`, "success");
      setIsSaving(false);
      closeAssign();
    }, 500);
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* TITLE */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">
          Phân công kỹ thuật
        </h1>
        <p className="text-slate-500 text-sm">
          Gán kỹ thuật viên cho các task đang chờ xử lý.
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[#EDF3FF] text-[#00285E]">
            <ClipboardList size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {stats.total}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Tổng task</p>
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
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {stats.assigned}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Đã phân công
            </p>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              Danh sách task
            </h2>
            <span className="bg-[#EDF3FF] text-[#00285E] px-2.5 py-0.5 rounded-full text-xs font-bold">
              {filtered.length} task
            </span>
          </div>
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Tìm mã task, dịch vụ, khách, biển số..."
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
                <th className="py-4 px-6">Mã task</th>
                <th className="py-4 px-4">Dịch vụ</th>
                <th className="py-4 px-4">Khách hàng / Xe</th>
                <th className="py-4 px-4">Kỹ thuật viên</th>
                <th className="py-4 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-14 text-center text-slate-400 text-sm"
                  >
                    Không tìm thấy task phù hợp...
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <span className="font-bold text-[#00285E] text-xs">
                        {t.code}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                        <Wrench size={13} className="text-slate-400" />
                        {t.serviceName}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-semibold text-slate-700 block">
                        {t.customerName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <Car size={11} />
                        {t.vehiclePlate} · {t.vehicleName}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {t.assignee ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                          <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                            <User size={12} className="text-emerald-600" />
                          </span>
                          {t.assignee.fullName}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                          <Clock size={11} />
                          Chờ phân công
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end">
                        <button
                          onClick={() => openAssign(t)}
                          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold text-white bg-[#00285E] hover:brightness-110 active:scale-[0.98] transition-all"
                        >
                          <UserPlus size={14} />
                          {t.assignee ? "Đổi KTV" : "Phân công"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL PHÂN CÔNG ── */}
      <AnimatePresence>
        {assigning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                    Phân công kỹ thuật
                  </h3>
                  <span className="text-xs font-semibold text-white/60">
                    {assigning.code} · {assigning.serviceName}
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
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block px-1 mb-1">
                  Chọn kỹ thuật viên
                </span>
                {MOCK_TECHNICIANS.map((tech) => {
                  const picked = pickedTechId === tech.id;
                  return (
                    <button
                      key={tech.id}
                      disabled={!tech.available}
                      onClick={() => setPickedTechId(tech.id)}
                      className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition-all ${
                        picked
                          ? "border-[#00285E] bg-white ring-1 ring-[#00285E]"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      } ${!tech.available ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-full bg-[#EDF3FF] flex items-center justify-center">
                          <User size={15} className="text-[#00285E]" />
                        </span>
                        <div>
                          <span className="text-sm font-semibold text-slate-800 block">
                            {tech.fullName}
                          </span>
                          <span className="text-xs text-slate-400">
                            {tech.available
                              ? `${tech.activeTasks} task đang làm`
                              : "Không sẵn sàng"}
                          </span>
                        </div>
                      </div>
                      {picked && (
                        <CheckCircle2 size={18} className="text-[#00285E] shrink-0" />
                      )}
                    </button>
                  );
                })}
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
                      <UserPlus size={15} />
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