import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Car,
  Users,
  Calendar,
  Clock,
  Wrench,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Phone,
  Gauge,
  Palette,
  ClipboardList,
  MessageSquare,
  Send,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

// Re-use type & mock data from list (in real app this would be from API/store)
const TECH_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending_acceptance: { label: 'Chờ chấp nhận', color: '#D97706', bg: '#FEF3C7', icon: Clock },
  accepted: { label: 'Đã chấp nhận', color: '#6366F1', bg: '#EEF2FF', icon: CheckCircle2 },
  in_progress: { label: 'Đang sửa chữa', color: '#3B82F6', bg: '#EFF6FF', icon: Loader2 },
  waiting_parts: { label: 'Chờ phụ tùng', color: '#EC4899', bg: '#FDF2F8', icon: AlertCircle },
  completed: { label: 'Hoàn thành', color: '#10B981', bg: '#ECFDF5', icon: CheckCircle2 },
  rejected: { label: 'Đã từ chối', color: '#EF4444', bg: '#FEF2F2', icon: XCircle },
};

const MOCK_ORDER = {
  id: 'SO-002',
  assignmentId: 'ASG-002',
  customerId: 'C002',
  customerName: 'Trần Thị Bình',
  customerPhone: '0912 345 678',
  customerEmail: 'binh.tran@email.com',
  vehiclePlate: '30H-456.78',
  vehicleModel: 'Honda City RS',
  vehicleColor: 'Đỏ',
  vehicleVIN: 'MRHGM6670NP001234',
  vehicleMileage: 22000,
  services: [
    { id: 'SV003', name: 'Thay dầu động cơ Castrol', price: 650000, category: 'Dầu nhớt', estimatedTime: '30 phút' },
    { id: 'SV005', name: 'Vệ sinh kim phun điện tử', price: 1200000, category: 'Động cơ', estimatedTime: '60 phút' },
  ],
  appointmentDate: '2026-06-05',
  appointmentTime: '10:00',
  assignedTechnician: 'Trần Minh Tuấn',
  technicianId: 'TECH-001',
  status: 'pending_acceptance' as string,
  notes: 'Xe bị rung khi tăng tốc, cần kiểm tra thêm hệ thống phun xăng.',
  createdAt: '2026-06-02T10:15:00',
  assignedAt: '2026-06-03T08:00:00',
};

export default function TechnicianServiceOrderDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [order, setOrder] = useState(MOCK_ORDER);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusCfg = TECH_STATUS_CONFIG[order.status];
  const StatusIcon = statusCfg?.icon || Clock;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('vi-VN') + ' đ';
  };

  const totalCost = order.services.reduce((sum, s) => sum + s.price, 0);

  // 3.5.2 Accept Assignment
  const handleAcceptAssignment = async () => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    setOrder(prev => ({ ...prev, status: 'accepted' }));
    setShowAcceptConfirm(false);
    setIsSubmitting(false);
  };

  // 3.5.3 Reject Assignment
  const handleRejectAssignment = async () => {
    if (!rejectReason.trim()) {
      setRejectError('Vui lòng nhập lý do từ chối phân công.');
      return;
    }
    setRejectError('');
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    setOrder(prev => ({ ...prev, status: 'rejected' }));
    setShowRejectModal(false);
    setRejectReason('');
    setIsSubmitting(false);
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-5xl w-full mx-auto">
      {/* BACK BUTTON + HEADER */}
      <div className="flex flex-col gap-4">
        <button
          onClick={() => navigate('/technician/service-orders')}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#0E4D40] transition-colors self-start"
        >
          <ArrowLeft size={16} />
          Quay lại danh sách đơn dịch vụ
        </button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#0E4D40] tracking-tight leading-none mb-2 flex items-center gap-3">
              <ClipboardList className="text-amber-500" size={28} />
              Chi tiết đơn dịch vụ
              <span className="text-lg font-bold text-slate-400">#{order.id}</span>
            </h1>
            <p className="text-slate-500 text-sm">
              Thông tin chi tiết đơn dịch vụ và phân công công việc.
            </p>
          </div>
          {/* Status Badge */}
          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold self-start"
            style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
          >
            <StatusIcon size={16} className={order.status === 'in_progress' ? 'animate-spin' : ''} />
            {statusCfg.label}
          </span>
        </div>
      </div>

      {/* ASSIGNMENT INFO BANNER */}
      <div className="bg-gradient-to-r from-[#E8F5F0] to-[#D5F0E8] p-5 rounded-2xl border border-[#C4E8E0]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mã phân công</p>
            <p className="font-bold text-[#0E4D40]">{order.assignmentId}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kỹ thuật viên</p>
            <p className="font-semibold text-slate-700">{order.assignedTechnician}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ngày phân công</p>
            <p className="font-semibold text-slate-700">{formatDateTime(order.assignedAt)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lịch hẹn</p>
            <p className="font-semibold text-slate-700">{formatDate(order.appointmentDate)} — {order.appointmentTime}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CUSTOMER INFO CARD */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#E8F5F0] flex items-center justify-center">
              <Users size={16} className="text-[#0E4D40]" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Thông tin khách hàng</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0E4D40] to-[#1a7a66] flex items-center justify-center text-white font-bold text-lg">
                {order.customerName.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-slate-800">{order.customerName}</p>
                <p className="text-xs text-slate-400">Mã KH: {order.customerId}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Phone size={14} className="text-slate-400" />
              <span className="font-medium">{order.customerPhone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <FileText size={14} className="text-slate-400" />
              <span className="font-medium">{order.customerEmail}</span>
            </div>
          </div>
        </div>

        {/* VEHICLE INFO CARD */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#E8F5F0] flex items-center justify-center">
              <Car size={16} className="text-[#0E4D40]" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Thông tin xe</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Biển số</p>
              <p className="font-bold text-[#0E4D40] text-base">{order.vehiclePlate}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Dòng xe</p>
              <p className="font-semibold text-slate-700">{order.vehicleModel}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Palette size={13} className="text-slate-400" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Màu</p>
                <p className="font-semibold text-slate-700">{order.vehicleColor}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Gauge size={13} className="text-slate-400" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Số Km</p>
                <p className="font-semibold text-slate-700">{order.vehicleMileage.toLocaleString()} km</p>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Số VIN</p>
            <p className="font-mono text-xs text-slate-600">{order.vehicleVIN}</p>
          </div>
        </div>
      </div>

      {/* SERVICE LIST */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#E8F5F0] flex items-center justify-center">
            <Wrench size={16} className="text-[#0E4D40]" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Dịch vụ yêu cầu</h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
              <th className="py-3 px-6">Mã</th>
              <th className="py-3 px-6">Tên dịch vụ</th>
              <th className="py-3 px-6">Danh mục</th>
              <th className="py-3 px-6">Thời gian dự kiến</th>
              <th className="py-3 px-6 text-right">Giá</th>
            </tr>
          </thead>
          <tbody>
            {order.services.map((svc) => (
              <tr key={svc.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                <td className="py-3.5 px-6 font-bold text-[#0E4D40] text-xs">{svc.id}</td>
                <td className="py-3.5 px-6 font-semibold text-slate-700">{svc.name}</td>
                <td className="py-3.5 px-6">
                  <span className="px-2 py-0.5 bg-slate-100 rounded-md text-xs font-medium text-slate-600">{svc.category}</span>
                </td>
                <td className="py-3.5 px-6 text-slate-500 text-xs font-medium">{svc.estimatedTime}</td>
                <td className="py-3.5 px-6 text-right font-bold text-slate-800">{formatPrice(svc.price)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#E8F5F0]">
              <td colSpan={4} className="py-3.5 px-6 font-bold text-[#0E4D40] text-sm">Tổng chi phí dịch vụ</td>
              <td className="py-3.5 px-6 text-right font-bold text-[#0E4D40] text-base">{formatPrice(totalCost)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* NOTES */}
      {order.notes && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <MessageSquare size={16} className="text-amber-600" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Ghi chú</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
            {order.notes}
          </p>
        </div>
      )}

      {/* ACTION BUTTONS — Accept / Reject Assignment (only for pending_acceptance status) */}
      {order.status === 'pending_acceptance' && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-xs p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertCircle size={16} className="text-amber-600" />
            </div>
            <h3 className="font-bold text-amber-800 text-sm">Phân công đang chờ phản hồi</h3>
          </div>
          <p className="text-sm text-slate-600 mb-5">
            Bạn được phân công cho đơn dịch vụ này. Vui lòng chấp nhận hoặc từ chối phân công.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowAcceptConfirm(true)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-[#0E4D40] hover:bg-[#0a3a30] text-white rounded-xl text-sm font-bold shadow-md transition-all"
            >
              <CheckCircle2 size={18} />
              Chấp nhận phân công
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-sm font-bold transition-all"
            >
              <XCircle size={18} />
              Từ chối phân công
            </button>
          </div>
        </div>
      )}

      {/* Status result after action */}
      {order.status === 'accepted' && (
        <div className="bg-gradient-to-r from-[#ECFDF5] to-[#D1FAE5] rounded-2xl border border-emerald-200 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 size={24} className="text-emerald-600" />
          </div>
          <div>
            <p className="font-bold text-emerald-800 text-sm">Bạn đã chấp nhận phân công</p>
            <p className="text-xs text-emerald-600 mt-0.5">Phân công đã được xác nhận thành công. Bạn có thể bắt đầu thực hiện công việc.</p>
          </div>
        </div>
      )}

      {order.status === 'rejected' && (
        <div className="bg-gradient-to-r from-[#FEF2F2] to-[#FECACA] rounded-2xl border border-rose-200 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
            <XCircle size={24} className="text-rose-600" />
          </div>
          <div>
            <p className="font-bold text-rose-800 text-sm">Bạn đã từ chối phân công</p>
            <p className="text-xs text-rose-600 mt-0.5">Phân công đã bị từ chối. Thông tin sẽ được gửi lại cho quản lý.</p>
          </div>
        </div>
      )}

      {/* ========== ACCEPT CONFIRM MODAL ========== */}
      <AnimatePresence>
        {showAcceptConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
            onClick={() => setShowAcceptConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 size={24} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Chấp nhận phân công</h3>
                  <p className="text-sm text-slate-500">Xác nhận bạn sẽ đảm nhận đơn dịch vụ này?</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã đơn:</span>
                  <span className="font-bold text-slate-800">{order.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Khách hàng:</span>
                  <span className="font-semibold text-slate-700">{order.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Xe:</span>
                  <span className="font-semibold text-slate-700">{order.vehiclePlate} — {order.vehicleModel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lịch hẹn:</span>
                  <span className="font-semibold text-slate-700">{formatDate(order.appointmentDate)} {order.appointmentTime}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAcceptConfirm(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAcceptAssignment}
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#0E4D40] text-white rounded-xl text-sm font-bold hover:bg-[#0a3a30] transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  {isSubmitting ? 'Đang xử lý...' : 'Chấp nhận phân công'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== REJECT MODAL ========== */}
      <AnimatePresence>
        {showRejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
            onClick={() => { setShowRejectModal(false); setRejectError(''); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center">
                  <XCircle size={24} className="text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Từ chối phân công</h3>
                  <p className="text-sm text-slate-500">Vui lòng nhập lý do từ chối</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã đơn:</span>
                  <span className="font-bold text-slate-800">{order.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Khách hàng:</span>
                  <span className="font-semibold text-slate-700">{order.customerName}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Lý do từ chối <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => { setRejectReason(e.target.value); setRejectError(''); }}
                  placeholder="Nhập lý do từ chối phân công..."
                  rows={4}
                  className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all resize-none ${rejectError
                      ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-400'
                      : 'border-slate-200/80 focus:ring-[#0E4D40]/10 focus:border-[#0E4D40]'
                    }`}
                />
                {rejectError && (
                  <p className="text-xs text-rose-500 font-semibold mt-1.5 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {rejectError}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowRejectModal(false); setRejectError(''); setRejectReason(''); }}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleRejectAssignment}
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  {isSubmitting ? 'Đang xử lý...' : 'Từ chối phân công'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
