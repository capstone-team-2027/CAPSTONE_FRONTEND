import { useEffect, useMemo, useState, useRef } from 'react';
import {
  ArrowLeft,
  Car,
  CheckCircle2,
  Loader2,
  Phone,
  Search,
  User,
  Wrench,
  Layers,
  PlusCircle,
  UserCheck,
  Settings,
  StickyNote,
  AlertCircle,
  Package,
} from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import * as PhoneInputLib from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { SERVICE_ORDER_API_ENDPOINTS, APPOINTMENT_API_ENDPOINTS } from '../../../constants/reception/appointmentsEndpoints';
import { SEARCH_API_ENDPOINTS } from '../../../constants/reception/searchEndpoints';
import { SERVICE_API_ENDPOINTS } from '../../../constants/customer/serviceApiEndpoints';
import { useFetchClient_v2 } from '../../../hook/useFetchClient';
import type { ServiceCombo, ServiceItem as CustomerServiceItem } from '../../../model/Service';
import { useTranslation } from 'react-i18next';
import { VEHICLE_MAKE_MODEL_API_ENDPOINTS } from '../../../constants/customer/vehicelMakeModelEndpoint';
import SingleServicesSelector from '../../customer/booking/SingleServicesSelector';
import ComboServicesSelector from '../../customer/booking/ComboServicesSelector';

type Vehicle = {
  id: number;
  license_plate: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  isInGarage?: boolean;
};

type CustomerResult = {
  id: number;
  customer_name: string;
  phone: string;
  vehicles: Vehicle[];
};

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

export default function ReceptionReceiveCustomer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { fetchPrivate, fetchPublic } = useFetchClient_v2();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  }>();

  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [vehicleMode, setVehicleMode] = useState<'existing' | 'new'>('existing');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [year, setYear] = useState('');
  const [odo, setOdo] = useState('');
  const [condition, setCondition] = useState('');

  const [serviceMode, setServiceMode] = useState<'SERVICE' | 'REPAIR'>('SERVICE');
  const [services, setServices] = useState<any[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [selectedComboId, setSelectedComboId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [servicePage, setServicePage] = useState(1);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [dbCombos, setDbCombos] = useState<ServiceCombo[]>([]);
  const [activeServiceTab, setActiveServiceTab] = useState<'single' | 'combo'>('single');
  const [comboSearch, setComboSearch] = useState('');
  const [repairNotes, setRepairNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Vehicle autocomplete states
  const [brandSuggestions, setBrandSuggestions] = useState<any[]>([]);
  const [modelSuggestions, setModelSuggestions] = useState<any[]>([]);
  const [selectedMakeId, setSelectedMakeId] = useState<number | null>(null);
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);

  const brandRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);

  // Load services, categories and combos from backend
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
          setServices(servicesData);
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
  }, [fetchPrivate]);

  // Debounce search customer by phone number
  useEffect(() => {
    if (customerMode !== 'existing' || selectedCustomer) return;
    const searchTerm = phoneSearch.replace(/\D/g, '').replace(/^84/, '');
    if (!searchTerm) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetchPrivate(SEARCH_API_ENDPOINTS.CUSTOMER_INFO_BY_PHONE, 'POST', {
          phone: searchTerm,
          partial: true,
        });
        setResults(Array.isArray(response?.data?.customers) ? response.data.customers : []);
      } catch (error) {
        console.error('Không thể tìm khách hàng:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [customerMode, phoneSearch, selectedCustomer, fetchPrivate]);

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
    if (!brand.trim()) {
      setBrandSuggestions([]);
      return;
    }

    const delayFn = setTimeout(async () => {
      try {
        const res = await fetchPublic(VEHICLE_MAKE_MODEL_API_ENDPOINTS.GET_VEHICLE_MAKES, "POST", { search: brand });
        if (res && res.data) {
          setBrandSuggestions(res.data);
        }
      } catch (error) {
        console.error("Lỗi khi tìm kiếm hãng xe:", error);
      }
    }, 500);

    return () => clearTimeout(delayFn);
  }, [brand, fetchPublic]);

  // Debounce fetch Vehicle Models
  useEffect(() => {
    if (!model.trim()) {
      setModelSuggestions([]);
      return;
    }

    const delayFn = setTimeout(async () => {
      try {
        const body: any = { search: model };
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
  }, [model, selectedMakeId, fetchPublic]);

  const activeCategories = useMemo(() => {
    return dbCategories.filter((c: any) => c.is_active !== false);
  }, [dbCategories]);

  const activeDbServices = useMemo(() => {
    return services.filter((s: any) => s.is_active !== false);
  }, [services]);

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

  const selectCustomer = (customer: CustomerResult) => {
    setSelectedCustomer(customer);
    setPhoneSearch(customer.phone);
    setResults([]);
    const availableVehicle = customer.vehicles?.find(vehicle => !vehicle.isInGarage);
    if (availableVehicle) {
      setVehicleMode('existing');
      setSelectedVehicleId(String(availableVehicle.id));
    } else {
      setVehicleMode('new');
      setSelectedVehicleId('');
    }
  };

  const resetCustomer = () => {
    setSelectedCustomer(null);
    setPhoneSearch('');
    setResults([]);
    setSelectedVehicleId('');
    setCustomerName('');
    setCustomerPhone('');
    setPlate('');
    setBrand('');
    setModel('');
    setColor('');
    setYear('');
    setOdo('');
    setCondition('');
    setSelectedServiceIds([]);
    setSelectedComboId(null);
    setRepairNotes('');
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
    if (customerMode === 'existing') {
      if (!selectedCustomer) {
        showToast('Vui lòng tìm và chọn khách hàng.', 'warning');
        return;
      }
      if (vehicleMode === 'existing' && !selectedVehicleId) {
        showToast('Vui lòng chọn xe.', 'warning');
        return;
      }
      if (vehicleMode === 'new' && (!plate.trim() || !brand.trim() || !model.trim())) {
        showToast('Vui lòng nhập biển số, hãng xe và dòng xe.', 'warning');
        return;
      }
    } else {
      if (!customerName.trim() || !customerPhone.trim()) {
        showToast('Vui lòng nhập họ tên và số điện thoại khách hàng.', 'warning');
        return;
      }
      if (!plate.trim() || !brand.trim() || !model.trim()) {
        showToast('Vui lòng nhập biển số, hãng xe và dòng xe.', 'warning');
        return;
      }
    }
    if (serviceMode === 'SERVICE' && selectedServiceIds.length === 0 && !selectedComboId) {
      showToast('Vui lòng chọn ít nhất một dịch vụ hoặc combo.', 'warning');
      return;
    }
    if (serviceMode === 'REPAIR' && !repairNotes.trim()) {
      showToast('Vui lòng mô tả tình trạng cần sửa chữa.', 'warning');
      return;
    }

    const useNewVehicle = customerMode === 'new' || vehicleMode === 'new';
    const payload = {
      booking_type: customerMode === 'new'
        ? (serviceMode === 'SERVICE' ? 'WALK_IN_SPECIFIC' : 'WALK_IN_REPAIR')
        : (serviceMode === 'SERVICE' ? 'RECEPTIONIST_SPECIFIC' : 'RECEPTIONIST_REPAIR'),
      vehicle_id: useNewVehicle ? null : Number(selectedVehicleId),
      walk_in: useNewVehicle ? {
        customer_name: customerMode === 'new' ? customerName.trim() : selectedCustomer?.customer_name,
        customer_phone: customerMode === 'new' ? customerPhone.trim() : selectedCustomer?.phone,
        vehicle_plate: plate.trim(),
        vehicle_color: color.trim() || undefined,
        vehicle_year: year || undefined,
        brand_name: brand.trim(),
        model_name: model.trim(),
      } : undefined,
      current_odo: odo.trim() ? Number(odo) : undefined,
      service_ids: serviceMode === 'SERVICE' ? selectedServiceIds : undefined,
      combo_ids: serviceMode === 'SERVICE' && selectedComboId ? [selectedComboId] : undefined,
      notes: serviceMode === 'REPAIR' ? repairNotes.trim() : undefined,
      symptoms: condition.trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      const response = await fetchPrivate(APPOINTMENT_API_ENDPOINTS.CREATE_WALK_IN, 'POST', payload);
      if (!response?.success) throw new Error(response?.message || 'Tiếp nhận khách hàng thất bại');
      showToast('Tiếp nhận khách hàng thành công!', 'success');
      navigate('/reception/appointments');
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Tiếp nhận khách hàng thất bại', 'warning');
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
          <h1 className="mb-1 text-2xl font-bold leading-none tracking-tight text-[#00285E] md:text-3xl">
            Tiếp nhận khách hàng
          </h1>
          <p className="text-slate-500 text-sm">
            Ghi nhận khách và xe đến trực tiếp tại gara.
          </p>
        </div>
      </div>

      {/* SINGLE RECEPTION FORM */}
      <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-6 md:p-7">
      {/* SEGMENTED TAB CONTROL FOR SECTIONS */}
      <div className="flex w-full rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => {
            setCustomerMode('existing');
            resetCustomer();
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all ${
            customerMode === 'existing'
              ? 'bg-[#00285E] text-white shadow-sm shadow-[#00285E]/20'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers size={14} />
          <span>Khách hàng cũ</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setCustomerMode('new');
            resetCustomer();
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all ${
            customerMode === 'new'
              ? 'bg-[#00285E] text-white shadow-sm shadow-[#00285E]/20'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <PlusCircle size={14} />
          <span>Khách hàng mới</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {customerMode === 'existing' ? (
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
                    value={phoneSearch}
                    onChange={(val) => {
                      setPhoneSearch(val);
                      setSelectedCustomer(null);
                      if (!val.replace(/\D/g, '').replace(/^84/, '')) {
                        setResults([]);
                      }
                    }}
                    enableSearch
                    searchPlaceholder="Tìm quốc gia..."
                    inputProps={{ name: 'search_phone' }}
                  />
                </div>
              </div>

              {/* SEARCH RESULTS DROPDOWN */}
              {results.length > 0 && (
                <div className="absolute left-5 right-5 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {results.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectCustomer(r)}
                      className="w-full px-4 py-3 text-left flex items-center justify-between text-sm transition-colors hover:bg-slate-50"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">
                          {r.customer_name} ({r.phone})
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
            {selectedCustomer ? (
              <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-5 md:grid-cols-2">
                {/* READONLY CUSTOMER INFO */}
                <div className="rounded-xl bg-slate-50/70 p-4 sm:p-5">
                  <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-3">
                    <User size={16} className="text-[#00285E]" />
                    Thông tin Khách hàng
                  </h2>
                  <div className="space-y-3">
                    <FormReadonly label="Họ và tên" value={selectedCustomer.customer_name} />
                    <FormReadonly
                      label="Số điện thoại"
                      value={selectedCustomer.phone}
                      icon={<Phone size={14} className="text-slate-400" />}
                    />
                  </div>
                </div>

                {/* VEHICLE INFO: EXISTING OR NEW */}
                <div className="space-y-4 rounded-xl bg-slate-50/70 p-4 sm:p-5">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-3">
                    <Car size={16} className="text-[#00285E]" />
                    Thông tin Xe tiếp nhận
                  </h2>

                  <div className="flex gap-6 mb-2">
                    {selectedCustomer.vehicles && selectedCustomer.vehicles.length > 0 && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={vehicleMode === 'existing'}
                          onChange={() => {
                            const availableVehicle = selectedCustomer.vehicles.find(v => !v.isInGarage);
                            if (!availableVehicle) {
                              showToast('Tất cả xe đã lưu hiện đang ở trong xưởng.', 'warning');
                              return;
                            }
                            setVehicleMode('existing');
                            const currentVehicle = selectedCustomer.vehicles.find(
                              v => String(v.id) === selectedVehicleId
                            );
                            if (!currentVehicle || currentVehicle.isInGarage) {
                              setSelectedVehicleId(String(availableVehicle.id));
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
                        checked={vehicleMode === 'new'}
                        onChange={() => setVehicleMode('new')}
                        className="accent-[#00285E]"
                      />
                      <span className="text-sm font-bold text-slate-700">Thêm xe mới</span>
                    </label>
                  </div>

                  {vehicleMode === 'existing' ? (
                    <div className="space-y-4">
                      <div className="mb-4">
                        <select
                          value={selectedVehicleId}
                          onChange={(e) => setSelectedVehicleId(e.target.value)}
                          className="w-full bg-[#F8FAFC] border border-blue-50/50 rounded-xl p-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-[#00285E]"
                        >
                          <option value="">Chọn xe</option>
                          {selectedCustomer.vehicles?.map((v) => (
                            <option key={v.id} value={v.id} disabled={v.isInGarage}>
                              {v.license_plate} - {v.brand} {v.model} {v.isInGarage ? '(Đang trong xưởng)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      {(() => {
                        const v = selectedCustomer.vehicles?.find(x => String(x.id) === selectedVehicleId);
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
                        value={plate}
                        onChange={setPlate}
                        placeholder="VD: 51A-123.45..."
                      />
                      <div className="relative" ref={brandRef}>
                        <FormInput
                          label="Hãng xe *"
                          value={brand}
                          onChange={(val) => {
                            setBrand(val);
                            setShowBrandSuggestions(true);
                            setSelectedMakeId(null);
                            setModel('');
                          }}
                          placeholder="VD: Toyota"
                        />
                        {showBrandSuggestions && brandSuggestions.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {brandSuggestions.map((b: any) => (
                              <div
                                key={b.id}
                                className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm font-semibold text-slate-700"
                                onClick={() => {
                                  setBrand(b.make_name);
                                  setSelectedMakeId(b.id);
                                  setShowBrandSuggestions(false);
                                  setModel('');
                                }}
                              >
                                {b.make_name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="relative" ref={modelRef}>
                        <FormInput
                          label="Dòng xe *"
                          value={model}
                          onChange={(val) => {
                            setModel(val);
                            setShowModelSuggestions(true);
                          }}
                          placeholder="VD: Camry"
                        />
                        {showModelSuggestions && modelSuggestions.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {modelSuggestions.map((m: any) => (
                              <div
                                key={m.id}
                                className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm font-semibold text-slate-700"
                                onClick={() => {
                                  setModel(m.model_name);
                                  setBrand(m.make?.make_name || brand);
                                  if (m.make_id) setSelectedMakeId(m.make_id);
                                  setShowModelSuggestions(false);
                                }}
                              >
                                {m.model_name} <span className="text-xs text-slate-400">({m.make?.make_name})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <FormInput
                        label="Màu xe"
                        value={color}
                        onChange={setColor}
                        placeholder="VD: Đỏ, Đen, Trắng..."
                      />
                      <FormInput
                        label="Năm sản xuất"
                        value={year}
                        onChange={setYear}
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
          /* SECTION 2: NEW CUSTOMER */
          <motion.div
            key="new-customer"
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
                  value={customerName}
                  onChange={setCustomerName}
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
                      value={customerPhone}
                      onChange={(val) => setCustomerPhone(val)}
                      enableSearch
                      searchPlaceholder="Tìm quốc gia..."
                      inputProps={{ name: 'phone' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* EDITABLE VEHICLE INFO */}
            <div className="space-y-4 rounded-xl bg-slate-50/70 p-4 sm:p-5">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-3">
                <Car size={16} className="text-[#00285E]" />
                Thông tin Xe tiếp nhận
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <FormInput
                    label="Biển số xe *"
                    value={plate}
                    onChange={setPlate}
                    placeholder="VD: 51A-123.45..."
                  />
                </div>
                <div className="relative" ref={brandRef}>
                  <FormInput
                    label="Hãng xe *"
                    value={brand}
                    onChange={(val) => {
                      setBrand(val);
                      setShowBrandSuggestions(true);
                      setSelectedMakeId(null);
                      setModel('');
                    }}
                    placeholder="VD: Toyota"
                  />
                  {showBrandSuggestions && brandSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {brandSuggestions.map((b: any) => (
                        <div
                          key={b.id}
                          className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm font-semibold text-slate-700"
                          onClick={() => {
                            setBrand(b.make_name);
                            setSelectedMakeId(b.id);
                            setShowBrandSuggestions(false);
                            setModel('');
                          }}
                        >
                          {b.make_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative" ref={modelRef}>
                  <FormInput
                    label="Dòng xe *"
                    value={model}
                    onChange={(val) => {
                      setModel(val);
                      setShowModelSuggestions(true);
                    }}
                    placeholder="VD: Camry"
                  />
                  {showModelSuggestions && modelSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {modelSuggestions.map((m: any) => (
                        <div
                          key={m.id}
                          className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm font-semibold text-slate-700"
                          onClick={() => {
                            setModel(m.model_name);
                            setBrand(m.make?.make_name || brand);
                            if (m.make_id) setSelectedMakeId(m.make_id);
                            setShowModelSuggestions(false);
                          }}
                        >
                          {m.model_name} <span className="text-xs text-slate-400">({m.make?.make_name})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <FormInput
                    label="Màu xe"
                    value={color}
                    onChange={setColor}
                    placeholder="VD: Đỏ, Đen, Trắng..."
                  />
                </div>
                <div>
                  <FormInput
                    label="Năm sản xuất"
                    value={year}
                    onChange={setYear}
                    placeholder="VD: 2022..."
                    type="number"
                  />
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SERVICES/REPAIRS AND ACTIONS (ALWAYS SHOWN) */}
          {/* SERVICES/REPAIRS SECTION */}
          <div className="mt-5 space-y-5 border-t border-slate-200 pt-5">
            <div className="flex gap-2 p-1 bg-slate-100/60 rounded-xl w-fit border border-slate-200/20">
              <button
                type="button"
                onClick={() => setServiceMode('SERVICE')}
                className={`py-2.5 px-5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  serviceMode === 'SERVICE'
                    ? 'bg-[#00285E] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-850'
                }`}
              >
                <Settings size={14} />
                Dịch vụ
              </button>
              <button
                type="button"
                onClick={() => setServiceMode('REPAIR')}
                className={`py-2.5 px-5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  serviceMode === 'REPAIR'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-855'
                }`}
              >
                <Wrench size={14} />
                Kiểm tra và Sửa chữa
              </button>
            </div>

            {serviceMode === 'REPAIR' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-3">
                  <StickyNote size={16} className="text-[#00285E]" />
                  Mô tả dấu hiệu hư hỏng <span className="text-rose-500">*</span>
                </h2>
                <textarea
                  value={repairNotes}
                  onChange={(e) => setRepairNotes(e.target.value)}
                  placeholder="Mô tả dấu hiệu hư hỏng, tiếng động hoặc yêu cầu kiểm tra..."
                  rows={5}
                  className="w-full bg-[#F8FAFC] border border-blue-50/50 rounded-xl p-3 text-sm outline-none transition-all focus:border-[#00285E] focus:bg-white text-brand-blue resize-none"
                />
              </motion.div>
            )}

            {serviceMode === 'SERVICE' && (
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
                  {/* Search and category controls */}
                  <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="relative">
                      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={activeServiceTab === 'single' ? serviceSearch : comboSearch}
                        onChange={(e) => activeServiceTab === 'single' ? setServiceSearch(e.target.value) : setComboSearch(e.target.value)}
                        placeholder={activeServiceTab === 'single' ? 'Tìm kiếm dịch vụ...' : 'Tìm kiếm combo...'}
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-xs font-medium text-[#00285E] shadow-sm outline-none transition-all focus:border-[#00285E] focus:ring-2 focus:ring-[#00285E]/10"
                      />
                    </div>
                    {activeServiceTab === 'single' && (
                      <select
                        value={selectedCategoryId ?? ''}
                        onChange={(e) => {
                          setSelectedCategoryId(e.target.value ? Number(e.target.value) : null);
                          setServicePage(1);
                        }}
                        aria-label="Lọc theo danh mục dịch vụ"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 shadow-sm outline-none transition-all focus:border-[#00285E] focus:ring-2 focus:ring-[#00285E]/10"
                      >
                        <option value="">Tất cả danh mục</option>
                        {activeCategories.filter((category) => (category.service_count ?? 0) > 0).map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.category_name} ({category.service_count ?? 0})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Service type selector */}
                  <div className="mb-4 flex gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setActiveServiceTab('single')}
                      className={`flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                        activeServiceTab === 'single'
                          ? 'bg-[#00285E] text-white shadow-sm'
                          : 'text-slate-500 hover:bg-white hover:text-[#00285E]'
                      }`}
                    >
                      <Wrench size={14} />
                      <span>Dịch vụ lẻ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveServiceTab('combo')}
                      className={`flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                        activeServiceTab === 'combo'
                          ? 'bg-[#00285E] text-white shadow-sm'
                          : 'text-slate-500 hover:bg-white hover:text-[#00285E]'
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
                        hideFilters
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
                        hideSearch
                        externalSearchText={comboSearch}
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

            {serviceMode === 'REPAIR' && !repairNotes.trim() && (
              <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl text-xs font-semibold text-amber-600">
                <AlertCircle size={14} />
                Cần điền mô tả tình trạng sửa chữa.
              </div>
            )}
          </div>



          {/* ACTION BUTTONS */}
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 bg-[#00285E] hover:bg-[#001a3f] text-white rounded-xl text-sm font-bold shadow-md shadow-[#00285E]/15 transition-all transform hover:translate-y-[-1px] disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={17} /> : <CheckCircle2 size={16} />}
              Xác nhận tiếp nhận
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
        className={`text-sm font-bold text-right ${
          highlight ? 'text-[#00285E] bg-[#EDF3FF] px-2 py-0.5 rounded-md' : 'text-slate-700'
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
