import { useState, useMemo, useEffect, useRef } from 'react';
import {
  ClipboardPlus,
  ArrowLeft,
  Calendar,
  User,
  Phone,
  Car,
  Gauge,
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
import { SERVICE_ORDER_API_ENDPOINTS } from '../../../constants/reception/appointmentsEndpoints';
import { useFetchClient, useFetchClient_v2 } from '../../../hook/useFetchClient';
import { APPOINTMENT_API_ENDPOINTS } from '../../../constants/reception/appointmentsEndpoints';
import { SEARCH_API_ENDPOINTS } from '../../../constants/reception/searchEndpoints';
import { SERVICE_API_ENDPOINTS } from '../../../constants/customer/serviceApiEndpoints';
import type { ServiceCombo, ServiceItem as CustomerServiceItem } from '../../../model/Service';
import { useTranslation } from 'react-i18next';
import { VEHICLE_MAKE_MODEL_API_ENDPOINTS } from '../../../constants/customer/vehicelMakeModelEndpoint';
import { GARAGE_CONFIG_API_ENDPOINTS } from '../../../constants/customer/garage_configurationsEndpoints';



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
  const [manualVehicleVin, setManualVehicleVin] = useState('');
  const [manualVehicleYear, setManualVehicleYear] = useState('');
  const [currentOdo, setCurrentOdo] = useState('');
  const [bayId, setBayId] = useState('1'); // Cầu nâng (default 1)

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

  // Time selection states
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [shifts, setShifts] = useState<any[]>([]);
  const [bufferMinutes, setBufferMinutes] = useState<number>(30);
  const [garageCapacity, setGarageCapacity] = useState<number>(1);
  const [bookedCounts, setBookedCounts] = useState<Record<string, number>>({});

  const minDateStr = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const timeSlots = useMemo(() => {
    const slots: { time: string; label: string; isFull: boolean }[] = [];
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

        // Calculate UTC hour for bookedCounts matching
        const utcHour = (h - 7 + 24) % 24;
        const isFull = (bookedCounts[utcHour] || 0) >= garageCapacity;

        slots.push({ time: timeStr, label, isFull });
        currentMinutes += bufferMinutes;
      }
    });

    if (bookingDate === minDateStr) {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      return slots.filter(slot => {
        const [slotH, slotM] = slot.time.split(':').map(Number);
        const slotMinutes = slotH * 60 + slotM;
        return slotMinutes >= nowMinutes + 30;
      });
    }

    return slots;
  }, [shifts, bufferMinutes, bookingDate, minDateStr, bookedCounts, garageCapacity]);

  useEffect(() => {
    if (bookingTime && !timeSlots.some(slot => slot.time === bookingTime)) {
      setBookingTime('');
    }
  }, [bookingDate, timeSlots, bookingTime]);

  // Common fields
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [selectedCombos, setSelectedCombos] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState(''); // Mô tả tình trạng hỏng hóc
  const [initialCondition, setInitialCondition] = useState(''); // Trạng thái tiếp nhận xe ban đầu
  const [receptionServiceMode, setReceptionServiceMode] = useState<'SERVICE' | 'REPAIR'>('REPAIR');
  const [serviceSearch, setServiceSearch] = useState('');
  const [activeServiceTab, setActiveServiceTab] = useState<'single' | 'combo' | 'category'>('single');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { fetchPrivate, fetchPublic } = useFetchClient_v2();
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);

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

  // Fetch Configs
  useEffect(() => {
    const loadGarageConfigs = async () => {
      try {
        const bufferRes = await fetchPublic(GARAGE_CONFIG_API_ENDPOINTS.GET_CONFIGURATION_BY_KEY("BUFFER_TIME_MINUTES"));
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
        const dateParam = bookingDate ? `?date=${bookingDate}` : '';
        const availRes = await fetchPublic(GARAGE_CONFIG_API_ENDPOINTS.GET_AVAILABILITY + dateParam);
        if (availRes && availRes.success && availRes.data) {
          const data = availRes.data;
          if (data.shifts) setShifts(data.shifts);
          if (data.capacity !== undefined) setGarageCapacity(data.capacity);
          if (data.bookedCounts) setBookedCounts(data.bookedCounts);
        }
      } catch (error) {
        console.error("Lỗi tải ca làm việc và tình trạng sức chứa:", error);
      }
    };
    loadGarageConfigs();
  }, [bookingDate, fetchPublic]);

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
    return dbServices.filter((s: any) => s.is_active !== false);
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
        category_id: s.category_id
      };
    });
  }, [activeDbServices]);

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
          name: customer.customer_name || customer.user?.fullName || 'Khách vãng lai',
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
            name: fullCustomer.customer_name,
            phone: fullCustomer.phone,
            vehicles: fullCustomer.vehicles || []
          };
          handleSelectRecord(customerRecord);
        } else {
          // Fallback
          const customerRecord = {
            type: 'customer',
            id: customer.id,
            name: customer.customer_name || customer.user?.fullName || 'Khách vãng lai',
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
          name: customer.customer_name || customer.user?.fullName || 'Khách vãng lai',
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
        setVehicleInputMode('EXISTING');
        const availableVehicle = record.vehicles.find((v: any) => !v.isInGarage);
        setSelectedCustomerVehicleId(String(availableVehicle ? availableVehicle.id : record.vehicles[0].id));
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

      if (!currentOdo.trim()) {
        showToast('Vui lòng nhập số km hiện tại (ODO).', 'warning');
        return;
      }
      if (!bookingDate || !bookingTime) {
        showToast('Vui lòng chọn thời gian dự kiến hoàn thành.', 'warning');
        return;
      }

      if (receptionServiceMode === 'SERVICE' && selectedServiceIds.length === 0 && !selectedComboId) {
        showToast('Vui lòng chọn ít nhất 1 dịch vụ hoặc combo.', 'warning');
        return;
      }
      if (!notes.trim()) {
        showToast('Vui lòng điền mô tả tình trạng sửa chữa.', 'warning');
        return;
      }

      // Determine explicit booking type
      let finalBookingType = 'RECEPTIONIST_REPAIR';

      // Prepare payload
      const estimated_finish_time = `${bookingDate}T${bookingTime}:00`;
      let finalVehicleId = null;
      let walkInPayload = undefined;

      if (vehicleInputMode === 'EXISTING') {
        finalVehicleId = Number(selectedCustomerVehicleId);
      } else {
        // Thêm mới xe cho khách hàng cũ
        walkInPayload = {
          customer_name: selectedRecord?.name || undefined,
          customer_phone: selectedRecord?.phone,
          vehicle_plate: manualVehiclePlate.trim(),
          vehicle_vin: manualVehicleVin.trim() || undefined,
          vehicle_year: manualVehicleYear || undefined,
          brand_name: vehicleBrand.trim(),
          model_name: vehicleModel.trim()
        };
      }

      const payload: any = {
        booking_type: finalBookingType || undefined,
        vehicle_id: finalVehicleId,
        walk_in: walkInPayload,
        bay_id: Number(bayId) || null,
        current_odo: Number(currentOdo),
        estimated_finish_time: estimated_finish_time,
        service_ids: receptionServiceMode === 'SERVICE' ? selectedServiceIds : undefined,
        combo_ids: receptionServiceMode === 'SERVICE' && selectedComboId ? [selectedComboId] : undefined,
        notes: notes.trim() ? notes.trim() : undefined,
        symptoms: initialCondition.trim() ? initialCondition.trim() : undefined,
        rescue_id: rescueId ? Number(rescueId) : undefined
      };

      const res = await fetchPrivate(SERVICE_ORDER_API_ENDPOINTS.CREATE, 'POST', payload);
      if (res.success) {
        showToast('Tạo hóa đơn dịch vụ thành công!', 'success');
        setTimeout(() => {
          if (rescueId) {
            navigate('/reception/customers');
          } else {
            navigate('/reception/appointments');
          }
        }, 1000);
      } else {
        throw new Error(res.message || 'Lỗi khi tạo hóa đơn dịch vụ');
      }
    } catch (err: any) {
      showToast(err.message, 'warning');
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
            Tạo hóa đơn dịch vụ
          </h1>
          <p className="text-slate-500 text-sm">
            Tạo phiếu tiếp nhận xe và sửa chữa/bảo dưỡng cho khách hàng.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* READONLY CUSTOMER & VEHICLE DISPLAY */}
            {selectedRecord ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* READONLY CUSTOMER INFO */}
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6">
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

                {/* VEHICLE INFO */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6 space-y-4">
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
                              setVehicleInputMode('EXISTING');
                              if (!selectedCustomerVehicleId) setSelectedCustomerVehicleId(String(selectedRecord.vehicles[0].id));
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
                            {selectedRecord.vehicles?.map((v: any) => (
                              <option key={v.id} value={v.id} disabled={v.isInGarage}>
                                {v.license_plate} - {v.brand} {v.model} {v.isInGarage ? '(Đang trong xưởng)' : ''}
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
                              <FormInput
                                label="Số km hiện tại (ODO) *"
                                value={currentOdo}
                                onChange={setCurrentOdo}
                                placeholder={v.mileage ? `Lần trước: ${v.mileage.toLocaleString('vi-VN')} km` : 'VD: 15000...'}
                                type="number"
                                icon={<Gauge size={14} className="text-slate-400" />}
                              />
                              <div className="pt-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                                  <Clock size={14} className="text-slate-400" />
                                  Thời gian *
                                </label>
                                <div className="grid grid-cols-1 gap-3">
                                  <input
                                    type="date"
                                    value={bookingDate}
                                    onChange={(e) => setBookingDate(e.target.value)}
                                    min={minDateStr}
                                    className="w-full bg-[#F8FAFC] border border-blue-50/50 rounded-xl p-3 text-sm outline-none transition-all focus:border-[#00285E] focus:bg-white text-brand-blue"
                                  />
                                  <select
                                    value={bookingTime}
                                    onChange={(e) => setBookingTime(e.target.value)}
                                    className="w-full bg-[#F8FAFC] border border-blue-50/50 rounded-xl p-3 text-sm outline-none transition-all focus:border-[#00285E] focus:bg-white text-brand-blue"
                                  >
                                    <option value="">-- Chọn giờ --</option>
                                    {timeSlots.map(slot => (
                                      <option
                                        key={slot.time}
                                        value={slot.time}
                                        disabled={slot.isFull}
                                        className={slot.isFull ? 'text-gray-300' : ''}
                                      >
                                        {slot.time} ({slot.isFull ? 'Kín lịch' : slot.label})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
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
                          label="Số khung (VIN)"
                          value={manualVehicleVin}
                          onChange={setManualVehicleVin}
                          placeholder="VD: 1XYZ234..."
                        />
                        <FormInput
                          label="Năm sản xuất"
                          value={manualVehicleYear}
                          onChange={setManualVehicleYear}
                          placeholder="VD: 2022..."
                          type="number"
                        />
                        <FormInput
                          label="ODO hiện tại (km) *"
                          value={currentOdo}
                          onChange={setCurrentOdo}
                          placeholder="VD: 15000..."
                          type="number"
                          icon={<Gauge size={14} className="text-slate-400" />}
                        />
                        <div>
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                            <Clock size={14} className="text-slate-400" />
                            Thời gian *
                          </label>
                          <div className="grid grid-cols-1 gap-3">
                            <input
                              type="date"
                              value={bookingDate}
                              onChange={(e) => setBookingDate(e.target.value)}
                              min={minDateStr}
                              className="w-full bg-[#F8FAFC] border border-blue-50/50 rounded-xl p-3 text-sm outline-none transition-all focus:border-[#00285E] focus:bg-white text-brand-blue"
                            />
                            <select
                              value={bookingTime}
                              onChange={(e) => setBookingTime(e.target.value)}
                              className="w-full bg-[#F8FAFC] border border-blue-50/50 rounded-xl p-3 text-sm outline-none transition-all focus:border-[#00285E] focus:bg-white text-brand-blue"
                            >
                              <option value="">-- Chọn giờ --</option>
                              {timeSlots.map(slot => (
                                <option
                                  key={slot.time}
                                  value={slot.time}
                                  disabled={slot.isFull}
                                  className={slot.isFull ? 'text-gray-300' : ''}
                                >
                                  {slot.time} ({slot.isFull ? 'Kín lịch' : slot.label})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
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
      </div>

      {/* REPAIR NOTES */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6 space-y-6">
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
        {!notes.trim() && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl text-xs font-semibold text-amber-600">
            <AlertCircle size={14} />
            Cần điền mô tả tình trạng sửa chữa.
          </div>
        )}
      </div>

      {/* INITIAL VEHICLE CONDITION */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6">
        <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 uppercase tracking-widest">
          <StickyNote size={16} className="text-[#00285E]" />
          Trạng thái tiếp nhận xe ban đầu
        </h2>
        <textarea
          value={initialCondition}
          onChange={(e) => setInitialCondition(e.target.value)}
          placeholder="Ghi chú về tình trạng xe khi tiếp nhận (ví dụ: xước xát thân vỏ, móp méo...)"
          rows={3}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all resize-none"
        />
      </div>

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
          className="flex items-center gap-2 px-6 py-3 bg-[#00285E] hover:bg-[#001a3f] text-white rounded-xl text-sm font-bold shadow-md shadow-[#00285E]/15 transition-all transform hover:translate-y-[-1px]"
        >
          <ClipboardPlus size={16} />
          Tạo hóa đơn dịch vụ
        </button>
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
