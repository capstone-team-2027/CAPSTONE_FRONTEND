import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Clock,
  PackageX,
  Search,
  ChevronDown,
  Plus,
  ArrowDownToLine,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

type PartCategory = 'oil' | 'brake' | 'filter' | 'tire' | 'other';

// One spare-part / product row
interface Part {
  id: string;
  code: string;
  name: string;
  category: PartCategory;
  stock: number;
  minStock: number;
  unit: string;
  location: string;
  price: number; // đơn giá (đ)
}

// One line inside a goods-receipt note (phiếu nhập)
interface ReceiptLine {
  partId: string;
  quantity: number;
  price: number;
}

const CATEGORY_LABEL: Record<PartCategory, string> = {
  oil: 'Dầu nhớt',
  brake: 'Phanh',
  filter: 'Lọc',
  tire: 'Lốp',
  other: 'Khác',
};

const CATEGORY_STYLE: Record<PartCategory, string> = {
  oil: 'bg-[#EBF5FF] text-[#1E40AF]',
  brake: 'bg-[#FDF2F2] text-[#9B1C1C]',
  filter: 'bg-[#FDF4E7] text-[#C27803]',
  tire: 'bg-[#F3E8FF] text-[#6B21A8]',
  other: 'bg-slate-100 text-slate-600',
};

const SUPPLIERS = ['Castrol Việt Nam', 'Bosch Auto Parts', 'Denso Phụ Tùng', 'Michelin VN', 'NGK Spark Plug'];

const PAGE_SIZE = 6;

const INITIAL_PARTS: Part[] = [
  { id: '1', code: 'OIL-C530', name: 'Dầu nhớt Castrol 5W-30', category: 'oil', stock: 2, minStock: 10, unit: 'bình', location: 'A-12', price: 320000 },
  { id: '2', code: 'BRK-TOY-F', name: 'Má phanh trước Toyota', category: 'brake', stock: 4, minStock: 8, unit: 'bộ', location: 'C-03', price: 850000 },
  { id: '3', code: 'FLT-AC-DS', name: 'Lọc gió điều hòa Denso', category: 'filter', stock: 6, minStock: 12, unit: 'cái', location: 'B-07', price: 145000 },
  { id: '4', code: 'TIR-MIC-16', name: 'Lốp Michelin 205/55R16', category: 'tire', stock: 40, minStock: 16, unit: 'lốp', location: 'D-01', price: 1850000 },
  { id: '5', code: 'SPK-NGK-IR', name: 'Bugi NGK Iridium', category: 'other', stock: 8, minStock: 20, unit: 'cái', location: 'B-15', price: 220000 },
  { id: '6', code: 'OIL-MOB-40', name: 'Dầu Mobil 1 5W-40', category: 'oil', stock: 0, minStock: 10, unit: 'bình', location: 'A-14', price: 410000 },
  { id: '7', code: 'FLT-OIL-BS', name: 'Lọc dầu Bosch', category: 'filter', stock: 25, minStock: 15, unit: 'cái', location: 'B-02', price: 95000 },
  { id: '8', code: 'BRK-HON-R', name: 'Má phanh sau Honda', category: 'brake', stock: 12, minStock: 8, unit: 'bộ', location: 'C-05', price: 720000 },
  { id: '9', code: 'TIR-BRG-17', name: 'Lốp Bridgestone 215/60R17', category: 'tire', stock: 6, minStock: 12, unit: 'lốp', location: 'D-04', price: 2100000 },
  { id: '10', code: 'OIL-SHL-30', name: 'Dầu Shell Helix 5W-30', category: 'oil', stock: 18, minStock: 10, unit: 'bình', location: 'A-16', price: 350000 },
  { id: '11', code: 'BAT-GS-70', name: 'Ắc quy GS 70Ah', category: 'other', stock: 3, minStock: 6, unit: 'bình', location: 'E-01', price: 1650000 },
  { id: '12', code: 'FLT-CAB-MZ', name: 'Lọc gió động cơ Mazda', category: 'filter', stock: 0, minStock: 10, unit: 'cái', location: 'B-09', price: 165000 },
];

const emptyProduct = (): Omit<Part, 'id' | 'stock'> => ({
  code: '',
  name: '',
  category: 'other',
  minStock: 0,
  unit: 'cái',
  location: '',
  price: 0,
});

const formatPrice = (v: number) => v.toLocaleString('vi-VN') + 'đ';

export default function InventoryParts() {
  const { searchQuery, setSearchQuery, showToast } = useOutletContext<{
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  }>();

  const [parts, setParts] = useState<Part[]>(INITIAL_PARTS);

  const [categoryFilter, setCategoryFilter] = useState<'all' | PartCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in-stock' | 'low' | 'out'>('all');
  const [isCatOpen, setIsCatOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [page, setPage] = useState(1);

  // ── Product create/edit modal ──
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [productForm, setProductForm] = useState<Omit<Part, 'id' | 'stock'>>(emptyProduct());

  // ── Goods-receipt (phiếu nhập) modal ──
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptCode, setReceiptCode] = useState('');
  const [receiptSupplier, setReceiptSupplier] = useState(SUPPLIERS[0]);
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [receiptNote, setReceiptNote] = useState('');
  const [receiptLines, setReceiptLines] = useState<ReceiptLine[]>([]);

  // ── Status helpers ──
  const getStatus = (p: Part): 'out' | 'low' | 'in-stock' => {
    if (p.stock === 0) return 'out';
    if (p.stock <= p.minStock) return 'low';
    return 'in-stock';
  };

  const summary = useMemo(() => {
    const out = parts.filter((p) => getStatus(p) === 'out').length;
    const low = parts.filter((p) => getStatus(p) === 'low' && getStatus(p) !== 'out').length;
    const total = parts.length;
    return { out, low, total };
  }, [parts]);

  const effectiveSearch = (searchQuery || localSearch).toLowerCase();

  const filtered = useMemo(() => {
    return parts.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(effectiveSearch) ||
        p.code.toLowerCase().includes(effectiveSearch) ||
        p.location.toLowerCase().includes(effectiveSearch);
      const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || getStatus(p) === statusFilter;
      return matchSearch && matchCat && matchStatus;
    });
  }, [parts, effectiveSearch, categoryFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ── Product CRUD ──
  const openCreate = () => {
    setEditingPart(null);
    setProductForm(emptyProduct());
    setProductModalOpen(true);
  };

  const openEdit = (p: Part) => {
    setEditingPart(p);
    setProductForm({ code: p.code, name: p.name, category: p.category, minStock: p.minStock, unit: p.unit, location: p.location, price: p.price });
    setProductModalOpen(true);
  };

  const saveProduct = () => {
    if (!productForm.name.trim() || !productForm.code.trim()) {
      showToast('Vui lòng nhập mã và tên sản phẩm', 'warning');
      return;
    }
    if (editingPart) {
      setParts((prev) => prev.map((p) => (p.id === editingPart.id ? { ...p, ...productForm } : p)));
      showToast(`Đã cập nhật: ${productForm.name}`, 'success');
    } else {
      const newId = (Math.max(0, ...parts.map((p) => Number(p.id))) + 1).toString();
      setParts((prev) => [...prev, { id: newId, stock: 0, ...productForm }]);
      showToast(`Đã thêm sản phẩm: ${productForm.name}`, 'success');
    }
    setProductModalOpen(false);
    setEditingPart(null);
  };

  // ── Goods receipt (phiếu nhập nhiều sản phẩm) ──
  const openReceipt = (preselectId?: string) => {
    setReceiptCode('PN-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000));
    setReceiptSupplier(SUPPLIERS[0]);
    setReceiptDate(new Date().toISOString().slice(0, 10));
    setReceiptNote('');
    const first = preselectId ? parts.find((p) => p.id === preselectId) : undefined;
    setReceiptLines([
      first
        ? { partId: first.id, quantity: 1, price: first.price }
        : { partId: '', quantity: 1, price: 0 },
    ]);
    setReceiptOpen(true);
  };

  const addReceiptLine = () => setReceiptLines((prev) => [...prev, { partId: '', quantity: 1, price: 0 }]);
  const removeReceiptLine = (idx: number) => setReceiptLines((prev) => prev.filter((_, i) => i !== idx));

  const updateReceiptLine = (idx: number, patch: Partial<ReceiptLine>) =>
    setReceiptLines((prev) =>
      prev.map((line, i) => {
        if (i !== idx) return line;
        const next = { ...line, ...patch };
        // auto-fill price when picking a product
        if (patch.partId) {
          const picked = parts.find((p) => p.id === patch.partId);
          if (picked && !line.partId) next.price = picked.price;
        }
        return next;
      })
    );

  const receiptTotal = useMemo(
    () => receiptLines.reduce((sum, l) => sum + l.quantity * l.price, 0),
    [receiptLines]
  );

  const saveReceipt = () => {
    const validLines = receiptLines.filter((l) => l.partId && l.quantity > 0);
    if (validLines.length === 0) {
      showToast('Phiếu nhập cần ít nhất 1 dòng sản phẩm hợp lệ', 'warning');
      return;
    }
    setParts((prev) =>
      prev.map((p) => {
        const added = validLines.filter((l) => l.partId === p.id).reduce((s, l) => s + l.quantity, 0);
        return added > 0 ? { ...p, stock: p.stock + added } : p;
      })
    );
    showToast(`Đã nhập kho phiếu ${receiptCode} (${validLines.length} mặt hàng)`, 'success');
    setReceiptOpen(false);
  };

  // ── Summary alert cards ──
  const summaryCards = [
    {
      id: 'out',
      title: 'Hết hàng',
      value: summary.out,
      desc: 'Cần nhập gấp',
      icon: <PackageX size={20} />,
      iconBg: 'bg-rose-50 text-rose-600',
      ring: 'hover:border-rose-200',
      onClick: () => { setStatusFilter('out'); setPage(1); showToast('Lọc: mặt hàng hết hàng', 'warning'); },
    },
    {
      id: 'low',
      title: 'Sắp hết hàng',
      value: summary.low,
      desc: 'Dưới định mức tối thiểu',
      icon: <AlertTriangle size={20} />,
      iconBg: 'bg-amber-50 text-[#F9A11B]',
      ring: 'hover:border-amber-200',
      onClick: () => { setStatusFilter('low'); setPage(1); showToast('Lọc: mặt hàng sắp hết', 'warning'); },
    },
    {
      id: 'total',
      title: 'Tổng sản phẩm',
      value: summary.total,
      desc: 'Loại phụ tùng đang quản lý',
      icon: <Clock size={20} />,
      iconBg: 'bg-blue-50 text-blue-600',
      ring: 'hover:border-blue-200',
      onClick: () => { setStatusFilter('all'); setCategoryFilter('all'); setPage(1); },
    },
  ];

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">

      {/* TITLE & ACTIONS BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">
            Quản lý sản phẩm
          </h1>
          <p className="text-slate-500 text-sm">
            Quản lý danh mục phụ tùng và nhập kho theo phiếu.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => openReceipt()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#00285E] text-[#00285E] rounded-xl text-sm font-semibold shadow-xs hover:bg-[#EDF3FF] transition-colors"
          >
            <ArrowDownToLine size={16} />
            <span>Nhập kho</span>
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#00285E] text-white rounded-xl text-sm font-semibold shadow-md shadow-[#00285E]/10 hover:bg-[#082245] transition-all transform hover:translate-y-[-1px] active:translate-y-0"
          >
            <Plus size={16} />
            <span>Thêm sản phẩm</span>
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryCards.map((card) => (
          <motion.button
            whileHover={{ y: -3 }}
            key={card.id}
            onClick={card.onClick}
            className={`bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4 text-left transition-all ${card.ring}`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${card.iconBg}`}>
              {card.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">{card.value}</span>
                <span className="text-sm font-bold text-slate-600">{card.title}</span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">{card.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* PRODUCT TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">

        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Danh sách sản phẩm</h2>
            <span className="bg-[#EDF3FF] text-[#00285E] px-2.5 py-0.5 rounded-full text-xs font-bold">
              {filtered.length} mặt hàng
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm mã, tên, vị trí kệ..."
                value={localSearch}
                onChange={(e) => { setLocalSearch(e.target.value); if (searchQuery) setSearchQuery(''); setPage(1); }}
                className="w-full sm:w-64 bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
              />
            </div>

            {/* Category filter */}
            <div className="relative">
              <button
                onClick={() => { setIsCatOpen(!isCatOpen); setIsStatusOpen(false); }}
                className="flex items-center justify-between gap-2 w-full sm:w-40 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span>{categoryFilter === 'all' ? 'Tất cả danh mục' : CATEGORY_LABEL[categoryFilter]}</span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>
              {isCatOpen && (
                <div className="absolute right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl py-2 w-44 z-20">
                  {(['all', 'oil', 'brake', 'filter', 'tire', 'other'] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => { setCategoryFilter(c); setIsCatOpen(false); setPage(1); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${categoryFilter === c ? 'text-[#00285E] font-bold' : 'text-slate-700'}`}
                    >
                      {c === 'all' ? 'Tất cả danh mục' : CATEGORY_LABEL[c]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status filter */}
            <div className="relative">
              <button
                onClick={() => { setIsStatusOpen(!isStatusOpen); setIsCatOpen(false); }}
                className="flex items-center justify-between gap-2 w-full sm:w-36 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span>{statusFilter === 'all' ? 'Trạng thái' : statusFilter === 'in-stock' ? 'Còn hàng' : statusFilter === 'low' ? 'Sắp hết' : 'Hết hàng'}</span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>
              {isStatusOpen && (
                <div className="absolute right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl py-2 w-40 z-20">
                  {([['all', 'Tất cả trạng thái'], ['in-stock', 'Còn hàng'], ['low', 'Sắp hết'], ['out', 'Hết hàng']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => { setStatusFilter(val); setIsStatusOpen(false); setPage(1); }}
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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th className="py-4 px-6">Mã / Sản phẩm</th>
                <th className="py-4 px-4">Danh mục</th>
                <th className="py-4 px-4">Tồn kho</th>
                <th className="py-4 px-4">Định mức</th>
                <th className="py-4 px-4">Vị trí</th>
                <th className="py-4 px-4">Đơn giá</th>
                <th className="py-4 px-4">Trạng thái</th>
                <th className="py-4 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400 text-sm">Không tìm thấy sản phẩm phù hợp...</td>
                </tr>
              ) : (
                pageItems.map((p) => {
                  const status = getStatus(p);
                  return (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors group">
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-800 text-sm block group-hover:text-[#00285E] transition-colors">{p.name}</span>
                        <span className="text-xs font-semibold text-slate-400">{p.code}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wide uppercase ${CATEGORY_STYLE[p.category]}`}>{CATEGORY_LABEL[p.category]}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`text-sm font-bold ${status === 'out' ? 'text-rose-600' : status === 'low' ? 'text-[#C27803]' : 'text-slate-700'}`}>{p.stock} {p.unit}</span>
                      </td>
                      <td className="py-4 px-4 text-sm font-semibold text-slate-400">{p.minStock} {p.unit}</td>
                      <td className="py-4 px-4">
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{p.location || '—'}</span>
                      </td>
                      <td className="py-4 px-4 text-sm font-bold text-slate-700">{formatPrice(p.price)}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${status === 'out' ? 'bg-rose-500' : status === 'low' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                          <span className="text-sm font-bold text-slate-600">{status === 'out' ? 'Hết hàng' : status === 'low' ? 'Sắp hết' : 'Còn hàng'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => openEdit(p)} title="Sửa sản phẩm" className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                            <Pencil size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs font-medium text-slate-400">Hiển thị {pageItems.length} / {filtered.length} mặt hàng</span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)} className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${n === safePage ? 'bg-[#00285E] text-white shadow-sm' : 'border border-slate-200 text-slate-600 hover:bg-white'}`}>{n}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── PRODUCT CREATE / EDIT MODAL ── */}
      <AnimatePresence>
        {productModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setProductModalOpen(false)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
                <h3 className="text-lg font-bold text-slate-800">{editingPart ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h3>
                <button onClick={() => setProductModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                 <Field label="Tên sản phẩm">
                  <input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} className={inputCls} placeholder="VD: Dầu nhớt Castrol 5W-30" />
                </Field>
                  <Field label="Danh mục">
                    <select value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value as PartCategory })} className={inputCls}>
                      {(Object.keys(CATEGORY_LABEL) as PartCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                    </select>
                  </Field>
                </div>
             
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Đơn vị">
                    <input value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })} className={inputCls} placeholder="cái" />
                  </Field>
                  <Field label="Định mức tối thiểu">
                    <input type="number" min={0} value={productForm.minStock} onChange={(e) => setProductForm({ ...productForm, minStock: Number(e.target.value) })} className={inputCls} />
                  </Field>
                  <Field label="Vị trí kệ">
                    <input value={productForm.location} onChange={(e) => setProductForm({ ...productForm, location: e.target.value })} className={inputCls} placeholder="A-12" />
                  </Field>
                </div>
                <Field label="Giá bán ra">
                  <input type="number" min={0} value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })} className={inputCls} />
                </Field>
                {editingPart && (
                  <p className="text-xs text-slate-400">Số lượng tồn thay đổi qua phiếu Nhập/Xuất kho, không sửa trực tiếp ở đây.</p>
                )}
              </div>
              <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100 sticky bottom-0 bg-white">
                <button onClick={() => setProductModalOpen(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Hủy</button>
                <button onClick={saveProduct} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#00285E] text-white hover:bg-[#082245] transition-colors shadow-md shadow-[#00285E]/10">{editingPart ? 'Lưu thay đổi' : 'Thêm sản phẩm'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── GOODS RECEIPT (PHIẾU NHẬP NHIỀU SẢN PHẨM) MODAL ── */}
      <AnimatePresence>
        {receiptOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReceiptOpen(false)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><ArrowDownToLine size={18} /></div>
                  <h3 className="text-lg font-bold text-slate-800">Phiếu nhập kho</h3>
                </div>
                <button onClick={() => setReceiptOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"><X size={18} /></button>
              </div>

              <div className="p-5 space-y-5">
                {/* Receipt header */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Mã phiếu">
                    <input value={receiptCode} onChange={(e) => setReceiptCode(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Nhà cung cấp">
                    <select value={receiptSupplier} onChange={(e) => setReceiptSupplier(e.target.value)} className={inputCls}>
                      {SUPPLIERS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Ngày nhập">
                    <input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} className={inputCls} />
                  </Field>
                </div>

                {/* Line items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sản phẩm nhập</span>
                    <button onClick={addReceiptLine} className="flex items-center gap-1.5 text-xs font-bold text-[#00285E] hover:text-[#082245] transition-colors">
                      <Plus size={14} /> Thêm dòng
                    </button>
                  </div>

                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-3">Sản phẩm</th>
                          <th className="py-2.5 px-3 w-24">SL</th>
                          <th className="py-2.5 px-3 w-32">Đơn giá</th>
                          <th className="py-2.5 px-3 w-32 text-right">Thành tiền</th>
                          <th className="py-2.5 px-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {receiptLines.map((line, idx) => (
                          <tr key={idx} className="border-t border-slate-100">
                            <td className="py-2 px-3">
                              <select value={line.partId} onChange={(e) => updateReceiptLine(idx, { partId: e.target.value })} className={inputCls + ' text-sm'}>
                                <option value="">— Chọn sản phẩm —</option>
                                {parts.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <input type="number" min={1} value={line.quantity} onChange={(e) => updateReceiptLine(idx, { quantity: Number(e.target.value) })} className={inputCls + ' text-sm'} />
                            </td>
                            <td className="py-2 px-3">
                              <input type="number" min={0} value={line.price} onChange={(e) => updateReceiptLine(idx, { price: Number(e.target.value) })} className={inputCls + ' text-sm'} />
                            </td>
                            <td className="py-2 px-3 text-right text-sm font-bold text-slate-700">{formatPrice(line.quantity * line.price)}</td>
                            <td className="py-2 px-2 text-center">
                              <button onClick={() => removeReceiptLine(idx)} disabled={receiptLines.length === 1} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Note + total */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  <Field label="Ghi chú">
                    <textarea value={receiptNote} onChange={(e) => setReceiptNote(e.target.value)} rows={2} className={inputCls + ' resize-none'} placeholder="Ghi chú cho phiếu nhập..." />
                  </Field>
                  <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-500">Tổng giá trị nhập</span>
                    <span className="text-xl font-bold text-[#00285E]">{formatPrice(receiptTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100 sticky bottom-0 bg-white">
                <button onClick={() => setReceiptOpen(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Hủy</button>
                <button onClick={saveReceipt} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#00285E] text-white hover:bg-[#082245] transition-colors shadow-md shadow-[#00285E]/10">
                  <ArrowDownToLine size={16} /> Lưu phiếu nhập
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Small presentational helpers ──
const inputCls =
  'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-500 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
