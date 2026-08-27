import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
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
  Loader2
} from "lucide-react";
import RescueTrackingModal from "../../../components/share/RescueTrackingModal";
import { useSocket } from "../../../hook/useSocket";

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

export default function AdminCustomerManagement() {
  const { showToast } = useOutletContext<{
    searchQuery: string;
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();
  const { fetchPrivate, fetchPrivateForm } = useFetchClient_v2();
  const socket = useSocket();

  // Primary State
  const [customers, setCustomers] = useState<(CustomerData & { rescueRequests?: any[] })[]>([]);
  const [trackingData, setTrackingData] = useState<{ rescue: any; customerName: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [tierFilter, setTierFilter] = useState<string>("ALL");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<"ALL" | "REGISTERED" | "GUEST">("ALL");
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
          const mappedGuest = response.data.guestCustomers.map((c: any) => ({
            id: c.id,
            fullName: c.name || "Khách vãng lai",
            phoneNumber: c.phone || "",
            email: "",
            membership_tier: "NONE" as MembershipTier,
            loyalty_points: 0,
            status: "ACTIVE",
            createdAt: c.createdAt ? c.createdAt.split("T")[0] : "",
            avatar: "",
            type: "GUEST" as CustomerType,
            vehicles: [],
            appointments: [],
            prediction: { frequentViews: [], lastViewedDate: "", conversionProbability: 0, recommendedService: "", salesTip: "" },
            chatHistory: [],
            usedParts: [],
            rescueRequests: c.rescueRequests || []
          }));
          setCustomers([...mappedRegistered, ...mappedGuest]);
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
  const navigate = useNavigate();
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
    setIsCreateModalOpen(true);
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
          avatar: createCustAvatar || null
        }
      );
      if (response) {
        showToast("Tạo khách hàng mới thành công", "success");
        setIsCreateModalOpen(false);
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
    const banned = customers.filter(c => c.status === "BANNED").length;

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

    return { total, active, banned, avgPoints, totalSpendVal, tiersBreakdown };
  }, [customers]);

  // Filtering Logic
  const filteredCustomers = useMemo(() => {
    const list = customers.filter(c => {
      const matchesSearch =
        c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phoneNumber.includes(searchTerm) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
      const matchesTier = tierFilter === "ALL" || c.membership_tier === tierFilter;
      const matchesType = customerTypeFilter === "ALL" || c.type === customerTypeFilter;

      return matchesSearch && matchesStatus && matchesTier && matchesType;
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
  }, [customers, searchTerm, statusFilter, tierFilter, customerTypeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredCustomers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Actions
  const handleOpenEdit = (customer: CustomerData) => {
    setEditingCustomer(customer);
    setEditCustName(customer.fullName);
    setEditCustPhone(customer.phoneNumber);
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
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2">
            Quản lý Khách Hàng
          </h1>
          <p className="text-slate-500 text-sm">
            Xem hồ sơ, lịch sử dịch vụ, hạng thành viên và thống kê toàn bộ khách hàng.
          </p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
              Tổng số khách hàng
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
              Khách hàng hoạt động
            </span>
            <span className="text-2xl font-black text-slate-900 tracking-tight block mt-0.5">
              {statistics.active}
            </span>
          </div>
        </motion.div>

        {/* KPI CARD: TOTAL SPEND */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              Tổng doanh thu dịch vụ
            </span>
            <span className="text-lg font-black text-slate-900 tracking-tight block mt-1">
              {statistics.totalSpendVal.toLocaleString("vi-VN")} đ
            </span>
          </div>
        </motion.div>

        {/* KPI CARD: AVG LOYALTY POINTS */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
            <Coins size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              Điểm tích lũy TB
            </span>
            <span className="text-2xl font-black text-slate-900 tracking-tight block mt-0.5">
              {statistics.avgPoints} pts
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
              value={customerTypeFilter}
              onChange={(e) => setCustomerTypeFilter(e.target.value as any)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10"
            >
              <option value="ALL">Loại khách: Tất cả</option>
              <option value="REGISTERED">Khách hệ thống</option>
              <option value="GUEST">Khách vãng lai</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10"
            >
              <option value="ALL">Trạng thái: Tất cả</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="INACTIVE">Tạm khóa</option>
              <option value="BANNED">Bị cấm</option>
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
                            {customer.type === "REGISTERED" ? (
                              <span className="shrink-0 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">Hệ thống</span>
                            ) : (
                              <span className="shrink-0 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">Vãng lai</span>
                            )}
                          </span>
                          <span className="text-xs text-slate-400 font-medium block mt-0.5 truncate">
                            {customer.email}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-600 text-sm font-semibold">
                        {customer.phoneNumber}
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
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Chỉnh sửa thông tin</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Thay đổi thông tin hạng, điểm và trạng thái khách hàng</p>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-2.5 pb-4 border-b border-slate-100">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Họ và tên</label>
                    <input
                      type="text"
                      value={editCustName}
                      onChange={(e) => setEditCustName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Số điện thoại</label>
                    <input
                      type="text"
                      value={editCustPhone}
                      onChange={(e) => setEditCustPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="0901234567"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Hạng thành viên</label>
                    <select
                      value={editCustTier}
                      onChange={(e) => setEditCustTier(e.target.value as MembershipTier)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-bold text-slate-800"
                    >
                      <option value="BRONZE">Đồng (Bronze)</option>
                      <option value="SILVER">Bạc (Silver)</option>
                      <option value="GOLD">Vàng (Gold)</option>
                      <option value="PLATINUM">Bạch Kim (Platinum)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Điểm tích lũy</label>
                    <input
                      type="number"
                      value={editCustPoints}
                      onChange={(e) => setEditCustPoints(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Trạng thái tài khoản</label>
                  <select
                    value={editCustStatus}
                    onChange={(e) => setEditCustStatus(e.target.value as CustomerStatus)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-bold text-slate-800"
                  >
                    <option value="ACTIVE">Hoạt động (Active)</option>
                    <option value="INACTIVE">Tạm khóa (Inactive)</option>
                    <option value="BANNED">Bị khóa vĩnh viễn (Banned)</option>
                  </select>
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
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Tạo khách hàng mới</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Thêm thông tin khách hàng mới vào hệ thống</p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-2.5 pb-4 border-b border-slate-100">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Họ và tên</label>
                    <input
                      type="text"
                      value={createCustName}
                      onChange={(e) => setCreateCustName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Số điện thoại</label>
                    <input
                      type="text"
                      value={createCustPhone}
                      onChange={(e) => setCreateCustPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="0901234567"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Mật khẩu</label>
                    <input
                      type="password"
                      value={createCustPassword}
                      onChange={(e) => setCreateCustPassword(e.target.value)}
                      placeholder="Mật khẩu tài khoản"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Xác nhận mật khẩu</label>
                    <input
                      type="password"
                      value={createCustConfirmPassword}
                      onChange={(e) => setCreateCustConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveCreate}
                  className="px-6 py-2.5 bg-[#F9A11B] text-[#00285E] rounded-xl text-sm font-bold shadow-md hover:bg-[#E08F12] transition-all"
                >
                  Tạo khách hàng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
