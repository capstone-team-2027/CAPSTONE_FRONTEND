import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Truck, Plus, Pencil, ArrowLeft, X, Phone, MapPin } from "lucide-react";
import { useOutletContext, useNavigate } from "react-router-dom";
import {
  type GetSupplierResponse,
  type CreateSupplierRequest,
  type UpdateSupplierRequest,
} from "../../../model/dto/supplierManagement.dto";
import { useFetchClient } from "../../../hook/useFetchClient";
import { SUPPLIER_API_ENDPOINTS } from "../../../constants/inventory/supplierApiEndPoint";

export default function InventorySuppliers() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<GetSupplierResponse[]>([]);
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [editingSupplier, setEditingSupplier] =
    useState<GetSupplierResponse | null>(null);
  const { fetchPrivate, fetchPrivateFormGeneric } = useFetchClient();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();

  useEffect(() => {
    handleGetSuppliers();
  }, []);

  const handleGetSuppliers = async () => {
    try {
      const result = await fetchPrivate<GetSupplierResponse[]>(
        SUPPLIER_API_ENDPOINTS.SUPPLIER_API,
        "GET",
      );
      setSuppliers(result.data);
    } catch (error) {
      console.error("Lỗi lấy danh sách danh mục", error);
    }
  };

  const handleCreateSupplier = async () => {
    try {
      const payload: CreateSupplierRequest = {
        name: name,
        phone: phone,
        address: address,
        is_active: isActive,
      };
      await fetchPrivateFormGeneric(
        SUPPLIER_API_ENDPOINTS.SUPPLIER_API,
        "POST",
        payload,
      );
      showToast("Tạo mới nhà cung cấp thành công", "success");
      setCreateOpen(false);
      handleGetSuppliers();
    } catch (error) {
      console.error("Lỗi tạo mới", error);
    }
  };

  const handleUpdateSupplier = async () => {
    if (!editingSupplier) return;
    try {
      const payload: UpdateSupplierRequest = {
        name: editingSupplier.name,
        phone: editingSupplier.phone,
        address: editingSupplier.address,
        is_active: editingSupplier.is_active,
      };
      await fetchPrivate(
        `${SUPPLIER_API_ENDPOINTS.SUPPLIER_API}/${editingSupplier.id}`,
        "PATCH",
        payload,
      );
      showToast("Cập nhật nhà cung cấp thành công", "success");
      setEditOpen(false);
      handleGetSuppliers();
    } catch (error) {
      console.error("Lỗi tạo cập nhật", error);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* TITLE & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(-1)}
            title="Quay lại"
            className="mt-0.5 w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#00285E] hover:border-slate-300 active:scale-[0.97] transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">
              Nhà cung cấp
            </h1>
            <p className="text-slate-500 text-sm">
              Quản lý danh sách nhà cung cấp phụ tùng.
            </p>
          </div>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#00285E] text-white rounded-xl text-sm font-semibold shadow-md shadow-[#00285E]/10 hover:bg-[#082245] transition-all transform hover:translate-y-[-1px] active:translate-y-0 self-start"
        >
          <Plus size={16} />
          <span>Thêm nhà cung cấp</span>
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-2.5">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">
            Danh sách nhà cung cấp
          </h2>
          <span className="bg-[#EDF3FF] text-[#00285E] px-2.5 py-0.5 rounded-full text-xs font-bold">
            {suppliers.length} nhà cung cấp
          </span>
        </div>

        {/* Table body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th className="py-4 px-6">Nhà cung cấp</th>
                <th className="py-4 px-6">Số điện thoại</th>
                <th className="py-4 px-6">Địa chỉ</th>
                <th className="py-4 px-4">Trạng thái</th>
                <th className="py-4 px-6">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-14 text-center text-slate-400 text-sm"
                  >
                    Chưa có nhà cung cấp nào...
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors group"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#EDF3FF] text-[#00285E] flex items-center justify-center shrink-0">
                          <Truck size={16} />
                        </div>
                        <span className="font-bold text-slate-800 text-sm group-hover:text-[#00285E] transition-colors">
                          {s.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone size={14} className="text-slate-400" />
                        <span>{s.phone}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin size={14} className="text-slate-400" />
                        <span>{s.address}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${s.is_active ? "bg-emerald-500" : "bg-slate-400"}`}
                        ></span>
                        <span className="text-sm font-bold text-slate-600">
                          {s.is_active ? "Hoạt động" : "Ngừng hợp tác"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-start gap-1.5">
                        <button
                          onClick={() => {
                            setEditingSupplier(s);
                            setEditOpen(true);
                          }}
                          title="Cập nhật nhà cung cấp"
                          className="h-8 flex items-center gap-1.5 px-3 rounded-lg text-[11px] font-bold text-white bg-[#00285E] hover:brightness-125 active:scale-[0.97] transition-all whitespace-nowrap"
                        >
                          <Pencil size={13} />
                          Cập nhật
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
                  Thêm nhà cung cấp
                </h3>
                <button
                  onClick={() => setCreateOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <Field label="Tên nhà cung cấp">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputCls}
                    placeholder="VD: Công ty TNHH Phụ tùng Minh Anh"
                  />
                </Field>
                <Field label="Số điện thoại">
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputCls}
                    placeholder="VD: 0901 234 567"
                  />
                </Field>
                <Field label="Địa chỉ">
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    className={`${inputCls} resize-y min-h-[80px]`}
                    placeholder="VD: 123 Đường Lê Văn Việt, Quận 9, TP.HCM"
                  />
                </Field>
                <label className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 cursor-pointer">
                  <div>
                    <span className="text-sm font-bold text-slate-700 block">
                      Đang hợp tác
                    </span>
                    <span className="text-xs text-slate-400">
                      Nhà cung cấp ngừng hợp tác sẽ không hiện khi tạo phiếu
                      nhập.
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
                  onClick={handleCreateSupplier}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#00285E] text-white hover:bg-[#082245] transition-colors shadow-md shadow-[#00285E]/10"
                >
                  Thêm nhà cung cấp
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL SỬA ── */}
      <AnimatePresence>
        {editOpen && editingSupplier && (
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
                  Sửa nhà cung cấp
                </h3>
                <button
                  onClick={() => setEditOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <Field label="Tên nhà cung cấp">
                  <input
                    value={editingSupplier?.name}
                    onChange={(e) =>
                      setEditingSupplier({
                        ...editingSupplier,
                        name: e.target.value,
                      })
                    }
                    className={inputCls}
                    placeholder="VD: Công ty TNHH Phụ tùng Minh Anh"
                  />
                </Field>
                <Field label="Số điện thoại">
                  <input
                    value={editingSupplier?.phone}
                    onChange={(e) =>
                      setEditingSupplier({
                        ...editingSupplier,
                        phone: e.target.value,
                      })
                    }
                    className={inputCls}
                    placeholder="VD: 0901 234 567"
                  />
                </Field>
                <Field label="Địa chỉ">
                  <textarea
                    value={editingSupplier?.address}
                    onChange={(e) =>
                      setEditingSupplier({
                        ...editingSupplier,
                        address: e.target.value,
                      })
                    }
                    rows={3}
                    className={`${inputCls} resize-y min-h-[80px]`}
                    placeholder="VD: 123 Đường Lê Văn Việt, Quận 9, TP.HCM"
                  />
                </Field>
                <label className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 cursor-pointer">
                  <div>
                    <span className="text-sm font-bold text-slate-700 block">
                      Đang hợp tác
                    </span>
                    <span className="text-xs text-slate-400">
                      Nhà cung cấp ngừng hợp tác sẽ không hiện khi tạo phiếu
                      nhập.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingSupplier({
                        ...editingSupplier,
                        is_active: !editingSupplier.is_active,
                      })
                    }
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${editingSupplier.is_active ? "bg-[#00285E]" : "bg-slate-300"}`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${editingSupplier.is_active ? "left-[22px]" : "left-0.5"}`}
                    ></span>
                  </button>
                </label>
              </div>
              <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() =>
                    setEditingSupplier({
                      ...editingSupplier,
                      is_active: !editingSupplier.is_active,
                    })
                  }
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleUpdateSupplier}
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
