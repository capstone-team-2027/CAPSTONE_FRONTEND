import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
    Filter, ChevronRight, Check,
    ShieldCheck, Wrench, Search, X
} from 'lucide-react';
import { COLORS } from '../../../components/share/Color';
import { Button } from '../../../components/share/Button';
import { useFetchClient_v2 as useFetchClient } from '../../../hook/useFetchClient';
import { SPARE_PART_API_ENDPOINTS } from '../../../constants/inventory/sparePartApiEnPoint';

interface ProductItem {
    id: number;
    name: string;
    price: string;
    numericPrice: number;
    tag?: string;
    desc: string;
    image: string;
    brand: string;
    partCode: string;
    warranty: string;
    compatibility: string;
    inStock: boolean;
}

interface SparePartApiItem {
    id?: number;
    sku?: string;
    name?: string;
    brand?: string;
    stock_quantity?: number | string;
    retail_price?: number | string;
    warranty_period_months?: number | string | null;
    warranty_km_limit?: number | string | null;
    image_url?: string | null;
    category?: {
        id?: number;
        category_name?: string;
    } | null;
}

interface SparePartApiResponse {
    success?: boolean;
    message?: string;
    data?: SparePartApiItem[];
    pagination?: {
        page?: number;
        limit?: number;
        totalItems?: number;
        totalPages?: number;
    };
}

const DEFAULT_PRODUCT_IMAGE = '/images/AB6AXuAMNYLW4EURBChXIjVN12Yo-ExH61l1X_m4xOKrWROwoXwCnwHXEvyHAAXZql3XZKD4REmRdhXBrWUIO2KMxleVt9Y_a-ueUU9I2iw-vfm26ahZgq37lugBwaeIGkGRS-nYSB18TjDdt2fIoYCRhGf2-hyenpCjYHfaX6H_cqrZI2wu99sulXhGYZcMLj-wVJrWH8LJ6ia323w5qs.png';

const formatVnd = (value: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(value))}đ`;

const mapPartToProduct = (part: SparePartApiItem): ProductItem => {
    const numericPrice = Number(part.retail_price || 0);
    const warrantyMonths = Number(part.warranty_period_months || 0);
    const stockQuantity = Number(part.stock_quantity || 0);

    return {
        id: Number(part.id || 0),
        name: part.name || 'N/A',
        price: formatVnd(numericPrice),
        numericPrice,
        desc: part.name && part.brand
            ? `${part.name} - ${part.brand}`
            : part.name || 'Phụ tùng ô tô',
        image: part.image_url || DEFAULT_PRODUCT_IMAGE,
        brand: part.brand || 'N/A',
        partCode: part.sku || 'N/A',
        warranty: warrantyMonths > 0 ? `${warrantyMonths} tháng` : 'N/A',
        compatibility: part.category?.category_name || 'Phụ tùng ô tô',
        inStock: stockQuantity > 0,
    };
};

export default function Parts() {
    const { t } = useTranslation();
    const { fetchPublic } = useFetchClient();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBrand, setSelectedBrand] = useState<string[]>([]);
    const [selectedVehicleType, setSelectedVehicleType] = useState('all');
    const [priceRange, setPriceRange] = useState(5000000);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [limit] = useState(9);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const brandsList = ['Toyota', 'Honda', 'BMW', 'Mercedes-Benz', 'Audi'];

    useEffect(() => {
        const fetchSpareParts = async () => {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('limit', String(limit));

            if (searchQuery.trim()) {
                params.set('search', searchQuery.trim());
            }

            if (selectedBrand.length > 0) {
                params.set('brand', selectedBrand.join(','));
            }

            if (priceRange) {
                params.set('maxPrice', String(priceRange));
            }

            const url = `${SPARE_PART_API_ENDPOINTS.SPARE_PART}?${params.toString()}`;

            try {
                const response = await fetchPublic<SparePartApiResponse>(url);

                if (response?.success === false) {
                    throw new Error(response.message || 'Failed to fetch spare parts');
                }

                const apiProducts = Array.isArray(response?.data) ? response.data : [];
                setProducts(apiProducts.map(mapPartToProduct));

                const pagination = response?.pagination;
                setTotalPages(
                    typeof pagination?.totalPages === 'number' ? pagination.totalPages : 1,
                );
                setTotalItems(
                    typeof pagination?.totalItems === 'number' ? pagination.totalItems : apiProducts.length,
                );
            } catch (fetchError) {
                const message = fetchError instanceof Error ? fetchError.message : '';
                setProducts([]);
                setTotalPages(1);
                setTotalItems(0);
                setError(
                    message.toLowerCase().includes('unauthorized')
                        ? 'Bạn cần đăng nhập để xem danh sách linh kiện.'
                        : 'Không thể tải danh sách linh kiện. Vui lòng thử lại.',
                );
            } finally {
                setLoading(false);
            }
        };

        fetchSpareParts();
    }, [fetchPublic, page, limit, searchQuery, selectedBrand, priceRange]);

    const toggleBrand = (brand: string) => {
        setPage(1);
        if (selectedBrand.includes(brand)) {
            setSelectedBrand(selectedBrand.filter((item) => item !== brand));
        } else {
            setSelectedBrand([...selectedBrand, brand]);
        }
    };

    const handleSearchChange = (value: string) => {
        setPage(1);
        setSearchQuery(value);
    };

    const handlePriceChange = (value: string) => {
        setPage(1);
        setPriceRange(parseInt(value, 10));
    };

    const resetFilters = () => {
        setSelectedBrand([]);
        setSelectedVehicleType('all');
        setPriceRange(5000000);
        setSearchQuery('');
        setPage(1);
    };

    const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1);

    return (
        <div className="min-h-screen pb-24 text-left" style={{ backgroundColor: '#F8FAFC' }}>
            <section className="bg-white pt-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-4xl md:text-5xl font-display mb-4" style={{ color: COLORS.navy }}>
                        {t('parts.heroTitle', 'Linh kiện chính hãng')}
                    </h1>
                    <p className="max-w-2xl leading-relaxed text-gray-500 text-left">
                        {t('parts.heroDesc', 'Nâng tầm hiệu suất và độ an toàn cho xế yêu với hệ thống linh kiện nhập khẩu 100%, bảo hành dài hạn và hỗ trợ lắp đặt chuyên nghiệp.')}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                        {[
                            { title: t('parts.badges.genuine.title', '100% chính hãng'), desc: t('parts.badges.genuine.desc', 'Cam kết chất lượng từ nhà sản xuất'), icon: <Check size={20} style={{ color: COLORS.orange }} /> },
                            { title: t('parts.badges.warranty.title', 'Bảo hành dài hạn'), desc: t('parts.badges.warranty.desc', 'An tâm tuyệt đối với chính sách 1 đổi 1'), icon: <ShieldCheck size={20} style={{ color: COLORS.orange }} /> },
                            { title: t('parts.badges.install.title', 'Hỗ trợ lắp đặt'), desc: t('parts.badges.install.desc', 'Miễn phí công thay tại các chi nhánh'), icon: <Wrench size={20} style={{ color: COLORS.orange }} /> },
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-6 rounded-2xl border border-blue-50"
                                style={{ backgroundColor: '#F8FAFC' }}>
                                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                                    {item.icon}
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-brand-blue">{item.title}</div>
                                    <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
                <div className="flex flex-col lg:flex-row gap-8">
                    <aside className="w-full lg:w-72 shrink-0 text-left">
                        <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl border border-gray-100 shadow-xs sticky top-24">
                            <div
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className="flex items-center justify-between cursor-pointer lg:cursor-default"
                                style={{ color: COLORS.navy }}
                            >
                                <div className="flex items-center gap-2">
                                    <Filter size={18} />
                                    <h3 className="font-bold text-base md:text-lg">{t('parts.filterTitle', 'Bộ lọc')}</h3>
                                </div>
                                <span className="lg:hidden text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg hover:bg-slate-200 transition-colors">
                                    {isFilterOpen ? t('common.collapse', 'Thu gọn') : t('common.expand', 'Mở rộng')}
                                </span>
                            </div>

                            <div className={`${isFilterOpen ? 'block' : 'hidden'} lg:block mt-6 md:mt-8 text-left`}>
                                <div className="mb-5 md:mb-10">
                                    <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2 md:mb-4 block"
                                        style={{ color: `${COLORS.navy}66` }}>{t('parts.vehicleTypeLabel', 'Loại xe')}</label>
                                    <select
                                        value={selectedVehicleType}
                                        onChange={(e) => setSelectedVehicleType(e.target.value)}
                                        className="w-full bg-[#F8FAFC] border-none rounded-xl p-3 text-sm outline-none font-medium text-brand-blue"
                                    >
                                        <option value="all">{t('parts.vehicleTypes.all', 'Tất cả loại xe')}</option>
                                        <option value="suv">SUV / Crossover</option>
                                        <option value="sedan">Sedan / Coupe</option>
                                        <option value="sport">{t('parts.vehicleTypes.sport', 'Xe thể thao')}</option>
                                    </select>
                                </div>

                                <div className="mb-5 md:mb-10">
                                    <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2 md:mb-4 block"
                                        style={{ color: `${COLORS.navy}66` }}>{t('parts.brandLabel', 'Thương hiệu')}</label>
                                    <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-col lg:space-y-3">
                                        {brandsList.map((brand) => (
                                            <label key={brand} className="flex items-center gap-2 lg:gap-3 group cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedBrand.includes(brand)}
                                                    onChange={() => toggleBrand(brand)}
                                                    className="w-4 h-4 rounded border-gray-300 accent-[#0A2357] cursor-pointer"
                                                />
                                                <span className="text-xs lg:text-sm text-brand-blue/80 font-medium group-hover:text-brand-orange transition-colors">
                                                    {brand}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-6 md:mb-10">
                                    <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2 md:mb-4 block"
                                        style={{ color: `${COLORS.navy}66` }}>{t('parts.maxPriceLabel', 'Giá tối đa (VNĐ)')}</label>
                                    <input
                                        type="range" min="200000" max="5000000" step="100000"
                                        value={priceRange}
                                        onChange={(e) => handlePriceChange(e.target.value)}
                                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0A2357]"
                                    />
                                    <div className="flex justify-between mt-3 text-[10px] md:text-xs font-mono text-gray-400">
                                        <span>200.000đ</span>
                                        <span className="font-bold text-brand-blue">{new Intl.NumberFormat('vi-VN').format(priceRange)}đ</span>
                                    </div>
                                </div>

                                <button
                                    onClick={resetFilters}
                                    className="w-full py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-brand-blue font-bold text-xs rounded-xl transition-all"
                                >
                                    {t('services.resetFilters', 'Thiết lập lại bộ lọc')}
                                </button>
                            </div>
                        </div>
                    </aside>

                    <main className="flex-grow text-left">
                        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
                            <div className="relative flex-grow md:max-w-md">
                                <input
                                    type="text"
                                    placeholder={t('parts.searchPlaceholder', 'Tìm kiếm linh kiện (tên, mã)...')}
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200/80 bg-white text-xs text-brand-blue placeholder-gray-400 focus:outline-none focus:border-brand-orange transition-all"
                                />
                                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                {searchQuery && (
                                    <button
                                        onClick={() => handleSearchChange('')}
                                        className="p-1 hover:bg-gray-100 rounded-full absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5 text-gray-400" />
                                    </button>
                                )}
                            </div>

                            <div className="flex justify-between items-center gap-6">
                                <div className="text-xs md:text-sm text-gray-400">
                                    {t('parts.foundCount', 'Tìm thấy: ')}
                                    <span className="font-bold text-brand-blue">{totalItems}</span>
                                    {t('parts.foundCountSuffix', ' linh kiện')}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs md:text-sm text-gray-400">{t('parts.sortLabel', 'Sắp xếp:')}</span>
                                    <select className="bg-transparent border-none text-xs md:text-sm font-bold text-brand-blue outline-none cursor-pointer">
                                        <option>{t('parts.sortOptions.newest', 'Mới nhất')}</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center max-w-lg mx-auto"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-slate-100 shadow-inner">
                                    <Search className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold text-brand-blue mb-1">Đang tải linh kiện...</h3>
                            </motion.div>
                        ) : error ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center max-w-lg mx-auto"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-slate-100 shadow-inner">
                                    <Search className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold text-brand-blue mb-1">{error}</h3>
                            </motion.div>
                        ) : products.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center max-w-lg mx-auto"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-slate-100 shadow-inner">
                                    <Search className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold text-brand-blue mb-1">{t('parts.noProducts', 'Không tìm thấy sản phẩm')}</h3>
                                <p className="text-xs text-gray-400 max-w-xs leading-relaxed px-4 text-center">
                                    {t('parts.noProductsDesc', 'Không có linh kiện nào phù hợp với bộ lọc và từ khóa hiện tại. Vui lòng thiết lập lại bộ lọc để xem đầy đủ sản phẩm.')}
                                </p>
                                <button
                                    onClick={resetFilters}
                                    className="mt-6 px-5 py-2.5 bg-brand-blue text-white rounded-xl text-xs font-bold shadow-md hover:bg-brand-blue/90 transition-all cursor-pointer"
                                >
                                    {t('services.resetFilters', 'Thiết lập lại bộ lọc')}
                                </button>
                            </motion.div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {products.map((product) => (
                                    <motion.div
                                        key={product.id}
                                        layout
                                        whileHover={{ y: -5, boxShadow: '0 12px 24px rgba(10,35,87,0.08)' }}
                                        className="bg-white rounded-2xl overflow-hidden shadow-xs border border-gray-100 group flex flex-col cursor-pointer"
                                        onClick={() => setSelectedProduct(product)}
                                    >
                                        <div className="relative aspect-square md:aspect-[4/3] overflow-hidden bg-slate-950">
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                                            />
                                        </div>

                                        <div className="p-5 md:p-6 flex-grow flex flex-col justify-between text-left">
                                            <div>
                                                <div className="flex justify-between items-start gap-3 mb-2">
                                                    <h4 className="font-bold text-sm md:text-base leading-snug text-brand-blue transition-colors line-clamp-1">
                                                        {product.name}
                                                    </h4>
                                                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md font-bold self-start">
                                                        {product.brand}
                                                    </span>
                                                </div>
                                                <div className="font-bold text-base text-brand-orange mb-3">
                                                    {product.price}
                                                </div>
                                                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-6">
                                                    {product.desc}
                                                </p>
                                            </div>

                                            <div className="flex">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); }}
                                                    className="w-full py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 font-bold text-xs rounded-xl transition-all"
                                                >
                                                    {t('common.details', 'Chi tiết')}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {totalPages > 1 && !loading && !error && (
                            <div className="mt-16 flex justify-center items-center gap-2 flex-wrap">
                                <Button
                                    size="sm"
                                    icon={null}
                                    bg={COLORS.white}
                                    color={COLORS.navy}
                                    className="w-10 h-10 justify-center rounded-xl p-0"
                                    style={{ border: '1px solid #DBEAFE' }}
                                    disabled={page <= 1}
                                    onClick={() => setPage((prevPage) => Math.max(1, prevPage - 1))}
                                >
                                    <ChevronRight size={18} className="rotate-180" />
                                </Button>

                                {visiblePages.map((pageNumber) => (
                                    <Button
                                        key={pageNumber}
                                        size="sm"
                                        icon={null}
                                        bg={pageNumber === page ? COLORS.navy : COLORS.white}
                                        color={pageNumber === page ? COLORS.white : COLORS.navy}
                                        className="w-10 h-10 justify-center rounded-xl p-0 text-sm font-bold"
                                        style={pageNumber === page ? undefined : { border: '1px solid #DBEAFE' }}
                                        onClick={() => setPage(pageNumber)}
                                    >
                                        {pageNumber}
                                    </Button>
                                ))}

                                <Button
                                    size="sm"
                                    icon={null}
                                    bg={COLORS.white}
                                    color={COLORS.navy}
                                    className="w-10 h-10 justify-center rounded-xl p-0"
                                    style={{ border: '1px solid #DBEAFE' }}
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((prevPage) => Math.min(totalPages, prevPage + 1))}
                                >
                                    <ChevronRight size={18} />
                                </Button>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            <AnimatePresence>
                {selectedProduct && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedProduct(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', duration: 0.5 }}
                            className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 max-w-xl w-full relative z-10 text-left flex flex-col max-h-[90vh]"
                        >
                            <div className="relative aspect-[16/10] bg-slate-950 shrink-0">
                                <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover opacity-90" />
                                <button
                                    onClick={() => setSelectedProduct(null)}
                                    className="absolute top-4 right-4 p-2 bg-slate-950/60 hover:bg-slate-950/80 text-white rounded-full transition-colors border border-white/10"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="absolute top-4 left-4 bg-brand-orange text-brand-blue px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider shadow-sm">
                                    {selectedProduct.brand}
                                </div>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-6 flex-grow text-left">
                                <div>
                                    <h3 className="text-lg md:text-xl font-bold text-brand-blue mb-1">{selectedProduct.name}</h3>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xl font-bold text-brand-orange">{selectedProduct.price}</span>
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                                            selectedProduct.inStock
                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                : 'bg-rose-50 text-rose-600 border border-rose-100'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${selectedProduct.inStock ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                            {selectedProduct.inStock ? t('parts.inStock', 'Còn hàng') : t('parts.outOfStock', 'Hết hàng')}
                                        </span>
                                    </div>
                                </div>

                                <div className="border-t border-b border-gray-100 py-4 grid grid-cols-2 gap-4 text-xs text-left">
                                    <div>
                                        <span className="text-gray-400 block mb-0.5">{t('parts.modal.code', 'Mã linh kiện:')}</span>
                                        <span className="font-mono font-bold text-brand-blue bg-slate-50 px-2 py-1 rounded-md border border-slate-100 inline-block">{selectedProduct.partCode}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block mb-0.5">{t('parts.modal.warranty', 'Thời gian bảo hành:')}</span>
                                        <span className="font-bold text-brand-blue flex items-center gap-1">
                                            <ShieldCheck className="w-4 h-4 text-brand-orange" />
                                            {selectedProduct.warranty}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2 text-xs text-left">
                                    <span className="text-gray-400 block">{t('parts.modal.compatibility', 'Dòng xe tương thích:')}</span>
                                    <p className="font-bold text-brand-blue bg-blue-50/30 p-3 rounded-xl border border-blue-50/50 leading-relaxed">
                                        {selectedProduct.compatibility}
                                    </p>
                                </div>

                                <div className="space-y-2 text-xs text-left">
                                    <span className="text-gray-400 block">{t('parts.modal.description', 'Mô tả sản phẩm:')}</span>
                                    <p className="text-gray-500 leading-relaxed text-left">
                                        {selectedProduct.desc}
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 md:p-6 border-t border-gray-100 bg-gray-50 flex gap-3 shrink-0">
                                <button
                                    onClick={() => setSelectedProduct(null)}
                                    className="w-full py-3 border border-gray-200 text-gray-600 hover:bg-gray-100 font-bold text-xs rounded-xl transition-all"
                                >
                                    {t('history.close', 'Đóng')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
