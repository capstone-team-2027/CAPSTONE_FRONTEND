import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Settings,
    Wrench,
    Zap,
    ShieldCheck,
    Droplets,
    CheckCircle2,
    UserCheck,
    Clock,
    Calendar,
    Phone,
    ArrowRight,
    Star,
    Cpu
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../components/share/Color';
import { Button } from '../../../components/share/Button';


export default function Home() {
    const { t, i18n } = useTranslation();
    const [activeMemberIndex, setActiveMemberIndex] = useState(0);

    const teamMembers = [
        {
            name: 'Sơn',
            fullName: 'Đào Lưu Đức Sơn',
            role: i18n.language === 'vi' ? 'Kỹ thuật viên trưởng' : 'Head Technician',
            specialty: i18n.language === 'vi' ? 'Chuyên gia kỹ thuật dòng xe Đức' : 'German Car Specialist',
            experience: i18n.language === 'vi' ? '18 năm' : '18 years',
            tags: ['ASE Master', 'BMW Certified', 'Mercedes-Benz Specialist'],
            masterTechs: '24+',
            certifications: '47',
            image: '/images/son.jpg',
            label: i18n.language === 'vi' ? 'Kỹ thuật viên dòng xe Đức' : 'German Car Master Tech'
        },
        {
            name: 'Bình',
            fullName: 'Trần Lương Bình',
            role: i18n.language === 'vi' ? 'Kỹ thuật viên cao cấp' : 'Senior Technician',
            specialty: i18n.language === 'vi' ? 'Chuyên gia hệ thống truyền động' : 'Drivetrain Specialist',
            experience: i18n.language === 'vi' ? '15 năm' : '15 years',
            tags: ['Porsche Certified', 'ASE Advanced', 'Audi Master'],
            masterTechs: '18+',
            certifications: '35',
            image: '/images/binh.jpg',
            label: i18n.language === 'vi' ? 'Chuyên gia dòng xe Ý' : 'Italian Car Specialist'
        },
        {
            name: 'Ngân',
            fullName: 'Đỗ Thị Thu Ngân',
            role: i18n.language === 'vi' ? 'Chuyên gia chẩn đoán' : 'Diagnostics Specialist',
            specialty: i18n.language === 'vi' ? 'Kỹ thuật viên điện tử & ECU' : 'Electronics & ECU Technician',
            experience: i18n.language === 'vi' ? '12 năm' : '12 years',
            tags: ['Tesla Specialist', 'Electric Vehicle Master', 'MIT Graduate'],
            masterTechs: '12+',
            certifications: '28',
            image: '/images/ngan.jpg',
            label: i18n.language === 'vi' ? 'Chuyên gia điện tử' : 'Electronics Expert'
        },
        {
            name: 'Thiện',
            fullName: 'Lê Văn Thiện',
            role: i18n.language === 'vi' ? 'Chuyên gia đồng sơn & thân vỏ' : 'Body & Paint Specialist',
            specialty: i18n.language === 'vi' ? 'Phục hồi xe cổ & sơn cao cấp' : 'Classic Car Restoration & Premium Paint',
            experience: i18n.language === 'vi' ? '20 năm' : '20 years',
            tags: ['Master Painter', 'Classic Car Restoration', 'Ferrari Grade'],
            masterTechs: '15+',
            certifications: '42',
            image: '/images/thien.jpg',
            label: i18n.language === 'vi' ? 'Bậc thầy phục chế xe cổ' : 'Classic Car Restoration Master'
        },
        {
            name: 'Mạnh',
            fullName: 'Phan Đức Mạnh',
            role: i18n.language === 'vi' ? 'Kỹ thuật viên hiệu năng' : 'Performance Technician',
            specialty: i18n.language === 'vi' ? 'Tuning & Nâng cấp hệ thống tăng áp' : 'Tuning & Turbochargers Upgrade',
            experience: i18n.language === 'vi' ? '14 năm' : '14 years',
            tags: ['Tuning Master', 'Turbo Specialist', 'Race Prep Expert'],
            masterTechs: '20+',
            certifications: '39',
            image: '/images/manh.jpg',
            label: i18n.language === 'vi' ? 'Chuyên gia tối ưu hiệu năng' : 'Performance Optimization Expert'
        }
    ];

    const [activeTechIndex, setActiveTechIndex] = useState(0);

    const techSpecs = [
        {
            title: i18n.language === 'vi' ? 'Hệ thống tăng áp' : 'Turbocharger System',
            displayTitle: i18n.language === 'vi' ? 'Bộ tăng áp động cơ' : 'Engine Turbocharger',
            sub: i18n.language === 'vi' ? 'Hệ thống truyền động' : 'Drivetrain',
            image: '/images/Turbocharger Assembly.png',
            icon: <Cpu size={22} />,
            desc: i18n.language === 'vi'
                ? 'Dịch vụ tối ưu hóa và nâng cấp hệ thống tăng áp nhằm cung cấp công suất tối đa và độ bền bỉ vượt trội. Mỗi bộ phận đều được kiểm tra độ cân bằng động chính xác.'
                : 'Optimization and upgrade services for turbocharger systems to deliver maximum power and outstanding durability. Each component is balanced dynamically.',
            stats: [
                { label: i18n.language === 'vi' ? 'Linh kiện' : 'Component', value: 'OEM' },
                { label: i18n.language === 'vi' ? 'Thời gian TB' : 'Avg Time', value: '48h' },
                { label: i18n.language === 'vi' ? 'Bảo hành' : 'Warranty', value: i18n.language === 'vi' ? '2 năm' : '2 years' }
            ]
        },
        {
            title: i18n.language === 'vi' ? 'Phanh gốm Carbon' : 'Carbon Ceramic Brakes',
            displayTitle: i18n.language === 'vi' ? 'Hệ thống phanh gốm' : 'Ceramic Brake System',
            sub: i18n.language === 'vi' ? 'Phanh & An toàn' : 'Brakes & Safety',
            image: '/images/phanhgom.jpg',
            icon: <ShieldCheck size={22} />,
            desc: i18n.language === 'vi'
                ? 'Ứng dụng vật liệu ma sát tiên tiến cho hiệu năng phanh vượt trội, không bị giảm hiệu suất khi ở nhiệt độ cực cao. Thích hợp cho xe hiệu năng cao và xe đua.'
                : 'Utilizes advanced friction materials for superior brake performance with zero fade at extreme temperatures. Suitable for high-performance and race cars.',
            stats: [
                { label: i18n.language === 'vi' ? 'Tiêu chuẩn' : 'Standard', value: 'Track' },
                { label: i18n.language === 'vi' ? 'Độ bền' : 'Durability', value: '100K km' },
                { label: i18n.language === 'vi' ? 'Hiệu năng' : 'Performance', value: '+40%' }
            ]
        },
        {
            title: i18n.language === 'vi' ? 'Hệ thống treo thích ứng' : 'Adaptive Suspension',
            displayTitle: i18n.language === 'vi' ? 'Hệ thống treo chủ động' : 'Active Suspension System',
            sub: i18n.language === 'vi' ? 'Khung gầm & Hệ thống treo' : 'Chassis & Suspension',
            image: '/images/treo.jpg',
            icon: <Wrench size={22} />,
            desc: i18n.language === 'vi'
                ? 'Hiệu chuẩn giảm chấn điện tử để mang lại sự cân bằng hoàn hảo giữa cảm giác lái êm ái và khả năng xử lý thể thao. Chẩn đoán rò rỉ và lỗi cảm biến chính xác.'
                : 'Calibrates electronic dampening to deliver the perfect balance between ride comfort and sport handling. Precise sensor diagnostics.',
            stats: [
                { label: i18n.language === 'vi' ? 'Phản hồi' : 'Response', value: '10ms' },
                { label: i18n.language === 'vi' ? 'Cảm biến' : 'Sensors', value: i18n.language === 'vi' ? '4 điểm' : '4-point' },
                { label: i18n.language === 'vi' ? 'Độ chuẩn' : 'Accuracy', value: '99%' }
            ]
        },
        {
            title: i18n.language === 'vi' ? 'Lập trình ECU chuyên sâu' : 'Advanced ECU Tuning',
            displayTitle: i18n.language === 'vi' ? 'Tối ưu hóa ECU' : 'ECU Optimization',
            sub: i18n.language === 'vi' ? 'Hệ thống điện & Điện tử' : 'Electrical & Electronics',
            image: '/images/ECU.jpg',
            icon: <Settings size={22} />,
            desc: i18n.language === 'vi'
                ? 'Hiệu chỉnh phần mềm điều khiển động cơ nhằm tối ưu hóa công suất, mô-men xoắn và hiệu quả nhiên liệu. Đảm bảo các thông số vận hành luôn trong giới hạn an toàn.'
                : 'Tunes engine control unit software to optimize power output, torque, and fuel efficiency while keeping operating parameters safely within limits.',
            stats: [
                { label: i18n.language === 'vi' ? 'Công suất' : 'Power', value: '+25%' },
                { label: i18n.language === 'vi' ? 'Mô-men xoắn' : 'Torque', value: '+30%' },
                { label: i18n.language === 'vi' ? 'Độ trễ ga' : 'Throttle Lag', value: i18n.language === 'vi' ? 'Cực thấp' : 'Ultra-low' }
            ]
        }
    ];

    const googleReviews = [
        {
            id: 1,
            name: i18n.language === 'vi' ? 'Thanh Sơn' : 'Thanh Son',
            role: i18n.language === 'vi' ? 'Local Guide · 15 đánh giá' : 'Local Guide · 15 reviews',
            avatar: 'S',
            color: '#10B981',
            time: i18n.language === 'vi' ? '1 tuần trước' : '1 week ago',
            text: i18n.language === 'vi'
                ? 'Cơ sở vật chất của AGM thực sự rất hiện đại, máy móc chẩn đoán lỗi chính xác như đại lý chính hãng. Nhân viên kỹ thuật giải thích cặn kẽ tình trạng xe. Rất an tâm khi giao xe ở đây.'
                : "AGM's facilities are truly modern, diagnostic equipment is as accurate as genuine dealers. The technical staff explained the vehicle condition in detail. Very reassuring to leave the car here."
        },
        {
            id: 2,
            name: i18n.language === 'vi' ? 'Anh Tuấn' : 'Anh Tuan',
            role: i18n.language === 'vi' ? 'Local Guide · 28 đánh giá' : 'Local Guide · 28 reviews',
            avatar: 'T',
            color: '#3B82F6',
            time: i18n.language === 'vi' ? '3 tuần trước' : '3 weeks ago',
            text: i18n.language === 'vi'
                ? 'Dịch vụ phủ ceramic ở đây làm rất kỹ. Sau khi nhận xe thì độ bóng loáng cực kỳ cao và lớp sơn được bảo vệ hoàn hảo. Giá cả hợp lý và dịch vụ khách hàng cực kỳ chu đáo.'
                : 'The ceramic coating service here is done very meticulously. After picking up the car, the gloss is extremely high and the paint is perfectly protected. Reasonable price and extremely attentive customer service.'
        },
        {
            id: 3,
            name: i18n.language === 'vi' ? 'Hoàng Minh' : 'Hoang Minh',
            role: i18n.language === 'vi' ? '12 đánh giá' : '12 reviews',
            avatar: 'M',
            color: '#EC4899',
            time: i18n.language === 'vi' ? '1 tháng trước' : '1 month ago',
            text: i18n.language === 'vi'
                ? 'Đã làm bảo dưỡng phanh gốm carbon và lập trình lại ECU tại AGM. Xe đi mượt hơn hẳn, cảm giác chân ga cực nhạy. Kỹ thuật viên Sơn hỗ trợ rất nhiệt tình.'
                : 'Did carbon ceramic brake maintenance and reprogrammed the ECU at AGM. The car runs much smoother, the accelerator pedal feels extremely sensitive. Technician Son supported very enthusiastically.'
        },
        {
            id: 4,
            name: i18n.language === 'vi' ? 'Quốc Khánh' : 'Quoc Khanh',
            role: i18n.language === 'vi' ? 'Local Guide · 45 đánh giá' : 'Local Guide · 45 reviews',
            avatar: 'K',
            color: '#F59E0B',
            time: i18n.language === 'vi' ? '1 tháng trước' : '1 month ago',
            text: i18n.language === 'vi'
                ? 'Quy trình làm việc chuyên nghiệp, phòng chờ thoải mái có phục vụ nước. Chi phí sửa chữa được báo rõ ràng trước khi làm và không phát sinh thêm.'
                : 'Professional working process, comfortable waiting room with beverage service. Repair costs are clearly reported before doing and no extra charges arise.'
        }
    ];

    const customerStories = [
        {
            id: 1,
            name: 'Chị Thảo Dương',
            role: i18n.language === 'vi' ? 'Chủ sở hữu Porsche 911 GT3 RS' : 'Owner of Porsche 911 GT3 RS',
            image: '/images/dn1.jpeg',
            text: i18n.language === 'vi'
                ? '"AGM đã thay đổi hoàn toàn trải nghiệm chuẩn bị xe trước mỗi chặng đua của tôi. Khả năng chẩn đoán chính xác của họ đã phát hiện ra lỗi mà đại lý chính hãng đã bỏ sót nhiều tháng qua. Kỹ thuật viên ở đây thực sự là những chuyên gia đầu ngành."'
                : '"AGM completely changed my track-prep experience. Their accurate diagnostics detected a fault that the factory dealer missed for months. The technicians here are true industry leaders."'
        },
        {
            id: 2,
            name: 'Anh Hoàng Sơn',
            role: i18n.language === 'vi' ? 'Chủ sở hữu BMW M4 Competition' : 'Owner of BMW M4 Competition',
            image: '/images/dn2.jpeg',
            text: i18n.language === 'vi'
                ? '"Dịch vụ chăm sóc xe ở đây cực kỳ tỉ mỉ. Lớp phủ ceramic giúp xe của tôi luôn bóng bẩy như vừa xuất xưởng. Tôi rất ấn tượng với sự chuyên nghiệp cùng cơ sở vật chất hiện đại của AGM."'
                : '"The car care service here is extremely meticulous. The ceramic coating keeps my car shining as if it just left the showroom. I am highly impressed by AGM\'s professionalism and modern facilities."'
        },
        {
            id: 3,
            name: 'Anh Duy Anh',
            role: i18n.language === 'vi' ? 'Chủ sở hữu Mercedes-Benz S-Class' : 'Owner of Mercedes-Benz S-Class',
            image: '/images/dn3.jpeg',
            text: i18n.language === 'vi'
                ? '"Tôi thường đến AGM để bảo dưỡng xe định kỳ và vô cùng hài lòng. Quy trình đặt lịch nhanh chóng, kỹ thuật viên tư vấn rõ ràng và chi phí rất minh bạch. Đây chắc chắn là địa chỉ chăm sóc xe tin cậy của tôi."'
                : '"I regularly visit AGM for routine maintenance and am completely satisfied. Fast booking, clear consultation, and highly transparent pricing. This is definitely my trusted car care address."'
        }
    ];

    const stats = [
        { label: t('home.stats.experience'), value: '18+' },
        { label: t('home.stats.maintained'), value: '12K+' },
        { label: t('home.stats.satisfaction'), value: '99.8%' },
    ];

    return (
        <div className="overflow-hidden bg-white">
            {/* Hero Section */}
            <section className="relative h-44 sm:h-56 md:min-h-[90vh] flex items-center bg-[#00285E] overflow-hidden py-0 md:pt-28 md:pb-20">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <img
                        src="/images/Container.png"
                        alt="Hero Background"
                        className="w-full h-full object-cover"
                    />
                </div>

                <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            <div className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-white/80 text-[10px] font-bold uppercase tracking-widest mb-8 border border-white/10 backdrop-blur-sm mt-12">
                                <ShieldCheck size={14} style={{ color: COLORS.orange }} />
                                {t('home.hero.badge')}
                            </div>

                            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-[4.5rem] 2xl:text-[5.5rem] font-display text-white mb-2 md:mb-6 leading-[1.1] md:leading-[1.05] tracking-tight">
                                <span className="inline md:block">{t('home.hero.title1', 'Chăm sóc ')}</span>
                                <span className="inline md:block mt-0 md:mt-4" style={{ color: COLORS.orange }}>{t('home.hero.title2', 'XẾ YÊU').toUpperCase()}</span>
                            </h1>

                            <div className="hidden md:block space-y-4 mb-10 max-w-lg">
                                <p className="text-white/70 leading-relaxed font-medium">
                                    {t('home.hero.desc1')}
                                </p>
                                <p className="text-white/60 leading-relaxed text-sm">
                                    {t('home.hero.desc2')}
                                </p>
                            </div>

                            {/* ── HERO BUTTONS ── */}
                            <div className="flex items-center gap-4 mt-4 md:mt-0 mb-0 md:mb-8">
                                {/* Primary — nền cam, chữ navy */}
                                <div className="scale-75 md:scale-100 origin-left">
                                    <Button to="/phone-service" size="md" bg={COLORS.orange} color={COLORS.navy} icon={<ArrowRight size={20} />}>
                                        {t('home.hero.bookBtn')}
                                    </Button>
                                </div>

                                {/* Ghost — trong suốt, viền trắng mờ, chữ trắng */}
                                <div className="hidden md:block">
                                    <Button size="md" bg="transparent" color={COLORS.white} icon={<span className="text-white/50 text-xl font-normal">↓</span>} style={{ border: '1px solid rgba(255,255,255,0.2)' }} onClick={() => document.getElementById('services-grid')?.scrollIntoView({ behavior: 'smooth' })}>
                                        {t('home.hero.exploreBtn')}
                                    </Button>
                                </div>
                            </div>

                            <div className="hidden md:grid grid-cols-3 gap-12 border-t border-white/10 pt-6">
                                {stats.map((stat) => (
                                    <div key={stat.label}>
                                        <div className="text-4xl font-bold text-white mb-1 font-display">{stat.value}</div>
                                        <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest leading-normal max-w-[120px]">
                                            {stat.label}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, x: 50 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            transition={{ duration: 1 }}
                            className="relative hidden lg:block"
                        >
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 relative aspect-[16/10] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 group">
                                    <img
                                        src="/images/Main Card.png"
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        alt="Engine"
                                    />
                                    <div className="absolute bottom-6 left-6 inline-flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-bold shadow-lg" style={{ color: COLORS.navy }}>
                                        <Wrench size={14} style={{ color: COLORS.orange }} />
                                        {t('home.hero.badge1')}
                                    </div>
                                </div>
                                <div className="relative aspect-square rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 group">
                                    <img
                                        src="/images/Small Card 1.png"
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        alt="Digital"
                                    />
                                    <div className="absolute bottom-4 left-4 inline-flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-[9px] font-bold" style={{ color: COLORS.navy }}>
                                        <Zap size={12} style={{ color: COLORS.orange }} />
                                        {t('home.hero.badge2')}
                                    </div>
                                </div>
                                <div className="relative aspect-square rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 group">
                                    <img
                                        src="/images/Small Card 2.png"
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        alt="Brakes"
                                    />
                                    <div className="absolute bottom-4 left-4 inline-flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-[9px] font-bold" style={{ color: COLORS.navy }}>
                                        <ShieldCheck size={12} style={{ color: COLORS.orange }} />
                                        {t('home.hero.badge3')}
                                    </div>
                                </div>
                            </div>
                            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-[100px] -z-10"
                                style={{ backgroundColor: `${COLORS.orange}1A` }} />
                            <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full blur-[100px] -z-10"
                                style={{ backgroundColor: `${COLORS.navy}33` }} />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* MOBILE QUICK CATEGORIES (Shopee Style) */}
            <div className="md:hidden bg-white py-8 border-b border-gray-100/50">
                <div className="grid grid-cols-4 gap-y-6 gap-x-2 text-center px-4">
                    {[
                        { name: t('home.mobileNav.services'), path: '/services', icon: Wrench, color: '#F9A11B', bg: '#FFF7ED' },
                        { name: t('home.mobileNav.parts'), path: '/parts', icon: Cpu, color: '#8B5CF6', bg: '#F5F3FF' },
                        { name: t('home.mobileNav.team'), path: '/team', icon: UserCheck, color: '#EC4899', bg: '#FDF2F8' },
                        { name: t('home.mobileNav.booking'), path: '/phone-service', icon: Calendar, color: '#06B6D4', bg: '#ECFEFF' },
                    ].map((item, idx) => {
                        const Icon = item.icon;
                        return (
                            <Link key={idx} to={item.path} className="flex flex-col items-center group active:scale-95 transition-transform duration-150">
                                <div
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs mb-2 transition-colors duration-300"
                                    style={{ backgroundColor: item.bg }}
                                >
                                    <Icon className="w-5 h-5" style={{ color: item.color }} />
                                </div>
                                <span className="text-[11px] font-bold text-slate-700 tracking-tight leading-tight">
                                    {item.name}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Services Grid Section */}
            <section id="services-grid" className="py-20 bg-[#EDF3FF]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-16">
                        <span className="font-bold text-[10px] tracking-[0.2em] uppercase mb-4 block" style={{ color: COLORS.orange }}>
                            {t('home.services.label')}
                        </span>
                        <h2 className="text-5xl font-display mb-6" style={{ color: COLORS.navy }}>{t('home.services.title')}</h2>
                        <p className="max-w-2xl text-sm leading-relaxed" style={{ color: `${COLORS.navy}99` }}>
                            {t('home.services.desc')}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-8">
                        {[
                            { title: t('home.services.item1.title'), desc: t('home.services.item1.desc'), image: '/images/Precision Maintenance (1).png', icon: <Settings size={16} style={{ color: COLORS.orange }} /> },
                            { title: t('home.services.item2.title'), desc: t('home.services.item2.desc'), image: '/images/Advanced Repair.png', icon: <Wrench size={16} style={{ color: COLORS.orange }} /> },
                            { title: t('home.services.item3.title'), desc: t('home.services.item3.desc'), image: '/images/ECU.jpg', icon: <Clock size={16} style={{ color: COLORS.orange }} /> },
                            { title: t('home.services.item4.title'), desc: t('home.services.item4.desc'), image: '/images/Elite Detailing.png', icon: <Droplets size={16} style={{ color: COLORS.orange }} /> },
                            { title: t('home.services.item5.title'), desc: t('home.services.item5.desc'), image: '/images/Performance Tuning.png', icon: <Zap size={16} style={{ color: COLORS.orange }} /> },
                            { title: t('home.services.item6.title'), desc: t('home.services.item6.desc'), image: '/images/Vehicle Protection.png', icon: <ShieldCheck size={16} style={{ color: COLORS.orange }} /> }
                        ].map((feature, idx) => (
                            <motion.div
                                key={idx}
                                whileHover={{ y: -10 }}
                                className={`${idx >= 4 ? 'hidden md:block' : ''} bg-white rounded-2xl overflow-hidden shadow-sm border border-white group`}
                            >
                                <div className="p-2.5 md:p-4 md:pt-6">
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-[#F1F5F9] flex items-center justify-center mb-3 md:mb-6 mx-2 md:mx-4"
                                        style={{ color: COLORS.navy }}>
                                        {feature.icon}
                                    </div>
                                    <div className="aspect-[16/10] rounded-xl overflow-hidden mb-3 md:mb-6 mx-2 md:mx-4">
                                        <img src={feature.image} alt={feature.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                    </div>
                                    <div className="px-2 md:px-4 pb-2 md:pb-4">
                                        <h3 className="text-xs md:text-lg font-bold mb-1 md:mb-3 transition-colors group-hover:opacity-70 line-clamp-1 md:line-clamp-none"
                                            style={{ color: COLORS.navy }}>
                                            {feature.title}
                                        </h3>
                                        <p className="hidden md:block text-[10px] leading-relaxed mb-4" style={{ color: `${COLORS.navy}80` }}>
                                            {feature.desc}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Booking Process Section */}
            <section className="hidden md:block py-40 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-24">
                        <span className="font-bold text-[10px] tracking-[0.2em] uppercase mb-4 block" style={{ color: COLORS.orange }}>
                            {t('home.booking.label')}
                        </span>
                        <h2 className="text-6xl font-display mb-6" style={{ color: COLORS.navy }}>{t('home.booking.title')}</h2>
                        <p className="text-sm max-w-xl mx-auto leading-relaxed" style={{ color: `${COLORS.navy}80` }}>
                            {t('home.booking.desc')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative px-10">
                        <div className="hidden md:block absolute top-[44px] left-[15%] right-[15%] h-[2px] z-0"
                            style={{ backgroundColor: `${COLORS.orange}4D` }} />
                        {[
                            { title: t('home.booking.step1.title'), desc: t('home.booking.step1.desc'), icon: <Settings size={22} /> },
                            { title: t('home.booking.step2.title'), desc: t('home.booking.step2.desc'), icon: <Calendar size={22} /> },
                            { title: t('home.booking.step3.title'), desc: t('home.booking.step3.desc'), icon: <UserCheck size={22} /> },
                            { title: t('home.booking.step4.title'), desc: t('home.booking.step4.desc'), icon: <CheckCircle2 size={22} /> },
                        ].map((step, idx) => (
                            <div key={idx} className="relative z-10 text-center">
                                <div className="w-[88px] h-[88px] rounded-full text-white flex items-center justify-center mx-auto mb-10 shadow-2xl border-[10px] border-white ring-1"
                                    style={{
                                        backgroundColor: COLORS.navy,
                                        boxShadow: `0 0 0 10px ${COLORS.navy}0D`
                                    }}>
                                    {step.icon}
                                </div>
                                <h4 className="font-bold text-lg mb-4" style={{ color: COLORS.navy }}>{step.title}</h4>
                                <p className="text-[11px] leading-relaxed px-4 font-medium" style={{ color: `${COLORS.navy}66` }}>{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Expert Team Section */}
            <section className="hidden md:block py-32 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                        <div>
                            <span className="font-bold text-[10px] tracking-[0.2em] uppercase mb-4 block" style={{ color: COLORS.orange }}>
                                {t('home.team.label')}
                            </span>
                            <h2 className="text-6xl font-display mb-10 leading-[1.1]" style={{ color: COLORS.navy }}>{t('home.team.title')}</h2>
                            <p className="mb-12 text-sm leading-relaxed font-medium max-w-lg" style={{ color: `${COLORS.navy}99` }}>
                                {t('home.team.desc')}
                            </p>

                            {/* ── PILL TOGGLE — dùng Button với bg động ── */}
                            <div className="flex overflow-x-auto scrollbar-none gap-3 mb-10 -mx-4 px-4 flex-nowrap md:flex-wrap md:mx-0 md:px-0">
                                {teamMembers.map((member, i) => (
                                    <Button
                                        key={member.name}
                                        size="sm"
                                        icon={null}
                                        bg={activeMemberIndex === i ? COLORS.navy : '#EDF2F7'}
                                        color={activeMemberIndex === i ? COLORS.white : `${COLORS.navy}66`}
                                        onClick={() => setActiveMemberIndex(i)}
                                        style={{ boxShadow: activeMemberIndex === i ? '0 4px 20px rgba(5,11,24,0.2)' : 'none' }}
                                    >
                                        {member.name}
                                    </Button>
                                ))}
                            </div>

                            <motion.div
                                key={activeMemberIndex}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="space-y-6 mb-12">
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center" style={{ color: COLORS.navy }}>
                                            <UserCheck size={20} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold" style={{ color: COLORS.navy }}>{teamMembers[activeMemberIndex].role}</div>
                                            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: `${COLORS.navy}80` }}>{teamMembers[activeMemberIndex].specialty}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center" style={{ color: COLORS.navy }}>
                                            <Clock size={20} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold" style={{ color: COLORS.navy }}>{teamMembers[activeMemberIndex].experience}</div>
                                            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: `${COLORS.navy}80` }}>{t('home.team.workExperience')}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {teamMembers[activeMemberIndex].tags.map(tag => (
                                        <div key={tag} className="px-4 py-2 rounded-lg bg-white border border-blue-50 text-[10px] font-bold shadow-sm uppercase tracking-tight"
                                            style={{ color: `${COLORS.navy}80` }}>
                                            {tag}
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-12 mt-16 pt-10 border-t border-blue-50">
                                    <div>
                                        <div className="text-4xl font-bold font-display" style={{ color: COLORS.navy }}>{teamMembers[activeMemberIndex].masterTechs}</div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: `${COLORS.navy}4D` }}>{t('home.team.masterTechs')}</div>
                                    </div>
                                    <div>
                                        <div className="text-4xl font-bold font-display" style={{ color: COLORS.navy }}>{teamMembers[activeMemberIndex].certifications}</div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: `${COLORS.navy}4D` }}>{t('home.team.certifications')}</div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        <div className="relative group">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeMemberIndex}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.05 }}
                                    transition={{ duration: 0.5 }}
                                    className="aspect-[4/5] rounded-[3rem] overflow-hidden shadow-3xl border-[12px] border-white relative"
                                >
                                    <img src={teamMembers[activeMemberIndex].image} className="w-full h-full object-cover" alt={teamMembers[activeMemberIndex].fullName} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                                    <div className="absolute bottom-12 left-12">
                                        <div className="px-4 py-1.5 bg-white/90 backdrop-blur-md inline-block text-[10px] font-bold mb-5 rounded-lg shadow-sm" style={{ color: COLORS.navy }}>
                                            {teamMembers[activeMemberIndex].label}
                                        </div>
                                        <h4 className="text-5xl text-white font-display mb-2">{teamMembers[activeMemberIndex].fullName}</h4>
                                        <p className="text-white/50 text-sm font-medium">{teamMembers[activeMemberIndex].role}</p>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                whileTap={{ scale: 0.9 }}
                                className="absolute -bottom-6 -right-6 w-[100px] h-[100px] rounded-[2.5rem] flex items-center justify-center shadow-[0_20px_50px_rgba(249,161,27,0.3)] cursor-pointer z-20 border-[8px] border-white"
                                style={{ backgroundColor: COLORS.orange, color: COLORS.navy }}
                            >
                                <ShieldCheck size={40} />
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tech Specs Interactive Section */}
            <section className="py-20 md:py-40 bg-[#EDF3FF]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-24 items-center">
                        <div className="lg:col-span-5 w-full">
                            <span className="font-bold text-[10px] tracking-[0.2em] uppercase mb-4 block" style={{ color: COLORS.orange }}>{t('home.tech.label')}</span>
                            <h2 className="text-4xl md:text-6xl font-display mb-6 md:mb-10 leading-[1.05]" style={{ color: COLORS.navy }}>{t('home.tech.title')}</h2>
                            <p className="mb-8 md:mb-14 text-xs md:text-sm leading-relaxed font-medium max-w-md" style={{ color: `${COLORS.navy}99` }}>
                                {t('home.tech.desc')}
                            </p>

                            <div className="grid grid-cols-2 md:block gap-3 md:space-y-5">
                                {techSpecs.map((item, idx) => (
                                    <motion.div
                                        whileHover={{ scale: 1.02, x: 5 }}
                                        whileTap={{ scale: 0.98 }}
                                        key={idx}
                                        onClick={() => setActiveTechIndex(idx)}
                                        className="p-4 md:p-7 rounded-[1.5rem] md:rounded-[2rem] border transition-all cursor-pointer flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 group"
                                        style={activeTechIndex === idx
                                            ? { backgroundColor: COLORS.navy, borderColor: COLORS.navy }
                                            : { backgroundColor: COLORS.white, borderColor: '#EFF6FF' }}
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                                            <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0"
                                                style={activeTechIndex === idx
                                                    ? { backgroundColor: 'rgba(255,255,255,0.1)', color: COLORS.orange }
                                                    : { backgroundColor: '#EFF6FF', color: COLORS.navy }}>
                                                {item.icon}
                                            </div>
                                            <div>
                                                <div className="text-xs md:text-lg font-bold transition-colors line-clamp-1 md:line-clamp-none"
                                                    style={{ color: activeTechIndex === idx ? COLORS.white : COLORS.navy }}>
                                                    {item.title}
                                                </div>
                                                <div className="text-[9px] md:text-[10px] uppercase font-bold tracking-[0.15em] md:tracking-[0.2em] mt-0.5 md:mt-1"
                                                    style={{ color: activeTechIndex === idx ? 'rgba(255,255,255,0.4)' : `${COLORS.navy}33` }}>
                                                    {item.sub}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="hidden md:block">
                                            <ArrowRight size={20} style={{ color: activeTechIndex === idx ? COLORS.orange : '#BFDBFE' }} />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        <div className="hidden lg:flex lg:col-span-7 rounded-[2rem] md:rounded-[4rem] p-6 sm:p-16 md:p-24 relative overflow-hidden text-white min-h-[500px] md:min-h-[750px] flex-col shadow-3xl shadow-blue-900/40"
                            style={{ backgroundColor: COLORS.navy }}>
                            <div className="absolute top-12 left-12">
                                <div className="inline-flex items-center gap-2 px-4 py-2 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-widest border"
                                    style={{ backgroundColor: `${COLORS.orange}1A`, color: COLORS.orange, borderColor: `${COLORS.orange}33` }}>
                                    <Zap size={14} fill="currentColor" /> {t('home.tech.diagBadge')}
                                </div>
                            </div>

                            <div className="flex-grow flex items-center justify-center py-16">
                                <AnimatePresence mode="wait">
                                    <motion.img
                                        key={activeTechIndex}
                                        initial={{ scale: 0.8, rotate: -10, opacity: 0 }}
                                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                        exit={{ scale: 1.1, rotate: 5, opacity: 0 }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                        src={techSpecs[activeTechIndex].image}
                                        alt={techSpecs[activeTechIndex].title}
                                        className="max-h-[350px] object-contain drop-shadow-[0_45px_65px_rgba(249,161,27,0.2)]"
                                    />
                                </AnimatePresence>
                            </div>

                            <motion.div key={activeTechIndex} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                                <h3 className="text-5xl font-display mb-6">{techSpecs[activeTechIndex].displayTitle}</h3>
                                <p className="text-white/40 text-[11px] mb-14 leading-relaxed max-w-lg font-medium">
                                    {techSpecs[activeTechIndex].desc}
                                </p>
                                <div className="grid grid-cols-3 gap-12 pt-10 border-t border-white/5">
                                    {techSpecs[activeTechIndex].stats.map((stat, sidx) => (
                                        <div key={sidx}>
                                            <div className="text-2xl font-bold mb-2">{stat.value}</div>
                                            <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest">{stat.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none"
                                style={{ backgroundColor: `${COLORS.orange}0D` }} />
                        </div>
                    </div>
                </div>
            </section>

            {/* Expanded Premium Testimonial Section */}
            <section className="py-20 md:py-32 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Section 1: Google Reviews and Image Collage */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-16 items-center">
                        {/* Left Side: Staggered Image Collage */}
                        <div className="lg:col-span-5 relative w-full h-[320px] md:h-[460px] flex items-center justify-center select-none overflow-hidden rounded-3xl bg-slate-50/30">
                            {/* Decorative background gradients */}
                            <div className="absolute top-10 left-10 w-24 h-24 rounded-full bg-cyan-100/30 blur-2xl"></div>
                            <div className="absolute bottom-10 right-10 w-32 h-32 rounded-full bg-amber-100/20 blur-3xl"></div>

                            {/* Staggered overlapping pictures */}
                            {/* Main Center Image */}
                            <div className="absolute left-[33%] top-[15%] w-[42%] h-[66%] rounded-[2rem] overflow-hidden border-4 border-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-10 transform -rotate-2 hover:rotate-0 hover:scale-[1.02] transition-all duration-500">
                                <img
                                    src="/images/fb1.jpeg"
                                    alt="Customer Portrait 1"
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Top Left Image */}
                            <div className="absolute left-[8%] top-[10%] w-[26%] h-[32%] rounded-2xl overflow-hidden border-2 border-white shadow-lg z-20 transform rotate-6 hover:rotate-0 hover:scale-105 transition-all duration-500">
                                <img
                                    src="/images/fb2.jpeg"
                                    alt="Customer Portrait 2"
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Bottom Left Image */}
                            <div className="absolute left-[10%] bottom-[12%] w-[28%] h-[35%] rounded-2xl overflow-hidden border-2 border-white shadow-lg z-20 transform -rotate-12 hover:rotate-0 hover:scale-105 transition-all duration-500">
                                <img
                                    src="/images/fb3.jpeg"
                                    alt="Customer Portrait 3"
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Top Right Image */}
                            <div className="absolute right-[10%] top-[14%] w-[24%] h-[30%] rounded-2xl overflow-hidden border-2 border-white shadow-lg z-20 transform rotate-12 hover:rotate-0 hover:scale-105 transition-all duration-500">
                                <img
                                    src="/images/fb4.jpeg"
                                    alt="Customer Portrait 4"
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Bottom Right Image */}
                            <div className="absolute right-[6%] bottom-[18%] w-[26%] h-[32%] rounded-2xl overflow-hidden border-2 border-white shadow-lg z-20 transform -rotate-6 hover:rotate-0 hover:scale-105 transition-all duration-500">
                                <img
                                    src="/images/fb5.jpeg"
                                    alt="Customer Portrait 5"
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Silhouette Badge (Cyan glowing user profile) */}
                            <div className="absolute right-[28%] bottom-[8%] w-14 h-14 bg-gradient-to-tr from-[#06B6D4] to-[#0EA5E9] rounded-full flex items-center justify-center border-4 border-white shadow-[0_10px_25px_rgba(6,182,212,0.4)] z-30 transform hover:scale-110 transition-transform duration-300">
                                <ShieldCheck size={22} className="text-white" />
                            </div>
                        </div>

                        {/* Right Side: Header and 2x2 Reviews Grid */}
                        <div className="lg:col-span-7 flex flex-col justify-center">
                            <span className="font-bold text-[10px] tracking-[0.2em] uppercase mb-4 block" style={{ color: COLORS.orange }}>
                                {t('home.testimonials.label')}
                            </span>
                            <h3 className="text-3xl md:text-5xl font-display uppercase mb-4 leading-tight" style={{ color: COLORS.navy }}>
                                {t('home.testimonials.googleReviewsTitle')}
                            </h3>
                            <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-6 font-medium max-w-xl">
                                {t('home.testimonials.googleReviewsDesc')}
                            </p>

                            {/* Google Map Redirection Link */}
                            <div className="mb-8 flex items-center gap-2 text-xs md:text-sm font-semibold text-slate-700">
                                <span>{t('home.testimonials.googleMapLink')}</span>
                                <a
                                    href="https://maps.google.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 font-bold text-orange-500 hover:text-orange-600 transition-colors border-b border-orange-500 pb-0.5"
                                >
                                    {t('home.testimonials.viewHere')} <ArrowRight size={14} />
                                </a>
                            </div>

                            {/* 2x2 Reviews Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {googleReviews.map((review) => (
                                    <div
                                        key={review.id}
                                        className="bg-slate-50/50 p-5 md:p-6 rounded-3xl border border-slate-100/80 shadow-xs hover:shadow-md transition-all duration-300 relative flex flex-col justify-between min-h-[170px]"
                                    >
                                        <div>
                                            {/* Top Row: User Avatar & Google Icon */}
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-xs text-sm"
                                                        style={{ backgroundColor: review.color }}
                                                    >
                                                        {review.avatar}
                                                    </div>
                                                    <div>
                                                        <h5 className="font-bold text-slate-800 text-xs md:text-sm">{review.name}</h5>
                                                        <p className="text-[9px] md:text-[10px] text-slate-400 font-semibold tracking-wide mt-0.5">{review.role}</p>
                                                    </div>
                                                </div>
                                                <img src="/images/google.png" alt="Google" className="w-4 h-4 opacity-70 shrink-0" />
                                            </div>

                                            {/* Stars Row */}
                                            <div className="flex gap-0.5 mt-3">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={12} fill={COLORS.orange} style={{ color: COLORS.orange }} />
                                                ))}
                                                <span className="text-[9px] font-bold text-slate-400 ml-2 mt-0.5">{review.time}</span>
                                            </div>

                                            {/* Comment */}
                                            <p className="text-slate-600 text-[11px] md:text-xs mt-3 leading-relaxed font-medium">
                                                "{review.text}"
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Separator / Divider */}
                    <div className="my-20 md:my-28 border-t border-slate-100"></div>

                    {/* Section 2: Customer Stories (Câu chuyện khách hàng) */}
                    <div>
                        <div className="text-center mb-16 md:mb-20">
                            <span className="font-bold text-[10px] tracking-[0.2em] uppercase mb-4 inline-block" style={{ color: COLORS.orange }}>
                                {t('home.testimonials.storiesBadge')}
                            </span>
                            <h3 className="text-3xl md:text-5xl font-display uppercase mb-4 leading-tight" style={{ color: COLORS.navy }}>
                                {t('home.testimonials.storiesTitle')}
                            </h3>
                            <p className="text-slate-500 text-xs md:text-sm leading-relaxed font-medium max-w-2xl mx-auto">
                                {t('home.testimonials.storiesDesc')}
                            </p>
                        </div>

                        {/* Customer Story Cards */}
                        <div className="flex md:grid md:grid-cols-3 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory md:snap-none scrollbar-none gap-6 md:gap-8 pb-8 md:pb-0 px-4 md:px-0 -mx-4 md:mx-0">
                            {customerStories.map((story) => (
                                <div
                                    key={story.id}
                                    className="group cursor-pointer snap-align-start shrink-0 w-[85vw] md:w-auto bg-slate-50/30 md:bg-transparent rounded-3xl p-6 md:p-0 border border-slate-100 md:border-none shadow-xs md:shadow-none hover:shadow-md md:hover:shadow-none transition-all"
                                >
                                    {/* Circular Frame with Overlapping Accent Rings */}
                                    <div className="relative w-32 h-32 md:w-40 md:h-40 mx-auto mb-6 md:mb-8 select-none">
                                        <div className="absolute -inset-1.5 md:-inset-2 rounded-full border border-dashed border-cyan-400/50 scale-[1.03] animate-[spin_25s_linear_infinite] group-hover:scale-105 transition-transform duration-500"></div>
                                        <div className="absolute -inset-3.5 md:-inset-4 rounded-full border border-cyan-200/30 scale-[1.06] -rotate-12 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500"></div>
                                        <div className="w-full h-full rounded-full overflow-hidden border-[6px] border-white shadow-lg relative z-10 transform group-hover:scale-[0.98] transition-transform duration-500">
                                            <img src={story.image} alt={story.name} className="w-full h-full object-cover" />
                                        </div>
                                    </div>

                                    {/* Text Info */}
                                    <div className="text-center px-2">
                                        <h4 className="text-md md:text-lg font-bold text-slate-800 group-hover:text-orange-500 transition-colors duration-300">{story.name}</h4>
                                        <p className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-1">{story.role}</p>

                                        {/* Stars */}
                                        <div className="flex justify-center gap-0.5 mt-3">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} size={11} fill={COLORS.orange} style={{ color: COLORS.orange }} />
                                            ))}
                                        </div>

                                        <p className="text-slate-500 text-[11px] md:text-xs mt-4 leading-relaxed font-medium max-w-sm mx-auto italic">
                                            {story.text}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Insights/Blog Section */}
            <section className="py-40 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-20 gap-8">
                        <div>
                            <span className="font-bold text-[10px] tracking-[0.2em] uppercase mb-4 block" style={{ color: COLORS.orange }}>{t('home.news.label')}</span>
                            <h2 className="text-6xl font-display uppercase tracking-tight" style={{ color: COLORS.navy }}>{t('home.news.title')}</h2>
                        </div>
                        <Link to="#" className="text-[11px] font-bold uppercase tracking-[0.2em] flex items-center gap-3 transition-all border-b-2 pb-2 group hover:opacity-60"
                            style={{ color: COLORS.navy, borderColor: `${COLORS.navy}1A` }}>
                            {t('home.news.viewAll')} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    <div className="flex md:grid md:grid-cols-3 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory md:snap-none scrollbar-none gap-6 md:gap-12 pb-8 md:pb-0 px-4 md:px-0 -mx-4 md:mx-0">
                        {[
                            { title: t('home.news.article1.title'), date: t('home.news.date1'), tag: t('home.news.tag1'), image: '/images/The Science Behind Ceramic Coatings_ Why Your Investment Deserves Protection.png', desc: t('home.news.article1.desc') },
                            { title: t('home.news.article2.title'), date: t('home.news.date2'), tag: t('home.news.tag2'), image: '/images/Understanding ECU Tuning_ Power Gains Without Compromising Reliability.png', desc: t('home.news.article2.desc') },
                            { title: t('home.news.article3.title'), date: t('home.news.date3'), tag: t('home.news.tag3'), image: '/images/Winter Storage Guide_ Protecting Your Collector Vehicle Through the Cold Months.png', desc: t('home.news.article3.desc') }
                        ].map((article, idx) => (
                            <div key={idx} className="group cursor-pointer snap-align-start shrink-0 w-[82vw] md:w-auto">
                                <div className="aspect-[16/10] rounded-[2.5rem] overflow-hidden mb-8 relative border border-blue-50 shadow-sm">
                                    <img src={article.image} alt={article.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                    <div className="absolute top-6 left-6 inline-flex px-4 py-1.5 bg-white/90 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-xl"
                                        style={{ color: COLORS.navy }}>
                                        {article.tag}
                                    </div>
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-5 inline-flex items-center gap-4"
                                    style={{ color: `${COLORS.navy}4D` }}>
                                    {article.tag} <span className="w-1 h-1 rounded-full" style={{ backgroundColor: '#BFDBFE' }}></span> {article.date}
                                </div>
                                <h4 className="text-2xl font-bold mb-5 transition-colors line-clamp-2 leading-tight group-hover:opacity-60"
                                    style={{ color: COLORS.navy }}>
                                    {article.title}
                                </h4>
                                <p className="text-[11px] leading-relaxed line-clamp-3 font-medium" style={{ color: `${COLORS.navy}66` }}>
                                    {article.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* High-Impact CTA */}
            <section className="py-8 md:py-24 relative overflow-hidden">
                {/* Full-bleed background image */}
                <div className="absolute inset-0 z-0">
                    <img src="/images/sectionbook.png" alt="" className="w-full h-full object-cover" />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 md:gap-16 bg-white/5 rounded-[2rem] md:rounded-[4rem] p-6 md:p-24 border border-white/10 relative overflow-hidden">
                        <div className="max-w-xl text-center sm:text-left relative z-10">
                            <h2 className="text-2xl sm:text-3xl md:text-6xl font-display text-white leading-tight md:leading-[1.05]">{t('home.cta.title')}</h2>
                            <p className="hidden md:block text-white/50 font-medium text-sm leading-relaxed mt-8">
                                {t('home.cta.desc')}
                            </p>
                        </div>

                        <div className="flex flex-col items-center sm:items-end gap-6 md:gap-10 shrink-0 w-full sm:w-auto relative z-10">
                            <Button
                                to="/phone-service"
                                size="md"
                                bg={COLORS.orange}
                                color={COLORS.navy}
                                icon={<ArrowRight size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                                className="w-full sm:w-auto justify-center"
                                style={{ boxShadow: '0 12px 30px rgba(249,161,27,0.2)' }}
                            >
                                {t('home.cta.consultBtn')}
                            </Button>

                            <div className="hidden md:flex items-center gap-8" style={{ color: `${COLORS.white}66` }}>
                                <div className="text-right">
                                    <div className="text-[11px] uppercase font-bold tracking-[0.3em] mb-1" style={{ color: `${COLORS.white}66` }}>(555) 234-5678</div>
                                    <div className="text-[10px] uppercase font-bold tracking-[0.2em]" style={{ color: `${COLORS.white}40` }}>{t('home.cta.schedule')}</div>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center" style={{ color: `${COLORS.white}80` }}>
                                    <Phone size={24} />
                                </div>
                            </div>
                        </div>

                        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-brand-orange/10 via-transparent to-transparent pointer-events-none opacity-50 z-0" />
                    </div>
                </div>
            </section>
        </div>
    );
}