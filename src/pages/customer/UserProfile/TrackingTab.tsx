import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ClipboardList,
  CalendarClock,
  Wrench,
  User,
} from 'lucide-react';
import { useFetchClient } from '../../../hook/useFetchClient';
import { useSocket } from '../../../hook/useSocket';
import { WAITING_TIME_API_ENDPOINTS } from '../../../constants/customer/waitingTimeApiEndpoint';
import ProfileSectionHeader from './ProfileSectionHeader';

import type { GetRepairProgressResponse } from '../../../model/dto/repairProgress.dto';

type FilterCategory = 'ACTIVE' | 'COMPLETED';

export default function TrackingTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { fetchPrivate } = useFetchClient();
  const socket = useSocket();

  const [orders, setOrders] = useState<GetRepairProgressResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [filterCategory, setFilterCategory] = useState<FilterCategory>('ACTIVE');
  const [selectedOrderIndex, setSelectedOrderIndex] = useState<number>(0);

  // silent = true: nạp ngầm khi có cập nhật realtime, không nháy màn loading
  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const res = await fetchPrivate<GetRepairProgressResponse[]>(
        WAITING_TIME_API_ENDPOINTS.GET_REPAIR_PROGRESS,
      );
      setOrders(res?.data ?? []);
    } catch (err: any) {
      console.error('Lỗi khi tải thông tin theo dõi:', err);
      if (!silent) setError(err.message || t('tracking.errors.loadFailed', 'Đã xảy ra lỗi khi kết nối với máy chủ.'));
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Realtime: join room từng đơn dịch vụ, BE emit khi task đổi trạng thái.
  // BE nhận id đơn (tự ghép thành room `service-order-{id}`).
  useEffect(() => {
    if (!socket || orders.length === 0) return;

    const orderIds = orders.map((o) => o.id);
    orderIds.forEach((orderId) =>
      socket.emit('join-vehicle-tracking', orderId),
    );

    // Nạp ngầm để không nháy màn loading mỗi lần thợ hoàn thành 1 hạng mục
    const handleProgress = () => loadData(true);
    socket.on('progress-updated', handleProgress);

    return () => {
      socket.off('progress-updated', handleProgress);
      orderIds.forEach((orderId) =>
        socket.emit('leave-vehicle-tracking', orderId),
      );
    };
  }, [socket, orders]);

  useEffect(() => {
    setSelectedOrderIndex(0);
  }, [filterCategory]);

  const isOrderDone = (o: GetRepairProgressResponse) =>
    o.status === 'COMPLETED' || !!o.actual_finish_time;

  const activeCount = useMemo(
    () => orders.filter((o) => !isOrderDone(o)).length,
    [orders],
  );
  const completedCount = useMemo(
    () => orders.filter((o) => isOrderDone(o)).length,
    [orders],
  );

  const filteredOrders = useMemo(
    () =>
      filterCategory === 'COMPLETED'
        ? orders.filter(isOrderDone)
        : orders.filter((o) => !isOrderDone(o)),
    [orders, filterCategory],
  );

  const formatDateTime = (d?: string | null) =>
    d
      ? new Date(d).toLocaleString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

  const getOrderStatusDisplay = (status?: string) => {
    switch (status) {
      case 'INSPECTING':
        return { label: t('tracking.orderStatus.inspecting', 'Đang kiểm tra'), color: 'text-amber-600 bg-amber-50 border-amber-200' };
      case 'WAITING_FOR_PARTS':
        return { label: t('tracking.orderStatus.waitingForParts', 'Chờ phụ tùng'), color: 'text-rose-600 bg-rose-50 border-rose-200' };
      case 'IN_PROGRESS':
        return { label: t('tracking.orderStatus.inProgress', 'Đang sửa chữa'), color: 'text-blue-600 bg-blue-50 border-blue-200' };
      case 'PENDING_QC':
        return { label: t('tracking.orderStatus.pendingQc', 'Chờ kiểm định'), color: 'text-violet-600 bg-violet-50 border-violet-200' };
      case 'COMPLETED':
        return { label: t('tracking.orderStatus.completed', 'Đã hoàn thành'), color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
      default:
        return { label: status || t('tracking.orderStatus.unknown', 'Không rõ'), color: 'text-gray-600 bg-gray-50 border-gray-200' };
    }
  };

  const getTaskStatusDisplay = (status?: string) => {
    switch (status) {
      case 'PENDING':
      case 'ASSIGNED':
        return { label: t('tracking.taskStatus.notStarted', 'Chưa bắt đầu'), color: 'text-gray-500 bg-gray-50 border-gray-200' };
      case 'IN_PROGRESS':
        return { label: t('tracking.taskStatus.inProgress', 'Đang thực hiện'), color: 'text-blue-600 bg-blue-50 border-blue-200' };
      case 'PAUSED':
        return { label: t('tracking.taskStatus.paused', 'Tạm dừng'), color: 'text-amber-600 bg-amber-50 border-amber-200' };
      case 'WAITING_STOCK':
        return { label: t('tracking.taskStatus.waitingStock', 'Chờ phụ tùng'), color: 'text-rose-600 bg-rose-50 border-rose-200' };
      case 'PENDING_QC':
        return { label: t('tracking.taskStatus.pendingQc', 'Chờ kiểm định'), color: 'text-violet-600 bg-violet-50 border-violet-200' };
      case 'COMPLETED':
        return { label: t('tracking.taskStatus.completed', 'Hoàn thành'), color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
      default:
        return { label: status || t('tracking.taskStatus.unknown', 'Không rõ'), color: 'text-gray-500 bg-gray-50 border-gray-200' };
    }
  };

  const currentOrder = filteredOrders[selectedOrderIndex];

  // Tiến độ = tỉ lệ hạng mục đã làm xong. Trạng thái lấy từ Task_Assignment vì
  // BE chỉ đổi assignment.status khi thợ hoàn thành, task.status giữ nguyên.
  // PENDING_QC nghĩa là thợ sửa xong, chờ kiểm định -> vẫn tính vào tiến độ.
  const taskTotal = currentOrder?.tasks?.length ?? 0;
  const doneCount = useMemo(
    () =>
      (currentOrder?.tasks ?? []).filter((t) => {
        const status = t.assignments?.[0]?.status ?? t.status;
        return status === 'COMPLETED' || status === 'PENDING_QC';
      }).length,
    [currentOrder],
  );
  const orderProgress = useMemo(
    () => (taskTotal === 0 ? 0 : Math.round((doneCount / taskTotal) * 100)),
    [doneCount, taskTotal],
  );

  // Dự kiến hoàn thành = hiện tại + tổng thời gian ước tính của các hạng mục chưa xong
  const estimatedFinishTime = useMemo(() => {
    if (!currentOrder) return null;
    const remainingMinutes = (currentOrder.tasks ?? [])
      .filter((t) => {
        const status = t.assignments?.[0]?.status ?? t.status;
        return status !== 'COMPLETED' && status !== 'PENDING_QC';
      })
      .reduce((sum, t) => sum + (t.catalog?.estimated_duration ?? 0), 0);
    return new Date(Date.now() + remainingMinutes * 60 * 1000);
  }, [currentOrder]);

  // Xong hết hạng mục nhưng đơn chưa đóng -> đang nghiệm thu trước khi giao xe
  const isAwaitingHandover = useMemo(
    () =>
      !!currentOrder &&
      taskTotal > 0 &&
      orderProgress === 100 &&
      !isOrderDone(currentOrder),
    [currentOrder, taskTotal, orderProgress],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-6 text-left"
    >
      <style>{`
        @keyframes trackStripes {
          from { background-position: 1rem 0; }
          to { background-position: 0 0; }
        }
        .bar-running {
          background-image: linear-gradient(
            45deg,
            rgba(255,255,255,0.3) 25%, transparent 25%,
            transparent 50%, rgba(255,255,255,0.3) 50%,
            rgba(255,255,255,0.3) 75%, transparent 75%, transparent
          );
          background-size: 1rem 1rem;
          animation: trackStripes 0.7s linear infinite;
        }
      `}</style>

      {/* Header */}
      <div className="border-b border-gray-100 pb-5">
        <ProfileSectionHeader
          title={t('tracking.title', 'Theo dõi tiến độ sửa chữa')}
          description={t('tracking.description', 'Cập nhật trạng thái sửa chữa xe của bạn theo thời gian thực.')}
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200/70 shadow-xs">
          <div className="w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-400 mt-4">{t('tracking.loading', 'Đang tải dữ liệu theo dõi...')}</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-200/70 shadow-xs text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 mb-4">
            <AlertCircle className="w-8 h-8 opacity-80" />
          </div>
          <h3 className="font-bold text-sm text-[#00285E]">{t('tracking.loadErrorTitle', 'Không thể tải dữ liệu')}</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">{error}</p>
          <button
            onClick={() => loadData()}
            className="mt-5 px-5 py-2 bg-[#00285E] text-white rounded-xl text-xs font-bold shadow-md hover:brightness-110 transition-all cursor-pointer"
          >
            {t('tracking.retry', 'Thử lại')}
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200/70 shadow-xs text-center px-4">
          <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 opacity-80" />
          </div>
          <h3 className="font-bold text-base text-[#00285E]">
            {t('tracking.emptyTitle', 'Không có xe nào đang ở trong xưởng')}
          </h3>
          <p className="text-xs text-gray-500 mt-2 max-w-md">
            {t('tracking.emptyDesc', 'Hiện tại bạn không có lệnh sửa chữa nào đang được thực hiện hoặc vừa hoàn thành.')}
          </p>
          <button
            onClick={() => navigate('/phone-service')}
            className="mt-6 px-6 py-2.5 bg-brand-orange text-[#00285E] rounded-xl text-xs font-bold shadow-md shadow-brand-orange/20 hover:brightness-105 transition-all cursor-pointer"
          >
            {t('tracking.bookNow', 'Đặt lịch bảo dưỡng ngay')}
          </button>
        </div>
      ) : (
        <>
          {/* Filter Categories */}
          <div className="flex border-b border-gray-100 -mt-2 mb-2">
            <button
              onClick={() => setFilterCategory('ACTIVE')}
              className={`px-5 py-3 text-xs font-bold transition-all border-b-2 ${
                filterCategory === 'ACTIVE'
                  ? 'text-brand-orange border-brand-orange'
                  : 'text-gray-400 border-transparent hover:text-[#00285E]'
              }`}
            >
              <span>{t('tracking.filters.active', 'Đang tiến hành')}</span>
              {activeCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[9px] bg-slate-100 text-slate-600 rounded-full font-bold">
                  {activeCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilterCategory('COMPLETED')}
              className={`px-5 py-3 text-xs font-bold transition-all border-b-2 ${
                filterCategory === 'COMPLETED'
                  ? 'text-brand-orange border-brand-orange'
                  : 'text-gray-400 border-transparent hover:text-[#00285E]'
              }`}
            >
              <span>{t('tracking.filters.completed', 'Đã hoàn thành')}</span>
              {completedCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[9px] bg-slate-100 text-slate-600 rounded-full font-bold">
                  {completedCount}
                </span>
              )}
            </button>
          </div>

          {filteredOrders.length === 0 || !currentOrder ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-200/70 shadow-xs text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50/50 flex items-center justify-center text-[#00285E] mb-4">
                <ClipboardList className="w-8 h-8 opacity-60" />
              </div>
              <h3 className="font-bold text-sm text-[#00285E]">{t('tracking.noVehicleFoundTitle', 'Không tìm thấy xe')}</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                {filterCategory === 'ACTIVE'
                  ? t('tracking.noVehicleActiveDesc', 'Tuyệt vời! Bạn không có chiếc xe nào đang phải sửa chữa.')
                  : t('tracking.noVehicleCompletedDesc', 'Bạn chưa có chiếc xe nào vừa hoàn thành sửa chữa gần đây.')}
              </p>
            </div>
          ) : (
            <>
              {/* Chọn xe khi có nhiều đơn cùng trạng thái */}
              {filteredOrders.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {filteredOrders.map((order, idx) => {
                    const isActive = idx === selectedOrderIndex;
                    return (
                      <button
                        key={order.id}
                        onClick={() => setSelectedOrderIndex(idx)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                          isActive
                            ? 'bg-[#00285E] text-white border-[#00285E] shadow-md'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-[#00285E]/40'
                        }`}
                      >
                        <Car className={`w-4 h-4 ${isActive ? 'text-brand-orange' : 'text-gray-400'}`} />
                        <span>{order.vehicle?.license_plate || t('tracking.unknownPlate', 'Xe không rõ')}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Phương tiện + tiến độ */}
              <motion.div
                key={`hero-${currentOrder.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-200/70 shadow-xs overflow-hidden"
              >
                <div className="p-5 sm:p-6 flex flex-wrap items-start justify-between gap-5">
                  <div className="min-w-0">
                    <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">
                      {t('tracking.vehicle', 'Phương tiện')}
                    </span>
                    <div className="space-y-1.5">
                      <div className="flex items-baseline gap-3">
                        <span className="w-16 shrink-0 text-xs text-gray-400">{t('tracking.plate', 'Biển số')}</span>
                        <span className="text-sm font-bold text-[#00285E] truncate">
                          {currentOrder.vehicle?.license_plate || '—'}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="w-16 shrink-0 text-xs text-gray-400">{t('tracking.vehicleName', 'Tên xe')}</span>
                        <span className="text-sm font-bold text-[#00285E] truncate">
                          {[currentOrder.vehicle?.model?.model_name, currentOrder.vehicle?.color]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      {isOrderDone(currentOrder) ? t('tracking.returned', 'Đã trả xe') : t('tracking.estimatedFinish', 'Dự kiến hoàn thành')}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-base font-bold text-[#00285E] leading-none">
                      <CalendarClock size={16} className="text-brand-orange shrink-0" />
                      {isOrderDone(currentOrder)
                        ? formatDateTime(currentOrder.actual_finish_time)
                        : formatDateTime(estimatedFinishTime?.toISOString())}
                    </span>
                  </div>
                </div>

                {/* Tiến độ công việc */}
                <div className="px-5 sm:px-6 py-5 border-t border-gray-100 bg-slate-50/50">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <span className="text-[11px] font-bold text-[#00285E] uppercase tracking-widest">
                      {t('tracking.workProgress', 'Tiến độ công việc')}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                        isAwaitingHandover
                          ? 'text-violet-600 bg-violet-50 border-violet-200'
                          : getOrderStatusDisplay(currentOrder.status).color
                      }`}
                    >
                      {isAwaitingHandover
                        ? t('tracking.awaitingHandover', 'Đang kiểm tra trước khi giao xe')
                        : getOrderStatusDisplay(currentOrder.status).label}
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-200/70 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-[#00285E] transition-all duration-700 ${
                        orderProgress < 100 || isAwaitingHandover ? 'bar-running' : ''
                      }`}
                      style={{ width: `${orderProgress}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                    <span className="text-[11px] font-semibold text-[#00285E]">
                      {t('tracking.itemsCompleted', '{{done}}/{{total}} hạng mục hoàn tất', { done: doneCount, total: taskTotal })}
                    </span>
                    <span className="text-[11px] font-bold text-[#00285E] tabular-nums">
                      {orderProgress}%
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Danh sách hạng mục sửa chữa */}
              {(currentOrder.tasks?.length ?? 0) > 0 && (
                <motion.div
                  key={`tasks-${currentOrder.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 }}
                  className="bg-white rounded-2xl border border-gray-200/70 shadow-xs overflow-hidden"
                >
                  <div className="px-5 sm:px-6 py-4 border-b border-gray-100">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                      {t('tracking.repairItemsTitle', 'Hạng mục sửa chữa')}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {(currentOrder.tasks ?? []).map((task) => {
                      const taskStatus = task.assignments?.[0]?.status ?? task.status;
                      const cfg = getTaskStatusDisplay(taskStatus);
                      const technicianName = task.assignments?.[0]?.technician?.fullName;
                      return (
                        <div
                          key={task.id}
                          className="flex flex-wrap items-center justify-between gap-2 px-5 sm:px-6 py-3.5"
                        >
                          <div className="min-w-0">
                            <span className="flex items-center gap-1.5 text-sm font-semibold text-[#00285E] truncate">
                              <Wrench size={13} className="text-gray-400 shrink-0" />
                              {task.catalog?.service_name || t('tracking.unnamedItem', 'Hạng mục #{{id}}', { id: task.id })}
                            </span>
                            {technicianName && (
                              <span className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1">
                                <User size={11} className="shrink-0" />
                                {technicianName}
                              </span>
                            )}
                          </div>
                          <span
                            className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${cfg.color}`}
                          >
                            {cfg.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Mốc thời gian */}
              <motion.div
                key={`time-${currentOrder.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-white rounded-2xl border border-gray-200/70 shadow-xs p-5 sm:p-6"
              >
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                  {t('tracking.timeline', 'Mốc thời gian')}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      {t('tracking.entryTime', 'Tiếp nhận xe')}
                    </span>
                    <span className="block text-sm font-semibold text-[#00285E]">
                      {formatDateTime(currentOrder.entry_time)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      {t('tracking.estimatedFinish', 'Dự kiến hoàn thành')}
                    </span>
                    <span className="block text-sm font-semibold text-[#00285E]">
                      {isOrderDone(currentOrder)
                        ? formatDateTime(currentOrder.actual_finish_time)
                        : formatDateTime(estimatedFinishTime?.toISOString())}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      {t('tracking.actualFinish', 'Hoàn tất thực tế')}
                    </span>
                    <span
                      className={`block text-sm font-semibold ${
                        currentOrder.actual_finish_time ? 'text-emerald-600' : 'text-gray-300'
                      }`}
                    >
                      {formatDateTime(currentOrder.actual_finish_time)}
                    </span>
                  </div>
                </div>
              </motion.div>

            </>
          )}
        </>
      )}

      <div className="flex items-center justify-center gap-1.5 pt-4 border-t border-gray-100 text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-auto">
        <ShieldCheck className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span>{t('tracking.footerNote', 'Dữ liệu được cập nhật tự động từ xưởng dịch vụ AGM Intelligent')}</span>
      </div>
    </motion.div>
  );
}
