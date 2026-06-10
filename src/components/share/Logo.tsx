import { Link } from 'react-router-dom';

import { COLORS } from './Color';

type LogoSize = 'sm' | 'md' | 'lg';

interface LogoProps {
    size?: LogoSize;
    className?: string;
}

const SIZE_MAP: Record<LogoSize, { box: string; text: string }> = {
    sm: { box: 'w-9  h-9  p-2', text: 'text-lg' },
    md: { box: 'w-12 h-12 p-2.5', text: 'text-2xl' },
    lg: { box: 'w-16 h-16 p-3.5', text: 'text-4xl' },
};

export default function Logo({ size = 'md', className = '' }: LogoProps) {
    const s = SIZE_MAP[size];

    return (
        <Link
            to="/"
            className={`flex items-center gap-3 select-none group ${className}`}
        >
            {/* Icon box — màu từ COLORS.navyMid */}
            <div
                className={`${s.box} rounded-xl flex-shrink-0 flex items-center justify-center transition-opacity group-hover:opacity-80`}
                style={{
                    backgroundColor: COLORS.navyMid,
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
            >
                <img 
                    src="/images/logo.png" 
                    alt="Logo" 
                    className="w-full h-full object-contain" 
                />
            </div>

            {/* Text — màu trắng */}
            <span
                className={`${s.text} font-bold font-display tracking-tight uppercase`}
                style={{ color: COLORS.white }}
            >
                AGM INTELLIGENT
            </span>
        </Link>
    );
}