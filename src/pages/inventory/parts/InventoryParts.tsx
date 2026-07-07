import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  Clock,
  PackageX,
  Search,
  ChevronDown,
  Pencil,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { type SparePartResponse, type UpdateSparePartRequest } from "../../../model/dto/sparePartManagement.dto";
import { useFetchClient } from "../../../hook/useFetchClient";
import { SPARE_PART_API_ENDPOINTS } from "../../../constants/inventory/sparePartApiEnPoint";

const PAGE_SIZE = 6;

const formatPrice = (v: number) => Math.round(v).toLocaleString("vi-VN") + "đ";

export default function InventoryParts() {
  const { searchQuery, setSearchQuery, showToast } = useOutletContext<{
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();
  const [statusFilter, setStatusFilter] = useState<
    "all" | "in-stock" | "low" | "out"
  >("all");
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [parts, setParts] = useState<SparePartResponse[]>([]);
  const [editingPart, setEditingPart] = useState<SparePartResponse | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [kmInput, setKmInput] = useState("");
  const [monthsInput, setMonthsInput] = useState("");
  const { fetchPrivate } = useFetchClient();
  const [page, setPage] = useState(1);

  const activeSearch = searchQuery || localSearch;
  const filtered = parts.filter((p) => {
    const matchSearch =
      !activeSearch ||
      p.sku.toLowerCase().includes(activeSearch.toLowerCase()) ||
      p.name.toLowerCase().includes(activeSearch.toLowerCase());
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "out" && p.stock_quantity === 0) ||
      (statusFilter === "low" && p.stock_quantity > 0 && p.stock_quantity <= 5) ||
      (statusFilter === "in-stock" && p.stock_quantity > 5);
    return matchSearch && matchStatus;
  });

  const summary = {
    out: parts.filter((p) => p.stock_quantity === 0).length,
    low: parts.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= 5).length,
    total: parts.length,
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  useEffect(() => {
    handleGetSpareParts();
  }, []);

  const handleGetSpareParts = async () => {
    try {
      const result = await fetchPrivate<SparePartResponse[]>(
        SPARE_PART_API_ENDPOINTS.SPARE_PART,
        "GET",
      );
      setParts(result.data);
    } catch (error) {
      console.error("Lỗi lấy danh sách danh mục", error);
    }
  };

  const handleUpdatePart = async () => {
    if (!editingPart) return;
    try {
      const payload: UpdateSparePartRequest = {
        name: editingPart.name,
        brand: editingPart.brand,
        retail_price: Number(editingPart.retail_price),
        warranty_km_limit: Number(editingPart.warranty_km_limit),
        warranty_period_months: Number(editingPart.warranty_period_months),
      };
      await fetchPrivate(
        `${SPARE_PART_API_ENDPOINTS.SPARE_PART}/${editingPart.id}`,
        "PATCH",
        payload,
      );
      showToast("Cập nhật sản phẩm thành công", "success");
      setEditOpen(false);
      setEditingPart(null);
      handleGetSpareParts();
    } catch (error) {
      console.error("Lỗi cập nhật sản phẩm", error);
    }
  };

  const summaryCards = [
    {
      id: "out",
      title: "Hết hàng",
      value: summary.out,
      desc: "Cần nhập thêm phụ tùng",
      icon: <PackageX size={20} />,
      iconBg: "bg-rose-50 text-rose-600",
      ring: "hover:border-rose-200",
      onClick: () => {
        setStatusFilter("out");
        setPage(1);
      },
    },
    {
      id: "low",
      title: "Sắp hết hàng",
      value: summary.low,
      desc: "Dưới định mức tối thiểu",
      icon: <AlertTriangle size={20} />,
      iconBg: "bg-amber-50 text-[#F9A11B]",
      ring: "hover:border-amber-200",
      onClick: () => {
        setStatusFilter("low");
        setPage(1);
      },
    },
    {
      id: "total",
      title: "Tổng sản phẩm",
      value: summary.total,
      desc: "Loại phụ tùng đang quản lý",
      icon: <Clock size={20} />,
      iconBg: "bg-blue-50 text-blue-600",
      ring: "hover:border-blue-200",
      onClick: () => {
        setStatusFilter("all");
        setPage(1);
      },
    },
  ];

  const getStockStatus = (qty: number) => {
    if (qty === 0) return { label: "Hết hàng", color: "bg-rose-500" };
    if (qty <= 5) return { label: "Sắp hết", color: "bg-amber-400" };
    return { label: "Còn hàng", color: "bg-emerald-500" };
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* TITLE */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">
          Quản lý phụ tùng
        </h1>
        <p className="text-slate-500 text-sm">
          Quản lý danh mục phụ tùng và nhập kho theo phiếu.
        </p>
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
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${card.iconBg}`}
            >
              {card.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">
                  {card.value}
                </span>
                <span className="text-sm font-bold text-slate-600">
                  {card.title}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                {card.desc}
              </p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* PRODUCT TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              Danh sách phụ tùng
            </h2>
            <span className="bg-[#EDF3FF] text-[#00285E] px-2.5 py-0.5 rounded-full text-xs font-bold">
              {filtered.length} mặt hàng
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Tìm mã, tên, vị trí kệ..."
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  if (searchQuery) setSearchQuery("");
                  setPage(1);
                }}
                className="w-full sm:w-64 bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
              />
            </div>

            {/* Status filter */}
            <div className="relative">
              <button
                onClick={() => setIsStatusOpen(!isStatusOpen)}
                className="flex items-center justify-between gap-2 w-full sm:w-36 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span>
                  {statusFilter === "all"
                    ? "Trạng thái"
                    : statusFilter === "in-stock"
                      ? "Còn hàng"
                      : statusFilter === "low"
                        ? "Sắp hết"
                        : "Hết hàng"}
                </span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>
              {isStatusOpen && (
                <div className="absolute right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl py-2 w-40 z-20">
                  {(
                    [
                      ["all", "Tất cả trạng thái"],
                      ["in-stock", "Còn hàng"],
                      ["low", "Sắp hết"],
                      ["out", "Hết hàng"],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => {
                        setStatusFilter(val);
                        setIsStatusOpen(false);
                        setPage(1);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${statusFilter === val ? "text-[#00285E] font-bold" : "text-slate-700"}`}
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
                <th className="py-4 px-6">Mã sản phẩm</th>
                <th className="py-4 px-6">Tên sản phẩm</th>
                <th className="py-4 px-4">Thương hiệu</th>
                <th className="py-4 px-4">Danh mục</th>
                <th className="py-4 px-4">Số lượng</th>
                <th className="py-4 px-4">Đơn giá bán</th>
                <th className="py-4 px-4">Bảo hành</th>
                <th className="py-4 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-14 text-center text-slate-400 text-sm"
                  >
                    Không tìm thấy sản phẩm phù hợp...
                  </td>
                </tr>
              ) : (
                pageItems.map((p) => {
                  const stock = getStockStatus(p.stock_quantity);
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-800 text-sm block group-hover:text-[#00285E] transition-colors">
                          {p.sku}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm font-semibold text-slate-700">
                        {p.name}
                      </td>
                      <td className="py-4 px-4">
                        {p.brand ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wide bg-[#EDF3FF] text-[#00285E]">
                            {p.brand}
                          </span>
                        ) : <span className="text-slate-400 text-sm">—</span>}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600">
                        {p.category?.category_name ?? "—"}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-700">
                            {p.stock_quantity}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm font-bold text-slate-700">
                        {formatPrice(p.retail_price)}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600">
                        {p.warranty_period_months > 0 && p.warranty_km_limit > 0
                          ? `${p.warranty_period_months} tháng / ${Math.round(p.warranty_km_limit).toLocaleString("vi-VN")} km`
                          : p.warranty_period_months > 0
                            ? `${p.warranty_period_months} tháng`
                            : p.warranty_km_limit > 0
                              ? `${Math.round(p.warranty_km_limit).toLocaleString("vi-VN")} km`
                              : "—"}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="Sửa sản phẩm"
                            onClick={() => {
                              setEditingPart(p);
                              setPriceInput(p.retail_price === 0 ? "" : Math.round(p.retail_price).toLocaleString("vi-VN"));
                              setKmInput(p.warranty_km_limit === 0 ? "" : Math.round(p.warranty_km_limit).toLocaleString("vi-VN"));
                              setMonthsInput(p.warranty_period_months === 0 ? "" : String(p.warranty_period_months));
                              setEditOpen(true);
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                          >
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
          <span className="text-xs font-medium text-slate-400">
            Hiển thị {pageItems.length} / {filtered.length} mặt hàng
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${n === safePage ? "bg-[#00285E] text-white shadow-sm" : "border border-slate-200 text-slate-600 hover:bg-white"}`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editOpen && editingPart && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => {
            setEditOpen(false);
            setEditingPart(null);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Cập nhật sản phẩm</h2>
                <p className="text-xs text-slate-400 mt-0.5">SKU: {editingPart.sku}</p>
              </div>
              <button
                onClick={() => {
                  setEditOpen(false);
                  setEditingPart(null);
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Tên sản phẩm
                  </label>
                  <input
                    type="text"
                    value={editingPart.name}
                    onChange={(e) =>
                      setEditingPart({ ...editingPart, name: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Thương hiệu
                  </label>
                  <input
                    type="text"
                    value={editingPart.brand}
                    onChange={(e) =>
                      setEditingPart({ ...editingPart, brand: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Đơn giá bán
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={priceInput}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, "");
                        setPriceInput(raw === "" ? "" : Number(raw).toLocaleString("vi-VN"));
                        setEditingPart({
                          ...editingPart,
                          retail_price: raw === "" ? 0 : Number(raw),
                        });
                      }}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">đ</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Bảo hành (tháng)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={monthsInput}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      setMonthsInput(raw === "" ? "" : raw);
                      setEditingPart({
                        ...editingPart,
                        warranty_period_months: raw === "" ? 0 : Number(raw),
                      });
                    }}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Bảo hành theo km
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={kmInput}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, "");
                        setKmInput(raw === "" ? "" : Number(raw).toLocaleString("vi-VN"));
                        setEditingPart({
                          ...editingPart,
                          warranty_km_limit: raw === "" ? 0 : Number(raw),
                        });
                      }}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">km</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setEditOpen(false);
                  setEditingPart(null);
                }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdatePart}
                className="px-5 py-2 text-sm font-bold text-white bg-[#00285E] hover:bg-[#003580] rounded-xl transition-colors"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
