import { useState } from 'react';
import { motion } from 'motion/react';
import {
    Calendar, Car, User, Settings,
    Check, ChevronRight, Phone, Clock, Edit2
} from 'lucide-react';
import { COLORS } from '../../../components/share/Color';
import { Button } from '../../../components/share/Button';



export default function BookingPage() {
    const [step, setStep] = useState(1);
    const [selectedService, setSelectedService] = useState<number | null>(null);

    const steps = [
        { id: 1, label: 'DỊCH VỤ', icon: <Settings size={20} /> },
        { id: 2, label: 'THỜI GIAN', icon: <Clock size={20} /> },
        { id: 3, label: 'THÔNG TIN XE', icon: <Car size={20} /> },
        { id: 4, label: 'LIÊN HỆ', icon: <User size={20} /> },
    ];

    const services = [
        { id: 1, title: 'Thay Nhớt Định Kỳ', desc: 'Kiểm tra tổng quát, thay nhớt máy và lọc nhớt tiêu chuẩn.', price: '850.000đ', badge: 'PHỔ BIẾN' },
        { id: 2, title: 'Kiểm Tra Hệ Thống Phanh', desc: 'Vệ sinh cụm phanh, kiểm tra má phanh và dầu phanh an toàn.', price: '450.000đ', badge: undefined },
        { id: 3, title: 'Vệ Sinh Điều Hòa', desc: 'Làm sạch dàn lạnh, nạp gas và thay lọc gió điều hòa.', price: '1.200.000đ', badge: undefined },
        { id: 4, title: 'Bảo Dưỡng Tổng Thể', desc: 'Kiểm tra 50 hạng mục kỹ thuật chuyên sâu cho toàn bộ xe.', price: '2.500.000đ', badge: undefined },
    ];

    // ── shared input class ─────────────────────────────────────
    const inputClass = 'w-full bg-[#F8FAFC] border border-blue-50/50 rounded-xl md:rounded-2xl p-2.5 md:p-4 text-xs md:text-sm outline-none transition-all focus:border-amber-400 focus:bg-white';

    return (
        <div className="min-h-screen pb-24" style={{ backgroundColor: '#F8F9FF' }}>

            {/* ── HEADER ───────────────────────────────────────── */}
            <section className="pt-12 pb-20" style={{ backgroundColor: '#F8F9FF' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-4xl md:text-5xl font-display mb-4" style={{ color: COLORS.navy }}>
                        Nhận Tư Vấn Từ Đội Ngũ Chuyên Nghiệp
                    </h1>
                    <p className="max-w-2xl" style={{ color: `${COLORS.navy}99` }}>
                        Trải nghiệm dịch vụ bảo dưỡng chuyên nghiệp, nhanh chóng và tin cậy cho phương tiện của bạn.
                    </p>

                    {/* ── STEP INDICATOR ── */}
                    <div className="mt-16 flex items-center justify-between max-w-4xl mx-auto relative px-4">
                        {/* Track */}
                        <div className="absolute top-1/2 left-0 w-full h-[2px] -translate-y-1/2 z-0 bg-gray-200" />
                        {/* Progress */}
                        <div
                            className="absolute top-1/2 left-0 h-[2px] -translate-y-1/2 z-0 transition-all duration-500"
                            style={{ width: `${(step - 1) * 33.33}%`, backgroundColor: COLORS.orange }}
                        />

                        {steps.map((s) => {
                            const isDone = s.id < step;
                            const isActive = s.id === step;
                            return (
                                <div key={s.id} className="relative z-10 flex flex-col items-center">
                                    <div
                                        className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base transition-all duration-300 shadow-sm"
                                        style={{
                                            backgroundColor: isDone || isActive ? COLORS.orange : '#DDE5F4',
                                            color: isDone || isActive ? '#FFFFFF' : '#8A96B3',
                                            transform: isActive ? 'scale(1.1)' : 'scale(1)',
                                        }}
                                    >
                                        {isDone ? <Check size={20} strokeWidth={3} /> : s.id}
                                    </div>
                                    <span
                                        className="text-[10px] font-bold mt-3 tracking-widest uppercase"
                                        style={{ color: isActive ? COLORS.navy : `${COLORS.navy}4D` }}
                                    >
                                        {s.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* ── MAIN FORM ────────────────────────────────── */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Step 1 — Chọn dịch vụ */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                            className="p-4 md:p-10 rounded-3xl md:rounded-[2.5rem] shadow-sm border border-blue-50"
                            style={{ backgroundColor: '#EFF4FF' }}
                        >
                            <div className="flex items-center gap-3 mb-6 md:mb-10">
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-blue-50 flex items-center justify-center"
                                    style={{ color: COLORS.navy }}>
                                    <Settings size={16} className="md:w-[20px] md:h-[20px]" />
                                </div>
                                <h2 className="text-base md:text-2xl font-bold" style={{ color: COLORS.navy }}>Chọn Dịch Vụ Bảo Dưỡng</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-2 md:gap-6">
                                {services.map((service) => {
                                    const isSelected = selectedService === service.id;
                                    return (
                                        <label
                                            key={service.id}
                                            className="relative p-3 md:p-8 rounded-2xl md:rounded-3xl border-2 transition-all cursor-pointer flex flex-col group"
                                            style={{
                                                borderColor: isSelected ? COLORS.orange : '#EFF4FF',
                                                backgroundColor: isSelected ? 'rgba(249,161,27,0.06)' : '#FFFFFF',
                                            }}
                                        >
                                            <input type="radio" name="service" className="hidden" onChange={() => setSelectedService(service.id)} />

                                            {service.badge && (
                                                <div className="absolute top-2 right-2 text-[6px] md:text-[9px] font-bold px-1 py-0.5 md:px-2 md:py-1 rounded-sm md:rounded-lg"
                                                    style={{ backgroundColor: COLORS.orange, color: COLORS.navy }}>
                                                    {service.badge}
                                                </div>
                                            )}

                                            <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-[#F8FAFC] shadow-sm flex items-center justify-center mb-3 md:mb-6 group-hover:scale-110 transition-transform shrink-0">
                                                <Settings size={16} className="md:w-6 md:h-6" style={{ color: `${COLORS.navy}66` }} />
                                            </div>

                                            <h3 className="text-xs md:text-xl font-bold mb-1 md:mb-3 line-clamp-1 md:line-clamp-none" style={{ color: COLORS.navy }}>{service.title}</h3>
                                            <p className="hidden md:block text-sm mb-8 leading-relaxed" style={{ color: `${COLORS.navy}80` }}>
                                                {service.desc}
                                            </p>

                                            <div className="mt-auto flex justify-between items-end gap-1">
                                                <div>
                                                    <div className="text-[7px] md:text-[10px] font-bold uppercase mb-0.5 md:mb-1" style={{ color: `${COLORS.navy}4D` }}>Giá từ</div>
                                                    <div className="text-xs md:text-lg font-bold" style={{ color: COLORS.navy }}>{service.price}</div>
                                                </div>
                                                <div
                                                    className="w-5 h-5 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center transition-all shrink-0"
                                                    style={{
                                                        borderColor: isSelected ? COLORS.orange : '#DBEAFE',
                                                        backgroundColor: isSelected ? COLORS.orange : 'transparent',
                                                        color: isSelected ? COLORS.navy : 'transparent',
                                                    }}
                                                >
                                                    <Check size={10} className="md:w-4 md:h-4" strokeWidth={4} />
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </motion.div>

                        {/* Step 3 — Thông tin xe */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-4 md:p-10 rounded-3xl md:rounded-[2.5rem] shadow-sm border border-blue-50"
                        >
                            <div className="flex items-center gap-3 mb-6 md:mb-10">
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-blue-50 flex items-center justify-center" style={{ color: COLORS.navy }}>
                                    <Car size={16} className="md:w-[20px] md:h-[20px]" />
                                </div>
                                <h2 className="text-base md:text-2xl font-bold" style={{ color: COLORS.navy }}>Thông Tin Phương Tiện</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-3 md:gap-8">
                                {[
                                    { label: 'Hãng Xe', placeholder: 'Ví dụ: Toyota, Honda...', col: '' },
                                    { label: 'Dòng Xe (Model)', placeholder: 'Ví dụ: Camry, Civic...', col: '' },
                                    { label: 'Biển Số Xe', placeholder: 'Ví dụ: 30A-123.45', col: 'col-span-2' },
                                ].map((field) => (
                                    <div key={field.label} className={field.col}>
                                        <label className="block text-[9px] md:text-[11px] font-bold uppercase tracking-widest mb-1.5 md:mb-2 px-1"
                                            style={{ color: `${COLORS.navy}66` }}>
                                            {field.label}
                                        </label>
                                        <input type="text" placeholder={field.placeholder} className={inputClass} />
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Step 4 — Thông tin liên hệ */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-4 md:p-10 rounded-3xl md:rounded-[2.5rem] shadow-sm border border-blue-50"
                        >
                            <div className="flex items-center gap-3 mb-6 md:mb-10">
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-blue-50 flex items-center justify-center" style={{ color: COLORS.navy }}>
                                    <User size={16} className="md:w-[20px] md:h-[20px]" />
                                </div>
                                <h2 className="text-base md:text-2xl font-bold" style={{ color: COLORS.navy }}>Thông Tin Liên Hệ</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-3 md:gap-8">
                                {[
                                    { label: 'HỌ VÀ TÊN', placeholder: 'Ví dụ: Nguyễn Văn A', type: 'text', col: '' },
                                    { label: 'SỐ ĐIỆN THOẠI', placeholder: 'Ví dụ: 0912345678', type: 'text', col: '' },
                                    { label: 'EMAIL', placeholder: 'Ví dụ: a.nguyen@example.com', type: 'email', col: 'col-span-2' },
                                ].map((field) => (
                                    <div key={field.label} className={field.col}>
                                        <label className="block text-[9px] md:text-[11px] font-bold uppercase tracking-widest mb-1.5 md:mb-2 px-1"
                                            style={{ color: `${COLORS.navy}66` }}>
                                            {field.label}
                                        </label>
                                        <input type={field.type} placeholder={field.placeholder} className={inputClass} />
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* ── SIDEBAR SUMMARY ──────────────────────────── */}
                    <aside>
                        <div className="p-8 rounded-[2.5rem] shadow-xl text-white sticky top-24 overflow-hidden"
                            style={{ backgroundColor: '#00285E' }}>
                            {/* Glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />

                            <h3 className="text-xl font-bold mb-10 border-b border-white/10 pb-6 relative z-10">
                                Tóm Tắt Đặt Lịch
                            </h3>

                            <div className="space-y-8 relative z-10">
                                {/* Dịch vụ */}
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                                        <Settings size={18} style={{ color: COLORS.orange }} />
                                    </div>
                                    <div className="flex-grow">
                                        <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Dịch vụ đã chọn</div>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="font-bold">
                                                {selectedService ? services.find(s => s.id === selectedService)?.title : 'Chưa chọn'}
                                            </span>
                                            {selectedService && (
                                                <button className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                                                    style={{ color: COLORS.orange }}>
                                                    <Edit2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Thời gian */}
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                                        <Calendar size={18} style={{ color: COLORS.orange }} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Thời gian</div>
                                        <div className="font-bold mt-1">Chưa chọn</div>
                                    </div>
                                </div>

                                {/* Phương tiện */}
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                                        <Car size={18} style={{ color: COLORS.orange }} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Phương tiện</div>
                                        <div className="font-bold mt-1">Chưa nhập</div>
                                    </div>
                                </div>
                            </div>

                            {/* Tổng tiền */}
                            <div className="mt-12 pt-8 border-t border-white/10 space-y-4 relative z-10">
                                <div className="flex justify-between text-sm text-white/60">
                                    <span>Tạm tính</span>
                                    <span className="font-mono text-white">850.000đ</span>
                                </div>
                                <div className="flex justify-between text-sm text-white/60">
                                    <span>Phí dịch vụ</span>
                                    <span className="font-mono text-white">0đ</span>
                                </div>
                                <div className="pt-6 flex justify-between items-end">
                                    <div>
                                        <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Tổng cộng</div>
                                        <div className="text-3xl font-bold font-display" style={{ color: COLORS.orange }}>850.000đ</div>
                                    </div>
                                    <div className="text-[9px] text-white/20 italic mb-1">* Giá dự kiến</div>
                                </div>

                                {/* ── Tiếp Theo — Button tái sử dụng ── */}
                                <Button
                                    size="md"
                                    bg={COLORS.orange}
                                    color={COLORS.navy}
                                    icon={<ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                                    className="w-full justify-center rounded-2xl mt-6"
                                    style={{ boxShadow: '0 8px 24px rgba(120,53,15,0.2)' }}
                                    onClick={() => setStep((p) => Math.min(p + 1, 4))}
                                >
                                    Tiếp Theo
                                </Button>
                            </div>

                            <div className="mt-6 text-[10px] text-white/30 text-center leading-relaxed relative z-10">
                                Bằng cách nhấn tiếp tục, bạn đồng ý với các điều khoản dịch vụ của AGMIntelligent.
                            </div>
                        </div>

                        {/* Hotline */}
                        <div className="mt-6 p-6 bg-white rounded-3xl border border-blue-50 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center"
                                style={{ color: COLORS.navy }}>
                                <Phone size={20} />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest mb-1"
                                    style={{ color: `${COLORS.navy}4D` }}>Cần hỗ trợ?</div>
                                <div className="font-bold tracking-tight" style={{ color: COLORS.navy }}>Hotline: 1900 1234</div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}