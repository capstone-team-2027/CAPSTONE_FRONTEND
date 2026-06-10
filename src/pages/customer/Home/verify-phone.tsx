import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronRight, Phone, ShieldCheck, Loader2 } from "lucide-react";

import Logo from "../../../components/share/Logo";
import { Button } from "../../../components/share/Button";
import { COLORS } from "../../../components/share/Color";
import { useFetchClient } from "../../../hook/useFetchClient";
import {
  sendOtp,
  setConfirmation,
  initRecaptcha,
  clearRecaptcha,
} from "../../../services/firebaseOtp";
import { AUTH_API_ENDPOINTS } from '../../../constants/customer/authApiEndpoints';

const PHONE_REGEX_VN = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

function normalizePhoneNumber(phoneNumber: string) {
  return phoneNumber.replace(/\s+/g, "");
}

function validatePhoneNumber(phoneNumber: string) {
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
  if (!normalizedPhoneNumber) return "Vui lòng nhập số điện thoại.";
  if (!PHONE_REGEX_VN.test(normalizedPhoneNumber))
    return "Số điện thoại không hợp lệ. Ví dụ: 09xxxxxxxx hoặc +849xxxxxxxx.";
  return "";
}

export default function VerifyPhone() {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isTouched, setIsTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { fetchPublic } = useFetchClient();

  const validationMessage = useMemo(
    () => validatePhoneNumber(phoneNumber),
    [phoneNumber],
  );

  const isPhoneValid = !validationMessage;

  const handleChangePhoneNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(e.target.value);
  };

  useEffect(() => {
    initRecaptcha("recaptcha-container").catch((err) => {
      console.error("Recaptcha init failed:", err);
    });
    return () => {
      clearRecaptcha();
    };
  }, []);

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTouched(true);
    if (!isPhoneValid) return;
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    setIsLoading(true);
    setErrorMsg("");
    try {
      await fetchPublic(AUTH_API_ENDPOINTS.CHECK_PHONE, 'POST',{ phone: normalizedPhone },
      );
      const confirmation = await sendOtp(normalizedPhone);
      setConfirmation(confirmation);
      navigate("/otp-verification", {
        state: { phoneNumber: normalizedPhone },
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-stretch">
      {/* LEFT */}
      <div
        className="hidden lg:flex w-[40%] relative overflow-hidden items-center justify-center p-16"
        style={{ backgroundColor: COLORS.navyMid }}
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
          <div className="mb-10">
            <Logo size="md" />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-2 rounded-xl inline-flex mb-6"
            style={{
              backgroundColor: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(12px)",
            }}
          >
            <ShieldCheck style={{ color: COLORS.orange }} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="text-5xl font-display leading-[1.1] mb-6"
          >
            <span className="inline-flex items-baseline gap-3 whitespace-nowrap">
              <span>Xác Minh</span>
              <span style={{ color: COLORS.orange }}>SĐT</span>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="text-white/60 text-sm leading-relaxed mb-10"
          >
            Kiểm tra số điện thoại hợp lệ trước khi tiếp tục các bước Đăng ký.
          </motion.p>

          <div className="space-y-5">
            {["Đúng số điện thoại", "Gửi OTP an toàn", "Tránh nhập sai"].map(
              (text, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.22 + index * 0.08 }}
                  className="flex items-center gap-4"
                >
                  <div
                    className="p-1.5 rounded-full"
                    style={{ backgroundColor: `${COLORS.orange}22` }}
                  >
                    <CheckCircle2 size={16} style={{ color: COLORS.orange }} />
                  </div>
                  <span className="text-sm text-white/80 font-medium">
                    {text}
                  </span>
                </motion.div>
              ),
            )}
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div
        className="w-full lg:w-[60%] flex items-center justify-center px-8 py-12 md:px-20"
        style={{ backgroundColor: COLORS.blueLight }}
      >
        <div className="w-full max-w-lg">
          <div className="mb-10 text-center lg:text-left">
            <p
              className="text-xs font-bold uppercase tracking-[0.2em] mb-3"
              style={{ color: COLORS.orange }}
            >
              AGM INTELLIGENT — PORTAL
            </p>

            <h2
              className="text-5xl font-display mb-3"
              style={{ color: COLORS.navy }}
            >
              Xác Thực Số Điện Thoại
            </h2>

            <p
              className="text-sm leading-relaxed"
              style={{ color: COLORS.textMuted }}
            >
              Nhập số điện thoại để nhận mã OTP. Hệ thống sẽ kiểm tra hợp lệ
              trước.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-10 shadow-xl shadow-blue-900/8 border border-blue-50/80">
            <form className="space-y-7" onSubmit={handleVerifyPhone}>
              <div className="flex items-start gap-4 p-4 rounded-2xl border border-blue-50 bg-blue-50/40">
                <div
                  className="p-2 rounded-xl"
                  style={{
                    backgroundColor: `${COLORS.orange}14`,
                    color: COLORS.orange,
                  }}
                >
                  <Phone size={18} />
                </div>

                <div className="flex-1">
                  <p
                    className="text-sm font-bold"
                    style={{ color: COLORS.navy }}
                  >
                    Nhập số điện thoại
                  </p>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: COLORS.textMuted }}
                  >
                    Ví dụ: 09xxxxxxxx hoặc +849xxxxxxxx
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label
                  className="block text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: COLORS.textFaint }}
                >
                  Số Điện Thoại
                </label>

                <input
                  value={phoneNumber}
                  onChange={handleChangePhoneNumber}
                  onBlur={() => setIsTouched(true)}
                  placeholder="Nhập số điện thoại"
                  className="w-full h-14 bg-white border border-blue-50 rounded-2xl text-sm outline-none transition-all shadow-sm focus:ring-4 focus:border-brand-orange px-5"
                  style={{ color: COLORS.navy }}
                  inputMode="tel"
                  autoComplete="tel"
                />

                {isTouched && !isPhoneValid && (
                  <p className="text-xs" style={{ color: "#DC2626" }}>
                    {validationMessage}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  size="md"
                  bg={isPhoneValid && !isLoading ? COLORS.orange : "rgba(249,161,27,0.35)"}
                  color={COLORS.navyMid}
                  icon={isLoading ? <Loader2 className="animate-spin" size={18} /> : <ChevronRight size={18} />}
                  className={`w-full justify-center rounded-2xl ${
                    isPhoneValid && !isLoading ? "" : "pointer-events-none"
                  }`}
                >
                  {isLoading ? "Đang xử lý..." : "Tiếp tục"}
                </Button>
                {errorMsg && (
                  <p
                    className="text-xs text-center"
                    style={{ color: "#DC2626" }}
                  >
                    {errorMsg}
                  </p>
                )}
                <p
                  className="text-xs text-center"
                  style={{ color: COLORS.textMuted }}
                >
                  Sau khi hợp lệ, bạn sẽ được chuyển sang trang nhập OTP.
                </p>
              </div>

              <div className="pt-1 text-center space-y-3">
                <div className="text-sm" style={{ color: COLORS.textMuted }}>
                  Bạn đã có tài khoản?{" "}
                  <Link
                    to="/login"
                    className="font-bold hover:opacity-70 transition-opacity"
                    style={{ color: COLORS.navy }}
                  >
                    Đăng Nhập
                  </Link>
                </div>
              </div>
            </form>
          </div>

          <p
            className="mt-6 text-center text-xs"
            style={{ color: COLORS.textMuted }}
          >
            Bằng việc tiếp tục, bạn đồng ý với điều khoản sử dụng và chính sách
            bảo mật.
          </p>
        </div>
      </div>
              <div id="recaptcha-container" className="flex justify-center"></div>

    </div>
  );
}
