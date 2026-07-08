import { useState, useMemo, useEffect } from 'react';
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  CalendarClock,
  Clock
} from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store/store';
import type { UserModel } from '../../../model/User';
import { useFetchClient } from '../../../hook/useFetchClient';
import { MY_SHIFTS_ENDPOINT } from '../../../constants/technician/myShiftsEndpoint';

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

interface ShiftSlot {
  id: number;
  slot_name: string;
  start_time: string;
  end_time: string;
}

interface ShiftData {
  id: number;
  work_date: string;
  is_confirmed: boolean;
  shiftSlot: ShiftSlot;
}

export default function TechnicianMyShifts() {
  const { fetchPrivate } = useFetchClient();
  const user = useSelector((state: RootState) => state.user.user as UserModel | null);
  
  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Tuần hiện tại
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());
  const weekDays = useMemo(() => getDaysOfWeek(currentWeekStart), [currentWeekStart]);

  const fetchShifts = async () => {
    setIsLoading(true);
    try {
      const startDate = weekDays[0].date.toISOString().split('T')[0];
      const endDate = weekDays[6].date.toISOString().split('T')[0];
      
      const response = await fetchPrivate(`${MY_SHIFTS_ENDPOINT.GET_MY_SHIFTS}?startDate=${startDate}&endDate=${endDate}`);
      if (response && response.data) {
        setShifts(response.data);
      }
    } catch (error) {
      console.error('Lỗi khi lấy lịch làm việc:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, [currentWeekStart]);

  const handlePrevWeek = () => {
    setCurrentWeekStart(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  };

  const setThisWeek = () => {
    setCurrentWeekStart(new Date());
  };

  // Tạo map [work_date] => Array<ShiftData>
  const rosterData = useMemo(() => {
    const map: Record<string, ShiftData[]> = {};
    shifts.forEach(shift => {
      if (!map[shift.work_date]) {
        map[shift.work_date] = [];
      }
      map[shift.work_date].push(shift);
    });
    return map;
  }, [shifts]);

  const displayName = user?.fullName || 'Kỹ thuật viên';

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <CalendarDays className="text-[#00285E]" size={28} />
            Lịch làm việc của tôi
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            Xem lịch trực và khung giờ làm việc đã được phân công theo tuần.
          </p>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={handlePrevWeek} disabled={isLoading} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-50">
            <ChevronLeft size={20} />
          </button>
          <div className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-2">
            <CalendarClock size={18} className="text-[#00285E]" />
            Tuần: {weekDays[0].formatted} - {weekDays[6].formatted}
          </div>
          <button onClick={handleNextWeek} disabled={isLoading} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-50">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={setThisWeek} 
            disabled={isLoading}
            className="px-4 py-2 text-sm font-bold text-[#00285E] bg-[#EDF3FF] hover:bg-[#DCE8FF] rounded-xl transition-colors disabled:opacity-50"
          >
            Tuần hiện tại
          </button>
        </div>
      </div>

      {/* Roster Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden relative min-h-[300px]">
        {isLoading && (
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
                      ? "text-[#00285E] bg-[#EDF3FF] mx-auto w-max px-2 py-0.5 rounded-full"
                      : "text-slate-800"
                      }`}>
                      {day.formatted}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td className="py-5 px-6 border-r border-slate-200/50 sticky left-0 bg-white shadow-[1px_0_0_0_rgba(226,232,240,0.5)] z-10 group-hover:bg-slate-50/50">
                  <div className="font-bold text-[#00285E] text-sm truncate max-w-[200px]">{displayName}</div>
                  <div className="text-[11px] font-semibold text-slate-400 truncate">Kỹ thuật viên</div>
                </td>

                {weekDays.map((day, i) => {
                  const dateStr = day.date.toISOString().split('T')[0];
                  const assignedArr = rosterData[dateStr] || [];

                  return (
                    <td key={i} className="py-3 px-2 border-r border-slate-200/50 last:border-r-0 text-center align-top relative group">
                      <div className="w-full min-h-[60px] rounded-lg flex flex-col gap-2 items-center justify-center p-1">
                        {assignedArr.length > 0 ? (
                          assignedArr.map((shift, idx) => {
                            const colors = [
                              "bg-blue-100 text-blue-700 border-blue-200/60 shadow-sm",
                              "bg-amber-100 text-amber-700 border-amber-200/60 shadow-sm",
                              "bg-indigo-100 text-indigo-700 border-indigo-200/60 shadow-sm",
                              "bg-emerald-100 text-emerald-700 border-emerald-200/60 shadow-sm"
                            ];
                            // Try to map consistently based on shift slot ID. If ID is 1 -> index 0 (blue), ID is 2 -> index 1 (amber)
                            const colorIndex = shift.shiftSlot ? (shift.shiftSlot.id - 1) % colors.length : 0;
                            const slotColor = colors[Math.max(0, colorIndex)];

                            return (
                              <div 
                                key={idx} 
                                className={`w-full px-2 py-1.5 rounded-md flex flex-col items-center gap-0.5 border ${slotColor}`}
                              >
                                <span className="text-[11px] font-bold truncate block w-full">{shift.shiftSlot?.slot_name}</span>
                                <div className="flex items-center gap-1 text-[10px] font-semibold opacity-90">
                                  <Clock size={10} />
                                  <span>{shift.shiftSlot?.start_time.slice(0,5)} - {shift.shiftSlot?.end_time.slice(0,5)}</span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-[10px] font-medium text-slate-300 italic py-2">
                            Không có ca
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
