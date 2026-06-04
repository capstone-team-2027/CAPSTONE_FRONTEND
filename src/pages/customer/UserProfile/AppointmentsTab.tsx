import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  Calendar,
  Clock,
  Wrench,
  Search,
  Eye,
  X,
  AlertCircle,
  CheckCircle2,
  User,
  MapPin,
  Plus,
  ClipboardList,
  ChevronRight,
  ShieldCheck,
  Ban
} from 'lucide-react';

export interface AppointmentItem {
  id: string;
  date: string;
  time: string;
  vehicleName: string;
  vehiclePlate: string;
  vehicleImage: string;
  serviceCategory: string;
  serviceItems: string[];
  price: number;
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  bay: string;
  advisor: string;
}

const INITIAL_APPOINTMENTS: AppointmentItem[] = [
  {
    id: 'AGM-582103',
    date: '2026-06-04',
    time: '09:30 AM',
    vehicleName: 'Porsche 911 Carrera',
    vehiclePlate: '911-LUX-2023',
    vehicleImage: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=200&q=80',
    serviceCategory: 'Bảo dưỡng định kỳ',
    serviceItems: ['Thay nhớt động cơ Mobil 1', 'Thay lọc nhớt chính hãng', 'Vệ sinh lọc gió động cơ', 'Bảo dưỡng má phanh'],
    price: 2450000,
    status: 'CONFIRMED',
    notes: 'Có tiếng kêu rè rè nhẹ ở gầm bên phụ phía trước khi di chuyển qua gờ giảm tốc.',
    bay: 'Cầu nâng số 1',
    advisor: 'Lê Minh Hoàng',
  },
  {
    id: 'AGM-491283',
    date: '2026-06-10',
    time: '02:00 PM',
    vehicleName: 'BMW M4 Competition',
    vehiclePlate: 'M4-FAST-2022',
    vehicleImage: 'https://images.unsplash.com/photo-1555353540-64580b51c258?auto=format&fit=crop&w=200&q=80',
    serviceCategory: 'Dịch vụ lốp & phanh',
    serviceItems: ['Cân chỉnh thước lái 3D Hunter', 'Đảo lốp xe toàn diện', 'Kiểm tra độ chụm & đĩa phanh'],
    price: 1300000,
    status: 'CONFIRMED',
    notes: 'Kiểm tra tình trạng mòn không đều của lốp trước bên phải.',
    bay: 'Cầu nâng số 3 (Khu vực Hunter 3D)',
    advisor: 'Nguyễn Tuấn Hải',
  },
  {
    id: 'AGM-391204',
    date: '2026-05-18',
    time: '10:30 AM',
    vehicleName: 'Porsche 911 Carrera',
    vehiclePlate: '911-LUX-2023',
    vehicleImage: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=200&q=80',
    serviceCategory: 'Kiểm tra tổng quát',
    serviceItems: ['Kiểm tra 50 điểm kỹ thuật chi tiết', 'Vệ sinh dàn lạnh điều hòa nội soi', 'Thay lọc gió cabin carbon'],
    price: 2200000,
    status: 'COMPLETED',
    notes: 'Bảo dưỡng cấp 2 chuẩn bị đi phượt xa.',
    bay: 'Cầu nâng số 2',
    advisor: 'Trần Đại Nghĩa',
  },
  {
    id: 'AGM-289123',
    date: '2026-04-20',
    time: '08:00 AM',
    vehicleName: 'BMW M4 Competition',
    vehiclePlate: 'M4-FAST-2022',
    vehicleImage: 'https://images.unsplash.com/photo-1555353540-64580b51c258?auto=format&fit=crop&w=200&q=80',
    serviceCategory: 'Chăm sóc nội thất',
    serviceItems: ['Dọn vệ sinh nội thất toàn diện', 'Khử trùng và diệt khuẩn Ozone cabin'],
    price: 1500000,
    status: 'CANCELLED',
    notes: 'Khách hàng bận đi công tác đột xuất ở nước ngoài nên báo hủy lịch hẹn.',
    bay: 'Khu vực Detailing số 1',
    advisor: 'Lê Minh Hoàng',
  },
];

export default function AppointmentsTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<AppointmentItem[]>(INITIAL_APPOINTMENTS);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAppt, setSelectedAppt] = useState<AppointmentItem | null>(null);

  // Filter lists & counts
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      const matchesStatus = selectedStatus === 'ALL' || appt.status === selectedStatus;
      const matchesSearch =
        appt.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appt.vehicleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appt.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appt.serviceCategory.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [appointments, selectedStatus, searchQuery]);

  const counts = useMemo(() => {
    return {
      ALL: appointments.length,
      CONFIRMED: appointments.filter((a) => a.status === 'CONFIRMED').length,
      COMPLETED: appointments.filter((a) => a.status === 'COMPLETED').length,
      CANCELLED: appointments.filter((a) => a.status === 'CANCELLED').length,
    };
  }, [appointments]);

  const handleCancelAppointment = (id: string) => {
    if (confirm(t('appointments.cancelConfirm', 'Bạn có chắc chắn muốn hủy lịch hẹn này?'))) {
      setAppointments((prev) =>
        prev.map((appt) =>
          appt.id === id ? { ...appt, status: 'CANCELLED' as const } : appt
        )
      );
      if (selectedAppt && selectedAppt.id === id) {
        setSelectedAppt((prev) => (prev ? { ...prev, status: 'CANCELLED' as const } : null));
      }
      alert(t('appointments.cancelSuccess', 'Hủy lịch hẹn thành công!'));
    }
  };

  const getStatusConfig = (status: AppointmentItem['status']) => {
    switch (status) {
      case 'CONFIRMED':
        return {
          label: t('appointments.status.confirmed', 'Đã xác nhận'),
          bg: 'bg-blue-50 text-blue-600 border border-blue-100',
          dot: 'bg-blue-500',
        };
      case 'COMPLETED':
        return {
          label: t('appointments.status.completed', 'Đã hoàn thành'),
          bg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
          dot: 'bg-emerald-500',
        };
      case 'CANCELLED':
        return {
          label: t('appointments.status.cancelled', 'Đã hủy'),
          bg: 'bg-rose-50 text-rose-600 border border-rose-100',
          dot: 'bg-rose-500',
        };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-6 text-left"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-2xl font-display font-bold text-brand-blue tracking-tight">
            {t('appointments.historyTitle', 'Lịch sử đặt lịch hẹn')}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {t('appointments.historyDesc', 'Theo dõi trạng thái, thời gian và chi tiết các lịch hẹn dịch vụ của bạn.')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/phone-service')}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-orange hover:bg-brand-orange/90 text-brand-blue font-bold text-xs rounded-xl shadow-md shadow-orange-500/10 transition-all transform hover:-translate-y-0.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('appointments.bookNew', 'Đặt lịch hẹn mới')}</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('appointments.searchPlaceholder', 'Tìm theo xe, biển số, mã hẹn...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-gray-200 focus:border-brand-orange rounded-xl text-xs outline-none transition-all text-brand-blue font-medium"
          />
        </div>

        {/* Filters Slider */}
        <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-thin">
          {[
            { id: 'ALL', label: t('appointments.filter.all', 'Tất cả'), count: counts.ALL },
            { id: 'CONFIRMED', label: t('appointments.filter.confirmed', 'Đã xác nhận'), count: counts.CONFIRMED },
            { id: 'COMPLETED', label: t('appointments.filter.completed', 'Đã hoàn thành'), count: counts.COMPLETED },
            { id: 'CANCELLED', label: t('appointments.filter.cancelled', 'Đã hủy'), count: counts.CANCELLED },
          ].map((tab) => {
            const isActive = selectedStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-brand-blue text-white shadow-xs'
                    : 'bg-slate-50 text-slate-500 border border-gray-100 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-gray-100 shadow-xs text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50/50 flex items-center justify-center text-brand-blue mb-4">
            <ClipboardList className="w-8 h-8 opacity-60" />
          </div>
          <h3 className="font-bold text-sm text-brand-blue">
            {t('appointments.noAppointments', 'Không tìm thấy lịch hẹn nào')}
          </h3>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            {searchQuery
              ? t('appointments.noSearchQueryResults', 'Thử thay đổi từ khóa hoặc điều kiện lọc của bạn.')
              : t('appointments.noAppointmentsDesc', 'Bạn chưa có lịch hẹn đặt trước nào tại Gara của chúng tôi.')}
          </p>
          {!searchQuery && (
            <button
              onClick={() => navigate('/phone-service')}
              className="mt-5 px-5 py-2 bg-brand-blue text-white rounded-xl text-xs font-bold shadow-md hover:bg-brand-blue/95 transition-all cursor-pointer"
            >
              {t('appointments.bookNowLink', 'Đặt lịch hẹn ngay')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAppointments.map((appt) => {
            const conf = getStatusConfig(appt.status);
            return (
              <motion.div
                key={appt.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl border border-gray-100 hover:border-gray-200/80 shadow-xs p-5 flex flex-col justify-between transition-all hover:shadow-md relative overflow-hidden group"
              >
                {/* Status Stripe */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${appt.status === 'CONFIRMED' ? 'bg-blue-500' : appt.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-rose-500'}`} />

                {/* Top Info */}
                <div className="flex justify-between items-start gap-2 mb-4">
                  <div>
                    <span className="font-mono font-bold text-xs text-brand-blue block group-hover:text-brand-orange transition-colors">
                      {appt.id}
                    </span>
                    <div className="flex items-center gap-1.5 text-gray-400 text-[10px] mt-1 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>{appt.date}</span>
                      <span className="text-gray-300">•</span>
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{appt.time}</span>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${conf.bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
                    {conf.label}
                  </span>
                </div>

                {/* Middle Vehicle & Service */}
                <div className="flex gap-4 items-center bg-slate-50/70 p-3 rounded-xl border border-slate-100 mb-4">
                  <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-900 shrink-0 shadow-inner">
                    <img src={appt.vehicleImage} alt={appt.vehicleName} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-grow text-xs">
                    <div className="font-bold text-brand-blue flex items-center gap-1 truncate">
                      <Car className="w-3.5 h-3.5 text-brand-blue" />
                      {appt.vehicleName}
                    </div>
                    <div className="text-[10px] text-gray-400 font-semibold mt-0.5">{appt.vehiclePlate}</div>
                    <div className="text-[10px] text-brand-orange font-bold mt-1 uppercase flex items-center gap-1">
                      <Wrench className="w-3 h-3" />
                      {appt.serviceCategory}
                    </div>
                  </div>
                </div>

                {/* Bottom Total Price & Actions */}
                <div className="flex justify-between items-center border-t border-gray-100 pt-4 mt-auto">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                      {t('appointments.estCost', 'Chi phí ước tính')}
                    </span>
                    <span className="font-mono font-bold text-sm text-brand-blue mt-0.5">
                      {appt.price.toLocaleString()}đ
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedAppt(appt)}
                      className="p-2 bg-blue-50 hover:bg-blue-100 text-brand-blue rounded-xl transition-all cursor-pointer"
                      title={t('appointments.viewDetail', 'Xem chi tiết')}
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {appt.status === 'CONFIRMED' && (
                      <button
                        type="button"
                        onClick={() => handleCancelAppointment(appt.id)}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all cursor-pointer"
                        title={t('appointments.cancel', 'Hủy lịch hẹn')}
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Appointment Detail Overlay Modal */}
      <AnimatePresence>
        {selectedAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAppt(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 max-w-md w-full relative z-10 text-left flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 bg-brand-blue text-white flex justify-between items-center relative shrink-0">
                <div>
                  <div className="text-[9px] uppercase font-bold tracking-widest text-white/50">
                    {t('appointments.apptDetailTitle', 'Phiếu chi tiết lịch hẹn')}
                  </div>
                  <h3 className="text-lg font-bold font-display mt-0.5">{selectedAppt.id}</h3>
                </div>
                <button
                  onClick={() => setSelectedAppt(null)}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors border border-white/5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto space-y-5 flex-grow text-xs text-slate-600 scrollbar-thin">
                {/* Status Badge */}
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="font-bold text-brand-blue">{t('appointments.apptStatus', 'Trạng thái lịch hẹn:')}</span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${getStatusConfig(selectedAppt.status).bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusConfig(selectedAppt.status).dot}`} />
                    {getStatusConfig(selectedAppt.status).label}
                  </span>
                </div>

                {/* Timing & Bay Location */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100/50 space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold block">{t('appointments.apptTime', 'Thời gian hẹn')}</span>
                    <span className="font-bold text-brand-blue flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-brand-orange" />
                      {selectedAppt.time}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold block">{selectedAppt.date}</span>
                  </div>

                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100/50 space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold block">{t('appointments.apptBay', 'Khoang phục vụ')}</span>
                    <span className="font-bold text-brand-blue flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-brand-orange" />
                      {selectedAppt.bay}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold block">{selectedAppt.advisor} (Cố vấn)</span>
                  </div>
                </div>

                {/* Vehicle Section */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-brand-blue uppercase tracking-wider">
                    {t('appointments.apptVehicle', 'Phương tiện đăng ký')}
                  </h4>
                  <div className="flex gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-900 shrink-0 shadow-inner">
                      <img src={selectedAppt.vehicleImage} alt={selectedAppt.vehicleName} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-grow text-xs">
                      <div className="font-bold text-brand-blue flex items-center gap-1 truncate">
                        <Car className="w-3.5 h-3.5 text-brand-blue" />
                        {selectedAppt.vehicleName}
                      </div>
                      <div className="text-[10px] text-gray-400 font-semibold mt-0.5">{selectedAppt.vehiclePlate}</div>
                    </div>
                  </div>
                </div>

                {/* Service Items Section */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-bold text-brand-blue uppercase tracking-wider">
                      {t('appointments.apptServices', 'Hạng mục dịch vụ')}
                    </h4>
                    <span className="text-[10px] text-brand-orange font-bold uppercase">{selectedAppt.serviceCategory}</span>
                  </div>
                  <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {selectedAppt.serviceItems.map((item, idx) => (
                      <div key={idx} className="p-3 bg-white hover:bg-slate-50/50 flex items-center gap-2 font-medium text-slate-700">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-orange shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Diagnostic Notes */}
                {selectedAppt.notes && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-brand-blue uppercase tracking-wider">
                      {t('appointments.apptNotes', 'Ghi chú kỹ thuật / Yêu cầu')}
                    </h4>
                    <div className="p-3.5 bg-amber-50/40 rounded-xl border border-amber-100/50 text-slate-600 leading-relaxed italic text-[11px]">
                      "{selectedAppt.notes}"
                    </div>
                  </div>
                )}

                {/* Total Cost Breakdown */}
                <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                  <span className="font-bold text-brand-blue text-xs">{t('appointments.apptTotal', 'TỔNG CHI PHÍ ƯỚC TÍNH:')}</span>
                  <span className="text-base font-mono font-bold text-brand-orange">{selectedAppt.price.toLocaleString()}đ</span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 shrink-0">
                <button
                  onClick={() => setSelectedAppt(null)}
                  className="flex-1 py-2.5 border border-slate-200 text-gray-600 hover:bg-slate-100 rounded-xl font-bold transition-all text-xs cursor-pointer text-center"
                >
                  {t('common.close', 'Đóng')}
                </button>
                {selectedAppt.status === 'CONFIRMED' && (
                  <button
                    onClick={() => handleCancelAppointment(selectedAppt.id)}
                    className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all text-xs cursor-pointer text-center"
                  >
                    {t('appointments.cancelAppt', 'Hủy lịch hẹn')}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Secured Footer */}
      <div className="flex items-center justify-center gap-1.5 pt-4 border-t border-gray-100 text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-4">
        <ShieldCheck className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span>{t('appointments.securedBy', 'Đảm bảo bởi AGM Intelligent')}</span>
      </div>
    </motion.div>
  );
}
