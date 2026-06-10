import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Tags, Plus, Pencil, X } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import {
  type UpdatePartCategory,
  type CreatePartCategory,
  type GetPartCategory,
} from "../../../model/dto/sparePartCategory.dto";
import { PART_CATEGORY_API_ENDPOINTS } from "../../../constants/inventory/sparePartApiEndPoint";
import { useFetchClient } from "../../../hook/useFetchClient";

export default function PartCategories() {
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();

  const { fetchPrivate, fetchPrivateFormGeneric } = useFetchClient();
  const [categories, setCategories] = useState<GetPartCategory[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [categoryName, setCategoryName] = useState<string>("");
  const [categoryDescription, setCategoryDescription] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<GetPartCategory | null>(null);

  useEffect(() => {
    handleGetPartCategories();
  }, []);

  const handleGetPartCategories = async () => {
    try {
      const result = await fetchPrivate<GetPartCategory[]>(
        PART_CATEGORY_API_ENDPOINTS.PART_CATEGORY,
        "GET",
      );
      setCategories(result.data);
      console.log("result", result);
      return result;
    } catch (error) {
      console.error("Lỗi lấy danh sách danh mục", error);
    }
  };

  const handleCreatePartCategory = async () => {
    try {
      const result = await fetchPrivateFormGeneric<CreatePartCategory>(
        PART_CATEGORY_API_ENDPOINTS.PART_CATEGORY,
        "POST",
        {
          category_name: categoryName,
          description: categoryDescription,
          is_active: isActive,
        },
      );
      showToast("Tạo mới danh mục thành công", "success");
      setCreateOpen(false);
      handleGetPartCategories();
      return result;
    } catch (error) {
      console.error("Lỗi tao danh mục", error);
    }
  };

  const handleUpdateCategory = async () => {
    try {
      const result = await fetchPrivate<UpdatePartCategory>(
        `${PART_CATEGORY_API_ENDPOINTS.PART_CATEGORY}/${editing?.id}`,
        "PATCH",
        {
          category_name: editing?.category_name,
          description: editing?.description,
          is_active: editing?.is_active,
        },
      );
      showToast("Cập nhật danh mục thành công", "success");
      setEditOpen(false);
      handleGetPartCategories();
      return result;
    } catch (error) {
      console.error("Lỗi tao danh mục", error);
    }
  };

  const openCreate = () => {
    setCategoryName("");
    setIsActive(true);
    setCreateOpen(true);
  };

  const openEdit = (c: GetPartCategory) => {
    setEditing(c);
    setEditOpen(true);
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* TITLE & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">
            Danh mục phụ tùng
          </h1>
          <p className="text-slate-500 text-sm">
            Quản lý các nhóm phân loại phụ tùng trong kho.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#00285E] text-white rounded-xl text-sm font-semibold shadow-md shadow-[#00285E]/10 hover:bg-[#082245] transition-all transform hover:translate-y-[-1px] active:translate-y-0 self-start"
        >
          <Plus size={16} />
          <span>Thêm danh mục</span>
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-2.5">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">
            Danh sách danh mục
          </h2>
          <span className="bg-[#EDF3FF] text-[#00285E] px-2.5 py-0.5 rounded-full text-xs font-bold">
            {categories.length} danh mục
          </span>
        </div>

        {/* Table body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th className="py-4 px-6">Danh mục</th>
                <th className="py-4 px-6">Mô tả</th>
                <th className="py-4 px-4">Trạng thái</th>
                <th className="py-4 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="py-14 text-center text-slate-400 text-sm"
                  >
                    Chưa có danh mục nào...
                  </td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors group"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#EDF3FF] text-[#00285E] flex items-center justify-center shrink-0">
                          <Tags size={16} />
                        </div>
                        <span className="font-bold text-slate-800 text-sm group-hover:text-[#00285E] transition-colors">
                          {c.category_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-800 text-sm group-hover:text-[#00285E] transition-colors">
                          {c.description}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${c.is_active ? "bg-emerald-500" : "bg-slate-400"}`}
                        ></span>
                        <span className="text-sm font-bold text-slate-600">
                          {c.is_active ? "Hoạt động" : "Tạm ẩn"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(c)}
                          title="Sửa danh mục"
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          <Pencil size={15} />
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

      {/* ── MODAL TẠO MỚI ── */}
      <AnimatePresence>
        {createOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCreateOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">
                  Thêm danh mục
                </h3>
                <button
                  onClick={() => setCreateOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <Field label="Tên danh mục">
                  <input
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className={inputCls}
                    placeholder="VD: Dầu nhớt"
                  />
                </Field>
                <Field label="Mô tả danh mục">
                  <textarea
                    value={categoryDescription}
                    onChange={(e) => setCategoryDescription(e.target.value)}
                    rows={4}
                    className={`${inputCls} resize-y min-h-[96px]`}
                    placeholder="Mô tả danh mục"
                  />
                </Field>
                <label className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 cursor-pointer">
                  <div>
                    <span className="text-sm font-bold text-slate-700 block">
                      Đang hoạt động
                    </span>
                    <span className="text-xs text-slate-400">
                      Danh mục tạm ẩn sẽ không hiện khi tạo sản phẩm.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${isActive ? "bg-[#00285E]" : "bg-slate-300"}`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isActive ? "left-[22px]" : "left-0.5"}`}
                    ></span>
                  </button>
                </label>
              </div>
              <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100">
                <button
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreatePartCategory}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#00285E] text-white hover:bg-[#082245] transition-colors shadow-md shadow-[#00285E]/10"
                >
                  Thêm danh mục
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL SỬA ── */}
      <AnimatePresence>
        {editOpen && editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">
                  Sửa danh mục
                </h3>
                <button
                  onClick={() => setEditOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <Field label="Tên danh mục">
                  <input
                    value={editing.category_name}
                    onChange={(e) =>
                      setEditing({ ...editing, category_name: e.target.value })
                    }
                    className={inputCls}
                    placeholder="VD: Dầu nhớt"
                  />
                </Field>
                <Field label="Mô tả danh mục">
                  <textarea
                    value={editing.description}
                    onChange={(e) =>
                      setEditing({ ...editing, description: e.target.value })
                    }
                    className={`${inputCls} resize-y min-h-[96px]`}
                    placeholder="VD: Dầu nhớt"
                  />
                </Field>
                <label className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 cursor-pointer">
                  <div>
                    <span className="text-sm font-bold text-slate-700 block">
                      Đang hoạt động
                    </span>
                    <span className="text-xs text-slate-400">
                      Danh mục tạm ẩn sẽ không hiện khi tạo sản phẩm.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({ ...editing, is_active: !editing.is_active })
                    }
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${editing.is_active ? "bg-[#00285E]" : "bg-slate-300"}`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${editing.is_active ? "left-[22px]" : "left-0.5"}`}
                    ></span>
                  </button>
                </label>
              </div>
              <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100">
                <button
                  onClick={() => setEditOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleUpdateCategory}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#00285E] text-white hover:bg-[#082245] transition-colors shadow-md shadow-[#00285E]/10"
                >
                  Lưu thay đổi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputCls =
  "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-500 mb-1.5 block">
        {label}
      </span>
      {children}
    </label>
  );
}

