import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  KeyRound,
  ShieldCheck,
} from "lucide-react";

import Logo from "../../../components/share/Logo";
import { Button } from "../../../components/share/Button";
import { COLORS } from "../../../components/share/Color";

// OTP input phải cố định width/height (dùng inline style để không bị CSS global override)
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
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const raw = e.target.value || "";
    const digitsOnly = raw.replace(/\D/g, "");

    // gõ/paste nhiều số vào 1 ô -> dàn đều sang các ô tiếp theo
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
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace") {
      e.preventDefault();

      // nếu ô hiện tại có số -> xóa số
      if (otpDigits[index]) {
        const nextDigits = [...otpDigits];
        nextDigits[index] = "";
        setOtpFromDigits(nextDigits);
        return;
      }

      // nếu ô hiện tại trống -> lùi về ô trước và xóa
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
      {/* wrapper khóa layout 6 ô */}
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
              // chống CSS global kiểu input{width:100%}
              flex: "0 0 56px",
              color: COLORS.navy,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function OtpVerification() {
  const [otpValue, setOtpValue] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const intervalId = window.setInterval(
      () => setTimeLeft((t) => t - 1),
      1000
    );
    return () => window.clearInterval(intervalId);
  }, [timeLeft]);

  const isOtpComplete = otpValue.replace(/\D/g, "").length === 6;

  const handleResendOtp = () => {
    // UI only
    setTimeLeft(60);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOtpComplete) return;
    // UI only
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
              <span>Verify</span>
              <span style={{ color: COLORS.orange }}>OTP</span>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="text-white/60 text-sm leading-relaxed mb-10"
          >
            Nhập mã xác thực gồm 6 chữ số để hoàn tất. Mã được gửi qua SMS và
            chỉ có hiệu lực trong thời gian ngắn.
          </motion.p>

          <div className="space-y-5">
            {[
              "Bảo mật nhiều lớp",
              "Xác thực trong vài giây",
              "An toàn & riêng tư",
            ].map((text, index) => (
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
            ))}
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
              AMG INTELLIGENT — PORTAL
            </p>

            <h2
              className="text-5xl font-display mb-3"
              style={{ color: COLORS.navy }}
            >
              Xác Thực OTP
            </h2>

            <p
              className="text-sm leading-relaxed"
              style={{ color: COLORS.textMuted }}
            >
              Vui lòng nhập mã gồm{" "}
              <span className="font-bold" style={{ color: COLORS.navy }}>
                6 chữ số
              </span>{" "}
              để tiếp tục.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-10 shadow-xl shadow-blue-900/8 border border-blue-50/80">
            <form className="space-y-7" onSubmit={handleVerifyOtp}>
              <div className="flex items-start gap-4 p-4 rounded-2xl border border-blue-50 bg-blue-50/40">
                <div
                  className="p-2 rounded-xl"
                  style={{
                    backgroundColor: `${COLORS.orange}14`,
                    color: COLORS.orange,
                  }}
                >
                  <KeyRound size={18} />
                </div>

                <div className="flex-1">
                  <p
                    className="text-sm font-bold"
                    style={{ color: COLORS.navy }}
                  >
                    Mã OTP đã được gửi
                  </p>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: COLORS.textMuted }}
                  >
                    Nếu bạn không nhận được mã, hãy kiểm tra SMS hoặc chọn “Gửi
                    lại OTP”.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label
                  className="block text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: COLORS.textFaint }}
                >
                  Nhập Mã OTP
                </label>

                <OtpInput length={6} value={otpValue} onChange={setOtpValue} />

                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs" style={{ color: COLORS.textMuted }}>
                    {timeLeft > 0 ? (
                      <>
                        Gửi lại sau{" "}
                        <span
                          className="font-bold"
                          style={{ color: COLORS.navy }}
                        >
                          {timeLeft}s
                        </span>
                      </>
                    ) : (
                      <>
                        Không nhận được mã?{" "}
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          className="font-bold hover:opacity-70 transition-opacity"
                          style={{ color: COLORS.navy }}
                        >
                          Gửi lại OTP
                        </button>
                      </>
                    )}
                  </p>

                  <button
                    type="button"
                    onClick={() => setOtpValue("")}
                    className="text-xs font-bold hover:opacity-70 transition-opacity"
                    style={{ color: COLORS.textMuted }}
                  >
                    Xóa
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  size="md"
                  bg={isOtpComplete ? COLORS.orange : "rgba(249,161,27,0.35)"}
                  color={COLORS.navyMid}
                  icon={<ChevronRight size={18} />}
                  className={`w-full justify-center rounded-2xl ${
                    isOtpComplete ? "" : "pointer-events-none"
                  }`}
                  style={{
                    boxShadow: isOtpComplete
                      ? `0 8px 28px ${COLORS.orange}35`
                      : "none",
                  }}
                >
                  Xác Nhận
                </Button>

                {!isOtpComplete && (
                  <p
                    className="text-xs text-center"
                    style={{ color: COLORS.textMuted }}
                  >
                    Nhập đủ 6 số để tiếp tục.
                  </p>
                )}
              </div>

              <div className="pt-1 text-center space-y-3">
                <Link
                  to="/signup"
                  className="inline-block text-sm font-bold hover:opacity-70 transition-opacity"
                  style={{ color: COLORS.navy }}
                >
                  Quay lại đăng ký
                </Link>

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
            Bằng việc xác thực, bạn đồng ý với điều khoản sử dụng và chính sách
            bảo mật.
          </p>
        </div>
      </div>
    </div>
  );
}
