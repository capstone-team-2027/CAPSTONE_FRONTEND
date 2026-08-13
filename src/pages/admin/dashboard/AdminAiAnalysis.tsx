import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, RefreshCw, Target, TrendingUp } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useFetchClient_v2 as useFetchClient } from '../../../hook/useFetchClient';
import { STATISTICS_API_ENDPOINTS } from '../../../constants/admin/statisticsApiEndpoint';

const AiStamp = ({ label = 'AI · PHÂN TÍCH' }: { label?: string }) => (
  <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-700">
    {label}
  </span>
);

const parseBoldText = (text: string) => text.split(/\*\*([^*]+)\*\*/g).map((part, index) => (
  index % 2 === 1
    ? <strong key={index} className="rounded-sm bg-amber-50/60 px-1 font-bold text-slate-900">{part}</strong>
    : part
));

const cleanAiText = (value: string) => value
  .replace(/^[-*]\s*/, '')
  .replace(/^\*+|\*+$/g, '')
  .replace(/^\s*[{(]\s*(ưu tiên\s*\d+)\s*[\]})]/i, '[$1]')
  .replace(/khẩn cấp/gi, '')
  .replace(/\s{2,}/g, ' ')
  .trim();

const cleanGeneratedText = (value?: string) => String(value || '').replace(/khẩn cấp/gi, '').replace(/\s{2,}/g, ' ').trim();

const isPriorityTitle = (value: string) => {
  const normalized = value.replace(/^[\s*_\-[{(]+/, '');
  return /^ưu tiên\s*\d+/i.test(normalized);
};

const AiPlan = ({ text }: { text: string }) => {
  const sections = useMemo(() => {
    const result: Array<{ title: string; items: string[] }> = [];
    let current: { title: string; items: string[] } | null = null;
    text.split('\n').forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) return;
      if (/^#{1,3}\s*/.test(line)) {
        current = { title: line.replace(/^#{1,3}\s*/, ''), items: [] };
        result.push(current);
      } else {
        if (!current) {
          current = { title: 'Nhận định', items: [] };
          result.push(current);
        }
        current.items.push(line.replace(/^[-*]\s*/, ''));
      }
    });
    return result;
  }, [text]);

  return <div className="space-y-5">{sections.map((section, sectionIndex) => {
    const isAction = /hành động|ưu tiên/i.test(section.title);
    const actions: Array<{ title: string; details: string[] }> = [];
    if (isAction) section.items.forEach((item) => {
      if (isPriorityTitle(item)) actions.push({ title: cleanAiText(item), details: [] });
      else if (actions.length) actions[actions.length - 1].details.push(item);
      else actions.push({ title: item, details: [] });
    });
    return <section key={`${section.title}-${sectionIndex}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-600">{sectionIndex === 1 ? 'Ưu tiên' : 'Phân tích'}</p>
        <h3 className="mt-1 text-xl font-bold text-slate-900">{section.title.replace(/^\d+\.\s*/, '')}</h3>
      </div>
      <div className="space-y-5 p-6">
        {isAction ? actions.map((action, actionIndex) => <article key={`${action.title}-${actionIndex}`} className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00285E] text-sm font-bold text-white">{actionIndex + 1}</span>
            <h4 className="text-base font-bold leading-6 text-slate-900">{parseBoldText(cleanAiText(action.title))}</h4>
          </div>
          <div className="grid gap-4 bg-slate-50/40 p-6 lg:grid-cols-2">
            {action.details.filter((detail) => !/^\*{0,2}(hạn hoàn thành|thời hạn)\*{0,2}\s*:/i.test(detail)).map((detail, detailIndex) => {
              const cleanedDetail = cleanAiText(detail);
              const separator = cleanedDetail.indexOf(':');
              const rawLabel = separator >= 0 ? cleanedDetail.slice(0, separator).replace(/\*\*/g, '') : 'Chi tiết';
              const label = /KPI/i.test(rawLabel) ? 'Chỉ số kiểm tra' : rawLabel;
              const value = separator >= 0 ? cleanedDetail.slice(separator + 1).trim() : cleanedDetail;
              return <div key={detailIndex} className={`rounded-xl border p-4 ${/chỉ số kiểm tra/i.test(label) ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-white'}`}><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-sm leading-6 text-slate-700">{parseBoldText(value)}</p></div>;
            })}
          </div>
        </article>) : section.items.map((item, itemIndex) => <div key={itemIndex} className="flex items-start gap-3 rounded-xl bg-slate-50 px-5 py-4"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-500" /><p className="text-sm leading-6 text-slate-700">{parseBoldText(cleanAiText(item))}</p></div>)}
      </div>
    </section>;
  })}</div>;
};

type StructuredPlan = {
  executive_summary?: string[];
  assessment?: {
    revenue_signal?: string;
    primary_bottleneck?: string;
    reasoning?: string;
    data_limitations?: string[];
  };
  actions?: Array<{ priority?: number; title?: string; evidence?: string; execution?: string; owner?: string; kpi?: string }>;
  adjustment_conditions?: string[];
};

const SystemAssessment = ({ assessment }: { assessment?: StructuredPlan['assessment'] }) => {
  if (!assessment) return null;
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <div className="border-b border-slate-200 bg-slate-50 px-6 py-5"><p className="text-xs font-bold uppercase tracking-wider text-amber-600">Phân tích</p><h2 className="mt-1 text-xl font-bold text-slate-900">Nhận định về hệ thống</h2></div>
    <div className="p-6"><div className="grid gap-4 lg:grid-cols-2"><div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase text-slate-500">Tín hiệu doanh thu</p><p className="mt-2 text-sm leading-6 text-slate-700">{assessment.revenue_signal}</p></div><div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase text-slate-500">Vấn đề ảnh hưởng chính</p><p className="mt-2 text-sm leading-6 text-slate-700">{assessment.primary_bottleneck}</p></div></div><p className="mt-4 text-sm leading-6 text-slate-700">{assessment.reasoning}</p>{!!assessment.data_limitations?.length && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold uppercase text-amber-700">Giới hạn dữ liệu</p><ul className="mt-2 space-y-1 text-sm leading-6 text-slate-700">{assessment.data_limitations.map((item, index) => <li key={index}>• {item}</li>)}</ul></div>}</div>
  </section>;
};

const StructuredAiPlan = ({ plan }: { plan: StructuredPlan }) => {
  const actions = [...(plan.actions || [])].sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0));

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-5"><p className="text-xs font-bold uppercase tracking-wider text-amber-600">Kết luận</p><h3 className="mt-1 text-xl font-bold text-slate-900">Việc cần xử lý ngay</h3></div>
      <div className="space-y-3 p-6">{(plan.executive_summary || []).map((item, index) => <div key={index} className="flex gap-3 rounded-xl bg-slate-50 px-5 py-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#00285E] text-xs font-bold text-white">{index + 1}</span><p className="text-sm leading-6 text-slate-700">{item}</p></div>)}</div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-5"><p className="text-xs font-bold uppercase tracking-wider text-amber-600">Ưu tiên</p><h3 className="mt-1 text-xl font-bold text-slate-900">Hành động cụ thể</h3></div>
      <div className="space-y-5 p-6">{actions.map((action, index) => <article key={`${action.priority}-${action.title}`} className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm"><div className="flex items-center gap-4 border-b border-slate-200 px-6 py-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00285E] text-sm font-bold text-white">{action.priority || index + 1}</span><h4 className="text-base font-bold leading-6 text-slate-900">{cleanGeneratedText(action.title)}</h4></div><div className="grid gap-4 bg-slate-50/40 p-6 lg:grid-cols-2">{[
        ['Căn cứ', action.evidence, false], ['Thực hiện', action.execution, false], ['Phụ trách đề xuất', action.owner, false], ['Chỉ số kiểm tra', action.kpi, true]
      ].map(([label, value, isKpi]) => <div key={String(label)} className={`rounded-xl border p-4 ${isKpi ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-white'}`}><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-sm leading-6 text-slate-700">{value}</p></div>)}</div></article>)}</div>
    </section>

    <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6"><h3 className="text-lg font-bold text-slate-900">Khi nào cần điều chỉnh kế hoạch?</h3><div className="mt-4 space-y-3">{(plan.adjustment_conditions || []).map((item, index) => <div key={index} className="rounded-xl border border-amber-100 bg-white px-4 py-3 text-sm leading-6 text-slate-700">{index + 1}. {item}</div>)}</div></section>
  </div>;
};

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatMoney = (value: unknown) => `${Math.round(Number(value || 0)).toLocaleString('vi-VN')} đ`;

export default function AdminAiAnalysis() {
  const { showToast } = useOutletContext<{ showToast: (text: string, type?: 'success' | 'info' | 'warning') => void }>();
  const { fetchPrivate } = useFetchClient();
  const today = useMemo(() => new Date(), []);
  const initialStart = useMemo(() => { const date = new Date(today); date.setDate(date.getDate() - 29); return date; }, [today]);
  const [startDate, setStartDate] = useState(() => formatLocalDate(initialStart));
  const [endDate, setEndDate] = useState(() => formatLocalDate(today));
  const [rangeDays, setRangeDays] = useState('30');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRequestedAnalysis, setHasRequestedAnalysis] = useState(false);

  const loadAnalysis = useCallback(async () => {
    if (!startDate || !endDate || startDate > endDate) {
      showToast('Khoảng ngày phân tích không hợp lệ.', 'warning');
      return;
    }
    try {
      setHasRequestedAnalysis(true);
      setIsLoading(true);
      const url = `${STATISTICS_API_ENDPOINTS.GET_ADVANCED}?timeframe=custom&startDate=${startDate}&endDate=${endDate}&generateAi=true&planHorizon=1_month`;
      const response = await fetchPrivate(url);
      if (response.success && response.data) setData(response.data);
      else showToast('Không lấy được dữ liệu phân tích AI.', 'warning');
    } catch (error: any) {
      showToast(error.message || 'Lỗi khi tải phân tích AI.', 'warning');
    } finally {
      setIsLoading(false);
    }
  }, [endDate, fetchPrivate, showToast, startDate]);

  const changeRange = (days: string) => {
    setRangeDays(days);
    const rangeEnd = new Date();
    const rangeStart = new Date(rangeEnd);
    rangeStart.setDate(rangeEnd.getDate() - (Number(days) - 1));
    setStartDate(formatLocalDate(rangeStart));
    setEndDate(formatLocalDate(rangeEnd));
    setData(null);
    setHasRequestedAnalysis(false);
  };

  const growing = (data?.yoy_service_drivers?.growing || []).slice(0, 3);
  const declining = (data?.yoy_service_drivers?.declining || []).slice(0, 3);
  const popularServices = [...growing, ...declining]
    .sort((a: any, b: any) => Number(b.this_year_rev || 0) - Number(a.this_year_rev || 0))
    .slice(0, 5);
  const maxServiceRevenue = Math.max(...popularServices.map((item: any) => Number(item.this_year_rev || 0)), 1);
  const risks = data?.dashboard_stats?.businessOverview?.operationalRisks || {};
  const overloadedTechnicians = (risks?.workload?.technicians || []).filter((tech: any) => tech.aboveTeamAverage);
  const shortageParts = (risks?.inventoryForecast || []).filter((part: any) => Number(part.projectedShortage || 0) > 0);
  const unresolvedTasks = Number(risks?.tasks?.unassigned || 0) + Number(risks?.tasks?.waitingParts || 0);

  return <div className="mx-auto min-w-0 w-full max-w-7xl flex-1 space-y-6 p-4 md:p-8">
      <header className="relative overflow-hidden rounded-2xl bg-[#00285E] p-6 text-white shadow-sm">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-[#E2932E]" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><AiStamp label="AI · Hoạt động gara" /><h1 className="mt-3 text-2xl font-bold tracking-tight">AI phân tích hệ thống</h1><p className="mt-1 text-xs text-blue-100">Dữ liệu {startDate} → {endDate}</p></div>
          <div className="flex flex-wrap gap-2">
            <select value={rangeDays} onChange={(event) => changeRange(event.target.value)} className="rounded-xl border border-white/20 bg-white px-4 py-2.5 text-xs font-bold text-[#00285E] shadow-sm outline-none"><option value="7">7 ngày gần nhất</option><option value="30">30 ngày gần nhất</option><option value="90">90 ngày gần nhất</option></select>
            <button onClick={loadAnalysis} disabled={isLoading} className="inline-flex items-center gap-2 rounded-xl bg-[#F9A11B] px-5 py-2.5 text-xs font-bold text-[#00285E] shadow-sm transition-colors hover:bg-[#E08F12] disabled:opacity-60"><Target size={15} />{isLoading ? 'Đang phân tích...' : 'Phân tích'}</button>
          </div>
        </div>
      </header>

      {isLoading ? <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white"><RefreshCw className="animate-spin text-[#00285E]" size={30} /><p className="mt-3 text-sm font-bold text-slate-600">Đang đọc dữ liệu hoạt động...</p></div> : data ? <div className="space-y-6">
        <section className="p-6"><div className="flex items-center gap-2"><TrendingUp size={18} className="text-[#00285E]" /><h2 className="text-xl font-bold text-slate-900">Các dịch vụ phổ biến</h2></div><div className="mt-6 space-y-5">{popularServices.map((item: any, index: number) => { const value = Number(item.this_year_rev || 0); return <div key={item.service_name} className="grid items-center gap-3 md:grid-cols-[220px_1fr_140px]"><div className="flex items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">{index + 1}</span><p className="truncate text-sm font-semibold text-slate-800">{item.service_name}</p></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#00285E]" style={{ width: `${Math.max(4, value / maxServiceRevenue * 100)}%` }} /></div><p className="text-right text-sm font-bold text-[#00285E]">{formatMoney(value)}</p></div>; })}{popularServices.length === 0 && <p className="rounded-xl bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">Chưa có dữ liệu dịch vụ trong khoảng đã chọn.</p>}</div></section>

        <section className="p-6"><div className="flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /><h2 className="text-xl font-bold text-slate-900">Vấn đề cần chú ý</h2></div><div className="mt-6 grid gap-4 lg:grid-cols-3">{unresolvedTasks > 0 && <div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm font-bold text-slate-900">Công việc chưa xử lý</p><div className="mt-4 space-y-3 text-sm text-slate-600"><div className="flex justify-between"><span>Chưa phân công</span><strong className="text-rose-600">{Number(risks?.tasks?.unassigned || 0)} công việc</strong></div><div className="flex justify-between"><span>Chờ linh kiện</span><strong>{Number(risks?.tasks?.waitingParts || 0)} công việc</strong></div></div></div>}{overloadedTechnicians.length > 0 && <div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm font-bold text-slate-900">Kỹ thuật viên quá tải</p><p className="mt-1 text-xs text-slate-500">Trung bình đội {Number(risks?.workload?.teamAverage || 0).toLocaleString('vi-VN')} công việc/người</p><div className="mt-4 space-y-3">{overloadedTechnicians.map((tech: any) => <div key={tech.technicianId} className="flex justify-between text-sm"><span className="text-slate-600">{tech.name}</span><strong className="text-rose-600">{tech.activeTasks} công việc</strong></div>)}</div></div>}{shortageParts.length > 0 && <div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm font-bold text-slate-900">Linh kiện dự kiến thiếu</p><div className="mt-4 space-y-3">{shortageParts.slice(0, 4).map((part: any) => <div key={part.partId} className="flex items-start justify-between gap-3 text-sm"><div><p className="font-medium text-slate-700">{part.name}</p><p className="mt-0.5 text-xs text-slate-400">Tồn {part.stock} · 30 ngày cần {part.projected30Days}</p></div><strong className="shrink-0 text-rose-600">Thiếu {part.projectedShortage}</strong></div>)}</div></div>}{unresolvedTasks === 0 && overloadedTechnicians.length === 0 && shortageParts.length === 0 && <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 lg:col-span-3">Chưa phát hiện vấn đề vận hành cần ưu tiên trong dữ liệu hiện tại.</div>}</div></section>

        {data.gemini_plan?.assessment && <SystemAssessment assessment={data.gemini_plan.assessment} />}

        <section className="p-6"><h2 className="text-xl font-bold text-slate-900">Kế hoạch được đề xuất</h2>{data.gemini_plan ? <div className="mt-6"><StructuredAiPlan plan={data.gemini_plan} /></div> : data.gemini_insights ? <div className="mt-6"><AiPlan text={data.gemini_insights} /></div> : <p className="mt-5 text-sm text-slate-500">Chưa nhận được kế hoạch.</p>}</section>
      </div> : hasRequestedAnalysis ? <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center"><BarChart3 size={30} className="text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-700">Không tải được dữ liệu phân tích</p><p className="mt-1 text-xs text-slate-400">Hãy kiểm tra kết nối dịch vụ AI và thử lại.</p><button onClick={loadAnalysis} className="mt-4 rounded-xl bg-[#00285E] px-5 py-2.5 text-xs font-bold text-white">Thử lại</button></div> : <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#00285E]"><BarChart3 size={26} /></span><h2 className="mt-4 text-lg font-bold text-slate-800">Phân tích hoạt động gara</h2><p className="mt-2 max-w-lg text-xs leading-5 text-slate-500">Chọn khoảng thời gian rồi bấm Phân tích. Hệ thống chỉ bắt đầu tổng hợp dữ liệu và gọi AI sau thao tác này.</p><button onClick={loadAnalysis} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#F9A11B] px-6 py-3 text-xs font-bold text-[#00285E] shadow-sm transition-colors hover:bg-[#E08F12]"><Target size={15} />Phân tích</button></div>}
  </div>;
}
