import { motion } from 'motion/react';
import { Lock, User, ShieldCheck, ChevronRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import 'react-phone-input-2/lib/style.css';
import * as PhoneInputLib from 'react-phone-input-2';
import { COLORS } from '../../../components/share/Color';
import { Button } from '../../../components/share/Button';



// ── resolve PhoneInput (same pattern as Login) ─────────────────
type Mod = { default?: unknown };
function resolveDefault<T>(mod: unknown): T {
    const m = mod as Mod;
    if (m && typeof m === 'object' && 'default' in m) {
        const d = m.default as unknown;
        if (d && typeof d === 'object' && 'default' in (d as Mod)) return (d as Mod).default as T;
        return d as T;
    }
    return mod as T;
}
type PhoneInputProps = {
    country?: string; value?: string;
    onChange?: (v: string) => void;
    enableSearch?: boolean; searchPlaceholder?: string;
    inputProps?: { name?: string };
};
const PhoneInput = resolveDefault<React.ComponentType<PhoneInputProps>>(PhoneInputLib);

const phoneStyles = `
    .signup-phone .react-tel-input .form-control {
        width: 100% !important; height: 56px !important;
        background: white !important;
        border: 1px solid #EFF6FF !important;
        border-radius: 0.875rem !important;
        padding: 0 20px 0 62px !important;
        font-size: 14px !important;
        color: ${COLORS.navy} !important;
        outline: none !important; transition: all 0.2s !important;
        box-shadow: 0 1px 2px rgba(0,0,0,0.04) !important;
    }
    .signup-phone .react-tel-input .form-control:focus {
        border-color: ${COLORS.orange} !important;
        box-shadow: 0 0 0 4px ${COLORS.orange}18 !important;
    }
    .signup-phone .react-tel-input .form-control::placeholder { color: ${COLORS.navy}50 !important; }
    .signup-phone .react-tel-input .flag-dropdown {
        background: transparent !important;
        border: 1px solid #EFF6FF !important;
        border-right: none !important;
        border-radius: 0.875rem 0 0 0.875rem !important;
    }
    .signup-phone .react-tel-input .flag-dropdown:hover,
    .signup-phone .react-tel-input .flag-dropdown.open {
        background: rgba(249,161,27,0.06) !important;
        border-color: ${COLORS.orange}80 !important;
    }
    .signup-phone .react-tel-input .selected-flag { background: transparent !important; padding: 0 8px 0 14px !important; border-radius: 0.875rem 0 0 0.875rem !important; }
    .signup-phone .react-tel-input .country-list {
        background: white !important; border: 1px solid #EFF6FF !important;
        border-radius: 0.75rem !important; box-shadow: 0 12px 40px rgba(5,11,24,0.15) !important;
        max-height: 220px !important; margin-top: 6px !important;
    }
    .signup-phone .react-tel-input .country-list .country { color: ${COLORS.navy}CC !important; font-size: 13px !important; padding: 8px 14px !important; }
    .signup-phone .react-tel-input .country-list .country:hover,
    .signup-phone .react-tel-input .country-list .country.highlight { background: ${COLORS.orange}14 !important; color: ${COLORS.orange} !important; }
    .signup-phone .react-tel-input .country-list .search { background: #F8FAFC !important; padding: 8px !important; }
    .signup-phone .react-tel-input .country-list .search-box {
        background: white !important; border: 1px solid #EFF6FF !important; border-radius: 0.5rem !important;
        color: ${COLORS.navy} !important; font-size: 13px !important; padding: 7px 12px !important;
        width: 100% !important; outline: none !important;
    }
    .signup-phone .react-tel-input .country-list .divider { border-color: #EFF6FF !important; }
    .signup-phone .react-tel-input .dial-code { color: ${COLORS.navy}60 !important; }
`;

const inputClass =
    'w-full h-14 bg-white border border-blue-50 rounded-2xl text-sm outline-none transition-all shadow-sm focus:ring-4 focus:border-brand-orange';

export default function Signup() {
    const [phone, setPhone] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-stretch">
            <style>{phoneStyles}</style>

            {/* ── LEFT ──────────────────────────────────────────── */}
            <div
                className="hidden lg:flex w-[40%] relative overflow-hidden items-center justify-center p-16"
                style={{ backgroundColor: COLORS.navy }}
            >
                <div className="absolute inset-0 z-0">
                    <img
                        src="/images/div.w-full.png"
                        alt="bg"
                        className="w-full h-full object-cover opacity-20"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050B18] via-[#050B18CC] to-transparent" />
                </div>

                <div className="relative z-10 text-white max-w-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-2 rounded-xl inline-flex mb-6"
                        style={{ backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}
                    >
                        <ShieldCheck style={{ color: COLORS.orange }} />
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl font-display leading-[1.1] mb-6"
                    >
                        AGM <br />
                        <span style={{ color: COLORS.orange }}>Intelligent</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-white/50 text-sm leading-relaxed mb-10"
                    >
                        Trải nghiệm thế hệ chăm sóc xe hơi tiếp theo. Chính xác, minh bạch và động lực trong tầm tay bạn.
                    </motion.p>

                    <div className="space-y-5">
                        {[
                            'Chẩn đoán bởi chuyên gia nhà máy',
                            'Cập nhật trạng thái thời gian thực',
                            'Sử dụng phụ tùng chính hãng 100%',
                        ].map((text, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + i * 0.1 }}
                                className="flex items-center gap-4"
                            >
                                <div className="p-1.5 rounded-full" style={{ backgroundColor: `${COLORS.orange}22` }}>
                                    <CheckCircle2 size={16} style={{ color: COLORS.orange }} />
                                </div>
                                <span className="text-sm text-white/80 font-medium">{text}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── RIGHT ─────────────────────────────────────────── */}
            <div
                className="w-full lg:w-[60%] flex items-center justify-center px-8 py-12 md:px-20"
                style={{ backgroundColor: '#F4F7FF' }}
            >
                <div className="w-full max-w-lg">
                    {/* Header */}
                    <div className="mb-10 text-center lg:text-left">
                        <p
                            className="text-xs font-bold uppercase tracking-[0.2em] mb-3"
                            style={{ color: COLORS.orange }}
                        >
                            AGM INTELLIGENT — PORTAL
                        </p>
                        <h2 className="text-5xl font-display mb-3" style={{ color: COLORS.navy }}>
                            Tạo Tài Khoản
                        </h2>
                        <p className="text-sm leading-relaxed" style={{ color: `${COLORS.navy}70` }}>
                            Hãy tham gia cùng hàng ngàn chủ xe tin tưởng vào dịch vụ của chúng tôi.
                        </p>
                    </div>

                    {/* Card */}
                    <div className="bg-white rounded-3xl p-10 shadow-xl shadow-blue-900/8 border border-blue-50/80">
                        <form className="space-y-6">

                            {/* Họ và tên */}
                            <div>
                                <label
                                    className="block text-[11px] font-bold uppercase tracking-widest mb-2.5"
                                    style={{ color: `${COLORS.navy}55` }}
                                >
                                    Họ Và Tên
                                </label>
                                <div className="relative">
                                    <div
                                        className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"
                                        style={{ color: `${COLORS.navy}35` }}
                                    >
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Trần Lượng Tâm"
                                        className={`${inputClass} pl-12`}
                                    />
                                </div>
                            </div>

                            {/* Email + Phone */}
                            <div className="grid  gap-5">
                                <div className="md:col-span-2">
                                    <label
                                        className="block text-[11px] font-bold uppercase tracking-widest mb-2.5"
                                        style={{ color: `${COLORS.navy}55` }}
                                    >
                                        Số Điện Thoại
                                    </label>
                                    <div className="signup-phone">
                                        <PhoneInput
                                            country="vn"
                                            value={phone}
                                            onChange={setPhone}
                                            enableSearch
                                            searchPlaceholder="Tìm quốc gia..."
                                            inputProps={{ name: 'phone' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Mật khẩu + Xác nhận */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label
                                        className="block text-[11px] font-bold uppercase tracking-widest mb-2.5"
                                        style={{ color: `${COLORS.navy}55` }}
                                    >
                                        Mật Khẩu
                                    </label>
                                    <div className="relative">
                                        <div
                                            className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"
                                            style={{ color: `${COLORS.navy}35` }}
                                        >
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            className={`${inputClass} pl-12 pr-12`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-5 flex items-center transition-opacity hover:opacity-60"
                                            style={{ color: `${COLORS.navy}40` }}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label
                                        className="block text-[11px] font-bold uppercase tracking-widest mb-2.5"
                                        style={{ color: `${COLORS.navy}55` }}
                                    >
                                        Xác Nhận Mật Khẩu
                                    </label>
                                    <div className="relative">
                                        <div
                                            className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"
                                            style={{ color: `${COLORS.navy}35` }}
                                        >
                                            <ShieldCheck size={18} />
                                        </div>
                                        <input
                                            type={showConfirm ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            className={`${inputClass} pl-12 pr-12`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            className="absolute inset-y-0 right-0 pr-5 flex items-center transition-opacity hover:opacity-60"
                                            style={{ color: `${COLORS.navy}40` }}
                                        >
                                            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Checkbox */}
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    className="mt-0.5 w-4 h-4 rounded border-blue-100 accent-orange-400"
                                />
                                <p className="text-sm leading-relaxed" style={{ color: `${COLORS.navy}70` }}>
                                    Tôi đồng ý với các{' '}
                                    <Link to="#" className="font-bold" style={{ color: COLORS.navy }}>Điều khoản</Link>{' '}và{' '}
                                    <Link to="#" className="font-bold" style={{ color: COLORS.navy }}>Chính sách bảo mật</Link>
                                </p>
                            </div>

                            {/* Submit */}
                            <Button
                                size="md"
                                bg={COLORS.orange}
                                color={COLORS.navy}
                                icon={<ChevronRight size={18} />}
                                className="w-full justify-center rounded-2xl"
                                style={{ boxShadow: `0 8px 28px ${COLORS.orange}35`, marginTop: '0.5rem' }}
                            >
                                Đăng Ký
                            </Button>
                        </form>
                    </div>

                    <p className="mt-7 text-center text-sm" style={{ color: `${COLORS.navy}70` }}>
                        Đã có tài khoản?{' '}
                        <Link
                            to="/login"
                            className="font-bold hover:opacity-70 transition-opacity"
                            style={{ color: COLORS.navy }}
                        >
                            Đăng Nhập
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}