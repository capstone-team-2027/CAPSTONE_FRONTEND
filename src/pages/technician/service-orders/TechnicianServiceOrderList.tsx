import { useState, useMemo } from 'react';
import {
  ClipboardList,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Wrench,
  HelpCircle,
  RefreshCw,
  Car,
  Calendar,
  Activity,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ========== TYPES ==========
export interface TechServiceOrder {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  vehiclePlate: string;
  vehicleModel: string;
  vehicleColor: string;
  vehicleMileage: number;
  services: { id: string; name: string; price: number; category: string }[];
  appointmentDate: string;
  appointmentTime: string;
  assignedTechnician: string;
  status: 'pending_acceptance' | 'accepted' | 'in_progress' | 'waiting_parts' | 'completed' | 'rejected';
  notes?: string;
  createdAt: string;
}

// ========== MOCK DATA ==========
const MOCK_TECH_SERVICE_ORDERS: TechServiceOrder[] = [
  {
    id: 'SO-001',
    customerId: 'C001',
    customerName: 'Nguyễn Văn An',
    customerPhone: '0901 234 567',
    vehiclePlate: '51A-123.45',
    vehicleModel: 'Toyota Camry 2.5Q',
    vehicleColor: 'Trắng',
    vehicleMileage: 45000,
    services: [
      { id: 'SV001', name: 'Bảo dưỡng định kỳ cấp 1', price: 500000, category: 'Bảo dưỡng' },
      { id: 'SV003', name: 'Thay dầu động cơ Castrol', price: 650000, category: 'Dầu nhớt' },
    ],
    appointmentDate: '2026-06-05',
    appointmentTime: '08:30',
    assignedTechnician: 'Trần Minh Tuấn',
    status: 'in_progress',
    notes: 'Khách yêu cầu kiểm tra thêm hệ thống phanh',
    createdAt: '2026-06-02T09:30:00',
  },
  {
    id: 'SO-002',
    customerId: 'C002',
    customerName: 'Trần Thị Bình',
    customerPhone: '0912 345 678',
    vehiclePlate: '30H-456.78',
    vehicleModel: 'Honda City RS',
    vehicleColor: 'Đỏ',
    vehicleMileage: 22000,
    services: [
      { id: 'SV003', name: 'Thay dầu động cơ Castrol', price: 650000, category: 'Dầu nhớt' },
      { id: 'SV005', name: 'Vệ sinh kim phun điện tử', price: 1200000, category: 'Động cơ' },
    ],
    appointmentDate: '2026-06-05',
    appointmentTime: '10:00',
    assignedTechnician: 'Trần Minh Tuấn',
    status: 'pending_acceptance',
    createdAt: '2026-06-02T10:15:00',
  },
  {
    id: 'SO-003',
    customerId: 'C009',
    customerName: 'Phạm Minh Hùng',
    customerPhone: '0909 888 777',
    vehiclePlate: '51G-888.88',
    vehicleModel: 'Mercedes-Benz C200',
    vehicleColor: 'Đen',
    vehicleMileage: 15000,
    services: [
      { id: 'SV002', name: 'Bảo dưỡng định kỳ cấp 2', price: 1200000, category: 'Bảo dưỡng' },
      { id: 'SV004', name: 'Cân chỉnh thước lái 3D', price: 600000, category: 'Sửa chữa gầm' },
    ],
    appointmentDate: '2026-06-06',
    appointmentTime: '14:00',
    assignedTechnician: 'Trần Minh Tuấn',
    status: 'waiting_parts',
    notes: 'Chờ phụ tùng gầm xe',
    createdAt: '2026-06-02T11:00:00',
  },
  {
    id: 'SO-004',
    customerId: 'C010',
    customerName: 'Lê Văn Nam',
    customerPhone: '0977 123 456',
    vehiclePlate: '30A-999.99',
    vehicleModel: 'Mazda 3 Premium',
    vehicleColor: 'Xanh',
    vehicleMileage: 32000,
    services: [
      { id: 'SV007', name: 'Thay má phanh trước', price: 800000, category: 'Phanh' },
    ],
    appointmentDate: '2026-06-04',
    appointmentTime: '09:00',
    assignedTechnician: 'Trần Minh Tuấn',
    status: 'completed',
    createdAt: '2026-06-02T08:00:00',
  },
  {
    id: 'SO-005',
    customerId: 'C011',
    customerName: 'Đặng Hoàng Nam',
    customerPhone: '0988 555 444',
    vehiclePlate: '51K-555.55',
    vehicleModel: 'Hyundai SantaFe',
    vehicleColor: 'Bạc',
    vehicleMileage: 60000,
    services: [
      { id: 'SV002', name: 'Bảo dưỡng định kỳ cấp 2', price: 1200000, category: 'Bảo dưỡng' },
      { id: 'SV010', name: 'Sơn phục hồi vết xước', price: 1500000, category: 'Thân vỏ' },
    ],
    appointmentDate: '2026-06-05',
    appointmentTime: '15:30',
    assignedTechnician: 'Trần Minh Tuấn',
    status: 'accepted',
    createdAt: '2026-06-01T14:00:00',
  },
  {
    id: 'SO-006',
    customerId: 'C012',
    customerName: 'Võ Thị Mai',
    customerPhone: '0966 777 888',
    vehiclePlate: '43A-321.00',
    vehicleModel: 'Kia Seltos',
    vehicleColor: 'Cam',
    vehicleMileage: 18000,
    services: [
      { id: 'SV001', name: 'Bảo dưỡng định kỳ cấp 1', price: 500000, category: 'Bảo dưỡng' },
    ],
    appointmentDate: '2026-06-05',
    appointmentTime: '11:00',
    assignedTechnician: 'Trần Minh Tuấn',
    status: 'pending_acceptance',
    notes: 'Khách hẹn đúng giờ',
    createdAt: '2026-06-03T16:00:00',
  },
];

export const TECH_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending_acceptance: { label: 'Chờ chấp nhận', color: '#D97706', bg: '#FEF3C7', icon: Clock },
  accepted: { label: 'Đã chấp nhận', color: '#6366F1', bg: '#EEF2FF', icon: CheckCircle2 },
  in_progress: { label: 'Đang sửa chữa', color: '#3B82F6', bg: '#EFF6FF', icon: Loader2 },
  waiting_parts: { label: 'Chờ phụ tùng', color: '#EC4899', bg: '#FDF2F8', icon: AlertCircle },
  completed: { label: 'Hoàn thành', color: '#10B981', bg: '#ECFDF5', icon: CheckCircle2 },
  rejected: { label: 'Đã từ chối', color: '#EF4444', bg: '#FEF2F2', icon: XCircle },
};

const ITEMS_PER_PAGE = 5;

export default function TechnicianServiceOrderList() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Filtered data — only active service orders (exclude rejected)
  const filteredOrders = useMemo(() => {
    return MOCK_TECH_SERVICE_ORDERS.filter((so) => {
      const matchSearch =
        searchTerm === '' ||
        so.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        so.customerPhone.includes(searchTerm) ||
        so.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        so.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'all' || so.status === statusFilter;

      // Only show active orders (exclude rejected from default view)
      const isActive = statusFilter === 'rejected' ? true : so.status !== 'rejected';

      return matchSearch && matchStatus && isActive;
    });
  }, [searchTerm, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  // KPI counts
  const kpiCounts = useMemo(() => ({
    total: MOCK_TECH_SERVICE_ORDERS.filter(o => o.status !== 'rejected').length,
    pending: MOCK_TECH_SERVICE_ORDERS.filter(o => o.status === 'pending_acceptance').length,
    inProgress: MOCK_TECH_SERVICE_ORDERS.filter(o => o.status === 'in_progress' || o.status === 'accepted').length,
    completed: MOCK_TECH_SERVICE_ORDERS.filter(o => o.status === 'completed').length,
  }), []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('vi-VN') + ' đ';
  };

  const getOrderTotal = (services: { price: number }[]) => {
    return services.reduce((sum, s) => sum + s.price, 0);
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#0E4D40] tracking-tight leading-none mb-2 flex items-center gap-2">
            <ClipboardList className="text-amber-500" size={28} />
            Đơn dịch vụ được phân công
          </h1>
          <p className="text-slate-500 text-sm">
            Xem danh sách đơn dịch vụ được phân công cho bạn, bao gồm thông tin khách hàng, xe và dịch vụ.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-5 py-3 bg-[#0E4D40] hover:bg-[#0a3a30] text-white rounded-xl text-sm font-bold shadow-md transition-all self-start md:self-auto"
        >
          <RefreshCw size={16} />
          Làm mới
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng đơn dịch vụ', value: kpiCounts.total, icon: <ClipboardList size={22} />, color: '#0E4D40', bg: '#E8F5F0' },
          { label: 'Chờ chấp nhận', value: kpiCounts.pending, icon: <Clock size={22} />, color: '#D97706', bg: '#FEF3C7' },
          { label: 'Đang thực hiện', value: kpiCounts.inProgress, icon: <Activity size={22} />, color: '#3B82F6', bg: '#EFF6FF' },
          { label: 'Đã hoàn thành', value: kpiCounts.completed, icon: <CheckCircle2 size={22} />, color: '#059669', bg: '#D1FAE5' },
        ].map((card, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{card.label}</span>
                <span className="text-2xl font-bold text-slate-900 tracking-tight block">{card.value}</span>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.bg, color: card.color }}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH & FILTER */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên khách, SĐT, biển số xe, mã đơn..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E4D40]/10 focus:border-[#0E4D40] transition-all font-semibold"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0E4D40]/10 focus:border-[#0E4D40] transition-all"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending_acceptance">Chờ chấp nhận</option>
              <option value="accepted">Đã chấp nhận</option>
              <option value="in_progress">Đang sửa chữa</option>
              <option value="waiting_parts">Chờ phụ tùng</option>
              <option value="completed">Hoàn thành</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        {paginatedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <AlertCircle size={48} className="mb-4 text-slate-300" />
            <p className="text-lg font-semibold mb-1">Không tìm thấy đơn dịch vụ</p>
            <p className="text-sm">Thử thay đổi từ khóa hoặc bộ lọc trạng thái.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th className="py-3 px-4">Mã đơn</th>
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4">Thông tin xe</th>
                  <th className="py-3 px-4">Dịch vụ</th>
                  <th className="py-3 px-4">Lịch hẹn</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((so) => {
                  const statusCfg = TECH_STATUS_CONFIG[so.status];
                  const StatusIcon = statusCfg.icon;
                  return (
                    <tr key={so.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <span className="font-bold text-[#0E4D40] text-xs">{so.id}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#E8F5F0] flex items-center justify-center">
                            <Users size={16} className="text-[#0E4D40]" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{so.customerName}</p>
                            <p className="text-slate-400 text-xs">{so.customerPhone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Car size={14} className="text-slate-400" />
                          <div>
                            <p className="font-semibold text-slate-700 text-xs">{so.vehiclePlate}</p>
                            <p className="text-slate-400 text-xs">{so.vehicleModel}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          {so.services.slice(0, 2).map((svc) => (
                            <p key={svc.id} className="text-xs text-slate-600 font-medium truncate max-w-[160px]">{svc.name}</p>
                          ))}
                          {so.services.length > 2 && (
                            <p className="text-[10px] text-slate-400 font-semibold">+{so.services.length - 2} dịch vụ khác</p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-slate-400" />
                          <div>
                            <p className="text-xs text-slate-700 font-semibold">{formatDate(so.appointmentDate)}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{so.appointmentTime}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                          style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
                        >
                          <StatusIcon size={12} className={so.status === 'in_progress' ? 'animate-spin' : ''} />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => navigate(`/technician/service-orders/${so.id}`)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#0E4D40] bg-[#E8F5F0] hover:bg-[#C4E8E0] transition-colors"
                          >
                            <Eye size={13} />
                            Xem chi tiết
                          </button>
                          {(so.status === 'in_progress' || so.status === 'accepted') && (
                            <button
                              onClick={() => navigate(`/technician/progress/${so.id}`)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#0E4D40] hover:bg-[#0a3a30] transition-colors"
                            >
                              <Activity size={13} />
                              Cập nhật
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-400">
              Hiển thị {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)} / {filteredOrders.length} đơn
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    page === currentPage
                      ? 'bg-[#0E4D40] text-white shadow-md'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
