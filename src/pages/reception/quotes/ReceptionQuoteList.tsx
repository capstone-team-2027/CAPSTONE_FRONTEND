import { useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  Eye,
  Printer,
  Clock,
  CheckCircle,
  XCircle,
  CarFront,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { QuoteModel } from '../../../model/Quote';

// Mock Quotes Database
const mockQuotes: QuoteModel[] = [
  {
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
  {
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
  {
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
];

export default function ReceptionQuoteList() {
  const navigate = useNavigate();
  const [quotes] = useState<QuoteModel[]>(mockQuotes);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filtered quotes list
  const filteredQuotes = quotes.filter((q) => {
    const matchesSearch =
      q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.customerPhone.includes(searchTerm) ||
      q.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: QuoteModel['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center gap-1.5 w-fit">
            <Clock size={12} />
            <span>Chờ duyệt</span>
          </span>
        );
      case 'approved':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1.5 w-fit">
            <CheckCircle size={12} />
            <span>Đã duyệt</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-1.5 w-fit">
            <XCircle size={12} />
            <span>Từ chối</span>
          </span>
        );
    }
  };

  // Quick statistics totals
  const totalCount = quotes.length;
  const pendingCount = quotes.filter((q) => q.status === 'pending').length;
  const approvedCount = quotes.filter((q) => q.status === 'approved').length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-[#00285E] tracking-tight">Quản lý Báo giá</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Danh sách báo giá phụ tùng, nhân công sửa chữa chi tiết gửi tới khách hàng.
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200/60 p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Tổng số báo giá</span>
            <span className="text-2xl font-black text-slate-800">{totalCount}</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
            <FileText size={20} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/60 p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Báo giá chờ duyệt</span>
            <span className="text-2xl font-black text-amber-600">{pendingCount}</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/60 p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Được chấp thuận</span>
            <span className="text-2xl font-black text-emerald-600">{approvedCount}</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
            <CheckCircle size={20} />
          </div>
        </div>
      </div>

      {/* Filters Box */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Tìm theo mã báo giá, tên KH, biển số..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={16} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 focus:outline-none"
          >
            <option value="all">Tất cả báo giá</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
          </select>
        </div>
      </div>

      {/* Table Data */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mã báo giá</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Khách hàng</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phương tiện</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Tổng giá</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ngày tạo</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trạng thái</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold">
                    Không tìm thấy báo giá nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-bold text-slate-800">{q.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-800">{q.customerName}</span>
                        <span className="text-[11px] text-slate-400 font-medium">{q.customerPhone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <CarFront size={14} className="text-slate-400" />
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{q.vehiclePlate}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{q.vehicleModel}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(q.totalAmount)}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {new Date(q.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(q.status)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/reception/quotes/${q.id}`)}
                          className="p-1.5 rounded-lg text-[#00285E] hover:bg-[#E0ECFF] transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => alert(`Đang chuẩn bị in báo giá ${q.id}...`)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                          title="In báo giá"
                        >
                          <Printer size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
