import { useState, useMemo } from 'react';
import {
  CheckSquare,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Car,
  Calendar,
  Eye,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ========== TYPES ==========
interface Assignment {
  id: string;
  serviceOrderId: string;
  technicianId: string;
  customerName: string;
  customerPhone: string;
  vehiclePlate: string;
  vehicleModel: string;
  services: string[];
  appointmentDate: string;
  appointmentTime: string;
  assignedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
  rejectionReason?: string;
  acceptedAt?: string;
  rejectedAt?: string;
}

const ASSIGNMENT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending: { label: 'Chờ phản hồi', color: '#D97706', bg: '#FEF3C7', icon: Clock },
  accepted: { label: 'Đã chấp nhận', color: '#10B981', bg: '#ECFDF5', icon: CheckCircle2 },
  rejected: { label: 'Đã từ chối', color: '#EF4444', bg: '#FEF2F2', icon: XCircle },
};

const MOCK_ASSIGNMENTS: Assignment[] = [
  {
    id: 'ASG-001',
    serviceOrderId: 'SO-001',
    technicianId: 'TECH-001',
    customerName: 'Nguyễn Văn An',
    customerPhone: '0901 234 567',
    vehiclePlate: '51A-123.45',
    vehicleModel: 'Toyota Camry 2.5Q',
    services: ['Bảo dưỡng định kỳ cấp 1', 'Thay dầu động cơ Castrol'],
    appointmentDate: '2026-06-05',
    appointmentTime: '08:30',
    assignedAt: '2026-06-03T08:00:00',
    status: 'accepted',
    acceptedAt: '2026-06-03T08:30:00',
  },
  {
    id: 'ASG-002',
    serviceOrderId: 'SO-002',
    technicianId: 'TECH-001',
    customerName: 'Trần Thị Bình',
    customerPhone: '0912 345 678',
    vehiclePlate: '30H-456.78',
    vehicleModel: 'Honda City RS',
    services: ['Thay dầu động cơ Castrol', 'Vệ sinh kim phun điện tử'],
    appointmentDate: '2026-06-05',
    appointmentTime: '10:00',
    assignedAt: '2026-06-03T09:00:00',
    status: 'pending',
  },
  {
    id: 'ASG-003',
    serviceOrderId: 'SO-003',
    technicianId: 'TECH-001',
    customerName: 'Phạm Minh Hùng',
    customerPhone: '0909 888 777',
    vehiclePlate: '51G-888.88',
    vehicleModel: 'Mercedes-Benz C200',
    services: ['Bảo dưỡng định kỳ cấp 2', 'Cân chỉnh thước lái 3D'],
    appointmentDate: '2026-06-06',
    appointmentTime: '14:00',
    assignedAt: '2026-06-03T10:00:00',
    status: 'pending',
  },
  {
    id: 'ASG-004',
    serviceOrderId: 'SO-005',
    technicianId: 'TECH-001',
    customerName: 'Đặng Hoàng Nam',
    customerPhone: '0988 555 444',
    vehiclePlate: '51K-555.55',
    vehicleModel: 'Hyundai SantaFe',
    services: ['Bảo dưỡng định kỳ cấp 2', 'Sơn phục hồi vết xước'],
    appointmentDate: '2026-06-05',
    appointmentTime: '15:30',
    assignedAt: '2026-06-02T14:00:00',
    status: 'accepted',
    acceptedAt: '2026-06-02T14:30:00',
  },
  {
    id: 'ASG-005',
    serviceOrderId: 'SO-006',
    technicianId: 'TECH-001',
    customerName: 'Võ Thị Mai',
    customerPhone: '0966 777 888',
    vehiclePlate: '43A-321.00',
    vehicleModel: 'Kia Seltos',
    services: ['Bảo dưỡng định kỳ cấp 1'],
    appointmentDate: '2026-06-05',
    appointmentTime: '11:00',
    assignedAt: '2026-06-03T16:00:00',
    status: 'pending',
  },
  {
    id: 'ASG-006',
    serviceOrderId: 'SO-007',
    technicianId: 'TECH-001',
    customerName: 'Lý Thanh Tùng',
    customerPhone: '0933 222 111',
    vehiclePlate: '51B-777.77',
    vehicleModel: 'Ford Ranger',
    services: ['Thay phanh sau'],
    appointmentDate: '2026-06-04',
    appointmentTime: '09:00',
    assignedAt: '2026-06-01T10:00:00',
    status: 'rejected',
    rejectedAt: '2026-06-01T10:30:00',
    rejectionReason: 'Kỹ thuật viên đang xử lý xe khác, không đủ thời gian.',
  },
];

const ITEMS_PER_PAGE = 5;

export default function TechnicianAssignments() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredAssignments = useMemo(() => {
    return MOCK_ASSIGNMENTS.filter((asg) => {
      const matchSearch =
        searchTerm === '' ||
        asg.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asg.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asg.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asg.serviceOrderId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'all' || asg.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredAssignments.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAssignments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAssignments, currentPage]);

  const kpiCounts = useMemo(() => ({
    total: MOCK_ASSIGNMENTS.length,
    pending: MOCK_ASSIGNMENTS.filter(a => a.status === 'pending').length,
    accepted: MOCK_ASSIGNMENTS.filter(a => a.status === 'accepted').length,
    rejected: MOCK_ASSIGNMENTS.filter(a => a.status === 'rejected').length,
  }), []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#0E4D40] tracking-tight leading-none mb-2 flex items-center gap-2">
          <CheckSquare className="text-amber-500" size={28} />
          Quản lý phân công
        </h1>
        <p className="text-slate-500 text-sm">
          Xem và quản lý trạng thái phân công công việc sửa chữa.
        </p>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng phân công', value: kpiCounts.total, icon: <CheckSquare size={22} />, color: '#0E4D40', bg: '#E8F5F0' },
          { label: 'Chờ phản hồi', value: kpiCounts.pending, icon: <Clock size={22} />, color: '#D97706', bg: '#FEF3C7' },
          { label: 'Đã chấp nhận', value: kpiCounts.accepted, icon: <CheckCircle2 size={22} />, color: '#10B981', bg: '#ECFDF5' },
          { label: 'Đã từ chối', value: kpiCounts.rejected, icon: <XCircle size={22} />, color: '#EF4444', bg: '#FEF2F2' },
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
              placeholder="Tìm theo tên khách, biển số xe, mã phân công..."
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
              <option value="pending">Chờ phản hồi</option>
              <option value="accepted">Đã chấp nhận</option>
              <option value="rejected">Đã từ chối</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        {paginatedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <AlertCircle size={48} className="mb-4 text-slate-300" />
            <p className="text-lg font-semibold mb-1">Không tìm thấy phân công</p>
            <p className="text-sm">Thử thay đổi từ khóa hoặc bộ lọc trạng thái.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th className="py-3 px-4">Mã phân công</th>
                  <th className="py-3 px-4">Mã đơn DV</th>
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4">Xe</th>
                  <th className="py-3 px-4">Dịch vụ</th>
                  <th className="py-3 px-4">Lịch hẹn</th>
                  <th className="py-3 px-4">Ngày phân công</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((asg) => {
                  const statusCfg = ASSIGNMENT_STATUS_CONFIG[asg.status];
                  const StatusIcon = statusCfg.icon;
                  return (
                    <tr key={asg.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <span className="font-bold text-[#0E4D40] text-xs">{asg.id}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-slate-600 text-xs">{asg.serviceOrderId}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#E8F5F0] flex items-center justify-center">
                            <Users size={14} className="text-[#0E4D40]" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-700 text-xs">{asg.customerName}</p>
                            <p className="text-[10px] text-slate-400">{asg.customerPhone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <Car size={13} className="text-slate-400" />
                          <div>
                            <p className="font-semibold text-slate-700 text-xs">{asg.vehiclePlate}</p>
                            <p className="text-[10px] text-slate-400">{asg.vehicleModel}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-0.5 max-w-[140px]">
                          {asg.services.slice(0, 2).map((svc, i) => (
                            <p key={i} className="text-[10px] text-slate-600 font-medium truncate">{svc}</p>
                          ))}
                          {asg.services.length > 2 && (
                            <p className="text-[10px] text-slate-400">+{asg.services.length - 2} khác</p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1">
                          <Calendar size={11} className="text-slate-400" />
                          <div>
                            <p className="text-xs text-slate-700 font-semibold">{formatDate(asg.appointmentDate)}</p>
                            <p className="text-[10px] text-slate-400">{asg.appointmentTime}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-xs text-slate-600 font-medium">{formatDateTime(asg.assignedAt)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
                          style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
                        >
                          <StatusIcon size={12} />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => navigate(`/technician/service-orders/${asg.serviceOrderId}`)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#0E4D40] bg-[#E8F5F0] hover:bg-[#C4E8E0] transition-colors"
                          >
                            <Eye size={13} />
                            {asg.status === 'pending' ? 'Phản hồi' : 'Chi tiết'}
                          </button>
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
              Hiển thị {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredAssignments.length)} / {filteredAssignments.length} phân công
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
