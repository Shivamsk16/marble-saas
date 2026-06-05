"use client";

import { useCallback, useEffect, useState } from "react";

export function parseApiError(data: unknown): string {
  if (!data || typeof data !== "object") return "Request failed";
  const err = (data as { error?: unknown }).error;
  if (typeof err === "string") return err;
  return "Request failed";
}

export type FetchJsonResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number };

export async function fetchJson<T = unknown>(
  url: string,
  init?: RequestInit
): Promise<FetchJsonResult<T>> {
  try {
    const res = await fetch(url, init);
    const data = (await res.json().catch(() => ({}))) as T;
    if (!res.ok) {
      return { ok: false, error: parseApiError(data), status: res.status };
    }
    return { ok: true, data, status: res.status };
  } catch {
    return {
      ok: false,
      error: "Network error. Check your connection and try again.",
      status: 0,
    };
  }
}

export function useClientFetch<T>(
  url: string,
  options?: {
    deps?: unknown[];
    enabled?: boolean;
    initialData?: T | null;
  }
) {
  const [data, setData] = useState<T | null>(options?.initialData ?? null);
  const [loading, setLoading] = useState(options?.enabled !== false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (options?.enabled === false) return;
    setLoading(true);
    setError(null);
    const result = await fetchJson<T>(url);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setData(result.data);
  }, [url, options?.enabled]);

  const deps = options?.deps ?? [];
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, ...deps]);

  return { data, loading, error, retry: load, setData };
}
