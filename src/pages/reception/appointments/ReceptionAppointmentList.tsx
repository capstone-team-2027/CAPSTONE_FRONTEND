import { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  CalendarCheck,
  Search,
  Filter,
  Eye,
  CarFront,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import type { AppointmentModel } from '../../../model/Appointment';
import { useFetchClient } from '../../../hook/useFetchClient';
import { useSocket } from '../../../hook/useSocket';
import { APPOINTMENT_API_ENDPOINTS } from '../../../constants/reception/appointmentsEndpoints';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending: { label: 'Chờ xác nhận', color: '#D97706', bg: '#FEF3C7', icon: Clock },
  confirmed: { label: 'Chờ tiếp nhận', color: '#2563EB', bg: '#DBEAFE', icon: Clock },
  information_received: { label: 'Đã tiếp nhận', color: '#EA580C', bg: '#FED7AA', icon: CheckCircle2 },
  in_progress: { label: 'Đã tiếp nhận ', color: '#EA580C', bg: '#FED7AA', icon: Loader2 },
  completed: { label: 'Đã tiếp nhận', color: '#059669', bg: '#D1FAE5', icon: CheckCircle2 },
  cancelled: { label: 'Đã hủy', color: '#DC2626', bg: '#FEE2E2', icon: XCircle },
  no_show: { label: 'Khách không đến (No Show)', color: '#6B7280', bg: '#F3F4F6', icon: XCircle },
  expired: { label: 'Đã quá hạn (Hủy)', color: '#94A3B8', bg: '#F1F5F9', icon: XCircle },
};

const DEFAULT_STATUS_CONFIG = {
  label: 'Chưa xác định',
  color: '#64748B',
  bg: '#F1F5F9',
  icon: AlertCircle,
};

const ITEMS_PER_PAGE = 6;

type AppointmentServiceItem = {
  id: string;
  kind: 'catalog' | 'combo';
  name: string;
  description?: string;
  includedServices: Array<{
    id: string;
    name: string;
  }>;
};

type ReceptionAppointment = AppointmentModel & {
  serviceDetails: AppointmentServiceItem[];
};


export default function AppointmentList() {
  const navigate = useNavigate();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  }>();

  const { fetchPrivate } = useFetchClient();
  const socket = useSocket();
  const [appointments, setAppointments] = useState<ReceptionAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('unreceived');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedApptForReceive, setSelectedApptForReceive] = useState<ReceptionAppointment | null>(null);
  const [receiveTimePreview, setReceiveTimePreview] = useState<Date | null>(null);

  const loadAppointments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetchPrivate(APPOINTMENT_API_ENDPOINTS.GET_APPOINTMENTS);
      if (response.success && Array.isArray(response.data)) {
        const mapped: ReceptionAppointment[] = response.data.map((appt: any) => {
          const services: string[] = [];
          const serviceDetails: AppointmentServiceItem[] = [];
          if (Array.isArray(appt.appointmentDetails)) {
            appt.appointmentDetails.forEach((detail: any, detailIndex: number) => {
              if (detail.catalog?.service_name) {
                services.push(detail.catalog.service_name);
                serviceDetails.push({
                  id: `catalog-${detail.catalog.id ?? detailIndex}`,
                  kind: 'catalog',
                  name: detail.catalog.service_name,
                  description: detail.catalog.description || undefined,
                  includedServices: [],
                });
              }
              if (detail.combo?.combo_name) {
                services.push(detail.combo.combo_name);
                serviceDetails.push({
                  id: `combo-${detail.combo.id ?? detailIndex}`,
                  kind: 'combo',
                  name: detail.combo.combo_name,
                  description: detail.combo.description || undefined,
                  includedServices: Array.isArray(detail.combo.catalogs)
                    ? detail.combo.catalogs
                      .filter((catalog: any) => Boolean(catalog?.service_name))
                      .map((catalog: any, catalogIndex: number) => ({
                        id: String(catalog.id ?? `${detailIndex}-${catalogIndex}`),
                        name: catalog.service_name,
                      }))
                    : [],
                });
              }
            });
          }

          if (services.length === 0 && appt.booking_type && appt.booking_type.includes('REPAIR')) {
            services.push('Kiểm tra');
          }

          let appointmentDate = '';
          let appointmentTime = '';
          const targetTime = appt.scheduled_time || appt.createdAt || appt.created_at;
          if (targetTime) {
            const dateObj = new Date(targetTime);
            appointmentDate = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');
            appointmentTime = String(dateObj.getHours()).padStart(2, '0') + ':' + String(dateObj.getMinutes()).padStart(2, '0');
          }

          let status = (appt.status || 'pending').toLowerCase() as any;

          // Check if appointment is expired (should be treated as expired/cancelled)
          if ((status === 'pending' || status === 'confirmed') && appt.scheduled_time) {
            const scheduledDate = new Date(appt.scheduled_time);
            const now = new Date();

            const scheduledDateOnly = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate());
            const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            if (scheduledDateOnly < nowDateOnly) {
              // Past day
              status = 'expired';
            } else if (scheduledDateOnly.getTime() === nowDateOnly.getTime()) {
              // Today: check if scheduled time is more than 1 hour ago
              const oneHourLater = new Date(scheduledDate.getTime() + 60 * 20 * 1000);
              if (oneHourLater < now) {
                status = 'expired';
              }
            }
          }

          return {
            id: String(appt.id),
            customerName: appt.customer?.user?.fullName || appt.customer?.name || 'Khách vãng lai',
            customerPhone: appt.customer?.user?.phoneNumber || appt.customer?.phone || '',
            customerEmail: appt.customer?.user?.email || undefined,
            vehiclePlate: appt.vehicle?.license_plate || 'Chưa cập nhật',
            vehicleModel: appt.vehicle?.model
              ? `${appt.vehicle.model.make?.make_name || ''} ${appt.vehicle.model.model_name || ''}`.trim()
              : 'Chưa cập nhật',
            vehicleYear: appt.vehicle?.year || undefined,
            hasServiceOrder: !!appt.serviceOrder,
            serviceOrderId: appt.serviceOrder?.id || null,
            services,
            serviceDetails,
            appointmentDate,
            appointmentTime,
            notes: appt.notes || '',
            status,
            bookingType: appt.booking_type || '',
            createdAt: appt.createdAt || appt.created_at || '',
          };
        });

        // Sort appointments: chronological ascending (Earliest first)
        const sorted = mapped.sort((a: any, b: any) => {
          const timeA = a.appointmentDate && a.appointmentTime ? `${a.appointmentDate}T${a.appointmentTime}` : a.createdAt;
          const timeB = b.appointmentDate && b.appointmentTime ? `${b.appointmentDate}T${b.appointmentTime}` : b.createdAt;
          return new Date(timeA).getTime() - new Date(timeB).getTime();
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

  const [isSubmittingVin, setIsSubmittingVin] = useState(false);

  const handleReceiveClick = (appt: ReceptionAppointment) => {
    setReceiveTimePreview(new Date());
    setSelectedApptForReceive(appt);
  };

  const closeReceiveModal = () => {
    setSelectedApptForReceive(null);
    setReceiveTimePreview(null);
  };

  const handleConfirmReceive = async () => {
    if (!selectedApptForReceive) return;
    const apptId = selectedApptForReceive.id;
    try {
      setIsSubmittingVin(true);
      const receiveResponse = await fetchPrivate(APPOINTMENT_API_ENDPOINTS.RECEIVE_APPOINTMENT(apptId), 'PUT', {});
      if (!receiveResponse.success) {
        throw new Error(receiveResponse.message || 'Lỗi tiếp nhận lịch hẹn');
      }

      showToast(`Tiếp nhận lịch hẹn APT-${apptId.padStart(3, '0')} thành công!`, 'success');
      closeReceiveModal();
      loadAppointments();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Đã xảy ra lỗi', 'warning');
    } finally {
      setIsSubmittingVin(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    if (!selectedApptForReceive) return;

    const timer = window.setInterval(() => {
      setReceiveTimePreview(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [selectedApptForReceive]);

  // Có lịch hẹn mới -> BE emit new_notification -> tự tải lại danh sách
  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = () => {
      loadAppointments();
    };
    socket.on('new_notification', handleNewNotification);
    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket]);

  // Filtered data
  const filteredAppointments = useMemo(() => {
    const filtered = appointments.filter((apt) => {
      const formattedId = `APT-${apt.id.padStart(3, '0')}`;
      const matchSearch =
        searchTerm === '' ||
        apt.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.customerPhone.includes(searchTerm) ||
        apt.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formattedId.toLowerCase().includes(searchTerm.toLowerCase());

      let matchStatus = false;
      if (statusFilter === 'all') {
        matchStatus = true;
      } else if (statusFilter === 'unreceived') {
        matchStatus = apt.status === 'pending' || apt.status === 'confirmed';
      } else if (statusFilter === 'received') {
        matchStatus = apt.status === 'information_received' || apt.status === 'in_progress' || apt.status === 'completed';
      } else if (statusFilter === 'cancelled') {
        matchStatus = apt.status === 'cancelled' || apt.status === 'no_show' || apt.status === 'expired';
      } else {
        matchStatus = apt.status === statusFilter;
      }

      return matchSearch && matchStatus;
    });

    // Sort chronological ascending (Earliest first)
    return filtered.sort((a, b) => {
      const timeA = a.appointmentDate && a.appointmentTime ? `${a.appointmentDate}T${a.appointmentTime}` : a.createdAt;
      const timeB = b.appointmentDate && b.appointmentTime ? `${b.appointmentDate}T${b.appointmentTime}` : b.createdAt;
      return new Date(timeA).getTime() - new Date(timeB).getTime();
    });
  }, [appointments, searchTerm, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredAppointments.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAppointments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAppointments, currentPage]);

  // KPI counts
  const kpiCounts = useMemo(() => ({
    total: appointments.length,
    pending: appointments.filter((a) => a.status === 'pending').length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    completed: appointments.filter((a) => a.status === 'completed').length,
  }), [appointments]);

  const tabCounts = useMemo(() => {
    return {
      unreceived: appointments.filter((a) => a.status === 'pending' || a.status === 'confirmed').length,
      received: appointments.filter((a) => a.status === 'information_received' || a.status === 'in_progress' || a.status === 'completed').length,
      cancelled: appointments.filter((a) => a.status === 'cancelled' || a.status === 'no_show' || a.status === 'expired').length,
      all: appointments.length,
    };
  }, [appointments]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 space-y-4 p-3 sm:p-4 md:space-y-6 md:p-6 xl:p-8">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(-1)}
            title="Quay lại"
            className="mt-0.5 w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#00285E] hover:border-slate-300 active:scale-[0.97] transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2 flex items-center gap-2">
              <CalendarCheck className="text-amber-500" size={28} />
              Danh sách Lịch hẹn
            </h1>
            <p className="text-slate-500 text-sm">
              Quản lý tất cả lịch hẹn dịch vụ — xem chi tiết và tiếp nhận xe.
            </p>
          </div>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 xl:w-auto xl:gap-3">
          <button
            onClick={() => navigate('/reception/customers/receive')}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#00285E] bg-white px-5 py-3 text-sm font-bold text-[#00285E] shadow-sm transition-all hover:bg-[#EDF3FF] active:scale-[0.98]"
          >
            <CarFront size={18} />
            Tiếp nhận khách
          </button>
          <button
            onClick={() => navigate('/reception/appointments/new')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00285E] px-5 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#00285E]/90 active:scale-[0.98]"
          >
            <CalendarCheck size={18} />
            Đặt lịch hẹn mới
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-4">
        {[
          { label: 'Tổng lịch hẹn', value: kpiCounts.total, icon: <CalendarCheck size={22} />, color: '#00285E', bg: '#EFF6FF' },
          { label: 'Chờ xác nhận', value: kpiCounts.pending, icon: <Clock size={22} />, color: '#D97706', bg: '#FEF3C7' },
          { label: 'Đã xác nhận', value: kpiCounts.confirmed, icon: <CheckCircle2 size={22} />, color: '#2563EB', bg: '#DBEAFE' },
          { label: 'Hoàn thành', value: kpiCounts.completed, icon: <CheckCircle2 size={22} />, color: '#059669', bg: '#D1FAE5' },
        ].map((card, i) => (
          <div key={i} className="rounded-2xl border border-slate-200/60 bg-white p-3 shadow-xs sm:p-4 xl:p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{card.label}</span>
                <span className="block text-xl font-bold tracking-tight text-slate-900 xl:text-2xl">{card.value}</span>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl xl:h-10 xl:w-10" style={{ backgroundColor: card.bg, color: card.color }}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH & FILTER */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT, biển số, mã lịch hẹn..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
            />
          </div>

          {/* Status Pills */}
          <div className="flex flex-wrap gap-2 pt-1 items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-1.5">
              <Filter size={13} className="text-slate-400" />
              Trạng thái:
            </span>
            {[
              { id: 'unreceived', label: 'Chưa tiếp nhận', count: tabCounts.unreceived },
              { id: 'received', label: 'Đã tiếp nhận', count: tabCounts.received },
              { id: 'cancelled', label: 'Đã hủy', count: tabCounts.cancelled },
              { id: 'all', label: 'Tất cả', count: tabCounts.all }
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { setStatusFilter(tab.id); setCurrentPage(1); }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${isActive
                    ? 'bg-[#00285E] text-white border-[#00285E] shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
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
            <p className="text-sm">Thử thay đổi từ khóa hoặc bộ lọc trạng thái.</p>
          </div>
        ) : (
          <>
          {/* Mobile and tablet cards */}
          <div className="grid grid-cols-1 gap-3 bg-slate-50/70 p-3 sm:p-4 lg:grid-cols-2 xl:hidden">
            {paginatedData.map((apt) => {
              const statusCfg = STATUS_CONFIG[apt.status] ?? {
                ...DEFAULT_STATUS_CONFIG,
                label: apt.status ? apt.status.replaceAll('_', ' ') : DEFAULT_STATUS_CONFIG.label,
              };
              const StatusIcon = statusCfg.icon;
              return (
                <article key={apt.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#00285E]">APT-{apt.id.padStart(3, '0')}</p>
                      <p className="mt-1 truncate text-sm font-bold text-slate-800">{apt.customerName}</p>
                      <p className="text-xs text-slate-400">{apt.customerPhone}</p>
                    </div>
                    <span
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold"
                      style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
                    >
                      <StatusIcon size={12} />
                      {statusCfg.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-4 text-xs">
                    <div className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Phương tiện</span>
                      <p className="mt-1 font-bold text-slate-700">{apt.vehiclePlate}</p>
                      <p className="truncate text-slate-400">{apt.vehicleModel}</p>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Ngày hẹn</span>
                      <p className="mt-1 font-bold text-slate-700">{formatDate(apt.appointmentDate)}</p>
                      <p className="text-slate-400">{apt.appointmentTime}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Dịch vụ</span>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {apt.services.length > 0 ? apt.services.slice(0, 3).map((service, index) => (
                          <span key={index} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{service}</span>
                        )) : <span className="text-slate-400">Chưa có dịch vụ</span>}
                        {apt.services.length > 3 && <span className="px-1 py-1 text-[10px] font-bold text-slate-400">+{apt.services.length - 3}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">
                    <button
                      onClick={() => navigate(`/reception/appointments/${apt.id}`)}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-[#EDF3FF] px-3 py-2 text-xs font-bold text-[#00285E] transition-colors hover:bg-[#D2E2FF]"
                    >
                      <Eye size={14} /> Chi tiết
                    </button>
                    {(apt.status === 'confirmed' || apt.status === 'pending' || apt.status === 'in_progress') && (
                      apt.hasServiceOrder ? (
                        <button onClick={() => navigate(`/reception/service-orders/${apt.serviceOrderId}`)} className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-100 px-3 py-2 text-xs font-bold text-[#00285E] hover:bg-emerald-200">
                          <CarFront size={14} /> Xem Lệnh S/C
                        </button>
                      ) : apt.status === 'in_progress' ? (
                        <button onClick={() => navigate(`/reception/service-orders/create?appointmentId=${apt.id}`)} className="flex items-center justify-center gap-1.5 rounded-lg bg-[#00285E] px-3 py-2 text-xs font-bold text-white hover:bg-[#001a3f]">
                          <CarFront size={14} /> Tạo hóa đơn
                        </button>
                      ) : (
                        <button onClick={() => handleReceiveClick(apt)} disabled={isSubmittingVin} className="flex items-center justify-center gap-1.5 rounded-lg bg-[#00285E] px-3 py-2 text-xs font-bold text-white hover:bg-[#001a3f] disabled:opacity-50">
                          <CarFront size={14} /> Tiếp nhận xe
                        </button>
                      )
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {/* Full table for wide desktop screens */}
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th className="py-3 px-4">Mã</th>
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4">Xe</th>
                  <th className="py-3 px-4">Dịch vụ</th>
                  <th className="py-3 px-4">Ngày hẹn</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((apt) => {
                  const statusCfg = STATUS_CONFIG[apt.status] ?? {
                    ...DEFAULT_STATUS_CONFIG,
                    label: apt.status ? apt.status.replaceAll('_', ' ') : DEFAULT_STATUS_CONFIG.label,
                  };
                  const StatusIcon = statusCfg.icon;
                  return (
                    <tr key={apt.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className="font-bold text-[#00285E] text-xs">APT-{apt.id.padStart(3, '0')}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#EDF3FF] flex items-center justify-center">
                            <Users size={16} className="text-[#00285E]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-slate-800 text-sm">{apt.customerName}</p>
                              {apt.status === 'no_show' && (
                                <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-rose-50 text-rose-500 border border-rose-100 uppercase">
                                  Cảnh báo No-show
                                </span>
                              )}
                            </div>
                            <p className="text-slate-400 text-xs">{apt.customerPhone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-semibold text-slate-700 text-xs">{apt.vehiclePlate}</p>
                          <p className="text-slate-400 text-xs">{apt.vehicleModel}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="max-w-[200px]">
                          {apt.services.slice(0, 2).map((s, i) => (
                            <span key={i} className="inline-block bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-md mr-1 mb-1">
                              {s}
                            </span>
                          ))}
                          {apt.services.length > 2 && (
                            <span className="text-[10px] text-slate-400 font-semibold">+{apt.services.length - 2}</span>
                          )}
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
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                          style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
                        >
                          <StatusIcon size={12} />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => navigate(`/reception/appointments/${apt.id}`)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#00285E] bg-[#EDF3FF] hover:bg-[#D2E2FF] transition-colors"
                          >
                            <Eye size={13} />
                            Chi tiết
                          </button>
                          {(apt.status === 'confirmed' || apt.status === 'pending' || apt.status === 'in_progress') && (
                            <>
                              {apt.hasServiceOrder ? (
                                <button
                                  onClick={() => navigate(`/reception/service-orders/${apt.serviceOrderId}`)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#00285E] bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 transition-colors"
                                >
                                  <CarFront size={13} />
                                  Xem Lệnh S/C
                                </button>
                              ) : apt.status === 'in_progress' ? (
                                <button
                                  onClick={() => navigate(`/reception/service-orders/create?appointmentId=${apt.id}`)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#00285E] hover:bg-[#001a3f] transition-colors"
                                >
                                  <CarFront size={13} />
                                  Tạo hóa đơn dịch vụ
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleReceiveClick(apt)}
                                  disabled={isSubmittingVin}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#00285E] hover:bg-[#001a3f] transition-colors"
                                >
                                  <CarFront size={13} />
                                  Tiếp nhận xe
                                </button>
                              )}
                            </>
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

      {selectedApptForReceive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs sm:p-5 md:p-8">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="receive-vehicle-modal-title"
            className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-3xl md:max-h-[calc(100dvh-4rem)]"
          >
            {/* Header */}
            <div className="relative shrink-0 bg-[#00285E] px-5 py-4 text-white sm:px-7 sm:py-5 md:px-8">
              <div className="flex items-center gap-3 pr-10">
                <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 sm:flex">
                  <CarFront size={23} />
                </div>
                <div>
                  <h3 id="receive-vehicle-modal-title" className="text-lg font-bold sm:text-xl">Xác nhận tiếp nhận xe vào xưởng</h3>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-slate-200/80 sm:text-sm">Kiểm tra thông tin khách hàng và phương tiện trước khi xác nhận.</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Đóng cửa sổ tiếp nhận xe"
                onClick={closeReceiveModal}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:right-6 sm:top-5"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="min-h-0 flex-1 overflow-y-auto bg-white p-4 sm:p-6 md:p-8">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
              <div className="grid grid-cols-2 gap-3 md:col-span-2 lg:grid-cols-4 md:gap-4">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 sm:p-4">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-1">Mã lịch hẹn</span>
                  <span className="text-sm font-bold text-[#00285E] sm:text-base">APT-{selectedApptForReceive.id.padStart(3, '0')}</span>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 sm:p-4">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-1">Loại đặt lịch</span>
                  <span className="text-sm font-bold text-slate-700 sm:text-base">
                    {selectedApptForReceive.bookingType && selectedApptForReceive.bookingType.includes('WALK') ? 'Khách vãng lai' : 'Đặt lịch trước'}
                  </span>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 sm:p-4">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Ngày giờ hẹn</span>
                  <span className="block text-sm font-bold text-slate-700 sm:text-base">
                    {formatDate(selectedApptForReceive.appointmentDate)}
                  </span>
                  <span className="mt-0.5 block text-xs font-semibold text-slate-500">{selectedApptForReceive.appointmentTime}</span>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 sm:p-4">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-emerald-700">Giờ tiếp nhận tại gara</span>
                  <span className="block text-sm font-bold text-emerald-900 sm:text-base">
                    {receiveTimePreview?.toLocaleDateString('vi-VN') || '--/--/----'}
                  </span>
                  <span className="mt-0.5 block text-xs font-bold tabular-nums text-emerald-700">
                    {receiveTimePreview?.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) || '--:--:--'}
                  </span>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-2">Thông tin khách hàng</h4>
                <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-slate-500 font-semibold">Tên khách hàng:</span>
                  <span className="font-bold text-slate-800 sm:text-right">{selectedApptForReceive.customerName}</span>
                </div>
                <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-slate-500 font-semibold">Số điện thoại:</span>
                  <span className="font-bold text-slate-800">{selectedApptForReceive.customerPhone}</span>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-2">Thông tin xe</h4>
                <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-slate-500 font-semibold">Biển số xe:</span>
                  <span className="font-bold text-slate-800 uppercase">{selectedApptForReceive.vehiclePlate}</span>
                </div>
                <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-slate-500 font-semibold">Dòng xe:</span>
                  <span className="font-bold text-slate-800 sm:text-right">{selectedApptForReceive.vehicleModel}</span>
                </div>
              </div>

              <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4 md:col-span-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-2">Dịch vụ yêu cầu</h4>
                {selectedApptForReceive.serviceDetails.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {selectedApptForReceive.serviceDetails.map((service) => (
                      <div
                        key={service.id}
                        className={`rounded-xl border p-3 ${service.kind === 'combo'
                          ? 'border-blue-200 bg-blue-50/70 sm:col-span-2'
                          : 'border-slate-200 bg-white'
                          }`}
                      >
                        <div className={service.kind === 'combo' ? 'grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] md:items-center md:gap-4' : ''}>
                          <div className="flex items-start gap-2.5">
                            <span className={`mt-0.5 shrink-0 rounded-md px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider ${service.kind === 'combo'
                              ? 'bg-[#00285E] text-white'
                              : 'bg-slate-100 text-slate-500'
                              }`}>
                              {service.kind === 'combo' ? 'Combo' : 'Dịch vụ lẻ'}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-bold leading-5 text-slate-800">{service.name}</p>
                              {service.description && (
                                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{service.description}</p>
                              )}
                            </div>
                          </div>

                          {service.kind === 'combo' && (
                            <div className="border-t border-blue-200/70 pt-2.5 md:border-l md:border-t-0 md:pl-4 md:pt-0">
                              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#00285E]">
                                Gồm {service.includedServices.length} dịch vụ lẻ
                              </p>
                              {service.includedServices.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {service.includedServices.map((includedService, index) => (
                                    <div key={includedService.id} className="flex min-w-[140px] flex-1 items-center gap-2 rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-[#00285E]">
                                        {index + 1}
                                      </span>
                                      <span className="leading-4">{includedService.name}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs font-medium italic text-slate-400">Chưa có thông tin dịch vụ con của combo.</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedApptForReceive.services.length > 0 ? selectedApptForReceive.services.map((service, index) => (
                      <span key={`${service}-${index}`} className="inline-block rounded-lg border border-slate-200/60 bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
                        {service}
                      </span>
                    )) : (
                      <span className="text-xs font-medium italic text-slate-400">Chưa có dịch vụ được đăng ký.</span>
                    )}
                  </div>
                )}
              </div>

              {selectedApptForReceive.notes && (
                <div className="space-y-2 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 sm:p-5 md:col-span-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ghi chú của khách</h4>
                  <p className="rounded-xl border border-amber-100/80 bg-white p-3 text-sm font-medium leading-relaxed text-slate-600">
                    {selectedApptForReceive.notes}
                  </p>
                </div>
              )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6 sm:py-4 md:px-8">
              <button
                type="button"
                onClick={closeReceiveModal}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 sm:px-5 sm:text-sm"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmReceive}
                disabled={isSubmittingVin}
                className="flex items-center gap-1.5 rounded-xl bg-[#00285E] px-5 py-2.5 text-xs font-bold text-white shadow-md transition-colors hover:bg-[#001a3f] disabled:cursor-not-allowed disabled:opacity-50 sm:px-6 sm:text-sm"
              >
                {isSubmittingVin ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <CarFront size={13} />
                    Xác nhận Tiếp nhận
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
