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
  Download,
  AlertTriangle,
  Briefcase,
  Search,
  Eye,
  EyeOff,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import 'react-phone-input-2/lib/style.css';
import * as PhoneInputLib from 'react-phone-input-2';

const PAGE_SIZE = 6;
import { useNavigate, useOutletContext } from "react-router-dom";
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

const getInitials = (name: string) => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

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
import { formatPhoneDisplay } from "../../../utils/formatPhone";

type StaffStatus = "ACTIVE" | "INACTIVE" | "PENDING" | "BANNED";


// Nhãn đầy đủ cho badge — DB có thể còn bản ghi BANNED/PENDING cũ nên vẫn phải hiển thị đúng.
const STATUS_OPTIONS: { value: StaffStatus; label: string }[] = [
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "INACTIVE", label: "Tạm nghỉ" },
  { value: "BANNED", label: "Bị khóa" },
];

// Trạng thái admin được phép đặt/lọc: chỉ hoạt động và tạm khóa.
const SELECTABLE_STATUS_OPTIONS = STATUS_OPTIONS.filter(
  (option) => option.value === "ACTIVE" || option.value === "INACTIVE",
);

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

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StaffStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const totalActive = staff.filter((s) => s.status === "ACTIVE").length;
  const totalTechnicians = staff.filter((s) => s.role.roleCode === "TECHNICIAN",).length;
  const filteredStaff = useMemo(() => {
    const list = staff.filter((s) => {
      // Tìm được cả khi gõ kiểu 0555... lẫn 84555... vì DB lưu dạng 84...
      const searchDigits = searchTerm.replace(/\D/g, "");
      const phoneDigits = (s.phoneNumber || "").replace(/\D/g, "");
      const phoneLocal = phoneDigits.startsWith("84") ? `0${phoneDigits.slice(2)}` : phoneDigits;
      const searchMatch =
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (searchDigits !== "" &&
          (phoneDigits.includes(searchDigits) || phoneLocal.includes(searchDigits))) ||
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
              Tạo và quản lý tài khoản nhân viên trong gara.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#F9A11B] text-[#00285E] rounded-xl text-sm font-bold shadow-md shadow-[#F9A11B]/20 hover:bg-[#E08F12] transition-all transform hover:translate-y-[-1px]"
        >
          <UserPlus size={16} />
          <span>Thêm nhân sự</span>
        </button>
      </div>

      {/* ERROR MESSAGE WHEN SYSTEM DATA CANNOT BE LOADED */}
      {loadingError && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-rose-600">
          <AlertTriangle size={16} className="text-rose-500" />
          <span>Lỗi hệ thống: {loadingError}</span>
        </div>
      )}

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
                    {SELECTABLE_STATUS_OPTIONS.map((option) => (
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
                        <td className="py-4 px-6 flex items-center gap-3">
                          {s.avatar ? (
                            <img
                              src={s.avatar}
                              alt={s.fullName}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200/80 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#EDF3FF] text-[#00285E] flex items-center justify-center text-xs font-bold shrink-0">
                              {getInitials(s.fullName)}
                            </div>
                          )}
                          <span className="font-bold text-[#00285E] text-sm block">
                            {s.fullName}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-600 text-sm whitespace-nowrap">
                          {formatPhoneDisplay(s.phoneNumber)}
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
  const { fetchPrivate, fetchPrivateForm } = useFetchClient();
  const [roleList, setRoleList] = useState<Role[]>([]);
  const [roleCode, setRoleCode] = useState(initial?.role?.roleCode ?? "");
  const [status, setStatus] = useState(initial?.status ?? "ACTIVE");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatar, setAvatar] = useState(initial?.avatar ?? "");
  const [isUploading, setIsUploading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      setIsUploading(true);
      setErrorMsg("");
      const response = await fetchPrivateForm(
        `${STAFF_MANAGEMENT_API_ENDPOINTS.STAFF_MANAGEMENT}/upload-avatar`,
        "POST",
        formData
      );
      if (response && response.url) {
        setAvatar(response.url);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Tải ảnh đại diện thất bại");
    } finally {
      setIsUploading(false);
    }
  };
  
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
          confirmPassword,
          avatar
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
    // Để trống 2 ô mật khẩu nghĩa là giữ nguyên mật khẩu cũ, không gửi lên BE.
    if (password || confirmPassword) {
      if (password.length < 6) {
        setErrorMsg("Mật khẩu mới phải có ít nhất 6 ký tự");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Mật khẩu xác nhận không khớp");
        return;
      }
    }
    try {
        await fetchPrivate(
          `${STAFF_MANAGEMENT_API_ENDPOINTS.STAFF_MANAGEMENT}/${initial?.id}`,
          "PUT",
          { fullName,
            phoneNumber,
            roleCode,
            status,
            avatar,
            ...(password ? { password, confirmPassword } : {}),
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
              {avatar ? (
                <img
                  src={avatar}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users size={96} className="text-[#F9A11B]/30" />
              )}
              
              {isUploading && (
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
                  <Loader2 className="animate-spin text-white" size={24} />
                </div>
              )}
            </div>

            <label className="flex items-center justify-center gap-2 w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-xs">
              <span>Tải ảnh đại diện</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>

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
            <FormField label="Vai trò">
              <select
                value={roleCode}
                onChange={(e) => setRoleCode(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
              >
                <option value="" disabled>-- Chọn vai trò --</option>
                {roleList.filter(r => r.roleCode !== "CUSTOMER").map((r) => (
                  <option key={r.id} value={r.roleCode}>
                    {r.roleName}
                  </option>
                ))}
              </select>
            </FormField>

            <div>
              {isEdit && (
                <p className="text-[11px] text-slate-400 mb-2">
                  Để trống nếu không muốn đổi mật khẩu của nhân viên.
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <FormField label={isEdit ? "Mật khẩu mới" : "Mật khẩu (tùy chọn)"}>
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
            </div>

            {/* Trạng thái tài khoản: bật = INACTIVE (tạm khóa), tắt = ACTIVE */}
            {isEdit && (
              <FormField label="Trạng thái tài khoản">
                <button
                  type="button"
                  onClick={() => setStatus(status === "INACTIVE" ? "ACTIVE" : "INACTIVE")}
                  className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-all ${status === "INACTIVE"
                    ? "border-amber-300 bg-amber-50/70"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                    }`}
                >
                  <ShieldAlert
                    size={18}
                    className={`shrink-0 ${status === "INACTIVE" ? "text-amber-600" : "text-slate-400"
                      }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">
                      Nhân viên bị tạm khóa tài khoản
                    </p>
                    <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                      {status === "INACTIVE"
                        ? "Tài khoản đang bị chặn đăng nhập."
                        : "Tài khoản đang hoạt động bình thường."}
                    </p>
                  </div>
                  <span
                    className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${status === "INACTIVE" ? "bg-amber-500" : "bg-slate-300"
                      }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${status === "INACTIVE" ? "left-[22px]" : "left-0.5"
                        }`}
                    />
                  </span>
                </button>
              </FormField>
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
