import { useState } from 'react';
import {
  History,
  Search,
  CarFront,
  DollarSign,
  CalendarCheck,
  ClipboardPlus,
  CreditCard,
  MessageSquare,
  Car,
  Clock,
  Eye,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Mock Customers database with histories
const mockCustomersHistory = [
  {
    customer: {
      id: 'CUST-001',
      name: 'Nguyễn Văn An',
      phone: '0901234567',
      email: 'an.nguyen@email.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      address: '123 Đường Ba Tháng Hai, Quận 10, TP.HCM',
      totalSpent: 15200000,
      visitCount: 12,
    },
    vehicles: [
      { plate: '51A-123.45', model: 'Toyota Camry 2020', mileage: '45,000 km', status: 'normal' },
      { plate: '51F-987.65', model: 'Honda CR-V 2018', mileage: '82,000 km', status: 'maintenance' },
    ],
    timeline: [
      {
        id: 'PAY-003',
        type: 'invoice',
        title: 'Thanh toán hoá đơn dịch vụ bảo dưỡng định kỳ',
        date: '2026-06-02T11:00:00Z',
        amount: 1485000,
        status: 'completed',
        details: 'Đã hoàn tất thanh toán tiền mặt.',
      },
      {
        id: 'SO-001',
        type: 'service_order',
        title: 'Tạo lệnh sửa chữa: Bảo dưỡng cấp 1',
        date: '2026-06-02T09:30:00Z',
        status: 'completed',
        details: 'Lắp ráp dầu động cơ Castrol, thay lọc gió điều hòa.',
      },
      {
        id: 'APP-001',
        type: 'appointment',
        title: 'Lịch hẹn bảo dưỡng định kỳ cấp 1',
        date: '2026-06-02T09:00:00Z',
        status: 'completed',
        details: 'Khách hẹn đúng giờ, tiếp nhận tại khoang dịch vụ #3.',
      },
      {
        id: 'FB-001',
        type: 'feedback',
        title: 'Phản hồi: Chất lượng dịch vụ tốt',
        date: '2026-06-02T10:30:00Z',
        status: 'resolved',
        details: 'Khách rất hài lòng với phòng chờ mát mẻ.',
      },
      {
        id: 'PAY-002',
        type: 'invoice',
        title: 'Thay thế phuộc nhún trước Toyota Camry',
        date: '2026-05-15T16:00:00Z',
        amount: 4500000,
        status: 'completed',
        details: 'Thanh toán chuyển khoản ngân hàng.',
      },
      {
        id: 'SO-002',
        type: 'service_order',
        title: 'Hóa đơn dịch vụ: Thay phuộc nhún trước',
        date: '2026-05-15T13:30:00Z',
        status: 'completed',
        details: 'Thay thế giảm xóc trước chính hãng Toyota.',
      },
      {
        id: 'PAY-001',
        type: 'invoice',
        title: 'Vệ sinh khoang máy & Cân chỉnh thước lái',
        date: '2026-04-10T10:30:00Z',
        amount: 1200000,
        status: 'completed',
        details: 'Thanh toán thẻ ngân hàng.',
      },
    ],
  },
  {
    customer: {
      id: 'CUST-002',
      name: 'Trần Thị Bình',
      phone: '0987654321',
      email: 'binh.tran@email.com',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      address: '456 Lê Hồng Phong, Quận 5, TP.HCM',
      totalSpent: 4850000,
      visitCount: 4,
    },
    vehicles: [
      { plate: '30H-456.78', model: 'Mazda 3 2021', mileage: '28,000 km', status: 'normal' },
    ],
    timeline: [
      {
        id: 'APP-002',
        type: 'appointment',
        title: 'Hò hẹn thay dầu định kỳ',
        date: '2026-06-02T14:30:00Z',
        status: 'confirmed',
        details: 'Khách đã đến gara và bàn giao xe cho kỹ thuật viên.',
      },
      {
        id: 'FB-002',
        type: 'feedback',
        title: 'Phản hồi: Thời gian chờ đợi hơi lâu',
        date: '2026-06-02T09:15:00Z',
        status: 'processing',
        details: 'Thời gian trễ 30 phút so với hẹn ban đầu.',
      },
      {
        id: 'PAY-004',
        type: 'invoice',
        title: 'Thay dầu động cơ & Lọc dầu',
        date: '2026-05-02T10:00:00Z',
        amount: 850000,
        status: 'completed',
        details: 'Đã hoàn tất thanh toán ví điện tử Momo.',
      },
    ],
  },
];

export default function ReceptionServiceHistory() {
  const [searchVal, setSearchVal] = useState('');
  const [selectedCustIndex, setSelectedCustIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'appointment' | 'service_order' | 'invoice' | 'feedback'>('all');
  const [timelineSearch, setTimelineSearch] = useState('');

  // Searching database
  const handleSearchCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchVal.trim()) {
      setSelectedCustIndex(null);
      return;
    }
    const idx = mockCustomersHistory.findIndex(
      (item) =>
        item.customer.name.toLowerCase().includes(searchVal.toLowerCase()) ||
        item.customer.phone.includes(searchVal) ||
        item.vehicles.some((v) => v.plate.toLowerCase().includes(searchVal.toLowerCase()))
    );
    if (idx !== -1) {
      setSelectedCustIndex(idx);
    } else {
      setSelectedCustIndex(null);
      alert('Không tìm thấy khách hàng nào khớp với thông tin nhập!');
    }
  };

  const activeCust = selectedCustIndex !== null ? mockCustomersHistory[selectedCustIndex] : null;

  // Filter and Search timeline items
  const filteredTimeline = activeCust
    ? activeCust.timeline.filter((item) => {
        const matchesTab = activeTab === 'all' || item.type === activeTab;
        const matchesText =
          item.title.toLowerCase().includes(timelineSearch.toLowerCase()) ||
          item.id.toLowerCase().includes(timelineSearch.toLowerCase()) ||
          (item.details && item.details.toLowerCase().includes(timelineSearch.toLowerCase()));
        return matchesTab && matchesText;
      })
    : [];

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return (
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 border border-amber-200 flex items-center justify-center shadow-xs">
            <CalendarCheck size={18} />
          </div>
        );
      case 'service_order':
        return (
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-500 border border-blue-200 flex items-center justify-center shadow-xs">
            <ClipboardPlus size={18} />
          </div>
        );
      case 'invoice':
        return (
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-500 border border-emerald-200 flex items-center justify-center shadow-xs">
            <CreditCard size={18} />
          </div>
        );
      case 'feedback':
        return (
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 border border-rose-200 flex items-center justify-center shadow-xs">
            <MessageSquare size={18} />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-500 border border-slate-200 flex items-center justify-center shadow-xs">
            <History size={18} />
          </div>
        );
    }
  };

  const getTimelineTypeLabel = (type: string) => {
    switch (type) {
      case 'appointment':
        return 'Lịch hẹn';
      case 'service_order':
        return 'Hóa đơn dịch vụ';
      case 'invoice':
        return 'Hoá đơn thanh toán';
      case 'feedback':
        return 'Ý kiến phản hồi';
      default:
        return 'Khác';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#00285E] tracking-tight">Lịch sử Dịch vụ Khách hàng</h1>
        <p className="text-slate-500 text-sm font-medium mt-1">
          Tra cứu toàn bộ dòng lịch sử của khách hàng từ lịch hẹn, hóa đơn dịch vụ, lịch sử thanh toán đến phản hồi.
        </p>
      </div>

      {/* Customer Finder Search Bar */}
      <form onSubmit={handleSearchCustomer} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Nhập tên khách hàng, số điện thoại hoặc biển số xe..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold"
            />
          </div>
          <button
            type="submit"
            className="w-full md:w-auto px-6 py-3 rounded-xl bg-[#00285E] text-white hover:bg-[#00285E]/90 font-bold transition-all text-sm shadow-md"
          >
            Tra cứu thông tin
          </button>
        </div>
        {/* Quick Suggestions for Demo */}
        <div className="mt-3 flex items-center gap-3 text-xs font-semibold text-slate-400">
          <span>Gợi ý tra cứu nhanh:</span>
          <button
            type="button"
            onClick={() => {
              setSearchVal('Nguyễn Văn An');
              setSelectedCustIndex(0);
            }}
            className="text-[#00285E] hover:underline"
          >
            Nguyễn Văn An (0901234567)
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => {
              setSearchVal('0987654321');
              setSelectedCustIndex(1);
            }}
            className="text-[#00285E] hover:underline"
          >
            Trần Thị Bình (0987654321)
          </button>
        </div>
      </form>

      {/* Main Results Layout */}
      <AnimatePresence mode="wait">
        {activeCust ? (
          <motion.div
            key={activeCust.customer.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Column 1: Customer Profile Details */}
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <img
                    src={activeCust.customer.avatar}
                    alt={activeCust.customer.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-slate-100"
                  />
                  <div>
                    <h2 className="font-extrabold text-[#00285E] text-lg">{activeCust.customer.name}</h2>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{activeCust.customer.id}</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 text-sm font-semibold text-slate-600">
                  <div className="py-3 flex justify-between">
                    <span className="text-slate-400">Số điện thoại</span>
                    <span>{activeCust.customer.phone}</span>
                  </div>
                  <div className="py-3 flex justify-between">
                    <span className="text-slate-400">Email</span>
                    <span className="text-slate-500">{activeCust.customer.email}</span>
                  </div>
                  <div className="py-3">
                    <span className="text-slate-400 block mb-1">Địa chỉ</span>
                    <span className="text-slate-500 font-medium leading-relaxed block">{activeCust.customer.address}</span>
                  </div>
                </div>
              </div>

              {/* Vehicle Cards */}
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-4">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Car className="text-[#00285E]" size={16} />
                  <span>Phương tiện sở hữu</span>
                </h3>
                <div className="space-y-3">
                  {activeCust.vehicles.map((v) => (
                    <div
                      key={v.plate}
                      className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-200/50 flex items-center justify-center text-slate-500">
                          <CarFront size={16} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-[#00285E] text-sm">{v.plate}</span>
                          <span className="text-xs text-slate-500 font-semibold">{v.model}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400 font-bold block">Odo</span>
                        <span className="text-xs text-slate-600 font-bold">{v.mileage}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Statistics Card */}
              <div className="bg-[#00285E] rounded-2xl text-white p-6 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
                  <DollarSign size={140} />
                </div>
                <div className="relative space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#D2E2FF]/80">Tổng tài chính</span>
                  <div className="space-y-1">
                    <span className="text-3xl font-black block">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                        activeCust.customer.totalSpent
                      )}
                    </span>
                    <span className="text-xs font-semibold text-[#D2E2FF]">
                      Tổng số {activeCust.customer.visitCount} lượt giao dịch sửa chữa
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2 & 3: Filterable Timeline of Service */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                  <h3 className="font-extrabold text-[#00285E] text-base flex items-center gap-2">
                    <History size={18} />
                    <span>Dòng thời gian hoạt động</span>
                  </h3>

                  {/* Search on timeline */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Tìm kiếm giao dịch..."
                      value={timelineSearch}
                      onChange={(e) => setTimelineSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E]"
                    />
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl">
                  {([
                    { key: 'all', label: 'Tất cả' },
                    { key: 'appointment', label: 'Lịch hẹn' },
                    { key: 'service_order', label: 'Hóa đơn dịch vụ' },
                    { key: 'invoice', label: 'Hóa đơn' },
                    { key: 'feedback', label: 'Phản hồi' },
                  ] as const).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex-1 min-w-[70px] text-center py-2 rounded-lg text-xs font-bold transition-all ${
                        activeTab === tab.key
                          ? 'bg-white text-[#00285E] shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Timeline Items */}
                <div className="relative pl-6 space-y-6 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                  {filteredTimeline.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-semibold text-sm">
                      Không tìm thấy lịch sử hoạt động nào phù hợp!
                    </div>
                  ) : (
                    filteredTimeline.map((item) => (
                      <div key={item.id} className="relative group flex gap-4 items-start">
                        {/* Dot container */}
                        <div className="absolute -left-[27px] bg-white p-1 rounded-full z-10">
                          {getTimelineIcon(item.type)}
                        </div>

                        {/* Card body */}
                        <div className="flex-1 bg-slate-50 hover:bg-slate-100/60 border border-slate-100 rounded-xl p-4 transition-all flex flex-col sm:flex-row justify-between items-start gap-4">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                              {getTimelineTypeLabel(item.type)} • {item.id}
                            </span>
                            <h4 className="font-bold text-slate-800 text-sm">{item.title}</h4>
                            {item.details && <p className="text-slate-500 text-xs font-medium leading-relaxed">{item.details}</p>}

                            <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 pt-1">
                              <Clock size={10} />
                              {new Date(item.date).toLocaleDateString('vi-VN')} {new Date(item.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="flex flex-row sm:flex-col items-end justify-between sm:justify-start w-full sm:w-auto shrink-0 border-t sm:border-t-0 border-slate-200/50 pt-2.5 sm:pt-0">
                            {item.amount !== undefined && (
                              <span className="font-extrabold text-[#00285E] text-sm sm:text-base">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                                  item.amount
                                )}
                              </span>
                            )}
                            <button className="flex items-center gap-1 text-[11px] font-bold text-[#00285E] hover:underline hover:text-[#00285E]/80 transition-all mt-1">
                              <Eye size={12} />
                              <span>Chi tiết</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-16 text-center max-w-lg mx-auto">
            <History className="mx-auto mb-5 text-[#00285E] opacity-35 animate-pulse" size={44} />
            <h2 className="text-lg font-bold text-slate-800">Chưa tải thông tin khách hàng</h2>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed mt-2">
              Vui lòng sử dụng thanh tra cứu bên trên để hiển thị lịch sử hoạt động dịch vụ chi tiết của khách hàng.
            </p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
