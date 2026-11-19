export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function parse(res: Response) {
  const type = res.headers.get("content-type") ?? "";
  const body = type.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    const message =
      typeof body === "object" && body && "error" in body ? String(body.error) : String(body || res.statusText);
    throw new ApiError(res.status, message);
  }
  return body;
}

/** JSON fetch with a 15 second timeout, so a stuck server shows an error instead of spinning. */
export async function api<T = unknown>(url: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: init.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  return (await parse(res)) as T;
}

export const fetcher = <T,>(url: string) => api<T>(url);
