import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Warehouse,
  AlertTriangle,
  Boxes,
  Wallet,
  TrendingUp,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

type OutletCtx = {
  searchQuery: string;
  showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
};

export default function InventoryDashboard() {
  const { showToast } = useOutletContext<OutletCtx>();
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);

  // ── Quick stat strip (gọn, không phải 4-KPI kiểu admin) ──
  const stats = [
    { id: 'value', label: 'Giá trị tồn kho', value: '1.85 tỷ đ', icon: <Wallet size={18} />, tint: 'text-blue-600 bg-blue-50' },
    { id: 'sku', label: 'Tổng SKU', value: '1,342', icon: <Boxes size={18} />, tint: 'text-[#00285E] bg-[#EDF3FF]' },
    { id: 'low', label: 'Sắp hết', value: '24', icon: <AlertTriangle size={18} />, tint: 'text-[#F9A11B] bg-amber-50' },
    { id: 'util', label: 'Lấp đầy kho', value: '72%', icon: <Warehouse size={18} />, tint: 'text-emerald-600 bg-emerald-50' },
  ];

  // ── Capacity by zone (sơ đồ sức chứa theo khu) ──
  const zones = [
    { name: 'Khu A · Dầu nhớt', pct: 80, used: 480, total: 600 },
    { name: 'Khu B · Lọc & Bugi', pct: 50, used: 250, total: 500 },
    { name: 'Khu C · Phanh', pct: 99, used: 396, total: 400 },
    { name: 'Khu D · Lốp', pct: 64, used: 256, total: 400 },
    { name: 'Khu E · Ắc quy', pct: 38, used: 76, total: 200 },
  ];

  const zoneColor = (pct: number) =>
    pct >= 95 ? 'bg-rose-500' : pct >= 80 ? 'bg-[#F9A11B]' : 'bg-[#00285E]';

  // ── Stock composition donut (cơ cấu tồn kho theo danh mục) ──
  const composition = [
    { label: 'Dầu nhớt', value: 38, color: '#00285E' },
    { label: 'Phanh', value: 24, color: '#B8860B' },
    { label: 'Lọc', value: 18, color: '#1E40AF' },
    { label: 'Lốp', value: 12, color: '#059669' },
    { label: 'Khác', value: 8, color: '#94A3B8' },
  ];

  // Donut geometry
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const donutSegments = useMemo(() => {
    let offset = 0;
    return composition.map((c) => {
      const length = (c.value / 100) * circumference;
      const seg = { ...c, dash: length, gap: circumference - length, offset };
      offset += length;
      return seg;
    });
  }, [circumference]);

  // ── Top consumed parts (top tiêu thụ tuần) ──
  const topConsumed = [
    { name: 'Dầu nhớt Castrol 5W-30', qty: 142, unit: 'bình', pct: 100 },
    { name: 'Lọc gió điều hòa Denso', qty: 88, unit: 'cái', pct: 62 },
    { name: 'Má phanh trước Toyota', qty: 64, unit: 'bộ', pct: 45 },
    { name: 'Bugi NGK Iridium', qty: 51, unit: 'cái', pct: 36 },
  ];

  // ── Recent activity (hoạt động gần đây) ──
  const activity = [
    { id: 'a1', type: 'in', text: 'Nhập 120 bình dầu Castrol 5W-30', ref: 'PN-2024-0512', time: '08:20' },
    { id: 'a2', type: 'out', text: 'Xuất 6 bộ má phanh Toyota', ref: 'PX-2024-0488', time: '09:05' },
    { id: 'a3', type: 'in', text: 'Nhập 40 lốp Michelin 205/55R16', ref: 'PN-2024-0513', time: '11:15' },
    { id: 'a4', type: 'out', text: 'Xuất 24 bugi NGK Iridium', ref: 'PX-2024-0490', time: '14:40' },
  ];

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">

      {/* HERO / WELCOME BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-[#00285E] text-white p-6 md:p-8 shadow-lg shadow-[#00285E]/20">
        {/* decorative shapes */}
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/5"></div>
        <div className="absolute right-20 -bottom-16 w-40 h-40 rounded-full bg-[#F9A11B]/10"></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center shrink-0">
              <Warehouse size={28} className="text-[#F9A11B]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-none mb-1.5">
                Tổng quan kho phụ tùng
              </h1>
              <p className="text-blue-100/80 text-sm">
                Trực quan hoá tình trạng tồn kho theo thời gian thực.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => showToast('Mở biểu mẫu nhập kho...', 'info')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#00285E] rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors shadow-sm"
            >
              <ArrowDownToLine size={16} />
              <span>Nhập kho</span>
            </button>
            <button
              onClick={() => showToast('Mở biểu mẫu xuất kho...', 'info')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 text-white border border-white/20 rounded-xl text-sm font-bold hover:bg-white/20 transition-colors"
            >
              <ArrowUpFromLine size={16} />
              <span>Xuất kho</span>
            </button>
          </div>
        </div>
      </div>

      {/* QUICK STAT STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.id}
            className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-3.5"
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${s.tint}`}>
              {s.icon}
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">{s.label}</span>
              <span className="text-xl font-bold text-slate-900 tracking-tight">{s.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ROW: ZONE CAPACITY (2/3) + COMPOSITION DONUT (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Zone capacity */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Sức chứa theo khu vực</h2>
              <p className="text-slate-400 text-xs mt-0.5">Tỷ lệ lấp đầy của từng khu trong kho</p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">5 khu</span>
          </div>

          <div className="space-y-5">
            {zones.map((z) => (
              <div key={z.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-slate-700">{z.name}</span>
                  <span className="text-xs font-semibold text-slate-400">
                    {z.used}/{z.total} ·{' '}
                    <span className={z.pct >= 95 ? 'text-rose-600 font-bold' : 'text-slate-600'}>{z.pct}%</span>
                    {z.pct >= 95 && <AlertTriangle size={11} className="inline ml-1 mb-0.5 text-rose-500" />}
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${z.pct}%` }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                    className={`h-full rounded-full ${zoneColor(z.pct)}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Composition donut */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-0.5">Cơ cấu tồn kho</h2>
          <p className="text-slate-400 text-xs mb-4">Phân bổ giá trị theo danh mục</p>

          <div className="relative flex items-center justify-center my-2">
            <svg viewBox="0 0 200 200" className="w-44 h-44 -rotate-90">
              {donutSegments.map((seg, i) => (
                <circle
                  key={seg.label}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={hoveredSlice === i ? 26 : 22}
                  strokeDasharray={`${seg.dash} ${seg.gap}`}
                  strokeDashoffset={-seg.offset}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredSlice(i)}
                  onMouseLeave={() => setHoveredSlice(null)}
                />
              ))}
            </svg>
            {/* center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {hoveredSlice !== null ? (
                <>
                  <span className="text-2xl font-bold text-slate-900">{composition[hoveredSlice].value}%</span>
                  <span className="text-xs font-semibold text-slate-400">{composition[hoveredSlice].label}</span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold text-slate-900">1,342</span>
                  <span className="text-xs font-semibold text-slate-400">Tổng SKU</span>
                </>
              )}
            </div>
          </div>

          {/* legend */}
          <div className="space-y-2 mt-3">
            {composition.map((c, i) => (
              <div
                key={c.label}
                onMouseEnter={() => setHoveredSlice(i)}
                onMouseLeave={() => setHoveredSlice(null)}
                className="flex items-center justify-between text-sm cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }}></span>
                  <span className={`font-semibold ${hoveredSlice === i ? 'text-slate-900' : 'text-slate-500'}`}>{c.label}</span>
                </div>
                <span className="font-bold text-slate-700">{c.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ROW: TOP CONSUMED (1/2) + RECENT ACTIVITY (1/2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top consumed */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Tiêu thụ nhiều nhất</h2>
              <p className="text-slate-400 text-xs mt-0.5">Phụ tùng xuất kho nhiều nhất tuần này</p>
            </div>
            <TrendingUp size={20} className="text-emerald-500" />
          </div>

          <div className="space-y-4">
            {topConsumed.map((item, i) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-slate-700 truncate">{item.name}</span>
                    <span className="text-xs font-bold text-slate-500 shrink-0 ml-2">{item.qty} {item.unit}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.pct}%` }}
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                      className="h-full bg-[#B8860B] rounded-full"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Hoạt động gần đây</h2>
              <p className="text-slate-400 text-xs mt-0.5">Phiếu nhập / xuất kho mới nhất</p>
            </div>
          </div>

          <div className="space-y-1.5 flex-1">
            {activity.map((a) => (
              <button
                key={a.id}
                onClick={() => showToast(`Chi tiết phiếu: ${a.ref}`, 'info')}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left group"
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    a.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-[#C27803]'
                  }`}
                >
                  {a.type === 'in' ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-slate-700 block truncate group-hover:text-[#00285E] transition-colors">
                    {a.text}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">{a.ref}</span>
                </div>
                <span className="text-xs font-bold text-slate-400 shrink-0">{a.time}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => showToast('Chuyển tới lịch sử luân chuyển kho...', 'info')}
            className="w-full mt-4 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-[#00285E] hover:bg-slate-50 rounded-xl transition-colors border border-slate-100"
          >
            Xem tất cả hoạt động
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
