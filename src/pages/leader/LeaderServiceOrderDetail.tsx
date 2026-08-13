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
  Users,
  HelpCircle,
} from 'lucide-react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { useFetchClient_v2 as useFetchClient } from '../../hook/useFetchClient';
import { useSocket } from '../../hook/useSocket';
import { LEADER_SERVICE_ORDER_API_ENDPOINTS } from '../../constants/technicianLeader/serviceOrderEndpoints';

const SO_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  INSPECTING: { label: 'Đã tiếp nhận', color: '#6B7280', bg: '#F3F4F6', icon: Clock },
  ASSIGNED: { label: 'Đã phân công', color: '#6366F1', bg: '#EEF2FF', icon: Users },
  IN_PROGRESS: { label: 'Đang sửa chữa', color: '#3B82F6', bg: '#EFF6FF', icon: Loader2 },
  WAITING_FOR_PARTS: { label: 'Chờ phụ tùng', color: '#D97706', bg: '#FEF3C7', icon: AlertTriangle },
  WAITING_APPROVAL: { label: 'Chờ khách duyệt', color: '#EC4899', bg: '#FDF2F8', icon: HelpCircle },
  QC_CHECKING: { label: 'Đang QC', color: '#8B5CF6', bg: '#F5F3FF', icon: Clock },
  COMPLETED: { label: 'Hoàn thành', color: '#10B981', bg: '#ECFDF5', icon: CheckCircle2 },
  CANCELLED: { label: 'Đã huỷ lệnh', color: '#EF4444', bg: '#FEF2F2', icon: XCircle },
  CLOSED_PARTIAL: { label: 'Đã đóng một phần', color: '#D97706', bg: '#FEF3C7', icon: AlertTriangle },
};

const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ thực hiện',
  ASSIGNED: 'Đã giao thợ',
  IN_PROGRESS: 'Đang tiến hành',
  PENDING_QC: 'Chờ kiểm định',
  COMPLETED: 'Đã hoàn thành',
  CANCELLED: 'Đã hủy',
};

export default function LeaderServiceOrderDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  }>();
  const { fetchPrivate, fetchPublic } = useFetchClient();
  const socket = useSocket();

  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCloseEarlyModal, setShowCloseEarlyModal] = useState(false);
  const [closeEarlyReason, setCloseEarlyReason] = useState('');
  const [completedItemIds, setCompletedItemIds] = useState<Set<number>>(new Set());
  const [isClosingEarly, setIsClosingEarly] = useState(false);

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
      const res = await fetchPrivate(LEADER_SERVICE_ORDER_API_ENDPOINTS.GET_DETAIL(orderId), 'GET');
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
          onClick={() => navigate('/leader/appointments')}
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

  const formatPrice = (price: number) => {
    return (price || 0).toLocaleString('vi-VN') + ' VND';
  };

  const getRescuePrice = () => {
    return parseFloat(order?.appointment?.rescueRequest?.rescue_price) || 0;
  };

  const getOrderTotal = () => {
    let baseTotal = 0;
    if (order.quotation && Array.isArray(order.quotation.items)) {
      baseTotal = order.quotation.items.reduce((sum: number, item: any) => {
        const itemTotal = (parseFloat(item.unit_price) || 0) * (item.quantity || 1) + (parseFloat(item.repair_price) || 0);
        return sum + itemTotal;
      }, 0);
    } else {
      baseTotal = order.tasks?.reduce((sum: number, task: any) => sum + (parseFloat(task.catalog?.total_price || task.catalog?.labor_price) || 0), 0) || 0;
    }
    return baseTotal + getRescuePrice();
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
      return order.quotation.items
        .filter((item: any) => item.status !== 'CANCELLED')
        .reduce((sum: number, item: any) => sum + (parseFloat(item.repair_price) || 0), 0);
    }
    if (!order.tasks || !Array.isArray(order.tasks)) return 0;
    return order.tasks.reduce((sum: number, task: any) => {
      const labor = parseFloat(task.quotationItem?.repair_price) || parseFloat(task.catalog?.labor_price) || 0;
      return sum + labor;
    }, 0);
  };

  const getPartsTotal = () => {
    if (order.quotation && Array.isArray(order.quotation.items)) {
      return order.quotation.items
        .filter((item: any) => item.status !== 'CANCELLED')
        .reduce((sum: number, item: any) => {
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

  const handleOpenCloseEarlyModal = () => {
    setCompletedItemIds(new Set());
    setCloseEarlyReason('');
    setShowCloseEarlyModal(true);
  };

  const toggleCompletedItem = (itemIds: number | number[]) => {
    const ids = Array.isArray(itemIds) ? itemIds : [itemIds];
    setCompletedItemIds((prev) => {
      const next = new Set(prev);
      const allChecked = ids.every((id) => next.has(id));
      ids.forEach((id) => (allChecked ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const handleConfirmCloseEarly = async () => {
    if (!closeEarlyReason.trim()) {
      showToast('Vui lòng điền lý do đóng sớm lệnh sửa chữa.', 'warning');
      return;
    }

    setIsClosingEarly(true);
    try {
      const res = await fetchPrivate(
        LEADER_SERVICE_ORDER_API_ENDPOINTS.CLOSE_EARLY(String(order.id)),
        'PATCH',
        {
          completedQuotationItemIds: Array.from(completedItemIds),
          reason: closeEarlyReason.trim(),
        },
      );
      if (res && res.success) {
        showToast(`Đã đóng sớm hóa đơn dịch vụ SO-${order.id} thành công.`, 'success');
        setShowCloseEarlyModal(false);
        await loadOrderDetail(String(order.id));
      } else {
        showToast(res?.message || 'Không thể đóng sớm lệnh sửa chữa.', 'warning');
      }
    } catch (error: any) {
      showToast(error?.message || 'Lỗi khi đóng sớm lệnh sửa chữa.', 'warning');
    } finally {
      setIsClosingEarly(false);
    }
  };

  // Helper cho data mapping
  const customerName = order.vehicle?.customer?.name || order.vehicle?.customer?.user?.fullName || 'Khách vãng lai';
  const customerPhone = order.vehicle?.customer?.phone || '—';
  const customerEmail = order.vehicle?.customer?.user?.email || '—';

  const vehiclePlate = order.vehicle?.license_plate || '—';
  const vehicleModel = `${order.vehicle?.model?.make?.make_name || ''} ${order.vehicle?.model?.model_name || ''}`.trim() || '—';
  const vehicleYear = order.vehicle?.year?.toString() || '—';
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
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-5xl w-full mx-auto text-slate-800">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/leader/appointments')}
            title="Quay lại"
            className="mt-0.5 w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-[#00285E] border border-[#00285E] text-white hover:bg-[#003C7D] hover:border-[#003C7D] active:scale-[0.97] transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-1">
              Chi tiết dịch vụ
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-bold text-slate-550">SO-{order.id}</span>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap"
                style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
              >
                <StatusIcon size={12} className={order.status === 'IN_PROGRESS' ? 'animate-spin' : ''} />
                {statusCfg.label}
              </span>
              {order.bay_status === 'WAITING' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap bg-orange-100 text-orange-700">
                  <Clock size={12} /> Đang chờ cầu nâng
                </span>
              )}
              {order.status === 'CANCELLED' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap bg-rose-100 text-rose-700 max-w-xs truncate">
                  Lý do: {order.early_closure_reason || 'Không có ghi chú'}
                </span>
              ) : isPaid ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={12} /> Đã thanh toán
                </span>
              ) : order?.payment?.payment_status === 'DEPOSITED' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap bg-amber-100 text-amber-700">
                  <Clock size={12} /> Đã cọc
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap bg-slate-100 text-slate-650">
                  <Clock size={12} /> Chưa thanh toán
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isPaid && order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && order.status !== 'CLOSED_PARTIAL' && order.quotation && (
            <button
              onClick={handleOpenCloseEarlyModal}
              title="Đóng sớm lệnh sửa chữa khi khách hàng muốn dừng giữa chừng"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-all"
            >
              <AlertTriangle size={16} />
              Đóng đơn
            </button>
          )}
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

      {/* EARLY CLOSURE INFO CARD */}
      {order.status === 'COMPLETED' && order.early_closure_reason && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3 print:hidden text-left">
          <h2 className="text-sm font-bold text-amber-800 flex items-center gap-2 uppercase tracking-widest">
            <AlertTriangle size={16} />
            Đơn đã đóng sớm theo yêu cầu khách hàng
          </h2>
          <p className="text-xs text-amber-700 leading-relaxed">
            Lệnh sửa chữa này được chốt trước khi hoàn tất toàn bộ báo giá ban đầu. Các hạng mục chưa thực hiện đã bị loại khỏi
            hóa đơn, chỉ tính đúng phần đã thực hiện thật.
          </p>
          <div className="bg-white/70 border border-amber-100 rounded-lg p-3">
            <span className="text-[10px] text-amber-500 uppercase font-bold block mb-1">Lý do đóng sớm</span>
            <p className="text-xs font-semibold text-amber-800 whitespace-pre-line leading-relaxed">
              {order.early_closure_reason}
            </p>
          </div>
        </div>
      )}

      {/* DETAILED RECEIPT SLIP CARD */}
      <div className="bg-white rounded-3xl border border-slate-200/85 shadow-lg p-6 md:p-8 space-y-8 relative overflow-hidden print:border-none print:shadow-none print:p-0">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#00285E] via-blue-600 to-amber-500 print:hidden" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-6">
          <div className="space-y-1 text-left">
            <h3 className="text-xl md:text-2xl font-black text-[#00285E] uppercase tracking-wider">
              chi tiết dịch vụ
            </h3>
            <p className="text-xs text-slate-450 font-semibold">
              Mã lịch hẹn: {order.appointment_id ? `APT-${order.appointment_id}` : 'Trực tiếp'}
            </p>
          </div>
          <div className="text-left md:text-right space-y-1">
            <p className="text-sm font-bold text-slate-600">
              Số hóa đơn: <span className="text-[#00285E] text-base font-extrabold">SO-{order.id}</span>
            </p>
            <p className="text-xs text-slate-450 font-semibold">
              Ngày lập: {order.entry_time ? new Date(order.entry_time).toLocaleString('vi-VN') : new Date(order.createdAt).toLocaleString('vi-VN')}
            </p>
          </div>
        </div>

        <div className="w-full border-t border-dashed border-slate-300 my-4" />

        {/* Metadata grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          {/* Customer info */}
          <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 text-left">
            <h4 className="text-xs font-bold text-[#00285E] uppercase tracking-widest flex items-center gap-1.5">
              <User size={14} />
              Thông tin khách hàng
            </h4>
            <div className="space-y-2 text-slate-600">
              <div className="flex justify-between items-center">
                <span className="text-slate-450">Họ và tên:</span>
                <span className="font-bold text-slate-900 text-base">{customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-450">Số điện thoại:</span>
                <span className="font-bold text-slate-900">{customerPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450">Email:</span>
                <span className="font-semibold text-slate-850 truncate max-w-[220px]">{customerEmail}</span>
              </div>
            </div>
          </div>

          {/* Vehicle info */}
          <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 text-left">
            <h4 className="text-xs font-bold text-[#00285E] uppercase tracking-widest flex items-center gap-1.5">
              <Car size={14} />
              Thông tin xe tiếp nhận
            </h4>
            <div className="space-y-2 text-slate-600">
              <div className="flex justify-between items-center">
                <span className="text-slate-450">Biển số:</span>
                <span className="inline-block px-3 py-1 bg-white border-2 border-slate-800 text-slate-900 font-black text-sm tracking-wider rounded shadow-xs font-mono">{vehiclePlate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-450">Dòng xe:</span>
                <span className="font-bold text-slate-900">{vehicleModel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-450">Năm sản xuất:</span>
                <span className="font-semibold text-slate-800">{vehicleYear}</span>
              </div>
              <div className="flex flex-col gap-1 pt-2 border-t border-slate-105 mt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tình trạng tiếp nhận</span>
                <span className="text-xs font-semibold text-slate-800 break-words">{order.symptoms || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order technical details */}
        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold text-slate-600 text-left">
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

        {/* Services & Labor / Spare Parts detailed breakdown */}
        {order.quotation ? (
          <div className="space-y-6">
            {/* Services Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#00285E] uppercase tracking-widest flex items-center gap-1.5 text-left">
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
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-705">
                    {(() => {
                      const inspectionRows = (order.tasks || [])
                        .filter((t: any) => t.type === 'INSPECTION' && t.status !== 'CANCELLED' && t.catalog?.service_name)
                        .map((task: any) => ({
                          key: `inspection-${task.id}`,
                          name: task.catalog.service_name,
                          cost: 0,
                        }));
                      const serviceRows = (order.quotation?.items || [])
                        .filter((item: any) => parseFloat(item.repair_price) > 0 && item.status !== 'CANCELLED')
                        .map((item: any, idx: number) => ({
                          key: `service-${idx}`,
                          name: item.service_catalog?.service_name || 'Dịch vụ sửa chữa',
                          cost: parseFloat(item.repair_price) || 0,
                        }));

                      const rescuePrice = getRescuePrice();
                      const rescueRows = rescuePrice > 0 ? [{
                        key: 'rescue-fee-row',
                        name: `Dịch vụ cứu hộ khẩn cấp (${order.appointment?.rescueRequest?.distance_km || 0} km)`,
                        cost: rescuePrice,
                      }] : [];

                      const rows = [...inspectionRows, ...serviceRows, ...rescueRows];

                      return rows.map((row, idx) => (
                        <tr key={row.key} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-3.5 px-4 text-left">
                            <span className="font-semibold text-slate-800">{row.name}</span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {row.cost > 0 ? (
                              <span className="font-bold text-[#00285E]">{formatPrice(row.cost)}</span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold text-white bg-[#00285E]">
                                Miễn phí
                              </span>
                            )}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200">
                      <td colSpan={2} className="py-3 px-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Tổng cộng
                      </td>
                      <td className="py-3 px-4 text-right font-black text-[#00285E]">
                        {formatPrice(getLaborTotal())}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Spare Parts Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#00285E] uppercase tracking-widest flex items-center gap-1.5 text-left">
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
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-705">
                    {order.quotation.items.filter((item: any) => parseFloat(item.unit_price) > 0 && item.status !== 'CANCELLED').length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-450 italic">
                          Không có vật tư phụ tùng thay thế nào.
                        </td>
                      </tr>
                    ) : (
                      order.quotation.items.filter((item: any) => parseFloat(item.unit_price) > 0 && item.status !== 'CANCELLED').map((item: any, idx: number) => {
                        const totalItemPrice = (parseFloat(item.unit_price) || 0) * (item.quantity || 1);
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-3.5 px-4 text-left">
                              <div className="flex flex-col text-left">
                                <span className="font-semibold text-slate-800">
                                  {item.customPartOrder?.item_name || item.sparePart?.name || 'Phụ tùng'}
                                </span>
                                {item.customPartOrder?.status === 'WAITING_DEPOSIT' && (
                                  <span className="text-[9px] font-bold text-amber-600 uppercase mt-0.5">
                                    Cần cọc linh kiện mới (30%)
                                  </span>
                                )}
                                {item.customPartOrder && item.customPartOrder.status !== 'WAITING_DEPOSIT' && (
                                  <span className="text-[9px] font-bold text-emerald-600 uppercase mt-0.5">
                                    Đã cọc linh kiện
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
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200">
                      <td colSpan={4} className="py-3 px-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Tổng cộng
                      </td>
                      <td className="py-3 px-4 text-right font-black text-[#00285E]">
                        {formatPrice(getPartsTotal())}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Fallback Tasks List */
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#00285E] uppercase tracking-widest flex items-center gap-1.5 text-left">
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
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-705">
                  {(!order.tasks || order.tasks.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-450 italic">
                        Chưa có hạng mục dịch vụ nào trong phiếu thu này.
                      </td>
                    </tr>
                  ) : (
                    order.tasks.map((task: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col text-left">
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

        {/* Staff list */}
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
            <div className="space-y-3 bg-slate-50/40 p-4 rounded-2xl border border-slate-100 text-left">
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
            {getRescuePrice() > 0 && (
              <div className="flex-1 min-w-0 space-y-1 text-sm font-semibold text-left">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block whitespace-nowrap">Phí cứu hộ khẩn cấp</span>
                <span className="text-base font-black text-rose-600">{formatPrice(getRescuePrice())}</span>
                <span className="text-[9.5px] text-slate-450 block font-normal whitespace-nowrap">Khoảng cách: {order.appointment?.rescueRequest?.distance_km} km</span>
              </div>
            )}

            <div className={`flex-1 min-w-0 space-y-1 text-sm font-semibold text-left ${getRescuePrice() > 0 ? 'border-t md:border-t-0 md:border-l border-slate-200 md:pl-4 pt-4 md:pt-0' : ''}`}>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block whitespace-nowrap">Tổng chi phí dịch vụ</span>
              <span className="text-base font-black text-[#00285E]">{formatPrice(getOrderTotal())}</span>
              <span className="text-[9.5px] text-slate-450 block font-normal whitespace-nowrap">Chưa trừ tiền đặt cọc</span>
            </div>

            <div className="flex-1 min-w-0 space-y-1 text-sm font-semibold border-t md:border-t-0 md:border-l border-slate-200 md:pl-4 pt-4 md:pt-0 text-left">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block whitespace-nowrap">Trạng thái thanh toán</span>
              <div className="flex items-center gap-2 mt-1">
                {order.payment?.payment_status === 'PAID' || order.payment?.payment_status === 'COMPLETED' ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 whitespace-nowrap">
                    Đã thanh toán
                  </span>
                ) : order.payment?.payment_status === 'DEPOSITED' ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 whitespace-nowrap">
                    Đã cọc
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

      {/* EARLY CLOSURE MODAL */}
      {showCloseEarlyModal && (() => {
        const allItems: any[] = order.quotation?.items || [];
        const tasks: any[] = order.tasks || [];

        const depositBadge = (item: any) => {
          if (!item.customPartOrder) return null;
          if (item.customPartOrder.status === 'WAITING_DEPOSIT') {
            return { label: 'Chưa cọc', className: 'text-amber-600 bg-amber-50' };
          }
          return { label: 'Đã cọc', className: 'text-emerald-600 bg-emerald-50' };
        };

        const payableAmount = (item: any) => {
          const amount = parseFloat(item.amount) || 0;
          const badge = depositBadge(item);
          return badge?.label === 'Đã cọc' ? amount * 0.7 : amount;
        };

        const serviceItemIds = new Set(tasks.map((t: any) => t.quotationItem?.id).filter(Boolean));
        const groups = tasks
          .filter((t: any) => t.quotationItem)
          .map((task: any) => {
            const serviceItem = task.quotationItem;
            const relatedParts = allItems.filter(
              (i: any) => i.id !== serviceItem.id && !i.service_id && i.issue_id && i.issue_id === serviceItem.issue_id,
            );
            return { task, serviceItem, relatedParts };
          });

        const looseParts = allItems.filter(
          (i: any) => !i.service_id && !groups.some((g) => g.relatedParts.some((p: any) => p.id === i.id)),
        );

        const isGroupFinished = (g: any) =>
          g.task.status?.toUpperCase() === 'COMPLETED' || ['EXPORTED', 'RECEIVED'].includes(g.serviceItem.status);
        const isPartFinished = (item: any) => ['EXPORTED', 'RECEIVED'].includes(item.status);

        const finishedGroups = groups.filter(isGroupFinished);
        const pendingGroups = groups.filter((g) => !isGroupFinished(g));
        const finishedLooseParts = looseParts.filter(isPartFinished);
        const pendingLooseParts = looseParts.filter((p: any) => !isPartFinished(p));

        const groupAmount = (g: any) =>
          (parseFloat(g.serviceItem.amount) || 0) + g.relatedParts.reduce((s: number, p: any) => s + payableAmount(p), 0);

        const finishedTotal =
          finishedGroups.reduce((sum, g) => sum + groupAmount(g), 0) +
          finishedLooseParts.reduce((sum, p: any) => sum + payableAmount(p), 0);

        const confirmedPendingTotal =
          pendingGroups
            .filter((g) => completedItemIds.has(g.serviceItem.id))
            .reduce((sum, g) => sum + groupAmount(g), 0) +
          pendingLooseParts
            .filter((p: any) => completedItemIds.has(p.id))
            .reduce((sum, p: any) => sum + payableAmount(p), 0);

        const previewTotal = finishedTotal + confirmedPendingTotal;

        const taskStatusLabel = (status: string | undefined) => {
          const s = status?.toUpperCase();
          if (s === 'IN_PROGRESS') return 'Đang thực hiện';
          if (s === 'PAUSED') return 'Đang tạm dừng';
          if (s === 'WAITING_STOCK') return 'Chờ phụ tùng';
          if (s === 'COMPLETED') return 'Đã hoàn thành';
          return 'Chưa bắt đầu';
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isClosingEarly && setShowCloseEarlyModal(false)} />
            <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl mx-4 flex flex-col max-h-[92vh] overflow-hidden">
              <div className="px-8 py-6 bg-[#00285E] shrink-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <AlertTriangle size={20} className="text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white leading-tight text-left">Đóng sớm lệnh sửa chữa</h3>
                    <p className="text-[11px] text-blue-100/70 font-semibold mt-0.5 text-left">SO-{order.id} · Khách hàng muốn dừng giữa chừng</p>
                  </div>
                  <button
                    onClick={() => !isClosingEarly && setShowCloseEarlyModal(false)}
                    className="ml-auto w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-8 py-7 space-y-8 text-left">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Hạng mục <strong>đã hoàn thành</strong> luôn được tính đủ, không thể bỏ.
                    Với hạng mục <strong>đang dở dang</strong>, hãy xác nhận trực tiếp với kỹ thuật viên phụ trách
                    hạng mục nào <strong>không thể hủy</strong> (đã lắp vào xe, đã sử dụng...) trước khi tick.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock size={13} />
                    Các hạng mục đang thực hiện — xác nhận với kỹ thuật viên
                  </h4>
                  {(pendingGroups.length > 0 || pendingLooseParts.length > 0) ? (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                      {pendingGroups.map((g) => {
                        const allIdsInGroup = [g.serviceItem.id, ...g.relatedParts.map((p: any) => p.id)];
                        const isChecked = completedItemIds.has(g.serviceItem.id);
                        const serviceLabel = g.serviceItem.service_catalog?.service_name || 'Hạng mục dịch vụ';
                        const groupTotal = groupAmount(g);
                        return (
                          <div key={g.serviceItem.id} className={`px-4 py-3 transition-colors ${isChecked ? 'bg-blue-50/60' : 'hover:bg-slate-550'}`}>
                            <label className="flex items-center gap-3 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleCompletedItem(allIdsInGroup)}
                                className="w-4 h-4 rounded accent-[#00285E] shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="font-semibold text-slate-805">{serviceLabel}</span>
                                <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-500 bg-slate-100 uppercase align-middle">
                                  {taskStatusLabel(g.task.status)}
                                </span>
                              </div>
                              <span className={`font-bold shrink-0 ${isChecked ? 'text-[#00285E]' : 'text-slate-300 line-through'}`}>
                                {formatPrice(groupTotal)}
                              </span>
                            </label>
                            {g.relatedParts.length > 0 && (
                              <div className="mt-2 ml-7 space-y-1.5 border-l-2 border-slate-200 pl-3">
                                {g.relatedParts.map((p: any) => {
                                  const badge = depositBadge(p);
                                  return (
                                    <div key={p.id} className="flex items-center gap-2 text-xs text-slate-500">
                                      <Package size={12} className="text-slate-400 shrink-0" />
                                      <span className="flex-1 min-w-0 truncate">{p.customPartOrder?.item_name || p.sparePart?.name || 'Phụ tùng'} (x{p.quantity})</span>
                                      {badge && (
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${badge.className}`}>
                                          {badge.label}
                                        </span>
                                      )}
                                      <span className={`font-semibold shrink-0 ${isChecked ? 'text-slate-700' : 'text-slate-300 line-through'}`}>
                                        {formatPrice(payableAmount(p))}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {pendingLooseParts.map((p: any) => {
                        const isChecked = completedItemIds.has(p.id);
                        const badge = depositBadge(p);
                        return (
                          <label
                            key={p.id}
                            className={`flex items-center gap-3 px-4 py-3 text-sm cursor-pointer transition-colors ${isChecked ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleCompletedItem(p.id)}
                              className="w-4 h-4 rounded accent-[#00285E] shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-slate-805">{p.customPartOrder?.item_name || p.sparePart?.name || 'Phụ tùng'}</span>
                              <span className={`ml-2 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase align-middle ${badge ? badge.className : 'text-slate-500 bg-slate-100'}`}>
                                {badge ? badge.label : 'Chưa xuất kho'}
                              </span>
                            </div>
                            <span className={`font-bold shrink-0 ${isChecked ? 'text-[#00285E]' : 'text-slate-300 line-through'}`}>
                              {formatPrice(payableAmount(p))}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic px-1">Không còn hạng mục nào đang dở dang.</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Lý do đóng sớm <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={closeEarlyReason}
                    onChange={(e) => setCloseEarlyReason(e.target.value)}
                    placeholder="Lý do khách hàng muốn dừng..."
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#00285E]/40 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="px-8 py-5 border-t border-slate-105 bg-slate-50 shrink-0 space-y-3 text-left">
                <div className="flex flex-col px-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng tiền còn lại phải thanh toán</span>
                  <span className="text-2xl font-black text-[#00285E] mt-1">
                    {previewTotal.toLocaleString('vi-VN')} <span className="text-base font-bold">VND</span>
                  </span>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowCloseEarlyModal(false)}
                    disabled={isClosingEarly}
                    className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleConfirmCloseEarly}
                    disabled={isClosingEarly}
                    className="px-5 py-2.5 bg-[#00285E] hover:bg-[#00285E]/90 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-60 flex items-center gap-2 shadow-md"
                  >
                    {isClosingEarly && <Loader2 size={14} className="animate-spin" />}
                    Xác nhận đóng đơn
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* QR PAYMENT MODAL */}
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
                  <p className="text-slate-505 text-sm mb-8">Vui lòng chọn hình thức thanh toán cho hóa đơn SO-{order.id}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button
                      onClick={() => handleSelectPaymentMethod('CASH')}
                      className="flex flex-col items-center justify-center p-8 bg-slate-50 hover:bg-emerald-50 border-2 border-slate-200 hover:border-emerald-400 rounded-3xl transition-all group"
                    >
                      <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Banknote size={32} />
                      </div>
                      <h4 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-emerald-700">Tiền mặt</h4>
                      <p className="text-sm text-slate-500 font-medium">Khách hàng thanh toán bằng tiền mặt trực tiếp</p>
                    </button>

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
                    className="w-full py-4 bg-[#00285E] hover:bg-[#00285E]/90 text-white rounded-xl text-lg font-bold transition-colors shadow-lg"
                  >
                    Xác nhận ĐÃ THU ĐỦ TIỀN MẶT
                  </button>
                </div>
              )}

              {paymentMethod === 'ONLINE' && (
                <div className="max-w-5xl w-full rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row relative border border-white/20 my-8">
                  <button
                    onClick={() => setPaymentMethod('NONE')}
                    className="absolute top-4 left-4 z-30 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-605 backdrop-blur-md transition-colors shadow-lg"
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
                          <span className="font-bold text-slate-805">{customerName} ({customerPhone})</span>
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
                              {order.quotation.items.filter((item: any) => parseFloat(item.repair_price) > 0 && item.status !== 'CANCELLED').map((item: any, idx: number) => (
                                <div key={`q-srv-${idx}`} className="flex justify-between items-center text-slate-700">
                                  <span>• {item.service_catalog?.service_name || 'Dịch vụ'} (Công thợ)</span>
                                  <span className="font-bold">{formatPrice(parseFloat(item.repair_price) || 0)}</span>
                                </div>
                              ))}
                              {order.quotation.items.filter((item: any) => parseFloat(item.unit_price) > 0 && item.status !== 'CANCELLED').map((item: any, idx: number) => (
                                <div key={`q-part-${idx}`} className="flex justify-between items-center text-slate-500 pl-2">
                                  <span>• Phụ tùng: {item.customPartOrder?.item_name || item.sparePart?.name || 'Vật tư'} (x{item.quantity})</span>
                                  <span className="font-bold">{formatPrice((parseFloat(item.unit_price) || 0) * (item.quantity || 1))}</span>
                                </div>
                              ))}
                            </>
                          ) : (!order.tasks || order.tasks.length === 0) ? (
                            <p className="text-slate-450 italic">Công dịch vụ sửa chữa tổng hợp</p>
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
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-650 px-1">
                          <span>Đã đặt cọc (30%):</span>
                          <span className="text-amber-600">-{formatPrice(parseFloat(order.payment.amount) || 0)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between p-4 bg-[#EDF3FF] rounded-2xl border border-blue-105">
                        <span className="font-bold text-[#00285E] text-sm">
                          {order.payment?.payment_status === 'DEPOSITED' ? 'Còn lại cần thanh toán' : 'Tổng thanh toán'}
                        </span>
                        <span className="text-2xl font-black text-rose-600">
                          {formatPrice(finalAmountToPay)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT SIDE: Payment QR Details */}
                  <div className="flex-1 p-8 md:p-10 relative overflow-hidden flex flex-col justify-center min-h-[480px] bg-slate-955/90 backdrop-blur-2xl text-center">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl z-0" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full translate-y-1/3 -translate-x-1/3 blur-3xl z-0" />

                    <div className="relative z-10 text-center space-y-6 flex flex-col items-center">
                      <div>
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-4 shadow-xl text-amber-500">
                          <Banknote size={28} />
                        </div>
                        <h3 className="text-2xl font-extrabold text-white mb-2">Thanh toán đơn hàng</h3>
                        <p className="text-blue-100/80 text-xs leading-relaxed max-w-xs mx-auto font-light">
                          Quét mã QR bằng ứng dụng ngân hàng hoặc ví điện tử bất kỳ để thanh toán.
                        </p>
                      </div>

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

                      <div className="pt-1 w-full max-w-xs text-center space-y-2">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-[#F9A11B] border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-[11px] text-blue-100/70 leading-relaxed max-w-[250px] mx-auto">
                            Hệ thống đang tự động chờ xác nhận thanh toán...
                          </p>
                        </div>

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
            <div className="max-w-3xl w-full bg-white rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row relative overflow-hidden my-8 border border-slate-200">
              <div className="bg-emerald-500 md:w-1/3 p-8 flex flex-col items-center justify-center relative overflow-hidden text-center min-h-[280px]">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl mb-4 relative z-10">
                  <Check className="w-8 h-8 text-emerald-500" strokeWidth={3.5} />
                </div>
                <h3 className="text-2xl font-black text-white mb-1 relative z-10">Thành Công!</h3>
                <p className="text-emerald-55 text-xs leading-relaxed relative z-10 font-medium">Đã xác nhận thanh toán</p>
              </div>

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
