import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Sparkles, Search } from 'lucide-react';
import { useFetchClient_v2 } from '../../../hook/useFetchClient';
import { SERVICE_API_ENDPOINTS } from '../../../constants/customer/serviceApiEndpoints';
import type { ServiceCombo, ServiceItem } from '../../../model/Service';

interface ComboServicesSelectorProps {
    dbCombos: ServiceCombo[];
    setDbCombos: React.Dispatch<React.SetStateAction<ServiceCombo[]>>;
    selectedComboId: number | null;
    setSelectedComboId: (id: number | null) => void;
    mappedServices: ServiceItem[];
    COLORS: { orange: string; navy: string;[key: string]: string };
    selectedServiceIds?: number[];
    setSelectedServiceIds?: React.Dispatch<React.SetStateAction<number[]>>;
}

export default function ComboServicesSelector({
    dbCombos,
    setDbCombos,
    selectedComboId,
    setSelectedComboId,
    mappedServices,
    COLORS,
    selectedServiceIds = [],
    setSelectedServiceIds,
}: ComboServicesSelectorProps) {
    const { fetchPublic } = useFetchClient_v2();
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language || 'vi';

    const [page, setPage] = useState(1);
    const [searchText, setSearchText] = useState('');
    const [totalPages, setTotalPages] = useState(1);
    const [currentPageCombos, setCurrentPageCombos] = useState<ServiceCombo[]>([]);

    useEffect(() => {
        const fetchCombos = async () => {
            try {
                const res = await fetchPublic(`${SERVICE_API_ENDPOINTS.GET_COMBOS}?lang=${currentLang}&page=${page}&limit=4&search=${encodeURIComponent(searchText)}`);
                if (res && res.data && res.data.items) {
                    const mapped = res.data.items.map((c: any) => {
                        const serviceIds = (c.catalogs || []).map((cat: any) => cat.id);
                        return {
                            id: c.id,
                            combo_name: c.combo_name,
                            category_id: c.catalogs?.[0]?.category_id || 1,
                            service_ids: serviceIds,
                            discount_percentage: 10,
                            is_active: c.is_active,
                            createdAt: c.createdAt || new Date().toISOString(),
                            originalPrice: (c.catalogs || []).reduce((sum: number, cat: any) => {
                                const priceVal = cat.total_price !== undefined && cat.total_price !== null ? cat.total_price : (cat.labor_price || 0);
                                return sum + (parseFloat(priceVal) || 0);
                            }, 0),
                            catalogs: c.catalogs || []
                        };
                    });
                    setCurrentPageCombos(mapped);
                    setDbCombos(prev => {
                        const map = new Map(prev.map(item => [item.id, item]));
                        mapped.forEach((item: any) => map.set(item.id, item));
                        return Array.from(map.values());
                    });
                    setTotalPages(res.data.totalPages || 1);
                }
            } catch (err) {
                console.error("Lỗi khi tải combos:", err);
            }
        };

        const timer = setTimeout(() => {
            fetchCombos();
        }, 300);

        return () => clearTimeout(timer);
    }, [currentLang, page, searchText, setDbCombos, fetchPublic]);

    useEffect(() => {
        setPage(1);
    }, [searchText]);

    return (
        <div className="animate-fadeIn">
            {/* Search Input */}
            <div className="mb-4 relative max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Tìm kiếm combo..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all shadow-sm text-brand-blue"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentPageCombos.map((combo) => {
                const isSelected = selectedComboId === combo.id;
                const serviceIds = combo.service_ids || [];
                const original = (combo as any).originalPrice || 0;
                const comboServiceNames = ((combo as any).catalogs || []).map((cat: any) => {
                    return cat.translations?.[0]?.name || cat.service_name || "Dịch vụ bảo dưỡng";
                });

                return (
                    <div
                        key={combo.id}
                        onClick={() => {
                            if (isSelected) {
                                setSelectedComboId(null);
                            } else {
                                // Check for overlap with already selected single services
                                if (combo.service_ids && selectedServiceIds.length > 0) {
                                    const overlaps = combo.service_ids.filter(id => selectedServiceIds.includes(id));
                                    if (overlaps.length > 0) {
                                        alert(t('booking.comboOverlapWarning', 'Gói Combo này bao gồm các dịch vụ bạn đã chọn lẻ. Các dịch vụ lẻ trùng lặp sẽ tự động được bỏ chọn để tránh trùng lặp!'));
                                        if (setSelectedServiceIds) {
                                            setSelectedServiceIds(prev => prev.filter(id => !overlaps.includes(id)));
                                        }
                                    }
                                }
                                setSelectedComboId(combo.id);
                            }
                        }}
                        className="relative p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group text-left"
                        style={{
                            borderColor: isSelected ? COLORS.orange : '#F1F5F9',
                            backgroundColor: isSelected ? 'rgba(249,161,27,0.03)' : '#FFFFFF',
                            boxShadow: isSelected ? '0 10px 20px rgba(249,161,27,0.04)' : 'none'
                        }}
                    >
                        <div>
                            <div className="absolute top-4 right-4 flex items-center gap-1.5 flex-wrap justify-end">

                                <div className="text-[9px] font-bold px-2 py-0.5 rounded-lg shrink-0 bg-brand-orange text-brand-blue">
                                    {t('booking.comboBadge', 'Combo')}
                                </div>
                            </div>

                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shrink-0 border border-slate-100 shadow-sm">
                                <Sparkles size={18} className="text-gray-400" />
                            </div>

                            <h3 className="text-base font-bold mb-1 text-brand-blue">{combo.combo_name}</h3>

                            <div className="my-3 space-y-1.5 pl-2 border-l-2 border-amber-400/50">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block font-display">{t('booking.includedServices', 'Dịch vụ đi kèm:')}</span>
                                {comboServiceNames.map((name: string, idx: number) => (
                                    <div key={idx} className="text-[11px] text-slate-500 leading-snug flex items-center gap-1">
                                        <span className="text-[#F9A11B] shrink-0">•</span>
                                        <span>{name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-50">
                            <div>
                                <div className="text-[9px] font-bold uppercase mb-0.5 text-gray-400">{t('booking.comboPrice', 'Giá combo')}</div>
                                <div className="flex items-baseline gap-1.5">
                                    {original > 0 ? (
                                        <span className="text-base font-bold text-brand-orange">{t('booking.fromPrice', 'Từ {{price}}đ', { price: original.toLocaleString("vi-VN") })}</span>
                                    ) : (
                                        <span className="text-base font-bold text-brand-orange">Miễn phí</span>
                                    )}
                                </div>
                            </div>
                            <div
                                className="w-6 h-6 rounded-full border flex items-center justify-center transition-all shrink-0"
                                style={{
                                    borderColor: isSelected ? COLORS.orange : '#CBD5E1',
                                    backgroundColor: isSelected ? COLORS.orange : 'transparent',
                                    color: isSelected ? COLORS.navy : 'transparent',
                                }}
                            >
                                <Check size={12} strokeWidth={4} />
                            </div>
                        </div>
                    </div>
                );
            })}
            </div>

            {/* Combo Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-1.5 mt-8">
                    <button
                        type="button"
                        onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                        disabled={page === 1}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${page === 1
                            ? 'text-gray-300 bg-gray-50/50 border border-gray-100 cursor-not-allowed'
                            : 'text-brand-blue bg-white border border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        Trước
                    </button>
                    {Array.from({ length: totalPages }).map((_, index) => {
                        const pageNumber = index + 1;
                        return (
                            <button
                                type="button"
                                key={pageNumber}
                                onClick={() => setPage(pageNumber)}
                                className={`w-7 h-7 rounded-xl text-[10px] font-bold transition-all ${page === pageNumber
                                    ? 'bg-brand-blue text-white shadow-md shadow-blue-900/10'
                                    : 'bg-white text-brand-blue border border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                {pageNumber}
                            </button>
                        );
                    })}
                    <button
                        type="button"
                        onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={page === totalPages}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${page === totalPages
                            ? 'text-gray-300 bg-gray-50/50 border border-gray-100 cursor-not-allowed'
                            : 'text-brand-blue bg-white border border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        Sau
                    </button>
                </div>
            )}
        </div>
    );
}
