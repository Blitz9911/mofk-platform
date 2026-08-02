import { useMutation, useQuery } from "@tanstack/react-query";
import type { QueryKey, UseMutationOptions, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { customFetch, type BodyType, type ErrorType } from "./custom-fetch";

export const maintenanceServiceTypes = [
  { value: "oil_change", label: "تغيير زيت المحرك" },
  { value: "tire_rotation", label: "تبديل مواقع الإطارات" },
  { value: "brake_inspection", label: "فحص الفرامل" },
  { value: "battery_check", label: "فحص البطارية" },
  { value: "air_filter", label: "تغيير فلتر الهواء" },
  { value: "transmission_fluid", label: "تغيير زيت ناقل الحركة (القير)" },
  { value: "coolant_flush", label: "تغيير سائل التبريد" },
  { value: "spark_plugs", label: "تغيير شمعات الإشعال (البواجي)" },
  { value: "timing_belt", label: "فحص أو تغيير سير التوقيت" },
  { value: "wheel_alignment", label: "ضبط زوايا العجلات" },
  { value: "ac_service", label: "صيانة التكييف" },
  { value: "other", label: "صيانة أخرى" },
] as const;

export type MaintenanceServiceType = (typeof maintenanceServiceTypes)[number]["value"];

export function getMaintenanceServiceLabel(value?: string | null, customServiceName?: string | null) {
  if (value === "other" && customServiceName) return customServiceName;
  return maintenanceServiceTypes.find((item) => item.value === value)?.label || value || "-";
}

export type MaintenanceLog = {
  id: string;
  userId: string;
  vehicleId: string;
  serviceType: string;
  serviceTypeAr?: string;
  customServiceName?: string | null;
  doneAt: string;
  doneAtKm?: number | null;
  actualCostSar?: number | null;
  cost?: number | null;
  notes?: string | null;
  source: "manual" | "recommendation" | "workshop";
  createdAt: string;
  updatedAt: string;
  vehicleNickname?: string | null;
  vehicleMake?: string;
  vehicleModel?: string;
};

export type ListMaintenanceLogsParams = {
  vehicleId?: string;
  limit?: number;
  offset?: number;
};

export type CreateMaintenanceLogBody = {
  vehicleId: string;
  serviceType: string;
  customServiceName?: string | null;
  doneAt: string;
  doneAtKm?: number | null;
  actualCostSar?: number | null;
  cost?: number | null;
  notes?: string | null;
  source?: "manual" | "recommendation" | "workshop";
};

export type UpdateMaintenanceLogBody = Partial<Omit<CreateMaintenanceLogBody, "vehicleId">>;

export const getListMaintenanceLogsQueryKey = (params?: ListMaintenanceLogsParams) =>
  ["/api/maintenance/logs", params] as const;

function maintenanceLogsUrl(params?: ListMaintenanceLogsParams) {
  const search = new URLSearchParams();
  if (params?.vehicleId) search.set("vehicleId", params.vehicleId);
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.offset) search.set("offset", String(params.offset));
  const query = search.toString();
  return `/api/maintenance/logs${query ? `?${query}` : ""}`;
}

export function listMaintenanceLogs(params?: ListMaintenanceLogsParams, options?: RequestInit) {
  return customFetch<MaintenanceLog[]>(maintenanceLogsUrl(params), {
    ...options,
    method: "GET",
  });
}

export function createMaintenanceLog(body: BodyType<CreateMaintenanceLogBody>, options?: RequestInit) {
  return customFetch<MaintenanceLog>("/api/maintenance/logs", {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(body),
  });
}

export function updateMaintenanceLog(logId: string, body: BodyType<UpdateMaintenanceLogBody>, options?: RequestInit) {
  return customFetch<MaintenanceLog>(`/api/maintenance/logs/${encodeURIComponent(logId)}`, {
    ...options,
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(body),
  });
}

export function deleteMaintenanceLog(logId: string, options?: RequestInit) {
  return customFetch<void>(`/api/maintenance/logs/${encodeURIComponent(logId)}`, {
    ...options,
    method: "DELETE",
  });
}

export function useListMaintenanceLogs<TData = MaintenanceLog[], TError = ErrorType<unknown>>(
  params?: ListMaintenanceLogsParams,
  options?: {
    query?: UseQueryOptions<MaintenanceLog[], TError, TData>;
    request?: RequestInit;
  },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey = options?.query?.queryKey ?? getListMaintenanceLogsQueryKey(params);
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => listMaintenanceLogs(params, { signal, ...options?.request }),
    ...options?.query,
  }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey };
}

export function useCreateMaintenanceLog<TError = ErrorType<unknown>, TContext = unknown>(
  options?: {
    mutation?: UseMutationOptions<MaintenanceLog, TError, BodyType<CreateMaintenanceLogBody>, TContext>;
    request?: RequestInit;
  },
) {
  return useMutation({
    mutationFn: (body) => createMaintenanceLog(body, options?.request),
    ...options?.mutation,
  });
}

export function useUpdateMaintenanceLog<TError = ErrorType<unknown>, TContext = unknown>(
  options?: {
    mutation?: UseMutationOptions<
      MaintenanceLog,
      TError,
      { logId: string; data: BodyType<UpdateMaintenanceLogBody> },
      TContext
    >;
    request?: RequestInit;
  },
) {
  return useMutation({
    mutationFn: ({ logId, data }) => updateMaintenanceLog(logId, data, options?.request),
    ...options?.mutation,
  });
}

export function useDeleteMaintenanceLog<TError = ErrorType<unknown>, TContext = unknown>(
  options?: {
    mutation?: UseMutationOptions<void, TError, string, TContext>;
    request?: RequestInit;
  },
) {
  return useMutation({
    mutationFn: (logId) => deleteMaintenanceLog(logId, options?.request),
    ...options?.mutation,
  });
}
