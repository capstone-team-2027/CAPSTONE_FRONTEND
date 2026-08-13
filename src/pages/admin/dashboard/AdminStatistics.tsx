import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Download,
  Wrench,
  UserCheck,
  PieChart,
  Target,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Package,
  ShoppingCart,
  Layers,
  RefreshCw,
  Lightbulb,
  Sparkles,
  X,
  ChevronRight,
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useFetchClient_v2 as useFetchClient } from '../../../hook/useFetchClient';
import { STATISTICS_API_ENDPOINTS } from '../../../constants/admin/statisticsApiEndpoint';

interface ServiceStat {
  name: string;
  category: string;
  bookingCount: number;
  revenue: number;
  durationAvg: number; // minutes
}

const C = {
  ink: '#12161C',
  navy: '#10305A',
  orange: '#E2932E',
  green: '#3F7A5A',
  red: '#B8453B',
  paper: '#F6F4EF',
  purple: '#8B5CF6',
  blue: '#3B82F6',
  teal: '#0D9488',
};

const AiStamp = ({ label = 'AI · PHÂN TÍCH' }: { label?: string }) => (
  <span
    className="inline-flex items-center gap-1.5 border border-current px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em]"
    style={{ fontFamily: "'IBM Plex Mono', monospace", color: C.orange, transform: 'rotate(-1.5deg)' }}
  >
    {label}
  </span>
);

const SHOW_LEGACY_ADVANCED_ANALYSIS = false;

// Simple bold parser (replacing **text** with <strong>text</strong>)
const parseBoldText = (text: string) => {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i} className="font-bold text-slate-850 bg-amber-50/60 px-1 rounded-sm">{part}</strong>;
    }
    return part;
  });
};

const renderMarkdown = (text: string) => {
  if (!text) return null;
  const sections: Array<{ title: string; items: string[] }> = [];
  let currentSection: { title: string; items: string[] } | null = null;

  text.split('\n').forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;
    if (/^#{1,3}\s*/.test(line)) {
      currentSection = { title: line.replace(/^#{1,3}\s*/, ''), items: [] };
      sections.push(currentSection);
      return;
    }
    const content = line.replace(/^(?:-|\*)\s+/, '').trim();
    if (!currentSection) {
      currentSection = { title: 'Kết quả phân tích', items: [] };
      sections.push(currentSection);
    }
    currentSection.items.push(content);
  });

  const sectionTheme = (index: number) => [
    { border: 'border-blue-100', bg: 'bg-blue-50/40', iconBg: 'bg-blue-600', label: 'Tóm tắt', icon: <BarChart3 size={17} /> },
    { border: 'border-indigo-100', bg: 'bg-indigo-50/30', iconBg: 'bg-indigo-600', label: 'Ưu tiên', icon: <Target size={17} /> },
    { border: 'border-amber-100', bg: 'bg-amber-50/40', iconBg: 'bg-amber-500', label: 'Rủi ro', icon: <Lightbulb size={17} /> },
    { border: 'border-slate-200', bg: 'bg-slate-50', iconBg: 'bg-slate-600', label: 'Phân tích', icon: <Sparkles size={17} /> },
  ][Math.min(index, 3)];

  return (
    <div className="space-y-5">
      {sections.map((section, sectionIndex) => {
        const theme = sectionTheme(sectionIndex);
        const isActionSection = /hành động|ưu tiên|lộ trình/i.test(section.title);
        const actionGroups: Array<{ title: string; details: string[] }> = [];
        if (isActionSection) {
          section.items.forEach((item) => {
            if (/^\*\*\[?ưu tiên/i.test(item) || /^\[?ưu tiên\s*\d+/i.test(item)) {
              actionGroups.push({ title: item, details: [] });
            } else if (actionGroups.length > 0) {
              actionGroups[actionGroups.length - 1].details.push(item);
            } else {
              actionGroups.push({ title: item, details: [] });
            }
          });
        }
        return (
          <section key={`${section.title}-${sectionIndex}`} className={`overflow-hidden rounded-2xl border ${theme.border} bg-white`}>
            <div className={`flex items-center gap-3 border-b ${theme.border} ${theme.bg} px-5 py-4`}>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${theme.iconBg}`}>{theme.icon}</span>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">{theme.label}</p>
                <h3 className="mt-0.5 text-sm font-black text-slate-900">{section.title.replace(/^\d+\.\s*/, '')}</h3>
              </div>
            </div>

            <div className={`p-5 ${isActionSection ? 'space-y-4' : 'space-y-3'}`}>
              {isActionSection && actionGroups.map((action, actionIndex) => (
                <article key={`${action.title}-${actionIndex}`} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#00285E] text-xs font-black text-white">{actionIndex + 1}</span><h4 className="pt-1 text-sm font-black leading-snug text-slate-900">{parseBoldText(action.title.replace(/^\*\*|\*\*$/g, ''))}</h4></div>
                  <div className="grid gap-3 p-5 md:grid-cols-2">
                    {action.details.filter((detail) => !/^\*{0,2}(hạn hoàn thành|thời hạn)\*{0,2}\s*:/i.test(detail)).map((detail, detailIndex) => {
                      const separator = detail.indexOf(':');
                      const label = separator >= 0 ? detail.slice(0, separator).replace(/\*\*/g, '') : 'Chi tiết';
                      const value = separator >= 0 ? detail.slice(separator + 1).trim() : detail;
                      const isKpi = /KPI/i.test(label);
                      return <div key={detailIndex} className={`rounded-xl border p-3 ${isKpi ? 'border-emerald-100 bg-emerald-50/60' : 'border-slate-100 bg-slate-50/60'}`}><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1.5 text-[11px] font-medium leading-relaxed text-slate-700">{parseBoldText(value)}</p></div>;
                    })}
                  </div>
                </article>
              ))}
              {!isActionSection && section.items.map((item, itemIndex) => {
                return (
                  <div key={itemIndex} className="flex items-start gap-3 rounded-xl bg-slate-50/70 px-4 py-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${sectionIndex === 2 ? 'bg-amber-500' : sectionIndex === 0 ? 'bg-blue-500' : 'bg-indigo-500'}`} />
                    <p className="text-xs font-medium leading-relaxed text-slate-700">{parseBoldText(item)}</p>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};

const YearRevenueComparisonChart = ({ rows, currentYear, lastYear }: {
  rows: any[];
  currentYear: number;
  lastYear: number;
}) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  const points = (rows || [])
    .filter((row) => Number(row.month) <= currentMonth)
    .sort((a, b) => Number(a.month) - Number(b.month));

  if (!points.length) {
    return <p className="py-10 text-center text-xs font-semibold text-slate-400">Chưa có dữ liệu doanh thu theo tháng</p>;
  }

  const currentTotal = points.reduce((sum, row) => sum + Number(row.this_year_revenue || 0), 0);
  const lastTotal = points.reduce((sum, row) => sum + Number(row.last_year_revenue || 0), 0);
  const difference = currentTotal - lastTotal;
  const growthPct = lastTotal > 0 ? (difference / lastTotal) * 100 : null;
  const isPositive = difference >= 0;

  const formatMillion = (value: number, digits = 1) => `${(value / 1_000_000).toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })} triệu VND`;

  const width = Math.max(900, points.length * 112);
  const height = 330;
  const padding = { left: 68, right: 24, top: 38, bottom: 76 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxRevenue = Math.max(
    ...points.flatMap((row) => [Number(row.this_year_revenue || 0), Number(row.last_year_revenue || 0)]),
    1
  );
  const roundedMax = Math.ceil(maxRevenue / 5_000_000) * 5_000_000 || 5_000_000;
  const groupWidth = plotWidth / points.length;
  const barWidth = Math.min(30, groupWidth * 0.28);
  const x = (index: number) => padding.left + groupWidth * index + groupWidth / 2;
  const barY = (value: number) => padding.top + plotHeight - (value / roundedMax) * plotHeight;
  const barHeight = (value: number) => (value / roundedMax) * plotHeight;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Doanh thu {currentYear}</p>
          <p className="mt-1 text-xl font-black text-[#00285E]">{formatMillion(currentTotal)}</p>
          <p className="mt-1 text-[11px] text-slate-500">Từ tháng 1 đến {currentDay}/{currentMonth}/{currentYear}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Cùng khoảng thời gian năm {lastYear}</p>
          <p className="mt-1 text-xl font-black text-slate-800">{formatMillion(lastTotal)}</p>
          <p className="mt-1 text-[11px] text-slate-500">Cùng phạm vi tháng để đối chiếu</p>
        </div>
        <div className={`rounded-xl border p-4 ${isPositive ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'}`}>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>Chênh lệch doanh thu</p>
          <p className={`mt-1 text-xl font-black ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
            {isPositive ? '+' : '−'}{formatMillion(Math.abs(difference))}
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            {growthPct === null
              ? 'Khoảng thời gian năm trước chưa có doanh thu để tính tỷ lệ'
              : `${isPositive ? 'Tăng' : 'Giảm'} ${Math.abs(growthPct).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% so với cùng khoảng thời gian năm trước`}
          </p>
        </div>
      </div>

      <div className={`rounded-xl border px-4 py-3 text-xs font-semibold ${isPositive ? 'border-emerald-100 bg-emerald-50/50 text-emerald-900' : 'border-rose-100 bg-rose-50/50 text-rose-900'}`}>
        {isPositive ? '↗' : '↘'} Doanh thu từ tháng 1 đến {currentDay}/{currentMonth}/{currentYear} {isPositive ? 'cao hơn' : 'thấp hơn'} cùng khoảng thời gian năm {lastYear}{' '}
        <strong>{formatMillion(Math.abs(difference))}</strong>
        {growthPct !== null && <> ({isPositive ? '+' : '−'}{Math.abs(growthPct).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%)</>}.
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold text-slate-700">Doanh thu từng tháng</p>
          <p className="text-[11px] text-slate-400">Mỗi tháng có hai cột để so sánh trực tiếp · Đơn vị: triệu đồng</p>
        </div>
        <div className="flex flex-wrap gap-4 text-[11px] font-semibold text-slate-600" aria-label="Chú thích biểu đồ">
          <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-[#00285E]" />Năm {currentYear}</span>
          <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm border border-violet-300 bg-violet-200" />Năm {lastYear}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[760px] w-full" role="img" aria-label={`Biểu đồ cột so sánh doanh thu từng tháng năm ${currentYear} với năm ${lastYear}`}>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const gridY = padding.top + plotHeight * ratio;
            const value = roundedMax * (1 - ratio) / 1_000_000;
            return (
              <g key={ratio}>
                <line x1={padding.left} y1={gridY} x2={width - padding.right} y2={gridY} stroke="#E2E8F0" strokeWidth="1" />
                <text x={padding.left - 10} y={gridY + 4} textAnchor="end" fontSize="10" fill="#64748B">{value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}</text>
              </g>
            );
          })}
          {points.map((row, index) => (
            (() => {
              const thisValue = Number(row.this_year_revenue || 0);
              const lastValue = Number(row.last_year_revenue || 0);
              const monthDifference = thisValue - lastValue;
              const isCurrentIncompleteMonth = Number(row.month) === currentMonth;
              return (
                <g key={row.month}>
                  <rect
                    x={x(index) - barWidth - 3}
                    y={barY(thisValue)}
                    width={barWidth}
                    height={barHeight(thisValue)}
                    rx="4"
                    fill="#00285E"
                  >
                    <title>{`Tháng ${row.month}/${currentYear}: ${thisValue.toLocaleString('vi-VN')} VND`}</title>
                  </rect>
                  <rect
                    x={x(index) + 3}
                    y={barY(lastValue)}
                    width={barWidth}
                    height={barHeight(lastValue)}
                    rx="4"
                    fill="#DDD6FE"
                    stroke="#8B5CF6"
                    strokeWidth="1.5"
                  >
                    <title>{`Tháng ${row.month}/${lastYear}: ${lastValue.toLocaleString('vi-VN')} VND`}</title>
                  </rect>
                  {thisValue > 0 && (
                    <text x={x(index) - barWidth / 2 - 3} y={barY(thisValue) - 7} textAnchor="middle" fontSize="9" fontWeight="700" fill="#00285E">
                      {(thisValue / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                    </text>
                  )}
                  {lastValue > 0 && (
                    <text x={x(index) + barWidth / 2 + 3} y={barY(lastValue) - 7} textAnchor="middle" fontSize="9" fontWeight="700" fill="#7C3AED">
                      {(lastValue / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                    </text>
                  )}
                  <text x={x(index)} y={height - 47} textAnchor="middle" fontSize="11" fontWeight="700" fill="#475569">Tháng {row.month}</text>
                  <text
                    x={x(index)}
                    y={height - 28}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="700"
                    fill={monthDifference >= 0 ? '#047857' : '#BE123C'}
                  >
                    {monthDifference >= 0 ? '+' : '−'}{(Math.abs(monthDifference) / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu VND
                  </text>
                  {isCurrentIncompleteMonth && (
                    <text x={x(index)} y={height - 10} textAnchor="middle" fontSize="8" fontWeight="700" fill="#D97706">TÍNH ĐẾN {currentDay}/{currentMonth}</text>
                  )}
                </g>
              );
            })()
          ))}
        </svg>
      </div>
      <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
        <span aria-hidden="true">ⓘ</span>
        <p><strong>Tháng {currentMonth} chưa kết thúc:</strong> số liệu năm {currentYear} chỉ tính đến ngày {currentDay}/{currentMonth}. Không dùng tháng này để kết luận xu hướng cả tháng.</p>
      </div>
    </div>
  );
};

export default function AdminStatistics() {
  const viewMode: 'statistics' | 'ai' = 'statistics';
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  }>();
  const { fetchPrivate } = useFetchClient();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [isChartDragging, setIsChartDragging] = useState(false);
  const [isRevenueDetailOpen, setIsRevenueDetailOpen] = useState(false);
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const chartDragRef = useRef({ startX: 0, scrollLeft: 0 });

  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 29);
  const [startDate, setStartDate] = useState(() => formatLocalDate(sevenDaysAgo));
  const [endDate, setEndDate] = useState(() => formatLocalDate(today));
  const [basicDateRange, setBasicDateRange] = useState<'7_days' | '14_days' | '1_month' | 'custom'>('7_days');
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(() => formatLocalDate(sevenDaysAgo));
  const [customEndDate, setCustomEndDate] = useState(() => formatLocalDate(today));
  const [advancedStartDate, setAdvancedStartDate] = useState(() => formatLocalDate(thirtyDaysAgo));
  const [advancedEndDate, setAdvancedEndDate] = useState(() => formatLocalDate(today));

  // Tabs for basic vs advanced pandas analysis
  const [activeTab] = useState<'basic' | 'advanced'>(viewMode === 'ai' ? 'advanced' : 'basic');
  const [advancedView, setAdvancedView] = useState<'analysis' | 'plan'>('analysis');
  const [comparisonMode, setComparisonMode] = useState<'month_previous' | 'month_last_year' | 'year_last_year'>('month_previous');
  const [advancedData, setAdvancedData] = useState<any>(null);
  const [isAdvancedLoading, setIsAdvancedLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [planHorizon, setPlanHorizon] = useState<'1_month' | '3_months'>('1_month');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [seasonMonth, setSeasonMonth] = useState<string>('7');

  useEffect(() => {
    const fontId = 'admin-statistics-industrial-fonts';
    if (document.getElementById(fontId)) return;
    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap';
    document.head.appendChild(link);
  }, []);

  const analysisRange = useMemo(() => {
    return { startDate: advancedStartDate, endDate: advancedEndDate };
  }, [advancedStartDate, advancedEndDate]);

  const compareWithLastYear = comparisonMode === 'month_last_year'
    || comparisonMode === 'year_last_year';
  const currentPeriodLabel = 'Khoảng đang xem';
  const comparisonPeriodLabel = comparisonMode === 'month_previous'
    ? 'Khoảng trước đó'
    : 'Cùng khoảng thời gian năm trước';

  const aiSnapshot = useMemo(() => {
    const currentKpis = advancedData?.dashboard_stats?.kpis || {};
    const comparisonKpis = compareWithLastYear
      ? advancedData?.comparison_stats?.samePeriodLastYear?.kpis || {}
      : advancedData?.comparison_stats?.previousPeriod?.kpis || {};
    const currentRevenue = Number(currentKpis.totalRevenue ?? advancedData?.summary?.total_this_year ?? 0);
    const comparisonRevenue = Number(comparisonKpis.totalRevenue ?? (compareWithLastYear
      ? advancedData?.summary?.total_last_year
      : advancedData?.summary?.total_previous_period) ?? 0);
    const revenueDifference = currentRevenue - comparisonRevenue;
    const growthPct = comparisonRevenue > 0 ? (revenueDifference / comparisonRevenue) * 100 : null;
    const currentOrders = Number(currentKpis.totalOrders ?? advancedData?.summary?.this_year_orders ?? 0);
    const comparisonOrders = Number(comparisonKpis.totalOrders ?? (compareWithLastYear
      ? advancedData?.summary?.last_year_orders
      : advancedData?.summary?.previous_period_orders) ?? 0);
    const orderDifference = currentOrders - comparisonOrders;
    const orderGrowthPct = comparisonOrders > 0 ? (orderDifference / comparisonOrders) * 100 : null;
    const currentTicket = Number(currentKpis.avgRevenuePerOrder ?? advancedData?.summary?.this_year_avg_ticket ?? 0);
    const comparisonTicket = Number(comparisonKpis.avgRevenuePerOrder || 0);
    const ticketDifference = currentTicket - comparisonTicket;
    const ticketGrowthPct = comparisonTicket > 0 ? (ticketDifference / comparisonTicket) * 100 : null;
    const primaryDriver = Math.abs(orderGrowthPct || 0) >= Math.abs(ticketGrowthPct || 0) ? 'orders' : 'ticket';

    return {
      currentRevenue,
      comparisonRevenue,
      revenueDifference,
      growthPct,
      currentOrders,
      comparisonOrders,
      orderDifference,
      orderGrowthPct,
      currentTicket,
      comparisonTicket,
      ticketDifference,
      ticketGrowthPct,
      primaryDriver,
      activeCustomers: Number(currentKpis.activeCustomers || 0),
    };
  }, [advancedData, compareWithLastYear]);

  // Fetch stats from API
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const url = STATISTICS_API_ENDPOINTS.GET_STATS('custom', startDate, endDate);

      const res = await fetchPrivate(url);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        showToast('Không lấy được dữ liệu thống kê.', 'warning');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi tải dữ liệu thống kê.', 'warning');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, fetchPrivate, showToast]);

  const fetchAdvancedData = useCallback(async () => {
    try {
      setIsAdvancedLoading(true);
      const aiQuery = viewMode === 'ai' ? `&generateAi=true&planHorizon=${planHorizon}` : '';
      const advancedUrl = `${STATISTICS_API_ENDPOINTS.GET_ADVANCED}?timeframe=custom&startDate=${analysisRange.startDate}&endDate=${analysisRange.endDate}${aiQuery}`;
      const res = await fetchPrivate(advancedUrl);
      if (res.success && res.data) {
        setAdvancedData(res.data);
      } else {
        showToast('Không lấy được dữ liệu phân tích nâng cao.', 'warning');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi tải dữ liệu phân tích nâng cao.', 'warning');
    } finally {
      setIsAdvancedLoading(false);
    }
  }, [fetchPrivate, showToast, analysisRange.startDate, analysisRange.endDate, viewMode, planHorizon]);

  const fetchAiStrategy = useCallback(async () => {
    try {
      setIsAiLoading(true);
      const res = await fetchPrivate(
        `${STATISTICS_API_ENDPOINTS.GET_ADVANCED}?generateAi=true&timeframe=custom&startDate=${analysisRange.startDate}&endDate=${analysisRange.endDate}&planHorizon=${planHorizon}`
      );
      if (res.success && res.data) {
        setAdvancedData(res.data);
      } else {
        showToast('Không lấy được kế hoạch phân tích từ AI.', 'warning');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi kết nối với máy chủ AI.', 'warning');
    } finally {
      setIsAiLoading(false);
    }
  }, [fetchPrivate, showToast, analysisRange.startDate, analysisRange.endDate, planHorizon]);

  const handleAdvancedRefresh = () => {
    if (!advancedStartDate || !advancedEndDate) {
      showToast('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.', 'warning');
      return;
    }
    if (advancedStartDate > advancedEndDate) {
      showToast('Ngày bắt đầu không được lớn hơn ngày kết thúc.', 'warning');
      return;
    }
    fetchAdvancedData();
  };

  useEffect(() => {
    // A report is tied to its selected period; never reuse it for another range.
    setAdvancedData(null);
  }, [comparisonMode]);

  useEffect(() => {
    if (activeTab === 'basic') {
      if (startDate && endDate) {
        fetchData();
      }
    } else if (activeTab === 'advanced' && !advancedData) {
      fetchAdvancedData();
    }
  }, [fetchData, fetchAdvancedData, startDate, endDate, activeTab, advancedData]);

  // Dynamic calculations based on timeframe
  const currentData = useMemo(() => {
    if (!data?.revenueChart) {
      return { days: [], revenue: [], orders: [] };
    }
    return data.revenueChart;
  }, [data]);

  useEffect(() => {
    const container = chartScrollRef.current;
    if (!container || currentData.days.length <= 14) return;
    const firstActiveIndex = currentData.days.findIndex((_: string, index: number) =>
      Number(currentData.revenue[index] || 0) > 0 || Number(currentData.orders[index] || 0) > 0
    );
    if (firstActiveIndex < 0) {
      container.scrollLeft = 0;
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
      const pointRatio = currentData.days.length > 1 ? firstActiveIndex / (currentData.days.length - 1) : 0;
      const pointPosition = pointRatio * container.scrollWidth;
      container.scrollLeft = Math.min(maxScroll, Math.max(0, pointPosition - container.clientWidth * 0.15));
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [currentData]);

  const statsSummary = useMemo(() => {
    if (!data?.kpis) {
      return { totalRev: 0, totalOrd: 0, avgRevPerOrder: 0, activeCustomers: 0, completedAppointments: 0 };
    }
    return {
      totalRev: parseFloat(data.kpis.totalRevenue || 0),
      totalOrd: parseInt(data.kpis.totalOrders || 0, 10),
      avgRevPerOrder: parseFloat(data.kpis.avgRevenuePerOrder || 0),
      activeCustomers: parseInt(data.kpis.activeCustomers || 0, 10),
      completedAppointments: parseInt(data.kpis.completedAppointments || 0, 10)
    };
  }, [data]);

  const businessOverview = data?.businessOverview;
  const formatBusinessMoney = (value: unknown) => `${Math.round(Number(value || 0)).toLocaleString('vi-VN')} VND`;
  const formatBusinessChange = (changePct: number | null | undefined) => {
    if (changePct === null || changePct === undefined) return 'Khoảng trước đó chưa có dữ liệu để tính tỷ lệ';
    if (changePct === 0) return 'Không thay đổi so với khoảng trước đó';
    return `${changePct > 0 ? 'Tăng' : 'Giảm'} ${Math.abs(changePct).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% so với khoảng trước đó`;
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStartDate || !customEndDate) {
      showToast('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.', 'warning');
      return;
    }
    if (customStartDate > customEndDate) {
      showToast('Ngày bắt đầu không được lớn hơn ngày kết thúc.', 'warning');
      return;
    }
    setStartDate(customStartDate);
    setEndDate(customEndDate);
    setIsCustomDateOpen(false);
  };

  const handleBasicDateRangeChange = (value: '7_days' | '14_days' | '1_month' | 'custom') => {
    setBasicDateRange(value);
    if (value === 'custom') {
      setCustomStartDate(startDate);
      setCustomEndDate(endDate);
      setIsCustomDateOpen(true);
      return;
    }
    setIsCustomDateOpen(false);
    const rangeEnd = new Date();
    const rangeStart = new Date(rangeEnd);
    const days = value === '7_days' ? 7 : value === '14_days' ? 14 : 30;
    rangeStart.setDate(rangeEnd.getDate() - (days - 1));
    setStartDate(formatLocalDate(rangeStart));
    setEndDate(formatLocalDate(rangeEnd));
  };
  const formatDisplayDate = (value: string) => value
    ? new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN')
    : '--';
  const handleExport = () => {
    const headers = ['Mục tiêu thống kê', 'Giá trị'];
    const rows = [
      ['Khoảng ngày', `${businessOverview?.period?.startDate || startDate} đến ${businessOverview?.period?.endDate || endDate}`],
      ['Tiền khách đã thanh toán', formatBusinessMoney(statsSummary.totalRev)],
      ['Số đơn đã thanh toán', statsSummary.totalOrd.toString()],
      ['Tiền thu trung bình mỗi đơn', formatBusinessMoney(statsSummary.avgRevPerOrder)],
      ['Khách đã hoàn thành dịch vụ', statsSummary.activeCustomers.toLocaleString('vi-VN')],
      ['Tiền phân bổ cho dịch vụ', formatBusinessMoney(businessOverview?.revenueSources?.serviceRevenue)],
      ['Tiền phân bổ cho phụ tùng', formatBusinessMoney(businessOverview?.revenueSources?.partsRevenue)],
      ['Tiền chưa phân loại', formatBusinessMoney(businessOverview?.revenueSources?.unallocatedRevenue)],
      ['Giá trị phụ tùng nhập kho', formatBusinessMoney(businessOverview?.inventory?.importValue)],
      ['Lợi nhuận gộp', businessOverview?.profitability?.grossProfit == null ? 'Chưa đủ dữ liệu giá vốn để tính' : formatBusinessMoney(businessOverview.profitability.grossProfit)],
      ['Lợi nhuận ròng', businessOverview?.profitability?.netProfit == null ? 'Chưa đủ dữ liệu chi phí vận hành để tính' : formatBusinessMoney(businessOverview.profitability.netProfit)],
    ];

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bao-cao-thong-ke-gara-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast('Xuất báo cáo thống kê thành công!', 'success');
  };

  // SVGs Chart computations
  const chartHeight = 220;
  const isScrollableChart = currentData.days.length > 14;
  const chartWidth = isScrollableChart ? Math.max(600, currentData.days.length * 58) : 600;
  const padding = 40;
  const usableWidth = chartWidth - padding * 2;
  const usableHeight = chartHeight - padding * 2;

  const maxRevenueVal = Math.max(...currentData.revenue, 1);
  const maxOrdersVal = Math.max(...currentData.orders, 1);

  const points = currentData.days.map((day: string, idx: number) => {
    const x = padding + (currentData.days.length > 1 ? (idx / (currentData.days.length - 1)) * usableWidth : usableWidth / 2);
    const yRevenue = chartHeight - padding - ((currentData.revenue[idx] || 0) / maxRevenueVal) * usableHeight;
    const yOrders = chartHeight - padding - ((currentData.orders[idx] || 0) / maxOrdersVal) * usableHeight;
    return { x, yRevenue, yOrders, day, revenue: currentData.revenue[idx] || 0, order: currentData.orders[idx] || 0 };
  });

  // Keep long date ranges readable while preserving every point for hover/tooltips.
  const chartTickStep = isScrollableChart ? 1 : Math.max(1, Math.ceil(points.length / 7));
  const shouldShowChartTick = (index: number) =>
    index === 0 || index === points.length - 1 || index % chartTickStep === 0;

  const stopChartDragging = () => setIsChartDragging(false);

  const handleChartMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isScrollableChart || !chartScrollRef.current) return;
    setIsChartDragging(true);
    chartDragRef.current = {
      startX: event.clientX,
      scrollLeft: chartScrollRef.current.scrollLeft,
    };
  };

  const handleChartMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isChartDragging || !chartScrollRef.current) return;
    event.preventDefault();
    const distance = event.clientX - chartDragRef.current.startX;
    chartScrollRef.current.scrollLeft = chartDragRef.current.scrollLeft - distance;
    setHoveredPointIndex(null);
  };

  const getLinePath = (ptList: typeof points, type: 'revenue' | 'orders') => {
    let path = '';
    ptList.forEach((pt: (typeof points)[number], index: number) => {
      const y = type === 'revenue' ? pt.yRevenue : pt.yOrders;
      if (index === 0) {
        path += `M ${pt.x} ${y}`;
      } else {
        const prevPt = ptList[index - 1];
        const prevY = type === 'revenue' ? prevPt.yRevenue : prevPt.yOrders;
        const cpX1 = prevPt.x + (pt.x - prevPt.x) / 3;
        const cpY1 = prevY;
        const cpX2 = prevPt.x + 2 * (pt.x - prevPt.x) / 3;
        const cpY2 = y;
        path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${pt.x} ${y}`;
      }
    });
    return path;
  };

  const getAreaPath = (ptList: typeof points, type: 'revenue' | 'orders') => {
    if (ptList.length === 0) return '';
    const linePath = getLinePath(ptList, type);
    const firstX = ptList[0].x;
    const lastX = ptList[ptList.length - 1].x;
    const bottomY = chartHeight - padding;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  // The AI route does not load the basic dashboard endpoint. Do not block it
  // behind the basic page's loading state; its own section uses
  // isAdvancedLoading and displays the correct analysis loader/error state.
  if (viewMode === 'statistics' && isLoading && !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00285E]"></div>
        <p className="text-slate-500 text-sm mt-4 font-semibold">Đang tải dữ liệu thống kê...</p>
      </div>
    );
  }

  if (viewMode === 'ai') {
    const growingServices = (advancedData?.yoy_service_drivers?.growing || []).slice(0, 3);
    const decliningServices = (advancedData?.yoy_service_drivers?.declining || []).slice(0, 3);
    const importSuggestions = (advancedData?.ai_planner?.import_suggestions || []).slice(0, 3);
    const currentWorkflow = advancedData?.dashboard_stats?.businessOverview?.workflow || {};
    const operationalRisks = advancedData?.dashboard_stats?.businessOverview?.operationalRisks || {};
    const currentRevenue = Number(advancedData?.dashboard_stats?.kpis?.totalRevenue || advancedData?.summary?.total_this_year || 0);
    const currentOrders = Number(advancedData?.dashboard_stats?.kpis?.totalOrders || advancedData?.summary?.this_year_orders || 0);
    const averageTicket = Number(advancedData?.dashboard_stats?.kpis?.avgRevenuePerOrder || advancedData?.summary?.this_year_avg_ticket || 0);
    const growth = aiSnapshot.growthPct;
    const analysisText = currentOrders === 0
      ? 'Khoảng đang xem chưa có hóa đơn đã thanh toán nên chưa đủ cơ sở kết luận xu hướng doanh thu.'
      : `${growth === null ? 'Chưa có dữ liệu ở khoảng đối chiếu.' : `Doanh thu ${growth >= 0 ? 'tăng' : 'giảm'} ${Math.abs(growth).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% so với khoảng trước.`} Gara ghi nhận ${currentOrders} hóa đơn, trung bình ${formatBusinessMoney(averageTicket)} mỗi hóa đơn.`;
    return (
      <div className="mx-auto w-full max-w-5xl flex-1 space-y-5 p-4 md:p-8">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-gradient-to-r from-[#00285E] to-[#06478f] p-6 text-white">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">✨ AI phân tích hoạt động gara</p><h1 className="mt-2 text-2xl font-black">AI phân tích hệ thống</h1><p className="mt-1 text-xs text-blue-100">Dữ liệu {analysisRange.startDate} → {analysisRange.endDate}</p></div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={Math.round((new Date(advancedEndDate).getTime() - new Date(advancedStartDate).getTime()) / 86400000) + 1 <= 7 ? '7' : Math.round((new Date(advancedEndDate).getTime() - new Date(advancedStartDate).getTime()) / 86400000) + 1 <= 30 ? '30' : '90'}
                  onChange={(event) => { const rangeEnd = new Date(); const rangeStart = new Date(rangeEnd); rangeStart.setDate(rangeEnd.getDate() - (Number(event.target.value) - 1)); setAdvancedStartDate(formatLocalDate(rangeStart)); setAdvancedEndDate(formatLocalDate(rangeEnd)); }}
                  className="rounded-xl border border-white/20 bg-white px-4 py-2.5 text-xs font-black text-[#00285E] outline-none"
                ><option value="7">7 ngày gần nhất</option><option value="30">30 ngày gần nhất</option><option value="90">90 ngày gần nhất</option></select>
                <button onClick={handleAdvancedRefresh} disabled={isAdvancedLoading} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-black text-[#00285E] disabled:opacity-60"><Sparkles size={15} />{isAdvancedLoading ? 'Đang phân tích...' : 'Phân tích'}</button>
              </div>
            </div>
          </div>

          {isAdvancedLoading ? <div className="flex min-h-[420px] flex-col items-center justify-center"><RefreshCw className="animate-spin text-blue-700" size={30} /><p className="mt-3 text-sm font-bold text-slate-600">Đang đọc dữ liệu hoạt động...</p></div> : advancedData ? (
            <div className="divide-y divide-slate-200">
              <section className="p-6">
                <div><h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-800">📈 Xu hướng nổi bật</h2><p className="mt-1 text-[10px] text-slate-500">So sánh tiền dịch vụ giữa khoảng đang xem và khoảng đối chiếu.</p></div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {[...growingServices.map((item: any) => ({ ...item, direction: 'up' })), ...decliningServices.map((item: any) => ({ ...item, direction: 'down' }))].map((item: any) => {
                    const currentValue = Number(item.this_year_rev || 0);
                    const difference = Number(item.growth_amount || 0);
                    const previousValue = currentValue - difference;
                    const percent = previousValue > 0 ? (difference / previousValue) * 100 : null;
                    const isIncrease = difference >= 0;
                    return (
                      <div key={`${item.direction}-${item.service_name}`} className={`rounded-2xl border p-4 ${isIncrease ? 'border-emerald-100 bg-emerald-50/40' : 'border-rose-100 bg-rose-50/40'}`}>
                        <div className="flex items-start justify-between gap-3"><p className="text-xs font-black text-slate-800">{item.service_name}</p><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${isIncrease ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{isIncrease ? '↑ Tăng' : '↓ Giảm'} {percent === null ? 'phát sinh mới' : `${Math.abs(percent).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`}</span></div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-[10px]"><div><p className="text-slate-400">Doanh thu khoản thời gian trước đó</p><p className="mt-1 font-bold text-slate-700">{formatBusinessMoney(Math.max(0, previousValue))}</p></div><div><p className="text-slate-400">Doanh thu khoản thời gian hiện tại</p><p className="mt-1 font-black text-slate-900">{formatBusinessMoney(currentValue)}</p></div></div>
                        <p className={`mt-3 border-t pt-3 text-[10px] font-bold ${isIncrease ? 'border-emerald-100 text-emerald-700' : 'border-rose-100 text-rose-700'}`}>{isIncrease ? 'Tăng thêm' : 'Giảm đi'} {formatBusinessMoney(Math.abs(difference))}</p>
                      </div>
                    );
                  })}
                  {growingServices.length + decliningServices.length === 0 && <p className="text-xs text-slate-500">Chưa có dịch vụ đủ dữ liệu để so sánh xu hướng.</p>}
                </div>
              </section>

              <section className="p-6">
                <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-800">⚠️ Vấn đề phát hiện</h2>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4"><p className="text-[10px] font-black uppercase text-amber-700">Công việc đang tồn</p><div className="mt-3 space-y-2 text-xs text-slate-700"><p>• {Number(operationalRisks?.tasks?.pending || 0)} task đang chờ thực hiện</p><p>• {Number(operationalRisks?.tasks?.inProgress || 0)} task đang thực hiện</p><p>• {Number(operationalRisks?.tasks?.waitingParts || 0)} task đang chờ linh kiện</p><p className={Number(operationalRisks?.tasks?.unassigned || 0) > 0 ? 'font-bold text-rose-700' : ''}>• {Number(operationalRisks?.tasks?.unassigned || 0)} task chưa phân công</p></div></div>
                  <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4"><p className="text-[10px] font-black uppercase text-violet-700">Khối lượng kỹ thuật viên</p><p className="mt-1 text-[10px] text-slate-500">Trung bình đội: {Number(operationalRisks?.workload?.teamAverage || 0).toLocaleString('vi-VN')} task đang hoạt động/người</p><div className="mt-3 space-y-2">{(operationalRisks?.workload?.technicians || []).map((tech: any) => <div key={tech.technicianId} className="flex items-center justify-between gap-2 text-xs"><span className="truncate text-slate-700">{tech.name}</span><span className={`whitespace-nowrap font-black ${tech.aboveTeamAverage ? 'text-rose-600' : 'text-violet-700'}`}>{tech.activeTasks} task{tech.aboveTeamAverage ? ' · Cao hơn TB' : ''}</span></div>)}{(operationalRisks?.workload?.technicians || []).length === 0 && <p className="text-xs text-slate-500">Chưa có dữ liệu phân công.</p>}</div></div>
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4"><p className="text-[10px] font-black uppercase text-blue-700">Sức đủ của tồn kho</p><p className="mt-1 text-[9px] leading-relaxed text-slate-500">Dự báo theo tốc độ xuất kho: nhu cầu 30 ngày + tồn tối thiểu − tồn hiện tại.</p><div className="mt-3 space-y-3">{(operationalRisks?.inventoryForecast || []).slice(0, 4).map((part: any) => <div key={part.partId} className="border-b border-blue-100 pb-2 last:border-0"><div className="flex justify-between gap-2 text-xs"><span className="font-bold text-slate-700">{part.name}</span><span className={part.projectedShortage > 0 ? 'font-black text-rose-600' : 'font-black text-emerald-600'}>{part.projectedShortage > 0 ? `Thiếu dự kiến ${part.projectedShortage}` : 'Đủ theo đà dùng'}</span></div><p className="mt-1 text-[10px] text-slate-500">Đã xuất {part.consumedQuantity} trong {part.analysisDays} ngày ({Number(part.dailyUsage || 0).toLocaleString('vi-VN')} sp/ngày) · Tồn {part.stock} · Tồn tối thiểu {part.minimumStock}</p><p className="mt-1 text-[10px] font-semibold text-slate-600">30 ngày cần {part.projected30Days} + giữ tối thiểu {part.minimumStock} = cần có {part.requiredWithSafetyStock}; hiện có {part.stock}{part.coverageDays !== null ? ` · đủ khoảng ${part.coverageDays} ngày` : ''}</p></div>)}{(operationalRisks?.inventoryForecast || []).length === 0 && <p className="text-xs text-slate-500">Chưa có lượt xuất kho để dự báo.</p>}</div></div>
                </div>
              </section>

              <section className="bg-blue-50/50 p-6"><h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-blue-900">🔍 AI phân tích</h2><p className="mt-4 text-sm leading-7 text-slate-700">{analysisText}</p><div className="mt-4 flex flex-wrap gap-2"><span className="rounded-lg bg-white px-3 py-2 text-[10px] font-bold text-blue-700">Doanh thu: {formatBusinessMoney(currentRevenue)}</span><span className="rounded-lg bg-white px-3 py-2 text-[10px] font-bold text-blue-700">Hóa đơn: {currentOrders}</span><span className="rounded-lg bg-white px-3 py-2 text-[10px] font-bold text-blue-700">Trung bình: {formatBusinessMoney(averageTicket)}</span></div></section>

              <section className="p-6"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white"><Sparkles size={18} /></span><div><h2 className="text-sm font-black uppercase tracking-wider text-slate-800">Kế hoạch hành động do AI đánh giá</h2><p className="mt-1 text-[10px] text-slate-500">Python tổng hợp dữ liệu hệ thống; Gemini đánh giá và lập kế hoạch chỉ từ các số liệu đã cung cấp.</p></div></div>{advancedData?.gemini_insights ? <div className="mt-5">{renderMarkdown(advancedData.gemini_insights)}</div> : <p className="mt-5 text-xs text-slate-500">Chưa nhận được kế hoạch AI cho khoảng đang xem.</p>}</section>
            </div>
          ) : <div className="flex min-h-[360px] flex-col items-center justify-center p-8"><p className="text-sm font-bold text-slate-700">Không tải được dữ liệu phân tích</p><button onClick={handleAdvancedRefresh} className="mt-4 rounded-xl bg-[#00285E] px-4 py-2 text-xs font-bold text-white">Thử lại</button></div>}
        </section>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2 flex items-center gap-2">
            <BarChart3 className="text-amber-500" size={28} />
            {viewMode === 'ai' ? 'AI phân tích hệ thống' : 'Báo cáo & Thống kê Hoạt động'}
          </h1>
          <p className="text-slate-500 text-sm">
            {viewMode === 'ai'
              ? 'Phân tích biến động doanh thu, phát hiện điểm cần chú ý và xây dựng kế hoạch vận hành.'
              : 'Xem báo cáo thống kê doanh thu, khách hàng, hiệu suất dịch vụ và năng suất nhân viên.'}
          </p>
        </div>
        {activeTab === 'basic' && (
          <div className="relative z-30 shrink-0">
            <div className="flex items-center gap-3">
              <label htmlFor="basic-date-range" className="text-xs font-bold text-slate-500">Khoảng thời gian:</label>
              <select
                id="basic-date-range"
                value={basicDateRange}
                onChange={(event) => handleBasicDateRangeChange(event.target.value as '7_days' | '14_days' | '1_month' | 'custom')}
                className="min-w-[160px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              >
                <option value="7_days">7 ngày gần nhất</option>
                <option value="14_days">14 ngày gần nhất</option>
                <option value="1_month">1 tháng gần nhất</option>
                <option value="custom">Tùy chọn ngày</option>
              </select>
            </div>
            {basicDateRange === 'custom' && !isCustomDateOpen && (
              <button type="button" onClick={() => setIsCustomDateOpen(true)} className="ml-auto mt-1 block text-[10px] font-bold text-blue-700 hover:text-blue-900">
                {formatDisplayDate(startDate)} → {formatDisplayDate(endDate)} · Chỉnh sửa
              </button>
            )}
            {basicDateRange === 'custom' && isCustomDateOpen && (
              <form onSubmit={handleFilterSubmit} className="absolute right-0 top-full mt-2 w-[290px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] font-bold text-slate-500">Từ ngày<input type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} max={customEndDate} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-100" /></label>
                  <label className="text-[10px] font-bold text-slate-500">Đến ngày<input type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} min={customStartDate} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-100" /></label>
                </div>
                <button type="submit" className="mt-3 w-full rounded-lg bg-[#F9A11B] px-3 py-2 text-[10px] font-black text-[#00285E] transition-colors hover:bg-[#E08F12]">Áp dụng khoảng ngày</button>
              </form>
            )}
          </div>
        )}
      </div>
      {activeTab === 'basic' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                label: 'Tiền khách đã thanh toán',
                value: formatBusinessMoney(statsSummary.totalRev),
                icon: <TrendingUp size={22} />, color: C.green, bg: '#D1FAE5',
                change: formatBusinessChange(businessOverview?.comparisons?.revenue?.changePct),
                purpose: 'Tổng tiền khách đã thanh toán cho các phiếu dịch vụ trong khoảng ngày đã chọn.'
              },
              {
                label: 'Đã tiếp nhận',
                value: Number(businessOverview?.workflow?.received || 0).toLocaleString('vi-VN'),
                icon: <Wrench size={22} />, color: C.navy, bg: '#EFF6FF',
                change: 'Chờ kiểm tra hoặc lập báo giá',
                purpose: 'Số phiếu đã tiếp nhận nhưng chưa bắt đầu sửa chữa.'
              },
              {
                label: 'Đang sửa chữa ',
                value: Number(businessOverview?.workflow?.repairing || 0).toLocaleString('vi-VN'),
                icon: <Target size={22} />, color: C.purple, bg: '#EDE9FE',
                change: 'Đang thực hiện hoặc chờ linh kiện',
                purpose: 'Số phiếu đang trong quá trình sửa chữa tại gara.'
              },
              {
                label: 'Đã hoàn thành',
                value: Number(businessOverview?.workflow?.completed || 0).toLocaleString('vi-VN'),
                icon: <Users size={22} />, color: C.orange, bg: '#FEF3C7',
                change: 'Đã sửa xong hoặc đã giao xe',
                purpose: 'Tổng số phiếu đã hoàn tất trong hệ thống ở trạng thái hiện tại.'
              },
            ].map((card, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{card.label}</span>
                    <span className="text-xl font-bold text-slate-900 tracking-tight block">{card.value}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.bg, color: card.color }}>
                    {card.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>


          {/* CHARTS ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue SVG Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 tracking-tight">Xu hướng doanh thu & Lượt dịch vụ</h2>
                  <p className="text-slate-400 text-xs">Biểu diễn tổng doanh thu (triệu VND) và số đơn hàng theo mốc thời gian</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: C.navy }} /> Doanh thu
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: C.orange }} /> Đơn hàng
                  </span>
                </div>
              </div>

              {isScrollableChart && (
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                  <span>↔</span> Giữ chuột và kéo để xem các ngày khác
                </div>
              )}
              <div
                ref={chartScrollRef}
                className={`flex-1 w-full overflow-x-auto overflow-y-hidden pb-2 ${isScrollableChart
                  ? isChartDragging ? 'cursor-grabbing' : 'cursor-grab'
                  : ''}`}
                onMouseDown={handleChartMouseDown}
                onMouseMove={handleChartMouseMove}
                onMouseUp={stopChartDragging}
                onMouseLeave={stopChartDragging}
              >
                <div
                  className="flex items-center justify-center py-4 relative min-h-[220px]"
                  style={{ width: isScrollableChart ? `${chartWidth}px` : '100%' }}
                >
                  {/* Gridlines */}
                  <div className="absolute inset-0 flex flex-col justify-between py-10 pointer-events-none opacity-20">
                    <div className="w-full h-[1px] bg-slate-400" />
                    <div className="w-full h-[1px] bg-slate-400" />
                    <div className="w-full h-[1px] bg-slate-400" />
                    <div className="w-full h-[1px] bg-slate-400" />
                  </div>

                  {hoveredPointIndex !== null && points[hoveredPointIndex] && (
                    <div
                      className="absolute z-20 pointer-events-none min-w-[170px] rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur-sm"
                      style={{
                        left: `${(points[hoveredPointIndex].x / chartWidth) * 100}%`,
                        top: '8px',
                        transform: hoveredPointIndex === 0
                          ? 'translateX(0)'
                          : hoveredPointIndex === points.length - 1
                            ? 'translateX(-100%)'
                            : 'translateX(-50%)',
                      }}
                    >
                      <div className="mb-2 text-xs font-bold text-slate-800">
                        {points[hoveredPointIndex].day}
                      </div>
                      <div className="space-y-1.5 text-[11px] font-semibold">
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: C.navy }} />
                            Doanh thu
                          </span>
                          <span className="font-bold text-[#00285E]">
                            {(points[hoveredPointIndex].revenue * 1_000_000).toLocaleString('vi-VN')} VND
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: C.orange }} />
                            Lượt dịch vụ
                          </span>
                          <span className="font-bold text-amber-600">
                            {points[hoveredPointIndex].order.toLocaleString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full h-full max-h-[240px] select-none"
                    onMouseLeave={() => setHoveredPointIndex(null)}
                  >
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.navy} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={C.navy} stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorOrd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.orange} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={C.orange} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>

                    {/* Area fills */}
                    {points.length > 0 && (
                      <>
                        <path d={getAreaPath(points, 'revenue')} fill="url(#colorRev)" />
                        <path d={getAreaPath(points, 'orders')} fill="url(#colorOrd)" />
                      </>
                    )}

                    {/* Grid Lines */}
                    {points.map((pt: (typeof points)[number], i: number) => shouldShowChartTick(i) && (
                      <line
                        key={`grid-${i}`}
                        x1={pt.x}
                        y1={padding}
                        x2={pt.x}
                        y2={chartHeight - padding}
                        stroke={hoveredPointIndex === i ? C.blue : '#E2E8F0'}
                        strokeWidth={hoveredPointIndex === i ? 1.5 : 1}
                        strokeDasharray="4 4"
                      />
                    ))}

                    {/* Line paths */}
                    {points.length > 0 && (
                      <>
                        <path d={getLinePath(points, 'revenue')} fill="none" stroke={C.navy} strokeWidth={3.5} strokeLinecap="round" />
                        <path d={getLinePath(points, 'orders')} fill="none" stroke={C.orange} strokeWidth={2.5} strokeLinecap="round" />
                      </>
                    )}

                    {/* Data circles */}
                    {points.map((pt: (typeof points)[number], index: number) => (
                      <g key={index}>
                        {(pt.revenue > 0 || hoveredPointIndex === index) && (
                          <circle cx={pt.x} cy={pt.yRevenue} r={hoveredPointIndex === index ? 6 : 4} fill={C.navy} stroke="#FFFFFF" strokeWidth={2} />
                        )}
                        {(pt.order > 0 || hoveredPointIndex === index) && (
                          <circle cx={pt.x} cy={pt.yOrders} r={hoveredPointIndex === index ? 6 : 4} fill={C.orange} stroke="#FFFFFF" strokeWidth={2} />
                        )}
                      </g>
                    ))}

                    {/* Wide invisible hover zones make every data point easy to target. */}
                    {points.map((pt: (typeof points)[number], index: number) => {
                      const previousX = points[index - 1]?.x ?? padding;
                      const nextX = points[index + 1]?.x ?? chartWidth - padding;
                      const left = index === 0 ? padding : (previousX + pt.x) / 2;
                      const right = index === points.length - 1 ? chartWidth - padding : (pt.x + nextX) / 2;
                      return (
                        <rect
                          key={`hover-${index}`}
                          x={left}
                          y={padding}
                          width={Math.max(right - left, 1)}
                          height={usableHeight}
                          fill="transparent"
                          className={isScrollableChart
                            ? isChartDragging ? 'cursor-grabbing' : 'cursor-grab'
                            : 'cursor-crosshair'}
                          onMouseEnter={() => setHoveredPointIndex(index)}
                          onMouseMove={() => setHoveredPointIndex(index)}
                        />
                      );
                    })}

                    {/* X-axis labels */}
                    {points.map((pt: (typeof points)[number], i: number) => shouldShowChartTick(i) && (
                      <text key={i} x={pt.x} y={chartHeight - 12} textAnchor="middle" fill="#94A3B8" fontSize={11} fontWeight="600">
                        {pt.day}
                      </text>
                    ))}
                  </svg>
                </div>
              </div>
            </div>

            {/* Breakdown Donut stats */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-4">Thanh toán & Trạng thái dịch vụ</h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {([
                    {
                      title: 'Trạng thái thanh toán',
                      centerLabel: 'hóa đơn',
                      items: [
                        { label: 'Đã thanh toán', value: Number((businessOverview?.paymentStatuses || []).find((item: any) => item.status === 'PAID')?.count || 0), color: C.green },
                        { label: 'Chưa thanh toán', value: Number((businessOverview?.paymentStatuses || []).find((item: any) => item.status === 'PENDING')?.count || 0), color: C.red },
                        { label: 'Đã cọc, chờ trả đủ', value: Number((businessOverview?.paymentStatuses || []).find((item: any) => item.status === 'DEPOSITED')?.count || 0), color: C.orange },
                      ],
                    },
                    {
                      title: 'Trạng thái dịch vụ',
                      centerLabel: 'lịch hẹn',
                      items: [
                        { label: 'Hoàn thành', value: Number(data?.appointmentsBreakdown?.completed || 0), color: C.green },
                        { label: 'Đang xử lý', value: Number(data?.appointmentsBreakdown?.pending || 0), color: C.orange },
                        { label: 'Đã hủy', value: Number(data?.appointmentsBreakdown?.cancelled || 0), color: C.red },
                      ],
                    },
                  ]).map((chart) => {
                    const total = chart.items.reduce((sum, item) => sum + item.value, 0);
                    let accumulated = 0;
                    const segments = chart.items.map((item) => {
                      const start = total > 0 ? (accumulated / total) * 360 : 0;
                      accumulated += item.value;
                      const end = total > 0 ? (accumulated / total) * 360 : 0;
                      return `${item.color} ${start}deg ${end}deg`;
                    });
                    const background = total > 0 ? `conic-gradient(${segments.join(', ')})` : '#E2E8F0';
                    return (
                      <div key={chart.title} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                        <p className="text-center text-[10px] font-black uppercase tracking-wider text-slate-500">{chart.title}</p>
                        <div className="relative mx-auto mt-4 h-32 w-32 rounded-full" style={{ background }}>
                          <div className="absolute inset-[18px] flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
                            <strong className="text-2xl font-black text-slate-900">{total}</strong>
                            <span className="text-[9px] font-bold text-slate-400">{chart.centerLabel}</span>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          {chart.items.map((item) => {
                            const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
                            return (
                              <div key={item.label} className="flex items-center justify-between gap-2 text-[10px]">
                                <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-600"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span>
                                <strong className="whitespace-nowrap text-slate-800">{item.value} ({percentage}%)</strong>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-stretch">
            <div className="min-w-0 rounded-2xl border border-slate-200/70 bg-white p-6 shadow-xs">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-600">Phụ tùng tạo doanh thu</p>
                  <h2 className="mt-1 text-lg font-black text-slate-900">Phụ tùng nào được tiêu thụ nhiều?</h2>
                  <p className="mt-1 text-[11px] text-slate-500">Dùng để quyết định nhập hàng và xác định phụ tùng mang về nhiều tiền; chưa thể hiện lãi vì thiếu giá vốn lô đã xuất.</p>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">Sắp xếp theo tiền thu được phân bổ</span>
              </div>
              <div className="mt-5 w-full overflow-hidden">
                <table className="w-full table-fixed text-left text-xs">
                  <thead><tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="w-[38%] px-3 py-3">Phụ tùng</th><th className="w-[16%] px-2 py-3 text-center">Số lượng</th><th className="w-[18%] px-2 py-3 text-center">Số đơn</th><th className="w-[28%] px-3 py-3 text-right">Tiền thu</th>
                  </tr></thead>
                  <tbody>
                    {(businessOverview?.topPaidParts || []).map((part: any) => (
                      <tr key={part.name} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                        <td className="break-words px-3 py-3 font-bold text-slate-800">{part.name}</td>
                        <td className="px-2 py-3 text-center font-bold text-amber-700">{Number(part.quantity || 0).toLocaleString('vi-VN')}</td>
                        <td className="px-2 py-3 text-center text-slate-600">{Number(part.orderCount || 0).toLocaleString('vi-VN')}</td>
                        <td className="break-words px-3 py-3 text-right font-black text-[#00285E]">{formatBusinessMoney(part.revenue)}</td>
                      </tr>
                    ))}
                    {(businessOverview?.topPaidParts || []).length === 0 && <tr><td colSpan={4} className="py-8 text-center text-slate-400">Không có phụ tùng thuộc các đơn đã thanh toán trong khoảng này</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Service stats Table */}
            <div className="min-w-0 bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                  <PieChart size={18} className="text-[#00285E]" /> Dịch vụ tạo doanh thu
                </h2>
                <span className="text-xs text-slate-400 font-semibold">Theo tiền thực thu được phân bổ</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                      <th className="py-2.5 px-3">Tên dịch vụ</th>
                      <th className="py-2.5 px-3">Danh mục</th>
                      <th className="py-2.5 px-3 text-center">Số đơn</th>
                      <th className="py-2.5 px-3 text-right">Tiền thu phân bổ</th>
                      <th className="py-2.5 px-3 text-center">Thời gian TB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(businessOverview?.topPaidServices || []).map((s: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-semibold text-slate-800">{s.name}</td>
                        <td className="py-3 px-3 text-slate-400 font-semibold">{s.category}</td>
                        <td className="py-3 px-3 text-center font-bold text-slate-700">{s.orderCount} đơn</td>
                        <td className="py-3 px-3 text-right font-bold text-[#00285E]">{formatBusinessMoney(s.revenue)}</td>
                        <td className="py-3 px-3 text-center font-semibold text-slate-600">{s.durationAvg} phút</td>
                      </tr>
                    ))}
                    {(businessOverview?.topPaidServices || []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-slate-400 font-medium">Không có dữ liệu dịch vụ</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top customers by paid service orders */}

          </div>
        </>
      )}

      {activeTab === 'advanced' && advancedView === 'plan' && (
        <div className="space-y-5">
          <div className="bg-gradient-to-r from-indigo-700 to-[#00285E] p-5 rounded-2xl text-white flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2"><Sparkles size={19} /> Kế hoạch vận hành {planHorizon === '1_month' ? '1 tháng' : '3 tháng'}</h2>
              <p className="text-xs text-indigo-100 mt-1">Lộ trình cụ thể theo thời gian, có căn cứ, KPI, người phụ trách đề xuất và điều kiện điều chỉnh.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex rounded-xl border border-white/20 bg-white/10 p-1">
                {([
                  { value: '1_month', label: '1 tháng' },
                  { value: '3_months', label: '3 tháng' },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setPlanHorizon(option.value)}
                    className={`rounded-lg px-3.5 py-2 text-xs font-bold transition ${planHorizon === option.value ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-100 hover:bg-white/10'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button
                onClick={fetchAiStrategy}
                disabled={isAiLoading}
                className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-black text-[#00285E] hover:bg-amber-300 disabled:opacity-60"
              >
                <RefreshCw size={14} className={isAiLoading ? 'animate-spin' : ''} /> Tạo lại kế hoạch
              </button>
              <button
                onClick={() => setAdvancedView('analysis')}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold"
              >
                ← Quay lại phân tích
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-indigo-100 p-6 min-h-[320px]">
            {isAiLoading ? (
              <div className="min-h-[270px] flex flex-col items-center justify-center">
                <Sparkles size={30} className="text-indigo-600 animate-pulse" />
                <p className="text-sm font-bold text-slate-700 mt-3">Đang xây dựng kế hoạch...</p>
                <p className="text-xs text-slate-400 mt-1">AI đang xây mục tiêu, lộ trình, KPI và điều kiện điều chỉnh cho {planHorizon === '1_month' ? '4 tuần' : '3 tháng'}.</p>
              </div>
            ) : advancedData?.gemini_insights ? (
              <div className="space-y-5">
                {advancedData.weather_context && (
                  <div className="flex flex-col gap-4 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-blue-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-xl text-white">☔</span>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-sky-700">Ngữ cảnh kế hoạch · Đà Nẵng</p>
                        <p className="mt-1 text-xs font-bold text-slate-800">Dự báo {advancedData.weather_context.startDate} → {advancedData.weather_context.endDate}</p>
                        <p className="mt-1 text-[10px] text-slate-500">Nguồn: {advancedData.weather_context.source} · Dự báo chỉ hỗ trợ lập kế hoạch, không chứng minh nguyên nhân doanh thu.</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-xl bg-white px-3 py-2 text-[10px] font-bold text-sky-700 shadow-xs">Mưa: {advancedData.weather_context.rainyDays}/{advancedData.weather_context.totalDays} ngày</span>
                      <span className="rounded-xl bg-white px-3 py-2 text-[10px] font-bold text-blue-700 shadow-xs">Lượng mưa: {advancedData.weather_context.totalRainMm} mm</span>
                      <span className="rounded-xl bg-white px-3 py-2 text-[10px] font-bold text-amber-700 shadow-xs">Cao nhất: {Number(advancedData.weather_context.maxTemperatureC || 0).toFixed(1)}°C</span>
                    </div>
                  </div>
                )}
                <div className="max-w-none">{renderMarkdown(advancedData.gemini_insights)}</div>
              </div>
            ) : (
              <div className="min-h-[270px] flex flex-col items-center justify-center text-center">
                <Lightbulb size={30} className="text-slate-300" />
                <p className="text-sm font-bold text-slate-700 mt-3">Chưa tạo được kế hoạch</p>
                <button onClick={fetchAiStrategy} className="mt-4 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold">Thử tạo lại</button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'advanced' && advancedView === 'analysis' && (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#001c43] via-[#003574] to-indigo-700 p-6 text-white shadow-lg shadow-blue-950/10">
            <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-400/15 blur-2xl" />
            <div className="absolute bottom-0 right-1/3 h-24 w-40 rounded-full bg-violet-400/10 blur-2xl" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-inner">
                  <Sparkles size={23} className="text-amber-300" />
                  <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#003574] bg-emerald-400" />
                </div>
                <div>
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black">Trợ lý phân tích doanh thu</h2>
                    <span className="rounded-full border border-emerald-300/30 bg-emerald-400/15 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-200">Đã phân tích</span>
                  </div>
                  <p className="max-w-2xl text-xs leading-relaxed text-blue-100">Hệ thống đối chiếu doanh thu, số đơn và giá trị hóa đơn để chỉ ra nguyên nhân biến động và gợi ý việc cần ưu tiên.</p>
                  <p className="mt-2 text-[10px] font-semibold text-blue-200">
                    Dữ liệu: {advancedData?.summary?.selected_period?.startDate || analysisRange.startDate} → {advancedData?.summary?.selected_period?.endDate || analysisRange.endDate} · Đối chiếu với {comparisonPeriodLabel.toLowerCase()}
                  </p>
                </div>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-[540px]">
                <label className="rounded-xl border border-white/20 bg-white/10 px-3 py-2">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-blue-100">Từ ngày</span>
                  <input
                    type="date"
                    value={advancedStartDate}
                    max={advancedEndDate || undefined}
                    onChange={(event) => setAdvancedStartDate(event.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-white outline-none [color-scheme:dark]"
                  />
                </label>
                <label className="rounded-xl border border-white/20 bg-white/10 px-3 py-2">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-blue-100">Đến ngày</span>
                  <input
                    type="date"
                    value={advancedEndDate}
                    min={advancedStartDate || undefined}
                    max={formatLocalDate(new Date())}
                    onChange={(event) => setAdvancedEndDate(event.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-white outline-none [color-scheme:dark]"
                  />
                </label>
                <select
                  value={comparisonMode}
                  onChange={(event) => setComparisonMode(event.target.value as typeof comparisonMode)}
                  aria-label="Chọn khoảng thời gian để so sánh"
                  className="rounded-xl border border-white/20 bg-white px-3 py-2.5 text-xs font-bold text-[#00285E] outline-none"
                >
                  <option value="month_previous">So với khoảng trước đó</option>
                  <option value="month_last_year">So với cùng ngày năm trước</option>
                  <option value="year_last_year">Xem theo tháng với năm trước</option>
                </select>
                <button
                  onClick={handleAdvancedRefresh}
                  disabled={isAdvancedLoading}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold hover:bg-white/20 disabled:opacity-60"
                >
                  <RefreshCw size={14} className={isAdvancedLoading ? 'animate-spin' : ''} /> Phân tích lại
                </button>
                <label className="rounded-xl border border-white/20 bg-white/10 px-3 py-2">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-blue-100">Lập kế hoạch cho</span>
                  <select
                    value={planHorizon}
                    onChange={(event) => setPlanHorizon(event.target.value as typeof planHorizon)}
                    className="w-full bg-transparent text-xs font-bold text-white outline-none [color-scheme:dark]"
                  >
                    <option className="text-slate-900" value="1_month">1 tháng tới</option>
                    <option className="text-slate-900" value="3_months">3 tháng tới</option>
                  </select>
                </label>
                <button
                  onClick={() => {
                    setAdvancedView('plan');
                    if (!advancedData?.gemini_insights || advancedData?.plan_horizon !== planHorizon) fetchAiStrategy();
                  }}
                  disabled={isAiLoading || isAdvancedLoading || !advancedData}
                  className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-black text-[#00285E] shadow-sm hover:bg-amber-300 disabled:opacity-60"
                >
                  <Sparkles size={14} className={isAiLoading ? 'animate-spin' : ''} />
                  {isAiLoading ? 'Đang lập kế hoạch...' : 'Tạo kế hoạch AI chi tiết'}
                </button>
              </div>
            </div>
          </div>

          {isAdvancedLoading ? (
            <div className="min-h-[360px] rounded-3xl border border-indigo-100 bg-white flex flex-col items-center justify-center">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
                <Sparkles size={28} className="animate-pulse text-indigo-600" />
                <RefreshCw size={18} className="absolute -bottom-1 -right-1 animate-spin rounded-full bg-white p-1 text-amber-500 shadow" />
              </div>
              <p className="mt-4 text-sm font-black text-slate-800">AI đang đọc dữ liệu doanh thu...</p>
              <p className="mt-1 text-xs text-slate-400">So sánh các khoảng ngày · tìm nguyên nhân · xếp hạng mức độ ưu tiên</p>
              <div className="mt-5 h-1.5 w-52 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-blue-600 to-violet-500" /></div>
            </div>
          ) : advancedData ? (
            <>
              <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/70 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white"><Sparkles size={17} /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-600">AI tóm tắt kết quả</p>
                    <h3 className="mt-1 text-base font-black leading-snug text-slate-900">
                      Doanh thu {aiSnapshot.revenueDifference >= 0 ? 'tăng' : 'giảm'} {Math.abs(aiSnapshot.revenueDifference).toLocaleString('vi-VN')} đ
                      {aiSnapshot.growthPct !== null && <> ({aiSnapshot.revenueDifference >= 0 ? '+' : '−'}{Math.abs(aiSnapshot.growthPct).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%)</>} so với {comparisonPeriodLabel.toLowerCase()}.
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                      Biến động lớn hơn đến từ <strong className="text-slate-800">{aiSnapshot.primaryDriver === 'orders' ? 'số lượng đơn hoàn thành' : 'giá trị trung bình mỗi đơn'}</strong>.
                      {' '}Khoảng đang xem ghi nhận <strong className="text-slate-800">{aiSnapshot.currentOrders} đơn</strong>, trung bình <strong className="text-slate-800">{Math.round(aiSnapshot.currentTicket).toLocaleString('vi-VN')} đ/đơn</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  {
                    label: `Doanh thu ${currentPeriodLabel.toLowerCase()}`,
                    value: `${(aiSnapshot.currentRevenue / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} Tr.đ`,
                    sub: `${aiSnapshot.currentOrders} đơn đã thanh toán`,
                    color: 'text-[#00285E]',
                    icon: <ShoppingCart size={17} />,
                    iconStyle: 'bg-blue-50 text-blue-700',
                  },
                  {
                    label: 'Biến động doanh thu',
                    value: `${aiSnapshot.revenueDifference >= 0 ? '+' : '−'}${(Math.abs(aiSnapshot.revenueDifference) / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} Tr.đ`,
                    sub: aiSnapshot.growthPct === null ? 'Chưa đủ dữ liệu tính tỷ lệ' : `${aiSnapshot.revenueDifference >= 0 ? 'Tăng' : 'Giảm'} ${Math.abs(aiSnapshot.growthPct).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`,
                    color: aiSnapshot.revenueDifference >= 0 ? 'text-emerald-600' : 'text-rose-600',
                    icon: aiSnapshot.revenueDifference >= 0 ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />,
                    iconStyle: aiSnapshot.revenueDifference >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
                  },
                  {
                    label: 'Số đơn hoàn thành',
                    value: `${aiSnapshot.currentOrders} đơn`,
                    sub: `${aiSnapshot.orderDifference >= 0 ? 'Tăng' : 'Giảm'} ${Math.abs(aiSnapshot.orderDifference)} đơn${aiSnapshot.orderGrowthPct !== null ? ` (${Math.abs(aiSnapshot.orderGrowthPct).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%)` : ''}`,
                    color: aiSnapshot.orderDifference >= 0 ? 'text-emerald-600' : 'text-rose-600',
                    icon: <Wrench size={17} />,
                    iconStyle: 'bg-violet-50 text-violet-700',
                  },
                  {
                    label: 'Hóa đơn trung bình',
                    value: `${Math.round(aiSnapshot.currentTicket).toLocaleString('vi-VN')} đ`,
                    sub: aiSnapshot.comparisonTicket > 0
                      ? `${aiSnapshot.ticketDifference >= 0 ? 'Tăng' : 'Giảm'} ${Math.abs(Math.round(aiSnapshot.ticketDifference)).toLocaleString('vi-VN')} đ`
                      : `${aiSnapshot.activeCustomers} khách hoạt động`,
                    color: aiSnapshot.ticketDifference >= 0 ? 'text-emerald-600' : 'text-rose-600',
                    icon: <Users size={17} />,
                    iconStyle: 'bg-amber-50 text-amber-700',
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.iconStyle}`}>{item.icon}</span>
                    </div>
                    <p className={`mt-3 text-xl font-black ${item.color}`}>{item.value}</p>
                    <p className="mt-1 text-[10px] font-semibold text-slate-500">{item.sub} · so với {comparisonPeriodLabel.toLowerCase()}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/70 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
                  <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><BarChart3 size={17} className="text-[#00285E]" /> {currentPeriodLabel} so với {comparisonPeriodLabel}</h3>
                    <p className="text-[10px] text-slate-400 mt-1">Đơn vị: triệu đồng · So sánh hai khoảng thời gian</p>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {advancedData.summary?.selected_period?.startDate} → {advancedData.summary?.selected_period?.endDate}
                  </span>
                </div>
                {comparisonMode === 'year_last_year' ? (
                  <YearRevenueComparisonChart
                    rows={advancedData.yoy_comparison || []}
                    currentYear={Number(advancedData.summary?.current_year || new Date().getFullYear())}
                    lastYear={Number(advancedData.summary?.last_year || new Date().getFullYear() - 1)}
                  />
                ) : <div className="space-y-4">
                  {[
                    { label: currentPeriodLabel, value: Number(advancedData.summary?.total_this_year || 0), color: '#00285E' },
                    {
                      label: comparisonPeriodLabel,
                      value: Number((compareWithLastYear ? advancedData.summary?.total_last_year : advancedData.summary?.total_previous_period) || 0),
                      color: compareWithLastYear ? '#3B82F6' : '#8B5CF6'
                    },
                  ].map((bar) => {
                    const maxValue = Math.max(
                      Number(advancedData.summary?.total_this_year || 0),
                      Number((compareWithLastYear ? advancedData.summary?.total_last_year : advancedData.summary?.total_previous_period) || 0),
                      1
                    );
                    return (
                      <div key={bar.label} className="grid grid-cols-[105px_1fr_85px] items-center gap-3">
                        <span className="text-[11px] font-bold text-slate-600">{bar.label}</span>
                        <div className="h-8 bg-slate-100 rounded-lg overflow-hidden">
                          <div
                            className="h-full rounded-lg transition-all duration-500"
                            style={{ width: `${Math.max((bar.value / maxValue) * 100, bar.value > 0 ? 3 : 0)}%`, backgroundColor: bar.color }}
                          />
                        </div>
                        <span className="text-xs font-black text-slate-700 text-right">{(bar.value / 1_000_000).toFixed(1)} Tr.đ</span>
                      </div>
                    );
                  })}
                </div>}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-5">
                <div className="rounded-3xl border border-slate-200/70 bg-white p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-600">AI giải thích nguyên nhân</p>
                      <h3 className="mt-1 font-black text-slate-900">Điều gì đang kéo doanh thu lên hoặc xuống?</h3>
                    </div>
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-[9px] font-bold text-indigo-700">2 yếu tố chính</span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className={`rounded-2xl border p-4 ${aiSnapshot.orderDifference >= 0 ? 'border-emerald-100 bg-emerald-50/50' : 'border-rose-100 bg-rose-50/50'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Số đơn hoàn thành</span>
                        {aiSnapshot.orderDifference >= 0 ? <ArrowUpRight size={18} className="text-emerald-600" /> : <ArrowDownRight size={18} className="text-rose-600" />}
                      </div>
                      <p className="mt-2 text-2xl font-black text-slate-900">{aiSnapshot.currentOrders} <span className="text-sm text-slate-500">đơn</span></p>
                      <p className={`mt-1 text-xs font-bold ${aiSnapshot.orderDifference >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {aiSnapshot.orderDifference >= 0 ? '+' : '−'}{Math.abs(aiSnapshot.orderDifference)} đơn
                        {aiSnapshot.orderGrowthPct !== null && <> · {aiSnapshot.orderDifference >= 0 ? '+' : '−'}{Math.abs(aiSnapshot.orderGrowthPct).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%</>}
                      </p>
                      <p className="mt-3 text-[11px] leading-relaxed text-slate-600">{aiSnapshot.orderDifference >= 0 ? 'Gara phục vụ nhiều đơn hơn, tạo lực đẩy cho doanh thu.' : 'Số đơn giảm đang trực tiếp thu hẹp nguồn doanh thu.'}</p>
                    </div>

                    <div className={`rounded-2xl border p-4 ${aiSnapshot.ticketDifference >= 0 ? 'border-emerald-100 bg-emerald-50/50' : 'border-rose-100 bg-rose-50/50'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Giá trị mỗi đơn</span>
                        {aiSnapshot.ticketDifference >= 0 ? <ArrowUpRight size={18} className="text-emerald-600" /> : <ArrowDownRight size={18} className="text-rose-600" />}
                      </div>
                      <p className="mt-2 text-2xl font-black text-slate-900">{Math.round(aiSnapshot.currentTicket).toLocaleString('vi-VN')} <span className="text-sm text-slate-500">đ</span></p>
                      <p className={`mt-1 text-xs font-bold ${aiSnapshot.ticketDifference >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {aiSnapshot.comparisonTicket > 0 ? <>{aiSnapshot.ticketDifference >= 0 ? '+' : '−'}{Math.abs(Math.round(aiSnapshot.ticketDifference)).toLocaleString('vi-VN')} đ{aiSnapshot.ticketGrowthPct !== null && <> · {aiSnapshot.ticketDifference >= 0 ? '+' : '−'}{Math.abs(aiSnapshot.ticketGrowthPct).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%</>}</> : 'Khoảng so sánh chưa có dữ liệu'}
                      </p>
                      <p className="mt-3 text-[11px] leading-relaxed text-slate-600">{aiSnapshot.ticketDifference >= 0 ? 'Khách chi tiêu nhiều hơn trên mỗi lần sử dụng dịch vụ.' : 'Mức chi tiêu mỗi đơn giảm và đang làm yếu chất lượng tăng trưởng.'}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border-l-4 border-indigo-500 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Kết luận của hệ thống</p>
                    <p className="mt-1.5 text-xs font-semibold leading-relaxed text-slate-700">
                      {aiSnapshot.revenueDifference >= 0 ? 'Doanh thu đang tăng.' : 'Doanh thu đang giảm.'}{' '}
                      Yếu tố cần chú ý nhất là <strong>{aiSnapshot.primaryDriver === 'orders' ? `số đơn ${aiSnapshot.orderDifference >= 0 ? 'tăng' : 'giảm'} ${Math.abs(aiSnapshot.orderDifference)}` : `giá trị đơn ${aiSnapshot.ticketDifference >= 0 ? 'tăng' : 'giảm'} ${Math.abs(Math.round(aiSnapshot.ticketDifference)).toLocaleString('vi-VN')} đ`}</strong> so với {comparisonPeriodLabel.toLowerCase()}.
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200/70 bg-white p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">AI phát hiện từ dữ liệu</p>
                  <h3 className="mt-1 font-black text-slate-900">Dịch vụ và vận hành cần theo dõi</h3>
                  <div className="mt-5 space-y-3">
                    {advancedData.top_services?.[0] ? (
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                        <div className="flex items-start gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white"><TrendingUp size={15} /></span>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-wider text-emerald-700">Nhiều lượt nhất trong khoảng đang xem</p>
                            <p className="mt-1 text-sm font-black text-slate-900">{advancedData.top_services[0].service_name}</p>
                            <p className="mt-1 text-[11px] text-slate-600">{advancedData.top_services[0].total_qty} lượt · {Number(advancedData.top_services[0].total_revenue || 0).toLocaleString('vi-VN')} đ doanh thu</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">Chưa đủ dữ liệu để xác định dịch vụ dẫn đầu.</div>
                    )}

                    {advancedData.yoy_service_drivers?.declining?.[0] ? (
                      <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
                        <div className="flex items-start gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white"><ArrowDownRight size={15} /></span>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-wider text-rose-700">Giảm nhiều nhất so với cùng ngày năm trước</p>
                            <p className="mt-1 text-sm font-black text-slate-900">{advancedData.yoy_service_drivers.declining[0].service_name}</p>
                            <p className="mt-1 text-[11px] text-slate-600">Giảm {Math.abs(Number(advancedData.yoy_service_drivers.declining[0].growth_amount || 0)).toLocaleString('vi-VN')} đ · hiện đạt {Number(advancedData.yoy_service_drivers.declining[0].this_year_rev || 0).toLocaleString('vi-VN')} đ</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600">Chưa phát hiện dịch vụ giảm doanh thu đáng kể so với cùng khoảng thời gian năm trước.</div>
                    )}

                    {advancedData.ai_planner?.import_suggestions?.[0] && (
                      <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                        <div className="flex items-start gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white"><Package size={15} /></span>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-wider text-amber-700">Nhu cầu phụ tùng dự kiến</p>
                            <p className="mt-1 text-sm font-black text-slate-900">{advancedData.ai_planner.import_suggestions[0].part_name}</p>
                            <p className="mt-1 text-[11px] text-slate-600">Mức cần chuẩn bị: {advancedData.ai_planner.import_suggestions[0].suggested_import} sản phẩm · cần đối chiếu tồn kho trước khi nhập</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-600">Đề xuất ưu tiên</p>
                    <h3 className="mt-1 font-black text-slate-900">Ba việc nên làm tiếp theo</h3>
                    <p className="mt-1 text-[11px] text-slate-500">Đề xuất theo quy tắc dữ liệu; dùng “Kế hoạch AI chi tiết” để tạo KPI và thời hạn cụ thể.</p>
                  </div>
                  <button
                    onClick={() => {
                      setAdvancedView('plan');
                      if (!advancedData?.gemini_insights || advancedData?.plan_horizon !== planHorizon) fetchAiStrategy();
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
                  >
                    <Sparkles size={14} /> Mở kế hoạch AI
                  </button>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  {[
                    {
                      title: aiSnapshot.revenueDifference >= 0 ? 'Giữ đà tăng trưởng' : 'Khôi phục doanh thu',
                      reason: `${aiSnapshot.revenueDifference >= 0 ? 'Doanh thu tăng' : 'Doanh thu giảm'} ${Math.abs(aiSnapshot.revenueDifference).toLocaleString('vi-VN')} đ so với ${comparisonPeriodLabel.toLowerCase()}.`,
                      action: aiSnapshot.primaryDriver === 'orders' ? 'Theo dõi số đơn hoàn thành hằng tuần.' : 'Theo dõi giá trị trung bình mỗi đơn.',
                    },
                    {
                      title: advancedData.yoy_service_drivers?.declining?.[0] ? `Kiểm tra ${advancedData.yoy_service_drivers.declining[0].service_name}` : 'Theo dõi dịch vụ chủ lực',
                      reason: advancedData.yoy_service_drivers?.declining?.[0]
                        ? `Dịch vụ này giảm ${Math.abs(Number(advancedData.yoy_service_drivers.declining[0].growth_amount || 0)).toLocaleString('vi-VN')} đ so với cùng khoảng thời gian năm trước.`
                        : `${advancedData.top_services?.[0]?.service_name || 'Dịch vụ dẫn đầu'} có nhiều lượt nhất trong khoảng đang xem.`,
                      action: advancedData.yoy_service_drivers?.declining?.[0] ? 'Kiểm tra báo giá bị từ chối và số đơn hoàn thành.' : 'Duy trì năng lực phục vụ và chất lượng.',
                    },
                    {
                      title: aiSnapshot.ticketDifference < 0 ? 'Cải thiện giá trị mỗi đơn' : 'Duy trì mức chi tiêu mỗi đơn',
                      reason: aiSnapshot.comparisonTicket > 0 ? `Hóa đơn trung bình ${aiSnapshot.ticketDifference >= 0 ? 'tăng' : 'giảm'} ${Math.abs(Math.round(aiSnapshot.ticketDifference)).toLocaleString('vi-VN')} đ.` : 'Khoảng thời gian dùng để so sánh chưa có đủ dữ liệu.',
                      action: 'Theo dõi giá trị đơn và tỷ lệ dịch vụ mua kèm.',
                    },
                  ].map((item, index) => (
                    <div key={item.title} className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
                      <span className="absolute right-4 top-4 text-3xl font-black text-slate-100">0{index + 1}</span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00285E] text-xs font-black text-white">{index + 1}</span>
                      <h4 className="mt-3 pr-8 text-sm font-black text-slate-900">{item.title}</h4>
                      <p className="mt-2 text-[11px] leading-relaxed text-slate-500"><strong className="text-slate-700">Căn cứ:</strong> {item.reason}</p>
                      <p className="mt-2 text-[11px] leading-relaxed text-indigo-700"><strong>Việc cần làm:</strong> {item.action}</p>
                    </div>
                  ))}
                </div>
              </div>

            </>
          ) : (
            <div className="min-h-[260px] bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
              <BarChart3 size={30} className="text-slate-300" />
              <p className="text-sm font-bold text-slate-700 mt-3">Chưa có dữ liệu phân tích</p>
              <button onClick={fetchAdvancedData} className="mt-4 px-4 py-2 bg-[#00285E] text-white rounded-xl text-xs font-bold">Bắt đầu phân tích</button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'advanced' && SHOW_LEGACY_ADVANCED_ANALYSIS && (
        <div className="space-y-6">
          {/* Header + Reanalyze Button */}
          <div className="bg-gradient-to-r from-[#00285E] to-[#003d8f] p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="text-3xl">🤖</span>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Phân tích Dữ liệu Nâng cao </h3>
                <p className="text-xs text-blue-200 leading-relaxed">
                  So sánh doanh thu năm nay vs năm ngoái · Xu hướng tăng trưởng theo tháng · Dịch vụ & Linh kiện sử dụng nhiều nhất · Dịch vụ add-on trong báo giá · Chu kỳ mùa vụ
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
              <button
                onClick={() => fetchAdvancedData()}
                disabled={isAdvancedLoading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all whitespace-nowrap"
              >
                <RefreshCw size={14} className={isAdvancedLoading ? 'animate-spin' : ''} />
                <span>{isAdvancedLoading ? 'Đang phân tích...' : 'Phân tích lại'}</span>
              </button>

              <button
                onClick={() => {
                  setIsAiModalOpen(true);
                  if (!advancedData?.gemini_insights) {
                    fetchAiStrategy();
                  }
                }}
                disabled={isAiLoading || isAdvancedLoading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all whitespace-nowrap"
              >
                <Sparkles size={14} className={isAiLoading ? 'animate-spin' : ''} />
                <span>{isAiLoading ? 'Đang lập kế hoạch...' : 'Kế hoạch phát triển AI'}</span>
              </button>
            </div>
          </div>

          {isAdvancedLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-2xl border border-slate-200/60 shadow-xs">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mb-4"></div>
              <p className="text-slate-700 text-sm font-bold">Đang xử lý dữ liệu Pandas...</p>
              <p className="text-slate-400 text-xs mt-1">Đang phân tích khoảng ngày đã chọn và các khoảng dùng để so sánh, vui lòng chờ</p>
            </div>
          ) : advancedData ? (
            <div className="space-y-6">
              {activeTab === 'advanced' && (
                <>

                  {/* ── SECTION 1: YoY KPI SUMMARY CARDS ── */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      {
                        label: 'Doanh thu khoảng đang xem',
                        value: `${((advancedData?.summary?.total_this_year || 0) / 1_000_000).toFixed(1)} Tr.đ`,
                        icon: <TrendingUp size={20} />, color: '#10B981', bg: '#D1FAE5',
                        sub: `${advancedData?.summary?.selected_period?.startDate || '--'} → ${advancedData?.summary?.selected_period?.endDate || '--'}`,
                      },
                      {
                        label: 'Doanh thu khoảng trước đó',
                        value: `${((advancedData?.summary?.total_previous_period || 0) / 1_000_000).toFixed(1)} Tr.đ`,
                        icon: <Calendar size={20} />, color: '#8B5CF6', bg: '#F3E8FF',
                        sub: `${advancedData?.summary?.previous_period?.startDate || '--'} → ${advancedData?.summary?.previous_period?.endDate || '--'}`,
                      },
                      {
                        label: 'Doanh thu cùng khoảng năm trước',
                        value: `${((advancedData?.summary?.total_last_year || 0) / 1_000_000).toFixed(1)} Tr.đ`,
                        icon: <Calendar size={20} />, color: '#3B82F6', bg: '#EFF6FF',
                        sub: `${advancedData?.summary?.same_period_last_year?.startDate || '--'} → ${advancedData?.summary?.same_period_last_year?.endDate || '--'}`,
                      },
                      {
                        label: 'Tăng trưởng YoY',
                        value: `${advancedData?.summary?.yoy_growth_pct >= 0 ? '+' : ''}${advancedData?.summary?.yoy_growth_pct}%`,
                        icon: advancedData?.summary?.yoy_growth_pct >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />,
                        color: advancedData?.summary?.yoy_growth_pct >= 0 ? '#10B981' : '#EF4444',
                        bg: advancedData?.summary?.yoy_growth_pct >= 0 ? '#D1FAE5' : '#FEE2E2',
                        sub: 'So với cùng khoảng thời gian năm trước',
                      },
                    ].map((card, i) => (
                      <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight max-w-[110px]">{card.label}</span>
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: card.bg, color: card.color }}>
                            {card.icon}
                          </div>
                        </div>
                        <p className="text-lg font-bold text-slate-900 tracking-tight">{card.value}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">{card.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* 🤖 Cố vấn Chiến lược Gemini AI */}
                  {advancedData?.gemini_insights && (
                    <div className="bg-gradient-to-br from-indigo-50/40 via-white to-blue-50/20 p-6 rounded-2xl border border-indigo-100/80 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-indigo-100/50 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                            <Sparkles className="text-indigo-600 animate-pulse" size={20} />
                          </div>
                          <div>
                            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                              🤖 Cố Vấn Chiến Lược Doanh Thu (Trợ Lý AI Gemini)
                            </h2>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Báo cáo phân tích chuyên sâu tự động và kế hoạch khuyến mãi kích cầu</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black text-indigo-700 bg-indigo-100/60 uppercase tracking-widest px-2.5 py-1 rounded-md">
                          Chuyên nghiệp
                        </span>
                      </div>
                      <div className="prose prose-slate max-w-none">
                        {renderMarkdown(advancedData.gemini_insights)}
                      </div>
                    </div>
                  )}

                  {/* ── SECTION 2: YoY REVENUE GROWTH ATTRIBUTION DRIVERS ── */}
                  <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 rounded-2xl border border-slate-700/60 shadow-md text-white">
                    <div className="mb-4">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">💡 Phân tích từ hệ thống</span>
                      <h2 className="text-base font-bold text-white mt-1">❓ Tại sao Doanh thu lại Tăng hoặc Giảm? (Phân tích lý do)</h2>
                      <p className="text-xs text-slate-400 mt-1">Hệ thống tự động bóc tách doanh thu để xem Gara của bạn tăng trưởng nhờ yếu tố nào dưới đây</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-300">👥 Do Lượng Xe Sửa Chữa (Số lượng đơn)</span>
                          <Users size={16} className="text-sky-400" />
                        </div>
                        <div className="text-lg font-black text-white">
                          {advancedData?.summary?.volume_effect >= 0 ? '+' : ''}
                          {((advancedData?.summary?.volume_effect || 0) / 1_000_000).toFixed(1)} Tr.đ
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                          Doanh thu biến động do số lượng xe ghé Gara thay đổi.
                          Lượng xe đã thay đổi <span className="font-bold text-white">{advancedData?.summary?.this_year_orders - advancedData?.summary?.last_year_orders} lượt xe</span> so với cùng khoảng thời gian năm trước.
                        </p>
                      </div>

                      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-300">💵 Do Giá Trị Hóa Đơn (Độ chịu chi của khách)</span>
                          <Target size={16} className="text-emerald-400" />
                        </div>
                        <div className="text-lg font-black text-white">
                          {advancedData?.summary?.ticket_effect >= 0 ? '+' : ''}
                          {((advancedData?.summary?.ticket_effect || 0) / 1_000_000).toFixed(1)} Tr.đ
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                          Doanh thu biến động do khách làm nhiều hạng mục hơn hoặc thay linh kiện đắt tiền hơn.
                          Hóa đơn trung bình đạt <span className="font-bold text-white">{Math.round(advancedData?.summary?.this_year_avg_ticket || 0).toLocaleString('vi-VN')} đ</span> (cùng khoảng thời gian năm trước là {Math.round(advancedData?.summary?.last_year_avg_ticket || 0).toLocaleString('vi-VN')} đ).
                        </p>
                      </div>

                      <div className="bg-amber-950/20 p-4 rounded-xl border border-amber-900/30 flex flex-col justify-between">
                        <div>
                          <span className="text-xs font-bold text-amber-400">💡 Nhận định từ Chuyên gia AI</span>
                          <p className="text-xs text-slate-300 mt-2 font-medium leading-relaxed">
                            {advancedData?.summary?.yoy_growth_pct >= 0 ? (
                              `Doanh thu Gara tăng trưởng chủ yếu nhờ vào ${Math.abs(advancedData?.summary?.ticket_effect || 0) > Math.abs(advancedData?.summary?.volume_effect || 0) ? 'việc gia tăng giá trị trung bình mỗi hóa đơn (khách sửa nhiều hạng mục đắt tiền hơn, chịu chi hơn)' : 'việc thu hút thêm lượng lớn lượt khách hàng mới đến Gara làm dịch vụ'}.`
                            ) : (
                              `Doanh thu Gara sụt giảm chủ yếu do ${Math.abs(advancedData?.summary?.ticket_effect || 0) > Math.abs(advancedData?.summary?.volume_effect || 0) ? 'khách hàng thắt chặt chi tiêu hơn, hóa đơn trung bình của mỗi xe bị sụt giảm' : 'lượng khách hàng đưa xe đến Gara sửa chữa bị giảm mạnh'}.`
                            )}
                          </p>
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold italic mt-2">
                          * Phân tích tự động dựa trên các khoản khách đã thanh toán.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── SECTION 3: YoY BAR CHART (12 tháng) ── */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                          <BarChart3 size={18} className="text-[#00285E]" />
                          📈 Doanh thu khoảng đang xem và cùng khoảng thời gian năm trước
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">So sánh chi tiết kết quả kinh doanh (đơn vị tính: Triệu đồng)</p>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#00285E] inline-block" /> Năm nay ({advancedData?.summary?.current_year})</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#93C5FD] inline-block" /> Năm ngoái ({advancedData?.summary?.last_year})</span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <div className="min-w-[640px]">
                        {(() => {
                          const yoy = advancedData?.yoy_comparison || [];
                          const maxVal = Math.max(...yoy.map((m: any) => Math.max(m.this_year_revenue || 0, m.last_year_revenue || 0)), 1);
                          return (
                            <div className="flex items-end gap-1 h-44">
                              {yoy.map((m: any, idx: number) => {
                                const thisH = Math.round(((m.this_year_revenue || 0) / maxVal) * 160);
                                const lastH = Math.round(((m.last_year_revenue || 0) / maxVal) * 160);
                                const isGrowth = m.growth_pct >= 0;
                                return (
                                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                                    <div className="relative w-full flex justify-center gap-0.5 items-end">
                                      {/* Tooltip */}
                                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                        <div>Năm nay: {((m.this_year_revenue || 0) / 1_000_000).toFixed(1)}Tr</div>
                                        <div>Năm ngoái: {((m.last_year_revenue || 0) / 1_000_000).toFixed(1)}Tr</div>
                                        <div className={isGrowth ? 'text-green-400' : 'text-red-400'}>{isGrowth ? '+' : ''}{m.growth_pct}%</div>
                                      </div>
                                      <div className="w-[45%] rounded-t-sm bg-[#00285E]" style={{ height: `${thisH}px` }} />
                                      <div className="w-[45%] rounded-t-sm bg-[#93C5FD]" style={{ height: `${lastH}px` }} />
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-400">{m.month_name}</span>
                                    <span className={`text-[8px] font-bold ${isGrowth ? 'text-green-500' : 'text-red-500'}`}>
                                      {m.growth_pct !== 0 ? `${isGrowth ? '+' : ''}${m.growth_pct}%` : ''}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* ── SECTION 4: DETAILED GROWING & DECLINING SERVICES/PARTS ── */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Dịch vụ Tăng trưởng & Sụt giảm */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-5">
                      <div>
                        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                          <Wrench size={16} className="text-amber-500" />
                          🛠️ Xếp hạng Dịch vụ Tăng/Giảm doanh thu nhiều nhất
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">So sánh doanh số dịch vụ mang về năm nay so với năm trước</p>
                      </div>

                      {/* Nhóm tăng trưởng mạnh nhất */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                          <ArrowUpRight size={14} /> Tăng trưởng nhiều nhất
                        </span>
                        <div className="space-y-2.5">
                          {(advancedData?.yoy_service_drivers?.growing || []).map((s: any, idx: number) => (
                            <div key={idx} className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/60 flex items-center justify-between">
                              <div className="min-w-0 flex-1 pr-2">
                                <span className="text-xs font-bold text-slate-800 block truncate">{s.service_name}</span>
                                <span className="text-[10px] text-slate-400 block truncate">Năm ngoái: {(s.last_year_rev / 1_000_000).toFixed(1)} Tr → Năm nay: {(s.this_year_rev / 1_000_000).toFixed(1)} Tr</span>
                              </div>
                              <span className="text-xs font-black text-emerald-600 flex-shrink-0">+{((s.growth_amount) / 1_000_000).toFixed(1)} Tr.đ</span>
                            </div>
                          ))}
                          {(advancedData?.yoy_service_drivers?.growing || []).length === 0 && (
                            <p className="text-[11px] text-slate-400 italic">Chưa có dịch vụ tăng trưởng đáng kể.</p>
                          )}
                        </div>
                      </div>

                      {/* Nhóm sụt giảm mạnh nhất */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1">
                          <ArrowDownRight size={14} /> Sụt giảm nhiều nhất
                        </span>
                        <div className="space-y-2.5">
                          {(advancedData?.yoy_service_drivers?.declining || []).map((s: any, idx: number) => (
                            <div key={idx} className="bg-red-50/50 p-3 rounded-xl border border-red-100/60 flex items-center justify-between">
                              <div className="min-w-0 flex-1 pr-2">
                                <span className="text-xs font-bold text-slate-800 block truncate">{s.service_name}</span>
                                <span className="text-[10px] text-slate-400 block truncate">Năm ngoái: {(s.last_year_rev / 1_000_000).toFixed(1)} Tr → Năm nay: {(s.this_year_rev / 1_000_000).toFixed(1)} Tr</span>
                              </div>
                              <span className="text-xs font-black text-red-500 flex-shrink-0">{(s.growth_amount / 1_000_000).toFixed(1)} Tr.đ</span>
                            </div>
                          ))}
                          {(advancedData?.yoy_service_drivers?.declining || []).length === 0 && (
                            <p className="text-[11px] text-slate-400 italic">Không có dịch vụ nào sụt giảm doanh thu.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Linh kiện Tăng trưởng & Sụt giảm */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-5">
                      <div>
                        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                          <Package size={16} className="text-[#00285E]" />
                          📦 Xếp hạng Linh kiện Tiêu thụ thay đổi nhiều nhất
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">Số lượng phụ tùng lắp đặt thay đổi nhiều nhất so với năm ngoái</p>
                      </div>

                      {/* Nhóm tiêu thụ tăng */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                          <ArrowUpRight size={14} /> Tiêu thụ tăng nhiều nhất
                        </span>
                        <div className="space-y-2.5">
                          {(advancedData?.yoy_part_drivers?.growing || []).map((p: any, idx: number) => (
                            <div key={idx} className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/60 flex items-center justify-between">
                              <div className="min-w-0 flex-1 pr-2">
                                <span className="text-xs font-bold text-slate-800 block truncate">{p.name}</span>
                                <span className="text-[10px] text-slate-400 block truncate">Năm ngoái: {p.last_year_qty} cái → Năm nay: {p.this_year_qty} cái</span>
                              </div>
                              <span className="text-xs font-black text-emerald-600 flex-shrink-0">+{p.growth_qty} cái</span>
                            </div>
                          ))}
                          {(advancedData?.yoy_part_drivers?.growing || []).length === 0 && (
                            <p className="text-[11px] text-slate-400 italic">Chưa có linh kiện nào tăng lượng tiêu thụ.</p>
                          )}
                        </div>
                      </div>

                      {/* Nhóm tiêu thụ giảm */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1">
                          <ArrowDownRight size={14} /> Tiêu thụ giảm nhiều nhất
                        </span>
                        <div className="space-y-2.5">
                          {(advancedData?.yoy_part_drivers?.declining || []).map((p: any, idx: number) => (
                            <div key={idx} className="bg-red-50/50 p-3 rounded-xl border border-red-100/60 flex items-center justify-between">
                              <div className="min-w-0 flex-1 pr-2">
                                <span className="text-xs font-bold text-slate-800 block truncate">{p.name}</span>
                                <span className="text-[10px] text-slate-400 block truncate">Năm ngoái: {p.last_year_qty} cái → Năm nay: {p.this_year_qty} cái</span>
                              </div>
                              <span className="text-xs font-black text-red-500 flex-shrink-0">{p.growth_qty} cái</span>
                            </div>
                          ))}
                          {(advancedData?.yoy_part_drivers?.declining || []).length === 0 && (
                            <p className="text-[11px] text-slate-400 italic">Không có linh kiện nào giảm lượng tiêu thụ.</p>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* ── SECTION 5: LAST YEAR MONTHLY MOM GROWTH WITH INSIGHT REASONS ── */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
                    <div className="mb-5">
                      <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp size={18} className="text-emerald-500" />
                        📅 Nhật Ký Biến Động Doanh Thu Từng Tháng (Năm ngoái)
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">Lý do cụ thể khiến doanh thu Gara tăng/giảm từng tháng được phân tích tự động</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                            <th className="py-2.5 px-3 w-[12%]">Tháng</th>
                            <th className="py-2.5 px-3 text-right w-[15%]">Doanh thu</th>
                            <th className="py-2.5 px-3 text-center w-[10%]">Số đơn xe</th>
                            <th className="py-2.5 px-3 text-center w-[13%]">Tăng trưởng</th>
                            <th className="py-2.5 px-3 w-[50%]">Giải thích nguyên nhân từ AI (Hóa đơn / Lượt xe)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(advancedData?.last_year_monthly_growth || []).map((m: any, idx: number) => {
                            const isUp = m.change_revenue > 0;
                            const isFlat = m.change_revenue === 0;
                            return (
                              <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                <td className="py-3 px-3 font-bold text-slate-700">{m.month_name}</td>
                                <td className="py-3 px-3 text-right font-bold text-[#00285E]">{(m.revenue / 1_000_000).toFixed(2)} Tr.đ</td>
                                <td className="py-3 px-3 text-center font-semibold text-slate-500">{m.orders}</td>
                                <td className="py-3 px-3 text-center">
                                  {idx === 0 ? (
                                    <span className="text-slate-400 text-[10px] font-semibold">Mốc đầu</span>
                                  ) : (
                                    <span className={`font-bold text-xs ${isFlat ? 'text-slate-400' : isUp ? 'text-emerald-600' : 'text-red-500'}`}>
                                      {isUp ? '+' : ''}{m.change_pct}%
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex items-start gap-2">
                                    {idx > 0 && (
                                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider flex-shrink-0 mt-0.5 ${isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {m.primary_driver}
                                      </span>
                                    )}
                                    <span className="text-slate-600 leading-relaxed text-[11px] font-medium">{m.detail_reason}</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ── SECTION 6: GENERAL TOP 10 SERVICES & TOP 10 PARTS ── */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Top Services */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
                      <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-5">
                        <Star size={16} className="text-amber-500" />
                        Top 10 Dịch vụ Phổ biến nhất (Mọi thời điểm)
                      </h2>
                      <div className="space-y-3">
                        {(advancedData?.top_services || []).slice(0, 10).map((s: any, idx: number) => {
                          const maxQty = advancedData.top_services[0]?.total_qty || 1;
                          const pct = Math.round((s.total_qty / maxQty) * 100);
                          const colors = ['#00285E', '#1D4ED8', '#0891B2', '#0D9488', '#059669', '#7C3AED', '#DB2777', '#EA580C', '#D97706', '#65A30D'];
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0" style={{ backgroundColor: colors[idx] }}>{idx + 1}</span>
                                  <span className="text-xs font-semibold text-slate-700 truncate">{s.service_name}</span>
                                </div>
                                <div className="text-right flex-shrink-0 ml-2">
                                  <span className="text-xs font-bold text-slate-900">{s.total_qty} lượt</span>
                                  <span className="text-[9px] text-slate-400 block">{(s.total_revenue / 1_000_000).toFixed(1)}Tr.đ ({s.revenue_pct}%)</span>
                                </div>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: colors[idx] }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Top Parts */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
                      <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-5">
                        <Package size={16} className="text-[#00285E]" />
                        Top 10 Linh kiện sử dụng nhiều nhất (Mọi thời điểm)
                      </h2>
                      <div className="space-y-3">
                        {(advancedData?.top_parts || []).slice(0, 10).map((p: any, idx: number) => {
                          const maxQty = advancedData.top_parts[0]?.total_qty || 1;
                          const pct = Math.round((p.total_qty / maxQty) * 100);
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[9px] font-black text-white flex-shrink-0">{idx + 1}</span>
                                  <span className="text-xs font-semibold text-slate-700 truncate">{p.name}</span>
                                </div>
                                <div className="text-right flex-shrink-0 ml-2">
                                  <span className="text-xs font-bold text-slate-900">{p.total_qty} cái</span>
                                  <span className="text-[9px] text-slate-400 block">{p.qty_pct}% tổng</span>
                                </div>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* ── SECTION 7: ADD-ON SERVICES IN QUOTATION ── */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
                    <div className="mb-5">
                      <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <ShoppingCart size={18} className="text-purple-500" />
                        Dịch vụ được thêm nhiều nhất trong Báo giá (Quotation Add-on)
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">Phân tích từ Quotation_Details — cho biết dịch vụ nào khách thường thêm vào báo giá nhất</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">Tên dịch vụ</th>
                            <th className="py-2.5 px-3 text-center">Số báo giá có dịch vụ này</th>
                            <th className="py-2.5 px-3 text-center">Tổng số lượng</th>
                            <th className="py-2.5 px-3 text-center">TB mỗi lần đặt</th>
                            <th className="py-2.5 px-3">Mức độ phổ biến</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(advancedData?.addon_services || []).slice(0, 10).map((s: any, idx: number) => {
                            const maxCount = advancedData.addon_services[0]?.quotation_count || 1;
                            const pct = Math.round((s.quotation_count / maxCount) * 100);
                            return (
                              <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                <td className="py-3 px-3">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-400' : 'bg-slate-200 !text-slate-500'
                                    }`}>{idx + 1}</span>
                                </td>
                                <td className="py-3 px-3 font-semibold text-slate-800">{s.service_name}</td>
                                <td className="py-3 px-3 text-center font-bold text-purple-600">{s.quotation_count} báo giá</td>
                                <td className="py-3 px-3 text-center font-bold text-slate-700">{s.total_qty} lượt</td>
                                <td className="py-3 px-3 text-center font-semibold text-slate-500">{s.avg_qty_per_order}x</td>
                                <td className="py-3 px-3">
                                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden w-24">
                                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ── SECTION 8: SEASONAL PREDICTIONS & RECOMMENDATIONS ── */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                          <Calendar size={18} className="text-[#00285E]" />
                          📅 Lịch Dự Báo & Chuẩn Bị Kinh Doanh Theo Mùa Vụ
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">Xem từng tháng để chủ động nhập phụ tùng và bố trí nhân viên (Dữ liệu gốc năm {advancedData?.summary?.last_year})</p>
                      </div>

                      {/* 12 Months selector grid */}
                      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/50 self-start md:self-center">
                        {[...Array(12)].map((_, idx) => {
                          const mNum = String(idx + 1);
                          const isActive = seasonMonth === mNum;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSeasonMonth(mNum)}
                              className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all text-center whitespace-nowrap ${isActive
                                ? 'bg-[#00285E] text-white shadow-xs'
                                : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-800'
                                }`}
                            >
                              T{mNum}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Split Panel */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Panel 1: Spikes & Insights */}
                      <div className="bg-gradient-to-b from-slate-50 to-slate-100/50 p-5 rounded-2xl border border-slate-200/40 flex flex-col justify-between space-y-4">
                        <div>
                          <span className="text-[10px] font-bold text-[#00285E] uppercase tracking-wider block mb-3">🔥 Hàng hóa nhu cầu tăng đột biến</span>
                          <div className="space-y-3">
                            <div>
                              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Hạng mục sửa chữa tăng cao nhất</span>
                              <span className="text-xs font-bold text-slate-800 block leading-snug">
                                {advancedData?.seasonal_predictions?.[Number(seasonMonth) - 1]?.top_service_qty || 'N/A'}
                              </span>
                            </div>
                            <div className="border-t border-slate-200/60 pt-3">
                              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Linh kiện tiêu thụ mạnh nhất</span>
                              <span className="text-xs font-bold text-slate-800 block leading-snug">
                                {advancedData?.seasonal_predictions?.[Number(seasonMonth) - 1]?.top_part_qty || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Recommendation Block */}
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200/50 flex gap-3 items-start">
                          <Lightbulb size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-amber-800 uppercase tracking-wide block">Gợi ý hành động</span>
                            <p className="text-[11px] text-amber-900 leading-relaxed font-semibold">
                              {advancedData?.seasonal_predictions?.[Number(seasonMonth) - 1]?.recommendation || 'Chưa có khuyến nghị cho tháng này.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Panel 2: Top Services of selected month */}
                      <div className="border border-slate-100 p-5 rounded-2xl bg-white shadow-2xs">
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-3 flex items-center gap-1.5">
                          <Layers size={12} className="text-amber-500" /> Top dịch vụ được đặt nhiều (Tháng {seasonMonth})
                        </span>
                        <div className="space-y-3">
                          {Object.keys(advancedData?.seasonality?.[seasonMonth] || {}).length > 0 ? (
                            Object.entries(advancedData?.seasonality?.[seasonMonth] || {}).map(([name, count]: any, idx) => {
                              const maxC = Math.max(...(Object.values(advancedData?.seasonality?.[seasonMonth] || {}) as number[]), 1);
                              const pct = Math.round((count / maxC) * 100);
                              return (
                                <div key={idx} className="space-y-1">
                                  <div className="flex justify-between text-xs font-bold text-slate-700">
                                    <span className="truncate max-w-[160px]">{name}</span>
                                    <span className="text-amber-600 flex-shrink-0 ml-2">{count} lượt</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-center py-8 text-slate-400 text-xs font-medium">Chưa có dữ liệu dịch vụ trong tháng này</p>
                          )}
                        </div>
                      </div>

                      {/* Panel 3: Top Parts of selected month */}
                      <div className="border border-slate-100 p-5 rounded-2xl bg-white shadow-2xs">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-3 flex items-center gap-1.5">
                          <Package size={12} className="text-emerald-500" /> Top linh kiện sử dụng nhiều (Tháng {seasonMonth})
                        </span>
                        <div className="space-y-3">
                          {Object.keys(advancedData?.parts_seasonality?.[seasonMonth] || {}).length > 0 ? (
                            Object.entries(advancedData?.parts_seasonality?.[seasonMonth] || {}).map(([name, count]: any, idx) => {
                              const maxC = Math.max(...(Object.values(advancedData?.parts_seasonality?.[seasonMonth] || {}) as number[]), 1);
                              const pct = Math.round((count / maxC) * 100);
                              return (
                                <div key={idx} className="space-y-1">
                                  <div className="flex justify-between text-xs font-bold text-slate-700">
                                    <span className="truncate max-w-[160px]">{name}</span>
                                    <span className="text-emerald-600 flex-shrink-0 ml-2">{count} cái</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-center py-8 text-slate-400 text-xs font-medium">Chưa có dữ liệu linh kiện trong tháng này</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── SECTION 9: HISTORICAL REVENUE ALL MONTHS ── */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
                    <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
                      <BarChart3 size={18} className="text-[#00285E]" />
                      Lịch sử Doanh thu tất cả tháng
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                            <th className="py-2.5 px-3">Tháng/Năm</th>
                            <th className="py-2.5 px-3 text-right">Doanh thu</th>
                            <th className="py-2.5 px-3 text-center">Số đơn</th>
                            <th className="py-2.5 px-3">Biểu đồ thanh</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const rev = advancedData?.monthly_revenue || [];
                            const maxRev = Math.max(...rev.map((m: any) => m.revenue || 0), 1);
                            return rev.slice(-12).map((m: any, idx: number) => {
                              const pct = Math.round((m.revenue / maxRev) * 100);
                              return (
                                <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                  <td className="py-3 px-3 font-bold text-slate-700">{m.year_month}</td>
                                  <td className="py-3 px-3 text-right font-bold text-[#00285E]">{m.revenue_million.toFixed(2)} Tr.đ</td>
                                  <td className="py-3 px-3 text-center font-semibold text-slate-500">{m.orders_count}</td>
                                  <td className="py-3 px-3">
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-[#00285E] rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ── SECTION 9: AI PLANNER DETAILS (KẾ HOẠCH PHÁT TRIỂN & KHUYẾN MÃI) ── */}
                  {advancedData?.gemini_insights && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-8">
                      <div className="flex flex-col gap-1">
                        <h2 className="text-base font-black text-slate-850 flex items-center gap-2">
                          <Sparkles size={18} className="text-indigo-600" />
                          📋 Kế Hoạch Vận Hành & Khuyến Mãi Chi Tiết (AI Planner)
                        </h2>
                        <p className="text-xs text-slate-400">Đề xuất cụ thể về nhập kho an toàn, combo sản phẩm bán chéo và chiến dịch marketing giải cứu dịch vụ</p>
                      </div>

                      {/* KPI AI Overview */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl text-white shadow-md relative overflow-hidden">
                          <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                            <ShoppingCart size={120} />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-widest block opacity-85">Gợi ý Nhập phụ tùng tháng tới</span>
                          <span className="text-3xl font-extrabold block mt-2">{advancedData?.ai_planner?.import_suggestions?.length || 0} loại phụ tùng</span>
                          <p className="text-xs mt-3 leading-relaxed opacity-90 font-medium">Danh sách các linh kiện được khuyên mua dự phòng để tránh hết hàng tháng sau.</p>
                        </div>

                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-2xl text-white shadow-md relative overflow-hidden">
                          <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                            <Target size={120} />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-widest block opacity-85">Combo tối ưu hóa đơn</span>
                          <span className="text-3xl font-extrabold block mt-2">{advancedData?.ai_planner?.top_combos?.length || 0} cặp Combo đề xuất</span>
                          <p className="text-xs mt-3 leading-relaxed opacity-90 font-medium">Các gói sản phẩm - dịch vụ kết hợp chéo giúp kích thích khách chi tiêu thêm.</p>
                        </div>

                        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-2xl text-white shadow-md relative overflow-hidden">
                          <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                            <Wrench size={120} />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-widest block opacity-85">Dịch vụ cần kích cầu</span>
                          <span className="text-3xl font-extrabold block mt-2">{advancedData?.ai_planner?.low_demand_plans?.length || 0} dịch vụ ít lượt đặt</span>
                          <p className="text-xs mt-3 leading-relaxed opacity-90 font-medium">Các hạng mục sửa chữa vắng khách cần chạy khuyến mãi để phục hồi doanh số.</p>
                        </div>
                      </div>

                      {/* Section 1 & Section 2 Split */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Inventory suggestions */}
                        <div className="border border-slate-100 p-6 rounded-2xl bg-white shadow-2xs">
                          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-1">
                            <Package className="text-emerald-500" size={18} />
                            📦 Gợi ý mua phụ tùng tháng sau (Tránh thiếu hàng)
                          </h3>
                          <p className="text-xs text-slate-400 mb-5">Số lượng khuyên mua dự phòng cho tháng kế tiếp dựa trên phân tích lượng tiêu thụ cũ</p>

                          <div className="space-y-4">
                            {(advancedData?.ai_planner?.import_suggestions || []).map((s: any, idx: number) => (
                              <div key={idx} className="border border-slate-100 p-4 rounded-xl hover:bg-slate-50/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="space-y-1">
                                  <span className="text-xs font-bold text-slate-700 block leading-snug">{s.part_name}</span>
                                  <span className="text-[10px] text-slate-400 block font-semibold">{s.rationale}</span>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  <div className="text-right">
                                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Đã dùng (T{s.month}/{s.year})</span>
                                    <span className="text-xs font-bold text-slate-500 block">{s.historical_demand} cái</span>
                                  </div>
                                  <div className="bg-emerald-50 border border-emerald-200/60 py-1.5 px-3 rounded-lg text-center">
                                    <span className="text-[9px] text-emerald-600 block uppercase font-bold tracking-wider">Đề xuất nhập</span>
                                    <span className="text-xs font-black text-emerald-700 block">{s.suggested_import} cái</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Upsell Combos */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
                          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-1">
                            <Target className="text-amber-500" size={18} />
                            💰 Gợi ý gói Combo bán kèm (Tăng doanh thu đơn hàng)
                          </h3>
                          <p className="text-xs text-slate-400 mb-5">Các nhóm dịch vụ và phụ tùng khách hay mua cùng nhau. Hãy ghép chúng lại để ưu đãi.</p>

                          <div className="space-y-4">
                            {(advancedData?.ai_planner?.top_combos || []).map((combo: any, idx: number) => (
                              <div key={idx} className="border border-slate-100 p-4 rounded-xl bg-slate-50/20 hover:bg-slate-50/80 transition-all flex flex-col justify-between space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-0.5">
                                    <span className="bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mb-1">
                                      {combo.combo_name}
                                    </span>
                                    <div className="text-xs text-slate-800 font-bold flex flex-wrap items-center gap-1.5 leading-snug">
                                      <span>{combo.service_name}</span>
                                      <span className="text-slate-400 font-normal">+</span>
                                      <span>{combo.part_name}</span>
                                    </div>
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap bg-white border border-slate-200/80 py-1 px-2.5 rounded-full">
                                    Khách mua chung: {combo.co_occurrence} lần (Năm {combo.year})
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 leading-relaxed italic border-t border-slate-100 pt-2 font-medium">
                                  💡 {combo.discount_suggestion}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Underperforming Services Promotion Planner */}
                      <div className="border border-slate-100 p-6 rounded-2xl bg-white shadow-2xs">
                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-1">
                          <Lightbulb className="text-blue-500" size={18} />
                          📣 Gợi ý Khuyến mãi cho Dịch vụ vắng khách (Kích cầu)
                        </h3>
                        <p className="text-xs text-slate-400 mb-5">Đây là những dịch vụ ít người dùng nhất cả năm qua. Bạn nên áp dụng giảm giá hoặc tặng kèm.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {(advancedData?.ai_planner?.low_demand_plans || []).map((plan: any, idx: number) => (
                            <div key={idx} className="border border-slate-100 p-5 rounded-2xl bg-white shadow-2xs hover:shadow-xs hover:border-blue-200/40 transition-all flex flex-col justify-between space-y-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                  <span className="text-xs font-bold text-slate-800 block leading-tight">{plan.service_name}</span>
                                  <span className="text-[10px] text-blue-500 font-bold block">{plan.target_campaign}</span>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Đã làm (Năm {plan.year})</span>
                                  <span className="text-xs font-black text-rose-500 block">{plan.annual_count} lượt (chiếm {plan.share_pct}%)</span>
                                </div>
                              </div>

                              <div className="bg-blue-50/50 border border-blue-100 p-3.5 rounded-xl flex gap-2.5 items-start">
                                <Lightbulb size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                  <span className="text-[9px] font-black text-blue-800 uppercase tracking-wide block">Định hướng giải pháp</span>
                                  <p className="text-[11px] text-blue-900/90 leading-relaxed font-semibold">
                                    {plan.promo_strategy}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[300px] bg-white rounded-2xl border border-slate-200/60 shadow-xs">
              <span className="text-4xl mb-3">📊</span>
              <p className="text-slate-700 text-sm font-bold">Chưa có dữ liệu phân tích</p>
              <p className="text-slate-400 text-xs mt-1 mb-4">Nhấn "Phân tích lại" để bắt đầu phân tích dữ liệu từ Python</p>
              <button
                onClick={() => fetchAdvancedData()}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#00285E] text-white rounded-xl text-xs font-bold shadow-sm hover:bg-[#003d8f] transition-all"
              >
                <RefreshCw size={14} /> Bắt đầu phân tích
              </button>
            </div>
          )}
        </div>
      )}

      {isRevenueDetailOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={() => setIsRevenueDetailOpen(false)}>
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Đối soát doanh thu</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">Chi tiết tiền dịch vụ và hàng nhập kho</h2>
                <p className="mt-1 text-xs text-slate-500">Khoảng {businessOverview?.period?.startDate || startDate} → {businessOverview?.period?.endDate || endDate} · Chỉ tính các hóa đơn khách đã thanh toán.</p>
              </div>
              <button type="button" onClick={() => setIsRevenueDetailOpen(false)} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100" aria-label="Đóng"><X size={18} /></button>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-[10px] font-black uppercase text-blue-700">1. Tổng tiền dịch vụ đã thu</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{formatBusinessMoney(businessOverview?.revenueSources?.totalPaidRevenue)}</p>
                  <p className="mt-1 text-[10px] text-slate-600">Tổng tiền của {statsSummary.totalOrd} hóa đơn khách đã thanh toán; đã gồm tiền công và tiền linh kiện.</p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-[10px] font-black uppercase text-amber-700">2. Giá trị hàng nhập kho</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{formatBusinessMoney(businessOverview?.inventory?.importValue)}</p>
                  <p className="mt-1 text-[10px] text-slate-600">Tổng giá trị {businessOverview?.inventory?.importLineCount || 0} phiếu nhập; thống kê riêng, không trừ doanh thu.</p>
                </div>
              </div>

              <section className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="flex items-start justify-between gap-4 bg-slate-50 px-5 py-4">
                  <div><h3 className="text-sm font-black text-slate-900">Danh sách hóa đơn đã thanh toán</h3><p className="mt-1 text-[10px] text-slate-500">Tiền công và tiền linh kiện giúp giải thích mỗi hóa đơn gồm những khoản nào.</p></div>
                  <span className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-black text-blue-700">Tổng {formatBusinessMoney(businessOverview?.revenueSources?.totalPaidRevenue)}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left text-xs">
                    <thead className="border-y border-slate-200 bg-white text-[9px] uppercase text-slate-500"><tr><th className="px-5 py-3">Mã đơn</th><th className="px-4 py-3">Ngày thanh toán</th><th className="px-4 py-3 text-right">Tiền công</th><th className="px-4 py-3 text-right">Tiền linh kiện</th><th className="px-5 py-3 text-right">Tổng đã trả</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">{(businessOverview?.paidServiceOrders || []).map((item: any) => <tr key={item.orderId}><td className="px-5 py-3 font-bold text-slate-800">Phiếu #{item.orderId}</td><td className="px-4 py-3">{new Date(item.paidAt).toLocaleDateString('vi-VN')}</td><td className="px-4 py-3 text-right text-slate-600">{formatBusinessMoney(item.laborAmount)}</td><td className="px-4 py-3 text-right text-slate-600">{formatBusinessMoney(item.partsAmount)}</td><td className="px-5 py-3 text-right font-black text-blue-700">{formatBusinessMoney(item.paidAmount)}</td></tr>)}</tbody>
                  </table>
                </div>
              </section>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-black text-amber-800">Cách đọc hai số</p><p className="mt-2 text-[10px] leading-relaxed text-slate-600">Tổng tiền dịch vụ đã thu và giá trị hàng nhập kho là hai thống kê độc lập. Màn hình không thực hiện phép trừ và không kết luận lời/lỗ.</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
