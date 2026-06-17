import { useState } from 'react';
import {
  MessageSquare,
  Search,
  User,
  FileText,
  CheckCircle,
  Clock,
  Plus,
  ArrowRight,
  Filter,
  UserCheck,
  Send,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { FeedbackModel, FeedbackCategory } from '../../../model/Feedback';
import { FEEDBACK_CATEGORY_LABELS } from '../../../model/Feedback';

// Mock Initial Feedbacks
const mockFeedbacks: FeedbackModel[] = [
  {
    id: 'FB-001',
    customerId: 'CUST-001',
    customerName: 'Nguyễn Văn An',
    customerPhone: '0901234567',
    serviceOrderId: 'SO-001',
    category: 'service_quality',
    content: 'Dịch vụ bảo dưỡng rất nhanh và chuyên nghiệp, phòng chờ sạch sẽ mát mẻ.',
    internalNotes: 'Đã gửi lời cảm ơn và tặng voucher giảm giá 10% cho lần sau.',
    receivedDate: '2026-06-02T10:30:00Z',
    receivedBy: 'Trần Thị Tiếp Tân',
    status: 'resolved',
  },
  {
    id: 'FB-002',
    customerId: 'CUST-002',
    customerName: 'Trần Thị Bình',
    customerPhone: '0987654321',
    serviceOrderId: 'SO-002',
    category: 'wait_time',
    content: 'Thời gian chờ thay dầu hơi lâu so với dự kiến ban đầu (trễ 30 phút).',
    internalNotes: 'Đã nhắc nhở kỹ thuật viên điều phối khoang nhanh hơn.',
    receivedDate: '2026-06-02T09:15:00Z',
    receivedBy: 'Trần Thị Tiếp Tân',
    status: 'processing',
  },
  {
    id: 'FB-003',
    customerId: 'CUST-003',
    customerName: 'Lê Hoàng Long',
    customerPhone: '0912345678',
    category: 'pricing',
    content: 'Giá phụ tùng lọc gió động cơ cao hơn một chút so với các gara bên ngoài.',
    internalNotes: 'Giải thích với khách về chính sách bảo hành chính hãng.',
    receivedDate: '2026-06-01T15:20:00Z',
    receivedBy: 'Nguyễn Văn B',
    status: 'new',
  },
];

// Mock Customers for searching
const mockCustomers = [
  { id: 'CUST-001', name: 'Nguyễn Văn An', phone: '0901234567', email: 'an.nguyen@email.com' },
  { id: 'CUST-002', name: 'Trần Thị Bình', phone: '0987654321', email: 'binh.tran@email.com' },
  { id: 'CUST-003', name: 'Lê Hoàng Long', phone: '0912345678', email: 'long.le@email.com' },
  { id: 'CUST-004', name: 'Phạm Minh Đức', phone: '0933445566', email: 'duc.pham@email.com' },
  { id: 'CUST-005', name: 'Vũ Hoài Nam', phone: '0977889900', email: 'nam.vu@email.com' },
];

export default function ReceptionReceiveFeedback() {
  const [feedbacks, setFeedbacks] = useState<FeedbackModel[]>(mockFeedbacks);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filters for feedback list
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Customer search inside the form
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<typeof mockCustomers[0] | null>(null);
  const [searchResults, setSearchResults] = useState<typeof mockCustomers>([]);

  // Form State
  const [formData, setFormData] = useState({
    serviceOrderId: '',
    category: 'service_quality' as FeedbackCategory,
    content: '',
    internalNotes: '',
    status: 'new' as 'new' | 'processing' | 'resolved' | 'closed',
  });

  const handleCustomerSearch = (val: string) => {
    setCustomerSearch(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    const filtered = mockCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(val.toLowerCase()) ||
        c.phone.includes(val)
    );
    setSearchResults(filtered);
  };

  const handleSelectCustomer = (c: typeof mockCustomers[0]) => {
    setSelectedCustomer(c);
    setCustomerSearch('');
    setSearchResults([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      alert('Vui lòng chọn hoặc tìm kiếm khách hàng.');
      return;
    }
    if (!formData.content.trim()) {
      alert('Vui lòng điền nội dung phản hồi.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const newFeedback: FeedbackModel = {
        id: `FB-${String(feedbacks.length + 1).padStart(3, '0')}`,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        serviceOrderId: formData.serviceOrderId || undefined,
        category: formData.category,
        content: formData.content,
        internalNotes: formData.internalNotes || undefined,
        receivedDate: new Date().toISOString(),
        receivedBy: 'Trần Thị Tiếp Tân',
        status: formData.status,
      };

      setFeedbacks([newFeedback, ...feedbacks]);
      setIsSubmitting(false);
      setShowForm(false);
      resetForm();
    }, 800);
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setCustomerSearch('');
    setFormData({
      serviceOrderId: '',
      category: 'service_quality',
      content: '',
      internalNotes: '',
      status: 'new',
    });
  };

  const getStatusBadge = (status: FeedbackModel['status']) => {
    switch (status) {
      case 'new':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-600 border border-amber-200">Mới</span>;
      case 'processing':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-600 border border-blue-200">Đang xử lý</span>;
      case 'resolved':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">Đã giải quyết</span>;
      case 'closed':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-600 border border-slate-300">Đã đóng</span>;
    }
  };

  // Filtered feedbacks
  const filteredFeedbacks = feedbacks.filter((fb) => {
    const matchesSearch =
      fb.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fb.customerPhone.includes(searchTerm) ||
      fb.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || fb.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || fb.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#00285E] tracking-tight">Tiếp nhận Phản hồi</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Ghi nhận ý kiến đóng góp, khiếu nại của khách hàng để nâng cao chất lượng dịch vụ.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#00285E] text-white hover:bg-[#00285E]/90 transition-all font-bold shadow-md shadow-[#00285E]/10"
        >
          {showForm ? 'Quay lại danh sách' : (
            <>
              <Plus size={18} />
              <span>Ghi nhận phản hồi mới</span>
            </>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Form Section */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <MessageSquare className="text-[#00285E]" size={20} />
                  <span>Phiếu ghi nhận phản hồi</span>
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Customer Search & Select */}
                <div className="space-y-2 relative">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Khách hàng phản hồi <span className="text-rose-500">*</span>
                  </label>
                  {!selectedCustomer ? (
                    <div>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          placeholder="Nhập tên hoặc số điện thoại để tìm..."
                          value={customerSearch}
                          onChange={(e) => handleCustomerSearch(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                        />
                      </div>

                      {/* Dropdown Search Results */}
                      {searchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
                          {searchResults.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectCustomer(c)}
                              className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between text-sm transition-colors"
                            >
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800">{c.name}</span>
                                <span className="text-xs text-slate-400 font-medium">{c.phone}</span>
                              </div>
                              <UserCheck size={16} className="text-[#00285E]" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#E0ECFF] flex items-center justify-center text-[#00285E]">
                          <User size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{selectedCustomer.name}</span>
                          <span className="text-xs text-slate-500 font-semibold">{selectedCustomer.phone} • {selectedCustomer.email}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(null)}
                        className="text-xs font-bold text-rose-500 hover:text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-all"
                      >
                        Thay đổi
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Phân loại ý kiến <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as FeedbackCategory })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-700"
                    >
                      {Object.entries(FEEDBACK_CATEGORY_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Service Order Link */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Mã hóa đơn dịch vụ (nếu có)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: SO-001"
                      value={formData.serviceOrderId}
                      onChange={(e) => setFormData({ ...formData, serviceOrderId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Nội dung chi tiết phản hồi <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Mô tả lại ý kiến khách hàng phản ánh..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                  />
                </div>

                {/* Internal Notes */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Ghi chú nội bộ / Hướng xử lý
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Lễ tân ghi chú hướng khắc phục hoặc phòng ban cần tiếp nhận để sửa đổi..."
                    value={formData.internalNotes}
                    onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                  />
                </div>

                {/* Initial Status */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Trạng thái ban đầu
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['new', 'processing', 'resolved', 'closed'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: st })}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                          formData.status === st
                            ? 'bg-[#00285E] text-white border-[#00285E]'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {st === 'new' && 'Mới nhận'}
                        {st === 'processing' && 'Đang xử lý'}
                        {st === 'resolved' && 'Đã giải quyết'}
                        {st === 'closed' && 'Đóng'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="px-5 py-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold transition-colors text-sm"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#00285E] text-white hover:bg-[#00285E]/90 font-bold transition-all text-sm shadow-md min-w-[140px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Lưu phản hồi</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Quick Guidelines Card */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200/60 p-6 self-start space-y-6">
              <h3 className="font-bold text-slate-800 text-base">Hướng dẫn tiếp nhận</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#E0ECFF] flex items-center justify-center text-[#00285E] font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="text-slate-600 text-xs font-medium leading-relaxed">
                    Tìm kiếm khách hàng bằng Tên hoặc Số điện thoại. Nếu không tìm thấy, hãy tạo thông tin khách hàng ở phần Lịch hẹn trước.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#E0ECFF] flex items-center justify-center text-[#00285E] font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="text-slate-600 text-xs font-medium leading-relaxed">
                    Chọn chính xác phân loại ý kiến để hệ thống tự động gán nhãn và phân công xử lý (ví dụ: thái độ nhân viên sẽ được gửi tới Ban quản lý).
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#E0ECFF] flex items-center justify-center text-[#00285E] font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <p className="text-slate-600 text-xs font-medium leading-relaxed">
                    Mô tả lại ngắn gọn, rõ ràng vấn đề khách hàng gặp phải. Tránh dùng từ ngữ chủ quan của lễ tân.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Search and Filters Area */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 flex flex-col md:flex-row items-center gap-4 justify-between">
              {/* Search input */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Tìm kiếm khách hàng, nội dung..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lọc theo:</span>
                </div>

                {/* Category Dropdown */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 focus:outline-none"
                >
                  <option value="all">Tất cả phân loại</option>
                  {Object.entries(FEEDBACK_CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>

                {/* Status Dropdown */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 focus:outline-none"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="new">Mới nhận</option>
                  <option value="processing">Đang xử lý</option>
                  <option value="resolved">Đã giải quyết</option>
                  <option value="closed">Đã đóng</option>
                </select>
              </div>
            </div>

            {/* Feedback items list */}
            <div className="space-y-4">
              {filteredFeedbacks.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-12 text-center text-slate-400">
                  <MessageSquare className="mx-auto mb-4 opacity-30" size={40} />
                  <p className="font-semibold text-sm">Không tìm thấy phản hồi nào trùng khớp.</p>
                </div>
              ) : (
                filteredFeedbacks.map((fb) => (
                  <motion.div
                    key={fb.id}
                    layout
                    className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6 hover:border-slate-300 transition-all flex flex-col md:flex-row gap-6 justify-between items-start"
                  >
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-bold text-[#00285E] bg-[#E0ECFF] px-2.5 py-1 rounded-lg">
                          {fb.id}
                        </span>
                        {getStatusBadge(fb.status)}
                        <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                          {FEEDBACK_CATEGORY_LABELS[fb.category]}
                        </span>
                        {fb.serviceOrderId && (
                          <span className="text-xs font-bold text-slate-500 hover:underline cursor-pointer">
                            Hóa đơn dịch vụ: {fb.serviceOrderId}
                          </span>
                        )}
                      </div>

                      <p className="text-slate-800 text-sm font-semibold leading-relaxed">
                        &ldquo;{fb.content}&rdquo;
                      </p>

                      {fb.internalNotes && (
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-600 flex gap-2">
                          <FileText size={14} className="text-slate-400 mt-0.5" />
                          <div>
                            <span className="text-slate-400 font-bold block mb-0.5">Xử lý nội bộ:</span>
                            {fb.internalNotes}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-6 text-xs text-slate-400 font-semibold pt-1">
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {fb.customerName} ({fb.customerPhone})
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(fb.receivedDate).toLocaleDateString('vi-VN')} {new Date(fb.receivedDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="hidden sm:inline">
                          Tiếp nhận bởi: {fb.receivedBy}
                        </span>
                      </div>
                    </div>

                    {/* Actions button for changing status in mock view */}
                    <div className="flex md:flex-col gap-2 shrink-0 w-full md:w-auto border-t md:border-t-0 border-slate-100 pt-4 md:pt-0 justify-end">
                      {fb.status === 'new' && (
                        <button
                          onClick={() => {
                            setFeedbacks(
                              feedbacks.map((f) => (f.id === fb.id ? { ...f, status: 'processing' } : f))
                            );
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 text-xs font-bold transition-all"
                        >
                          <span>Xử lý phản hồi</span>
                          <ArrowRight size={12} />
                        </button>
                      )}
                      {fb.status === 'processing' && (
                        <button
                          onClick={() => {
                            setFeedbacks(
                              feedbacks.map((f) => (f.id === fb.id ? { ...f, status: 'resolved' } : f))
                            );
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 text-xs font-bold transition-all"
                        >
                          <CheckCircle size={12} />
                          <span>Hoàn thành giải quyết</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
