import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFetchClient_v2 } from '../../../hook/useFetchClient';
import { RECEPTION_API } from '../../../constants/reception/receptionApiEndpoint';
import { useSocket } from '../../../hook/useSocket';
import { AssignTechnicianModal } from './AssignTechnicianModal';
import { CreateRescueModal } from './CreateRescueModal';
import { ArrowLeft, MapPin, ClipboardPlus, Search, Filter, Eye, X, Users, Phone, Coins, Route, XCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import RescueTrackingModal from '../../../components/share/RescueTrackingModal';

interface User {
  id: number;
  fullName: string;
  phoneNumber: string;
  avatar: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  user: User | null;
  createdAt: string;
  rescueRequests?: any[];
}

const formatVietnamPhone = (value?: string | null) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '—';

  const nationalNumber = digits.startsWith('84')
    ? digits.slice(2)
    : digits.startsWith('0')
      ? digits.slice(1)
      : digits;
  const groupedNumber = nationalNumber.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  return `+84 ${groupedNumber}`;
};

const getLatestRescue = (customer: Customer) =>
  customer.rescueRequests && customer.rescueRequests.length > 0
    ? [...customer.rescueRequests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : null;

const STATUS_FILTER_OPTIONS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chưa gán' },
  { key: 'ASSIGNED', label: 'Đã gán KTV' },
  { key: 'ON_THE_WAY', label: 'Đang di chuyển' },
  { key: 'COMPLETED', label: 'Hoàn thành' },
  { key: 'CANCELLED', label: 'Đã hủy' },
  { key: 'RECEIVED', label: 'Đã tiếp nhận' },
] as const;

export default function ReceptionCustomerList() {
  const { fetchPrivate } = useFetchClient_v2();
  const socket = useSocket();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [assignModalData, setAssignModalData] = useState<{ customer: Customer } | null>(null);
  const [isCreateRescueModalOpen, setIsCreateRescueModalOpen] = useState(false);
  const [trackingData, setTrackingData] = useState<{ rescue: any; customerName: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [cancelTarget, setCancelTarget] = useState<{ rescueId: number; customerName: string } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const [detailTarget, setDetailTarget] = useState<{ rescue: any; customer: Customer } | null>(null);

  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ASSIGNED' | 'ON_THE_WAY' | 'COMPLETED' | 'CANCELLED' | 'RECEIVED'>('PENDING');
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const statusFilterRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  // Lấy search query từ Header của ReceptionLayout
  const { searchQuery, showToast } = useOutletContext<{ searchQuery: string, showToast: (msg: string, type: string) => void }>();

  const loadCustomers = async () => {
    try {
      const res = await fetchPrivate(RECEPTION_API.CUSTOMERS);
      if (res && res.data) {
        const all = [...(res.data.registeredCustomers || []), ...(res.data.guestCustomers || [])];
        setCustomers(all);
        // Modal ưu tiên socket realtime; dữ liệu polling 10 giây là phương án dự phòng khi
        // ngrok/websocket tạm mất kết nối. Luôn đồng bộ lại đúng rescue đang được mở.
        setTrackingData((current) => {
          if (!current?.rescue?.id) return current;
          for (const customer of all) {
            const refreshedRescue = customer.rescueRequests?.find((item: any) => Number(item.id) === Number(current.rescue.id));
            if (refreshedRescue) return { ...current, rescue: refreshedRescue };
          }
          return current;
        });
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách khách hàng", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    // Fallback định kỳ phòng khi socket rớt kết nối tạm thời — realtime chính là qua socket bên dưới
    const interval = setInterval(loadCustomers, 10000);
    return () => clearInterval(interval);
  }, [fetchPrivate]);

  // Realtime: BE emit 'new_notification' tới room role-RECEPTIONIST mỗi khi khách hàng bật chia sẻ
  // vị trí / tạo yêu cầu cứu hộ mới (xem profile.service.js updateLocation) — tự tải lại danh sách
  // ngay, không cần đợi tới lượt polling hay F5 thủ công.
  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = () => {
      loadCustomers();
    };
    socket.on('new_notification', handleNewNotification);
    return () => {
      socket.off('new_notification', handleNewNotification);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const handleRescueClick = (customer: Customer) => {
    setAssignModalData({ customer });
  };

  const handleAssignTechnician = async (technicianId: number) => {
    if (!assignModalData) return;
    const { customer } = assignModalData;
    const customerId = customer.id;

    const activeRescue = customer.rescueRequests?.find((r: any) => ['PENDING', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'TOWING'].includes(r.status));
    const customerLat = customer.user?.latitude || activeRescue?.customer_lat;
    const customerLng = customer.user?.longitude || activeRescue?.customer_lng;

    try {
      // Lưu phân công vào DB — BE tự notifyUser cho cả KTV và khách hàng (room 'user-{id}'),
      // không cần FE tự emit socket thêm nữa.
      await fetchPrivate(RECEPTION_API.ASSIGN_RESCUE, "POST", {
        customerId,
        technicianId,
        customerLat,
        customerLng
      });

      showToast(`Đã giao nhiệm vụ cứu hộ cho Kỹ thuật viên!`, "success");
    } catch (error: any) {
      console.error("Lỗi khi phân công cứu hộ:", error);
      showToast(error.message || "Lỗi khi phân công cứu hộ. Vui lòng thử lại.", "error");
    } finally {
      setAssignModalData(null);
    }
  };

  const handleCancelRescue = async () => {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) {
      showToast("Vui lòng nhập lý do hủy", "warning");
      return;
    }
    setIsCancelling(true);
    try {
      await fetchPrivate(RECEPTION_API.CANCEL_RESCUE(cancelTarget.rescueId), "PATCH", {
        cancel_reason: cancelReason.trim(),
      });
      showToast("Đã hủy yêu cầu cứu hộ", "success");
      setCancelTarget(null);
      setCancelReason('');
      loadCustomers();
    } catch (error: any) {
      console.error("Lỗi khi hủy cứu hộ:", error);
      showToast(error.message || "Lỗi khi hủy cứu hộ. Vui lòng thử lại.", "error");
    } finally {
      setIsCancelling(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const keyword = `${searchQuery || ''} ${localSearch}`.trim().toLowerCase();
    return customers.filter((c) => {
      const matchesSearch =
        !keyword ||
        c.name?.toLowerCase().includes(keyword) ||
        c.phone?.includes(keyword);

      if (!matchesSearch) return false;
      if (statusFilter === 'ALL') return true;

      const latestRescue = getLatestRescue(c);
      if (!latestRescue) return false;

      if (statusFilter === 'PENDING') return latestRescue.status === 'PENDING';
      if (statusFilter === 'ASSIGNED') return latestRescue.status === 'ASSIGNED';
      if (statusFilter === 'ON_THE_WAY') return ['EN_ROUTE', 'ARRIVED', 'TOWING'].includes(latestRescue.status);
      if (statusFilter === 'COMPLETED') return (latestRescue.status === 'COMPLETED' && !latestRescue.appointment_id) || latestRescue.status === 'SERVICE_CREATED';
      if (statusFilter === 'CANCELLED') return latestRescue.status === 'CANCELLED';
      if (statusFilter === 'RECEIVED') return latestRescue.status === 'COMPLETED' && !!latestRescue.appointment_id;
      return true;
    });
  }, [customers, searchQuery, localSearch, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, localSearch, statusFilter]);

  useEffect(() => {
    if (!isStatusFilterOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (statusFilterRef.current && !statusFilterRef.current.contains(event.target as Node)) {
        setIsStatusFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isStatusFilterOpen]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCustomers, currentPage]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(-1)}
            title="Quay lại"
            className="mt-0.5 w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-[#00285E] border border-[#00285E] text-white hover:bg-[#003C7D] hover:border-[#003C7D] active:scale-[0.97] transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#00285E]">Dịch vụ cứu hộ</h1>
            <p className="text-slate-500 text-sm mt-1">Quản lý khách hàng và theo dõi yêu cầu cứu hộ khẩn cấp.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsCreateRescueModalOpen(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg shadow-md shadow-rose-200 transition-colors"
          >
            Tạo dịch vụ cứu hộ
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Tìm theo tên khách hàng, số điện thoại..."
            className="w-full bg-slate-50 border border-slate-200/80 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
          />
        </div>
        <div className="relative shrink-0" ref={statusFilterRef}>
          <button
            type="button"
            onClick={() => setIsStatusFilterOpen((prev) => !prev)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-sm font-bold hover:bg-slate-100 transition-colors"
          >
            <Filter size={16} className="text-slate-400 shrink-0" />
            {STATUS_FILTER_OPTIONS.find((opt) => opt.key === statusFilter)?.label || 'Tất cả'}
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${isStatusFilterOpen ? 'rotate-180' : ''}`} />
          </button>
          {isStatusFilterOpen && (
            <div className="absolute right-0 md:left-0 top-full mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden py-1.5">
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => {
                    setStatusFilter(opt.key);
                    setIsStatusFilterOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm font-semibold transition-colors ${
                    statusFilter === opt.key
                      ? 'bg-[#EDF3FF] text-[#00285E]'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-[#00285E] text-white font-semibold border-b border-[#00285E]">
              <tr>
                <th className="px-6 py-4">Khách hàng</th>
                <th className="px-6 py-4">Số điện thoại</th>
                <th className="px-6 py-4">Loại khách</th>
                <th className="px-6 py-4">Thông tin cứu hộ</th>
                <th className="px-6 py-4 text-center">Trạng thái</th>
                <th className="px-6 py-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Đang tải dữ liệu...</td>
                </tr>
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Không tìm thấy khách hàng nào.</td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => {
                  const latestRescue = customer.rescueRequests && customer.rescueRequests.length > 0
                    ? [...customer.rescueRequests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
                    : null;

                  const activeRescue = latestRescue && ['PENDING', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'TOWING'].includes(latestRescue.status) ? latestRescue : null;
                  const hasLocation = (customer.user?.latitude != null && customer.user?.longitude != null) || (activeRescue?.customer_lat != null && activeRescue?.customer_lng != null);
                  const completedRescue = latestRescue && latestRescue.status === 'COMPLETED' && !latestRescue.appointment_id ? latestRescue : null;
                  const receivedRescue = latestRescue && latestRescue.status === 'COMPLETED' && latestRescue.appointment_id ? latestRescue : null;
                  const serviceCreatedRescue = latestRescue && latestRescue.status === 'SERVICE_CREATED' ? latestRescue : null;
                  const cancelledRescue = latestRescue && latestRescue.status === 'CANCELLED' ? latestRescue : null;
                  const displayName = customer.name || customer.user?.fullName || "Khách hàng ẩn danh";

                  return (
                    <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800">{displayName}</span>
                      </td>
                      <td className="px-6 py-4 font-medium tabular-nums">{formatVietnamPhone(customer.phone)}</td>
                      <td className="px-6 py-4">
                        {customer.user ? (
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-semibold">Thành viên</span>
                        ) : (
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-semibold">Vãng lai</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {latestRescue ? (
                          <div className="space-y-1 min-w-[160px]">
                            <p className="text-xs font-bold text-slate-800">
                              {latestRescue.rescue_price
                                ? `${Number(latestRescue.rescue_price).toLocaleString('vi-VN')} đ`
                                : 'Chưa có giá'}
                              {latestRescue.distance_km ? ` · ${latestRescue.distance_km}km` : ''}
                            </p>
                            <p className="text-xs text-slate-500 truncate max-w-[220px]" title={latestRescue.issue_description || ''}>
                              {latestRescue.issue_description || 'Không có mô tả sự cố'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                          {cancelledRescue ? (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                              ĐÃ HỦY
                            </span>
                          ) : serviceCreatedRescue ? (
                            <span className="text-[10px] font-bold text-[#00285E] bg-[#EDF3FF] px-2.5 py-1 rounded-md border border-blue-100">
                              ĐÃ CỨU HỘ & TIẾP NHẬN
                            </span>
                          ) : completedRescue ? (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                              HOÀN THÀNH
                            </span>
                          ) : receivedRescue ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                              ĐÃ TIẾP NHẬN
                            </span>
                          ) : hasLocation ? (
                            activeRescue && activeRescue.status !== 'PENDING' ? (
                              <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200">
                                ĐÃ GÁN KTV
                              </span>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                                  CHƯA GÁN
                                </span>
                                <button
                                  onClick={() => handleRescueClick(customer)}
                                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold ${activeRescue?.status === 'PENDING'
                                    ? 'bg-rose-600 text-white border border-rose-600 hover:bg-rose-700 animate-pulse shadow-md shadow-rose-200'
                                    : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                                    }`}
                                >
                                  <MapPin size={14} />
                                  TIẾP NHẬN CỨU HỘ
                                </button>
                              </div>
                            )
                          ) : (
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                              CHƯA GÁN
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {completedRescue && (
                            <button
                              onClick={() => navigate(`/reception/customers/rescue-service-order/${completedRescue.id}`, { state: { customer } })}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white border border-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors text-xs font-bold shadow-sm"
                              title="Tạo Phiếu dịch vụ cho chiếc xe này"
                            >
                              <ClipboardPlus size={14} />
                              TIẾP NHẬN XE
                            </button>
                          )}
                          {activeRescue && activeRescue.status === 'ASSIGNED' && (
                            <button
                              onClick={() => handleRescueClick(customer)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-xs font-bold"
                            >
                              <MapPin size={14} />
                              Cập Nhật DV
                            </button>
                          )}
                          {activeRescue && ['EN_ROUTE', 'TOWING'].includes(activeRescue.status) && (
                            <button
                              onClick={() => setTrackingData({ rescue: activeRescue, customerName: displayName })}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white border border-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors text-xs font-bold shadow-sm"
                            >
                              <MapPin size={14} className="animate-pulse" />
                              THEO DÕI
                            </button>
                          )}
                          {cancelledRescue && (
                            <button
                              onClick={() => setDetailTarget({ rescue: cancelledRescue, customer })}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#00285E] text-white border border-[#00285E] rounded-lg hover:bg-[#003C7D] hover:border-[#003C7D] transition-colors text-xs font-bold"
                            >
                              <Eye size={14} />
                              XEM CHI TIẾT
                            </button>
                          )}
                          {receivedRescue && (
                            <button
                              onClick={() => setDetailTarget({ rescue: receivedRescue, customer })}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#00285E] text-white border border-[#00285E] rounded-lg hover:bg-[#003C7D] hover:border-[#003C7D] transition-colors text-xs font-bold"
                            >
                              <Eye size={14} />
                              XEM CHI TIẾT
                            </button>
                          )}
                          {!completedRescue && !activeRescue && !cancelledRescue && !receivedRescue && (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-white border border-t-0 border-slate-200 text-sm text-slate-500">
          <span>
            Hiển thị {filteredCustomers.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length)} trên {filteredCustomers.length} khách hàng
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >Trước</button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-9 h-9 rounded-xl text-sm font-semibold transition ${page === currentPage ? 'bg-[#00285E] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >Sau</button>
          </div>
        </div>
      )}

      <AssignTechnicianModal
        isOpen={assignModalData !== null}
        onClose={() => setAssignModalData(null)}
        onAssign={handleAssignTechnician}
        onCancel={() => {
          if (!assignModalData) return;
          const customer = assignModalData.customer;
          const rescue = customer.rescueRequests?.find((r: any) => ['PENDING', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'TOWING'].includes(r.status));
          if (!rescue) return;
          setAssignModalData(null);
          setCancelTarget({ rescueId: rescue.id, customerName: customer.name || customer.user?.fullName || 'Khách hàng' });
        }}
        customerName={assignModalData ? (assignModalData.customer.name || assignModalData.customer.user?.fullName || 'Khách hàng') : ''}
        customerLat={assignModalData ? (assignModalData.customer.user?.latitude || assignModalData.customer.rescueRequests?.find((r: any) => ['PENDING', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'TOWING'].includes(r.status))?.customer_lat || undefined) : undefined}
        customerLng={assignModalData ? (assignModalData.customer.user?.longitude || assignModalData.customer.rescueRequests?.find((r: any) => ['PENDING', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'TOWING'].includes(r.status))?.customer_lng || undefined) : undefined}
      />

      <CreateRescueModal
        isOpen={isCreateRescueModalOpen}
        onClose={() => setIsCreateRescueModalOpen(false)}
        onSuccess={loadCustomers}
        showToast={showToast}
        customers={customers}
      />
      <RescueTrackingModal
        key={trackingData?.rescue?.id || 'closed'}
        rescue={trackingData?.rescue || null}
        customerName={trackingData?.customerName || ''}
        onClose={() => setTrackingData(null)}
      />

      {detailTarget && (() => {
        const { rescue, customer } = detailTarget;
        const displayName = customer.name || customer.user?.fullName || 'Khách hàng ẩn danh';
        const phone = customer.phone || customer.user?.phoneNumber;
        const isCancelled = rescue.status === 'CANCELLED';
        return (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
              <div className="relative px-6 pt-6 pb-5 bg-[#00285E] overflow-hidden">
                <div className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-white/10" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-11 h-11 rounded-2xl shrink-0 ${isCancelled ? 'bg-rose-500/90' : 'bg-amber-500/90'}`}>
                      {isCancelled ? <XCircle size={20} className="text-white" /> : <CheckCircle2 size={20} className="text-white" />}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-white/70 uppercase tracking-widest">Yêu cầu cứu hộ</p>
                      <h3 className="text-lg font-bold text-white leading-none mt-1">{isCancelled ? 'Đã hủy' : 'Đã tiếp nhận'}</h3>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetailTarget(null)}
                    className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5 bg-slate-50/50 max-h-[70vh] overflow-y-auto">
                {/* Customer info */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Khách hàng</p>
                  <div className="bg-white rounded-2xl border border-slate-200/70 p-4 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#EDF3FF] flex items-center justify-center shrink-0">
                      <Users size={18} className="text-[#00285E]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-800 truncate">{displayName}</p>
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md ${customer.user ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                          {customer.user ? 'Thành viên' : 'Vãng lai'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Phone size={11} className="shrink-0" />
                        {formatVietnamPhone(phone)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rescue info */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Thông tin cứu hộ</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center mb-2.5">
                        <Coins size={16} className="text-emerald-600" />
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Số tiền cứu hộ</p>
                      <p className="text-base font-bold text-slate-800 mt-0.5">
                        {rescue.rescue_price ? `${Number(rescue.rescue_price).toLocaleString('vi-VN')} đ` : '—'}
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mb-2.5">
                        <Route size={16} className="text-blue-600" />
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Quãng đường</p>
                      <p className="text-base font-bold text-slate-800 mt-0.5">
                        {rescue.distance_km ? `${rescue.distance_km} km` : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Mô tả sự cố</p>
                  <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                    <p className="text-sm text-slate-700 leading-relaxed">{rescue.issue_description || 'Không có mô tả sự cố'}</p>
                  </div>
                </div>

                {/* Cancel reason */}
                {isCancelled && (
                  <div>
                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-2">Lý do hủy</p>
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-2.5">
                      <XCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                      <p className="text-sm font-semibold text-rose-700 leading-relaxed">{rescue.cancel_reason || 'Không có lý do'}</p>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setDetailTarget(null)}
                  className="w-full py-2.5 px-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {cancelTarget && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#001f49] bg-[#00285E]">
              <h3 className="font-bold text-white text-lg">Hủy yêu cầu cứu hộ</h3>
              <p className="text-blue-100 text-xs mt-1">Khách hàng: {cancelTarget.customerName}</p>
            </div>
            <div className="p-5 space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Lý do hủy <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Vd: Khách tự xử lý được, hủy theo yêu cầu khách..."
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
              />
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setCancelTarget(null);
                    setCancelReason('');
                  }}
                  className="flex-1 py-2.5 px-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleCancelRescue}
                  disabled={isCancelling || !cancelReason.trim()}
                  className={`flex-1 py-2.5 px-4 text-white font-bold rounded-xl transition-colors ${
                    isCancelling || !cancelReason.trim()
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isCancelling ? 'Đang xử lý...' : 'Xác nhận hủy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
