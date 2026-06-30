import { useState, useMemo, useEffect } from 'react';
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
  PlayCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFetchClient_v2 as useFetchClient } from '../../../hook/useFetchClient';
import { TASK_ASSIGNMENT_ENDPOINTS } from '../../../constants/technician/taskAssignmentEndpoint';

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
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'PAUSED' | 'PENDING_QC' | 'COMPLETED';
  rejectionReason?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  taskAssignmentId?: string | number;
}

const ASSIGNMENT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  ASSIGNED: { label: 'Mới phân công', color: '#D97706', bg: '#FEF3C7', icon: Clock },
  IN_PROGRESS: { label: 'Đang thực hiện', color: '#3B82F6', bg: '#EFF6FF', icon: CheckSquare },
  PAUSED: { label: 'Tạm dừng', color: '#EF4444', bg: '#FEF2F2', icon: XCircle },
  PENDING_QC: { label: 'Chờ QC', color: '#8B5CF6', bg: '#F5F3FF', icon: Eye },
  COMPLETED: { label: 'Hoàn thành', color: '#10B981', bg: '#ECFDF5', icon: CheckCircle2 },
};

interface QuotationItem {
  type: 'service' | 'part';
  service_catalog_id: number | null;
  spare_part_id: number | null;
  label: string;
  quantity: number;
  unit_price: number;
}

const emptyQuotationItem = (): QuotationItem => ({
  type: 'service',
  service_catalog_id: null,
  spare_part_id: null,
  label: '',
  quantity: 1,
  unit_price: 0,
});

const ITEMS_PER_PAGE = 5;

export default function TechnicianAssignments() {
  const navigate = useNavigate();
  const { fetchPrivate } = useFetchClient();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal tạo báo giá
  const [quotationOpen, setQuotationOpen] = useState(false);
  const [quotationServiceOrderId, setQuotationServiceOrderId] = useState<string>('');
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([emptyQuotationItem()]);
  const [quotationNote, setQuotationNote] = useState('');

  const openQuotationModal = (serviceOrderId: string) => {
    setQuotationServiceOrderId(serviceOrderId);
    setQuotationItems([emptyQuotationItem()]);
    setQuotationNote('');
    setQuotationOpen(true);
  };

  const updateQuotationItem = (index: number, patch: Partial<QuotationItem>) =>
    setQuotationItems(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item));

  const removeQuotationItem = (index: number) =>
    setQuotationItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== index));

  const quotationTotal = quotationItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const formatPrice = (v: number) => v.toLocaleString('vi-VN') + 'đ';

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setIsLoading(true);
        const response = await fetchPrivate(TASK_ASSIGNMENT_ENDPOINTS.GET_MY_ASSIGNMENTS);
        if (Array.isArray(response)) {
          const mappedData: Assignment[] = response.map((so: any) => {
            const services = so.tasks?.map((t: any) => t.catalog?.service_name) || [];
            const firstAssignment = so.tasks?.[0]?.assignments?.[0];
            
            let status: Assignment['status'] = 'ASSIGNED';
            if (firstAssignment && ['ASSIGNED', 'IN_PROGRESS', 'PAUSED', 'PENDING_QC', 'COMPLETED'].includes(firstAssignment.status)) {
               status = firstAssignment.status as Assignment['status'];
            }

            const aptDate = so.appointment?.scheduled_time ? new Date(so.appointment.scheduled_time) : new Date(so.createdAt);

            return {
              id: `SO-${so.id}`,
              serviceOrderId: so.id.toString(),
              technicianId: firstAssignment?.technician_id?.toString() || '',
              customerName: so.vehicle?.customer?.name || so.vehicle?.customer?.user?.fullName || 'Khách vãng lai',
              customerPhone: so.vehicle?.customer?.phone || so.vehicle?.customer?.user?.phoneNumber || '',
              vehiclePlate: so.vehicle?.license_plate || '',
              vehicleModel: `${so.vehicle?.model?.make?.make_name || ''} ${so.vehicle?.model?.model_name || ''}`.trim(),
              services: services.filter(Boolean),
              appointmentDate: aptDate.toISOString(),
              appointmentTime: aptDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              assignedAt: firstAssignment?.createdAt || so.createdAt,
              status: status,
              taskAssignmentId: firstAssignment?.id,
            };
          });
          setAssignments(mappedData);
        }
      } catch (error) {
        console.error('Lỗi khi tải danh sách phân công:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssignments();
  }, [fetchPrivate, refreshKey]);

  const handleStartTask = async (taskAssignmentId: string | number | undefined) => {
    if (!taskAssignmentId) {
      alert("Không tìm thấy thông tin phân công.");
      return;
    }
    try {
      await fetchPrivate(TASK_ASSIGNMENT_ENDPOINTS.START_TASK, 'PUT', { taskAssignmentId });
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error('Lỗi khi bắt đầu công việc:', error);
      alert(error.message || 'Đã xảy ra lỗi khi bắt đầu công việc.');
    }
  };

  const handleCompleteTask = async (taskAssignmentId: string | number | undefined) => {
    if (!taskAssignmentId) {
      alert("Không tìm thấy thông tin phân công.");
      return;
    }
    if (!confirm("Bạn có chắc chắn muốn HOÀN THÀNH công việc này?")) return;

    try {
      await fetchPrivate(TASK_ASSIGNMENT_ENDPOINTS.COMPLETE_TASK, 'PUT', { taskAssignmentId });
      setRefreshKey(prev => prev + 1);
      alert("Đã hoàn thành công việc thành công!");
    } catch (error: any) {
      console.error('Lỗi khi hoàn thành công việc:', error);
      alert(error.message || 'Đã xảy ra lỗi khi hoàn thành công việc.');
    }
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter((asg) => {
      const matchSearch =
        searchTerm === '' ||
        asg.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asg.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asg.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asg.serviceOrderId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'all' || asg.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [searchTerm, statusFilter, assignments]);

  const totalPages = Math.ceil(filteredAssignments.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAssignments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAssignments, currentPage]);

  const kpiCounts = useMemo(() => ({
    total: assignments.length,
    assigned: assignments.filter(a => a.status === 'ASSIGNED').length,
    inProgress: assignments.filter(a => a.status === 'IN_PROGRESS').length,
    completed: assignments.filter(a => a.status === 'COMPLETED').length,
  }), [assignments]);

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
          { label: 'Mới phân công', value: kpiCounts.assigned, icon: <Clock size={22} />, color: '#D97706', bg: '#FEF3C7' },
          { label: 'Đang thực hiện', value: kpiCounts.inProgress, icon: <CheckSquare size={22} />, color: '#3B82F6', bg: '#EFF6FF' },
          { label: 'Hoàn thành', value: kpiCounts.completed, icon: <CheckCircle2 size={22} />, color: '#10B981', bg: '#ECFDF5' },
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
              <option value="ASSIGNED">Mới phân công</option>
              <option value="IN_PROGRESS">Đang thực hiện</option>
              <option value="PAUSED">Tạm dừng</option>
              <option value="PENDING_QC">Chờ QC</option>
              <option value="COMPLETED">Hoàn thành</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 size={48} className="mb-4 text-[#0E4D40] animate-spin" />
            <p className="text-lg font-semibold mb-1 text-slate-700">Đang tải phân công...</p>
          </div>
        ) : paginatedData.length === 0 ? (
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
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                               if (asg.status === 'ASSIGNED') {
                                 handleStartTask(asg.taskAssignmentId);
                               } else if (asg.status === 'IN_PROGRESS') {
                                 handleCompleteTask(asg.taskAssignmentId);
                               }
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#0E4D40] bg-[#E8F5F0] hover:bg-[#C4E8E0] transition-colors"
                          >
                            {asg.status === 'ASSIGNED' ? <PlayCircle size={13} /> : asg.status === 'IN_PROGRESS' ? <CheckCircle2 size={13} /> : <Eye size={13} />}
                            {asg.status === 'ASSIGNED' ? 'Bắt đầu làm' : asg.status === 'IN_PROGRESS' ? 'Hoàn thành' : 'Chi tiết'}
                          </button>
                          
                          <button
                            onClick={() => openQuotationModal(asg.serviceOrderId)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Tạo báo giá"
                          >
                            <FileText size={16} />
                          </button>

                          <button
                            onClick={() => navigate(`/technician/assignments/${asg.serviceOrderId}`)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#0E4D40] hover:bg-slate-100 transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye size={16} />
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
      {/* MODAL TẠO BÁO GIÁ */}
      {quotationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setQuotationOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Tạo báo giá</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Đơn DV #{quotationServiceOrderId}</p>
              </div>
              <button
                onClick={() => setQuotationOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Danh sách items */}
              <div className="space-y-3">
                {quotationItems.map((item, index) => (
                  <div key={index} className="border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      {/* Toggle service/part */}
                      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => updateQuotationItem(index, { type: 'service', spare_part_id: null })}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${item.type === 'service' ? 'bg-white text-[#0E4D40] shadow-sm' : 'text-slate-500'}`}
                        >
                          Dịch vụ
                        </button>
                        <button
                          type="button"
                          onClick={() => updateQuotationItem(index, { type: 'part', service_catalog_id: null })}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${item.type === 'part' ? 'bg-white text-[#0E4D40] shadow-sm' : 'text-slate-500'}`}
                        >
                          Phụ tùng
                        </button>
                      </div>
                      {quotationItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuotationItem(index)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Tên dịch vụ / phụ tùng */}
                    <input
                      type="text"
                      placeholder={item.type === 'service' ? 'Tên dịch vụ' : 'Tên phụ tùng'}
                      value={item.label}
                      onChange={(e) => updateQuotationItem(index, { label: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0E4D40]/10 focus:border-[#0E4D40] transition-all"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-xs font-bold text-slate-500 mb-1.5 block">Số lượng</span>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity || ''}
                          onChange={(e) => updateQuotationItem(index, { quantity: e.target.value ? Number(e.target.value) : 1 })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0E4D40]/10 focus:border-[#0E4D40] transition-all"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold text-slate-500 mb-1.5 block">Đơn giá</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={item.unit_price ? item.unit_price.toLocaleString('vi-VN') : ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                            updateQuotationItem(index, { unit_price: raw ? Number(raw) : 0 });
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0E4D40]/10 focus:border-[#0E4D40] transition-all"
                        />
                      </label>
                    </div>

                    <div className="text-right text-xs font-bold text-slate-400">
                      Thành tiền:{' '}
                      <span className="text-[#0E4D40]">{formatPrice(item.quantity * item.unit_price)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Thêm dòng */}
              <button
                type="button"
                onClick={() => setQuotationItems(prev => [...prev, emptyQuotationItem()])}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-slate-300 text-sm font-bold text-slate-500 hover:border-[#0E4D40] hover:text-[#0E4D40] transition-colors"
              >
                <Plus size={16} />
                Thêm dòng
              </button>

              {/* Ghi chú */}
              <label className="block">
                <span className="text-xs font-bold text-slate-500 mb-1.5 block">Ghi chú</span>
                <textarea
                  rows={3}
                  value={quotationNote}
                  onChange={(e) => setQuotationNote(e.target.value)}
                  placeholder="Ghi chú thêm cho báo giá..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0E4D40]/10 focus:border-[#0E4D40] transition-all resize-none"
                />
              </label>

              {/* Tổng */}
              <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">Tổng báo giá</span>
                <span className="text-xl font-bold text-[#0E4D40]">{formatPrice(quotationTotal)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setQuotationOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Hủy
              </button>
              <button
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#0E4D40] text-white hover:bg-[#0a3a2f] transition-colors shadow-md"
              >
                Tạo báo giá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
