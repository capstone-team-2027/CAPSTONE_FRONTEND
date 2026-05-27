import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Users,
  UserPlus,
  Pencil,
  X,
  Filter,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import type { Role, StaffManagement } from "../../model/dto/staffManagement.dto";
import { useFetchClient } from "../../hook/useFetchClient";
import { STAFF_MANAGEMENT_API_ENDPOINTS } from "../../constants/admin/staffManagement";

type StaffStatus = "ACTIVE" | "INACTIVE" | "PENDING" | "BANNED";


const STATUS_OPTIONS: { value: StaffStatus; label: string }[] = [
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "INACTIVE", label: "Tạm nghỉ" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "BANNED", label: "Bị khóa" },
];

export default function AdminStaffManagement() {
  const { showToast } = useOutletContext<{
    searchQuery: string;
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();
  const { fetchPrivate } = useFetchClient();
  const [staff, setStaff] = useState<StaffManagement[]>([]);
  const [editingStaff, setEditingStaff] = useState<StaffManagement | null>( null,);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const totalActive = staff.filter((s) => s.status === "ACTIVE").length;
  const totalTechnicians = staff.filter((s) => s.role.roleCode === "TECHNICIAN",).length;

  const handleGetStaff = async () => {
    try {
      const result = await fetchPrivate<StaffManagement[]>(
        STAFF_MANAGEMENT_API_ENDPOINTS.STAFF_MANAGEMENT,
        "GET",
      );
      setStaff(result.data);
    } catch (error) {
      console.error("Lỗi lấy danh sách nhân viên:", error);
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
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">
            Quản lý Nhân sự
          </h1>
          <p className="text-slate-500 text-sm">
            Tạo và quản lý tài khoản nhân viên trong gara.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#F9A11B] text-[#00285E] rounded text-sm font-bold shadow-md shadow-[#F9A11B]/20 hover:bg-[#E08F12] transition-all transform hover:translate-y-[-1px]"
        >
          <UserPlus size={16} />
          <span>Thêm nhân sự</span>
        </button>
      </div>

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
            <span className="text-2xl font-bold text-slate-900 tracking-tight block">
              {staff.length}
            </span>
            <span className="text-2xl font-bold text-slate-900 tracking-tight block"></span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}
          className="bg-white p-6 rounded-2xl border-2 border-[#F9A11B] shadow-xs flex items-center gap-4 cursor-pointer transition-all"
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
        <div className="p-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">
            Danh sách nhân sự
          </h2>
          <button
            onClick={() => showToast("Mở bộ lọc nâng cao...", "info")}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600"
          >
            <Filter size={16} />
          </button>
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
                staff.map((s) => (
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
                      <RoleBadge roleCode={s.role.roleName} />
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
      </div>

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
          <input
             type="text"
            value={phoneNumber}
            onChange={(e) => {
              const onlyNums = e.target.value.replace(/\D/g, ""); // bỏ ký tự không phải số
              setPhoneNumber(onlyNums);
            }}
            inputMode="numeric"
            placeholder="Vd: 0901234567"
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
          />
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
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                  />
                </FormField>
                <FormField label="Xác nhận mật khẩu">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                  />
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

function RoleBadge({ roleCode }: { roleCode: string }) {
  const styleMap: Record<string, string> = {
    TECHNICIAN: "bg-blue-50 text-blue-700 border border-blue-200",
    RECEPTIONIST: "bg-violet-50 text-violet-700 border border-violet-200",
    MANAGER: "bg-orange-50 text-orange-700 border border-orange-200",
  };
  const style =
    styleMap[roleCode] ?? "bg-slate-50 text-slate-600 border border-slate-200";
  const label = roleCode;
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wide uppercase ${style}`}
    >
      {label}
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
