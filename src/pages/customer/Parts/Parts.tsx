import { useState } from 'react';
import { motion } from 'motion/react';
import {
    Filter, ChevronRight, Check,
    ShieldCheck, Wrench, ShoppingCart
} from 'lucide-react';
import { COLORS } from '../../../components/share/Color';
import { Button } from '../../../components/share/Button';



export default function Parts() {
    const [priceRange, setPriceRange] = useState(10000000);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const products = [
        { id: 1, name: 'Má phanh Ceramic Pro', price: '1.250.000đ', tag: 'Best Seller', desc: 'Độ bền cao, giảm tiếng ồn và bụi phanh, phù hợp cho các dòng xe cao cấp.', image: '/images/AB6AXuA4LBFMSnhknbgkjpKvZ_qJdH77tlON9N7u21dIFCmfZXWAlkT-p5tWUBd5GIBr-DcpL_gz1tM4hjfVV9S6xpNPdKlEaThTGf29cIUuX4Mr7Um3WXjDlOgYHzlV4rIxlojF2v5C5jUukmtDPRzeNRHi-3rkFWTAZoTzFK0wwYpJCoiwclvLUFVvwT3v9AIzWHDq-MEJA_Q-C1Lbct.png' },
        { id: 2, name: 'Lọc dầu Synthetic', price: '350.000đ', tag: undefined, desc: 'Lọc sạch 99% tạp chất, giúp động cơ vận hành êm ái và bền bỉ.', image: '/images/AB6AXuAMNYLW4EURBChXIjVN12Yo-ExH61l1X_m4xOKrWROwoXwCnwHXEvyHAAXZql3XZKD4REmRdhXBrWUIO2KMxleVt9Y_a-ueUU9I2iw-vfm26ahZgq37lugBwaeIGkGRS-nYSB18TjDdt2fIoYCRhGf2-hyenpCjYHfaX6H_cqrZI2wu99sulXhGYZcMLj-wVJrWH8LJ6ia323w5qs.png' },
        { id: 3, name: 'Bugi Iridium High-Performance', price: '450.000đ', tag: undefined, desc: 'Đánh lửa cực mạnh, tiết kiệm nhiên liệu và tăng tốc mượt mà.', image: '/images/AB6AXuBVzy_VYDxmSwYN43hrOqJPUmUclDL2WZjgPOcfT3jzR9_bndwueNwFjoyu4VD2YiKN418NTwTN5SEVKNl5ThfSEdy9qGm64qCzYJg2-8UVOejH8FRE61RDjjfcqlmU5Ge8PDEKJE8VI_O_Zm61DzSNtr6zfN47neFGbFBIhGhmSo0bg1QYUXixjLt1UQrJT3QW3P1YMFbZy1quJX.png' },
        { id: 4, name: 'Giảm xóc Gas-Filled', price: '2.800.000đ', tag: '-15%', desc: 'Cải thiện độ ổn định khi vào cua và mang lại cảm giác lái êm ái.', image: '/images/AB6AXuBhNpw82zCf-1iHmkNvwCnle9gXzU978dvfraGQB__UBthJ5Nwj-mYjwlJo5C1RSkuW87cY6NI5J-3pV95epQnr5o00YxsNeboAPTY1pWHLAcq-fhKxhvTJNQ5IG0eWX_0NlZsrNNE-Py6j8MKoGRVpIcbdMECEKeXdfAgV_tpWoYGcHnXPUvmGjJpSRZ5FLQvOF5WCyV9sQLLQQx.png' },
        { id: 5, name: 'Lọc gió động cơ OEM', price: '280.000đ', tag: undefined, desc: 'Tối ưu lưu lượng khí nạp, bảo vệ động cơ khỏi bụi bẩn và dị vật.', image: '/images/AB6AXuCkuwy1UUpC-i7nhprPFTyaY-Rwu3tAxF_0rTz9f1huI7Sfyd-m5UZGvsVVCJc0E67RiSiOgH12dyFgsXKZGzyhbBU-GPBi6mQyNH69E7wHAaqSbmB35THvWUHgB0bvsWP7QKSjGTAGGsbVoqzlw5wV2jK0TteV3qNgafPhtSkSHTGCFMSm3VncK0op5yZq5XLjtMtl4Th8vWYQYM.png' },
        { id: 6, name: 'Ắc quy khô 70Ah', price: '1.850.000đ', tag: undefined, desc: 'Công nghệ miễn bảo dưỡng, khởi động mạnh mẽ ngay cả khi trời lạnh.', image: '/images/AB6AXuCp-frQqVtq_mR2dF8okADuNvQPhFa18vwl9pW7sO2wC7uwGGHKkpo4uzXZZTULtdMWx56vrXB2PPdLSihwxn6ppBoPMDy-uP-MT7MyASYWaNqqr14jRR3i5xrrLHCrKbCx6TRBkLNN8XC7h0jnYmBMIbtfdKPqmABpImrLkyymT-G5_lgamEoiygkyoSfRu85AD-G9qkovxWFR2Q.png' },
        { id: 7, name: 'Dầu động cơ Synthetic 5W-30', price: '950.000đ', tag: undefined, desc: 'Bảo vệ động cơ tối đa trong mọi điều kiện nhiệt độ khắc nghiệt.', image: '/images/AB6AXuAMNYLW4EURBChXIjVN12Yo-ExH61l1X_m4xOKrWROwoXwCnwHXEvyHAAXZql3XZKD4REmRdhXBrWUIO2KMxleVt9Y_a-ueUU9I2iw-vfm26ahZgq37lugBwaeIGkGRS-nYSB18TjDdt2fIoYCRhGf2-hyenpCjYHfaX6H_cqrZI2wu99sulXhGYZcMLj-wVJrWH8LJ6ia323w5qs.png' },
        { id: 8, name: 'Gạt mưa Silicon cao cấp', price: '250.000đ', tag: undefined, desc: 'Lau sạch nước mưa hoàn hảo, bền bỉ gấp 3 lần gạt cao su thông thường.', image: '/images/AB6AXuBVzy_VYDxmSwYN43hrOqJPUmUclDL2WZjgPOcfT3jzR9_bndwueNwFjoyu4VD2YiKN418NTwTN5SEVKNl5ThfSEdy9qGm64qCzYJg2-8UVOejH8FRE61RDjjfcqlmU5Ge8PDEKJE8VI_O_Zm61DzSNtr6zfN47neFGbFBIhGhmSo0bg1QYUXixjLt1UQrJT3QW3P1YMFbZy1quJX.png' },
        { id: 9, name: 'Nước làm mát tản nhiệt', price: '180.000đ', tag: undefined, desc: 'Giúp hạ nhiệt động cơ nhanh chóng, bảo vệ hệ thống làm mát khỏi ăn mòn.', image: '/images/AB6AXuCkuwy1UUpC-i7nhprPFTyaY-Rwu3tAxF_0rTz9f1huI7Sfyd-m5UZGvsVVCJc0E67RiSiOgH12dyFgsXKZGzyhbBU-GPBi6mQyNH69E7wHAaqSbmB35THvWUHgB0bvsWP7QKSjGTAGGsbVoqzlw5wV2jK0TteV3qNgafPhtSkSHTGCFMSm3VncK0op5yZq5XLjtMtl4Th8vWYQYM.png' },
    ];

    return (
        <div className="min-h-screen pb-24" style={{ backgroundColor: '#F8FAFC' }}>

            {/* ── HEADER ───────────────────────────────────────── */}
            <section className="bg-white pt-12 ">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-4xl md:text-5xl font-display mb-4" style={{ color: COLORS.navy }}>
                        Linh Kiện Chính Hãng
                    </h1>
                    <p className="max-w-2xl leading-relaxed" style={{ color: `${COLORS.navy}99` }}>
                        Nâng tầm hiệu suất và độ an toàn cho xế yêu với hệ thống linh kiện nhập khẩu 100%,
                        bảo hành dài hạn và hỗ trợ lắp đặt chuyên nghiệp.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                        {[
                            { title: '100% Chính Hãng', desc: 'Cam kết chất lượng từ nhà sản xuất', icon: <Check size={20} style={{ color: COLORS.orange }} /> },
                            { title: 'Bảo Hành Dài Hạn', desc: 'An tâm tuyệt đối với chính sách 1 đổi 1', icon: <ShieldCheck size={20} style={{ color: COLORS.orange }} /> },
                            { title: 'Hỗ Trợ Lắp Đặt', desc: 'Miễn phí công thay tại các chi nhánh', icon: <Wrench size={20} style={{ color: COLORS.orange }} /> },
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-6 rounded-2xl border border-blue-50"
                                style={{ backgroundColor: '#F8FAFC' }}>
                                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                                    {item.icon}
                                </div>
                                <div>
                                    <div className="font-bold" style={{ color: COLORS.navy }}>{item.title}</div>
                                    <div className="text-xs" style={{ color: `${COLORS.navy}80` }}>{item.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* ── SIDEBAR ──────────────────────────────────── */}
                    <aside className="w-full lg:w-72 shrink-0">
                        <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-blue-50 sticky top-24">
                            {/* Toggle Header */}
                            <div
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className="flex items-center justify-between cursor-pointer lg:cursor-default"
                                style={{ color: COLORS.navy }}
                            >
                                <div className="flex items-center gap-2">
                                    <Filter size={18} />
                                    <h3 className="font-bold text-base md:text-lg">Bộ lọc</h3>
                                </div>
                                <span className="lg:hidden text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg hover:bg-slate-200 transition-colors">
                                    {isFilterOpen ? 'Thu gọn' : 'Mở rộng'}
                                </span>
                            </div>

                            {/* Collapsible Content */}
                            <div className={`${isFilterOpen ? 'block' : 'hidden'} lg:block mt-6 md:mt-8`}>
                                {/* Loại xe */}
                                <div className="mb-5 md:mb-10">
                                    <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2 md:mb-4 block"
                                        style={{ color: `${COLORS.navy}66` }}>Loại xe</label>
                                    <select className="w-full bg-[#F8FAFC] border-none rounded-xl p-3 text-sm outline-none font-medium"
                                        style={{ color: COLORS.navy }}>
                                        <option>Tất cả loại xe</option>
                                        <option>SUV / Crossover</option>
                                        <option>Sedan / Coupe</option>
                                        <option>Xe thể thao</option>
                                    </select>
                                </div>

                                {/* Thương hiệu */}
                                <div className="mb-5 md:mb-10">
                                    <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2 md:mb-4 block"
                                        style={{ color: `${COLORS.navy}66` }}>Thương hiệu</label>
                                    <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-col lg:space-y-3">
                                        {['Toyota', 'Honda', 'BMW', 'Mercedes-Benz', 'Audi'].map((brand) => (
                                            <label key={brand} className="flex items-center gap-2 lg:gap-3 group cursor-pointer">
                                                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 accent-[#0A2357]" />
                                                <span className="text-xs lg:text-sm transition-colors font-medium" style={{ color: `${COLORS.navy}B3` }}>
                                                    {brand}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Khoảng giá */}
                                <div className="mb-6 md:mb-10">
                                    <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2 md:mb-4 block"
                                        style={{ color: `${COLORS.navy}66` }}>Khoảng giá (VNĐ)</label>
                                    <input
                                        type="range" min="0" max="50000000" step="500000"
                                        value={priceRange}
                                        onChange={(e) => setPriceRange(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0A2357]"
                                    />
                                    <div className="flex justify-between mt-3 text-[10px] md:text-xs font-mono" style={{ color: `${COLORS.navy}80` }}>
                                        <span>0đ</span>
                                        <span>{new Intl.NumberFormat('vi-VN').format(priceRange)}đ+</span>
                                    </div>
                                </div>

                                {/* ── Áp dụng — Button tái sử dụng ── */}
                                <Button
                                    size="sm"
                                    icon={null}
                                    bg={COLORS.navy}
                                    color={COLORS.white}
                                    className="w-full justify-center rounded-xl"
                                    style={{ boxShadow: `0 4px 16px ${COLORS.navy}1A` }}
                                >
                                    Áp dụng bộ lọc
                                </Button>
                            </div>
                        </div>
                    </aside>

                    {/* ── PRODUCT GRID ─────────────────────────────── */}
                    <main className="flex-grow">
                        {/* Toolbar */}
                        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-blue-50">
                            <div className="text-sm" style={{ color: `${COLORS.navy}99` }}>
                                Hiển thị <span className="font-bold" style={{ color: COLORS.navy }}>24</span> sản phẩm
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm" style={{ color: `${COLORS.navy}80` }}>Sắp xếp:</span>
                                <select className="bg-transparent border-none text-sm font-bold outline-none cursor-pointer"
                                    style={{ color: COLORS.navy }}>
                                    <option>Phổ biến nhất</option>
                                    <option>Giá: Thấp đến Cao</option>
                                    <option>Giá: Cao đến Thấp</option>
                                    <option>Mới nhất</option>
                                </select>
                            </div>
                        </div>

                        {/* Cards */}
                        <div className="grid grid-cols-3 md:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-6">
                            {products.map((product) => (
                                <motion.div
                                    key={product.id}
                                    whileHover={{ y: -5 }}
                                    className="bg-white rounded-xl md:rounded-3xl overflow-hidden shadow-sm border border-blue-50 group flex flex-col cursor-pointer"
                                >
                                    <div className="relative aspect-square md:aspect-[4/3] overflow-hidden">
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                        {product.tag && (
                                            <div className="absolute top-1 left-1 md:top-4 md:left-4 inline-flex px-1.5 py-0.5 md:px-3 md:py-1 text-[6px] md:text-[10px] font-bold uppercase tracking-widest rounded-sm md:rounded-lg"
                                                style={{ backgroundColor: COLORS.orange, color: COLORS.navy }}>
                                                {product.tag}
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-2 md:p-8 flex-grow flex flex-col justify-between">
                                        <div>
                                            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-start gap-1 md:gap-4 mb-1 md:mb-3">
                                                <h4 className="font-bold text-[9px] md:text-base leading-tight transition-colors group-hover:opacity-70 line-clamp-1 md:line-clamp-none"
                                                    style={{ color: COLORS.navy }}>
                                                    {product.name}
                                                </h4>
                                                <div className="text-left md:text-right shrink-0">
                                                    <div className="font-bold text-[9px] md:text-lg font-display" style={{ color: COLORS.orange }}>
                                                        {product.price}
                                                    </div>
                                                    <div className="text-[6px] md:text-[10px] uppercase font-mono hidden md:block" style={{ color: `${COLORS.navy}66` }}>
                                                        Bao gồm VAT
                                                    </div>
                                                </div>
                                            </div>

                                            <p className="hidden md:block text-sm mb-8 line-clamp-3 leading-relaxed" style={{ color: `${COLORS.navy}99` }}>
                                                {product.desc}
                                            </p>
                                        </div>

                                        {/* ── Buy Now — Button tái sử dụng ── */}
                                        <Button
                                            size="sm"
                                            bg={COLORS.orange}
                                            color={COLORS.navy}
                                            icon={<ShoppingCart size={10} className="md:w-[18px] md:h-[18px]" />}
                                            className="w-full justify-center rounded-lg md:rounded-2xl h-6 md:h-14 text-[8px] md:text-sm"
                                        >
                                            <span className="hidden md:inline">Buy Now</span>
                                        </Button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* ── PAGINATION ── */}
                        <div className="mt-16 flex justify-center items-center gap-2">
                            {/* Prev */}
                            <Button size="sm" icon={null} bg={COLORS.white} color={COLORS.navy}
                                className="w-10 h-10 justify-center rounded-xl p-0"
                                style={{ border: '1px solid #DBEAFE' }}>
                                <ChevronRight size={18} className="rotate-180" />
                            </Button>

                            {/* Page 1 — active */}
                            <Button size="sm" icon={null} bg={COLORS.navy} color={COLORS.white}
                                className="w-10 h-10 justify-center rounded-xl p-0 text-sm font-bold">
                                1
                            </Button>

                            {/* Page 2 */}
                            <Button size="sm" icon={null} bg={COLORS.white} color={COLORS.navy}
                                className="w-10 h-10 justify-center rounded-xl p-0 text-sm font-bold"
                                style={{ border: '1px solid #DBEAFE' }}>
                                2
                            </Button>

                            {/* Page 3 */}
                            <Button size="sm" icon={null} bg={COLORS.white} color={COLORS.navy}
                                className="w-10 h-10 justify-center rounded-xl p-0 text-sm font-bold"
                                style={{ border: '1px solid #DBEAFE' }}>
                                3
                            </Button>

                            <span className="px-2" style={{ color: `${COLORS.navy}66` }}>...</span>

                            {/* Next */}
                            <Button size="sm" icon={null} bg={COLORS.white} color={COLORS.navy}
                                className="w-10 h-10 justify-center rounded-xl p-0"
                                style={{ border: '1px solid #DBEAFE' }}>
                                <ChevronRight size={18} />
                            </Button>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}