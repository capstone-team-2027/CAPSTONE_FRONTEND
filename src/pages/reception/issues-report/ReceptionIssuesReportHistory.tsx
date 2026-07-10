import { useState, useMemo, useEffect } from "react";
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
} from "lucide-react";
import {ISSUE_REPORTS_ENDPOINTS} from "../../../constants/reception/issueReportsApiEndPoints";
import {useFetchClient} from "../../../hook/useFetchClient";
// 1 báo cáo = các issues cùng task (gom nhiều hạng mục linh kiện)
interface IssueReport {
  taskId: number;
  taskStatus?: string;
  // Mã báo cáo dạng BC-ddMMyyyy-stt, sinh từ createdAt
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

const ITEMS_PER_PAGE = 5;

export default function ReceptionIssuesReportHistory() {
  // TODO: tự viết hàm fetch API rồi setIssues(data) + setIsLoading
  const {fetchPrivate} = useFetchClient();
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

  useEffect(() => {
    getIssueReports();
  },[]);

  const getIssueReports = async () => {
    try {
      const result = await fetchPrivate(ISSUE_REPORTS_ENDPOINTS.ISSUES_REPORT, "GET");
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
                        <div className="flex items-center justify-center whitespace-nowrap">
                          <button
                            onClick={() => openReportDetail(report)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                          >
                            <Eye size={13} />
                            Chi tiết
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
    </div>
  );
}
