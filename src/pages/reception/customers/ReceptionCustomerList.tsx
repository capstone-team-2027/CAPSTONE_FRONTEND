import React, { useEffect, useMemo, useState } from 'react';
import { useFetchClient_v2 } from '../../../hook/useFetchClient';
import { RECEPTION_API } from '../../../constants/reception/receptionApiEndpoint';
import { useSocket } from '../../../hook/useSocket';
import { AssignTechnicianModal } from './AssignTechnicianModal';
import { CreateRescueModal } from './CreateRescueModal';
import { ArrowLeft, MapPin, ClipboardPlus } from 'lucide-react';
import { useOutletContext, useNavigate } from 'react-router-dom';

interface User {
  id: number;
  fullName: string;
  phoneNumber: string;
  avatar: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  user: User | null;
  createdAt: string;
  rescueRequests?: any[];
}

export default function ReceptionCustomerList() {
  const { fetchPrivate } = useFetchClient_v2();
  const socket = useSocket();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [assignModalData, setAssignModalData] = useState<{ customer: Customer } | null>(null);
  const [isCreateRescueModalOpen, setIsCreateRescueModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const navigate = useNavigate();

  // Lấy search query từ Header của ReceptionLayout
  const { searchQuery, showToast } = useOutletContext<{ searchQuery: string, showToast: (msg: string, type: string) => void }>();

  const loadCustomers = async () => {
    try {
      const res = await fetchPrivate(RECEPTION_API.CUSTOMERS);
      if (res && res.data) {
        const all = [...(res.data.registeredCustomers || []), ...(res.data.guestCustomers || [])];
        setCustomers(all);
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

  const filteredCustomers = useMemo(
    () =>
      customers.filter((c) =>
        c.name?.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
        c.phone?.includes(searchQuery || ''),
      ),
    [customers, searchQuery],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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
            className="mt-0.5 w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#00285E] hover:border-slate-300 active:scale-[0.97] transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Cứu hộ</h1>
            <p className="text-slate-500 text-sm mt-1">Quản lý khách hàng và theo dõi yêu cầu cứu hộ khẩn cấp.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadCustomers} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors">
            Làm mới
          </button>
          <button 
            onClick={() => setIsCreateRescueModalOpen(true)} 
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg shadow-md shadow-rose-200 transition-colors"
          >
            Tạo dịch vụ cứu hộ
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Khách hàng</th>
                <th className="px-6 py-4">Số điện thoại</th>
                <th className="px-6 py-4">Loại khách</th>
                <th className="px-6 py-4 text-right">Trạng thái định vị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">Đang tải dữ liệu...</td>
                </tr>
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">Không tìm thấy khách hàng nào.</td>
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
                  const displayName = customer.name || customer.user?.fullName || "Khách hàng ẩn danh";

                  return (
                    <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={customer.user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop'}
                            alt={displayName}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200"
                          />
                          <span className="font-semibold text-slate-800">{displayName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">{customer.phone}</td>
                      <td className="px-6 py-4">
                        {customer.user ? (
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-semibold">Thành viên</span>
                        ) : (
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-semibold">Vãng lai</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {/* Khối 1: Hiển thị trạng thái định vị / Nút gọi cứu hộ */}
                          {serviceCreatedRescue ? (
                            <span className="text-[10px] font-bold text-[#00285E] bg-[#EDF3FF] px-2.5 py-1 rounded-md border border-blue-100">
                              ĐÃ CỨU HỘ & TIẾP NHẬN
                            </span>
                          ) : receivedRescue ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                              ĐÃ TIẾP NHẬN · CHỜ KỸ THUẬT TRƯỞNG
                            </span>
                          ) : hasLocation ? (
                            activeRescue && activeRescue.status !== 'PENDING' ? (
                              <div className="flex flex-col items-end gap-2">
                                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200">
                                  ĐÃ GÁN: {activeRescue.technician?.fullName?.toUpperCase() || 'KTV'} (
                                  {activeRescue.status === 'ASSIGNED' ? 'Đã gán' :
                                   activeRescue.status === 'EN_ROUTE' ? 'Đang di chuyển' :
                                   activeRescue.status === 'ARRIVED' ? 'Đã đến nơi' :
                                   activeRescue.status === 'TOWING' ? 'Đang chở xe về gara' : activeRescue.status}
                                  )
                                </span>
                                {activeRescue.status === 'ASSIGNED' && (
                                  <button
                                    onClick={() => handleRescueClick(customer)}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-xs font-bold"
                                  >
                                    <MapPin size={14} />
                                    GÁN LẠI
                                  </button>
                                )}
                              </div>
                            ) : (
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
                            )
                          ) : (
                            <span className="text-xs font-medium text-slate-400 italic">Đang tắt vị trí</span>
                          )}

                          {/* Khối 2: Nếu có cứu hộ vừa hoàn thành, hiện Status và nút Tạo Dịch Vụ */}
                          {completedRescue && (
                            <>
                              <div className="w-px h-10 bg-slate-200 mx-2"></div>
                              <div className="flex flex-col items-end gap-2">
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                                  KTV ĐÃ CỨU HỘ THÀNH CÔNG
                                </span>
                                <button
                                  onClick={() => navigate(`/reception/customers/rescue-service-order/${completedRescue.id}`, { state: { customer } })}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white border border-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors text-xs font-bold shadow-sm"
                                  title="Tạo Phiếu dịch vụ cho chiếc xe này"
                                >
                                  <ClipboardPlus size={14} />
                                  TẠO DỊCH VỤ
                                </button>
                              </div>
                            </>
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
        customerName={assignModalData ? (assignModalData.customer.name || assignModalData.customer.user?.fullName || 'Khách hàng') : ''}
        customerLat={assignModalData ? (assignModalData.customer.user?.latitude || assignModalData.customer.rescueRequests?.find((r: any) => ['PENDING', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'TOWING'].includes(r.status))?.customer_lat || undefined) : undefined}
        customerLng={assignModalData ? (assignModalData.customer.user?.longitude || assignModalData.customer.rescueRequests?.find((r: any) => ['PENDING', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'TOWING'].includes(r.status))?.customer_lng || undefined) : undefined}
      />

      <CreateRescueModal
        isOpen={isCreateRescueModalOpen}
        onClose={() => setIsCreateRescueModalOpen(false)}
        onSuccess={loadCustomers}
        showToast={showToast}
      />
    </div>
  );
}
