import { useState } from 'react';
import {
  ArrowLeft,
  Printer,
  User,
  CarFront,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileCheck,
  Ban,
  MessageSquareWarning,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import type { QuoteModel } from '../../../model/Quote';

// Mock DB lookup
const mockQuotesDB: Record<string, QuoteModel> = {
  'Q-001': {
    id: 'Q-001',
    serviceOrderId: 'SO-001',
    customerId: 'CUST-001',
    customerName: 'Nguyễn Văn An',
    customerPhone: '0901234567',
    vehiclePlate: '51A-123.45',
    vehicleModel: 'Toyota Camry 2020',
    services: [
      { name: 'Bảo dưỡng định kỳ cấp 1', laborCost: 500000 },
      { name: 'Thay dầu động cơ Castrol', laborCost: 150000 },
    ],
    parts: [
      { name: 'Dầu Castrol Magnatec 5W-30', quantity: 4, unit: 'Lít', unitPrice: 162500, total: 650000 },
      { name: 'Lọc gió điều hòa', quantity: 1, unit: 'Cái', unitPrice: 200000, total: 200000 },
      { name: 'Lọc dầu nhớt', quantity: 1, unit: 'Cái', unitPrice: 120000, total: 120000 },
    ],
    laborCost: 650000,
    partsCost: 970000,
    totalAmount: 1620000,
    status: 'pending',
    createdAt: '2026-06-02T08:30:00Z',
  },
  'Q-002': {
    id: 'Q-002',
    serviceOrderId: 'SO-002',
    customerId: 'CUST-002',
    customerName: 'Trần Thị Bình',
    customerPhone: '0987654321',
    vehiclePlate: '30H-456.78',
    vehicleModel: 'Mazda 3 2021',
    services: [
      { name: 'Kiểm tra & Thay thế giảm xóc trước', laborCost: 1000000 },
    ],
    parts: [
      { name: 'Phuộc nhún trước (cặp)', quantity: 1, unit: 'Bộ', unitPrice: 3500000, total: 3500000 },
    ],
    laborCost: 1000000,
    partsCost: 3500000,
    totalAmount: 4500000,
    status: 'approved',
    approvedBy: 'Khách hàng duyệt online',
    approvedDate: '2026-06-01T14:20:00Z',
    createdAt: '2026-06-01T10:00:00Z',
  },
  'Q-003': {
    id: 'Q-003',
    serviceOrderId: 'SO-003',
    customerId: 'CUST-003',
    customerName: 'Lê Hoàng Long',
    customerPhone: '0912345678',
    vehiclePlate: '51F-987.65',
    vehicleModel: 'Honda CR-V 2018',
    services: [
      { name: 'Cân chỉnh thước lái 3D', laborCost: 600000 },
      { name: 'Vệ sinh kim phun điện tử', laborCost: 400000 },
    ],
    parts: [
      { name: 'Dung dịch vệ sinh kim phun Liqui Moly', quantity: 1, unit: 'Chai', unitPrice: 350000, total: 350000 },
    ],
    laborCost: 1000000,
    partsCost: 350000,
    totalAmount: 1350000,
    status: 'rejected',
    rejectionReason: 'Khách hàng cảm thấy chi phí nhân công vệ sinh kim phun hơi cao và muốn dời sang kỳ sau.',
    createdAt: '2026-05-30T09:00:00Z',
  },
};

export default function ReceptionQuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quote, setQuote] = useState<QuoteModel | undefined>(id ? mockQuotesDB[id] : undefined);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (!quote) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold max-w-lg mx-auto">
        <AlertTriangle className="mx-auto mb-4 text-rose-500" size={40} />
        <p>Báo giá không tồn tại hoặc đã bị xóa khỏi hệ thống.</p>
        <button
          onClick={() => navigate('/reception/quotes')}
          className="mt-4 px-4 py-2 bg-[#00285E] text-white rounded-xl text-sm font-bold"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const handleApprove = () => {
    if (confirm('Xác nhận duyệt báo giá này?')) {
      const updatedQuote: QuoteModel = {
        ...quote,
        status: 'approved',
        approvedBy: 'Lễ tân tiếp nhận',
        approvedDate: new Date().toISOString(),
      };
      setQuote(updatedQuote);
      // Simulating db save
      mockQuotesDB[quote.id] = updatedQuote;
    }
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;

    const updatedQuote: QuoteModel = {
      ...quote,
      status: 'rejected',
      rejectionReason: rejectReason,
    };
    setQuote(updatedQuote);
    mockQuotesDB[quote.id] = updatedQuote;
    setShowRejectModal(false);
    setRejectReason('');
  };

  const getStatusBadge = (status: QuoteModel['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center gap-1.5">
            <Clock size={12} />
            <span>Chờ khách hàng / Lễ tân duyệt</span>
          </span>
        );
      case 'approved':
        return (
          <span className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle size={12} />
            <span>Đã được phê duyệt</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-1.5">
            <XCircle size={12} />
            <span>Đã từ chối báo giá</span>
          </span>
        );
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 relative">
      {/* Back & Quick Print bar */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => navigate('/reception/quotes')}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Quay lại danh sách</span>
        </button>

        <button
          onClick={() => alert(`Đang in báo giá ${quote.id}...`)}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-bold transition-all text-xs"
        >
          <Printer size={14} />
          <span>In báo giá bản cứng</span>
        </button>
      </div>

      {/* Main Quote Card */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-8">
        {/* Info Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Dự toán sửa chữa • SO: {quote.serviceOrderId}
            </span>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-extrabold text-[#00285E] tracking-tight">Chi tiết Báo giá {quote.id}</h1>
              {getStatusBadge(quote.status)}
            </div>
          </div>
          <div className="text-left sm:text-right text-xs font-semibold text-slate-400">
            <span>Ngày lập báo giá:</span>
            <span className="text-slate-700 block font-bold mt-0.5">
              {new Date(quote.createdAt).toLocaleDateString('vi-VN')} {new Date(quote.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Customer & Vehicle Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-100 text-sm font-semibold text-slate-600">
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <User size={14} className="text-[#00285E]" />
              <span>Thông tin khách hàng</span>
            </h3>
            <div className="space-y-2 pl-6">
              <div className="flex justify-between">
                <span className="text-slate-400">Tên khách</span>
                <span className="text-slate-800">{quote.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Số điện thoại</span>
                <span>{quote.customerPhone}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-200/80 pt-4 md:pt-0 md:pl-6">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <CarFront size={14} className="text-[#00285E]" />
              <span>Thông tin xe tiếp nhận</span>
            </h3>
            <div className="space-y-2 pl-6">
              <div className="flex justify-between">
                <span className="text-slate-400">Biển kiểm soát</span>
                <span className="text-slate-800 font-extrabold">{quote.vehiclePlate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Dòng xe</span>
                <span>{quote.vehicleModel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Services Table */}
        <div className="space-y-3">
          <h3 className="font-extrabold text-[#00285E] text-sm uppercase tracking-wider flex items-center gap-2">
            <span>I. Công dịch vụ kỹ thuật</span>
          </h3>
          <div className="border border-slate-200/60 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3">Nội dung công việc</th>
                  <th className="px-5 py-3 text-right">Chi phí nhân công</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {quote.services.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-bold text-slate-800">{item.name}</td>
                    <td className="px-5 py-3.5 text-right text-slate-900">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.laborCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Parts Table */}
        <div className="space-y-3">
          <h3 className="font-extrabold text-[#00285E] text-sm uppercase tracking-wider flex items-center gap-2">
            <span>II. Phụ tùng / Vật tư thay thế</span>
          </h3>
          <div className="border border-slate-200/60 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3">Tên phụ tùng vật tư</th>
                  <th className="px-5 py-3 text-center">Số lượng</th>
                  <th className="px-5 py-3 text-right">Đơn giá</th>
                  <th className="px-5 py-3 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {quote.parts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-4 text-center text-slate-400 font-bold">
                      Không có phụ tùng thay thế.
                    </td>
                  </tr>
                ) : (
                  quote.parts.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-bold text-slate-800">{item.name}</td>
                      <td className="px-5 py-3.5 text-center">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-500">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.unitPrice)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-900 font-bold">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cost Summary Box */}
        <div className="border-t border-slate-100 pt-6 flex justify-end">
          <div className="w-full sm:w-80 space-y-3.5 text-sm font-semibold text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-400">Chi phí nhân công (I)</span>
              <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(quote.laborCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Chi phí phụ tùng (II)</span>
              <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(quote.partsCost)}</span>
            </div>
            <div className="flex justify-between items-center pt-3.5 border-t border-dashed border-slate-200">
              <span className="text-slate-850 font-bold text-base">Tổng giá dự toán</span>
              <span className="text-2xl font-black text-[#00285E]">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(quote.totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Decisions or Audits panels */}
      {quote.status === 'pending' ? (
        // Pending Decisions Action Row
        <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 border border-amber-200">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-850">Đợi duyệt báo giá</p>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Hãy trao đổi với chủ xe hoặc xác nhận phê duyệt nội bộ từ cấp quản lý.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => setShowRejectModal(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold transition-all text-sm"
            >
              <Ban size={16} />
              <span>Từ chối báo giá</span>
            </button>
            <button
              onClick={handleApprove}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#00285E] text-white hover:bg-[#00285E]/90 font-bold transition-all text-sm shadow-md"
            >
              <FileCheck size={16} />
              <span>Phê duyệt báo giá</span>
            </button>
          </div>
        </div>
      ) : (
        // Approved/Rejected Status Block Display
        <div
          className={`p-5 rounded-2xl border flex items-start gap-4 ${
            quote.status === 'approved'
              ? 'bg-emerald-50/40 border-emerald-200 text-emerald-800'
              : 'bg-rose-50/40 border-rose-200 text-rose-800'
          }`}
        >
          {quote.status === 'approved' ? (
            <>
              <CheckCircle className="shrink-0 text-emerald-500 mt-0.5" size={20} />
              <div className="space-y-1 text-sm font-semibold text-emerald-700">
                <p className="font-extrabold text-slate-800">Thông tin phê duyệt</p>
                <p className="text-xs">Người duyệt: {quote.approvedBy || 'Chưa cập nhật'}</p>
                {quote.approvedDate && (
                  <p className="text-xs">
                    Thời gian duyệt: {new Date(quote.approvedDate).toLocaleString('vi-VN')}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <MessageSquareWarning className="shrink-0 text-rose-500 mt-0.5" size={20} />
              <div className="space-y-1 text-sm font-semibold text-rose-700">
                <p className="font-extrabold text-slate-850">Lý do từ chối báo giá</p>
                <p className="text-xs bg-white/60 p-3 rounded-xl border border-rose-100 text-slate-700 mt-2 font-medium leading-relaxed">
                  {quote.rejectionReason || 'Không có lý do chi tiết.'}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Reject Modal dialog (mandatory rejectionReason) */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop blur overlay */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setShowRejectModal(false)}
          ></div>

          {/* Modal Container */}
          <form
            onSubmit={handleRejectSubmit}
            className="relative bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-5"
          >
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <XCircle className="text-rose-500" size={20} />
                <span>Từ chối báo giá</span>
              </h3>
              <p className="text-xs text-slate-400 font-semibold">
                Vui lòng điền lý do từ chối. Lý do này là bắt buộc để hỗ trợ kỹ thuật viên kiểm tra hoặc điều chỉnh lại.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Lý do từ chối <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                placeholder="Ví dụ: Khách hàng yêu cầu bỏ thay phuộc trước, chỉ làm phần cân chỉnh..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 transition-all font-medium text-slate-700"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors text-xs"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={!rejectReason.trim()}
                className={`px-5 py-2.5 rounded-xl font-bold transition-all text-xs text-white ${
                  rejectReason.trim()
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/10'
                    : 'bg-rose-305 bg-slate-300 cursor-not-allowed'
                }`}
              >
                Xác nhận từ chối
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
