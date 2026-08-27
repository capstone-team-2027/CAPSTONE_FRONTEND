import { useEffect, useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Users,
  UserPlus,
  Pencil,
  X,
  Filter,
  ShieldCheck,
  UserCheck,
  Award,
  Star,
  Download,
  AlertTriangle,
  Briefcase,
  Search,
  Eye,
  EyeOff,
} from "lucide-react";
import 'react-phone-input-2/lib/style.css';
import * as PhoneInputLib from 'react-phone-input-2';

const PAGE_SIZE = 6;
import { useNavigate,useLocation,useOutletContext } from "react-router-dom";
import type { Role, StaffManagement } from "../../../model/dto/staffManagement.dto";

// ── resolve PhoneInput default export ─────────────────────────
type Mod = { default?: unknown };
function resolveDefault<T>(mod: unknown): T {
    const m = mod as Mod;
    if (m && typeof m === 'object' && 'default' in m) {
        const d = m.default as unknown;
        if (d && typeof d === 'object' && 'default' in (d as Mod)) return (d as Mod).default as T;
        return d as T;
    }
    return mod as T;
}
type PhoneInputProps = {
    country?: string;
    value?: string;
    onChange?: (value: string) => void;
    onBlur?: () => void;
    enableSearch?: boolean;
    searchPlaceholder?: string;
    inputProps?: { name?: string };
    countryCodeEditable?: boolean;
    disabled?: boolean;
};
const PhoneInput = resolveDefault<React.ComponentType<PhoneInputProps>>(PhoneInputLib);

const phoneStyles = `
    .login-phone .react-tel-input .form-control {
        width: 100% !important;
        height: 38px !important;
        background: #F8FAFC !important;
        border: 1px solid #E2E8F0 !important;
        border-radius: 0.375rem !important;
        padding: 0 20px 0 48px !important;
        font-size: 14px !important;
        color: #0F172A !important;
        letter-spacing: 0.3px !important;
        outline: none !important;
        transition: all 0.2s !important;
    }
    .login-phone .react-tel-input .form-control:focus {
        border-color: #00285E !important;
        box-shadow: 0 0 0 3px rgba(0, 40, 94, 0.15) !important;
    }
    .login-phone .react-tel-input .flag-dropdown {
        background: #F8FAFC !important;
        border: 1px solid #E2E8F0 !important;
        border-right: none !important;
        border-radius: 0.375rem 0 0 0.375rem !important;
    }
    .login-phone .react-tel-input .flag-dropdown:hover,
    .login-phone .react-tel-input .flag-dropdown.open {
        background: #F1F5F9 !important;
        border-color: #CBD5E1 !important;
    }
    .login-phone .react-tel-input .selected-flag {
        background: transparent !important;
        padding: 0 8px 0 12px !important;
        border-radius: 0.375rem 0 0 0.375rem !important;
    }
    .login-phone .react-tel-input .country-list {
        background: white !important;
        border: 1px solid #E2E8F0 !important;
        border-radius: 0.5rem !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08) !important;
        max-height: 220px !important;
        margin-top: 4px !important;
        z-index: 1000 !important;
    }
`;
import { useFetchClient } from "../../../hook/useFetchClient";
import { STAFF_MANAGEMENT_API_ENDPOINTS } from "../../../constants/admin/staffManagementApiEndPoint";

type StaffStatus = "ACTIVE" | "INACTIVE" | "PENDING" | "BANNED";


const STATUS_OPTIONS: { value: StaffStatus; label: string }[] = [
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "INACTIVE", label: "Tạm nghỉ" },
  { value: "BANNED", label: "Bị khóa" },
];

export default function AdminStaffManagement() {
  const navigate = useNavigate();
  const { showToast } = useOutletContext<{
    searchQuery: string;
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();
  const { fetchPrivate } = useFetchClient();
  const [staff, setStaff] = useState<StaffManagement[]>([]);
  const [editingStaff, setEditingStaff] = useState<StaffManagement | null>( null,);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Tab & Ranking State variables
  const location = useLocation();
  const activeTab = location.pathname.includes("staff-ranking") ? "ranking" : "list";
  const [timeframe, setTimeframe] = useState<string>("month");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StaffStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const totalActive = staff.filter((s) => s.status === "ACTIVE").length;
  const totalTechnicians = staff.filter((s) => s.role.roleCode === "TECHNICIAN",).length;
  const filteredStaff = useMemo(() => {
    const list = staff.filter((s) => {
      const searchMatch =
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.role.roleName.toLowerCase().includes(searchTerm.toLowerCase());

      const statusMatch =
        statusFilter === "ALL" ||
        s.status === statusFilter;

      return searchMatch && statusMatch;
    });

    const getRolePriority = (roleCode: string) => {
      switch (roleCode) {
        case "TECHNICIAN_LEADER":
          return 1;
        case "TECHNICIAN":
          return 2;
        case "RECEPTIONIST":
          return 3;
        default:
          return 4;
      }
    };

    return list.sort((a, b) => {
      const pA = getRolePriority(a.role.roleCode);
      const pB = getRolePriority(b.role.roleCode);
      if (pA !== pB) return pA - pB;
      return a.fullName.localeCompare(b.fullName, "vi");
    });
  }, [staff, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredStaff.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Date range validation helper
  const isDateRangeInvalid = useMemo(() => {
    if (timeframe === "custom" && customStartDate && customEndDate) {
      return new Date(customStartDate) > new Date(customEndDate);
    }
    return false;
  }, [timeframe, customStartDate, customEndDate]);

  // Compute Employee Rankings and statistics
  const rankingList = useMemo(() => {
    if (isDateRangeInvalid) {
      return []; // Return empty list if filter is invalid to simulate empty state on UI
    }

    const baseRanks = [
      { id: 101, fullName: "Trần Văn Hùng", roleName: "Kỹ thuật viên", completedTasks: 96, revenueContribution: 42000000, rating: 4.8, performanceScore: 95, workDate: "2026-05-15", status: "Active" },
      { id: 102, fullName: "Lê Minh Tuấn", roleName: "Kỹ thuật viên", completedTasks: 84, revenueContribution: 38000000, rating: 4.6, performanceScore: 89, workDate: "2026-05-18", status: "Active" },
      { id: 103, fullName: "Nguyễn Nam Khánh", roleName: "Kỹ thuật viên", completedTasks: 78, revenueContribution: 31000000, rating: 4.5, performanceScore: 86, workDate: "2026-05-20", status: "Active" },
      { id: 104, fullName: "Phạm Văn Thành", roleName: "Kỹ thuật viên", completedTasks: 72, revenueContribution: 29000000, rating: 4.7, performanceScore: 88, workDate: "2026-05-22", status: "Active" },
      { id: 105, fullName: "Nguyễn Thị Mai", roleName: "Lễ tân", completedTasks: 120, revenueContribution: 15000000, rating: 4.9, performanceScore: 97, workDate: "2026-05-10", status: "Active" },
    ];

      if (staff.length > 0) {
      return staff.map((s, idx) => {
        const base = baseRanks[idx % baseRanks.length];
        return {
          id: s.id,
          fullName: s.fullName,
          roleName: s.role.roleName,
          completedTasks: base.completedTasks + (s.id % 5) + 1,
          revenueContribution: base.revenueContribution + (s.id * 8000),
          rating: Number((4.2 + (s.id % 8) / 10).toFixed(1)),
          performanceScore: Math.min(100, Math.max(70, 76 + (s.id % 23))),
          workDate: base.workDate,
          status: s.status === "ACTIVE" ? "Active" : "Inactive",
        };
      }).sort((a, b) => b.rating - a.rating || b.completedTasks - a.completedTasks);
    }
    
    return baseRanks.sort((a, b) => b.rating - a.rating || b.completedTasks - a.completedTasks);
  }, [staff, isDateRangeInvalid]);

  // Export CSV Report
  const handleExportRanking = () => {
    // Validations
    if (timeframe === "custom" && (!customStartDate || !customEndDate)) {
      showToast("Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc", "warning");
      return;
    }
    if (isDateRangeInvalid) {
      showToast("Lọc ngày không hợp lệ: Ngày bắt đầu lớn hơn ngày kết thúc", "warning");
      return;
    }
    if (rankingList.length === 0) {
      showToast("Không tìm thấy dữ liệu xếp hạng nhân viên", "warning");
      return;
    }

    // Revenue contribution and completed tasks value validation (>0)
    const hasInvalidData = rankingList.some(r => r.completedTasks <= 0 || r.revenueContribution <= 0);
    if (hasInvalidData) {
      showToast("Lỗi dữ liệu: Doanh thu và lượt hoàn thành của nhân viên phải lớn hơn 0", "warning");
      return;
    }

    const headers = ["Thu hang", "Ten nhan vien", "Vai tro", "So nhiem vu hoan thanh", "Doanh thu dong gop", "Danh gia trung binh", "Diem hieu suat", "Ngay lam viec", "Trang thai"];
    const rows = rankingList.map((r, idx) => [
      idx + 1,
      r.fullName,
      r.roleName,
      r.completedTasks,
      `${r.revenueContribution} VND`,
      r.rating,
      r.performanceScore,
      r.workDate,
      r.status
    ]);
    
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bao-cao-xep-hang-nhan-vien-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();

    showToast("Xuất báo cáo xếp hạng nhân viên thành công", "success");
  };

  const handleGetStaff = async () => {
    try {
      setLoadingError(null);
      const result = await fetchPrivate<StaffManagement[]>(
        STAFF_MANAGEMENT_API_ENDPOINTS.STAFF_MANAGEMENT,
        "GET",
      );
      setStaff(result.data);
    } catch (error: any) {
      console.error("Lỗi lấy danh sách nhân viên:", error);
      setLoadingError(error?.message || "Không thể tải dữ liệu nhân sự từ hệ thống.");
    }
  };
  useEffect(() => {
    handleGetStaff();
  }, []);

  const handleOpenCreate = () => {
    setEditingStaff(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (staff: StaffManagement) => {
    setEditingStaff(staff);
    setIsModalOpen(true);
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* TITLE BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              Quản lý Nhân sự
            </h1>
            <p className="text-slate-500 text-sm">
              {activeTab === "list"
                ? "Tạo và quản lý tài khoản nhân viên trong gara."
                : "Theo dõi, đánh giá và xếp hạng hiệu suất công việc của nhân viên."}
            </p>
          </div>
        </div>

        {activeTab === "list" ? (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#F9A11B] text-[#00285E] rounded text-sm font-bold shadow-md shadow-[#F9A11B]/20 hover:bg-[#E08F12] transition-all transform hover:translate-y-[-1px]"
          >
            <UserPlus size={16} />
            <span>Thêm nhân sự</span>
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10"
              >
                <option value="today">Hôm nay</option>
                <option value="7days">7 ngày qua</option>
                <option value="month">Tháng này</option>
                <option value="quarter">Quý này</option>
                <option value="custom">Tùy chỉnh...</option>
              </select>
              {timeframe === "custom" && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="border border-slate-200 rounded-xl text-xs px-2.5 py-1.5 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                  />
                  <span className="text-slate-400 text-xs">→</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="border border-slate-200 rounded-xl text-xs px-2.5 py-1.5 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleExportRanking}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#00285E] text-white rounded text-sm font-bold shadow-md shadow-[#00285E]/15 hover:bg-[#062047] transition-all transform hover:translate-y-[-1px]"
            >
              <Download size={16} />
              <span>Xuất báo cáo xếp hạng</span>
            </button>
          </div>
        )}
      </div>

      {/* TABS SWITCHER REMOVED */}

      {/* ERROR MESSAGE WHEN DATE RANGE IS INVALID */}
      {isDateRangeInvalid && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-rose-600">
          <AlertTriangle size={16} className="text-rose-500" />
          <span>Bộ lọc ngày không hợp lệ: Ngày bắt đầu không được lớn hơn ngày kết thúc!</span>
        </div>
      )}

      {/* ERROR MESSAGE WHEN SYSTEM DATA CANNOT BE LOADED */}
      {loadingError && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-rose-600">
          <AlertTriangle size={16} className="text-rose-500" />
          <span>Lỗi hệ thống: {loadingError}</span>
        </div>
      )}

      {activeTab === "list" ? (
        <>
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <motion.div
              whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}
              className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4 cursor-pointer transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Users size={22} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                  Tổng số nhân sự
                </span>
                <span className="text-2xl font-bold text-slate-900 tracking-tight block">
                  {staff.length}
                </span>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}
              className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4 cursor-pointer transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <UserCheck size={22} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                  Đang hoạt động
                </span>
                <span className="text-2xl font-bold text-slate-900 tracking-tight block">
                  {totalActive}
                </span>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}
              className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4 cursor-pointer transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-[#F9A11B]">
                <ShieldCheck size={22} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                  Kỹ thuật viên
                </span>
                <span className="text-2xl font-bold text-slate-900 tracking-tight block">
                  {totalTechnicians}
                </span>
              </div>
            </motion.div>
          </div>

          {/* TABLE CARD */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
            <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                  Danh sách nhân sự
                </h2>
                <p className="text-sm text-slate-500 mt-1">Tìm kiếm và quản lý hồ sơ nhân sự.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Tìm nhân sự theo tên, điện thoại hoặc vai trò..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                  />
                </div>
                <div className="w-full sm:w-auto">
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value as StaffStatus | "ALL"); setPage(1); }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E]"
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-y border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                    <th className="py-4 px-6">Họ tên</th>
                    <th className="py-4 px-4">Số điện thoại</th>
                    <th className="py-4 px-4">Vai trò</th>
                    <th className="py-4 px-4">Trạng thái</th>
                    <th className="py-4 px-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-12 text-center text-slate-400 text-sm"
                      >
                        Chưa có nhân sự nào...
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors group"
                      >
                        <td className="py-4 px-6">
                          <span className="font-bold text-[#00285E] text-sm block">
                            {s.fullName}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-600 text-sm">
                          {s.phoneNumber}
                        </td>
                        <td className="py-4 px-4">
                          <RoleBadge roleCode={s.role.roleCode} roleName={s.role.roleName} />
                        </td>
                        <td className="py-4 px-4">
                          <StatusBadge status={s.status as StaffStatus} />
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(s)}
                              className="p-2 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Pencil size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-sm text-slate-500">
                Hiển thị {pageItems.length} trên {filteredStaff.length} nhân sự
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={safePage <= 1}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Trước
                </button>
                <span className="text-sm font-semibold text-slate-600">{safePage} / {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={safePage >= totalPages}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Tiếp
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* EMPLOYEE RANKINGS VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee Ranking List */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Award className="text-[#F9A11B]" size={20} />
              Xếp hạng hiệu suất nhân sự
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-y border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                    <th className="py-3 px-4 text-center">Hạng</th>
                    <th className="py-3 px-4">Nhân viên</th>
                    <th className="py-3 px-4">Vai trò</th>
                    <th className="py-3 px-4 text-center">Nhiệm vụ</th>
                    <th className="py-3 px-4 text-right">Doanh thu</th>
                    <th className="py-3 px-4 text-center">Đánh giá</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                        Không có dữ liệu xếp hạng nhân viên được tìm thấy.
                      </td>
                    </tr>
                  ) : (
                    rankingList.map((r, idx) => {
                      const isSelected = selectedEmployeeId === r.id || (selectedEmployeeId === null && idx === 0);
                      const isTop3 = idx < 3;
                      const badgeColors = [
                        "bg-amber-100 text-amber-800 border-amber-200", // Gold
                        "bg-slate-100 text-slate-800 border-slate-200", // Silver
                        "bg-orange-100 text-orange-800 border-orange-200", // Bronze
                      ];
                      return (
                        <tr
                          key={r.id}
                          onClick={() => setSelectedEmployeeId(r.id)}
                          className={`border-b border-slate-100 hover:bg-slate-50/70 transition-colors cursor-pointer ${
                            isSelected ? "bg-blue-50/30 border-l-4 border-l-[#00285E]" : ""
                          }`}
                        >
                          <td className="py-4 px-4 text-center font-bold">
                            {isTop3 ? (
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full border font-black text-xs ${badgeColors[idx]}`}>
                                {idx + 1}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-xs">#{idx + 1}</span>
                            )}
                          </td>
                          <td className="py-4 px-4 font-bold text-[#00285E]">{r.fullName}</td>
                          <td className="py-4 px-4 text-slate-500 font-semibold text-xs">{r.roleName}</td>
                          <td className="py-4 px-4 text-center font-semibold text-slate-700">{r.completedTasks}</td>
                          <td className="py-4 px-4 text-right font-bold text-slate-900">{r.revenueContribution.toLocaleString("vi-VN")} đ</td>
                          <td className="py-4 px-4 text-center">
                            <span className="inline-flex items-center gap-1 font-bold text-amber-500 text-xs">
                              <Star size={12} fill="currentColor" /> {r.rating}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Employee Details & Performance Evaluation Card */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6 space-y-6">
            {(() => {
              const selectedEmp = rankingList.find(r => r.id === selectedEmployeeId) || rankingList[0];
              if (!selectedEmp) {
                return (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm py-12">
                    <Briefcase size={40} className="text-slate-300 mb-2" />
                    Không có thông tin nhân viên
                  </div>
                );
              }
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00285E] to-[#003a8a] flex items-center justify-center text-white font-bold text-xl shadow-md shrink-0">
                      {selectedEmp.fullName.slice(0, 1)}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-800 leading-tight">{selectedEmp.fullName}</h3>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">{selectedEmp.roleName}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Chỉ số năng suất</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nhiệm vụ hoàn thành</span>
                        <span className="text-xl font-bold text-slate-800 block mt-1">{selectedEmp.completedTasks}</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Doanh thu đóng góp</span>
                        <span className="text-sm font-bold text-[#00285E] block mt-2">{selectedEmp.revenueContribution.toLocaleString("vi-VN")} đ</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Đánh giá sao</span>
                      <span className="text-xl font-bold text-amber-500 flex items-center gap-1.5 mt-1">
                        <Star size={16} fill="currentColor" className="shrink-0" /> {selectedEmp.rating}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ngày làm việc</span>
                      <span className="text-sm font-bold text-slate-800 block mt-1">
                        {new Date(selectedEmp.workDate).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  </div>

                  {/* Visual progress score bar removed */}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {isModalOpen && (
        <StaffFormModal
          initial={editingStaff}
          onClose={() => {
            setIsModalOpen(false);
            setEditingStaff(null);
          }}
          onRefresh={handleGetStaff}
        />
      )}
    </div>
  );
}

// ============================================
// FORM MODAL (Create + Edit)
// ============================================
interface StaffFormModalProps {
  initial: StaffManagement | null;
  onClose: () => void;
  onRefresh: () => void;
}

function StaffFormModal({ initial, onClose, onRefresh  }: StaffFormModalProps) {
  const isEdit = !!initial;
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [phoneNumber, setPhoneNumber] = useState(initial?.phoneNumber ?? "");
  const { fetchPrivate } = useFetchClient();
  const [roleList, setRoleList] = useState<Role[]>([]);
  const [roleCode, setRoleCode] = useState(initial?.role?.roleCode ?? "");
  const [status, setStatus] = useState(initial?.status ?? "ACTIVE");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const handleGetRole = async () =>{
      try {
      const result = await fetchPrivate<Role[]>(
        STAFF_MANAGEMENT_API_ENDPOINTS.GET_ROLE,
        "GET",
      );
      setRoleList(result.data);
          console.log("ROLE RESPONSE:", result);   // ← thêm

    } catch (error) {
      console.error("Lỗi lấy danh sách vai trò:", error);
    }
  };
  useEffect(() => {
    handleGetRole();
  }, []);

  const handleCreateStaff = async () => {
   try {
        await fetchPrivate<Role[]>(
        STAFF_MANAGEMENT_API_ENDPOINTS.STAFF_MANAGEMENT,
        "POST",
        {
          fullName,
          phoneNumber,
          roleCode,
          password,
          confirmPassword
        }
      );
      setSuccessMsg("Tạo nhân sự thành công!");
      onRefresh();
      onClose();
    } catch (error: any) {
      console.error("Lỗi lấy danh sách vai trò:", error);
      setErrorMsg(error?.message || "Tạo nhân sự thất bại, vui lòng thử lại");
    }
  }; 

  const handleUpdateStaff = async () => {
    try {
        await fetchPrivate(
          `${STAFF_MANAGEMENT_API_ENDPOINTS.STAFF_MANAGEMENT}/${initial?.id}`,
          "PUT",
          { fullName, 
            phoneNumber,
            roleCode,
            status
          }
        );
      setSuccessMsg("Cập nhật thông tin nhân sự thành công!");
      onRefresh();
      onClose();
    } catch (error: any) {
      console.error("Lỗi lấy danh sách vai trò:", error);
      setErrorMsg(error?.message || "Tạo nhân sự thất bại, vui lòng thử lại");
    }
  }; 

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <style>{phoneStyles}</style>
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white rounded shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden"
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              {isEdit ? "Chỉnh sửa nhân sự" : "Thêm nhân sự mới"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit
                ? "Cập nhật thông tin tài khoản nhân viên."
                : "Tạo tài khoản mới cho nhân viên trong gara."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY 2 COLUMNS */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
          {/* LEFT */}
          <div className="md:col-span-2 bg-[#EDF3FF] p-6 flex flex-col gap-4 border-r border-slate-100">
            <div className="flex items-center gap-2 text-[#00285E]">
              <div className="w-9 h-9 rounded bg-[#00285E] flex items-center justify-center shrink-0">
                <Users size={16} className="text-[#F9A11B]" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Tài khoản nhân sự</h3>
                <p className="text-[11px] text-slate-500">
                  Quản lý truy cập và vai trò.
                </p>
              </div>
            </div>

            <div className="relative aspect-square rounded-md overflow-hidden shadow-2xl border border-white/10 group flex-1 bg-gradient-to-br from-[#00285E] to-[#003a8a] flex items-center justify-center">
              <Users size={96} className="text-[#F9A11B]/30" />
            </div>

            <div className="text-[11px] text-slate-600 leading-relaxed bg-white/60 rounded p-3 border border-white/40">
              <span className="font-bold text-[#00285E]">Gợi ý:</span> Để trống
              mật khẩu khi tạo, hệ thống sẽ tự tạo mật khẩu tạm và gửi cho nhân
              viên.
            </div>
          </div>

          {/* RIGHT */}
          <div className="md:col-span-3 p-6 space-y-4">
            <FormField label="Họ và tên">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Vd: Nguyễn Văn An"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
              />
            </FormField>

        <FormField label="Số điện thoại">
          <div className="login-phone">
            <PhoneInput
              country="vn"
              value={phoneNumber}
              onChange={(val) => {
                setPhoneNumber(val);
              }}
              enableSearch
              searchPlaceholder="Tìm quốc gia..."
              inputProps={{ name: 'phone' }}
              countryCodeEditable={false}
            />
          </div>
        </FormField>
            <div className="grid grid-cols-2 gap-4">
             <FormField label="Vai trò">
           
            <select
              value={roleCode}
              onChange={(e) => setRoleCode(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
            >
              <option value="" disabled>-- Chọn vai trò --</option>
              {roleList.map((r) => (
                <option key={r.id} value={r.roleCode}>
                  {r.roleName}
                </option>
              ))}
            </select>
          </FormField>
              {isEdit && (
                <FormField label="Trạng thái">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StaffStatus)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}
            </div>

            {!isEdit && (
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Mật khẩu (tùy chọn)">
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </FormField>
                <FormField label="Xác nhận mật khẩu">
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu"
                      className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </FormField>
              </div>
            )}

            {errorMsg && (
              <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded px-3 py-2">
                {errorMsg}
              </div>
            )}
            
          {successMsg && (
            <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-3 py-2">
              {successMsg}
            </div>
          )}
          </div>
        </div>


        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-slate-200 rounded text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Hủy
          </button>
          <button 
            onClick={isEdit ? handleUpdateStaff : handleCreateStaff}
            className="px-6 py-2.5 bg-[#F9A11B] text-[#00285E] rounded text-sm font-bold shadow-md shadow-[#F9A11B]/20 hover:bg-[#E08F12] transition-all">
            {isEdit ? "Lưu thay đổi" : "Tạo nhân sự"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
function StatusBadge({ status }: { status: StaffStatus }) {
  const styleMap: Record<StaffStatus, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-600 border border-emerald-200",
    INACTIVE: "bg-slate-100 text-slate-500 border border-slate-200",
    PENDING: "bg-amber-50 text-amber-600 border border-amber-200",
    BANNED: "bg-rose-50 text-rose-600 border border-rose-200",
  };
  const dotMap: Record<StaffStatus, string> = {
    ACTIVE: "bg-emerald-500",
    INACTIVE: "bg-slate-400",
    PENDING: "bg-amber-500",
    BANNED: "bg-rose-500",
  };
  const label = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${styleMap[status]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotMap[status]}`} />
      {label}
    </span>
  );
}

function RoleBadge({ roleCode, roleName }: { roleCode: string; roleName: string }) {
  const styleMap: Record<string, string> = {
    TECHNICIAN: "bg-blue-50 text-blue-700 border border-blue-200",
    RECEPTIONIST: "bg-violet-50 text-violet-700 border border-violet-200",
    MANAGER: "bg-orange-50 text-orange-700 border border-orange-200",
    ADMIN: "bg-rose-50 text-rose-700 border border-rose-200",
  };
  const style =
    styleMap[roleCode.toUpperCase()] ?? "bg-slate-50 text-[#00285E] border border-slate-200";
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wide uppercase ${style}`}
    >
      {roleName}
    </span>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
