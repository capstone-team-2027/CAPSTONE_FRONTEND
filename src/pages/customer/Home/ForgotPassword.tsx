import { motion } from 'motion/react';
import { ShieldAlert, ChevronLeft, Send, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef, useMemo } from 'react';
import 'react-phone-input-2/lib/style.css';
import * as PhoneInputLib from 'react-phone-input-2';
import { COLORS } from '../../../components/share/Color';
import { Button } from '../../../components/share/Button';
import { useFetchClient } from '../../../hook/useFetchClient';
import { AUTH_API_ENDPOINTS } from '../../../constants/customer/authApiEndpoints';
import {
    sendOtp,
    verifyOtp,
    getConfirmation,
    setConfirmation,
    initRecaptcha,
    clearRecaptcha,
} from '../../../services/firebaseOtp';

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

// OTP input style
const otpInputClass =
    "bg-white border-2 border-slate-400 rounded-2xl text-sm outline-none transition-all shadow-sm focus:ring-4 focus:border-brand-orange text-center text-lg font-bold tracking-wide";

type OtpInputProps = {
    length?: number;
    value: string;
    onChange: (nextValue: string) => void;
};

function OtpInput({ length = 6, value, onChange }: OtpInputProps) {
    const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

    const otpDigits = useMemo(() => {
        const normalized = (value || "").replace(/\D/g, "").slice(0, length);
        return normalized.padEnd(length, "").split("");
    }, [value, length]);

    const focusIndex = (index: number) => {
        const el = inputsRef.current[index];
        if (el) el.focus();
    };

    const setOtpFromDigits = (digits: string[]) => {
        onChange(digits.join("").slice(0, length));
    };

    const handleChange = (
        index: number,
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const raw = e.target.value || "";
        const digitsOnly = raw.replace(/\D/g, "");

        if (digitsOnly.length > 1) {
            const nextDigits = [...otpDigits];
            for (let i = 0; i < digitsOnly.length; i += 1) {
                const pos = index + i;
                if (pos >= length) break;
                nextDigits[pos] = digitsOnly[i];
            }
            setOtpFromDigits(nextDigits);
            focusIndex(Math.min(index + digitsOnly.length, length - 1));
            return;
        }

        const digit = digitsOnly.slice(-1) || "";
        const nextDigits = [...otpDigits];
        nextDigits[index] = digit;
        setOtpFromDigits(nextDigits);

        if (digit) focusIndex(Math.min(index + 1, length - 1));
    };

    const handleKeyDown = (
        index: number,
        e: React.KeyboardEvent<HTMLInputElement>,
    ) => {
        if (e.key === "Backspace") {
            e.preventDefault();

            if (otpDigits[index]) {
                const nextDigits = [...otpDigits];
                nextDigits[index] = "";
                setOtpFromDigits(nextDigits);
                return;
            }

            const prevIndex = Math.max(index - 1, 0);
            const nextDigits = [...otpDigits];
            nextDigits[prevIndex] = "";
            setOtpFromDigits(nextDigits);
            focusIndex(prevIndex);
            return;
        }

        if (e.key === "ArrowLeft") {
            e.preventDefault();
            focusIndex(Math.max(index - 1, 0));
            return;
        }

        if (e.key === "ArrowRight") {
            e.preventDefault();
            focusIndex(Math.min(index + 1, length - 1));
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text");
        const digits = (text || "").replace(/\D/g, "").slice(0, length);
        onChange(digits);

        const focusAt = Math.min(Math.max(digits.length - 1, 0), length - 1);
        focusIndex(focusAt);
    };

    return (
        <div
            onPaste={handlePaste}
            className="w-full flex items-center justify-center"
        >
            <div className="flex items-center justify-center gap-3 flex-nowrap">
                {Array.from({ length }).map((_, index) => (
                    <input
                        key={index}
                        ref={(el) => {
                            inputsRef.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        maxLength={1}
                        value={otpDigits[index] ?? ""}
                        onChange={(e) => handleChange(index, e)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        aria-label={`OTP digit ${index + 1}`}
                        className={otpInputClass}
                        style={{
                            width: 56,
                            height: 56,
                            minWidth: 56,
                            maxWidth: 56,
                            flex: "0 0 56px",
                            color: COLORS.navy,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

type Step = 'input_phone' | 'input_otp' | 'reset_password' | 'success';

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function ForgotPassword() {
    const { i18n } = useTranslation();
    const isVi = i18n.language === 'vi';
    const [step, setStep] = useState<Step>('input_phone');
    const [phone, setPhone] = useState('');
    const [otpValue, setOtpValue] = useState('');
    const [timeLeft, setTimeLeft] = useState(60);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [errors, setErrors] = useState<{ phone?: string; newPassword?: string; confirmPassword?: string }>({});

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const navigate = useNavigate();
    const { fetchPublic } = useFetchClient();

    const normalizePhone = (raw: string): string => {
        return raw.replace(/\D/g, '');
    };

    useEffect(() => {
        initRecaptcha("recaptcha-container").catch((err) => {
            console.error("Recaptcha init failed:", err);
        });
        return () => {
            clearRecaptcha();
        };
    }, []);

    useEffect(() => {
        if (step !== 'input_otp' || timeLeft <= 0) return;
        const intervalId = window.setInterval(
            () => setTimeLeft((t) => t - 1),
            1000,
        );
        return () => window.clearInterval(intervalId);
    }, [timeLeft, step]);

    const isOtpComplete = otpValue.replace(/\D/g, '').length === 6;

    const handlePhoneBlur = () => {
        const digits = normalizePhone(phone);
        if (!digits) {
            setErrors((prev) => ({ ...prev, phone: isVi ? 'Vui lòng nhập số điện thoại.' : 'Please enter your phone number.' }));
        } else if (digits.length < 9 || digits.length > 13) {
            setErrors((prev) => ({ ...prev, phone: isVi ? 'Số điện thoại không hợp lệ.' : 'Invalid phone number.' }));
        } else {
            setErrors((prev) => ({ ...prev, phone: undefined }));
        }
    };

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        const digits = normalizePhone(phone);
        if (!digits) {
            setErrors((prev) => ({ ...prev, phone: isVi ? 'Vui lòng nhập số điện thoại.' : 'Please enter your phone number.' }));
            return;
        }
        if (digits.length < 9 || digits.length > 13) {
            setErrors((prev) => ({ ...prev, phone: isVi ? 'Số điện thoại không hợp lệ.' : 'Invalid phone number.' }));
            return;
        }

        setIsLoading(true);
        setErrorMsg('');
        try {
            // Kiểm tra số điện thoại tồn tại trên hệ thống
            try {
                await fetchPublic(AUTH_API_ENDPOINTS.CHECK_PHONE, 'POST', { phone: digits });
                // Nếu CHECK_PHONE thành công thì có nghĩa là số điện thoại chưa tồn tại trong hệ thống (vì CHECK_PHONE trả 200 nếu chưa đăng ký)
                setErrors((prev) => ({ ...prev, phone: isVi ? 'Số điện thoại này chưa được đăng ký trong hệ thống.' : 'This phone number is not registered in our system.' }));
                setIsLoading(false);
                return;
            } catch (err: any) {
                // Nếu lỗi trả về là "Người dùng đã tồn tại, vui lòng đăng nhập" nghĩa là số điện thoại ĐÃ đăng ký trong hệ thống (Hợp lệ cho reset password)
                if (err.message === 'Người dùng đã tồn tại, vui lòng đăng nhập') {
                    // Số điện thoại hợp lệ, tiếp tục gửi OTP
                } else {
                    setErrorMsg(err.message || (isVi ? 'Có lỗi xảy ra trong quá trình xác thực.' : 'An error occurred during authentication.'));
                    setIsLoading(false);
                    return;
                }
            }

            let formattedPhone = phone;
            if (!formattedPhone.startsWith('+')) {
                if (formattedPhone.startsWith('84')) {
                    formattedPhone = '+' + formattedPhone;
                } else {
                    formattedPhone = '+84' + formattedPhone.replace(/^0/, '');
                }
            }
            const confirmation = await sendOtp(formattedPhone);
            setConfirmation(confirmation);

            setTimeLeft(60);
            setOtpValue('');
            setStep('input_otp');
        } catch (err: any) {
            setErrorMsg(err.message || (isVi ? 'Gửi OTP thất bại, vui lòng thử lại.' : 'Failed to send OTP, please try again.'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setErrorMsg('');
        setIsLoading(true);
        try {
            let formattedPhone = phone;
            if (!formattedPhone.startsWith('+')) {
                if (formattedPhone.startsWith('84')) {
                    formattedPhone = '+' + formattedPhone;
                } else {
                    formattedPhone = '+84' + formattedPhone.replace(/^0/, '');
                }
            }
            const confirmation = await sendOtp(formattedPhone);
            setConfirmation(confirmation);
            setTimeLeft(60);
            setOtpValue('');
        } catch (err: any) {
            setErrorMsg(err.message || (isVi ? 'Gửi lại OTP thất bại.' : 'Failed to resend OTP.'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isOtpComplete) return;
        const confirmation = getConfirmation();
        if (!confirmation) {
            setErrorMsg(isVi ? 'Phiên xác thực hết hạn, vui lòng nhập lại số điện thoại.' : 'Session expired, please enter your phone number again.');
            return;
        }
        setIsLoading(true);
        setErrorMsg('');
        try {
            await verifyOtp(confirmation, otpValue);
            setConfirmation(null);
            setStep('reset_password');
        } catch (err: any) {
            setErrorMsg(
                err?.code === 'auth/invalid-verification-code'
                    ? (isVi ? 'Mã OTP không đúng, vui lòng thử lại.' : 'Incorrect OTP, please try again.')
                    : err?.message || (isVi ? 'Xác thực thất bại.' : 'Verification failed.')
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        let hasError = false;
        if (!newPassword || newPassword.length < 6) {
            setErrors(prev => ({ ...prev, newPassword: isVi ? 'Mật khẩu phải từ 6 ký tự trở lên.' : 'Password must be at least 6 characters.' }));
            hasError = true;
        } else {
            setErrors(prev => ({ ...prev, newPassword: undefined }));
        }

        if (newPassword !== confirmPassword) {
            setErrors(prev => ({ ...prev, confirmPassword: isVi ? 'Mật khẩu xác nhận không trùng khớp.' : 'Confirm password does not match.' }));
            hasError = true;
        } else {
            setErrors(prev => ({ ...prev, confirmPassword: undefined }));
        }

        if (hasError) return;

        setIsLoading(true);
        setErrorMsg('');
        try {
            await fetchPublic(
                AUTH_API_ENDPOINTS.FORGOT_PASSWORD,
                'POST',
                { phone: normalizePhone(phone), password: newPassword, confirmPassword }
            );
            setStep('success');
        } catch (err: any) {
            setErrorMsg(err.message || (isVi ? 'Cập nhật mật khẩu thất bại.' : 'Failed to reset password.'));
        } finally {
            setIsLoading(false);
        }
    };

    const inputClass = 'w-full h-14 bg-white border border-blue-50 rounded-2xl text-sm outline-none transition-all shadow-sm';

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-stretch">
            <style>{phoneStyles}</style>

            {/* ── LEFT DECORATION ─────────────────────────── */}
            <div className="hidden lg:flex w-1/2 relative overflow-hidden items-center justify-center p-20"
                style={{ backgroundColor: COLORS.navy }}>
                <div className="absolute inset-0 z-0">
                    <img src="/images/sectionbook.png" alt="Security"
                        className="w-full h-full object-cover opacity-30 grayscale" />
                </div>

                <div className="relative z-10 text-white max-w-lg">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-white/10 backdrop-blur-md p-2 rounded-xl inline-flex mb-8"
                    >
                        <ShieldAlert style={{ color: COLORS.orange }} />
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-6xl font-display leading-[1.1] mb-8"
                    >
                        {isVi ? 'An ninh là' : 'Security is'} <br />
                        <span style={{ color: COLORS.orange }}>{isVi ? 'trên hết.' : 'our priority.'}</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-white/60 text-lg leading-relaxed mb-12"
                    >
                        {isVi 
                            ? 'Bảo vệ dữ liệu xe và tính toàn vẹn tài khoản của bạn là ưu tiên hàng đầu của chúng tôi. Đặt lại mật khẩu thông qua quy trình xác minh an toàn của chúng tôi.'
                            : 'Protecting your vehicle data and account integrity is our top priority. Reset your password through our secure verification process.'}
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ backgroundColor: `${COLORS.orange}20`, color: COLORS.orange }}>
                                <ShieldAlert size={20} />
                            </div>
                            <div className="text-xs text-white/40">{isVi ? 'Được hơn 50.000 chủ xe tin dùng.' : 'Trusted by over 50,000 car owners.'}</div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* ── RIGHT FORM ───────────────────────────────────── */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-20"
                style={{ backgroundColor: '#F8FAFC' }}>
                <div className="w-full max-w-md">
                    {/* --- STEP 1: INPUT PHONE --- */}
                    {step === 'input_phone' && (
                        <>
                            <div className="mb-12 text-center lg:text-left">
                                <h2 className="text-4xl font-display mb-4" style={{ color: COLORS.navy }}>
                                    {isVi ? 'Quên Mật Khẩu' : 'Forgot Password'}
                                </h2>
                                <p style={{ color: `${COLORS.navy}80` }}>
                                    {isVi 
                                        ? 'Nhập số điện thoại liên kết với tài khoản AGM Intelligent của bạn. Chúng tôi sẽ gửi mã OTP bảo mật để đặt lại mật khẩu.'
                                        : 'Enter the phone number associated with your AGM Intelligent account. We will send a secure OTP code to reset your password.'}
                                </p>
                            </div>

                            <form onSubmit={handleSendOtp} className="space-y-6">
                                {errorMsg && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium"
                                    >
                                        {errorMsg}
                                    </motion.div>
                                )}

                                {/* ── SỐ ĐIỆN THOẠI ── */}
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest mb-2 px-1"
                                        style={{ color: `${COLORS.navy}66` }}>
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

                                {/* ── Submit ── */}
                                <Button
                                    type="submit"
                                    size="md"
                                    bg={COLORS.orange}
                                    color={COLORS.navy}
                                    icon={isLoading ? undefined : <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                                    className="w-full justify-center rounded-2xl mt-2"
                                    style={{ boxShadow: '0 8px 24px rgba(120,53,15,0.1)', opacity: isLoading ? 0.7 : 1 }}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                            </svg>
                                            {isVi ? 'Đang gửi...' : 'Sending...'}
                                        </span>
                                    ) : (isVi ? 'Gửi mã OTP' : 'Send OTP')}
                                </Button>
                            </form>

                            <div className="mt-12 flex flex-col items-center gap-6">
                                <Link
                                    to="/login"
                                    className="flex items-center gap-2 text-sm font-bold transition-colors hover:opacity-70"
                                    style={{ color: `${COLORS.navy}99` }}
                                >
                                    <ChevronLeft size={18} /> {isVi ? 'Trở về trang Đăng Nhập' : 'Back to Login'}
                                </Link>
                                <p className="text-xs text-center" style={{ color: `${COLORS.navy}4D` }}>
                                    {isVi ? 'Cần trợ giúp?' : 'Need help?'}{' '}
                                    <a href="#" className="font-bold transition-colors hover:opacity-70"
                                        style={{ color: COLORS.navy }}>
                                        {isVi ? 'Liên hệ đội ngũ hỗ trợ' : 'Contact Support'}
                                    </a>
                                </p>
                            </div>
                        </>
                    )}

                    {/* --- STEP 2: INPUT OTP --- */}
                    {step === 'input_otp' && (
                        <>
                            <div className="mb-12 text-center lg:text-left">
                                <h2 className="text-4xl font-display mb-4" style={{ color: COLORS.navy }}>
                                    {isVi ? 'Xác Thực OTP' : 'OTP Verification'}
                                </h2>
                                <p style={{ color: `${COLORS.navy}80` }}>
                                    {isVi ? 'Vui lòng nhập mã gồm ' : 'Please enter the '}<span className="font-bold" style={{ color: COLORS.navy }}>{isVi ? '6 chữ số' : '6-digit code'}</span>{isVi ? ' đã được gửi đến số điện thoại của bạn.' : ' sent to your phone number.'}
                                </p>
                            </div>

                            <form onSubmit={handleVerifyOtp} className="space-y-6">
                                {errorMsg && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium"
                                    >
                                        {errorMsg}
                                    </motion.div>
                                )}

                                <div className="space-y-3">
                                    <label className="block text-[11px] font-bold uppercase tracking-widest"
                                        style={{ color: `${COLORS.navy}66` }}>
                                        {isVi ? 'Nhập Mã OTP' : 'Enter OTP Code'}
                                    </label>

                                    <OtpInput length={6} value={otpValue} onChange={setOtpValue} />

                                    <div className="flex items-center justify-between pt-1">
                                        <p className="text-xs" style={{ color: `${COLORS.navy}80` }}>
                                            {timeLeft > 0 ? (
                                                <>
                                                    {isVi ? 'Gửi lại sau' : 'Resend in'}{' '}
                                                    <span className="font-bold" style={{ color: COLORS.navy }}>
                                                        {timeLeft}s
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    {isVi ? 'Không nhận được mã?' : "Didn't receive the code?"}{' '}
                                                    <button
                                                        type="button"
                                                        onClick={handleResendOtp}
                                                        className="font-bold hover:opacity-70 transition-opacity"
                                                        style={{ color: COLORS.navy }}
                                                    >
                                                        {isVi ? 'Gửi lại OTP' : 'Resend OTP'}
                                                    </button>
                                                </>
                                            )}
                                        </p>

                                        <button
                                            type="button"
                                            onClick={() => setOtpValue('')}
                                            className="text-xs font-bold hover:opacity-70 transition-opacity"
                                            style={{ color: `${COLORS.navy}66` }}
                                        >
                                            {isVi ? 'Xóa' : 'Clear'}
                                        </button>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    size="md"
                                    bg={isOtpComplete ? COLORS.orange : 'rgba(249,161,27,0.35)'}
                                    color={COLORS.navy}
                                    icon={isLoading ? undefined : <ChevronRight size={18} />}
                                    className={`w-full justify-center rounded-2xl mt-4 ${isOtpComplete ? '' : 'pointer-events-none'}`}
                                    style={{
                                        boxShadow: isOtpComplete ? `0 8px 28px ${COLORS.orange}35` : 'none',
                                        opacity: isLoading ? 0.7 : 1
                                    }}
                                    disabled={isLoading || !isOtpComplete}
                                >
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                            </svg>
                                            {isVi ? 'Đang xác nhận...' : 'Verifying...'}
                                        </span>
                                    ) : (isVi ? 'Xác Nhận' : 'Verify')}
                                </Button>
                            </form>

                            <div className="mt-12 flex flex-col items-center gap-6">
                                <button
                                    onClick={() => setStep('input_phone')}
                                    className="flex items-center gap-2 text-sm font-bold transition-colors hover:opacity-70"
                                    style={{ color: `${COLORS.navy}99` }}
                                >
                                    <ChevronLeft size={18} /> {isVi ? 'Thay đổi Số điện thoại' : 'Change Phone Number'}
                                </button>
                            </div>
                        </>
                    )}

                    {/* --- STEP 3: RESET PASSWORD --- */}
                    {step === 'reset_password' && (
                        <>
                            <div className="mb-12 text-center lg:text-left">
                                <h2 className="text-4xl font-display mb-4" style={{ color: COLORS.navy }}>
                                    {isVi ? 'Đặt Lại Mật Khẩu' : 'Reset Password'}
                                </h2>
                                <p style={{ color: `${COLORS.navy}80` }}>
                                    {isVi ? 'Nhập mật khẩu mới cho tài khoản của bạn.' : 'Enter a new password for your account.'}
                                </p>
                            </div>

                            <form onSubmit={handleResetPassword} className="space-y-6">
                                {errorMsg && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium"
                                    >
                                        {errorMsg}
                                    </motion.div>
                                )}

                                {/* Mật khẩu mới */}
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest mb-2 px-1"
                                        style={{ color: `${COLORS.navy}66` }}>
                                        {isVi ? 'Mật Khẩu Mới' : 'New Password'}
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={newPassword}
                                        onChange={(e) => {
                                            setNewPassword(e.target.value);
                                            if (errors.newPassword) setErrors(prev => ({ ...prev, newPassword: undefined }));
                                        }}
                                        className={`${inputClass} px-5`}
                                    />
                                    {errors.newPassword && (
                                        <p className="mt-1.5 px-1 text-xs text-red-500 font-medium">{errors.newPassword}</p>
                                    )}
                                </div>

                                {/* Xác nhận mật khẩu mới */}
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest mb-2 px-1"
                                        style={{ color: `${COLORS.navy}66` }}>
                                        {isVi ? 'Xác Nhận Mật Khẩu Mới' : 'Confirm New Password'}
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                                        }}
                                        className={`${inputClass} px-5`}
                                    />
                                    {errors.confirmPassword && (
                                        <p className="mt-1.5 px-1 text-xs text-red-500 font-medium">{errors.confirmPassword}</p>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    size="md"
                                    bg={COLORS.orange}
                                    color={COLORS.navy}
                                    icon={isLoading ? undefined : <ChevronRight size={18} />}
                                    className="w-full justify-center rounded-2xl mt-4"
                                    style={{
                                        boxShadow: `0 8px 28px ${COLORS.orange}35`,
                                        opacity: isLoading ? 0.7 : 1
                                    }}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                            </svg>
                                            {isVi ? 'Đang cập nhật...' : 'Updating...'}
                                        </span>
                                    ) : (isVi ? 'Cập Nhật Mật Khẩu' : 'Update Password')}
                                </Button>
                            </form>
                        </>
                    )}

                    {/* --- STEP 4: SUCCESS --- */}
                    {step === 'success' && (
                        <div className="text-center">
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-200"
                            >
                                <CheckCircle2 size={32} />
                            </motion.div>

                            <h2 className="text-3xl font-display mb-4" style={{ color: COLORS.navy }}>
                                {isVi ? 'Thành Công!' : 'Success!'}
                            </h2>

                            <p className="mb-8" style={{ color: `${COLORS.navy}80` }}>
                                {isVi 
                                    ? 'Mật khẩu của bạn đã được cập nhật thành công. Vui lòng đăng nhập lại bằng thông tin mới.'
                                    : 'Your password has been successfully updated. Please log in again with your new credentials.'}
                            </p>

                            <Button
                                size="md"
                                bg={COLORS.navy}
                                color={COLORS.white}
                                icon={<ChevronRight size={18} />}
                                className="w-full justify-center rounded-2xl"
                                onClick={() => navigate('/login')}
                            >
                                {isVi ? 'Đăng Nhập Ngay' : 'Log In Now'}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Firebase recaptcha container */}
            <div id="recaptcha-container" className="flex justify-center"></div>
        </div>
    );
}
