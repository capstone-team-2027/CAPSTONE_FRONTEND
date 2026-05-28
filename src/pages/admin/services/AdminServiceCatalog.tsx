import { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Package,
  TrendingUp,
  Boxes,
  Filter,
  Pencil,
  Trash2,
  X,
  Wrench,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { type Category, type ServiceCatalog } from "../../../model/dto/serviceCatalog.dto";
import { useFetchClient } from '../../../hook/useFetchClient';
import { SERVICE_CATALOG_API_ENDPOINTS } from '../../../constants/admin/serviceCatalogApiEndPoint';
const formatPrice = (price: number) => `${price.toLocaleString("vi-VN")}đ`;

export default function AdminServiceManagement() {
  const { searchQuery, showToast } = useOutletContext<{
    searchQuery: string;
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();
  const { fetchPrivate } = useFetchClient();
  const [services, setServices] = useState<ServiceCatalog[]>([]);
  const [editingService, setEditingService] = useState<ServiceCatalog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

 const handleGetServiceCatalog = async () => {
    try {
        const result = await fetchPrivate<ServiceCatalog[]>(
            SERVICE_CATALOG_API_ENDPOINTS.SERVICE_CATALOG, 
            'GET'
        );
        setServices(result.data);
        console.log("result ", result)
    } catch (error) {
        console.error('Lỗi lấy danh sách dịch vụ:', error);
        showToast('Không thể tải danh sách dịch vụ', 'warning');
    }
};
  useEffect(() => {
      handleGetServiceCatalog();
  }, []);


  const handleOpenCreate = () => {
    setEditingService(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (service: ServiceCatalog) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* TITLE BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2">
            Quản lý Dịch vụ
          </h1>
          <p className="text-slate-500 text-sm">
            Tối ưu hóa các gói dịch vụ và bảo dưỡng của gara.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-[#00285E] text-[#00285E] rounded text-sm font-bold hover:bg-[#EDF3FF] transition-all"
          >
            <span>Thêm dịch vụ mới</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#F9A11B] text-[#00285E] rounded text-sm font-bold shadow-md shadow-[#F9A11B]/20 hover:bg-[#E08F12] transition-all transform hover:translate-y-[-1px]"
          >
            <FileSpreadsheet size={16} />
            <span>Import Excel</span>
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <motion.div
          whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}
          className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4 cursor-pointer transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Package size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              Tổng dịch vụ
            </span>
            <span className="text-2xl font-bold text-slate-900 tracking-tight block">
              {services.length}
            </span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}
          className="bg-white p-6 rounded-2xl border-2 border-[#F9A11B] shadow-xs flex items-center gap-4 cursor-pointer transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-[#F9A11B]">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              Phổ biến nhất
            </span>
            <span className="text-base font-bold text-slate-900 tracking-tight block">
              Thay nhớt & Lọc dầu
            </span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}
          className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4 cursor-pointer transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Boxes size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              Gói Combo đang hoạt động
            </span>
            <span className="text-2xl font-bold text-slate-900 tracking-tight block">
              12 Gói
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
            onClick={() => showToast("Mở bộ lọc nâng cao...", "info")}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600"
          >
            <Filter size={16} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-y border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th className="py-4 px-6">Tên dịch vụ</th>
                <th className="py-4 px-4">Phân loại</th>
                <th className="py-4 px-4">Mô tả</th>
                <th className="py-4 px-4">Giá</th>
                <th className="py-4 px-4">Thời gian dự kiến</th>
                <th className="py-4 px-4">Trạng thái</th>
                <th className="py-4 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {services.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-slate-400 text-sm"
                  >
                    Không tìm thấy dịch vụ phù hợp...
                  </td>
                </tr>
              ) : (
                services.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors group"
                  >
                    <td className="py-4 px-6">
                      <span className="font-bold text-[#00285E] text-sm block">
                        {s.service_name}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wide uppercase `}
                      >
                        {s.category.category_name}
                      </span>
                    </td>
                      <td className="py-4 px-4 text-slate-600 text-sm">
                      {s.description} 
                    </td>

                  <td className="py-4 px-4 text-slate-600 text-sm">
                     300.000
                    </td>
                    <td className="py-4 px-4 text-slate-600 text-sm">
                      {s.estimated_duration} phút
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          s.is_active
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {s.is_active ? "Hoạt động" : "Tạm dừng"}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-2 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Pencil size={16} />
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

      {/* MODAL CREATE / EDIT */}
      {isModalOpen && (
        <ServiceFormModal
          initial={editingService}
          onClose={() => {
            setIsModalOpen(false);
            setEditingService(null);
          }}
          onRefresh={handleGetServiceCatalog}
        />
      )}

      {/* MODAL IMPORT EXCEL */}
      {isImportModalOpen && (
        <ImportExcelModal
          onClose={() => setIsImportModalOpen(false)}
          onImported={(count) => {
            setIsImportModalOpen(false);
            showToast(`Đã nhập ${count} dịch vụ từ file Excel`, "success");
          }}
        />
      )}
    </div>
  );
}

interface ServiceFormModalProps {
  initial: ServiceCatalog | null;
  onClose: () => void;
  onSubmit?: (data: Omit<ServiceCatalog, "id">) => void;
  onRefresh: () => void;

}

function ServiceFormModal({ initial, onClose, onRefresh }: ServiceFormModalProps) {
    const isEdit = !!initial;
  const { fetchPrivate } = useFetchClient();
  const [name, setName] = useState(initial?.service_name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState<number>(initial?.category_id ?? 0);
  const [durationMinutes, setDurationMinutes] = useState<number>(initial?.estimated_duration ?? 30);
  const [isActive, setIsActive] = useState<boolean>(initial?.is_active ?? true);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleGetCategory = async () => {
    try {
      const result = await fetchPrivate(SERVICE_CATALOG_API_ENDPOINTS.SERVICE_CATEGORY)
      setCategoryList(result.data)
    } catch (error) {
      console.error("Lỗi lấy danh sách danh mục", error);
    }
  }
   useEffect(() => {
    handleGetCategory();
  }, []);

  const handleCreateServiceCatalog = async () => {
    try {
        await fetchPrivate(
        SERVICE_CATALOG_API_ENDPOINTS.SERVICE_CATALOG, 
        'POST',
        {
          category_id: categoryId,
          service_name: name,
          description: description,
          estimated_duration: durationMinutes,
          is_active: isActive
        }
      )
      setSuccessMsg("Tạo nhân sự thành công!");
      onRefresh();
      onClose();
    } catch (error: any) {
      console.error("Lỗi lấy danh sách vai trò:", error);
      setErrorMsg(error?.message || "Cập nhật nhân sự thất bại, vui lòng thử lại");
    }
  }; 
  
  const handleUpdateServiceCatalog = async () => {
      try {
          await fetchPrivate(
            `${SERVICE_CATALOG_API_ENDPOINTS.SERVICE_CATALOG}/${initial?.id}`,
            "PATCH",
            { 
              category_id: categoryId,
              service_name: name, 
              description: description,
              estimated_duration: durationMinutes,
              is_active: isActive
            }
          );
        setSuccessMsg("Cập nhật thông tin dịch vụ thành công!");
        onRefresh();
        onClose();
      } catch (error: any) {
        console.error("Lỗi lấy danh sách vai trò:", error);
        setErrorMsg(error?.message || "Cập nhật thông tin nhân sự thất bại, vui lòng thử lại");
      }
    }; 
  

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white rounded shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden"
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              {initial ? "Chỉnh sửa dịch vụ" : "Thêm dịch vụ mới"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tạo dịch vụ riêng lẻ với mức giá và thời gian chuẩn của gara.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY 2 COLUMNS */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
          {/* LEFT COLUMN: ILLUSTRATION & TIPS */}
          <div className="md:col-span-2 bg-[#EDF3FF] p-6 flex flex-col gap-4 border-r border-slate-100">
            <div className="flex items-center gap-2 text-[#00285E]">
              <div className="w-9 h-9 rounded bg-[#00285E] flex items-center justify-center shrink-0">
                <Wrench size={16} className="text-[#F9A11B]" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Dịch vụ chuẩn gara</h3>
                <p className="text-[11px] text-slate-500">
                  Mô tả rõ để khách dễ chọn.
                </p>
              </div>
            </div>

            <div className="relative aspect-square rounded-md overflow-hidden shadow-2xl border border-white/10 group flex-1">
              <img
                src="/images/Service-Image.png"
                alt="Garage service"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
            </div>
          </div>

          {/* RIGHT COLUMN: FORM */}
          <div className="md:col-span-3 p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Tên dịch vụ
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Vd: Thay nhớt động cơ toàn diện"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Mô tả
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Vd: Bao gồm dầu tổng hợp 4L, lọc dầu chính hãng, kiểm tra tổng quát."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Danh mục
                </label>
              <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                >
                  <option value={0} disabled>-- Chọn danh mục --</option>
                  {categoryList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Thời gian (phút)
                </label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  min={0}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                />
              </div>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#00285E] focus:ring-[#00285E]/20"
              />
              <span className="text-sm font-semibold text-slate-700">
                Kích hoạt dịch vụ
              </span>
            </label>
          </div>
        </div>
              {errorMsg && (
              <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded px-3 py-2">
                {errorMsg}
              </div>
            )}
            
          {successMsg && (
            <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-3 py-2">
              {successMsg}
            </div>
          )}
        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-slate-200 rounded text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Hủy
          </button>
          <button          
            onClick={isEdit ? handleUpdateServiceCatalog : handleCreateServiceCatalog}
            className="px-6 py-2.5 bg-[#F9A11B] text-[#00285E] rounded text-sm font-bold shadow-md shadow-[#F9A11B]/20 hover:bg-[#E08F12] transition-all">
            {initial ? "Lưu thay đổi" : "Tạo dịch vụ"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface ImportExcelModalProps {
  onClose: () => void;
  onImported: (count: number) => void;
}

function ImportExcelModal({ onClose, onImported }: ImportExcelModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleSelectFile = (selected: File | null) => {
    if (!selected) return;
    const validTypes = [".xlsx", ".xls", ".csv"];
    const ext = "." + selected.name.split(".").pop()?.toLowerCase();
    if (!validTypes.includes(ext)) {
      alert("Vui lòng chọn file Excel (.xlsx, .xls) hoặc CSV (.csv)");
      return;
    }
    setFile(selected);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleSelectFile(dropped);
  };

  const handleImport = () => {
    if (!file) return;
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      onImported(Math.floor(Math.random() * 20) + 5);
    }, 1500);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white rounded shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden"
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-emerald-50 flex items-center justify-center text-emerald-600">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                Nhập danh sách dịch vụ từ Excel
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Hỗ trợ định dạng .xlsx, .xls và .csv
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-4">
          {/* Download template link */}
          <div className="flex items-center justify-between p-4 bg-blue-50/50 border border-blue-100 rounded">
            <div className="flex items-center gap-3">
              <Download size={18} className="text-[#00285E]" />
              <div>
                <span className="text-sm font-bold text-slate-800 block">
                  Chưa có mẫu file?
                </span>
                <span className="text-xs text-slate-500">
                  Tải template Excel chuẩn để nhập dữ liệu đúng định dạng.
                </span>
              </div>
            </div>
            <button
              onClick={() => alert("Tải file mẫu (chưa hỗ trợ trong demo).")}
              className="px-4 py-2 bg-white border border-[#00285E] text-[#00285E] rounded text-xs font-bold hover:bg-[#EDF3FF] transition-colors shrink-0"
            >
              Tải mẫu
            </button>
          </div>

          {/* Drag & drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative rounded border-2 border-dashed transition-all ${
              isDragging
                ? "border-[#F9A11B] bg-amber-50/50"
                : "border-slate-300 bg-slate-50/50 hover:border-slate-400"
            }`}
          >
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => handleSelectFile(e.target.files?.[0] ?? null)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="p-8 flex flex-col items-center text-center pointer-events-none">
              {file ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3">
                    <CheckCircle2 size={26} />
                  </div>
                  <span className="text-sm font-bold text-slate-800">
                    {file.name}
                  </span>
                  <span className="text-xs text-slate-500 mt-1">
                    {formatSize(file.size)} • Sẵn sàng để nhập
                  </span>
                  <span className="text-[11px] text-slate-400 mt-3">
                    Bấm vùng này để chọn file khác
                  </span>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-[#EDF3FF] flex items-center justify-center text-[#00285E] mb-3">
                    <Upload size={24} />
                  </div>
                  <span className="text-sm font-bold text-slate-800">
                    Kéo & thả file vào đây
                  </span>
                  <span className="text-xs text-slate-500 mt-1">
                    hoặc bấm để chọn từ máy tính
                  </span>
                  <span className="text-[11px] text-slate-400 mt-3">
                    Dung lượng tối đa: 5 MB
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Hint about columns */}
          <div className="text-xs text-slate-500 leading-relaxed bg-amber-50/40 border border-amber-100 rounded p-3">
            <span className="font-bold text-[#C27803]">Lưu ý:</span> File phải
            có các cột:{" "}
            <span className="font-semibold text-slate-700">
              Tên dịch vụ, Mô tả, Danh mục, Giá, Thời gian (phút), Trạng thái
            </span>
            .
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-5 py-2.5 bg-white border border-slate-200 rounded text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={handleImport}
            disabled={!file || isUploading}
            className="px-6 py-2.5 bg-[#F9A11B] text-[#00285E] rounded text-sm font-bold shadow-md shadow-[#F9A11B]/20 hover:bg-[#E08F12] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <span className="w-4 h-4 border-2 border-[#00285E]/30 border-t-[#00285E] rounded-full animate-spin" />
                <span>Đang nhập...</span>
              </>
            ) : (
              <>
                <Upload size={16} />
                <span>Nhập dữ liệu</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
