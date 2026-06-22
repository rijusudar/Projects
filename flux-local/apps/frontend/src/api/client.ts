import type {
  GenerateBody,
  HealthInfo,
  HistoryPage,
  JobDetail,
  JobRef,
  ModelInfo,
} from "./types";

const BASE = "/api/v1";

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => jsonFetch<HealthInfo>("/health"),
  models: () => jsonFetch<ModelInfo[]>("/models"),

  generate: (body: GenerateBody) =>
    jsonFetch<JobRef>("/generate", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  edit: (form: FormData) =>
    fetch(`${BASE}/edit`, { method: "POST", body: form }).then(async (res) => {
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(`${res.status}: ${detail.detail ?? res.statusText}`);
      }
      return res.json() as Promise<JobRef>;
    }),

  job: (id: string) => jsonFetch<JobDetail>(`/jobs/${id}`),

  history: (limit = 60, offset = 0) =>
    jsonFetch<HistoryPage>(`/history?limit=${limit}&offset=${offset}`),

  deleteImage: (id: string) =>
    fetch(`${BASE}/images/${id}`, { method: "DELETE" }).then((r) => {
      if (!r.ok && r.status !== 204) throw new Error(`delete failed: ${r.status}`);
    }),

  imageUrl: (id: string) => `${BASE}/images/${id}`,
  thumbUrl: (id: string) => `${BASE}/images/${id}/thumb`,
};

// Build a ws:// or wss:// URL for the live progress channel.
export function progressSocketUrl(jobId: string): string {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}${BASE}/jobs/${jobId}/progress`;
}
