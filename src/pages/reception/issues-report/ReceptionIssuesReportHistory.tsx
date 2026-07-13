import { useState, useMemo, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import type { GetIssuesReportItemResponse } from "../../../model/dto/receptionistIssueReports.dto";
import {
  History,
  Search,
  Filter,
  ClipboardList,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Eye,
  X,
  Users,
  Car,
  FileText,
  Trash2,
} from "lucide-react";
import {ISSUE_REPORTS_ENDPOINTS} from "../../../constants/reception/issueReportsApiEndPoints";
import {useFetchClient} from "../../../hook/useFetchClient";
import type { CreateQuotationRequest, GetServicesResponse, GetSparePartsResponse } from "../../../model/dto/quoteManagement.dto";
import { QUOTE_MANAGEMENT_ENDPOINTS } from "../../../constants/reception/quoteManagementEndpoints";

// 1 báo cáo = các issues cùng task (gom nhiều hạng mục linh kiện)
interface IssueReport {
  taskId: number;
  taskStatus?: string;
  code: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  vehiclePlate: string;
  vehicleName: string;
  vehicleColor: string;
  note: string | null;
  items: GetIssuesReportItemResponse[];
}

// 1 dịch vụ đã chọn trong form báo giá, gắn với 1 hạng mục lỗi để đồng bộ issue_id
interface QuotationServiceForm {
  issueId: number;
  serviceId: number;
  serviceName: string;
  fee: number;
}

// 1 dòng trong form báo giá: hạng mục lỗi + sản phẩm chọn từ hệ thống
interface QuotationItemForm {
  issueId: number;
  componentName: string;
  description: string;
  partId: number | null;
  quantity: number;
  unitPrice: number;
}

const ITEMS_PER_PAGE = 5;

const formatVND = (value: number) =>
  `${new Intl.NumberFormat("vi-VN").format(value)} VND`;

export default function ReceptionIssuesReportHistory() {
  // TODO: tự viết hàm fetch API rồi setIssues(data) + setIsLoading
  const {fetchPrivate} = useFetchClient();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();
  const [issues, setIssues] = useState<GetIssuesReportItemResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState<IssueReport | null>(
    null,
  );
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [quotationReport, setQuotationReport] = useState<IssueReport | null>(
    null,
  );
  const [quotationItems, setQuotationItems] = useState<QuotationItemForm[]>(
    [],
  );
  const [quotationServices, setQuotationServices] = useState<
    QuotationServiceForm[]
  >([]);
  const [quotationNote, setQuotationNote] = useState("");
  const [spareParts, setSpareParts] = useState<GetSparePartsResponse[]>([]);
  const [services, setServices] = useState<GetServicesResponse[]>([]);

  const openQuotationModal = (report: IssueReport) => {
    setQuotationReport(report);
    setQuotationItems(
      report.items.map((item) => ({
        issueId: item.id,
        componentName:
          item.component?.name || `Linh kiện #${item.component?.id ?? item.id}`,
        description: item.error_description || "",
        partId: null,
        quantity: 1,
        unitPrice: 0,
      })),
    );
    setQuotationServices([]);
    setQuotationNote("");
  };

  // Thêm 1 dịch vụ: phí lấy theo labor_price, mặc định gắn với hạng mục lỗi
  // đầu tiên (đổi được ở từng dòng) để dòng dịch vụ cũng có issue_id
  const addQuotationService = (id: number) => {
    const service = services.find((s) => s.id === id);
    const defaultIssueId = quotationItems[0]?.issueId;
    if (!service || defaultIssueId == null) return;
    setQuotationServices((prev) =>
      prev.some((s) => s.serviceId === id)
        ? prev
        : [
            ...prev,
            {
              issueId: defaultIssueId,
              serviceId: id,
              serviceName: service.service_name,
              fee: Number(service.labor_price ?? 0) || 0,
            },
          ],
    );
  };

  const updateQuotationServiceIssue = (serviceId: number, issueId: number) =>
    setQuotationServices((prev) =>
      prev.map((s) => (s.serviceId === serviceId ? { ...s, issueId } : s)),
    );

  const updateQuotationServiceFee = (serviceId: number, fee: number) =>
    setQuotationServices((prev) =>
      prev.map((s) =>
        s.serviceId === serviceId ? { ...s, fee: Math.max(0, fee) } : s,
      ),
    );

  const removeQuotationService = (serviceId: number) =>
    setQuotationServices((prev) =>
      prev.filter((s) => s.serviceId !== serviceId),
    );

  const getRemainingStock = (
    items: QuotationItemForm[],
    issueId: number,
    partId: number | null,
  ) => {
    if (!partId) return Infinity;
    const part = spareParts.find((p) => p.id === partId);
    if (!part) return Infinity;
    const usedByOthers = items.reduce(
      (sum, it) =>
        it.issueId !== issueId && it.partId === partId
          ? sum + it.quantity
          : sum,
      0,
    );
    return Math.max(0, part.stock_quantity - usedByOthers);
  };

  // Chọn sản phẩm trong hệ thống cho 1 dòng -> đơn giá tự lấy theo giá bán lẻ,
  // số lượng hiện tại bị kẹp lại theo tồn kho còn lại của sản phẩm mới
  const selectQuotationPart = (issueId: number, partId: number | null) => {
    const part = spareParts.find((p) => p.id === partId);
    setQuotationItems((prev) =>
      prev.map((item) => {
        if (item.issueId !== issueId) return item;
        const remaining = getRemainingStock(prev, issueId, partId);
        return {
          ...item,
          partId,
          // Number() để phòng BE trả DECIMAL dạng chuỗi ("150000.00")
          unitPrice: Number(part?.retail_price ?? 0) || 0,
          quantity: part
            ? Math.min(Math.max(1, item.quantity), remaining)
            : item.quantity,
        };
      }),
    );
  };

  // Số lượng không được vượt quá tồn kho còn lại của sản phẩm đã chọn
  const updateQuotationQuantity = (issueId: number, quantity: number) =>
    setQuotationItems((prev) =>
      prev.map((item) => {
        if (item.issueId !== issueId) return item;
        const remaining = getRemainingStock(prev, issueId, item.partId);
        return {
          ...item,
          quantity: Math.min(Math.max(0, quantity), remaining),
        };
      }),
    );

  const removeQuotationItem = (issueId: number) =>
    setQuotationItems((prev) =>
      prev.filter((item) => item.issueId !== issueId),
    );

  const quotationPartsTotal = quotationItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const quotationServicesTotal = quotationServices.reduce(
    (sum, s) => sum + s.fee,
    0,
  );
  const quotationTotal = quotationPartsTotal + quotationServicesTotal;

  useEffect(()=>{
    handleGetSpareParts();
  },[]);
  
  const handleGetSpareParts = async () => {
    try {
      const result = await fetchPrivate(QUOTE_MANAGEMENT_ENDPOINTS.GET_SPARE_PARTS, "GET");
      setSpareParts(result.data);
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    handleGetServices();
  },[])

  const handleGetServices = async () => {
    try {
      const result = await fetchPrivate(QUOTE_MANAGEMENT_ENDPOINTS.GET_SERVICES, "GET");
      setServices(result.data);
    } catch (error) {
      console.error(error)
    }
  }

  const handleCreateQuotation = async () => {
    if (!quotationReport) return;
    try {
      // Dòng phụ tùng lẫn dòng dịch vụ đều gắn issue_id để đồng bộ QuotationDetail
      const payload: CreateQuotationRequest = {
        task_id: quotationReport.taskId,
        items: [
          ...quotationItems
            .filter((i) => i.partId)
            .map((i) => ({
              issue_id: i.issueId,
              spare_part_id: i.partId!,
              quantity: i.quantity,
            })),
          ...quotationServices.map((s) => ({
            issue_id: s.issueId,
            service_id: s.serviceId,
            quantity: 1,
            repair_price: s.fee,
          })),
        ],
        note: quotationNote,
      };
      await fetchPrivate(QUOTE_MANAGEMENT_ENDPOINTS.CREATE_QUOTATION,"POST",payload);
      setQuotationReport(null);
      showToast("Tạo báo giá thành công!", "success");
    } catch (error: any) {
      console.error(error.message);
      showToast(
        error?.message || "Đã xảy ra lỗi khi tạo báo giá.",
        "warning",
      );
    }
  };

  useEffect(() => {
    getIssueReports();
  },[]);

  const getIssueReports = async () => {
    try {
      const result = await fetchPrivate(ISSUE_REPORTS_ENDPOINTS.ISSUES_REPORT, "GET");
      console.log("issue đầu tiên:", result.data?.[0]);   

      setIssues(result.data);
    } catch (error) {
      console.error(error);
    }
  }

  const openReportDetail = (report: IssueReport) => {
    setSelectedReport(report);
    // Mặc định mở sẵn tất cả danh mục để xem nhanh
    const expanded: Record<string, boolean> = {};
    report.items.forEach((item) => {
      expanded[item.component?.parent?.name ?? "Khác"] = true;
    });
    setExpandedCategories(expanded);
  };

  const toggleCategoryExpanded = (category: string) =>
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));

  // Cha (parent) = danh mục, con = linh kiện — giống modal tạo báo cáo
  const reportItemsByCategory = useMemo(() => {
    const groups: {
      category: string;
      items: GetIssuesReportItemResponse[];
    }[] = [];
    (selectedReport?.items ?? []).forEach((item) => {
      const category = item.component?.parent?.name ?? "Khác";
      let group = groups.find((g) => g.category === category);
      if (!group) {
        group = { category, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    });
    return groups;
  }, [selectedReport]);

  // Gom các issues cùng task thành 1 báo cáo (1 report có nhiều hạng mục)
  const reports = useMemo<IssueReport[]>(() => {
    const groups: IssueReport[] = [];
    issues.forEach((issue) => {
      const taskId = issue.task?.id ?? 0;
      let group = groups.find((g) => g.taskId === taskId);
      if (!group) {
        const vehicle = issue.task?.serviceOrder?.vehicle;
        const customer = vehicle?.customer;
        group = {
          taskId,
          taskStatus: issue.task?.status,
          code: "",
          createdAt: issue.createdAt,
          customerName:
            customer?.name || customer?.user?.fullName || "Khách vãng lai",
          customerPhone: customer?.phone || customer?.user?.phone || "",
          vehiclePlate: vehicle?.license_plate || "",
          vehicleName: vehicle?.model?.model_name || "",
          vehicleColor: vehicle?.color || "",
          note: issue.note,
          items: [],
        };
        groups.push(group);
      }
      group.items.push(issue);
    });

    // Sinh mã ddMMyyyy-stt: stt đánh theo thứ tự createdAt trong cùng ngày
    const counters: Record<string, number> = {};
    [...groups]
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
      .forEach((g) => {
        const d = new Date(g.createdAt);
        const dateKey = `${String(d.getDate()).padStart(2, "0")}${String(
          d.getMonth() + 1,
        ).padStart(2, "0")}${d.getFullYear()}`;
        counters[dateKey] = (counters[dateKey] ?? 0) + 1;
        g.code = `BC-${dateKey}-${String(counters[dateKey]).padStart(2, "0")}`;
      });

    return groups;
  }, [issues]);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const keyword = searchTerm.toLowerCase();
      const matchSearch =
        searchTerm === "" ||
        report.items.some(
          (item) =>
            item.component?.name?.toLowerCase().includes(keyword) ||
            item.component?.parent?.name?.toLowerCase().includes(keyword) ||
            item.error_description?.toLowerCase().includes(keyword),
        ) ||
        report.note?.toLowerCase().includes(keyword) ||
        report.customerName.toLowerCase().includes(keyword) ||
        report.vehiclePlate.toLowerCase().includes(keyword) ||
        report.code.toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "all" || report.taskStatus === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [searchTerm, statusFilter, reports]);

  const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredReports.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredReports, currentPage]);

  const kpiCounts = useMemo(
    () => ({
      total: reports.length,
    }),
    [reports],
  );

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2 flex items-center gap-2">
          <History className="text-[#F9A11B]" size={28} />
          Danh sách báo cáo lỗi
        </h1>
        <p className="text-slate-500 text-sm">
          Xem lại các báo cáo lỗi kỹ thuật viên đã tạo sau khi kiểm tra xe.
        </p>
      </div>

      {/* TỔNG BÁO CÁO + SEARCH & FILTER */}
      <div className="flex flex-col md:flex-row items-stretch gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs md:w-60 shrink-0">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Tổng báo cáo
              </span>
              <span className="text-2xl font-bold text-slate-900 tracking-tight block">
                {kpiCounts.total}
              </span>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#EDF3FF", color: "#00285E" }}
            >
              <ClipboardList size={22} />
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex-1 flex flex-col md:flex-row items-stretch md:items-center gap-4">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Tìm theo tên khách, biển số xe, hạng mục linh kiện, mô tả lỗi..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="IN_PROGRESS">Đang thực hiện</option>
              <option value="PAUSED">Tạm dừng</option>
              <option value="PENDING_QC">Chờ QC</option>
              <option value="COMPLETED">Hoàn thành</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 size={48} className="mb-4 text-[#00285E] animate-spin" />
            <p className="text-lg font-semibold mb-1 text-slate-700">
              Đang tải lịch sử báo cáo...
            </p>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <AlertCircle size={48} className="mb-4 text-slate-300" />
            <p className="text-lg font-semibold mb-1">
              Chưa có báo cáo lỗi nào
            </p>
            <p className="text-sm">
              Thử thay đổi từ khóa hoặc bộ lọc trạng thái.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th className="py-3 px-4 align-middle whitespace-nowrap">
                    ID
                  </th>
                  <th className="py-3 px-4 align-middle whitespace-nowrap">
                    Khách hàng
                  </th>
                  <th className="py-3 px-4 align-middle whitespace-nowrap">
                    Xe
                  </th>
                  <th className="py-3 px-4 align-middle">
                    Hạng mục linh kiện
                  </th>
                  <th className="py-3 px-4 align-middle text-center whitespace-nowrap">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((report) => {
                  const visibleItems = report.items.slice(0, 3);
                  const hiddenCount = report.items.length - visibleItems.length;
                  return (
                    <tr
                      key={report.taskId}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <span className="font-bold text-[#00285E] text-xs">
                          {report.code}
                        </span>
                      </td>
                      <td className="py-4 px-4 align-middle">
                        <div className="flex items-center gap-2 min-w-[160px]">
                          <div className="w-8 h-8 shrink-0 rounded-full bg-[#EDF3FF] flex items-center justify-center">
                            <Users size={14} className="text-[#00285E]" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-700 text-xs truncate">
                              {report.customerName}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {report.customerPhone}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-middle">
                        <div className="flex items-center gap-1.5 min-w-[140px]">
                          <Car size={13} className="text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-700 text-xs truncate">
                              {report.vehiclePlate || "—"}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {report.vehicleName}
                              {report.vehicleColor &&
                                ` · ${report.vehicleColor}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-middle">
                        <div className="flex flex-wrap gap-1 min-w-[200px] max-w-[300px]">
                          {visibleItems.map((item) => (
                            <span
                              key={item.id}
                              className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-600 font-medium"
                              title={item.error_description}
                            >
                              {item.component?.name ||
                                `#${item.component?.id ?? item.id}`}
                            </span>
                          ))}
                          {hiddenCount > 0 && (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-[#EDF3FF] text-[10px] text-[#00285E] font-bold">
                              +{hiddenCount} khác
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 align-middle">
                        <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                          <button
                            onClick={() => openReportDetail(report)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                          >
                            <Eye size={13} />
                            Chi tiết
                          </button>
                          <button
                            onClick={() => openQuotationModal(report)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#00285E] bg-[#EDF3FF] hover:bg-[#DCE8FF] transition-colors"
                          >
                            <FileText size={13} />
                            Tạo báo giá
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-400">
              Hiển thị {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredReports.length)}{" "}
              / {filteredReports.length} báo cáo
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      page === currentPage
                        ? "bg-[#00285E] text-white shadow-md"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL CHI TIẾT BÁO CÁO */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setSelectedReport(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5">
            <div
              className="relative flex items-start justify-between px-7 pt-7 pb-6 shrink-0 text-white overflow-hidden"
              style={{ backgroundColor: "#00285E" }}
            >
              <div className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-white/10" />
              <div className="absolute -bottom-14 -left-6 w-40 h-40 rounded-full bg-white/5" />
              <div className="relative flex items-center gap-4">
                <div
                  className="flex items-center justify-center w-12 h-12 rounded-2xl shrink-0"
                  style={{ backgroundColor: "#F9A11B" }}
                >
                  <ClipboardList size={24} className="text-white" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-white/80 uppercase tracking-widest">
                    Báo cáo {selectedReport.code}
                  </p>
                  <h3 className="text-xl font-bold text-white leading-none">
                    Chi tiết báo cáo lỗi
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="relative p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-7 py-6 space-y-5 bg-slate-50/50">
              {/* Thông tin khách hàng & xe */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
                    Khách hàng
                  </span>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3">
                      <span className="w-14 shrink-0 text-xs text-slate-400">
                        Tên
                      </span>
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {selectedReport.customerName}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="w-14 shrink-0 text-xs text-slate-400">
                        SĐT
                      </span>
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {selectedReport.customerPhone || "—"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
                    Phương tiện
                  </span>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3">
                      <span className="w-14 shrink-0 text-xs text-slate-400">
                        Biển số
                      </span>
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {selectedReport.vehiclePlate || "—"}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="w-14 shrink-0 text-xs text-slate-400">
                        Tên xe
                      </span>
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {selectedReport.vehicleName || "—"}
                        {selectedReport.vehicleColor &&
                          ` · ${selectedReport.vehicleColor}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danh sách hạng mục linh kiện (nhóm cha - con như modal tạo báo cáo) */}
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <label className="text-sm font-bold text-slate-700">
                    Hạng mục linh kiện
                  </label>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: "#00285E", color: "#fff" }}
                  >
                    {selectedReport.items.length} mục đã báo cáo
                  </span>
                </div>
                <div className="space-y-2.5">
                  {reportItemsByCategory.map((group) => {
                    const isExpanded = !!expandedCategories[group.category];
                    return (
                      <div
                        key={group.category}
                        className="bg-white rounded-2xl border overflow-hidden transition-colors"
                        style={{ borderColor: "#00285E" }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleCategoryExpanded(group.category)}
                          className="w-full flex items-center justify-between gap-2 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors"
                        >
                          <span
                            className="text-sm font-semibold"
                            style={{ color: "#00285E" }}
                          >
                            {group.category}
                          </span>
                          <span className="flex items-center gap-3">
                            <span
                              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: "#FEF3C7",
                                color: "#B45309",
                              }}
                            >
                              {group.items.length} lỗi
                            </span>
                            {isExpanded ? (
                              <ChevronUp size={16} className="text-slate-400" />
                            ) : (
                              <ChevronDown
                                size={16}
                                className="text-slate-400"
                              />
                            )}
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-3 pt-0.5 space-y-2 border-t border-slate-100">
                            {group.items.map((item) => (
                              <div
                                key={item.id}
                                className="rounded-xl px-3 py-2.5 border"
                                style={{
                                  backgroundColor: "#EDF3FF",
                                  borderColor: "#c7d7f0",
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <AlertCircle
                                    size={15}
                                    className="shrink-0"
                                    style={{ color: "#00285E" }}
                                  />
                                  <span
                                    className="text-sm font-medium"
                                    style={{ color: "#00285E" }}
                                  >
                                    {item.component?.name ||
                                      `Linh kiện #${item.component?.id ?? item.id}`}
                                  </span>
                                </div>
                                <p className="mt-1.5 ml-7 text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                                  {item.error_description ||
                                    "Không có mô tả lỗi."}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ghi chú chung */}
              <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <ClipboardList size={13} className="text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Ghi chú chung
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedReport.note || "Không có ghi chú."}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end px-7 py-4 border-t border-slate-200 shrink-0 bg-white">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-6 py-2.5 rounded-full text-sm font-semibold text-white shadow-lg shadow-[#00285E]/20 hover:brightness-125 transition-all"
                style={{ backgroundColor: "#00285E" }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL TẠO BÁO GIÁ */}
      {quotationReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setQuotationReport(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5">
            <div
              className="relative flex items-start justify-between px-7 pt-7 pb-6 shrink-0 text-white overflow-hidden"
              style={{ backgroundColor: "#00285E" }}
            >
              <div className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-white/10" />
              <div className="absolute -bottom-14 -left-6 w-40 h-40 rounded-full bg-white/5" />
              <div className="relative flex items-center gap-4">
                <div
                  className="flex items-center justify-center w-12 h-12 rounded-2xl shrink-0"
                  style={{ backgroundColor: "#F9A11B" }}
                >
                  <FileText size={24} className="text-white" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-white/80 uppercase tracking-widest">
                    Báo cáo {quotationReport.code}
                  </p>
                  <h3 className="text-xl font-bold text-white leading-none">
                    Tạo báo giá
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setQuotationReport(null)}
                className="relative p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-7 py-6 space-y-5 bg-slate-50/50">
              {/* Thông tin khách hàng & xe */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
                    Khách hàng
                  </span>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3">
                      <span className="w-14 shrink-0 text-xs text-slate-400">
                        Tên
                      </span>
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {quotationReport.customerName}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="w-14 shrink-0 text-xs text-slate-400">
                        SĐT
                      </span>
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {quotationReport.customerPhone || "—"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
                    Phương tiện
                  </span>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3">
                      <span className="w-14 shrink-0 text-xs text-slate-400">
                        Biển số
                      </span>
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {quotationReport.vehiclePlate || "—"}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="w-14 shrink-0 text-xs text-slate-400">
                        Tên xe
                      </span>
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {quotationReport.vehicleName || "—"}
                        {quotationReport.vehicleColor &&
                          ` · ${quotationReport.vehicleColor}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hạng mục báo giá */}
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <label className="text-sm font-bold text-slate-700">
                    Hạng mục báo giá
                  </label>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: "#00285E", color: "#fff" }}
                  >
                    {quotationItems.length} hạng mục
                  </span>
                </div>
                {quotationItems.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200/70 p-6 text-center text-sm text-slate-400">
                    Chưa có hạng mục nào trong báo giá.
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                            <th className="py-3 px-4 align-middle">
                              Hạng mục lỗi
                            </th>
                            <th className="py-3 px-4 align-middle">
                              Sản phẩm trong kho
                            </th>
                            <th className="py-3 px-3 align-middle w-20">SL</th>
                            <th className="py-3 px-4 align-middle text-right whitespace-nowrap">
                              Thành tiền
                            </th>
                            <th className="py-3 px-2 align-middle w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {quotationItems.map((item) => {
                            const selectedPart = spareParts.find(
                              (p) => p.id === item.partId,
                            );
                            const remainingStock = getRemainingStock(
                              quotationItems,
                              item.issueId,
                              item.partId,
                            );
                            return (
                              <tr
                                key={item.issueId}
                                className="border-b border-slate-100 last:border-0 align-top"
                              >
                                <td className="py-3.5 px-4">
                                  <p
                                    className="text-xs font-semibold text-slate-800 max-w-[150px] truncate"
                                    title={item.componentName}
                                  >
                                    {item.componentName}
                                  </p>
                                  {item.description && (
                                    <p
                                      className="text-[11px] text-slate-400 max-w-[150px] truncate mt-0.5"
                                      title={item.description}
                                    >
                                      {item.description}
                                    </p>
                                  )}
                                </td>
                                <td className="py-3.5 px-4">
                                  <select
                                    value={item.partId ?? ""}
                                    onChange={(e) =>
                                      selectQuotationPart(
                                        item.issueId,
                                        e.target.value
                                          ? Number(e.target.value)
                                          : null,
                                      )
                                    }
                                    className={`w-full min-w-[180px] bg-slate-50 border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors ${
                                      item.partId
                                        ? "border-slate-200 text-slate-800"
                                        : "border-amber-300 text-slate-400"
                                    }`}
                                  >
                                    <option value="">
                                      -- Chọn sản phẩm --
                                    </option>
                                    {spareParts.map((part) => (
                                      <option key={part.id} value={part.id}>
                                        {part.name}
                                        {part.brand ? ` - ${part.brand}` : ""}
                                        {` (tồn: ${part.stock_quantity})`}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="py-3.5 px-3">
                                  <input
                                    type="number"
                                    min={0}
                                    max={
                                      selectedPart ? remainingStock : undefined
                                    }
                                    value={item.quantity}
                                    onChange={(e) =>
                                      updateQuotationQuantity(
                                        item.issueId,
                                        Number(e.target.value),
                                      )
                                    }
                                    className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-800 text-center focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors"
                                  />
                                </td>
                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                  <span className="text-xs font-bold text-[#00285E]">
                                    {formatVND(
                                      item.quantity *
                                        (Number(selectedPart?.retail_price) ||
                                          item.unitPrice),
                                    )}
                                  </span>
                                </td>
                                <td className="py-3.5 px-2 text-center">
                                  <button
                                    onClick={() =>
                                      removeQuotationItem(item.issueId)
                                    }
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                    title="Xóa hạng mục"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {quotationItems.some((i) => !i.partId) &&
                  quotationItems.length > 0 && (
                    <p className="flex items-center gap-1.5 text-xs text-amber-600 mt-2 px-1">
                      <AlertCircle size={13} className="shrink-0" />
                      Chọn sản phẩm trong kho cho tất cả hạng mục để tạo báo
                      giá.
                    </p>
                  )}
              </div>

              {/* Dịch vụ (mỗi dịch vụ gắn với 1 hạng mục lỗi) */}
              <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-slate-700">
                    Dịch vụ
                  </label>
                  {quotationServices.length > 0 && (
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: "#00285E", color: "#fff" }}
                    >
                      {quotationServices.length} dịch vụ
                    </span>
                  )}
                </div>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value)
                      addQuotationService(Number(e.target.value));
                  }}
                  className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors ${
                    quotationServices.length > 0
                      ? "border-slate-200 text-slate-500"
                      : "border-amber-300 text-slate-400"
                  }`}
                >
                  <option value="">-- Thêm dịch vụ trong hệ thống --</option>
                  {services
                    .filter(
                      (service) =>
                        !quotationServices.some(
                          (s) => s.serviceId === service.id,
                        ),
                    )
                    .map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.service_name}
                      </option>
                    ))}
                </select>
                {quotationServices.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {quotationServices.map((service) => (
                      <div
                        key={service.serviceId}
                        className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5"
                      >
                        <span className="flex-1 min-w-[140px] text-sm font-semibold text-slate-800 truncate">
                          {service.serviceName}
                        </span>
                        {/* Hạng mục lỗi liên quan -> issue_id của dòng dịch vụ */}
                        <select
                          value={service.issueId}
                          onChange={(e) =>
                            updateQuotationServiceIssue(
                              service.serviceId,
                              Number(e.target.value),
                            )
                          }
                          className="w-44 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors"
                          title="Hạng mục lỗi liên quan"
                        >
                          {quotationItems.map((item) => (
                            <option key={item.issueId} value={item.issueId}>
                              {item.componentName}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={service.fee}
                          onChange={(e) =>
                            updateQuotationServiceFee(
                              service.serviceId,
                              Number(e.target.value),
                            )
                          }
                          className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 text-right focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors"
                        />
                        <span className="w-28 text-right text-xs font-bold text-[#00285E] whitespace-nowrap">
                          {formatVND(service.fee)}
                        </span>
                        <button
                          onClick={() =>
                            removeQuotationService(service.serviceId)
                          }
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                          title="Xóa dịch vụ"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ghi chú */}
              <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <ClipboardList size={13} className="text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Ghi chú
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={quotationNote}
                  onChange={(e) => setQuotationNote(e.target.value)}
                  placeholder="Ghi chú thêm cho báo giá..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-7 py-4 border-t border-slate-200 shrink-0 bg-white">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Tổng cộng
                </span>
                <span className="text-lg font-bold text-[#00285E]">
                  {formatVND(quotationTotal)}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setQuotationReport(null)}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateQuotation}
                  disabled={
                    quotationItems.length === 0 ||
                    quotationItems.some((i) => !i.partId || i.quantity <= 0) ||
                    quotationServices.length === 0
                  }
                  style={{ backgroundColor: "#00285E" }}
                  className="px-6 py-2.5 rounded-full text-sm font-semibold text-white shadow-lg shadow-[#00285E]/20 hover:brightness-125 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Tạo báo giá
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
