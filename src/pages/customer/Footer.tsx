import { Mail, Phone, MapPin, ArrowRight, Camera, Play, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../components/share/Color';
import { Button } from '../../components/share/Button';

export default function Footer() {
    const { t } = useTranslation();

    const services = [
        { label: t('footer.maintenance', 'Bảo dưỡng'), path: '/services' },
        { label: t('footer.repair', 'Sửa chữa'), path: '/services' },
        { label: t('footer.diagnostics', 'Chẩn đoán'), path: '/services' },
        { label: t('footer.detailing', 'Chăm sóc xe'), path: '/services' },
        { label: t('footer.performance', 'Tối ưu hiệu suất'), path: '/services' }
    ];

    const company = [
        { label: t('footer.aboutUs', 'Về chúng tôi'), href: '#' },
        { label: t('footer.team', 'Đội ngũ'), href: '#' },
        { label: t('footer.careers', 'Tuyển dụng'), href: '#' },
        { label: t('footer.news', 'Tin tức'), href: '#' },
        { label: t('footer.contact', 'Liên hệ'), href: '#' }
    ];

    return (
        <footer className="py-12 md:py-24" style={{ backgroundColor: '#F8FAFC' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-[3rem] p-12 md:p-20 shadow-sm border border-blue-50/80">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-20">

                        {/* Brand */}
                        <div className="lg:col-span-5">
                            <Link to="/" className="flex items-center gap-3 mb-8">
                                <div className="w-11 h-11 p-2 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: COLORS.navy }}>
                                    <img src="/images/logo.png" alt="Logo" className="w-full h-full object-contain" />
                                </div>
                                <span className="text-2xl font-bold font-display tracking-tighter uppercase"
                                    style={{ color: COLORS.navy }}>
                                    AGM INTELLIGENT
                                </span>
                            </Link>

                            <p className="text-sm leading-relaxed mb-10 max-w-sm font-medium"
                                style={{ color: `${COLORS.navy}80` }}>
                                {t('footer.certified', 'Kỹ thuật viên được chứng nhận từ nhà máy, chẩn đoán đạt chuẩn đại lý và dịch vụ chăm sóc khách hàng cao cấp từ năm 2008.')}
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
                                {t('footer.servicesHeader', 'Dịch vụ')}
                            </h4>
                            <ul className="space-y-4 text-sm font-medium">
                                {services.map((item, idx) => (
                                    <li key={idx}>
                                        <Link to={item.path}
                                            style={{ color: `${COLORS.navy}66` }}
                                            onMouseEnter={e => (e.currentTarget.style.color = COLORS.orange)}
                                            onMouseLeave={e => (e.currentTarget.style.color = `${COLORS.navy}66`)}
                                        >
                                            {item.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Công ty */}
                        <div className="lg:col-span-2">
                            <h4 className="font-bold text-sm mb-8 uppercase tracking-[0.1em]"
                                style={{ color: COLORS.navy }}>
                                {t('footer.companyHeader', 'Công ty')}
                            </h4>
                            <ul className="space-y-4 text-sm font-medium">
                                {company.map((item, idx) => (
                                    <li key={idx}>
                                        <a href={item.href}
                                            style={{ color: `${COLORS.navy}66` }}
                                            onMouseEnter={e => (e.currentTarget.style.color = COLORS.orange)}
                                            onMouseLeave={e => (e.currentTarget.style.color = `${COLORS.navy}66`)}
                                        >
                                            {item.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Liên hệ */}
                        <div className="lg:col-span-3">
                            <h4 className="font-bold text-sm mb-8 uppercase tracking-[0.1em]"
                                style={{ color: COLORS.navy }}>
                                {t('footer.contactHeader', 'Liên hệ')}
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
                                    to="/phone-service"
                                    size="sm"
                                    bg={COLORS.orange}
                                    color={COLORS.navy}
                                    icon={<ArrowRight size={16} />}
                                    style={{ boxShadow: `0 6px 20px ${COLORS.orange}30` }}
                                >
                                    {t('nav.booking', 'Đặt lịch ngay')}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Bottom bar */}
                    <div className="border-t pt-10 flex flex-col md:flex-row justify-between items-center gap-6"
                        style={{ borderColor: '#EFF6FF' }}>
                        <p className="text-[11px] font-bold uppercase tracking-[0.1em]"
                            style={{ color: `${COLORS.navy}40` }}>
                            {t('footer.rights', '© 2026 AGM Intelligent Service. All rights reserved.')}
                        </p>
                        <div className="flex divide-x" style={{ borderColor: '#DBEAFE' }}>
                            {[
                                { label: t('settings.terms', 'Điều khoản'), href: '#' },
                                { label: t('footer.termsOfService', 'Điều khoản dịch vụ'), href: '#' },
                                { label: t('footer.cookieSettings', 'Cài đặt cookie'), href: '#' }
                            ].map((item, i) => (
                                <a key={i}
                                    href={item.href}
                                    className="px-5 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors"
                                    style={{ color: `${COLORS.navy}40` }}
                                    onMouseEnter={e => (e.currentTarget.style.color = COLORS.navy)}
                                    onMouseLeave={e => (e.currentTarget.style.color = `${COLORS.navy}40`)}
                                >
                                    {item.label}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}