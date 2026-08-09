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
} from 'lucide-react';
import { useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
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
import SingleServicesSelector from '../../customer/booking/SingleServicesSelector';
import ComboServicesSelector from '../../customer/booking/ComboServicesSelector';




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



export default function ReceptionCreateServiceOrder() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  }>();

  // Tab mode: 'approved_record' (Lịch hẹn/KH có sẵn) or 'first_time' (Khách lần đầu đến)
  const initialMode = searchParams.get('appointmentId') ? 'approved_record' : 'approved_record';
  const [mode, setMode] = useState<'approved_record' | 'first_time'>(initialMode);

  const rescueId = searchParams.get('rescueId');

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
  const [manualVehicleColor, setManualVehicleColor] = useState('');
  const [manualVehicleYear, setManualVehicleYear] = useState('');
  const [currentOdo, setCurrentOdo] = useState(searchParams.get('odo') || '');
  const [initialCondition, setInitialCondition] = useState(searchParams.get('condition') || '');
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

  // Common fields
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [selectedCombos, setSelectedCombos] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState(''); // Mô tả tình trạng hỏng hóc
  const [receptionServiceMode, setReceptionServiceMode] = useState<'SERVICE' | 'REPAIR'>('SERVICE');
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

  // Handle URL appointmentId param on mount
  useEffect(() => {
    const apptId = searchParams.get('appointmentId');
    if (apptId) {
      const fetchAppt = async () => {
        setIsLoadingRecord(true);
        try {
          const response = await fetchPrivate(APPOINTMENT_API_ENDPOINTS.GET_APPOINTMENT_DETAIL(apptId));
          if (response.success && response.data) {
            const data = response.data;
            const servicesDetails: any[] = [];
            if (Array.isArray(data.appointmentDetails)) {
              data.appointmentDetails.forEach((detail: any) => {
                if (detail.catalog) {
                  servicesDetails.push({
                    id: detail.catalog.id,
                    name: detail.catalog.service_name,
                    price: detail.catalog.price,
                    category: 'Dịch vụ lẻ'
                  });
                }
                if (detail.combo) {
                  const subServices = detail.combo.catalogs
                    ? detail.combo.catalogs.map((c: any) => c.service_name)
                    : [];
                  servicesDetails.push({
                    id: detail.combo.id,
                    name: detail.combo.combo_name,
                    price: detail.combo.total_price || 0,
                    category: 'Combo dịch vụ',
                    description: detail.combo.description,
                    subServices
                  });
                }
              });
            }

            let appointmentDate = '';
            let appointmentTime = '';
            if (data.scheduled_time) {
              const dateObj = new Date(data.scheduled_time);
              appointmentDate = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');
              appointmentTime = String(dateObj.getHours()).padStart(2, '0') + ':' + String(dateObj.getMinutes()).padStart(2, '0');
            }

            const initialServiceIds: number[] = [];
            let initialComboId: number | null = null;
            if (Array.isArray(data.appointmentDetails)) {
              data.appointmentDetails.forEach((detail: any) => {
                if (detail.catalog) {
                  initialServiceIds.push(detail.catalog.id);
                }
                if (detail.combo) {
                  initialComboId = detail.combo.id;
                }
              });
            }

            if (data.booking_type && data.booking_type.includes('REPAIR')) {
              setReceptionServiceMode('REPAIR');
              if (data.notes && servicesDetails.length === 0) {
                servicesDetails.push({
                  id: 'repair-notes',
                  name: 'Khám & Sửa chữa lỗi',
                  price: 0,
                  category: 'Yêu cầu của khách',
                  description: data.notes
                });
              }
            } else {
              setReceptionServiceMode('SERVICE');
            }

            if (data.notes) {
              setNotes(data.notes);
            }
            if (data.reception_condition) {
              setInitialCondition(data.reception_condition);
            }

            setSelectedRecord({
              type: 'appointment',
              id: String(data.id),
              vehicleId: data.vehicle?.id,
              name: data.customer?.name || data.customer?.user?.fullName || 'Khách vãng lai',
              phone: data.customer?.user?.phoneNumber || data.customer?.phone || '',
              plate: data.vehicle?.license_plate || 'Chưa cập nhật',
              model: data.vehicle?.model ? `${data.vehicle.model.make?.make_name || ''} ${data.vehicle.model.model_name || ''}`.trim() : 'Chưa cập nhật',
              color: data.vehicle?.color || '',
              year: data.vehicle?.year || '',
              mileage: data.vehicle?.mileage || '',
              appointmentDate,
              appointmentTime,
              servicesDetails,
            });
            setSelectedServiceIds(initialServiceIds);
            setSelectedComboId(initialComboId);
            setMode('approved_record');
          }
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoadingRecord(false);
        }
      };
      fetchAppt();
    }
  }, [searchParams]);

  // Search algorithm for Tab 1
  const handleSearchRecord = async () => {
    if (!recordSearch || !recordSearch.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await fetchPrivate(SEARCH_API_ENDPOINTS.CUSTOMER_INFO_BY_PHONE, 'POST', { phone: recordSearch });
      if (res && res.success && res.data) {
        const { customer, appointments } = res.data;
        const results: any[] = [];

        // 1. Nếu khách hàng có Lịch hẹn (Appointments)
        if (appointments && appointments.length > 0) {
          appointments.forEach((apt: any) => {
            results.push({
              type: 'appointment',
              id: String(apt.id),
              name: apt.customer_name,
              phone: apt.phone,
              plate: apt.vehicle?.license_plate || 'Chưa cập nhật',
              vin: apt.vehicle?.vin_number || '',
              model: apt.vehicle ? `${apt.vehicle.brand} ${apt.vehicle.model}`.trim() : 'Chưa cập nhật',
              appointmentDate: apt.appointmentDate,
              appointmentTime: apt.appointmentTime,
              vehicleId: apt.vehicle?.id
            });
          });
        }

        // 2. Tùy chọn Tiếp nhận khách vãng lai (Không có lịch hẹn)
        if (customer) {
          results.push({
            type: 'customer',
            id: customer.id,
            name: customer.customer_name,
            phone: customer.phone,
            vehicles: customer.vehicles || []
          });
        }

        if (results.length > 0) {
          setSearchResults(results);
        } else {
          setSearchResults([]);
          showToast('Không tìm thấy khách hàng hoặc lịch hẹn', 'info');
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

    setRecordSearch('');
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

      if (receptionServiceMode === 'SERVICE' && selectedServiceIds.length === 0 && !selectedComboId) {
        showToast('Vui lòng chọn ít nhất 1 dịch vụ hoặc combo.', 'warning');
        return;
      }
      if (receptionServiceMode === 'REPAIR' && !notes.trim()) {
        showToast('Vui lòng điền mô tả tình trạng sửa chữa.', 'warning');
        return;
      }

      // Determine explicit booking type
      let finalBookingType = '';
      if (mode === 'first_time') {
        finalBookingType = receptionServiceMode === 'SERVICE' ? 'WALK_IN_SPECIFIC' : 'WALK_IN_REPAIR';
      } else if (mode === 'approved_record' && selectedRecord?.type === 'customer') {
        finalBookingType = receptionServiceMode === 'SERVICE' ? 'RECEPTIONIST_SPECIFIC' : 'RECEPTIONIST_REPAIR';
      }

      // Prepare payload
      let finalVehicleId = null;
      let walkInPayload = undefined;

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
      } else if (mode === 'approved_record') {
        if (selectedRecord?.type === 'appointment') {
          finalVehicleId = Number(selectedRecord.vehicleId);
        } else if (selectedRecord?.type === 'customer') {
          if (vehicleInputMode === 'EXISTING') {
            finalVehicleId = Number(selectedCustomerVehicleId);
          } else {
            // Thêm mới xe cho khách hàng cũ
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
      }

      const payload: any = {
        booking_type: finalBookingType || undefined,
        vehicle_id: finalVehicleId,
        walk_in: walkInPayload,
        bay_id: Number(bayId) || null,
        current_odo: currentOdo.trim() ? Number(currentOdo) : undefined,
        service_ids: receptionServiceMode === 'SERVICE' ? selectedServiceIds : undefined,
        combo_ids: receptionServiceMode === 'SERVICE' && selectedComboId ? [selectedComboId] : undefined,
        notes: notes.trim() ? notes.trim() : undefined,
        symptoms: initialCondition.trim() ? initialCondition.trim() : undefined,
        rescue_id: rescueId ? Number(rescueId) : undefined
      };

      if (mode === 'approved_record' && selectedRecord?.type === 'appointment') {
        payload.appointment_id = Number(selectedRecord.id);
      }

      const res = await fetchPrivate(SERVICE_ORDER_API_ENDPOINTS.CREATE, 'POST', payload);
      if (res.success) {
        const isWaitingForBay = res.data?.bay_status?.toUpperCase() === 'WAITING';
        showToast(
          isWaitingForBay
            ? 'Đã tiếp nhận xe. Xe đang chờ cầu nâng trống.'
            : 'Tạo hóa đơn dịch vụ thành công!',
          isWaitingForBay ? 'info' : 'success'
        );
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

      {/* SEGMENTED TAB CONTROL FOR SECTIONS */}
      <div className="flex p-1 bg-slate-100 rounded-xl max-w-xl">
        <button
          onClick={() => {
            setMode('approved_record');
            setSelectedRecord(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all ${mode === 'approved_record'
            ? 'bg-white text-[#00285E] shadow-sm'
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
            ? 'bg-white text-[#00285E] shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <PlusCircle size={14} />
          <span>Khách vãng lai lần đầu</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'approved_record' ? (
          /* SECTION 1: CREATE FROM APPROVED APPOINTMENT OR CHECKED-IN CUSTOMER */
          <motion.div
            key="approved-record"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* SEARCH INPUT BAR */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200/60 p-5 space-y-3 relative">
              <h2 className="text-xs font-bold text-[#00285E] uppercase tracking-widest flex items-center gap-2">
                <Search size={14} />
                Tìm kiếm Khách hàng hiện tại bằng SĐT
              </h2>
              <div className="flex items-start gap-2">
                <div className="login-phone flex-1">
                  <PhoneInput
                    country="vn"
                    value={recordSearch}
                    onChange={(val) => setRecordSearch(val)}
                    enableSearch
                    searchPlaceholder="Tìm quốc gia..."
                    inputProps={{ name: 'search_phone' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearchRecord}
                  className="px-6 h-12 bg-[#00285E] text-white rounded-xl text-sm font-bold shadow-sm hover:bg-[#001a3f] transition-colors whitespace-nowrap"
                >
                  Tìm kiếm
                </button>
              </div>

              {/* SEARCH RESULTS DROPDOWN */}
              {searchResults.length > 0 && (
                <div className="absolute left-5 right-5 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.map((r, i) => {
                    const isDisabled = r.type === 'appointment' && r.isInGarage;
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => handleSelectRecord(r)}
                        className={`w-full px-4 py-3 text-left flex items-center justify-between text-sm transition-colors ${isDisabled ? 'bg-rose-50/50 cursor-not-allowed' : 'hover:bg-slate-50'
                          }`}
                      >
                        <div className="flex flex-col">
                          <span className={`font-bold ${isDisabled ? 'text-rose-700' : 'text-slate-800'}`}>
                            {r.name} ({r.phone})
                          </span>
                          <span className={`text-xs font-semibold mt-0.5 ${isDisabled ? 'text-rose-500' : 'text-slate-400'}`}>
                            {r.type === 'appointment' ? `Xe: ${r.plate} • ${r.model}` : `Số lượng xe: ${r.vehicles?.length || 0}`}
                            {isDisabled && ' (ĐANG TRONG XƯỞNG)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-right">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${isDisabled ? 'text-rose-700 bg-rose-100' : 'text-[#00285E] bg-[#EDF3FF]'
                            }`}>
                            {r.type === 'appointment' ? `Lịch hẹn: ${r.id}` : `Hồ sơ: ${r.id}`}
                          </span>
                          <UserCheck size={16} className={isDisabled ? "text-rose-400" : "text-[#00285E]"} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

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
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Trạng thái tiếp nhận xe ban đầu
                      </label>
                      <textarea
                        value={initialCondition}
                        onChange={(e) => setInitialCondition(e.target.value)}
                        placeholder="Ghi chú về tình trạng xe khi tiếp nhận (ví dụ: xước xát thân vỏ, móp méo...)"
                        rows={3}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* VEHICLE INFO: READONLY OR EDITABLE */}
                {selectedRecord.type === 'appointment' ? (
                  <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6">
                    <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-3">
                      <Car size={16} className="text-[#00285E]" />
                      Thông tin Xe
                    </h2>
                    <div className="space-y-3">
                      <FormReadonly label="Biển số" value={selectedRecord.plate} highlight />
                      <FormReadonly label="Loại xe" value={selectedRecord.model} />
                      <FormReadonly label="Màu xe" value={selectedRecord.color || '—'} />
                      <FormReadonly label="Năm SX" value={selectedRecord.year?.toString() || '—'} />
                    </div>
                  </div>
                ) : (
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
                              <FormReadonly label="Màu xe" value={v.color || '—'} />
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
                )}
              </div>
            ) : null}
          </motion.div>
        ) : (
          /* SECTION 2: FOR FIRST-TIME WALK-IN CUSTOMERS WITH EDITABLE FIELDS */
          <motion.div
            key="first-time"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* EDITABLE CUSTOMER INFO */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6 space-y-4">
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
                      value={manualCustPhone}
                      onChange={(val) => setManualCustPhone(val)}
                      enableSearch
                      searchPlaceholder="Tìm quốc gia..."
                      inputProps={{ name: 'phone' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* EDITABLE VEHICLE INFO */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-3">
                <Car size={16} className="text-[#00285E]" />
                Thông tin Xe tiếp nhận
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

      {/* SERVICE OR REPAIR SELECTION */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6 space-y-6">
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
