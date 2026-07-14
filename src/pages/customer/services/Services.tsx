import { AnimatePresence, motion } from 'framer-motion';
import {
  Car,
  Clock,
  Droplets,
  Package,
  Search,
  Settings,
  ShieldCheck,
  Wallet,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/share/Button';
import { COLORS } from '../../../components/share/Color';
import { SERVICE_API_ENDPOINTS } from '../../../constants/customer/serviceApiEndpoints';
import { useFetchClient } from '../../../hook/useFetchClient';
import type {
  ServiceCombo,
  ServiceDetailData,
  ServiceDetailResponse,
  ServiceItem,
  ServiceSearchPagination,
  ServiceSearchResponse,
} from '../../../model/Service';

interface ServiceCategoryRecord {
  id: number;
  category_name: string;
}

interface ServiceComboApiRecord {
  id: number;
  combo_name: string;
  is_active: boolean;
  createdAt: string;
  discount_percentage?: number;
  catalogs?: Array<{
    id: number;
    category_id: number;
  }>;
}

const DETAIL_LOADING_MESSAGE = 'Đang tải thông tin dịch vụ...';
const DETAIL_NOT_FOUND_MESSAGE = 'Dịch vụ không tồn tại hoặc đã ngừng cung cấp.';
const DETAIL_GENERIC_ERROR_MESSAGE = 'Không thể tải thông tin dịch vụ. Vui lòng thử lại.';
const SERVICES_ERROR_MESSAGE = 'Không thể tải danh sách dịch vụ. Vui lòng thử lại.';
const SERVICES_EMPTY_MESSAGE = 'Không tìm thấy dịch vụ phù hợp.';
const ITEMS_PER_PAGE = 8;

const INITIAL_PAGINATION: ServiceSearchPagination = {
  page: 1,
  limit: ITEMS_PER_PAGE,
  total: 0,
  totalPages: 0,
};

const getCategoryIcon = (categoryName: string) => {
  const lower = categoryName.toLowerCase();
  if (lower.includes('bảo dưỡng')) return <Settings size={16} />;
  if (lower.includes('lốp') || lower.includes('phanh')) return <Car size={16} />;
  if (lower.includes('nội thất') || lower.includes('chăm sóc')) return <Droplets size={16} />;
  if (lower.includes('điện') || lower.includes('chẩn đoán')) return <Zap size={16} />;
  if (lower.includes('sửa chữa') || lower.includes('động cơ')) return <Wrench size={16} />;
  return <Package size={16} />;
};

export default function Services() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { fetchPublic } = useFetchClient();

  const [categories, setCategories] = useState<ServiceCategoryRecord[]>([]);
  const [combos, setCombos] = useState<ServiceCombo[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<ServiceSearchPagination>(INITIAL_PAGINATION);
  const [isServicesLoading, setIsServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const servicesRequestSequenceRef = useRef(0);
  const servicesAbortControllerRef = useRef<AbortController | null>(null);
  const detailRequestSequenceRef = useRef(0);
  const detailAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchKeyword(searchKeyword.trim());
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [searchKeyword]);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [categoryResponse, comboResponse] = await Promise.all([
          fetchPublic<{ data?: ServiceCategoryRecord[] }>(SERVICE_API_ENDPOINTS.GET_CATEGORIES),
          fetchPublic<{ data?: ServiceComboApiRecord[] }>(SERVICE_API_ENDPOINTS.GET_COMBOS),
        ]);

        setCategories(categoryResponse?.data ?? []);
        setCombos(
          (comboResponse?.data ?? []).map((combo: ServiceComboApiRecord) => ({
            id: combo.id,
            combo_name: combo.combo_name,
            category_id: combo.catalogs?.[0]?.category_id || 1,
            service_ids: combo.catalogs?.map((catalog: { id: number }) => catalog.id) || [],
            discount_percentage: combo.discount_percentage || 10,
            is_active: combo.is_active,
            createdAt: combo.createdAt,
          })),
        );
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu trang dịch vụ:', error);
      }
    };

    void loadMeta();
  }, []);

  useEffect(() => {
    const requestSequence = servicesRequestSequenceRef.current + 1;
    servicesRequestSequenceRef.current = requestSequence;
    servicesAbortControllerRef.current?.abort();

    const controller = new AbortController();
    servicesAbortControllerRef.current = controller;

    const loadServices = async () => {
      setIsServicesLoading(true);
      setServicesError(null);

      try {
        const params = new URLSearchParams();
        if (debouncedSearchKeyword) {
          params.set('q', debouncedSearchKeyword);
        }
        if (activeCategory !== 'all') {
          params.set('category_id', activeCategory);
        }
        params.set('page', String(currentPage));
        params.set('limit', String(ITEMS_PER_PAGE));

        const response = await fetch(`${SERVICE_API_ENDPOINTS.SEARCH_SERVICES}?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        const payload = (await response.json()) as Partial<ServiceSearchResponse>;
        if (!response.ok || !payload.data) {
          throw new Error(payload.message || SERVICES_ERROR_MESSAGE);
        }

        if (servicesRequestSequenceRef.current !== requestSequence || controller.signal.aborted) {
          return;
        }

        if (payload.data.pagination.totalPages > 0 && currentPage > payload.data.pagination.totalPages) {
          setCurrentPage(payload.data.pagination.totalPages);
          return;
        }

        setServices(payload.data.items.map((service) => mapServiceToUi(service)));
        setPagination(payload.data.pagination);
      } catch (error) {
        if (controller.signal.aborted || servicesRequestSequenceRef.current !== requestSequence) {
          return;
        }

        const normalizedError = error as { name?: string };
        if (normalizedError.name === 'AbortError') {
          return;
        }

        setServices([]);
        setPagination({ page: currentPage, limit: ITEMS_PER_PAGE, total: 0, totalPages: 0 });
        setServicesError(SERVICES_ERROR_MESSAGE);
      } finally {
        if (servicesRequestSequenceRef.current === requestSequence && !controller.signal.aborted) {
          setIsServicesLoading(false);
        }
        if (servicesAbortControllerRef.current === controller) {
          servicesAbortControllerRef.current = null;
        }
      }
    };

    void loadServices();

    return () => {
      controller.abort();
      if (servicesAbortControllerRef.current === controller) {
        servicesAbortControllerRef.current = null;
      }
    };
  }, [activeCategory, currentPage, debouncedSearchKeyword, reloadKey]);

  useEffect(() => {
    return () => {
      servicesAbortControllerRef.current?.abort();
      detailAbortControllerRef.current?.abort();
    };
  }, []);

  const getServicePriceValue = (id: number) => {
    const priceMap: Record<number, number> = { 1: 500000, 2: 1200000, 3: 400000, 4: 800000, 5: 300000, 6: 0 };
    return priceMap[id] ?? 300000;
  };

  const getServiceIcon = (serviceName: string, categoryName: string) => {
    const lower = `${serviceName} ${categoryName}`.toLowerCase();
    if (lower.includes('cứu hộ')) return <Zap size={18} />;
    if (lower.includes('lốp') || lower.includes('phanh')) return <Car size={18} />;
    if (lower.includes('nội thất') || lower.includes('chăm sóc')) return <Droplets size={18} />;
    if (lower.includes('điện') || lower.includes('chẩn đoán')) return <Zap size={18} />;
    if (lower.includes('sửa chữa') || lower.includes('động cơ')) return <Wrench size={18} />;
    return <Settings size={18} />;
  };

  const getServiceImage = (serviceName: string, categoryName: string) => {
    const lower = `${serviceName} ${categoryName}`.toLowerCase();
    if (lower.includes('cứu hộ')) return '/images/Performance Tuning.png';
    if (lower.includes('lốp') || lower.includes('phanh')) return '/images/Vehicle Protection.png';
    if (lower.includes('nội thất') || lower.includes('chăm sóc')) return '/images/Elite Detailing.png';
    if (lower.includes('điện') || lower.includes('chẩn đoán')) return '/images/Digital Diagnostics.png';
    if (lower.includes('sửa chữa') || lower.includes('động cơ')) return '/images/Advanced Repair.png';
    return '/images/Precision Maintenance (1).png';
  };

  const getServiceDetails = (serviceName: string) => {
    const lower = serviceName.toLowerCase();
    if (lower.includes('cứu hộ')) return ['Hỗ trợ kích nổ ắc quy.', 'Hỗ trợ thay lốp dự phòng.', 'Xe kéo đưa về trung tâm khi cần.'];
    if (lower.includes('lốp') || lower.includes('phanh')) return ['Kiểm tra toàn bộ hệ thống phanh.', 'Cân bằng động lốp xe.', 'Tư vấn thay thế phù hợp.'];
    if (lower.includes('nội thất')) return ['Dọn nội thất toàn diện.', 'Khử mùi cabin.', 'Làm sạch bề mặt da và nỉ.'];
    if (lower.includes('điện') || lower.includes('chẩn đoán')) return ['Quét lỗi toàn bộ hệ thống điện.', 'Chẩn đoán cảm biến quan trọng.', 'Tư vấn phương án sửa chữa.'];
    return ['Kiểm tra tổng quát tình trạng xe.', 'Sử dụng phụ tùng và linh kiện phù hợp.', 'Thực hiện bởi kỹ thuật viên nhiều kinh nghiệm.'];
  };

  const mapServiceToUi = (service: ServiceDetailData, fallback?: ServiceItem | null): ServiceItem => {
    const categoryName = service.category?.category_name || fallback?.categoryLabel || '';
    const numericPrice = fallback?.numericPrice ?? getServicePriceValue(service.id);

    return {
      id: service.id,
      title: service.service_name,
      desc: service.description || '',
      icon: fallback?.icon ?? getServiceIcon(service.service_name, categoryName),
      price: numericPrice > 0 ? `Từ ${numericPrice.toLocaleString('vi-VN')}đ` : 'Liên hệ',
      numericPrice,
      categoryLabel: categoryName,
      image: fallback?.image ?? getServiceImage(service.service_name, categoryName),
      duration: service.estimated_duration ? `${service.estimated_duration} phút` : undefined,
      details: fallback?.details ?? getServiceDetails(service.service_name),
      promoText: fallback?.promoText,
      category_id: service.category_id,
      is_active: service.is_active,
    };
  };

  const fetchServiceDetail = async (serviceId: number) => {
    const requestSequence = detailRequestSequenceRef.current + 1;
    detailRequestSequenceRef.current = requestSequence;
    detailAbortControllerRef.current?.abort();

    const controller = new AbortController();
    detailAbortControllerRef.current = controller;
    const fallbackService = services.find((service) => service.id === serviceId) || null;

    setSelectedServiceId(serviceId);
    setSelectedService(fallbackService);
    setDetailError(null);
    setIsDetailLoading(true);
    setIsDetailModalOpen(true);

    try {
      const response = await fetch(SERVICE_API_ENDPOINTS.GET_SERVICE_DETAIL(serviceId), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      const payload = (await response.json()) as Partial<ServiceDetailResponse>;
      if (!response.ok) {
        throw { status: response.status, message: payload.message };
      }

      if (!payload.data || detailRequestSequenceRef.current !== requestSequence || controller.signal.aborted) {
        return;
      }

      setSelectedService(mapServiceToUi(payload.data, fallbackService));
    } catch (error) {
      if (controller.signal.aborted || detailRequestSequenceRef.current !== requestSequence) {
        return;
      }

      const normalizedError = error as { status?: number; name?: string };
      if (normalizedError.name === 'AbortError') {
        return;
      }

      setDetailError(normalizedError.status === 404 ? DETAIL_NOT_FOUND_MESSAGE : DETAIL_GENERIC_ERROR_MESSAGE);
    } finally {
      if (detailRequestSequenceRef.current === requestSequence && !controller.signal.aborted) {
        setIsDetailLoading(false);
      }
      if (detailAbortControllerRef.current === controller) {
        detailAbortControllerRef.current = null;
      }
    }
  };

  const closeDetailModal = () => {
    detailRequestSequenceRef.current += 1;
    detailAbortControllerRef.current?.abort();
    detailAbortControllerRef.current = null;
    setIsDetailModalOpen(false);
    setIsDetailLoading(false);
    setDetailError(null);
    setSelectedService(null);
    setSelectedServiceId(null);
  };

  const handleBookNow = (serviceId: number) => {
    navigate(`/phone-service?serviceId=${serviceId}`);
  };

  const activeCategories = [{ id: 'all', category_name: t('common.all', 'Tất cả') }, ...categories];

  return (
    <div className="bg-white text-left">
      <section className="relative h-[240px] md:h-[520px] flex items-center overflow-hidden" style={{ backgroundColor: COLORS.navy }}>
        <div className="absolute inset-0">
          <img src="/images/div.w-full.png" alt="Service Workshop" className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0" style={{ backgroundColor: `${COLORS.navy}66` }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 w-full">
          <h1 className="text-3xl md:text-6xl font-bold font-display text-white mb-3">{t('services.heroTitle', 'Dịch vụ chuyên nghiệp')}</h1>
          <p className="max-w-2xl text-white/90 mb-8">{t('services.heroDesc', 'Khám phá danh mục dịch vụ mới nhất dành cho khách hàng AGM Intelligent.')}</p>
          <Button to="/phone-service" size="md" bg={COLORS.orange} color={COLORS.navy} icon={null} className="uppercase text-sm rounded-md font-bold">
            {t('nav.booking', 'Đặt lịch ngay')}
          </Button>
        </div>
      </section>

      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-slate-200/60 pb-8">
          <div>
            <span className="font-bold text-[10px] md:text-xs tracking-widest uppercase mb-1 block" style={{ color: COLORS.orange }}>{t('services.forYourCar', 'Dành cho xe của bạn')}</span>
            <h2 className="text-2xl md:text-4xl font-bold font-display text-brand-blue">{t('services.catalogTitle', 'Danh mục dịch vụ')}</h2>
          </div>
          <div className="relative w-full md:max-w-md">
            <input
              type="text"
              placeholder={t('services.searchPlaceholder', 'Tìm kiếm dịch vụ bảo dưỡng...')}
              value={searchKeyword}
              onChange={(event) => {
                setSearchKeyword(event.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-10 py-3 rounded-2xl border border-gray-200 bg-slate-50/50 text-sm text-brand-blue"
            />
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            {searchKeyword && (
              <button type="button" onClick={() => { setSearchKeyword(''); setCurrentPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-2 mb-10">
          {activeCategories.map((category) => {
            const isActive = activeCategory === String(category.id);
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => { setActiveCategory(String(category.id)); setCurrentPage(1); }}
                className={`relative px-4 py-2.5 rounded-2xl font-bold text-xs md:text-sm transition-colors duration-300 flex items-center gap-2 shrink-0 ${isActive ? 'text-white bg-[#00285E]' : 'text-brand-blue/70 bg-white border border-gray-200/80'}`}
              >
                {getCategoryIcon(category.category_name)}
                <span>{category.category_name}</span>
              </button>
            );
          })}
        </div>

        {isServicesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
              <div key={index} className="bg-white rounded-2xl overflow-hidden border border-gray-200/80 animate-pulse">
                <div className="aspect-[16/11] bg-slate-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-200 rounded" />
                  <div className="h-3 bg-slate-100 rounded" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : servicesError ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm max-w-lg mx-auto">
            <p className="text-sm font-semibold text-red-600">{SERVICES_ERROR_MESSAGE}</p>
            <button type="button" onClick={() => setReloadKey((prev) => prev + 1)} className="mt-6 px-5 py-2.5 bg-brand-blue text-white rounded-xl text-xs font-bold">
              {t('common.retry', 'Thử lại')}
            </button>
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm max-w-lg mx-auto">
            <p className="text-lg font-bold text-brand-blue">{SERVICES_EMPTY_MESSAGE}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {services.map((service) => (
                <motion.div
                  key={service.id}
                  whileHover={{ y: -6 }}
                  className="bg-white rounded-2xl overflow-hidden shadow-xs border border-gray-200/80 flex flex-col cursor-pointer"
                  onClick={() => { void fetchServiceDetail(service.id); }}
                >
                  <div className="relative aspect-[16/11] overflow-hidden bg-slate-950">
                    <img src={service.image} alt={service.title} className="w-full h-full object-cover opacity-90" />
                    <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md text-white text-[11px] font-bold shadow-md" style={{ backgroundColor: `${COLORS.navy}F0` }}>
                      {service.price}
                    </div>
                  </div>
                  <div className="p-4 md:p-5 flex-grow flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-brand-blue bg-blue-50 p-1.5 rounded-lg shrink-0">{service.icon}</span>
                        <h3 className="text-sm font-extrabold text-brand-blue line-clamp-1">{service.title}</h3>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-normal mb-3 line-clamp-2">{service.desc}</p>
                    </div>
                    <div className="flex gap-2 mt-auto">
                      <button type="button" onClick={(event) => { event.stopPropagation(); void fetchServiceDetail(service.id); }} className="flex-1 py-1.5 border border-gray-200 text-gray-700 font-bold text-[11px] rounded-xl">
                        {t('common.details', 'Chi tiết')}
                      </button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); handleBookNow(service.id); }} className="flex-1 py-1.5 bg-brand-blue text-white font-bold text-[11px] rounded-xl">
                        {t('services.bookService', 'Đặt dịch vụ')}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-1.5 mt-12">
                <button type="button" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded-xl text-[11px] font-bold border border-gray-200 disabled:text-gray-300">
                  {t('common.prev', 'Trước')}
                </button>
                {Array.from({ length: pagination.totalPages }).map((_, index) => {
                  const pageNumber = index + 1;
                  return (
                    <button key={pageNumber} type="button" onClick={() => setCurrentPage(pageNumber)} className={`w-8 h-8 rounded-xl text-[11px] font-bold ${currentPage === pageNumber ? 'bg-brand-blue text-white' : 'bg-white text-brand-blue border border-gray-200'}`}>
                      {pageNumber}
                    </button>
                  );
                })}
                <button type="button" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, pagination.totalPages))} disabled={currentPage === pagination.totalPages} className="px-3 py-1.5 rounded-xl text-[11px] font-bold border border-gray-200 disabled:text-gray-300">
                  {t('common.next', 'Sau')}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="py-20 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100">
        <h2 className="text-3xl md:text-4xl font-bold font-display text-brand-blue mb-8">{t('services.comboTitle', 'Gói Combo Dịch vụ')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {combos.filter((combo) => combo.is_active).map((combo) => {
            const totalOriginal = combo.service_ids.reduce((sum, id) => sum + getServicePriceValue(id), 0);
            const discounted = totalOriginal * (1 - combo.discount_percentage / 100);
            return (
              <div key={combo.id} className="bg-white rounded-3xl p-6 border border-gray-200/60 shadow-xs">
                <h3 className="text-xl font-black text-[#00285E] mb-4">{combo.combo_name}</h3>
                <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-4">
                  <span className="text-xs text-slate-400 line-through">{totalOriginal.toLocaleString('vi-VN')}đ</span>
                  <span className="text-lg font-black text-[#00285E]">{discounted.toLocaleString('vi-VN')}đ</span>
                </div>
                <button type="button" onClick={() => navigate(`/phone-service?comboId=${combo.id}`)} className="w-full py-3 bg-[#00285E] text-white font-bold text-xs rounded-xl">
                  Đặt lịch combo
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <AnimatePresence>
        {isDetailModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeDetailModal} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 max-w-2xl w-full relative z-10 text-left flex flex-col max-h-[90vh]">
              <div className="relative h-48 md:h-64 bg-slate-950 shrink-0">
                {selectedService?.image ? <img src={selectedService.image} alt={selectedService.title} className="w-full h-full object-cover opacity-90" /> : <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700" />}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                <button type="button" onClick={closeDetailModal} className="absolute top-4 right-4 p-2 bg-slate-950/60 text-white rounded-full">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-grow">
                {isDetailLoading && <p className="text-sm font-semibold text-brand-blue">{DETAIL_LOADING_MESSAGE}</p>}
                {!isDetailLoading && detailError && (
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-red-600">{detailError}</p>
                    {selectedServiceId && <button type="button" onClick={() => { void fetchServiceDetail(selectedServiceId); }} className="px-4 py-2 bg-brand-blue text-white font-bold text-xs rounded-xl">{t('common.retry', 'Thử lại')}</button>}
                  </div>
                )}
                {!isDetailLoading && !detailError && selectedService && (
                  <>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                      <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg text-brand-blue">
                        <Clock className="w-4 h-4 text-brand-blue" />
                        <span>{selectedService.duration || '60 - 90 phút'}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-lg text-amber-800 border border-amber-100/50">
                        <Wallet className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-amber-950 font-extrabold">{selectedService.price}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-brand-blue uppercase tracking-wider mb-2">{selectedService.title}</h4>
                      <p className="text-xs md:text-sm text-gray-500 leading-relaxed">{selectedService.desc}</p>
                    </div>
                    {selectedService.details && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-500">
                        {selectedService.details.map((detail, index) => (
                          <div key={index} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <span className="w-1.5 h-1.5 bg-brand-orange rounded-full shrink-0 mt-1.5" />
                            <span>{detail}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-50 text-[11px] text-gray-500 leading-relaxed">
                      <ShieldCheck className="w-5 h-5 text-brand-blue shrink-0" />
                      <span>{t('services.modal.guarantee', 'Dịch vụ được thực hiện bởi kỹ thuật viên tay nghề cao tại AGM Intelligent.')}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="p-4 md:p-6 border-t border-gray-100 bg-gray-50 flex gap-3 shrink-0">
                <button type="button" onClick={closeDetailModal} className="flex-1 py-3 border border-gray-200 text-gray-600 font-bold text-xs rounded-xl">
                  {t('history.close', 'Đóng')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedService || detailError) return;
                    const serviceId = selectedService.id;
                    closeDetailModal();
                    handleBookNow(serviceId);
                  }}
                  disabled={!selectedService || isDetailLoading || !!detailError}
                  className="flex-1 py-3 bg-brand-blue text-white font-bold text-xs rounded-xl disabled:opacity-50"
                >
                  {t('nav.booking', 'Đặt lịch ngay')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
