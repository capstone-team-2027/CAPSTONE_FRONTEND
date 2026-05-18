import { motion } from 'motion/react';
import { Mail, ShieldAlert, ChevronLeft, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { COLORS } from '../../../components/share/Color';
import { Button } from '../../../components/share/Button';



// ── MAIN COMPONENT ────────────────────────────────────────────
export default function ForgotPassword() {
    const inputClass = 'w-full h-14 bg-white border border-blue-50 rounded-2xl text-sm outline-none transition-all shadow-sm';

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-stretch">

            {/* ── LEFT DECORATION ─────────────────────────────── */}
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
                        An ninh là <br />
                        <span style={{ color: COLORS.orange }}>trên hết.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-white/60 text-lg leading-relaxed mb-12"
                    >
                        Bảo vệ dữ liệu xe và tính toàn vẹn tài khoản của bạn là ưu tiên hàng đầu của chúng tôi.
                        Đặt lại mật khẩu thông qua quy trình xác minh an toàn của chúng tôi.
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
                            <div className="text-xs text-white/40">Được hơn 50.000 chủ xe tin dùng.</div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* ── RIGHT FORM ───────────────────────────────────── */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-20"
                style={{ backgroundColor: '#F8FAFC' }}>
                <div className="w-full max-w-md">
                    <div className="mb-12 text-center lg:text-left">
                        <h2 className="text-4xl font-display mb-4" style={{ color: COLORS.navy }}>
                            Quên Mật Khẩu
                        </h2>
                        <p style={{ color: `${COLORS.navy}80` }}>
                            Nhập địa chỉ email liên kết với tài khoản AMG Intelligent của bạn.
                            Chúng tôi sẽ gửi một liên kết bảo mật để đặt lại mật khẩu.
                        </p>
                    </div>

                    <form className="space-y-6">

                        {/* ── EMAIL ── */}
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-widest mb-2 px-1"
                                style={{ color: `${COLORS.navy}66` }}>
                                Địa chỉ Email
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors"
                                    style={{ color: `${COLORS.navy}4D` }}>
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    placeholder="e.g. alex@example.com"
                                    className={`${inputClass} pl-12`}
                                    style={{}}
                                />
                            </div>
                        </div>

                        {/* ── Submit ── */}
                        <Button
                            size="md"
                            bg={COLORS.orange}
                            color={COLORS.navy}
                            icon={<Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                            className="w-full justify-center rounded-2xl mt-2"
                            style={{ boxShadow: '0 8px 24px rgba(120,53,15,0.1)' }}
                        >
                            Gửi Liên Kết
                        </Button>
                    </form>

                    <div className="mt-12 flex flex-col items-center gap-6">
                        <Link
                            to="/login"
                            className="flex items-center gap-2 text-sm font-bold transition-colors hover:opacity-70"
                            style={{ color: `${COLORS.navy}99` }}
                        >
                            <ChevronLeft size={18} /> Trở về trang Đăng Nhập
                        </Link>
                        <p className="text-xs text-center" style={{ color: `${COLORS.navy}4D` }}>
                            Cần trợ giúp?{' '}
                            <a href="#" className="font-bold transition-colors hover:opacity-70"
                                style={{ color: COLORS.navy }}>
                                Liên hệ đội ngũ hỗ trợ
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
