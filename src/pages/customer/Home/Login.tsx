import { motion } from 'motion/react';
import { Lock, Eye, EyeOff, ShieldCheck, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import 'react-phone-input-2/lib/style.css';
import * as PhoneInputLib from 'react-phone-input-2';
import { COLORS } from '../../../components/share/Color';
import { Button } from '../../../components/share/Button';
import { useFetchClient } from '../../../hook/useFetchClient';
import { validateLoginField, validateLoginForm, type LoginFormData } from '../../../validate/LoginSchema';
import { AUTH_API_ENDPOINTS } from '../../../constants/customer/authApiEndpoints';

// ── resolve PhoneInput default export ─────────────────────────
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
    country?: string;
    value?: string;
    onChange?: (value: string) => void;
    onBlur?: () => void;
    enableSearch?: boolean;
    searchPlaceholder?: string;
    inputProps?: { name?: string };
};
const PhoneInput = resolveDefault<React.ComponentType<PhoneInputProps>>(PhoneInputLib);

// ── PhoneInput styles ──────────────────────────────────────────
const phoneStyles = `
    .login-phone .react-tel-input .form-control {
        width: 100% !important;
        height: 56px !important;
        background: white !important;
        border: 1px solid #EFF6FF !important;
        border-radius: 1rem !important;
        padding: 0 20px 0 58px !important;
        font-size: 14px !important;
        color: ${COLORS.navy} !important;
        letter-spacing: 0.3px !important;
        outline: none !important;
        transition: all 0.2s !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04) !important;
    }
    .login-phone .react-tel-input .form-control:focus {
        border-color: ${COLORS.orange} !important;
        box-shadow: 0 0 0 4px ${COLORS.orange}18 !important;
    }
    .login-phone .react-tel-input .form-control::placeholder {
        color: ${COLORS.navy}40 !important;
    }
    .login-phone .react-tel-input .flag-dropdown {
        background: white !important;
        border: 1px solid #EFF6FF !important;
        border-right: none !important;
        border-radius: 1rem 0 0 1rem !important;
    }
    .login-phone .react-tel-input .flag-dropdown:hover,
    .login-phone .react-tel-input .flag-dropdown.open {
        background: #F8FAFC !important;
        border-color: ${COLORS.orange}80 !important;
    }
    .login-phone .react-tel-input .selected-flag {
        background: transparent !important;
        padding: 0 8px 0 14px !important;
        border-radius: 1rem 0 0 1rem !important;
    }
    .login-phone .react-tel-input .country-list {
        background: white !important;
        border: 1px solid #EFF6FF !important;
        border-radius: 0.75rem !important;
        box-shadow: 0 8px 32px rgba(5,11,24,0.12) !important;
        max-height: 220px !important;
        margin-top: 4px !important;
    }
    .login-phone .react-tel-input .country-list .country {
        color: ${COLORS.navy}CC !important;
        font-size: 13px !important;
        padding: 8px 14px !important;
    }
    .login-phone .react-tel-input .country-list .country:hover,
    .login-phone .react-tel-input .country-list .country.highlight {
        background: ${COLORS.orange}14 !important;
        color: ${COLORS.orange} !important;
    }
    .login-phone .react-tel-input .country-list .search {
        background: #F8FAFC !important;
        padding: 8px !important;
    }
    .login-phone .react-tel-input .search-box {
        background: white !important;
        border: 1px solid #EFF6FF !important;
        border-radius: 0.5rem !important;
        color: ${COLORS.navy} !important;
        font-size: 13px !important;
        padding: 7px 12px !important;
        width: 100% !important;
        outline: none !important;
    }
    .login-phone .react-tel-input .country-list .divider {
        border-color: #EFF6FF !important;
    }
    .login-phone .react-tel-input .dial-code {
        color: ${COLORS.navy}60 !important;
    }
    .login-phone .react-tel-input .form-control.input-error {
        border-color: #EF4444 !important;
        box-shadow: 0 0 0 4px rgba(239,68,68,0.1) !important;
    }
`;

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function Login() {
    const navigate = useNavigate();
    const { fetchPublic } = useFetchClient();

    // Form state
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // UI state
    const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
    const [apiError, setApiError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // ── Helpers ──────────────────────────────────────────────
    const normalizePhone = (raw: string): string => {
        const digits = raw.replace(/\D/g, '');
        if (digits.startsWith('840') && digits.length === 12) return digits.slice(2);
        if (digits.startsWith('84') && digits.length === 11) return '0' + digits.slice(2);
        if (digits.startsWith('0') && digits.length === 10) return digits;
        return digits;
    };

    // ── Validate khi blur từng field ─────────────────────────
    const handlePhoneBlur = () => {
        const msg = validateLoginField('phone', normalizePhone(phone));
        setErrors((prev) => ({ ...prev, phone: msg }));
    };

    const handlePasswordBlur = () => {
        const msg = validateLoginField('password', password);
        setErrors((prev) => ({ ...prev, password: msg }));
    };

    // ── Submit ───────────────────────────────────────────────
    const handleLogin = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        setApiError(null);

        const formData: LoginFormData = {
            phone: normalizePhone(phone),
            password,
        };

        // --- 1. Validate toàn bộ form ---
        const validationErrors = validateLoginForm(formData);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setErrors({});

        // --- 2. Gọi API ---
        try {
            setIsLoading(true);

            const res = await fetchPublic(
                AUTH_API_ENDPOINTS.LOGIN,
                'POST',
                { phone: formData.phone, password: formData.password },
            );

            // --- 3. Bóc tách chính xác dữ liệu theo Shape mới của Backend ---
            // Tùy thuộc vào FetchClient của bạn có bọc dữ liệu trong một key `.data` hay không:
            const apiData = res?.data ? res.data : res;

            const accessToken: string = apiData?.accessToken;
            const refreshToken: string = apiData?.refreshToken;
            const userData = apiData?.user;

            if (!accessToken) throw new Error('Không nhận được mã xác thực (Token) từ hệ thống.');

            // --- 4. Lưu Token & Thông tin User vào Storage ---
            const storage = rememberMe ? localStorage : sessionStorage;

            // Luôn khuyến khích đồng bộ accessToken vào localStorage nếu useFetchClient chỉ đọc từ đó
            localStorage.setItem('token', accessToken);
            storage.setItem('accessToken', accessToken);

            if (refreshToken) {
                storage.setItem('refreshToken', refreshToken);
            }
            if (userData) {
                storage.setItem('user', JSON.stringify(userData));
            }

            // --- 5. Điều hướng sang trang Profile ---
            navigate('/userprofile');

        } catch (err: any) {
            setApiError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
        } finally {
            setIsLoading(false);
        }
    };

    const inputClass = 'w-full h-14 bg-white border border-blue-50 rounded-2xl text-sm outline-none transition-all shadow-sm';
    const inputErrorClass = 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100';

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-stretch">
            <style>{phoneStyles}</style>

            {/* ── LEFT DECORATION ─────────────────────────────── */}
            <div
                className="hidden lg:flex w-1/2 relative overflow-hidden items-center justify-center p-20"
                style={{ backgroundColor: COLORS.navy }}
            >
                <div className="absolute inset-0 z-0">
                    <img
                        src="/images/div.w-full.png"
                        alt="Dashboard"
                        className="w-full h-full object-cover opacity-30 grayscale"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-[#050B18] via-[#050B18CC] to-transparent" />
                </div>

                <div className="relative z-10 text-white max-w-lg">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-white/10 backdrop-blur-md p-2 rounded-xl inline-flex mb-8"
                    >
                        <ShieldCheck style={{ color: COLORS.orange }} />
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-6xl font-display leading-[1.1] mb-8"
                    >
                        Dịch vụ chăm sóc <br />
                        <span style={{ color: COLORS.orange }}>chuyên nghiệp</span> cho xe của bạn.
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-white/60 text-lg leading-relaxed mb-12"
                    >
                        Truy cập bảng điều khiển cá nhân của bạn để quản lý các dịch vụ,
                        theo dõi lịch sử bảo trì và đặt lịch hẹn tiếp theo một cách chính xác.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="flex -space-x-3">
                                {['/images/binh.jpg', '/images/manh.jpg', '/images/ngan.jpg', '/images/son.jpg'].map((src, i) => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 overflow-hidden"
                                        style={{ borderColor: COLORS.navy }}>
                                        <img src={src} alt="User" className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                            <div className="text-xs text-white/40">Được hơn 50.000 chủ xe tin dùng.</div>
                        </div>
                        <div className="flex gap-1" style={{ color: COLORS.orange }}>
                            {[1, 2, 3, 4, 5].map(i => <ShieldCheck key={i} size={14} fill="currentColor" />)}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* ── RIGHT LOGIN FORM ─────────────────────────────── */}
            <div
                className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-20"
                style={{ backgroundColor: '#F8FAFC' }}
            >
                <div className="w-full max-w-md">
                    <div className="mb-12 text-center lg:text-left">
                        <h2 className="text-4xl font-display mb-4" style={{ color: COLORS.navy }}>
                            Chào mừng trở lại!
                        </h2>
                        <p style={{ color: `${COLORS.navy}80` }}>
                            Vui lòng nhập thông tin của bạn để đăng nhập.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6" noValidate>

                        {/* ── API Error Banner ── */}
                        {apiError && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium"
                            >
                                {apiError}
                            </motion.div>
                        )}

                        {/* ── SỐ ĐIỆN THOẠI ── */}
                        <div>
                            <label
                                className="block text-[11px] font-bold uppercase tracking-widest mb-2 px-1"
                                style={{ color: `${COLORS.navy}66` }}
                            >
                                Số Điện Thoại
                            </label>
                            <div className={`login-phone ${errors.phone ? 'phone-error' : ''}`}>
                                <PhoneInput
                                    country="vn"
                                    value={phone}
                                    onChange={(val) => {
                                        setPhone(val);
                                        if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                                    }}
                                    onBlur={handlePhoneBlur}
                                    enableSearch
                                    searchPlaceholder="Tìm quốc gia..."
                                    inputProps={{ name: 'phone' }}
                                />
                            </div>
                            {errors.phone && (
                                <p className="mt-1.5 px-1 text-xs text-red-500 font-medium">{errors.phone}</p>
                            )}
                        </div>

                        {/* ── MẬT KHẨU ── */}
                        <div>
                            <div className="flex justify-between items-center mb-2 px-1">
                                <label
                                    className="block text-[11px] font-bold uppercase tracking-widest"
                                    style={{ color: `${COLORS.navy}66` }}
                                >
                                    Mật Khẩu
                                </label>
                                <Link
                                    to="/forgot-password"
                                    className="text-xs font-bold transition-colors hover:opacity-70"
                                    style={{ color: `${COLORS.navy}99` }}
                                >
                                    Quên mật khẩu?
                                </Link>
                            </div>
                            <div className="relative">
                                <div
                                    className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"
                                    style={{ color: `${COLORS.navy}4D` }}
                                >
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                                    }}
                                    onBlur={handlePasswordBlur}
                                    className={`${inputClass} pl-12 pr-12 ${errors.password ? inputErrorClass : 'focus:border-orange-400 focus:ring-2 focus:ring-orange-50'}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-5 flex items-center transition-colors hover:opacity-70"
                                    style={{ color: `${COLORS.navy}4D` }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="mt-1.5 px-1 text-xs text-red-500 font-medium">{errors.password}</p>
                            )}
                        </div>

                        {/* ── Remember me ── */}
                        <div className="flex items-center gap-3 px-1">
                            <input
                                type="checkbox"
                                id="rememberMe"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 rounded border-blue-100 accent-orange-400"
                            />
                            <label htmlFor="rememberMe" className="text-sm cursor-pointer" style={{ color: `${COLORS.navy}99` }}>
                                Ghi nhớ tôi trên thiết bị này
                            </label>
                        </div>

                        {/* ── Submit Button ── */}
                        <Button
                            size="md"
                            bg={COLORS.orange}
                            color={COLORS.navy}
                            icon={isLoading ? undefined : <ChevronRight size={18} />}
                            className="w-full justify-center rounded-2xl mt-8"
                            style={{ boxShadow: '0 8px 24px rgba(120,53,15,0.1)', opacity: isLoading ? 0.7 : 1 }}
                            onClick={handleLogin}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    Đang đăng nhập...
                                </span>
                            ) : 'Đăng nhập'}
                        </Button>
                    </form>

                    {/* OR divider */}
                    <div className="mt-12">
                        <div className="relative flex items-center justify-center mb-10">
                            <div className="absolute inset-0 flex items-center px-4">
                                <div className="w-full border-t border-blue-100" />
                            </div>
                            <span
                                className="relative z-10 bg-[#F8FAFC] px-4 text-[10px] font-bold uppercase tracking-widest"
                                style={{ color: `${COLORS.navy}4D` }}
                            >
                                OR CONTINUE WITH
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Google', img: '/images/google.png' },
                                { label: 'Zalo', img: '/images/zalo.png' },
                            ].map((social) => (
                                <Button
                                    key={social.label}
                                    size="sm"
                                    bg={COLORS.white}
                                    color={COLORS.navy}
                                    icon={null}
                                    className="h-14 justify-center rounded-2xl text-sm font-medium"
                                    style={{ border: '1px solid #EFF6FF', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                                >
                                    <img src={social.img} className="w-5 mr-2" alt={social.label} />
                                    {social.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <p className="mt-12 text-center text-sm" style={{ color: `${COLORS.navy}80` }}>
                        Bạn chưa có tài khoản?{' '}
                        <Link
                            to="/signup"
                            className="font-bold transition-colors hover:opacity-70"
                            style={{ color: COLORS.navy }}
                        >
                            Tạo tài khoản
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}