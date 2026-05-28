import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useOutletContext } from 'react-router-dom';
import {
  FolderHeart,
  CheckCircle2,
  XCircle,
  Trash2,
  AlertTriangle,
  FolderOpen,
  Filter,
  Pencil,
  X
} from 'lucide-react';
import { useFetchClient } from '../../../hook/useFetchClient';
import { SERVICE_CATEGORY_API_ENDPOINTS } from '../../../constants/admin/serviceCategoriesApiEndPoint';

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
      const url = `${SERVICE_CATEGORY_API_ENDPOINTS.LIST}?page=${page}&limit=${limit}&include_services=false`;

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
  }, [page]);

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
        const res = await fetchPrivate(SERVICE_CATEGORY_API_ENDPOINTS.UPDATE(editingCategory.id), 'PUT', payload);
        if (res.success) {
          showToast('Cập nhật danh mục dịch vụ thành công!', 'success');
          loadCategories();
          setIsModalOpen(false);
        } else {
          showToast(res.message || 'Lỗi khi cập nhật danh mục dịch vụ', 'warning');
        }
      } else {
        const res = await fetchPrivate(SERVICE_CATEGORY_API_ENDPOINTS.CREATE, 'POST', payload);
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
        const res = await fetchPrivate(SERVICE_CATEGORY_API_ENDPOINTS.DELETE(id), 'DELETE');
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
      const res = await fetchPrivate(SERVICE_CATEGORY_API_ENDPOINTS.UPDATE(cat.id), 'PUT', { is_active: newStatus });
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
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">

      {/* TITLE BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2">
            Quản lý Danh mục Dịch vụ
          </h1>
          <p className="text-slate-500 text-sm">
            Tổ chức các phân nhóm danh mục dịch vụ chính của gara.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-[#00285E] text-[#00285E] rounded text-sm font-bold hover:bg-[#EDF3FF] transition-all"
          >
            <span>Thêm danh mục</span>
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <motion.div
          whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}
          className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4 cursor-pointer transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#00285E]">
            <FolderOpen size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              Tổng số danh mục
            </span>
            <span className="text-2xl font-bold text-slate-900 tracking-tight block">
              {stats.total}
            </span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}
          className="bg-white p-6 rounded-2xl border-2 border-[#F9A11B] shadow-xs flex items-center gap-4 cursor-pointer transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              Đang hoạt động
            </span>
            <span className="text-2xl font-bold text-slate-900 tracking-tight block">
              {stats.active}
            </span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}
          className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4 cursor-pointer transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500">
            <XCircle size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              Đang tạm ngưng
            </span>
            <span className="text-2xl font-bold text-slate-900 tracking-tight block">
              {stats.inactive}
            </span>
          </div>
        </motion.div>
      </div>

      {/* TABLE CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        <div className="p-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">
            Danh mục Dịch vụ
          </h2>
          <button
            onClick={() => showToast('Mở bộ lọc nâng cao...', 'info')}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600"
          >
            <Filter size={16} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-y border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th className="py-4 px-6">Tên danh mục dịch vụ</th>
                <th className="py-4 px-4">Ngày khởi tạo</th>
                <th className="py-4 px-4">Trạng thái</th>
                <th className="py-4 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 text-sm">
                    <div className="w-8 h-8 border-4 border-[#00285E] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    Đang tải danh sách danh mục...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 text-sm">
                    Không tìm thấy danh mục dịch vụ nào phù hợp.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr
                    key={cat.id}
                    className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors group"
                  >
                    <td className="py-4 px-6">
                      <span className="font-bold text-[#00285E] text-sm block">
                        {cat.category_name}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-600 text-sm">
                      {formatDate(cat.createdAt)}
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleToggleActive(cat)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer hover:opacity-85 active:scale-95 transition-all ${
                          cat.is_active
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {cat.is_active ? 'Hoạt động' : 'Tạm dừng'}
                      </button>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(cat)}
                          className="p-2 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.category_name)}
                          className="p-2 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-700 block">Kích hoạt trạng thái</span>
                    <span className={`text-[11px] font-semibold ${categoryIsActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {categoryIsActive ? 'Đang hiển thị trên hệ thống' : 'Đang tạm ngưng'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCategoryIsActive(!categoryIsActive)}
                    role="switch"
                    aria-checked={categoryIsActive}
                    className={`relative w-14 h-8 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${categoryIsActive ? 'bg-emerald-500 focus:ring-emerald-500/30' : 'bg-slate-300 focus:ring-slate-400/30'
                      }`}
                  >
                    <motion.div
                      layout
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-[10px] font-bold ${categoryIsActive ? 'right-1 text-emerald-600' : 'left-1 text-slate-400'
                        }`}
                    >
                      {categoryIsActive ? '✓' : '✕'}
                    </motion.div>
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
