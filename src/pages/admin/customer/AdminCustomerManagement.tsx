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
  Wrench
} from "lucide-react";
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
  const { fetchPrivate } = useFetchClient_v2();

  // Primary State
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [tierFilter, setTierFilter] = useState<string>("ALL");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<"ALL" | "REGISTERED" | "GUEST">("ALL");

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
            avatar: c.user?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
            type: "REGISTERED" as CustomerType,
            vehicles: [],
            appointments: [],
            prediction: { frequentViews: [], lastViewedDate: "", conversionProbability: 0, recommendedService: "", salesTip: "" },
            chatHistory: [],
            usedParts: []
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
            avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
            type: "GUEST" as CustomerType,
            vehicles: [],
            appointments: [],
            prediction: { frequentViews: [], lastViewedDate: "", conversionProbability: 0, recommendedService: "", salesTip: "" },
            chatHistory: [],
            usedParts: []
          }));
          setCustomers([...mappedRegistered, ...mappedGuest]);
        }
      } catch (error) {
        showToast("Lỗi khi tải danh sách khách hàng", "warning");
      }
    };
    fetchCustomers();
  }, [fetchPrivate, showToast]);

  // Selection & Modal State
  const navigate = useNavigate();
  const [editingCustomer, setEditingCustomer] = useState<CustomerData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
    return customers.filter(c => {
      const matchesSearch =
        c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phoneNumber.includes(searchTerm) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
      const matchesTier = tierFilter === "ALL" || c.membership_tier === tierFilter;
      const matchesType = customerTypeFilter === "ALL" || c.type === customerTypeFilter;

      return matchesSearch && matchesStatus && matchesTier && matchesType;
    });
  }, [customers, searchTerm, statusFilter, tierFilter, customerTypeFilter]);

  // Actions
  const handleOpenEdit = (customer: CustomerData) => {
    setEditingCustomer(customer);
    setEditCustName(customer.fullName);
    setEditCustPhone(customer.phoneNumber);
    setEditCustEmail(customer.email);
    setEditCustTier(customer.membership_tier);
    setEditCustPoints(customer.loyalty_points);
    setEditCustStatus(customer.status);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editCustName.trim() || !editCustPhone.trim()) {
      showToast("Vui lòng điền đầy đủ Tên và Số điện thoại", "warning");
      return;
    }

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
            status: editCustStatus
          }
          : c
      )
    );


    setIsEditModalOpen(false);
    setEditingCustomer(null);
    showToast("Cập nhật thông tin khách hàng thành công", "success");
  };

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
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">
            Quản lý Khách Hàng
          </h1>
          <p className="text-slate-500 text-sm">
            Xem hồ sơ, lịch sử dịch vụ, hạng thành viên và thống kê toàn bộ khách hàng.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download size={16} />
            <span>Xuất báo cáo</span>
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
          <div className="w-12 h-12 rounded-xl bg-[#EDF3FF] flex items-center justify-center text-[#00285E] shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              Tổng doanh thu dịch vụ
            </span>
            <span className="text-lg font-black text-[#00285E] tracking-tight block mt-1">
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

      {/* MEMBERSHIP TIERS BAR CHART SUMMARY */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Award className="text-[#F9A11B]" size={18} />
            Phân bố hạng thành viên
          </h3>
          <span className="text-xs text-slate-400 font-semibold">Tự động tính từ điểm tích lũy</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {(Object.keys(TIER_CONFIG) as MembershipTier[]).map(tier => {
            const count = statistics.tiersBreakdown[tier];
            const pct = statistics.total > 0 ? Math.round((count / statistics.total) * 100) : 0;
            const config = TIER_CONFIG[tier];
            return (
              <div key={tier} className={`p-4 rounded-xl border ${config.border} ${config.bg} flex flex-col justify-between h-24`}>
                <span className={`text-xs font-bold ${config.color} uppercase tracking-wider`}>{config.label}</span>
                <div className="flex items-baseline justify-between mt-auto">
                  <span className="text-2xl font-black text-slate-800">{count}</span>
                  <span className="text-xs font-bold text-slate-500">{pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200/60 rounded-full overflow-hidden mt-2">
                  <div className={`h-full rounded-full`} style={{ width: `${pct}%`, backgroundColor: config.iconColor }} />
                </div>
              </div>
            );
          })}
        </div>
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

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loại khách:</span>
              <select
                value={customerTypeFilter}
                onChange={(e) => setCustomerTypeFilter(e.target.value as any)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10"
              >
                <option value="ALL">Tất cả</option>
                <option value="REGISTERED">Khách hệ thống</option>
                <option value="GUEST">Khách vãng lai</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trạng thái:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10"
              >
                <option value="ALL">Tất cả</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Tạm khóa</option>
                <option value="BANNED">Bị cấm</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hạng:</span>
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10"
              >
                <option value="ALL">Tất cả</option>
                <option value="BRONZE">Đồng</option>
                <option value="SILVER">Bạc</option>
                <option value="GOLD">Vàng</option>
                <option value="PLATINUM">Bạch Kim</option>
                <option value="NONE">Không hạng</option>
              </select>
            </div>
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
                filteredCustomers.map(customer => {
                  const tier = TIER_CONFIG[customer.membership_tier];
                  const statusInfo = STATUS_CONFIG[customer.status];
                  return (
                    <tr
                      key={customer.id}
                      onClick={() => handleCustomerClick(customer)}
                      className="border-b border-slate-100 hover:bg-slate-50/70 transition-all cursor-pointer group"
                    >
                      <td className="py-4 px-6 flex items-center gap-3">
                        <img
                          src={customer.avatar}
                          alt={customer.fullName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200/80"
                        />
                        <div>
                          <span className="font-bold text-[#00285E] text-sm block group-hover:text-blue-600 transition-colors">
                            {customer.fullName}
                            {customer.type === "REGISTERED" ? (
                              <span className="ml-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">Hệ thống</span>
                            ) : (
                              <span className="ml-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">Vãng lai</span>
                            )}
                          </span>
                          <span className="text-xs text-slate-400 font-medium block mt-0.5">
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
      </div>

      {/* EDIT CUSTOMER MODAL */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
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
              <div className="p-6 space-y-4">
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

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Email</label>
                  <input
                    type="email"
                    value={editCustEmail}
                    onChange={(e) => setEditCustEmail(e.target.value)}
                    placeholder="customer@gmail.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
                  />
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
    </div>
  );
}
