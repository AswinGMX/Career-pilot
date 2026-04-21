import { appConfig } from "@/app/config";

type UnauthorizedHandler = (() => void) | null;

let unauthorizedHandler: UnauthorizedHandler = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler): () => void {
  unauthorizedHandler = handler;

  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = null;
    }
  };
}

interface RequestOptions extends RequestInit {
  headers?: HeadersInit;
}

async function request<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    credentials: appConfig.apiBaseUrl ? "include" : "same-origin",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? ((await response.json()) as TResponse & { error?: string })
    : ((await response.text()) as unknown as TResponse & { error?: string });

  if (!response.ok) {
    if (response.status === 401) {
      unauthorizedHandler?.();
    }

    const error = new Error((payload as { error?: string }).error || "Request failed.");
    throw error;
  }

  return payload as TResponse;
}

export const httpClient = {
  get: <TResponse>(path: string): Promise<TResponse> => request<TResponse>(path),
  post: <TResponse>(path: string, body?: unknown): Promise<TResponse> =>
    request<TResponse>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined
    }),
  put: <TResponse>(path: string, body?: unknown): Promise<TResponse> =>
    request<TResponse>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined
    })
};
