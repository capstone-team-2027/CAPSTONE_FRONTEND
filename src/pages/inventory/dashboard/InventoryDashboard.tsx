import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Warehouse,
  AlertTriangle,
  Boxes,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Package,
} from 'lucide-react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useFetchClient_v2 } from '../../../hook/useFetchClient';
import { INVENTORY_DASHBOARD_API_ENDPOINTS } from '../../../constants/inventory/dashboardApiEndpoint';
import { RESTOCK_SUGGESTION_API_ENDPOINTS } from '../../../constants/inventory/restockSuggestionApiEndpoint';
type OutletCtx = {
  searchQuery: string;
  showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
};

interface InventoryDashboardData {
  summary: {
    totalValue: number;
    totalSku: number;
    lowStockCount: number;
    transactionsToday: number;
    importsToday: number;
    exportsToday: number;
  };
  stockByCategory: Array<{ name: string; value: number }>;
  importExportTrend: {
    labels: string[];
    importQty: number[];
    exportQty: number[];
  };
  lowStock: Array<{ id: number; name: string; stock_quantity: number; min_threshold: number }>;
  recentTransactions: Array<{ receipt_code: string; type: string; quantity: number; unit_price: number; createdAt: string; part?: { name?: string; sku?: string } }>;
  topConsumed: Array<{ name: string; sku: string | null; qty: number }>;
  topAgingStock: Array<{ name: string; sku: string | null; days: number }>;
}

interface RestockSuggestionItem {
  part_id: number;
  sku: string;
  name: string;
  suggested_quantity: number;
}

interface RestockSuggestionResponse {
  restock_days: number;
  suggestions: RestockSuggestionItem[];
}

export default function InventoryDashboard() {
  const { showToast } = useOutletContext<OutletCtx>();
  const { fetchPrivate } = useFetchClient_v2();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<InventoryDashboardData | null>(null);
  const [restockData, setRestockData] = useState<RestockSuggestionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const [summaryResponse, restockResponse] = await Promise.all([
          fetchPrivate(INVENTORY_DASHBOARD_API_ENDPOINTS.SUMMARY),
          fetchPrivate<RestockSuggestionResponse>(RESTOCK_SUGGESTION_API_ENDPOINTS.LIST),
        ]);
        setDashboardData(summaryResponse.data);
        setRestockData(restockResponse.data);
      } catch (error) {
        console.error('Failed to load inventory dashboard data', error);
        showToast('Không thể tải dữ liệu kho', 'warning');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [fetchPrivate, showToast]);

  const stats = [
    { id: 'value', label: 'Giá trị tồn kho', value: `${(dashboardData?.summary?.totalValue || 0).toLocaleString('vi-VN')} VND`, icon: <Wallet size={18} />, tint: 'text-blue-600 bg-blue-50' },
    { id: 'sku', label: 'Tổng sản phẩm', value: (dashboardData?.summary?.totalSku || 0).toLocaleString('vi-VN'), icon: <Boxes size={18} />, tint: 'text-[#00285E] bg-[#EDF3FF]' },
    { id: 'low', label: 'Sắp hết', value: (dashboardData?.summary?.lowStockCount || 0).toLocaleString('vi-VN'), icon: <AlertTriangle size={18} />, tint: 'text-[#F9A11B] bg-amber-50' },
    { id: 'util', label: 'Giao dịch hôm nay', value: (dashboardData?.summary?.transactionsToday || 0).toString(), icon: <Warehouse size={18} />, tint: 'text-emerald-600 bg-emerald-50' },
  ];

  const topConsumedMaxQty = Math.max(...(dashboardData?.topConsumed || []).map((item) => item.qty), 1);
  const topConsumedChart = (dashboardData?.topConsumed || []).map((item) => ({
    name: item.name,
    sku: item.sku || '—',
    qty: item.qty,
    pct: Math.round((item.qty / topConsumedMaxQty) * 100),
  }));

  const agingStockMaxDays = Math.max(...(dashboardData?.topAgingStock || []).map((item) => item.days), 1);
  const agingStockChart = (dashboardData?.topAgingStock || []).map((item) => ({
    name: item.name,
    sku: item.sku || '—',
    days: item.days,
    pct: Math.round((item.days / agingStockMaxDays) * 100),
  }));

  const activity = (dashboardData?.recentTransactions || []).map((item, index) => {
    const d = new Date(item.createdAt);
    const today = new Date();
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    return {
      id: `${item.receipt_code}-${index}`,
      type: item.type === 'IN' ? 'in' : 'out',
      text: `${item.type === 'IN' ? 'Nhập' : 'Xuất'} ${item.quantity} ${item.part?.name || 'phụ tùng'}`,
      ref: item.receipt_code,
      time: isToday ? timeStr : `${timeStr} ${dateStr}`,
    };
  });

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">

      {/* HERO / WELCOME BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-[#00285E] text-white p-6 md:p-8 shadow-lg shadow-[#00285E]/20">
        {/* decorative shapes */}
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/5"></div>
        <div className="absolute right-20 -bottom-16 w-40 h-40 rounded-full bg-[#F9A11B]/10"></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center shrink-0">
              <Warehouse size={28} className="text-[#F9A11B]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-none mb-1.5">
                Tổng quan kho phụ tùng
              </h1>
              <p className="text-blue-100/80 text-sm">
                Trực quan hoá tình trạng tồn kho theo thời gian thực.
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading && <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Đang tải dữ liệu kho...</div>}

      {/* QUICK STAT STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.id}
            className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-3.5"
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${s.tint}`}>
              {s.icon}
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">{s.label}</span>
              <span className="text-xl font-bold text-slate-900 tracking-tight">{s.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ROW: TOP CONSUMED CHART + TOP AGING STOCK CHART (gộp chung 1 card, ngăn cách bằng đường kẻ dọc) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x-2 md:divide-slate-200">
          {/* Top 10 tiêu thụ nhiều nhất */}
          <div className="md:pr-6">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-0.5">10 sản phẩm tiêu thụ nhiều nhất</h2>
            <p className="text-slate-400 text-xs mb-5">Tổng số lượng xuất kho từ trước đến nay</p>

            {topConsumedChart.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">Chưa có dữ liệu xuất kho.</div>
            ) : (
              <div className="flex items-end gap-2 h-56">
                {topConsumedChart.map((item) => (
                  <div key={item.sku + item.name} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                    <span className="text-[11px] font-bold text-slate-700 mb-1">{item.qty}</span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${item.pct}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                      className="w-full rounded-t-md bg-[#00285E]"
                    />
                    <span
                      className="text-[10px] text-slate-400 mt-2 w-full text-center truncate"
                      title={item.name}
                    >
                      {item.sku}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top 10 tồn kho lâu nhất */}
          <div className="pt-6 md:pt-0 md:pl-6 border-t-2 md:border-t-0 border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-0.5">10 sản phẩm tồn lâu nhất</h2>
            <p className="text-slate-400 text-xs mb-5">Số ngày kể từ lần xuất kho gần nhất</p>

            {agingStockChart.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">Chưa có dữ liệu tồn kho.</div>
            ) : (
              <div className="flex items-end gap-2 h-56">
                {agingStockChart.map((item) => (
                  <div key={item.sku + item.name} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                    <span className="text-[11px] font-bold text-slate-700 mb-1">{item.days}</span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${item.pct}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                      className="w-full rounded-t-md bg-[#F9A11B]"
                    />
                    <span
                      className="text-[10px] text-slate-400 mt-2 w-full text-center truncate"
                      title={item.name}
                    >
                      {item.sku}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ROW: RESTOCK SUGGESTIONS + RECENT ACTIVITY (gộp chung 1 card, ngăn cách bằng đường kẻ dọc) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x-2 md:divide-slate-200">
          {/* Restock suggestions */}
          <div className="md:pr-6 flex flex-col">
            <div className="flex items-center justify-between mb-0.5">
              <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                <Sparkles size={17} className="text-[#F9A11B]" />
                Đề xuất nhập hàng
              </h2>
            </div>
            <p className="text-slate-400 text-xs mb-4">
              Phân tích tồn kho &amp; tốc độ tiêu thụ {restockData?.restock_days ? `(đủ dùng ${restockData.restock_days} ngày)` : ""}
            </p>

            {(restockData?.suggestions.length ?? 0) === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-slate-400">
                <Package size={28} className="text-slate-300 mb-2" />
                <p className="text-sm font-semibold">Chưa có phụ tùng nào cần nhập thêm.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {(restockData?.suggestions ?? []).slice(0, 5).map((item) => (
                  <div
                    key={item.part_id}
                    className="flex items-center justify-between gap-3 py-1.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{item.name}</p>
                      <p className="text-[11px] text-slate-400">{item.sku}</p>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white bg-[#00285E]">
                      <AlertCircle size={11} />
                      +{item.suggested_quantity.toLocaleString('vi-VN')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => navigate('/inventory/restock-suggestions')}
              className="w-full mt-4 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-[#00285E] hover:bg-slate-50 rounded-xl transition-colors border border-slate-100"
            >
              Xem tất cả đề xuất
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Recent activity */}
          <div className="pt-6 md:pt-0 md:pl-6 border-t-2 md:border-t-0 border-slate-200 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Hoạt động gần đây</h2>
                <p className="text-slate-400 text-xs mt-0.5">Phiếu nhập / xuất kho mới nhất</p>
              </div>
            </div>

            <div className="space-y-1.5 flex-1">
              {activity.map((a) => (
                <button
                  key={a.id}
                  onClick={() => showToast(`Chi tiết phiếu: ${a.ref}`, 'info')}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      a.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-[#C27803]'
                    }`}
                  >
                    {a.type === 'in' ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-slate-700 block truncate group-hover:text-[#00285E] transition-colors">
                      {a.text}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">{a.ref}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-400 shrink-0">{a.time}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => showToast('Chuyển tới lịch sử luân chuyển kho...', 'info')}
              className="w-full mt-4 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-[#00285E] hover:bg-slate-50 rounded-xl transition-colors border border-slate-100"
            >
              Xem tất cả hoạt động
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
