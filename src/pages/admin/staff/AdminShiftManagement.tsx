import { useState, useMemo, useEffect } from "react";
import { motion } from "motion/react";
import {
  CalendarClock,
  Clock,
  Settings2,
  Users,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Wand2,
  AlertCircle,
  X,
  Loader2,
  CheckCircle
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { useFetchClient_v2 } from "../../../hook/useFetchClient";
import { SHIFT_API_ENDPOINTS, API_BASE_URL } from "../../../constants/admin/ShiftManagementApiEndpoint";
import { STAFF_MANAGEMENT_API_ENDPOINTS } from "../../../constants/admin/staffManagementApiEndPoint";

// Helper to get dates for current week
const getDaysOfWeek = (startDate: Date) => {
  const days = [];
  const currentDate = new Date(startDate);
  currentDate.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Bắt đầu từ Thứ 2

  const dayNames = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];

  for (let i = 0; i < 7; i++) {
    days.push({
      date: new Date(currentDate),
      label: dayNames[i],
      formatted: `${currentDate.getDate()}/${currentDate.getMonth() + 1}`,
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return days;
};

// Define types based on backend models
type Slot = {
  id: number;
  slot_name: string;
  start_time: string;
  end_time: string;
  max_technicians: number;
  min_senior: number;
  min_mid: number;
  prefer_senior: number;
  prefer_mid: number;
  prefer_junior: number;
  is_active: boolean;
  color: string;
};

type Staff = {
  id: number;
  fullName: string;
  role: { roleName: string; roleCode: string };
  status?: string;
};

type ShiftTemplate = {
  id: number;
  user_id: number;
  slot_id: number;
  work_date: string;
  is_confirmed: boolean;
};

export default function AdminShiftManagement() {
  const { showToast } = useOutletContext<any>();
  const { fetchPrivate } = useFetchClient_v2();

  const [activeTab, setActiveTab] = useState<"roster" | "config">("roster");
  const [isFetching, setIsFetching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [slotsList, setSlotsList] = useState<Slot[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);

  // Roster State
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());
  const weekDays = useMemo(() => getDaysOfWeek(currentWeekStart), [currentWeekStart]);

  // Matrix data: [staffId_dateString] -> Array of { slotId, isConfirmed }
  const [rosterData, setRosterData] = useState<Record<string, { slotId: number, isConfirmed: boolean }[]>>({});

  // Fetch initial data (Slots & Staff)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch slots
        const slotsRes = await fetchPrivate(SHIFT_API_ENDPOINTS.GET_SLOTS);
        if (slotsRes.success && slotsRes.data) {
          // Map the backend data to add some default colors if needed
          const colors = [
            "bg-blue-100 text-blue-700 border-blue-200",
            "bg-amber-100 text-amber-700 border-amber-200",
            "bg-indigo-100 text-indigo-700 border-indigo-200",
            "bg-emerald-100 text-emerald-700 border-emerald-200"
          ];
          const mappedSlots = slotsRes.data.map((s: any, idx: number) => ({
            ...s,
            slot_name: s.slot_name || `Ca ${idx + 1}`,
            color: colors[idx % colors.length]
          }));
          setSlotsList(mappedSlots);
        }

        // Fetch technicians (all valid staff, then filter to technicians locally since backend query only accepts 1 role)
        const staffRes = await fetchPrivate(`${STAFF_MANAGEMENT_API_ENDPOINTS.STAFF_MANAGEMENT}?limit=100&status=ACTIVE`);
        if (staffRes.data) {
          const techs = staffRes.data.filter((s: Staff) =>
            ['TECHNICIAN', 'TECHNICIAN_LEADER'].includes(s.role?.roleCode) && s.status === 'ACTIVE'
          );
          setStaffList(techs);
        }
      } catch (error: any) {
        showToast("Lỗi khi tải dữ liệu: " + error.message, "error");
      }
    };
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch templates when week changes
  useEffect(() => {
    const fetchTemplates = async () => {
      setIsFetching(true);
      try {
        const startDate = weekDays[0].date.toISOString().split('T')[0];
        const endDate = weekDays[6].date.toISOString().split('T')[0];

        const res = await fetchPrivate(`${SHIFT_API_ENDPOINTS.GET_TEMPLATES}?startDate=${startDate}&endDate=${endDate}`);
        if (res.success && res.data) {
          const newRoster: Record<string, { slotId: number, isConfirmed: boolean }[]> = {};
          res.data.forEach((template: ShiftTemplate) => {
            const key = `${template.user_id}_${template.work_date}`;
            if (!newRoster[key]) newRoster[key] = [];
            newRoster[key].push({ slotId: template.slot_id, isConfirmed: template.is_confirmed });
          });
          setRosterData(newRoster);
        }
      } catch (error: any) {
        showToast("Lỗi khi tải lịch làm việc: " + error.message, "error");
      } finally {
        setIsFetching(false);
      }
    };
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeekStart]);

  const fetchTemplatesSilent = async () => {
    try {
      const startDate = weekDays[0].date.toISOString().split('T')[0];
      const endDate = weekDays[6].date.toISOString().split('T')[0];
      const res = await fetchPrivate(`${SHIFT_API_ENDPOINTS.GET_TEMPLATES}?startDate=${startDate}&endDate=${endDate}`);
      if (res.success && res.data) {
        const newRoster: Record<string, { slotId: number, isConfirmed: boolean }[]> = {};
        res.data.forEach((template: ShiftTemplate) => {
          const key = `${template.user_id}_${template.work_date}`;
          if (!newRoster[key]) newRoster[key] = [];
          newRoster[key].push({ slotId: template.slot_id, isConfirmed: template.is_confirmed });
        });
        setRosterData(newRoster);
      }
    } catch (error: any) {
      console.error(error);
    }
  };

  // Slot Config Modal State
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null);

  // Manual Assign Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{ staffId: number, dateStr: string, staffName: string } | null>(null);
  const [selectedSlotIds, setSelectedSlotIds] = useState<number[]>([]);

  const [newSlot, setNewSlot] = useState({
    slot_name: "",
    start_time: "08:00",
    end_time: "12:00",
    max_technicians: 5,
    min_senior: 0,
    min_mid: 0,
    prefer_senior: 1,
    prefer_mid: 1,
    prefer_junior: 1
  });

  const openCreateModal = () => {
    setEditingSlotId(null);
    setNewSlot({
      slot_name: "",
      start_time: "08:00",
      end_time: "12:00",
      max_technicians: 5,
      min_senior: 0,
      min_mid: 0,
      prefer_senior: 1,
      prefer_mid: 1,
      prefer_junior: 1
    });
    setIsSlotModalOpen(true);
  };

  const openEditModal = (slot: Slot) => {
    setEditingSlotId(slot.id);
    setNewSlot({
      slot_name: slot.slot_name,
      start_time: slot.start_time || "08:00",
      end_time: slot.end_time || "12:00",
      max_technicians: slot.max_technicians,
      min_senior: slot.min_senior || 0,
      min_mid: slot.min_mid || 0,
      prefer_senior: slot.prefer_senior || 1,
      prefer_mid: slot.prefer_mid || 1,
      prefer_junior: slot.prefer_junior || 1
    });
    setIsSlotModalOpen(true);
  };

  const handleSaveSlot = async () => {
    try {
      let res;
      if (editingSlotId) {
        res = await fetchPrivate(SHIFT_API_ENDPOINTS.UPDATE_SLOT(editingSlotId), "PUT", newSlot);
      } else {
        res = await fetchPrivate(SHIFT_API_ENDPOINTS.CREATE_SLOT, "POST", newSlot);
      }

      if (res.success) {
        showToast(editingSlotId ? "Cập nhật khung ca thành công!" : "Tạo khung ca thành công!", "success");
        setIsSlotModalOpen(false);
        // Reload slots immediately
        const slotsRes = await fetchPrivate(SHIFT_API_ENDPOINTS.GET_SLOTS);
        if (slotsRes.success && slotsRes.data) {
          const colors = [
            "bg-blue-100 text-blue-700 border-blue-200",
            "bg-amber-100 text-amber-700 border-amber-200",
            "bg-indigo-100 text-indigo-700 border-indigo-200",
            "bg-emerald-100 text-emerald-700 border-emerald-200"
          ];
          const mappedSlots = slotsRes.data.map((s: any, idx: number) => ({
            ...s,
            slot_name: s.slot_name || `Ca ${idx + 1}`,
            color: colors[idx % colors.length]
          }));
          setSlotsList(mappedSlots);
        }
      }
    } catch (error: any) {
      showToast("Lỗi lưu khung ca: " + error.message, "error");
    }
  };

  const handlePrevWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const handleAutoGenerate = async () => {
    if (slotsList.length === 0) {
      return showToast("Chưa có khung ca nào để xếp lịch!", "error");
    }
    if (staffList.length === 0) {
      return showToast("Chưa có kỹ thuật viên nào để xếp lịch!", "error");
    }
    setIsGenerating(true);
    showToast("Đang chạy AI phân ca tự động...", "info");
    try {
      const startDate = weekDays[0].date.toISOString().split('T')[0];
      const endDate = weekDays[6].date.toISOString().split('T')[0];

      await fetchPrivate(SHIFT_API_ENDPOINTS.AUTO_GENERATE, "POST", { startDate, endDate });
      showToast("Xếp ca tự động hoàn tất!", "success");
      await fetchTemplatesSilent(); // Reload templates
    } catch (error: any) {
      showToast("Lỗi khi xếp ca: " + error.message, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmSchedule = async () => {
    if (Object.keys(rosterData).length === 0) {
      return showToast("Chưa có lịch để chốt!", "error");
    }
    setIsGenerating(true);
    try {
      const startDate = weekDays[0].date.toISOString().split('T')[0];
      const endDate = weekDays[6].date.toISOString().split('T')[0];
      const res = await fetchPrivate(SHIFT_API_ENDPOINTS.CONFIRM_SCHEDULE, "POST", { startDate, endDate });
      if (res.success) {
        showToast("Đã chốt lịch làm việc! Kỹ thuật viên đã có thể xem lịch.", "success");
        await fetchTemplatesSilent();
      }
    } catch (error: any) {
      showToast("Lỗi chốt lịch: " + error.message, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const openAssignModal = (staffId: number, dateStr: string, staffName: string) => {
    const key = `${staffId}_${dateStr}`;
    const assignedArr = rosterData[key] || [];
    setSelectedSlotIds(assignedArr.map(a => a.slotId));
    setAssignTarget({ staffId, dateStr, staffName });
    setIsAssignModalOpen(true);
  };

  const handleSaveAssign = async () => {
    if (!assignTarget) return;
    const { staffId, dateStr } = assignTarget;

    try {
      const res = await fetchPrivate(SHIFT_API_ENDPOINTS.ASSIGN_SHIFT, "POST", {
        userId: staffId,
        slotIds: selectedSlotIds,
        workDate: dateStr
      });
      if (res.success) {
        showToast("Đã cập nhật ca làm việc!", "success");
        // Optimistic UI update
        const key = `${staffId}_${dateStr}`;
        setRosterData(prev => {
          const newData = { ...prev };
          if (selectedSlotIds.length === 0) {
            delete newData[key];
          } else {
            newData[key] = selectedSlotIds.map(id => ({ slotId: id, isConfirmed: true }));
          }
          return newData;
        });
      }
    } catch (error: any) {
      showToast("Lỗi khi gán ca: " + error.message, "error");
      await fetchTemplatesSilent(); // Revert on error
    } finally {
      setIsAssignModalOpen(false);
    }
  };

  // ---- RENDER ----
  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
      {/* TITLE BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">
            Quản lý Ca làm việc
          </h1>
          <p className="text-slate-500 text-sm">
            {activeTab === "roster"
              ? "Phân công và theo dõi lịch làm việc của nhân sự trong tuần."
              : "Thiết lập các khung giờ ca làm việc và yêu cầu bắt buộc."}
          </p>
        </div>

        {activeTab === "roster" ? (
          <div className="flex gap-3">
            <button
              onClick={handleAutoGenerate}
              disabled={isGenerating || isFetching}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-slate-900 rounded-xl text-sm font-bold shadow-md shadow-amber-500/20 hover:bg-amber-600 transition-all transform hover:translate-y-[-1px] disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
              <span>Xếp ca tự động </span>
            </button>
            <button
              onClick={handleConfirmSchedule}
              disabled={isGenerating || isFetching}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#00285E] text-white rounded-xl text-sm font-bold shadow-md shadow-[#00285E]/20 hover:bg-[#001e47] transition-all transform hover:translate-y-[-1px] disabled:opacity-50"
            >
              <CheckCircle size={16} />
              <span>Chốt Lịch Làm Việc</span>
            </button>
            <button
              onClick={() => fetchTemplatesSilent()}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-200 transition-all transform hover:translate-y-[-1px]"
            >
              <CalendarClock size={16} />
              <span>Tải Lại Lịch</span>
            </button>
          </div>
        ) : (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#00285E] text-white rounded-xl text-sm font-bold shadow-md shadow-[#00285E]/20 hover:bg-[#001e47] transition-all transform hover:translate-y-[-1px]"
          >
            <Plus size={16} />
            <span>Thêm Khung Ca Mới</span>
          </button>
        )}
      </div>

      {/* TABS SWITCHER */}
      <div className="flex border-b border-slate-200/60">
        <button
          onClick={() => setActiveTab("roster")}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-all ${activeTab === "roster"
            ? "border-[#00285E] text-[#00285E]"
            : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
        >
          Lịch Làm Việc (Roster)
        </button>
        <button
          onClick={() => setActiveTab("config")}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${activeTab === "config"
            ? "border-[#00285E] text-[#00285E]"
            : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
        >
          <Settings2 size={16} />
          Cấu hình Ca (Slots)
        </button>
      </div>

      {activeTab === "roster" ? (
        <div className="space-y-6">
          {/* Calendar Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={handlePrevWeek} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <div className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-2">
                <CalendarClock size={18} className="text-amber-500" />
                Tuần: {weekDays[0].formatted} - {weekDays[6].formatted}
              </div>
              <button onClick={handleNextWeek} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="flex gap-2">
              <button className="px-3.5 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2">
                <Filter size={14} /> Lọc nhân sự
              </button>
              <button onClick={() => setCurrentWeekStart(newDate => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d; })} className="px-3.5 py-2 text-xs font-bold text-brand-blue bg-blue-50 hover:bg-blue-100 rounded-lg">
                Tuần hiện tại
              </button>
            </div>
          </div>

          {/* Roster Matrix Table */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden relative min-h-[400px]">
            {isFetching && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-[#00285E]" size={32} />
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-4 px-6 font-bold text-slate-700 text-sm border-r border-slate-200/50 w-64 sticky left-0 bg-slate-50 z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)]">
                      Nhân sự
                    </th>
                    {weekDays.map((day, i) => (
                      <th key={i} className="py-3 px-2 text-center border-r border-slate-200/50 last:border-r-0 min-w-[120px]">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{day.label}</div>
                        <div className={`text-sm font-bold mt-1 ${day.date.toDateString() === new Date().toDateString()
                          ? "text-blue-600 bg-blue-50 mx-auto w-max px-2 py-0.5 rounded-full"
                          : "text-slate-800"
                          }`}>
                          {day.formatted}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staffList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">Chưa có dữ liệu Kỹ thuật viên. Vui lòng thêm trong Quản lý nhân sự.</td>
                    </tr>
                  ) : staffList.map((staff) => (
                    <tr key={staff.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-6 border-r border-slate-200/50 sticky left-0 bg-white shadow-[1px_0_0_0_rgba(226,232,240,0.5)] z-10 group-hover:bg-slate-50/50">
                        <div className="font-bold text-[#00285E] text-sm truncate max-w-[200px]" title={staff.fullName}>{staff.fullName}</div>
                        <div className="text-[11px] font-semibold text-slate-400 truncate">{staff.role?.roleName || 'Kỹ thuật viên'}</div>
                      </td>

                      {weekDays.map((day, i) => {
                        const dateStr = day.date.toISOString().split('T')[0];
                        const key = `${staff.id}_${dateStr}`;
                        const assignedArr = rosterData[key] || [];

                        return (
                          <td key={i} className="py-2 px-2 border-r border-slate-200/50 last:border-r-0 text-center align-top relative group">
                            <div
                              onClick={() => openAssignModal(staff.id, dateStr, staff.fullName)}
                              className="w-full min-h-[48px] rounded-lg flex flex-col gap-1 items-center justify-center cursor-pointer border border-transparent transition-all hover:border-slate-300 hover:bg-slate-100"
                            >
                              {assignedArr.length > 0 ? assignedArr.map((assignedData, idx) => {
                                const slotDef = slotsList.find(s => s.id === assignedData.slotId);
                                if (!slotDef) return null;
                                return (
                                  <div key={idx} className={`w-full p-1 rounded-md ${slotDef.color || 'bg-blue-100 text-blue-700 border-blue-200'} shadow-xs relative transform transition-transform hover:scale-105`}>
                                    <span className="text-[10px] font-bold truncate block">{slotDef.slot_name}</span>
                                    {!assignedData.isConfirmed && (
                                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-sm" title="Chưa chốt"></div>
                                    )}
                                  </div>
                                );
                              }) : (
                                <div className="w-full h-12 flex items-center justify-center bg-slate-50/50 border border-dashed border-slate-200 rounded-lg text-transparent group-hover:text-slate-400">
                                  <Plus size={16} />
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50 border-t border-slate-200 p-4 text-xs text-slate-500 flex gap-6 items-center flex-wrap">
              <span className="font-bold">Ghi chú màu sắc:</span>
              {slotsList.length === 0 ? <span className="italic">Chưa có khung ca</span> : slotsList.map(slot => (
                <div key={slot.id} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-sm border ${slot.color || 'bg-blue-100 border-blue-200'}`}></div>
                  <span>{slot.slot_name}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm border border-dashed border-slate-300 bg-slate-50"></div>
                <span>Nghỉ ca</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* CONFIG TAB */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {slotsList.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
              Chưa có khung ca nào được thiết lập. Vui lòng tạo mới!
            </div>
          )}
          {slotsList.map(slot => (
            <div key={slot.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow relative group">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditModal(slot)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100">
                  <Pencil size={14} />
                </button>
                <button onClick={() => showToast("Chức năng xóa sẽ được cập nhật sau", "info")} className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100">
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${slot.color || 'bg-blue-100 border-blue-200 text-blue-700'}`}>
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{slot.slot_name}</h3>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {slot.start_time ? slot.start_time.substring(0, 5) : ''} - {slot.end_time ? slot.end_time.substring(0, 5) : ''}
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Tối đa nhân viên:</span>
                  <span className="font-bold text-slate-800">{slot.max_technicians} người</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Bắt buộc Senior:</span>
                  <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">Ít nhất {slot.min_senior || 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Trạng thái:</span>
                  {slot.is_active ? (
                    <span className="font-bold text-emerald-600 flex items-center gap-1">Đang hoạt động</span>
                  ) : (
                    <span className="font-bold text-slate-400">Vô hiệu hóa</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* ADD NEW SLOT BUTTON */}
          <div
            onClick={openCreateModal}
            className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 text-slate-400 hover:text-brand-blue hover:border-brand-blue/30 hover:bg-blue-50/30 transition-all cursor-pointer min-h-[220px]"
          >
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3 group-hover:bg-blue-100">
              <Plus size={24} />
            </div>
            <span className="font-bold text-sm">Tạo Khung Ca Mới</span>
          </div>
        </div>
      )}

      {/* DUMMY MODAL */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsSlotModalOpen(false)}></div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock size={18} className="text-amber-500" />
                {editingSlotId ? "Cập nhật Khung Ca" : "Thêm Khung Ca Mới"}
              </h2>
              <button onClick={() => setIsSlotModalOpen(false)} className="p-1 hover:bg-slate-200 rounded text-slate-500">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Tên Khung Ca (slot_name)</label>
                <input type="text" value={newSlot.slot_name} onChange={e => setNewSlot({ ...newSlot, slot_name: e.target.value })} placeholder="Vd: Ca Sáng" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#00285E]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Giờ bắt đầu</label>
                  <input type="time" value={newSlot.start_time} onChange={e => setNewSlot({ ...newSlot, start_time: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#00285E]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Giờ kết thúc</label>
                  <input type="time" value={newSlot.end_time} onChange={e => setNewSlot({ ...newSlot, end_time: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#00285E]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Tối đa nhân viên / Ca</label>
                <input type="number" value={newSlot.max_technicians} onChange={e => setNewSlot({ ...newSlot, max_technicians: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#00285E]" />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="font-bold text-sm text-slate-800 mb-3">Quy tắc cứng (Bắt buộc)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Tối thiểu Senior</label>
                    <input type="number" min="0" value={newSlot.min_senior} onChange={e => setNewSlot({ ...newSlot, min_senior: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#00285E]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Tối thiểu Mid</label>
                    <input type="number" min="0" value={newSlot.min_mid} onChange={e => setNewSlot({ ...newSlot, min_mid: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#00285E]" />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="font-bold text-sm text-slate-800 mb-3">Quy tắc mềm (Ưu tiên phân bổ)</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Senior</label>
                    <input type="number" min="0" value={newSlot.prefer_senior} onChange={e => setNewSlot({ ...newSlot, prefer_senior: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#00285E]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Mid</label>
                    <input type="number" min="0" value={newSlot.prefer_mid} onChange={e => setNewSlot({ ...newSlot, prefer_mid: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#00285E]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Junior</label>
                    <input type="number" min="0" value={newSlot.prefer_junior} onChange={e => setNewSlot({ ...newSlot, prefer_junior: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#00285E]" />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setIsSlotModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg">Hủy</button>
              <button onClick={handleSaveSlot} className="px-5 py-2 text-sm font-bold text-white bg-[#00285E] hover:bg-[#001e47] rounded-lg shadow-md shadow-[#00285E]/20">
                {editingSlotId ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Manual Assign Modal */}
      {isAssignModalOpen && assignTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="font-bold text-slate-800">Chỉnh Sửa Ca Làm Việc</h2>
                <p className="text-xs text-slate-500">{assignTarget.staffName} - Ngày: {assignTarget.dateStr.split('-').reverse().join('/')}</p>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Chọn các ca làm việc</label>
              {slotsList.length === 0 ? (
                <p className="text-sm italic text-slate-500">Chưa có khung ca nào. Vui lòng tạo khung ca trước.</p>
              ) : (
                slotsList.map(slot => {
                  const isSelected = selectedSlotIds.includes(slot.id);
                  return (
                    <div
                      key={slot.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedSlotIds(prev => prev.filter(id => id !== slot.id));
                        } else {
                          setSelectedSlotIds(prev => [...prev, slot.id]);
                        }
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-[#00285E] bg-blue-50/50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-[#00285E] border-[#00285E] text-white' : 'border-slate-300 bg-white'}`}>
                        {isSelected && <CheckCircle size={14} />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800">{slot.slot_name}</p>
                        <p className="text-xs text-slate-500">{slot.start_time ? slot.start_time.substring(0, 5) : ''} - {slot.end_time ? slot.end_time.substring(0, 5) : ''}</p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${slot.color || 'bg-blue-100 border-blue-200'}`}></div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setIsAssignModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg">Hủy</button>
              <button onClick={handleSaveAssign} className="px-5 py-2 text-sm font-bold text-white bg-[#00285E] hover:bg-[#001e47] rounded-lg shadow-md shadow-[#00285E]/20">
                Lưu Thay Đổi
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
