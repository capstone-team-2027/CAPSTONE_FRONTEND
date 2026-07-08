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
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useFetchClient_v2 as useFetchClient } from '../../../hook/useFetchClient';
import { TASK_ASSIGNMENT_ENDPOINTS } from '../../../constants/technician/taskAssignmentEndpoint';

// ========== TYPES ==========
interface AssignmentTask {
  taskId: number;
  serviceName: string;
}

interface Assignment {
  id: string;
  serviceOrderId: string;
  technicianId: string;
  customerName: string;
  customerPhone: string;
  vehiclePlate: string;
  vehicleModel: string;
  services: string[];
  tasks: AssignmentTask[];
  appointmentDate: string;
  appointmentTime: string;
  assignedAt: string;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'PAUSED' | 'PENDING_QC' | 'COMPLETED';
  rejectedAt?: string;
  taskAssignmentId?: string | number;
  bookingType: string;
}

interface SparePart {
  id: number;
  name: string;
  retail_price: number;
}

interface PartItem {
  spare_part_id: number | null;
  quantity: number;
}

interface RepairItem {
  label: string;
  quantity: number;
  repair_price: number;
}

const emptyPartItem = (): PartItem => ({ spare_part_id: null, quantity: 1 });
const emptyRepairItem = (): RepairItem => ({ label: '', quantity: 1, repair_price: 0 });

const ASSIGNMENT_STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  ASSIGNED: { label: 'Đã phân công', className: 'bg-amber-50 text-amber-600 border border-amber-200', icon: Clock },
  IN_PROGRESS: { label: 'Đang thực hiện', className: 'bg-blue-50 text-blue-700 border border-blue-200', icon: CheckSquare },
  PAUSED: { label: 'Tạm dừng', className: 'bg-rose-50 text-rose-600 border border-rose-200', icon: XCircle },
  PENDING_QC: { label: 'Chờ QC', className: 'bg-violet-50 text-violet-700 border border-violet-200', icon: Eye },
  COMPLETED: { label: 'Hoàn thành', className: 'bg-emerald-50 text-emerald-600 border border-emerald-200', icon: CheckCircle2 },
};

// Mock assignments removed to use API data

const ITEMS_PER_PAGE = 5;

export default function TechnicianAssignments() {
  const navigate = useNavigate();
  const { showToast } = useOutletContext<{ showToast: (text: string, type?: 'success' | 'info' | 'warning') => void }>();
  const { fetchPrivate } = useFetchClient();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [quotationOpen, setQuotationOpen] = useState(false);
  const [quotationAssignment, setQuotationAssignment] = useState<Assignment | null>(null);
  const [quotationTaskId, setQuotationTaskId] = useState<number | null>(null);
  const [partItems, setPartItems] = useState<PartItem[]>([emptyPartItem()]);
  const [repairItems, setRepairItems] = useState<RepairItem[]>([]);
  const [quotationNote, setQuotationNote] = useState('');
  const [quotationEmail, setQuotationEmail] = useState('');
  const [isSubmittingQuotation, setIsSubmittingQuotation] = useState(false);

  const [spareParts, setSpareParts] = useState<SparePart[]>([]);

  useEffect(() => {
    const fetchSpareParts = async () => {
      try {
        const response = await fetchPrivate(TASK_ASSIGNMENT_ENDPOINTS.GET_SPARE_PARTS);
        const raw = Array.isArray(response) ? response : (response && response.data ? response.data : []);
        if (Array.isArray(raw)) {
          setSpareParts(raw.map((p: any) => ({ ...p, retail_price: Number(p.retail_price) || 0 })));
        }
      } catch (error) {
        console.error('Lỗi khi tải danh sách phụ tùng:', error);
      }
    };
    fetchSpareParts();
  }, [fetchPrivate]);

  const openQuotationModal = (assignment: Assignment) => {
    setQuotationAssignment(assignment);
    setQuotationTaskId(assignment.tasks[0]?.taskId ?? null);
    setPartItems([emptyPartItem()]);
    setRepairItems([]);
    setQuotationNote('');
    setQuotationEmail('');
    setQuotationOpen(true);
  };

  const updatePartItem = (index: number, patch: Partial<PartItem>) =>
    setPartItems(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item));

  const updateRepairItem = (index: number, patch: Partial<RepairItem>) =>
    setRepairItems(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item));

  const removePartItem = (index: number) =>
    setPartItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== index));

  const removeRepairItem = (index: number) =>
    setRepairItems(prev => prev.filter((_, i) => i !== index));

  const getPartPrice = (sparePartId: number | null) =>
    spareParts.find(p => p.id === sparePartId)?.retail_price || 0;

  const quotationTotal =
    partItems.reduce((s, i) => s + i.quantity * getPartPrice(i.spare_part_id), 0) +
    repairItems.reduce((s, i) => s + i.quantity * i.repair_price, 0);

  const handleSubmitQuotation = async () => {
    if (!quotationTaskId) {
      alert('Vui lòng chọn công việc (task) cần báo giá.');
      return;
    }
    const validParts = partItems.filter(i => i.spare_part_id);
    const validRepairs = repairItems.filter(i => i.repair_price > 0);
    if (validParts.length === 0 && validRepairs.length === 0) {
      alert('Vui lòng thêm ít nhất một phụ tùng hoặc công sửa chữa.');
      return;
    }

    const items = [
      ...validParts.map(i => ({ spare_part_id: i.spare_part_id, quantity: i.quantity })),
      ...validRepairs.map(i => ({ quantity: i.quantity, repair_price: i.repair_price })),
    ];

    console.log('[Quotation] partItems:', partItems);
    console.log('[Quotation] validParts:', validParts);
    console.log('[Quotation] items payload:', items);

    setIsSubmittingQuotation(true);
    try {
      await fetchPrivate(TASK_ASSIGNMENT_ENDPOINTS.CREATE_QUOTATION, 'POST', {
        task_id: quotationTaskId,
        items,
        note: quotationNote || undefined,
        email: quotationEmail || undefined,
      });
      setQuotationOpen(false);
      setRefreshKey(prev => prev + 1);
      showToast('Đã tạo báo giá thành công!', 'success');
    } catch (error: any) {
      console.error('Lỗi khi tạo báo giá:', error);
      showToast(error.message || 'Đã xảy ra lỗi khi tạo báo giá.', 'warning');
    } finally {
      setIsSubmittingQuotation(false);
    }
  };

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setIsLoading(true);
        const response = await fetchPrivate(TASK_ASSIGNMENT_ENDPOINTS.GET_MY_ASSIGNMENTS);
        if (Array.isArray(response)) {
          const mappedData: Assignment[] = response.map((so: any) => {
            const services = (so.tasks?.map((t: any) => t.catalog?.service_name) || []).filter(Boolean);
            if (services.length === 0 && so.appointment?.booking_type && so.appointment.booking_type.includes('REPAIR')) {
              services.push('Kiểm tra');
            }
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
              services,
              tasks: (so.tasks || []).map((t: any) => ({
                taskId: t.id,
                serviceName: t.catalog?.service_name || `Task #${t.id}`,
              })),
              appointmentDate: aptDate.toISOString(),
              appointmentTime: aptDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              assignedAt: firstAssignment?.createdAt || so.createdAt,
              status: status,
              taskAssignmentId: firstAssignment?.id,
              bookingType: so.appointment?.booking_type || 'WALK_IN',
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
        <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2 flex items-center gap-2">
          <CheckSquare className="text-[#F9A11B]" size={28} />
          Quản lý phân công
        </h1>
        <p className="text-slate-500 text-sm">
          Xem và quản lý trạng thái phân công công việc sửa chữa.
        </p>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng phân công', value: kpiCounts.total, icon: <CheckSquare size={22} />, color: '#00285E', bg: '#EDF3FF' },
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
            <Loader2 size={48} className="mb-4 text-[#00285E] animate-spin" />
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
            <table className="w-full min-w-[1100px] text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th className="py-3 px-4 align-middle whitespace-nowrap">Mã</th>
                  <th className="py-3 px-4 align-middle whitespace-nowrap">Khách hàng</th>
                  <th className="py-3 px-4 align-middle whitespace-nowrap">Xe</th>
                  <th className="py-3 px-4 align-middle whitespace-nowrap">Dịch vụ</th>
                  <th className="py-3 px-4 align-middle whitespace-nowrap">Lịch hẹn</th>
                  <th className="py-3 px-4 align-middle whitespace-nowrap">Ngày phân công</th>
                  <th className="py-3 px-4 align-middle whitespace-nowrap">Trạng thái</th>
                  <th className="py-3 px-4 align-middle text-center whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((asg) => {
                  const statusCfg = ASSIGNMENT_STATUS_CONFIG[asg.status];
                  const StatusIcon = statusCfg.icon;
                  return (
                    <tr key={asg.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <span className="font-bold text-[#00285E] text-xs">{asg.id}</span>
                      </td>
                      <td className="py-4 px-4 align-middle">
                        <div className="flex items-center gap-2 min-w-[160px]">
                          <div className="w-8 h-8 shrink-0 rounded-full bg-[#EDF3FF] flex items-center justify-center">
                            <Users size={14} className="text-[#00285E]" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-700 text-xs truncate">{asg.customerName}</p>
                            <p className="text-[10px] text-slate-400 truncate">{asg.customerPhone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-middle">
                        <div className="flex items-center gap-1.5 min-w-[140px]">
                          <Car size={13} className="text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-700 text-xs truncate">{asg.vehiclePlate}</p>
                            <p className="text-[10px] text-slate-400 truncate">{asg.vehicleModel}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-middle">
                        <div className="flex flex-wrap gap-1 min-w-[160px] max-w-[220px]">
                          {asg.services.length > 0 ? (
                            asg.services.map((svc, i) => (
                              <span
                                key={i}
                                className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-600 font-medium"
                              >
                                {svc}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={11} className="text-slate-400 shrink-0" />
                          <div>
                            <p className="text-xs text-slate-700 font-semibold">{formatDate(asg.appointmentDate)}</p>
                            <p className="text-[10px] text-slate-400">{asg.appointmentTime}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <span className="text-xs text-slate-600 font-medium">{formatDateTime(asg.assignedAt)}</span>
                      </td>
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusCfg.className}`}
                        >
                          <StatusIcon size={12} className="shrink-0" />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 align-middle">
                        <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                          {asg.status === 'ASSIGNED' ? (
                            <button
                              onClick={() => handleStartTask(asg.taskAssignmentId)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#00285E] bg-[#EDF3FF] hover:bg-[#DCE8FF] transition-colors"
                            >
                              <PlayCircle size={13} />
                              Bắt đầu làm
                            </button>
                          ) : asg.status === 'IN_PROGRESS' ? (
                            (asg.bookingType === 'RECEPTIONIST_REPAIR' || asg.bookingType === 'CUSTOMER_REPAIR') ? (
                              <button
                                onClick={() => openQuotationModal(asg)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                              >
                                <CheckSquare size={13} />
                                Tạo báo giá
                              </button>
                            ) : (
                              <button
                                onClick={() => handleCompleteTask(asg.taskAssignmentId)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#00285E] bg-[#EDF3FF] hover:bg-[#DCE8FF] transition-colors"
                              >
                                <CheckCircle2 size={13} />
                                Hoàn thành
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => navigate(`/technician/assignments/${asg.serviceOrderId}`)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                              <Eye size={13} />
                              Chi tiết
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

      {/* MODAL TẠO BÁO GIÁ */}
      {quotationOpen && quotationAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setQuotationOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Tạo báo giá</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Đơn DV #{quotationAssignment.serviceOrderId}</p>
              </div>
              <button onClick={() => setQuotationOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-5">

              {/* SECTION: Thông tin khách hàng */}
              <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 shrink-0 rounded-full bg-[#EDF3FF] flex items-center justify-center">
                  <Users size={16} className="text-[#00285E]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 text-sm truncate">{quotationAssignment.customerName}</p>
                  <p className="text-xs text-slate-400 truncate">{quotationAssignment.customerPhone}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Car size={13} className="text-slate-400" />
                  <span className="text-xs font-semibold text-slate-600">{quotationAssignment.vehiclePlate}</span>
                </div>
              </div>

              {/* SECTION: Email gửi báo giá */}
              <label className="block">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Email gửi báo giá (tuỳ chọn)</span>
                <input
                  type="email"
                  placeholder="customer@email.com"
                  value={quotationEmail}
                  onChange={(e) => setQuotationEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                />
              </label>

              {/* SECTION: Phụ tùng */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phụ tùng</h4>
                <div className="space-y-2">
                  {partItems.map((item, index) => (
                    <div key={index} className="border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={item.spare_part_id ?? ''}
                          onChange={(e) => updatePartItem(index, { spare_part_id: e.target.value ? Number(e.target.value) : null })}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                        >
                          <option value="">-- Chọn phụ tùng --</option>
                          {spareParts.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} ({p.retail_price.toLocaleString('vi-VN')}đ)</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => removePartItem(index)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors shrink-0">
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <input
                        type="number"
                        min={1}
                        placeholder="Số lượng"
                        value={item.quantity || ''}
                        onChange={(e) => updatePartItem(index, { quantity: e.target.value ? Number(e.target.value) : 1 })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                      />
                      <div className="text-right text-xs font-bold text-slate-400">
                        Thành tiền: <span className="text-[#00285E]">{(item.quantity * getPartPrice(item.spare_part_id)).toLocaleString('vi-VN')}đ</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPartItems(prev => [...prev, emptyPartItem()])}
                  className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-slate-300 text-xs font-bold text-slate-500 hover:border-[#00285E] hover:text-[#00285E] transition-colors"
                >
                  <Plus size={14} /> Thêm phụ tùng
                </button>
              </div>

              {/* SECTION: Công sửa chữa */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Công sửa chữa</h4>
                <div className="space-y-2">
                  {repairItems.map((item, index) => (
                    <div key={index} className="border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Mô tả công việc"
                          value={item.label}
                          onChange={(e) => updateRepairItem(index, { label: e.target.value })}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                        />
                        <button type="button" onClick={() => removeRepairItem(index)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors shrink-0">
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Đơn giá"
                        value={item.repair_price ? item.repair_price.toLocaleString('vi-VN') : ''}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                          updateRepairItem(index, { repair_price: raw ? Number(raw) : 0 });
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                      />
                      <div className="text-right text-xs font-bold text-slate-400">
                        Thành tiền: <span className="text-[#00285E]">{item.repair_price.toLocaleString('vi-VN')}đ</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setRepairItems(prev => [...prev, emptyRepairItem()])}
                  className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-slate-300 text-xs font-bold text-slate-500 hover:border-[#00285E] hover:text-[#00285E] transition-colors"
                >
                  <Plus size={14} /> Thêm công sửa chữa
                </button>
              </div>

              {/* Ghi chú */}
              <label className="block">
                <span className="text-xs font-bold text-slate-500 mb-1.5 block">Ghi chú</span>
                <textarea
                  rows={3}
                  value={quotationNote}
                  onChange={(e) => setQuotationNote(e.target.value)}
                  placeholder="Ghi chú thêm cho báo giá..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all resize-none"
                />
              </label>

              {/* Tổng */}
              <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">Tổng báo giá</span>
                <span className="text-xl font-bold text-[#00285E]">{quotationTotal.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100 shrink-0">
              <button onClick={() => setQuotationOpen(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                Hủy
              </button>
              <button
                onClick={handleSubmitQuotation}
                disabled={isSubmittingQuotation}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#00285E] text-white hover:bg-[#062047] transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingQuotation ? 'Đang tạo...' : 'Tạo báo giá'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
