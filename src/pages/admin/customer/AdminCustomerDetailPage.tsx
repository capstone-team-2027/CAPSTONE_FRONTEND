/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Users,
  Award,
  Calendar,
  ShieldAlert,
  Phone,
  Mail,
  Car,
  Clock,
  Wrench,
  Sparkles,
  Activity,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import type { CustomerData } from "../../../model/customerTypes";
import { TIER_CONFIG, STATUS_CONFIG } from "../../../model/customerTypes";
import { useFetchClient_v2 } from "../../../hook/useFetchClient";
import { CUSTOMER_API_ENDPOINTS } from "../../../constants/admin/customerApiEndpoint";

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1, y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
};

export default function AdminCustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchPrivate } = useFetchClient_v2();

  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "parts" | "behavior" | "chat">("profile");
  const [appointmentFilter, setAppointmentFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED" | "CANCELLED">("ALL");
  const [selectedAppModal, setSelectedAppModal] = useState<any>(null);

  useEffect(() => {
    const fetchCustomerDetail = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await fetchPrivate(CUSTOMER_API_ENDPOINTS.DETAIL(id));
        if (res.success && res.data) {
          const detail = res.data;

          const mappedVehicles = detail.vehicles?.map((v: any) => {
            const makeName = v.model?.make?.make_name || "Chưa rõ hãng";
            const modelName = v.model?.model_name || "Chưa rõ dòng xe";
            return {
              id: v.id,
              model: `${makeName} ${modelName}`,
              plateNumber: v.license_plate || "",
              color: v.color || "Không rõ",
              year: v.year || "N/A",
              mileage: v.avg_daily_mileage || 0
            };
          }) || [];

          const mappedAppointments = detail.appointments?.map((app: any) => ({
            id: app.id,
            date: app.scheduled_time ? new Date(app.scheduled_time) : new Date(),
            serviceName: app.booking_type.includes("WALK_IN") ? "Khách vãng lai" : "Đặt trước",
            totalAmount: 0,
            status: app.serviceOrder ? app.serviceOrder.status : app.status,
            category: app.booking_type.includes("WALK_IN") ? "Đến trực tiếp" : "Đặt lịch",
            notes: app.notes || "",
            cost: app.serviceOrder ? app.serviceOrder.total_price || 0 : 0,
            vehicle: app.vehicle ? { model: "Hồ sơ xe", plate: app.vehicle.license_plate || "Chưa rõ biển số" } : null,
            details: app.appointmentDetails?.map((d: any) => ({
              name: d.catalog?.service_name || d.combo?.combo_name || "Dịch vụ",
              description: d.catalog?.description || d.combo?.description || "Không có mô tả chi tiết",
              duration: d.catalog?.estimated_duration || 0,
              type: d.catalog ? "CATALOG" : "COMBO",
              subItems: d.combo?.catalogs?.map((c: any) => c.service_name) || []
            })) || []
          })) || [];

          // Sort appointments by date DESC
          mappedAppointments.sort((a: any, b: any) => b.date.getTime() - a.date.getTime());

          setCustomer({
            id: detail.id,
            fullName: detail.user?.fullName || detail.name || "Khách vãng lai",
            phoneNumber: detail.user?.phoneNumber || detail.phone || "",
            email: detail.user?.email || "",
            membership_tier: detail.membership_tier || "NONE",
            loyalty_points: detail.loyalty_points || 0,
            status: detail.user?.status === "INACTIVE" ? "INACTIVE" : detail.user?.status === "BANNED" ? "BANNED" : "ACTIVE",
            createdAt: detail.createdAt ? detail.createdAt.split("T")[0] : "",
            avatar: detail.user?.avatar || "https://ui-avatars.com/api/?name=" + encodeURIComponent(detail.user?.fullName || detail.name || "K") + "&background=0D8ABC&color=fff",
            type: detail.user ? "REGISTERED" : "GUEST",
            vehicles: mappedVehicles,
            appointments: mappedAppointments,
            prediction: { frequentViews: [], lastViewedDate: "", conversionProbability: 0, recommendedService: "", salesTip: "" },
            chatHistory: [],
            usedParts: []
          });
        } else {
          setError("Không tìm thấy thông tin khách hàng");
        }
      } catch (err) {
        console.error(err);
        setError("Có lỗi xảy ra khi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };
    fetchCustomerDetail();
  }, [id, fetchPrivate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen bg-slate-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 border-4 border-[#00285E]/20 border-t-[#00285E] rounded-full"
        />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-8 text-center min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">{error || "Khách hàng không tồn tại"}</h2>
        <p className="text-slate-500 mb-6">Dữ liệu có thể đã bị xóa hoặc không hợp lệ.</p>
        <button
          onClick={() => navigate("/admin/customers")}
          className="px-6 py-2.5 bg-white border border-slate-200 shadow-sm text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:text-[#00285E] flex items-center gap-2 transition-all"
        >
          <ArrowLeft size={18} /> Quay lại danh sách
        </button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-xs font-bold"><CheckCircle2 size={14} /> Hoàn thành</span>;
      case "PENDING":
      case "INSPECTING":
      case "IN_PROGRESS":
        return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100 text-xs font-bold"><Activity size={14} /> Đang xử lý</span>;
      case "CANCELLED":
        return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-xs font-bold"><XCircle size={14} /> Đã hủy</span>;
      default:
        return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-xs font-bold"><Clock size={14} /> {status}</span>;
    }
  };

  return (
    <div className="bg-[#F4F7FA] min-h-screen pb-12 font-sans relative">
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-[#00285E]/5 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-white/20 shadow-sm px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/admin/customers")}
              className="p-2.5 bg-white border border-slate-200 shadow-xs rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all group"
            >
              <ArrowLeft size={20} className="text-slate-500 group-hover:text-slate-800 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00285E] to-[#004080] flex items-center justify-center text-white shadow-md">
                <Users size={20} />
              </div>
              <div>
                <h1 className="font-bold text-xl text-slate-800 leading-tight">Chi tiết hồ sơ</h1>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-0.5">Mã KH: #{customer.id}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions can go here in the future */}
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-8 px-8 grid grid-cols-1 xl:grid-cols-12 gap-8 relative z-10">
        {/* Left Sidebar: Profile Summary */}
        <motion.div
          initial="hidden" animate="visible" variants={containerVariants}
          className="xl:col-span-4 space-y-6"
        >
          {/* Profile Card */}
          <motion.div variants={itemVariants} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden group">
            {/* Glassmorphic decorative circle */}
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-br from-blue-400/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col items-center text-center relative z-10">
              <div className="relative">
                <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-br from-slate-200 to-slate-100 shadow-sm">
                  <img
                    src={customer.avatar}
                    alt={customer.fullName}
                    className="w-full h-full rounded-full object-cover border-4 border-white"
                  />
                </div>
                <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full border-4 border-white bg-emerald-500 shadow-sm" />
              </div>

              <div className="mt-5">
                <h2 className="font-black text-2xl text-slate-800 tracking-tight">{customer.fullName}</h2>
                <div className="mt-3 flex justify-center">
                  <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm ${TIER_CONFIG[customer.membership_tier as keyof typeof TIER_CONFIG]?.bg || TIER_CONFIG['BRONZE'].bg} ${TIER_CONFIG[customer.membership_tier as keyof typeof TIER_CONFIG]?.color || TIER_CONFIG['BRONZE'].color} border ${TIER_CONFIG[customer.membership_tier as keyof typeof TIER_CONFIG]?.border || TIER_CONFIG['BRONZE'].border}`}>
                    <Award size={16} style={{ color: TIER_CONFIG[customer.membership_tier as keyof typeof TIER_CONFIG]?.iconColor || TIER_CONFIG['BRONZE'].iconColor }} />
                    Hạng {TIER_CONFIG[customer.membership_tier as keyof typeof TIER_CONFIG]?.label || TIER_CONFIG['BRONZE'].label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full pt-8 mt-8 border-t border-slate-100">
                <div className="text-center p-3 rounded-2xl bg-slate-50 border border-slate-100/50">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Điểm tích lũy</span>
                  <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500 block">{customer.loyalty_points}</span>
                </div>
                <div className="text-center p-3 rounded-2xl bg-slate-50 border border-slate-100/50">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Dịch vụ</span>
                  <span className="text-2xl font-black text-[#00285E] block">{customer.appointments.length}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact Info Card */}
          <motion.div variants={itemVariants} className="bg-white p-7 rounded-3xl border border-slate-200 shadow-xs space-y-5">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00285E]" />
              Thông tin liên hệ
            </h4>

            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className="w-12 h-12 shrink-0 rounded-2xl bg-blue-50/50 border border-blue-100/50 flex items-center justify-center text-blue-600">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Số điện thoại</p>
                  <p className="font-bold text-slate-700 text-sm">{customer.phoneNumber}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className="w-12 h-12 shrink-0 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 flex items-center justify-center text-indigo-600">
                  <Mail size={20} />
                </div>
                <div className="truncate">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email</p>
                  <p className="font-bold text-slate-700 text-sm truncate">{customer.email || "Không có email"}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className="w-12 h-12 shrink-0 rounded-2xl bg-emerald-50/50 border border-emerald-100/50 flex items-center justify-center text-emerald-600">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Ngày tham gia</p>
                  <p className="font-bold text-slate-700 text-sm">{new Date(customer.createdAt).toLocaleDateString("vi-VN")}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className="w-12 h-12 shrink-0 rounded-2xl bg-amber-50/50 border border-amber-100/50 flex items-center justify-center text-amber-600">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Trạng thái</p>
                  <span className={`font-black text-sm ${STATUS_CONFIG[customer.status as keyof typeof STATUS_CONFIG].text}`}>
                    {STATUS_CONFIG[customer.status as keyof typeof STATUS_CONFIG].label}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Right Content: Tabs and Details */}
        <div className="xl:col-span-8 flex flex-col space-y-6">
          {/* Tabs Nav */}
          <div className="flex bg-white/50 backdrop-blur-md rounded-2xl p-1.5 shadow-xs border border-slate-200/60 sticky top-[88px] z-20">
            {[{ id: "profile", label: "Hồ sơ & Xe", icon: Car },
            { id: "parts", label: "Linh kiện & BH", icon: Wrench },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex-1 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all overflow-hidden ${activeTab === tab.id ? "text-[#00285E]" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                  }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white shadow-sm rounded-xl border border-slate-200/50"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <tab.icon size={16} className={activeTab === tab.id ? "text-[#00285E]" : "opacity-70"} />
                  {tab.label}
                </span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl shadow-xs border border-slate-200 p-8 min-h-[500px]"
            >
              {activeTab === "profile" && (
                <div className="space-y-10">
                  {/* Vehicles Owned */}
                  <section>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-black text-lg text-slate-800 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Car size={18} />
                        </div>
                        Phương tiện sở hữu ({customer.vehicles.length})
                      </h3>
                    </div>

                    {customer.vehicles.length === 0 ? (
                      <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                        <Car className="mx-auto text-slate-300 mb-3" size={32} />
                        <p className="text-slate-500 font-medium">Khách hàng chưa đăng ký phương tiện nào.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {customer.vehicles.map((vehicle: any) => (
                          <motion.div
                            key={vehicle.id}
                            whileHover={{ y: -4, scale: 1.01 }}
                            className="group relative bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
                          >
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#00285E] to-blue-500" />
                            <div className="pl-2">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="font-black text-slate-800 text-lg uppercase tracking-wider">{vehicle.plateNumber}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="font-bold text-[#00285E] bg-blue-50 px-2 py-0.5 rounded-md text-sm">{vehicle.model}</span>
                                    <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-sm">{vehicle.year}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full border border-slate-300 shadow-xs" style={{ backgroundColor: vehicle.color !== "Không rõ" ? vehicle.color : "transparent" }} />
                                  <span className="text-sm font-semibold text-slate-600 capitalize">{vehicle.color}</span>
                                </div>
                                <div className="flex items-center gap-2 justify-end text-sm font-semibold text-slate-600">
                                  <Activity size={14} className="text-slate-400" />
                                  {vehicle.mileage.toLocaleString()} km
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Booking History */}
                  <section>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pt-2 border-t border-slate-100">
                      <h3 className="font-black text-lg text-slate-800 flex items-center gap-2.5 mt-8 md:mt-0">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
                          <History size={18} />
                        </div>
                        Lịch sử dịch vụ ({customer.appointments.length})
                      </h3>

                      {customer.appointments.length > 0 && (
                        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto hide-scrollbar">
                          {[
                            { id: "ALL", label: "Tất cả" },
                            { id: "ACTIVE", label: "Đang xử lý" },
                            { id: "COMPLETED", label: "Đã xong" },
                            { id: "CANCELLED", label: "Đã hủy" }
                          ].map(f => (
                            <button
                              key={f.id}
                              onClick={() => setAppointmentFilter(f.id as any)}
                              className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${appointmentFilter === f.id ? "bg-white text-[#00285E] shadow-sm" : "text-slate-500 hover:text-slate-700"
                                }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {customer.appointments.length === 0 ? (
                      <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                        <Clock className="mx-auto text-slate-300 mb-3" size={32} />
                        <p className="text-slate-500 font-medium">Khách hàng chưa có lịch sử đặt hẹn.</p>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {[
                          { id: "ACTIVE", title: "Đang xử lý", icon: <Activity size={16} />, color: "text-amber-600", bg: "bg-amber-50", items: customer.appointments.filter((a: any) => !["COMPLETED", "CANCELLED"].includes(a.status)) },
                          { id: "COMPLETED", title: "Đã hoàn thành", icon: <CheckCircle2 size={16} />, color: "text-emerald-600", bg: "bg-emerald-50", items: customer.appointments.filter((a: any) => a.status === "COMPLETED") },
                          { id: "CANCELLED", title: "Đã hủy", icon: <XCircle size={16} />, color: "text-rose-600", bg: "bg-rose-50", items: customer.appointments.filter((a: any) => a.status === "CANCELLED") }
                        ]
                          .filter(group => appointmentFilter === "ALL" || appointmentFilter === group.id)
                          .map((group, groupIdx) => group.items.length > 0 && (
                            <div key={groupIdx} className="space-y-4">
                              <h4 className={`font-black text-sm flex items-center gap-2 uppercase tracking-wider ${group.color}`}>
                                <span className={`p-1.5 rounded-lg ${group.bg}`}>{group.icon}</span>
                                {group.title} ({group.items.length})
                              </h4>

                              <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-200 before:via-slate-200 before:to-transparent">
                                {group.items.map((app: any) => (
                                  <div key={app.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group/item is-active">
                                    <div className="flex items-center justify-center w-6 h-6 rounded-full border-4 border-white bg-slate-200 group-hover/item:bg-[#00285E] group-hover/item:scale-125 text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm transition-all z-10" />

                                    <motion.div
                                      whileHover={{ y: -2 }}
                                      onClick={() => setSelectedAppModal(app)}
                                      className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all ml-4 md:ml-0 cursor-pointer"
                                    >
                                      <div className="flex justify-between items-center mb-3">
                                        <span className="font-black text-slate-800 text-sm">{app.category}</span>
                                        {getStatusBadge(app.status)}
                                      </div>

                                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 mb-3">
                                        <Calendar size={14} className="text-slate-400" />
                                        {app.date.toLocaleDateString("vi-VN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                      </div>

                                      {app.notes && (
                                        <p className="text-sm text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium leading-relaxed truncate">
                                          "{app.notes}"
                                        </p>
                                      )}

                                      {app.cost > 0 && (
                                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                                          <span className="text-[#00285E] text-base font-black bg-blue-50 px-3 py-1 rounded-lg">
                                            {app.cost.toLocaleString("vi-VN")} đ
                                          </span>
                                        </div>
                                      )}
                                    </motion.div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {activeTab === "parts" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <h3 className="font-black text-lg text-slate-800 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                        <Wrench size={18} />
                      </div>
                      Lịch sử bảo hành phụ tùng
                    </h3>
                  </div>
                  <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                    <Wrench className="mx-auto text-slate-300 mb-3" size={32} />
                    <p className="text-slate-500 font-medium">Chưa có dữ liệu bảo hành linh kiện.</p>
                  </div>
                </div>
              )}

              {activeTab === "behavior" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <h3 className="font-black text-lg text-slate-800 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Sparkles size={18} />
                      </div>
                      Phân tích hành vi AI
                    </h3>
                  </div>
                  <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <Sparkles className="mx-auto text-purple-300 mb-3" size={32} />
                    </motion.div>
                    <p className="text-slate-500 font-medium">Hệ thống AI đang thu thập và phân tích dữ liệu hành vi...</p>
                  </div>
                </div>
              )}

              {activeTab === "chat" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <h3 className="font-black text-lg text-slate-800 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                        <History size={18} />
                      </div>
                      Lịch sử tương tác
                    </h3>
                  </div>
                  <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                    <History className="mx-auto text-slate-300 mb-3" size={32} />
                    <p className="text-slate-500 font-medium">Chưa có lịch sử tin nhắn hoặc tương tác trên hệ thống.</p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Appointment Modal */}
      <AnimatePresence>
        {selectedAppModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAppModal(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#00285E] text-white flex items-center justify-center">
                    <History size={16} />
                  </div>
                  Chi tiết Lịch hẹn
                </h3>
                <button onClick={() => setSelectedAppModal(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                  <XCircle size={24} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                <div className="flex flex-wrap gap-4 items-center justify-between pb-6 border-b border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Thời gian</p>
                    <p className="font-bold text-slate-700 flex items-center gap-2">
                      <Calendar size={16} className="text-[#00285E]" />
                      {selectedAppModal.date.toLocaleDateString("vi-VN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Trạng thái</p>
                    {getStatusBadge(selectedAppModal.status)}
                  </div>
                </div>

                {selectedAppModal.vehicle && (
                  <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Car size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-blue-900 mb-1">Thông tin xe tiếp nhận</h4>
                      <p className="font-semibold text-blue-700">Biển số: {selectedAppModal.vehicle.plate}</p>
                      <p className="text-sm text-blue-600/80">Mẫu xe: {selectedAppModal.vehicle.model}</p>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                    <Wrench size={18} className="text-slate-400" />
                    Dịch vụ yêu cầu ({selectedAppModal.details?.length || 0})
                  </h4>
                  {selectedAppModal.details && selectedAppModal.details.length > 0 ? (
                    <div className="space-y-3">
                      {selectedAppModal.details.map((item: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col gap-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${item.type === "COMBO" ? "bg-amber-100 text-amber-700" : "bg-teal-100 text-teal-700"}`}>
                                  {item.type}
                                </span>
                                <p className="font-bold text-slate-700">{item.name}</p>
                              </div>
                              <p className="text-sm text-slate-500 line-clamp-2">{item.description}</p>
                            </div>
                            {item.duration > 0 && (
                              <div className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg">
                                <Clock size={14} />
                                ~{item.duration} phút
                              </div>
                            )}
                          </div>

                          {item.type === "COMBO" && item.subItems && item.subItems.length > 0 && (
                            <div className="mt-2 pt-3 border-t border-slate-100">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Các dịch vụ trong gói:</p>
                              <ul className="space-y-1.5 pl-1">
                                {item.subItems.map((sub: string, subIdx: number) => (
                                  <li key={subIdx} className="flex items-start gap-2 text-sm font-medium text-slate-600 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-amber-400 before:mt-1.5">
                                    {sub}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">Không có dịch vụ cụ thể nào được liệt kê.</p>
                  )}
                </div>

                {selectedAppModal.notes && (
                  <div>
                    <h4 className="font-black text-slate-800 mb-3 text-sm">Ghi chú của khách hàng</h4>
                    <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 font-medium leading-relaxed">
                      "{selectedAppModal.notes}"
                    </p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button onClick={() => setSelectedAppModal(null)} className="px-6 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors">
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
