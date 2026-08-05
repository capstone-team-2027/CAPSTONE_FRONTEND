import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Car,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Eye,
  FileText,
  Loader2,
  Search,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useFetchClient } from "../../../hook/useFetchClient";
import { useSocket } from "../../../hook/useSocket";
import { useNavigate } from "react-router-dom";
import { ISSUE_REPORTS_ENDPOINTS } from "../../../constants/reception/issueReportsApiEndPoints";
import type { GetIssuesReportItemResponse } from "../../../model/dto/receptionistIssueReports.dto";
import { QUOTE_MANAGEMENT_ENDPOINTS } from "../../../constants/reception/quoteManagementEndpoints";
import type {
  CreateQuotationRequest,
  GetAllSparePartsResponse,
  GetServicesResponse,
} from "../../../model/dto/quoteManagement.dto";

interface AdditionalIssueReport {
  taskId: number;
  serviceOrderId?: number;
  code: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  vehiclePlate: string;
  vehicleName: string;
  vehicleColor: string;
  items: GetIssuesReportItemResponse[];
}

const ITEMS_PER_PAGE = 5;

interface SupplementalQuoteItem {
  issueId: number;
  serviceId: number | "";
  partId: number | "";
  quantity: number;
}

const formatVND = (value: number) =>
  `${new Intl.NumberFormat("vi-VN").format(value)} VND`;

const formatDateTime = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const makeReportCode = (createdAt: string, index: number) => {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return `LPS-${String(index + 1).padStart(2, "0")}`;
  const dateKey = `${String(date.getDate()).padStart(2, "0")}${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}${date.getFullYear()}`;
  return `LPS-${dateKey}-${String(index + 1).padStart(2, "0")}`;
};

export default function ReceptionAdditionalIssues() {
  const navigate = useNavigate();
  const { fetchPrivate } = useFetchClient();
  const socket = useSocket();

  const [issues, setIssues] = useState<GetIssuesReportItemResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReport, setSelectedReport] =
    useState<AdditionalIssueReport | null>(null);
  const [quotationReport, setQuotationReport] =
    useState<AdditionalIssueReport | null>(null);
  const [quotationItems, setQuotationItems] = useState<
    SupplementalQuoteItem[]
  >([]);
  const [quotationNote, setQuotationNote] = useState("");
  const [services, setServices] = useState<GetServicesResponse[]>([]);
  const [spareParts, setSpareParts] = useState<GetAllSparePartsResponse[]>([]);
  const [isCreatingQuotation, setIsCreatingQuotation] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [errorMessage, setErrorMessage] = useState("");

  const loadAdditionalIssues = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      // BE đã gộp danh sách lỗi INSPECTION + REPAIR chung vào 1 endpoint (ISSUES_REPORT).
      // Endpoint /issues/additional riêng đã bị xóa — trang này giữ lại làm UI phụ (lỡ cần
      // dùng sau), nhưng phải trỏ về endpoint chung để không bị lỗi 404.
      const response = await fetchPrivate<GetIssuesReportItemResponse[]>(
        ISSUE_REPORTS_ENDPOINTS.ISSUES_REPORT,
      );
      const data = Array.isArray(response) ? response : response?.data ?? [];
      setIssues(data);
    } catch (error) {
      console.error("Lỗi khi tải lỗi phát sinh:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách lỗi phát sinh.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAdditionalIssues();
    // fetchPrivate được tạo lại theo render ở hook hiện tại; không đưa vào deps
    // để tránh gọi API liên tục sau mỗi lần setState.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Có lỗi phát sinh mới -> BE emit new_notification -> tự tải lại danh sách
  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = () => {
      void loadAdditionalIssues();
    };
    socket.on("new_notification", handleNewNotification);
    return () => {
      socket.off("new_notification", handleNewNotification);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  useEffect(() => {
    const loadQuotationResources = async () => {
      try {
        const [servicesResult, partsResult] = await Promise.all([
          fetchPrivate(QUOTE_MANAGEMENT_ENDPOINTS.GET_SERVICES, "GET"),
          fetchPrivate(QUOTE_MANAGEMENT_ENDPOINTS.GET_SPARE_PARTS, "GET"),
        ]);
        setServices(servicesResult?.data ?? []);
        setSpareParts(partsResult?.data ?? []);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu tạo báo giá bổ sung:", error);
      }
    };

    void loadQuotationResources();
    // fetchPrivate được tạo lại theo render ở hook hiện tại; không đưa vào deps
    // để tránh gọi API liên tục sau mỗi lần setState.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reports = useMemo<AdditionalIssueReport[]>(() => {
    const groups = new Map<number, AdditionalIssueReport>();

    issues.forEach((issue) => {
      const taskId = issue.task?.id ?? issue.id;
      const vehicle = issue.task?.serviceOrder?.vehicle;
      const customer = vehicle?.customer;
      const existing = groups.get(taskId);

      if (existing) {
        existing.items.push(issue);
        if (new Date(issue.createdAt).getTime() < new Date(existing.createdAt).getTime()) {
          existing.createdAt = issue.createdAt;
        }
        return;
      }

      groups.set(taskId, {
        taskId,
        serviceOrderId: issue.task?.serviceOrder?.id,
        code: "",
        createdAt: issue.createdAt,
        customerName:
          customer?.name || customer?.user?.fullName || "Khách vãng lai",
        customerPhone: customer?.phone || customer?.user?.phoneNumber || "",
        vehiclePlate: vehicle?.license_plate || "",
        vehicleName: vehicle?.model?.model_name || "",
        vehicleColor: vehicle?.color || "",
        items: [issue],
      });
    });

    return Array.from(groups.values())
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .map((report, index) => ({
        ...report,
        code: makeReportCode(report.createdAt, index),
      }));
  }, [issues]);

  const filteredReports = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return reports;
    return reports.filter(
      (report) =>
        report.code.toLowerCase().includes(keyword) ||
        report.customerName.toLowerCase().includes(keyword) ||
        report.customerPhone.toLowerCase().includes(keyword) ||
        report.vehiclePlate.toLowerCase().includes(keyword) ||
        report.vehicleName.toLowerCase().includes(keyword) ||
        report.items.some(
          (item) =>
            item.component?.name?.toLowerCase().includes(keyword) ||
            item.component?.parent?.name?.toLowerCase().includes(keyword) ||
            item.error_description?.toLowerCase().includes(keyword) ||
            item.note?.toLowerCase().includes(keyword),
        ),
    );
  }, [reports, searchTerm]);

  const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);
  const currentPageSafe = Math.min(Math.max(currentPage, 1), totalPages || 1);
  const paginatedReports = useMemo(() => {
    const start = (currentPageSafe - 1) * ITEMS_PER_PAGE;
    return filteredReports.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredReports, currentPageSafe]);

  const reportItemsByCategory = useMemo(() => {
    const groups: {
      category: string;
      items: GetIssuesReportItemResponse[];
    }[] = [];

    (selectedReport?.items ?? []).forEach((item) => {
      const category =
        item.component?.parent?.name || item.component?.name || "Khác";
      let group = groups.find((current) => current.category === category);
      if (!group) {
        group = { category, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    });

    return groups;
  }, [selectedReport]);

  const toggleCategoryExpanded = (category: string) => {
    setExpandedCategories((current) => ({
      ...current,
      [category]: !current[category],
    }));
  };

  const openSupplementalQuotationModal = (report: AdditionalIssueReport) => {
    setQuotationReport(report);
    setSelectedReport(null);
    setQuotationItems(
      report.items.map((issue) => ({
        issueId: issue.id,
        serviceId: "",
        partId: "",
        quantity: 1,
      })),
    );
    setQuotationNote("");
  };

  const updateQuotationItem = (
    issueId: number,
    updates: Partial<SupplementalQuoteItem>,
  ) => {
    setQuotationItems((current) =>
      current.map((item) =>
        item.issueId === issueId ? { ...item, ...updates } : item,
      ),
    );
  };

  const quotationTotal = quotationItems.reduce((sum, item) => {
    const service = services.find((entry) => entry.id === item.serviceId);
    const part = spareParts.find((entry) => entry.id === item.partId);
    return (
      sum +
      (Number(service?.labor_price) || 0) +
      (Number(part?.retail_price) || 0) * item.quantity
    );
  }, 0);

  const hasQuotationSelection = quotationItems.some(
    (item) => item.serviceId || item.partId,
  );

  const handleCreateSupplementalQuotation = async () => {
    if (!quotationReport) return;
    const items: CreateQuotationRequest["items"] = quotationItems.flatMap(
      (item) => {
        const rows: CreateQuotationRequest["items"] = [];
        const service = services.find((entry) => entry.id === item.serviceId);
        if (item.serviceId) {
          rows.push({
            issue_id: item.issueId,
            service_id: Number(item.serviceId),
            quantity: 1,
            repair_price: Number(service?.labor_price) || 0,
          });
        }
        if (item.partId) {
          rows.push({
            issue_id: item.issueId,
            spare_part_id: Number(item.partId),
            quantity: Math.max(1, item.quantity),
          });
        }
        return rows;
      },
    );

    if (items.length === 0) return;

    const payload: CreateQuotationRequest = {
      task_id: quotationReport.taskId,
      items,
      note: quotationNote.trim() || undefined,
    };

    try {
      setIsCreatingQuotation(true);
      await fetchPrivate(
        QUOTE_MANAGEMENT_ENDPOINTS.QUOTE_MANAGEMENT,
        "POST",
        payload,
      );
      setQuotationReport(null);
      setIssues((current) =>
        current.filter(
          (issue) =>
            !quotationReport.items.some(
              (quotedIssue) => quotedIssue.id === issue.id,
            ),
        ),
      );
      alert("Tạo báo giá bổ sung thành công!");
    } catch (error) {
      console.error("Lỗi khi tạo báo giá bổ sung:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi khi tạo báo giá bổ sung.",
      );
    } finally {
      setIsCreatingQuotation(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(-1)}
          title="Quay lại"
          className="mt-0.5 w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#00285E] hover:border-slate-300 active:scale-[0.97] transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2 flex items-center gap-2">
            <AlertCircle className="text-[#F9A11B]" size={28} />
            Lỗi phát sinh sửa chữa
          </h1>
          <p className="text-slate-500 text-sm">
            Theo dõi các lỗi phát sinh kỹ thuật viên ghi nhận trong quá trình sửa chữa, chưa được lập báo giá.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs md:w-60 shrink-0">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Tổng báo cáo
              </span>
              <span className="text-2xl font-bold text-slate-900 tracking-tight block">
                {reports.length}
              </span>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#FEF3C7", color: "#D97706" }}
            >
              <Wrench size={22} />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex-1">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm theo khách hàng, biển số, hạng mục lỗi, mô tả..."
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 size={48} className="mb-4 text-[#00285E] animate-spin" />
            <p className="text-lg font-semibold mb-1 text-slate-700">
              Đang tải lỗi phát sinh...
            </p>
          </div>
        ) : errorMessage ? (
          <div className="flex flex-col items-center justify-center py-20 text-rose-500">
            <AlertCircle size={48} className="mb-4" />
            <p className="text-lg font-semibold mb-1">{errorMessage}</p>
          </div>
        ) : paginatedReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <AlertCircle size={48} className="mb-4 text-slate-300" />
            <p className="text-lg font-semibold mb-1">
              Chưa có lỗi phát sinh nào
            </p>
            <p className="text-sm">
              Các lỗi phát sinh chưa lập báo giá sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th className="py-3 px-4 whitespace-nowrap">Mã</th>
                  <th className="py-3 px-4 whitespace-nowrap">Khách hàng</th>
                  <th className="py-3 px-4 whitespace-nowrap">Xe</th>
                  <th className="py-3 px-4">Lỗi phát sinh</th>
                  <th className="py-3 px-4 whitespace-nowrap">Ngày ghi nhận</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedReports.map((report) => {
                  const visibleItems = report.items.slice(0, 3);
                  const hiddenCount = report.items.length - visibleItems.length;
                  return (
                    <tr
                      key={report.taskId}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-bold text-[#00285E] text-xs">
                          {report.code}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 min-w-[170px]">
                          <div className="w-8 h-8 shrink-0 rounded-full bg-[#EDF3FF] flex items-center justify-center">
                            <Users size={14} className="text-[#00285E]" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-700 text-xs truncate">
                              {report.customerName}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {report.customerPhone || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 min-w-[150px]">
                          <Car size={13} className="text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-700 text-xs truncate">
                              {report.vehiclePlate || "—"}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {report.vehicleName || "—"}
                              {report.vehicleColor && ` · ${report.vehicleColor}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1 min-w-[220px] max-w-[340px]">
                          {visibleItems.map((item) => (
                            <span
                              key={item.id}
                              className="inline-block px-2 py-0.5 rounded-md bg-amber-50 text-[10px] text-amber-700 font-semibold"
                              title={item.error_description}
                            >
                              {item.component?.name || `#${item.id}`} -{" "}
                              {item.error_description || "—"}
                            </span>
                          ))}
                          {hiddenCount > 0 && (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-[#EDF3FF] text-[10px] text-[#00285E] font-bold">
                              +{hiddenCount} khác
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {formatDateTime(report.createdAt)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedReport(report)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                          >
                            <Eye size={13} />
                            Chi tiết
                          </button>
                          <button
                            onClick={() => openSupplementalQuotationModal(report)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#00285E] bg-[#EDF3FF] hover:bg-[#DCE8FF] transition-colors"
                          >
                            <FileText size={13} />
                            Tạo báo giá bổ sung
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-400">
              Hiển thị {(currentPageSafe - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(currentPageSafe * ITEMS_PER_PAGE, filteredReports.length)}{" "}
              / {filteredReports.length} báo cáo
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPageSafe - 1))}
                disabled={currentPageSafe === 1}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                    currentPageSafe === page
                      ? "bg-[#00285E] text-white"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPageSafe + 1))
                }
                disabled={currentPageSafe === totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setSelectedReport(null)}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
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
                    Chi tiết lỗi phát sinh
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

              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <label className="text-sm font-bold text-slate-700">
                    Hạng mục lỗi phát sinh
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
                              <ChevronDown size={16} className="text-slate-400" />
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
                                {item.note && (
                                  <p className="mt-1.5 ml-7 text-xs text-slate-400 leading-relaxed whitespace-pre-line">
                                    Ghi chú: {item.note}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 px-7 py-4 border-t border-slate-200 shrink-0 bg-white">
              <button
                onClick={() => openSupplementalQuotationModal(selectedReport)}
                className="px-6 py-2.5 rounded-full text-sm font-semibold text-white shadow-lg shadow-[#00285E]/20 hover:brightness-125 transition-all"
                style={{ backgroundColor: "#00285E" }}
              >
                Tạo báo giá bổ sung
              </button>
              <button
                onClick={() => setSelectedReport(null)}
                className="px-6 py-2.5 rounded-full text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {quotationReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setQuotationReport(null)}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
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
                    Tạo báo giá bổ sung
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

              <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
                <div className="grid grid-cols-[1fr_1fr_80px] gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <span>Dịch vụ bổ sung</span>
                  <span>Phụ tùng bổ sung</span>
                  <span className="text-center">SL</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {quotationReport.items.map((issue) => {
                    const quoteItem = quotationItems.find(
                      (item) => item.issueId === issue.id,
                    );
                    const selectedPart = spareParts.find(
                      (part) => part.id === quoteItem?.partId,
                    );
                    const selectedService = services.find(
                      (service) => service.id === quoteItem?.serviceId,
                    );
                    return (
                      <div
                        key={issue.id}
                        className="px-4 py-3.5"
                      >
                        <div className="mb-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                          <p className="text-sm font-semibold text-slate-800">
                            {issue.component?.parent?.name
                              ? `${issue.component.parent.name} - ${issue.component?.name || "—"}`
                              : issue.component?.name || "—"}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500 leading-relaxed whitespace-pre-line">
                            {issue.error_description || "—"}
                          </p>
                        </div>
                        <div className="grid grid-cols-[1fr_1fr_80px] gap-3 items-start">
                          <div>
                            <select
                              value={quoteItem?.serviceId ?? ""}
                              onChange={(event) =>
                                updateQuotationItem(issue.id, {
                                  serviceId: event.target.value
                                    ? Number(event.target.value)
                                    : "",
                                })
                              }
                              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#00285E]"
                            >
                              <option value="">-- Chọn dịch vụ --</option>
                              {services.map((service) => (
                                <option key={service.id} value={service.id}>
                                  {service.service_name}
                                </option>
                              ))}
                            </select>
                            {selectedService && (
                              <p className="mt-1 text-[10px] font-semibold text-[#00285E]">
                                {formatVND(Number(selectedService.labor_price) || 0)}
                              </p>
                            )}
                          </div>
                          <div>
                            <select
                              value={quoteItem?.partId ?? ""}
                              onChange={(event) =>
                                updateQuotationItem(issue.id, {
                                  partId: event.target.value
                                    ? Number(event.target.value)
                                    : "",
                                })
                              }
                              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#00285E]"
                            >
                              <option value="">-- Chọn phụ tùng --</option>
                              {spareParts.map((part) => (
                                <option key={part.id} value={part.id}>
                                  {part.name}
                                  {part.brand ? ` - ${part.brand}` : ""}
                                  {` (còn: ${Number(part.available_quantity)})`}
                                </option>
                              ))}
                            </select>
                            {selectedPart && (
                              <p className="mt-1 text-[10px] font-semibold text-[#00285E]">
                                {formatVND(Number(selectedPart.retail_price) || 0)}
                              </p>
                            )}
                          </div>
                          <input
                            type="number"
                            min={1}
                            value={quoteItem?.quantity ?? 1}
                            disabled={!quoteItem?.partId}
                            onChange={(event) =>
                              updateQuotationItem(issue.id, {
                                quantity: Math.max(1, Number(event.target.value)),
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-700 outline-none focus:border-[#00285E] disabled:opacity-50"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

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
                  onChange={(event) => setQuotationNote(event.target.value)}
                  placeholder="Ghi chú thêm cho báo giá bổ sung..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-7 py-4 border-t border-slate-200 shrink-0 bg-white">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Tổng cộng
                </span>
                <span className="mt-0.5 block text-lg font-bold text-[#00285E]">
                  {formatVND(quotationTotal)}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setQuotationReport(null)}
                  disabled={isCreatingQuotation}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-40"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateSupplementalQuotation}
                  disabled={!hasQuotationSelection || isCreatingQuotation}
                  style={{ backgroundColor: "#00285E" }}
                  className="px-6 py-2.5 rounded-full text-sm font-semibold text-white shadow-lg shadow-[#00285E]/20 hover:brightness-125 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isCreatingQuotation ? "Đang tạo..." : "Tạo báo giá bổ sung"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
