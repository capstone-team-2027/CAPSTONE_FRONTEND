import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  DollarSign,
  Loader2,
  Banknote,
  QrCode,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useFetchClient_v2 as useFetchClient } from '../../../hook/useFetchClient';
import { SERVICE_ORDER_API_ENDPOINTS } from '../../../constants/reception/appointmentsEndpoints';
import { GARAGE_CONFIG_API_ENDPOINTS } from '../../../constants/customer/garage_configurationsEndpoints';

interface AwaitingPaymentOrder {
  serviceOrder: {
    id: number;
    status: string;
    actual_finish_time: string | null;
    vehicle?: {
      id: number;
      license_plate: string;
      model?: { model_name: string } | null;
      customer?: { id: number; name: string | null; phone: string | null; loyalty_points?: number | null } | null;
    } | null;
  };
  grandTotal: number;
  totalDeposit: number;
  remainingAmount: number;
}

interface OrderDetailItem {
  service_catalog?: { service_name: string } | null;
  sparePart?: { name: string } | null;
  customPartOrder?: { item_name: string } | null;
  unit_price?: string | number;
  repair_price?: string | number;
  quantity?: number;
  status?: string;
}

const formatPrice = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value || 0)} VND`;

type PaymentMethod = 'NONE' | 'CASH' | 'ONLINE';

interface PaymentSuccessInfo {
  serviceOrderId: number;
  customerName: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
}

export default function ReceptionProcessPayment() {
  const navigate = useNavigate();
  const { fetchPrivate, fetchPublic } = useFetchClient();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  }>();

  const [pendingOrders, setPendingOrders] = useState<AwaitingPaymentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [orderDetail, setOrderDetail] = useState<{ quotation?: { items: OrderDetailItem[] } | null; tasks?: any[] } | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('NONE');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentSuccessInfo | null>(null);

  const [maxDiscountPercent, setMaxDiscountPercent] = useState(30);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [appliedPoints, setAppliedPoints] = useState(0);

  const activeOrder = pendingOrders.find((o) => o.serviceOrder.id === selectedOrderId) || null;

  const loadPendingOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetchPrivate(SERVICE_ORDER_API_ENDPOINTS.AWAITING_PAYMENT, 'GET');
      if (res && res.success) {
        setPendingOrders(res.data || []);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách chờ thanh toán:', error);
      showToast('Không thể tải danh sách hóa đơn chờ thanh toán.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPendingOrders();
    const loadConfig = async () => {
      try {
        const res = await fetchPublic(GARAGE_CONFIG_API_ENDPOINTS.GET_CONFIGS);
        if (res && res.success && res.data) {
          const maxPctConfig = res.data.find((c: any) => c.config_key === 'MAX_LOYALTY_DISCOUNT_PERCENT');
          if (maxPctConfig) {
            setMaxDiscountPercent(parseInt(maxPctConfig.config_value) || 30);
          }
        }
      } catch (error) {
        console.error('Lỗi khi tải cấu hình điểm thưởng:', error);
      }
    };
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedOrderId) {
      setOrderDetail(null);
      return;
    }
    const loadDetail = async () => {
      setIsLoadingDetail(true);
      try {
        const res = await fetchPrivate(SERVICE_ORDER_API_ENDPOINTS.GET_DETAIL(String(selectedOrderId)), 'GET');
        if (res && res.success) {
          setOrderDetail(res.data);
        }
      } catch (error) {
        console.error('Lỗi khi tải chi tiết hóa đơn:', error);
      } finally {
        setIsLoadingDetail(false);
      }
    };
    loadDetail();
    setPointsToRedeem(0);
    setAppliedPoints(0);
  }, [selectedOrderId]);

  // Khách đã cọc phụ tùng đặt riêng -> chỉ còn remainingAmount cần thu ở quầy.
  const remainingAmount = activeOrder?.remainingAmount ?? 0;
  const customerPoints = activeOrder?.serviceOrder.vehicle?.customer?.loyalty_points ?? 0;
  const maxRedeemablePoints = Math.min(
    customerPoints,
    Math.floor((remainingAmount * (maxDiscountPercent / 100)) / 1000),
  );
  const finalAmount = Math.max(0, remainingAmount - appliedPoints * 1000);

  // Poll trạng thái thanh toán ONLINE mỗi 5s, giống pattern ReceptionServiceOrderDetail.tsx.
  useEffect(() => {
    if (paymentMethod !== 'ONLINE' || !activeOrder) return;
    const intervalId = setInterval(async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const res = await fetchPublic(
          `${apiBaseUrl}/api/payment/check-status?bookingCode=${activeOrder.serviceOrder.id}&amount=${finalAmount}`,
        );
        if (res && res.success && res.isPaid) {
          clearInterval(intervalId);
          finalizePaymentSuccess('ONLINE');
        }
      } catch (error) {
        console.error('Lỗi kiểm tra trạng thái thanh toán:', error);
      }
    }, 5000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, activeOrder?.serviceOrder.id]);

  const customerName =
    activeOrder?.serviceOrder.vehicle?.customer?.name || 'Khách vãng lai';

  const items = orderDetail?.quotation?.items?.length
    ? orderDetail.quotation.items
        .filter((i) => i.status !== 'CANCELLED')
        .flatMap((item, idx) => {
          const rows: { key: string; name: string; type: 'service' | 'part'; quantity: number; unitPrice: number; total: number }[] = [];
          const repairPrice = Number(item.repair_price) || 0;
          if (repairPrice > 0) {
            rows.push({
              key: `srv-${idx}`,
              name: item.service_catalog?.service_name || 'Công dịch vụ',
              type: 'service',
              quantity: 1,
              unitPrice: repairPrice,
              total: repairPrice,
            });
          }
          const unitPrice = Number(item.unit_price) || 0;
          if (unitPrice > 0) {
            const qty = item.quantity || 1;
            rows.push({
              key: `part-${idx}`,
              name: item.sparePart?.name || item.customPartOrder?.item_name || 'Phụ tùng',
              type: 'part',
              quantity: qty,
              unitPrice,
              total: unitPrice * qty,
            });
          }
          return rows;
        })
    : (orderDetail?.tasks || []).map((task: any, idx: number) => ({
        key: `task-${idx}`,
        name: task.catalog?.service_name || 'Dịch vụ sửa chữa',
        type: 'service' as const,
        quantity: 1,
        unitPrice: Number(task.catalog?.total_price || task.catalog?.labor_price) || 0,
        total: Number(task.catalog?.total_price || task.catalog?.labor_price) || 0,
      }));

  const handleSelectOrder = (orderId: number) => {
    setSelectedOrderId(orderId);
    setPaymentMethod('NONE');
  };

  const handleSelectPaymentMethod = async (method: 'CASH' | 'ONLINE') => {
    setPaymentMethod(method);
    if (method === 'ONLINE' && activeOrder) {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
        await fetchPublic(`${apiBaseUrl}/api/payment/init-payment`, 'POST', {
          orderId: activeOrder.serviceOrder.id,
          amount: finalAmount,
        });
      } catch (err) {
        console.warn('Khởi tạo thanh toán PENDING:', err);
      }
    }
  };

  const finalizePaymentSuccess = (method: PaymentMethod) => {
    if (!activeOrder) return;
    setPaymentSuccess({
      serviceOrderId: activeOrder.serviceOrder.id,
      customerName,
      amount: finalAmount,
      method,
      paidAt: new Date().toISOString(),
    });
    setPendingOrders((prev) => prev.filter((o) => o.serviceOrder.id !== activeOrder.serviceOrder.id));
  };

  const handleConfirmCashPayment = async () => {
    if (!activeOrder) return;
    setIsProcessing(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
      await fetchPrivate(`${apiBaseUrl}/api/payment/confirm-payment`, 'POST', {
        orderId: activeOrder.serviceOrder.id,
        amount: finalAmount,
        method: 'CASH',
        pointsRedeemed: appliedPoints,
      });
      finalizePaymentSuccess('CASH');
      showToast(`Xác nhận thanh toán tiền mặt thành công cho đơn SO-${activeOrder.serviceOrder.id}`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Không thể xác nhận thanh toán.', 'warning');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setSelectedOrderId(null);
    setOrderDetail(null);
    setPaymentMethod('NONE');
    setPaymentSuccess(null);
    loadPendingOrders();
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(-1)}
          title="Quay lại"
          className="mt-0.5 w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#00285E] hover:border-slate-300 active:scale-[0.97] transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2">
            Thanh toán Dịch vụ
          </h1>
          <p className="text-slate-500 text-sm">
            Lập hóa đơn và xử lý giao dịch thanh toán cho các hóa đơn dịch vụ đã hoàn thành.
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {paymentSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 space-y-6 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-500"></div>

            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 mx-auto flex items-center justify-center border border-emerald-200">
                <CheckCircle size={32} />
              </div>
              <h2 className="text-xl font-extrabold text-slate-800">Thanh toán thành công!</h2>
              <p className="text-xs text-slate-400 font-semibold">Đơn: SO-{paymentSuccess.serviceOrderId}</p>
            </div>

            <div className="border-t border-b border-slate-100 py-4 space-y-3 text-sm font-semibold text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Khách hàng</span>
                <span className="text-slate-800">{paymentSuccess.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phương thức</span>
                <span className="text-slate-800">
                  {paymentSuccess.method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản QR'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Thời gian</span>
                <span className="text-slate-800">{new Date(paymentSuccess.paidAt).toLocaleString('vi-VN')}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-dashed border-slate-200">
                <span className="text-slate-700 font-bold text-base">Tổng tiền</span>
                <span className="text-xl font-black text-[#00285E]">{formatPrice(paymentSuccess.amount)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetState}
                className="flex-1 py-3 rounded-xl bg-[#00285E] text-white hover:bg-[#00285E]/90 font-bold transition-all text-sm shadow-md"
              >
                Tiếp tục thanh toán
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="payment-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Chọn hóa đơn dịch vụ cần thanh toán <span className="text-rose-500">*</span>
                </label>
                {isLoading ? (
                  <div className="py-10 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 size={28} className="animate-spin mb-2 text-[#00285E]" />
                    <span className="text-sm font-semibold">Đang tải danh sách...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {pendingOrders.length === 0 ? (
                      <div className="sm:col-span-2 text-center py-6 text-slate-400 font-bold text-sm">
                        Không còn hóa đơn dịch vụ nào chờ thanh toán!
                      </div>
                    ) : (
                      pendingOrders.map((o) => {
                        const so = o.serviceOrder;
                        const name = so.vehicle?.customer?.name || 'Khách vãng lai';
                        return (
                          <button
                            key={so.id}
                            onClick={() => handleSelectOrder(so.id)}
                            className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col gap-2 ${
                              selectedOrderId === so.id
                                ? 'border-[#00285E] bg-[#E0ECFF]/20 shadow-sm'
                                : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50'
                            }`}
                          >
                            <div className="flex justify-between items-center w-full">
                              <span className="text-sm font-extrabold text-[#00285E]">SO-{so.id}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                {so.vehicle?.license_plate || '—'}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-extrabold text-slate-800">{name}</span>
                              <span className="text-[11px] text-slate-500 font-semibold">
                                Còn lại: {formatPrice(o.remainingAmount)}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <AnimatePresence mode="wait">
                {activeOrder ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden"
                  >
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                        <FileText className="text-[#00285E]" size={18} />
                        <span>Chi tiết hạng mục thanh toán</span>
                      </h3>
                      <span className="text-xs font-bold text-slate-400">Mã đơn: SO-{activeOrder.serviceOrder.id}</span>
                    </div>

                    {isLoadingDetail ? (
                      <div className="py-10 flex flex-col items-center justify-center text-slate-400">
                        <Loader2 size={28} className="animate-spin mb-2 text-[#00285E]" />
                      </div>
                    ) : items.length === 0 ? (
                      <div className="py-10 text-center text-slate-400 text-sm font-semibold">
                        Không có hạng mục chi tiết.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Hạng mục
                              </th>
                              <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Loại
                              </th>
                              <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                                Số lượng
                              </th>
                              <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
                                Đơn giá
                              </th>
                              <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
                                Thành tiền
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                            {items.map((item) => (
                              <tr key={item.key} className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-bold text-slate-800">{item.name}</td>
                                <td className="px-6 py-4">
                                  {item.type === 'service' ? (
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-50 text-blue-600 border border-blue-100">
                                      Công dịch vụ
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-50 text-purple-600 border border-purple-100">
                                      Phụ tùng
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-center">{item.quantity}</td>
                                <td className="px-6 py-4 text-right">{formatPrice(item.unitPrice)}</td>
                                <td className="px-6 py-4 text-right text-slate-900 font-bold">{formatPrice(item.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-bold text-sm">
                    Vui lòng chọn hóa đơn dịch vụ phía trên để lập chi tiết hóa đơn thanh toán.
                  </div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-6">
              {activeOrder && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-6"
                >
                  <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-3">Tóm tắt thanh toán</h3>

                  <div className="space-y-3.5 text-sm font-semibold text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tạm tính</span>
                      <span>{formatPrice(activeOrder.grandTotal)}</span>
                    </div>
                    {activeOrder.totalDeposit > 0 && (
                      <div className="flex justify-between text-amber-600">
                        <span>Đã đặt cọc</span>
                        <span>-{formatPrice(activeOrder.totalDeposit)}</span>
                      </div>
                    )}
                    {appliedPoints > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Dùng {appliedPoints} điểm</span>
                        <span>-{formatPrice(appliedPoints * 1000)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-3 border-t border-dashed border-slate-200">
                      <span className="text-slate-800 font-bold">Tổng cộng</span>
                      <span className="text-xl font-black text-[#00285E]">{formatPrice(finalAmount)}</span>
                    </div>
                  </div>

                  {false && customerPoints > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Điểm tích lũy khách hàng
                        </label>
                        <span className="text-xs font-bold text-[#00285E]">{customerPoints} điểm</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Có thể dùng tối đa {maxRedeemablePoints} điểm (giảm {maxDiscountPercent}% hóa đơn).
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={maxRedeemablePoints}
                          value={pointsToRedeem === 0 ? '' : pointsToRedeem}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '') {
                              setPointsToRedeem(0);
                              return;
                            }
                            const val = parseInt(raw, 10);
                            if (isNaN(val)) return;
                            setPointsToRedeem(Math.min(val, maxRedeemablePoints));
                          }}
                          disabled={appliedPoints > 0 || maxRedeemablePoints <= 0}
                          placeholder="Nhập số điểm muốn đổi"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[#00285E] disabled:bg-slate-100 disabled:text-slate-400"
                        />
                        {appliedPoints === 0 ? (
                          <button
                            type="button"
                            onClick={() => setAppliedPoints(pointsToRedeem)}
                            disabled={pointsToRedeem <= 0 || pointsToRedeem > maxRedeemablePoints}
                            className="px-4 py-2 rounded-xl bg-[#00285E] text-white text-xs font-bold hover:bg-[#00285E]/90 disabled:bg-slate-200 disabled:text-slate-400 transition-all whitespace-nowrap"
                          >
                            Áp dụng
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setAppliedPoints(0);
                              setPointsToRedeem(0);
                            }}
                            className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 transition-all whitespace-nowrap"
                          >
                            Hủy
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Phương thức thanh toán <span className="text-rose-500">*</span>
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSelectPaymentMethod('CASH')}
                        className={`p-3 rounded-xl border flex flex-col gap-1 items-center justify-center transition-all ${
                          paymentMethod === 'CASH'
                            ? 'border-[#00285E] bg-[#E0ECFF]/20 text-[#00285E] shadow-xs'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Banknote size={18} />
                        <span className="text-xs font-bold">Tiền mặt</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSelectPaymentMethod('ONLINE')}
                        className={`p-3 rounded-xl border flex flex-col gap-1 items-center justify-center transition-all ${
                          paymentMethod === 'ONLINE'
                            ? 'border-[#00285E] bg-[#E0ECFF]/20 text-[#00285E] shadow-xs'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <QrCode size={18} />
                        <span className="text-xs font-bold">Chuyển khoản QR</span>
                      </button>
                    </div>
                  </div>

                  {paymentMethod === 'ONLINE' && (
                    <div className="flex flex-col items-center gap-3 pt-2 border-t border-slate-100">
                      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                        <img
                          src={`https://vietqr.app/img?acc=${import.meta.env.VITE_SEPAY_ACC || '05979551201'}&bank=${import.meta.env.VITE_SEPAY_BANK || 'TPBank'}&amount=${Math.round(finalAmount)}&template=compact&showinfo=true&addInfo=${`SO-${activeOrder.serviceOrder.id}${appliedPoints > 0 ? `-PT-${appliedPoints}` : ''}`}`}
                          alt="Mã VietQR thanh toán"
                          className="h-44 w-44 rounded-xl object-contain"
                        />
                      </div>
                      <p className="text-[11px] font-medium text-slate-500 text-center flex items-center gap-1.5">
                        <Loader2 size={12} className="animate-spin" />
                        Đang chờ hệ thống tự động xác nhận thanh toán...
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                    {paymentMethod === 'CASH' ? (
                      <button
                        onClick={() => void handleConfirmCashPayment()}
                        disabled={isProcessing}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#00285E] text-white hover:bg-[#00285E]/90 font-bold transition-all text-sm shadow-md disabled:opacity-60"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="animate-spin" size={16} />
                            <span>Đang giao dịch...</span>
                          </>
                        ) : (
                          <>
                            <DollarSign size={16} />
                            <span>Xác nhận ĐÃ THU ĐỦ TIỀN MẶT</span>
                          </>
                        )}
                      </button>
                    ) : paymentMethod === 'NONE' ? (
                      <div className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-xs font-semibold">
                        <AlertTriangle size={14} />
                        Chọn phương thức thanh toán để tiếp tục
                      </div>
                    ) : null}
                    <button
                      onClick={resetState}
                      className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all text-center"
                    >
                      Hủy bỏ đơn
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
