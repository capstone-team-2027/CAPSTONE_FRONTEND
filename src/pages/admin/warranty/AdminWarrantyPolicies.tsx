import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Search,
  Filter,
  Plus,
  Pencil,
  X,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useFetchClient } from '../../../hook/useFetchClient';
import { WARRANTY_POLICIES_API_ENDPOINTS } from '../../../constants/admin/warrantyPoliciesApiEndpoint';

interface WarrantyPolicy {
  id: number;
  policy_code: string;
  policy_name: string;
  image_cover_url: string | null;
  pdf_document_url: string | null;
  description: string | null;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminWarrantyPolicies() {
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  }>();

  const { fetchPrivate, fetchPrivateForm } = useFetchClient();

  const [policies, setPolicies] = useState<WarrantyPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<WarrantyPolicy | null>(null);

  // Load policies from Backend API
  const loadPolicies = async () => {
    setIsLoading(true);
    try {
      const response = await fetchPrivate(WARRANTY_POLICIES_API_ENDPOINTS.LIST_WARRANTY_POLICIES);
      if (response && response.success) {
        setPolicies(response.data);
      } else {
        setPolicies([]);
      }
    } catch (error: any) {
      showToast(error.message || 'Lỗi khi tải danh sách chính sách bảo hành', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const handleOpenCreate = () => {
    setEditingPolicy(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (policy: WarrantyPolicy) => {
    setEditingPolicy(policy);
    setIsModalOpen(true);
  };

  const handleSavePolicy = async (formData: FormData) => {
    try {
      if (editingPolicy) {
        const response = await fetchPrivateForm(
          WARRANTY_POLICIES_API_ENDPOINTS.UPDATE_WARRANTY_POLICY(editingPolicy.id),
          'PUT',
          formData
        );
        if (response && response.success) {
          showToast('Cập nhật chính sách bảo hành thành công.', 'success');
          loadPolicies();
          setIsModalOpen(false);
          setEditingPolicy(null);
        }
      } else {
        const response = await fetchPrivateForm(
          WARRANTY_POLICIES_API_ENDPOINTS.CREATE_WARRANTY_POLICY,
          'POST',
          formData
        );
        if (response && response.success) {
          showToast('Chính sách bảo hành đã được tạo thành công.', 'success');
          loadPolicies();
          setIsModalOpen(false);
          setEditingPolicy(null);
        }
      }
    } catch (error: any) {
      showToast(error.message || 'Lỗi lưu thông tin chính sách bảo hành', 'warning');
    }
  };

  const handleToggleStatus = async (policy: WarrantyPolicy) => {
    try {
      const updatedStatus = !policy.is_active;
      const response = await fetchPrivate(
        WARRANTY_POLICIES_API_ENDPOINTS.UPDATE_WARRANTY_POLICY(policy.id),
        'PUT',
        {
          policy_code: policy.policy_code,
          policy_name: policy.policy_name,
          image_cover_url: policy.image_cover_url,
          pdf_document_url: policy.pdf_document_url,
          description: policy.description,
          is_active: updatedStatus,
        }
      );
      if (response && response.success) {
        showToast(`Đã ${updatedStatus ? 'kích hoạt' : 'tạm dừng'} chính sách bảo hành thành công.`, 'success');
        loadPolicies();
      }
    } catch (error: any) {
      showToast(error.message || 'Lỗi thay đổi trạng thái chính sách', 'warning');
    }
  };

  // Filter list
  const filteredPolicies = useMemo(() => {
    return policies.filter((p) => {
      const matchesSearch =
        p.policy_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.policy_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && p.is_active) ||
        (statusFilter === 'INACTIVE' && !p.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [policies, searchQuery, statusFilter]);

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* TITLE BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2 flex items-center gap-2">
            <ShieldCheck className="text-amber-500" size={28} />
            Quản lý Chính sách Bảo hành
          </h1>
          <p className="text-slate-500 text-sm">
            Tạo và thiết lập các chính sách bảo hành áp dụng cho các phụ tùng hoặc dịch vụ trong gara.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#00285E] hover:bg-[#062047] text-white rounded-xl text-sm font-bold shadow-md shadow-[#00285E]/15 transition-all transform hover:translate-y-[-1px]"
        >
          <Plus size={16} />
          <span>Tạo chính sách mới</span>
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên, mã hoặc điều khoản..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold"
          />
        </div>

        {/* Filters dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Filter size={14} /> Lọc:
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Tạm dừng</option>
          </select>
        </div>
      </div>

      {/* POLICY TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-y border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th className="py-4.5 px-6">Mã chính sách</th>
                <th className="py-4.5 px-6">Tên chính sách</th>
                <th className="py-4.5 px-4">Ảnh</th>
                <th className="py-4.5 px-4">Tài liệu PDF</th>
                <th className="py-4.5 px-6">Tóm tắt điều kiện / ghi chú</th>
                <th className="py-4.5 px-4 text-center">Trạng thái</th>
                <th className="py-4.5 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                    Đang tải dữ liệu chính sách bảo hành...
                  </td>
                </tr>
              ) : filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                    Không tìm thấy chính sách bảo hành nào phù hợp...
                  </td>
                </tr>
              ) : (
                filteredPolicies.map((policy) => (
                  <tr
                    key={policy.id}
                    className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors group"
                  >
                    <td className="py-4 px-6 font-bold text-[#00285E] text-xs whitespace-nowrap">
                      <span className="bg-slate-100 text-[#00285E] border border-slate-200 px-2 py-1 rounded inline-block whitespace-nowrap">
                        {policy.policy_code}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-800 text-sm block">
                        {policy.policy_name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Cập nhật: {new Date(policy.updatedAt).toLocaleDateString('vi-VN')}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      {policy.image_cover_url ? (
                        <img
                          src={policy.image_cover_url}
                          alt="Cover"
                          className="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-xs"
                        />
                      ) : (
                        <span className="text-slate-400 text-xs italic">Chưa cập nhật</span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      {policy.pdf_document_url ? (
                        <a
                          href={policy.pdf_document_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-[#00285E] hover:underline font-bold bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg"
                        >
                          <FileText size={14} className="text-amber-600" />
                          <span>Tải PDF</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Chưa cập nhật</span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-xs text-slate-500 max-w-xs truncate" title={policy.description || ''}>
                      {policy.description || '—'}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(policy)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${policy.is_active
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                      >
                        {policy.is_active ? 'Hoạt động' : 'Tạm dừng'}
                      </button>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(policy)}
                          className="p-2 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
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

      {/* POLICY FORM MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <WarrantyFormModal
            initial={editingPolicy}
            policies={policies}
            onClose={() => {
              setIsModalOpen(false);
              setEditingPolicy(null);
            }}
            onSave={handleSavePolicy}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── WARRANTY FORM MODAL ──────────────────────────────────────────────────────
interface WarrantyFormModalProps {
  initial: WarrantyPolicy | null;
  policies: WarrantyPolicy[];
  onClose: () => void;
  onSave: (formData: FormData) => void;
}

function WarrantyFormModal({ initial, policies, onClose, onSave }: WarrantyFormModalProps) {
  const isEdit = !!initial;

  const [policyCode, setPolicyCode] = useState(initial?.policy_code ?? '');
  const [policyName, setPolicyName] = useState(initial?.policy_name ?? '');
  const imageCoverUrl = initial?.image_cover_url ?? '';
  const pdfDocumentUrl = initial?.pdf_document_url ?? '';
  const [description, setDescription] = useState(initial?.description ?? '');
  const [isActive, setIsActive] = useState<boolean>(initial?.is_active ?? true);

  const [imageCoverFile, setImageCoverFile] = useState<File | null>(null);
  const [pdfDocumentFile, setPdfDocumentFile] = useState<File | null>(null);

  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!policyCode.trim()) {
      setErrorMsg('Vui lòng nhập mã chính sách bảo hành.');
      return;
    }
    if (!policyName.trim()) {
      setErrorMsg('Vui lòng nhập tên chính sách bảo hành.');
      return;
    }

    // Check duplicate check
    const isDuplicate = policies.some(
      (p) => p.policy_code.toLowerCase() === policyCode.trim().toLowerCase() && p.id !== initial?.id
    );

    if (isDuplicate) {
      setErrorMsg(`Mã chính sách bảo hành "${policyCode}" đã tồn tại trên hệ thống.`);
      return;
    }

    // Clear error and save
    setErrorMsg('');

    const formData = new FormData();
    formData.append('policy_code', policyCode.trim().toUpperCase());
    formData.append('policy_name', policyName.trim());
    formData.append('description', description.trim() || '');
    formData.append('is_active', String(isActive));

    if (imageCoverFile) {
      formData.append('image_cover', imageCoverFile);
    } else {
      formData.append('image_cover_url', imageCoverUrl || '');
    }

    if (pdfDocumentFile) {
      formData.append('pdf_document', pdfDocumentFile);
    } else {
      formData.append('pdf_document_url', pdfDocumentUrl || '');
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200/60 w-full max-w-2xl overflow-hidden z-10"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-[#00285E] tracking-tight">
              {isEdit ? 'Cập nhật chính sách bảo hành' : 'Tạo chính sách bảo hành mới'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Thiết lập quy tắc hiển thị, ảnh banner và link điều khoản chi tiết dạng PDF.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[500px] overflow-y-auto">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Policy Code */}
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Mã chính sách *
              </label>
              <input
                type="text"
                value={policyCode}
                onChange={(e) => setPolicyCode(e.target.value)}
                disabled={isEdit}
                placeholder="Vd: WP-GENERAL-2026"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-bold text-slate-800 disabled:opacity-60"
              />
            </div>

            {/* Policy Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Tên chính sách bảo hành *
              </label>
              <input
                type="text"
                value={policyName}
                onChange={(e) => setPolicyName(e.target.value)}
                placeholder="Vd: Chính sách bảo hành chung Gara 2026"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* Media Inputs (Image Cover & PDF Link) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-slate-100 pt-5">
            {/* Image Cover File Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                Ảnh Banner / Ảnh bìa chính sách
              </label>

              <div className="flex items-center gap-4">
                {/* Preview Thumbnail */}
                <div className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex-shrink-0 flex items-center justify-center">
                  {imageCoverFile ? (
                    <img
                      src={URL.createObjectURL(imageCoverFile)}
                      alt="New preview"
                      className="w-full h-full object-cover"
                    />
                  ) : imageCoverUrl ? (
                    <img
                      src={imageCoverUrl}
                      alt="Current banner"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-slate-400 text-[10px] text-center px-1">Chưa có ảnh</span>
                  )}
                </div>

                <div className="flex-1">
                  <label className="inline-flex items-center justify-center px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer transition-all">
                    <span>Chọn tệp ảnh</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setImageCoverFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  {imageCoverFile && (
                    <p className="text-[10px] text-emerald-600 font-bold mt-1.5 truncate max-w-[200px]">
                      ✓ {imageCoverFile.name}
                    </p>
                  )}
                  {!imageCoverFile && imageCoverUrl && (
                    <p className="text-[10px] text-slate-400 font-medium mt-1.5 truncate max-w-[200px]">
                      Dùng ảnh hiện có
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* PDF File Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                Tài liệu PDF điều khoản pháp lý chi tiết
              </label>

              <div className="flex items-center gap-4">
                {/* PDF Icon Status */}
                <div className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex-shrink-0 flex items-center justify-center">
                  <FileText className={pdfDocumentFile || pdfDocumentUrl ? "text-amber-500 animate-pulse" : "text-slate-300"} size={28} />
                </div>

                <div className="flex-1">
                  <label className="inline-flex items-center justify-center px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer transition-all">
                    <span>Chọn tệp PDF</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setPdfDocumentFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  {pdfDocumentFile && (
                    <p className="text-[10px] text-emerald-600 font-bold mt-1.5 truncate max-w-[200px]">
                      ✓ {pdfDocumentFile.name}
                    </p>
                  )}
                  {!pdfDocumentFile && pdfDocumentUrl && (
                    <p className="text-[10px] text-slate-400 font-medium mt-1.5 truncate max-w-[200px]">
                      Dùng tài liệu hiện có
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description (Textarea) */}
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <FileText size={13} className="text-slate-400" />
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                Tóm tắt điều kiện (Khách đọc lướt trên điện thoại)
              </label>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Vd: Bảo hành lỗi kỹ thuật của gara trong vòng 12 tháng, không bảo hành do va đập hay ngập nước."
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800 resize-none"
            />
          </div>

          {/* Active checkbox */}
          <div className="flex items-center gap-2.5 pt-2 select-none">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4.5 h-4.5 rounded border-slate-300 text-[#00285E] focus:ring-[#00285E]/20 cursor-pointer"
            />
            <label htmlFor="isActive" className="text-sm font-semibold text-slate-700 cursor-pointer">
              Kích hoạt chính sách này (Hiển thị trên App)
            </label>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2 flex items-center gap-1.5">
              <AlertTriangle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-[#F9A11B] text-[#00285E] rounded-xl text-sm font-bold shadow-md shadow-[#F9A11B]/20 hover:bg-[#E08F12] transition-all cursor-pointer"
          >
            {isEdit ? 'Lưu thay đổi' : 'Tạo chính sách'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
