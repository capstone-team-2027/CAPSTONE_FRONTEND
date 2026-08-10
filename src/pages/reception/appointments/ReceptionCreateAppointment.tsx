import { useState, useMemo, useEffect, useRef } from 'react';
import {
  CalendarCheck,
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Phone,
  Car,
  Wrench,
  StickyNote,
  AlertCircle,
  Settings,
  Search,
  UserCheck,
  PlusCircle,
  Layers,
  Package,
} from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import * as PhoneInputLib from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { APPOINTMENT_API_ENDPOINTS } from '../../../constants/reception/appointmentsEndpoints';
import { useFetchClient_v2 } from '../../../hook/useFetchClient';
import { SEARCH_API_ENDPOINTS } from '../../../constants/reception/searchEndpoints';

import { SERVICE_API_ENDPOINTS } from '../../../constants/customer/serviceApiEndpoints';
import { GARAGE_CONFIG_API_ENDPOINTS } from '../../../constants/customer/garage_configurationsEndpoints';
import type { ServiceCombo, ServiceItem as CustomerServiceItem } from '../../../model/Service';
import { useTranslation } from 'react-i18next';
import { VEHICLE_MAKE_MODEL_API_ENDPOINTS } from '../../../constants/customer/vehicelMakeModelEndpoint';
import SingleServicesSelector from '../../customer/booking/SingleServicesSelector';
import ComboServicesSelector from '../../customer/booking/ComboServicesSelector';

const DEFAULT_SHIFTS = [
  { start_time: '08:00', end_time: '12:00' },
  { start_time: '13:00', end_time: '17:00' },
];

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
  countryCodeEditable?: boolean;
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

export default function ReceptionCreateAppointment() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  }>();

  // Tab mode: 'existing' (Khách hàng cũ) or 'first_time' (Khách vãng lai lần đầu)
  const [mode, setMode] = useState<'existing' | 'first_time'>('existing');

  // Search in Tab "Khách hàng cũ"
  const [recordSearch, setRecordSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // Walk-in mode manual entry
  const [manualCustName, setManualCustName] = useState('');
  const [manualCustPhone, setManualCustPhone] = useState('');
  // SĐT khách mới trùng khách đã có trong hệ thống — chặn tạo mới, mời chuyển sang dùng khách cũ.
  const [duplicateCustomer, setDuplicateCustomer] = useState<any | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  // Vehicle Selection States for existing customers
  const [vehicleInputMode, setVehicleInputMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [selectedCustomerVehicleId, setSelectedCustomerVehicleId] = useState<string>('');

  const [manualVehiclePlate, setManualVehiclePlate] = useState('');
  const [manualVehicleColor, setManualVehicleColor] = useState('');
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
  const isSelectingRef = useRef(false);

  // Common fields
  const [notes, setNotes] = useState(''); // Ghi chú / mô tả tình trạng cần sửa chữa
  const [receptionServiceMode, setReceptionServiceMode] = useState<'SERVICE' | 'REPAIR'>('SERVICE');
  const [serviceSearch, setServiceSearch] = useState('');
  const [activeServiceTab, setActiveServiceTab] = useState<'single' | 'combo'>('single');

  const { fetchPrivate, fetchPublic } = useFetchClient_v2();

  // Dynamic Data States for Services
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [selectedComboId, setSelectedComboId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [servicePage, setServicePage] = useState(1);
  const [dbServices, setDbServices] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [dbCombos, setDbCombos] = useState<ServiceCombo[]>([]);

  // Garage configuration states (thời gian hẹn khả dụng)
  const [shifts, setShifts] = useState<any[]>(DEFAULT_SHIFTS);
  const [bufferMinutes, setBufferMinutes] = useState<number>(90);
  const [garageCapacity, setGarageCapacity] = useState<number>(1);
  const [bookedCounts, setBookedCounts] = useState<Record<string, number>>({});

  const getTodayString = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const minDateStr = useMemo(() => getTodayString(), []);

  const [bookingDate, setBookingDate] = useState(minDateStr);
  const [bookingTime, setBookingTime] = useState('');

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

  // Load garage configuration data (shifts & buffer time & availability theo ngày)
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
        const data = availRes?.data ?? availRes;
        if (data) {
          if (Array.isArray(data.shifts)) {
            setShifts(data.shifts.length > 0 ? data.shifts : DEFAULT_SHIFTS);
          }
          if (data.capacity !== undefined) setGarageCapacity(data.capacity);
          if (data.bookedCounts) setBookedCounts(data.bookedCounts);
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu ca làm việc và tình trạng sức chứa:", error);
        setShifts(DEFAULT_SHIFTS);
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
      const priceValue = s.total_price || s.labor_price || s.price || s.base_price || 0;
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
      list = list.filter(s => String(s.category_id) === String(selectedCategoryId));
    }
    const q = serviceSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(s => s.title.toLowerCase().includes(q) || (s.desc || '').toLowerCase().includes(q));
    }
    return list;
  }, [mappedServices, selectedCategoryId, serviceSearch]);

  const serviceTotalPages = Math.max(1, Math.ceil(filteredServices.length / SERVICES_PER_PAGE));

  useEffect(() => {
    setServicePage(1);
  }, [selectedCategoryId, serviceSearch]);

  useEffect(() => {
    if (servicePage > serviceTotalPages) {
      setServicePage(serviceTotalPages);
    }
  }, [servicePage, serviceTotalPages]);

  const currentPageServices = useMemo(() => {
    const start = (servicePage - 1) * SERVICES_PER_PAGE;
    return filteredServices.slice(start, start + SERVICES_PER_PAGE);
  }, [filteredServices, servicePage]);

  // Tính danh sách khung giờ khả dụng theo ca làm việc & sức chứa gara
  const timeSlots = useMemo(() => {
    let totalDurationMinutes = 0;
    if (receptionServiceMode === 'SERVICE') {
      selectedServiceIds.forEach(id => {
        const service = dbServices.find(s => s.id === id);
        if (service && service.estimated_duration) {
          totalDurationMinutes += parseInt(service.estimated_duration, 10);
        } else {
          totalDurationMinutes += 30;
        }
      });
      if (selectedComboId) {
        const combo = dbCombos.find(c => c.id === selectedComboId);
        if (combo && combo.service_ids) {
          combo.service_ids.forEach(catalogId => {
            const service = dbServices.find(s => s.id === catalogId);
            if (service && service.estimated_duration) {
              totalDurationMinutes += parseInt(service.estimated_duration, 10);
            } else {
              totalDurationMinutes += 30;
            }
          });
        }
      }
    }

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
        const label = h < 12 ? t('booking.timeSlots.morning', 'Sáng') : t('booking.timeSlots.afternoon', 'Chiều');

        let isFull = false;

        if (totalDurationMinutes === 0) {
          const utcHour = (h - 7 + 24) % 24;
          isFull = (bookedCounts[utcHour] || 0) >= garageCapacity;
        } else {
          const endTotalMinutes = currentMinutes + totalDurationMinutes;
          let calculatedEndH = Math.floor(endTotalMinutes / 60);

          if (endTotalMinutes % 60 === 0 && calculatedEndH > h) {
            calculatedEndH -= 1;
          }

          for (let checkH = h; checkH <= calculatedEndH; checkH++) {
            const utcHour = (checkH - 7 + 24) % 24;
            if ((bookedCounts[utcHour] || 0) >= garageCapacity) {
              isFull = true;
              break;
            }
          }
        }

        slots.push({ time: timeStr, label, isFull });
        currentMinutes += bufferMinutes;
      }
    });

    if (bookingDate === minDateStr) {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      return slots.map(slot => {
        const [slotH, slotM] = slot.time.split(':').map(Number);
        const slotMinutes = slotH * 60 + slotM;
        if (slotMinutes < nowMinutes + 30) {
          return { ...slot, isFull: true };
        }
        return slot;
      });
    }

    return slots;
  }, [shifts, bufferMinutes, t, bookingDate, minDateStr, bookedCounts, garageCapacity, receptionServiceMode, selectedServiceIds, selectedComboId, dbServices, dbCombos]);

  // Reset bookingTime nếu không còn hợp lệ khi đổi ngày hoặc danh sách slot đổi
  useEffect(() => {
    if (bookingTime && !timeSlots.some(slot => slot.time === bookingTime)) {
      setBookingTime('');
    }
  }, [bookingDate, timeSlots, bookingTime]);

  // Debounce search customer by phone number
  useEffect(() => {
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      return;
    }

    const phoneSearchTerm = recordSearch.replace(/\D/g, '').replace(/^84/, '');
    if (!phoneSearchTerm) {
      setSearchResults([]);
      setSelectedRecord(null);
      return;
    }

    // Reset selectedRecord when typing a new phone number to start fresh search
    setSelectedRecord(null);

    const timer = setTimeout(async () => {
      try {
        const res = await fetchPrivate(SEARCH_API_ENDPOINTS.CUSTOMER_INFO_BY_PHONE, 'POST', {
          phone: phoneSearchTerm,
          partial: true,
        });
        if (res && res.success && res.data) {
          const customers = Array.isArray(res.data.customers) ? res.data.customers : [];
          const results = customers.map((customer: any) => ({
            type: 'customer',
            id: customer.id,
            name: customer.customer_name,
            phone: customer.phone,
            vehicles: customer.vehicles || []
          }));
          setSearchResults(results);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error("Lỗi tìm kiếm tự động:", err);
        setSearchResults([]);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [recordSearch, fetchPrivate]);

  // Ở tab "Khách vãng lai lần đầu": SĐT vừa gõ có thể đã thuộc về 1 khách có sẵn trong hệ
  // thống — cảnh báo ngay để lễ tân chuyển sang dùng khách cũ, tránh BE âm thầm ghi đè/lẫn tên.
  useEffect(() => {
    if (mode !== 'first_time') {
      setDuplicateCustomer(null);
      return;
    }
    const searchTerm = manualCustPhone.replace(/\D/g, '').replace(/^84/, '');
    if (!searchTerm) {
      setDuplicateCustomer(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingDuplicate(true);
      try {
        const res = await fetchPrivate(SEARCH_API_ENDPOINTS.CUSTOMER_INFO_BY_PHONE, 'POST', {
          phone: searchTerm,
          partial: true,
        });
        const customers = Array.isArray(res?.data?.customers) ? res.data.customers : [];
        const exactMatch = customers.find(
          (c: any) => String(c.phone).replace(/\D/g, '').replace(/^84/, '') === searchTerm,
        );
        setDuplicateCustomer(
          exactMatch
            ? { type: 'customer', id: exactMatch.id, name: exactMatch.customer_name, phone: exactMatch.phone, vehicles: exactMatch.vehicles || [] }
            : null,
        );
      } catch (err) {
        console.error('Không thể kiểm tra số điện thoại:', err);
        setDuplicateCustomer(null);
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [mode, manualCustPhone, fetchPrivate]);

  // Search algorithm for Tab "Khách hàng cũ"
  const handleSearchRecord = async () => {
    const phoneSearchTerm = recordSearch.replace(/\D/g, '').replace(/^84/, '');
    if (!phoneSearchTerm) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await fetchPrivate(SEARCH_API_ENDPOINTS.CUSTOMER_INFO_BY_PHONE, 'POST', {
        phone: phoneSearchTerm,
        partial: true,
      });
      if (res && res.success && res.data) {
        const customers = Array.isArray(res.data.customers) ? res.data.customers : [];
        const results = customers.map((customer: any) => ({
          type: 'customer',
          id: customer.id,
          name: customer.customer_name,
          phone: customer.phone,
          vehicles: customer.vehicles || []
        }));

        if (results.length > 0) {
          setSearchResults(results);
        } else {
          setSearchResults([]);
          showToast('Không tìm thấy khách hàng', 'info');
        }
      } else {
        setSearchResults([]);
        showToast('Không tìm thấy khách hàng', 'info');
      }
    } catch (err: any) {
      console.error(err);
      setSearchResults([]);
      showToast('Không tìm thấy khách hàng với số điện thoại này', 'warning');
    }
  };

  const handleSelectRecord = (record: any) => {
    isSelectingRef.current = true;
    setSelectedRecord(record);

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

    setRecordSearch(record.phone);
    setSearchResults([]);
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
      if (mode === 'existing') {
        if (!selectedRecord) {
          showToast('Vui lòng tìm kiếm và chọn khách hàng.', 'warning');
          return;
        }
        if (vehicleInputMode === 'EXISTING' && !selectedCustomerVehicleId) {
          showToast('Vui lòng chọn xe.', 'warning');
          return;
        }
        if (vehicleInputMode === 'EXISTING') {
          const selectedVehicle = selectedRecord.vehicles?.find(
            (vehicle: any) => String(vehicle.id) === selectedCustomerVehicleId
          );
          if (selectedVehicle?.isDisabled) {
            showToast(selectedVehicle.disableReason || 'Xe này hiện không thể đặt lịch.', 'warning');
            return;
          }
        }
        if (vehicleInputMode === 'NEW') {
          if (!manualVehiclePlate.trim() || !vehicleBrand.trim() || !vehicleModel.trim()) {
            showToast('Vui lòng điền đầy đủ thông tin Xe (Biển số, Hãng, Dòng xe).', 'warning');
            return;
          }
        }
      } else {
        if (!manualCustName.trim() || !manualCustPhone.trim() || !manualVehiclePlate.trim() || !vehicleBrand.trim() || !vehicleModel.trim()) {
          showToast('Vui lòng điền đầy đủ thông tin Khách hàng và Xe.', 'warning');
          return;
        }
        if (duplicateCustomer) {
          showToast('Số điện thoại này đã có khách hàng trong hệ thống. Vui lòng chọn khách hàng có sẵn.', 'warning');
          return;
        }
      }

      if (!bookingDate || !bookingTime) {
        showToast('Vui lòng chọn ngày và giờ hẹn.', 'warning');
        return;
      }

      if (receptionServiceMode === 'SERVICE' && selectedServiceIds.length === 0 && !selectedComboId) {
        showToast('Vui lòng chọn ít nhất 1 dịch vụ hoặc combo.', 'warning');
        return;
      }
      if (receptionServiceMode === 'REPAIR' && !notes.trim()) {
        showToast('Vui lòng điền mô tả tình trạng sửa chữa.', 'warning');
        return;
      }

      let finalVehicleId: number | null = null;
      let walkInPayload: any = undefined;

      if (mode === 'first_time') {
        walkInPayload = {
          customer_name: manualCustName.trim() || undefined,
          customer_phone: manualCustPhone.trim(),
          vehicle_plate: manualVehiclePlate.trim(),
          vehicle_color: manualVehicleColor.trim() || undefined,
          vehicle_year: manualVehicleYear || undefined,
          brand_name: vehicleBrand.trim(),
          model_name: vehicleModel.trim()
        };
      } else if (mode === 'existing') {
        if (vehicleInputMode === 'EXISTING') {
          finalVehicleId = Number(selectedCustomerVehicleId);
        } else {
          walkInPayload = {
            customer_name: selectedRecord?.name || undefined,
            customer_phone: selectedRecord?.phone,
            vehicle_plate: manualVehiclePlate.trim(),
            vehicle_color: manualVehicleColor.trim() || undefined,
            vehicle_year: manualVehicleYear || undefined,
            brand_name: vehicleBrand.trim(),
            model_name: vehicleModel.trim()
          };
        }
      }

      const payload: any = {
        vehicle_id: finalVehicleId,
        walk_in: walkInPayload,
        scheduled_time: `${bookingDate}T${bookingTime}:00`,
        service_ids: receptionServiceMode === 'SERVICE' ? selectedServiceIds : undefined,
        combo_ids: receptionServiceMode === 'SERVICE' && selectedComboId ? [selectedComboId] : undefined,
        notes: notes.trim() ? notes.trim() : undefined,
      };

      const res = await fetchPrivate(APPOINTMENT_API_ENDPOINTS.CREATE_APPOINTMENT, 'POST', payload);
      if (res.success) {
        showToast('Đặt lịch hẹn thành công!', 'success');
        setTimeout(() => {
          navigate('/reception/appointments');
        }, 1000);
      } else {
        throw new Error(res.message || 'Lỗi khi đặt lịch hẹn');
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
          onClick={() => navigate('/reception/appointments')}
          title="Quay lại"
          className="mt-0.5 w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#00285E] hover:border-slate-300 active:scale-[0.97] transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="mb-1 text-2xl font-bold leading-none tracking-tight text-[#00285E] md:text-3xl">
            Đặt lịch hẹn cho khách hàng
          </h1>
          <p className="text-slate-500 text-sm">
            Tạo lịch hẹn trước cho khách hàng — xe chưa cần có mặt tại gara ngay.
          </p>
        </div>
      </div>

      {/* SINGLE APPOINTMENT FORM */}
      <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-6 md:p-7">
      {/* SEGMENTED TAB CONTROL FOR SECTIONS */}
      <div className="flex w-full rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => {
            setMode('existing');
            setSelectedRecord(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all ${mode === 'existing'
            ? 'bg-[#00285E] text-white shadow-sm shadow-[#00285E]/20'
            : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <Layers size={14} />
          <span>Khách hàng cũ</span>
        </button>
        <button
          onClick={() => {
            setMode('first_time');
            setSelectedRecord(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all ${mode === 'first_time'
            ? 'bg-[#00285E] text-white shadow-sm shadow-[#00285E]/20'
            : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <PlusCircle size={14} />
          <span>Khách vãng lai lần đầu</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'existing' ? (
          /* SECTION 1: EXISTING CUSTOMER */
          <motion.div
            key="existing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-5 space-y-5"
          >
            {/* SEARCH INPUT BAR */}
            <div className="relative space-y-3 rounded-xl border border-slate-200/70 bg-slate-50/70 p-4 sm:p-5">
              <h2 className="text-xs font-bold text-[#00285E] uppercase tracking-widest flex items-center gap-2">
                <Search size={14} />
                Tìm kiếm Khách hàng hiện tại bằng SĐT
              </h2>
              <div className="flex items-start gap-2">
                <div className="login-phone flex-1">
                  <PhoneInput
                    country="vn"
                    countryCodeEditable={false}
                    value={recordSearch}
                    onChange={(val) => setRecordSearch(val)}
                    enableSearch
                    searchPlaceholder="Tìm quốc gia..."
                    inputProps={{ name: 'search_phone' }}
                  />
                </div>
              </div>

              {/* SEARCH RESULTS DROPDOWN */}
              {searchResults.length > 0 && (
                <div className="absolute left-5 right-5 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectRecord(r)}
                      className="w-full px-4 py-3 text-left flex items-center justify-between text-sm transition-colors hover:bg-slate-50"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">
                          {r.name} ({r.phone})
                        </span>
                        <span className="text-xs font-semibold mt-0.5 text-slate-400">
                          Số lượng xe: {r.vehicles?.length || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-right">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase text-[#00285E] bg-[#EDF3FF]">
                          Hồ sơ: {r.id}
                        </span>
                        <UserCheck size={16} className="text-[#00285E]" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* READONLY CUSTOMER & VEHICLE DISPLAY */}
            {selectedRecord ? (
              <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-5 md:grid-cols-2">
                {/* READONLY CUSTOMER INFO */}
                <div className="rounded-xl bg-slate-50/70 p-4 sm:p-5">
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

                {/* VEHICLE INFO: EXISTING OR NEW */}
                <div className="space-y-4 rounded-xl bg-slate-50/70 p-4 sm:p-5">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-3">
                    <Car size={16} className="text-[#00285E]" />
                    Thông tin Xe đặt lịch
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
                          {selectedRecord.vehicles?.map((v: any) => (
                            <option key={v.id} value={v.id} disabled={v.isDisabled}>
                              {v.license_plate} - {v.brand} {v.model} {v.isDisabled ? `(${v.disableReason})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
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
                        label="Màu xe"
                        value={manualVehicleColor}
                        onChange={setManualVehicleColor}
                        placeholder="VD: Đỏ, Đen, Trắng..."
                      />
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
            ) : null}
          </motion.div>
        ) : (
          /* SECTION 2: FIRST-TIME CUSTOMER WITH EDITABLE FIELDS */
          <motion.div
            key="first-time"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-200 pt-5 md:grid-cols-2"
          >
            {/* EDITABLE CUSTOMER INFO */}
            <div className="space-y-4 rounded-xl bg-slate-50/70 p-4 sm:p-5">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-3">
                <User size={16} className="text-[#00285E]" />
                Thông tin Khách hàng mới
              </h2>
              <div className="space-y-4">
                <FormInput
                  label="Họ và tên khách hàng *"
                  value={manualCustName}
                  onChange={setManualCustName}
                  placeholder="Nhập họ và tên khách hàng..."
                />
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest mb-2 px-1 text-slate-700">
                    SỐ ĐIỆN THOẠI *
                  </label>
                  <div className="login-phone">
                    <PhoneInput
                      country="vn"
                      countryCodeEditable={false}
                      value={manualCustPhone}
                      onChange={(val) => setManualCustPhone(val)}
                      enableSearch
                      searchPlaceholder="Tìm quốc gia..."
                      inputProps={{ name: 'phone' }}
                    />
                  </div>
                  {isCheckingDuplicate && (
                    <p className="mt-2 text-xs font-semibold text-slate-400">Đang kiểm tra số điện thoại...</p>
                  )}
                  {duplicateCustomer && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                      <div className="flex items-start gap-2">
                        <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-amber-800">
                            Số điện thoại này đã thuộc về khách hàng "{duplicateCustomer.name}"
                          </p>
                          <p className="mt-0.5 text-[11px] text-amber-700">
                            Đã có {duplicateCustomer.vehicles?.length || 0} xe trong hệ thống. Vui lòng chọn khách hàng có sẵn để tránh trùng/nhầm hồ sơ.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setMode('existing');
                              handleSelectRecord(duplicateCustomer);
                            }}
                            className="mt-2.5 rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-amber-700"
                          >
                            Chọn khách hàng này
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* EDITABLE VEHICLE INFO */}
            <div className="space-y-4 rounded-xl bg-slate-50/70 p-4 sm:p-5">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-3">
                <Car size={16} className="text-[#00285E]" />
                Thông tin Xe đặt lịch
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <FormInput
                    label="Biển số xe *"
                    value={manualVehiclePlate}
                    onChange={setManualVehiclePlate}
                    placeholder="VD: 51A-123.45..."
                  />
                </div>
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
                <div>
                  <FormInput
                    label="Màu xe"
                    value={manualVehicleColor}
                    onChange={setManualVehicleColor}
                    placeholder="VD: Đỏ, Đen, Trắng..."
                  />
                </div>
                <div>
                  <FormInput
                    label="Năm sản xuất"
                    value={manualVehicleYear}
                    onChange={setManualVehicleYear}
                    placeholder="VD: 2022..."
                    type="number"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCHEDULED TIME */}
      <div className="mt-5 space-y-4 border-t border-slate-200 pt-5">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-3">
          <Calendar size={16} className="text-[#00285E]" />
          Thời gian hẹn <span className="text-rose-500">*</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400" />
              Ngày hẹn
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
              Giờ hẹn
            </label>
            <select
              value={bookingTime}
              onChange={(e) => setBookingTime(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-700"
            >
              <option value="">-- Chọn giờ hẹn --</option>
              {timeSlots.map((slot) => (
                <option key={slot.time} value={slot.time} disabled={slot.isFull}>
                  {slot.time} ({slot.label}){slot.isFull ? ' - Kín lịch' : ''}
                </option>
              ))}
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

      {/* SERVICE OR REPAIR SELECTION */}
      <div className="mt-5 space-y-6 border-t border-slate-200 pt-5">
        {/* Toggle Buttons */}
        <div className="flex gap-2 p-1 bg-slate-100/60 rounded-xl w-fit border border-slate-200/20">
          <button
            type="button"
            onClick={() => setReceptionServiceMode('SERVICE')}
            className={`py-2.5 px-5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${receptionServiceMode === 'SERVICE'
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
            className={`py-2.5 px-5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${receptionServiceMode === 'REPAIR'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            <Wrench size={14} />
            Kiểm tra và Sửa chữa
          </button>
        </div>

        {/* REPAIR NOTES */}
        {receptionServiceMode === 'REPAIR' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
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
          </motion.div>
        )}

        {receptionServiceMode === 'SERVICE' && (
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-widest">
                <Settings size={16} className="text-[#00285E]" />
                Chọn Dịch vụ <span className="text-rose-500">*</span>
              </h2>
              <span className="text-xs font-bold text-[#00285E] bg-[#EDF3FF] px-3 py-1 rounded-lg">
                Đã chọn: {selectedServiceIds.length + (selectedComboId ? 1 : 0)} — Tổng: {formatPrice(selectedTotal)}
              </span>
            </div>

            <div>
              {/* Sub-tabs Selector */}
              <div className="flex gap-2 mb-4 border-b border-slate-100 pb-3 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveServiceTab('single')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeServiceTab === 'single'
                    ? 'bg-[#00285E] text-white shadow-sm'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                >
                  <Wrench size={14} />
                  <span>Dịch vụ lẻ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveServiceTab('combo')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeServiceTab === 'combo'
                    ? 'bg-[#00285E] text-white shadow-sm'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                >
                  <Package size={14} />
                  <span>Combo</span>
                </button>
              </div>

              {/* Tab contents */}
              <div className="mt-4">
                {activeServiceTab === 'single' && (
                  <SingleServicesSelector
                    mappedServices={currentPageServices}
                    activeCategories={activeCategories}
                    selectedServiceIds={selectedServiceIds}
                    setSelectedServiceIds={setSelectedServiceIds}
                    COLORS={{ orange: '#00285E', navy: '#FFFFFF' }}
                    t={(k, d) => (t as any)(k, d)}
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
                  />
                )}

                {activeServiceTab === 'combo' && (
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
                  />
                )}
              </div>

              {selectedServiceIds.length === 0 && !selectedComboId && (
                <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl text-xs font-semibold text-amber-600">
                  <AlertCircle size={14} />
                  Cần chọn ít nhất 1 dịch vụ hoặc combo.
                </div>
              )}
            </div>
          </div>
        )}

        {receptionServiceMode === 'REPAIR' && !notes.trim() && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl text-xs font-semibold text-amber-600">
            <AlertCircle size={14} />
            Cần điền mô tả tình trạng sửa chữa.
          </div>
        )}
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={() => navigate('/reception/appointments')}
          className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
        >
          Hủy
        </button>
        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 px-6 py-3 bg-[#00285E] hover:bg-[#001a3f] text-white rounded-xl text-sm font-bold shadow-md shadow-[#00285E]/15 transition-all transform hover:translate-y-[-1px]"
        >
          <CalendarCheck size={16} />
          Đặt lịch hẹn
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
