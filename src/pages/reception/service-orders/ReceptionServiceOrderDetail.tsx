import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  User,
  Phone,
  Mail,
  Car,
  Gauge,
  Wrench,
  StickyNote,
  XCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  DollarSign,
  Loader2,
  CreditCard,
  QrCode,
  Coins,
  Building,
  Copy,
  Check,
  Printer,
  X,
  Package,
  FileText,
  Banknote,
} from 'lucide-react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { SO_STATUS_CONFIG } from './ReceptionServiceOrderList';
import { useFetchClient_v2 as useFetchClient } from '../../../hook/useFetchClient';
import { useSocket } from '../../../hook/useSocket';
import { SERVICE_ORDER_API_ENDPOINTS } from '../../../constants/reception/appointmentsEndpoints';

const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ thực hiện',
  ASSIGNED: 'Đã giao thợ',
  IN_PROGRESS: 'Đang tiến hành',
  PENDING_QC: 'Chờ kiểm định',
  COMPLETED: 'Đã hoàn thành',
  CANCELLED: 'Đã hủy',
};

export default function ReceptionServiceOrderDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  }>();
  const { fetchPrivate, fetchPublic } = useFetchClient();
  const socket = useSocket();

  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [incurredCost, setIncurredCost] = useState('150000'); // 150k default if in progress

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPaymentSuccess, setIsPaymentSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'NONE' | 'CASH' | 'ONLINE'>('NONE');

  // Loyalty points
  const [maxDiscountPercent, setMaxDiscountPercent] = useState<number>(30);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [inputPoints, setInputPoints] = useState<number>(0);

  const isPaid = order?.payment?.payment_status === 'PAID' || order?.payment?.payment_status === 'COMPLETED';

  const handleOpenPaymentModal = () => {
    setPaymentMethod('NONE');
    setShowPaymentModal(true);
    setIsPaymentSuccess(false);
    setPointsToRedeem(0);
    setInputPoints(0);
  };

  const handleSelectPaymentMethod = async (method: 'CASH' | 'ONLINE') => {
    setPaymentMethod(method);
    if (method === 'ONLINE') {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const remainingAmount = getRemainingAmount();
        await fetchPublic(`${apiBaseUrl}/api/payment/init-payment`, 'POST', {
          orderId: order.id,
          amount: remainingAmount,
        });
      } catch (err) {
        console.warn("Khởi tạo thanh toán PENDING:", err);
      }
    }
  };



  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Đã sao chép ${label}`, 'info');
  };

  // Poll payment status every 5 seconds like BookingPage.tsx
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    if (showPaymentModal && paymentMethod === 'ONLINE' && !isPaymentSuccess && order?.id) {
      intervalId = setInterval(async () => {
        try {
          const remainingAmount = getRemainingAmount();
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
          const res = await fetchPublic(`${apiBaseUrl}/api/payment/check-status?bookingCode=${order.id}&amount=${remainingAmount}`);
          if (res && res.success && res.isPaid) {
            clearInterval(intervalId);
            setIsPaymentSuccess(true);
            setOrder((prev: any) => ({
              ...prev,
              payment: {
                id: `PAY-${Date.now()}`,
                payment_status: 'PAID',
                payment_method: 'ONLINE',
                amount: getOrderTotal(),
                paid_at: new Date().toISOString(),
              },
            }));
            showToast(`Hệ thống đã tự động nhận được thanh toán cho hóa đơn SO-${order.id}!`, 'success');
          }
        } catch (error) {
          console.error("Lỗi tự động kiểm tra thanh toán:", error);
        }
      }, 5000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showPaymentModal, paymentMethod, isPaymentSuccess, order?.id]);

  const handleConfirmCashPayment = async () => {
    setIsPaymentSuccess(true);
    setOrder((prev: any) => ({
      ...prev,
      payment: {
        id: `PAY-${Date.now()}`,
        payment_status: 'PAID',
        payment_method: 'CASH',
        amount: getOrderTotal(),
        paid_at: new Date().toISOString(),
      },
    }));
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
      await fetchPrivate(`${apiBaseUrl}/api/payment/confirm-payment`, 'POST', {
        orderId: order.id,
        amount: Math.max(0, getOrderTotal() - (pointsToRedeem * 1000)),
        method: 'CASH',
        pointsRedeemed: pointsToRedeem,
      });
    } catch (err) {
      console.warn("Cập nhật DB confirm-payment (CASH):", err);
    }
    showToast(`Xác nhận thanh toán tiền mặt thành công cho đơn SO-${order?.id}`, 'success');
  };

  const handleSimulatePaymentSuccess = async () => {
    setIsPaymentSuccess(true);
    setOrder((prev: any) => ({
      ...prev,
      payment: {
        id: `PAY-${Date.now()}`,
        payment_status: 'PAID',
        payment_method: 'ONLINE',
        amount: getOrderTotal(),
        paid_at: new Date().toISOString(),
      },
    }));
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
      await fetchPrivate(`${apiBaseUrl}/api/payment/confirm-payment`, 'POST', {
        orderId: order.id,
        amount: Math.max(0, getOrderTotal() - (pointsToRedeem * 1000)),
        method: 'ONLINE',
        pointsRedeemed: pointsToRedeem,
      });
    } catch (err) {
      console.warn("Cập nhật DB confirm-payment:", err);
    }
    showToast(`Xác nhận thanh toán thành công cho đơn SO-${order?.id}`, 'success');
  };

  useEffect(() => {
    if (id) {
      loadOrderDetail(id);
    }
  }, [id]);

  // Có cập nhật mới -> BE emit new_notification -> tự tải lại chi tiết
  useEffect(() => {
    if (!socket || !id) return;
    const handleNewNotification = () => {
      loadOrderDetail(id);
    };
    socket.on('new_notification', handleNewNotification);
    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket, id]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const res = await fetchPublic(`${apiBaseUrl}/api/guest/garage-configurations/MAX_LOYALTY_DISCOUNT_PERCENT`);
        if (res && res.success && res.data) {
          setMaxDiscountPercent(parseInt(res.data.config_value) || 30);
        }
      } catch (err) {
        console.warn("Lỗi tải cấu hình max discount:", err);
      }
    };
    fetchConfig();
  }, []);

  const loadOrderDetail = async (orderId: string) => {
    try {
      setIsLoading(true);
      const res = await fetchPrivate(SERVICE_ORDER_API_ENDPOINTS.GET_DETAIL(orderId), 'GET');
      if (res && res.success) {
        setOrder(res.data);
      } else {
        showToast(res.message || 'Không tìm thấy hóa đơn.', 'warning');
      }
    } catch (error) {
      console.error('Lỗi khi tải chi tiết lệnh sửa chữa:', error);
      showToast('Lỗi khi tải chi tiết lệnh sửa chữa.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center text-slate-400">
        <Loader2 size={48} className="mb-4 text-[#00285E] animate-spin" />
        <p className="text-lg font-semibold mb-1">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center text-slate-400">
        <AlertTriangle size={48} className="mb-4 text-amber-400" />
        <p className="text-lg font-semibold mb-1">Không tìm thấy hóa đơn dịch vụ</p>
        <p className="text-sm mb-4">Mã hóa đơn "{id}" không tồn tại hoặc đã bị xóa khỏi hệ thống.</p>
        <button
          onClick={() => navigate('/reception/service-orders')}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#00285E] text-white rounded-xl text-sm font-bold"
        >
          <ArrowLeft size={16} />
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const statusCfg = SO_STATUS_CONFIG[order.status] || SO_STATUS_CONFIG['INSPECTING'];
  const StatusIcon = statusCfg.icon;

  const isAlreadyStarted = order.status !== 'INSPECTING' && order.status !== 'ASSIGNED';

  const formatPrice = (price: number) => {
    return (price || 0).toLocaleString('vi-VN') + ' đ';
  };

  const getOrderTotal = () => {
    if (order.quotation && Array.isArray(order.quotation.items)) {
      return order.quotation.items.reduce((sum: number, item: any) => {
        const itemTotal = (parseFloat(item.unit_price) || 0) * (item.quantity || 1) + (parseFloat(item.repair_price) || 0);
        return sum + itemTotal;
      }, 0);
    }
    return order.tasks?.reduce((sum: number, task: any) => sum + (parseFloat(task.catalog?.total_price || task.catalog?.labor_price) || 0), 0) || 0;
  };

  const getRemainingAmount = () => {
    const total = getOrderTotal();
    if (order.payment?.payment_status === 'DEPOSITED') {
      return Math.max(0, total - (parseFloat(order.payment.amount) || 0));
    }
    return total;
  };

  const renderLoyaltyPointsSection = () => {
    const availablePoints = order?.vehicle?.customer?.loyalty_points || 0;
    const remainingToPay = getRemainingAmount();
    const maxDiscountAmount = remainingToPay * (maxDiscountPercent / 100);
    const maxPointsUsable = Math.floor(maxDiscountAmount / 1000);

    if (availablePoints <= 0) return null;

    return (
      <div className="bg-[#EDF3FF] border border-blue-200 rounded-xl p-4 mt-4 text-left">
        <div className="flex justify-between items-center mb-2">
          <span className="text-blue-800 font-semibold text-sm">Điểm tích lũy:</span>
          <span className="font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">{availablePoints.toLocaleString()} điểm</span>
        </div>

          <div className="space-y-3">
            <p className="text-xs text-blue-600">Bạn có thể dùng điểm để giảm tối đa {maxDiscountPercent}% hóa đơn ({formatPrice(maxDiscountAmount)}).</p>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                max={Math.min(availablePoints, maxPointsUsable)}
                value={inputPoints || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setInputPoints(Math.min(val, availablePoints, maxPointsUsable));
                }}
                placeholder="Nhập số điểm muốn đổi"
                className="flex-1 border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
              <button
                onClick={async () => {
                  setPointsToRedeem(inputPoints);
                  if (paymentMethod === 'ONLINE') {
                    try {
                      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
                      const discountedAmount = Math.max(0, getRemainingAmount() - (inputPoints * 1000));
                      await fetchPublic(`${apiBaseUrl}/api/payment/init-payment`, 'POST', {
                        orderId: order.id,
                        amount: discountedAmount,
                      });
                      showToast(`Đã áp dụng ${inputPoints} điểm!`, 'success');
                    } catch (err) {
                      console.warn(err);
                    }
                  } else {
                    showToast(`Đã áp dụng ${inputPoints} điểm!`, 'success');
                  }
                }}
                disabled={!inputPoints || inputPoints <= 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-blue-700 transition"
              >
                Áp dụng
              </button>
            </div>
            {pointsToRedeem > 0 && (
              <div className="flex justify-between items-center bg-green-50 border border-green-200 rounded-lg p-2 px-3 mt-2">
                <span className="text-green-700 text-sm font-semibold flex items-center gap-1">
                  ✓ Đang áp dụng {pointsToRedeem.toLocaleString()} điểm
                </span>
                <span className="text-green-700 font-bold">-{formatPrice(pointsToRedeem * 1000)}</span>
              </div>
            )}
          </div>
      </div>
    );
  };

  const finalAmountToPay = Math.max(0, getRemainingAmount() - (pointsToRedeem * 1000));

  const getLaborTotal = () => {
    if (order.quotation && Array.isArray(order.quotation.items)) {
      return order.quotation.items.reduce((sum: number, item: any) => {
        return sum + (parseFloat(item.repair_price) || 0);
      }, 0);
    }
    if (!order.tasks || !Array.isArray(order.tasks)) return 0;
    return order.tasks.reduce((sum: number, task: any) => {
      const labor = parseFloat(task.quotationItem?.repair_price) || parseFloat(task.catalog?.labor_price) || 0;
      return sum + labor;
    }, 0);
  };

  const getPartsTotal = () => {
    if (order.quotation && Array.isArray(order.quotation.items)) {
      return order.quotation.items.reduce((sum: number, item: any) => {
        const unitPrice = parseFloat(item.unit_price) || 0;
        const qty = parseInt(item.quantity) || 1;
        return sum + (unitPrice * qty);
      }, 0);
    }
    if (!order.tasks || !Array.isArray(order.tasks)) return 0;
    return order.tasks.reduce((sum: number, task: any) => {
      const total = parseFloat(task.catalog?.total_price) || 0;
      const labor = parseFloat(task.quotationItem?.repair_price) || parseFloat(task.catalog?.labor_price) || 0;
      return sum + Math.max(0, total - labor);
    }, 0);
  };

  const handleCancelOrder = () => {
    if (!cancelReason.trim()) {
      showToast('Vui lòng điền lý do hủy đơn.', 'warning');
      return;
    }

    const costValue = isAlreadyStarted ? parseFloat(incurredCost) || 0 : 0;

    // TODO: Call API to cancel order
    showToast(`Hủy hóa đơn dịch vụ SO-${order.id} chưa có API (đang phát triển)!`, 'info');
    setShowCancelModal(false);
  };

  // Helper cho data mapping
  const customerName = order.vehicle?.customer?.user?.fullName || 'Khách vãng lai';
  const customerPhone = order.vehicle?.customer?.phone || '—';
  const customerEmail = order.vehicle?.customer?.user?.email || '—';

  const vehiclePlate = order.vehicle?.license_plate || '—';
  const vehicleModel = `${order.vehicle?.model?.make?.make_name || ''} ${order.vehicle?.model?.model_name || ''}`.trim() || '—';
  const vehicleYear = order.vehicle?.year?.toString() || '—';
  const vehicleMileage = order.current_odo ? `${order.current_odo.toLocaleString('vi-VN')} km` : '—';
  const getBookingTypeLabel = (appointment: any) => {
    if (!appointment) return 'Trực tiếp / Cứu hộ';
    const type = appointment.booking_type;
    if (type?.includes('WALK_IN')) return 'Khách vãng lai';
    if (type?.includes('RECEPTIONIST')) return 'Tạo bởi Lễ tân';
    if (type?.includes('CUSTOMER_WEB')) return 'Khách tự đặt qua Website';
    return 'Lịch hẹn';
  };

  const hasTasks = order.tasks && order.tasks.length > 0;
  const isEveryTaskFinished = hasTasks
    ? order.tasks.every((task: any) => {
      const statusUpper = task.status?.toUpperCase();
      return statusUpper === 'COMPLETED' || statusUpper === 'CANCELLED';
    })
    : true;

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-5xl w-full mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/reception/service-orders')}
            title="Quay lại"
            className="mt-0.5 w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#00285E] hover:border-slate-300 active:scale-[0.97] transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-1">
              Chi tiết dịch vụ
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-500">SO-{order.id}</span>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap"
                style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
              >
                <StatusIcon size={12} className={order.status === 'IN_PROGRESS' ? 'animate-spin' : ''} />
                {statusCfg.label}
              </span>
              {isPaid ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={12} /> Đã thanh toán
                </span>
              ) : order?.payment?.payment_status === 'DEPOSITED' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap bg-amber-100 text-amber-700">
                  <Clock size={12} /> Đã cọc (30%)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap bg-slate-100 text-slate-600">
                  <Clock size={12} /> Chưa thanh toán
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isPaid && order.status !== 'CANCELLED' && (
            <button
              onClick={handleOpenPaymentModal}
              disabled={!isEveryTaskFinished}
              title={!isEveryTaskFinished ? "Vui lòng hoàn thành tất cả hạng mục công việc trước khi thanh toán" : "Thanh toán hóa đơn dịch vụ"}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all ${isEveryTaskFinished
                ? "bg-[#00285E] hover:bg-[#00285E]/90 text-white cursor-pointer shadow-md"
                : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                }`}
            >
              <CreditCard size={16} />
              Thanh toán dịch vụ
            </button>
          )}
        </div>
      </div>

      {/* CANCELLED INFO CARD */}
      {order.status === 'CANCELLED' && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3 print:hidden">
          <h2 className="text-sm font-bold text-rose-800 flex items-center gap-2 uppercase tracking-widest">
            <XCircle size={16} />
            Thông tin hủy hóa đơn dịch vụ (Audit Log)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-rose-700">
            <div>
              <span className="text-[10px] text-rose-400 uppercase block">Người thực hiện hủy</span>
              <span className="text-sm font-bold">{order.cancelledBy || 'Lễ tân hệ thống'}</span>
            </div>
            <div>
              <span className="text-[10px] text-rose-400 uppercase block">Thời gian hủy</span>
              <span className="text-sm font-bold">
                {new Date(order.cancelledAt || order.createdAt).toLocaleString('vi-VN')}
              </span>
            </div>
            <div className="md:col-span-2">
              <span className="text-[10px] text-rose-400 uppercase block">Lý do hủy</span>
              <p className="text-sm font-bold bg-white/70 border border-rose-100 rounded-lg p-2.5 mt-1 font-medium leading-relaxed">
                {order.cancelReason}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-rose-400 uppercase block">Chi phí phát sinh đã thu hồi</span>
              <span className="text-base font-extrabold text-rose-600 block mt-0.5">
                {formatPrice(order.incurredCost || 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED RECEIPT SLIP CARD */}
      <div className="bg-white rounded-3xl border border-slate-200/85 shadow-lg p-6 md:p-8 space-y-8 relative overflow-hidden print:border-none print:shadow-none print:p-0">

        {/* Decorative Top Bar for Receipt Feel */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#00285E] via-blue-600 to-amber-500 print:hidden" />

        {/* Invoice Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-6">
          <div className="space-y-1 text-left">
            <h3 className="text-xl md:text-2xl font-black text-[#00285E] uppercase tracking-wider">
              chi tiết dịch vụ
            </h3>
            <p className="text-xs text-slate-400 font-semibold">
              Mã lịch hẹn: {order.appointment_id ? `APT-${order.appointment_id}` : 'Trực tiếp'}
            </p>
          </div>
          <div className="text-left md:text-right space-y-1">
            <p className="text-sm font-bold text-slate-600">
              Số hóa đơn: <span className="text-[#00285E] text-base font-extrabold">SO-{order.id}</span>
            </p>
            <p className="text-xs text-slate-400 font-semibold">
              Ngày lập: {order.entry_time ? new Date(order.entry_time).toLocaleString('vi-VN') : new Date(order.createdAt).toLocaleString('vi-VN')}
            </p>
          </div>
        </div>

        {/* Dashed separator */}
        <div className="w-full border-t border-dashed border-slate-300 my-4" />

        {/* Metadata grid - Customer & Vehicle side-by-side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          {/* Customer info */}
          <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            <h4 className="text-xs font-bold text-[#00285E] uppercase tracking-widest flex items-center gap-1.5">
              <User size={14} />
              Thông tin khách hàng
            </h4>
            <div className="space-y-2 text-slate-600">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Họ và tên:</span>
                <span className="font-bold text-slate-900 text-base">{customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Số điện thoại:</span>
                <span className="font-bold text-slate-900">{customerPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[220px]">{customerEmail}</span>
              </div>
            </div>
          </div>

          {/* Vehicle info */}
          <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            <h4 className="text-xs font-bold text-[#00285E] uppercase tracking-widest flex items-center gap-1.5">
              <Car size={14} />
              Thông tin xe tiếp nhận
            </h4>
            <div className="space-y-2 text-slate-600">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Biển số:</span>
                <span className="inline-block px-3 py-1 bg-white border-2 border-slate-800 text-slate-900 font-black text-sm tracking-wider rounded shadow-xs font-mono">{vehiclePlate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Dòng xe:</span>
                <span className="font-bold text-slate-900">{vehicleModel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Năm sản xuất:</span>
                <span className="font-semibold text-slate-800">{vehicleYear}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Số ODO tiếp nhận:</span>
                <span className="font-bold text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-250/50">{vehicleMileage}</span>
              </div>
              <div className="flex flex-col gap-1 pt-2 border-t border-slate-100 mt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tình trạng tiếp nhận</span>
                <span className="text-xs font-semibold text-slate-800 break-words">{order.symptoms || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order technical details */}
        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold text-slate-600">
          <div>
            <span className="text-slate-400 block mb-0.5">Hình thức tiếp nhận</span>
            <span className="text-slate-800">{getBookingTypeLabel(order.appointment)}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Người lập tiếp nhận</span>
            <span className="text-slate-800">{order.receptionist?.fullName || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Thời điểm tiếp nhận</span>
            <span className="text-slate-800">
              {order.entry_time ? new Date(order.entry_time).toLocaleString('vi-VN') : new Date(order.createdAt).toLocaleString('vi-VN')}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Cầu nâng thực hiện</span>
            <span className="text-slate-800">{order.bay?.bay_name || '—'}</span>
          </div>
          {order.appointment?.scheduled_time && (
            <div>
              <span className="text-slate-400 block mb-0.5">Thời gian hẹn gốc</span>
              <span className="text-slate-800">
                {new Date(order.appointment.scheduled_time).toLocaleString('vi-VN')}
              </span>
            </div>
          )}
        </div>

        {/* Services & Labor / Spare Parts detailed breakdown if Quotation exists */}
        {order.quotation ? (
          <div className="space-y-6">

            {/* Services Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#00285E] uppercase tracking-widest flex items-center gap-1.5">
                <Wrench size={14} />
                Danh mục dịch vụ & Công thợ sửa chữa
              </h4>
              <div className="border border-slate-200/60 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="py-3.5 px-4 text-center w-12">STT</th>
                      <th className="py-3.5 px-4">Tên dịch vụ kỹ thuật</th>
                      <th className="py-3.5 px-4 text-right w-36">Chi phí sửa chữa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {order.quotation.items.filter((item: any) => parseFloat(item.repair_price) > 0).map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3.5 px-4 text-left">
                          <span className="font-semibold text-slate-800">
                            {item.custom_item_name || item.service_catalog?.service_name || 'Dịch vụ sửa chữa'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-[#00285E] bg-slate-50/50">
                          {formatPrice(parseFloat(item.repair_price) || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Spare Parts Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#00285E] uppercase tracking-widest flex items-center gap-1.5">
                <Package size={14} />
                Danh mục vật tư & Phụ tùng sử dụng
              </h4>
              <div className="border border-slate-200/60 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="py-3.5 px-4 text-center w-12">STT</th>
                      <th className="py-3.5 px-4">Tên phụ tùng</th>
                      <th className="py-3.5 px-4 text-center w-20">SL</th>
                      <th className="py-3.5 px-4 text-right w-32">Đơn giá</th>
                      <th className="py-3.5 px-4 text-right w-36">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {order.quotation.items.filter((item: any) => parseFloat(item.unit_price) > 0).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                          Không có vật tư phụ tùng thay thế nào.
                        </td>
                      </tr>
                    ) : (
                      order.quotation.items.filter((item: any) => parseFloat(item.unit_price) > 0).map((item: any, idx: number) => {
                        const totalItemPrice = (parseFloat(item.unit_price) || 0) * (item.quantity || 1);
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-3.5 px-4 text-left">
                              <div className="flex flex-col text-left">
                                <span className="font-semibold text-slate-800">
                                  {item.custom_item_name || item.sparePart?.name || 'Phụ tùng'}
                                </span>
                                {item.status === 'WAITING_DEPOSIT' && (
                                  <span className="text-[9px] font-bold text-amber-600 uppercase mt-0.5">
                                    Cần cọc linh kiện mới (30%)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center text-slate-500">
                              {item.quantity || 1}
                            </td>
                            <td className="py-3.5 px-4 text-right text-slate-500">
                              {formatPrice(parseFloat(item.unit_price) || 0)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-[#00285E] bg-slate-50/50">
                              {formatPrice(totalItemPrice)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : (
          /* Fallback: Old Tasks list if no Quotation */
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#00285E] uppercase tracking-widest flex items-center gap-1.5">
              <Wrench size={14} />
              Hạng mục công việc tiếp nhận sửa chữa
            </h4>

            <div className="border border-slate-200/60 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="py-3.5 px-4 text-center w-12">STT</th>
                    <th className="py-3.5 px-4">Tên dịch vụ kỹ thuật</th>
                    <th className="py-3.5 px-4 text-center w-28">Thời gian</th>
                    <th className="py-3.5 px-4 text-right w-36">Chi phí dịch vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {(!order.tasks || order.tasks.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                        Chưa có hạng mục dịch vụ nào trong phiếu thu này.
                      </td>
                    </tr>
                  ) : (
                    order.tasks.map((task: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800">{task.catalog?.service_name || 'Dịch vụ'}</span>
                            {task.status && (
                              <span className="text-[9px] font-bold text-blue-500 uppercase mt-0.5">
                                Trạng thái: {TASK_STATUS_LABELS[task.status.toUpperCase()] || task.status}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-500">
                          {task.catalog?.estimated_duration || 0} phút
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-[#00285E] bg-slate-50/50">
                          {formatPrice(parseFloat(task.catalog?.total_price) || 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Staff / Technicians list */}
        {(() => {
          const technicians = new Map();
          if (order.tasks && order.tasks.length > 0) {
            order.tasks.forEach((t: any) => {
              const tech = t.assignments?.[0]?.technician;
              if (tech && tech.id && tech.fullName) {
                technicians.set(tech.id, tech.fullName);
              }
            });
          }
          const uniqueTechs = Array.from(technicians.values());
          if (uniqueTechs.length === 0) return null;

          return (
            <div className="space-y-3 bg-slate-50/40 p-4 rounded-2xl border border-slate-100">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Nhân sự thực hiện:
              </h4>
              <div className="flex flex-wrap gap-2">
                {uniqueTechs.map((name, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-2xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    {name}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Totals Section */}
        <div className="-mx-6 md:-mx-8 -mb-6 md:-mb-8 mt-8 bg-slate-50 border-t border-slate-200/80 p-6 md:p-8 rounded-b-3xl">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">

            {/* Col 1: Tiền công */}
            <div className="flex-1 min-w-0 space-y-1 text-sm font-semibold text-left">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block whitespace-nowrap">Tiền công sửa chữa</span>
              <span className="text-base font-black text-slate-800">{formatPrice(getLaborTotal())}</span>
              <span className="text-[9.5px] text-slate-450 block font-normal whitespace-nowrap">Chi phí nhân công</span>
            </div>

            {/* Col 2: Tiền phụ tùng */}
            <div className="flex-1 min-w-0 space-y-1 text-sm font-semibold border-t md:border-t-0 md:border-l border-slate-200 md:pl-4 pt-4 md:pt-0 text-left">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block whitespace-nowrap">Tiền vật tư / phụ tùng</span>
              <span className="text-base font-black text-slate-800">{formatPrice(getPartsTotal())}</span>
              <span className="text-[9.5px] text-slate-450 block font-normal whitespace-nowrap">Chi phí linh kiện thay thế</span>
            </div>

            {/* Col 3: Tổng chi phí dịch vụ */}
            <div className="flex-1 min-w-0 space-y-1 text-sm font-semibold border-t md:border-t-0 md:border-l border-slate-200 md:pl-4 pt-4 md:pt-0 text-left">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block whitespace-nowrap">Tổng chi phí dịch vụ</span>
              <span className="text-base font-black text-[#00285E]">{formatPrice(getOrderTotal())}</span>
              <span className="text-[9.5px] text-slate-450 block font-normal whitespace-nowrap">Chưa trừ tiền đặt cọc</span>
            </div>

            {/* Col 4: Đã cọc / Trạng thái */}
            <div className="flex-1 min-w-0 space-y-1 text-sm font-semibold border-t md:border-t-0 md:border-l border-slate-200 md:pl-4 pt-4 md:pt-0 text-left">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block whitespace-nowrap">Trạng thái thanh toán</span>
              <div className="flex items-center gap-2 mt-1">
                {order.payment?.payment_status === 'PAID' || order.payment?.payment_status === 'COMPLETED' ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 whitespace-nowrap">
                    Đã thanh toán
                  </span>
                ) : order.payment?.payment_status === 'DEPOSITED' ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 whitespace-nowrap">
                    Đã cọc (30%)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 whitespace-nowrap">
                    Chưa thanh toán
                  </span>
                )}
              </div>
              {order.payment?.payment_status === 'DEPOSITED' && (
                <span className="text-[11px] font-bold text-amber-600 block mt-1 whitespace-nowrap">
                  Đã cọc: -{formatPrice(parseFloat(order.payment.amount) || 0)}
                </span>
              )}
              {(order.payment?.payment_status === 'PAID' || order.payment?.payment_status === 'COMPLETED') && (
                <span className="text-[9.5px] text-emerald-600 block mt-1 whitespace-nowrap">
                  Đã trả: {formatPrice(getOrderTotal())}
                </span>
              )}
            </div>

            {/* Col 5: Tổng thanh toán còn lại */}
            <div className="bg-[#EDF3FF] border border-[#D2E2FF] rounded-2xl p-3 shadow-inner text-right min-w-[170px] shrink-0">
              <span className="text-[#00285E] font-black text-[11px] uppercase tracking-wider block mb-1 whitespace-nowrap">
                {order.payment?.payment_status === 'PAID' || order.payment?.payment_status === 'COMPLETED'
                  ? 'Còn lại:'
                  : order.payment?.payment_status === 'DEPOSITED'
                    ? 'Còn lại cần thu:'
                    : 'Tổng chi phí:'}
              </span>
              <span className="text-lg font-black text-rose-600 block whitespace-nowrap">
                {formatPrice(
                  order.payment?.payment_status === 'PAID' || order.payment?.payment_status === 'COMPLETED'
                    ? 0
                    : getRemainingAmount()
                )}
              </span>
            </div>

          </div>
        </div>
      </div>

      {/* CANCELLATION MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowCancelModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md mx-4 p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <AlertTriangle size={22} className="text-rose-500" />
              Yêu cầu hủy hóa đơn dịch vụ
            </h3>

            {isAlreadyStarted ? (
              <div className="bg-amber-50 border border-amber-100 text-amber-800 rounded-xl p-3 text-xs leading-relaxed space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <AlertTriangle size={14} />
                  Chú ý: Xe đã bước vào sửa chữa!
                </p>
                <p>
                  Hóa đơn `{order.id}` hiện có trạng thái **{statusCfg.label}**. Theo quy định, nếu đã tháo lắp hoặc sửa một phần, bạn cần thu hồi chi phí phát sinh (ví dụ: công kiểm tra, phụ tùng đã bóc hộp, công tháo lắp).
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 leading-relaxed">
                Hóa đơn `{order.id}` chưa bắt đầu thực hiện sửa chữa. Huỷ đơn này sẽ không tính thêm chi phí phát sinh.
              </p>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Lý do hủy hóa đơn <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do chi tiết từ chối tiếp tục sửa chữa..."
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-300 transition-all resize-none"
              />
            </div>

            {isAlreadyStarted && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <DollarSign size={13} />
                  Chi phí phát sinh thu hồi (đ)
                </label>
                <input
                  type="number"
                  value={incurredCost}
                  onChange={(e) => setIncurredCost(e.target.value)}
                  placeholder="VD: 150000"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-300 transition-all font-semibold"
                />
                <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                  (Bao gồm công kiểm tra, tháo lắp, phụ tùng hao hụt)
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowCancelModal(false); setCancelReason(''); }}
                className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={handleCancelOrder}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-colors"
              >
                Xác nhận hủy hóa đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTOMATED QR PAYMENT MODAL MATCHING BOOKING PAGE STYLE */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md overflow-y-auto">
          {!isPaymentSuccess ? (
            <>
              {paymentMethod === 'NONE' && (
                <div className="max-w-3xl w-full rounded-[2.5rem] bg-white shadow-2xl overflow-hidden flex flex-col relative my-8 p-8 md:p-10 text-center border border-slate-200">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                  >
                    <X size={20} />
                  </button>
                  <h3 className="text-2xl font-black text-[#00285E] mb-2 uppercase">Phương thức thanh toán</h3>
                  <p className="text-slate-500 text-sm mb-8">Vui lòng chọn hình thức thanh toán cho hóa đơn SO-{order.id}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* CASH OPTION */}
                    <button
                      onClick={() => handleSelectPaymentMethod('CASH')}
                      className="flex flex-col items-center justify-center p-8 bg-slate-50 hover:bg-emerald-50 border-2 border-slate-200 hover:border-emerald-400 rounded-3xl transition-all group"
                    >
                      <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Banknote size={32} />
                      </div>
                      <h4 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-emerald-700">Tiền mặt</h4>
                      <p className="text-sm text-slate-500 font-medium">Khách hàng thanh toán bằng tiền mặt trực tiếp tại quầy</p>
                    </button>

                    {/* ONLINE OPTION */}
                    <button
                      onClick={() => handleSelectPaymentMethod('ONLINE')}
                      className="flex flex-col items-center justify-center p-8 bg-slate-50 hover:bg-blue-50 border-2 border-slate-200 hover:border-blue-400 rounded-3xl transition-all group"
                    >
                      <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <QrCode size={32} />
                      </div>
                      <h4 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-700">Chuyển khoản (QR)</h4>
                      <p className="text-sm text-slate-500 font-medium">Khách hàng quét mã VietQR bằng ứng dụng ngân hàng</p>
                    </button>
                  </div>
                </div>
              )}

              {paymentMethod === 'CASH' && (
                <div className="max-w-2xl w-full rounded-[2.5rem] bg-white shadow-2xl overflow-hidden flex flex-col relative my-8 p-8 md:p-10 text-center border border-slate-200">
                  <button
                    onClick={() => setPaymentMethod('NONE')}
                    className="absolute top-4 left-4 z-30 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                  >
                    <X size={20} />
                  </button>

                  <div className="w-20 h-20 mx-auto bg-blue-50 text-[#00285E] rounded-full flex items-center justify-center mb-6">
                    <Banknote size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-[#00285E] mb-2 uppercase">Thanh toán Tiền mặt</h3>
                  <p className="text-slate-500 mb-6">Xác nhận thu tiền mặt từ khách hàng cho hóa đơn SO-{order.id}</p>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8 text-left space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                      <span className="text-slate-500 font-semibold">Khách hàng:</span>
                      <span className="font-bold text-slate-800">{customerName}</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                      <span className="text-slate-500 font-semibold">Biển số xe:</span>
                      <span className="font-bold text-[#00285E] bg-[#EDF3FF] px-2 py-0.5 rounded">{vehiclePlate}</span>
                    </div>
                    {order.payment?.payment_status === 'DEPOSITED' && (
                      <>
                        <div className="flex justify-between items-center pb-4 border-b border-slate-200 text-xs">
                          <span className="text-slate-500 font-semibold">Tổng chi phí dịch vụ:</span>
                          <span className="font-bold text-slate-700">{formatPrice(getOrderTotal())}</span>
                        </div>
                        <div className="flex justify-between items-center pb-4 border-b border-slate-200 text-xs text-amber-600">
                          <span className="font-semibold">Đã đặt cọc (30%):</span>
                          <span className="font-bold">-{formatPrice(parseFloat(order.payment.amount) || 0)}</span>
                        </div>
                      </>
                    )}
                    {renderLoyaltyPointsSection()}
                    <div className="flex justify-between items-center text-lg mt-4 pt-4 border-t border-slate-200">
                      <span className="text-slate-600 font-bold">Số tiền thực thu:</span>
                      <span className="text-2xl font-black text-rose-600">{formatPrice(finalAmountToPay)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmCashPayment}
                    className="w-full py-4 bg-[#00285E] hover:bg-[#00285E]/90 text-white rounded-xl text-lg font-bold transition-colors shadow-lg shadow-[#00285E]/30"
                  >
                    Xác nhận ĐÃ THU ĐỦ TIỀN MẶT
                  </button>
                </div>
              )}

              {paymentMethod === 'ONLINE' && (
                <div className="max-w-5xl w-full rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col lg:flex-row relative border border-white/20 my-8">
                  {/* Close and Back Button */}
                  <button
                    onClick={() => setPaymentMethod('NONE')}
                    className="absolute top-4 left-4 z-30 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 backdrop-blur-md transition-colors shadow-lg"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white backdrop-blur-md transition-colors"
                  >
                    <X size={20} />
                  </button>

                  {/* LEFT SIDE: Order Details */}
                  <div className="flex-1 p-8 md:p-10 bg-white/95 backdrop-blur-xl flex flex-col text-left">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-[#00285E]/10 flex items-center justify-center text-[#00285E] shadow-inner">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-extrabold text-[#00285E]">Chi tiết hóa đơn</h2>
                        <p className="text-sm text-slate-500">Mã đơn: <span className="font-bold text-[#00285E]">SO-{order.id}</span></p>
                      </div>
                    </div>

                    <div className="space-y-4 flex-grow">
                      <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/60 text-xs space-y-3">
                        <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/60">
                          <span className="text-slate-500 font-semibold">Khách hàng</span>
                          <span className="font-bold text-slate-800">{customerName} ({customerPhone})</span>
                        </div>

                        <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/60">
                          <span className="text-slate-500 font-semibold">Phương tiện xe</span>
                          <span className="font-bold text-[#00285E] bg-[#EDF3FF] px-2 py-0.5 rounded uppercase">
                            {vehiclePlate} - {vehicleModel}
                          </span>
                        </div>

                        <div className="pb-2 border-b border-slate-200/60 space-y-1.5">
                          <span className="text-slate-500 font-semibold block mb-1">Hạng mục thanh toán:</span>
                          {order.quotation && Array.isArray(order.quotation.items) ? (
                            <>
                              {/* Công thợ */}
                              {order.quotation.items.filter((item: any) => parseFloat(item.repair_price) > 0).map((item: any, idx: number) => (
                                <div key={`q-srv-${idx}`} className="flex justify-between items-center text-slate-700">
                                  <span>• {item.custom_item_name || item.service_catalog?.service_name || 'Dịch vụ'} (Công thợ)</span>
                                  <span className="font-bold">{formatPrice(parseFloat(item.repair_price) || 0)}</span>
                                </div>
                              ))}
                              {/* Phụ tùng */}
                              {order.quotation.items.filter((item: any) => parseFloat(item.unit_price) > 0).map((item: any, idx: number) => (
                                <div key={`q-part-${idx}`} className="flex justify-between items-center text-slate-500 pl-2">
                                  <span>• Phụ tùng: {item.custom_item_name || item.sparePart?.name || 'Vật tư'} (x{item.quantity})</span>
                                  <span className="font-bold">{formatPrice((parseFloat(item.unit_price) || 0) * (item.quantity || 1))}</span>
                                </div>
                              ))}
                            </>
                          ) : (!order.tasks || order.tasks.length === 0) ? (
                            <p className="text-slate-400 italic">Công dịch vụ sửa chữa tổng hợp</p>
                          ) : (
                            order.tasks.map((task: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center text-slate-700">
                                <span>• {task.catalog?.service_name || 'Dịch vụ'}</span>
                                <span className="font-bold">{formatPrice(parseFloat(task.catalog?.total_price || task.catalog?.labor_price) || 0)}</span>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="flex justify-between items-center pt-1">
                          <span className="text-slate-500 font-semibold">Trạng thái đơn</span>
                          <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Chờ quét QR thanh toán
                          </span>
                        </div>
                      </div>
                    </div>

                    {renderLoyaltyPointsSection()}

                    <div className="mt-6 pt-4 border-t border-dashed border-slate-300 space-y-3">
                      {order.payment?.payment_status === 'DEPOSITED' && (
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-600 px-1">
                          <span>Đã đặt cọc (30%):</span>
                          <span className="text-amber-600">-{formatPrice(parseFloat(order.payment.amount) || 0)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between p-4 bg-[#EDF3FF] rounded-2xl border border-blue-100">
                        <span className="font-bold text-[#00285E] text-sm">
                          {order.payment?.payment_status === 'DEPOSITED' ? 'Còn lại cần thanh toán' : 'Tổng thanh toán'}
                        </span>
                        <span className="text-2xl font-black text-rose-600">
                          {formatPrice(finalAmountToPay)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT SIDE: Payment QR Details - Glassmorphism Dark (Matching BookingPage.tsx) */}
                  <div className="flex-1 p-8 md:p-10 relative overflow-hidden flex flex-col justify-center min-h-[480px] bg-slate-950/90 backdrop-blur-2xl text-center">
                    {/* Lighting Effects */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl z-0" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full translate-y-1/3 -translate-x-1/3 blur-3xl z-0" />

                    <div className="relative z-10 text-center space-y-6 flex flex-col items-center">
                      <div>
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-4 shadow-xl">
                          <Banknote size={28} className="text-[#F9A11B]" />
                        </div>
                        <h3 className="text-2xl font-extrabold text-white font-display mb-2">Thanh toán đơn hàng</h3>
                        <p className="text-blue-100/80 text-xs leading-relaxed max-w-xs mx-auto font-light">
                          Quét mã QR bằng ứng dụng ngân hàng hoặc ví điện tử bất kỳ để thanh toán.
                        </p>
                      </div>

                      {/* QR Code Container */}
                      <div className="p-1 rounded-3xl bg-gradient-to-br from-white/40 to-white/10 shadow-2xl relative group">
                        <div className="bg-white p-4 rounded-[1.3rem] relative z-10">
                          <img
                            src={`https://vietqr.app/img?acc=${import.meta.env.VITE_SEPAY_ACC || '0348714088'}&bank=${import.meta.env.VITE_SEPAY_BANK || 'MB'}&amount=${finalAmountToPay}&template=compact&showinfo=true&addInfo=SO-${order.id}${pointsToRedeem > 0 ? `-PT-${pointsToRedeem}` : ''}`}
                            alt="VietQR Payment Code"
                            className="w-52 h-52 rounded-xl object-contain mx-auto"
                          />
                          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 font-medium flex items-center justify-center gap-1.5">
                            <span>Nội dung CK:</span>
                            <span className="font-mono font-bold text-[#00285E] bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase">
                              SO-{order.id}{pointsToRedeem > 0 ? `-PT-${pointsToRedeem}` : ''}
                            </span>
                            <button
                              onClick={() => handleCopy(`SO-${order.id}${pointsToRedeem > 0 ? `-PT-${pointsToRedeem}` : ''}`, 'Nội dung chuyển khoản')}
                              className="p-1 text-slate-400 hover:text-[#00285E] rounded transition-colors"
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Polling Spinner Indicator */}
                      <div className="pt-1 w-full max-w-xs text-center space-y-2">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-[#F9A11B] border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-[11px] text-blue-100/70 leading-relaxed max-w-[250px] mx-auto">
                            Hệ thống đang tự động chờ xác nhận thanh toán...
                          </p>
                        </div>

                        {/* Test Bypass Option */}
                        <button
                          onClick={handleSimulatePaymentSuccess}
                          className="text-[10px] text-amber-300/60 hover:text-amber-300 underline font-medium transition-colors"
                        >
                          [ Giả lập nhận tiền thành công (Demo) ]
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* TICKET SUCCESS VIEW (Matching BookingPage.tsx) */
            <div className="max-w-3xl w-full bg-white rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row relative overflow-hidden my-8 border border-slate-200">
              {/* Left Stub */}
              <div className="bg-emerald-500 md:w-1/3 p-8 flex flex-col items-center justify-center relative overflow-hidden text-center min-h-[280px]">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl mb-4 relative z-10">
                  <Check className="w-8 h-8 text-emerald-500" strokeWidth={3.5} />
                </div>
                <h3 className="text-2xl font-black text-white mb-1 relative z-10">Thành Công!</h3>
                <p className="text-emerald-50 text-xs leading-relaxed relative z-10">Đã xác nhận thanh toán</p>
              </div>

              {/* Right Body */}
              <div className="p-8 md:w-2/3 bg-white flex flex-col justify-between text-left space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-[#00285E]">Hóa đơn dịch vụ SO-{order.id}</h3>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg">
                      Đã thanh toán
                    </span>
                  </div>

                  <div className="space-y-2 text-xs font-semibold text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Khách hàng:</span>
                      <span className="text-slate-800">{customerName} ({customerPhone})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Xe:</span>
                      <span className="text-slate-800">{vehiclePlate} - {vehicleModel}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <span className="text-slate-500 font-bold">Tổng tiền đã thanh toán:</span>
                      <span className="text-lg font-black text-[#00285E]">{formatPrice(getOrderTotal())}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => alert('Đang gửi lệnh in phiếu thu hóa đơn...')}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer size={15} />
                    In phiếu thu
                  </button>
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      setIsPaymentSuccess(false);
                    }}
                    className="flex-1 py-3 bg-[#00285E] hover:bg-[#00285E]/90 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Hoàn tất & Đóng
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

function InfoRow({ label, value, icon, highlight }: { label: string; value: string; icon?: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between py-1 border-b border-slate-100 last:border-0 pb-2.5 last:pb-0">
      <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className={`text-sm font-bold text-right ${highlight ? 'text-[#00285E] bg-[#EDF3FF] px-2 py-0.5 rounded-md' : 'text-slate-700'}`}>
        {value}
      </span>
    </div>
  );
}
