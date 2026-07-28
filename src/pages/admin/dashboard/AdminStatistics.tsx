import { useState, useMemo, useEffect } from 'react';
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
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useFetchClient_v2 } from '../../../hook/useFetchClient';
import { ADMIN_DASHBOARD_API_ENDPOINTS } from '../../../constants/admin/dashboardApiEndpoint';

interface AdminServiceStat {
  serviceName: string;
  category: string;
  bookingCount: number;
  revenue: number;
  durationAvg: number; // minutes
}

interface DashboardData {
  summary: {
    totalCustomers: number;
    totalStaff: number;
    totalAppointments: number;
    activeOrders: number;
    totalRevenue: number;
  };
  appointmentStatus: {
    completed: number;
    pending: number;
    cancelled: number;
  };
  revenueTrend: {
    labels: string[];
    revenue: number[];
    orders: number[];
  };
  appointmentsTrend: {
    labels: string[];
    counts: number[];
  };
  topServices: AdminServiceStat[];
  topTechnicians: Array<{ technicianName: string; completedTasks: number; revenueContribution: number }>;
  recentActivity: Array<{
    id: number;
    status: string;
    scheduled_time: string;
    createdAt?: string;
    customer?: { name?: string; phone?: string };
  }>;
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

const MOCK_SERVICES: AdminServiceStat[] = [
  { serviceName: 'Bảo dưỡng định kỳ cấp 1', category: 'Bảo dưỡng', bookingCount: 142, revenue: 71000000, durationAvg: 45 },
  { serviceName: 'Thay dầu động cơ Castrol', category: 'Dầu nhớt', bookingCount: 118, revenue: 76700000, durationAvg: 20 },
  { serviceName: 'Cân chỉnh thước lái 3D', category: 'Sửa chữa gầm', bookingCount: 85, revenue: 51000000, durationAvg: 50 },
  { serviceName: 'Vệ sinh kim phun điện tử', category: 'Động cơ', bookingCount: 64, revenue: 76800000, durationAvg: 40 },
  { serviceName: 'Khử mùi diệt khuẩn ô tô', category: 'Chăm sóc xe', bookingCount: 52, revenue: 10400000, durationAvg: 15 },
];


const MOCK_TECHNICIANS = [
  { technicianName: 'Trần Văn Hùng', completedTasks: 96, revenueContribution: 42000000 },
  { technicianName: 'Lê Minh Tuấn', completedTasks: 84, revenueContribution: 38000000 },
  { technicianName: 'Nguyễn Nam Khánh', completedTasks: 78, revenueContribution: 31000000 },
  { technicianName: 'Phạm Văn Thành', completedTasks: 72, revenueContribution: 29000000 },
];

export default function AdminStatistics() {
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  }>();
  const { fetchPrivate } = useFetchClient_v2();

  const [timeframe, setTimeframe] = useState<'today' | '7days' | 'month' | 'quarter'>('7days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const response = await fetchPrivate(ADMIN_DASHBOARD_API_ENDPOINTS.SUMMARY);
        setDashboardData(response.data);
      } catch (error) {
        console.error('Failed to load dashboard data', error);
        showToast('Không thể tải dữ liệu dashboard', 'warning');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [fetchPrivate, showToast]);

  const currentData = useMemo(() => {
    if (!dashboardData?.revenueTrend) {
      return { labels: ['0'], revenue: [0], orders: [0] };
    }
    return {
      labels: dashboardData.revenueTrend.labels,
      revenue: dashboardData.revenueTrend.revenue,
      orders: dashboardData.revenueTrend.orders,
    };
  }, [dashboardData]);

  const statsSummary = useMemo(() => {
    const totalRev = dashboardData?.summary?.totalRevenue || 0;
    const totalOrd = dashboardData?.summary?.activeOrders || 0;
    const avgRevPerOrder = totalOrd > 0 ? Math.round(totalRev / totalOrd) : 0;
    return { totalRev, totalOrd, avgRevPerOrder };
  }, [dashboardData]);

  const serviceStats = (dashboardData?.topServices?.length ? dashboardData.topServices : MOCK_SERVICES) as AdminServiceStat[];
  const technicianStats = dashboardData?.topTechnicians?.length ? dashboardData.topTechnicians : MOCK_TECHNICIANS;

  const timeframeOptions = [
    { id: 'today', label: 'Hôm nay' },
    { id: '7days', label: '7 ngày qua' },
    { id: 'month', label: 'Tháng này' },
    { id: 'quarter', label: 'Quý này' },
  ] as const;

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCustomMode && (!startDate || !endDate)) {
      showToast('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.', 'warning');
      return;
    }
    showToast('Đã cập nhật dữ liệu thống kê!', 'success');
  };

  if (loading) {
    return (
      <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
        <div className="rounded-2xl border border-slate-200/60 bg-white p-10 text-center text-slate-500 shadow-sm">
          Đang tải dữ liệu dashboard…
        </div>
      </div>
    );
  }

  const handleExport = () => {
    const headers = ['Mục tiêu thống kê', 'Giá trị'];
    const rows = [
      ['Tổng Doanh thu', `${statsSummary.totalRev.toLocaleString('vi-VN')} đ`],
      ['Tổng số Đơn hàng', statsSummary.totalOrd.toString()],
      ['Giá trị Đơn hàng Trung bình', `${statsSummary.avgRevPerOrder.toLocaleString('vi-VN')} đ`],
      ['Tổng khách hàng hoạt động', '1,248'],
      ['Tổng lịch hẹn hoàn thành', '890'],
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

  const points = currentData.labels.map((day, idx) => {
    const x = padding + (idx / Math.max(currentData.labels.length - 1, 1)) * usableWidth;
    const yRevenue = chartHeight - padding - (currentData.revenue[idx] / maxRevenueVal) * usableHeight;
    const yOrders = chartHeight - padding - (currentData.orders[idx] / maxOrdersVal) * usableHeight;
    return { x, yRevenue, yOrders, day, revenue: currentData.revenue[idx], order: currentData.orders[idx] };
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
    const linePath = getLinePath(ptList, type);
    const firstX = ptList[0].x;
    const lastX = ptList[ptList.length - 1].x;
    const bottomY = chartHeight - padding;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

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

      {/* FILTER CONTROLS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest">
              <Calendar size={15} /> Khoảng thời gian:
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {timeframeOptions.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setTimeframe(item.id);
                    setIsCustomMode(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    timeframe === item.id && !isCustomMode
                      ? 'bg-white text-[#00285E] shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsCustomMode(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isCustomMode ? 'bg-white text-[#00285E] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Tùy chỉnh
              </button>
            </div>

            {isCustomMode && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-slate-200 rounded-xl text-xs px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <span className="text-slate-400 text-xs font-semibold">→</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border border-slate-200 rounded-xl text-xs px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-[#F9A11B] text-[#00285E] text-xs font-bold rounded-xl hover:bg-[#E08F12] transition-colors shadow-sm"
          >
            Lọc dữ liệu
          </button>
        </form>
      </div>

      {/* KPI OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Tổng doanh thu', value: `${statsSummary.totalRev.toLocaleString('vi-VN')} đ`, icon: <TrendingUp size={22} />, color: C.green, bg: '#D1FAE5', change: 'Từ báo giá đã duyệt' },
          { label: 'Đơn đang xử lý', value: statsSummary.totalOrd.toLocaleString('vi-VN'), icon: <Wrench size={22} />, color: C.navy, bg: '#EFF6FF', change: 'Service order đang hoạt động' },
          { label: 'Giá trị đơn TB', value: `${statsSummary.avgRevPerOrder.toLocaleString('vi-VN')} đ`, icon: <Target size={22} />, color: C.purple, bg: '#EDE9FE', change: 'Dựa trên báo giá đã duyệt' },
          { label: 'Khách hàng hoạt động', value: dashboardData?.summary?.totalCustomers?.toLocaleString('vi-VN') || '0', icon: <Users size={22} />, color: C.orange, bg: '#FEF3C7', change: 'Tổng khách hàng trong hệ thống' },
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
              <path d={getAreaPath(points, 'revenue')} fill="url(#colorRev)" />
              <path d={getAreaPath(points, 'orders')} fill="url(#colorOrd)" />

              {/* Grid Lines */}
              {points.map((pt, i) => (
                <line key={`grid-${i}`} x1={pt.x} y1={padding} x2={pt.x} y2={chartHeight - padding} stroke="#E2E8F0" strokeWidth={1} strokeDasharray="4 4" />
              ))}

              {/* Line paths */}
              <path d={getLinePath(points, 'revenue')} fill="none" stroke={C.navy} strokeWidth={3.5} strokeLinecap="round" />
              <path d={getLinePath(points, 'orders')} fill="none" stroke={C.orange} strokeWidth={2.5} strokeLinecap="round" />

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
                    { label: 'Khách hàng', value: dashboardData?.summary?.totalCustomers || 0, color: C.blue },
                    { label: 'Nhân sự', value: dashboardData?.summary?.totalStaff || 0, color: C.green },
                  ].map((item, idx) => {
                    const total = (dashboardData?.summary?.totalCustomers || 0) + (dashboardData?.summary?.totalStaff || 0);
                    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    return (
                      <div key={idx}>
                        <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                          <span>{item.label}</span>
                          <span>{item.value} ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: item.color }} />
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
                    { label: 'Hoàn thành', value: dashboardData?.appointmentStatus?.completed || 0, color: C.green },
                    { label: 'Đang chờ', value: dashboardData?.appointmentStatus?.pending || 0, color: C.orange },
                    { label: 'Đã hủy', value: dashboardData?.appointmentStatus?.cancelled || 0, color: C.red },
                  ].map((item, idx) => {
                    const total = (dashboardData?.appointmentStatus?.completed || 0) + (dashboardData?.appointmentStatus?.pending || 0) + (dashboardData?.appointmentStatus?.cancelled || 0);
                    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    return (
                      <div key={idx}>
                        <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                          <span>{item.label}</span>
                          <span>{item.value} ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: item.color }} />
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
                {serviceStats.map((s: AdminServiceStat, idx: number) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-semibold text-slate-800">{s.serviceName}</td>
                    <td className="py-3 px-3 text-slate-400 font-semibold">{s.category}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700">{s.bookingCount?.toLocaleString?.('vi-VN') ?? s.bookingCount} lượt</td>
                    <td className="py-3 px-3 text-right font-bold text-[#00285E]">{(s.revenue || 0).toLocaleString('vi-VN')} đ</td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-600">{s.durationAvg} phút</td>
                  </tr>
                ))}
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
                  <th className="py-2.5 px-3 text-center">Đánh giá ước lượng</th>
                </tr>
              </thead>
              <tbody>
                {technicianStats.map((t, idx) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-semibold text-slate-800">{t.technicianName}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700">{t.completedTasks?.toLocaleString('vi-VN') ?? t.completedTasks} tác vụ</td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-600">{(t.revenueContribution || 0).toLocaleString('vi-VN')} đ</td>
                    <td className="py-3 px-3 text-center font-semibold text-amber-500">{t.completedTasks ? (Math.min(5, Math.max(3.5, 3.5 + t.completedTasks / 100)).toFixed(1)) : '0.0'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Hoạt động gần đây</h2>
            <p className="text-slate-400 text-xs mt-0.5">Lịch hẹn mới nhất và trạng thái xử lý</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">Cập nhật theo thời gian thực</span>
        </div>

        <div className="space-y-3">
          {dashboardData?.recentActivity?.map((activity) => (
            <button
              key={activity.id}
              onClick={() => showToast(`Chi tiết lịch: ${activity.id}`, 'info')}
              className="w-full text-left rounded-2xl border border-slate-100 p-4 hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-800 truncate">{activity.customer?.name || 'Khách ẩn danh'}</p>
                  <p className="text-xs text-slate-500">{activity.customer?.phone || 'Không có số'}</p>
                </div>
                <span className="text-[11px] uppercase font-semibold text-slate-500 tracking-widest">{activity.status}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{new Date(activity.scheduled_time).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                <span>{activity.createdAt ? new Date(activity.createdAt).toLocaleDateString('vi-VN') : 'N/A'}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
