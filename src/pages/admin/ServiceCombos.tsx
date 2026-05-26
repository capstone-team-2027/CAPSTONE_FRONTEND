import { useEffect, useMemo, useReducer, useState } from "react";
import { motion } from "motion/react";
import { Plus, Pencil, Search, X, Save, Trash2 } from "lucide-react";

type ServiceCatalog = {
  id: number;
  service_name: string;
  estimated_duration: number;
  category_id: number;
};

type ServiceCombo = {
  id: number;
  category_name: string;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
  services?: ServiceCatalog[];
};

type ApiListData<T> = {
  page: number;
  limit: number;
  total: number;
  items: T[];
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
};

type CreateOrUpdatePayload = {
  category_name: string;
  is_active: boolean;
  service_ids: number[];
};

type CombosState = {
  loading: boolean;
  error: string | null;
  items: ServiceCombo[];
};

type CombosAction =
  | { type: "load_start" }
  | { type: "load_success"; items: ServiceCombo[] }
  | { type: "load_error"; error: string };

function assertNever(x: never): never {
  throw new Error(`Unhandled action: ${String(x)}`);
}
function combosReducer(state: CombosState, action: CombosAction): CombosState {
  switch (action.type) {
    case "load_start":
      return { ...state, loading: true, error: null };
    case "load_success":
      return { ...state, loading: false, error: null, items: action.items };
    case "load_error":
      return { ...state, loading: false, error: action.error };
    default:
      return assertNever(action);
  }
}

function getApiBaseUrl(): string {
  const v = import.meta.env.VITE_API_BASE_URL;
  return typeof v === "string" && v.length > 0 ? v : "http://localhost:3000";
}

function getToken(): string | null {
  return localStorage.getItem("accessToken");
}

function buildUrl(
  pathname: string,
  query?: Record<string, string | number | boolean | undefined>
): string {
  const url = new URL(pathname, getApiBaseUrl());
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function requestJson<T>(
  url: string,
  init?: RequestInit,
  signal?: AbortSignal
): Promise<T> {
  const token = getToken();
  const res = await fetch(url, {
    ...init,
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  let body: unknown;
  if (isJson) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    if (isJson && isRecord(body)) {
      const candidate = (body as Record<string, unknown>)["message"];
      if (typeof candidate === "string" && candidate.length > 0) {
        msg = candidate;
      }
    } else if (typeof body === "string" && body.length > 0) {
      msg = body;
    }

    const err = new Error(msg);
    // attach metadata with properly typed cast
    (err as { status?: number; payload?: unknown }).status = res.status;
    (err as { status?: number; payload?: unknown }).payload = body;
    throw err;
  }

  return body as T;
}

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-base md:text-lg font-bold text-slate-800">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl hover:bg-slate-50 flex items-center justify-center"
              aria-label="Close"
            >
              <X size={18} className="text-slate-500" />
            </button>
          </div>
          <div className="p-6">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}

function ComboForm({
  mode,
  initial,
  busy,
  onCancel,
  onSubmit,
  servicesOptions,
}: {
  mode: "create" | "update";
  initial?: Partial<ServiceCombo> | null;
  busy?: boolean;
  onCancel: () => void;
  onSubmit: (payload: CreateOrUpdatePayload) => void;
  servicesOptions?: ServiceCatalog[];
}) {
  const [categoryName, setCategoryName] = useState<string>(
    initial?.category_name ?? ""
  );
  const [isActive, setIsActive] = useState<boolean>(initial?.is_active ?? true);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>(() =>
    (initial?.services ?? []).map((s) => s.id)
  );

  const serviceIds = useMemo(() => selectedServiceIds, [selectedServiceIds]);
  const canSubmit = categoryName.trim().length > 0;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit({
          category_name: categoryName.trim(),
          is_active: isActive,
          service_ids: serviceIds,
        });
      }}
    >
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Tên combo
        </label>
        <input
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          placeholder="Ví dụ: Bảo dưỡng định kỳ"
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/20"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Trạng thái
          </label>
          <select
            value={isActive ? "true" : "false"}
            onChange={(e) => setIsActive(e.target.value === "true")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#00285E]/20"
          >
            <option value="true">Đang hoạt động</option>
            <option value="false">Tạm tắt</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Dịch vụ
          </label>

          <div className="max-h-48 overflow-auto rounded-lg border border-slate-200 p-2">
            {(servicesOptions ?? []).length === 0 ? (
              <div className="text-xs text-slate-400">Không có dịch vụ</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {(servicesOptions ?? []).map((s) => {
                  const checked = selectedServiceIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 text-sm p-1 rounded hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedServiceIds((cur) =>
                            cur.includes(s.id)
                              ? cur.filter((id) => id !== s.id)
                              : [...cur, s.id]
                          )
                        }
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-slate-700">
                          {s.service_name}
                        </div>
                        <div className="text-xs text-slate-400">ID: {s.id}</div>
                      </div>
                      <div className="text-xs text-slate-400">
                        {s.estimated_duration}m
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400">
            Chọn các dịch vụ để gán vào combo.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50"
          disabled={busy}
        >
          Hủy
        </button>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-[#00285E] text-white text-sm font-bold hover:bg-[#082245] flex items-center gap-2 disabled:opacity-60"
          disabled={busy || !canSubmit}
        >
          <Save size={16} />
          {mode === "create" ? "Tạo combo" : "Cập nhật"}
        </button>
      </div>
    </form>
  );
}

export default function ServiceCombos() {
  const [q, setQ] = useState<string>("");

  const [combos, dispatch] = useReducer(combosReducer, {
    loading: false,
    error: null,
    items: [],
  });

  const [saving, setSaving] = useState<boolean>(false);

  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [updateOpen, setUpdateOpen] = useState<boolean>(false);
  const [selected, setSelected] = useState<ServiceCombo | null>(null);

  const [servicesOptions, setServicesOptions] = useState<ServiceCatalog[]>([]);

  async function fetchCombos(signal?: AbortSignal): Promise<ServiceCombo[]> {
    const url = buildUrl("/api/admin/serviceCombos", {
      page: 1,
      limit: 50,
      q: q.trim() ? q.trim() : undefined,
      include_services: true,
    });

    const res = await requestJson<ApiResponse<ApiListData<ServiceCombo>>>(
      url,
      { method: "GET" },
      signal
    );

    if (!res.success) throw new Error(res.message ?? "Fetch failed");
    return res.data?.items ?? [];
  }

  async function fetchServiceOptions(
    signal?: AbortSignal
  ): Promise<ServiceCatalog[]> {
    const url = buildUrl("/api/admin/serviceCatalogs", {
      page: 1,
      limit: 1000,
    });
    const res = await requestJson<ApiResponse<ApiListData<ServiceCatalog>>>(
      url,
      { method: "GET" },
      signal
    );
    if (!res.success) throw new Error(res.message ?? "Fetch failed");
    return res.data?.items ?? [];
  }

  async function reload(): Promise<void> {
    dispatch({ type: "load_start" });
    try {
      const list = await fetchCombos();
      dispatch({ type: "load_success", items: list });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Fetch failed";
      dispatch({ type: "load_error", error: msg });
    }
  }

  async function handleCreate(payload: CreateOrUpdatePayload): Promise<void> {
    setSaving(true);
    try {
      const url = buildUrl("/api/admin/serviceCombos");
      const res = await requestJson<ApiResponse<ServiceCombo>>(url, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.success) throw new Error(res.message ?? "Create failed");

      setCreateOpen(false);
      await reload();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Create failed";
      alert(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(
    id: number,
    payload: CreateOrUpdatePayload
  ): Promise<void> {
    setSaving(true);
    try {
      const url = buildUrl(`/api/admin/serviceCombos/${id}`);
      const res = await requestJson<ApiResponse<ServiceCombo>>(url, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (!res.success) throw new Error(res.message ?? "Update failed");

      setUpdateOpen(false);
      setSelected(null);
      await reload();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Update failed";
      alert(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number): Promise<void> {
    if (!confirm("Bạn có chắc muốn xóa combo này?")) return;
    setSaving(true);
    try {
      const url = buildUrl(`/api/admin/serviceCombos/${id}`);
      const res = await requestJson<ApiResponse<{ id: number }>>(url, {
        method: "DELETE",
      });
      if (!res.success) throw new Error(res.message ?? "Delete failed");
      await reload();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      alert(msg);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const ac = new AbortController();

    dispatch({ type: "load_start" });

    fetchCombos(ac.signal)
      .then((list) => dispatch({ type: "load_success", items: list }))
      .catch((e: unknown) => {
        if (ac.signal.aborted) return;
        const msg = e instanceof Error ? e.message : "Fetch failed";
        dispatch({ type: "load_error", error: msg });
      });

    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    fetchServiceOptions(ac.signal)
      .then((items) => {
        setServicesOptions(items);
      })
      .catch((err) => {
        if (ac.signal.aborted) return;
        setServicesOptions([]);
        console.warn("load service options failed:", err);
      });
    return () => ac.abort();
  }, []);

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">
            Service Combos
          </h1>
          <p className="text-slate-500 text-sm">
            Xem danh sách combo, thêm mới và cập nhật (modal).
          </p>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#00285E] text-white rounded-xl text-sm font-semibold shadow-md shadow-[#00285E]/10 hover:bg-[#082245] transition-all"
        >
          <Plus size={16} />
          Thêm combo
        </button>
      </div>

      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
            <Search size={18} className="text-slate-500" />
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên combo..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/20"
          />
        </div>
        <button
          onClick={() => void reload()}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50"
          disabled={combos.loading}
        >
          {combos.loading ? "Đang tải..." : "Tìm kiếm"}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">
            Danh sách combo
          </h2>
          <span className="text-xs font-bold text-slate-400">
            {combos.items.length} combos
          </span>
        </div>

        {combos.error && (
          <div className="p-6 text-sm font-semibold text-rose-600">
            {combos.error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-y border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th className="py-4 px-6">Combo</th>
                <th className="py-4 px-4">Trạng thái</th>
                <th className="py-4 px-4">Dịch vụ con</th>
                <th className="py-4 px-6 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {combos.loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-10 text-center text-slate-400 text-sm"
                  >
                    Đang tải...
                  </td>
                </tr>
              ) : combos.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-10 text-center text-slate-400 text-sm"
                  >
                    Chưa có combo nào.
                  </td>
                </tr>
              ) : (
                combos.items.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-800 text-sm">
                        {c.category_name}
                      </div>
                      <div className="text-xs font-semibold text-slate-400">
                        ID: {c.id}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wide uppercase ${
                          c.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="text-sm font-semibold text-slate-700">
                        {c.services?.length ?? 0} dịch vụ
                      </div>
                      <div className="text-xs text-slate-400">
                        {c.services
                          ?.slice(0, 2)
                          .map((s) => s.service_name)
                          .join(", ")}
                        {(c.services?.length ?? 0) > 2 ? " ..." : ""}
                      </div>
                    </td>

                    <td className="py-4 px-6 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelected(c);
                          setUpdateOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                      >
                        <Pencil size={14} />
                        Update
                      </button>

                      <button
                        onClick={() => void handleDelete(c.id)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-50"
                        disabled={saving}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={createOpen}
        title="Thêm Service Combo"
        onClose={() => setCreateOpen(false)}
      >
        <ComboForm
          key="create"
          mode="create"
          busy={saving}
          onCancel={() => setCreateOpen(false)}
          onSubmit={(payload) => void handleCreate(payload)}
          servicesOptions={servicesOptions}
        />
      </Modal>

      <Modal
        open={updateOpen}
        title={`Cập nhật: ${selected?.category_name ?? ""}`}
        onClose={() => {
          setUpdateOpen(false);
          setSelected(null);
        }}
      >
        <ComboForm
          key={`update-${selected?.id ?? "0"}`}
          mode="update"
          initial={selected}
          busy={saving}
          onCancel={() => {
            setUpdateOpen(false);
            setSelected(null);
          }}
          onSubmit={(payload) => {
            if (!selected) return;
            void handleUpdate(selected.id, payload);
          }}
          servicesOptions={servicesOptions}
        />
      </Modal>
    </div>
  );
}
