import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Search,
  Filter,
  Plus,
  Trash2,
  X,
  AlertTriangle,
  FileText,
  Loader2,
  ChevronDown,
} from 'lucide-react';

const PAGE_SIZE = 6;
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useFetchClient_v2 } from '../../../hook/useFetchClient';
import { TECHNICAL_DOCUMENT_API_ENDPOINTS } from '../../../constants/admin/technicalDocumentApiEndpoint';

interface VehicleMake {
  id: number;
  make_name: string;
}

interface TechnicalDocument {
  id: number;
  title: string;
  make_id: number;
  file_url: string;
  status: 'PROCESSING' | 'READY' | 'FAILED';
  error_message: string | null;
  uploaded_by: number | null;
  createdAt: string;
  make?: VehicleMake;
}

const STATUS_LABEL: Record<TechnicalDocument['status'], string> = {
  PROCESSING: 'Đang xử lý',
  READY: 'Sẵn sàng',
  FAILED: 'Lỗi xử lý',
};

const STATUS_CLASS: Record<TechnicalDocument['status'], string> = {
  PROCESSING: 'bg-amber-50 text-amber-600 border-amber-100',
  READY: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  FAILED: 'bg-rose-50 text-rose-600 border-rose-100',
};

export default function AdminTechnicalDocuments() {
  const navigate = useNavigate();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  }>();

  const { fetchPrivate, fetchPrivateForm } = useFetchClient_v2();

  const [documents, setDocuments] = useState<TechnicalDocument[]>([]);
  const [makes, setMakes] = useState<VehicleMake[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [makeFilter, setMakeFilter] = useState<'ALL' | number>('ALL');
  const [page, setPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<TechnicalDocument | null>(null);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchPrivate(TECHNICAL_DOCUMENT_API_ENDPOINTS.LIST_TECHNICAL_DOCUMENTS);
      if (response && response.success) {
        setDocuments(response.data as TechnicalDocument[]);
      } else {
        setDocuments([]);
      }
    } catch (error) {
      showToast((error as Error)?.message || 'Lỗi khi tải danh sách tài liệu kỹ thuật', 'warning');
    } finally {
      setIsLoading(false);
    }
  }, [fetchPrivate, showToast]);

  const loadMakes = useCallback(async () => {
    try {
      const response = await fetchPrivate(TECHNICAL_DOCUMENT_API_ENDPOINTS.LIST_VEHICLE_MAKES);
      if (response && response.success) {
        setMakes(response.data as VehicleMake[]);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách hãng xe', error);
    }
  }, [fetchPrivate]);

  useEffect(() => {
    void loadDocuments();
    void loadMakes();
  }, [loadDocuments, loadMakes]);

  const handleOpenCreate = () => {
    setIsModalOpen(true);
  };

  const handleSaveDocument = async (formData: FormData) => {
    try {
      const response = await fetchPrivateForm(
        TECHNICAL_DOCUMENT_API_ENDPOINTS.CREATE_TECHNICAL_DOCUMENT,
        'POST',
        formData
      );
      if (response && response.success) {
        showToast('Tải lên tài liệu kỹ thuật thành công.', 'success');
        void loadDocuments();
        setIsModalOpen(false);
      }
    } catch (error) {
      showToast((error as Error)?.message || 'Lỗi khi tải lên tài liệu kỹ thuật', 'warning');
    }
  };

  const handleViewPdf = async (doc: TechnicalDocument) => {
    try {
      const response = await fetchPrivate<{ url: string }>(
        TECHNICAL_DOCUMENT_API_ENDPOINTS.GET_VIEW_URL(doc.id)
      );
      if (response && response.success && response.data?.url) {
        window.open(response.data.url, '_blank', 'noopener,noreferrer');
      } else {
        showToast('Không lấy được đường dẫn xem PDF', 'warning');
      }
    } catch (error) {
      showToast((error as Error)?.message || 'Lỗi khi mở file PDF', 'warning');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingDoc) return;
    setDeletingId(deletingDoc.id);
    try {
      const response = await fetchPrivate(
        TECHNICAL_DOCUMENT_API_ENDPOINTS.DELETE_TECHNICAL_DOCUMENT(deletingDoc.id),
        'DELETE'
      );
      if (response && response.success) {
        showToast('Đã xóa tài liệu kỹ thuật.', 'success');
        setDeletingDoc(null);
        void loadDocuments();
      }
    } catch (error) {
      showToast((error as Error)?.message || 'Lỗi khi xóa tài liệu kỹ thuật', 'warning');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.make?.make_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMake = makeFilter === 'ALL' || doc.make_id === makeFilter;
      return matchesSearch && matchesMake;
    });
  }, [documents, searchQuery, makeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredDocuments.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* TITLE BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(-1)}
            title="Quay lại"
            className="mt-0.5 w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-[#00285E] border border-[#00285E] text-white hover:bg-[#003C7D] hover:border-[#003C7D] active:scale-[0.97] transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2">
              Tài liệu kỹ thuật theo hãng xe
            </h1>
            <p className="text-slate-500 text-sm">
              Tải lên tài liệu kỹ thuật (PDF) theo từng hãng xe để AI tham khảo khi kỹ thuật viên chẩn đoán, sửa chữa.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#00285E] hover:bg-[#062047] text-white rounded-xl text-sm font-bold shadow-md shadow-[#00285E]/15 transition-all transform hover:translate-y-[-1px]"
        >
          <Plus size={16} />
          <span>Tải lên tài liệu mới</span>
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tiêu đề hoặc hãng xe..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Filter size={14} /> Lọc:
          </div>

          <select
            value={makeFilter}
            onChange={(e) => { setMakeFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)); setPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 cursor-pointer"
          >
            <option value="ALL">Tất cả hãng xe</option>
            {makes.map((m) => (
              <option key={m.id} value={m.id}>{m.make_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* DOCUMENT TABLE */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-bold text-white uppercase tracking-widest bg-[#00285E]">
                <th className="py-5 px-6">Tiêu đề</th>
                <th className="py-5 px-4">Hãng xe</th>
                <th className="py-5 px-4">File PDF</th>
                <th className="py-5 px-4 text-center">Trạng thái</th>
                <th className="py-5 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                    Đang tải danh sách tài liệu kỹ thuật...
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                    Chưa có tài liệu kỹ thuật nào phù hợp.
                  </td>
                </tr>
              ) : (
                pageItems.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors group"
                  >
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-800 text-sm block">{doc.title}</span>
                      <span className="text-[10px] text-slate-400">
                        Tải lên: {new Date(doc.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                      {doc.status === 'FAILED' && doc.error_message && (
                        <span className="text-[10px] text-rose-500 block mt-0.5 max-w-xs truncate" title={doc.error_message}>
                          {doc.error_message}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <span className="text-xs font-semibold text-slate-600">
                        {doc.make?.make_name || '—'}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <button
                        type="button"
                        onClick={() => handleViewPdf(doc)}
                        className="inline-flex items-center gap-1.5 text-xs text-[#00285E] hover:underline font-bold bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg cursor-pointer"
                      >
                        <FileText size={14} className="text-amber-600" />
                        <span>Xem PDF</span>
                      </button>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_CLASS[doc.status]}`}>
                        {doc.status === 'PROCESSING' && <Loader2 size={11} className="animate-spin" />}
                        {STATUS_LABEL[doc.status]}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setDeletingDoc(doc)}
                          disabled={deletingId === doc.id}
                          className="p-2 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
                          title="Xóa tài liệu"
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
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            Hiển thị {pageItems.length} trên {filteredDocuments.length} tài liệu
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            <span className="text-sm font-semibold text-slate-600">{safePage} / {totalPages}</span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Tiếp
            </button>
          </div>
        </div>
      </div>

      {/* UPLOAD FORM MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <TechnicalDocumentFormModal
            makes={makes}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveDocument}
          />
        )}
      </AnimatePresence>

      {/* MODAL XÁC NHẬN XÓA */}
      <AnimatePresence>
        {deletingDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => deletingId === null && setDeletingDoc(null)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-5 flex items-start gap-4">
                <div className="w-11 h-11 shrink-0 rounded-xl bg-rose-50 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-rose-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-800 text-base">Xóa tài liệu kỹ thuật?</h3>
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                    Tài liệu{' '}
                    <span className="font-semibold text-slate-700">"{deletingDoc.title}"</span>{' '}
                    sẽ bị xóa khỏi hệ thống cùng toàn bộ dữ liệu đã lập chỉ mục cho AI. Hành động
                    này không thể hoàn tác.
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeletingDoc(null)}
                  disabled={deletingId !== null}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  onClick={() => void handleConfirmDelete()}
                  disabled={deletingId !== null}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingId !== null && <Loader2 size={15} className="animate-spin" />}
                  Xóa tài liệu
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── TECHNICAL DOCUMENT FORM MODAL ────────────────────────────────────────────
interface TechnicalDocumentFormModalProps {
  makes: VehicleMake[];
  onClose: () => void;
  onSave: (formData: FormData) => void;
}

function TechnicalDocumentFormModal({ makes, onClose, onSave }: TechnicalDocumentFormModalProps) {
  const [title, setTitle] = useState('');
  const [makeId, setMakeId] = useState<number | ''>('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMakeOpen, setIsMakeOpen] = useState(false);
  const [makeSearch, setMakeSearch] = useState('');

  const selectedMakeName = makes.find((m) => m.id === makeId)?.make_name || '';
  const filteredMakes = makes.filter((m) => m.make_name.toLowerCase().includes(makeSearch.toLowerCase()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tiêu đề tài liệu.');
      return;
    }
    if (!makeId) {
      setErrorMsg('Vui lòng chọn hãng xe.');
      return;
    }
    if (!pdfFile) {
      setErrorMsg('Vui lòng chọn file PDF.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('make_id', String(makeId));
    formData.append('pdf_document', pdfFile);

    await onSave(formData);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200/60 w-full max-w-lg overflow-hidden z-10"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-[#00285E] tracking-tight">
              Tải lên tài liệu kỹ thuật
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hệ thống sẽ tự động trích xuất nội dung để AI tham khảo khi tư vấn kỹ thuật viên.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Tiêu đề tài liệu *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Vd: Sổ tay bảo trì Vinfast VF8"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
            />
          </div>

          <div className="relative">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Hãng xe *
            </label>
            <button
              type="button"
              onClick={() => setIsMakeOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
            >
              <span className={selectedMakeName ? 'text-slate-800' : 'text-slate-400'}>
                {selectedMakeName || 'Chọn hãng xe...'}
              </span>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${isMakeOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMakeOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => { setIsMakeOpen(false); setMakeSearch(''); }} />
                <div className="absolute left-0 right-0 top-full mt-1.5 z-20 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        autoFocus
                        value={makeSearch}
                        onChange={(e) => setMakeSearch(e.target.value)}
                        placeholder="Tìm hãng xe..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E]"
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredMakes.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-slate-400 text-center">Không tìm thấy hãng xe.</div>
                    ) : (
                      filteredMakes.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => { setMakeId(m.id); setIsMakeOpen(false); setMakeSearch(''); }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors ${makeId === m.id ? 'text-[#00285E] bg-slate-50' : 'text-slate-700'}`}
                        >
                          {m.make_name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              File PDF *
            </label>
            <label className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-100 transition-all">
              <FileText className={pdfFile ? 'text-amber-500' : 'text-slate-300'} size={22} />
              <span className="text-xs font-bold text-slate-600 truncate">
                {pdfFile ? pdfFile.name : 'Chọn file PDF...'}
              </span>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setPdfFile(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>

          {errorMsg && (
            <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2 flex items-center gap-1.5">
              <AlertTriangle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#F9A11B] text-[#00285E] rounded-xl text-sm font-bold shadow-md shadow-[#F9A11B]/20 hover:bg-[#E08F12] transition-all cursor-pointer disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {isSubmitting ? 'Đang tải lên...' : 'Tải lên'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
