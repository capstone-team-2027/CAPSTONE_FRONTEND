import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Car,
  PackagePlus,
  Wrench,
  Plus,
  Trash2,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Calculator,
  MessageSquare,
  Search,
  Package,
  Clock,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

// ========== AVAILABLE SERVICES & PARTS FOR SELECTION ==========
const AVAILABLE_SERVICES = [
  { id: 'SV-ADD-01', name: 'Kiểm tra hệ thống điện', price: 300000, category: 'Điện' },
  { id: 'SV-ADD-02', name: 'Sửa chữa hệ thống điều hòa', price: 1500000, category: 'Điều hòa' },
  { id: 'SV-ADD-03', name: 'Thay lọc gió cabin', price: 250000, category: 'Bảo dưỡng' },
  { id: 'SV-ADD-04', name: 'Cân bằng động bánh xe', price: 400000, category: 'Sửa chữa gầm' },
  { id: 'SV-ADD-05', name: 'Vệ sinh buồng đốt', price: 800000, category: 'Động cơ' },
  { id: 'SV-ADD-06', name: 'Thay đĩa phanh sau', price: 900000, category: 'Phanh' },
];

const AVAILABLE_PARTS = [
  { id: 'PT-001', name: 'Lọc dầu động cơ Toyota', unitPrice: 180000, unit: 'cái' },
  { id: 'PT-002', name: 'Bugi NGK Iridium', unitPrice: 350000, unit: 'cái' },
  { id: 'PT-003', name: 'Dầu động cơ Castrol Edge 5W-30 (4L)', unitPrice: 950000, unit: 'thùng' },
  { id: 'PT-004', name: 'Má phanh trước Brembo', unitPrice: 1200000, unit: 'bộ' },
  { id: 'PT-005', name: 'Lọc gió động cơ K&N', unitPrice: 450000, unit: 'cái' },
  { id: 'PT-006', name: 'Đĩa phanh sau TRW', unitPrice: 800000, unit: 'cái' },
  { id: 'PT-007', name: 'Dây curoa đa rãnh Gates', unitPrice: 650000, unit: 'sợi' },
  { id: 'PT-008', name: 'Nước làm mát Prestone (4L)', unitPrice: 280000, unit: 'thùng' },
];

// Mock vehicle/repair order info
const MOCK_VEHICLE = {
  repairOrderId: 'RO-001',
  orderId: 'SO-001',
  vehiclePlate: '51A-123.45',
  vehicleModel: 'Toyota Camry 2.5Q',
  vehicleColor: 'Trắng',
  customerName: 'Nguyễn Văn An',
};

interface SelectedService {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface SelectedPart {
  id: string;
  name: string;
  unitPrice: number;
  unit: string;
  quantity: number;
}

export default function TechnicianRequestParts() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
  const [techNotes, setTechNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Search for adding services/parts
  const [serviceSearch, setServiceSearch] = useState('');
  const [partSearch, setPartSearch] = useState('');

  const filteredServices = useMemo(() => {
    return AVAILABLE_SERVICES.filter(s =>
      !selectedServices.some(sel => sel.id === s.id) &&
      (serviceSearch === '' || s.name.toLowerCase().includes(serviceSearch.toLowerCase()))
    );
  }, [serviceSearch, selectedServices]);

  const filteredParts = useMemo(() => {
    return AVAILABLE_PARTS.filter(p =>
      !selectedParts.some(sel => sel.id === p.id) &&
      (partSearch === '' || p.name.toLowerCase().includes(partSearch.toLowerCase()))
    );
  }, [partSearch, selectedParts]);

  const addService = (service: typeof AVAILABLE_SERVICES[0]) => {
    setSelectedServices(prev => [...prev, service]);
    setErrors(prev => ({ ...prev, items: '' }));
  };

  const removeService = (serviceId: string) => {
    setSelectedServices(prev => prev.filter(s => s.id !== serviceId));
  };

  const addPart = (part: typeof AVAILABLE_PARTS[0]) => {
    setSelectedParts(prev => [...prev, { ...part, quantity: 1 }]);
    setErrors(prev => ({ ...prev, items: '' }));
  };

  const removePart = (partId: string) => {
    setSelectedParts(prev => prev.filter(p => p.id !== partId));
  };

  const updatePartQuantity = (partId: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedParts(prev => prev.map(p => p.id === partId ? { ...p, quantity } : p));
    setErrors(prev => ({ ...prev, quantity: '' }));
  };

  // Cost calculations
  const serviceCost = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const partsCost = selectedParts.reduce((sum, p) => sum + p.unitPrice * p.quantity, 0);
  const totalEstimatedCost = serviceCost + partsCost;

  const formatPrice = (price: number) => price.toLocaleString('vi-VN') + ' đ';

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (selectedServices.length === 0 && selectedParts.length === 0) {
      newErrors.items = 'Vui lòng chọn ít nhất một dịch vụ hoặc phụ tùng bổ sung.';
    }

    const invalidQty = selectedParts.find(p => p.quantity < 1);
    if (invalidQty) {
      newErrors.quantity = `Số lượng phụ tùng "${invalidQty.name}" phải lớn hơn 0.`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit
  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1200));
    setIsSubmitting(false);
    setSubmitSuccess(true);
  };

  if (submitSuccess) {
    return (
      <div className="flex-1 p-4 md:p-8 max-w-3xl w-full mx-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl border border-emerald-200 shadow-xs p-10 text-center space-y-5"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 size={40} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Gửi yêu cầu thành công!</h2>
          <p className="text-slate-500 max-w-md mx-auto">
            Yêu cầu thêm phụ tùng và dịch vụ bổ sung đã được gửi đến cố vấn dịch vụ để xin phê duyệt từ khách hàng.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 text-sm max-w-sm mx-auto space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Số dịch vụ bổ sung:</span>
              <span className="font-bold text-slate-800">{selectedServices.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Số phụ tùng yêu cầu:</span>
              <span className="font-bold text-slate-800">{selectedParts.length}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <span className="text-slate-500 font-semibold">Tổng dự toán:</span>
              <span className="font-bold text-[#0E4D40]">{formatPrice(totalEstimatedCost)}</span>
            </div>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => navigate('/technician/service-orders')}
              className="px-6 py-3 bg-[#0E4D40] text-white rounded-xl text-sm font-bold hover:bg-[#0a3a30] transition-colors"
            >
              Quay về danh sách
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-5xl w-full mx-auto">
      {/* BACK + HEADER */}
      <div className="flex flex-col gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#0E4D40] transition-colors self-start"
        >
          <ArrowLeft size={16} />
          Quay lại
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#0E4D40] tracking-tight leading-none mb-2 flex items-center gap-2">
            <PackagePlus className="text-amber-500" size={28} />
            Yêu cầu thêm phụ tùng & dịch vụ
          </h1>
          <p className="text-slate-500 text-sm">
            Yêu cầu phụ tùng hoặc dịch vụ bổ sung trong quá trình sửa chữa.
          </p>
        </div>
      </div>

      {/* VEHICLE INFO BANNER */}
      <div className="bg-gradient-to-r from-[#E8F5F0] to-[#D5F0E8] p-5 rounded-2xl border border-[#C4E8E0]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mã lệnh sửa chữa</p>
            <p className="font-bold text-[#0E4D40]">{MOCK_VEHICLE.repairOrderId}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Biển số xe</p>
            <p className="font-semibold text-slate-700">{MOCK_VEHICLE.vehiclePlate}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dòng xe</p>
            <p className="font-semibold text-slate-700">{MOCK_VEHICLE.vehicleModel}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Khách hàng</p>
            <p className="font-semibold text-slate-700">{MOCK_VEHICLE.customerName}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ADDITIONAL SERVICES */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#E8F5F0] flex items-center justify-center">
              <Wrench size={16} className="text-[#0E4D40]" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Dịch vụ bổ sung</h3>
          </div>

          {/* Search + Add */}
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm dịch vụ để thêm..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0E4D40]/10 focus:border-[#0E4D40] transition-all"
              />
            </div>
            {serviceSearch && filteredServices.length > 0 && (
              <div className="mt-2 max-h-36 overflow-y-auto space-y-1">
                {filteredServices.map(svc => (
                  <button
                    key={svc.id}
                    onClick={() => { addService(svc); setServiceSearch(''); }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#E8F5F0] transition-colors text-left"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{svc.name}</p>
                      <p className="text-[10px] text-slate-400">{svc.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">{formatPrice(svc.price)}</span>
                      <Plus size={14} className="text-[#0E4D40]" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected services */}
          <div className="p-4 space-y-2 min-h-[100px]">
            {selectedServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                <Wrench size={24} className="mb-2 text-slate-300" />
                <p className="text-xs font-semibold">Chưa có dịch vụ bổ sung</p>
              </div>
            ) : (
              selectedServices.map(svc => (
                <div key={svc.id} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{svc.name}</p>
                    <p className="text-[10px] text-slate-400">{svc.category} — {formatPrice(svc.price)}</p>
                  </div>
                  <button
                    onClick={() => removeService(svc.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SPARE PARTS REQUEST */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Package size={16} className="text-amber-600" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Phụ tùng yêu cầu</h3>
          </div>

          {/* Search + Add */}
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm phụ tùng để thêm..."
                value={partSearch}
                onChange={(e) => setPartSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0E4D40]/10 focus:border-[#0E4D40] transition-all"
              />
            </div>
            {partSearch && filteredParts.length > 0 && (
              <div className="mt-2 max-h-36 overflow-y-auto space-y-1">
                {filteredParts.map(part => (
                  <button
                    key={part.id}
                    onClick={() => { addPart(part); setPartSearch(''); }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-amber-50 transition-colors text-left"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{part.name}</p>
                      <p className="text-[10px] text-slate-400">ĐVT: {part.unit}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">{formatPrice(part.unitPrice)}</span>
                      <Plus size={14} className="text-amber-600" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected parts with quantity */}
          <div className="p-4 space-y-2 min-h-[100px]">
            {selectedParts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                <Package size={24} className="mb-2 text-slate-300" />
                <p className="text-xs font-semibold">Chưa có phụ tùng yêu cầu</p>
              </div>
            ) : (
              selectedParts.map(part => (
                <div key={part.id} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex-1 mr-3">
                    <p className="text-xs font-semibold text-slate-700">{part.name}</p>
                    <p className="text-[10px] text-slate-400">{formatPrice(part.unitPrice)} / {part.unit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => updatePartQuantity(part.id, part.quantity - 1)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={part.quantity}
                        onChange={(e) => updatePartQuantity(part.id, parseInt(e.target.value) || 1)}
                        className="w-10 text-center text-xs font-bold border-none focus:outline-none bg-white"
                        min={1}
                      />
                      <button
                        onClick={() => updatePartQuantity(part.id, part.quantity + 1)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-xs font-bold text-slate-700 w-24 text-right">{formatPrice(part.unitPrice * part.quantity)}</span>
                    <button
                      onClick={() => removePart(part.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* COST ESTIMATION */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#E8F5F0] flex items-center justify-center">
            <Calculator size={16} className="text-[#0E4D40]" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Dự toán chi phí</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Chi phí dịch vụ</p>
            <p className="text-lg font-bold text-slate-800">{formatPrice(serviceCost)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{selectedServices.length} dịch vụ</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Chi phí phụ tùng</p>
            <p className="text-lg font-bold text-slate-800">{formatPrice(partsCost)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{selectedParts.length} phụ tùng</p>
          </div>
          <div className="bg-[#E8F5F0] rounded-xl p-4 text-center border border-[#C4E8E0]">
            <p className="text-[10px] font-bold text-[#0E4D40] uppercase tracking-widest mb-1">Tổng dự toán</p>
            <p className="text-xl font-bold text-[#0E4D40]">{formatPrice(totalEstimatedCost)}</p>
          </div>
        </div>
      </div>

      {/* TECHNICIAN NOTES */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <MessageSquare size={16} className="text-amber-600" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Ghi chú kỹ thuật viên</h3>
        </div>
        <textarea
          value={techNotes}
          onChange={(e) => setTechNotes(e.target.value)}
          placeholder="Mô tả lý do cần thêm phụ tùng hoặc dịch vụ bổ sung..."
          rows={4}
          className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E4D40]/10 focus:border-[#0E4D40] transition-all resize-none"
        />
      </div>

      {/* ERRORS */}
      {Object.values(errors).some(e => e) && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-rose-500 mt-0.5 shrink-0" />
          <div className="space-y-1">
            {Object.values(errors).filter(e => e).map((err, i) => (
              <p key={i} className="text-sm text-rose-600 font-semibold">{err}</p>
            ))}
          </div>
        </div>
      )}

      {/* REQUEST STATUS */}
      <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3 border border-slate-200">
        <Clock size={16} className="text-slate-400" />
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái yêu cầu</p>
          <p className="text-sm font-semibold text-slate-700">Chưa gửi — Đang soạn yêu cầu</p>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex-1 px-6 py-3.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
        >
          Hủy
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-[#0E4D40] hover:bg-[#0a3a30] text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          {isSubmitting ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu'}
        </button>
      </div>
    </div>
  );
}
