import { useState, useMemo, useEffect, useRef } from 'react';
import {
  ClipboardPlus,
  ArrowLeft,
  Calendar,
  User,
  Phone,
  Car,
  Wrench,
  CheckSquare,
  Square,
  StickyNote,
  AlertCircle,
  Settings,
  Search,
  UserCheck,
  PlusCircle,
  Layers,
  Package,
  Folder,
  ChevronDown,
  ChevronUp,
  Tag,
  Clock,
} from 'lucide-react';
import { useNavigate, useParams, useLocation, useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import * as PhoneInputLib from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { useFetchClient_v2 } from '../../../hook/useFetchClient';
import { APPOINTMENT_API_ENDPOINTS } from '../../../constants/reception/appointmentsEndpoints';
import { SEARCH_API_ENDPOINTS } from '../../../constants/reception/searchEndpoints';
import { SERVICE_API_ENDPOINTS } from '../../../constants/customer/serviceApiEndpoints';
import type { ServiceCombo, ServiceItem as CustomerServiceItem } from '../../../model/Service';
import { useTranslation } from 'react-i18next';
import { VEHICLE_MAKE_MODEL_API_ENDPOINTS } from '../../../constants/customer/vehicelMakeModelEndpoint';
import { GARAGE_CONFIG_API_ENDPOINTS } from '../../../constants/customer/garage_configurationsEndpoints';
import SingleServicesSelector from '../../customer/Booking/SingleServicesSelector';
import ComboServicesSelector from '../../customer/Booking/ComboServicesSelector';



// ========== MOCK: Available combos ==========
interface ComboItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  services: string[];
}

// ── resolve PhoneInput default export ─────────────────────────
type Mod = { default?: unknown };
function resolveDefault<T>(mod: unknown): T {
  const m = mod as Mod;
  if (m && typeof m === 'object' && 'default' in m) {
    const d = m.default as unknown;
    if (d && typeof d === 'object' && 'default' in (d as Mod)) return (d as Mod).default as T;
    return d as T;
  }
  return mod as T;
}
type PhoneInputProps = {
  country?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  enableSearch?: boolean;
  searchPlaceholder?: string;
  inputProps?: { name?: string };
};
const PhoneInput = resolveDefault<React.ComponentType<PhoneInputProps>>(PhoneInputLib);

const phoneStyles = `
    .login-phone .react-tel-input .form-control {
        width: 100% !important;
        height: 48px !important;
        background: white !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 0.75rem !important;
        padding: 0 20px 0 58px !important;
        font-size: 14px !important;
        color: #0f172a !important;
        letter-spacing: 0.3px !important;
        outline: none !important;
        transition: all 0.2s !important;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
    }
    .login-phone .react-tel-input .form-control:focus {
        border-color: #00285E !important;
        box-shadow: 0 0 0 2px rgba(0,40,94,0.1) !important;
    }
    .login-phone .react-tel-input .flag-dropdown {
        background: white !important;
        border: 1px solid #e2e8f0 !important;
        border-right: none !important;
        border-radius: 0.75rem 0 0 0.75rem !important;
    }
    .login-phone .react-tel-input .flag-dropdown:hover,
    .login-phone .react-tel-input .flag-dropdown.open {
        background: #f8fafc !important;
    }
    .login-phone .react-tel-input .selected-flag {
        background: transparent !important;
        padding: 0 8px 0 14px !important;
        border-radius: 0.75rem 0 0 0.75rem !important;
    }
`;

const MOCK_APPOINTMENT_DATA: Record<string, any> = {};
const MOCK_EXISTING_CUSTOMERS: any[] = [];



export default function ReceptionRescueCreateServiceOrder() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  }>();

  const { rescueId } = useParams();
  const location = useLocation();
  const customer = location.state?.customer;

  // Mode is always approved_record for Rescue
  const mode = 'approved_record';

  // Search in Tab 1
  const [recordSearch, setRecordSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // Walk-in mode manual entry
  const [manualCustName, setManualCustName] = useState('');
  const [manualCustPhone, setManualCustPhone] = useState('');

  // Vehicle Selection States for existing customers
  const [vehicleInputMode, setVehicleInputMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [selectedCustomerVehicleId, setSelectedCustomerVehicleId] = useState<string>('');

  const [manualVehiclePlate, setManualVehiclePlate] = useState('');
  const [manualVehicleYear, setManualVehicleYear] = useState('');

  // Vehicle autocomplete states
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [brandSuggestions, setBrandSuggestions] = useState<any[]>([]);
  const [modelSuggestions, setModelSuggestions] = useState<any[]>([]);
  const [selectedMakeId, setSelectedMakeId] = useState<number | null>(null);
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);

  const brandRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);

  // Slots Capacity states
  const [appointments, setAppointments] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([
    { start_time: '08:00', end_time: '12:00' },
    { start_time: '13:00', end_time: '17:00' }
  ]);
  const [bufferMinutes, setBufferMinutes] = useState<number>(90);
  const [garageCapacity, setGarageCapacity] = useState<number>(1);
  const [bookedCounts, setBookedCounts] = useState<Record<string, number>>({});
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [linkedAppointmentId, setLinkedAppointmentId] = useState<string | null>(null);
  const [showSlotsBoard, setShowSlotsBoard] = useState(false);

  const [bookingDate, setBookingDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [bookingTime, setBookingTime] = useState('');

  const minDateStr = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);



  // Common fields
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [selectedCombos, setSelectedCombos] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState(''); // Mô tả tình trạng hỏng hóc
  const [receptionServiceMode, setReceptionServiceMode] = useState<'SERVICE' | 'REPAIR'>('REPAIR');
  const [serviceSearch, setServiceSearch] = useState('');
  const [comboSearch, setComboSearch] = useState('');
  const [activeServiceTab, setActiveServiceTab] = useState<'single' | 'combo' | 'category'>('single');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { fetchPrivate, fetchPublic } = useFetchClient_v2();
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic Data States for Services
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [selectedComboId, setSelectedComboId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [servicePage, setServicePage] = useState(1);
  const [dbServices, setDbServices] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [dbCombos, setDbCombos] = useState<ServiceCombo[]>([]);

  // Load dynamic categories & services from backend
  useEffect(() => {
    const loadDbData = async () => {
      try {
        const catRes = await fetchPrivate(SERVICE_API_ENDPOINTS.GET_CATEGORIES);
        if (catRes && catRes.data) {
          setDbCategories(catRes.data);
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu categories:", error);
      }

      try {
        const svcRes = await fetchPrivate(SERVICE_API_ENDPOINTS.GET_SERVICES);
        if (svcRes && svcRes.data) {
          const servicesData = Array.isArray(svcRes.data) ? svcRes.data : (svcRes.data.items || []);
          setDbServices(servicesData);
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu services:", error);
      }

      try {
        const comboRes = await fetchPrivate(SERVICE_API_ENDPOINTS.GET_COMBOS);
        if (comboRes && comboRes.data) {
          const comboData = Array.isArray(comboRes.data) ? comboRes.data : (comboRes.data.items || []);
          const mappedCombos = comboData.map((c: any) => {
            const serviceIds = (c.catalogs || []).map((cat: any) => cat.id);
            return {
              id: c.id,
              combo_name: c.combo_name,
              category_id: c.catalogs?.[0]?.category_id || 1,
              service_ids: serviceIds,
              discount_percentage: 10,
              is_active: c.is_active,
              createdAt: c.createdAt || new Date().toISOString(),
            };
          });
          setDbCombos(mappedCombos);
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu combos:", error);
      }
    };
    loadDbData();
  }, []);

  // Load garage configurations and appointments for slots capacity monitor
  useEffect(() => {
    const loadGarageConfigs = async () => {
      try {
        const bufferRes = await fetchPrivate(GARAGE_CONFIG_API_ENDPOINTS.GET_CONFIGURATION_BY_KEY("BUFFER_TIME_MINUTES"));
        if (bufferRes && bufferRes.success && bufferRes.data) {
          const parsedVal = parseInt(bufferRes.data.config_value, 10);
          if (!isNaN(parsedVal) && parsedVal > 0) {
            setBufferMinutes(parsedVal);
          }
        }
      } catch (error) {
        console.error("Lỗi khi tải cấu hình BUFFER_TIME_MINUTES:", error);
      }

      try {
        const dateParam = selectedDate ? `?date=${selectedDate}` : '';
        const availRes = await fetchPrivate(GARAGE_CONFIG_API_ENDPOINTS.GET_AVAILABILITY + dateParam);
        const data = availRes?.data ?? availRes;
        if (data) {
          if (Array.isArray(data.shifts)) {
            setShifts(data.shifts.length > 0 ? data.shifts : [
              { start_time: '08:00', end_time: '12:00' },
              { start_time: '13:00', end_time: '17:00' }
            ]);
          }
          if (data.capacity !== undefined) setGarageCapacity(data.capacity);
          if (data.bookedCounts) setBookedCounts(data.bookedCounts);
        }
      } catch (error) {
        console.error("Lỗi khi tải ca làm việc và tình trạng sức chứa:", error);
      }
    };

    const loadAppointments = async () => {
      try {
        const response = await fetchPrivate(APPOINTMENT_API_ENDPOINTS.GET_APPOINTMENTS);
        if (response.success && Array.isArray(response.data)) {
          const mapped = response.data.map((appt: any) => {
            let appointmentDate = '';
            let appointmentTime = '';
            if (appt.scheduled_time) {
              const dateObj = new Date(appt.scheduled_time);
              appointmentDate = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');
              appointmentTime = String(dateObj.getHours()).padStart(2, '0') + ':' + String(dateObj.getMinutes()).padStart(2, '0');
            }
            return {
              id: String(appt.id),
              customerId: appt.customer?.id ? String(appt.customer.id) : '',
              customerName: appt.customer?.user?.fullName || appt.customer?.name || 'Khách vãng lai',
              customerPhone: appt.customer?.user?.phoneNumber || appt.customer?.phone || '',
              vehicleId: appt.vehicle?.id ? String(appt.vehicle.id) : '',
              vehiclePlate: appt.vehicle?.license_plate || 'Chưa cập nhật',
              vehicleModel: appt.vehicle?.model
                ? `${appt.vehicle.model.make?.make_name || ''} ${appt.vehicle.model.model_name || ''}`.trim()
                : 'Chưa cập nhật',
              appointmentDate,
              appointmentTime,
              status: (appt.status || 'pending').toLowerCase(),
              bookingType: appt.booking_type || '',
            };
          });
          setAppointments(mapped);
        }
      } catch (error) {
        console.error("Lỗi khi tải lịch hẹn:", error);
      }
    };

    loadGarageConfigs();
    loadAppointments();
  }, [selectedDate]);

  // Synchronize slots board date with booking date
  useEffect(() => {
    setSelectedDate(bookingDate);
  }, [bookingDate]);

  const timeSlots = useMemo(() => {
    const slots: { time: string; label: string; isFull: boolean; count: number }[] = [];
    shifts.forEach(shift => {
      const [startH, startM] = (shift.start_time || "").split(':').map(Number);
      const [endH, endM] = (shift.end_time || "").split(':').map(Number);
      if (isNaN(startH) || isNaN(endH)) return;

      let currentMinutes = startH * 60 + (startM || 0);
      const endMinutes = endH * 60 + (endM || 0);

      while (currentMinutes < endMinutes) {
        const h = Math.floor(currentMinutes / 60);
        const m = currentMinutes % 60;
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const label = h < 12 ? 'Sáng' : 'Chiều';

        const utcHour = (h - 7 + 24) % 24;
        const count = bookedCounts[utcHour] || 0;
        const isFull = count >= garageCapacity;

        slots.push({ time: timeStr, label, isFull, count });
        currentMinutes += bufferMinutes;
      }
    });

    let finalSlots = slots;
    if (bookingDate === minDateStr) {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      finalSlots = slots.map(slot => {
        const [slotH, slotM] = slot.time.split(':').map(Number);
        const slotMinutes = slotH * 60 + slotM;
        // Disable past slots for today
        if (slotMinutes < nowMinutes) {
          return { ...slot, isFull: true };
        }
        return slot;
      });
    }

    return finalSlots;
  }, [shifts, bufferMinutes, bookedCounts, garageCapacity, bookingDate, minDateStr]);

  const slotAppointments = useMemo(() => {
    const map: Record<string, any[]> = {};
    appointments.forEach(apt => {
      if (apt.appointmentDate === selectedDate) {
        const timeKey = apt.appointmentTime;
        if (!map[timeKey]) map[timeKey] = [];
        map[timeKey].push(apt);
      }
    });
    return map;
  }, [appointments, selectedDate]);



  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (brandRef.current && !brandRef.current.contains(event.target as Node)) {
        setShowBrandSuggestions(false);
      }
      if (modelRef.current && !modelRef.current.contains(event.target as Node)) {
        setShowModelSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Debounce fetch Vehicle Brands
  useEffect(() => {
    if (!vehicleBrand.trim()) {
      setBrandSuggestions([]);
      return;
    }

    const delayFn = setTimeout(async () => {
      try {
        const res = await fetchPublic(VEHICLE_MAKE_MODEL_API_ENDPOINTS.GET_VEHICLE_MAKES, "POST", { search: vehicleBrand });
        if (res && res.data) {
          setBrandSuggestions(res.data);
        }
      } catch (error) {
        console.error("Lỗi khi tìm kiếm hãng xe:", error);
      }
    }, 500);

    return () => clearTimeout(delayFn);
  }, [vehicleBrand, fetchPublic]);

  // Debounce fetch Vehicle Models
  useEffect(() => {
    if (!vehicleModel.trim()) {
      setModelSuggestions([]);
      return;
    }

    const delayFn = setTimeout(async () => {
      try {
        const body: any = { search: vehicleModel };
        if (selectedMakeId) body.make_id = selectedMakeId;

        const res = await fetchPublic(VEHICLE_MAKE_MODEL_API_ENDPOINTS.GET_VEHICLE_MODELS, "POST", body);
        if (res && res.data) {
          setModelSuggestions(res.data);
        }
      } catch (error) {
        console.error("Lỗi khi tìm kiếm dòng xe:", error);
      }
    }, 500);

    return () => clearTimeout(delayFn);
  }, [vehicleModel, selectedMakeId, fetchPublic]);

  const activeCategories = useMemo(() => {
    return dbCategories.filter((c: any) => c.is_active !== false);
  }, [dbCategories]);

  const activeDbServices = useMemo(() => {
    return dbServices.filter((s: any) => s.is_active !== false && !s.is_default_inspection_service);
  }, [dbServices]);

  const mappedServices: CustomerServiceItem[] = useMemo(() => {
    return activeDbServices.map((s: any) => {
      const priceValue = s.price || s.base_price || 0;
      const discountPercent = s.discount_percentage || 0;
      const originalPriceValue = discountPercent > 0 && priceValue > 0 ? Math.round(priceValue / (1 - discountPercent / 100)) : 0;
      const originalPriceStr = originalPriceValue > 0 ? `Từ ${originalPriceValue.toLocaleString("vi-VN")} VND` : "";

      const ratingVal = s.rating || 5.0;
      const reviewVal = s.review_count || 0;

      let detailsList = s.details || [];
      if (!Array.isArray(detailsList)) {
        detailsList = [detailsList];
      }
      if (detailsList.length === 0) {
        detailsList = [s.description || "Chi tiết dịch vụ chưa được cập nhật."];
      }

      return {
        id: s.id,
        title: s.service_name,
        desc: s.description || "",
        price: priceValue > 0 ? `Từ ${priceValue.toLocaleString("vi-VN")} VND` : "Liên hệ",
        numericPrice: priceValue,
        originalPrice: originalPriceStr || undefined,
        discountPercentage: discountPercent > 0 ? discountPercent : undefined,
        promoText: s.promo_text || "",
        rating: ratingVal,
        reviewCount: reviewVal,
        badge: s.badge || undefined,
        details: detailsList,
        category_id: s.category_id,
        sparePartName: s.sparePart ? s.sparePart.name : undefined
      };
    });
  }, [activeDbServices]);

  const SERVICES_PER_PAGE = 8;
  const filteredServices = useMemo(() => {
    let list = mappedServices;
    if (selectedCategoryId !== null) {
      list = list.filter(service => String(service.category_id) === String(selectedCategoryId));
    }
    const query = serviceSearch.trim().toLowerCase();
    if (query) {
      list = list.filter(service =>
        service.title.toLowerCase().includes(query) ||
        (service.desc || '').toLowerCase().includes(query)
      );
    }
    return list;
  }, [mappedServices, selectedCategoryId, serviceSearch]);

  const serviceTotalPages = Math.max(1, Math.ceil(filteredServices.length / SERVICES_PER_PAGE));
  const currentPageServices = useMemo(() => {
    const start = (servicePage - 1) * SERVICES_PER_PAGE;
    return filteredServices.slice(start, start + SERVICES_PER_PAGE);
  }, [filteredServices, servicePage]);

  useEffect(() => {
    setServicePage(1);
  }, [selectedCategoryId, serviceSearch]);

  useEffect(() => {
    if (servicePage > serviceTotalPages) setServicePage(serviceTotalPages);
  }, [servicePage, serviceTotalPages]);

  useEffect(() => {
    const loadFullCustomer = async () => {
      if (!customer) {
        showToast('Không tìm thấy thông tin khách hàng từ luồng cứu hộ. Đang tải...', 'info');
        return;
      }

      const phone = customer.phone || customer.user?.phoneNumber;
      if (!phone) {
        const customerRecord = {
          type: 'customer',
          id: customer.id,
          name: customer.name || customer.customer_name || customer.user?.fullName || 'Khách vãng lai',
          phone: '',
          vehicles: customer.vehicles || []
        };
        handleSelectRecord(customerRecord);
        return;
      }

      setIsLoadingRecord(true);
      try {
        const res = await fetchPrivate(SEARCH_API_ENDPOINTS.CUSTOMER_INFO_BY_PHONE, 'POST', { phone });
        if (res && res.success && res.data && res.data.customer) {
          const fullCustomer = res.data.customer;
          const customerRecord = {
            type: 'customer',
            id: fullCustomer.id,
            name: fullCustomer.name || fullCustomer.customer_name || 'Khách vãng lai',
            phone: fullCustomer.phone,
            vehicles: fullCustomer.vehicles || []
          };
          handleSelectRecord(customerRecord);
        } else {
          // Fallback
          const customerRecord = {
            type: 'customer',
            id: customer.id,
            name: customer.name || customer.customer_name || customer.user?.fullName || 'Khách vãng lai',
            phone,
            vehicles: customer.vehicles || []
          };
          handleSelectRecord(customerRecord);
        }
      } catch (err) {
        console.error("Lỗi khi tải thông tin xe khách hàng", err);
        // Fallback
        const customerRecord = {
          type: 'customer',
          id: customer.id,
          name: customer.name || customer.customer_name || customer.user?.fullName || 'Khách vãng lai',
          phone,
          vehicles: customer.vehicles || []
        };
        handleSelectRecord(customerRecord);
      } finally {
        setIsLoadingRecord(false);
      }
    };

    loadFullCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  const handleSelectRecord = (record: any) => {
    setSelectedRecord(record);
    setSelectedServiceIds([]);
    setSelectedComboId(null);

    if (record.type === 'customer') {
      if (record.vehicles && record.vehicles.length > 0) {
        const availableVehicle = record.vehicles.find((v: any) => !v.isDisabled);
        if (availableVehicle) {
          setVehicleInputMode('EXISTING');
          setSelectedCustomerVehicleId(String(availableVehicle.id));
        } else {
          setVehicleInputMode('NEW');
          setSelectedCustomerVehicleId('');
        }
      } else {
        setVehicleInputMode('NEW');
        setSelectedCustomerVehicleId('');
      }
    }
  };

  const selectedTotal = useMemo(() => {
    const servicesPrice = mappedServices
      .filter((s) => selectedServiceIds.includes(s.id as number))
      .reduce((sum, s) => sum + (s.numericPrice ?? 0), 0);

    let combosPrice = 0;
    if (selectedComboId) {
      const combo = dbCombos.find(c => c.id === selectedComboId);
      if (combo) {
        const original = (combo.service_ids || []).reduce((sum, id) => {
          const s = mappedServices.find(x => x.id === id);
          return sum + (s?.numericPrice || 0);
        }, 0);
        combosPrice = Math.round(original * (1 - (combo.discount_percentage || 10) / 100));
      }
    }
    return servicesPrice + combosPrice;
  }, [selectedServiceIds, selectedComboId, mappedServices, dbCombos]);

  const handleSubmit = async () => {
    try {
      if (mode === 'approved_record') {
        if (!selectedRecord) {
          showToast('Vui lòng tìm kiếm và chọn lịch hẹn hoặc hồ sơ khách hàng.', 'warning');
          return;
        }
        if (selectedRecord.type === 'appointment') {
          if (!selectedRecord.vehicleId) {
            showToast('Không tìm thấy thông tin xe trong lịch hẹn này.', 'warning');
            return;
          }
        } else if (selectedRecord.type === 'customer') {
          if (vehicleInputMode === 'EXISTING' && !selectedCustomerVehicleId) {
            showToast('Vui lòng chọn xe.', 'warning');
            return;
          }
          if (vehicleInputMode === 'EXISTING') {
            const selectedVehicle = selectedRecord.vehicles?.find(
              (vehicle: any) => String(vehicle.id) === selectedCustomerVehicleId
            );
            if (selectedVehicle?.isDisabled) {
              showToast(selectedVehicle.disableReason || 'Xe này hiện không thể tiếp nhận.', 'warning');
              return;
            }
          }
          if (vehicleInputMode === 'NEW') {
            if (!manualVehiclePlate.trim() || !vehicleBrand.trim() || !vehicleModel.trim()) {
              showToast('Vui lòng điền đầy đủ thông tin Xe (Biển số, Hãng, Dòng xe).', 'warning');
              return;
            }
          }
        }

      } else {
        if (!manualCustName.trim() || !manualCustPhone.trim() || !manualVehiclePlate.trim() || !vehicleBrand.trim() || !vehicleModel.trim()) {
          showToast('Vui lòng điền đầy đủ thông tin Khách hàng và Xe.', 'warning');
          return;
        }
      }

      if (receptionServiceMode === 'SERVICE' && selectedServiceIds.length === 0 && !selectedComboId) {
        showToast('Vui lòng chọn ít nhất 1 dịch vụ hoặc combo.', 'warning');
        return;
      }
      if (receptionServiceMode === 'REPAIR' && !notes.trim()) {
        showToast('Vui lòng điền mô tả tình trạng sửa chữa.', 'warning');
        return;
      }
      // Determine explicit booking type
      // Prepare payload
      let finalVehicleId = null;
      let walkInPayload = undefined;

      if (vehicleInputMode === 'EXISTING') {
        finalVehicleId = Number(selectedCustomerVehicleId);
      } else {
        // Thêm mới xe cho khách hàng cũ
        walkInPayload = {
          customer_id: Number(selectedRecord?.id),
          customer_name: selectedRecord?.name || undefined,
          customer_phone: selectedRecord?.phone,
          vehicle_plate: manualVehiclePlate.trim(),
          vehicle_year: manualVehicleYear || undefined,
          brand_name: vehicleBrand.trim(),
          model_name: vehicleModel.trim()
        };
      }

      const payload: any = {
        vehicle_id: finalVehicleId,
        walk_in: walkInPayload,
        service_ids: receptionServiceMode === 'SERVICE' ? selectedServiceIds : undefined,
        combo_ids: receptionServiceMode === 'SERVICE' && selectedComboId ? [selectedComboId] : undefined,
        notes: notes.trim() ? notes.trim() : undefined,
        rescue_id: rescueId ? Number(rescueId) : undefined
      };

      setIsSubmitting(true);
      const res = await fetchPrivate(APPOINTMENT_API_ENDPOINTS.CREATE_WALK_IN, 'POST', payload);
      if (res.success) {
        showToast('Tiếp nhận xe cứu hộ thành công!', 'success');
        setTimeout(() => {
          navigate('/reception/appointments');
        }, 1000);
      } else {
        throw new Error(res.message || 'Lỗi khi tiếp nhận xe cứu hộ');
      }
    } catch (err: any) {
      showToast(err.message, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: number) => price.toLocaleString('vi-VN') + ' VND';

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-5xl w-full mx-auto">
      <style>{phoneStyles}</style>
      {/* HEADER */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(-1)}
          title="Quay lại"
          className="mt-0.5 w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#00285E] hover:border-slate-300 active:scale-[0.97] transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-1 flex items-center gap-2">
            <ClipboardPlus className="text-amber-500" size={28} />
            Tiếp nhận xe cứu hộ
          </h1>
          <p className="text-slate-500 text-sm">
            Xe đã được đưa về gara — xác nhận thông tin và chọn dịch vụ hoặc nội dung cần sửa chữa.
          </p>
        </div>
      </div>

      {/* QUICK STATUS BAR & SLOTS TOGGLE */}
      <div className="hidden bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Clock size={18} className="text-[#00285E]" />
          <div>
            <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
              Tình trạng xưởng hôm nay
            </span>
            <span className="text-sm font-semibold text-slate-700">
              {linkedAppointmentId ? (
                <span className="text-blue-600 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  Đang liên kết với lịch hẹn: <strong className="font-extrabold">APT-{linkedAppointmentId.padStart(3, '0')}</strong>
                  <button
                    type="button"
                    onClick={() => setLinkedAppointmentId(null)}
                    className="ml-2 px-2 py-0.5 text-xs text-rose-500 bg-rose-50 border border-rose-100 hover:bg-rose-100 rounded-md font-bold transition-all"
                  >
                    Hủy liên kết
                  </button>
                </span>
              ) : (
                'Tạo phiếu trực tiếp (Chưa liên kết lịch hẹn)'
              )}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowSlotsBoard(!showSlotsBoard)}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${showSlotsBoard
            ? 'bg-[#00285E] text-white border-[#00285E] shadow-sm'
            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
        >
          <Calendar size={14} />
          <span>{showSlotsBoard ? 'Ẩn bảng sức chứa' : 'Xem lịch hẹn & sức chứa hôm nay'}</span>
        </button>
      </div>

      {/* COLLAPSIBLE SLOTS BOARD */}
      <AnimatePresence>
        {false && showSlotsBoard && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden space-y-4"
          >
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 space-y-6">
              {/* Board Header & Date Picker */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-700">Chọn ngày theo dõi:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-[#00285E] focus:outline-none focus:ring-2 focus:ring-[#00285E]/20"
                  />
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-emerald-500" />
                    <span className="text-slate-600 font-medium">Còn trống</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-blue-500" />
                    <span className="text-slate-600 font-semibold">Đã đặt xe</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-red-500" />
                    <span className="text-slate-600 font-medium">Đã kín (Full)</span>
                  </div>
                  <div className="h-4 w-px bg-slate-200" />
                  <div className="text-[#00285E] font-bold">
                    Sức chứa mỗi ca: {garageCapacity} xe
                  </div>
                </div>
              </div>

              {/* Slots Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {timeSlots.map((slot) => {
                  const appts = slotAppointments[slot.time] ?? [];
                  const occupancyPercent = Math.min(100, Math.round((slot.count / garageCapacity) * 100));

                  let statusLabel = 'Còn trống';
                  let statusBg = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                  let progressColor = 'bg-emerald-500';

                  if (slot.isFull) {
                    statusLabel = 'ĐÃ KÍN (FULL)';
                    statusBg = 'bg-rose-50 text-rose-600 border-rose-100';
                    progressColor = 'bg-rose-500';
                  } else if (slot.count > 0) {
                    statusLabel = `ĐÃ ĐẶT ${slot.count} XE`;
                    statusBg = 'bg-blue-50 text-blue-600 border-blue-100';
                    progressColor = 'bg-blue-500';
                  }

                  return (
                    <div key={slot.time} className={`bg-white rounded-xl border ${slot.isFull ? 'border-rose-100/80 shadow-rose-50/50' : 'border-slate-200/60'} shadow-xs overflow-hidden flex flex-col justify-between min-h-[280px] transition-all hover:shadow-sm`}>
                      {/* Slot Header */}
                      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <Clock size={14} className="text-[#00285E]" />
                            <span className="text-sm font-extrabold text-[#00285E]">{slot.time}</span>
                            <span className="text-[10px] font-semibold text-slate-400">({slot.label})</span>
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${statusBg}`}>
                            {statusLabel}
                          </span>
                        </div>

                        {/* Progress occupancy */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                            <span>Sức chứa ca</span>
                            <span>{slot.count} / {garageCapacity} xe</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-300 ${progressColor}`} style={{ width: `${occupancyPercent}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Appointments List for this slot */}
                      <div className="flex-1 p-4 overflow-y-auto max-h-[160px] divide-y divide-slate-100">
                        {appts.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-center text-slate-400 text-[11px] font-semibold py-6">
                            Chưa có lịch hẹn nào
                          </div>
                        ) : (
                          appts.map((apt) => {
                            const isLinked = linkedAppointmentId === apt.id;
                            const isUnreceived = apt.status === 'confirmed' || apt.status === 'pending';
                            return (
                              <div key={apt.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1.5">
                                <div className="flex items-start justify-between gap-1.5">
                                  <div>
                                    <span className="text-[9px] font-bold text-slate-400 block">APT-{apt.id.padStart(3, '0')}</span>
                                    <span className="text-xs font-bold text-slate-800 block">{apt.customerName}</span>
                                    <span className="text-[10px] font-semibold text-slate-400 block">{apt.customerPhone}</span>
                                  </div>
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                                    {apt.status === 'in_progress' ? 'Đang sửa' : apt.status === 'completed' ? 'Xong' : 'Chưa nhận'}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[#00285E] font-bold border border-blue-100 text-[9px]">
                                    {apt.vehiclePlate}
                                  </span>
                                </div>

                                {isUnreceived && (
                                  <div className="flex items-center justify-end pt-1">
                                    {isLinked ? (
                                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        ✓ Đang liên kết
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setLinkedAppointmentId(apt.id);
                                          // Auto fill customer & vehicle if same phone/plate
                                          setVehicleInputMode('EXISTING');
                                          setSelectedCustomerVehicleId(apt.vehicleId);
                                          showToast(`Đã liên kết cứu hộ với lịch hẹn APT-${apt.id.padStart(3, '0')}`, 'success');
                                        }}
                                        className="px-2 py-0.5 rounded text-[10px] font-bold text-white bg-[#00285E] hover:bg-[#001a3f] transition-all"
                                      >
                                        Liên kết lịch hẹn này
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-6 md:p-7">
        {/* READONLY CUSTOMER & VEHICLE DISPLAY */}
        {selectedRecord ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* COLUMN 1: READONLY CUSTOMER INFO */}
            <div className="rounded-xl bg-slate-50/70 p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-3">
                  <User size={16} className="text-[#00285E]" />
                  Thông tin Khách hàng
                </h2>
                <div className="space-y-3">
                  <FormReadonly label="Họ và tên" value={selectedRecord.name} />
                  <FormReadonly
                    label="Số điện thoại"
                    value={selectedRecord.phone}
                    icon={<Phone size={14} className="text-slate-400" />}
                  />
                </div>
              </div>
            </div>

            {/* COLUMN 2: VEHICLE INFO */}
            <div className="rounded-xl bg-slate-50/70 p-4 sm:p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-3">
                <Car size={16} className="text-[#00285E]" />
                Thông tin Xe tiếp nhận
              </h2>

              <div className="flex gap-6 mb-2">
                {selectedRecord.vehicles && selectedRecord.vehicles.length > 0 && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={vehicleInputMode === 'EXISTING'}
                      onChange={() => {
                        const availableVehicle = selectedRecord.vehicles.find((v: any) => !v.isDisabled);
                        if (!availableVehicle) {
                          showToast('Tất cả xe đã lưu đều đang có lịch hoặc đang ở trong gara.', 'warning');
                          return;
                        }
                        setVehicleInputMode('EXISTING');
                        const currentVehicle = selectedRecord.vehicles.find(
                          (v: any) => String(v.id) === selectedCustomerVehicleId
                        );
                        if (!currentVehicle || currentVehicle.isDisabled) {
                          setSelectedCustomerVehicleId(String(availableVehicle.id));
                        }
                      }}
                      className="accent-[#00285E]"
                    />
                    <span className="text-sm font-bold text-slate-700">Chọn xe đã có</span>
                  </label>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={vehicleInputMode === 'NEW'}
                    onChange={() => setVehicleInputMode('NEW')}
                    className="accent-[#00285E]"
                  />
                  <span className="text-sm font-bold text-slate-700">Thêm xe mới</span>
                </label>
              </div>

              {vehicleInputMode === 'EXISTING' ? (
                <div className="space-y-4">
                  <div className="mb-4">
                    <select
                      value={selectedCustomerVehicleId}
                      onChange={(e) => setSelectedCustomerVehicleId(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-blue-50/50 rounded-xl p-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-[#00285E]"
                    >
                      <option value="">Chọn xe</option>
                      {selectedRecord.vehicles?.map((v: any) => (
                        <option key={v.id} value={v.id} disabled={v.isDisabled}>
                          {v.license_plate} - {v.brand} {v.model} {v.isDisabled ? `(${v.disableReason})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Form Readonly For Selected Vehicle */}
                  {(() => {
                    const v = selectedRecord.vehicles?.find((x: any) => String(x.id) === selectedCustomerVehicleId);
                    if (!v) return null;
                    return (
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <FormReadonly label="Biển số" value={v.license_plate} highlight />
                        <FormReadonly label="Loại xe" value={`${v.brand} ${v.model}`.trim()} />
                        <FormReadonly label="Năm SX" value={v.year?.toString() || '—'} />
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 pt-3 border-t border-slate-100">
                  <FormInput
                    label="Biển số xe *"
                    value={manualVehiclePlate}
                    onChange={setManualVehiclePlate}
                    placeholder="VD: 51A-123.45..."
                  />
                  <div className="relative" ref={brandRef}>
                    <FormInput
                      label="Hãng xe *"
                      value={vehicleBrand}
                      onChange={(val) => {
                        setVehicleBrand(val);
                        setShowBrandSuggestions(true);
                        setSelectedMakeId(null);
                        setVehicleModel('');
                      }}
                      placeholder="VD: Toyota"
                    />
                    {showBrandSuggestions && brandSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {brandSuggestions.map((brand: any) => (
                          <div
                            key={brand.id}
                            className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm font-semibold text-slate-700"
                            onClick={() => {
                              setVehicleBrand(brand.make_name);
                              setSelectedMakeId(brand.id);
                              setShowBrandSuggestions(false);
                              setVehicleModel('');
                            }}
                          >
                            {brand.make_name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative" ref={modelRef}>
                    <FormInput
                      label="Dòng xe *"
                      value={vehicleModel}
                      onChange={(val) => {
                        setVehicleModel(val);
                        setShowModelSuggestions(true);
                      }}
                      placeholder="VD: Camry"
                    />
                    {showModelSuggestions && modelSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {modelSuggestions.map((model: any) => (
                          <div
                            key={model.id}
                            className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm font-semibold text-slate-700"
                            onClick={() => {
                              setVehicleModel(model.model_name);
                              setVehicleBrand(model.make?.make_name || vehicleBrand);
                              if (model.make_id) setSelectedMakeId(model.make_id);
                              setShowModelSuggestions(false);
                            }}
                          >
                            {model.model_name} <span className="text-xs text-slate-400">({model.make?.make_name})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <FormInput
                    label="Năm sản xuất"
                    value={manualVehicleYear}
                    onChange={setManualVehicleYear}
                    placeholder="VD: 2022..."
                    type="number"
                  />
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center text-slate-400 font-semibold text-sm flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00285E]"></div>
            Đang tải thông tin khách hàng từ hệ thống...
          </div>
        )}
        {/* SCHEDULED TIME CARD */}
        <div className="hidden bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-3">
            <Calendar size={16} className="text-[#00285E]" />
            Thời gian xếp ca vào sửa <span className="text-slate-400 font-normal">(Chọn khung giờ xếp lớp xe vào sửa)</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-400" />
                Ngày xếp ca
              </label>
              <input
                type="date"
                value={bookingDate}
                min={minDateStr}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-700"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <Clock size={14} className="text-slate-400" />
                Khung ca hẹn khả dụng
              </label>
              <select
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-700"
              >
                <option value="">-- Chọn ca hẹn hoặc để trống làm ngay --</option>
                {timeSlots.map((slot) => {
                  const [slotH, slotM] = slot.time.split(':').map(Number);
                  const slotMinutes = slotH * 60 + slotM;
                  const now = new Date();
                  const nowMinutes = now.getHours() * 60 + now.getMinutes();
                  const isPast = bookingDate === minDateStr && slotMinutes < nowMinutes;
                  return (
                    <option key={slot.time} value={slot.time} disabled={slot.isFull}>
                      {slot.time} ({slot.label}){slot.isFull ? (isPast ? ' - Đã qua giờ' : ' - Không thể chọn khung giờ này') : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          {timeSlots.length === 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl text-xs font-semibold text-amber-600">
              <AlertCircle size={14} />
              Không có khung giờ khả dụng cho ngày đã chọn.
            </div>
          )}
        </div>

        {/* SERVICES / REPAIR */}
        <div className="mt-5 space-y-5 border-t border-slate-200 pt-5">
          <div className="flex w-fit gap-2 rounded-xl border border-slate-200/20 bg-slate-100/60 p-1">
            <button
              type="button"
              onClick={() => setReceptionServiceMode('SERVICE')}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-bold transition-all ${receptionServiceMode === 'SERVICE'
                ? 'bg-[#00285E] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <Settings size={14} />
              Dịch vụ
            </button>
            <button
              type="button"
              onClick={() => setReceptionServiceMode('REPAIR')}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-bold transition-all ${receptionServiceMode === 'REPAIR'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <Wrench size={14} />
              Kiểm tra và Sửa chữa
            </button>
          </div>

          {receptionServiceMode === 'SERVICE' && (
            <div>
              <div className="mb-4 flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-800">
                  <Settings size={16} className="text-[#00285E]" />
                  Chọn dịch vụ <span className="text-rose-500">*</span>
                </h2>
                <span className="rounded-lg bg-[#EDF3FF] px-3 py-1 text-xs font-bold text-[#00285E]">
                  Đã chọn: {selectedServiceIds.length + (selectedComboId ? 1 : 0)} — Tổng: {formatPrice(selectedTotal)}
                </span>
              </div>

              <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={activeServiceTab === 'single' ? serviceSearch : comboSearch}
                    onChange={(event) => activeServiceTab === 'single'
                      ? setServiceSearch(event.target.value)
                      : setComboSearch(event.target.value)}
                    placeholder={activeServiceTab === 'single' ? 'Tìm kiếm dịch vụ...' : 'Tìm kiếm combo...'}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-xs font-medium text-[#00285E] shadow-sm outline-none transition-all focus:border-[#00285E] focus:ring-2 focus:ring-[#00285E]/10"
                  />
                </div>
                {activeServiceTab === 'single' && (
                  <select
                    value={selectedCategoryId ?? ''}
                    onChange={(event) => setSelectedCategoryId(event.target.value ? Number(event.target.value) : null)}
                    aria-label="Lọc theo danh mục dịch vụ"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 shadow-sm outline-none focus:border-[#00285E]"
                  >
                    <option value="">Tất cả danh mục</option>
                    {activeCategories.filter((category: any) => (category.service_count ?? 0) > 0).map((category: any) => (
                      <option key={category.id} value={category.id}>
                        {category.category_name} ({category.service_count ?? 0})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="mb-4 flex gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setActiveServiceTab('single')}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-5 py-2.5 text-xs font-bold ${activeServiceTab === 'single'
                    ? 'bg-[#00285E] text-white shadow-sm'
                    : 'text-slate-500 hover:bg-white hover:text-[#00285E]'
                    }`}
                >
                  <Wrench size={14} /> Dịch vụ lẻ
                </button>
                <button
                  type="button"
                  onClick={() => setActiveServiceTab('combo')}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-5 py-2.5 text-xs font-bold ${activeServiceTab === 'combo'
                    ? 'bg-[#00285E] text-white shadow-sm'
                    : 'text-slate-500 hover:bg-white hover:text-[#00285E]'
                    }`}
                >
                  <Package size={14} /> Combo
                </button>
              </div>

              {activeServiceTab === 'single' ? (
                <SingleServicesSelector
                  mappedServices={currentPageServices}
                  activeCategories={activeCategories}
                  selectedServiceIds={selectedServiceIds}
                  setSelectedServiceIds={setSelectedServiceIds}
                  COLORS={{ orange: '#00285E', navy: '#FFFFFF' }}
                  t={(key, fallback) => (t as any)(key, fallback)}
                  selectedCategoryId={selectedCategoryId}
                  setSelectedCategoryId={setSelectedCategoryId}
                  servicePage={servicePage}
                  setServicePage={setServicePage}
                  dbCombos={dbCombos}
                  selectedComboId={selectedComboId}
                  serviceTotalPages={serviceTotalPages}
                  searchText={serviceSearch}
                  setSearchText={setServiceSearch}
                  elevated
                  hideFilters
                />
              ) : (
                <ComboServicesSelector
                  dbCombos={dbCombos}
                  setDbCombos={setDbCombos}
                  selectedComboId={selectedComboId}
                  setSelectedComboId={setSelectedComboId}
                  mappedServices={mappedServices}
                  COLORS={{ orange: '#00285E', navy: '#FFFFFF' }}
                  selectedServiceIds={selectedServiceIds}
                  setSelectedServiceIds={setSelectedServiceIds}
                  compact
                  elevated
                  hideSearch
                  externalSearchText={comboSearch}
                />
              )}

              {selectedServiceIds.length === 0 && !selectedComboId && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-600">
                  <AlertCircle size={14} /> Cần chọn ít nhất 1 dịch vụ hoặc combo.
                </div>
              )}
            </div>
          )}
        </div>

        {/* REPAIR NOTES */}
        {receptionServiceMode === 'REPAIR' && (
          <div className="mt-5 space-y-6 border-t border-slate-200 pt-5">
            <div>
              <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-3">
                <StickyNote size={16} className="text-[#00285E]" />
                Mô tả tình trạng hỏng hóc <span className="text-rose-500">*</span>
              </h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Nhập mô tả các vấn đề của xe (ví dụ: xe kêu lạch cạch ở gầm, điều hòa không mát...)"
                rows={3}
                className="w-full bg-[#F8FAFC] border border-blue-50/50 rounded-xl p-3 text-sm outline-none transition-all focus:border-amber-400 focus:bg-white text-brand-blue resize-none"
              />
            </div>
            {receptionServiceMode === 'REPAIR' && !notes.trim() && (
              <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl text-xs font-semibold text-amber-600">
                <AlertCircle size={14} />
                Cần điền mô tả tình trạng sửa chữa.
              </div>
            )}
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-3 bg-[#00285E] hover:bg-[#001a3f] text-white rounded-xl text-sm font-bold shadow-md shadow-[#00285E]/15 transition-all transform hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ClipboardPlus size={16} />
            {isSubmitting ? 'Đang tiếp nhận...' : 'Xác nhận tiếp nhận xe'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormReadonly({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between py-1 border-b border-slate-100/50 pb-2 last:border-0 last:pb-0">
      <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span
        className={`text-sm font-bold text-right ${highlight ? 'text-[#00285E] bg-[#EDF3FF] px-2 py-0.5 rounded-md' : 'text-slate-700'
          }`}
      >
        {value || '—'}
      </span>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  icon,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
        {icon}
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-700"
      />
    </div>
  );
}
