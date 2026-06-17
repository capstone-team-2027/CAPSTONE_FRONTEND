import { useState, useMemo, useEffect } from 'react';
import {
  ClipboardPlus,
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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFetchClient_v2 as useFetchClient } from '../../../hook/useFetchClient';
import { SERVICE_ORDER_API_ENDPOINTS } from '../../../constants/reception/appointmentsEndpoints';

export const SO_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  INSPECTING: { label: 'Tiếp nhận xe', color: '#6B7280', bg: '#F3F4F6', icon: Clock },
  ASSIGNED: { label: 'Đã phân công', color: '#6366F1', bg: '#EEF2FF', icon: Users },
  IN_PROGRESS: { label: 'Đang sửa chữa', color: '#3B82F6', bg: '#EFF6FF', icon: Loader2 },
  WAITING_FOR_PARTS: { label: 'Chờ phụ tùng', color: '#D97706', bg: '#FEF3C7', icon: AlertCircle },
  WAITING_APPROVAL: { label: 'Chờ khách duyệt', color: '#EC4899', bg: '#FDF2F8', icon: HelpCircle },
  QC_CHECKING: { label: 'Đang QC', color: '#8B5CF6', bg: '#F5F3FF', icon: Clock },
  COMPLETED: { label: 'Hoàn thành', color: '#10B981', bg: '#ECFDF5', icon: CheckCircle2 },
  CANCELLED: { label: 'Đã huỷ lệnh', color: '#EF4444', bg: '#FEF2F2', icon: XCircle },
};

const ITEMS_PER_PAGE = 5;

export default function ReceptionServiceOrderList() {
  const navigate = useNavigate();
  const { fetchPrivate } = useFetchClient();

  const [serviceOrders, setServiceOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadServiceOrders();
  }, []);

  const loadServiceOrders = async () => {
    try {
      setIsLoading(true);
      const res = await fetchPrivate(SERVICE_ORDER_API_ENDPOINTS.GET_ALL, 'GET');
      if (res && res.success) {
        setServiceOrders(res.data);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách lệnh sửa chữa:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered data
  const filteredOrders = useMemo(() => {
    return serviceOrders.filter((so) => {
      const customerName = so.vehicle?.customer?.user?.fullName || so.vehicle?.customer?.name || '';
      const customerPhone = so.vehicle?.customer?.phone || '';
      const vehiclePlate = so.vehicle?.license_plate || '';
      const soId = `SO-${so.id}`;

      const matchSearch =
        searchTerm === '' ||
        customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customerPhone.includes(searchTerm) ||
        vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        soId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'all' || so.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [searchTerm, statusFilter, serviceOrders]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  // KPI counts
  const kpiCounts = useMemo(() => ({
    total: serviceOrders.length,
    inProgress: serviceOrders.filter((o) => o.status === 'IN_PROGRESS' || o.status === 'WAITING_FOR_PARTS').length,
    waitingApproval: serviceOrders.filter((o) => o.status === 'WAITING_APPROVAL').length,
    completed: serviceOrders.filter((o) => o.status === 'COMPLETED').length,
  }), [serviceOrders]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatPrice = (price: number) => {
    return (price || 0).toLocaleString('vi-VN') + ' đ';
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2 flex items-center gap-2">
            <Wrench className="text-amber-500" size={28} />
            Quản lý hóa đơn dịch vụ
          </h1>
          <p className="text-slate-500 text-sm">
            Theo dõi, cập nhật trạng thái và xử lý yêu cầu hủy hóa đơn dịch vụ của khách hàng.
          </p>
        </div>
        <button
          onClick={() => navigate('/reception/service-orders/create')}
          className="flex items-center gap-2 px-5 py-3 bg-[#00285E] hover:bg-[#001a3f] text-white rounded-xl text-sm font-bold shadow-md transition-all self-start md:self-auto"
        >
          <ClipboardPlus size={16} />
          Tạo hóa đơn dịch vụ mới
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng lệnh', value: kpiCounts.total, icon: <Wrench size={22} />, color: '#00285E', bg: '#EFF6FF' },
          { label: 'Đang sửa chữa / Chờ linh kiện', value: kpiCounts.inProgress, icon: <Loader2 size={22} className="animate-spin" />, color: '#D97706', bg: '#FEF3C7' },
          { label: 'Chờ khách duyệt', value: kpiCounts.waitingApproval, icon: <HelpCircle size={22} />, color: '#EC4899', bg: '#FDF2F8' },
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
              placeholder="Tìm theo tên, SĐT, biển số xe, mã lệnh..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="INSPECTING">Tiếp nhận xe</option>
              <option value="ASSIGNED">Đã phân công</option>
              <option value="IN_PROGRESS">Đang sửa chữa</option>
              <option value="WAITING_FOR_PARTS">Chờ phụ tùng</option>
              <option value="WAITING_APPROVAL">Chờ khách duyệt</option>
              <option value="QC_CHECKING">Chờ QC</option>
              <option value="COMPLETED">Đã hoàn thành</option>
              <option value="CANCELLED">Đã huỷ</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 size={48} className="mb-4 text-slate-300 animate-spin" />
            <p className="text-lg font-semibold mb-1">Đang tải dữ liệu...</p>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <AlertCircle size={48} className="mb-4 text-slate-300" />
            <p className="text-lg font-semibold mb-1">Không tìm thấy lệnh sửa chữa</p>
            <p className="text-sm">Thử thay đổi từ khóa hoặc bộ lọc trạng thái.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th className="py-3 px-4">Mã lệnh</th>
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4">Xe</th>
                  <th className="py-3 px-4">Ngày tạo</th>
                  <th className="py-3 px-4">Tiến độ</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((so) => {
                  const statusCfg = SO_STATUS_CONFIG[so.status] || SO_STATUS_CONFIG['INSPECTING'];
                  const StatusIcon = statusCfg.icon;
                  return (
                    <tr key={so.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <span className="font-bold text-[#00285E] text-xs">SO-{so.id}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#EDF3FF] flex items-center justify-center shrink-0">
                            <Users size={16} className="text-[#00285E]" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm whitespace-nowrap">{so.vehicle?.customer?.user?.fullName || so.vehicle?.customer?.name || 'Khách vãng lai'}</p>
                            <p className="text-slate-400 text-xs">{so.vehicle?.customer?.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-semibold text-slate-700 text-xs">{so.vehicle?.license_plate}</p>
                          <p className="text-slate-400 text-xs whitespace-nowrap">{so.vehicle?.model?.make?.make_name} {so.vehicle?.model?.model_name}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-xs text-slate-600 font-semibold">{formatDate(so.createdAt)}</span>
                      </td>
                      <td className="py-4 px-4">
                        {(() => {
                          const tasks = so.tasks || [];
                          const totalTasks = tasks.length;
                          const completedTasks = tasks.filter((t: any) => t.status === 'COMPLETED').length;
                          const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                          return (
                            <div className="w-full max-w-[120px]">
                              <div className="flex justify-between text-[10px] font-bold mb-1">
                                <span className="text-slate-500">{completedTasks}/{totalTasks} công việc</span>
                                <span className={progressPercentage === 100 ? 'text-emerald-600' : 'text-[#00285E]'}>{progressPercentage}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${progressPercentage === 100 ? 'bg-emerald-500' : 'bg-[#00285E]'}`}
                                  style={{ width: `${progressPercentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap"
                          style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
                        >
                          <StatusIcon size={12} className={so.status === 'IN_PROGRESS' ? 'animate-spin' : ''} />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => navigate(`/reception/service-orders/${so.id}`)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#00285E] bg-[#EDF3FF] hover:bg-[#D2E2FF] transition-colors whitespace-nowrap"
                          >
                            <Eye size={13} />
                            Chi tiết
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
              Hiển thị {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)} / {filteredOrders.length} lệnh
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
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${page === currentPage
                      ? 'bg-[#00285E] text-white shadow-md'
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
