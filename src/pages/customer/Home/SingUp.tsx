import { motion } from 'motion/react';
import { Lock, User, ShieldCheck, ChevronRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { COLORS } from '../../../components/share/Color';
import { Button } from '../../../components/share/Button';
import { useFetchClient } from '../../../hook/useFetchClient';
import { AUTH_API_ENDPOINTS } from '../../../constants/customer/authApiEndpoints';
import type { register } from '../../../model/dto/register.dto.';

const inputClass =
    'w-full h-14 bg-white border border-blue-50 rounded-2xl text-sm outline-none transition-all shadow-sm focus:ring-4 focus:border-brand-orange';

export default function Signup() {
    const location = useLocation();
    const navigate = useNavigate();
    const { fetchPublic } = useFetchClient();
    const { idToken } = (location.state as { idToken?: string }) || {};
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agree, setAgree] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        if (!idToken) {
            navigate('/login', { replace: true });
        }
    }, [idToken, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        if (!agree) {
            setErrorMsg('Bạn cần đồng ý với điều khoản & chính sách');
            return;
        }
     
        const payload: register = {
            idToken: idToken as string,
            fullName: fullName.trim(),
            password,
            confirmPassword,
        };
        setIsLoading(true);
        try {
            await fetchPublic(AUTH_API_ENDPOINTS.REGISTER, 'POST', payload);
            setSuccessMsg('Đăng ký thành công! Đang chuyển sang trang đăng nhập...');
            setTimeout(() => {
                navigate('/login', { replace: true });
            }, 2000);
        } catch (err: any) {
            setErrorMsg(err?.message || 'Đăng ký thất bại, vui lòng thử lại');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-stretch">

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
                        Trải nghiệm thế hệ chăm sóc xe hơi tiếp theo. Chính xác, minh bạch và kiểm soát trong tầm tay bạn.
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
                        <form className="space-y-6" onSubmit={handleSubmit}>

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
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className={`${inputClass} pl-12`}
                                    />
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
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
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
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
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
                                    checked={agree}
                                    onChange={(e) => setAgree(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 rounded border-blue-100 accent-orange-400"
                                />
                                <p className="text-sm leading-relaxed" style={{ color: `${COLORS.navy}70` }}>
                                    Tôi đồng ý với các{' '}
                                    <Link to="#" className="font-bold" style={{ color: COLORS.navy }}>Điều khoản</Link>{' '}và{' '}
                                    <Link to="#" className="font-bold" style={{ color: COLORS.navy }}>Chính sách bảo mật</Link>
                                </p>
                            </div>

                            {successMsg && (
                                <p className="text-sm font-medium text-green-600">{successMsg}</p>
                            )}

                            {errorMsg && (
                                <p className="text-sm font-medium text-red-500">{errorMsg}</p>
                            )}

                            {/* Submit */}
                            <Button
                                type="submit"
                                size="md"
                                bg={COLORS.orange}
                                color={COLORS.navy}
                                icon={<ChevronRight size={18} />}
                                onClick={handleSubmit as unknown as React.MouseEventHandler<HTMLButtonElement>}
                                className="w-full justify-center rounded-2xl"
                                style={{ boxShadow: `0 8px 28px ${COLORS.orange}35`, marginTop: '0.5rem', opacity: isLoading ? 0.7 : 1 }}
                            >
                                {isLoading ? 'Đang đăng ký...' : 'Đăng Ký'}
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