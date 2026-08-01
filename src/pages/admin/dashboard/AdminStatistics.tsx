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
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'basic'
              ? 'border-[#00285E] text-[#00285E]'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Thống kê cơ bản
        </button>
        <button
          onClick={() => setActiveTab('advanced')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'advanced'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <span>📊 Phân tích chuyên sâu (Python/Pandas)</span>
          <span className="bg-amber-100 text-amber-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Mới</span>
        </button>
      </div>

      {activeTab === 'basic' ? (
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        filterType === item.id
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          timeframe === item.id
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
      ) : (
        <div className="space-y-6">
          {/* Header + Reanalyze Button */}
          <div className="bg-gradient-to-r from-[#00285E] to-[#003d8f] p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="text-3xl">🤖</span>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Phân tích Dữ liệu Nâng cao (Python & Pandas)</h3>
                <p className="text-xs text-blue-200 leading-relaxed">
                  So sánh doanh thu năm nay vs năm ngoái · Xu hướng tăng trưởng theo tháng · Dịch vụ & Linh kiện sử dụng nhiều nhất · Dịch vụ add-on trong báo giá · Chu kỳ mùa vụ
                </p>
              </div>
            </div>
            <button
              onClick={() => fetchAdvancedData()}
              disabled={isAdvancedLoading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-700/50 text-white rounded-xl text-xs font-bold shadow-sm transition-all whitespace-nowrap self-start md:self-center"
            >
              <RefreshCw size={14} className={isAdvancedLoading ? 'animate-spin' : ''} />
              <span>{isAdvancedLoading ? 'Đang phân tích...' : 'Phân tích lại'}</span>
            </button>
          </div>

          {isAdvancedLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-2xl border border-slate-200/60 shadow-xs">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mb-4"></div>
              <p className="text-slate-700 text-sm font-bold">Đang xử lý dữ liệu Pandas...</p>
              <p className="text-slate-400 text-xs mt-1">Truy vấn & phân tích từ database, vui lòng chờ</p>
            </div>
          ) : advancedData ? (
            <div className="space-y-6">

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

              {/* ── SECTION 2: YoY BAR CHART (12 tháng) ── */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <BarChart3 size={18} className="text-[#00285E]" />
                      So sánh Doanh thu {advancedData?.summary?.current_year} vs {advancedData?.summary?.last_year} theo tháng
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Biểu đồ thanh so sánh từng tháng (đơn vị: Triệu đồng)</p>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#00285E] inline-block" /> Năm {advancedData?.summary?.current_year}</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#93C5FD] inline-block" /> Năm {advancedData?.summary?.last_year}</span>
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

              {/* ── SECTION 3: LAST YEAR MONTHLY GROWTH ── */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
                <div className="mb-5">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <TrendingUp size={18} className="text-emerald-500" />
                    Biến động Doanh thu theo tháng — Năm {advancedData?.summary?.last_year}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Tăng trưởng tháng so với tháng trước (MoM) trong năm ngoái</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                        <th className="py-2.5 px-3">Tháng</th>
                        <th className="py-2.5 px-3 text-right">Doanh thu</th>
                        <th className="py-2.5 px-3 text-center">Số đơn</th>
                        <th className="py-2.5 px-3 text-center">Tăng trưởng MoM</th>
                        <th className="py-2.5 px-3">Xu hướng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(advancedData?.last_year_monthly_growth || []).map((m: any, idx: number) => {
                        const isUp = m.mom_growth_pct > 0;
                        const isFlat = m.mom_growth_pct === 0;
                        return (
                          <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                            <td className="py-3 px-3 font-bold text-slate-700">{m.month_name}</td>
                            <td className="py-3 px-3 text-right font-bold text-[#00285E]">{(m.revenue / 1_000_000).toFixed(2)} Tr.đ</td>
                            <td className="py-3 px-3 text-center font-semibold text-slate-500">{m.orders_count}</td>
                            <td className="py-3 px-3 text-center">
                              {idx === 0 ? (
                                <span className="text-slate-400 text-[10px] font-semibold">--</span>
                              ) : (
                                <span className={`font-bold text-xs ${ isFlat ? 'text-slate-400' : isUp ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {isUp ? '+' : ''}{m.mom_growth_pct}%
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {idx > 0 && (
                                <div className="flex items-center gap-1.5">
                                  {isUp ? (
                                    <ArrowUpRight size={14} className="text-emerald-500" />
                                  ) : isFlat ? (
                                    <span className="text-slate-300 text-xs">→</span>
                                  ) : (
                                    <ArrowDownRight size={14} className="text-red-400" />
                                  )}
                                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden w-20">
                                    <div
                                      className={`h-full rounded-full ${ isUp ? 'bg-emerald-400' : 'bg-red-400'}`}
                                      style={{ width: `${Math.min(Math.abs(m.mom_growth_pct), 100)}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── SECTION 4: TOP SERVICES + TOP PARTS SIDE BY SIDE ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Top Services */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-5">
                    <Star size={16} className="text-amber-500" />
                    Top 10 Dịch vụ Phổ biến nhất
                  </h2>
                  <div className="space-y-3">
                    {(advancedData?.top_services || []).slice(0, 10).map((s: any, idx: number) => {
                      const maxQty = advancedData.top_services[0]?.total_qty || 1;
                      const pct = Math.round((s.total_qty / maxQty) * 100);
                      const colors = ['#00285E','#1D4ED8','#0891B2','#0D9488','#059669','#7C3AED','#DB2777','#EA580C','#D97706','#65A30D'];
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0" style={{ backgroundColor: colors[idx] }}>{idx + 1}</span>
                              <span className="text-xs font-semibold text-slate-700 truncate">{s.service_name}</span>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              <span className="text-xs font-bold text-slate-900">{s.total_qty} lượt</span>
                              <span className="text-[9px] text-slate-400 block">{(s.total_revenue / 1_000_000).toFixed(1)}Tr.đ</span>
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
                    Top 10 Linh kiện sử dụng nhiều nhất
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

              {/* ── SECTION 5: ADD-ON SERVICES IN QUOTATION ── */}
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
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white ${
                                idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-400' : 'bg-slate-200 !text-slate-500'
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

              {/* ── SECTION 6: SEASONALITY (Services + Parts) ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Service Seasonality */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
                  <div className="mb-4">
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Layers size={16} className="text-amber-500" />
                      Chu kỳ Dịch vụ theo Tháng
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Top 5 dịch vụ được thực hiện nhiều nhất trong tháng đã chọn</p>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-bold text-slate-500">Tháng:</span>
                    <select
                      value={seasonMonth}
                      onChange={(e) => setSeasonMonth(e.target.value)}
                      className="border border-slate-200 rounded-xl text-xs px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-200 font-semibold flex-1"
                    >
                      {[...Array(12)].map((_, idx) => (
                        <option key={idx + 1} value={String(idx + 1)}>Tháng {idx + 1}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3">
                    {Object.keys(advancedData?.seasonality?.[seasonMonth] || {}).length > 0 ? (
                      Object.entries(advancedData?.seasonality?.[seasonMonth] || {}).map(([name, count]: any, idx) => {
                        const maxC = Math.max(...(Object.values(advancedData?.seasonality?.[seasonMonth] || {}) as number[]), 1);
                        const pct = Math.round((count / maxC) * 100);
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold text-slate-700">
                              <span className="truncate max-w-[200px]">{name}</span>
                              <span className="text-amber-600 ml-2">{count} lượt</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
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

                {/* Parts Seasonality */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
                  <div className="mb-4">
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Package size={16} className="text-emerald-500" />
                      Chu kỳ Linh kiện theo Tháng
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Top 3 linh kiện sử dụng nhiều nhất trong tháng đã chọn</p>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-bold text-slate-500">Tháng:</span>
                    <select
                      value={seasonMonth}
                      onChange={(e) => setSeasonMonth(e.target.value)}
                      className="border border-slate-200 rounded-xl text-xs px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 font-semibold flex-1"
                    >
                      {[...Array(12)].map((_, idx) => (
                        <option key={idx + 1} value={String(idx + 1)}>Tháng {idx + 1}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3">
                    {Object.keys(advancedData?.parts_seasonality?.[seasonMonth] || {}).length > 0 ? (
                      Object.entries(advancedData?.parts_seasonality?.[seasonMonth] || {}).map(([name, count]: any, idx) => {
                        const maxC = Math.max(...(Object.values(advancedData?.parts_seasonality?.[seasonMonth] || {}) as number[]), 1);
                        const pct = Math.round((count / maxC) * 100);
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold text-slate-700">
                              <span className="truncate max-w-[200px]">{name}</span>
                              <span className="text-emerald-600 ml-2">{count} cái</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
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

              {/* ── SECTION 7: HISTORICAL REVENUE ALL MONTHS ── */}
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
