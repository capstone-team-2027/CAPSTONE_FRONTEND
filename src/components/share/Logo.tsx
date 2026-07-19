import { Link } from "react-router-dom";
import { COLORS } from "./Color";

type LogoSize = "sm" | "md" | "lg";

interface LogoProps {
  size?: LogoSize;
  className?: string;
}

const SIZE_MAP: Record<LogoSize, { image: string; text: string }> = {
  sm: { image: "w-28 h-20", text: "text-xl" },
  md: { image: "w-48 h-32", text: "text-3xl" },
  lg: { image: "w-64 h-44", text: "text-5xl" },
};
export default function Logo({ size = "md", className = "" }: LogoProps) {
  const s = SIZE_MAP[size];

  return (
    <Link
      to="/"
      className={`flex items-center gap-3 select-none group ${className}`}
    >
      <img
        src="/images/logo16.png"
        alt="Logo"
        className={`${s.image} object-contain transition-opacity group-hover:opacity-80`}
      />
    </Link>
  );
}
