/* eslint-disable @typescript-eslint/no-explicit-any */
import { SERVICE_COMBOS_API_ENDPOINTS } from "../../constants/admin/serviceCombosApiEndpoint";

export type ServiceCatalog = {
  id: number;
  service_name: string;
  estimated_duration: number;
  category_id: number;
};

export type ServiceCombo = {
  id: number;
  category_name: string;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
  services?: ServiceCatalog[];
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
};

type ListPayload<T> = {
  page: number;
  limit: number;
  total: number;
  items: T[];
};

function getToken(): string | null {
  return localStorage.getItem("accessToken");
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers ?? {}),
  };

  const res = await fetch(url, { ...init, headers });
  const text = await res.text();

  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!res.ok) {
    const msg =
      (isRecord(body) &&
        typeof (body as any).message === "string" &&
        (body as any).message) ||
      (typeof body === "string" && body) ||
      `HTTP ${res.status}`;
    const err = new Error(msg);
    (err as any).status = res.status;
    (err as any).payload = body;
    throw err;
  }

  return body as T;
}

/**
 * View service combos (paginated)
 */
export async function viewServiceCombos(params: {
  page?: number;
  limit?: number;
  q?: string;
  is_active?: boolean;
  include_services?: boolean;
}): Promise<ApiResponse<ListPayload<ServiceCombo>>> {
  const usp = new URLSearchParams();
  usp.set("page", String(params.page ?? 1));
  usp.set("limit", String(params.limit ?? 50));
  if (params.q) usp.set("q", params.q);
  if (typeof params.is_active === "boolean")
    usp.set("is_active", String(params.is_active));
  if (typeof params.include_services === "boolean")
    usp.set("include_services", String(params.include_services));

  return requestJson<ApiResponse<ListPayload<ServiceCombo>>>(
    `${SERVICE_COMBOS_API_ENDPOINTS.VIEW}?${usp.toString()}`,
    {
      method: "GET",
    }
  );
}

/**
 * Create combo
 */
export async function createServiceCombo(payload: {
  category_name: string;
  is_active: boolean;
  service_ids: number[];
}): Promise<ApiResponse<ServiceCombo>> {
  return requestJson<ApiResponse<ServiceCombo>>(
    SERVICE_COMBOS_API_ENDPOINTS.CREATE,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

/**
 * Update combo
 */
export async function updateServiceCombo(
  id: number,
  payload: { category_name: string; is_active: boolean; service_ids: number[] }
): Promise<ApiResponse<ServiceCombo>> {
  return requestJson<ApiResponse<ServiceCombo>>(
    SERVICE_COMBOS_API_ENDPOINTS.UPDATE(id),
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
}

/**
 * Delete combo
 */
export async function deleteServiceCombo(
  id: number
): Promise<ApiResponse<{ id: number }>> {
  return requestJson<ApiResponse<{ id: number }>>(
    SERVICE_COMBOS_API_ENDPOINTS.DELETE(id),
    {
      method: "DELETE",
    }
  );
}
