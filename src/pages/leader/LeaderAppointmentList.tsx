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
} from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useFetchClient_v2 } from '../../hook/useFetchClient';
import { useSocket } from '../../hook/useSocket';
import { TECHNICIAN_LEADER_TASK_ENDPOINTS } from '../../constants/technicianLeader/taskManagementEndpoint';
import { GARAGE_CONFIG_API_ENDPOINTS } from '../../constants/customer/garage_configurationsEndpoints';


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
  services: string[];
  appointmentDate: string;
  appointmentTime: string;
  notes: string;
  status: string;
  bookingType: string;
  priorityType: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  technicaian_recieved: { label: 'Đợi tạo lệnh', color: '#D97706', bg: '#FEF3C7', icon: Clock },
  information_recieved: { label: 'Đợi tạo lệnh', color: '#D97706', bg: '#FEF3C7', icon: Clock },
  in_progress: { label: 'Đang sửa chữa', color: '#2563EB', bg: '#DBEAFE', icon: Loader2 },
  completed: { label: 'Hoàn thành', color: '#059669', bg: '#D1FAE5', icon: CheckCircle2 },
};

const TABS = {
  all: 'Tất cả',
  uncreated: 'Đợi tạo lệnh',
  in_progress: 'Đang sửa chữa',
  completed: 'Hoàn thành',
};

const ITEMS_PER_PAGE = 6;

export default function LeaderAppointmentList() {
  const navigate = useNavigate();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  }>();

  const { fetchPrivate } = useFetchClient_v2();
  const socket = useSocket();
  const [appointments, setAppointments] = useState<AppointmentModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'uncreated' | 'in_progress' | 'completed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [garageCapacity, setGarageCapacity] = useState<number>(3);
  const [bookedCounts, setBookedCounts] = useState<Record<string, number>>({});

  const loadGarageConfigs = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const availRes = await fetchPrivate(GARAGE_CONFIG_API_ENDPOINTS.GET_AVAILABILITY + `?date=${todayStr}`);
      const data = availRes?.data ?? availRes;
      if (data) {
        if (data.capacity !== undefined) setGarageCapacity(data.capacity);
        if (data.bookedCounts) setBookedCounts(data.bookedCounts);
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu sức chứa của xưởng:", error);
    }
  };

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
          if (Array.isArray(appt.appointmentDetails)) {
            appt.appointmentDetails.forEach((detail: any) => {
              if (detail.catalog?.service_name) {
                services.push(detail.catalog.service_name);
              }
              if (detail.combo?.combo_name) {
                services.push(detail.combo.combo_name);
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
            services,
            appointmentDate,
            appointmentTime,
            notes: appt.notes || '',
            status: appt.status || 'Technicaian_recieved',
            bookingType: appt.booking_type || '',
            priorityType: appt.priority_type || 'NORMAL',
            createdAt: appt.createdAt || appt.created_at || '',
          };
        });

        // Sort: Emergency -> Bookings (scheduled_time ASC) -> Walk-ins (createdAt ASC)
        const sorted = mapped.sort((a: any, b: any) => {
          const aIsEmergency = a.priorityType === 'EMERGENCY';
          const bIsEmergency = b.priorityType === 'EMERGENCY';
          if (aIsEmergency !== bIsEmergency) {
            return aIsEmergency ? -1 : 1;
          }

          const aIsWalkIn = a.bookingType && a.bookingType.includes('WALK');
          const bIsWalkIn = b.bookingType && b.bookingType.includes('WALK');
          if (aIsWalkIn !== bIsWalkIn) {
            return aIsWalkIn ? 1 : -1;
          }

          if (!aIsWalkIn) {
            const timeA = a.appointmentDate && a.appointmentTime ? `${a.appointmentDate}T${a.appointmentTime}` : a.createdAt;
            const timeB = b.appointmentDate && b.appointmentTime ? `${b.appointmentDate}T${b.appointmentTime}` : b.createdAt;
            return new Date(timeA).getTime() - new Date(timeB).getTime();
          } else {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          }
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
    loadGarageConfigs();
  }, []);

  // Realtime notification support for auto-reloading lists
  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = () => {
      loadAppointments();
      loadGarageConfigs();
    };
    socket.on('new_notification', handleNewNotification);
    return () => {
      socket.off('new_notification', handleNewNotification);
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
      if (statusFilter === 'all') {
        matchStatus = true;
      } else if (statusFilter === 'uncreated') {
        matchStatus = statusLower === 'technicaian_recieved' || statusLower === 'information_recieved';
      } else if (statusFilter === 'in_progress') {
        matchStatus = statusLower === 'in_progress';
      } else if (statusFilter === 'completed') {
        matchStatus = statusLower === 'completed';
      }

      return matchSearch && matchStatus;
    });
  }, [appointments, searchTerm, statusFilter]);

  const tabCounts = useMemo(() => {
    return {
      all: appointments.length,
      uncreated: appointments.filter((a) => {
        const s = a.status.toLowerCase();
        return s === 'technicaian_recieved' || s === 'information_recieved';
      }).length,
      in_progress: appointments.filter((a) => a.status.toLowerCase() === 'in_progress').length,
      completed: appointments.filter((a) => a.status.toLowerCase() === 'completed').length,
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

  const isCreateDisabled = (apt: AppointmentModel) => {
    const isWalkIn = apt.bookingType && apt.bookingType.includes('WALK');

    // Get current local hour
    const now = new Date();
    const currentHour = now.getHours();

    const startHour = currentHour;
    const endHour = currentHour + 1;

    for (let h = startHour; h <= endHour; h++) {
      const utcHour = (h - 7 + 24) % 24;
      const count = bookedCounts[utcHour] || 0;
      if (count >= garageCapacity) {
        if (isWalkIn) return true;

        if (apt.appointmentTime) {
          const [scheduledH] = apt.appointmentTime.split(':').map(Number);
          if (scheduledH !== h) {
            return true;
          }
        } else {
          return true;
        }
      }
    }

    return false;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs space-y-4">
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
        <div className="flex border-b border-slate-100/80">
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th className="py-3 px-4">Mã</th>
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4">Xe</th>
                  <th className="py-3 px-4">Dịch vụ đăng ký</th>
                  <th className="py-3 px-4">Ngày hẹn</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((apt) => {
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
                        {(() => {
                          const statusKey = apt.status.toLowerCase();
                          const config = STATUS_CONFIG[statusKey] || {
                            label: apt.status,
                            color: '#EA580C',
                            bg: '#FED7AA',
                            icon: CheckCircle2,
                          };
                          const Icon = config.icon;
                          return (
                            <span
                              style={{ color: config.color, backgroundColor: config.bg }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                            >
                              <Icon size={12} className={statusKey === 'in_progress' ? 'animate-spin' : ''} />
                              {config.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedAppt(apt)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#00285E] bg-[#EDF3FF] hover:bg-[#D2E2FF] transition-colors"
                          >
                            <Eye size={13} />
                            Chi tiết
                          </button>

                          {apt.hasServiceOrder ? (
                            <button
                              onClick={() => navigate(`/leader/service-orders/${apt.serviceOrderId}`)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#00285E] bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 transition-colors"
                            >
                              <CarFront size={13} />
                              Xem Lệnh S/C
                            </button>
                          ) : (() => {
                            const disabled = isCreateDisabled(apt);
                            return (
                              <button
                                disabled={disabled}
                                onClick={() => navigate(`/leader/appointments/create-service-order?appointmentId=${apt.id}`)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  disabled
                                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                    : 'text-white bg-[#00285E] hover:bg-[#001a3f] transition-colors'
                                }`}
                                title={disabled ? "Không thể tạo hóa đơn dịch vụ do xưởng sẽ quá tải vào các khung giờ tới." : "Tạo hóa đơn dịch vụ"}
                              >
                                <CarFront size={13} />
                                {disabled ? 'Đầy cầu nâng' : 'Tạo hóa đơn dịch vụ'}
                              </button>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col relative animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="text-[#00285E]" size={20} />
                <h3 className="font-bold text-slate-800 text-base">
                  Chi tiết Lịch hẹn APT-{selectedAppt.id.padStart(3, '0')}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAppt(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <XCircle size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Customer and Vehicle information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Section */}
                <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Users size={14} className="text-[#00285E]" />
                    Khách hàng
                  </h4>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800">{selectedAppt.customerName}</p>
                    <p className="text-xs text-slate-500">SĐT: {selectedAppt.customerPhone}</p>
                    {selectedAppt.customerEmail && (
                      <p className="text-xs text-slate-500 truncate">Email: {selectedAppt.customerEmail}</p>
                    )}
                  </div>
                </div>

                {/* Vehicle Section */}
                <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <CarFront size={14} className="text-[#00285E]" />
                    Phương tiện
                  </h4>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800">Biển số: {selectedAppt.vehiclePlate}</p>
                    <p className="text-xs text-slate-500">Mẫu xe: {selectedAppt.vehicleModel}</p>
                    {selectedAppt.vehicleColor && (
                      <p className="text-xs text-slate-500">Màu xe: {selectedAppt.vehicleColor}</p>
                    )}
                    {selectedAppt.vinNumber && (
                      <p className="text-xs text-slate-500">Số khung: {selectedAppt.vinNumber}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Appointment Info */}
              <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock size={14} className="text-[#00285E]" />
                  Thông tin lịch hẹn
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block">NGÀY HẸN</span>
                    <span className="text-slate-800 font-bold block mt-0.5">{formatDate(selectedAppt.appointmentDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">GIỜ HẸN</span>
                    <span className="text-slate-800 font-bold block mt-0.5">{selectedAppt.appointmentTime}</span>
                  </div>
                </div>
                {selectedAppt.notes && (
                  <div className="pt-2 border-t border-slate-200/60 text-xs">
                    <span className="text-slate-400 font-semibold block">GHI CHÚ / YÊU CẦU</span>
                    <p className="text-slate-700 font-medium mt-1 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200/50">
                      {selectedAppt.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Services List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Dịch vụ đã đăng ký
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedAppt.services.map((service, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#EDF3FF] text-[#00285E] border border-[#D2E2FF]"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50">
              <button
                onClick={() => setSelectedAppt(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
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
