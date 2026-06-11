import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowDownToLine,
  Search,
  ChevronDown,
  Calendar,
  Download,
  X,
  Truck,
  Package,
  Eye,
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

interface ReceiptItem {
  name: string;
  code: string;
  quantity: number;
  unit: string;
  price: number;
}

interface Receipt {
  id: string;
  code: string;
  supplier: string;
  date: string; // yyyy-mm-dd
  status: 'completed' | 'pending';
  note?: string;
  items: ReceiptItem[];
}

const formatPrice = (v: number) => v.toLocaleString('vi-VN') + 'đ';

const formatDate = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

const RECEIPTS: Receipt[] = [
  {
    id: 'r1',
    code: 'PN-2026-0512',
    supplier: 'Castrol Việt Nam',
    date: '2026-06-04',
    status: 'completed',
    note: 'Nhập bổ sung dầu nhớt đầu tháng',
    items: [
      { name: 'Dầu nhớt Castrol 5W-30', code: 'OIL-C530', quantity: 120, unit: 'bình', price: 300000 },
      { name: 'Dầu Shell Helix 5W-30', code: 'OIL-SHL-30', quantity: 60, unit: 'bình', price: 330000 },
    ],
  },
  {
    id: 'r2',
    code: 'PN-2026-0513',
    supplier: 'Michelin VN',
    date: '2026-06-03',
    status: 'completed',
    items: [
      { name: 'Lốp Michelin 205/55R16', code: 'TIR-MIC-16', quantity: 40, unit: 'lốp', price: 1750000 },
    ],
  },
  {
    id: 'r3',
    code: 'PN-2026-0514',
    supplier: 'Bosch Auto Parts',
    date: '2026-06-02',
    status: 'pending',
    note: 'Chờ kiểm tra chất lượng',
    items: [
      { name: 'Lọc dầu Bosch', code: 'FLT-OIL-BS', quantity: 200, unit: 'cái', price: 88000 },
      { name: 'Má phanh sau Honda', code: 'BRK-HON-R', quantity: 30, unit: 'bộ', price: 680000 },
    ],
  },
  {
    id: 'r4',
    code: 'PN-2026-0510',
    supplier: 'Denso Phụ Tùng',
    date: '2026-05-29',
    status: 'completed',
    items: [
      { name: 'Lọc gió điều hòa Denso', code: 'FLT-AC-DS', quantity: 80, unit: 'cái', price: 130000 },
    ],
  },
  {
    id: 'r5',
    code: 'PN-2026-0508',
    supplier: 'NGK Spark Plug',
    date: '2026-05-25',
    status: 'completed',
    items: [
      { name: 'Bugi NGK Iridium', code: 'SPK-NGK-IR', quantity: 150, unit: 'cái', price: 195000 },
    ],
  },
  {
    id: 'r6',
    code: 'PN-2026-0505',
    supplier: 'Castrol Việt Nam',
    date: '2026-05-20',
    status: 'completed',
    items: [
      { name: 'Dầu Mobil 1 5W-40', code: 'OIL-MOB-40', quantity: 90, unit: 'bình', price: 380000 },
    ],
  },
];

const receiptTotal = (r: Receipt) => r.items.reduce((s, it) => s + it.quantity * it.price, 0);
const receiptQty = (r: Receipt) => r.items.reduce((s, it) => s + it.quantity, 0);

export default function ImportHistory() {
  const { searchQuery, showToast } = useOutletContext<{
    searchQuery: string;
    showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  }>();

  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [selected, setSelected] = useState<Receipt | null>(null);

  const effectiveSearch = (searchQuery || localSearch).toLowerCase();

  const filtered = useMemo(() => {
    return RECEIPTS.filter((r) => {
      const matchSearch =
        r.code.toLowerCase().includes(effectiveSearch) ||
        r.supplier.toLowerCase().includes(effectiveSearch) ||
        r.items.some((it) => it.name.toLowerCase().includes(effectiveSearch));
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [effectiveSearch, statusFilter]);

  // Summary stats
  const stats = useMemo(() => {
    const totalReceipts = RECEIPTS.length;
    const totalValue = RECEIPTS.reduce((s, r) => s + receiptTotal(r), 0);
    const pending = RECEIPTS.filter((r) => r.status === 'pending').length;
    return { totalReceipts, totalValue, pending };
  }, []);

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">

      {/* TITLE & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">
            Lịch sử nhập kho
          </h1>
          <p className="text-slate-500 text-sm">Danh sách các phiếu nhập kho đã thực hiện.</p>
        </div>
        <button
          onClick={() => showToast('Đang xuất lịch sử nhập kho...', 'info')}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors self-start"
        >
          <Download size={16} className="text-slate-500" />
          <span>Xuất Excel</span>
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[#EDF3FF] text-[#00285E]">
            <ArrowDownToLine size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{stats.totalReceipts}</div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Tổng phiếu nhập</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600">
            <Package size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{formatPrice(stats.totalValue)}</div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Tổng giá trị nhập</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 text-[#F9A11B]">
            <Truck size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{stats.pending}</div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Phiếu chờ xử lý</p>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Danh sách phiếu nhập</h2>
            <span className="bg-[#EDF3FF] text-[#00285E] px-2.5 py-0.5 rounded-full text-xs font-bold">
              {filtered.length} phiếu
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm mã phiếu, nhà cung cấp..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full sm:w-64 bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setIsStatusOpen(!isStatusOpen)}
                className="flex items-center justify-between gap-2 w-full sm:w-40 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span>{statusFilter === 'all' ? 'Tất cả trạng thái' : statusFilter === 'completed' ? 'Hoàn thành' : 'Chờ xử lý'}</span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>
              {isStatusOpen && (
                <div className="absolute right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl py-2 w-44 z-20">
                  {([['all', 'Tất cả trạng thái'], ['completed', 'Hoàn thành'], ['pending', 'Chờ xử lý']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => { setStatusFilter(val); setIsStatusOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${statusFilter === val ? 'text-[#00285E] font-bold' : 'text-slate-700'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th className="py-4 px-6">Mã phiếu</th>
                <th className="py-4 px-4">Nhà cung cấp</th>
                <th className="py-4 px-4">Ngày nhập</th>
                <th className="py-4 px-4">Số mặt hàng</th>
                <th className="py-4 px-4">Tổng giá trị</th>
                <th className="py-4 px-4">Trạng thái</th>
                <th className="py-4 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400 text-sm">Không tìm thấy phiếu nhập phù hợp...</td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-800 text-sm group-hover:text-[#00285E] transition-colors">{r.code}</span>
                    </td>
                    <td className="py-4 px-4 text-sm font-semibold text-slate-700">{r.supplier}</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                        <Calendar size={13} className="text-slate-400" />
                        {formatDate(r.date)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm font-semibold text-slate-600">{r.items.length} loại · {receiptQty(r)}</td>
                    <td className="py-4 px-4 text-sm font-bold text-slate-800">{formatPrice(receiptTotal(r))}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${r.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        <span className="text-sm font-bold text-slate-600">{r.status === 'completed' ? 'Hoàn thành' : 'Chờ xử lý'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelected(r); }}
                          title="Xem chi tiết"
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── RECEIPT DETAIL MODAL ── */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#EDF3FF] text-[#00285E] flex items-center justify-center"><ArrowDownToLine size={18} /></div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 leading-tight">{selected.code}</h3>
                    <span className={`text-xs font-bold ${selected.status === 'completed' ? 'text-emerald-600' : 'text-[#C27803]'}`}>
                      {selected.status === 'completed' ? 'Hoàn thành' : 'Chờ xử lý'}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"><X size={18} /></button>
              </div>

              <div className="p-5 space-y-5">
                {/* Header info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Nhà cung cấp</span>
                    <span className="text-sm font-bold text-slate-800">{selected.supplier}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Ngày nhập</span>
                    <span className="text-sm font-bold text-slate-800">{formatDate(selected.date)}</span>
                  </div>
                </div>

                {/* Items table */}
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Chi tiết hàng nhập</span>
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-3">Sản phẩm</th>
                          <th className="py-2.5 px-3 text-center">SL</th>
                          <th className="py-2.5 px-3 text-right">Đơn giá</th>
                          <th className="py-2.5 px-3 text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.items.map((it, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="py-2.5 px-3">
                              <span className="text-sm font-bold text-slate-700 block">{it.name}</span>
                              <span className="text-xs font-semibold text-slate-400">{it.code}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center text-sm font-semibold text-slate-600">{it.quantity} {it.unit}</td>
                            <td className="py-2.5 px-3 text-right text-sm font-semibold text-slate-600">{formatPrice(it.price)}</td>
                            <td className="py-2.5 px-3 text-right text-sm font-bold text-slate-800">{formatPrice(it.quantity * it.price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selected.note && (
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Ghi chú</span>
                    <p className="text-sm text-slate-600">{selected.note}</p>
                  </div>
                )}

                <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-500">Tổng giá trị phiếu</span>
                  <span className="text-xl font-bold text-[#00285E]">{formatPrice(receiptTotal(selected))}</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
