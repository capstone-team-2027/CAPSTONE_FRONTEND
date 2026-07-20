import React, { useEffect, useState } from 'react';
import { useFetchClient_v2 } from '../../../hook/useFetchClient';
import { RECEPTION_API } from '../../../constants/reception/receptionApiEndpoint';
import { useSocket } from '../../../hook/useSocket';
import { AssignTechnicianModal } from './AssignTechnicianModal';
import { MapPin } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

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
    // Refresh lại liên tục mỗi 10 giây để xem khách nào bật/tắt vị trí
    const interval = setInterval(loadCustomers, 10000);
    return () => clearInterval(interval);
  }, [fetchPrivate]);

  useEffect(() => {
    // No longer listening to 'rescue-vehicle-moving' here
  }, []);

  const handleRescueClick = (customer: Customer) => {
    setAssignModalData({ customer });
  };

  const handleAssignTechnician = async (technicianId: number) => {
    if (!assignModalData) return;
    const { customer } = assignModalData;
    const customerId = customer.user?.id || customer.id;

    const customerLat = customer.user?.latitude;
    const customerLng = customer.user?.longitude;

    try {
      // Lưu phân công vào DB thông qua API mới
      await fetchPrivate(RECEPTION_API.ASSIGN_RESCUE, "POST", {
        customerId,
        technicianId,
        customerLat,
        customerLng
      });

      if (socket) {
        socket.emit('dispatch-rescue-vehicle', {
          customerId,
          technicianId
        });
      }

      showToast(`Đã giao nhiệm vụ cứu hộ cho Kỹ thuật viên!`, "success");
    } catch (error) {
      console.error("Lỗi khi phân công cứu hộ:", error);
      showToast("Lỗi khi phân công cứu hộ. Vui lòng thử lại.", "error");
    } finally {
      setAssignModalData(null);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    c.phone?.includes(searchQuery || '')
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Khách hàng & Cứu hộ</h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý khách hàng và theo dõi yêu cầu cứu hộ khẩn cấp.</p>
        </div>
        <button onClick={loadCustomers} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors">
          Làm mới
        </button>
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
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">Không tìm thấy khách hàng nào.</td>
                </tr>
              ) : (
                filteredCustomers.map(customer => {
                  // Chỉ hiện nút cứu hộ nếu có đủ toạ độ
                  const hasLocation = customer.user?.latitude != null && customer.user?.longitude != null;
                  const activeRescue = customer.rescueRequests && customer.rescueRequests.length > 0 ? customer.rescueRequests[0] : null;

                  return (
                    <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={customer.user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop'}
                            alt={customer.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200"
                          />
                          <span className="font-semibold text-slate-800">{customer.name}</span>
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
                        {hasLocation ? (
                          activeRescue ? (
                            <div className="flex flex-col items-end gap-2">
                              <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200">
                                ĐÃ GÁN: {activeRescue.technician?.fullName?.toUpperCase() || 'KTV'}
                              </span>
                              <button
                                onClick={() => handleRescueClick(customer)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-xs font-bold"
                              >
                                <MapPin size={14} />
                                GÁN LẠI
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleRescueClick(customer)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors text-xs font-bold animate-pulse"
                            >
                              <MapPin size={14} />
                              CỨU HỘ KHẨN CẤP
                            </button>
                          )
                        ) : (
                          <span className="text-xs font-medium text-slate-400 italic">Đang tắt vị trí</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AssignTechnicianModal
        isOpen={assignModalData !== null}
        onClose={() => setAssignModalData(null)}
        onAssign={handleAssignTechnician}
        customerName={assignModalData?.customer.name || ''}
      />
    </div>
  );
}
