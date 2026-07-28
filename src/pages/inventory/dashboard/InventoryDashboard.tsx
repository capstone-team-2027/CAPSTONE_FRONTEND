import { useState, useEffect } from 'react';
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
import { useFetchClient_v2 } from '../../../hook/useFetchClient';
import { INVENTORY_DASHBOARD_API_ENDPOINTS } from '../../../constants/inventory/dashboardApiEndpoint';
type OutletCtx = {
  searchQuery: string;
  showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
};

interface InventoryDashboardData {
  summary: {
    totalValue: number;
    totalSku: number;
    lowStockCount: number;
    transactionsToday: number;
    importsToday: number;
    exportsToday: number;
  };
  stockByCategory: Array<{ name: string; value: number }>;
  importExportTrend: {
    labels: string[];
    importQty: number[];
    exportQty: number[];
  };
  lowStock: Array<{ id: number; name: string; stock_quantity: number; min_threshold: number }>;
  recentTransactions: Array<{ receipt_code: string; type: string; quantity: number; unit_price: number; createdAt: string; part?: { name?: string; sku?: string } }>;
}

export default function InventoryDashboard() {
  const { showToast } = useOutletContext<OutletCtx>();
  const { fetchPrivate } = useFetchClient_v2();
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);
  const [dashboardData, setDashboardData] = useState<InventoryDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const response = await fetchPrivate(INVENTORY_DASHBOARD_API_ENDPOINTS.SUMMARY);
        setDashboardData(response.data);
      } catch (error) {
        console.error('Failed to load inventory dashboard data', error);
        showToast('Không thể tải dữ liệu kho', 'warning');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [fetchPrivate, showToast]);

  const stats = [
    { id: 'value', label: 'Giá trị tồn kho', value: `${(dashboardData?.summary?.totalValue || 0).toLocaleString('vi-VN')} VND`, icon: <Wallet size={18} />, tint: 'text-blue-600 bg-blue-50' },
    { id: 'sku', label: 'Tổng SKU', value: (dashboardData?.summary?.totalSku || 0).toLocaleString('vi-VN'), icon: <Boxes size={18} />, tint: 'text-[#00285E] bg-[#EDF3FF]' },
    { id: 'low', label: 'Sắp hết', value: (dashboardData?.summary?.lowStockCount || 0).toLocaleString('vi-VN'), icon: <AlertTriangle size={18} />, tint: 'text-[#F9A11B] bg-amber-50' },
    { id: 'util', label: 'Giao dịch hôm nay', value: (dashboardData?.summary?.transactionsToday || 0).toString(), icon: <Warehouse size={18} />, tint: 'text-emerald-600 bg-emerald-50' },
  ];

  const zoneColor = (pct: number) => {
    if (pct >= 95) return 'bg-rose-500';
    if (pct >= 80) return 'bg-[#F9A11B]';
    if (pct >= 60) return 'bg-[#0D9488]';
    return 'bg-[#3B82F6]';
  };

  const zones = [

    { name: 'Khu A', used: 82, total: 100, pct: 82 },
    { name: 'Khu B', used: 63, total: 80, pct: 79 },
    { name: 'Khu C', used: 94, total: 100, pct: 94 },
    { name: 'Khu D', used: 55, total: 70, pct: 79 },
    { name: 'Khu E', used: 98, total: 100, pct: 98 },
  ];

  const importExportTrend = dashboardData?.importExportTrend ?? { labels: [], importQty: [], exportQty: [] };
  const importExportMax = Math.max(...(importExportTrend.importQty || []), ...(importExportTrend.exportQty || []), 1);
  const radius = 70;
  const colors = ['#00285E', '#F9A11B', '#0D9488', '#3B82F6', '#8B5CF6', '#94A3B8'];

  const categoryProgress = (dashboardData?.stockByCategory || []).map((item, index) => {
    const total = (dashboardData?.stockByCategory || []).reduce((sum, r) => sum + r.value, 0);
    return {
      name: item.name,
      value: item.value,
      pct: total > 0 ? Math.round((item.value / total) * 100) : 0,
      color: colors[index % colors.length],
    };
  });

  const donutSegments = (() => {
    const total = categoryProgress.reduce((sum, item) => sum + item.value, 0);
    const circumference = 2 * Math.PI * radius;
    return categoryProgress.reduce(
      (acc, row) => {
        const length = (row.value / Math.max(total, 1)) * circumference;
        const segment = { ...row, dash: length, gap: circumference - length, offset: acc.offset };
        return {
          offset: acc.offset + length,
          items: [...acc.items, segment],
        };
      },
      { offset: 0, items: [] as Array<{ name: string; value: number; pct: number; color: string; dash: number; gap: number; offset: number }> }
    ).items;
  })();

  const topConsumed = (dashboardData?.lowStock || []).map((item) => ({
    name: item.name,
    qty: item.stock_quantity,
    unit: 'cái',
    pct: Math.round((item.stock_quantity / Math.max(item.min_threshold, 1)) * 100),
  }));

  const activity = (dashboardData?.recentTransactions || []).map((item, index) => ({
    id: `${item.receipt_code}-${index}`,
    type: item.type === 'IN' ? 'in' : 'out',
    text: `${item.type === 'IN' ? 'Nhập' : 'Xuất'} ${item.quantity} ${item.part?.name || 'phụ tùng'}`,
    ref: item.receipt_code,
    time: new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
  }));

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

      {loading && <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Đang tải dữ liệu kho...</div>}

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
          <p className="text-slate-400 text-xs mb-4">Phân bổ tồn kho theo danh mục</p>

          <div className="relative flex items-center justify-center my-2">
            <svg viewBox="0 0 200 200" className="w-44 h-44 -rotate-90">
              {donutSegments.map((seg, i) => (
                <circle
                  key={seg.name}
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
                  <span className="text-2xl font-bold text-slate-900">{categoryProgress[hoveredSlice].value}%</span>
                  <span className="text-xs font-semibold text-slate-400">{categoryProgress[hoveredSlice].name}</span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold text-slate-900">{dashboardData?.summary?.totalSku || 0}</span>
                  <span className="text-xs font-semibold text-slate-400">Tổng SKU</span>
                </>
              )}
            </div>
          </div>

          {/* legend */}
          <div className="space-y-3 mt-3">
            {categoryProgress.map((c, i) => (
              <div
                key={c.name}
                onMouseEnter={() => setHoveredSlice(i)}
                onMouseLeave={() => setHoveredSlice(null)}
                className="flex items-center justify-between text-sm cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }}></span>
                  <div>
                    <p className={`font-semibold ${hoveredSlice === i ? 'text-slate-900' : 'text-slate-500'}`}>{c.name}</p>
                    <p className="text-[11px] text-slate-400">{c.pct}% tổng tồn kho</p>
                  </div>
                </div>
                <span className="font-bold text-slate-700">{c.value.toLocaleString('vi-VN')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* IMPORT / EXPORT TREND */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Xu hướng nhập / xuất</h2>
            <p className="text-slate-400 text-xs">Số lượng phụ tùng vào ra theo từng ngày trong tuần</p>
          </div>
        </div>
        <div className="space-y-4">
          {importExportTrend.labels.map((label, idx) => (
            <div key={label} className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{label}</span>
                <span>{(importExportTrend.importQty[idx] || 0).toLocaleString('vi-VN')} / {(importExportTrend.exportQty[idx] || 0).toLocaleString('vi-VN')}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#0D9488]" style={{ width: `${((importExportTrend.importQty[idx] || 0) / importExportMax) * 100}%` }} />
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#F9A11B]" style={{ width: `${((importExportTrend.exportQty[idx] || 0) / importExportMax) * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
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
