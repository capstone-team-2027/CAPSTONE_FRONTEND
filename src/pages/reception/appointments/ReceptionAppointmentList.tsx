import { useState, useMemo, useEffect } from 'react';
import {
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
} from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import type { AppointmentModel } from '../../../model/Appointment';
import { useFetchClient } from '../../../hook/useFetchClient';
import { APPOINTMENT_API_ENDPOINTS } from '../../../constants/reception/appointmentsEndpoints';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending: { label: 'Chờ xác nhận', color: '#D97706', bg: '#FEF3C7', icon: Clock },
  confirmed: { label: 'Đã xác nhận', color: '#2563EB', bg: '#DBEAFE', icon: CheckCircle2 },
  in_progress: { label: 'Đã tiếp nhận (Đang sửa)', color: '#EA580C', bg: '#FED7AA', icon: Loader2 },
  completed: { label: 'Đã tiếp nhận (Hoàn thành)', color: '#059669', bg: '#D1FAE5', icon: CheckCircle2 },
  cancelled: { label: 'Đã hủy', color: '#DC2626', bg: '#FEE2E2', icon: XCircle },
  no_show: { label: 'Khách không đến (No Show)', color: '#6B7280', bg: '#F3F4F6', icon: XCircle },
};

const ITEMS_PER_PAGE = 6;

export default function AppointmentList() {
  const navigate = useNavigate();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  }>();

  const { fetchPrivate } = useFetchClient();
  const [appointments, setAppointments] = useState<AppointmentModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const loadAppointments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetchPrivate(APPOINTMENT_API_ENDPOINTS.GET_APPOINTMENTS);
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

          let appointmentDate = '';
          let appointmentTime = '';
          if (appt.scheduled_time) {
            const dateObj = new Date(appt.scheduled_time);
            appointmentDate = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');
            appointmentTime = String(dateObj.getHours()).padStart(2, '0') + ':' + String(dateObj.getMinutes()).padStart(2, '0');
          }

          const status = (appt.status || 'pending').toLowerCase() as any;

          return {
            id: String(appt.id),
            customerId: appt.customer?.id ? String(appt.customer.id) : '',
            customerName: appt.customer?.user?.fullName || 'Khách vãng lai',
            customerPhone: appt.customer?.user?.phoneNumber || appt.customer?.phone || '',
            customerEmail: appt.customer?.user?.email || undefined,
            vehicleId: appt.vehicle?.id ? String(appt.vehicle.id) : '',
            vehiclePlate: appt.vehicle?.license_plate || 'Chưa cập nhật',
            vehicleModel: appt.vehicle?.model
              ? `${appt.vehicle.model.make?.make_name || ''} ${appt.vehicle.model.model_name || ''}`.trim()
              : 'Chưa cập nhật',
            vehicleYear: appt.vehicle?.year || undefined,
            services,
            appointmentDate,
            appointmentTime,
            notes: appt.notes || '',
            status,
            createdAt: appt.createdAt || appt.created_at || '',
          };
        });
        setAppointments(mapped);
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

  const handleReceiveAppointment = async (apptId: string) => {
    try {
      const response = await fetchPrivate(APPOINTMENT_API_ENDPOINTS.RECEIVE_APPOINTMENT(apptId), 'PUT');
      if (response.success) {
        showToast(`Tiếp nhận xe cho lịch hẹn APT-${apptId.padStart(3, '0')} thành công!`, 'success');
        loadAppointments();
        navigate(`/reception/service-orders/create?appointmentId=${apptId}`);
      } else {
        throw new Error(response.message || 'Lỗi tiếp nhận lịch hẹn');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Lỗi tiếp nhận lịch hẹn', 'warning');
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  // Filtered data
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
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
      } else if (statusFilter === 'received') {
        matchStatus = apt.status === 'in_progress' || apt.status === 'completed';
      } else {
        matchStatus = apt.status === statusFilter;
      }

      return matchSearch && matchStatus;
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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng lịch hẹn', value: kpiCounts.total, icon: <CalendarCheck size={22} />, color: '#00285E', bg: '#EFF6FF' },
          { label: 'Chờ xác nhận', value: kpiCounts.pending, icon: <Clock size={22} />, color: '#D97706', bg: '#FEF3C7' },
          { label: 'Đã xác nhận', value: kpiCounts.confirmed, icon: <CheckCircle2 size={22} />, color: '#2563EB', bg: '#DBEAFE' },
          { label: 'Hoàn thành', value: kpiCounts.completed, icon: <CheckCircle2 size={22} />, color: '#059669', bg: '#D1FAE5' },
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
              { id: 'all', label: 'Tất cả' },
              { id: 'received', label: 'Đã tiếp nhận' },
              { id: 'cancelled', label: 'Đã hủy' }
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { setStatusFilter(tab.id); setCurrentPage(1); }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${isActive
                      ? 'bg-[#00285E] text-white border-[#00285E] shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                >
                  {tab.label}
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
          <div className="overflow-x-auto">
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
                  const statusCfg = STATUS_CONFIG[apt.status];
                  const StatusIcon = statusCfg.icon;
                  return (
                    <tr key={apt.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <span className="font-bold text-[#00285E] text-xs">APT-{apt.id.padStart(3, '0')}</span>
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
                          {(apt.status === 'confirmed' || apt.status === 'pending') && (
                            <button
                              onClick={() => handleReceiveAppointment(apt.id)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#00285E] hover:bg-[#001a3f] transition-colors"
                            >
                              <CarFront size={13} />
                              Tiếp nhận
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
    </div>
  );
}
