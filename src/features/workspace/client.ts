export async function api<T>(
  path: string,
  method = "GET",
  data?: unknown,
  retried = false,
): Promise<T> {
  const response = await fetch(`/api/nimantran${path}`, {
    method,
    credentials: "same-origin",
    headers: data instanceof FormData ? {} : { "Content-Type": "application/json" },
    ...(data === undefined ? {} : { body: data instanceof FormData ? data : JSON.stringify(data) }),
  });
  if (response.status === 401 && !retried && !path.startsWith("/auth/")) {
    const refresh = await fetch("/api/nimantran/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
    });
    if (refresh.ok) return api<T>(path, method, data, true);
  }
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Request failed. Please retry.");
  return result;
}
export function download(name: string, content: string) {
  const href = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
