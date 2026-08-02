import { useState, useMemo, useEffect, useCallback } from 'react';
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
  navy: '#00285E',
  orange: '#F9A11B',
  green: '#10B981',
  red: '#EF4444',
  purple: '#8B5CF6',
  blue: '#3B82F6',
  teal: '#0D9488',
};

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
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    if (line.trim().startsWith('###')) {
      return <h4 key={idx} className="text-sm font-bold text-slate-800 mt-5 mb-2.5 flex items-center gap-1.5">{line.replace('###', '').trim()}</h4>;
    }
    if (line.trim().startsWith('##') || line.trim().startsWith('#')) {
      return <h3 key={idx} className="text-base font-extrabold text-[#00285E] mt-6 mb-3 border-b border-indigo-100 pb-2 flex items-center gap-2">{line.replace(/##|#/g, '').trim()}</h3>;
    }
    if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
      const content = line.replace(/^[\s-*]+/, '').trim();
      return (
        <div key={idx} className="text-[13px] text-slate-700 leading-relaxed my-2 pl-3.5 border-l-2 border-indigo-400 bg-indigo-50/15 py-2 rounded-r-xl shadow-3xs">
          {parseBoldText(content)}
        </div>
      );
    }
    if (line.trim() === '') {
      return <div key={idx} className="h-1.5" />;
    }
    return (
      <p key={idx} className="text-[13px] text-slate-600 leading-relaxed my-2 font-medium">
        {parseBoldText(line)}
      </p>
    );
  });
};

export default function AdminStatistics() {
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  }>();
  const { fetchPrivate } = useFetchClient();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [timeframe, setTimeframe] = useState<'today' | '7days' | 'month' | 'lastMonth' | 'quarter' | 'year' | 'lastYear'>('7days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  const [filterType, setFilterType] = useState<'preset' | 'custom' | 'structured'>('preset');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedWeek, setSelectedWeek] = useState<string>('');

  // Tabs for basic vs advanced pandas analysis
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');
  const [advancedData, setAdvancedData] = useState<any>(null);
  const [isAdvancedLoading, setIsAdvancedLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [seasonMonth, setSeasonMonth] = useState<string>('7');

  // Fetch stats from API
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      let url = '';
      if (filterType === 'structured' && selectedYear) {
        url = STATISTICS_API_ENDPOINTS.GET_STATS('custom');
        url += `&year=${selectedYear}`;
        if (selectedMonth) {
          url += `&month=${selectedMonth}`;
          if (selectedWeek) {
            url += `&week=${selectedWeek}`;
          }
        }
      } else {
        url = STATISTICS_API_ENDPOINTS.GET_STATS(
          timeframe,
          filterType === 'custom' ? startDate : undefined,
          filterType === 'custom' ? endDate : undefined
        );
      }

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
  }, [timeframe, startDate, endDate, filterType, selectedYear, selectedMonth, selectedWeek, fetchPrivate, showToast]);

  const fetchAdvancedData = useCallback(async () => {
    try {
      setIsAdvancedLoading(true);
      const res = await fetchPrivate(STATISTICS_API_ENDPOINTS.GET_ADVANCED);
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
  }, [fetchPrivate, showToast]);

  const fetchAiStrategy = useCallback(async () => {
    try {
      setIsAiLoading(true);
      showToast('Đang kết nối Gemini AI để phân tích chiến lược...', 'info');
      const res = await fetchPrivate(`${STATISTICS_API_ENDPOINTS.GET_ADVANCED}?generateAi=true`);
      if (res.success && res.data) {
        setAdvancedData(res.data);
        showToast('Lập kế hoạch phát triển với Gemini AI thành công!', 'success');
      } else {
        showToast('Không lấy được kế hoạch phân tích từ AI.', 'warning');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi kết nối với máy chủ AI.', 'warning');
    } finally {
      setIsAiLoading(false);
    }
  }, [fetchPrivate, showToast]);

  useEffect(() => {
    if (activeTab === 'basic') {
      if (filterType === 'preset') {
        fetchData();
      } else if (filterType === 'custom' && startDate && endDate) {
        fetchData();
      } else if (filterType === 'structured' && selectedYear) {
        fetchData();
      }
    } else if (activeTab === 'advanced' && !advancedData) {
      fetchAdvancedData();
    }
  }, [fetchData, fetchAdvancedData, filterType, startDate, endDate, selectedYear, activeTab, advancedData]);

  // Dynamic calculations based on timeframe
  const currentData = useMemo(() => {
    if (!data?.revenueChart) {
      return { days: [], revenue: [], orders: [] };
    }
    return data.revenueChart;
  }, [data]);

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

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filterType === 'custom' && (!startDate || !endDate)) {
      showToast('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.', 'warning');
      return;
    }
    if (filterType === 'structured' && !selectedYear) {
      showToast('Vui lòng chọn năm cần xem thống kê.', 'warning');
      return;
    }
    fetchData();
  };
  const handleExport = () => {
    const headers = ['Mục tiêu thống kê', 'Giá trị'];
    const rows = [
      ['Tổng Doanh thu', `${statsSummary.totalRev.toLocaleString('vi-VN')} đ`],
      ['Tổng số Đơn hàng', statsSummary.totalOrd.toString()],
      ['Giá trị Đơn hàng Trung bình', `${statsSummary.avgRevPerOrder.toLocaleString('vi-VN')} đ`],
      ['Tổng khách hàng hoạt động', statsSummary.activeCustomers.toLocaleString('vi-VN')],
      ['Tổng lịch hẹn hoàn thành', statsSummary.completedAppointments.toLocaleString('vi-VN')],
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
  const chartWidth = 600;
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

  const getLinePath = (ptList: typeof points, type: 'revenue' | 'orders') => {
    let path = '';
    ptList.forEach((pt, index) => {
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

  if (isLoading && !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00285E]"></div>
        <p className="text-slate-500 text-sm mt-4 font-semibold">Đang tải dữ liệu thống kê...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2 flex items-center gap-2">
            <BarChart3 className="text-amber-500" size={28} />
            Báo cáo & Thống kê Hoạt động
          </h1>
          <p className="text-slate-500 text-sm">
            Xem báo cáo thống kê doanh thu, khách hàng, hiệu suất dịch vụ và năng suất nhân viên.
          </p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#00285E] hover:bg-[#062047] text-white rounded-xl text-sm font-bold shadow-md shadow-[#00285E]/15 transition-all transform hover:translate-y-[-1px]"
        >
          <Download size={16} />
          <span>Xuất báo cáo</span>
        </button>
      </div>


      {/* TABS */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('basic')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all ${activeTab === 'basic'
            ? 'border-[#00285E] text-[#00285E]'
            : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
        >
          Thống kê cơ bản
        </button>
        <button
          onClick={() => setActiveTab('advanced')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'advanced'
            ? 'border-amber-500 text-amber-500'
            : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
        >
          <span>📊 Phân tích chuyên sâu & Kế hoạch AI</span>
          <span className="bg-amber-100 text-amber-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Mới</span>
        </button>
      </div>

      {activeTab === 'basic' && (
        <>
          {/* FILTER CONTROLS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <Calendar size={15} /> Chế độ lọc:
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {[
                    { id: 'preset', label: 'Mốc nhanh' },
                    { id: 'structured', label: 'Chọn năm/tháng/tuần' },
                    { id: 'custom', label: 'Tùy chỉnh ngày' },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        setFilterType(item.id as any);
                        if (item.id === 'preset') {
                          setIsCustomMode(false);
                        } else if (item.id === 'custom') {
                          setIsCustomMode(true);
                        } else {
                          setIsCustomMode(false);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === item.id
                        ? 'bg-white text-[#00285E] shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              {filterType === 'preset' && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Mốc thời gian:</span>
                  <div className="flex bg-slate-100 p-1 rounded-xl flex-wrap gap-1">
                    {[
                      { id: 'today', label: 'Hôm nay' },
                      { id: '7days', label: '7 ngày qua' },
                      { id: 'month', label: 'Tháng này' },
                      { id: 'lastMonth', label: 'Tháng trước' },
                      { id: 'quarter', label: 'Quý này' },
                      { id: 'year', label: 'Năm nay' },
                      { id: 'lastYear', label: 'Năm trước' },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setTimeframe(item.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeframe === item.id
                          ? 'bg-white text-[#00285E] shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                          }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filterType === 'custom' && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Từ ngày:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border border-slate-200 rounded-xl text-xs px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="text-slate-400 text-xs font-semibold">→</span>
                  <span className="text-xs font-bold text-slate-500">Đến ngày:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border border-slate-200 rounded-xl text-xs px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              )}

              {filterType === 'structured' && (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-500">Năm:</span>
                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        setSelectedYear(e.target.value);
                        setSelectedMonth('');
                        setSelectedWeek('');
                      }}
                      className="border border-slate-200 rounded-xl text-xs px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                    >
                      <option value="">-- Chọn Năm --</option>
                      <option value="2025">Năm 2025</option>
                      <option value="2026">Năm 2026</option>
                      <option value="2027">Năm 2027</option>
                    </select>
                  </div>

                  {selectedYear && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-500">Tháng:</span>
                      <select
                        value={selectedMonth}
                        onChange={(e) => {
                          setSelectedMonth(e.target.value);
                          setSelectedWeek('');
                        }}
                        className="border border-slate-200 rounded-xl text-xs px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                      >
                        <option value="">Cả Năm</option>
                        {[...Array(12)].map((_, idx) => (
                          <option key={idx + 1} value={String(idx + 1)}>Tháng {idx + 1}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedYear && selectedMonth && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-500">Tuần:</span>
                      <select
                        value={selectedWeek}
                        onChange={(e) => setSelectedWeek(e.target.value)}
                        className="border border-slate-200 rounded-xl text-xs px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                      >
                        <option value="">Cả Tháng</option>
                        <option value="1">Tuần 1 (Ngày 1-7)</option>
                        <option value="2">Tuần 2 (Ngày 8-14)</option>
                        <option value="3">Tuần 3 (Ngày 15-21)</option>
                        <option value="4">Tuần 4 (Ngày 22 trở đi)</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="px-4 py-2 bg-[#F9A11B] text-[#00285E] text-xs font-bold rounded-xl hover:bg-[#E08F12] transition-colors shadow-sm ml-auto"
              >
                Lọc dữ liệu
              </button>
            </form>
          </div>

          {/* KPI OVERVIEW CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Tổng doanh thu', value: `${statsSummary.totalRev.toLocaleString('vi-VN')} đ`, icon: <TrendingUp size={22} />, color: C.green, bg: '#D1FAE5', change: '+14.2% so với kỳ trước' },
              { label: 'Tổng lượt dịch vụ', value: statsSummary.totalOrd.toLocaleString('vi-VN'), icon: <Wrench size={22} />, color: C.navy, bg: '#EFF6FF', change: '+8.6% so với kỳ trước' },
              { label: 'Giá trị đơn TB', value: `${statsSummary.avgRevPerOrder.toLocaleString('vi-VN')} đ`, icon: <Target size={22} />, color: C.purple, bg: '#EDE9FE', change: '+5.1% so với kỳ trước' },
              { label: 'Khách hàng hoạt động', value: statsSummary.activeCustomers.toLocaleString('vi-VN'), icon: <Users size={22} />, color: C.orange, bg: '#FEF3C7', change: '+12.4% so với kỳ trước' },
            ].map((card, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{card.label}</span>
                    <span className="text-xl font-bold text-slate-900 tracking-tight block">{card.value}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.bg, color: card.color }}>
                    {card.icon}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-semibold mt-4">
                  {card.change}
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
                  <p className="text-slate-400 text-xs">Biểu diễn tổng doanh thu (Triệu đ) và số đơn hàng theo mốc thời gian</p>
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

              <div className="flex-1 w-full flex items-center justify-center py-4 relative min-h-[220px]">
                {/* Gridlines */}
                <div className="absolute inset-0 flex flex-col justify-between py-10 pointer-events-none opacity-20">
                  <div className="w-full h-[1px] bg-slate-400" />
                  <div className="w-full h-[1px] bg-slate-400" />
                  <div className="w-full h-[1px] bg-slate-400" />
                  <div className="w-full h-[1px] bg-slate-400" />
                </div>

                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full max-h-[240px] select-none">
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
                  {points.map((pt, i) => (
                    <line key={`grid-${i}`} x1={pt.x} y1={padding} x2={pt.x} y2={chartHeight - padding} stroke="#E2E8F0" strokeWidth={1} strokeDasharray="4 4" />
                  ))}

                  {/* Line paths */}
                  {points.length > 0 && (
                    <>
                      <path d={getLinePath(points, 'revenue')} fill="none" stroke={C.navy} strokeWidth={3.5} strokeLinecap="round" />
                      <path d={getLinePath(points, 'orders')} fill="none" stroke={C.orange} strokeWidth={2.5} strokeLinecap="round" />
                    </>
                  )}

                  {/* Data circles */}
                  {points.map((pt, index) => (
                    <g key={index}>
                      <circle cx={pt.x} cy={pt.yRevenue} r={4} fill={C.navy} stroke="#FFFFFF" strokeWidth={2} />
                      <circle cx={pt.x} cy={pt.yOrders} r={4} fill={C.orange} stroke="#FFFFFF" strokeWidth={2} />
                    </g>
                  ))}

                  {/* X-axis labels */}
                  {points.map((pt, i) => (
                    <text key={i} x={pt.x} y={chartHeight - 12} textAnchor="middle" fill="#94A3B8" fontSize={11} fontWeight="600">
                      {pt.day}
                    </text>
                  ))}
                </svg>
              </div>
            </div>

            {/* Breakdown Donut stats */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-4">Thống kê loại xe & Khách hàng</h2>
                <div className="space-y-6">
                  {/* Customers breakdown */}
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Tỷ lệ khách hàng</span>
                    <div className="space-y-2">
                      {[
                        { label: 'Khách hàng mới', value: data?.customersBreakdown?.newCustomers || 0, color: C.blue },
                        { label: 'Khách hàng quay lại', value: data?.customersBreakdown?.returningCustomers || 0, color: C.green },
                      ].map((c, idx, arr) => {
                        const total = arr.reduce((s, x) => s + x.value, 0);
                        const pct = total > 0 ? Math.round((c.value / total) * 100) : 0;
                        return (
                          <div key={idx}>
                            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                              <span>{c.label}</span>
                              <span>{c.value} ({pct}%)</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Appointment status breakdown */}
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Lịch hẹn dịch vụ</span>
                    <div className="space-y-2">
                      {[
                        { label: 'Hoàn thành', value: data?.appointmentsBreakdown?.completed || 0, color: C.green },
                        { label: 'Đang chờ/Đang xử lý', value: data?.appointmentsBreakdown?.pending || 0, color: C.orange },
                        { label: 'Đã hủy', value: data?.appointmentsBreakdown?.cancelled || 0, color: C.red },
                      ].map((a, idx, arr) => {
                        const total = arr.reduce((s, x) => s + x.value, 0);
                        const pct = total > 0 ? Math.round((a.value / total) * 100) : 0;
                        return (
                          <div key={idx}>
                            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                              <span>{a.label}</span>
                              <span>{a.value} ({pct}%)</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: a.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DETAILED STATS SECTIONS (SERVICES & TECHNICIANS) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service stats Table */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                  <PieChart size={18} className="text-[#00285E]" /> Hiệu suất dịch vụ chuẩn
                </h2>
                <span className="text-xs text-slate-400 font-semibold">Theo lượt đặt nhiều</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                      <th className="py-2.5 px-3">Tên dịch vụ</th>
                      <th className="py-2.5 px-3">Danh mục</th>
                      <th className="py-2.5 px-3 text-center">Số lượt đặt</th>
                      <th className="py-2.5 px-3 text-right">Doanh thu</th>
                      <th className="py-2.5 px-3 text-center">Thời gian TB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.topServices || []).map((s: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-semibold text-slate-800">{s.name}</td>
                        <td className="py-3 px-3 text-slate-400 font-semibold">{s.category}</td>
                        <td className="py-3 px-3 text-center font-bold text-slate-700">{s.bookingCount} lượt</td>
                        <td className="py-3 px-3 text-right font-bold text-[#00285E]">{s.revenue.toLocaleString('vi-VN')} đ</td>
                        <td className="py-3 px-3 text-center font-semibold text-slate-600">{s.durationAvg} phút</td>
                      </tr>
                    ))}
                    {(data?.topServices || []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-slate-400 font-medium">Không có dữ liệu dịch vụ</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Technician productivity Table */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                  <UserCheck size={18} className="text-[#00285E]" /> Hiệu suất và năng suất nhân viên
                </h2>
                <span className="text-xs text-slate-400 font-semibold">Theo kỹ thuật viên (KTV)</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                      <th className="py-2.5 px-3">Kỹ thuật viên</th>
                      <th className="py-2.5 px-3 text-center">Số nhiệm vụ hoàn thành</th>
                      <th className="py-2.5 px-3 text-right">Doanh thu đóng góp</th>
                      <th className="py-2.5 px-3 text-center">Đánh giá trung bình</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.topTechnicians || []).map((t: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-semibold text-slate-800">{t.name}</td>
                        <td className="py-3 px-3 text-center font-bold text-slate-700">{t.completedTasks} tác vụ</td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-600">{t.revenueContribution.toLocaleString('vi-VN')} đ</td>
                        <td className="py-3 px-3 text-center font-bold text-amber-500">⭐ {t.rating}</td>
                      </tr>
                    ))}
                    {(data?.topTechnicians || []).length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-4 text-slate-400 font-medium">Không có dữ liệu nhân viên</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'advanced' && (
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
              <p className="text-slate-400 text-xs mt-1">Truy vấn & phân tích từ database, vui lòng chờ</p>
            </div>
          ) : advancedData ? (
            <div className="space-y-6">
              {activeTab === 'advanced' && (
                <>

                  {/* ── SECTION 1: YoY KPI SUMMARY CARDS ── */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      {
                        label: `Doanh thu năm ${advancedData?.summary?.current_year}`,
                        value: `${((advancedData?.summary?.total_this_year || 0) / 1_000_000).toFixed(1)} Tr.đ`,
                        icon: <TrendingUp size={20} />, color: '#10B981', bg: '#D1FAE5',
                        sub: `Tháng đỉnh: T${advancedData?.summary?.best_month_this_year ?? '--'}`,
                      },
                      {
                        label: `Doanh thu năm ${advancedData?.summary?.last_year}`,
                        value: `${((advancedData?.summary?.total_last_year || 0) / 1_000_000).toFixed(1)} Tr.đ`,
                        icon: <Calendar size={20} />, color: '#3B82F6', bg: '#EFF6FF',
                        sub: `Tháng đỉnh: T${advancedData?.summary?.best_month_last_year ?? '--'}`,
                      },
                      {
                        label: 'Tăng trưởng YoY',
                        value: `${advancedData?.summary?.yoy_growth_pct >= 0 ? '+' : ''}${advancedData?.summary?.yoy_growth_pct}%`,
                        icon: advancedData?.summary?.yoy_growth_pct >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />,
                        color: advancedData?.summary?.yoy_growth_pct >= 0 ? '#10B981' : '#EF4444',
                        bg: advancedData?.summary?.yoy_growth_pct >= 0 ? '#D1FAE5' : '#FEE2E2',
                        sub: 'So với cùng kỳ năm ngoái',
                      },
                      {
                        label: 'Dịch vụ phổ biến nhất',
                        value: advancedData?.top_services?.[0]?.service_name?.split(' ').slice(0, 3).join(' ') || '--',
                        icon: <Star size={20} />, color: '#F59E0B', bg: '#FEF3C7',
                        sub: `${advancedData?.top_services?.[0]?.total_qty ?? 0} lượt thực hiện`,
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
                          Lượng xe đã thay đổi <span className="font-bold text-white">{advancedData?.summary?.this_year_orders - advancedData?.summary?.last_year_orders} lượt xe</span> so với năm ngoái.
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
                          Hóa đơn trung bình đạt <span className="font-bold text-white">{Math.round(advancedData?.summary?.this_year_avg_ticket || 0).toLocaleString('vi-VN')} đ</span> (năm ngoái là {Math.round(advancedData?.summary?.last_year_avg_ticket || 0).toLocaleString('vi-VN')} đ).
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
                          * Phân tích tự động dựa trên dữ liệu thanh toán Booking_Payments.
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
                          📈 Biểu đồ Doanh thu từng tháng so với năm ngoái
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
    </div>
  );
}
