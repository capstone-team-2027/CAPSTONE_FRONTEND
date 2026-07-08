import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Car,
  CheckCircle2,
  AlertCircle,
  Wrench,
  ShieldCheck,
  Timer,
  ClipboardList
} from 'lucide-react';
import { useFetchClient } from '../../../hook/useFetchClient';
import { WAITING_TIME_API_ENDPOINTS } from '../../../constants/customer/waitingTimeApiEndpoint';

import type { TrackingData, FilterCategory } from '../../../model/Tracking';

export default function TrackingTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { fetchPrivate } = useFetchClient();

  const [data, setData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [filterCategory, setFilterCategory] = useState<FilterCategory>('ACTIVE');
  const [selectedOrderIndex, setSelectedOrderIndex] = useState<number>(0);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchPrivate(WAITING_TIME_API_ENDPOINTS.GET_WAITING_TIME);
      if (res && res.success) {
        setData(res.data);
      } else {
        setError("Không thể lấy thông tin theo dõi xe.");
      }
    } catch (err: any) {
      console.error("Lỗi khi tải thông tin theo dõi:", err);
      setError(err.message || "Đã xảy ra lỗi khi kết nối với máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reset selected car index when changing filter tabs
  useEffect(() => {
    setSelectedOrderIndex(0);
  }, [filterCategory]);

  const activeOrders = data?.activeOrders || [];

  const activeCount = useMemo(() => activeOrders.filter(o => o.orderStatus !== 'COMPLETED').length, [activeOrders]);
  const completedCount = useMemo(() => activeOrders.filter(o => o.orderStatus === 'COMPLETED').length, [activeOrders]);

  const filteredOrders = useMemo(() => {
    if (filterCategory === 'COMPLETED') {
      return activeOrders.filter(o => o.orderStatus === 'COMPLETED');
    }
    return activeOrders.filter(o => o.orderStatus !== 'COMPLETED');
  }, [activeOrders, filterCategory]);

  const formatTime = (minutes: number) => {
    if (!minutes || minutes === 0) return '0 phút';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h} giờ ${m} phút`;
    if (h > 0) return `${h} giờ`;
    return `${m} phút`;
  };

  const getOrderStatusDisplay = (status?: string) => {
    switch (status) {
      case 'INSPECTING':
        return { label: 'Đang kiểm tra', color: 'text-amber-600 bg-amber-50 border-amber-200' };
      case 'WAITING_FOR_PARTS':
        return { label: 'Chờ phụ tùng', color: 'text-rose-600 bg-rose-50 border-rose-200' };
      case 'IN_PROGRESS':
        return { label: 'Đang sửa chữa', color: 'text-blue-600 bg-blue-50 border-blue-200' };
      case 'COMPLETED':
        return { label: 'Đã hoàn thành', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
      default:
        return { label: status || 'Không rõ', color: 'text-gray-600 bg-gray-50 border-gray-200' };
    }
  };

  const currentOrder = filteredOrders[selectedOrderIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-6 text-left"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-2xl font-display font-bold text-brand-blue tracking-tight">
            Theo dõi tiến độ sửa chữa
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Cập nhật trạng thái sửa chữa xe của bạn theo thời gian thực.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-xs">
          <div className="w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-gray-400 mt-4">Đang tải dữ liệu theo dõi...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-gray-100 shadow-xs text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 mb-4">
            <AlertCircle className="w-8 h-8 opacity-80" />
          </div>
          <h3 className="font-bold text-sm text-brand-blue">
            Không thể tải dữ liệu
          </h3>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">{error}</p>
          <button
            onClick={loadData}
            className="mt-5 px-5 py-2 bg-brand-blue text-white rounded-xl text-xs font-bold shadow-md hover:bg-brand-blue/95 transition-all cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      ) : !data?.hasActiveOrder && activeOrders.length === 0 ? (
        // TRƯỜNG HỢP KHÔNG CÓ BẤT KỲ XE NÀO
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-xs text-center px-4">
          <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-4 shadow-inner border border-slate-100">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 opacity-80" />
          </div>
          <h3 className="font-bold text-base text-brand-blue">
            Không có xe nào đang ở trong xưởng
          </h3>
          <p className="text-xs text-gray-500 mt-2 max-w-md">
            Hiện tại bạn không có lệnh sửa chữa nào đang được thực hiện hoặc vừa hoàn thành.
          </p>
          <button
            onClick={() => navigate('/phone-service')}
            className="mt-6 px-6 py-2.5 bg-brand-orange text-brand-blue rounded-xl text-xs font-bold shadow-md shadow-brand-orange/20 hover:bg-brand-orange/90 transition-all cursor-pointer"
          >
            Đặt lịch bảo dưỡng ngay
          </button>
        </div>
      ) : (
        <>
          {/* Filter Categories */}
          <div className="flex border-b border-gray-100 -mt-2 mb-2">
            <button
              onClick={() => setFilterCategory('ACTIVE')}
              className={`px-5 py-3 text-xs font-bold transition-all border-b-2 relative ${filterCategory === 'ACTIVE'
                ? 'text-brand-orange border-brand-orange'
                : 'text-gray-400 border-transparent hover:text-brand-blue'
                }`}
            >
              <span>Đang tiến hành</span>
              {activeCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[9px] bg-slate-100 text-slate-600 rounded-full font-bold">
                  {activeCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilterCategory('COMPLETED')}
              className={`px-5 py-3 text-xs font-bold transition-all border-b-2 relative ${filterCategory === 'COMPLETED'
                ? 'text-brand-orange border-brand-orange'
                : 'text-gray-400 border-transparent hover:text-brand-blue'
                }`}
            >
              <span>Đã hoàn thành</span>
              {completedCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[9px] bg-slate-100 text-slate-600 rounded-full font-bold">
                  {completedCount}
                </span>
              )}
            </button>
          </div>

          {filteredOrders.length === 0 ? (
            // TRƯỜNG HỢP KHÔNG CÓ XE NÀO Ở TRẠNG THÁI NÀY
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-gray-100 shadow-xs text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50/50 flex items-center justify-center text-brand-blue mb-4">
                <ClipboardList className="w-8 h-8 opacity-60" />
              </div>
              <h3 className="font-bold text-sm text-brand-blue">
                Không tìm thấy xe
              </h3>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                {filterCategory === 'ACTIVE'
                  ? 'Tuyệt vời! Bạn không có chiếc xe nào đang phải sửa chữa.'
                  : 'Bạn chưa có chiếc xe nào vừa hoàn thành sửa chữa gần đây.'}
              </p>
            </div>
          ) : (
            <>
              {/* Menu chọn xe (nếu có nhiều hơn 1 xe đang cùng trạng thái) */}
              {filteredOrders.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {filteredOrders.map((order, idx) => {
                    const isActive = idx === selectedOrderIndex;
                    const statusDisp = getOrderStatusDisplay(order.orderStatus);
                    return (
                      <button
                        key={order.serviceOrderId}
                        onClick={() => setSelectedOrderIndex(idx)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${isActive
                          ? 'bg-brand-blue text-white border-brand-blue shadow-md'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-brand-blue/50'
                          }`}
                      >
                        <Car className={`w-4 h-4 ${isActive ? 'text-brand-orange' : 'text-gray-400'}`} />
                        <span>{order.vehicle?.license_plate || 'Xe không rõ'}</span>
                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${isActive ? 'bg-white/20 text-white' : statusDisp.color
                          }`}>
                          {statusDisp.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cột trái: Tổng quan thời gian & Xe */}
                <div className="lg:col-span-1 space-y-6">
                  <motion.div
                    key={`timer-${currentOrder.serviceOrderId}`}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-orange" />

                    <div className="w-16 h-16 rounded-2xl bg-brand-orange/10 flex items-center justify-center mb-4">
                      {filterCategory === 'COMPLETED' ? (
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      ) : (
                        <Timer className="w-8 h-8 text-brand-orange" />
                      )}
                    </div>

                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                      {filterCategory === 'COMPLETED' ? 'Trạng thái xe' : 'Thời gian chờ dự kiến'}
                    </h3>
                    <div className={`text-3xl font-display font-bold mb-1 ${filterCategory === 'COMPLETED' ? 'text-emerald-500' : 'text-brand-blue'}`}>
                      {filterCategory === 'COMPLETED' ? 'Đã xong' : formatTime(currentOrder.totalRemainingTimeMinutes)}
                    </div>
                    {filterCategory !== 'COMPLETED' && (
                      <p className="text-[10px] text-gray-400 mt-2 italic">
                        *Thời gian mang tính chất ước tính dựa trên các hạng mục công việc
                      </p>
                    )}
                  </motion.div>

                  <motion.div
                    key={`info-${currentOrder.serviceOrderId}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shadow-inner">
                        <Car className="w-5 h-5 text-brand-blue" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 font-bold uppercase">Phương tiện</div>
                        <div className="font-bold text-brand-blue text-sm">{currentOrder.vehicle?.license_plate || 'N/A'}</div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-500">Trạng thái chung:</span>
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${getOrderStatusDisplay(currentOrder.orderStatus).color}`}>
                        {getOrderStatusDisplay(currentOrder.orderStatus).label}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-500">Mã Lệnh SC:</span>
                      <span className="text-xs font-mono font-bold text-brand-blue">#{currentOrder.serviceOrderId}</span>
                    </div>
                  </motion.div>
                </div>

                {/* Cột phải: Danh sách Task */}
                <div className="lg:col-span-2">
                  <motion.div
                    key={`tasks-${currentOrder.serviceOrderId}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full"
                  >
                    <div className="p-5 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center">
                      <h3 className="font-bold text-brand-blue text-sm flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-brand-orange" />
                        Tiến độ các hạng mục
                      </h3>
                      <span className="text-xs font-bold bg-brand-blue/10 text-brand-blue px-2 py-1 rounded-lg">
                        {currentOrder.tasks?.length || 0} công việc
                      </span>
                    </div>

                    <div className="p-5 divide-y divide-gray-100 flex-grow">
                      {currentOrder.tasks && currentOrder.tasks.length > 0 ? (
                        currentOrder.tasks.map((task, idx) => (
                          <motion.div
                            key={task.taskId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * idx }}
                            className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-0 last:pb-0"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 shrink-0 ${task.status === 'COMPLETED' ? 'text-emerald-500' :
                                task.status === 'IN_PROGRESS' ? 'text-blue-500 animate-pulse' :
                                  'text-gray-300'
                                }`}>
                                {task.status === 'COMPLETED' ? <CheckCircle2 className="w-5 h-5" /> :
                                  task.status === 'IN_PROGRESS' ? <Timer className="w-5 h-5" /> :
                                    <Clock className="w-5 h-5" />}
                              </div>
                              <div>
                                <div className={`font-bold text-sm ${task.status === 'COMPLETED' ? 'text-slate-500 line-through' : 'text-brand-blue'}`}>
                                  {task.serviceName || 'Công việc không xác định'}
                                </div>
                                <div className="text-[10px] text-gray-400 font-semibold mt-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Dự kiến: {task.estimatedDuration || 0} phút
                                </div>
                              </div>
                            </div>

                            <div className="sm:text-right shrink-0">
                              {task.status === 'COMPLETED' ? (
                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">Đã xong</span>
                              ) : task.status === 'IN_PROGRESS' ? (
                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">Đang thực hiện</span>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">Đang chờ</span>
                              )}
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <div className="py-10 text-center text-gray-400 text-xs italic">
                          Chưa có hạng mục công việc cụ thể.
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <div className="flex items-center justify-center gap-1.5 pt-4 border-t border-gray-100 text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-auto">
        <ShieldCheck className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span>Dữ liệu được cập nhật tự động từ xưởng dịch vụ AGM Intelligent</span>
      </div>
    </motion.div>
  );
}
