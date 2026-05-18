import { motion } from 'motion/react';
import {
    Settings, Wrench, Zap, Car, ShieldCheck,
    Droplets, Plus, Package, Wallet, UserCheck
} from 'lucide-react';
import { useState } from 'react';
import { COLORS } from '../../../components/share/Color';
import { Button } from '../../../components/share/Button';



export default function Services() {
    const [activeTab, setActiveTab] = useState('all');

    const categories = [
        { id: 'all', label: 'Tất Cả' },
        { id: 'maintenance', label: 'Bảo Dưỡng' },
        { id: 'repair', label: 'Sửa Chữa' },
    ];

    const services = [
        { id: 1, title: 'Bảo Dưỡng Định Kỳ', desc: 'Kiểm tra tổng quát và thay thế linh kiện hao mòn định kỳ để xe luôn vận hành êm ái.', icon: <Settings size={18} />, price: 'Từ 500.000đ', category: 'maintenance', image: '/images/Precision Maintenance (1).png' },
        { id: 2, title: 'Sửa Chữa Động Cơ', desc: 'Xử lý triệt để các vấn đề phức tạp của động cơ bởi các chuyên gia dày dạn kinh nghiệm.', icon: <Wrench size={18} />, price: 'Từ 1.200.000đ', category: 'repair', image: '/images/Advanced Repair.png' },
        { id: 3, title: 'Dịch Vụ Lốp & Phanh', desc: 'Đảm bảo an toàn tối đa với dịch vụ kiểm tra lốp, cân bằng động và bảo dưỡng hệ thống phanh.', icon: <Car size={18} />, price: 'Từ 400.000đ', category: 'maintenance', image: '/images/Vehicle Protection.png' },
        { id: 4, title: 'Chăm Sóc Nội Thất', desc: 'Làm sạch sâu, khử mùi và bảo dưỡng các bề mặt da, nhựa bên trong xe như mới.', icon: <Droplets size={18} />, price: 'Từ 800.000đ', category: 'maintenance', image: '/images/Elite Detailing.png' },
        { id: 5, title: 'Chẩn Đoán Điện Tử', desc: 'Sử dụng máy quét chuyên dụng để phát hiện chính xác mọi lỗi hệ thống điện tử trên xe.', icon: <Zap size={18} />, price: 'Từ 300.000đ', category: 'repair', image: '/images/Digital Diagnostics.png' },
        { id: 6, title: 'Cứu Hộ 24/7', desc: 'Hỗ trợ khẩn cấp mọi lúc, mọi nơi khi xe gặp sự cố bất ngờ trên đường.', icon: <Zap size={18} />, price: '24/7', category: 'repair', image: '/images/Performance Tuning.png' },
    ];

    const filteredServices = activeTab === 'all'
        ? services
        : services.filter(s => s.category === activeTab);

    return (
        <div className="bg-white">

            {/* ── HERO ─────────────────────────────────────────── */}
            <section className="relative h-[180px] md:h-[600px] flex items-center overflow-hidden" style={{ backgroundColor: COLORS.navy }}>
                <div className="absolute inset-0">
                    <img src="/images/div.w-full.png" alt="Service Workshop" className="w-full h-full object-cover opacity-50" />
                    <div className="absolute inset-0" style={{ backgroundColor: `${COLORS.navy}66` }} />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 w-full">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl text-center md:text-left">
                        <h1 className="text-3xl md:text-6xl font-bold font-display text-white mb-2 md:mb-6 leading-tight">
                            Dịch Vụ Chuyên Nghiệp
                        </h1>
                        <p className="hidden md:block text-lg text-white/90 max-w-xl mb-12 leading-relaxed">
                            Nâng tầm trải nghiệm bảo dưỡng xe với đội ngũ kỹ thuật viên tay nghề cao và công nghệ chẩn đoán tiên tiến nhất.
                            Chúng tôi cam kết mang lại sự an toàn tuyệt đối cho mọi hành trình của bạn.
                        </p>

                        {/* ── 2 buttons tái sử dụng ── */}
                        <div className="hidden md:flex flex-wrap gap-4">
                            <Button
                                to="/booking"
                                size="md"
                                bg={COLORS.orange}
                                color={COLORS.navy}
                                icon={null}
                                className="uppercase text-sm rounded-md"
                            >
                                Đặt lịch ngay
                            </Button>

                            <Button
                                size="md"
                                bg="transparent"
                                color={COLORS.white}
                                icon={null}
                                className="uppercase text-sm rounded-md"
                                style={{ border: `1px solid ${COLORS.white}` }}
                            >
                                Tư vấn miễn phí
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ── SERVICES LIST ─────────────────────────────────── */}
            <section className="py-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#F8FAFC' }}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
                    <div>
                        <span className="font-bold text-sm tracking-widest uppercase mb-4 block" style={{ color: COLORS.orange }}>
                            DÀNH CHO XE CỦA BẠN
                        </span>
                        <h2 className="text-5xl font-bold font-display" style={{ color: COLORS.navy }}>Danh Mục Dịch Vụ</h2>
                    </div>

                    {/* ── CATEGORY PILLS — Button tái sử dụng ── */}
                    <div className="flex flex-wrap gap-4">
                        {categories.map((cat) => (
                            <Button
                                key={cat.id}
                                size="sm"
                                icon={null}
                                bg={activeTab === cat.id ? COLORS.navy : COLORS.white}
                                color={activeTab === cat.id ? COLORS.white : `${COLORS.navy}80`}
                                onClick={() => setActiveTab(cat.id)}
                                style={{
                                    boxShadow: activeTab === cat.id
                                        ? `0 4px 16px ${COLORS.navy}33`
                                        : '0 1px 4px rgba(0,0,0,0.06)',
                                    border: activeTab === cat.id ? 'none' : '1px solid transparent',
                                }}
                            >
                                {cat.label}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-10">
                    {filteredServices.map((service, idx) => (
                        <motion.div
                            layout
                            key={service.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(10,35,87,0.15)', borderColor: 'rgba(10,35,87,0.25)' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className={`${idx >= 4 ? 'hidden md:flex' : 'flex'} bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 flex-col cursor-pointer`}
                        >
                            <div className="relative aspect-[16/10] overflow-hidden">
                                <img src={service.image} alt={service.title} className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
                                <div className="absolute top-0 right-0 px-2 py-1 md:px-4 md:py-2 text-white text-[9px] md:text-xs font-bold"
                                    style={{ backgroundColor: `${COLORS.navy}E6` }}>
                                    {service.price}
                                </div>
                            </div>

                            <div className="p-3 md:p-10 flex-grow flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-6">
                                        <span className="scale-75 md:scale-100 origin-left" style={{ color: COLORS.navy }}>{service.icon}</span>
                                        <h3 className="text-xs md:text-2xl font-bold line-clamp-1 md:line-clamp-none" style={{ color: COLORS.navy }}>{service.title}</h3>
                                    </div>
                                    <p className="text-[10px] md:text-base leading-normal md:leading-relaxed mb-4 md:mb-10 flex-grow line-clamp-2 md:line-clamp-none font-medium" style={{ color: `${COLORS.navy}66` }}>
                                        {service.desc}
                                    </p>
                                </div>

                                {/* ── SERVICE CARD BUTTON — tái sử dụng ── */}
                                <Button
                                    size="sm"
                                    icon={null}
                                    bg="transparent"
                                    color={COLORS.navy}
                                    className="w-full justify-center uppercase tracking-widest text-[9px] md:text-xs rounded-md py-1.5 md:py-2"
                                    style={{ border: `1px solid ${COLORS.navy}` }}
                                >
                                    {service.id === 6 ? 'GỌI CỨU HỘ' : 'ĐẶT DỊCH VỤ'}
                                </Button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ── WHY CHOOSE US ─────────────────────────────────── */}
            <section className="py-32" style={{ backgroundColor: '#EDF3FF' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-4xl font-bold font-display mb-10 relative inline-block" style={{ color: COLORS.navy }}>
                        Tại Sao Chọn AGM Intelligent?
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-48 h-1 rounded-full"
                            style={{ backgroundColor: COLORS.navy }} />
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8 mt-10 md:mt-24">
                        {[
                            { title: 'Kỹ Thuật Viên', desc: 'Đội ngũ chuyên gia được đào tạo bài bản và giàu kinh nghiệm thực tế.', icon: <UserCheck size={32} /> },
                            { title: 'Phụ Tùng Chính Hãng', desc: 'Cam kết sử dụng 100% linh kiện chính hãng, rõ ràng nguồn gốc xuất xứ.', icon: <Package size={32} /> },
                            { title: 'Giá Cả Minh Bạch', desc: 'Báo giá chi tiết trước khi thực hiện, không phát sinh chi phí ẩn.', icon: <Wallet size={32} /> },
                            { title: 'Bảo Hành Dài Hạn', desc: 'Chính sách bảo hành uy tín cho mọi hạng mục sửa chữa và phụ tùng.', icon: <ShieldCheck size={32} /> },
                        ].map((item, idx) => (
                            <motion.div
                                key={idx}
                                whileHover={{ y: -6, scale: 1.03, boxShadow: '0 16px 32px rgba(10,35,87,0.12)' }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                                className="bg-white p-4 md:p-12 rounded-2xl shadow-sm border border-transparent cursor-pointer flex flex-col justify-between"
                            >
                                <motion.div
                                    whileHover={{ rotate: [0, -8, 8, 0], scale: 1.1 }}
                                    transition={{ duration: 0.4 }}
                                    className="w-10 h-10 md:w-16 md:h-16 rounded-lg md:rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-4 md:mb-10 [&>svg]:w-5 [&>svg]:h-5 md:[&>svg]:w-8 md:[&>svg]:h-8"
                                    style={{ color: COLORS.navy }}
                                >
                                    {item.icon}
                                </motion.div>
                                <h4 className="text-xs md:text-xl font-bold mb-2 md:mb-4 line-clamp-1 md:line-clamp-none" style={{ color: COLORS.navy }}>{item.title}</h4>
                                <p className="text-[10px] md:text-sm leading-normal md:leading-relaxed font-medium line-clamp-2 md:line-clamp-none" style={{ color: `${COLORS.navy}80` }}>{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FAQ ───────────────────────────────────────────── */}
            <section className="py-40 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-4xl font-bold font-display mb-20 text-center uppercase tracking-tighter"
                    style={{ color: COLORS.navy }}>
                    Câu Hỏi Thường Gặp
                </h2>
                <div className="space-y-6">
                    {[
                        'Thời gian bảo dưỡng định kỳ mất bao lâu?',
                        'Tôi có cần đặt lịch trước không?',
                        'AGM Intelligent có hỗ trợ xe mượn khi sửa chữa lâu không?'
                    ].map((q, i) => (
                        <div key={i} className="bg-[#F8FAFC] border border-gray-100 rounded-lg overflow-hidden">
                            <motion.button
                                whileHover={{ backgroundColor: `${COLORS.navy}08` }}
                                whileTap={{ scale: 0.99 }}
                                className="w-full p-8 text-left flex justify-between items-center group transition-colors"
                            >
                                <span className="font-bold text-base" style={{ color: `${COLORS.navy}CC` }}>{q}</span>
                                <Plus size={20} style={{ color: COLORS.navy }} className="group-hover:rotate-45 transition-transform" />
                            </motion.button>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}