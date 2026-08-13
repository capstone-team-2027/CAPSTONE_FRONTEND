import { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  CalendarCheck,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  CarFront,
  FileText,
  StickyNote,
} from 'lucide-react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { useFetchClient_v2 } from '../../hook/useFetchClient';
import { useSocket } from '../../hook/useSocket';
import { TECHNICIAN_LEADER_TASK_ENDPOINTS } from '../../constants/technicianLeader/taskManagementEndpoint';


interface AppointmentModel {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleModel: string;
  vehicleYear?: number;
  vehicleColor?: string;
  vinNumber?: string;
  hasServiceOrder: boolean;
  serviceOrderId: number | null;
  serviceOrderStatus: string | null;
  bayStatus: string | null;
  services: string[];
  serviceDetails: Array<{
    type: 'catalog' | 'combo';
    name: string;
    includedCatalogs: string[];
  }>;
  appointmentDate: string;
  appointmentTime: string;
  notes: string;
  status: string;
  bookingType: string;
  priorityType: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  // Chưa tạo lệnh sửa chữa — trạng thái từ Appointment.status
  information_received: { label: 'Đợi tạo lệnh', color: '#D97706', bg: '#FEF3C7', icon: Clock },
  // Đã tạo lệnh sửa chữa — trạng thái từ Service_Order.status
  inspecting: { label: 'Đã tiếp nhận', color: '#6B7280', bg: '#F3F4F6', icon: Clock },
  assigned: { label: 'Đã phân công', color: '#6366F1', bg: '#EEF2FF', icon: Users },
  in_progress: { label: 'Đang sửa chữa', color: '#2563EB', bg: '#DBEAFE', icon: Loader2 },
  pending_quotation: { label: 'Chờ báo giá', color: '#D97706', bg: '#FEF3C7', icon: Clock },
  waiting_for_parts: { label: 'Chờ phụ tùng', color: '#D97706', bg: '#FEF3C7', icon: Clock },
  waiting_approval: { label: 'Chờ khách duyệt', color: '#EC4899', bg: '#FDF2F8', icon: Clock },
  qc_checking: { label: 'Đang QC', color: '#8B5CF6', bg: '#F5F3FF', icon: Clock },
  completed: { label: 'Hoàn thành', color: '#059669', bg: '#D1FAE5', icon: CheckCircle2 },
  cancelled: { label: 'Đã huỷ lệnh', color: '#EF4444', bg: '#FEF2F2', icon: XCircle },
};

const TABS = {
  all: 'Tất cả',
  uncreated: 'Đợi tạo lệnh',
  waiting: 'Chờ cầu nâng',
  received: 'Đã tiếp nhận',
  in_progress: 'Đang sửa chữa',
  completed: 'Hoàn thành',
  cancelled: 'Đã huỷ',
};

const ITEMS_PER_PAGE = 6;

export default function LeaderAppointmentList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  }>();

  const { fetchPrivate } = useFetchClient_v2();
  const socket = useSocket();
  const [appointments, setAppointments] = useState<AppointmentModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const initialTab = (location.state as { activeTab?: string } | null)?.activeTab;
  const [statusFilter, setStatusFilter] = useState<'all' | 'uncreated' | 'waiting' | 'received' | 'in_progress' | 'completed' | 'cancelled'>(
    (initialTab as any) || 'uncreated'
  );
  const [currentPage, setCurrentPage] = useState(1);
  // Modal State
  const [selectedAppt, setSelectedAppt] = useState<AppointmentModel | null>(null);

  const loadAppointments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetchPrivate(TECHNICIAN_LEADER_TASK_ENDPOINTS.GET_RECEIVED_APPOINTMENTS);

      if (response.success && Array.isArray(response.data)) {
        const mapped: AppointmentModel[] = response.data.map((appt: any) => {
          const services: string[] = [];
          const serviceDetails: AppointmentModel['serviceDetails'] = [];
          if (Array.isArray(appt.appointmentDetails)) {
            appt.appointmentDetails.forEach((detail: any) => {
              if (detail.catalog?.service_name) {
                services.push(detail.catalog.service_name);
                serviceDetails.push({
                  type: 'catalog',
                  name: detail.catalog.service_name,
                  includedCatalogs: [],
                });
              }
              if (detail.combo?.combo_name) {
                services.push(detail.combo.combo_name);
                serviceDetails.push({
                  type: 'combo',
                  name: detail.combo.combo_name,
                  includedCatalogs: Array.isArray(detail.combo.catalogs)
                    ? detail.combo.catalogs
                        .map((catalog: any) => catalog.service_name)
                        .filter(Boolean)
                    : [],
                });
              }
            });
          }

          if (services.length === 0 && appt.booking_type && appt.booking_type.includes('REPAIR')) {
            services.push('Kiểm tra');
            serviceDetails.push({ type: 'catalog', name: 'Kiểm tra', includedCatalogs: [] });
          }

          let appointmentDate = '';
          let appointmentTime = '';
          const targetTime = appt.scheduled_time || appt.createdAt || appt.created_at;
          if (targetTime) {
            const dateObj = new Date(targetTime);
            appointmentDate = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');
            appointmentTime = String(dateObj.getHours()).padStart(2, '0') + ':' + String(dateObj.getMinutes()).padStart(2, '0');
          }

          return {
            id: String(appt.id),
            customerId: appt.customer?.id ? String(appt.customer.id) : '',
            customerName: appt.customer?.user?.fullName || appt.customer?.name || 'Khách vãng lai',
            customerPhone: appt.customer?.user?.phoneNumber || appt.customer?.phone || '',
            customerEmail: appt.customer?.user?.email || undefined,
            vehicleId: appt.vehicle?.id ? String(appt.vehicle.id) : '',
            vehiclePlate: appt.vehicle?.license_plate || 'Chưa cập nhật',
            vehicleModel: appt.vehicle?.model
              ? `${appt.vehicle.model.make?.make_name || ''} ${appt.vehicle.model.model_name || ''}`.trim()
              : 'Chưa cập nhật',
            vehicleYear: appt.vehicle?.year || undefined,
            vehicleColor: appt.vehicle?.color || undefined,
            vinNumber: appt.vehicle?.vin_number || undefined,
            hasServiceOrder: !!appt.serviceOrder,
            serviceOrderId: appt.serviceOrder?.id || null,
            serviceOrderStatus: appt.serviceOrder?.status || null,
            bayStatus: appt.serviceOrder?.bay_status || null,
            services,
            serviceDetails,
            appointmentDate,
            appointmentTime,
            notes: appt.notes || '',
            status: appt.status || 'INFORMATION_RECEIVED',
            bookingType: appt.booking_type || '',
            priorityType: appt.priority_type || 'NORMAL',
            createdAt: appt.createdAt || appt.created_at || '',
          };
        });

        // Ưu tiên ca khẩn cấp, sau đó xếp thời điểm đến/hẹn sớm nhất lên trước.
        const sorted = mapped.sort((a: any, b: any) => {
          const aIsEmergency = a.priorityType === 'EMERGENCY';
          const bIsEmergency = b.priorityType === 'EMERGENCY';
          if (aIsEmergency !== bIsEmergency) {
            return aIsEmergency ? -1 : 1;
          }

          const timeA = a.appointmentDate && a.appointmentTime
            ? `${a.appointmentDate}T${a.appointmentTime}`
            : a.createdAt;
          const timeB = b.appointmentDate && b.appointmentTime
            ? `${b.appointmentDate}T${b.appointmentTime}`
            : b.createdAt;
          const difference = new Date(timeA).getTime() - new Date(timeB).getTime();

          return difference || Number(a.id) - Number(b.id);
        });

        setAppointments(sorted);
      } else {
        throw new Error(response.message || 'Lỗi tải danh sách lịch hẹn');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  // Realtime notification support for auto-reloading lists
  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = () => {
      loadAppointments();
    };
    socket.on('new_notification', handleNewNotification);
    socket.on('customer_received', handleNewNotification);
    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('customer_received', handleNewNotification);
    };
  }, [socket]);

  // Filtered data
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const formattedId = `APT-${apt.id.padStart(3, '0')}`;
      const matchSearch = (
        searchTerm === '' ||
        apt.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.customerPhone.includes(searchTerm) ||
        apt.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formattedId.toLowerCase().includes(searchTerm.toLowerCase())
      );

      let matchStatus = false;
      const statusLower = apt.status.toLowerCase();
      const orderStatusUpper = apt.serviceOrderStatus?.toUpperCase();
      const isWaitingForBay = apt.hasServiceOrder && apt.bayStatus?.toUpperCase() === 'WAITING';
      if (statusFilter === 'all') {
        matchStatus = true;
      } else if (statusFilter === 'uncreated') {
        matchStatus = statusLower === 'information_received';
      } else if (statusFilter === 'waiting') {
        matchStatus = isWaitingForBay;
      } else if (statusFilter === 'received') {
        matchStatus = apt.hasServiceOrder && orderStatusUpper === 'INSPECTING' && !isWaitingForBay;
      } else if (statusFilter === 'in_progress') {
        matchStatus = apt.hasServiceOrder && orderStatusUpper !== 'COMPLETED' && orderStatusUpper !== 'CANCELLED' && orderStatusUpper !== 'INSPECTING' && !isWaitingForBay;
      } else if (statusFilter === 'completed') {
        matchStatus = orderStatusUpper === 'COMPLETED';
      } else if (statusFilter === 'cancelled') {
        matchStatus = orderStatusUpper === 'CANCELLED';
      }

      return matchSearch && matchStatus;
    });
  }, [appointments, searchTerm, statusFilter]);

  const tabCounts = useMemo(() => {
    return {
      all: appointments.length,
      uncreated: appointments.filter((a) => {
        const s = a.status.toLowerCase();
        return s === 'information_received';
      }).length,
      waiting: appointments.filter((a) => a.hasServiceOrder && a.bayStatus?.toUpperCase() === 'WAITING').length,
      received: appointments.filter((a) => {
        const orderStatusUpper = a.serviceOrderStatus?.toUpperCase();
        return a.hasServiceOrder && orderStatusUpper === 'INSPECTING' && a.bayStatus?.toUpperCase() !== 'WAITING';
      }).length,
      in_progress: appointments.filter((a) => {
        const orderStatusUpper = a.serviceOrderStatus?.toUpperCase();
        return a.hasServiceOrder && orderStatusUpper !== 'COMPLETED' && orderStatusUpper !== 'CANCELLED' && orderStatusUpper !== 'INSPECTING' && a.bayStatus?.toUpperCase() !== 'WAITING';
      }).length,
      completed: appointments.filter((a) => a.serviceOrderStatus?.toUpperCase() === 'COMPLETED').length,
      cancelled: appointments.filter((a) => a.serviceOrderStatus?.toUpperCase() === 'CANCELLED').length,
    };
  }, [appointments]);

  // Pagination
  const totalPages = Math.ceil(filteredAppointments.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAppointments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAppointments, currentPage]);

  // KPI counts
  const kpiCounts = useMemo(() => {
    const total = appointments.length;
    const withOrder = appointments.filter((a) => a.hasServiceOrder).length;
    const withoutOrder = total - withOrder;
    return { total, withOrder, withoutOrder };
  }, [appointments]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Đã tạo lệnh sửa chữa (Service Order) thì phải hiển thị đúng tiến độ sửa chữa thật
  // (Service_Order.status) — Appointment.status chỉ phản ánh bước tiếp nhận lịch hẹn, không
  // bao giờ được cập nhật thành IN_PROGRESS trong suốt vòng đời sửa chữa nên không thể dùng
  // để hiển thị "Đang sửa chữa"/"Hoàn thành".
  const getDisplayStatus = (apt: AppointmentModel) => {
    const isWaitingForBay = apt.hasServiceOrder && apt.bayStatus?.toUpperCase() === 'WAITING';
    const statusKey = apt.hasServiceOrder
      ? (apt.serviceOrderStatus || 'INSPECTING').toLowerCase()
      : apt.status.toLowerCase();
    const config = isWaitingForBay ? {
      label: 'Đang chờ cầu nâng',
      color: '#D97706',
      bg: '#FEF3C7',
      icon: Clock,
    } : STATUS_CONFIG[statusKey] || {
      label: apt.hasServiceOrder ? (apt.serviceOrderStatus || apt.status) : apt.status,
      color: '#EA580C',
      bg: '#FED7AA',
      icon: CheckCircle2,
    };
    return { config, statusKey, isWaitingForBay };
  };

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 space-y-4 p-3 sm:p-4 lg:space-y-6 lg:p-6 xl:p-8">
      {/* HEADER */}
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
              Lịch hẹn đã tiếp nhận
            </h1>
            <p className="text-slate-500 text-sm">
              Danh sách xe đã tiếp nhận tại xưởng đang đợi tạo lệnh hoặc bàn giao công việc sửa chữa.
            </p>
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Tổng xe đã tiếp nhận', value: kpiCounts.total, icon: <CalendarCheck size={22} />, color: '#00285E', bg: '#EFF6FF' },
          { label: 'Đã lập lệnh dịch vụ', value: kpiCounts.withOrder, icon: <CheckCircle2 size={22} />, color: '#059669', bg: '#D1FAE5' },
          { label: 'Chờ lập lệnh/phân công', value: kpiCounts.withoutOrder, icon: <Clock size={22} />, color: '#D97706', bg: '#FEF3C7' },
        ].map((card, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{card.label}</span>
                <span className="text-2xl font-bold text-slate-900 tracking-tight block">{card.value}</span>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.bg, color: card.color }}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="space-y-4 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-xs sm:p-5">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên khách, SĐT, biển số xe, mã lịch hẹn..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
          />
        </div>

        {/* TABS */}
        <div className="flex overflow-x-auto border-b border-slate-100/80 scrollbar-none">
          {Object.entries(TABS).map(([key, label]) => {
            const count = tabCounts[key as keyof typeof tabCounts] ?? 0;
            const isActive = statusFilter === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setStatusFilter(key as any);
                  setCurrentPage(1);
                }}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 -mb-[1px] transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'border-[#00285E] text-[#00285E]'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <span>{label}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  isActive ? 'bg-[#00285E] text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* APPOINTMENT TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#00285E]">
            <Loader2 className="animate-spin mb-4" size={48} />
            <p className="text-sm font-semibold">Đang tải danh sách lịch hẹn...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-rose-500">
            <AlertCircle size={48} className="mb-4" />
            <p className="text-lg font-semibold mb-1">Đã xảy ra lỗi</p>
            <p className="text-sm mb-4">{error}</p>
            <button
              onClick={loadAppointments}
              className="px-4 py-2 bg-[#00285E] text-white rounded-xl text-xs font-bold hover:bg-[#001a3f] transition-all"
            >
              Thử lại
            </button>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <AlertCircle size={48} className="mb-4 text-slate-300" />
            <p className="text-lg font-semibold mb-1">Không tìm thấy lịch hẹn</p>
            <p className="text-sm">Không tìm thấy dữ liệu phù hợp với bộ lọc.</p>
          </div>
        ) : (
          <>
          {/* Compact cards for mobile and tablet */}
          <div className="space-y-3 bg-slate-50/60 p-3 sm:p-4 xl:hidden">
            {paginatedData.map((apt) => {
              const { config, statusKey, isWaitingForBay } = getDisplayStatus(apt);
              const StatusIcon = config.icon;
              const isWalkIn = apt.bookingType?.includes('WALK');
              return (
                <article key={apt.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="font-bold text-[#00285E]">APT-{apt.id.padStart(3, '0')}</span>
                      <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[9px] font-bold ${isWalkIn
                        ? 'border-slate-200 bg-slate-100 text-slate-500'
                        : 'border-blue-100 bg-blue-50 text-blue-600'
                      }`}>
                        {isWalkIn ? 'Vãng lai' : 'Đặt lịch'}
                      </span>
                    </div>
                    <span
                      style={{ color: config.color, backgroundColor: config.bg }}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold"
                    >
                      <StatusIcon size={12} className={!isWaitingForBay && statusKey === 'in_progress' ? 'animate-spin' : ''} />
                      {config.label}
                    </span>
                  </div>

                  <div className={`grid grid-cols-2 items-center gap-4 py-4 ${apt.hasServiceOrder ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
                    <div className="min-w-0">
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Khách hàng</span>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-800">{apt.customerName}</p>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Biển số xe</span>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-700">{apt.vehiclePlate}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Lịch hẹn</span>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{formatDate(apt.appointmentDate)} · {apt.appointmentTime}</p>
                    </div>
                    {apt.hasServiceOrder && (
                      <div className="col-span-2 flex justify-end sm:col-span-1">
                        <button
                          onClick={() => navigate(`/leader/service-orders/${apt.serviceOrderId}`)}
                          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-100 px-4 py-2 text-xs font-bold text-[#00285E] transition-colors hover:bg-emerald-200"
                        >
                          <CarFront size={14} /> Xem lệnh S/C
                        </button>
                      </div>
                    )}
                  </div>

                  {!apt.hasServiceOrder && (
                    <div className="flex flex-col justify-end gap-2 border-t border-slate-100 pt-3 sm:flex-row">
                      <button
                        onClick={() => setSelectedAppt(apt)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#EDF3FF] px-4 py-2 text-xs font-bold text-[#00285E] transition-colors hover:bg-[#D2E2FF]"
                      >
                        <Eye size={14} /> Chi tiết
                      </button>
                      <button
                        onClick={() => navigate(`/leader/appointments/create-service-order?appointmentId=${apt.id}`)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#00285E] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#001a3f]"
                      >
                        <CarFront size={14} /> Tạo lệnh dịch vụ
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {/* Short table for wide desktop screens */}
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-blue-100 uppercase tracking-widest bg-[#00285E] lg:text-slate-400 lg:bg-slate-50/50">
                  <th className="py-3 px-4">Mã</th>
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4">Xe</th>
                  <th className="py-3 px-4">Ngày hẹn</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((apt) => {
                  const { config, statusKey, isWaitingForBay } = getDisplayStatus(apt);
                  const StatusIcon = config.icon;
                  return (
                    <tr key={apt.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="font-bold text-[#00285E] text-xs">APT-{apt.id.padStart(3, '0')}</span>
                          {apt.bookingType && apt.bookingType.includes('WALK') ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                              Vãng lai
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                              Đặt lịch
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#EDF3FF] flex items-center justify-center">
                            <Users size={16} className="text-[#00285E]" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{apt.customerName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-semibold text-slate-700 text-xs">{apt.vehiclePlate}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-semibold text-slate-700 text-xs">{formatDate(apt.appointmentDate)}</p>
                          <p className="text-slate-400 text-xs">{apt.appointmentTime}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          style={{ color: config.color, backgroundColor: config.bg }}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold"
                        >
                          <StatusIcon size={12} className={!isWaitingForBay && statusKey === 'in_progress' ? 'animate-spin' : ''} />
                          {config.label}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {!apt.hasServiceOrder && (
                            <button
                              onClick={() => setSelectedAppt(apt)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#00285E] bg-[#EDF3FF] hover:bg-[#D2E2FF] transition-colors"
                            >
                              <Eye size={13} />
                              Chi tiết
                            </button>
                          )}

                          {apt.hasServiceOrder ? (
                            <button
                              onClick={() => navigate(`/leader/service-orders/${apt.serviceOrderId}`)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#00285E] bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 transition-colors"
                            >
                              <CarFront size={13} />
                              Xem Lệnh S/C
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate(`/leader/appointments/create-service-order?appointmentId=${apt.id}`)}
                              className="flex items-center gap-1 rounded-lg bg-[#00285E] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#001a3f]"
                              title="Tạo hóa đơn dịch vụ"
                            >
                              <CarFront size={13} />
                              Tạo hóa đơn dịch vụ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:px-6">
            <span className="text-xs font-semibold text-slate-400">
              Hiển thị {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredAppointments.length)} / {filteredAppointments.length} lịch hẹn
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${page === currentPage
                    ? 'bg-[#00285E] text-white shadow-md'
                    : 'text-slate-500 hover:bg-slate-100'
                    }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selectedAppt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00285E] to-[#1a4a8a] flex items-center justify-center shadow-md shadow-[#00285E]/20">
                  <FileText size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Chi tiết lịch hẹn
                  </h3>
                  <p className="text-xs text-slate-400">APT-{selectedAppt.id.padStart(3, '0')}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppt(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Customer and Vehicle information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Customer Section */}
                <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Users size={13} className="text-[#00285E]" />
                    Khách hàng
                  </h4>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-slate-800">{selectedAppt.customerName}</p>
                    <p className="text-xs text-slate-500">{selectedAppt.customerPhone}</p>
                    {selectedAppt.customerEmail && (
                      <p className="text-xs text-slate-500 truncate">{selectedAppt.customerEmail}</p>
                    )}
                  </div>
                </div>

                {/* Vehicle Section */}
                <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <CarFront size={13} className="text-[#00285E]" />
                    Phương tiện
                  </h4>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-slate-800">{selectedAppt.vehiclePlate}</p>
                    <p className="text-xs text-slate-500">{selectedAppt.vehicleModel}</p>
                    {selectedAppt.vehicleColor && (
                      <p className="text-xs text-slate-500">Màu: {selectedAppt.vehicleColor}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Appointment Info */}
              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock size={13} className="text-[#00285E]" />
                  Thời gian hẹn
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wide">Ngày hẹn</span>
                    <span className="text-sm text-slate-800 font-bold block mt-0.5">{formatDate(selectedAppt.appointmentDate)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wide">Giờ hẹn</span>
                    <span className="text-sm text-slate-800 font-bold block mt-0.5">{selectedAppt.appointmentTime}</span>
                  </div>
                </div>
              </div>

              {/* Services List */}
              {selectedAppt.serviceDetails.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Dịch vụ đã đăng ký
                  </h4>
                  <div className="space-y-2">
                    {selectedAppt.serviceDetails.map((service, index) => (
                      <div
                        key={`${service.type}-${index}`}
                        className={`rounded-xl border p-3.5 ${service.type === 'combo'
                          ? 'border-blue-200 bg-blue-50/60'
                          : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${service.type === 'combo'
                            ? 'bg-[#00285E] text-white'
                            : 'bg-white text-slate-500 ring-1 ring-slate-200'
                          }`}>
                            {service.type === 'combo' ? 'Combo' : 'Dịch vụ lẻ'}
                          </span>
                          <p className="text-sm font-bold text-[#00285E]">{service.name}</p>
                        </div>

                        {service.type === 'combo' && (
                          <div className="mt-3 border-t border-blue-200/70 pt-2.5">
                            <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                              Dịch vụ thuộc combo ({service.includedCatalogs.length})
                            </p>
                            {service.includedCatalogs.length > 0 ? (
                              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                {service.includedCatalogs.map((catalogName, catalogIndex) => (
                                  <div key={`${catalogName}-${catalogIndex}`} className="flex items-start gap-2 rounded-lg bg-white px-2.5 py-2 text-xs font-medium text-slate-700 ring-1 ring-blue-100">
                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#00285E] text-[8px] font-bold text-white">
                                      {catalogIndex + 1}
                                    </span>
                                    <span>{catalogName}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs italic text-slate-400">Chưa có dữ liệu dịch vụ thành phần.</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mô tả tình trạng xe */}
              {selectedAppt.notes && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <StickyNote size={13} className="text-[#00285E]" />
                    Mô tả tình trạng xe
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed bg-amber-50 border border-amber-100 rounded-xl p-3.5">
                    {selectedAppt.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setSelectedAppt(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#00285E] text-white hover:bg-[#001a3f] transition-colors shadow-md shadow-[#00285E]/20"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
