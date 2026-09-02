import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Users,
  UserPlus,
  Pencil,
  X,
  Award,
  Download,
  AlertTriangle,
  Search,
  CheckCircle,
  TrendingUp,
  Mail,
  Phone,
  Calendar,
  Car,
  Clock,
  ShieldAlert,
  Coins,
  Eye,
  Sparkles,
  ShieldCheck,
  Wrench,
  MapPin,
  Loader2,
  KeyRound,
  Lock,
  User as UserIcon,
  ChevronRight,
  ChevronLeft,
  Eye as EyeIcon,
  EyeOff
} from "lucide-react";
import RescueTrackingModal from "../../../components/share/RescueTrackingModal";
import { useSocket } from "../../../hook/useSocket";
import {
  sendOtp,
  verifyOtp,
  setConfirmation,
  getConfirmation,
  clearRecaptcha,
} from "../../../services/firebaseOtp";
import { AUTH_API_ENDPOINTS } from "../../../constants/customer/authApiEndpoints";
import 'react-phone-input-2/lib/style.css';
import * as PhoneInputLib from 'react-phone-input-2';

// react-phone-input-2 xuất default lồng nhau tuỳ bundler -> gỡ về component thật.
type PhoneInputMod = { default?: unknown };
function resolvePhoneInput<T>(mod: unknown): T {
  const m = mod as PhoneInputMod;
  if (m && typeof m === 'object' && 'default' in m) {
    const d = m.default as unknown;
    if (d && typeof d === 'object' && 'default' in (d as PhoneInputMod)) {
      return (d as PhoneInputMod).default as T;
    }
    return d as T;
  }
  return mod as T;
}
const PhoneInput = resolvePhoneInput<React.ComponentType<{
  country?: string;
  value?: string;
  onChange?: (value: string) => void;
  enableSearch?: boolean;
  searchPlaceholder?: string;
  inputProps?: { name?: string };
  countryCodeEditable?: boolean;
}>>(PhoneInputLib);

// Style ô SĐT đồng bộ với trang đăng ký, chỉnh lại cho nền modal admin.
const adminPhoneStyles = `
    .admin-create-phone .react-tel-input .form-control {
        width: 100% !important;
        height: 48px !important;
        background: #F8FAFC !important;
        border: 1px solid #E2E8F0 !important;
        border-radius: 0.75rem !important;
        padding: 0 16px 0 58px !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        color: #1E293B !important;
        outline: none !important;
        transition: all 0.2s !important;
    }
    .admin-create-phone .react-tel-input .form-control:focus {
        border-color: #00285E !important;
        box-shadow: 0 0 0 2px rgba(0,40,94,0.10) !important;
    }
    .admin-create-phone .react-tel-input .form-control::placeholder {
        color: #94A3B8 !important;
        font-weight: 400 !important;
    }
    .admin-create-phone .react-tel-input .flag-dropdown {
        background: #F8FAFC !important;
        border: 1px solid #E2E8F0 !important;
        border-right: none !important;
        border-radius: 0.75rem 0 0 0.75rem !important;
    }
    .admin-create-phone .react-tel-input .flag-dropdown:hover,
    .admin-create-phone .react-tel-input .flag-dropdown.open {
        background: #F1F5F9 !important;
        border-color: #00285E80 !important;
    }
    .admin-create-phone .react-tel-input .selected-flag {
        background: transparent !important;
        padding: 0 8px 0 14px !important;
        border-radius: 0.75rem 0 0 0.75rem !important;
    }
    .admin-create-phone .react-tel-input .country-list {
        background: white !important;
        border: 1px solid #E2E8F0 !important;
        border-radius: 0.75rem !important;
        box-shadow: 0 8px 32px rgba(5,11,24,0.12) !important;
        max-height: 220px !important;
        margin-top: 4px !important;
        z-index: 60 !important;
    }
    .admin-create-phone .react-tel-input .country-list .country {
        color: #334155 !important;
        font-size: 13px !important;
        padding: 8px 14px !important;
    }
    .admin-create-phone .react-tel-input .country-list .country:hover,
    .admin-create-phone .react-tel-input .country-list .country.highlight {
        background: #EDF3FF !important;
        color: #00285E !important;
    }
    .admin-create-phone .react-tel-input .search-box {
        background: white !important;
        border: 1px solid #E2E8F0 !important;
        border-radius: 0.5rem !important;
        color: #1E293B !important;
        font-size: 13px !important;
        padding: 7px 12px !important;
        width: 100% !important;
        outline: none !important;
    }
    .admin-create-phone .react-tel-input .dial-code {
        color: #64748B !important;
    }
`;

const PAGE_SIZE = 6;
import { useOutletContext, useNavigate } from "react-router-dom";
import { useFetchClient_v2 } from "../../../hook/useFetchClient";
import { CUSTOMER_API_ENDPOINTS } from "../../../constants/admin/customerApiEndpoint";

import type {
  CustomerStatus,
  MembershipTier,
  CustomerType,
  CustomerData,
} from "../../../model/customerTypes";
import {
  TIER_CONFIG,
  STATUS_CONFIG,
} from "../../../model/customerTypes";
import { formatPhoneDisplay } from "../../../utils/formatPhone";

export default function AdminCustomerManagement() {
  const navigate = useNavigate();
  const { showToast } = useOutletContext<{
    searchQuery: string;
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();
  const { fetchPrivate, fetchPrivateForm, fetchPublic } = useFetchClient_v2();
  const socket = useSocket();

  // Primary State
  const [customers, setCustomers] = useState<(CustomerData & { rescueRequests?: any[] })[]>([]);
  const [trackingData, setTrackingData] = useState<{ rescue: any; customerName: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [tierFilter, setTierFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetchPrivate(CUSTOMER_API_ENDPOINTS.LIST);
        if (response.success) {
          const mappedRegistered = response.data.registeredCustomers.map((c: any) => ({
            id: c.id,
            fullName: c.user?.fullName || c.name || "Khách hàng",
            phoneNumber: c.phone || "",
            email: c.user?.email || "",
            membership_tier: c.membership_tier || "BRONZE",
            loyalty_points: c.loyalty_points || 0,
            status: c.user?.status || "ACTIVE",
            createdAt: c.createdAt ? c.createdAt.split("T")[0] : "",
            avatar: c.user?.avatar || "",
            type: "REGISTERED" as CustomerType,
            vehicles: [],
            appointments: [],
            prediction: { frequentViews: [], lastViewedDate: "", conversionProbability: 0, recommendedService: "", salesTip: "" },
            chatHistory: [],
            usedParts: [],
            rescueRequests: c.rescueRequests || []
          }));
          // Trang này chỉ quản lý tài khoản khách hàng trong hệ thống,
          // khách vãng lai (guestCustomers) không có tài khoản nên bỏ qua.
          setCustomers(mappedRegistered);
        }
      } catch (error) {
        showToast("Lỗi khi tải danh sách khách hàng", "warning");
      }
    };
    fetchCustomers();
  }, [fetchPrivate, showToast]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const roleCode = user?.role || 'ADMIN';
    const refresh = (data: any) => {
      if (data?.type === 'RESCUE_STATUS_UPDATED') window.location.reload();
    };
    socket.emit('join-role', roleCode);
    socket.on('new_notification', refresh);
    return () => { socket.off('new_notification', refresh); };
  }, [socket]);

  // Selection & Modal State
  const [editingCustomer, setEditingCustomer] = useState<CustomerData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCustomerClick = (customer: CustomerData) => {
    navigate(`/admin/customers/${customer.id}`);
  };

  // Edit Customer Form State
  const [editCustName, setEditCustName] = useState("");
  const [editCustPhone, setEditCustPhone] = useState("");
  const [editCustEmail, setEditCustEmail] = useState("");
  const [editCustTier, setEditCustTier] = useState<MembershipTier>("BRONZE");
  const [editCustPoints, setEditCustPoints] = useState(0);
  const [editCustStatus, setEditCustStatus] = useState<CustomerStatus>("ACTIVE");
  const [editCustAvatar, setEditCustAvatar] = useState("");
  const [isUploadingEditAvatar, setIsUploadingEditAvatar] = useState(false);

  const handleCustEditAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      setIsUploadingEditAvatar(true);
      const response = await fetchPrivateForm(
        `${CUSTOMER_API_ENDPOINTS.LIST}/upload-avatar`,
        "POST",
        formData
      );
      if (response && response.url) {
        setEditCustAvatar(response.url);
      }
    } catch (err: any) {
      showToast(err.message || "Tải ảnh đại diện thất bại", "warning");
    } finally {
      setIsUploadingEditAvatar(false);
    }
  };

  // Create Customer Form State
  const [createCustName, setCreateCustName] = useState("");
  const [createCustPhone, setCreateCustPhone] = useState("");
  const [createCustEmail, setCreateCustEmail] = useState("");
  const [createCustTier, setCreateCustTier] = useState<MembershipTier>("BRONZE");
  const [createCustPoints, setCreateCustPoints] = useState(0);
  const [createCustStatus, setCreateCustStatus] = useState<CustomerStatus>("ACTIVE");
  const [createCustType, setCreateCustType] = useState<CustomerType>("REGISTERED");
  const [createCustPassword, setCreateCustPassword] = useState("");
  const [createCustConfirmPassword, setCreateCustConfirmPassword] = useState("");
  const [createCustAvatar, setCreateCustAvatar] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  // Modal tạo khách hàng chạy đúng luồng đăng ký của khách: SĐT -> OTP (Firebase) -> hồ sơ.
  // Khác trang đăng ký ở chỗ 3 bước nằm gọn trong modal, không điều hướng sang route khác.
  const [createStep, setCreateStep] = useState<"phone" | "otp" | "profile">("phone");
  const [createOtpValue, setCreateOtpValue] = useState("");
  const [createOtpCountdown, setCreateOtpCountdown] = useState(0);
  const [createIdToken, setCreateIdToken] = useState("");
  const [createStepError, setCreateStepError] = useState("");
  const [isCreateStepLoading, setIsCreateStepLoading] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showCreateConfirmPassword, setShowCreateConfirmPassword] = useState(false);
  useEffect(() => {
    if (createOtpCountdown <= 0) return;
    const intervalId = window.setInterval(() => setCreateOtpCountdown((t) => t - 1), 1000);
    return () => window.clearInterval(intervalId);
  }, [createOtpCountdown]);

  const handleCustAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      setIsUploadingAvatar(true);
      const response = await fetchPrivateForm(
        `${CUSTOMER_API_ENDPOINTS.LIST}/upload-avatar`,
        "POST",
        formData
      );
      if (response && response.url) {
        setCreateCustAvatar(response.url);
      }
    } catch (err: any) {
      showToast(err.message || "Tải ảnh đại diện thất bại", "warning");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleOpenCreate = () => {
    setCreateCustName("");
    setCreateCustPhone("");
    setCreateCustEmail("");
    setCreateCustTier("BRONZE");
    setCreateCustPoints(0);
    setCreateCustStatus("ACTIVE");
    setCreateCustType("REGISTERED");
    setCreateCustPassword("");
    setCreateCustConfirmPassword("");
    setCreateCustAvatar("");
    setIsUploadingAvatar(false);
    setCreateStep("phone");
    setCreateOtpValue("");
    setCreateOtpCountdown(0);
    setCreateIdToken("");
    setCreateStepError("");
    setIsCreateStepLoading(false);
    setShowCreatePassword(false);
    setShowCreateConfirmPassword(false);
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setConfirmation(null);
    clearRecaptcha();
  };

  // Bước 1: kiểm tra số chưa có tài khoản rồi nhờ Firebase gửi OTP về máy khách.
  const handleCreateSendOtp = async () => {
    // PhoneInput trả số không có dấu "+" và luôn kèm mã vùng (vd "84901234567"),
    // Firebase lại cần E.164 -> gắn "+" và bỏ số 0 thừa nếu khách gõ kiểu 084...
    const digits = createCustPhone.replace(/\D/g, "");
    const normalizedPhone = digits.startsWith("84")
      ? `+84${digits.slice(2).replace(/^0+/, "")}`
      : `+84${digits.replace(/^0+/, "")}`;
    if (!/^\+84(3|5|7|8|9)\d{8}$/.test(normalizedPhone)) {
      setCreateStepError("Số điện thoại không hợp lệ. Ví dụ: 0901234567.");
      return;
    }
    setIsCreateStepLoading(true);
    setCreateStepError("");
    try {
      await fetchPublic(AUTH_API_ENDPOINTS.CHECK_PHONE, "POST", { phone: normalizedPhone });
      const confirmation = await sendOtp(normalizedPhone, "admin-recaptcha-container");
      setConfirmation(confirmation);
      setCreateCustPhone(normalizedPhone);
      setCreateOtpValue("");
      setCreateOtpCountdown(60);
      setCreateStep("otp");
    } catch (err: any) {
      setCreateStepError(err?.message || "Không gửi được mã OTP, vui lòng thử lại.");
    } finally {
      setIsCreateStepLoading(false);
    }
  };

  const handleCreateResendOtp = async () => {
    setIsCreateStepLoading(true);
    setCreateStepError("");
    try {
      const confirmation = await sendOtp(createCustPhone, "admin-recaptcha-container");
      setConfirmation(confirmation);
      setCreateOtpValue("");
      setCreateOtpCountdown(60);
    } catch (err: any) {
      setCreateStepError(err?.message || "Không gửi lại được mã OTP.");
    } finally {
      setIsCreateStepLoading(false);
    }
  };

  // Bước 2: xác minh mã khách đọc cho admin, lấy idToken làm bằng chứng số đã xác thực.
  const handleCreateVerifyOtp = async () => {
    if (createOtpValue.replace(/\D/g, "").length !== 6) return;
    const confirmation = getConfirmation();
    if (!confirmation) {
      setCreateStepError("Phiên xác thực đã hết hạn, vui lòng gửi lại mã.");
      return;
    }
    setIsCreateStepLoading(true);
    setCreateStepError("");
    try {
      const idToken = await verifyOtp(confirmation, createOtpValue);
      setConfirmation(null);
      setCreateIdToken(idToken);
      setCreateStep("profile");
    } catch (err: any) {
      setCreateStepError(err?.message || "Mã OTP không đúng hoặc đã hết hạn.");
    } finally {
      setIsCreateStepLoading(false);
    }
  };

  const handleSaveCreate = async () => {
    if (!createCustName.trim() || !createCustPhone.trim()) {
      showToast("Vui lòng điền đầy đủ Tên và Số điện thoại", "warning");
      return;
    }
    if (!createCustPassword) {
      showToast("Vui lòng nhập mật khẩu", "warning");
      return;
    }
    if (createCustPassword !== createCustConfirmPassword) {
      showToast("Mật khẩu xác nhận không trùng khớp", "warning");
      return;
    }
    try {
      const response = await fetchPrivate<{ success: boolean; message?: string }>(
        CUSTOMER_API_ENDPOINTS.LIST,
        "POST",
        {
          fullName: createCustName,
          phoneNumber: createCustPhone,
          email: null,
          membership_tier: "BRONZE",
          loyalty_points: 0,
          status: "ACTIVE",
          type: "REGISTERED",
          password: createCustPassword,
          avatar: createCustAvatar || null,
          idToken: createIdToken || undefined
        }
      );
      if (response) {
        showToast("Tạo khách hàng mới thành công", "success");
        closeCreateModal();
        window.location.reload();
      }
    } catch (err: any) {
      showToast(err?.message || "Có lỗi xảy ra khi tạo khách hàng", "warning");
    }
  };

  // Computed Global Statistics
  const statistics = useMemo(() => {
    const total = customers.length;
    const active = customers.filter(c => c.status === "ACTIVE").length;
    // Tài khoản không đăng nhập được: admin chỉ đặt được INACTIVE, nhưng dữ liệu cũ
    // vẫn có thể còn BANNED nên đếm cả hai.
    const locked = customers.filter(c => c.status === "INACTIVE" || c.status === "BANNED").length;

    let totalPoints = 0;
    let totalSpendVal = 0;

    customers.forEach(c => {
      totalPoints += c.loyalty_points;
      c.appointments.forEach(app => {
        if (app.status === "COMPLETED") {
          totalSpendVal += app.cost;
        }
      });
    });

    const avgPoints = total > 0 ? Math.round(totalPoints / total) : 0;

    // Tiers count
    const tiersBreakdown: Record<MembershipTier, number> = {
      BRONZE: customers.filter(c => c.membership_tier === "BRONZE").length,
      SILVER: customers.filter(c => c.membership_tier === "SILVER").length,
      GOLD: customers.filter(c => c.membership_tier === "GOLD").length,
      PLATINUM: customers.filter(c => c.membership_tier === "PLATINUM").length,
      NONE: customers.filter(c => c.membership_tier === "NONE").length,
    };

    return { total, active, locked, avgPoints, totalSpendVal, tiersBreakdown };
  }, [customers]);

  // Filtering Logic
  const filteredCustomers = useMemo(() => {
    const list = customers.filter(c => {
      // Tìm được cả khi gõ kiểu 0999... lẫn 84999... vì DB lưu dạng 84...
      const searchDigits = searchTerm.replace(/\D/g, "");
      const phoneDigits = (c.phoneNumber || "").replace(/\D/g, "");
      const phoneLocal = phoneDigits.startsWith("84") ? `0${phoneDigits.slice(2)}` : phoneDigits;
      const matchesSearch =
        c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (searchDigits !== "" &&
          (phoneDigits.includes(searchDigits) || phoneLocal.includes(searchDigits))) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
      const matchesTier = tierFilter === "ALL" || c.membership_tier === tierFilter;

      return matchesSearch && matchesStatus && matchesTier;
    });

    const tierPriority: Record<MembershipTier, number> = {
      PLATINUM: 1,
      GOLD: 2,
      SILVER: 3,
      BRONZE: 4,
      NONE: 5
    };

    return list.sort((a, b) => {
      const pA = tierPriority[a.membership_tier] || 5;
      const pB = tierPriority[b.membership_tier] || 5;
      if (pA !== pB) return pA - pB;
      return b.loyalty_points - a.loyalty_points;
    });
  }, [customers, searchTerm, statusFilter, tierFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredCustomers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Actions
  const handleOpenEdit = (customer: CustomerData) => {
    setEditingCustomer(customer);
    setEditCustName(customer.fullName);
    // PhoneInput cần chuỗi số kèm mã vùng, không có dấu "+" (vd "84901234567")
    const rawPhone = (customer.phoneNumber || "").replace(/\D/g, "");
    setEditCustPhone(
      rawPhone.startsWith("84") ? rawPhone : `84${rawPhone.replace(/^0+/, "")}`,
    );
    setEditCustEmail(customer.email);
    setEditCustTier(customer.membership_tier);
    setEditCustPoints(customer.loyalty_points);
    setEditCustStatus(customer.status);
    setEditCustAvatar(customer.avatar || "");
    setIsUploadingEditAvatar(false);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editCustName.trim() || !editCustPhone.trim()) {
      showToast("Vui lòng điền đầy đủ Tên và Số điện thoại", "warning");
      return;
    }

    try {
      await fetchPrivate(
        `${CUSTOMER_API_ENDPOINTS.LIST}/${editingCustomer?.id}`,
        "PUT",
        {
          fullName: editCustName,
          phoneNumber: editCustPhone,
          membership_tier: editCustTier,
          loyalty_points: Number(editCustPoints),
          status: editCustStatus,
          avatar: editCustAvatar || null
        }
      );

      setCustomers(prev =>
        prev.map(c =>
          c.id === editingCustomer?.id
            ? {
              ...c,
              fullName: editCustName,
              phoneNumber: editCustPhone,
              email: editCustEmail,
              membership_tier: editCustTier,
              loyalty_points: Number(editCustPoints),
              status: editCustStatus,
              avatar: editCustAvatar
            }
            : c
        )
      );

      setIsEditModalOpen(false);
      setEditingCustomer(null);
      showToast("Cập nhật thông tin khách hàng thành công", "success");
    } catch (err: any) {
      showToast(err?.message || "Có lỗi xảy ra khi cập nhật khách hàng", "warning");
    }
  };

  const getInitials = (name: string) =>
    name.trim().split(/\s+/).slice(-2).map(w => w[0]).join("").toUpperCase();

  const handleExportCSV = () => {
    if (filteredCustomers.length === 0) {
      showToast("Không có dữ liệu khách hàng để xuất báo cáo", "warning");
      return;
    }

    const headers = ["ID", "Họ và Tên", "Số điện thoại", "Email", "Hạng thành viên", "Điểm tích lũy", "Số lượt đặt lịch", "Trạng thái", "Ngày tham gia"];
    const rows = filteredCustomers.map(c => [
      c.id,
      c.fullName,
      c.phoneNumber,
      c.email,
      c.membership_tier,
      c.loyalty_points,
      c.appointments.length,
      c.status === "ACTIVE" ? "Đang hoạt động" : c.status === "INACTIVE" ? "Tạm ngưng" : "Bị cấm",
      c.createdAt
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `danh-sach-khach-hang-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    showToast("Xuất danh sách khách hàng ra CSV thành công", "success");
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* HEADER SECTION */}
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
              Quản lý tài khoản khách hàng
            </h1>
            <p className="text-slate-500 text-sm">
              Xem hồ sơ, lịch sử dịch vụ, hạng thành viên và thống kê tài khoản khách hàng trong hệ thống.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#F9A11B] text-[#00285E] rounded-xl text-sm font-bold shadow-md shadow-[#F9A11B]/20 hover:bg-[#E08F12] transition-all transform hover:translate-y-[-1px]"
          >
            <UserPlus size={16} />
            <span>Tạo khách hàng mới</span>
          </button>
        </div>
      </div>

      {/* STATISTICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* KPI CARD: TOTAL CUSTOMERS */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Users size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              Tổng số tài khoản
            </span>
            <span className="text-2xl font-black text-slate-900 tracking-tight block mt-0.5">
              {statistics.total}
            </span>
          </div>
        </motion.div>

        {/* KPI CARD: ACTIVE CUSTOMERS */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              Tài khoản đang hoạt động
            </span>
            <span className="text-2xl font-black text-slate-900 tracking-tight block mt-0.5">
              {statistics.active}
            </span>
          </div>
        </motion.div>

        {/* KPI CARD: LOCKED ACCOUNTS */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <ShieldAlert size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              Tài khoản bị khóa
            </span>
            <span className="text-2xl font-black text-slate-900 tracking-tight block mt-0.5">
              {statistics.locked}
            </span>
          </div>
        </motion.div>
      </div>


      {/* FILTER & DATA TABLE SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        {/* FILTERS BAR */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, điện thoại, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10"
            >
              <option value="ALL">Trạng thái: Tất cả</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="INACTIVE">Tạm khóa</option>
            </select>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10"
            >
              <option value="ALL">Hạng: Tất cả</option>
              <option value="BRONZE">Đồng</option>
              <option value="SILVER">Bạc</option>
              <option value="GOLD">Vàng</option>
              <option value="PLATINUM">Bạch Kim</option>
              <option value="NONE">Không hạng</option>
            </select>
          </div>
        </div>

        {/* CUSTOMERS TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th className="py-4 px-6">Khách hàng</th>
                <th className="py-4 px-4">Số điện thoại</th>
                <th className="py-4 px-4">Hạng thành viên</th>
                <th className="py-4 px-4 text-center">Điểm</th>
                <th className="py-4 px-4 text-center">Lượt đặt</th>
                <th className="py-4 px-4">Trạng thái</th>
                <th className="py-4 px-6 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-sm font-semibold">
                    Không tìm thấy khách hàng nào khớp với điều kiện lọc...
                  </td>
                </tr>
              ) : (
                pageItems.map(customer => {
                  const tier = TIER_CONFIG[customer.membership_tier];
                  const statusInfo = STATUS_CONFIG[customer.status];
                  const activeRescue = customer.rescueRequests?.find((rescue: any) => ['EN_ROUTE', 'TOWING'].includes(rescue.status));
                  return (
                    <tr
                      key={customer.id}
                      onClick={() => handleCustomerClick(customer)}
                      className="border-b border-slate-100 hover:bg-slate-50/70 transition-all cursor-pointer group"
                    >
                      <td className="py-4 px-6 flex items-center gap-3">
                        {customer.avatar ? (
                          <img
                            src={customer.avatar}
                            alt={customer.fullName}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200/80 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#EDF3FF] text-[#00285E] flex items-center justify-center text-xs font-bold shrink-0">
                            {getInitials(customer.fullName)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-bold text-[#00285E] text-sm flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                            <span className="truncate">{customer.fullName}</span>
                          </span>
                          <span className="text-xs text-slate-400 font-medium block mt-0.5 truncate">
                            {customer.email}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-600 text-sm font-semibold whitespace-nowrap">
                        {formatPhoneDisplay(customer.phoneNumber)}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${tier.bg} ${tier.color} border ${tier.border}`}>
                          <Award size={12} style={{ color: tier.iconColor }} />
                          {tier.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center text-slate-700 font-bold text-sm">
                        {customer.loyalty_points}
                      </td>
                      <td className="py-4 px-4 text-center text-slate-500 font-bold text-sm">
                        {customer.appointments.length}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${statusInfo.bg}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        {activeRescue && (
                          <button
                            onClick={() => setTrackingData({ rescue: activeRescue, customerName: customer.fullName })}
                            className="mr-2 px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors inline-flex items-center gap-1.5 text-xs font-bold"
                            title="Theo dõi cứu hộ realtime"
                          >
                            <MapPin size={14} className="animate-pulse" /> Theo dõi
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(customer)}
                          className="p-2 rounded-xl hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-colors inline-flex items-center justify-center border border-transparent hover:border-blue-100"
                          title="Chỉnh sửa"
                        >
                          <Pencil size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            Hiển thị {pageItems.length} trên {filteredCustomers.length} khách hàng
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={safePage <= 1}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Trước
            </button>
            <span className="px-3 py-2 text-sm font-semibold text-slate-600">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={safePage >= totalPages}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Tiếp
            </button>
          </div>
        </div>
      </div>

      <RescueTrackingModal
        key={trackingData?.rescue?.id || 'closed'}
        rescue={trackingData?.rescue || null}
        customerName={trackingData?.customerName || ''}
        onClose={() => setTrackingData(null)}
      />

      {/* EDIT CUSTOMER MODAL */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 pt-24 md:pt-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col"
            >
              <style>{adminPhoneStyles}</style>

              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-slate-100 bg-[#00285E] relative">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
                <h3 className="font-bold text-white text-2xl">Chỉnh Sửa Thông Tin</h3>
                <p className="text-xs text-white/60 mt-1">
                  Thay đổi hồ sơ, hạng thành viên, điểm và trạng thái tài khoản.
                </p>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-2.5 pb-5 border-b border-slate-100">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden shadow-md border border-slate-200 bg-[#EDF3FF] flex items-center justify-center">
                    {editCustAvatar ? (
                      <img
                        src={editCustAvatar}
                        alt="Customer Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users size={36} className="text-[#00285E]/30" />
                    )}

                    {isUploadingEditAvatar && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
                        <Loader2 className="animate-spin text-white" size={18} />
                      </div>
                    )}
                  </div>

                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-all cursor-pointer">
                    <span>Thay đổi ảnh đại diện</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCustEditAvatarUpload}
                      disabled={isUploadingEditAvatar}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Họ và tên */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Họ và tên
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <UserIcon size={17} />
                    </div>
                    <input
                      type="text"
                      value={editCustName}
                      onChange={(e) => setEditCustName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full py-3 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
                    />
                  </div>
                </div>

                {/* Số điện thoại */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Số điện thoại
                  </label>
                  <div className="admin-create-phone">
                    <PhoneInput
                      country="vn"
                      value={editCustPhone}
                      onChange={(val) => setEditCustPhone(val)}
                      enableSearch
                      searchPlaceholder="Tìm quốc gia..."
                      inputProps={{ name: "editPhone" }}
                      countryCodeEditable={false}
                    />
                  </div>
                </div>

                {/* Hạng + Điểm */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Hạng thành viên
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Award size={17} />
                      </div>
                      <select
                        value={editCustTier}
                        onChange={(e) => setEditCustTier(e.target.value as MembershipTier)}
                        className="w-full py-3 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-bold text-slate-800 appearance-none cursor-pointer"
                      >
                        <option value="BRONZE">Đồng (Bronze)</option>
                        <option value="SILVER">Bạc (Silver)</option>
                        <option value="GOLD">Vàng (Gold)</option>
                        <option value="PLATINUM">Bạch Kim (Platinum)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Điểm tích lũy
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Coins size={17} />
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={editCustPoints}
                        onChange={(e) => setEditCustPoints(Number(e.target.value))}
                        placeholder="0"
                        className="w-full py-3 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Trạng thái tài khoản: bật = INACTIVE (tạm khóa), tắt = ACTIVE */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Trạng thái tài khoản
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditCustStatus(editCustStatus === "INACTIVE" ? "ACTIVE" : "INACTIVE")
                    }
                    className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-all ${editCustStatus === "INACTIVE"
                      ? "border-amber-300 bg-amber-50/70"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300"
                      }`}
                  >
                    <ShieldAlert
                      size={18}
                      className={`shrink-0 ${editCustStatus === "INACTIVE" ? "text-amber-600" : "text-slate-400"
                        }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800">
                        Khách hàng bị tạm khóa tài khoản
                      </p>
                      <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                        {editCustStatus === "INACTIVE"
                          ? "Tài khoản đang bị chặn đăng nhập."
                          : "Tài khoản đang hoạt động bình thường."}
                      </p>
                    </div>
                    <span
                      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${editCustStatus === "INACTIVE" ? "bg-amber-500" : "bg-slate-300"
                        }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${editCustStatus === "INACTIVE" ? "left-[22px]" : "left-0.5"
                          }`}
                      />
                    </span>
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-6 py-2.5 bg-[#00285E] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#062047] transition-all"
                >
                  Lưu thay đổi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* CREATE CUSTOMER MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 pt-24 md:pt-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeCreateModal}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col"
            >
              <style>{adminPhoneStyles}</style>
              {/* Firebase reCAPTCHA (ẩn) — bắt buộc phải có node này để gửi được OTP */}
              <div id="admin-recaptcha-container" />

              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-slate-100 bg-[#00285E] relative">
                <button
                  onClick={closeCreateModal}
                  className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
                <h3 className="font-bold text-white text-2xl">Tạo Tài Khoản</h3>
                <p className="text-xs text-white/60 mt-1">
                  {createStep === "phone" && "Xác minh số điện thoại của khách hàng trước khi tạo tài khoản."}
                  {createStep === "otp" && "Nhập mã OTP vừa gửi về máy khách hàng."}
                  {createStep === "profile" && "Điền thông tin hồ sơ để hoàn tất tài khoản."}
                </p>

                {/* Chỉ báo 3 bước */}
                <div className="flex items-center gap-2 mt-4 text-[11px] font-bold">
                  {(["phone", "otp", "profile"] as const).map((s, idx) => {
                    const order = { phone: 0, otp: 1, profile: 2 };
                    const isDone = order[createStep] > idx;
                    const isActive = createStep === s;
                    return (
                      <div key={s} className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isActive
                            ? "bg-[#F9A11B] text-[#00285E]"
                            : isDone
                              ? "bg-white/25 text-white"
                              : "bg-white/10 text-white/40"
                            }`}
                        >
                          {isDone ? <CheckCircle size={13} /> : idx + 1}
                        </span>
                        <span className={isActive ? "text-white" : "text-white/40"}>
                          {s === "phone" && "Số điện thoại"}
                          {s === "otp" && "Xác minh OTP"}
                          {s === "profile" && "Hồ sơ"}
                        </span>
                        {idx < 2 && <span className="w-6 h-px bg-white/20 mx-1" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                {createStepError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold">
                    {createStepError}
                  </div>
                )}

                {/* ── BƯỚC 1: SỐ ĐIỆN THOẠI ── */}
                {createStep === "phone" && (
                  <>
                    <div className="flex flex-col items-center text-center gap-2 pb-5 border-b border-slate-100">
                      <div className="w-14 h-14 rounded-2xl bg-[#EDF3FF] flex items-center justify-center">
                        <Phone size={24} className="text-[#00285E]" />
                      </div>
                      <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
                        Hệ thống sẽ gửi mã OTP về số này. Khách hàng cần đọc lại mã cho bạn để hoàn tất xác minh.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Số điện thoại
                      </label>
                      <div className="admin-create-phone">
                        <PhoneInput
                          country="vn"
                          value={createCustPhone}
                          onChange={(val) => {
                            setCreateCustPhone(val);
                            setCreateStepError("");
                          }}
                          enableSearch
                          searchPlaceholder="Tìm quốc gia..."
                          inputProps={{ name: "phone" }}
                          countryCodeEditable={false}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 pt-0.5">
                        Ví dụ: 09xxxxxxxx hoặc +849xxxxxxxx
                      </p>
                    </div>
                  </>
                )}

                {/* ── BƯỚC 2: OTP ── */}
                {createStep === "otp" && (
                  <>
                    <div className="flex flex-col items-center text-center gap-2 pb-5 border-b border-slate-100">
                      <div className="w-14 h-14 rounded-2xl bg-[#EDF3FF] flex items-center justify-center">
                        <KeyRound size={24} className="text-[#00285E]" />
                      </div>
                      <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
                        Mã gồm 6 chữ số đã gửi tới{" "}
                        <span className="font-bold text-slate-700">{createCustPhone}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-2.5 flex-nowrap py-2">
                      {Array.from({ length: 6 }).map((_, index) => {
                        const digits = createOtpValue.replace(/\D/g, "").slice(0, 6).padEnd(6, "").split("");
                        return (
                          <input
                            key={index}
                            id={`admin-otp-${index}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            autoComplete={index === 0 ? "one-time-code" : "off"}
                            value={digits[index]?.trim() ?? ""}
                            onChange={(e) => {
                              const raw = (e.target.value || "").replace(/\D/g, "");
                              const next = [...digits];
                              if (raw.length > 1) {
                                for (let i = 0; i < raw.length && index + i < 6; i += 1) {
                                  next[index + i] = raw[i];
                                }
                                setCreateOtpValue(next.join("").trimEnd());
                                document.getElementById(`admin-otp-${Math.min(index + raw.length, 5)}`)?.focus();
                                return;
                              }
                              next[index] = raw.slice(-1) || " ";
                              setCreateOtpValue(next.join("").replace(/ /g, ""));
                              if (raw) document.getElementById(`admin-otp-${Math.min(index + 1, 5)}`)?.focus();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Backspace") {
                                e.preventDefault();
                                const next = [...digits];
                                if (next[index]?.trim()) {
                                  next[index] = " ";
                                  setCreateOtpValue(next.join("").replace(/ /g, ""));
                                  return;
                                }
                                const prev = Math.max(index - 1, 0);
                                next[prev] = " ";
                                setCreateOtpValue(next.join("").replace(/ /g, ""));
                                document.getElementById(`admin-otp-${prev}`)?.focus();
                              }
                            }}
                            className="bg-slate-50 border-2 border-slate-200 rounded-xl text-center text-lg font-bold text-[#00285E] outline-none transition-all focus:border-[#00285E] focus:ring-4 focus:ring-[#00285E]/10"
                            style={{ width: 52, height: 52, minWidth: 52, flex: "0 0 52px" }}
                          />
                        );
                      })}
                    </div>

                    <p className="text-center text-xs text-slate-500">
                      {createOtpCountdown > 0 ? (
                        <>
                          Gửi lại mã sau{" "}
                          <span className="font-bold text-[#00285E]">{createOtpCountdown}s</span>
                        </>
                      ) : (
                        <>
                          Không nhận được mã?{" "}
                          <button
                            type="button"
                            onClick={handleCreateResendOtp}
                            disabled={isCreateStepLoading}
                            className="font-bold text-[#00285E] hover:opacity-70 transition-opacity disabled:opacity-40"
                          >
                            Gửi lại OTP
                          </button>
                        </>
                      )}
                    </p>
                  </>
                )}

                {/* ── BƯỚC 3: HỒ SƠ ── */}
                {createStep === "profile" && (
                  <>
                    {/* Avatar */}
                    <div className="flex flex-col items-center gap-2.5 pb-5 border-b border-slate-100">
                      <div className="relative w-20 h-20 rounded-full overflow-hidden shadow-md border border-slate-200 bg-[#EDF3FF] flex items-center justify-center">
                        {createCustAvatar ? (
                          <img
                            src={createCustAvatar}
                            alt="Customer Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users size={36} className="text-[#00285E]/30" />
                        )}
                        {isUploadingAvatar && (
                          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
                            <Loader2 className="animate-spin text-white" size={18} />
                          </div>
                        )}
                      </div>
                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-all cursor-pointer">
                        <span>Chọn ảnh đại diện</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCustAvatarUpload}
                          disabled={isUploadingAvatar}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* SĐT đã xác minh */}
                    <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
                      <ShieldCheck size={17} className="shrink-0 text-emerald-600" />
                      <span className="text-xs font-semibold text-emerald-700">
                        Đã xác minh số {createCustPhone}
                      </span>
                    </div>

                    {/* Họ và tên */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Họ và tên
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                          <UserIcon size={17} />
                        </div>
                        <input
                          type="text"
                          value={createCustName}
                          onChange={(e) => setCreateCustName(e.target.value)}
                          placeholder="Nguyễn Văn A"
                          className="w-full py-3 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Mật khẩu + xác nhận */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                          Mật khẩu
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                            <Lock size={17} />
                          </div>
                          <input
                            type={showCreatePassword ? "text" : "password"}
                            value={createCustPassword}
                            onChange={(e) => setCreateCustPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full py-3 pl-12 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCreatePassword((v) => !v)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showCreatePassword ? <EyeOff size={17} /> : <EyeIcon size={17} />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                          Xác nhận mật khẩu
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                            <ShieldCheck size={17} />
                          </div>
                          <input
                            type={showCreateConfirmPassword ? "text" : "password"}
                            value={createCustConfirmPassword}
                            onChange={(e) => setCreateCustConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full py-3 pl-12 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCreateConfirmPassword((v) => !v)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showCreateConfirmPassword ? <EyeOff size={17} /> : <EyeIcon size={17} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                {createStep === "otp" ? (
                  <button
                    onClick={() => {
                      setCreateStep("phone");
                      setCreateStepError("");
                      setConfirmation(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft size={16} />
                    Đổi số
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={closeCreateModal}
                    className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Hủy
                  </button>

                  {createStep === "phone" && (
                    <button
                      onClick={handleCreateSendOtp}
                      disabled={isCreateStepLoading || !createCustPhone.trim()}
                      className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-[#F9A11B] text-[#00285E] rounded-xl text-sm font-bold shadow-md hover:bg-[#E08F12] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isCreateStepLoading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
                      Gửi mã OTP
                    </button>
                  )}

                  {createStep === "otp" && (
                    <button
                      onClick={handleCreateVerifyOtp}
                      disabled={isCreateStepLoading || createOtpValue.replace(/\D/g, "").length !== 6}
                      className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-[#F9A11B] text-[#00285E] rounded-xl text-sm font-bold shadow-md hover:bg-[#E08F12] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isCreateStepLoading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
                      Xác minh
                    </button>
                  )}

                  {createStep === "profile" && (
                    <button
                      onClick={handleSaveCreate}
                      className="px-6 py-2.5 bg-[#F9A11B] text-[#00285E] rounded-xl text-sm font-bold shadow-md hover:bg-[#E08F12] transition-all"
                    >
                      Tạo khách hàng
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
