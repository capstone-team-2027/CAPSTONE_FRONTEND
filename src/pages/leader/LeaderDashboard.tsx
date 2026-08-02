import { ClipboardCheck, ShieldCheck, Clock, CheckCircle2 } from "lucide-react";

export default function LeaderDashboard() {
  // TODO: nối API thống kê kiểm định khi BE sẵn sàng
  const stats = [
    { label: "Chờ kiểm định", value: "—", icon: Clock, tint: "bg-amber-50 text-amber-600" },
    { label: "Đạt chất lượng", value: "—", icon: CheckCircle2, tint: "bg-emerald-50 text-emerald-600" },
    { label: "Cần sửa lại", value: "—", icon: ShieldCheck, tint: "bg-rose-50 text-rose-600" },
  ];

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* TITLE */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">
          Tổng quan phân công
        </h1>
        <p className="text-slate-500 text-sm">
          Theo dõi việc phân công kỹ thuật viên cho các task.
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${s.tint}`}>
                <Icon size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                  {s.value}
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* PLACEHOLDER */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-12 flex flex-col items-center justify-center text-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-[#EDF3FF] flex items-center justify-center">
          <ClipboardCheck size={26} className="text-[#00285E]" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">
          Màn hình phân công đang được xây dựng
        </h2>
        <p className="text-sm text-slate-500 max-w-md">
          Khung giao diện đã sẵn sàng. Các chức năng nghiệp vụ và dữ liệu sẽ được
          bổ sung khi API kiểm định hoàn thiện.
        </p>
      </div>
    </div>
  );
}