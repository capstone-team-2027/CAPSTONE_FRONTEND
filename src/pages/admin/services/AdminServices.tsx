import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useOutletContext } from 'react-router-dom';
import {
  FolderHeart,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { useFetchClient } from '../../../hook/useFetchClient';
import { SERVICE_COMBOS_API_ENDPOINTS } from '../../../constants/admin/serviceCombosApiEndPoint';

interface ServiceCombo {
  id: number;
  category_name: string;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminServices() {
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  }>();

  const { fetchPrivate } = useFetchClient();

  // State Variables
  const [categories, setCategories] = useState<ServiceCombo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalCategories, setTotalCategories] = useState(0);
  const limit = 8;

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCombo | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryIsActive, setCategoryIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // ── LOAD DATA ──────────────────────────────────────────────────────────────

  const loadCategories = async () => {
    setLoading(true);
    try {
      const activeParam = statusFilter !== 'all' ? `&is_active=${statusFilter}` : '';
      const queryParam = searchTerm.trim() ? `&q=${encodeURIComponent(searchTerm.trim())}` : '';
      const url = `${SERVICE_COMBOS_API_ENDPOINTS.LIST}?page=${page}&limit=${limit}&include_services=false${activeParam}${queryParam}`;

      const res = await fetchPrivate(url, 'GET');
      if (res.success && res.data) {
        setCategories(res.data.items || []);
        setTotalCategories(res.data.total || 0);
      } else {
        showToast(res.message || 'Không thể tải danh sách danh mục dịch vụ', 'warning');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Lỗi kết nối tải danh sách danh mục', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadCategories();
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = totalCategories || categories.length;
    const active = categories.filter((c) => c.is_active).length;
    const inactive = categories.filter((c) => !c.is_active).length;

    return {
      total,
      active,
      inactive
    };
  }, [categories, totalCategories]);

  // ── VALIDATION & FORM SAVING ───────────────────────────────────────────────

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!categoryName.trim()) {
      errs.name = 'Tên danh mục dịch vụ không được bỏ trống';
    } else if (categoryName.trim().length > 100) {
      errs.name = 'Tên danh mục tối đa 100 ký tự';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryIsActive(true);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: ServiceCombo) => {
    setEditingCategory(cat);
    setCategoryName(cat.category_name);
    setCategoryIsActive(cat.is_active);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        category_name: categoryName.trim(),
        is_active: categoryIsActive
      };

      if (editingCategory) {
        const res = await fetchPrivate(SERVICE_COMBOS_API_ENDPOINTS.UPDATE(editingCategory.id), 'PUT', payload);
        if (res.success) {
          showToast('Cập nhật danh mục dịch vụ thành công!', 'success');
          loadCategories();
          setIsModalOpen(false);
        } else {
          showToast(res.message || 'Lỗi khi cập nhật danh mục dịch vụ', 'warning');
        }
      } else {
        const res = await fetchPrivate(SERVICE_COMBOS_API_ENDPOINTS.CREATE, 'POST', payload);
        if (res.success) {
          showToast('Thêm danh mục dịch vụ mới thành công!', 'success');
          loadCategories();
          setIsModalOpen(false);
        } else {
          showToast(res.message || 'Lỗi khi thêm danh mục dịch vụ', 'warning');
        }
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Lỗi kết nối lưu danh mục', 'warning');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa danh mục dịch vụ "${name}"?`)) {
      try {
        const res = await fetchPrivate(SERVICE_COMBOS_API_ENDPOINTS.DELETE(id), 'DELETE');
        if (res.success) {
          showToast(`Đã xóa danh mục "${name}" thành công`, 'success');
          loadCategories();
        } else {
          showToast(res.message || 'Lỗi khi xóa danh mục dịch vụ', 'warning');
        }
      } catch (err: any) {
        console.error(err);
        showToast(err.message || 'Lỗi kết nối xóa danh mục', 'warning');
      }
    }
  };

  const handleToggleActive = async (cat: ServiceCombo) => {
    try {
      const newStatus = !cat.is_active;
      const res = await fetchPrivate(SERVICE_COMBOS_API_ENDPOINTS.UPDATE(cat.id), 'PUT', { is_active: newStatus });
      if (res.success) {
        showToast(`Đã ${newStatus ? 'kích hoạt' : 'tắt'} danh mục "${cat.category_name}"`, 'success');
        loadCategories();
      } else {
        showToast(res.message || 'Lỗi cập nhật trạng thái', 'warning');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Lỗi kết nối cập nhật trạng thái', 'warning');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-8 max-w-7xl w-full mx-auto font-sans">

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#EDF3FF] text-[#00285E] text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md flex items-center gap-1 border border-[#D2E2FF]">
              <Sparkles size={10} className="text-[#F9A11B]" />
              Danh mục
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#00285E] tracking-tight leading-none mb-2">
            Quản lý Danh mục Dịch vụ
          </h1>
          <p className="text-slate-500 text-sm">
            Tạo mới, chỉnh sửa và quản lý các phân nhóm danh mục dịch vụ chính của gara.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-5 py-3 bg-[#00285E] text-white rounded-xl text-sm font-bold shadow-md shadow-[#00285E]/15 hover:bg-[#062047] transition-all transform hover:translate-y-[-1px] active:translate-y-0 self-start sm:self-center"
        >
          <Plus size={16} />
          <span>Thêm danh mục</span>
        </button>
      </div>

      {/* KPI METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* KPI 1 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Tổng số danh mục</span>
            <span className="text-2xl font-bold text-slate-800 block">{stats.total}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#00285E]">
            <FolderOpen size={22} />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Đang hoạt động</span>
            <span className="text-2xl font-bold text-emerald-600 block">{stats.active}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Đang tạm ngưng</span>
            <span className="text-2xl font-bold text-slate-500 block">{stats.inactive}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500">
            <XCircle size={22} />
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96 flex">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm tên danh mục..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
            />
          </div>
          <button
            type="submit"
            className="ml-2.5 px-4.5 py-2.5 bg-[#00285E] text-white rounded-xl text-xs font-bold hover:bg-[#062047] transition-all flex items-center gap-1.5"
          >
            <span>Tìm kiếm</span>
          </button>
        </form>

        {/* Dropdown status Filter */}
        <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Tạm ngưng</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setPage(1);
              loadCategories();
            }}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-[#00285E] hover:bg-slate-100 transition-colors"
            title="Làm mới bộ lọc"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* CATEGORIES TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-slate-600">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 bg-slate-50/50">
                <th className="py-4.5 px-6 w-[45%]">Tên danh mục dịch vụ</th>
                <th className="py-4.5 px-4 w-[20%]">Ngày khởi tạo</th>
                <th className="py-4.5 px-4 w-[20%]">Trạng thái</th>
                <th className="py-4.5 px-6 w-[15%] text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-slate-400 font-medium">
                    <div className="w-8 h-8 border-4 border-[#00285E] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    Đang tải danh sách danh mục...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-slate-400 font-medium">
                    Không tìm thấy danh mục dịch vụ nào phù hợp.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => {
                  const statusColor = cat.is_active
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    : 'bg-rose-50 text-rose-600 border-rose-100';

                  return (
                    <tr key={cat.id} className="border-b border-slate-100 hover:bg-slate-50/40 transition-colors">
                      <td className="py-4.5 px-6 font-bold text-slate-800 text-sm">
                        {cat.category_name}
                      </td>
                      <td className="py-4.5 px-4 text-xs font-semibold text-slate-500">
                        {formatDate(cat.createdAt)}
                      </td>
                      <td className="py-4.5 px-4">
                        <button
                          onClick={() => handleToggleActive(cat)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase border cursor-pointer hover:opacity-85 active:scale-95 transition-all ${statusColor}`}
                        >
                          {cat.is_active ? 'Đang hoạt động' : 'Tạm ngưng'}
                        </button>
                      </td>
                      <td className="py-4.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(cat)}
                            className="p-1.5 text-slate-400 hover:text-[#00285E] hover:bg-slate-50 rounded-lg transition-all"
                            title="Sửa danh mục"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id, cat.category_name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Xóa"
                          >
                            <Trash2 size={15} />
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

        {/* PAGINATION BAR */}
        {!loading && totalCategories > limit && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Hiển thị {categories.length} / {totalCategories} danh mục
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
              >
                Trước
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * limit >= totalCategories}
                className="px-3.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── ADD/EDIT DIALOG (MODAL) ─────────────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => setIsModalOpen(false)}
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl border border-slate-200/50 shadow-2xl p-6 md:p-8 w-full max-w-md transform transition-all z-10"
            >
              <h3 className="text-xl font-bold text-[#00285E] mb-6 flex items-center gap-2">
                <FolderHeart className="text-[#00285E]" size={20} />
                {editingCategory ? 'Cập nhật danh mục dịch vụ' : 'Thêm danh mục dịch vụ mới'}
              </h3>

              <form onSubmit={handleSaveCategory} className="space-y-5">
                {/* Name field */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Tên danh mục dịch vụ *
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Bảo dưỡng định kỳ, Sửa chữa động cơ..."
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className={`w-full bg-white border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800 ${errors.name ? 'border-rose-500' : 'border-slate-200'
                      }`}
                  />
                  {errors.name && (
                    <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Active switch */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-700 block">Kích hoạt trạng thái</span>
                    <span className="text-[10px] text-slate-400 font-medium">Danh mục dịch vụ này có hiển thị trên hệ thống.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCategoryIsActive(!categoryIsActive)}
                    className={`w-12 h-6.5 rounded-full flex items-center p-1 transition-all ${categoryIsActive ? 'bg-[#00285E] justify-end' : 'bg-slate-300 justify-start'
                      }`}
                  >
                    <motion.div layout className="w-4.5 h-4.5 rounded-full bg-white shadow-xs" />
                  </button>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-5 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-[#00285E] hover:bg-[#062047] disabled:bg-slate-400 text-white rounded-xl text-xs font-bold shadow-md shadow-[#00285E]/10 transition-all flex items-center gap-1.5"
                  >
                    {saving ? 'Đang lưu...' : 'Lưu lại'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
