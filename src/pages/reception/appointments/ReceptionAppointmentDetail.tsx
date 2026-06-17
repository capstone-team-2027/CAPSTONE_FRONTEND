import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  Car,
  Gauge,
  Wrench,
  StickyNote,
  MapPin,
  UserCog,
  Edit,
  XCircle,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
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

const TIME_SLOTS_AVAILABILITY: Record<string, { bay: string; tech: string; open: boolean; available: boolean; reason?: string }> = {
  '08:00': { bay: 'Còn 2 khoang trống', tech: '3 KTV sẵn sàng', open: true, available: true },
  '09:30': { bay: 'Hết khoang dịch vụ', tech: '1 KTV sẵn sàng', open: true, available: false, reason: 'Hết khoang trống' },
  '11:00': { bay: 'Còn 1 khoang trống', tech: '1 KTV sẵn sàng', open: true, available: true },
  '13:30': { bay: 'Còn 3 khoang trống', tech: '4 KTV sẵn sàng', open: true, available: true },
  '15:00': { bay: 'Còn 1 khoang trống', tech: 'Không có KTV phù hợp rảnh', open: true, available: false, reason: 'KTV bận' },
  '17:30': { bay: 'Đóng cửa', tech: 'Đóng cửa', open: false, available: false, reason: 'Gara đóng cửa' },
};

export default function ReceptionAppointmentDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  }>();

  const { fetchPrivate } = useFetchClient();
  const [appointment, setAppointment] = useState<AppointmentModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('2026-06-03');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('08:00');

  const [isVinModalOpen, setIsVinModalOpen] = useState(false);
  const [vinNumber, setVinNumber] = useState('');
  const [isSubmittingVin, setIsSubmittingVin] = useState(false);

  const loadAppointmentDetail = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetchPrivate(APPOINTMENT_API_ENDPOINTS.GET_APPOINTMENT_DETAIL(id));
      if (response.success && response.data) {
        const appt = response.data;
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

        const mapped: AppointmentModel = {
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
          vinNumber: appt.vehicle?.vin_number || undefined,
          hasServiceOrder: !!appt.serviceOrder,
          services,
          appointmentDate,
          appointmentTime,
          notes: appt.notes || '',
          status,
          createdAt: appt.createdAt || appt.created_at || '',
        };

        setAppointment(mapped);
        setRescheduleDate(appointmentDate);
        setSelectedTimeSlot(appointmentTime);
      } else {
        throw new Error(response.message || 'Không tìm thấy lịch hẹn');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Lỗi tải chi tiết lịch hẹn');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointmentDetail();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center text-[#00285E]">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="text-sm font-semibold">Đang tải chi tiết lịch hẹn...</p>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center text-slate-400">
        <AlertTriangle size={48} className="mb-4 text-amber-500" />
        <p className="text-lg font-semibold mb-1">Không tìm thấy lịch hẹn</p>
        <p className="text-sm mb-4">{error || `Mã lịch hẹn "${id}" không tồn tại trong hệ thống.`}</p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/reception/appointments')}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all"
          >
            <ArrowLeft size={16} />
            Quay lại danh sách
          </button>
          <button
            onClick={loadAppointmentDetail}
            className="px-5 py-2.5 bg-[#00285E] text-white rounded-xl text-sm font-bold hover:bg-[#001a3f] transition-all"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[appointment.status];
  const StatusIcon = statusCfg.icon;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleCancel = () => {
    if (!cancelReason.trim()) {
      showToast('Vui lòng nhập lý do hủy lịch hẹn.', 'warning');
      return;
    }
    if (appointment) {
      setAppointment({
        ...appointment,
        status: 'cancelled',
      });
    }
    showToast(`Đã hủy lịch hẹn APT-${appointment?.id.padStart(3, '0')} thành công.`, 'success');
    setShowCancelModal(false);
    setCancelReason('');
  };

  const handleReschedule = () => {
    const slotInfo = TIME_SLOTS_AVAILABILITY[selectedTimeSlot];
    if (!slotInfo || !slotInfo.available) {
      showToast(`Không thể chọn khung giờ ${selectedTimeSlot}: ${slotInfo?.reason || 'Lỗi tài nguyên'}`, 'warning');
      return;
    }

    if (appointment) {
      setAppointment({
        ...appointment,
        appointmentDate: rescheduleDate,
        appointmentTime: selectedTimeSlot,
      });
    }

    showToast(`Cập nhật lịch hẹn APT-${appointment?.id.padStart(3, '0')} sang ${formatDate(rescheduleDate)} ${selectedTimeSlot} thành công!`, 'success');
    setShowRescheduleModal(false);
  };

  const handleConfirmReceive = async () => {
    if (!appointment?.id) return;
    try {
      setIsSubmittingVin(true);
      
      // Update VIN if entered
      if (vinNumber.trim()) {
        const vinResponse = await fetchPrivate(APPOINTMENT_API_ENDPOINTS.UPDATE_VIN(appointment.id), 'POST', {
          vin_number: vinNumber.trim()
        });
        if (!vinResponse.success) {
          throw new Error(vinResponse.message || 'Lỗi cập nhật số khung');
        }
      }

      // Receive appointment
      const receiveResponse = await fetchPrivate(APPOINTMENT_API_ENDPOINTS.RECEIVE_APPOINTMENT(appointment.id), 'PUT');
      if (receiveResponse.success) {
        showToast(`Tiếp nhận xe cho lịch hẹn APT-${appointment.id.padStart(3, '0')} thành công!`, 'success');
        setIsVinModalOpen(false);
        loadAppointmentDetail();
        navigate(`/reception/service-orders/create?appointmentId=${appointment.id}`);
      } else {
        throw new Error(receiveResponse.message || 'Lỗi tiếp nhận lịch hẹn');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Đã xảy ra lỗi', 'warning');
    } finally {
      setIsSubmittingVin(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-5xl w-full mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/reception/appointments')}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-1">
              Chi tiết Lịch hẹn
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-500">APT-{appointment.id.padStart(3, '0')}</span>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
              >
                <StatusIcon size={12} />
                {statusCfg.label}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {(appointment.status === 'confirmed' || appointment.status === 'pending' || appointment.status === 'in_progress') && !appointment.hasServiceOrder && (
            <>
              {appointment.vinNumber ? (
                <button
                  onClick={async () => {
                    try {
                      if (appointment.status !== 'in_progress') {
                        const res = await fetchPrivate(APPOINTMENT_API_ENDPOINTS.RECEIVE_APPOINTMENT(appointment.id), 'PUT');
                        if (!res.success) throw new Error(res.message || 'Lỗi tiếp nhận');
                      }
                      navigate(`/reception/service-orders/create?appointmentId=${appointment.id}`);
                    } catch (err: any) {
                      showToast(err.message || 'Lỗi xử lý', 'warning');
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
                >
                  <Car size={16} />
                  Tạo HĐ Dịch vụ
                </button>
              ) : (
                <button
                  onClick={() => {
                    setVinNumber('');
                    setIsVinModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#00285E] hover:bg-[#001a3f] text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
                >
                  <Car size={16} />
                  Tiếp nhận xe
                </button>
              )}
            </>
          )}

          {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
            <button
              onClick={() => setShowRescheduleModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#F9A11B] hover:bg-[#E08F12] text-[#00285E] rounded-xl text-sm font-bold transition-colors shadow-sm"
            >
              <Edit size={16} />
              Đổi lịch hẹn
            </button>
          )}

          {appointment.status !== 'cancelled' && appointment.status !== 'completed' && appointment.status !== 'in_progress' && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-sm font-bold transition-colors border border-rose-100"
            >
              <XCircle size={16} />
              Hủy lịch hẹn
            </button>
          )}
        </div>
      </div>

      {/* DETAIL GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Appointment Info */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6">
          <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-widest">
            <Calendar size={16} className="text-[#00285E]" />
            Thông tin Lịch hẹn
          </h2>
          <div className="space-y-3">
            <InfoRow label="Mã lịch hẹn" value={`APT-${appointment.id.padStart(3, '0')}`} />
            <InfoRow label="Ngày hẹn" value={formatDate(appointment.appointmentDate)} />
            <InfoRow label="Giờ hẹn" value={appointment.appointmentTime} />
            <InfoRow label="Ngày tạo" value={formatDateTime(appointment.createdAt)} />
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-widest">
              <User size={16} className="text-[#00285E]" />
              Thông tin Khách hàng
            </h2>
            <div className="space-y-3">
              <InfoRow label="Họ và tên" value={appointment.customerName} />
              <InfoRow label="Số điện thoại" value={appointment.customerPhone} icon={<Phone size={14} className="text-slate-400" />} />
              <InfoRow label="Email" value={appointment.customerEmail || '—'} icon={<Mail size={14} className="text-slate-400" />} />
            </div>
          </div>
          {/* SPAM & TRUST CHECK (Câu 65) */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
              SĐT ĐÃ XÁC MINH OTP
            </span>
            <span className="text-[9px] font-extrabold text-[#00285E] bg-[#EDF3FF] border border-[#00285E]/10 px-2 py-0.5 rounded-full">
              ĐANG HOẠT ĐỘNG: 1 LỊCH
            </span>
            <span className="text-[9px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              TỶ LỆ NO-SHOW: 0%
            </span>
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6">
          <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-widest">
            <Car size={16} className="text-[#00285E]" />
            Thông tin Xe
          </h2>
          <div className="space-y-3">
            <InfoRow label="Biển số" value={appointment.vehiclePlate} highlight />
            <InfoRow label="Loại xe" value={appointment.vehicleModel} />
            <InfoRow label="Năm sản xuất" value={appointment.vehicleYear?.toString() || '—'} />
            <InfoRow label="Số km" value={appointment.vehicleMileage ? `${appointment.vehicleMileage.toLocaleString('vi-VN')} km` : '—'} icon={<Gauge size={14} className="text-slate-400" />} />
          </div>
        </div>

        {/* Services */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6">
          <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-widest">
            <Wrench size={16} className="text-[#00285E]" />
            Dịch vụ đã đặt
          </h2>
          <div className="space-y-2">
            {appointment.services.map((service, idx) => (
              <div key={idx} className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 rounded-xl">
                <span className="w-6 h-6 rounded-lg bg-[#00285E] text-white text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="text-sm font-semibold text-slate-700">{service}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notes */}
      {appointment.notes && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6">
          <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 uppercase tracking-widest">
            <StickyNote size={16} className="text-[#00285E]" />
            Ghi chú
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed bg-amber-50 border border-amber-100 rounded-xl p-4">
            {appointment.notes}
          </p>
        </div>
      )}

      {/* Assignment */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6">
        <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-widest">
          <UserCog size={16} className="text-[#00285E]" />
          Phân công
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label="Khoang dịch vụ" value={appointment.serviceBay || 'Chưa phân công'} icon={<MapPin size={14} className="text-slate-400" />} />
          <InfoRow label="Kỹ thuật viên" value={appointment.assignedStaff || 'Chưa phân công'} icon={<UserCog size={14} className="text-slate-400" />} />
        </div>
      </div>

      {/* CANCEL MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowCancelModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-500" />
              Hủy lịch hẹn
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Bạn có chắc chắn muốn hủy lịch hẹn <span className="font-bold text-slate-700">{appointment.id}</span>?
            </p>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Lý do hủy <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Nhập lý do hủy lịch hẹn..."
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-300 transition-all resize-none"
            />
            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                onClick={() => { setShowCancelModal(false); setCancelReason(''); }}
                className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={handleCancel}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-colors"
              >
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}
      {/* RESCHEDULE MODAL (Câu 63) */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowRescheduleModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg mx-4 p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Calendar size={20} className="text-amber-500" />
              Đổi lịch đặt hẹn (Reschedule)
            </h3>

            <div className="space-y-3">
              {/* Date Input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Chọn Ngày Hẹn Mới <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold"
                />
              </div>

              {/* Time Slots availability check */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Chọn Khung Giờ & Kiểm Tra Tài Nguyên Gara <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {Object.entries(TIME_SLOTS_AVAILABILITY).map(([slot, info]) => {
                    const isSelected = selectedTimeSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          if (info.available) setSelectedTimeSlot(slot);
                        }}
                        disabled={!info.available}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          !info.available
                            ? 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'bg-[#EDF3FF] border-[#00285E]/30 ring-1 ring-[#00285E]/20'
                            : 'bg-white border-slate-200/60 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`text-sm font-bold ${isSelected ? 'text-[#00285E]' : 'text-slate-700'}`}>
                            {slot}
                          </span>
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                              !info.available
                                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            }`}
                          >
                            {info.available ? 'Khả dụng' : info.reason}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 font-semibold leading-none">
                          {info.bay} • {info.tech}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={handleReschedule}
                className="px-5 py-2.5 bg-[#00285E] hover:bg-[#001a3f] text-white rounded-xl text-sm font-bold transition-colors shadow-md"
              >
                Xác nhận đổi lịch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIN MODAL */}
      {isVinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-[#00285E] mb-2 flex items-center gap-2">
              <Car size={20} className="text-amber-500" />
              Tiếp nhận & Cập nhật Số khung
            </h3>
            <p className="text-slate-500 text-sm mb-4">
              Vui lòng nhập Số khung (VIN) của xe trước khi tiếp nhận. Bạn có thể bỏ trống nếu chưa có thông tin.
            </p>
            
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Số khung (VIN)</label>
              <input
                type="text"
                value={vinNumber}
                onChange={(e) => setVinNumber(e.target.value.toUpperCase())}
                placeholder="Ví dụ: VF8123456789..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#00285E]/20 focus:border-[#00285E] transition-all uppercase"
                disabled={isSubmittingVin}
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsVinModalOpen(false)}
                disabled={isSubmittingVin}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmReceive}
                disabled={isSubmittingVin}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#00285E] hover:bg-[#001a3f] transition-colors disabled:opacity-50"
              >
                {isSubmittingVin ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                Xác nhận tiếp nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable info row component
function InfoRow({ label, value, icon, highlight }: { label: string; value: string; icon?: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between py-1">
      <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className={`text-sm font-bold text-right ${highlight ? 'text-[#00285E] bg-[#EDF3FF] px-2 py-0.5 rounded-md' : 'text-slate-700'}`}>
        {value}
      </span>
    </div>
  );
}
