const API_BASE = "";

async function throwIfNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  path: string,
  data?: unknown
): Promise<Response> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  await throwIfNotOk(res);
  return res;
}

export async function apiFetch<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}?_t=${Date.now()}`;
  const res = await fetch(url, { credentials: "include" });
  await throwIfNotOk(res);
  return res.json();
}
