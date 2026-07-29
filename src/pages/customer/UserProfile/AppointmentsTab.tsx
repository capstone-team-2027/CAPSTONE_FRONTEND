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
import ProfileSectionHeader from './ProfileSectionHeader';

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
  comboItems?: { name: string; price: number; services: { name: string; price: number; laborPrice: number; partPrice: number }[] }[];
  catalogItems?: { name: string; price: number; laborPrice: number; partPrice: number }[];
  price: number;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  bay: string;
  advisor: string;
  booking_type: string;
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
          const comboItems: { name: string; price: number; services: { name: string; price: number; laborPrice: number; partPrice: number }[] }[] = [];
          const catalogItems: { name: string; price: number; laborPrice: number; partPrice: number }[] = [];
          
          const priceMap: Record<number, number> = {
            1: 500000,
            2: 1200000,
            3: 400000,
            4: 800000,
            5: 300000,
            6: 0
          };

          appt.appointmentDetails?.forEach((d: any) => {
            if (d.combo) {
              serviceItems.push(d.combo.combo_name);
              
              const services: { name: string; price: number; laborPrice: number; partPrice: number }[] = [];
              let comboPrice = 0;
              if (d.combo.catalogs && d.combo.catalogs.length > 0) {
                d.combo.catalogs.forEach((c: any) => {
                  const labor = Number(c.labor_price) || 0;
                  const part = Number(c.sparePart?.retail_price) || 0;
                  const catalogPrice = labor + part;
                  
                  comboPrice += catalogPrice;
                  services.push({
                    name: c.service_name,
                    price: catalogPrice,
                    laborPrice: labor,
                    partPrice: part
                  });
                });
              }

              comboItems.push({ name: d.combo.combo_name, price: comboPrice, services });
            }
            if (d.catalog) {
              serviceItems.push(d.catalog.service_name);
              
              const laborPrice = Number(d.catalog.labor_price) || 0;
              const partPrice = Number(d.catalog.sparePart?.retail_price) || 0;
              const catalogPrice = laborPrice + partPrice;

              catalogItems.push({
                name: d.catalog.service_name,
                price: catalogPrice,
                laborPrice,
                partPrice
              });
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

          // Calculate price from database or estimate if fallback needed
          let price = 0;
          if (appt.booking_type !== 'CONSULTATION') {
            const priceMap: Record<number, number> = {
              1: 500000,
              2: 1200000,
              3: 400000,
              4: 800000,
              5: 300000,
              6: 0
            };
            appt.appointmentDetails?.forEach((d: any) => {
              if (d.catalog) {
                const laborPrice = Number(d.catalog.labor_price) || 0;
                const partPrice = Number(d.catalog.sparePart?.retail_price) || 0;
                price += laborPrice + partPrice;
              } else if (d.combo) {
                let comboPrice = 0;
                if (d.combo.catalogs && d.combo.catalogs.length > 0) {
                  d.combo.catalogs.forEach((c: any) => {
                    const labor = Number(c.labor_price) || 0;
                    const part = Number(c.sparePart?.retail_price) || 0;
                    comboPrice += labor + part;
                  });
                }
                price += comboPrice;
              } else {
                // Fallback for missing relationships or manual items
                if (d.catalog_id) {
                  price += priceMap[d.catalog_id] ?? 300000;
                }
                if (d.combo_id) {
                  price += 1500000;
                }
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
      case 'PENDING':
        return {
          label: t('appointments.status.pending', 'Chờ tiếp nhận'),
          bg: 'bg-amber-50 text-amber-600 border border-amber-100',
          dot: 'bg-amber-500',
        };
      case 'CONFIRMED':
        return {
          label: t('appointments.status.confirmed', 'Chờ tiếp nhận'),
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
    return appointments.filter(appt => {
      if (bookingTypeFilter === 'SPECIFIC') {
        return appt.booking_type !== 'CONSULTATION';
      } else {
        return appt.booking_type === 'CONSULTATION';
      }
    });
  }, [appointments, bookingTypeFilter]);

  const serviceAppointments = useMemo(() => {
    return appointments.filter(appt => appt.booking_type !== 'CONSULTATION');
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
        <ProfileSectionHeader
          title={t('appointments.historyTitle', 'Lịch sử đặt lịch hẹn')}
          description={t('appointments.historyDesc', 'Theo dõi trạng thái, thời gian và chi tiết các lịch hẹn dịch vụ của bạn.')}
        />

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
            { id: 'CONFIRMED', label: t('appointments.filter.confirmed', 'Chờ tiếp nhận'), count: counts.CONFIRMED },
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-brand-blue font-bold text-[10px] uppercase tracking-wider">
                  <th className="p-4">{t('appointments.id', 'Mã Lịch Hẹn')}</th>
                  <th className="p-4">{t('appointments.date', 'Thời Gian')}</th>
                  <th className="p-4">{t('appointments.vehicle', 'Xe')}</th>
                  <th className="p-4">{t('appointments.service', 'Loại dịch vụ')}</th>
                  <th className="p-4">{t('appointments.price', 'Chi phí ước tính')}</th>
                  <th className="p-4">{t('appointments.status', 'Trạng Thái')}</th>
                  <th className="p-4 text-center">{t('common.actions', 'Thao Tác')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-slate-600 font-medium">
                {filteredAppointments.map((appt) => {
                  const conf = getStatusConfig(appt.status);
                  return (
                    <tr key={appt.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-brand-blue">{appt.id}</td>
                      <td className="p-4">
                        <div>
                          <div className="font-bold text-brand-blue">{appt.time}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{appt.date}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <div className="font-bold text-brand-blue">{appt.vehiclePlate !== 'N/A' ? appt.vehicleName : 'N/A'}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{appt.vehiclePlate !== 'N/A' ? appt.vehiclePlate : ''}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {appt.serviceCategory}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-800">
                        {appt.booking_type === 'CONSULTATION' 
                          ? 'Miễn phí' 
                          : appt.price > 0 
                            ? `${appt.price.toLocaleString()}đ` 
                            : 'Chờ khám & báo giá'}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${conf.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
                          {conf.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedAppt(appt)}
                            className="p-2 bg-blue-50 hover:bg-blue-100 text-[#00285E] rounded-lg transition-colors cursor-pointer"
                            title={t('appointments.detail', 'Chi tiết lịch hẹn')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                            <button
                              onClick={() => handleCancelAppointment(appt.id, appt.dbId)}
                              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-650 rounded-lg transition-colors cursor-pointer"
                              title={t('appointments.cancel', 'Hủy lịch hẹn')}
                            >
                              <Ban className="w-4 h-4" />
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
              className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 max-w-2xl w-full relative z-10 text-left flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 bg-[#00285E] text-white flex justify-between items-center relative shrink-0">
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
              <div className="p-6 overflow-y-auto space-y-6 flex-grow text-xs text-slate-650 scrollbar-thin">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left Column: Booking details & timing */}
                  <div className="space-y-4">
                    {/* Status Badge */}
                    <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <span className="font-bold text-[#00285E]">{t('appointments.apptStatus', 'Trạng thái:')}</span>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${getStatusConfig(selectedAppt.status).bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusConfig(selectedAppt.status).dot}`} />
                        {getStatusConfig(selectedAppt.status).label}
                      </span>
                    </div>

                    {/* Timing & Bay Location */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                        <span className="text-[10px] text-gray-400 font-bold block">{t('appointments.apptTime', 'Thời gian hẹn')}</span>
                        <span className="font-bold text-[#00285E] flex items-center gap-1 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-brand-orange" />
                          {selectedAppt.time}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold block">{selectedAppt.date}</span>
                      </div>

                      <div className="bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                        <span className="text-[10px] text-gray-400 font-bold block">{t('appointments.apptBay', 'Khoang phục vụ')}</span>
                        <span className="font-bold text-[#00285E] flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-brand-orange" />
                          {selectedAppt.bay}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold block">{selectedAppt.advisor}</span>
                      </div>
                    </div>

                    {/* Vehicle Section */}
                    {selectedAppt.booking_type !== 'CONSULTATION' && selectedAppt.vehiclePlate !== 'N/A' && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-[#00285E] uppercase tracking-wider">
                          {t('appointments.apptVehicle', 'Phương tiện đăng ký')}
                        </h4>
                        <div className="flex gap-3 items-center bg-slate-50/50 p-3 rounded-2xl border border-slate-100 text-left">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-[#00285E] shadow-xs">
                            <Car className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-grow text-xs">
                            <div className="font-bold text-[#00285E] truncate">
                              {selectedAppt.vehicleName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">{selectedAppt.vehiclePlate}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Diagnostic Notes / Consultation Query */}
                    {selectedAppt.notes && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-[#00285E] uppercase tracking-wider">
                          {selectedAppt.booking_type === 'CONSULTATION' ? 'Nội dung yêu cầu tư vấn' : t('appointments.apptNotes', 'Ghi chú / Yêu cầu')}
                        </h4>
                        <div className="p-3.5 bg-amber-50/30 rounded-2xl border border-amber-100/50 text-slate-650 leading-relaxed italic text-[11px] text-left">
                          "{selectedAppt.notes}"
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Services & Cost Breakdown */}
                  <div className="space-y-4 flex flex-col justify-between">
                    {/* Service Items Section */}
                    {selectedAppt.booking_type !== 'CONSULTATION' && (
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[10px] font-bold text-[#00285E] uppercase tracking-wider">
                            {t('appointments.apptServices', 'Hạng mục dịch vụ')}
                          </h4>
                          <span className="text-[10px] text-brand-orange font-bold uppercase">{selectedAppt.serviceCategory}</span>
                        </div>
                        <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-inner max-h-[220px] overflow-y-auto scrollbar-thin">
                          {selectedAppt.comboItems && selectedAppt.comboItems.length > 0 && selectedAppt.comboItems.map((item, idx) => (
                            <div key={`combo-${idx}`} className="p-3.5 bg-white hover:bg-slate-50/50 flex flex-col items-start gap-1 font-medium text-slate-700 text-left">
                              <div className="flex justify-between items-center w-full">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-100 text-purple-600 uppercase tracking-widest shrink-0">Combo</span>
                                  <span className="font-bold text-slate-800 text-xs">{item.name}</span>
                                </div>
                                <span className="font-mono font-bold text-slate-900 text-xs">
                                  {item.price.toLocaleString()}đ
                                </span>
                              </div>
                              {item.services && item.services.length > 0 && (
                                <ul className="mt-2 ml-4 pl-3 border-l border-slate-200 space-y-2 text-[10px] text-slate-500 font-normal w-full">
                                  {item.services.map((srv: any, sIdx) => (
                                    <li key={sIdx} className="relative before:content-[''] before:absolute before:-left-3 before:top-1.5 before:w-1.5 before:h-[1px] before:bg-slate-200 w-[95%]">
                                      <div className="flex justify-between items-center w-full gap-4">
                                        <span className="text-slate-600 truncate">{srv.name}</span>
                                        <span className="font-mono font-bold text-slate-700 shrink-0">
                                          {srv.price.toLocaleString()}đ
                                        </span>
                                      </div>
                                      {srv.partPrice > 0 && (
                                        <div className="text-[8px] text-slate-400 font-medium mt-0.5">
                                          (Công: {srv.laborPrice.toLocaleString()}đ + Phụ tùng: {srv.partPrice.toLocaleString()}đ)
                                        </div>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                          {selectedAppt.catalogItems && selectedAppt.catalogItems.length > 0 && selectedAppt.catalogItems.map((item, idx) => (
                            <div key={`catalog-${idx}`} className="p-3.5 bg-white hover:bg-slate-50/50 flex flex-col gap-1 font-medium text-slate-700 text-left">
                              <div className="flex justify-between items-center w-full">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-brand-orange/10 text-brand-orange uppercase tracking-widest shrink-0">Dịch vụ lẻ</span>
                                  <span className="font-bold text-slate-800 text-xs">{item.name}</span>
                                </div>
                                <span className="font-mono font-bold text-slate-900 text-xs">
                                  {item.price.toLocaleString()}đ
                                </span>
                              </div>
                              {item.partPrice > 0 && (
                                <div className="text-[9px] text-slate-400 font-semibold pl-4">
                                  Công: {item.laborPrice.toLocaleString()}đ + Phụ tùng: {item.partPrice.toLocaleString()}đ
                                </div>
                              )}
                            </div>
                          ))}
                          {(!selectedAppt.comboItems?.length && !selectedAppt.catalogItems?.length) && selectedAppt.serviceItems.map((item, idx) => (
                            <div key={`other-${idx}`} className="p-3.5 bg-white hover:bg-slate-50/50 flex items-center gap-2 font-medium text-slate-700 text-left">
                              <div className="w-1.5 h-1.5 rounded-full bg-brand-orange shrink-0" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Total Cost Breakdown */}
                    <div className="bg-[#EDF3FF] border border-[#D2E2FF] rounded-2xl p-4 mt-auto">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-[#00285E] text-xs uppercase tracking-wider">
                          {selectedAppt.booking_type === 'CONSULTATION' ? 'CHI PHÍ TƯ VẤN:' : t('appointments.apptTotal', 'TỔNG CHI PHÍ ƯỚC TÍNH:')}
                        </span>
                        <span className="text-lg font-mono font-black text-rose-600">
                          {selectedAppt.booking_type === 'CONSULTATION' 
                            ? 'Miễn phí' 
                            : selectedAppt.price > 0 
                              ? `${selectedAppt.price.toLocaleString()}đ` 
                              : 'Chờ khám & báo giá'}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-450 mt-1 font-semibold leading-relaxed">
                        * Chi phí thực tế có thể thay đổi sau khi cố vấn kỹ thuật kiểm tra trực tiếp tình trạng xe tại xưởng.
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 shrink-0">
                <button
                  onClick={() => setSelectedAppt(null)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-xl font-bold transition-all text-xs cursor-pointer text-center"
                >
                  {t('common.close', 'Đóng')}
                </button>
                {(selectedAppt.status === 'PENDING' || selectedAppt.status === 'CONFIRMED') && (
                  <button
                    onClick={() => handleCancelAppointment(selectedAppt.id, selectedAppt.dbId)}
                    className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-all text-xs cursor-pointer text-center"
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
