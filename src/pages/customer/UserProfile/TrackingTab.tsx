import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ClipboardList,
  Wrench,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useFetchClient } from '../../../hook/useFetchClient';
import { useSocket } from '../../../hook/useSocket';
import { WAITING_TIME_API_ENDPOINTS } from '../../../constants/customer/waitingTimeApiEndpoint';
import ProfileSectionHeader from './ProfileSectionHeader';

import type { GetRepairProgressResponse } from '../../../model/dto/repairProgress.dto';

export default function TrackingTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { fetchPrivate } = useFetchClient();
  const socket = useSocket();

  const [orders, setOrders] = useState<GetRepairProgressResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedOrderIndex, setSelectedOrderIndex] = useState<number>(0);
  const vehicleSliderRef = useRef<HTMLDivElement>(null);

  const scrollVehicleSlider = (direction: 'left' | 'right') => {
    const el = vehicleSliderRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === 'left' ? -160 : 160, behavior: 'smooth' });
  };

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
  }, [orders]);

  const isOrderDone = (o: GetRepairProgressResponse) =>
    o.status === 'COMPLETED' || !!o.actual_finish_time;

  const filteredOrders = orders;

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
      case 'CLOSED_PARTIAL':
        return { label: t('tracking.orderStatus.closedPartial', 'Đã đóng một phần'), color: 'text-amber-600 bg-amber-50 border-amber-200' };
      case 'CANCELLED':
        return { label: t('tracking.orderStatus.cancelled', 'Đã hủy'), color: 'text-rose-600 bg-rose-50 border-rose-200' };
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

  const assignedTechnicianNames = useMemo(() => {
    if (!currentOrder) return [];
    const names = (currentOrder.tasks ?? [])
      .map((t) => t.assignments?.[0]?.technician?.fullName)
      .filter((name): name is string => !!name);
    return Array.from(new Set(names));
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
          {filteredOrders.length === 0 || !currentOrder ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-200/70 shadow-xs text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50/50 flex items-center justify-center text-[#00285E] mb-4">
                <ClipboardList className="w-8 h-8 opacity-60" />
              </div>
              <h3 className="font-bold text-sm text-[#00285E]">{t('tracking.noVehicleFoundTitle', 'Không tìm thấy xe')}</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                {t('tracking.noVehicleDesc', 'Bạn chưa có chiếc xe nào đang được theo dõi.')}
              </p>
            </div>
          ) : (
            <>
              {/* Chọn xe khi có nhiều đơn cùng trạng thái */}
              {filteredOrders.length > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => scrollVehicleSlider('left')}
                    className="shrink-0 w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-500 hover:border-[#00285E]/40 hover:text-[#00285E] flex items-center justify-center transition-all"
                    aria-label={t('common.prev', 'Trước')}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div
                    ref={vehicleSliderRef}
                    className="flex gap-2 overflow-x-auto pb-1 scrollbar-none scroll-smooth"
                  >
                    {filteredOrders.map((order, idx) => {
                      const isActive = idx === selectedOrderIndex;
                      return (
                        <button
                          key={order.id}
                          onClick={() => setSelectedOrderIndex(idx)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${isActive
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

                  <button
                    type="button"
                    onClick={() => scrollVehicleSlider('right')}
                    className="shrink-0 w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-500 hover:border-[#00285E]/40 hover:text-[#00285E] flex items-center justify-center transition-all"
                    aria-label={t('common.next', 'Sau')}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
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
                    <span className="block text-sm font-extrabold text-[#00285E] uppercase tracking-wide mb-2.5">
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

                  <div className="text-right min-w-0">
                    <span className="block text-sm font-extrabold text-[#00285E] uppercase tracking-wide mb-2.5">
                      {t('tracking.assignedTechnicians', 'Kỹ thuật viên đảm nhận')}
                    </span>
                    {assignedTechnicianNames.length > 0 ? (
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {assignedTechnicianNames.map((name) => (
                          <span
                            key={name}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-[#00285E] text-xs font-bold"
                          >
                            <User size={12} className="text-brand-orange shrink-0" />
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-gray-300">
                        {t('tracking.noTechnicianAssigned', 'Chưa phân công')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Mốc thời gian */}
                <div className="px-5 sm:px-6 py-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 }}
                      className="rounded-xl bg-slate-50 border-l-4 border-slate-300 px-4 py-3"
                    >
                      <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                        {t('tracking.entryTime', 'Tiếp nhận xe')}
                      </span>
                      <span className="block text-base font-bold text-[#00285E]">
                        {formatDateTime(currentOrder.entry_time)}
                      </span>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="rounded-xl bg-orange-50/60 border-l-4 border-brand-orange px-4 py-3"
                    >
                      <span className="block text-[10px] font-extrabold text-orange-600/80 uppercase tracking-widest mb-1.5">
                        {t('tracking.estimatedFinish', 'Dự kiến hoàn thành')}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-base font-bold text-[#00285E]">
                        <motion.span
                          className="w-1.5 h-1.5 rounded-full bg-brand-orange shrink-0"
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        {formatDateTime(estimatedFinishTime?.toISOString())}
                      </span>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className={`rounded-xl border-l-4 px-4 py-3 ${currentOrder.actual_finish_time
                        ? 'bg-emerald-50/60 border-emerald-500'
                        : 'bg-slate-50 border-slate-200'
                        }`}
                    >
                      <span className={`block text-[10px] font-extrabold uppercase tracking-widest mb-1.5 ${currentOrder.actual_finish_time ? 'text-emerald-600/80' : 'text-slate-400'
                        }`}>
                        {t('tracking.actualFinish', 'Hoàn tất thực tế')}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 text-base font-bold ${currentOrder.actual_finish_time ? 'text-emerald-600' : 'text-gray-300'
                          }`}
                      >
                        {currentOrder.actual_finish_time && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3, type: 'spring', stiffness: 400, damping: 15 }}
                          >
                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                          </motion.span>
                        )}
                        {formatDateTime(currentOrder.actual_finish_time)}
                      </span>
                    </motion.div>
                  </div>
                </div>

                {/* Tiến độ công việc */}
                <div className="px-5 sm:px-6 py-5 border-t border-gray-100 bg-slate-50/50">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <span className="text-[11px] font-bold text-[#00285E] uppercase tracking-widest">
                      {t('tracking.workProgress', 'Tiến độ công việc')}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${isAwaitingHandover
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
                      className={`h-full rounded-full bg-[#00285E] transition-all duration-700 ${orderProgress < 100 || isAwaitingHandover ? 'bar-running' : ''
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
                    <span className="text-sm font-extrabold text-[#00285E] uppercase tracking-wide">
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
