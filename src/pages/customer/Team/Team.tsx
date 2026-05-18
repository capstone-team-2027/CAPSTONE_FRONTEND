import { motion } from 'motion/react';
import { Clock, Zap, Search, ShieldCheck, ArrowRight, Send } from 'lucide-react';
import { COLORS } from '../../../components/share/Color';
import { Button } from '../../../components/share/Button';



// ── DATA ──────────────────────────────────────────────────────
const LEADERS = [
    {
        name: 'Nguyễn Minh Tuấn',
        role: 'Sáng lập & Giám đốc điều hành',
        image: '/staff/leader.jpg',
        bio: 'Với hơn 20 năm kinh nghiệm trong ngành công nghiệp ô tô, ông Tuấn đã xây dựng AMG dựa trên triết lý "Chính trực & Chính xác". Ông tin rằng sự minh bạch là chìa khóa để xây dựng niềm tin lâu dài với khách hàng.',
    },
    {
        name: 'Trần Thu Hà',
        role: 'Giám đốc Dịch vụ',
        image: '/staff/leadernu.webp',
        bio: 'Chuyên gia quản lý quy trình kỹ thuật đạt chuẩn quốc tế. Bà Hà đảm bảo mọi quy trình sửa chữa tại AMG Intelligent đều tuân thủ nghiêm ngặt các tiêu chuẩn an toàn và hiệu suất cao nhất.',
    },
];

const TECHNICIANS = [
    {
        name: 'Lê Hoàng Nam',
        specialty: 'CHUYÊN GIA ĐỘNG CƠ',
        image: '/staff/Staff2.jpeg',
        badge: '15 Năm Kinh Nghiệm',
        badgeIcon: <Clock size={13} />,
        badgeColor: '#10B981',
        desc: 'Chuyên gia hàng đầu về động cơ ô tô, tối ưu hóa hiệu suất cho các dòng xe châu Âu.',
    },
    {
        name: 'Phạm Anh Đức',
        specialty: 'CHUYÊN GIA HYBRID/EV',
        image: '/staff/Staff3.jpeg',
        badge: 'Tesla Certified',
        badgeIcon: <Zap size={13} />,
        badgeColor: '#F9A11B',
        desc: 'Dẫn đầu công nghệ xe điện và hệ thống điện cao áp, đảm bảo an toàn tuyệt đối cho xe của bạn.',
    },
    {
        name: 'Nguyễn Văn Hùng',
        specialty: 'CHUYÊN GIA CHẨN ĐOÁN',
        image: '/staff/Staff4.png',
        badge: 'Master Diagnostic',
        badgeIcon: <Search size={13} />,
        badgeColor: '#3B82F6',
        desc: 'Bậc thầy phát hiện lỗi hệ thống bằng công nghệ máy tính, xử lý mọi vấn đề hóc búa nhất.',
    },
    {
        name: 'Đặng Quốc Việt',
        specialty: 'HỆ THỐNG GẦM & PHANH',
        image: '/staff/staff6.jpeg',
        badge: 'Chuyên gia An Toàn',
        badgeIcon: <ShieldCheck size={13} />,
        badgeColor: '#EF4444',
        desc: 'Chẩn chứt từng millimeter hệ thống phanh và treo, mang lại sự êm ái và an toàn trên mọi địa hình.',
    },
];



// ── MAIN COMPONENT ────────────────────────────────────────────
export default function Team() {
    return (
        <div className="overflow-hidden">

            {/* ── HERO ─────────────────────────────────────────── */}
            <section className="relative min-h-[380px] flex items-end pb-16 overflow-hidden"
                style={{ backgroundColor: COLORS.navy }}>
                <div className="absolute inset-0 z-0">
                    <img
                        src="/images/sectionbook.png"
                        alt="Garage"
                        className="w-full h-full object-cover opacity-40"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#00285E]/95 via-[#00285E]/70 to-transparent" />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7 }}
                    >
                        <h1 className="text-5xl md:text-6xl font-display text-white mb-5 leading-tight">
                            Đội Ngũ Chuyên Gia
                        </h1>
                        <p className="text-white/60 max-w-xl text-base leading-relaxed">
                            Những kỹ thuật viên tay nghề cao và tận tâm nhất, cam kết mang lại sự an toàn
                            tuyệt đối cho hành trình của bạn.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* ── LÃNH ĐẠO ─────────────────────────────────────── */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-12">
                        <span className="font-bold text-[10px] tracking-[0.2em] uppercase mb-3 block"
                            style={{ color: COLORS.orange }}>
                            LÃNH ĐẠO
                        </span>
                        <h2 className="text-4xl font-display" style={{ color: COLORS.navy }}>
                            Ban Điều Hành
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {LEADERS.map((leader, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: idx * 0.1 }}
                                whileHover={{ y: -4 }}
                                className="flex gap-6 p-7 rounded-3xl border transition-shadow hover:shadow-lg"
                                style={{ borderColor: '#EFF6FF', backgroundColor: '#FAFCFF' }}
                            >
                                {/* Photo */}
                                <div className="w-28 h-28 rounded-2xl overflow-hidden flex-shrink-0 border-2"
                                    style={{ borderColor: '#EFF6FF' }}>
                                    <img src={leader.image} alt={leader.name}
                                        className="w-full h-full object-cover object-top" />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xl font-bold mb-1" style={{ color: COLORS.navy }}>
                                        {leader.name}
                                    </h3>
                                    <p className="text-[11px] font-bold uppercase tracking-widest mb-3 italic"
                                        style={{ color: COLORS.orange }}>
                                        {leader.role}
                                    </p>
                                    <p className="text-sm leading-relaxed" style={{ color: `${COLORS.navy}80` }}>
                                        {leader.bio}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CHUYÊN GIA KỸ THUẬT ──────────────────────────── */}
            <section className="py-20" style={{ backgroundColor: '#EDF3FF' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-14">
                        <span className="font-bold text-[10px] tracking-[0.2em] uppercase mb-3 block"
                            style={{ color: COLORS.orange }}>
                            ĐỘI NGŨ KỸ THUẬT
                        </span>
                        <h2 className="text-4xl font-display mb-4" style={{ color: COLORS.navy }}>
                            Chuyên Gia Kỹ Thuật
                        </h2>
                        <p className="text-sm max-w-xl mx-auto leading-relaxed"
                            style={{ color: `${COLORS.navy}80` }}>
                            Tập hợp những đôi bàn tay vàng về trí tuệ công nghệ hàng đầu trong lĩnh vực bảo trì ô tô.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {TECHNICIANS.map((tech, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: idx * 0.1 }}
                                whileHover={{ y: -6 }}
                                className="bg-white rounded-3xl overflow-hidden border transition-shadow hover:shadow-xl group"
                                style={{ borderColor: '#EFF6FF' }}
                            >
                                {/* Image */}
                                <div className="aspect-[4/3] overflow-hidden">
                                    <img src={tech.image} alt={tech.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                </div>

                                {/* Content */}
                                <div className="p-5">
                                    <h3 className="text-base font-bold mb-1" style={{ color: COLORS.navy }}>
                                        {tech.name}
                                    </h3>
                                    <p className="text-[9px] font-bold uppercase tracking-widest mb-3"
                                        style={{ color: `${COLORS.navy}4D` }}>
                                        {tech.specialty}
                                    </p>

                                    {/* Badge */}
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold mb-3"
                                        style={{
                                            backgroundColor: `${tech.badgeColor}15`,
                                            color: tech.badgeColor,
                                        }}>
                                        {tech.badgeIcon}
                                        {tech.badge}
                                    </div>

                                    <p className="text-[11px] leading-relaxed" style={{ color: `${COLORS.navy}66` }}>
                                        {tech.desc}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ──────────────────────────────────────────── */}
            <section className="py-20" style={{ backgroundColor: COLORS.navy }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                        <div className="max-w-xl">
                            <h2 className="text-4xl font-display text-white mb-4 leading-tight">
                                Gia Nhập Đội Ngũ Của Chúng Tôi
                            </h2>
                            <p className="text-sm leading-relaxed" style={{ color: `${COLORS.white}60` }}>
                                Bạn có đam mê với ô tô và mong muốn làm việc trong môi trường chuyên nghiệp, hiện đại?
                                Chúng tôi luôn chào đón những tài năng mới.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-4 shrink-0">
                            <Button
                                size="md"
                                bg={COLORS.orange}
                                color={COLORS.navy}
                                icon={<ArrowRight size={18} />}
                                style={{ boxShadow: '0 8px 24px rgba(249,161,27,0.3)' }}
                            >
                                Xem Vị Trí Tuyển Dụng
                            </Button>

                            <Button
                                size="md"
                                bg="transparent"
                                color={COLORS.white}
                                icon={<Send size={18} />}
                                style={{ border: `1px solid rgba(255,255,255,0.25)` }}
                            >
                                Gửi Hồ Sơ
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
}
