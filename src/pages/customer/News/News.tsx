import { useState } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Calendar, ArrowRight, Clock } from 'lucide-react';
import { COLORS } from '../../../components/share/Color';

interface NewsArticle {
    id: number;
    title: string;
    excerpt: string;
    image: string;
    category: string;
    date: string;
    readTime: string;
}

export default function News() {
    const { t } = useTranslation();

    const CATEGORIES = [
        t('news.categories.all', 'Tất cả'),
        t('news.categories.maintenance', 'Bảo dưỡng'),
        t('news.categories.technology', 'Công nghệ'),
        t('news.categories.tips', 'Mẹo hay'),
    ];
    const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);

    const ARTICLES: (NewsArticle & { categoryKey: string })[] = [
        {
            id: 1,
            title: t(
                'news.articles.ceramic.title',
                'The Science Behind Ceramic Coatings: Why Your Investment Deserves Protection',
            ),
            excerpt: t(
                'news.articles.ceramic.excerpt',
                'Tìm hiểu cơ chế bảo vệ sơn xe bằng lớp phủ ceramic và lý do đây là khoản đầu tư xứng đáng cho chiếc xe của bạn.',
            ),
            image: '/images/The Science Behind Ceramic Coatings_ Why Your Investment Deserves Protection.png',
            category: t('news.categories.tips', 'Mẹo hay'),
            categoryKey: 'tips',
            date: '28/07/2026',
            readTime: t('news.readTime', '{{count}} phút đọc', { count: 5 }),
        },
        {
            id: 2,
            title: t(
                'news.articles.ecu.title',
                'Understanding ECU Tuning: Power Gains Without Compromising Reliability',
            ),
            excerpt: t(
                'news.articles.ecu.excerpt',
                'Giải mã công nghệ tinh chỉnh ECU giúp tăng công suất động cơ mà vẫn đảm bảo độ bền và an toàn vận hành.',
            ),
            image: '/images/Understanding ECU Tuning_ Power Gains Without Compromising Reliability.png',
            category: t('news.categories.technology', 'Công nghệ'),
            categoryKey: 'technology',
            date: '22/07/2026',
            readTime: t('news.readTime', '{{count}} phút đọc', { count: 7 }),
        },
        {
            id: 3,
            title: t(
                'news.articles.winter.title',
                'Winter Storage Guide: Protecting Your Collector Vehicle Through the Cold Months',
            ),
            excerpt: t(
                'news.articles.winter.excerpt',
                'Hướng dẫn bảo quản xe đúng cách trong mùa lạnh để giữ động cơ và nội thất luôn trong tình trạng tốt nhất.',
            ),
            image: '/images/Winter Storage Guide_ Protecting Your Collector Vehicle Through the Cold Months.png',
            category: t('news.categories.maintenance', 'Bảo dưỡng'),
            categoryKey: 'maintenance',
            date: '15/07/2026',
            readTime: t('news.readTime', '{{count}} phút đọc', { count: 4 }),
        },
        {
            id: 4,
            title: t('news.articles.turbo.title', 'Turbocharger Assembly: Bảo trì đúng cách để tối ưu tuổi thọ'),
            excerpt: t(
                'news.articles.turbo.excerpt',
                'Những dấu hiệu cảnh báo turbo gặp vấn đề và lịch bảo trì khuyến nghị từ đội ngũ kỹ thuật AGM.',
            ),
            image: '/images/Turbocharger Assembly.png',
            category: t('news.categories.maintenance', 'Bảo dưỡng'),
            categoryKey: 'maintenance',
            date: '08/07/2026',
            readTime: t('news.readTime', '{{count}} phút đọc', { count: 6 }),
        },
        {
            id: 5,
            title: t('news.articles.diagnostics.title', 'Digital Diagnostics: Chẩn đoán lỗi xe bằng công nghệ số'),
            excerpt: t(
                'news.articles.diagnostics.excerpt',
                'AGM Intelligent ứng dụng công nghệ chẩn đoán số hóa giúp phát hiện lỗi nhanh và chính xác hơn.',
            ),
            image: '/images/Digital Diagnostics.png',
            category: t('news.categories.technology', 'Công nghệ'),
            categoryKey: 'technology',
            date: '01/07/2026',
            readTime: t('news.readTime', '{{count}} phút đọc', { count: 5 }),
        },
        {
            id: 6,
            title: t('news.articles.performance.title', 'Performance Tuning: Nâng cấp hiệu suất an toàn cho xe của bạn'),
            excerpt: t(
                'news.articles.performance.excerpt',
                'Các gói nâng cấp hiệu suất phổ biến và những lưu ý quan trọng trước khi quyết định độ xe.',
            ),
            image: '/images/Performance Tuning.png',
            category: t('news.categories.tips', 'Mẹo hay'),
            categoryKey: 'tips',
            date: '24/06/2026',
            readTime: t('news.readTime', '{{count}} phút đọc', { count: 8 }),
        },
    ];

    const filteredArticles =
        activeCategory === CATEGORIES[0]
            ? ARTICLES
            : ARTICLES.filter((article) => article.category === activeCategory);

    const [featured, ...rest] = filteredArticles;

    return (
        <div className="overflow-hidden text-left">
            {/* ── HERO ─────────────────────────────────────────── */}
            <section
                className="relative min-h-[380px] flex items-end pb-16 overflow-hidden"
                style={{ backgroundColor: COLORS.navy }}
            >
                <div className="absolute inset-0 z-0">
                    <img
                        src="/images/sectionbook.png"
                        alt="Garage"
                        className="w-full h-full object-cover opacity-40"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
                        <h1 className="text-5xl md:text-6xl font-display text-white mb-5 leading-tight">
                            {t('news.heroTitle', 'Tin tức & Kiến thức')}
                        </h1>
                        <p className="text-white/60 max-w-xl text-base leading-relaxed">
                            {t(
                                'news.heroDesc',
                                'Cập nhật kiến thức chăm sóc xe, công nghệ mới và mẹo bảo dưỡng từ đội ngũ chuyên gia AGM Intelligent.',
                            )}
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* ── BỘ LỌC DANH MỤC ──────────────────────────────── */}
            <section className="py-10 bg-white border-b" style={{ borderColor: '#EFF6FF' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap gap-3">
                        {CATEGORIES.map((category) => {
                            const isActive = category === activeCategory;
                            return (
                                <button
                                    key={category}
                                    type="button"
                                    onClick={() => setActiveCategory(category)}
                                    className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                                    style={
                                        isActive
                                            ? { backgroundColor: COLORS.navy, color: COLORS.white }
                                            : { backgroundColor: COLORS.blueLight, color: COLORS.navy }
                                    }
                                >
                                    {category}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── BÀI VIẾT NỔI BẬT ─────────────────────────────── */}
            {featured && (
                <section className="py-16 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                            className="grid grid-cols-1 lg:grid-cols-2 gap-8 rounded-3xl overflow-hidden border"
                            style={{ borderColor: '#EFF6FF' }}
                        >
                            <div className="aspect-[16/10] lg:aspect-auto overflow-hidden">
                                <img
                                    src={featured.image}
                                    alt={featured.title}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="p-8 lg:p-10 flex flex-col justify-center">
                                <span
                                    className="inline-flex w-fit px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest mb-4"
                                    style={{ backgroundColor: `${COLORS.orange}15`, color: COLORS.orange }}
                                >
                                    {featured.category}
                                </span>
                                <h2 className="text-2xl lg:text-3xl font-display mb-4 leading-tight" style={{ color: COLORS.navy }}>
                                    {featured.title}
                                </h2>
                                <p className="text-sm leading-relaxed mb-6" style={{ color: `${COLORS.navy}80` }}>
                                    {featured.excerpt}
                                </p>
                                <div className="flex items-center gap-5 text-xs font-semibold mb-6" style={{ color: `${COLORS.navy}66` }}>
                                    <span className="flex items-center gap-1.5">
                                        <Calendar size={14} />
                                        {featured.date}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Clock size={14} />
                                        {featured.readTime}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-2 w-fit text-sm font-bold transition-colors hover:gap-3"
                                    style={{ color: COLORS.navy }}
                                >
                                    {t('news.readMore', 'Đọc tiếp')}
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </section>
            )}

            {/* ── DANH SÁCH BÀI VIẾT ───────────────────────────── */}
            <section className="py-16" style={{ backgroundColor: '#EDF3FF' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {rest.length === 0 ? (
                        <p className="text-center text-sm font-semibold" style={{ color: `${COLORS.navy}66` }}>
                            {t('news.empty', 'Chưa có bài viết nào trong danh mục này.')}
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {rest.map((article, idx) => (
                                <motion.article
                                    key={article.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: idx * 0.08 }}
                                    whileHover={{ y: -6 }}
                                    className="bg-white rounded-3xl overflow-hidden border transition-shadow hover:shadow-xl group cursor-pointer"
                                    style={{ borderColor: '#EFF6FF' }}
                                >
                                    <div className="aspect-[16/10] overflow-hidden">
                                        <img
                                            src={article.image}
                                            alt={article.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                    </div>
                                    <div className="p-6">
                                        <span
                                            className="inline-flex px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest mb-3"
                                            style={{ backgroundColor: `${COLORS.orange}15`, color: COLORS.orange }}
                                        >
                                            {article.category}
                                        </span>
                                        <h3 className="text-base font-bold mb-2 leading-snug line-clamp-2" style={{ color: COLORS.navy }}>
                                            {article.title}
                                        </h3>
                                        <p className="text-xs leading-relaxed mb-4 line-clamp-2" style={{ color: `${COLORS.navy}80` }}>
                                            {article.excerpt}
                                        </p>
                                        <div className="flex items-center gap-4 text-[11px] font-semibold" style={{ color: `${COLORS.navy}66` }}>
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                {article.date}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {article.readTime}
                                            </span>
                                        </div>
                                    </div>
                                </motion.article>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
