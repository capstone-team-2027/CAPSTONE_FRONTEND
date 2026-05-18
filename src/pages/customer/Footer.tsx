import { Car, Mail, Phone, MapPin, ArrowRight, Camera, Play, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import { COLORS } from '../../components/share/Color';
import { Button } from '../../components/share/Button';

export default function Footer() {
    return (
        <footer className="py-12 md:py-24" style={{ backgroundColor: '#F8FAFC' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-[3rem] p-12 md:p-20 shadow-sm border border-blue-50/80">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-20">

                        {/* Brand */}
                        <div className="lg:col-span-5">
                            <Link to="/" className="flex items-center gap-3 mb-8">
                                <div className="p-2.5 rounded-xl" style={{ backgroundColor: COLORS.navy }}>
                                    <Car className="w-6 h-6" style={{ color: COLORS.white }} />
                                </div>
                                <span className="text-2xl font-bold font-display tracking-tighter uppercase"
                                    style={{ color: COLORS.navy }}>
                                    AGM INTELLIGENT
                                </span>
                            </Link>

                            <p className="text-sm leading-relaxed mb-10 max-w-sm font-medium"
                                style={{ color: `${COLORS.navy}80` }}>
                                Dịch vụ ô tô chính xác dành cho những chiếc xe đòi hỏi sự hoàn hảo.
                                Kỹ thuật viên được chứng nhận từ nhà máy, chẩn đoán đạt chuẩn đại lý
                                và dịch vụ chăm sóc khách hàng cao cấp từ năm 2008.
                            </p>

                            <div className="flex gap-3">
                                {[
                                    { icon: <Camera size={18} />, href: '#', label: 'Instagram' },
                                    { icon: <Play size={18} />, href: '#', label: 'Youtube' },
                                    { icon: <Briefcase size={18} />, href: '#', label: 'LinkedIn' },
                                ].map((social, i) => (
                                    <Button
                                        key={i}
                                        size="sm"
                                        bg="#F8FAFC"
                                        color={`${COLORS.navy}66`}
                                        icon={null}
                                        onClick={() => window.open(social.href, '_blank')}
                                        style={{
                                            border: '1px solid #EFF6FF',
                                            borderRadius: '9999px',
                                            width: '2.75rem',
                                            height: '2.75rem',
                                            padding: 0,
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {social.icon}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Dịch vụ */}
                        <div className="lg:col-span-2">
                            <h4 className="font-bold text-sm mb-8 uppercase tracking-[0.1em]"
                                style={{ color: COLORS.navy }}>
                                DỊCH VỤ
                            </h4>
                            <ul className="space-y-4 text-sm font-medium">
                                {['Maintenance', 'Repair', 'Diagnostics', 'Detailing', 'Tuning'].map((item) => (
                                    <li key={item}>
                                        <Link to="/services"
                                            style={{ color: `${COLORS.navy}66` }}
                                            onMouseEnter={e => (e.currentTarget.style.color = COLORS.orange)}
                                            onMouseLeave={e => (e.currentTarget.style.color = `${COLORS.navy}66`)}
                                        >
                                            {item}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Công ty */}
                        <div className="lg:col-span-2">
                            <h4 className="font-bold text-sm mb-8 uppercase tracking-[0.1em]"
                                style={{ color: COLORS.navy }}>
                                CÔNG TY
                            </h4>
                            <ul className="space-y-4 text-sm font-medium">
                                {['About Us', 'Our Team', 'Careers', 'Press', 'Contact'].map((item) => (
                                    <li key={item}>
                                        <a href="#"
                                            style={{ color: `${COLORS.navy}66` }}
                                            onMouseEnter={e => (e.currentTarget.style.color = COLORS.orange)}
                                            onMouseLeave={e => (e.currentTarget.style.color = `${COLORS.navy}66`)}
                                        >
                                            {item}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Liên hệ */}
                        <div className="lg:col-span-3">
                            <h4 className="font-bold text-sm mb-8 uppercase tracking-[0.1em]"
                                style={{ color: COLORS.navy }}>
                                LIÊN HỆ
                            </h4>
                            <ul className="space-y-6 text-sm font-medium">
                                <li className="flex items-start gap-4">
                                    <MapPin size={18} className="shrink-0" style={{ color: COLORS.orange }} />
                                    <span className="leading-tight" style={{ color: `${COLORS.navy}66` }}>
                                        FPT University<br />FUDA Campus
                                    </span>
                                </li>
                                <li className="flex items-center gap-4">
                                    <Phone size={18} className="shrink-0" style={{ color: COLORS.orange }} />
                                    <span style={{ color: `${COLORS.navy}66` }}>(555) 234-5678</span>
                                </li>
                                <li className="flex items-center gap-4">
                                    <Mail size={18} className="shrink-0" style={{ color: COLORS.orange }} />
                                    <span style={{ color: `${COLORS.navy}66` }}>agmintelligent@gmail.com</span>
                                </li>
                            </ul>

                            <div className="mt-10">
                                <Button
                                    to="/booking"
                                    size="sm"
                                    bg={COLORS.orange}
                                    color={COLORS.navy}
                                    icon={<ArrowRight size={16} />}
                                    style={{ boxShadow: `0 6px 20px ${COLORS.orange}30` }}
                                >
                                    Đặt Lịch Ngay
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Bottom bar */}
                    <div className="border-t pt-10 flex flex-col md:flex-row justify-between items-center gap-6"
                        style={{ borderColor: '#EFF6FF' }}>
                        <p className="text-[11px] font-bold uppercase tracking-[0.1em]"
                            style={{ color: `${COLORS.navy}40` }}>
                            © 2026 AGM Intelligent Service. All rights reserved.
                        </p>
                        <div className="flex divide-x" style={{ borderColor: '#DBEAFE' }}>
                            {['Điều khoản', 'Điều khoản dịch vụ', 'Cài đặt cookie'].map((item, i) => (
                                <a key={i}
                                    href="#"
                                    className="px-5 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors"
                                    style={{ color: `${COLORS.navy}40` }}
                                    onMouseEnter={e => (e.currentTarget.style.color = COLORS.navy)}
                                    onMouseLeave={e => (e.currentTarget.style.color = `${COLORS.navy}40`)}
                                >
                                    {item}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}