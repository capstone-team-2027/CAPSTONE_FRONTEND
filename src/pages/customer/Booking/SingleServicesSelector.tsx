import React, { useState, useMemo } from 'react';
import { Check, Star, Settings } from 'lucide-react';
import type { ServiceItem, ServiceCombo } from '../../../model/Service';

interface SingleServicesSelectorProps {
    mappedServices: ServiceItem[];
    activeCategories: any[];
    selectedServiceIds: number[];
    setSelectedServiceIds: React.Dispatch<React.SetStateAction<number[]>>;
    COLORS: { orange: string; navy: string;[key: string]: string };
    t: (key: string, defaultValue?: string) => string;
    selectedCategoryId: number | null;
    setSelectedCategoryId: React.Dispatch<React.SetStateAction<number | null>>;
    servicePage: number;
    setServicePage: React.Dispatch<React.SetStateAction<number>>;
    dbCombos?: ServiceCombo[];
    selectedComboId?: number | null;
}

export default function SingleServicesSelector({
    mappedServices,
    activeCategories,
    selectedServiceIds,
    setSelectedServiceIds,
    COLORS,
    t,
    selectedCategoryId,
    setSelectedCategoryId,
    servicePage,
    setServicePage,
    dbCombos = [],
    selectedComboId = null,
}: SingleServicesSelectorProps) {
    const servicesPerPage = 16;

    // Filter services by category and exclude services in the selected combo
    const filteredServices = useMemo(() => {
        let list = mappedServices;
        if (selectedComboId) {
            const combo = dbCombos.find(c => c.id === selectedComboId);
            if (combo && combo.service_ids) {
                list = list.filter(s => !combo.service_ids.includes(s.id));
            }
        }
        if (selectedCategoryId === null) return list;
        return list.filter(s => s.category_id === selectedCategoryId);
    }, [mappedServices, selectedCategoryId, selectedComboId, dbCombos]);

    // Reset pagination to page 1 when category changes
    const handleCategoryChange = (catId: number | null) => {
        setSelectedCategoryId(catId);
        setServicePage(1);
    };

    const totalServicePages = Math.ceil(filteredServices.length / servicesPerPage);
    const currentServices = useMemo(() => {
        const indexOfLast = servicePage * servicesPerPage;
        const indexOfFirst = indexOfLast - servicesPerPage;
        return filteredServices.slice(indexOfFirst, indexOfLast);
    }, [filteredServices, servicePage, servicesPerPage]);
    return (
        <>
            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-3 mb-4 select-none scrollbar-thin">
                <button
                    type="button"
                    onClick={() => handleCategoryChange(null)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${selectedCategoryId === null
                            ? 'bg-[#00285E] text-white shadow-md'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                        }`}
                >
                    <span>Tất cả</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${selectedCategoryId === null ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                        {mappedServices.length}
                    </span>
                </button>
                {activeCategories.map((cat) => {
                    const count = mappedServices.filter(s => String(s.category_id) === String(cat.id)).length;
                    if (count === 0) return null; // Hide empty categories
                    const isActive = selectedCategoryId === cat.id;
                    return (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleCategoryChange(cat.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${isActive
                                    ? 'bg-[#00285E] text-white shadow-md'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                                }`}
                        >
                            <span>{cat.category_name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
                                }`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>
            {/* Multi-select count hint */}
            {selectedServiceIds.length > 0 && (
                <div className="mb-3 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-2">
                    <Check size={12} className="text-brand-blue shrink-0" />
                    <span className="text-[10px] font-bold text-brand-blue">
                        {t('booking.step1.selectedCount', `Đã chọn ${selectedServiceIds.length} dịch vụ — nhấp vào thẻ để thêm hoặc bỏ`)}
                    </span>
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 animate-fadeIn">
                {currentServices.map((service) => {
                    const isSelected = selectedServiceIds.includes(service.id);
                    return (
                        <div
                            key={service.id}
                            onClick={() => {
                                setSelectedServiceIds(prev =>
                                    prev.includes(service.id)
                                        ? prev.filter(id => id !== service.id)
                                        : [...prev, service.id]
                                );
                            }}
                            className="relative p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group text-left min-h-[175px]"
                            style={{
                                borderColor: isSelected ? COLORS.orange : '#F1F5F9',
                                backgroundColor: isSelected ? 'rgba(249,161,27,0.05)' : '#FFFFFF',
                                boxShadow: isSelected ? '0 6px 12px rgba(249,161,27,0.08)' : 'none'
                            }}
                        >
                            <div>
                                <div className="absolute top-2 right-2 flex items-center gap-1 flex-wrap justify-end max-w-[80%]">
                                    <div className="flex items-center gap-0.5 bg-amber-50 border border-amber-100 text-amber-700 px-1 py-0.2 rounded text-[8px] font-bold shadow-xs shrink-0">
                                        <Star size={6.5} fill="currentColor" className="text-amber-500 shrink-0" />
                                        <span>{service.rating}</span>
                                    </div>
                                    {service.discountPercentage && (
                                        <div className="bg-red-100 text-red-600 text-[7.5px] font-black uppercase px-1 py-0.2 rounded shadow-xs shrink-0">
                                            -{service.discountPercentage}%
                                        </div>
                                    )}
                                </div>

                                <div className="w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform shrink-0 border border-slate-100 shadow-xs">
                                    <Settings size={11} className="text-gray-400" />
                                </div>

                                <h3 className="text-[11px] md:text-xs font-bold mb-0.5 text-brand-blue line-clamp-1">{service.title}</h3>
                                <p className="text-[9px] text-slate-400 mb-1 leading-snug line-clamp-2">
                                    {service.desc}
                                </p>

                                {service.promoText && (
                                    <div className="mb-2 p-1 bg-amber-50/40 rounded-md border border-amber-100/40 flex items-start gap-1 text-[8px] text-amber-700 font-medium text-left">
                                        <span className="shrink-0">🎁</span>
                                        <span className="line-clamp-2 leading-tight">{service.promoText}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-end mt-1.5 pt-1.5 border-t border-slate-50/70">
                                <div>
                                    <div className="text-[7px] font-black uppercase mb-0.5 text-gray-400">Giá dự kiến</div>
                                    <div className="flex flex-wrap items-baseline gap-1">
                                        {service.originalPrice && (
                                            <span className="text-[8px] text-gray-400 line-through font-medium">{service.originalPrice}</span>
                                        )}
                                        <span className="text-[10px] md:text-xs font-bold text-brand-orange">{service.price}</span>
                                    </div>
                                </div>
                                {/* Checkbox indicator */}
                                <div
                                    className="w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0"
                                    style={{
                                        borderColor: isSelected ? COLORS.orange : '#CBD5E1',
                                        backgroundColor: isSelected ? COLORS.orange : 'transparent',
                                        color: isSelected ? COLORS.navy : 'transparent',
                                        borderRadius: '4px',
                                    }}
                                >
                                    <Check size={8} strokeWidth={4} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Service Pagination Controls */}
            {totalServicePages > 1 && (
                <div className="flex justify-center items-center gap-1.5 mt-8">
                    <button
                        type="button"
                        onClick={() => setServicePage(prev => Math.max(prev - 1, 1))}
                        disabled={servicePage === 1}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${servicePage === 1
                            ? 'text-gray-300 bg-gray-50/50 border border-gray-100 cursor-not-allowed'
                            : 'text-brand-blue bg-white border border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        Trước
                    </button>
                    {Array.from({ length: totalServicePages }).map((_, index) => {
                        const pageNumber = index + 1;
                        return (
                            <button
                                type="button"
                                key={pageNumber}
                                onClick={() => setServicePage(pageNumber)}
                                className={`w-7 h-7 rounded-xl text-[10px] font-bold transition-all ${servicePage === pageNumber
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
                        onClick={() => setServicePage(prev => Math.min(prev + 1, totalServicePages))}
                        disabled={servicePage === totalServicePages}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${servicePage === totalServicePages
                            ? 'text-gray-300 bg-gray-50/50 border border-gray-100 cursor-not-allowed'
                            : 'text-brand-blue bg-white border border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        Sau
                    </button>
                </div>
            )}
        </>
    );
}
