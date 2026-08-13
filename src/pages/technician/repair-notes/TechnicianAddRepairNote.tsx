import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useFetchClient_v2 as useFetchClient } from "../../../hook/useFetchClient";
import { TASK_ASSIGNMENT_ENDPOINTS } from "../../../constants/technician/taskAssignmentEndpoint";

interface CompletedTaskResponse {
  id: number;
  status: string;
  actual_end_time?: string | null;
  task: {
    id: number;
    type?: string | null;
    catalog?: { service_name?: string | null } | null;
    quotationItem?: {
      issue?: {
        component?: { name?: string | null } | null;
        error_description?: string | null;
      } | null;
    } | null;
    serviceOrder: {
      id: number;
      vehicle?: {
        license_plate?: string | null;
        year?: number | null;
        model?: { model_name?: string | null } | null;
        customer?: {
          name?: string | null;
          user?: { fullName?: string | null } | null;
        } | null;
      } | null;
    };
  };
}

interface RepairTaskOption {
  taskId: number;
  serviceOrderCode: string;
  customerName: string;
  vehiclePlate: string;
  vehicleModel: string;
  vehicleYear: number | null;
  serviceName: string;
  issueText: string;
  completedAt?: string | null;
}

interface ApiEnvelope<T> {
  data: T;
}

interface RepairNoteHistoryItem {
  id: number;
  content: string;
  createdAt: string;
  taskId: number;
  serviceOrderCode: string;
  vehiclePlate: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: number | null;
  vehicleColor: string;
  issueText: string;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function TechnicianAddRepairNote() {
  const navigate = useNavigate();
  const { fetchPrivate } = useFetchClient();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();

  const [activeTab, setActiveTab] = useState<"new" | "history">("new");

  const [historyItems, setHistoryItems] = useState<RepairNoteHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState("");

  const [repairTasks, setRepairTasks] = useState<RepairTaskOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRepairTasks = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = (await fetchPrivate(
        TASK_ASSIGNMENT_ENDPOINTS.GET_COMPLETED_TASKS,
      )) as ApiEnvelope<CompletedTaskResponse[]>;

      const mapped = (response.data ?? [])
        .filter((assignment) => assignment.task.type === "REPAIR")
        .map((assignment): RepairTaskOption => {
          const serviceOrder = assignment.task.serviceOrder;
          const vehicle = serviceOrder.vehicle;
          const customer = vehicle?.customer;
          const issue = assignment.task.quotationItem?.issue;
          const componentName = issue?.component?.name?.trim() || "";
          const errorDescription = issue?.error_description?.trim() || "";
          return {
            taskId: assignment.task.id,
            serviceOrderCode: `SO-${serviceOrder.id}`,
            customerName:
              customer?.name || customer?.user?.fullName || "Khách vãng lai",
            vehiclePlate: vehicle?.license_plate || "—",
            vehicleModel: vehicle?.model?.model_name || "",
            vehicleYear: vehicle?.year ?? null,
            serviceName:
              assignment.task.catalog?.service_name ||
              `Công việc #${assignment.task.id}`,
            issueText:
              componentName && errorDescription
                ? `${componentName} - ${errorDescription}`
                : componentName || errorDescription || "",
            completedAt: assignment.actual_end_time,
          };
        });

      setRepairTasks(mapped);
    } catch (error) {
      console.error("Lỗi khi tải danh sách công việc sửa chữa:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách công việc sửa chữa.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRepairTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPrivate]);

  const loadHistory = async () => {
    setIsHistoryLoading(true);
    setHistoryError("");
    try {
      const response = (await fetchPrivate(
        TASK_ASSIGNMENT_ENDPOINTS.GET_MY_REPAIR_NOTES,
      )) as ApiEnvelope<RepairNoteHistoryItem[]>;
      setHistoryItems(response.data ?? []);
      setHistoryLoaded(true);
    } catch (error) {
      console.error("Lỗi khi tải lịch sử kinh nghiệm sửa chữa:", error);
      setHistoryError(
        error instanceof Error
          ? error.message
          : "Không thể tải lịch sử kinh nghiệm sửa chữa.",
      );
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history" && !historyLoaded) {
      void loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const filteredHistory = useMemo(() => {
    const keyword = historySearchTerm.trim().toLowerCase();
    if (!keyword) return historyItems;
    return historyItems.filter(
      (item) =>
        item.serviceOrderCode.toLowerCase().includes(keyword) ||
        item.vehiclePlate.toLowerCase().includes(keyword) ||
        item.issueText.toLowerCase().includes(keyword) ||
        item.content.toLowerCase().includes(keyword),
    );
  }, [historyItems, historySearchTerm]);

  const filteredTasks = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return repairTasks;
    return repairTasks.filter(
      (task) =>
        task.serviceOrderCode.toLowerCase().includes(keyword) ||
        task.customerName.toLowerCase().includes(keyword) ||
        task.vehiclePlate.toLowerCase().includes(keyword) ||
        task.serviceName.toLowerCase().includes(keyword) ||
        task.issueText.toLowerCase().includes(keyword),
    );
  }, [repairTasks, searchTerm]);

  const selectedTask = useMemo(
    () => repairTasks.find((task) => task.taskId === selectedTaskId) || null,
    [repairTasks, selectedTaskId],
  );

  const handleSelectTask = (taskId: number) => {
    setSelectedTaskId(taskId);
    setContent("");
  };

  const handleSubmit = async () => {
    if (!selectedTaskId) return;
    if (!content.trim()) {
      showToast("Vui lòng nhập kinh nghiệm sau sửa chữa.", "warning");
      return;
    }
    setIsSubmitting(true);
    try {
      await fetchPrivate(TASK_ASSIGNMENT_ENDPOINTS.ADD_REPAIR_NOTE, "POST", {
        taskId: selectedTaskId,
        content: content.trim(),
      });
      showToast("Đã lưu kinh nghiệm sửa chữa.", "success");
      setContent("");
      setHistoryLoaded(false);
    } catch (error) {
      console.error("Lỗi khi lưu kinh nghiệm sửa chữa:", error);
      showToast(
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi khi lưu kinh nghiệm sửa chữa.",
        "warning",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(-1)}
          title="Quay lại"
          className="mt-0.5 w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-[#00285E] border border-[#00285E] text-white hover:bg-[#003C7D] hover:border-[#003C7D] active:scale-[0.97] transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight">
            Kinh nghiệm sửa chữa
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Chọn công việc đã hoàn thành để ghi lại kinh nghiệm sau sửa chữa.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-200 mb-5">
        <button
          type="button"
          onClick={() => setActiveTab("new")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === "new"
              ? "border-[#00285E] text-[#00285E]"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Ghi mới
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === "history"
              ? "border-[#00285E] text-[#00285E]"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Lịch sử
        </button>
      </div>

      {activeTab === "new" && (
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
        {/* LEFT: task list */}
        <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col max-h-[560px]">
          <div className="p-2.5 border-b border-slate-200">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm công việc..."
                className="w-full rounded-md border border-slate-200 py-1.5 pl-8 pr-2.5 text-sm text-slate-700 outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div className="overflow-y-auto p-2.5 space-y-2.5">
            {filteredTasks.map((task) => {
              const isSelected = selectedTaskId === task.taskId;
              return (
                <div
                  key={task.taskId}
                  className={`rounded-lg border bg-white p-3.5 shadow-sm transition-all ${
                    isSelected
                      ? "border-slate-200 border-l-4 border-l-[#00285E] bg-[#00285E]/5"
                      : "border-slate-200 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      {task.serviceOrderCode}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatDateTime(task.completedAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#00285E] truncate">
                    {task.serviceName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 truncate">
                    {task.customerName} · {task.vehiclePlate}
                    {task.vehicleModel ? ` · ${task.vehicleModel}` : ""}
                    {task.vehicleYear ? ` (${task.vehicleYear})` : ""}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Đã xong
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectTask(task.taskId)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium text-white bg-[#00285E] hover:bg-[#00285E]/90 transition-colors"
                    >
                      Ghi kinh nghiệm
                    </button>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                Đang tải...
              </div>
            )}
            {!isLoading && errorMessage && (
              <div className="px-4 py-8 text-center text-sm text-red-500">
                {errorMessage}
              </div>
            )}
            {!isLoading && !errorMessage && filteredTasks.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                {repairTasks.length === 0
                  ? "Chưa có công việc đã hoàn thành."
                  : "Không tìm thấy công việc phù hợp."}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: detail panel */}
        <div className="border border-slate-200 rounded-lg p-5">
          {!selectedTask ? (
            <div className="flex items-center justify-center h-full min-h-[300px] text-sm text-slate-400">
              Chọn một công việc bên trái để ghi kinh nghiệm.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-medium text-slate-500">
                  Nội dung dịch vụ <span className="text-red-500">*</span>
                </span>
                <div className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-[#00285E]">
                  {selectedTask.serviceName}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Kinh nghiệm sau sửa chữa
                </label>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  rows={8}
                  placeholder="Mô tả cách xử lý, các bước đã thực hiện để khắc phục lỗi này..."
                  className="w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-700 outline-none focus:border-slate-400 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setContent("")}
                  className="px-3.5 py-1.5 rounded-lg text-sm text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !content.trim()}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium text-white bg-[#00285E] hover:bg-[#00285E]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? "Đang lưu..." : "Lưu kinh nghiệm"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={historySearchTerm}
              onChange={(event) => setHistorySearchTerm(event.target.value)}
              placeholder="Tìm mã lệnh, biển số hoặc nội dung..."
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-slate-400"
            />
          </div>

          <div className="space-y-3">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-block rounded-md bg-[#00285E] px-2 py-0.5 text-[11px] font-semibold text-white">
                    {item.serviceOrderCode}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {formatDateTime(item.createdAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#00285E]">
                  {item.issueText}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {item.vehiclePlate}
                  {item.vehicleBrand ? ` · ${item.vehicleBrand}` : ""}
                  {item.vehicleModel ? ` ${item.vehicleModel}` : ""}
                  {item.vehicleYear ? ` (${item.vehicleYear})` : ""}
                  {item.vehicleColor ? ` · ${item.vehicleColor}` : ""}
                </p>
                <p className="mt-3 text-xs font-medium text-slate-500">
                  Nội dung kinh nghiệm:
                </p>
                <p className="mt-0.5 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {item.content}
                </p>
              </div>
            ))}
          </div>

          {isHistoryLoading && (
            <div className="px-4 py-10 text-center text-sm text-slate-400">
              Đang tải...
            </div>
          )}
          {!isHistoryLoading && historyError && (
            <div className="px-4 py-10 text-center text-sm text-red-500">
              {historyError}
            </div>
          )}
          {!isHistoryLoading && !historyError && filteredHistory.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-slate-400">
              {historyItems.length === 0
                ? "Chưa có kinh nghiệm nào được ghi lại."
                : "Không tìm thấy kết quả phù hợp."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
