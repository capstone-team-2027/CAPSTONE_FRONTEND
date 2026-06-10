import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Plus, 
  Edit, 
  Trash2, 
  AlertCircle, 
  Wrench, 
  RefreshCw, 
  X, 
  Eye, 
  ToggleLeft, 
  ToggleRight,
  Database,
  Search,
  Activity,
  Cpu
} from 'lucide-react';
import { useFetchClient } from '../../../hook/useFetchClient';
import { SERVICE_BAYS_API_ENDPOINTS } from '../../../constants/admin/serviceBayApiEndPoint';

interface OutletContextType {
  showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
}

interface ServiceBay {
  id: number;
  bay_name: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'OFFLINE';
  is_active: boolean;
  current_service_order_id?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

interface WorkshopTool {
  id: number;
  tool_name: string;
  serial_number: string;
  bay_id: number | null;
  current_location: string;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'BROKEN';
  purchase_date: string;
  warranty_expiry: string;
}

export default function AdminResources() {
  const { showToast } = useOutletContext<OutletContextType>();
  const { fetchPrivate } = useFetchClient();

  // Navigation sub-tabs: 'bays' (Cầu sửa chữa), 'tools' (Thiết bị)
  const [activeSubTab, setActiveSubTab] = useState<'bays' | 'tools'>('bays');

  // Service Bays State
  const [serviceBays, setServiceBays] = useState<ServiceBay[]>([]);
  const [isLoadingBays, setIsLoadingBays] = useState(false);
  const [isBayModalOpen, setIsBayModalOpen] = useState(false);
  const [editingBay, setEditingBay] = useState<ServiceBay | null>(null);

  // Form fields for Service Bay Modal
  const [bayName, setBayName] = useState('');
  const [bayStatus, setBayStatus] = useState<'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'OFFLINE'>('AVAILABLE');
  const [bayIsActive, setBayIsActive] = useState(true);
  const [bayErrors, setBayErrors] = useState<Record<string, string>>({});

  // Filter & Search states for Service Bays
  const [searchBayQuery, setSearchBayQuery] = useState('');
  const [filterBayStatus, setFilterBayStatus] = useState<string>('all');

  // Tools Mock Data (Interactive state to let user fully experience the UX)
  const [workshopTools] = useState<WorkshopTool[]>([
    {
      id: 1,
      tool_name: 'Máy chẩn đoán lỗi ô tô OBD2 Autel Maxisys',
      serial_number: 'MS908S-202401',
      bay_id: 1,
      current_location: 'Cầu nâng số 1',
      status: 'IN_USE',
      purchase_date: '2024-01-15',
      warranty_expiry: '2026-01-15'
    },
    {
      id: 2,
      tool_name: 'Máy cân bằng bánh xe điện tử HPA B225',
      serial_number: 'HPA-B225-88902',
      bay_id: null,
      current_location: 'Khu vực lốp',
      status: 'AVAILABLE',
      purchase_date: '2023-08-10',
      warranty_expiry: '2025-08-10'
    },
    {
      id: 3,
      tool_name: 'Thiết bị hút xả ga điều hòa Robinair AC375',
      serial_number: 'ROB-AC375-7761',
      bay_id: 2,
      current_location: 'Cầu nâng số 2',
      status: 'IN_USE',
      purchase_date: '2024-02-20',
      warranty_expiry: '2026-02-20'
    },
    {
      id: 4,
      tool_name: 'Máy nén khí trục vít Jaguar 10HP',
      serial_number: 'JAG-10HP-5542',
      bay_id: null,
      current_location: 'Phòng kỹ thuật nguồn',
      status: 'MAINTENANCE',
      purchase_date: '2022-05-12',
      warranty_expiry: '2024-05-12'
    },
    {
      id: 5,
      tool_name: 'Súng bắn bu-lông Ingersoll Rand 1/2"',
      serial_number: 'IR-2235Q-9901',
      bay_id: 3,
      current_location: 'Cầu nâng số 3',
      status: 'AVAILABLE',
      purchase_date: '2023-11-05',
      warranty_expiry: '2024-11-05'
    }
  ]);
  const [searchToolQuery, setSearchToolQuery] = useState('');
  const [filterToolStatus, setFilterToolStatus] = useState<string>('all');

  // Helper to map frontend status to backend status
  const mapStatusToBackend = (status: string): 'available' | 'in_use' | 'maintenance' => {
    const s = status.toUpperCase();
    if (s === 'AVAILABLE') return 'available';
    if (s === 'OCCUPIED' || s === 'IN_USE') return 'in_use';
    if (s === 'MAINTENANCE') return 'maintenance';
    return 'available';
  };

  // Load Service Bays from API
  const loadServiceBays = async () => {
    setIsLoadingBays(true);
    try {
      const res = await fetchPrivate(SERVICE_BAYS_API_ENDPOINTS.LIST, 'GET');
      if (res.success && Array.isArray(res.data)) {
        // Normalize data if necessary
        const normalized = res.data.map((bay: any) => {
          let mappedStatus: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'OFFLINE' = 'AVAILABLE';
          const s = (bay.status || '').toLowerCase();
          if (s === 'available') mappedStatus = 'AVAILABLE';
          else if (s === 'in_use') mappedStatus = 'OCCUPIED';
          else if (s === 'maintenance') mappedStatus = 'MAINTENANCE';
          
          return {
            id: bay.id,
            bay_name: bay.bay_name,
            status: mappedStatus,
            is_active: bay.is_active !== false,
            current_service_order_id: bay.current_service_order_id
          };
        });
        setServiceBays(normalized);
      } else {
        showToast(res.message || 'Không lấy được danh sách cầu sửa chữa từ máy chủ.', 'warning');
      }
    } catch (err: any) {
      console.error('loadServiceBays error:', err);
      showToast(err.message || 'Lỗi kết nối khi tải danh sách cầu sửa chữa.', 'warning');
    } finally {
      setIsLoadingBays(false);
    }
  };

  useEffect(() => {
    loadServiceBays();
  }, []);

  // Validation logic for Service Bay
  const validateBayForm = () => {
    const errs: Record<string, string> = {};
    if (!bayName.trim()) {
      errs.bay_name = 'Tên cầu nâng không được bỏ trống';
    } else if (bayName.trim().length > 50) {
      errs.bay_name = 'Tên cầu nâng không được vượt quá 50 ký tự';
    }

    setBayErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Open creation modal
  const handleOpenCreateBay = () => {
    setEditingBay(null);
    setBayName('');
    setBayStatus('AVAILABLE');
    setBayIsActive(true);
    setBayErrors({});
    setIsBayModalOpen(true);
  };

  // Open edit modal
  const handleOpenEditBay = (bay: ServiceBay) => {
    setEditingBay(bay);
    setBayName(bay.bay_name);
    setBayStatus(bay.status);
    setBayIsActive(bay.is_active);
    setBayErrors({});
    setIsBayModalOpen(true);
  };

  // Create or Update Service Bay
  const handleSaveBay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateBayForm()) return;

    const bodyData = {
      bay_name: bayName.trim(),
      status: mapStatusToBackend(bayStatus),
      is_active: bayIsActive
    };

    try {
      if (editingBay) {
        // Edit Bay API
        const res = await fetchPrivate(SERVICE_BAYS_API_ENDPOINTS.UPDATE(editingBay.id), 'PUT', bodyData);
        if (res.success) {
          showToast('Cập nhật cầu nâng thành công!', 'success');
          loadServiceBays();
          setIsBayModalOpen(false);
        } else {
          showToast(res.message || 'Lỗi khi cập nhật cầu nâng.', 'warning');
        }
      } else {
        // Create Bay API
        const res = await fetchPrivate(SERVICE_BAYS_API_ENDPOINTS.CREATE, 'POST', bodyData);
        if (res.success) {
          showToast('Tạo mới cầu nâng thành công!', 'success');
          loadServiceBays();
          setIsBayModalOpen(false);
        } else {
          showToast(res.message || 'Lỗi khi tạo mới cầu nâng.', 'warning');
        }
      }
    } catch (err: any) {
      console.error('handleSaveBay error:', err);
      showToast(err.message || 'Lỗi kết nối khi lưu thông tin cầu nâng.', 'warning');
    }
  };

  // Toggle active status directly
  const handleToggleActiveBay = async (bay: ServiceBay) => {
    try {
      const bodyData = {
        bay_name: bay.bay_name,
        status: mapStatusToBackend(bay.status),
        is_active: !bay.is_active
      };
      const res = await fetchPrivate(SERVICE_BAYS_API_ENDPOINTS.UPDATE(bay.id), 'PUT', bodyData);
      if (res.success) {
        showToast(
          `Cầu nâng đã được ${!bay.is_active ? 'kích hoạt' : 'tạm ngưng'} hoạt động.`,
          'success'
        );
        loadServiceBays();
      } else {
        showToast(res.message || 'Không thể cập nhật trạng thái hoạt động.', 'warning');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Có lỗi xảy ra khi cập nhật trạng thái hoạt động.', 'warning');
    }
  };

  // Delete Service Bay (Soft delete setting active to false)
  const handleDeleteBay = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn ngừng hoạt động/xóa cầu sửa chữa này không?')) return;

    try {
      const res = await fetchPrivate(SERVICE_BAYS_API_ENDPOINTS.DELETE(id), 'DELETE');
      if (res.success) {
        showToast('Xóa cầu nâng thành công!', 'success');
        loadServiceBays();
      } else {
        showToast(res.message || 'Lỗi khi xóa cầu nâng.', 'warning');
      }
    } catch (err: any) {
      console.error('handleDeleteBay error:', err);
      showToast(err.message || 'Lỗi kết nối khi thực hiện xóa.', 'warning');
    }
  };

  // Status mapping colors & labels for Service Bays
  const getBayStatusDetails = (status: string, is_active: boolean) => {
    if (!is_active) {
      return {
        label: 'Tạm Ngưng',
        textColor: 'text-slate-500',
        bgColor: 'bg-slate-100',
        borderColor: 'border-slate-200',
        indicator: 'bg-slate-400'
      };
    }

    switch (status) {
      case 'AVAILABLE':
        return {
          label: 'Sẵn Sàng',
          textColor: 'text-emerald-700',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200/70',
          indicator: 'bg-emerald-500 animate-pulse'
        };
      case 'OCCUPIED':
        return {
          label: 'Đang Hoạt Động',
          textColor: 'text-indigo-700',
          bgColor: 'bg-indigo-50',
          borderColor: 'border-indigo-200/70',
          indicator: 'bg-indigo-600'
        };
      case 'MAINTENANCE':
        return {
          label: 'Bảo Trì',
          textColor: 'text-amber-700',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200/70',
          indicator: 'bg-amber-500 animate-bounce'
        };
      case 'OFFLINE':
      default:
        return {
          label: 'Ngoại Tuyến',
          textColor: 'text-rose-700',
          bgColor: 'bg-rose-50',
          borderColor: 'border-rose-200/70',
          indicator: 'bg-rose-500'
        };
    }
  };

  // Status mapping colors for Tools
  const getToolStatusDetails = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return {
          label: 'Sẵn Sàng',
          colorClass: 'bg-emerald-50 text-emerald-600 border-emerald-100'
        };
      case 'IN_USE':
        return {
          label: 'Đang Sử Dụng',
          colorClass: 'bg-blue-50 text-blue-600 border-blue-100'
        };
      case 'MAINTENANCE':
        return {
          label: 'Bảo Trì',
          colorClass: 'bg-amber-50 text-amber-600 border-amber-100'
        };
      case 'BROKEN':
      default:
        return {
          label: 'Hỏng Hóc',
          colorClass: 'bg-rose-50 text-rose-600 border-rose-100'
        };
    }
  };

  // Filtered Service Bays
  const filteredBays = serviceBays.filter(bay => {
    const matchesSearch = bay.bay_name.toLowerCase().includes(searchBayQuery.toLowerCase());
    const matchesStatus = filterBayStatus === 'all' || 
                          (filterBayStatus === 'inactive' ? !bay.is_active : (bay.status === filterBayStatus && bay.is_active));
    return matchesSearch && matchesStatus;
  });

  // Filtered Tools
  const filteredTools = workshopTools.filter(tool => {
    const matchesSearch = tool.tool_name.toLowerCase().includes(searchToolQuery.toLowerCase()) || 
                          tool.serial_number.toLowerCase().includes(searchToolQuery.toLowerCase());
    const matchesStatus = filterToolStatus === 'all' || tool.status === filterToolStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto font-sans">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#00285E] tracking-tight leading-none mb-2">
            Quản lý Tài nguyên Nhà xưởng
          </h1>
          <p className="text-slate-400 text-sm">
            Xem và cấu hình cầu nâng sửa chữa, thiết bị kỹ thuật nhà xưởng và tối ưu hiệu suất sửa chữa.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadServiceBays}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-[#00285E] hover:bg-slate-50 transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={18} className={isLoadingBays ? 'animate-spin' : ''} />
          </button>
          {activeSubTab === 'bays' && (
            <button
              onClick={handleOpenCreateBay}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#00285E] hover:bg-[#062047] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#00285E]/10 hover:shadow-lg"
            >
              <Plus size={16} />
              <span>Thêm cầu nâng mới</span>
            </button>
          )}
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('bays')}
          className={`py-3.5 px-6 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'bays'
              ? 'border-[#00285E] text-[#00285E]'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Activity size={16} />
          Cầu nâng sửa chữa ({serviceBays.length})
        </button>
        <button
          onClick={() => setActiveSubTab('tools')}
          className={`py-3.5 px-6 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'tools'
              ? 'border-[#00285E] text-[#00285E]'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Cpu size={16} />
          Thiết bị kỹ thuật ({workshopTools.length})
        </button>
      </div>

      {/* SERVICE BAYS CONTENT */}
      {activeSubTab === 'bays' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/50">
            {/* Search */}
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Tìm kiếm cầu nâng theo tên..."
                value={searchBayQuery}
                onChange={(e) => setSearchBayQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
              />
            </div>

            {/* Status Select Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto self-stretch sm:self-center">
              <span className="text-xs font-bold text-slate-400 whitespace-nowrap hidden sm:inline">Trạng thái:</span>
              <select
                value={filterBayStatus}
                onChange={(e) => setFilterBayStatus(e.target.value)}
                className="w-full sm:w-48 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E]"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="AVAILABLE">Sẵn sàng (Trống)</option>
                <option value="OCCUPIED">Đang hoạt động</option>
                <option value="MAINTENANCE">Đang bảo trì</option>
                <option value="OFFLINE">Ngoại tuyến</option>
                <option value="inactive">Tạm Ngưng (Không kích hoạt)</option>
              </select>
            </div>
          </div>

          {/* Loader or Grid */}
          {isLoadingBays ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 font-medium">
              <div className="w-10 h-10 border-4 border-[#00285E] border-t-transparent rounded-full animate-spin mb-4"></div>
              Đang tải danh sách cầu sửa chữa...
            </div>
          ) : filteredBays.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm text-slate-400 font-bold">
              <Activity className="mx-auto text-slate-300 mb-3" size={40} />
              Không tìm thấy cầu sửa chữa nào phù hợp.
            </div>
          ) : (
            /* Premium Grid Layout */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredBays.map((bay) => {
                const statusDetails = getBayStatusDetails(bay.status, bay.is_active);
                return (
                  <div
                    key={bay.id}
                    className={`bg-white rounded-3xl border ${
                      bay.is_active ? 'border-slate-200/70 hover:border-[#00285E]/40' : 'border-slate-200 bg-slate-50/50'
                    } shadow-xs transition-all hover:shadow-lg p-5 flex flex-col justify-between relative overflow-hidden group`}
                  >
                    {/* Status Badge */}
                    <div className="flex justify-between items-start mb-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${statusDetails.bgColor} ${statusDetails.textColor} ${statusDetails.borderColor}`}>
                        <span className={`w-2 h-2 rounded-full ${statusDetails.indicator}`}></span>
                        {statusDetails.label}
                      </span>

                      {/* Header Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleActiveBay(bay)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            bay.is_active 
                              ? 'border-emerald-100 text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                              : 'border-slate-200 text-slate-400 bg-slate-100 hover:bg-slate-200'
                          }`}
                          title={bay.is_active ? 'Tạm ngưng kích hoạt' : 'Kích hoạt'}
                        >
                          {bay.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        </button>
                        <button
                          onClick={() => handleOpenEditBay(bay)}
                          className="text-slate-400 hover:text-[#00285E] p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteBay(bay.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg border border-slate-100 hover:bg-rose-50 transition-colors"
                          title="Xóa / Lưu trữ"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Main Info */}
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl ${bay.is_active ? 'bg-blue-50 text-[#00285E]' : 'bg-slate-100 text-slate-400'}`}>
                          <Wrench size={18} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-sm tracking-tight leading-tight">
                            {bay.bay_name}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">ID: {bay.id}</p>
                        </div>
                      </div>

                      {/* Display current Order if Occupied */}
                      {bay.status === 'OCCUPIED' && bay.is_active && (
                        <div className="bg-indigo-50/40 border border-indigo-100 p-3 rounded-2xl space-y-1.5">
                          <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">
                            Chi tiết lệnh sửa chữa
                          </span>
                          <div className="flex items-center justify-between text-xs text-slate-600">
                            <span className="font-semibold">Mã lệnh:</span>
                            <span className="font-bold text-slate-800">
                              #{bay.current_service_order_id || 'Chưa liên kết'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Progress & Status indicator */}
                    <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                      <span>Loại: Cầu nâng cao</span>
                      <span>AGM Gara</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* WORKSHOP TOOLS CONTENT */}
      {activeSubTab === 'tools' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/50">
            {/* Search */}
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Tìm kiếm thiết bị theo tên hoặc số Seri..."
                value={searchToolQuery}
                onChange={(e) => setSearchToolQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
              />
            </div>

            {/* Status Select Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto self-stretch sm:self-center">
              <span className="text-xs font-bold text-slate-400 whitespace-nowrap hidden sm:inline">Trạng thái:</span>
              <select
                value={filterToolStatus}
                onChange={(e) => setFilterToolStatus(e.target.value)}
                className="w-full sm:w-48 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E]"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="AVAILABLE">Sẵn sàng (Trống)</option>
                <option value="IN_USE">Đang sử dụng</option>
                <option value="MAINTENANCE">Đang bảo trì</option>
                <option value="BROKEN">Hỏng hóc</option>
              </select>
            </div>
          </div>

          {/* Tools Table */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xs overflow-hidden p-6 md:p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Database className="text-[#00285E]" size={20} />
              Cơ sở dữ liệu Thiết bị Kỹ thuật Nhà xưởng
            </h2>

            <div className="overflow-x-auto">
              {filteredTools.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-bold">
                  Không tìm thấy thiết bị nào phù hợp.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-slate-600">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-4 px-4">Tên thiết bị / Seri</th>
                      <th className="py-4 px-4">Vị trí hiện tại</th>
                      <th className="py-4 px-4 text-center">Gắn với Cầu nâng</th>
                      <th className="py-4 px-4 text-center">Bảo hành đến</th>
                      <th className="py-4 px-4">Trạng thái</th>
                      <th className="py-4 px-4 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTools.map((tool) => {
                      const toolStatus = getToolStatusDetails(tool.status);
                      const attachedBay = serviceBays.find(b => b.id === tool.bay_id);

                      return (
                        <tr key={tool.id} className="border-b border-slate-100/60 hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-4">
                            <span className="text-sm font-bold text-slate-800 block">
                              {tool.tool_name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold font-mono">
                              S/N: {tool.serial_number}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-xs font-semibold text-slate-500">
                            {tool.current_location}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {attachedBay ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-[#00285E] border border-blue-100">
                                {attachedBay.bay_name}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 font-semibold italic">Không gắn</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center text-xs font-semibold text-slate-500">
                            {tool.warranty_expiry}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${toolStatus.colorClass}`}>
                              {toolStatus.label}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => showToast('Mở chi tiết thiết bị...', 'info')}
                                className="text-slate-400 hover:text-[#00285E] transition-colors p-1.5 rounded-lg hover:bg-blue-50"
                                title="Xem chi tiết"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={() => showToast('Chức năng chỉnh sửa thiết bị đang phát triển.', 'info')}
                                className="text-slate-400 hover:text-indigo-600 transition-colors p-1.5 rounded-lg hover:bg-indigo-50"
                                title="Chỉnh sửa"
                              >
                                <Edit size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SERVICE BAY EDIT/CREATE MODAL */}
      {isBayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-fade-in"
            onClick={() => setIsBayModalOpen(false)}
          ></div>

          {/* Modal Container */}
          <div className="relative bg-white rounded-3xl border border-slate-200/50 shadow-2xl p-6 md:p-8 w-full max-w-lg transform transition-all font-sans z-50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Wrench className="text-[#00285E]" size={20} />
                {editingBay ? 'Cập nhật Cầu sửa chữa' : 'Thêm Cầu nâng sửa chữa mới'}
              </h3>
              <button
                onClick={() => setIsBayModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBay} className="space-y-4">
              {/* Bay Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Tên cầu nâng / khoang sửa chữa *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Cầu nâng số 1, Cầu 3D căn chỉnh thước lái..."
                  value={bayName}
                  onChange={(e) => setBayName(e.target.value)}
                  className={`w-full bg-white border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800 ${
                    bayErrors.bay_name ? 'border-rose-500' : 'border-slate-200'
                  }`}
                />
                {bayErrors.bay_name && (
                  <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {bayErrors.bay_name}
                  </p>
                )}
              </div>

              {/* Status Select */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Trạng thái cầu nâng
                </label>
                <select
                  value={bayStatus}
                  onChange={(e) => setBayStatus(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E]"
                >
                  <option value="AVAILABLE">Sẵn sàng</option>
                  <option value="OCCUPIED">Đang hoạt động</option>
                  <option value="MAINTENANCE">Đang bảo trì</option>
                  <option value="OFFLINE">Ngoại tuyến</option>
                </select>
              </div>

              {/* Is Active Toggle */}
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-xs font-extrabold text-slate-700 block">Kích hoạt hoạt động</span>
                  <span className="text-[10px] text-slate-400 font-bold block">Cho phép cầu nâng hiển thị trên danh sách tiếp nhận xe</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBayIsActive(!bayIsActive)}
                  className={`p-1 rounded-full transition-colors ${
                    bayIsActive ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {bayIsActive ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBayModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#00285E] hover:bg-[#062047] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#00285E]/10"
                >
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
