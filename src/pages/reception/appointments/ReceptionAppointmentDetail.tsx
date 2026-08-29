import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  Car,
  Wrench,
  StickyNote,
  XCircle,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import type { AppointmentModel } from '../../../model/Appointment';
import { useFetchClient } from '../../../hook/useFetchClient';
import { useSocket } from '../../../hook/useSocket';
import { APPOINTMENT_API_ENDPOINTS } from '../../../constants/reception/appointmentsEndpoints';


const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending: { label: 'Chờ xác nhận', color: '#D97706', bg: '#FEF3C7', icon: Clock },
  confirmed: { label: 'Chờ tiếp nhận', color: '#2563EB', bg: '#DBEAFE', icon: Clock },
  information_received: { label: 'Đã tiếp nhận', color: '#059669', bg: '#D1FAE5', icon: CheckCircle2 },
  in_progress: { label: 'Đã tiếp nhận', color: '#059669', bg: '#D1FAE5', icon: CheckCircle2 },
  completed: { label: 'Đã tiếp nhận', color: '#059669', bg: '#D1FAE5', icon: CheckCircle2 },
  cancelled: { label: 'Đã hủy', color: '#DC2626', bg: '#FEE2E2', icon: XCircle },
  no_show: { label: 'Khách không đến (No Show)', color: '#6B7280', bg: '#F3F4F6', icon: XCircle },
  expired: { label: 'Đã quá hạn (Hủy)', color: '#94A3B8', bg: '#F1F5F9', icon: XCircle },
};

const DEFAULT_STATUS_CONFIG = { label: 'Chưa xác định', color: '#64748B', bg: '#F1F5F9', icon: AlertTriangle };

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
  const socket = useSocket();
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

        if (services.length === 0 && appt.booking_type && appt.booking_type.includes('REPAIR')) {
          services.push('Khám & Sửa chữa');
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
          customerName: appt.customer?.name || appt.customer?.user?.fullName || 'Khách vãng lai',
          customerPhone: appt.customer?.user?.phoneNumber || appt.customer?.phone || '',
          customerEmail: appt.customer?.user?.email || undefined,
          vehiclePlate: appt.vehicle?.license_plate || 'Chưa cập nhật',
          vehicleModel: appt.vehicle?.model
            ? `${appt.vehicle.model.make?.make_name || ''} ${appt.vehicle.model.model_name || ''}`.trim()
            : 'Chưa cập nhật',
          vehicleYear: appt.vehicle?.year || undefined,
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

  // Có cập nhật mới -> BE emit new_notification -> tự tải lại chi tiết
  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = () => {
      loadAppointmentDetail();
    };
    socket.on('new_notification', handleNewNotification);
    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket, id]);

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

  const statusCfg = STATUS_CONFIG[appointment.status] ?? DEFAULT_STATUS_CONFIG;
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
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/reception/appointments')}
            title="Quay lại"
            className="mt-0.5 w-12 h-12 shrink-0 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#00285E] hover:border-slate-300 active:scale-[0.97] transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2">
              Chi tiết Lịch hẹn
            </h1>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-sm font-bold text-slate-500">APT-{appointment.id.padStart(3, '0')}</span>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold"
                style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
              >
                <StatusIcon size={12} />
                {statusCfg.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CHI TIẾT — gộp trong một khối duy nhất, các phần ngăn nhau bằng đường kẻ */}
      <div className="bg-white border border-slate-200 rounded-md divide-y divide-slate-200 overflow-hidden">
        {/* Dải tóm tắt: thông tin cần đọc nhanh nhất khi khách tới quầy */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-200">
          <SummaryCell icon={<Car size={15} />} label="Biển số xe" value={appointment.vehiclePlate} emphasis />
          <SummaryCell
            icon={<Calendar size={15} />}
            label="Ngày hẹn"
            value={appointment.appointmentDate ? formatDate(appointment.appointmentDate) : '—'}
          />
          <SummaryCell icon={<Clock size={15} />} label="Giờ hẹn" value={appointment.appointmentTime || '—'} />
          <SummaryCell
            icon={<Wrench size={15} />}
            label="Số dịch vụ"
            value={`${appointment.services.length} dịch vụ`}
          />
        </div>

        {/* Khách hàng & xe: 2 nhóm lễ tân đối chiếu cùng lúc, đặt cạnh nhau */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          <section className="p-7 lg:p-8">
            <SectionTitle icon={<User size={15} />} label="Khách hàng" />
            <dl className="space-y-5">
              <DetailLine label="Họ và tên" value={appointment.customerName} />
              <DetailLine
                label="Số điện thoại"
                value={appointment.customerPhone || '—'}
                icon={<Phone size={13} className="text-slate-400" />}
              />
              <DetailLine
                label="Email"
                value={appointment.customerEmail || '—'}
                icon={<Mail size={13} className="text-slate-400" />}
              />
            </dl>
          </section>

          <section className="p-7 lg:p-8">
            <SectionTitle icon={<Car size={15} />} label="Phương tiện" />
            <dl className="space-y-5">
              <DetailLine label="Biển số" value={appointment.vehiclePlate} />
              <DetailLine label="Loại xe" value={appointment.vehicleModel} />
              <DetailLine label="Năm sản xuất" value={appointment.vehicleYear?.toString() || '—'} />
            </dl>
          </section>
        </div>

        <section className="p-7 lg:p-8">
          <SectionTitle icon={<Wrench size={15} />} label="Dịch vụ đã đặt" />
          {appointment.services.length === 0 ? (
            <p className="text-sm text-slate-400">Lịch hẹn này chưa chọn dịch vụ cụ thể.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {appointment.services.map((service, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-md"
                >
                  <span className="w-6 h-6 shrink-0 bg-[#00285E] text-white text-[11px] font-bold flex items-center justify-center rounded">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-semibold text-slate-700 truncate">{service}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {appointment.notes && (
          <section className="p-7 lg:p-8">
            <SectionTitle icon={<StickyNote size={15} />} label="Ghi chú" />
            <p className="text-sm text-slate-600 leading-relaxed bg-amber-50 border border-amber-200 rounded-md p-4">
              {appointment.notes}
            </p>
          </section>
        )}

        <section className="p-7 lg:p-8">
          <SectionTitle icon={<Calendar size={15} />} label="Thông tin hệ thống" />
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <DetailLine label="Mã lịch hẹn" value={`APT-${appointment.id.padStart(3, '0')}`} />
            <DetailLine label="Ngày tạo" value={formatDateTime(appointment.createdAt)} />
          </dl>
        </section>
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
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${!info.available
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
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${!info.available
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

// Section heading with a small icon badge
function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <h2 className="flex items-center gap-2.5 mb-4">
      <span className="w-7 h-7 shrink-0 bg-[#EDF3FF] text-[#00285E] flex items-center justify-center">
        {icon}
      </span>
      <span className="text-xs font-bold text-slate-800 uppercase tracking-widest">{label}</span>
    </h2>
  );
}

// Ô tóm tắt ở dải trên cùng — thông tin lễ tân cần liếc thấy ngay, không phải đọc từng dòng.
function SummaryCell({
  icon,
  label,
  value,
  emphasis,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`px-6 py-7 ${emphasis ? 'bg-[#00285E]' : ''}`}>
      <div className={`flex items-center gap-1.5 mb-2 ${emphasis ? 'text-white/60' : 'text-slate-400'}`}>
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <p className={`text-lg font-bold truncate ${emphasis ? 'text-white' : 'text-slate-800'}`}>
        {value}
      </p>
    </div>
  );
}

// Dòng nhãn — giá trị trong các khối chi tiết, nhãn trái / giá trị phải để dễ dò theo cột.
function DetailLine({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 shrink-0">
        {icon}
        {label}
      </dt>
      <dd className="text-sm font-bold text-slate-800 text-right truncate">{value}</dd>
    </div>
  );
}
