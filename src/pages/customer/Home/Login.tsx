import { motion } from 'motion/react';
import { Lock, Eye, EyeOff, ShieldCheck, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import 'react-phone-input-2/lib/style.css';
import * as PhoneInputLib from 'react-phone-input-2';
import { COLORS } from '../../../components/share/Color';
import { Button } from '../../../components/share/Button';
import { useFetchClient } from '../../../hook/useFetchClient';
import { validateLoginField, validateLoginForm, type LoginFormData } from '../../../validate/LoginSchema';
import { AUTH_API_ENDPOINTS } from '../../../constants/customer/authApiEndpoints';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../../store/slices/userSlice';
import { useTranslation } from 'react-i18next';

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
    countryCodeEditable?: boolean;
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
    const [searchParams] = useSearchParams();
    const { fetchPublic } = useFetchClient();
    const dispatch = useDispatch()
    const { i18n } = useTranslation();
    const isVi = i18n.language === 'vi';
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
    const [apiError, setApiError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleLogin = () => {
        window.location.href = AUTH_API_ENDPOINTS.LOGIN_GOOGLE;
    };

    const handleGoogleCallback = () => {
        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');
        const userParam = searchParams.get('user');
        const error = searchParams.get('error');

        if (error) {
            setApiError(isVi ? 'Đăng nhập Google thất bại. Vui lòng thử lại.' : 'Google login failed. Please try again.');
            return;
        }

        if (!accessToken) return;

        window.history.replaceState({}, '', window.location.pathname);

        localStorage.setItem('token', accessToken);
        localStorage.setItem('accessToken', accessToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);

        if (userParam) {
            try {
                const userData = JSON.parse(decodeURIComponent(userParam));
                localStorage.setItem('user', JSON.stringify(userData));
                dispatch(loginSuccess({
                    id: userData.id,
                    fullName: userData.fullName,
                    phoneNumber: userData.phoneNumber,
                    avatar: userData.avatar,
                    role: userData.role,
                }));

                if (userData.role === 'CUSTOMER') navigate('/');
                else if (userData.role === 'ADMIN') navigate('/admin/statistics');
                else if (userData.role === 'RECEPTIONIST') navigate('/reception');
                else if (userData.role === 'TECHNICIAN') navigate('/technician');
                else if (userData.role === 'INVENTORY_MANAGER') navigate('/inventory');
                else navigate('/');
            } catch {
                navigate('/login');
            }
        } else {
            navigate('/');
        }
    };

    useEffect(() => {
        handleGoogleCallback();
    }, [searchParams]);



    const normalizePhone = (raw: string): string => {
        const digits = raw.replace(/\D/g, '');
        return digits;
    };


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
            if (userData) {
                dispatch(loginSuccess({
                    id: userData.id,
                    fullName: userData.fullName,
                    phoneNumber: userData.phoneNumber,
                    avatar: userData.avatar,
                    role: userData.role
                }));
            }
            // --- 5. Điều hướng sang trang Profile ---
            if (userData.role === "CUSTOMER") {
                navigate('/');
            }
            if (userData.role === "ADMIN") {
                navigate('/admin/statistics');
            }
            if (userData.role === "RECEPTIONIST") {
                navigate('/reception');
            }
            if (userData.role === "TECHNICIAN") {
                navigate('/technician');
            }
            if (userData.role === "INVENTORY_MANAGER") {
                navigate('/inventory');
            }
        } catch (err: any) {
            setApiError(err.message || (isVi ? 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.' : 'Login failed. Please check your credentials.'));
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
                        {isVi ? 'Dịch vụ chăm sóc' : 'Professional care'} <br />
                        <span style={{ color: COLORS.orange }}>{isVi ? 'chuyên nghiệp' : 'services'}</span> {isVi ? 'cho xe của bạn.' : 'for your vehicle.'}
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-white/60 text-lg leading-relaxed mb-12"
                    >
                        {isVi
                            ? 'Truy cập bảng điều khiển cá nhân của bạn để quản lý các dịch vụ, theo dõi lịch sử bảo trì và đặt lịch hẹn tiếp theo một cách chính xác.'
                            : 'Access your personal dashboard to manage services, track maintenance history, and schedule your next appointment precisely.'}
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
                            <div className="text-xs text-white/40">{isVi ? 'Được hơn 50.000 chủ xe tin dùng.' : 'Trusted by over 50,000 car owners.'}</div>
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
                            {isVi ? 'Chào mừng trở lại!' : 'Welcome back!'}
                        </h2>
                        <p style={{ color: `${COLORS.navy}80` }}>
                            {isVi ? 'Vui lòng nhập thông tin của bạn để đăng nhập.' : 'Please enter your details to sign in.'}
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
                                {isVi ? 'Số Điện Thoại' : 'Phone Number'}
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
                                    searchPlaceholder={isVi ? 'Tìm quốc gia...' : 'Search country...'}
                                    inputProps={{ name: 'phone' }}
                                    countryCodeEditable={false}
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
                                    {isVi ? 'Mật Khẩu' : 'Password'}
                                </label>
                                <Link
                                    to="/forgot-password"
                                    className="text-xs font-bold transition-colors hover:opacity-70"
                                    style={{ color: `${COLORS.navy}99` }}
                                >
                                    {isVi ? 'Quên mật khẩu?' : 'Forgot password?'}
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

                        <div className="flex items-center gap-3 px-1">
                            <input
                                type="checkbox"
                                id="rememberMe"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 rounded border-blue-100 accent-orange-400"
                            />
                            <label htmlFor="rememberMe" className="text-sm cursor-pointer" style={{ color: `${COLORS.navy}99` }}>
                                {isVi ? 'Ghi nhớ tôi trên thiết bị này' : 'Remember me on this device'}
                            </label>
                        </div>

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
                                    {isVi ? 'Đang đăng nhập...' : 'Logging in...'}
                                </span>
                            ) : (isVi ? 'Đăng nhập' : 'Log In')}
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
                                {isVi ? 'HOẶC TIẾP TỤC VỚI' : 'OR CONTINUE WITH'}
                            </span>
                        </div>

                        <Button
                            size="sm"
                            bg={COLORS.white}
                            color={COLORS.navy}
                            icon={null}
                            className="w-full h-14 justify-center rounded-2xl text-sm font-medium"
                            style={{ border: '1px solid #EFF6FF', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                            onClick={handleGoogleLogin}
                        >
                            <img src="/images/google.png" className="w-5 mr-2" alt="Google" />
                            {isVi ? 'Đăng nhập bằng Google' : 'Sign in with Google'}
                        </Button>
                    </div>

                    <p className="mt-12 text-center text-sm" style={{ color: `${COLORS.navy}80` }}>
                        {isVi ? 'Bạn chưa có tài khoản?' : "Don't have an account?"}{' '}
                        <Link
                            to="/verify-phone"
                            className="font-bold transition-colors hover:opacity-70"
                            style={{ color: COLORS.navy }}
                        >
                            {isVi ? 'Tạo tài khoản' : 'Sign up'}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}