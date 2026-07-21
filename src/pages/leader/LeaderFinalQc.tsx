import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ClipboardCheck,
  Search,
  Car,
  User,
  X,
  Wrench,
  CheckCircle2,
  Loader2,
  Eye,
  Calendar,
  RotateCcw,
  Check,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { useFetchClient } from "../../hook/useFetchClient";
import { TECHNICIAN_LEADER_TASK_ENDPOINTS } from "../../constants/technicianLeader/taskManagementEndpoint";
import type {
  GetFinalQcOrderResponse,
  RejectFinalInspectionRequest,
} from "../../model/dto/finalQcManagement.dto";

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("vi-VN") : "—";

const formatDateTime = (d?: string | null) =>
  d
    ? new Date(d).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const TASK_STATUS_LABEL: Record<string, { label: string; className: string }> =
  {
    COMPLETED: {
      label: "Hoàn thành",
      className: "bg-emerald-50 text-emerald-600 border-emerald-200",
    },
    PENDING_QC: {
      label: "Chờ kiểm định",
      className: "bg-violet-50 text-violet-600 border-violet-200",
    },
    IN_PROGRESS: {
      label: "Đang thực hiện",
      className: "bg-blue-50 text-blue-600 border-blue-200",
    },
  };

const getTaskStatus = (status?: string) =>
  (status && TASK_STATUS_LABEL[status]) || {
    label: status || "—",
    className: "bg-slate-50 text-slate-500 border-slate-200",
  };

// Trạng thái đơn (lấy từ DB)
const ORDER_STATUS_LABEL: Record<string, { label: string; className: string }> =
  {
    PENDING_FINAL_QC: {
      label: "Chờ nghiệm thu",
      className: "bg-amber-50 text-amber-600 border-amber-200",
    },
    COMPLETED: {
      label: "Đã nghiệm thu",
      className: "bg-emerald-50 text-emerald-600 border-emerald-200",
    },
  };

const getOrderStatus = (status?: string) =>
  (status && ORDER_STATUS_LABEL[status]) || {
    label: status || "—",
    className: "bg-slate-50 text-slate-500 border-slate-200",
  };

// Mã đơn NT-ddMMyyyy-stt (đồng bộ cách đánh mã các trang khác)
const buildOrderCode = (
  orders: { id: number; entry_time?: string | null }[],
): Record<number, string> => {
  const counters: Record<string, number> = {};
  const codes: Record<number, string> = {};
  [...orders]
    .sort(
      (a, b) =>
        new Date(a.entry_time ?? 0).getTime() -
        new Date(b.entry_time ?? 0).getTime(),
    )
    .forEach((order) => {
      const d = new Date(order.entry_time ?? Date.now());
      const dateKey = `${String(d.getDate()).padStart(2, "0")}${String(
        d.getMonth() + 1,
      ).padStart(2, "0")}${d.getFullYear()}`;
      counters[dateKey] = (counters[dateKey] ?? 0) + 1;
      codes[order.id] =
        `NT-${dateKey}-${String(counters[dateKey]).padStart(2, "0")}`;
    });
  return codes;
};

export default function LeaderFinalQc() {
  const { searchQuery, showToast } = useOutletContext<{
    searchQuery: string;
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();

  const { fetchPrivate } = useFetchClient();
  const [orders, setOrders] = useState<GetFinalQcOrderResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const effectiveSearch = (searchQuery || localSearch).toLowerCase();

  const [selected, setSelected] = useState<GetFinalQcOrderResponse | null>(
    null,
  );
  const [isApproving, setIsApproving] = useState(false);

  // Yêu cầu sửa lại
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectTaskIds, setRejectTaskIds] = useState<number[]>([]);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const openDetail = (o: GetFinalQcOrderResponse) => {
    setSelected(o);
    setRejectMode(false);
    setRejectTaskIds([]);
    setRejectReason("");
  };

  const closeDetail = () => {
    setSelected(null);
    setRejectMode(false);
    setRejectTaskIds([]);
    setRejectReason("");
  };

  const toggleRejectTask = (taskId: number) => {
    setRejectTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId],
    );
  };

  useEffect(() => {
    handleGetOrders();
  }, []);

  const handleGetOrders = async () => {
    setIsLoading(true);
    try {
      const result = await fetchPrivate<GetFinalQcOrderResponse[]>(
        TECHNICIAN_LEADER_TASK_ENDPOINTS.GET_FINAL_QC_ORDERS,
        "GET",
      );
      setOrders(result.data ?? []);
    } catch (error) {
      console.error("Lỗi lấy danh sách chờ nghiệm thu", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selected) return;
    setIsApproving(true);
    try {
      await fetchPrivate(
        TECHNICIAN_LEADER_TASK_ENDPOINTS.APPROVE_FINAL_QC(selected.id),
        "PATCH",
      );
      showToast("Đã nghiệm thu, lệnh sửa chữa hoàn tất!", "success");
      closeDetail();
      handleGetOrders();
    } catch (error: any) {
      showToast(error?.message ?? "Nghiệm thu thất bại", "warning");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    if (rejectTaskIds.length === 0) {
      showToast("Chọn ít nhất một công việc cần sửa lại", "warning");
      return;
    }
    setIsRejecting(true);
    try {
      const body: RejectFinalInspectionRequest = {
        taskIds: rejectTaskIds,
        ...(rejectReason.trim() ? { reason: rejectReason.trim() } : {}),
      };
      await fetchPrivate(
        TECHNICIAN_LEADER_TASK_ENDPOINTS.REJECT_FINAL_QC(selected.id),
        "PATCH",
        body,
      );
      showToast("Đã gửi yêu cầu sửa lại cho kỹ thuật viên", "success");
      closeDetail();
      handleGetOrders();
    } catch (error: any) {
      showToast(error?.message ?? "Gửi yêu cầu sửa lại thất bại", "warning");
    } finally {
      setIsRejecting(false);
    }
  };

  const orderCodes = useMemo(() => buildOrderCode(orders), [orders]);

  const filtered = useMemo(() => {
    if (!effectiveSearch) return orders;
    return orders.filter((o) => {
      const plate = o.vehicle?.license_plate?.toLowerCase() ?? "";
      const model = o.vehicle?.model?.model_name?.toLowerCase() ?? "";
      return (
        (orderCodes[o.id] ?? "").toLowerCase().includes(effectiveSearch) ||
        plate.includes(effectiveSearch) ||
        model.includes(effectiveSearch) ||
        (o.tasks ?? []).some((t) =>
          (t.catalog?.service_name ?? "")
            .toLowerCase()
            .includes(effectiveSearch),
        )
      );
    });
  }, [orders, orderCodes, effectiveSearch]);

  // Đơn chỉ nghiệm thu được khi mọi công việc đã COMPLETED (khớp ràng buộc BE)
  const allTasksDone = (o: GetFinalQcOrderResponse) =>
    (o.tasks ?? []).length > 0 &&
    (o.tasks ?? []).every((t) => t.status === "COMPLETED");

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* TITLE */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">
          Nghiệm thu tổng thể
        </h1>
        <p className="text-slate-500 text-sm">
          Kiểm tra lần cuối các lệnh sửa chữa đã hoàn tất trước khi giao xe.
        </p>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[#EDF3FF] text-[#00285E]">
            <ClipboardCheck size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {orders.length}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Đơn chờ nghiệm thu
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {orders.filter(allTasksDone).length}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Sẵn sàng nghiệm thu
            </p>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              Chờ nghiệm thu
            </h2>
            <span className="bg-[#EDF3FF] text-[#00285E] px-2.5 py-0.5 rounded-full text-xs font-bold">
              {filtered.length} đơn
            </span>
          </div>
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Tìm mã đơn, biển số, dịch vụ..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full sm:w-72 bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th className="py-4 px-6">Mã đơn</th>
                <th className="py-4 px-4">Xe</th>
                <th className="py-4 px-4">Công việc</th>
                <th className="py-4 px-4">Tiếp nhận</th>
                <th className="py-4 px-4">Trạng thái</th>
                <th className="py-4 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <span className="inline-flex items-center gap-2 text-slate-400 text-sm">
                      <Loader2 size={16} className="animate-spin" />
                      Đang tải danh sách...
                    </span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-14 text-center text-slate-400 text-sm"
                  >
                    Không có lệnh sửa chữa nào chờ nghiệm thu...
                  </td>
                </tr>
              ) : (
                filtered.map((o) => {
                  return (
                    <tr
                      key={o.id}
                      onClick={() => openDetail(o)}
                      className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-6">
                        <span className="font-bold text-[#00285E] text-xs">
                          {orderCodes[o.id] ?? `#${o.id}`}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                          <Car size={13} className="text-slate-400 shrink-0" />
                          {o.vehicle?.license_plate ?? "—"}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          {o.vehicle?.model?.model_name ?? ""}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-xs font-bold">
                          <Wrench size={11} className="text-slate-400" />
                          {o.tasks?.length ?? 0} công việc
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                          <Calendar size={13} className="text-slate-400" />
                          {formatDate(o.entry_time)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap border ${
                            getOrderStatus(o.status).className
                          }`}
                        >
                          {getOrderStatus(o.status).label}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetail(o);
                            }}
                            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-colors"
                          >
                            <Eye size={14} />
                            Xem chi tiết
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL CHI TIẾT ── */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDetail}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5"
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-7 py-5 shrink-0"
                style={{ backgroundColor: "#00285E" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center">
                    <Car size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">
                      {orderCodes[selected.id] ?? `#${selected.id}`}
                    </h3>
                    <span className="text-xs font-semibold text-white/60">
                      Nghiệm thu tổng thể
                    </span>
                  </div>
                </div>
                <button
                  onClick={closeDetail}
                  className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-7 py-6 space-y-5 bg-slate-50/50">
                {/* Khách hàng & phương tiện */}
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
                          {selected.vehicle?.customer?.name ||
                            selected.vehicle?.customer?.user?.fullName ||
                            "Khách vãng lai"}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="w-14 shrink-0 text-xs text-slate-400">
                          SĐT
                        </span>
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          {selected.vehicle?.customer?.phone ||
                            selected.vehicle?.customer?.user?.phoneNumber ||
                            "—"}
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
                          {selected.vehicle?.license_plate ?? "—"}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="w-14 shrink-0 text-xs text-slate-400">
                          Tên xe
                        </span>
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          {selected.vehicle?.model?.model_name ?? "—"}
                          {selected.vehicle?.color
                            ? ` · ${selected.vehicle.color}`
                            : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Thời gian */}
                <div className="bg-white rounded-2xl border border-slate-200/70 p-4 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Tiếp nhận xe
                  </span>
                  <span className="text-sm font-semibold text-slate-800">
                    {formatDateTime(selected.entry_time)}
                  </span>
                </div>

                {/* Danh sách công việc */}
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Wrench size={14} className="text-slate-500" />
                      {rejectMode
                        ? "Chọn công việc chưa đạt"
                        : "Công việc trong đơn"}
                    </label>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        rejectMode
                          ? "bg-rose-50 text-rose-600 border border-rose-200"
                          : "bg-[#EDF3FF] text-[#00285E]"
                      }`}
                    >
                      {rejectMode
                        ? `${rejectTaskIds.length} đã chọn`
                        : `${selected.tasks?.length ?? 0} công việc`}
                    </span>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden divide-y divide-slate-100">
                    {(selected.tasks ?? []).map((task) => {
                      const cfg = getTaskStatus(task.status);
                      const tech = task.assignments?.[0]?.technician?.fullName;
                      const checked = rejectTaskIds.includes(task.id);
                      return (
                        <div
                          key={task.id}
                          onClick={
                            rejectMode
                              ? () => toggleRejectTask(task.id)
                              : undefined
                          }
                          className={`flex items-center gap-3 px-4 py-3.5 ${
                            rejectMode
                              ? `cursor-pointer transition-colors ${
                                  checked
                                    ? "bg-rose-50/70"
                                    : "hover:bg-slate-50"
                                }`
                              : ""
                          }`}
                        >
                          {rejectMode && (
                            <span
                              className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                checked
                                  ? "bg-rose-500 border-rose-500 text-white"
                                  : "border-slate-300 bg-white"
                              }`}
                            >
                              {checked && <Check size={13} strokeWidth={3} />}
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {task.catalog?.service_name ??
                                `Công việc #${task.id}`}
                            </p>
                            {tech && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                                <User size={10} />
                                {tech}
                              </span>
                            )}
                          </div>
                          <span
                            className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border ${cfg.className}`}
                          >
                            {cfg.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {!rejectMode && !allTasksDone(selected) && (
                    <p className="flex items-center gap-1.5 text-xs text-amber-600 mt-2 px-1">
                      Vẫn còn công việc chưa hoàn thành — chưa thể nghiệm thu.
                    </p>
                  )}
                </div>

                {/* Ghi chú cho kỹ thuật viên */}
                {rejectMode && (
                  <div>
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-2 px-1">
                      <RotateCcw size={14} className="text-rose-500" />
                      Ghi chú cho kỹ thuật viên
                      <span className="text-xs font-medium text-slate-400">
                        (không bắt buộc)
                      </span>
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={3}
                      placeholder="Nêu điểm chưa đạt để kỹ thuật viên nắm..."
                      className="w-full rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all resize-none"
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2.5 px-7 py-4 border-t border-slate-200 shrink-0 bg-white">
                {rejectMode ? (
                  <>
                    <button
                      onClick={() => {
                        setRejectMode(false);
                        setRejectTaskIds([]);
                        setRejectReason("");
                      }}
                      disabled={isRejecting}
                      className="h-11 px-5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200/60 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-40"
                    >
                      Huỷ
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={rejectTaskIds.length === 0 || isRejecting}
                      className="h-11 flex items-center gap-2 px-6 rounded-xl text-sm font-semibold text-white bg-rose-600 shadow-lg shadow-rose-600/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      {isRejecting ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          Đang gửi...
                        </>
                      ) : (
                        <>
                          <RotateCcw size={15} />
                          Gửi yêu cầu
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setRejectMode(true)}
                      disabled={isApproving}
                      className="h-11 flex items-center gap-2 px-5 rounded-xl text-sm font-semibold text-rose-600 border border-slate-200/60 bg-white hover:bg-rose-50 hover:border-rose-200 active:scale-[0.98] transition-all disabled:opacity-40"
                    >
                      <RotateCcw size={15} />
                      Kiểm định thất bại
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={!allTasksDone(selected) || isApproving}
                      title={
                        allTasksDone(selected)
                          ? undefined
                          : "Hoàn thành tất cả công việc trước khi nghiệm thu"
                      }
                      className="h-11 flex items-center gap-2 px-6 rounded-xl text-sm font-semibold text-white bg-[#00285E] shadow-lg shadow-[#00285E]/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      {isApproving ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          Đang nghiệm thu...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={15} />
                          Nghiệm thu & hoàn tất
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
