import { useState } from 'react';
import {
  CreditCard,
  Printer,
  CheckCircle,
  FileText,
  DollarSign,
  Loader2,
  Coins,
  QrCode,
  Building,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { PaymentModel, PaymentMethod } from '../../../model/Payment';
import { PAYMENT_METHOD_LABELS } from '../../../model/Payment';

// Mock Pending Invoices/Service Orders
const mockPendingServiceOrders = [
  {
    id: 'SO-001',
    appointmentId: 'APP-001',
    customerId: 'CUST-001',
    customerName: 'Nguyễn Văn An',
    customerPhone: '0901234567',
    vehiclePlate: '51A-123.45',
    vehicleModel: 'Toyota Camry 2020',
    items: [
      { name: 'Bảo dưỡng định kỳ cấp 1', type: 'service' as const, quantity: 1, unit: 'Lượt', unitPrice: 500000, total: 500000 },
      { name: 'Dầu Castrol Magnatec 5W-30', type: 'part' as const, quantity: 4, unit: 'Lít', unitPrice: 162500, total: 650000 },
      { name: 'Lọc gió điều hòa', type: 'part' as const, quantity: 1, unit: 'Cái', unitPrice: 200000, total: 200000 },
    ],
  },
  {
    id: 'SO-003',
    appointmentId: 'APP-003',
    customerId: 'CUST-003',
    customerName: 'Lê Hoàng Long',
    customerPhone: '0912345678',
    vehiclePlate: '51F-987.65',
    vehicleModel: 'Honda CR-V 2018',
    items: [
      { name: 'Cân chỉnh thước lái 3D', type: 'service' as const, quantity: 1, unit: 'Lượt', unitPrice: 600000, total: 600000 },
      { name: 'Vệ sinh kim phun điện tử', type: 'service' as const, quantity: 1, unit: 'Lượt', unitPrice: 1200000, total: 1200000 },
    ],
  },
];

export default function ReceptionProcessPayment() {
  const [pendingOrders, setPendingOrders] = useState(mockPendingServiceOrders);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentModel | null>(null);

  // Active Selected Order
  const activeOrder = pendingOrders.find((order) => order.id === selectedOrderId);

  // Math totals
  const subtotal = activeOrder ? activeOrder.items.reduce((sum, item) => sum + item.total, 0) : 0;
  const vat = Math.round(subtotal * 0.1);
  const totalAmount = subtotal + vat;

  const handleProcessPayment = () => {
    if (!activeOrder) return;
    setIsProcessing(true);

    setTimeout(() => {
      const successfulPayment: PaymentModel = {
        id: `PAY-${String(Date.now()).slice(-4)}`,
        invoiceId: `INV-${String(Date.now()).slice(-4)}`,
        serviceOrderId: activeOrder.id,
        customerId: activeOrder.customerId,
        customerName: activeOrder.customerName,
        items: activeOrder.items,
        subtotal,
        vat,
        totalAmount,
        paymentMethod,
        paymentDate: new Date().toISOString(),
        status: 'completed',
        processedBy: 'Trần Thị Tiếp Tân',
      };

      setPaymentSuccess(successfulPayment);
      // Remove from pending list
      setPendingOrders(pendingOrders.filter((o) => o.id !== activeOrder.id));
      setIsProcessing(false);
    }, 1500);
  };

  const resetState = () => {
    setSelectedOrderId('');
    setPaymentSuccess(null);
    setPaymentMethod('cash');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#00285E] tracking-tight">Thanh toán Dịch vụ</h1>
        <p className="text-slate-500 text-sm font-medium mt-1">
          Lập hóa đơn và xử lý giao dịch thanh toán cho các hóa đơn dịch vụ đã hoàn thành.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {paymentSuccess ? (
          // Success Invoice State
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 space-y-6 relative overflow-hidden"
          >
            {/* Success Confetti Bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-500"></div>

            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 mx-auto flex items-center justify-center border border-emerald-200">
                <CheckCircle size={32} />
              </div>
              <h2 className="text-xl font-extrabold text-slate-800">Thanh toán thành công!</h2>
              <p className="text-xs text-slate-400 font-semibold">Mã hóa đơn: {paymentSuccess.invoiceId}</p>
            </div>

            {/* Receipt Details */}
            <div className="border-t border-b border-slate-100 py-4 space-y-3 text-sm font-semibold text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Khách hàng</span>
                <span className="text-slate-800">{paymentSuccess.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hóa đơn dịch vụ</span>
                <span className="text-slate-800">{paymentSuccess.serviceOrderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phương thức</span>
                <span className="text-slate-800">{PAYMENT_METHOD_LABELS[paymentSuccess.paymentMethod]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Thời gian</span>
                <span className="text-slate-850">
                  {paymentSuccess.paymentDate ? new Date(paymentSuccess.paymentDate).toLocaleString('vi-VN') : ''}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-dashed border-slate-200">
                <span className="text-slate-700 font-bold text-base">Tổng tiền</span>
                <span className="text-xl font-black text-[#00285E]">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(paymentSuccess.totalAmount)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => alert('Đang gửi lệnh in hóa đơn tới máy in nhiệt...')}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold transition-all text-sm"
              >
                <Printer size={16} />
                <span>In hóa đơn</span>
              </button>
              <button
                onClick={resetState}
                className="flex-1 py-3 rounded-xl bg-[#00285E] text-white hover:bg-[#00285E]/90 font-bold transition-all text-sm shadow-md"
              >
                Tiếp tục thanh toán
              </button>
            </div>
          </motion.div>
        ) : (
          // Main Payment Processing Screen
          <motion.div
            key="payment-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Left side: Invoice Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Select Service Order */}
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Chọn hóa đơn dịch vụ cần thanh toán <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pendingOrders.length === 0 ? (
                    <div className="sm:col-span-2 text-center py-6 text-slate-400 font-bold text-sm">
                      Không còn hóa đơn dịch vụ nào chờ thanh toán!
                    </div>
                  ) : (
                    pendingOrders.map((order) => (
                      <button
                        key={order.id}
                        onClick={() => setSelectedOrderId(order.id)}
                        className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col gap-2 ${
                          selectedOrderId === order.id
                            ? 'border-[#00285E] bg-[#E0ECFF]/20 shadow-sm'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="text-sm font-extrabold text-[#00285E]">{order.id}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            {order.vehiclePlate}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-extrabold text-slate-800">{order.customerName}</span>
                          <span className="text-[11px] text-slate-500 font-semibold">{order.customerPhone}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Items Detail Table */}
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
                      <span className="text-xs font-bold text-slate-400">Mã đơn: {activeOrder.id}</span>
                    </div>

                    {/* Table */}
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
                          {activeOrder.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
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
                              <td className="px-6 py-4 text-center">
                                {item.quantity} {item.unit}
                              </td>
                              <td className="px-6 py-4 text-right">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                                  item.unitPrice
                                )}
                              </td>
                              <td className="px-6 py-4 text-right text-slate-900 font-bold">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                                  item.total
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-bold text-sm">
                    Vui lòng chọn hóa đơn dịch vụ phía trên để lập chi tiết hóa đơn thanh toán.
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Right side: Payment processing details */}
            <div className="space-y-6">
              {/* Payment Summary */}
              {activeOrder && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-6"
                >
                  <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-3">Tóm tắt thanh toán</h3>

                  {/* Calculations */}
                  <div className="space-y-3.5 text-sm font-semibold text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tạm tính</span>
                      <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Thuế VAT (10%)</span>
                      <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(vat)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-dashed border-slate-200">
                      <span className="text-slate-800 font-bold">Tổng cộng</span>
                      <span className="text-xl font-black text-[#00285E]">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Select Payment Method */}
                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Phương thức thanh toán <span className="text-rose-500">*</span>
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash')}
                        className={`p-3 rounded-xl border flex flex-col gap-1 items-center justify-center transition-all ${
                          paymentMethod === 'cash'
                            ? 'border-[#00285E] bg-[#E0ECFF]/20 text-[#00285E] shadow-xs'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Coins size={18} />
                        <span className="text-xs font-bold">Tiền mặt</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`p-3 rounded-xl border flex flex-col gap-1 items-center justify-center transition-all ${
                          paymentMethod === 'card'
                            ? 'border-[#00285E] bg-[#E0ECFF]/20 text-[#00285E] shadow-xs'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <CreditCard size={18} />
                        <span className="text-xs font-bold">Thẻ quẹt</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('transfer')}
                        className={`p-3 rounded-xl border flex flex-col gap-1 items-center justify-center transition-all ${
                          paymentMethod === 'transfer'
                            ? 'border-[#00285E] bg-[#E0ECFF]/20 text-[#00285E] shadow-xs'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Building size={18} />
                        <span className="text-xs font-bold">Chuyển khoản</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('ewallet')}
                        className={`p-3 rounded-xl border flex flex-col gap-1 items-center justify-center transition-all ${
                          paymentMethod === 'ewallet'
                            ? 'border-[#00285E] bg-[#E0ECFF]/20 text-[#00285E] shadow-xs'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <QrCode size={18} />
                        <span className="text-xs font-bold">Ví điện tử</span>
                      </button>
                    </div>
                  </div>

                  {/* Processing Actions */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                    <button
                      onClick={handleProcessPayment}
                      disabled={isProcessing}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#00285E] text-white hover:bg-[#00285E]/90 font-bold transition-all text-sm shadow-md"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          <span>Đang giao dịch...</span>
                        </>
                      ) : (
                        <>
                          <DollarSign size={16} />
                          <span>Xác nhận thanh toán</span>
                        </>
                      )}
                    </button>
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
