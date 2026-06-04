import { useEffect } from 'react';
import { Check, Sparkles } from 'lucide-react';
import type { ServiceCombo, ServiceItem } from './BookingPage';
import { useFetchClient } from '../../../hook/useFetchClient';
import { SERVICE_API_ENDPOINTS } from '../../../constants/customer/serviceApiEndpoints';

interface ComboServicesSelectorProps {
    dbCombos: ServiceCombo[];
    setDbCombos: React.Dispatch<React.SetStateAction<ServiceCombo[]>>;
    selectedComboId: number | null;
    setSelectedComboId: (id: number | null) => void;
    mappedServices: ServiceItem[];
    getServicePriceValue: (id: number) => number;
    COLORS: { orange: string; navy: string;[key: string]: string };
}

export default function ComboServicesSelector({
    dbCombos,
    setDbCombos,
    selectedComboId,
    setSelectedComboId,
    mappedServices,
    getServicePriceValue,
    COLORS,
}: ComboServicesSelectorProps) {
    const { fetchPublic } = useFetchClient();

    useEffect(() => {
        const fetchCombos = async () => {
            try {
                const res = await fetchPublic(SERVICE_API_ENDPOINTS.GET_COMBOS);
                if (res && res.data && res.data.length > 0) {
                    const mapped = res.data.map((c: any) => {
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
                    setDbCombos(mapped);
                } else {
                    const stored = localStorage.getItem("service_combos");
                    if (stored) {
                        setDbCombos(JSON.parse(stored));
                    }
                }
            } catch (err) {
                console.error("Lỗi khi tải combos:", err);
                const stored = localStorage.getItem("service_combos");
                if (stored) {
                    setDbCombos(JSON.parse(stored));
                }
            }
        };
        
        if (dbCombos.length === 0) {
            fetchCombos();
        }
    }, [dbCombos.length, setDbCombos, fetchPublic]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
            {dbCombos.filter(c => c.is_active).map((combo) => {
                const isSelected = selectedComboId === combo.id;
                const serviceIds = combo.service_ids || [];
                const discountPercentage = combo.discount_percentage ?? 10;
                
                const original = serviceIds.reduce((sum, id) => sum + getServicePriceValue(id), 0);
                const discounted = Math.round(original * (1 - discountPercentage / 100));
                const comboServiceNames = serviceIds.map(id => {
                    const s = mappedServices.find(x => x.id === id);
                    return s ? s.title : "Dịch vụ bảo dưỡng";
                });

                return (
                    <div
                        key={combo.id}
                        onClick={() => setSelectedComboId(isSelected ? null : combo.id)}
                        className="relative p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group text-left"
                        style={{
                            borderColor: isSelected ? COLORS.orange : '#F1F5F9',
                            backgroundColor: isSelected ? 'rgba(249,161,27,0.03)' : '#FFFFFF',
                            boxShadow: isSelected ? '0 10px 20px rgba(249,161,27,0.04)' : 'none'
                        }}
                    >
                        <div>
                            <div className="absolute top-4 right-4 flex items-center gap-1.5 flex-wrap justify-end">
                                <div className="bg-red-100 text-red-600 text-[10px] font-black uppercase px-2 py-0.5 rounded-lg shadow-xs shrink-0">
                                    Giảm {discountPercentage}%
                                </div>
                                <div className="text-[9px] font-bold px-2 py-0.5 rounded-lg shrink-0 bg-brand-orange text-brand-blue">
                                    Combo
                                </div>
                            </div>

                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shrink-0 border border-slate-100 shadow-sm">
                                <Sparkles size={18} className="text-gray-400" />
                            </div>

                            <h3 className="text-base font-bold mb-1 text-brand-blue">{combo.combo_name}</h3>

                            <div className="my-3 space-y-1.5 pl-2 border-l-2 border-amber-400/50">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block font-display">Dịch vụ đi kèm:</span>
                                {comboServiceNames.map((name, idx) => (
                                    <div key={idx} className="text-[11px] text-slate-500 leading-snug flex items-center gap-1">
                                        <span className="text-[#F9A11B] shrink-0">•</span>
                                        <span>{name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-50">
                            <div>
                                <div className="text-[9px] font-bold uppercase mb-0.5 text-gray-400">Giá combo ưu đãi</div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-xs text-gray-400 line-through font-medium">Từ {original.toLocaleString("vi-VN")}đ</span>
                                    <span className="text-base font-bold text-brand-orange">Từ {discounted.toLocaleString("vi-VN")}đ</span>
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
    );
}
