import { useState, useMemo, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Star,
  MessageSquare,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Wrench,
  Phone,
  UserCog,
  CalendarDays,
  Car,
} from "lucide-react";
import { useFetchClient } from "../../../hook/useFetchClient";
import { RECEPTION_API } from "../../../constants/reception/receptionApiEndpoint";
import { formatPhoneDisplay } from "../../../utils/formatPhone";

interface FeedbackRow {
  id: number;
  customer_id: number | null;
  service_order_id: number | null;
  rating: number | null;
  comment: string | null;
  service_rating: number | null;
  service_comment: string | null;
  receptionist_rating: number | null;
  receptionist_comment: string | null;
  head_technician_rating: number | null;
  head_technician_comment: string | null;
  createdAt: string;
  customer?: { id: number; name: string | null; phone: string | null; email: string | null } | null;
  serviceOrder?: {
    id: number;
    status: string | null;
    vehicle?: {
      id: number;
      license_plate: string | null;
      color: string | null;
      model?: { id: number; model_name: string | null; make?: { id: number; make_name: string | null } | null } | null;
    } | null;
    tasks?: { id: number; type: string | null; status: string | null; catalog?: { id: number; service_name: string | null } | null }[];
  } | null;
  receptionist?: { id: number; fullName: string } | null;
  headTechnician?: { id: number; fullName: string } | null;
}

const ITEMS_PER_PAGE = 6;

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// Điểm chung của một đánh giá: trung bình 3 hạng mục khách đã chấm.
const overallRating = (row: FeedbackRow) => {
  const scores = [row.service_rating, row.receptionist_rating, row.head_technician_rating].filter(
    (value): value is number => typeof value === "number" && value > 0,
  );
  if (!scores.length) return row.rating ?? 0;
  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
};

function StarRow({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`${value.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          key={index}
          size={size}
          className={index <= Math.round(value) ? "text-[#F9A11B] fill-[#F9A11B]" : "text-slate-300"}
        />
      ))}
    </span>
  );
}

function AspectCard({
  icon: Icon,
  label,
  person,
  rating,
  comment,
}: {
  icon: React.ElementType;
  label: string;
  person?: string | null;
  rating: number | null;
  comment: string | null;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={14} className="shrink-0 text-slate-400" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-700 truncate">{label}</p>
            {person && <p className="text-[11px] text-slate-400 truncate">{person}</p>}
          </div>
        </div>
        {rating ? (
          <span className="shrink-0 inline-flex items-center gap-1.5">
            <StarRow value={rating} size={12} />
            <span className="text-xs font-bold text-slate-700">{rating}</span>
          </span>
        ) : (
          <span className="shrink-0 text-[11px] text-slate-400 italic">Chưa chấm</span>
        )}
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">
        {comment?.trim() || <span className="text-slate-400 italic">Không có nhận xét.</span>}
      </p>
    </div>
  );
}

export default function ReceptionFeedbackList() {
  const navigate = useNavigate();
  const { fetchPrivate } = useFetchClient();
  const { showToast } = useOutletContext<{
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();

  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const loadFeedbacks = async () => {
      setIsLoading(true);
      try {
        const response = await fetchPrivate(RECEPTION_API.FEEDBACK, "GET");
        setFeedbacks(Array.isArray(response?.data) ? response.data : []);
      } catch (error: any) {
        showToast(error?.message || "Không tải được danh sách đánh giá.", "warning");
      } finally {
        setIsLoading(false);
      }
    };
    void loadFeedbacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    if (!feedbacks.length) return { total: 0, average: 0, good: 0, poor: 0 };
    const scores = feedbacks.map(overallRating);
    return {
      total: feedbacks.length,
      average: scores.reduce((sum, value) => sum + value, 0) / scores.length,
      good: scores.filter((value) => value >= 4).length,
      poor: scores.filter((value) => value > 0 && value < 3).length,
    };
  }, [feedbacks]);

  const filtered = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return feedbacks.filter((row) => {
      // SĐT lưu dạng 84... nên phải khớp cả khi lễ tân gõ kiểu 0...
      const searchDigits = keyword.replace(/\D/g, "");
      const phoneDigits = (row.customer?.phone || "").replace(/\D/g, "");
      const phoneLocal = phoneDigits.startsWith("84") ? `0${phoneDigits.slice(2)}` : phoneDigits;

      const matchSearch =
        !keyword ||
        (row.customer?.name || "").toLowerCase().includes(keyword) ||
        (searchDigits !== "" &&
          (phoneDigits.includes(searchDigits) || phoneLocal.includes(searchDigits))) ||
        String(row.service_order_id ?? "").includes(keyword) ||
        (row.serviceOrder?.vehicle?.license_plate || "").toLowerCase().includes(keyword) ||
        (row.serviceOrder?.tasks || []).some((task) =>
          (task.catalog?.service_name || "").toLowerCase().includes(keyword),
        ) ||
        [row.service_comment, row.receptionist_comment, row.head_technician_comment, row.comment]
          .filter(Boolean)
          .some((text) => (text as string).toLowerCase().includes(keyword));

      const score = overallRating(row);
      const matchRating =
        ratingFilter === "all" ||
        (ratingFilter === "good" && score >= 4) ||
        (ratingFilter === "average" && score >= 3 && score < 4) ||
        (ratingFilter === "poor" && score > 0 && score < 3);

      return matchSearch && matchRating;
    });
  }, [feedbacks, searchTerm, ratingFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    [filtered, page],
  );

  useEffect(() => setPage(1), [searchTerm, ratingFilter]);

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6">
      {/* HEADER */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(-1)}
          title="Quay lại"
          className="mt-0.5 w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-[#00285E] border border-[#00285E] text-white hover:bg-[#003C7D] active:scale-[0.97] transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#00285E] tracking-tight leading-none mb-2">
            Đánh giá của khách hàng
          </h1>
          <p className="text-slate-500 text-sm">
            Xem lại nhận xét khách để lại sau khi hoàn tất dịch vụ.
          </p>
        </div>
      </div>

      {/* THỐNG KÊ */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
            Tổng đánh giá
          </span>
          <span className="text-2xl font-bold text-[#00285E]">{stats.total}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
            Điểm trung bình
          </span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[#00285E]">{stats.average.toFixed(1)}</span>
            <StarRow value={stats.average} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
            Hài lòng (≥ 4 sao)
          </span>
          <span className="text-2xl font-bold text-emerald-600">{stats.good}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
            Cần lưu ý (&lt; 3 sao)
          </span>
          <span className="text-2xl font-bold text-rose-600">{stats.poor}</span>
        </div>
      </div>

      {/* BỘ LỌC */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên khách, số điện thoại, biển số, dịch vụ, nội dung nhận xét..."
            className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
          />
        </div>
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className="px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10"
        >
          <option value="all">Mức đánh giá: Tất cả</option>
          <option value="good">Hài lòng (≥ 4 sao)</option>
          <option value="average">Trung bình (3 – 4 sao)</option>
          <option value="poor">Cần lưu ý (&lt; 3 sao)</option>
        </select>
      </div>

      {/* DANH SÁCH */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 size={40} className="mb-3 text-[#00285E] animate-spin" />
          <p className="text-sm font-semibold">Đang tải đánh giá...</p>
        </div>
      ) : paginated.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 flex flex-col items-center justify-center py-20 text-slate-400">
          <MessageSquare size={40} className="mb-3 text-slate-300" />
          <p className="text-base font-semibold mb-1 text-slate-500">
            {feedbacks.length === 0 ? "Chưa có đánh giá nào" : "Không tìm thấy đánh giá phù hợp"}
          </p>
          <p className="text-sm">
            {feedbacks.length === 0
              ? "Đánh giá sẽ xuất hiện sau khi khách hoàn tất dịch vụ và gửi nhận xét."
              : "Thử đổi từ khóa hoặc mức đánh giá."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginated.map((row) => {
            const score = overallRating(row);
            const isPoor = score > 0 && score < 3;
            return (
              <div
                key={row.id}
                className={`bg-white rounded-2xl border shadow-xs overflow-hidden ${
                  isPoor ? "border-rose-200" : "border-slate-200/60"
                }`}
              >
                {/* Vạch màu đầu thẻ: navy bình thường, đỏ khi đánh giá thấp */}
                <div className={`h-1 w-full ${isPoor ? "bg-rose-500" : "bg-[#00285E]"}`} />

                {/* Đầu thẻ */}
                <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#00285E] text-sm">
                        {row.customer?.name?.trim() || "Khách vãng lai"}
                      </span>
                      {row.customer?.phone && (
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          · {formatPhoneDisplay(row.customer.phone)}
                        </span>
                      )}
                      {row.service_order_id && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                          SO-{row.service_order_id}
                        </span>
                      )}
                      {isPoor && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                          Cần lưu ý
                        </span>
                      )}
                    </div>

                    {/* Xe của khách */}
                    {row.serviceOrder?.vehicle && (
                      <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1.5 font-semibold">
                        <Car size={12} className="shrink-0 text-slate-400" />
                        {row.serviceOrder.vehicle.license_plate || "Chưa có biển số"}
                        {row.serviceOrder.vehicle.model?.model_name && (
                          <span className="font-normal text-slate-400">
                            · {row.serviceOrder.vehicle.model.make?.make_name}{" "}
                            {row.serviceOrder.vehicle.model.model_name}
                          </span>
                        )}
                      </p>
                    )}

                    {/* Dịch vụ đã thực hiện trong đơn */}
                    {(() => {
                      const services = [
                        ...new Set(
                          (row.serviceOrder?.tasks || [])
                            .map((task) => task.catalog?.service_name)
                            .filter((name): name is string => Boolean(name?.trim())),
                        ),
                      ];
                      if (!services.length) return null;
                      return (
                        <div className="flex items-start gap-1.5 mt-1.5">
                          <Wrench size={12} className="shrink-0 text-slate-400 mt-0.5" />
                          <div className="flex flex-wrap gap-1.5">
                            {services.map((name) => (
                              <span
                                key={name}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1.5">
                      <CalendarDays size={11} />
                      {formatDateTime(row.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StarRow value={score} size={16} />
                    <span className="text-lg font-bold text-[#00285E]">{score.toFixed(1)}</span>
                  </div>
                </div>

                {/* Ba hạng mục khách chấm */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <AspectCard
                    icon={Wrench}
                    label="Chất lượng dịch vụ"
                    rating={row.service_rating}
                    comment={row.service_comment}
                  />
                  <AspectCard
                    icon={Phone}
                    label="Lễ tân"
                    person={row.receptionist?.fullName}
                    rating={row.receptionist_rating}
                    comment={row.receptionist_comment}
                  />
                  <AspectCard
                    icon={UserCog}
                    label="Kỹ thuật viên trưởng"
                    person={row.headTechnician?.fullName}
                    rating={row.head_technician_rating}
                    comment={row.head_technician_comment}
                  />
                </div>

                {/* Nhận xét chung (nếu khách có ghi) */}
                {row.comment?.trim() && (
                  <div className="px-5 pb-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                        Nhận xét chung
                      </span>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                        {row.comment}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* PHÂN TRANG */}
      {!isLoading && filtered.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200/60 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">
            Hiển thị {(page - 1) * ITEMS_PER_PAGE + 1}–
            {Math.min(page * ITEMS_PER_PAGE, filtered.length)} trên {filtered.length} đánh giá
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-slate-600 px-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
