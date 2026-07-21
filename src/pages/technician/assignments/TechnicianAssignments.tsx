import { useState, useMemo, useEffect } from "react";
import {
  CheckSquare,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Car,
  Calendar,
  Eye,
  PlayCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Loader2,
  X,
  Wrench,
  ClipboardList,
} from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useFetchClient_v2 as useFetchClient } from "../../../hook/useFetchClient";
import { TASK_ASSIGNMENT_ENDPOINTS } from "../../../constants/technician/taskAssignmentEndpoint";
import type { CreateIssueReportRequest, GetComponentsResponse } from "../../../model/dto/taskAssignment.dto";

// ========== TYPES ==========
interface AssignmentTask {
  taskId: number;
  serviceName: string;
}

interface Assignment {
  id: string;
  serviceOrderId: string;
  technicianId: string;
  customerName: string;
  customerPhone: string;
  vehiclePlate: string;
  vehicleModel: string;
  services: string[];
  tasks: AssignmentTask[];
  appointmentDate: string;
  appointmentTime: string;
  assignedAt: string;
  status: "ASSIGNED" | "IN_PROGRESS" | "PAUSED" | "PENDING_QC" | "COMPLETED";
  rejectedAt?: string;
  taskAssignmentId?: string | number;
  bookingType: string;
  // INSPECTION: kiểm tra rồi tạo báo cáo sự cố | REPAIR: sửa chữa, cập nhật tiến độ
  taskType?: string;
}

interface IssueChecklistItem {
  component_id: number;
  component_name: string;
  category: string;
  checked: boolean;
  description: string;
}

const ASSIGNMENT_STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: React.ElementType }
> = {
  ASSIGNED: {
    label: "Đã phân công",
    className: "bg-amber-50 text-amber-600 border border-amber-200",
    icon: Clock,
  },
  IN_PROGRESS: {
    label: "Đang thực hiện",
    className: "bg-blue-50 text-blue-700 border border-blue-200",
    icon: CheckSquare,
  },
  PAUSED: {
    label: "Tạm dừng",
    className: "bg-rose-50 text-rose-600 border border-rose-200",
    icon: XCircle,
  },
  PENDING_QC: {
    label: "Chờ QC",
    className: "bg-violet-50 text-violet-700 border border-violet-200",
    icon: Eye,
  },
  COMPLETED: {
    label: "Hoàn thành",
    className: "bg-emerald-50 text-emerald-600 border border-emerald-200",
    icon: CheckCircle2,
  },
};

// Mock assignments removed to use API data

const ITEMS_PER_PAGE = 5;

export default function TechnicianAssignments() {
  const navigate = useNavigate();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();
  const { fetchPrivate } = useFetchClient();
  const [components, setComponents] = useState<GetComponentsResponse[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [issueReportOpen, setIssueReportOpen] = useState(false);
  const [issueReportAssignment, setIssueReportAssignment] =
    useState<Assignment | null>(null);
  const [issueTaskId, setIssueTaskId] = useState<number | null>(null);
  const [issueChecklist, setIssueChecklist] = useState<IssueChecklistItem[]>(
    [],
  );
  const [issueNote, setIssueNote] = useState("");
  const [isSubmittingIssueReport, setIsSubmittingIssueReport] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const openIssueReportModal = (assignment: Assignment) => {
    setIssueReportAssignment(assignment);
    setIssueTaskId(assignment.tasks[0]?.taskId ?? null);
    // Cha (parent_id null/0) = category, con (có parent_id) = item checkbox
    const categoryNameById = new Map(
      components
        .filter((c) => !c.parent_id)
        .map((c) => [c.id, c.name] as const),
    );
    setIssueChecklist(
      components
        .filter((c) => c.parent_id)
        .map((c) => ({
          component_id: c.id,
          component_name: c.name,
          category: categoryNameById.get(c.parent_id) ?? "Khác",
          checked: false,
          description: "",
        })),
    );
    setIssueNote("");
    setExpandedCategories({});
    setIssueReportOpen(true);
  };

  const toggleIssueChecklistItem = (componentId: number) =>
    setIssueChecklist((prev) =>
      prev.map((item) =>
        item.component_id === componentId
          ? { ...item, checked: !item.checked }
          : item,
      ),
    );

  const updateIssueChecklistDescription = (
    componentId: number,
    description: string,
  ) =>
    setIssueChecklist((prev) =>
      prev.map((item) =>
        item.component_id === componentId ? { ...item, description } : item,
      ),
    );

  const toggleCategoryExpanded = (category: string) =>
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));

  const checkedIssueItems = issueChecklist.filter((item) => item.checked);

  const checklistByCategory = useMemo(() => {
    const groups: { category: string; items: IssueChecklistItem[] }[] = [];
    issueChecklist.forEach((item) => {
      let group = groups.find((g) => g.category === item.category);
      if (!group) {
        group = { category: item.category, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    });
    return groups;
  }, [issueChecklist]);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setIsLoading(true);
        const response = await fetchPrivate(
          TASK_ASSIGNMENT_ENDPOINTS.GET_MY_ASSIGNMENTS,
        );
        if (Array.isArray(response)) {
          const mappedData: Assignment[] = response.map((so: any) => {
            const services = (
              so.tasks?.map((t: any) => t.catalog?.service_name) || []
            ).filter(Boolean);
            if (
              services.length === 0 &&
              so.appointment?.booking_type &&
              so.appointment.booking_type.includes("REPAIR")
            ) {
              services.push("Kiểm tra");
            }
            const firstAssignment = so.tasks?.[0]?.assignments?.[0];

            let status: Assignment["status"] = "ASSIGNED";
            if (
              firstAssignment &&
              [
                "ASSIGNED",
                "IN_PROGRESS",
                "PAUSED",
                "PENDING_QC",
                "COMPLETED",
              ].includes(firstAssignment.status)
            ) {
              status = firstAssignment.status as Assignment["status"];
            }

            const aptDate = so.appointment?.scheduled_time
              ? new Date(so.appointment.scheduled_time)
              : new Date(so.createdAt);

            return {
              id: `SO-${so.id}`,
              serviceOrderId: so.id.toString(),
              technicianId: firstAssignment?.technician_id?.toString() || "",
              customerName:
                so.vehicle?.customer?.name ||
                so.vehicle?.customer?.user?.fullName ||
                "Khách vãng lai",
              customerPhone:
                so.vehicle?.customer?.phone ||
                so.vehicle?.customer?.user?.phoneNumber ||
                "",
              vehiclePlate: so.vehicle?.license_plate || "",
              vehicleModel:
                `${so.vehicle?.model?.make?.make_name || ""} ${so.vehicle?.model?.model_name || ""}`.trim(),
              services,
              tasks: (so.tasks || []).map((t: any) => ({
                taskId: t.id,
                serviceName: t.catalog?.service_name || `Task #${t.id}`,
              })),
              appointmentDate: aptDate.toISOString(),
              appointmentTime: aptDate.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              assignedAt: firstAssignment?.createdAt || so.createdAt,
              status: status,
              taskAssignmentId: firstAssignment?.id,
              bookingType: so.appointment?.booking_type || "WALK_IN",
              taskType: so.tasks?.[0]?.type,
            };
          });
          setAssignments(mappedData);
        }
      } catch (error) {
        console.error("Lỗi khi tải danh sách phân công:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssignments();
  }, [fetchPrivate, refreshKey]);

  const handleStartTask = async (asg: Assignment) => {
    if (!asg.taskAssignmentId) {
      alert("Không tìm thấy thông tin phân công.");
      return;
    }
    try {
      await fetchPrivate(TASK_ASSIGNMENT_ENDPOINTS.START_TASK, "PUT", {
        taskAssignmentId: asg.taskAssignmentId,
      });
      // Task sửa chữa -> vào thẳng màn cập nhật tiến độ
      if (asg.taskType === "REPAIR") {
        navigate(`/technician/progress/${asg.serviceOrderId}`);
        return;
      }
      setRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      console.error("Lỗi khi bắt đầu công việc:", error);
      alert(error.message || "Đã xảy ra lỗi khi bắt đầu công việc.");
    }
  };

  const handleCompleteTask = async (
    taskAssignmentId: string | number | undefined,
  ) => {
    if (!taskAssignmentId) {
      alert("Không tìm thấy thông tin phân công.");
      return;
    }
    if (!confirm("Bạn có chắc chắn muốn HOÀN THÀNH công việc này?")) return;

    try {
      await fetchPrivate(TASK_ASSIGNMENT_ENDPOINTS.COMPLETE_TASK, "PUT", {
        taskAssignmentId,
      });
      setRefreshKey((prev) => prev + 1);
      alert("Đã hoàn thành công việc thành công!");
    } catch (error: any) {
      console.error("Lỗi khi hoàn thành công việc:", error);
      alert(error.message || "Đã xảy ra lỗi khi hoàn thành công việc.");
    }
  };

  useEffect(() => {
    handleGetComponent();
  },[])

  const handleGetComponent = async () => {
    try {
      const result = await fetchPrivate(TASK_ASSIGNMENT_ENDPOINTS.GET_COMPONENTS,'GET');
      setComponents(result.data);
    } catch (error) {
      console.error("Lỗi khi lấy components", error);
    }
  }
  
  const handleCreateIssuesReport = async () => {
    if (!issueTaskId) {
      alert("Không tìm thấy thông tin công việc.");
      return;
    }
    const payload: CreateIssueReportRequest = {
      task_id: issueTaskId,
      issues: checkedIssueItems.map((item) => ({
        component_id: item.component_id,
        description: item.description,
      })),
      note: issueNote || undefined,
    };
    try {
      setIsSubmittingIssueReport(true);
      const data = await fetchPrivate(
        TASK_ASSIGNMENT_ENDPOINTS.ISSUES_REPORT,
        "POST",
        payload,
      );
      console.error("data test: ", data)
      setIssueReportOpen(false);
      showToast("Đã tạo báo cáo sự cố thành công!", "success");
      setRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      console.error("Lỗi khi tạo báo cáo sự cố:", error);
      alert(error.message || "Đã xảy ra lỗi khi tạo báo cáo sự cố.");
    } finally {
      setIsSubmittingIssueReport(false);
    }
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter((asg) => {
      const matchSearch =
        searchTerm === "" ||
        asg.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asg.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asg.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asg.serviceOrderId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === "all" || asg.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [searchTerm, statusFilter, assignments]);

  const totalPages = Math.ceil(filteredAssignments.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAssignments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAssignments, currentPage]);

  const kpiCounts = useMemo(
    () => ({
      total: assignments.length,
      assigned: assignments.filter((a) => a.status === "ASSIGNED").length,
      inProgress: assignments.filter((a) => a.status === "IN_PROGRESS").length,
      completed: assignments.filter((a) => a.status === "COMPLETED").length,
    }),
    [assignments],
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2 flex items-center gap-2">
          <CheckSquare className="text-[#F9A11B]" size={28} />
          Quản lý phân công
        </h1>
        <p className="text-slate-500 text-sm">
          Xem và quản lý trạng thái phân công công việc sửa chữa.
        </p>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Tổng phân công",
            value: kpiCounts.total,
            icon: <CheckSquare size={22} />,
            color: "#00285E",
            bg: "#EDF3FF",
          },
          {
            label: "Mới phân công",
            value: kpiCounts.assigned,
            icon: <Clock size={22} />,
            color: "#D97706",
            bg: "#FEF3C7",
          },
          {
            label: "Đang thực hiện",
            value: kpiCounts.inProgress,
            icon: <CheckSquare size={22} />,
            color: "#3B82F6",
            bg: "#EFF6FF",
          },
          {
            label: "Hoàn thành",
            value: kpiCounts.completed,
            icon: <CheckCircle2 size={22} />,
            color: "#10B981",
            bg: "#ECFDF5",
          },
        ].map((card, i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  {card.label}
                </span>
                <span className="text-2xl font-bold text-slate-900 tracking-tight block">
                  {card.value}
                </span>
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: card.bg, color: card.color }}
              >
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH & FILTER */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Tìm theo tên khách, biển số xe, mã phân công..."
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
              <option value="ASSIGNED">Mới phân công</option>
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
              Đang tải phân công...
            </p>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <AlertCircle size={48} className="mb-4 text-slate-300" />
            <p className="text-lg font-semibold mb-1">
              Không tìm thấy phân công
            </p>
            <p className="text-sm">
              Thử thay đổi từ khóa hoặc bộ lọc trạng thái.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th className="py-3 px-4 align-middle whitespace-nowrap">
                    Mã
                  </th>
                  <th className="py-3 px-4 align-middle whitespace-nowrap">
                    Khách hàng
                  </th>
                  <th className="py-3 px-4 align-middle whitespace-nowrap">
                    Xe
                  </th>
                  <th className="py-3 px-4 align-middle whitespace-nowrap">
                    Dịch vụ
                  </th>
                  <th className="py-3 px-4 align-middle whitespace-nowrap">
                    Lịch hẹn
                  </th>
                  <th className="py-3 px-4 align-middle whitespace-nowrap">
                    Ngày phân công
                  </th>
                  <th className="py-3 px-4 align-middle whitespace-nowrap">
                    Trạng thái
                  </th>
                  <th className="py-3 px-4 align-middle text-center whitespace-nowrap">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((asg) => {
                  const statusCfg = ASSIGNMENT_STATUS_CONFIG[asg.status];
                  const StatusIcon = statusCfg.icon;
                  return (
                    <tr
                      key={asg.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <span className="font-bold text-[#00285E] text-xs">
                          {asg.id}
                        </span>
                      </td>
                      <td className="py-4 px-4 align-middle">
                        <div className="flex items-center gap-2 min-w-[160px]">
                          <div className="w-8 h-8 shrink-0 rounded-full bg-[#EDF3FF] flex items-center justify-center">
                            <Users size={14} className="text-[#00285E]" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-700 text-xs truncate">
                              {asg.customerName}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {asg.customerPhone}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-middle">
                        <div className="flex items-center gap-1.5 min-w-[140px]">
                          <Car size={13} className="text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-700 text-xs truncate">
                              {asg.vehiclePlate}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {asg.vehicleModel}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-middle">
                        <div className="flex flex-wrap gap-1 min-w-[160px] max-w-[220px]">
                          {asg.services.length > 0 ? (
                            asg.services.map((svc, i) => (
                              <span
                                key={i}
                                className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-600 font-medium"
                              >
                                {svc}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              —
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar
                            size={11}
                            className="text-slate-400 shrink-0"
                          />
                          <div>
                            <p className="text-xs text-slate-700 font-semibold">
                              {formatDate(asg.appointmentDate)}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {asg.appointmentTime}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <span className="text-xs text-slate-600 font-medium">
                          {formatDateTime(asg.assignedAt)}
                        </span>
                      </td>
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusCfg.className}`}
                        >
                          <StatusIcon size={12} className="shrink-0" />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 align-middle">
                        <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                          {asg.status === "ASSIGNED" ? (
                            <button
                              onClick={() => handleStartTask(asg)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#00285E] bg-[#EDF3FF] hover:bg-[#DCE8FF] transition-colors"
                            >
                              <PlayCircle size={13} />
                              Bắt đầu làm
                            </button>
                          ) : asg.status === "IN_PROGRESS" ? (
                            asg.taskType === "REPAIR" ? (
                              <button
                                onClick={() =>
                                  navigate(
                                    `/technician/progress/${asg.serviceOrderId}`,
                                  )
                                }
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#00285E] bg-[#EDF3FF] hover:bg-[#DCE8FF] transition-colors"
                              >
                                <Wrench size={13} />
                                Cập nhật tiến độ
                              </button>
                            ) : (
                              <button
                                onClick={() => openIssueReportModal(asg)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                              >
                                <ClipboardList size={13} />
                                Tạo báo cáo sự cố
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() =>
                                navigate(
                                  `/technician/assignments/${asg.serviceOrderId}`,
                                )
                              }
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                              <Eye size={13} />
                              Chi tiết
                            </button>
                          )}
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
              {Math.min(
                currentPage * ITEMS_PER_PAGE,
                filteredAssignments.length,
              )}{" "}
              / {filteredAssignments.length} phân công
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

      {/* MODAL TẠO BÁO CÁO SỰ CỐ */}
      {issueReportOpen && issueReportAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setIssueReportOpen(false)}
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
                  <AlertCircle size={24} className="text-white" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-white/80 uppercase tracking-widest">
                    Đơn DV #{issueReportAssignment.serviceOrderId}
                  </p>
                  <h3 className="text-xl font-bold text-white leading-none">
                    Báo cáo sự cố
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setIssueReportOpen(false)}
                className="relative p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-7 py-6 space-y-6 bg-slate-50/50">
              {/* SECTION: Thông tin khách hàng & xe */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Users size={13} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Khách hàng
                    </span>
                  </div>
                  <p className="font-semibold text-slate-800 text-sm truncate">
                    {issueReportAssignment.customerName}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {issueReportAssignment.customerPhone}
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Car size={13} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Phương tiện
                    </span>
                  </div>
                  <p className="font-semibold text-slate-800 text-sm truncate">
                    {issueReportAssignment.vehiclePlate}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {issueReportAssignment.vehicleModel}
                  </p>
                </div>
              </div>

              {/* SECTION: Chọn công việc (task) */}
              {issueReportAssignment.tasks.length > 1 && (
                <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                    Công việc liên quan
                  </label>
                  <select
                    value={issueTaskId ?? ""}
                    onChange={(e) =>
                      setIssueTaskId(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors"
                  >
                    {issueReportAssignment.tasks.map((t) => (
                      <option key={t.taskId} value={t.taskId}>
                        {t.serviceName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* SECTION: Checklist hạng mục kiểm tra (nhóm theo danh mục) */}
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-bold text-slate-700">
                      Hạng mục kiểm tra
                    </label>
                  </div>
                  {checkedIssueItems.length > 0 && (
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: "#00285E", color: "#fff" }}
                    >
                      {checkedIssueItems.length} mục đã chọn
                    </span>
                  )}
                </div>
                <div className="space-y-2.5">
                  {checklistByCategory.map((group) => {
                    const isExpanded = !!expandedCategories[group.category];
                    const checkedInGroup = group.items.filter(
                      (i) => i.checked,
                    ).length;
                    return (
                      <div
                        key={group.category}
                        className="bg-white rounded-2xl border overflow-hidden transition-colors"
                        style={{
                          borderColor:
                            checkedInGroup > 0 ? "#00285E" : "#e2e8f0",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleCategoryExpanded(group.category)}
                          className="w-full flex items-center justify-between gap-2 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors"
                        >
                          <span
                            className="text-sm font-semibold transition-colors"
                            style={{
                              color: checkedInGroup > 0 ? "#00285E" : "#334155",
                            }}
                          >
                            {group.category}
                          </span>
                          <span className="flex items-center gap-3">
                            {checkedInGroup > 0 && (
                              <span
                                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: "#FEF3C7",
                                  color: "#B45309",
                                }}
                              >
                                {checkedInGroup} sự cố
                              </span>
                            )}
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
                                key={item.component_id}
                                className="rounded-xl px-3 py-2.5 transition-colors border"
                                style={{
                                  backgroundColor: item.checked
                                    ? "#EDF3FF"
                                    : "transparent",
                                  borderColor: item.checked
                                    ? "#c7d7f0"
                                    : "transparent",
                                }}
                              >
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={item.checked}
                                    onChange={() =>
                                      toggleIssueChecklistItem(
                                        item.component_id,
                                      )
                                    }
                                    className="w-4 h-4 rounded border-slate-300 focus:ring-2"
                                    style={{ accentColor: "#00285E" }}
                                  />
                                  <span
                                    className="text-sm font-medium transition-colors"
                                    style={{
                                      color: item.checked
                                        ? "#00285E"
                                        : "#475569",
                                    }}
                                  >
                                    {item.component_name}
                                  </span>
                                </label>
                                {item.checked && (
                                  <textarea
                                    rows={2}
                                    value={item.description}
                                    onChange={(e) =>
                                      updateIssueChecklistDescription(
                                        item.component_id,
                                        e.target.value,
                                      )
                                    }
                                    placeholder={`Mô tả sự cố với "${item.component_name}"...`}
                                    className="mt-2 ml-7 w-[calc(100%-1.75rem)] bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-all resize-none"
                                  />
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

              {/* Ghi chú chung */}
              <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList size={15} className="text-slate-400" />
                  <label className="text-sm font-bold text-slate-700">
                    Ghi chú chung
                  </label>
                </div>
                <textarea
                  rows={3}
                  value={issueNote}
                  onChange={(e) => setIssueNote(e.target.value)}
                  placeholder="Ghi chú thêm cho báo cáo sự cố..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#00285E] focus:ring-1 focus:ring-[#00285E] transition-colors resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-7 py-4 border-t border-slate-200 shrink-0 bg-white">
              <span className="text-xs text-slate-400">
                {checkedIssueItems.length > 0
                  ? `${checkedIssueItems.length} sự cố sẽ được báo cáo`
                  : "Chọn hạng mục gặp sự cố"}
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIssueReportOpen(false)}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateIssuesReport}
                  disabled={
                    isSubmittingIssueReport || checkedIssueItems.length === 0
                  }
                  style={{ backgroundColor: "#00285E" }}
                  className="px-6 py-2.5 rounded-full text-sm font-semibold text-white shadow-lg shadow-[#00285E]/20 hover:brightness-125 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmittingIssueReport ? "Đang tạo..." : "Tạo báo cáo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
