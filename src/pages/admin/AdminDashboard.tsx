import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Boxes,
  UserCog,
  BarChart3,
  AlertTriangle,
  ShoppingCart,
  TrendingUp,
  ChevronDown,
  Calendar,
  Download
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

// Interface for appointment data
interface Appointment {
  id: string;
  initials: string;
  avatarBg: string;
  customerName: string;
  vehicle: string;
  plate: string;
  service: string;
  serviceType: 'maintenance' | 'oil' | 'brake' | 'other';
  time: string;
  status: 'Đang chờ' | 'Đang làm' | 'Đặt trước';
}

export default function AdminDashboard() {
  const { searchQuery, showToast } = useOutletContext<{
    searchQuery: string;
    showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  }>();

  const [activeTimeframe, setActiveTimeframe] = useState('7 ngày qua');
  const [isTimeframeDropdownOpen, setIsTimeframeDropdownOpen] = useState(false);

  // Interactive chart state
  const [hoveredChartPoint, setHoveredChartPoint] = useState<number | null>(null);

  // Mock data matching the design
  const kpis = [
    {
      id: 'revenue',
      title: 'Doanh thu tháng',
      value: '452.000.000đ',
      change: '+12%',
      trend: 'up',
      badgeBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      icon: (
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
          <BarChart3 size={22} />
        </div>
      ),
    },
    {
      id: 'orders',
      title: 'Tổng đơn hàng',
      value: '1,248',
      change: '+8%',
      trend: 'up',
      badgeBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      icon: (
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
          <Boxes size={22} />
        </div>
      ),
    },
    {
      id: 'inventory-alert',
      title: 'Cảnh báo kho',
      value: '12 mặt hàng',
      change: 'Cần nhập kho',
      trend: 'warning',
      badgeBg: 'bg-rose-50 text-rose-600 border border-rose-100 font-medium',
      icon: (
        <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 animate-pulse">
          <AlertTriangle size={22} />
        </div>
      ),
    },
    {
      id: 'technicians',
      title: 'Kỹ thuật viên',
      value: '18 đang làm',
      change: 'avatars',
      trend: 'info',
      icon: (
        <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-[#F9A11B]">
          <UserCog size={22} />
        </div>
      ),
    },
  ];

  // Chart data for 7 days
  const chartData = [
    { day: 'Thứ 2', revenue: 45, cars: 12 },
    { day: 'Thứ 3', revenue: 52, cars: 15 },
    { day: 'Thứ 4', revenue: 38, cars: 10 },
    { day: 'Thứ 5', revenue: 65, cars: 18 },
    { day: 'Thứ 6', revenue: 58, cars: 16 },
    { day: 'Thứ 7', revenue: 85, cars: 24 },
    { day: 'CN', revenue: 95, cars: 28 },
  ];

  // Technician performance lists
  const technicians = [
    { name: 'Trần Hùng', score: 95, rank: '1st', avatar: 'TH' },
    { name: 'Lê Minh', score: 88, rank: '2nd', avatar: 'LM' },
    { name: 'Nguyễn Nam', score: 82, rank: '3rd', avatar: 'NN' },
  ];

  // Out of stock parts
  const lowStockParts = [
    { name: 'Dầu nhớt Castrol 5W-30', stock: 'Còn lại: 2 bình', critical: true },
    { name: 'Má phanh trước Toyota', stock: 'Còn lại: 4 bộ', critical: true },
    { name: 'Lọc gió điều hòa', stock: 'Còn lại: 6 cái', critical: false },
  ];

  // Detailed list of appointments
  const appointments: Appointment[] = [
    {
      id: 'apt-1',
      initials: 'PQ',
      avatarBg: 'bg-blue-100 text-blue-700',
      customerName: 'Phạm Quốc Anh',
      vehicle: 'Toyota Camry',
      plate: '30A-123.45',
      service: 'BẢO DƯỠNG ĐỊNH KỲ',
      serviceType: 'maintenance',
      time: '08:30',
      status: 'Đang chờ',
    },
    {
      id: 'apt-2',
      initials: 'MT',
      avatarBg: 'bg-purple-100 text-purple-700',
      customerName: 'Mai Thị Lan',
      vehicle: 'Honda CR-V',
      plate: '51G-987.65',
      service: 'THAY DẦU & LỌC',
      serviceType: 'oil',
      time: '09:15',
      status: 'Đang làm',
    },
    {
      id: 'apt-3',
      initials: 'VD',
      avatarBg: 'bg-amber-100 text-amber-700',
      customerName: 'Vương Đình Hưng',
      vehicle: 'Mazda 3',
      plate: '43A-444.21',
      service: 'SỬA PHANH',
      serviceType: 'brake',
      time: '10:00',
      status: 'Đặt trước',
    },
    {
      id: 'apt-4',
      initials: 'HN',
      avatarBg: 'bg-emerald-100 text-emerald-700',
      customerName: 'Hoàng Minh Nam',
      vehicle: 'Kia Cerato',
      plate: '29C-555.88',
      service: 'BẢO DƯỠNG ĐỊNH KỲ',
      serviceType: 'maintenance',
      time: '11:00',
      status: 'Đang chờ',
    },
    {
      id: 'apt-5',
      initials: 'TK',
      avatarBg: 'bg-rose-100 text-rose-700',
      customerName: 'Trần Văn Khánh',
      vehicle: 'Hyundai Accent',
      plate: '30E-888.99',
      service: 'THAY DẦU & LỌC',
      serviceType: 'oil',
      time: '14:30',
      status: 'Đặt trước',
    }
  ];

  // Filter appointments based on search query
  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt =>
      apt.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.plate.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Export report handler
  const handleExportReport = () => {
    showToast('Đang tạo báo cáo Excel. Vui lòng chờ...', 'info');
    setTimeout(() => {
      showToast('Xuất báo cáo tài chính thành công!', 'success');
    }, 1500);
  };

  // SVG Chart rendering helpers
  const chartHeight = 200;
  const chartWidth = 580;
  const padding = 40;
  const usableWidth = chartWidth - padding * 2;
  const usableHeight = chartHeight - padding * 2;

  // Max values for scale
  const maxRevenue = 100; // 100M
  const maxCars = 35;

  const points = chartData.map((data, index) => {
    const x = padding + (index / (chartData.length - 1)) * usableWidth;
    const yRevenue = chartHeight - padding - (data.revenue / maxRevenue) * usableHeight;
    const yCars = chartHeight - padding - (data.cars / maxCars) * usableHeight;
    return { x, yRevenue, yCars, ...data };
  });

  // SVG Path description generator
  const getLinePath = (pointList: typeof points, type: 'revenue' | 'cars') => {
    let path = '';
    pointList.forEach((pt, index) => {
      const y = type === 'revenue' ? pt.yRevenue : pt.yCars;
      if (index === 0) {
        path += `M ${pt.x} ${y}`;
      } else {
        // Draw smooth bezier curves
        const prevPt = pointList[index - 1];
        const prevY = type === 'revenue' ? prevPt.yRevenue : prevPt.yCars;
        const cpX1 = prevPt.x + (pt.x - prevPt.x) / 3;
        const cpY1 = prevY;
        const cpX2 = prevPt.x + 2 * (pt.x - prevPt.x) / 3;
        const cpY2 = y;
        path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${pt.x} ${y}`;
      }
    });
    return path;
  };

  const getAreaPath = (pointList: typeof points, type: 'revenue' | 'cars') => {
    const linePath = getLinePath(pointList, type);
    const firstX = pointList[0].x;
    const lastX = pointList[pointList.length - 1].x;
    const bottomY = chartHeight - padding;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">

      {/* TITLE & ACTIONS BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">Bảng điều khiển</h1>
          <p className="text-slate-500 text-sm">Chào buổi sáng, quản trị viên. Đây là tình hình gara hôm nay.</p>
        </div>

        {/* Top-level Page Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Custom Datepicker button */}
          <div className="relative">
            <button
              onClick={() => setIsTimeframeDropdownOpen(!isTimeframeDropdownOpen)}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <Calendar size={16} className="text-slate-500" />
              <span>24 Tháng 5, 2024</span>
              <ChevronDown size={14} className="text-slate-400 ml-1" />
            </button>
            {isTimeframeDropdownOpen && (
              <div className="absolute right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl py-2 w-48 z-15">
                {['Hôm nay', '7 ngày qua', 'Tháng này', 'Quý này'].map((time) => (
                  <button
                    key={time}
                    onClick={() => {
                      setActiveTimeframe(time);
                      setIsTimeframeDropdownOpen(false);
                      showToast(`Đã thay đổi bộ lọc: ${time}`, 'info');
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    {time}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export report button */}
          <button
            onClick={handleExportReport}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#00285E] text-white rounded-xl text-sm font-semibold shadow-md shadow-[#00285E]/10 hover:bg-[#082245] transition-all transform hover:translate-y-[-1px] active:translate-y-0"
          >
            <Download size={16} />
            <span>Xuất báo cáo</span>
          </button>
        </div>
      </div>

      {/* ROW 1: 4 KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <motion.div
            whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}
            key={kpi.id}
            onClick={() => showToast(`Chi tiết: ${kpi.title}`, 'info')}
            className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col justify-between cursor-pointer group transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                  {kpi.title}
                </span>
                <span className="text-2xl font-bold text-slate-900 tracking-tight block">
                  {kpi.value}
                </span>
              </div>
              {kpi.icon}
            </div>

            <div className="mt-5 flex items-center justify-between">
              {kpi.change === 'avatars' ? (
                <div className="flex -space-x-2.5 overflow-hidden">
                  <div className="w-6.5 h-6.5 rounded-full bg-blue-500 border border-white flex items-center justify-center text-[9px] font-bold text-white uppercase">TH</div>
                  <div className="w-6.5 h-6.5 rounded-full bg-[#F9A11B] border border-white flex items-center justify-center text-[9px] font-bold text-white uppercase">LM</div>
                  <div className="w-6.5 h-6.5 rounded-full bg-slate-400 border border-white flex items-center justify-center text-[9px] font-bold text-white uppercase">NN</div>
                  <div className="w-6.5 h-6.5 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[8px] font-semibold text-slate-600">+15</div>
                </div>
              ) : (
                <div className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${kpi.badgeBg} flex items-center gap-1`}>
                  {kpi.trend === 'up' && <TrendingUp size={12} className="stroke-[2.5px]" />}
                  {kpi.change}
                </div>
              )}
              <span className="text-[11px] font-medium text-slate-400 group-hover:text-[#00285E] transition-colors">
                Chi tiết →
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ROW 2: GRID OF 2 COLUMNS (CHART & TECH EFFICIENCY) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Column Left (2/3): Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs lg:col-span-2 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Biểu đồ Doanh thu & Lượt xe</h2>
              <p className="text-slate-400 text-xs mt-0.5">Xu hướng hoạt động của gara trong tuần</p>
            </div>

            {/* Time range selector dropdown */}
            <div className="relative">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                <span>{activeTimeframe}</span>
                <ChevronDown size={12} className="text-slate-400" />
              </button>
            </div>
          </div>

          {/* Chart Content Area */}
          <div className="flex-1 w-full flex items-center justify-center py-4 relative min-h-[220px]">
            {/* Horizontal gridlines */}
            <div className="absolute inset-0 flex flex-col justify-between py-10 pointer-events-none opacity-20">
              <div className="w-full h-[1px] bg-slate-400"></div>
              <div className="w-full h-[1px] bg-slate-400"></div>
              <div className="w-full h-[1px] bg-slate-400"></div>
              <div className="w-full h-[1px] bg-slate-400"></div>
            </div>

            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-full max-h-[240px] select-none"
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00285E" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00285E" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorCars" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#B8860B" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#B8860B" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              {/* Area fills */}
              <path d={getAreaPath(points, 'revenue')} fill="url(#colorRevenue)" />
              <path d={getAreaPath(points, 'cars')} fill="url(#colorCars)" />

              {/* Grid Lines */}
              {points.map((pt, i) => (
                <line
                  key={`grid-${i}`}
                  x1={pt.x}
                  y1={padding}
                  x2={pt.x}
                  y2={chartHeight - padding}
                  stroke="#E2E8F0"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              ))}

              {/* Line paths */}
              <path
                d={getLinePath(points, 'revenue')}
                fill="none"
                stroke="#00285E"
                strokeWidth={3.5}
                strokeLinecap="round"
              />
              <path
                d={getLinePath(points, 'cars')}
                fill="none"
                stroke="#B8860B"
                strokeWidth={2.5}
                strokeLinecap="round"
              />

              {/* Interactive tracking line */}
              {hoveredChartPoint !== null && (
                <line
                  x1={points[hoveredChartPoint].x}
                  y1={padding}
                  x2={points[hoveredChartPoint].x}
                  y2={chartHeight - padding}
                  stroke="#00285E"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                />
              )}

              {/* Data Points */}
              {points.map((pt, index) => {
                const isHovered = hoveredChartPoint === index;
                return (
                  <g key={index} className="cursor-pointer">
                    {/* Revenue Circle */}
                    <circle
                      cx={pt.x}
                      cy={pt.yRevenue}
                      r={isHovered ? 6 : 4}
                      fill="#00285E"
                      stroke="#FFFFFF"
                      strokeWidth={2}
                      onMouseEnter={() => setHoveredChartPoint(index)}
                      onMouseLeave={() => setHoveredChartPoint(null)}
                    />
                    {/* Cars Circle */}
                    <circle
                      cx={pt.x}
                      cy={pt.yCars}
                      r={isHovered ? 6 : 4}
                      fill="#B8860B"
                      stroke="#FFFFFF"
                      strokeWidth={2}
                      onMouseEnter={() => setHoveredChartPoint(index)}
                      onMouseLeave={() => setHoveredChartPoint(null)}
                    />
                  </g>
                );
              })}

              {/* X Axis labels */}
              {points.map((pt, i) => (
                <text
                  key={i}
                  x={pt.x}
                  y={chartHeight - 12}
                  textAnchor="middle"
                  fill="#94A3B8"
                  fontSize={11}
                  fontWeight="600"
                >
                  {pt.day}
                </text>
              ))}
            </svg>

            {/* Interactive Tooltip Overlay */}
            {hoveredChartPoint !== null && (
              <div
                className="absolute bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs space-y-1 pointer-events-none z-10"
                style={{
                  left: `${(points[hoveredChartPoint].x / chartWidth) * 90}%`,
                  top: '20px',
                }}
              >
                <div className="font-bold text-slate-300">{chartData[hoveredChartPoint].day}</div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00285E] border border-white"></span>
                  <span>Doanh thu: <strong>{chartData[hoveredChartPoint].revenue}Trđ</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B8860B] border border-white"></span>
                  <span>Lượt xe: <strong>{chartData[hoveredChartPoint].cars} lượt</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Chart Legend */}
          <div className="flex items-center justify-center gap-8 mt-4 pt-4 border-t border-slate-50 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#00285E]"></span>
              <span>Doanh thu</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#B8860B]"></span>
              <span>Lượt xe</span>
            </div>
          </div>
        </div>

        {/* Column Right (1/3): Tech Performance */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-0.5">Hiệu suất Kỹ thuật viên</h2>
            <p className="text-slate-400 text-xs mb-6">Xếp hạng dựa trên tiến độ hoàn thành</p>

            <div className="space-y-6">
              {technicians.map((tech) => (
                <div key={tech.name} className="flex items-center gap-4">
                  {/* Avatar with rank overlay */}
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-[#00285E]/5 flex items-center justify-center font-bold text-[#00285E]">
                      {tech.avatar}
                    </div>
                    {tech.rank === '1st' && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#F9A11B] text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white">
                        👑
                      </span>
                    )}
                  </div>

                  {/* Detail info & progress */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-800 text-sm block truncate">
                        {tech.name}
                      </span>
                      <span className="text-xs font-bold text-[#00285E]">
                        {tech.score}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${tech.score}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full bg-[#00285E] rounded-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* View detail bottom button */}
          <button
            onClick={() => showToast('Chuyển tới bảng nhân sự...', 'info')}
            className="w-full text-center py-3 text-xs font-bold text-[#00285E] hover:text-[#082245] hover:bg-slate-50 rounded-xl transition-all border border-slate-100 mt-6"
          >
            Xem chi tiết tất cả
          </button>
        </div>
      </div>

      {/* ROW 3: GRID OF 2 COLUMNS (APPOINTMENTS & PARTS TO BUY) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Column Left (2/3): Appointments */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs lg:col-span-2 flex flex-col justify-between overflow-hidden">
          <div className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Lịch hẹn hôm nay</h2>
                <span className="bg-[#EDF3FF] text-[#00285E] px-2.5 py-0.5 rounded-full text-xs font-bold">
                  24 Lịch hẹn
                </span>
              </div>

              {/* Small Filter controls */}
              <span className="text-xs text-slate-400 font-medium">Tự động cập nhật</span>
            </div>
            <p className="text-slate-400 text-xs mt-1">Danh sách xe đang hẹn dịch vụ hôm nay</p>
          </div>

          {/* Appointments List/Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse mt-4">
              <thead>
                <tr className="border-y border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th className="py-4.5 px-6">Khách hàng</th>
                  <th className="py-4.5 px-4">Phương tiện</th>
                  <th className="py-4.5 px-4">Dịch vụ</th>
                  <th className="py-4.5 px-4">Thời gian</th>
                  <th className="py-4.5 px-6">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                      Không tìm thấy kết quả phù hợp...
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.slice(0, 3).map((apt) => (
                    <tr
                      key={apt.id}
                      onClick={() => showToast(`Hồ sơ khách hàng: ${apt.customerName}`, 'info')}
                      className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      {/* Customer info */}
                      <td className="py-4 px-6 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${apt.avatarBg}`}>
                          {apt.initials}
                        </div>
                        <span className="font-bold text-slate-800 text-sm group-hover:text-[#00285E] transition-colors block">
                          {apt.customerName}
                        </span>
                      </td>

                      {/* Vehicle info */}
                      <td className="py-4 px-4">
                        <span className="text-slate-800 text-sm font-semibold block">{apt.vehicle}</span>
                        <span className="text-slate-400 text-xs font-semibold">{apt.plate}</span>
                      </td>

                      {/* Service info */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wide uppercase ${apt.serviceType === 'maintenance'
                              ? 'bg-[#FDF4E7] text-[#C27803]'
                              : apt.serviceType === 'oil'
                                ? 'bg-[#EBF5FF] text-[#1E40AF]'
                                : 'bg-[#FDF2F2] text-[#9B1C1C]'
                            }`}
                        >
                          {apt.service}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="py-4 px-4 font-bold text-slate-700 text-sm">
                        {apt.time}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${apt.status === 'Đang chờ'
                                ? 'bg-amber-500'
                                : apt.status === 'Đang làm'
                                  ? 'bg-emerald-500'
                                  : 'bg-slate-400'
                              }`}
                          ></span>
                          <span className="text-sm font-bold text-slate-600">{apt.status}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Actions Link */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-center">
            <button
              onClick={() => showToast('Chuyển tới quản lý lịch hẹn...', 'info')}
              className="text-xs font-bold text-[#00285E] hover:text-[#082245] transition-colors"
            >
              Xem tất cả lịch hẹn
            </button>
          </div>
        </div>

        {/* Column Right (1/3): Stock Alert */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Phụ tùng sắp hết</h2>
              <AlertTriangle className="text-rose-500" size={20} />
            </div>
            <p className="text-slate-400 text-xs mb-6">Mặt hàng dưới định mức tối thiểu</p>

            <div className="space-y-4">
              {lowStockParts.map((part) => (
                <div
                  key={part.name}
                  onClick={() => showToast(`Yêu cầu nhập kho: ${part.name}`, 'warning')}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all cursor-pointer group"
                >
                  <div className="space-y-1">
                    <span className="font-bold text-slate-800 text-sm block group-hover:text-[#00285E] transition-colors">
                      {part.name}
                    </span>
                    <span className="text-xs font-bold text-slate-400 block">{part.stock}</span>
                  </div>

                  {/* Cart icon */}
                  <button
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${part.critical
                        ? 'bg-rose-50 text-rose-500 hover:bg-rose-100 shadow-sm'
                        : 'bg-amber-50 text-amber-600 hover:bg-amber-100 shadow-sm'
                      }`}
                  >
                    <ShoppingCart size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Stock Management Button */}
          <button
            onClick={() => showToast('Chuyển tới màn hình quản lý kho...', 'info')}
            className="w-full py-3.5 text-sm font-bold text-[#00285E] hover:text-white border-2 border-[#00285E] hover:bg-[#00285E] rounded-xl transition-all mt-6 shadow-sm active:scale-[0.98]"
          >
            Quản lý kho
          </button>
        </div>
      </div>
    </div>
  );
}
