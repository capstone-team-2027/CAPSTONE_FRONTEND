import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  Package,
  TrendingUp,
  Boxes,
  Filter,
  Pencil,
  X,
  Wrench,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Search,
  Trash2,
  AlertTriangle,
  FolderHeart,
  FolderOpen,
  XCircle,
} from "lucide-react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { type Category, type ServiceCatalog } from "../../../model/dto/serviceCatalog.dto";
import { useFetchClient } from '../../../hook/useFetchClient';
import { SERVICE_CATALOG_API_ENDPOINTS } from '../../../constants/admin/serviceCatalogApiEndPoint';
import { SERVICE_CATEGORY_API_ENDPOINTS } from '../../../constants/admin/serviceCategoriesApiEndPoint';
import { type ServiceCombo, ComboFormModal } from "./AdminServiceCombo";
import { SERVICE_COMBOS_API_ENDPOINTS } from "../../../constants/admin/serviceCombosApiEndPoint";

// LocalStorage helpers for prices and combos persistence
const getServicePrices = (): Record<number, number> => {
  try {
    const stored = localStorage.getItem("service_prices");
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    return {};
  }
};

const saveServicePrice = (id: number, price: number) => {
  try {
    const prices = getServicePrices();
    prices[id] = price;
    localStorage.setItem("service_prices", JSON.stringify(prices));
  } catch (e) {
    console.error(e);
  }
};

const getServiceImage = (id: number): string => {
  try {
    const stored = localStorage.getItem("service_images");
    const images = stored ? JSON.parse(stored) : {};
    return images[id] || "/images/Service-Image.png";
  } catch (e) {
    return "/images/Service-Image.png";
  }
};

const saveServiceImage = (id: number, dataUrl: string) => {
  try {
    const stored = localStorage.getItem("service_images");
    const images = stored ? JSON.parse(stored) : {};
    images[id] = dataUrl;
    localStorage.setItem("service_images", JSON.stringify(images));
  } catch (e) {
    console.error(e);
  }
};
// Service combos are managed via AdminServiceCombo.tsx helpers

export default function AdminServiceManagement() {
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();
  const { fetchPrivate } = useFetchClient();

  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab
  const activeTab = (searchParams.get("tab") as "services" | "combos" | "categories") || "services";

  // Controlled search inputs
  const [searchQueryLocal, setSearchQueryLocal] = useState(searchParams.get("servicesQ") || "");
  const [comboSearchQuery, setComboSearchQuery] = useState(searchParams.get("comboQ") || "");
  const [categorySearchQuery, setCategorySearchQuery] = useState(searchParams.get("categoryQ") || "");

  // Pages
  const servicesPage = Number(searchParams.get("servicesPage")) || 1;
  const comboPage = Number(searchParams.get("comboPage")) || 1;
  const categoryPage = Number(searchParams.get("categoryPage")) || 1;

  // Debounced values from URL query parameters
  const debouncedServiceQuery = searchParams.get("servicesQ") || "";
  const debouncedComboQuery = searchParams.get("comboQ") || "";
  const debouncedCategoryQuery = searchParams.get("categoryQ") || "";

  const servicesLimit = 8;
  const comboLimit = 8;
  const categoryLimit = 8;

  // State variables
  const [services, setServices] = useState<ServiceCatalog[]>([]);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [combos, setCombos] = useState<ServiceCombo[]>([]);
  const [allServicesForCombo, setAllServicesForCombo] = useState<ServiceCatalog[]>([]);

  const [totalServices, setTotalServices] = useState(0);
  const [totalActiveServices, setTotalActiveServices] = useState(0);
  const [servicesLoading, setServicesLoading] = useState(false);

  const [totalCombos, setTotalCombos] = useState(0);
  const [totalActiveCombos, setTotalActiveCombos] = useState(0);
  const [combosLoading, setCombosLoading] = useState(false);

  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [totalCategories, setTotalCategories] = useState(0);
  const [totalActiveCategories, setTotalActiveCategories] = useState(0);

  // Categories management tab states
  // Service Modals State
  const [editingService, setEditingService] = useState<ServiceCatalog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Combo Modals State
  const [editingCombo, setEditingCombo] = useState<ServiceCombo | null>(null);
  const [isComboModalOpen, setIsComboModalOpen] = useState(false);

  // Category Modal State
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const handleGetServiceCatalog = async () => {
    setServicesLoading(true);
    try {
      const url = `${SERVICE_CATALOG_API_ENDPOINTS.SERVICE_CATALOG}?page=${servicesPage}&limit=${servicesLimit}&q=${encodeURIComponent(debouncedServiceQuery)}`;
      const result = await fetchPrivate<any>(url, 'GET');
      if (result && result.data) {
        setServices(result.data.items || []);
        setTotalServices(result.data.total || 0);
        setTotalActiveServices(result.data.totalActive || 0);
      }
    } catch (error) {
      console.error('Lỗi lấy danh sách dịch vụ:', error);
      showToast('Không thể tải danh sách dịch vụ', 'warning');
    } finally {
      setServicesLoading(false);
    }
  };

  const handleGetAllServicesForCombo = async () => {
    try {
      const result = await fetchPrivate<any>(
        `${SERVICE_CATALOG_API_ENDPOINTS.SERVICE_CATALOG}?all=true`,
        'GET'
      );
      setAllServicesForCombo(result.data || []);
    } catch (error) {
      console.error('Lỗi lấy danh sách toàn bộ dịch vụ cho combo:', error);
    }
  };

  const handleGetCategory = async () => {
    try {
      const result = await fetchPrivate(SERVICE_CATALOG_API_ENDPOINTS.SERVICE_CATEGORY);
      setCategoryList(result.data || []);
    } catch (error) {
      console.error("Lỗi lấy danh sách danh mục", error);
    }
  };

  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      const url = `${SERVICE_CATEGORY_API_ENDPOINTS.LIST}?page=${categoryPage}&limit=${categoryLimit}&include_services=false&q=${encodeURIComponent(debouncedCategoryQuery)}`;
      const res = await fetchPrivate(url, 'GET');
      if (res.success && res.data) {
        setCategories(res.data.items || []);
        setTotalCategories(res.data.total || 0);
        setTotalActiveCategories(res.data.totalActive || 0);
      } else {
        showToast(res.message || 'Không thể tải danh sách danh mục dịch vụ', 'warning');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Lỗi kết nối tải danh sách danh mục', 'warning');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleGetServiceCombos = async () => {
    setCombosLoading(true);
    try {
      const url = `${SERVICE_COMBOS_API_ENDPOINTS.LIST_SERVICE_COMBOS}?page=${comboPage}&limit=${comboLimit}&q=${encodeURIComponent(debouncedComboQuery)}`;
      const result = await fetchPrivate(url, 'GET');
      if (result && result.data && result.data.items) {
        const combosData = (result.data.items || []).map((c: any) => {
          let discount = 10;
          if (c.combo_name.toLowerCase().includes("toàn diện") || c.combo_name.toLowerCase().includes("làm đẹp")) {
            discount = 15;
          }
          let catId = 0;
          if (c.catalogs && c.catalogs.length > 0) {
            catId = c.catalogs[0].category_id || 0;
          }

          return {
            id: c.id,
            combo_name: c.combo_name,
            category_id: catId,
            service_ids: c.catalogs ? c.catalogs.map((item: any) => item.id) : [],
            discount_percentage: discount,
            description: c.description || "",
            is_active: c.is_active,
            createdAt: c.createdAt,
          };
        });
        setCombos(combosData);
        setTotalCombos(result.data.total || 0);
        setTotalActiveCombos(result.data.totalActive || 0);
      }
    } catch (error) {
      console.error('Lỗi lấy danh sách combo:', error);
      showToast('Không thể tải danh sách gói combo', 'warning');
    } finally {
      setCombosLoading(false);
    }
  };

  // Debounce for service search
  useEffect(() => {
    const urlVal = searchParams.get("servicesQ") || "";
    if (searchQueryLocal === urlVal) return;

    const handler = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        const trimmed = searchQueryLocal.trim();
        if (trimmed) {
          next.set("servicesQ", trimmed);
        } else {
          next.delete("servicesQ");
        }
        next.set("servicesPage", "1");
        return next;
      });
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQueryLocal, setSearchParams, searchParams]);

  // Debounce for combo search
  useEffect(() => {
    const urlVal = searchParams.get("comboQ") || "";
    if (comboSearchQuery === urlVal) return;

    const handler = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        const trimmed = comboSearchQuery.trim();
        if (trimmed) {
          next.set("comboQ", trimmed);
        } else {
          next.delete("comboQ");
        }
        next.set("comboPage", "1");
        return next;
      });
    }, 400);
    return () => clearTimeout(handler);
  }, [comboSearchQuery, setSearchParams, searchParams]);

  // Debounce for category search
  useEffect(() => {
    const urlVal = searchParams.get("categoryQ") || "";
    if (categorySearchQuery === urlVal) return;

    const handler = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        const trimmed = categorySearchQuery.trim();
        if (trimmed) {
          next.set("categoryQ", trimmed);
        } else {
          next.delete("categoryQ");
        }
        next.set("categoryPage", "1");
        return next;
      });
    }, 400);
    return () => clearTimeout(handler);
  }, [categorySearchQuery, setSearchParams, searchParams]);

  useEffect(() => {
    handleGetCategory();
    handleGetAllServicesForCombo();
  }, []);

  useEffect(() => {
    handleGetServiceCatalog();
  }, [servicesPage, debouncedServiceQuery]);

  useEffect(() => {
    handleGetServiceCombos();
  }, [comboPage, debouncedComboQuery]);

  useEffect(() => {
    loadCategories();
  }, [categoryPage, debouncedCategoryQuery]);

  // Prepopulate mock service prices and combos if empty
  useEffect(() => {
    if (services.length > 0) {
      const currentPrices = getServicePrices();
      let pricesUpdated = false;
      services.forEach((s) => {
        const name = s.service_name;
        let expectedPrice = currentPrices[s.id];

        // Map exact matching names to their correct prices matching the screenshot
        if (name.includes("cấp 1")) expectedPrice = 500000;
        else if (name.includes("cấp 2")) expectedPrice = 800000;
        else if (name.includes("cấp 3")) expectedPrice = 1500000;
        else if (name.includes("Thay dầu động cơ")) expectedPrice = 650000;
        else if (name.includes("Vệ sinh kim phun")) expectedPrice = 1200000;
        else if (name.includes("dây curoa cam")) expectedPrice = 2500000;
        else if (name.includes("nắp giàn cò")) expectedPrice = 1800000;
        else if (name.includes("Cân bằng động")) expectedPrice = 400000;
        else if (name.includes("Cân chỉnh góc đặt")) expectedPrice = 600000;
        else if (name.includes("má phanh trước")) expectedPrice = 850000;
        else if (name.includes("Vệ sinh & dưỡng nội thất")) expectedPrice = 800000;
        else if (name.includes("Khử mùi diệt khuẩn")) expectedPrice = 200000;
        else if (name.includes("OBD2")) expectedPrice = 300000;
        else if (name.includes("chẩn đoán hệ thống điều hòa")) expectedPrice = 400000;
        else if (name.includes("kích bình")) expectedPrice = 200000;
        else if (name.includes("lốp dự phòng")) expectedPrice = 250000;
        else if (name.includes("cẩu kéo xe")) expectedPrice = 1200000;

        if (expectedPrice !== undefined && currentPrices[s.id] !== expectedPrice) {
          currentPrices[s.id] = expectedPrice;
          pricesUpdated = true;
        } else if (currentPrices[s.id] === undefined) {
          currentPrices[s.id] = expectedPrice || 350000;
          pricesUpdated = true;
        }
      });
      if (pricesUpdated) {
        localStorage.setItem("service_prices", JSON.stringify(currentPrices));
      }
    }
  }, [services, categoryList]);

  useEffect(() => {
    if (activeTab === "categories") {
      loadCategories();
    }
  }, [categoryPage, activeTab]);

  const handleOpenCreate = () => {
    setEditingService(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (service: ServiceCatalog) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  const handleOpenCreateCombo = () => {
    setEditingCombo(null);
    setIsComboModalOpen(true);
  };

  const handleOpenEditCombo = (combo: ServiceCombo) => {
    setEditingCombo(combo);
    setIsComboModalOpen(true);
  };

  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: any) => {
    setEditingCategory(cat);
    setIsCategoryModalOpen(true);
  };

  const handleDeleteCombo = async (id: number, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa/tắt hoạt động gói combo dịch vụ "${name}"?`)) {
      try {
        const comboToUpdate = combos.find(c => c.id === id);
        if (!comboToUpdate) return;

        await fetchPrivate(
          SERVICE_COMBOS_API_ENDPOINTS.UPDATE_SERVICE_COMBOS(id),
          "PUT",
          {
            combo_name: comboToUpdate.combo_name,
            description: comboToUpdate.description,
            serviceCatalogIds: comboToUpdate.service_ids,
            is_active: false
          }
        );
        showToast(`Đã tắt hoạt động gói combo "${name}" thành công`, "success");
        handleGetServiceCombos();
      } catch (err: any) {
        console.error("Lỗi khi xóa combo:", err);
        showToast(err.message || "Không thể thực hiện yêu cầu xóa", "warning");
      }
    }
  };

  const handleSaveCombo = (_savedCombo: ServiceCombo) => {
    handleGetServiceCombos();
    showToast(editingCombo ? "Cập nhật gói dịch vụ thành công" : "Tạo gói dịch vụ thành công", "success");
    setIsComboModalOpen(false);
    setEditingCombo(null);
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa danh mục dịch vụ "${name}"?`)) {
      try {
        const res = await fetchPrivate(SERVICE_CATEGORY_API_ENDPOINTS.DELETE(id), 'DELETE');
        if (res.success) {
          showToast(`Đã xóa danh mục "${name}" thành công`, 'success');
          loadCategories();
          handleGetCategory(); 
        } else {
          showToast(res.message || 'Lỗi khi xóa danh mục dịch vụ', 'warning');
        }
      } catch (err: any) {
        console.error(err);
        showToast(err.message || 'Lỗi kết nối xóa danh mục', 'warning');
      }
    }
  };

  const handleToggleCategoryActive = async (cat: any) => {
    try {
      const newStatus = !cat.is_active;
      const res = await fetchPrivate(SERVICE_CATEGORY_API_ENDPOINTS.UPDATE(cat.id), 'PUT', { is_active: newStatus });
      if (res.success) {
        showToast(`Đã ${newStatus ? 'kích hoạt' : 'tắt'} danh mục "${cat.category_name}"`, 'success');
        loadCategories();
        handleGetCategory(); // Refresh options for dropdown
      } else {
        showToast(res.message || 'Lỗi cập nhật trạng thái', 'warning');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Lỗi kết nối cập nhật trạng thái', 'warning');
    }
  };

  const getComboServicesNames = (serviceIds: number[]) => {
    return serviceIds
      .map(id => services.find(s => s.id === id)?.service_name)
      .filter(Boolean)
      .join(", ");
  };

  const calculateComboPrice = (serviceIds: number[]) => {
    const prices = getServicePrices();
    return serviceIds.reduce((sum, id) => {
      const price = prices[id] ?? 300000;
      return sum + price;
    }, 0);
  };

  const filteredServices = services;
  const filteredCombos = combos;
  const filteredCategories = categories;
  const servicePrices = getServicePrices();

  const handlePageChange = (type: "services" | "combos" | "categories", newPage: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      const paramName = type === "services" ? "servicesPage" : type === "combos" ? "comboPage" : "categoryPage";
      next.set(paramName, String(newPage));
      return next;
    });
  };

  const renderPagination = (
    currentPage: number,
    totalPages: number,
    onPageChange: (p: number) => void,
    totalItems: number,
    itemsOnPage: number,
    itemLabel: string
  ) => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return (
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-xs font-semibold text-slate-500">
          Hiển thị {itemsOnPage} / {totalItems} {itemLabel}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            Trước
          </button>
          {start > 1 && (
            <>
              <button
                onClick={() => onPageChange(1)}
                className="w-8 h-8 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                1
              </button>
              {start > 2 && <span className="text-slate-400 text-xs px-1">...</span>}
            </>
          )}
          {pages.map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-8 h-8 rounded border text-xs font-bold transition-all cursor-pointer ${
                p === currentPage
                  ? "bg-[#00285E] border-[#00285E] text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          ))}
          {end < totalPages && (
            <>
              {end < totalPages - 1 && <span className="text-slate-400 text-xs px-1">...</span>}
              <button
                onClick={() => onPageChange(totalPages)}
                className="w-8 h-8 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {totalPages}
              </button>
            </>
          )}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            Sau
          </button>
        </div>
      </div>
    );
  };

  const handleTabChange = (tab: "services" | "combos" | "categories") => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    });
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* TITLE BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2">
            {activeTab === "services"
              ? "Quản lý Dịch vụ"
              : activeTab === "combos"
                ? "Quản lý Gói Combo"
                : "Quản lý Danh mục Dịch vụ"}
          </h1>
          <p className="text-slate-500 text-sm">
            {activeTab === "services"
              ? "Tối ưu hóa các gói dịch vụ và bảo dưỡng của gara."
              : activeTab === "combos"
                ? "Thiết lập các gói combo tích hợp ưu đãi hấp dẫn cho khách hàng."
                : "Quản lý và tổ chức các nhóm phân loại dịch vụ chính của gara."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "services" ? (
            <>
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
                <span>Nhập danh sách</span>
              </button>
            </>
          ) : activeTab === "combos" ? (
            <button
              onClick={handleOpenCreateCombo}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#00285E] text-white rounded text-sm font-bold shadow-md shadow-[#00285E]/20 hover:bg-[#062047] transition-all transform hover:translate-y-[-1px]"
            >
              <span>Tạo Combo dịch vụ</span>
            </button>
          ) : (
            <button
              onClick={handleOpenCreateCategory}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#00285E] text-white rounded text-sm font-bold shadow-md shadow-[#00285E]/20 hover:bg-[#062047] transition-all transform hover:translate-y-[-1px]"
            >
              <span>Thêm danh mục</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {activeTab === "services" ? (
          <>
            <motion.div
              whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}
              className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4 cursor-pointer transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Package size={22} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                  Tổng dịch vụ đơn lẻ
                </span>
                <span className="text-2xl font-bold text-slate-900 tracking-tight block">
                  {totalServices}
                </span>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}
              className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4 cursor-pointer transition-all"
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
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                  Dịch vụ đang hoạt động
                </span>
                <span className="text-2xl font-bold text-slate-900 tracking-tight block">
                  {totalActiveServices} Dịch vụ
                </span>
              </div>
            </motion.div>
          </>
        ) : activeTab === "combos" ? (
          <>
            <motion.div
              whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}
              className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4 cursor-pointer transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#00285E]">
                <Boxes size={22} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                  Tổng gói combo
                </span>
                <span className="text-2xl font-bold text-slate-900 tracking-tight block">
                  {totalCombos} Gói
                </span>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}
              className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4 cursor-pointer transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-[#F9A11B]">
                <TrendingUp size={22} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                  Phổ biến nhất
                </span>
                <span className="text-base font-bold text-slate-900 tracking-tight block truncate max-w-[200px]">
                  {combos[0]?.combo_name || "Combo chăm sóc xe"}
                </span>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}
              className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4 cursor-pointer transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                  Gói Combo đang hoạt động
                </span>
                <span className="text-2xl font-bold text-slate-900 tracking-tight block">
                  {totalActiveCombos} Gói
                </span>
              </div>
            </motion.div>
          </>
        ) : (
          <>
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
                  {totalCategories}
                </span>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}
              className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4 cursor-pointer transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                  Đang hoạt động
                </span>
                <span className="text-2xl font-bold text-slate-900 tracking-tight block">
                  {totalActiveCategories}
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
                  {totalCategories - totalActiveCategories}
                </span>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* TABS SWITCHER */}
      <div className="flex border-b border-slate-200/60">
        <button
          onClick={() => handleTabChange("services")}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-all ${activeTab === "services"
            ? "border-[#00285E] text-[#00285E]"
            : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
        >
          Dịch vụ đơn lẻ
        </button>
        <button
          onClick={() => handleTabChange("combos")}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-all ${activeTab === "combos"
            ? "border-[#00285E] text-[#00285E]"
            : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
        >
          Gói Combo dịch vụ
        </button>
        <button
          onClick={() => handleTabChange("categories")}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-all ${activeTab === "categories"
            ? "border-[#00285E] text-[#00285E]"
            : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
        >
          Danh mục phân loại
        </button>
      </div>

      {/* TABLE CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        {/* Header toolbar with Search */}
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">
            {activeTab === "services"
              ? "Danh mục dịch vụ"
              : activeTab === "combos"
                ? "Danh sách gói Combo"
                : "Danh sách danh mục dịch vụ"}
          </h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={
                  activeTab === "services"
                    ? "Tìm kiếm dịch vụ..."
                    : activeTab === "combos"
                      ? "Tìm kiếm combo..."
                      : "Tìm kiếm danh mục..."
                }
                value={
                  activeTab === "services"
                    ? searchQueryLocal
                    : activeTab === "combos"
                      ? comboSearchQuery
                      : categorySearchQuery
                }
                onChange={(e) => {
                  if (activeTab === "services") {
                    setSearchQueryLocal(e.target.value);
                  } else if (activeTab === "combos") {
                    setComboSearchQuery(e.target.value);
                  } else {
                    setCategorySearchQuery(e.target.value);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
              />
            </div>
            <button
              onClick={() => showToast("Mở bộ lọc nâng cao...", "info")}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600 shrink-0"
            >
              <Filter size={16} />
            </button>
          </div>
        </div>

        {/* Dynamic tables based on tab */}
        <div className="overflow-x-auto">
          {activeTab === "services" ? (
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
                {filteredServices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-slate-400 text-sm"
                    >
                      Không tìm thấy dịch vụ phù hợp...
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={getServiceImage(s.id)}
                            alt={s.service_name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200/80 shrink-0 bg-slate-50"
                          />
                          <span className="font-bold text-[#00285E] text-sm block">
                            {s.service_name}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wide uppercase bg-[#EDF3FF] text-[#00285E]">
                          {s.category?.category_name || "Chưa phân loại"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-600 text-sm">
                        {s.description || "—"}
                      </td>

                      <td className="py-4 px-4 text-slate-900 font-bold text-sm">
                        {(servicePrices[s.id] ?? 300000).toLocaleString("vi-VN")} đ
                      </td>
                      <td className="py-4 px-4 text-slate-600 text-sm font-semibold">
                        {s.estimated_duration} phút
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${s.is_active
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
          ) : activeTab === "combos" ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-y border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th className="py-4 px-6">Tên gói combo</th>
                  <th className="py-4 px-4">Mô tả</th>
                  <th className="py-4 px-4">Dịch vụ đi kèm</th>
                  <th className="py-4 px-4">Tổng giá</th>
                  <th className="py-4 px-4">Trạng thái</th>
                  <th className="py-4 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredCombos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-slate-400 text-sm"
                    >
                      Không tìm thấy gói combo dịch vụ phù hợp...
                    </td>
                  </tr>
                ) : (
                  filteredCombos.map((c) => {
                    const totalPrice = calculateComboPrice(c.service_ids);
                    return (
                      <tr
                        key={c.id}
                        className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors group"
                      >
                        <td className="py-4 px-6">
                          <span className="font-bold text-[#00285E] text-sm block">
                            {c.combo_name}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-slate-500 text-xs max-w-[200px] truncate" title={c.description}>
                          {c.description || "—"}
                        </td>
                        <td className="py-4 px-4 text-slate-600 text-xs max-w-xs truncate" title={getComboServicesNames(c.service_ids)}>
                          {getComboServicesNames(c.service_ids) || "—"}
                        </td>

                        <td className="py-4 px-4 text-slate-900 font-black text-sm">
                          {totalPrice.toLocaleString("vi-VN")} đ
                        </td>

                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${c.is_active
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                              }`}
                          >
                            {c.is_active ? "Hoạt động" : "Tạm dừng"}
                          </span>
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditCombo(c)}
                              className="p-2 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Pencil size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
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
                {categoriesLoading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400 text-sm">
                      <div className="w-8 h-8 border-4 border-[#00285E] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                      Đang tải danh sách danh mục...
                    </td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400 text-sm">
                      Không tìm thấy danh mục dịch vụ nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat) => (
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
                        {new Date(cat.createdAt).toLocaleDateString('vi-VN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })}
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleCategoryActive(cat)}
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer hover:opacity-85 active:scale-95 transition-all ${cat.is_active
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
                            onClick={() => handleOpenEditCategory(cat)}
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
          )}
        </div>

        {/* PAGINATION BARS */}
        {activeTab === "services" && !servicesLoading && renderPagination(
          servicesPage,
          Math.ceil(totalServices / servicesLimit),
          (p) => handlePageChange("services", p),
          totalServices,
          services.length,
          "dịch vụ"
        )}

        {activeTab === "combos" && !combosLoading && renderPagination(
          comboPage,
          Math.ceil(totalCombos / comboLimit),
          (p) => handlePageChange("combos", p),
          totalCombos,
          combos.length,
          "combo"
        )}

        {activeTab === "categories" && !categoriesLoading && renderPagination(
          categoryPage,
          Math.ceil(totalCategories / categoryLimit),
          (p) => handlePageChange("categories", p),
          totalCategories,
          categories.length,
          "danh mục"
        )}
      </div>

      {/* MODAL CREATE / EDIT SERVICE */}
      {isModalOpen && (
        <ServiceFormModal
          initial={editingService}
          categoryList={categoryList}
          onClose={() => {
            setIsModalOpen(false);
            setEditingService(null);
          }}
          onRefresh={handleGetServiceCatalog}
          showToast={showToast}
        />
      )}

      {/* MODAL CREATE / EDIT COMBO */}
      {isComboModalOpen && (
        <ComboFormModal
          initial={editingCombo}
          services={allServicesForCombo}
          categories={categoryList}
          existingCombos={combos}
          onClose={() => {
            setIsComboModalOpen(false);
            setEditingCombo(null);
          }}
          onSave={handleSaveCombo}
        />
      )}

      {/* MODAL CREATE / EDIT CATEGORY */}
      {isCategoryModalOpen && (
        <CategoryFormModal
          initial={editingCategory}
          onClose={() => {
            setIsCategoryModalOpen(false);
            setEditingCategory(null);
          }}
          onRefresh={() => {
            loadCategories();
            handleGetCategory(); // Refresh options for select lists
          }}
          showToast={showToast}
        />
      )}

      {/* MODAL IMPORT EXCEL */}
      {isImportModalOpen && (
        <ImportExcelModal
          categories={categoryList}
          onClose={() => setIsImportModalOpen(false)}
          onImported={(count) => {
            setIsImportModalOpen(false);
            handleGetServiceCatalog();
            showToast(`Đã nhập thành công ${count} dịch vụ mới`, "success");
          }}
        />
      )}
    </div>
  );
}

// ── SERVICE FORM MODAL ───────────────────────────────────────────────────────
interface ServiceFormModalProps {
  initial: ServiceCatalog | null;
  categoryList: Category[];
  onClose: () => void;
  onRefresh: () => void;
  showToast: (text: string, type?: "success" | "info" | "warning") => void;
}

function ServiceFormModal({ initial, categoryList, onClose, onRefresh, showToast }: ServiceFormModalProps) {
  const isEdit = !!initial;
  const { fetchPrivate } = useFetchClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initial?.service_name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState<number>(initial?.category_id ?? 0);
  const [durationMinutes, setDurationMinutes] = useState<number>(initial?.estimated_duration ?? 30);
  const [isActive, setIsActive] = useState<boolean>(initial?.is_active ?? true);

  const [imageUrl, setImageUrl] = useState<string>(() => {
    if (initial?.id) {
      return getServiceImage(initial.id);
    }
    return "/images/Service-Image.png";
  });

  // Set price state and load it from persistence if editing
  const initialPrice = initial ? (getServicePrices()[initial.id] ?? 300000) : 300000;
  const [price, setPrice] = useState<number>(initialPrice);

  const [errorMsg, setErrorMsg] = useState('');

  const validateForm = () => {
    if (!name.trim()) {
      setErrorMsg("Tên dịch vụ không được để trống");
      return false;
    }
    if (categoryId === 0) {
      setErrorMsg("Vui lòng chọn danh mục dịch vụ");
      return false;
    }
    if (price <= 0 || isNaN(price)) {
      setErrorMsg("Giá dịch vụ phải lớn hơn 0");
      return false;
    }
    if (durationMinutes <= 0 || isNaN(durationMinutes)) {
      setErrorMsg("Thời gian dự kiến phải lớn hơn 0");
      return false;
    }
    setErrorMsg("");
    return true;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateServiceCatalog = async () => {
    if (!validateForm()) return;
    try {
      const response = await fetchPrivate<any>(
        SERVICE_CATALOG_API_ENDPOINTS.SERVICE_CATALOG,
        'POST',
        {
          category_id: categoryId,
          service_name: name,
          description: description,
          estimated_duration: durationMinutes,
          is_active: isActive
        }
      );

      const newService = response.data;
      if (newService && newService.id) {
        saveServicePrice(newService.id, price);
        if (imageUrl !== "/images/Service-Image.png") {
          saveServiceImage(newService.id, imageUrl);
        }
      }
      showToast("Tạo dịch vụ thành công!", "success");
      onRefresh();
      onClose();
    } catch (error: any) {
      console.error("Lỗi tạo dịch vụ:", error);
      setErrorMsg(error?.message || "Thêm dịch vụ thất bại, vui lòng thử lại");
    }
  };

  const handleUpdateServiceCatalog = async () => {
    if (!validateForm()) return;
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
      if (initial?.id) {
        saveServicePrice(initial.id, price);
        if (imageUrl !== "/images/Service-Image.png") {
          saveServiceImage(initial.id, imageUrl);
        }
      }
      showToast("Cập nhật thông tin dịch vụ thành công!", "success");
      onRefresh();
      onClose();
    } catch (error: any) {
      console.error("Lỗi cập nhật dịch vụ:", error);
      setErrorMsg(error?.message || "Cập nhật dịch vụ thất bại, vui lòng thử lại");
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
        className="relative bg-white rounded shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden z-10"
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              {isEdit ? "Chỉnh sửa dịch vụ" : "Thêm dịch vụ mới"}
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
          {/* LEFT COLUMN */}
          <div className="md:col-span-2 bg-[#EDF3FF] p-6 flex flex-col gap-4 border-r border-slate-100">
            <div className="flex items-center gap-2 text-[#00285E]">
              <div className="w-9 h-9 rounded bg-[#00285E] flex items-center justify-center shrink-0">
                <Wrench size={16} className="text-[#F9A11B]" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Dịch vụ chuẩn gara</h3>
                <p className="text-[11px] text-slate-500">
                  Mô tả chi tiết giúp khách hàng dễ chọn.
                </p>
              </div>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative aspect-square rounded-md overflow-hidden shadow-2xl border border-white/10 group flex-1 cursor-pointer bg-slate-100"
              title="Nhấp để thay thế hình ảnh"
            >
              <img
                src={imageUrl}
                alt="Garage service"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-[#00285E]/75 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-all duration-300">
                <Upload className="text-[#F9A11B]" size={28} />
                <span className="text-white text-xs font-bold uppercase tracking-wider text-center px-2">
                  Thay thế hình ảnh
                </span>
              </div>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>

          {/* RIGHT COLUMN */}
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
                  min={1}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Giá dịch vụ
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={price ? price.toLocaleString('vi-VN') : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                      setPrice(raw ? Number(raw) : 0);
                    }}
                    placeholder="Vd: 350.000"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm font-bold text-[#00285E] focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">VND</span>
                </div>
              </div>
              <div className="flex items-end pb-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
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
              <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded px-3 py-2 flex items-center gap-1.5">
                <AlertTriangle size={14} />
                <span>{errorMsg}</span>
              </div>
            )}

          </div>
        </div>

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
            className="px-6 py-2.5 bg-[#F9A11B] text-[#00285E] rounded text-sm font-bold shadow-md shadow-[#F9A11B]/20 hover:bg-[#E08F12] transition-all"
          >
            {initial ? "Lưu thay đổi" : "Tạo dịch vụ"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
// ComboFormModal extracted to AdminServiceCombo.tsx

// ── CATEGORY FORM MODAL ──────────────────────────────────────────────────────
interface CategoryFormModalProps {
  initial: any | null;
  onClose: () => void;
  onRefresh: () => void;
  showToast: (text: string, type?: "success" | "info" | "warning") => void;
}

function CategoryFormModal({ initial, onClose, onRefresh, showToast }: CategoryFormModalProps) {
  const isEdit = !!initial;
  const { fetchPrivate } = useFetchClient();

  const [categoryName, setCategoryName] = useState(initial?.category_name ?? "");
  const [categoryIsActive, setCategoryIsActive] = useState<boolean>(initial?.is_active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

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

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        category_name: categoryName.trim(),
        is_active: categoryIsActive
      };

      if (isEdit) {
        const res = await fetchPrivate(SERVICE_CATEGORY_API_ENDPOINTS.UPDATE(initial.id), 'PUT', payload);
        if (res.success) {
          showToast('Cập nhật danh mục dịch vụ thành công!', 'success');
          onRefresh();
          onClose();
        } else {
          showToast(res.message || 'Lỗi khi cập nhật danh mục dịch vụ', 'warning');
        }
      } else {
        const res = await fetchPrivate(SERVICE_CATEGORY_API_ENDPOINTS.CREATE, 'POST', payload);
        if (res.success) {
          showToast('Thêm danh mục dịch vụ mới thành công!', 'success');
          onRefresh();
          onClose();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Body */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white rounded-3xl border border-slate-200/50 shadow-2xl p-6 md:p-8 w-full max-w-md transform transition-all z-10"
      >
        <h3 className="text-xl font-bold text-[#00285E] mb-6 flex items-center gap-2">
          <FolderHeart className="text-[#00285E]" size={20} />
          {isEdit ? 'Cập nhật danh mục dịch vụ' : 'Thêm danh mục dịch vụ mới'}
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
              onClick={onClose}
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
  );
}

// ── IMPORT EXCEL MODAL WITH PREVIEW TABLE ───────────────────────────────────
interface ImportExcelModalProps {
  categories: Category[];
  onClose: () => void;
  onImported: (count: number) => void;
}

interface ExcelRow {
  service_name: string;
  category_name: string;
  category_id: number;
  description: string;
  price: number;
  estimated_duration: number;
  is_active: boolean;
}

function ImportExcelModal({ categories, onClose, onImported }: ImportExcelModalProps) {
  const { fetchPrivate } = useFetchClient();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<ExcelRow[]>([]);

  const handleSelectFile = (selected: File | null) => {
    if (!selected) return;
    const validTypes = [".xlsx", ".xls", ".csv"];
    const ext = "." + selected.name.split(".").pop()?.toLowerCase();
    if (!validTypes.includes(ext)) {
      alert("Vui lòng chọn file Excel (.xlsx, .xls) hoặc CSV (.csv)");
      return;
    }
    setFile(selected);

    // Auto-map based on available categories
    const firstCat = categories[0] || { id: 1, category_name: "Bảo dưỡng định kỳ" };
    const secondCat = categories[1] || categories[0] || { id: 1, category_name: "Sửa chữa chung" };

    // Fill realistic preview table items
    setPreviewData([
      {
        service_name: "Bảo dưỡng định kỳ cấp 1 (5,000 km)",
        category_name: firstCat.category_name,
        category_id: firstCat.id,
        description: "Thay nhớt động cơ, lọc nhớt, vệ sinh lọc gió, kiểm tra tổng quát gầm xe.",
        price: 450000,
        estimated_duration: 45,
        is_active: true,
      },
      {
        service_name: "Cân chỉnh thước lái 3D thông minh",
        category_name: secondCat.category_name,
        category_id: secondCat.id,
        description: "Sử dụng máy Hunter 3D để căn chỉnh độ chụm và góc camber bánh xe.",
        price: 600000,
        estimated_duration: 60,
        is_active: true,
      },
      {
        service_name: "Vệ sinh hệ thống điều hòa chuyên sâu",
        category_name: firstCat.category_name,
        category_id: firstCat.id,
        description: "Nội soi vệ sinh giàn lạnh, khử trùng bằng máy ozone, thay lọc gió điều hòa.",
        price: 850000,
        estimated_duration: 90,
        is_active: true,
      },
    ]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleSelectFile(dropped);
  };

  const handleImport = async () => {
    if (!file || previewData.length === 0) return;
    setIsUploading(true);
    try {
      let successCount = 0;
      for (const row of previewData) {
        try {
          const res = await fetchPrivate<any>(
            SERVICE_CATALOG_API_ENDPOINTS.SERVICE_CATALOG,
            "POST",
            {
              category_id: row.category_id,
              service_name: row.service_name,
              description: row.description,
              estimated_duration: row.estimated_duration,
              is_active: row.is_active,
            }
          );
          if (res.data && res.data.id) {
            saveServicePrice(res.data.id, row.price);
          }
          successCount++;
        } catch (e) {
          console.error("Lỗi khi import dòng:", row.service_name, e);
        }
      }
      setIsUploading(false);
      onImported(successCount);
    } catch (err) {
      setIsUploading(false);
      console.error(err);
      alert("Đã xảy ra lỗi khi kết nối máy chủ để import dữ liệu.");
    }
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
        className="relative bg-white rounded shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden z-10"
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
        <div className="p-6 space-y-4 max-h-[450px] overflow-y-auto">
          {/* Template Download */}
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
              onClick={() => alert("Đang tải file mẫu thiết kế (mẫu dịch vụ tiêu chuẩn).")}
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
            className={`relative rounded border-2 border-dashed transition-all ${isDragging
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
            <div className="p-6 flex flex-col items-center text-center pointer-events-none">
              {file ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
                    <CheckCircle2 size={22} />
                  </div>
                  <span className="text-sm font-bold text-slate-800">
                    {file.name}
                  </span>
                  <span className="text-xs text-slate-500 mt-0.5">
                    {formatSize(file.size)} • Sẵn sàng xem trước dữ liệu
                  </span>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-[#EDF3FF] flex items-center justify-center text-[#00285E] mb-2">
                    <Upload size={20} />
                  </div>
                  <span className="text-sm font-bold text-slate-800">
                    Kéo & thả file vào đây
                  </span>
                  <span className="text-xs text-slate-500 mt-0.5">
                    hoặc bấm để chọn từ máy tính
                  </span>
                </>
              )}
            </div>
          </div>

          {/* PREVIEW TABLE */}
          {file && previewData.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
                Xem trước dữ liệu import ({previewData.length} Dòng)
              </span>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                      <th className="py-2.5 px-4">Tên dịch vụ</th>
                      <th className="py-2.5 px-3">Phân loại</th>
                      <th className="py-2.5 px-3 text-right">Giá</th>
                      <th className="py-2.5 px-3 text-center">Thời gian</th>
                      <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                        <td className="py-2 px-4 font-semibold text-slate-800">{row.service_name}</td>
                        <td className="py-2 px-3 text-slate-500">{row.category_name}</td>
                        <td className="py-2 px-3 text-right font-bold text-[#00285E]">{row.price.toLocaleString("vi-VN")} đ</td>
                        <td className="py-2 px-3 text-center font-semibold">{row.estimated_duration} phút</td>
                        <td className="py-2 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                            Hoạt động
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="text-xs text-slate-500 leading-relaxed bg-amber-50/40 border border-amber-100 rounded p-3">
            <span className="font-bold text-[#C27803]">Lưu ý:</span> Định dạng file import phải chứa các cột tiêu đề:{" "}
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
                <span>Đang nhập dữ liệu...</span>
              </>
            ) : (
              <>
                <Upload size={16} />
                <span>Xác nhận nhập</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
