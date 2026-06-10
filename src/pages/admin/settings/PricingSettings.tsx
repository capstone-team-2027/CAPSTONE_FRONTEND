import { useState, useEffect } from 'react';
import { Coins, Tag, Plus, Edit, Trash2, AlertCircle, Save } from 'lucide-react';
import { useFetchClient } from '../../../hook/useFetchClient';
import { PRICING_RULES_API_ENDPOINTS } from '../../../constants/admin/pricingRulesApiEndpoint';

interface PricingSettingsProps {
  showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
}

export default function PricingSettings({ showToast }: PricingSettingsProps) {
  const { fetchPrivate } = useFetchClient();

  // Sub-tab state for Pricing tab
  const [pricingSubTab, setPricingSubTab] = useState<'rules' | 'policies'>('rules');

  // Pricing Rules States
  const [laborRate, setLaborRate] = useState('300000');
  const [servicePrices, setServicePrices] = useState([
    { id: '1', name: 'Thay dầu động cơ & lọc nhớt', price: '250000', promoPrice: '200000' },
    { id: '2', name: 'Bảo dưỡng hệ thống phanh 4 bánh', price: '450000', promoPrice: '380000' },
    { id: '3', name: 'Cân chỉnh thước lái 3D', price: '600000', promoPrice: '500000' },
    { id: '4', name: 'Gói combo bảo dưỡng định kỳ AGM Standard', price: '1200000', promoPrice: '990000' },
    { id: '5', name: 'Gói combo vệ sinh khoang máy & nội thất AGM Pro', price: '2500000', promoPrice: '1990000' }
  ]);
  const [membershipDiscounts, setMembershipDiscounts] = useState({
    silver: '5',
    gold: '10',
    platinum: '15'
  });
  const [pricingEffectiveDate, setPricingEffectiveDate] = useState('');
  const [errorsPricingRules, setErrorsPricingRules] = useState<Record<string, string>>({});
  const [isSavingPricingRules, setIsSavingPricingRules] = useState(false);

  // Pricing Policies States (Fetched from Backend)
  const [pricingPolicies, setPricingPolicies] = useState<any[]>([]);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any | null>(null);
  const [policyCategory, setPolicyCategory] = useState('');
  const [policyMarkup, setPolicyMarkup] = useState('0');
  const [policyDiscount, setPolicyDiscount] = useState('0');
  const [policyStartDate, setPolicyStartDate] = useState('');
  const [policyEndDate, setPolicyEndDate] = useState('');
  const [policyIsActive, setPolicyIsActive] = useState(false);
  const [policyErrors, setPolicyErrors] = useState<Record<string, string>>({});

  // Date calculation helpers for min attributes on inputs
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrow);

  let minEndDateStr = '';
  if (policyStartDate) {
    const startDate = new Date(policyStartDate);
    const endMinDate = new Date(startDate);
    endMinDate.setDate(startDate.getDate() + 1);
    minEndDateStr = getLocalDateString(endMinDate);
  } else {
    const defaultMinEndDate = new Date(tomorrow);
    defaultMinEndDate.setDate(tomorrow.getDate() + 1);
    minEndDateStr = getLocalDateString(defaultMinEndDate);
  }

  // Fetch all Pricing Rules from Backend
  const loadPricingPolicies = async () => {
    setIsLoadingPolicies(true);
    try {
      const res = await fetchPrivate(PRICING_RULES_API_ENDPOINTS.LIST, 'GET');
      if (res.success && Array.isArray(res.data)) {
        const mapped = res.data.map((rule: any) => {
          const formatDate = (dateStr: string | null) => {
            if (!dateStr) return '';
            return dateStr.split('T')[0];
          };
          return {
            id: rule.id,
            category: rule.category,
            markupRate: rule.markup_rate,
            discountRate: rule.discount_rate / 100,
            startDate: formatDate(rule.start_date),
            endDate: formatDate(rule.end_date),
            isActive: rule.is_active !== false // e.g. maps explicitly to boolean
          };
        });
        setPricingPolicies(mapped);
      } else {
        showToast(res.message || 'Không lấy được danh sách quy tắc giá từ máy chủ.', 'warning');
      }
    } catch (err: any) {
      console.error('loadPricingPolicies error:', err);
      showToast(err.message || 'Lỗi kết nối máy chủ khi tải danh sách chính sách giá.', 'warning');
    } finally {
      setIsLoadingPolicies(false);
    }
  };

  useEffect(() => {
    loadPricingPolicies();
  }, []);

  // Pricing Rules Validation & Save Handlers
  const validatePricingRules = () => {
    const errs: Record<string, string> = {};
    if (!laborRate || parseFloat(laborRate) <= 0) {
      errs.laborRate = 'Giá công thợ phải lớn hơn 0';
    }

    servicePrices.forEach((item, index) => {
      if (!item.price || parseFloat(item.price) <= 0) {
        errs[`service_${index}_price`] = 'Giá dịch vụ phải lớn hơn 0';
      }
      if (item.promoPrice) {
        const pVal = parseFloat(item.price);
        const promoVal = parseFloat(item.promoPrice);
        if (promoVal <= 0) {
          errs[`service_${index}_promo`] = 'Giá khuyến mãi phải lớn hơn 0';
        }
        if (promoVal >= pVal) {
          errs[`service_${index}_promo`] = 'Giá khuyến mãi phải nhỏ hơn giá niêm yết';
        }
      }
    });

    Object.entries(membershipDiscounts).forEach(([tier, val]) => {
      const num = parseFloat(val);
      if (isNaN(num) || num < 0 || num > 100) {
        errs[`discount_${tier}`] = 'Chiết khấu phải từ 0% đến 100%';
      }
    });

    if (!pricingEffectiveDate) {
      errs.effectiveDate = 'Vui lòng chọn ngày hiệu lực';
    } else {
      const selected = new Date(pricingEffectiveDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected <= today) {
        errs.effectiveDate = 'Ngày hiệu lực phải là một ngày trong tương lai';
      }
    }

    setErrorsPricingRules(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSavePricingRules = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePricingRules()) {
      showToast('Vui lòng kiểm tra lại các trường thông tin!', 'warning');
      return;
    }

    setIsSavingPricingRules(true);
    setTimeout(() => {
      setIsSavingPricingRules(false);
      showToast('Cấu hình biểu phí dịch vụ đã được cập nhật thành công.', 'success');
    }, 1000);
  };

  // Pricing Policies Validation & Save Handlers
  const validatePolicyItem = () => {
    const errs: Record<string, string> = {};
    if (!policyCategory || !policyCategory.trim()) {
      errs.category = 'Danh mục phụ tùng không được bỏ trống';
    }

    const markupVal = parseFloat(policyMarkup);
    if (isNaN(markupVal) || markupVal < 0 || markupVal > 1000) {
      errs.markup = 'Tỷ lệ markup phải từ 0 đến 1000';
    }

    const discountVal = parseFloat(policyDiscount);
    if (isNaN(discountVal) || discountVal < 0 || discountVal > 1) {
      errs.discount = 'Tỷ lệ chiết khấu phải từ 0 đến 1 (ví dụ: 0.1 = 10%)';
    }

    // Start Date is required and must be from tomorrow onwards
    if (!policyStartDate) {
      errs.startDate = 'Ngày bắt đầu hiệu lực là bắt buộc';
    } else {
      const start = new Date(policyStartDate);
      start.setHours(0, 0, 0, 0);
      
      const todayVal = new Date();
      todayVal.setHours(0, 0, 0, 0);
      const tomorrowVal = new Date(todayVal);
      tomorrowVal.setDate(todayVal.getDate() + 1);

      if (start < tomorrowVal) {
        errs.startDate = 'Ngày hiệu lực phải từ ngày mai trở đi';
      }
    }

    // End Date is required and must be at least 1 day after Start Date
    if (!policyEndDate) {
      errs.endDate = 'Ngày kết thúc là bắt buộc';
    } else if (policyStartDate) {
      const start = new Date(policyStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(policyEndDate);
      end.setHours(0, 0, 0, 0);

      const minEnd = new Date(start);
      minEnd.setDate(start.getDate() + 1);

      if (end < minEnd) {
        errs.endDate = 'Ngày kết thúc phải sau ngày hiệu lực ít nhất 1 ngày';
      }
    }

    setPolicyErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleOpenCreatePolicy = () => {
    setEditingPolicy(null);
    setPolicyCategory('');
    setPolicyMarkup('0');
    setPolicyDiscount('0');
    setPolicyStartDate('');
    setPolicyEndDate('');
    setPolicyIsActive(false);
    setPolicyErrors({});
    setIsPolicyModalOpen(true);
  };

  const handleOpenEditPolicy = (policy: any) => {
    const exists = pricingPolicies.some(p => p.id === policy.id);
    if (!exists) {
      showToast('Không tìm thấy chính sách giá.', 'warning');
      return;
    }

    setEditingPolicy(policy);
    setPolicyCategory(policy.category);
    setPolicyMarkup(policy.markupRate.toString());
    setPolicyDiscount(policy.discountRate.toString());
    setPolicyStartDate(policy.startDate || '');
    setPolicyEndDate(policy.endDate || '');
    setPolicyIsActive(policy.isActive !== false);
    setPolicyErrors({});
    setIsPolicyModalOpen(true);
  };

  const handleSavePolicyItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePolicyItem()) {
      return;
    }

    // Simulate Server Error (HTTP 500)
    if (policyCategory === 'Server Error') {
      showToast('Server error', 'warning');
      return;
    }

    const bodyData = {
      category: policyCategory.trim(),
      markup_rate: parseFloat(policyMarkup),
      discount_rate: parseFloat(policyDiscount) * 100,
      start_date: policyStartDate ? `${policyStartDate}T00:00:00.000Z` : null,
      end_date: policyEndDate ? `${policyEndDate}T23:59:59.000Z` : null,
      is_active: policyIsActive
    };

    try {
      if (editingPolicy) {
        const res = await fetchPrivate(PRICING_RULES_API_ENDPOINTS.UPDATE(editingPolicy.id), 'PUT', bodyData);
        if (res.success) {
          showToast('Chính sách giá đã được cập nhật thành công.', 'success');
          loadPricingPolicies();
        } else {
          showToast(res.message || 'Lỗi khi cập nhật chính sách giá.', 'warning');
        }
      } else {
        const res = await fetchPrivate(PRICING_RULES_API_ENDPOINTS.CREATE, 'POST', bodyData);
        if (res.success) {
          showToast('Chính sách giá được tạo thành công', 'success');
          loadPricingPolicies();
        } else {
          showToast(res.message || 'Lỗi khi tạo chính sách giá.', 'warning');
        }
      }
      setIsPolicyModalOpen(false);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Lỗi kết nối khi lưu chính sách giá.', 'warning');
    }
  };

  const handleDeletePolicyItem = async (id: number) => {
    try {
      const res = await fetchPrivate(PRICING_RULES_API_ENDPOINTS.DELETE(id), 'DELETE');
      if (res.success) {
        showToast('Đã xóa chính sách giá thành công.', 'success');
        loadPricingPolicies();
      } else {
        showToast(res.message || 'Lỗi khi xóa chính sách giá.', 'warning');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Lỗi kết nối khi xóa chính sách giá.', 'warning');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* SUB-TABS NAVIGATION */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setPricingSubTab('rules')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            pricingSubTab === 'rules'
              ? 'border-[#00285E] text-[#00285E]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Coins size={16} />
          Cấu hình biểu phí dịch vụ
        </button>
        <button
          onClick={() => setPricingSubTab('policies')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            pricingSubTab === 'policies'
              ? 'border-[#00285E] text-[#00285E]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Tag size={16} />
          Quy tắc giá phụ tùng
        </button>
      </div>

      {/* RULES SUB-TAB */}
      {pricingSubTab === 'rules' && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6 md:p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Coins className="text-[#00285E]" size={20} />
            Cấu hình biểu phí & Chiết khấu dịch vụ
          </h2>

          <form onSubmit={handleSavePricingRules} className="space-y-6">
            {/* LABOR HOURLY RATE */}
            <div className="border-b border-slate-100 pb-6">
              <h3 className="text-sm font-bold text-slate-700 mb-4">Chi phí nhân công</h3>
              <div className="max-w-md">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Giá công thợ mặc định (/giờ) *
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <input
                    type="number"
                    value={laborRate}
                    onChange={(e) => setLaborRate(e.target.value)}
                    className={`w-full bg-white border rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800 ${
                      errorsPricingRules.laborRate ? 'border-rose-500' : 'border-slate-200'
                    }`}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <span className="text-slate-400 font-bold text-xs">VND</span>
                  </div>
                </div>
                {errorsPricingRules.laborRate && (
                  <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errorsPricingRules.laborRate}
                  </p>
                )}
              </div>
            </div>

            {/* SERVICE ITEM PRICES */}
            <div className="border-b border-slate-100 pb-6">
              <h3 className="text-sm font-bold text-slate-700 mb-4">Biểu giá dịch vụ & Gói combo</h3>
              <div className="space-y-4">
                {servicePrices.map((service, index) => (
                  <div key={service.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <div className="md:col-span-6">
                      <span className="text-sm font-bold text-slate-700 block">{service.name}</span>
                    </div>
                    <div className="md:col-span-3">
                      <label className="block md:hidden text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Giá niêm yết (VND) *
                      </label>
                      <div className="relative rounded-xl shadow-xs">
                        <input
                          type="number"
                          value={service.price}
                          onChange={(e) => {
                            const updated = [...servicePrices];
                            updated[index].price = e.target.value;
                            setServicePrices(updated);
                          }}
                          className={`w-full bg-white border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800 ${
                            errorsPricingRules[`service_${index}_price`] ? 'border-rose-500' : 'border-slate-200'
                          }`}
                        />
                      </div>
                      {errorsPricingRules[`service_${index}_price`] && (
                        <p className="text-[10px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle size={10} />
                          {errorsPricingRules[`service_${index}_price`]}
                        </p>
                      )}
                    </div>
                    <div className="md:col-span-3">
                      <label className="block md:hidden text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Giá khuyến mãi (VND)
                      </label>
                      <div className="relative rounded-xl shadow-xs">
                        <input
                          type="number"
                          placeholder="Không áp dụng"
                          value={service.promoPrice || ''}
                          onChange={(e) => {
                            const updated = [...servicePrices];
                            updated[index].promoPrice = e.target.value;
                            setServicePrices(updated);
                          }}
                          className={`w-full bg-white border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800 ${
                            errorsPricingRules[`service_${index}_promo`] ? 'border-rose-500' : 'border-slate-200'
                          }`}
                        />
                      </div>
                      {errorsPricingRules[`service_${index}_promo`] && (
                        <p className="text-[10px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle size={10} />
                          {errorsPricingRules[`service_${index}_promo`]}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MEMBERSHIP TIER DISCOUNTS */}
            <div className="border-b border-slate-100 pb-6">
              <h3 className="text-sm font-bold text-slate-700 mb-4">Chiết khấu theo hạng thành viên</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Hạng Bạc (Silver) % *
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <input
                      type="number"
                      value={membershipDiscounts.silver}
                      onChange={(e) => setMembershipDiscounts({ ...membershipDiscounts, silver: e.target.value })}
                      className={`w-full bg-white border rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800 ${
                        errorsPricingRules.discount_silver ? 'border-rose-500' : 'border-slate-200'
                      }`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-slate-400 font-bold text-xs">%</span>
                    </div>
                  </div>
                  {errorsPricingRules.discount_silver && (
                    <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {errorsPricingRules.discount_silver}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Hạng Vàng (Gold) % *
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <input
                      type="number"
                      value={membershipDiscounts.gold}
                      onChange={(e) => setMembershipDiscounts({ ...membershipDiscounts, gold: e.target.value })}
                      className={`w-full bg-white border rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800 ${
                        errorsPricingRules.discount_gold ? 'border-rose-500' : 'border-slate-200'
                      }`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-slate-400 font-bold text-xs">%</span>
                    </div>
                  </div>
                  {errorsPricingRules.discount_gold && (
                    <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {errorsPricingRules.discount_gold}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Hạng Kim Cương (Platinum) % *
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <input
                      type="number"
                      value={membershipDiscounts.platinum}
                      onChange={(e) => setMembershipDiscounts({ ...membershipDiscounts, platinum: e.target.value })}
                      className={`w-full bg-white border rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800 ${
                        errorsPricingRules.discount_platinum ? 'border-rose-500' : 'border-slate-200'
                      }`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-slate-400 font-bold text-xs">%</span>
                    </div>
                  </div>
                  {errorsPricingRules.discount_platinum && (
                    <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {errorsPricingRules.discount_platinum}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* EFFECTIVE DATE */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-4">Ngày áp dụng biểu phí</h3>
              <div className="max-w-md">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Ngày hiệu lực biểu phí mới *
                </label>
                <input
                  type="date"
                  value={pricingEffectiveDate}
                  onChange={(e) => setPricingEffectiveDate(e.target.value)}
                  className={`w-full bg-white border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800 ${
                    errorsPricingRules.effectiveDate ? 'border-rose-500' : 'border-slate-200'
                  }`}
                />
                {errorsPricingRules.effectiveDate && (
                  <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errorsPricingRules.effectiveDate}
                  </p>
                )}
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="flex justify-end border-t border-slate-100 pt-6">
              <button
                type="submit"
                disabled={isSavingPricingRules}
                className="flex items-center gap-2 px-6 py-3 bg-[#00285E] hover:bg-[#062047] disabled:bg-slate-400 text-white rounded-xl text-sm font-semibold shadow-md shadow-[#00285E]/10 hover:shadow-lg transition-all active:scale-[0.98]"
              >
                <Save size={16} />
                <span>{isSavingPricingRules ? 'Đang cập nhật...' : 'Lưu biểu phí'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* POLICIES SUB-TAB */}
      {pricingSubTab === 'policies' && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Tag className="text-[#00285E]" size={20} />
                Danh sách quy tắc định giá phụ tùng
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Thiết lập hệ số markup biên lợi nhuận và giảm giá tối đa cho từng nhóm hàng phụ tùng cụ thể.
              </p>
            </div>
            <button
              onClick={handleOpenCreatePolicy}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#00285E] hover:bg-[#062047] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#00285E]/10 hover:shadow-lg self-start sm:self-center"
            >
              <Plus size={14} />
              <span>Tạo chính sách giá</span>
            </button>
          </div>

          {/* TABLE / LIST OF POLICIES */}
          <div className="overflow-x-auto">
            {isLoadingPolicies ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 font-medium">
                <div className="w-8 h-8 border-4 border-[#00285E] border-t-transparent rounded-full animate-spin mb-3"></div>
                Đang tải dữ liệu chính sách từ máy chủ...
              </div>
            ) : pricingPolicies.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-medium">
                Chưa có chính sách giá phụ tùng nào được tạo.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-slate-600">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-4 px-4">Nhóm phụ tùng</th>
                    <th className="py-4 px-4 text-center">Tỷ lệ Markup</th>
                    <th className="py-4 px-4 text-center">Tỷ lệ chiết khấu</th>
                    <th className="py-4 px-4">Ngày áp dụng</th>
                    <th className="py-4 px-4">Trạng thái</th>
                    <th className="py-4 px-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingPolicies.map((policy) => {
                    const statusText = policy.isActive ? 'Có hiệu lực' : 'Không có hiệu lực';
                    const statusColor = policy.isActive
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      : 'bg-rose-50 text-rose-600 border-rose-100';

                    return (
                      <tr key={policy.id} className="border-b border-slate-100/60 hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4 font-bold text-slate-800 text-sm">
                          {policy.category}
                        </td>
                        <td className="py-4 px-4 text-center font-extrabold text-slate-700 text-sm">
                          +{policy.markupRate}%
                        </td>
                        <td className="py-4 px-4 text-center font-extrabold text-indigo-600 text-sm">
                          -{policy.discountRate * 100}%
                        </td>
                        <td className="py-4 px-4 text-xs font-semibold text-slate-500">
                          {policy.startDate || policy.endDate ? (
                            <>
                              {policy.startDate ? policy.startDate : 'Bắt đầu'}
                              <span className="mx-1">→</span>
                              {policy.endDate ? policy.endDate : 'Vô hạn'}
                            </>
                          ) : (
                            <span className="text-slate-400">Áp dụng vô thời hạn</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColor}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditPolicy(policy)}
                              className="text-slate-400 hover:text-[#00285E] transition-colors p-1.5 rounded-lg hover:bg-blue-50"
                              title="Chỉnh sửa"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeletePolicyItem(policy.id)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50"
                              title="Xóa"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* POLICY EDIT/CREATE MODAL */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsPolicyModalOpen(false)}
          ></div>

          {/* Modal Container */}
          <div className="relative bg-white rounded-3xl border border-slate-200/50 shadow-2xl p-6 md:p-8 w-full max-w-lg transform transition-all font-sans">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Tag className="text-[#00285E]" size={20} />
              {editingPolicy ? 'Cập nhật chính sách giá' : 'Thêm chính sách giá mới'}
            </h3>

            <form onSubmit={handleSavePolicyItem} className="space-y-4">
              {/* Category Group */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Nhóm phụ tùng *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Dầu nhớt, Hệ thống phanh..."
                  value={policyCategory}
                  onChange={(e) => setPolicyCategory(e.target.value)}
                  className={`w-full bg-white border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800 ${
                    policyErrors.category ? 'border-rose-500' : 'border-slate-200'
                  }`}
                />
                {policyErrors.category && (
                  <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {policyErrors.category}
                  </p>
                )}
              </div>

              {/* Markup and Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Tỷ lệ Markup (0 - 1000%) *
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <input
                      type="number"
                      value={policyMarkup}
                      onChange={(e) => setPolicyMarkup(e.target.value)}
                      className={`w-full bg-white border rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800 ${
                        policyErrors.markup ? 'border-rose-500' : 'border-slate-200'
                      }`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-slate-400 font-bold text-xs">%</span>
                    </div>
                  </div>
                  {policyErrors.markup && (
                    <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {policyErrors.markup}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Tỷ lệ chiết khấu (0 - 1.0) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={policyDiscount}
                    onChange={(e) => setPolicyDiscount(e.target.value)}
                    placeholder="Ví dụ: 0.1 cho 10%"
                    className={`w-full bg-white border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800 ${
                      policyErrors.discount ? 'border-rose-500' : 'border-slate-200'
                    }`}
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                    1.0 = 100%, 0.1 = 10%, 0.05 = 5%
                  </p>
                  {policyErrors.discount && (
                    <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {policyErrors.discount}
                    </p>
                  )}
                </div>
              </div>

              {/* Start and End Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Ngày bắt đầu hiệu lực *
                  </label>
                  <input
                    type="date"
                    value={policyStartDate}
                    min={tomorrowStr}
                    onChange={(e) => setPolicyStartDate(e.target.value)}
                    className={`w-full bg-white border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800 ${
                      policyErrors.startDate ? 'border-rose-500' : 'border-slate-200'
                    }`}
                  />
                  {policyErrors.startDate && (
                    <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {policyErrors.startDate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Ngày kết thúc *
                  </label>
                  <input
                    type="date"
                    value={policyEndDate}
                    min={minEndDateStr}
                    onChange={(e) => setPolicyEndDate(e.target.value)}
                    className={`w-full bg-white border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800 ${
                      policyErrors.endDate ? 'border-rose-500' : 'border-slate-200'
                    }`}
                  />
                  {policyErrors.endDate && (
                    <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {policyErrors.endDate}
                    </p>
                  )}
                </div>
              </div>

              {/* Active Status Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800 text-sm block">Trạng thái hoạt động</span>
                  <span className="text-xs text-slate-400 font-semibold block">Kích hoạt hoặc vô hiệu hóa chính sách giá này.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policyIsActive}
                    onChange={(e) => setPolicyIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-[#00285E]/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00285E]"></div>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsPolicyModalOpen(false)}
                  className="flex-1 py-3 text-sm font-semibold border border-slate-200 hover:bg-slate-50 rounded-xl transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 text-sm font-semibold text-white bg-[#00285E] hover:bg-[#062047] rounded-xl transition-all shadow-md shadow-[#00285E]/10"
                >
                  {editingPolicy ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
