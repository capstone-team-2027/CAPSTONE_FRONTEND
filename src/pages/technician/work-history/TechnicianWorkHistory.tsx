import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Car,
  Filter,
  History,
  Loader2,
  Search,
  Users,
} from "lucide-react";
import { useFetchClient_v2 as useFetchClient } from "../../../hook/useFetchClient";
import { useSocket } from "../../../hook/useSocket";
import { TASK_ASSIGNMENT_ENDPOINTS } from "../../../constants/technician/taskAssignmentEndpoint";
import { useNavigate } from "react-router-dom";

interface WorkHistoryItem {
  id: number;
  code: string;
  customerName: string;
  customerPhone?: string;
  vehiclePlate: string;
  vehicleModel?: string;
  services: string[];
  startedAt?: string;
  completedAt?: string;
  status: string;
  taskType?: string;
}

interface CompletedTaskResponse {
  id: number;
  status: string;
  actual_start_time?: string | null;
  actual_end_time?: string | null;
  role_in_task?: string | null;
  task: {
    id: number;
    type?: string | null;
    catalog?: {
      service_name?: string | null;
    } | null;
    serviceOrder: {
      id: number;
      status?: string | null;
      vehicle?: {
        license_plate?: string | null;
        color?: string | null;
        model?: {
          model_name?: string | null;
        } | null;
        customer?: {
          name?: string | null;
          phone?: string | null;
          user?: {
            fullName?: string | null;
            phoneNumber?: string | null;
          } | null;
        } | null;
      } | null;
    };
  };
}

interface ApiEnvelope<T> {
  data: T;
}

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

const formatStatus = (status: string) =>
  status === "COMPLETED" ? "Hoàn thành" : status;

export default function TechnicianWorkHistory() {
  const navigate = useNavigate();
  const { fetchPrivate } = useFetchClient();
  const socket = useSocket();
  const [workHistory, setWorkHistory] = useState<WorkHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [taskTypeFilter, setTaskTypeFilter] = useState("all");
  const [completedDateFilter, setCompletedDateFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const loadCompletedTasks = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = (await fetchPrivate<
        ApiEnvelope<CompletedTaskResponse[]>
      >(TASK_ASSIGNMENT_ENDPOINTS.GET_COMPLETED_TASKS)) as ApiEnvelope<
        CompletedTaskResponse[]
      >;
      const mappedItems = (response.data ?? []).map(
        (assignment): WorkHistoryItem => {
          const serviceOrder = assignment.task.serviceOrder;
          const vehicle = serviceOrder.vehicle;
          const customer = vehicle?.customer;
          return {
            id: assignment.id,
            code: `SO-${serviceOrder.id}`,
            customerName:
              customer?.name ||
              customer?.user?.fullName ||
              "Khách vãng lai",
            customerPhone:
              customer?.phone || customer?.user?.phoneNumber || "",
            vehiclePlate: vehicle?.license_plate || "—",
            vehicleModel: vehicle?.model?.model_name || "",
            services: [
              assignment.task.catalog?.service_name ||
                `Công việc #${assignment.task.id}`,
            ],
            startedAt: assignment.actual_start_time || undefined,
            completedAt: assignment.actual_end_time || undefined,
            status: assignment.status,
            taskType: assignment.task.type || undefined,
          };
        },
      );
      setWorkHistory(mappedItems);
    } catch (error) {
      console.error("Lỗi khi tải lịch sử công việc:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải lịch sử công việc.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCompletedTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPrivate]);

  // QC reject có thể rút task khỏi lịch sử hoàn thành -> tự tải lại khi có thông báo mới
  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = () => {
      void loadCompletedTasks();
    };
    socket.on("new_notification", handleNewNotification);
    return () => {
      socket.off("new_notification", handleNewNotification);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  useEffect(() => {
    if (!isFilterOpen) return;
    const closeFilterOnOutsideClick = (event: MouseEvent) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", closeFilterOnOutsideClick);
    return () =>
      document.removeEventListener("mousedown", closeFilterOnOutsideClick);
  }, [isFilterOpen]);

  const filteredWorkHistory = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const now = new Date();

    return workHistory.filter((item) => {
      const matchesSearch =
        !keyword ||
        item.code.toLowerCase().includes(keyword) ||
        item.customerName.toLowerCase().includes(keyword) ||
        item.customerPhone?.toLowerCase().includes(keyword) ||
        item.vehiclePlate.toLowerCase().includes(keyword) ||
        item.vehicleModel?.toLowerCase().includes(keyword) ||
        item.services.some((service) =>
          service.toLowerCase().includes(keyword),
        );

      const matchesTaskType =
        taskTypeFilter === "all" || item.taskType === taskTypeFilter;

      let matchesCompletedDate = true;
      if (completedDateFilter !== "all") {
        if (!item.completedAt) {
          matchesCompletedDate = false;
        } else {
          const completedDate = new Date(item.completedAt);
          if (Number.isNaN(completedDate.getTime())) {
            matchesCompletedDate = false;
          } else if (completedDateFilter === "today") {
            matchesCompletedDate =
              completedDate.toDateString() === now.toDateString();
          } else {
            const numberOfDays = Number(completedDateFilter);
            const earliestDate = new Date(now);
            earliestDate.setDate(now.getDate() - numberOfDays);
            matchesCompletedDate = completedDate >= earliestDate;
          }
        }
      }

      return matchesSearch && matchesTaskType && matchesCompletedDate;
    });
  }, [
    completedDateFilter,
    searchTerm,
    taskTypeFilter,
    workHistory,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, taskTypeFilter, completedDateFilter]);

  const totalPages = Math.ceil(filteredWorkHistory.length / ITEMS_PER_PAGE);
  const currentPageSafe = Math.min(Math.max(currentPage, 1), totalPages || 1);
  const displayedWorkHistory = useMemo(() => {
    const start = (currentPageSafe - 1) * ITEMS_PER_PAGE;
    return filteredWorkHistory.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredWorkHistory, currentPageSafe]);

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
          <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight">
            <History size={28} className="text-[#F9A11B]" />
            Lịch sử công việc
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Theo dõi các công việc kỹ thuật viên đã thực hiện và hoàn thành.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm mã lệnh, khách hàng, biển số, dòng xe hoặc dịch vụ..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition-colors focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E]"
            />
          </div>
          <div ref={filterRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsFilterOpen((current) => !current)}
              className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors ${
                isFilterOpen ||
                taskTypeFilter !== "all" ||
                completedDateFilter !== "all"
                  ? "border-[#00285E] bg-[#EDF3FF] text-[#00285E]"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Filter size={15} />
              <span className="hidden sm:inline">Bộ lọc</span>
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                  Bộ lọc
                </p>
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Loại công việc
                    </span>
                    <select
                      value={taskTypeFilter}
                      onChange={(event) =>
                        setTaskTypeFilter(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-[#00285E]"
                    >
                      <option value="all">Tất cả công việc</option>
                      <option value="INSPECTION">Kiểm tra</option>
                      <option value="REPAIR">Sửa chữa</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Ngày hoàn thành
                    </span>
                    <select
                      value={completedDateFilter}
                      onChange={(event) =>
                        setCompletedDateFilter(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-[#00285E]"
                    >
                      <option value="all">Tất cả thời gian</option>
                      <option value="today">Hôm nay</option>
                      <option value="7">7 ngày gần nhất</option>
                      <option value="30">30 ngày gần nhất</option>
                    </select>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-4 py-4">Mã</th>
                <th className="px-4 py-4">Khách hàng</th>
                <th className="px-4 py-4">Xe</th>
                <th className="px-4 py-4">Dịch vụ</th>
                <th className="px-4 py-4">Ngày bắt đầu</th>
                <th className="px-4 py-4">Ngày hoàn thành</th>
                <th className="px-4 py-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedWorkHistory.map((item) => (
                <tr
                  key={item.id}
                  className="transition-colors hover:bg-slate-50/60"
                >
                  <td className="px-4 py-4 font-bold text-[#00285E]">
                    {item.code}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex min-w-[170px] items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EDF3FF] text-[#00285E]">
                        <Users size={14} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-slate-700">
                          {item.customerName}
                        </span>
                        <span className="block truncate text-[10px] text-slate-400">
                          {item.customerPhone || "—"}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex min-w-[140px] items-center gap-2">
                      <Car size={13} className="shrink-0 text-slate-400" />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-slate-700">
                          {item.vehiclePlate}
                        </span>
                        <span className="block truncate text-[10px] text-slate-400">
                          {item.vehicleModel || "—"}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex min-w-[150px] flex-wrap gap-1">
                      {item.services.map((service) => (
                        <span
                          key={service}
                          className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                    {formatDateTime(item.startedAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">
                    {formatDateTime(item.completedAt)}
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {formatStatus(item.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <Loader2 size={32} className="animate-spin text-[#00285E]" />
            <p className="mt-3 text-sm font-semibold text-slate-600">
              Đang tải lịch sử công việc...
            </p>
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <AlertCircle size={32} className="text-rose-400" />
            <p className="mt-3 font-semibold text-slate-700">
              Không thể tải dữ liệu
            </p>
            <p className="mt-1 text-sm text-slate-400">{errorMessage}</p>
          </div>
        )}

        {!isLoading &&
          !errorMessage &&
          filteredWorkHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <History size={26} />
            </div>
            <p className="font-semibold text-slate-700">
              {workHistory.length === 0
                ? "Chưa có lịch sử công việc"
                : "Không tìm thấy công việc phù hợp"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {workHistory.length === 0
                ? "Các công việc đã hoàn thành sẽ được hiển thị tại đây."
                : "Thử thay đổi từ khóa hoặc bộ lọc đang chọn."}
            </p>
          </div>
          )}

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200 text-sm text-slate-500">
            <span>
              Hiển thị {filteredWorkHistory.length === 0 ? 0 : (currentPageSafe - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPageSafe * ITEMS_PER_PAGE, filteredWorkHistory.length)} trên {filteredWorkHistory.length} công việc
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPageSafe === 1}
                className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >Trước</button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 rounded-xl text-sm font-semibold transition ${page === currentPageSafe ? 'bg-[#00285E] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPageSafe === totalPages}
                className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >Sau</button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
