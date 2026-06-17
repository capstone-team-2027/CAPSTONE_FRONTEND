import { useState, useMemo, useEffect } from 'react';
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
import { useFetchClient } from '../../../hook/useFetchClient';
import { APPOINTMENT_API_ENDPOINTS } from '../../../constants/customer/appointmentsEndpoints';

export interface AppointmentItem {
  id: string;
  dbId: number;
  date: string;
  time: string;
  vehicleName: string;
  vehiclePlate: string;
  vehicleImage: string;
  serviceCategory: string;
  serviceItems: string[];
  comboItems?: { name: string; services: string[] }[];
  catalogItems?: string[];
  price: number;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  bay: string;
  advisor: string;
  booking_type: 'SPECIFIC' | 'CONSULTATION';
}

export default function AppointmentsTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { fetchPrivate } = useFetchClient();

  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [bookingTypeFilter, setBookingTypeFilter] = useState<'SPECIFIC' | 'CONSULTATION'>('SPECIFIC');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAppt, setSelectedAppt] = useState<AppointmentItem | null>(null);

  const loadAppointments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchPrivate(APPOINTMENT_API_ENDPOINTS.GET_APPOINTMENTS);
      if (res && res.success && res.data) {
        // Map backend appointments to AppointmentItem
        const mapped: AppointmentItem[] = res.data.map((appt: any) => {
          // Parse date and time from scheduled_time
          const d = new Date(appt.scheduled_time);
          const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD

          let hours = d.getHours();
          const minutes = String(d.getMinutes()).padStart(2, '0');
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12; // convert 0 to 12
          const timeStr = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;

          // Get vehicle name
          const vehicleName = appt.vehicle
            ? `${appt.vehicle.model?.make?.make_name || ''} ${appt.vehicle.model?.model_name || ''}`.trim()
            : 'N/A';
          const vehiclePlate = appt.vehicle ? appt.vehicle.license_plate : 'N/A';

          // Get service items and service category
          const serviceItems: string[] = [];
          const comboItems: { name: string; services: string[] }[] = [];
          const catalogItems: string[] = [];
          appt.appointmentDetails?.forEach((d: any) => {
            if (d.combo) {
              serviceItems.push(d.combo.combo_name);
              const services = d.combo.catalogs ? d.combo.catalogs.map((c: any) => c.service_name) : [];
              comboItems.push({ name: d.combo.combo_name, services });
            }
            if (d.catalog) {
              serviceItems.push(d.catalog.service_name);
              catalogItems.push(d.catalog.service_name);
            }
          });

          const hasCombo = appt.appointmentDetails?.some((d: any) => d.combo);
          const hasCatalog = appt.appointmentDetails?.some((d: any) => d.catalog);

          const serviceCategory = appt.booking_type === 'CONSULTATION'
            ? 'Yêu cầu tư vấn'
            : (hasCombo && hasCatalog)
              ? 'Combo & Dịch vụ lẻ'
              : hasCombo
                ? 'Gói dịch vụ (Combo)'
                : 'Dịch vụ lẻ';

          // Estimate price if not in DB
          let price = 0;
          if (appt.booking_type === 'SPECIFIC') {
            const priceMap: Record<number, number> = {
              1: 500000,
              2: 1200000,
              3: 400000,
              4: 800000,
              5: 300000,
              6: 0
            };
            appt.appointmentDetails?.forEach((d: any) => {
              if (d.catalog_id) {
                price += priceMap[d.catalog_id] ?? 300000;
              }
              if (d.combo_id) {
                price += 1500000; // default combo price fallback
              }
            });
          }

          return {
            id: `AGM-${appt.id}`, // Format matching visual code
            dbId: appt.id, // Store original db ID
            date: dateStr,
            time: timeStr,
            vehicleName,
            vehiclePlate,
            vehicleImage: appt.vehicleImage || 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=200&q=80',
            serviceCategory,
            serviceItems: serviceItems.length > 0 ? serviceItems : (appt.booking_type === 'CONSULTATION' ? ['Hỗ trợ tư vấn kỹ thuật'] : ['Khác']),
            comboItems,
            catalogItems,
            price,
            status: appt.status,
            notes: appt.notes,
            bay: appt.bay || 'Đang sắp xếp',
            advisor: appt.advisor || 'Đang phân phối',
            booking_type: appt.booking_type
          };
        });
        setAppointments(mapped);
      } else {
        setError("Không thể lấy danh sách lịch hẹn.");
      }
    } catch (err: any) {
      console.error("Lỗi khi tải lịch hẹn:", err);
      setError(err.message || "Đã xảy ra lỗi khi kết nối với máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const handleCancelAppointment = async (id: string, dbId: number) => {
    if (confirm(t('appointments.cancelConfirm', 'Bạn có chắc chắn muốn hủy lịch hẹn này?'))) {
      try {
        const response = await fetchPrivate(`${APPOINTMENT_API_ENDPOINTS.CANCEL_APPOINTMENT}?id=${dbId}`, 'PUT');
        if (response && response.success) {
          alert(t('appointments.cancelSuccess', 'Hủy lịch hẹn thành công!'));
          loadAppointments();
          if (selectedAppt && selectedAppt.id === id) {
            setSelectedAppt(null);
          }
        } else {
          alert(response.message || "Không thể hủy lịch hẹn.");
        }
      } catch (err: any) {
        console.error("Lỗi khi hủy lịch hẹn:", err);
        alert(err.message || "Đã xảy ra lỗi khi hủy lịch hẹn.");
      }
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
      case 'IN_PROGRESS':
        return {
          label: t('appointments.status.inProgress', 'Đang làm'),
          bg: 'bg-purple-50 text-purple-600 border border-purple-100',
          dot: 'bg-purple-500',
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
      default:
        return {
          label: status,
          bg: 'bg-gray-50 text-gray-600 border border-gray-100',
          dot: 'bg-gray-500',
        };
    }
  };

  // Filter lists & counts based on selected booking type
  const currentAppointments = useMemo(() => {
    return appointments.filter(appt => appt.booking_type === bookingTypeFilter);
  }, [appointments, bookingTypeFilter]);

  const serviceAppointments = useMemo(() => {
    return appointments.filter(appt => appt.booking_type === 'SPECIFIC');
  }, [appointments]);

  const supportAppointments = useMemo(() => {
    return appointments.filter(appt => appt.booking_type === 'CONSULTATION');
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    return currentAppointments.filter((appt) => {
      const matchesStatus = selectedStatus === 'ALL' || appt.status === selectedStatus;
      const matchesSearch =
        appt.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appt.vehicleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appt.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appt.serviceCategory.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [currentAppointments, selectedStatus, searchQuery]);

  const counts = useMemo(() => {
    return {
      ALL: currentAppointments.length,
      PENDING: currentAppointments.filter((a) => a.status === 'PENDING').length,
      CONFIRMED: currentAppointments.filter((a) => a.status === 'CONFIRMED').length,
      IN_PROGRESS: currentAppointments.filter((a) => a.status === 'IN_PROGRESS').length,
      COMPLETED: currentAppointments.filter((a) => a.status === 'COMPLETED').length,
      CANCELLED: currentAppointments.filter((a) => a.status === 'CANCELLED').length,
    };
  }, [currentAppointments]);

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

      {/* Booking Type Filter Tabs */}
      <div className="flex border-b border-gray-100 -mt-2">
        <button
          type="button"
          onClick={() => {
            setBookingTypeFilter('SPECIFIC');
            setSelectedStatus('ALL');
          }}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 relative ${bookingTypeFilter === 'SPECIFIC'
            ? 'text-brand-orange border-brand-orange'
            : 'text-gray-400 border-transparent hover:text-brand-blue'
            }`}
        >
          <span>Lịch đặt dịch vụ</span>
          {serviceAppointments.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[9px] bg-slate-100 text-slate-600 rounded-full font-bold">
              {serviceAppointments.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setBookingTypeFilter('CONSULTATION');
            setSelectedStatus('ALL');
          }}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 relative ${bookingTypeFilter === 'CONSULTATION'
            ? 'text-brand-orange border-brand-orange'
            : 'text-gray-400 border-transparent hover:text-brand-blue'
            }`}
        >
          <span>Lịch đặt hỗ trợ</span>
          {supportAppointments.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[9px] bg-slate-100 text-slate-600 rounded-full font-bold">
              {supportAppointments.length}
            </span>
          )}
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
            { id: 'IN_PROGRESS', label: t('appointments.filter.inProgress', 'Đang làm'), count: counts.IN_PROGRESS },
            { id: 'COMPLETED', label: t('appointments.filter.completed', 'Đã hoàn thành'), count: counts.COMPLETED },
            { id: 'CANCELLED', label: t('appointments.filter.cancelled', 'Đã hủy'), count: counts.CANCELLED },
          ].map((tab) => {
            const isActive = selectedStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${isActive
                  ? 'bg-brand-blue text-white shadow-xs'
                  : 'bg-slate-50 text-slate-500 border border-gray-100 hover:bg-slate-100'
                  }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                    }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-xs">
          <div className="w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-gray-400 mt-4">Đang tải lịch hẹn...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-gray-100 shadow-xs text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 mb-4">
            <AlertCircle className="w-8 h-8 opacity-80" />
          </div>
          <h3 className="font-bold text-sm text-brand-blue">
            Không thể tải danh sách lịch hẹn
          </h3>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            {error}
          </p>
          <button
            onClick={loadAppointments}
            className="mt-5 px-5 py-2 bg-brand-blue text-white rounded-xl text-xs font-bold shadow-md hover:bg-brand-blue/95 transition-all cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      ) : filteredAppointments.length === 0 ? (
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
              : bookingTypeFilter === 'SPECIFIC'
                ? 'Bạn chưa có lịch đặt dịch vụ nào tại Gara của chúng tôi.'
                : 'Bạn chưa có lịch đặt hỗ trợ, tư vấn nào.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => navigate('/phone-service')}
              className="mt-5 px-5 py-2 bg-brand-blue text-white rounded-xl text-xs font-bold shadow-md hover:bg-brand-blue/95 transition-all cursor-pointer"
            >
              {bookingTypeFilter === 'SPECIFIC' ? t('appointments.bookNowLink', 'Đặt lịch hẹn ngay') : 'Yêu cầu hỗ trợ ngay'}
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
                className="bg-white rounded-2xl border border-gray-100 hover:border-gray-200/80 shadow-xs p-5 flex flex-col justify-between transition-all hover:shadow-md relative overflow-hidden group text-left"
              >
                {/* Status Stripe */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${appt.status === 'CONFIRMED' ? 'bg-blue-500' : appt.status === 'COMPLETED' ? 'bg-emerald-500' : appt.status === 'PENDING' ? 'bg-amber-500' : 'bg-rose-500'}`} />

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

                {/* Middle Vehicle & Service for SPECIFIC */}
                {appt.booking_type === 'SPECIFIC' && (
                  <div className="flex gap-4 items-center bg-slate-50/70 p-3 rounded-xl border border-slate-100 mb-4">
                    <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-900 shrink-0 shadow-inner">
                      <img src={appt.vehicleImage} alt={appt.vehicleName} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-grow text-xs text-left">
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
                )}

                {/* Middle Support Query for CONSULTATION */}
                {appt.booking_type === 'CONSULTATION' && (
                  <div className="bg-amber-50/30 p-3.5 rounded-xl border border-amber-100/30 mb-4 text-xs text-left">
                    <div className="font-bold text-brand-blue flex items-center gap-1.5 mb-1.5">
                      <AlertCircle className="w-4 h-4 text-brand-orange" />
                      Yêu cầu tư vấn hỗ trợ
                    </div>
                    {appt.notes ? (
                      <p className="text-slate-600 line-clamp-2 italic">"{appt.notes}"</p>
                    ) : (
                      <p className="text-gray-400 italic">Không có ghi chú chi tiết.</p>
                    )}
                  </div>
                )}

                {/* Bottom Total Price & Actions */}
                <div className="flex justify-between items-center border-t border-gray-100 pt-4 mt-auto">
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                      {appt.booking_type === 'CONSULTATION' ? 'Chi phí tư vấn' : t('appointments.estCost', 'Chi phí ước tính')}
                    </span>
                    <span className="font-mono font-bold text-sm text-brand-blue mt-0.5">
                      {appt.booking_type === 'CONSULTATION' ? 'Miễn phí' : `${appt.price.toLocaleString()}đ`}
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

                    {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                      <button
                        type="button"
                        onClick={() => handleCancelAppointment(appt.id, appt.dbId)}
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
                {selectedAppt.booking_type === 'SPECIFIC' && selectedAppt.vehiclePlate !== 'N/A' && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-brand-blue uppercase tracking-wider">
                      {t('appointments.apptVehicle', 'Phương tiện đăng ký')}
                    </h4>
                    <div className="flex gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-900 shrink-0 shadow-inner">
                        <img src={selectedAppt.vehicleImage} alt={selectedAppt.vehicleName} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-grow text-xs text-left">
                        <div className="font-bold text-brand-blue flex items-center gap-1 truncate">
                          <Car className="w-3.5 h-3.5 text-brand-blue" />
                          {selectedAppt.vehicleName}
                        </div>
                        <div className="text-[10px] text-gray-400 font-semibold mt-0.5">{selectedAppt.vehiclePlate}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Service Items Section */}
                {selectedAppt.booking_type === 'SPECIFIC' && (
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-bold text-brand-blue uppercase tracking-wider">
                        {t('appointments.apptServices', 'Hạng mục dịch vụ')}
                      </h4>
                      <span className="text-[10px] text-brand-orange font-bold uppercase">{selectedAppt.serviceCategory}</span>
                    </div>
                    <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {selectedAppt.comboItems && selectedAppt.comboItems.length > 0 && selectedAppt.comboItems.map((item, idx) => (
                        <div key={`combo-${idx}`} className="p-3 bg-white hover:bg-slate-50/50 flex flex-col items-start gap-1 font-medium text-slate-700 text-left">
                          <div className="flex items-center gap-2">
                             <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-100 text-purple-600 uppercase tracking-widest shrink-0">Combo</span>
                             <span>{item.name}</span>
                          </div>
                          {item.services && item.services.length > 0 && (
                             <ul className="mt-1 ml-9 pl-3 border-l-2 border-slate-100 space-y-1 text-[10px] text-slate-500 font-normal">
                                {item.services.map((srv, sIdx) => (
                                   <li key={sIdx} className="relative before:content-[''] before:absolute before:-left-3 before:top-1.5 before:w-1.5 before:h-[1px] before:bg-slate-200">
                                      {srv}
                                   </li>
                                ))}
                             </ul>
                          )}
                        </div>
                      ))}
                      {selectedAppt.catalogItems && selectedAppt.catalogItems.length > 0 && selectedAppt.catalogItems.map((item, idx) => (
                        <div key={`catalog-${idx}`} className="p-3 bg-white hover:bg-slate-50/50 flex items-center gap-2 font-medium text-slate-700 text-left">
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-brand-orange/10 text-brand-orange uppercase tracking-widest shrink-0">Dịch vụ lẻ</span>
                          <span>{item}</span>
                        </div>
                      ))}
                      {(!selectedAppt.comboItems?.length && !selectedAppt.catalogItems?.length) && selectedAppt.serviceItems.map((item, idx) => (
                        <div key={`other-${idx}`} className="p-3 bg-white hover:bg-slate-50/50 flex items-center gap-2 font-medium text-slate-700 text-left">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-orange shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Diagnostic Notes / Consultation Query */}
                {selectedAppt.notes && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-brand-blue uppercase tracking-wider">
                      {selectedAppt.booking_type === 'CONSULTATION' ? 'Nội dung yêu cầu tư vấn' : t('appointments.apptNotes', 'Ghi chú kỹ thuật / Yêu cầu')}
                    </h4>
                    <div className="p-3.5 bg-amber-50/40 rounded-xl border border-amber-100/50 text-slate-600 leading-relaxed italic text-[11px] text-left">
                      "{selectedAppt.notes}"
                    </div>
                  </div>
                )}

                {/* Total Cost Breakdown */}
                <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                  <span className="font-bold text-brand-blue text-xs">
                    {selectedAppt.booking_type === 'CONSULTATION' ? 'CHI PHÍ TƯ VẤN:' : t('appointments.apptTotal', 'TỔNG CHI PHÍ ƯỚC TÍNH:')}
                  </span>
                  <span className="text-base font-mono font-bold text-brand-orange">
                    {selectedAppt.booking_type === 'CONSULTATION' ? 'Miễn phí' : `${selectedAppt.price.toLocaleString()}đ`}
                  </span>
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
                {(selectedAppt.status === 'PENDING' || selectedAppt.status === 'CONFIRMED') && (
                  <button
                    onClick={() => handleCancelAppointment(selectedAppt.id, selectedAppt.dbId)}
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
